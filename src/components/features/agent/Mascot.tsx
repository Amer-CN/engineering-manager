/**
 * Mascot — AI 管家圆球（SVG 渲染 + 自研弹簧引擎 + Grok 官方形象数据）
 * -------------------------------------------------------------------
 * 形象数据（眼部轮廓 48 点 / 身体 blob / 画布尺寸）来自
 * zhulin025/LaoA-GrokBot（MIT）的 Grok 官方客户端提取数据，
 * 数据文件：src/components/features/agent/grok-eyes-data.ts（MIT 署名保留不变）。
 * 弹簧引擎、状态映射、表情驱动、特效与 DOM 接线均为本项目实现。
 * -------------------------------------------------------------------
 * 架构分层：
 *   1. 自研弹簧引擎（Engine）：每眼 48 个控制点 × x/y 两轴共 192 个弹簧，
 *      加上 lid（眨眼开合）/ gx / gy（注视整体平移）。
 *   2. 官方表情数据驱动：状态配置表按 cycle 轮换表情，控制点弹簧逐点
 *      插值出丝滑形变；48 点 Catmull-Rom 平滑闭合成眼环 path。
 *   3. rAF 渲染层（ref + setAttribute 直写 path 的 d / transform，
 *      不 setState、不触发 React 重渲染）
 * 无障碍：prefers-reduced-motion 时停 rAF，表情切换直接跳变。
 * -------------------------------------------------------------------
 * 文件拆分（CI 行数门禁）：引擎/常量/类型/状态配置与纯函数 → mascot-engine.ts；
 * 交互调度与渲染/特效/点击拖拽 helpers → mascot-interactions.ts；
 * 本文件仅保留 React 组件本体（hooks、rAF 循环、JSX 渲染）。
 */

import { useEffect, useMemo, useRef } from 'react'
import { GROK_BODY_PATH, GROK_CANVAS } from './grok-eyes-data'
import {
  Engine,
  SPRING_NAMES,
  STATE_CONFIG,
  CX,
  CY,
  BALL_R,
  ZERO_OFF,
  aimExpr,
  currentExpr,
  restBody,
  type MascotState,
  type Particle,
  type ResolvedState,
  type TickData,
} from './mascot-engine'
import {
  type DragState,
  type MascotDom,
  handleBallMouseDown,
  paintMascot,
  spawnSuccessParticles,
  stepMascot,
} from './mascot-interactions'

export type { MascotState } from './mascot-engine'

interface MascotProps {
  /** 渲染尺寸（正方形，px），默认 96 */
  size?: number
  /** 表情状态，默认 idle */
  state?: MascotState
  /** 是否启用眼睛跟随鼠标，默认 true */
  follow?: boolean
  className?: string
}

/* ══════════════ 组件 ══════════════ */

