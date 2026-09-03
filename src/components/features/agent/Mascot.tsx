/**
 * Mascot — AI 管家吉祥物（bloub 引擎 React 薄壳适配器）
 * -------------------------------------------------------------
 * 引擎整体 vendor 自 jeremy-prt/bloub @ b4bb3c1（MIT，逐帧实测数值），
 * 位置 ./bloub/：bot/ 纯 TS 引擎逐字复刻，gaze.ts 仅相对化 import。
 * 本文件只做适配：MascotState → bloub StateId 的映射、paper 衬底随主题、
 * follow 指针跟随与冷启动入场（tourLook），渲染结构忠实上游 BloubBot.vue。
 * 不搬上游：cycle 播放器/时间轴、点击拖拽、i18n、自定义表情轮换。
 * -------------------------------------------------------------
 * Props 契约与旧自研实现保持一致（调用方 AgentDashboard /
 * useAgentConversationFlow 不动）：size / state / follow / className，
 * MascotState 仍从本文件导出（listening 归一为 idle）。
 */

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { NOTIF_BLUE } from './bloub/bot/decor'
import { DEFAULT_EXPRESSION, EXPRESSION_BY_ID } from './bloub/bot/expressions'
import { BotEngine, type BotFrame } from './bloub/bot/engine'
import { clamp, easings } from './bloub/bot/math'
import { DEMI_VIEWBOX, RAYON } from './bloub/bot/repere'
import { COLOR_BY_ID, SHAPE_BY_ID, mixHex } from './bloub/bot/skins'
import { STATE_BY_ID, type StateId } from './bloub/bot/states'
import { TOUR_TIME, TURN_TIME, lookTarget, tourLook } from './bloub/gaze'

export type MascotState =
  | 'idle'
  | 'thinking'
  | 'searching'
  | 'replying'
  | 'success'
  | 'error'
  | 'listening'

/** listening 归一为 idle 后参与映射的六态 */
type ResolvedMascotState = Exclude<MascotState, 'listening'>

/** MascotState → bloub StateId（简报拍板的映射表） */
const STATE_MAP: Record<ResolvedMascotState, StateId> = {
  idle: 'idle',
  thinking: 'thinking',
  searching: 'orbit',
  replying: 'notify',
  success: 'play',
  error: 'alert',
}

const R = RAYON
const VB = DEMI_VIEWBOX
/** 默认三角形象（配软件图标），颜色 encre；后续颜色适配单独做 */
const TRIANGLE_RADII = SHAPE_BY_ID.get('triangle')?.radii ?? null
const EXPRESSION = EXPRESSION_BY_ID.get(DEFAULT_EXPRESSION) ?? null
const INK = COLOR_BY_ID.get('encre')?.hex ?? '#0a0a0c'
/** skins.mixHex 需要真 hex：--bg 解析不出 # 开头时退回上游默认衬底 */
const DEFAULT_PAPER = '#f9f9f9'
/** 入场脚本用短 rattrapage（照上游 SCRIPT_MORPH）：0 会除零出 NaN */
const SCRIPT_MORPH = 1 / 60
/** 入场收尾：tourLook 本体（TOUR_TIME）+ 0.2s 后松开视线 */
const SCRIPT_RELEASE = TOUR_TIME + 0.2

/**
 * 入场每冷启动只播一次（模块级 once；Dashboard 40px/32px 双实例仅首个挂载播）。
 * StrictMode 双挂载的丢弃首跑由实例侧 ownsIntro/ticked 记账在 cleanup 回退，
 * 让存活挂载重新认领（见主 effect cleanup）。
 */
let introPlayed = false

interface MascotProps {
  /** 渲染尺寸（正方形，px），默认 96 */
  size?: number
  /** 表情状态，默认 idle */
  state?: MascotState
  /** 是否启用眼睛跟随鼠标，默认 true */
  follow?: boolean
  className?: string
}