const Mascot = ({ size = 96, state = 'idle', follow = true, className }: MascotProps) => {
  const resolved: ResolvedState = state === 'listening' ? 'idle' : state

  const svgRef = useRef<SVGSVGElement>(null)
  const bodyRef = useRef<SVGGElement>(null)
  const eyeLRef = useRef<SVGPathElement>(null)
  const eyeRRef = useRef<SVGPathElement>(null)
  const flashRef = useRef<SVGCircleElement>(null)
  const mouthRef = useRef<SVGEllipseElement>(null)
  const particlesRef = useRef<SVGGElement>(null)
  const engineRef = useRef<Engine | null>(null)
  const metaRef = useRef<TickData>({ state: 'idle', t0: 0, now: 0, last: 0, blinkAt: 0, blinkOn: false, blinkEnd: 0, flashAt: 0, nextGlanceAt: 0, glanceExpr: null, glanceUntil: 0, funExpr: null, funUntil: 0, funAt: 0, baseState: 'idle', lastInteractAt: 0, sleeping: false, drowsy: false, drowsyAt: 0, lastClickAt: 0, dblJumpExpr: null, dblJumpAt: 0, dblJumpUntil: 0, dragging: false })
  const particlesListRef = useRef<Particle[]>([])
  const pulseOffRef = useRef(ZERO_OFF)
  const followRef = useRef(follow)
  followRef.current = follow
  const dragRef = useRef<DragState | null>(null)

  const reduced = useMemo(
    () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    [],
  )

  /** DOM 接线上下文：字段与上方 ref 一一对应，供 mascot-interactions 直写 */
  const dom = useMemo<MascotDom>(
    () => ({
      svg: svgRef,
      body: bodyRef,
      eyeL: eyeLRef,
      eyeR: eyeRRef,
      flash: flashRef,
      mouth: mouthRef,
      particles: particlesRef,
      particleList: particlesListRef,
      engine: engineRef,
      meta: metaRef,
      pulseOff: pulseOffRef,
      follow: followRef,
      drag: dragRef,
      reduced,
    }),
    [reduced],
  )

  /* ── 状态切换：重置调度 / 触发一次性事件；reduced 时直接静态快照 ── */
  useEffect(() => {
    const eng = dom.engine.current ?? (dom.engine.current = new Engine(SPRING_NAMES))
    const m = dom.meta.current
    const now = performance.now()
    m.state = resolved
    m.t0 = now
    m.now = now
    m.last = 0
    m.blinkOn = false
    m.blinkAt = now + 1600 + Math.random() * 2000
    m.flashAt = 0
    // 打盹/连点蹦跳随状态切换重置：阶段优先，避免残留覆盖新阶段
    m.baseState = resolved
    m.lastInteractAt = now
    m.sleeping = false
    // 犯困随状态切换重置：阶段优先，避免残留覆盖新阶段表情/动素
    m.drowsy = false
    m.drowsyAt = 0
    m.lastClickAt = 0
    m.dblJumpExpr = null
    m.dblJumpAt = 0
    m.dblJumpUntil = 0
    // idle glance 调度每次重置：切入状态先正视，首个瞟眼约 4-7s 后发生
    m.glanceExpr = null
    m.glanceUntil = 0
    m.nextGlanceAt = now + 4000 + Math.random() * 3000
    // 点击俏皮表情随状态切换被清掉（阶段优先，避免残留覆盖新阶段表情）
    m.funExpr = null
    m.funUntil = 0
    m.funAt = 0
    // 拖拽随状态切换终止：清掉激活态并恢复光标（回弹交给弹簧，bx/by 目标已回中性）
    m.dragging = false
    dom.drag.current = null
    if (dom.body.current) dom.body.current.style.cursor = 'grab'

    // 表情目标：reduced 下取首表情跳变；动画下首帧同步绘制确保加载间隙可见
    const exprId = currentExpr(m, STATE_CONFIG[resolved])
    aimExpr(eng, exprId)
    restBody(eng)
    eng.snapAll()
    paintMascot(dom, eng, m, 0)

    if (!reduced) {
      if (resolved === 'success') spawnSuccessParticles(dom, now)
      if (resolved === 'error') m.flashAt = now
    }
  }, [resolved, reduced])

  /* ── 眼睛跟随鼠标（坐标进 ref，由 rAF 循环消费；范围跟随） ── */
  useEffect(() => {
    if (reduced || !follow) return
    const onMove = (evt: MouseEvent) => {
      const el = dom.svg.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      const dx = evt.clientX - cx
      const dy = evt.clientY - cy
      const dist = Math.hypot(dx, dy)
      // 范围跟随：鼠标进入球周围 10×半径内才跟随，超出则偏移归零（球回自己
      // 的表情状态）；范围内幅度随距离增长，52px 封顶。
      // 10×（原 6×，用户拍板 2026-08-22）：覆盖整个对话区——鼠标移到输入框
      // 打字时眼睛保持看向用户方向（"正在看你输入"的注视感）
      const ballRpx = BALL_R * (r.height / GROK_CANVAS.h)
      if (dist > ballRpx * 10) {
        dom.pulseOff.current = ZERO_OFF
        return
      }
      const mag = Math.min(52, 12 + dist * 0.06)
      const u = dist > 0 ? 1 / dist : 0
      dom.pulseOff.current = { x: dx * u * mag, y: dy * u * mag }
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [reduced, follow])

  /* ── 交互计时与睡眠唤醒：mousemove/click 刷新 lastInteractAt；打盹中一动/一点即醒 ── */
  useEffect(() => {
    const m = dom.meta.current
    const onInteract = () => {
      m.lastInteractAt = performance.now()
      if (m.sleeping) {
        // 唤醒：立即恢复 props 状态（idle 正视），下一帧弹簧贴回常态眼
        m.sleeping = false
        m.state = m.baseState
      }
      // 犯困阶段鼠标一动直接从任一阶段回正视（无需等入 sleep）
      m.drowsy = false
      m.drowsyAt = 0
    }
    window.addEventListener('mousemove', onInteract)
    window.addEventListener('click', onInteract)
    return () => {
      window.removeEventListener('mousemove', onInteract)
      window.removeEventListener('click', onInteract)
    }
  }, [])

  /* ── 引擎初始化 + 主循环（rAF：每帧直写 DOM，不 setState） ── */
  useEffect(() => {
    if (!dom.engine.current) dom.engine.current = new Engine(SPRING_NAMES)
    if (reduced) return
    let raf = 0
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const m = dom.meta.current
      m.now = now
      if (!m.last) {
        m.last = now
        return
      }
      const dt = Math.min(0.05, (now - m.last) / 1000)
      m.last = now
      stepMascot(dom, dt)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [reduced])

  /* ══════════════ 渲染（全部动效走 rAF 直写，JSX 只建骨架） ══════════════ */

  return (
    <div
      className={className}
      style={{ width: size, height: size, display: 'grid', placeItems: 'center', overflow: 'visible' }}
      aria-label="AI 管家"
      role="img"
    >
      <svg
        ref={dom.svg}
        width={size}
        height={size}
        viewBox={`0 0 ${GROK_CANVAS.w} ${GROK_CANVAS.h}`}
        style={{ overflow: 'visible', display: 'block' }}
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="mascot-ball" cx="0.5" cy="0.05" r="0.98">
            <stop offset="0.6" stopColor="rgba(0,0,0,0)" />
            <stop offset="1" stopColor="rgba(0,0,0,0.22)" />
          </radialGradient>
          {/* 顶部轮廓光（rim light）：深色主题下把球从背景里"切"出来 */}
          <radialGradient id="mascot-rim" cx="0.5" cy="0.12" r="0.75">
            <stop offset="0" stopColor="rgba(255,255,255,0.14)" />
            <stop offset="0.55" stopColor="rgba(255,255,255,0.05)" />
            <stop offset="1" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
          {/* 落影羽化 filter（扩散范围放宽，避免模糊结果被裁剪） */}
          <filter id="mascot-ball-shadow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
          {/* 身体剪裁：渐变覆盖层 / 红晕 / 双眼只允许画在 blob 轮廓内 */}
          <clipPath id="mascot-clip">
            <path d={GROK_BODY_PATH} />
          </clipPath>
        </defs>

        {/* 身体：translate/rotate/scale 由 rAF 直写 transform；cursor 提示可抓；onMouseDown 接管点击/拖拽判定 */}
        <g ref={dom.body} onMouseDown={(evt) => handleBallMouseDown(dom, evt)} style={{ cursor: 'grab' }}>
          {/* 保底分离层：球底地面落影（黑色低透明 ≤0.2），随 body 一起动 */}
          <ellipse
            cx={CX}
            cy={GROK_CANVAS.h - 8}
            rx={90}
            ry={12}
            fill="rgba(0,0,0,0.18)"
            filter="url(#mascot-ball-shadow)"
            pointerEvents="none"
          />
          {/* blob 身体（Grok 官方提取），填充/描边与圆形版一致 */}
          <path
            d={GROK_BODY_PATH}
            fill="oklch(94.5% 0.012 86)"
            stroke={resolved === 'error' ? 'rgb(228,87,74)' : 'oklch(80% 0.015 85)'}
            strokeWidth="2"
          />
          <g clipPath="url(#mascot-clip)">
            <circle cx={CX} cy={CY} r={BALL_R} fill="url(#mascot-ball)" />
            <circle cx={CX} cy={CY} r={BALL_R} fill="url(#mascot-rim)" />
            {/* error 红晕：0.5s 内由 0.35 衰减到常亮 0.18，离开 error 归 0（rAF 直写 opacity） */}
            <circle ref={dom.flash} cx={CX} cy={CY} r={BALL_R} fill="rgb(228,87,74)" opacity="0" pointerEvents="none" />
          </g>
          {/* 双眼：移出 clipPath 容器（不裁剪），避免 gx/gy 平移后被 blob 轮廓裁掉 */}
          <path ref={dom.eyeL} fill="oklch(26% 0.015 70)" />
          <path ref={dom.eyeR} fill="oklch(26% 0.015 70)" />
        </g>

        {/* replying 嘴：开口椭圆（正在说话，paint 直写 opacity），画布下部 */}
        <ellipse ref={dom.mouth} cx={CX} cy={170} rx="5" ry="6.5" fill="oklch(26% 0.015 70)" opacity="0" />

        {/* success 撒花粒子容器（成功时按需挂载 ≤14 个） */}
        <g ref={dom.particles} />
      </svg>
    </div>
  )
}

export default Mascot