const Mascot = ({ size = 96, state = 'idle', follow = true, className }: MascotProps) => {
  const resolved: ResolvedMascotState = state === 'listening' ? 'idle' : state
  const reduced = useMemo(
    () =>
      typeof window !== 'undefined' &&
      !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    [],
  )

  // 引擎构造照上游：new BotEngine(RAYON, mappedState, shapeRadii, expression)
  const engine = useMemo(
    () => new BotEngine(R, STATE_MAP[resolved], TRIANGLE_RADII, EXPRESSION),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 引擎只建一次，状态变化走 setState
    [],
  )
  const [frame, setFrame] = useState<BotFrame>(() => engine.sample(0))
  const [paper, setPaper] = useState(DEFAULT_PAPER)

  const svgRef = useRef<SVGSVGElement>(null)
  /** 指针位置（进 ref 供 rAF 消费），null = 无指针（回自动 wander） */
  const pointerRef = useRef<{ x: number; y: number } | null>(null)
  /** 当前映射后的 bloub 状态（aim 的 baseFace 判定用） */
  const stateRef = useRef<StateId>(STATE_MAP[resolved])
  /** rAF 场景时钟（引擎是纯时间函数，setState/重采样都要日期） */
  const clockRef = useRef(0)
  const followRef = useRef(follow)
  followRef.current = follow
  /** 本实例认领了入场（模块级 once 旗标的实例侧记账，StrictMode 回退用） */
  const ownsIntroRef = useRef(false)
  /** 本实例 rAF 是否真渲染过一帧（StrictMode 丢弃挂载 = false） */
  const tickedRef = useRef(false)

  const uid = useId()
  const maskId = `bot-mask${uid}`

  /* ── paper 衬底：眼洞显色随主题。挂载读一次 --bg，data-theme 变化重读 ── */
  useEffect(() => {
    const read = () => {
      const v = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()
      // mixHex 只吃真 hex：oklch 等颜色函数解析不出 # 时退回上游默认，不阻断渲染
      setPaper(v.startsWith('#') ? v : DEFAULT_PAPER)
    }
    read()
    const obs = new MutationObserver(read)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])

  /* ── props.state 变化 → 引擎日期化换态；reduced 无时钟，reset 重放新态
        首帧（setState 在 0 点重采样会取到上一态姿态，见 engine.reset 注释） ── */
  useEffect(() => {
    const mapped = STATE_MAP[resolved]
    stateRef.current = mapped
    if (reduced) {
      engine.reset(mapped, 0)
      setFrame(engine.sample(0))
    } else {
      engine.setState(mapped, clockRef.current)
    }
  }, [engine, reduced, resolved])

  /* ── 指针监听：window pointermove（触屏跳过）+ document pointerleave ── */
  useEffect(() => {
    if (reduced || !follow) return
    const onMove = (e: PointerEvent) => {
      // 触屏没有悬停光标：手指抬起会把视线冻在最后一点，读作 bug（上游同款）
      if (e.pointerType === 'touch') return
      pointerRef.current = { x: e.clientX, y: e.clientY }
    }
    const onLeave = () => {
      pointerRef.current = null
    }
    window.addEventListener('pointermove', onMove)
    document.addEventListener('pointerleave', onLeave)
    return () => {
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerleave', onLeave)
    }
  }, [follow, reduced])

  /* ── 主循环：clock 有界增量 + follow/入场脚本互斥（follow 优先，上游同款） ── */
  useEffect(() => {
    if (reduced) return
    let raf = 0
    let last = 0
    /** true = 视线目标已压在引擎上，松开才有意义（照上游 aiming） */
    let aiming = false
    /** 半转开始时的时钟（进面板时转一圈看过来） */
    let turnSince = 0
    /** 入场脚本起播时刻与在播标志 */
    let gazeSince = 0
    let scripted = false

    /** 归还视线：与去程同速（TURN_TIME）半转回去，照抄上游 release() */
    const release = () => {
      if (!aiming) return
      engine.setLook(null, clockRef.current, TURN_TIME)
      aiming = false
    }

    /** 跟随照抄上游 aim()：DOM 侧只测位置，注视规则在 ./bloub/gaze */
    const aim = () => {
      // 只在 baseFace 状态跟随：其余状态的视线就是动画本身，叠跟会糊
      if (!STATE_BY_ID.get(stateRef.current)?.baseFace) {
        release()
        return
      }
      const box = svgRef.current?.getBoundingClientRect()
      // 尺寸为 0 的盒子（面板隐藏）会让归一化变 0/0=NaN，引擎会永久保留坏目标
      if (!box || box.width === 0 || box.height === 0) return
      if (!aiming) turnSince = clockRef.current
      // 归一化按半窗宽高：视线在指针抵达屏幕边缘时饱和，与头像占位无关
      const halfW = Math.max(1, window.innerWidth / 2)
      const halfH = Math.max(1, window.innerHeight / 2)
      engine.setLook(
        lookTarget({
          nx: pointerRef.current
            ? clamp((pointerRef.current.x - (box.left + box.width / 2)) / halfW, -1, 1)
            : 0,
          ny: pointerRef.current
            ? clamp((pointerRef.current.y - (box.top + box.height / 2)) / halfH, -1, 1)
            : 0,
          tour: easings.easeOutQuint(clamp((clockRef.current - turnSince) / TURN_TIME)),
          pointer: pointerRef.current !== null,
        }),
        clockRef.current,
      )
      aiming = true
    }

    const tick = (ms: number) => {
      raf = requestAnimationFrame(tick)
      // 首帧真渲染打点：区分 StrictMode 丢弃挂载与真实挂载
      tickedRef.current = true
      // 场景时钟按帧增量有界：标签页隐藏再回来不跳帧（上游同款）
      const dt = last ? Math.min((ms - last) / 1000, 0.064) : 0
      last = ms
      clockRef.current += dt

      // 入场收尾：脚本播满 TOUR_TIME + 0.2s 后松开，交还状态自带视线
      if (scripted && clockRef.current - gazeSince >= SCRIPT_RELEASE) {
        engine.setLook(null, clockRef.current)
        scripted = false
      }
      // follow 优先（上游 tick 同款互斥）；follow 关闭时归还视线、脚本续跑
      if (followRef.current) {
        aim()
      } else {
        release()
        if (scripted) {
          engine.setLook(tourLook(clockRef.current - gazeSince), clockRef.current, SCRIPT_MORPH)
        }
      }
      setFrame(engine.sample(clockRef.current))
    }
    raf = requestAnimationFrame(tick)

    // 入场（模块级 once，非 reduced）：gaze 脚本 = tourLook（上游 arrival）。
    // 预热目标提前 SCRIPT_MORPH 落位，首帧即全量应用，避免第二帧眼睛跳变
    // （照抄上游 watch(gaze) 写法）。
    if (!introPlayed) {
      introPlayed = true
      ownsIntroRef.current = true
      gazeSince = clockRef.current
      scripted = true
      engine.setLook(tourLook(0), clockRef.current - SCRIPT_MORPH, SCRIPT_MORPH)
    }

    return () => {
      cancelAnimationFrame(raf)
      release()
      // StrictMode 双挂载：丢弃的首跑（认领过入场但 rAF 一帧都没渲染）回退
      // once 旗标，让存活的第二次挂载重新认领；真实卸载（已渲染过）不回退，
      // 保持「每冷启动只播一次」语义。
      if (ownsIntroRef.current && !tickedRef.current) introPlayed = false
    }
  }, [engine, reduced])

  /* ── 渲染：结构忠实上游 BloubBot.vue（mask 洞眼 + paper 衬底 + 弧线前后半） ── */

  /** 粒子着色：显式色优先；depth 混 paper（离得越远越融进背景） */
  const dotAttrs = (dot: BotFrame['dots'][number]) => {
    const fill = dot.color ?? (dot.depth === undefined ? INK : mixHex(paper, INK, dot.depth))
    const common = { fill, opacity: dot.opacity }
    return dot.d
      ? {
          ...common,
          d: dot.d,
          transform: `translate(${dot.x} ${dot.y}) rotate(${dot.rot ?? 0}) scale(${R})`,
        }
      : { ...common, cx: dot.x, cy: dot.y, r: dot.r }
  }

  const renderDot = (dot: BotFrame['dots'][number], key: string) =>
    dot.d ? <path key={key} {...dotAttrs(dot)} /> : <circle key={key} {...dotAttrs(dot)} />

  return (
    <div
      className={className}
      style={{ width: size, height: size, display: 'grid', placeItems: 'center', overflow: 'visible' }}
    >
      <svg
        ref={svgRef}
        width={size}
        height={size}
        viewBox={`${-VB} ${-VB} ${VB * 2} ${VB * 2}`}
        role="img"
        aria-label="AI 管家"
        style={{ display: 'block', overflow: 'visible' }}
      >
        <defs>
          {/* 眼睛是身体上的真洞（mask 抠洞）：视线滑向边缘时被轮廓自动裁掉 */}
          <mask
            id={maskId}
            maskUnits="userSpaceOnUse"
            x={-VB}
            y={-VB}
            width={VB * 2}
            height={VB * 2}
          >
            <path d={frame.bodyPath} fill="#fff" />
            {frame.eyes.map((eye, i) => (
              <path key={i} d={eye.d} transform={eye.matrix} opacity={eye.alpha} fill="#000" />
            ))}
            {frame.notch && (
              <circle cx={frame.notch.x} cy={frame.notch.y} r={frame.notch.r} fill="#000" />
            )}
          </mask>

          {/* 轨道渐变：每条弧一个 linearGradient（沿迹取色） */}
          {frame.arcs.map((arc) => (
            <linearGradient
              key={arc.id}
              id={`${uid}-${arc.id}`}
              gradientUnits="userSpaceOnUse"
              x1={arc.grad.x1}
              y1={arc.grad.y1}
              x2={arc.grad.x2}
              y2={arc.grad.y2}
            >
              {arc.grad.stops.map((c, i) => (
                <stop key={i} offset={i / (arc.grad.stops.length - 1)} stopColor={c} />
              ))}
            </linearGradient>
          ))}
        </defs>

        {/* 轨道后半：先画，被身体遮住（真深度排序，弧线才读作环绕） */}
        <g fill="none" strokeLinecap="round">
          {frame.arcs.map((arc) => (
            <path
              key={`b${arc.id}`}
              d={arc.back}
              stroke={`url(#${uid}-${arc.id})`}
              strokeWidth={arc.width}
              opacity={arc.opacity}
            />
          ))}
        </g>

        {/* 爆散粒子从核后飞出 */}
        {frame.dotsBehind && frame.dots.map((dot, i) => renderDot(dot, `pb${i}`))}

        <g opacity={frame.bodyAlpha}>
          {/* paper 衬底：眼洞透出的是页面底色而非纯白；洞是 mask 抠的，衬底
              挡住身后元素从洞里漏出（后弧/粒子正好画在身体后面） */}
          <path d={frame.bodyPath} fill={paper} />
          <g mask={`url(#${maskId})`}>
            <rect x={-VB} y={-VB} width={VB * 2} height={VB * 2} fill={INK} />
          </g>
        </g>

        {!frame.dotsBehind && frame.dots.map((dot, i) => renderDot(dot, `pf${i}`))}

        {/* notify 通知圆点 */}
        {frame.notif && (
          <circle cx={frame.notif.x} cy={frame.notif.y} r={frame.notif.r} fill={NOTIF_BLUE} />
        )}

        {/* 轨道前半 */}
        <g fill="none" strokeLinecap="round">
          {frame.arcs.map((arc) => (
            <path
              key={`f${arc.id}`}
              d={arc.front}
              stroke={`url(#${uid}-${arc.id})`}
              strokeWidth={arc.width}
              opacity={arc.opacity}
            />
          ))}
        </g>
      </svg>
    </div>
  )
}

export default Mascot
