/**
 * Mascot — AI 管家吉祥物（bloub 引擎 React 薄壳适配器）。
 * 引擎 vendor 自 jeremy-prt/bloub @ b4bb3c1（MIT），./bloub/ 逐字；本文件只做适配层：
 * 状态映射、follow 跟随、入场、点击/wink、打盹、拖拽回弹、shape/color、frozen 静态。
 * 渲染 = 实心 ink 身体 + paper 色眼块（clipPath 裁轮廓，替换上游 mask 抠洞——深色主题渗白圈）。
 */

import { useEffect, useId, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { NOTIF_BLUE } from './bloub/bot/decor'
import { DEFAULT_EXPRESSION, EXPRESSIONS, EXPRESSION_BY_ID, type BotExpression } from './bloub/bot/expressions'
import { BotEngine, type BotFrame, type Look } from './bloub/bot/engine'
import { clamp, easings } from './bloub/bot/math'
import { DEMI_VIEWBOX, RAYON } from './bloub/bot/repere'
import { COLOR_BY_ID, SHAPE_BY_ID, mixHex } from './bloub/bot/skins'
import { STATE_BY_ID, type StateId } from './bloub/bot/states'
import { HUMEURS, SPIN, TOUR_TIME, TURN_TIME, tourLook, type Aim } from './bloub/gaze'

export type MascotState =
  | 'idle' | 'thinking' | 'searching' | 'replying' | 'success' | 'error' | 'listening'

/** listening 归一为 idle 后参与映射；sleep 为打盹内部态，不暴露给调用方 */
type ResolvedMascotState = Exclude<MascotState, 'listening'>
const STATE_MAP: Record<ResolvedMascotState | 'sleep', StateId> = {
  idle: 'idle', thinking: 'thinking', searching: 'orbit',
  replying: 'notify', success: 'play', error: 'alert', sleep: 'sleep',
}

const R = RAYON, VB = DEMI_VIEWBOX
const DEFAULT_SHAPE_ID = 'triangle', DEFAULT_COLOR_ID = 'encre'
/** shapeOf：非法 shape 回退默认三角（radii 引用按 id 稳定，setShape 靠引用判等） */
const shapeOf = (id: string) => (SHAPE_BY_ID.get(id) ?? SHAPE_BY_ID.get(DEFAULT_SHAPE_ID)!).radii
const NEUTRAL = EXPRESSION_BY_ID.get(DEFAULT_EXPRESSION)!
/** 默认表情正视：保留抬头 yaw/pitch 签名、roll 归零；id 不变——eyefit 按 id 查表、setExpression 按引用早退 */
const NEUTRE: BotExpression = { ...NEUTRAL, gaze: { ...NEUTRAL.gaze, roll: 0 } }
const DROWSY = EXPRESSION_BY_ID.get('somnolent') ?? null, SURPRIS = EXPRESSION_BY_ID.get('surpris')!, HEUREUX = EXPRESSION_BY_ID.get('heureux')!
const DEFAULT_PAPER = '#f9f9f9' // mixHex 需真 hex：--bg 非 # 开头时退回上游默认衬底
const SCRIPT_MORPH = 1 / 60, SCRIPT_RELEASE = TOUR_TIME + 0.2 // 入场短 rattrapage（0 会除零出 NaN）
const DOUBLE_CLICK_MS = 350, WINK_MS = 1600, EXPR_MS = 1200
const DROWSY_S = 15, SLEEP_S = 30 // 打盹两级阈值（clock 秒）
/** 跟随幅度（22/18 在 triangle eyefit 求解域内，禁超 26）；范围：超 6×尺寸视为无指针（远不跟） */
const FOLLOW_YAW = 22, FOLLOW_PITCH = 18, FOLLOW_RANGE = 6
/** 拖拽：4px 进入阈值 / 松手 heureux 回落 ms */
const DRAG_PX = 4, DRAG_MS = 800

/** 单击表情池：idle 用全零滚转的 HUMEURS（look 只接管 yaw/pitch，滚转来自表情，非零滚转让眼睛跳）；其余态全池去 neutre */
const HUMEURS_POOL: BotExpression[] = HUMEURS.map((id) => EXPRESSION_BY_ID.get(id)!).filter(Boolean)
const ALL_POOL: BotExpression[] = EXPRESSIONS.filter((e) => e.id !== DEFAULT_EXPRESSION)

/** follow 视线目标：上游 lookTarget 公式，-TURN/+PITCH 归零（静止正视、鼠标在哪看哪） */
const lookTargetCentered = ({ nx, ny, tour, pointer }: Aim): Look => ({
  yaw: nx * FOLLOW_YAW, pitch: -ny * FOLLOW_PITCH, mix: tour,
  spin: SPIN * (1 - tour), wander: pointer ? 0 : 1,
})

/** 入场每冷启动只播一次（模块级 once）；StrictMode 丢弃首跑由 ownsIntro/ticked 在 cleanup 回退 */
let introPlayed = false

interface MascotProps {
  size?: number // 正方形 px
  state?: MascotState
  /** 眼睛跟随鼠标；frozen = 静态一帧采样（无 rAF/交互），reduced-motion 同效 */
  follow?: boolean
  frozen?: boolean
  /** shape/color id 非法回退 triangle/encre */
  shape?: string
  color?: string
  className?: string
}

const Mascot = ({ size = 96, state = 'idle', follow = true, frozen = false, shape = DEFAULT_SHAPE_ID, color = DEFAULT_COLOR_ID, className }: MascotProps) => {
  const resolved: ResolvedMascotState = state === 'listening' ? 'idle' : state
  /** still = reduced || frozen：动画 effect、onClick、指针/拖拽监听全走它 */
  const still = useMemo(() => frozen || (typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches), [frozen])
  const ink = COLOR_BY_ID.get(color)?.hex ?? COLOR_BY_ID.get(DEFAULT_COLOR_ID)!.hex

  // 引擎构造照上游：new BotEngine(RAYON, mappedState, shapeRadii, expression)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- 引擎只建一次，状态/形状变化走带日期的 setter
  const engine = useMemo(() => new BotEngine(R, STATE_MAP[resolved], shapeOf(shape), NEUTRE), [])
  const [frame, setFrame] = useState<BotFrame>(() => engine.sample(0))
  const [paper, setPaper] = useState(DEFAULT_PAPER)

  const svgRef = useRef<SVGSVGElement>(null)
  const pointerRef = useRef<{ x: number; y: number } | null>(null)
  /** 当前引擎态（wink/sleep 等内部态也会写）；底态 = props 派生，回落目标 */
  const stateRef = useRef<StateId>(STATE_MAP[resolved]), baseStateRef = useRef<StateId>(STATE_MAP[resolved])
  const clockRef = useRef(0)
  const followRef = useRef(follow)
  followRef.current = follow
  const ownsIntroRef = useRef(false), tickedRef = useRef(false)
  const lastInteractRef = useRef(0), drowsyRef = useRef(false)
  const lastClickRef = useRef(0), lastExprRef = useRef<string | null>(null)
  const singleTimerRef = useRef<number>(), winkTimerRef = useRef<number>()
  /* ── 拖拽记账：drag 位移驱动渲染（null=未拖），dragged=已过 4px 阈值，suppressClick 吞拖拽后的 click ── */
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null)
  const dragStartRef = useRef<{ x: number; y: number } | null>(null), draggedRef = useRef(false), suppressClickRef = useRef(false)

  const uid = useId()
  const clipId = `bot-clip${uid}`

  /* ── paper 衬底：眼洞显色随主题。挂载读一次 --bg，data-theme 变化重读 ── */
  useEffect(() => {
    const read = () => {
      const v = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()
      setPaper(v.startsWith('#') ? v : DEFAULT_PAPER)
    }
    read()
    const obs = new MutationObserver(read)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])

  /** 唤醒：计时归零；drowsy 回 neutre、sleep 回底态（幂等；window 监听与自身点击共用） */
  const wake = () => {
    lastInteractRef.current = clockRef.current
    if (drowsyRef.current) { drowsyRef.current = false; engine.setExpression(NEUTRE, clockRef.current) }
    if (stateRef.current === 'sleep') { stateRef.current = baseStateRef.current; engine.setState(baseStateRef.current, clockRef.current) }
  }

  /* ── props.state 变化 → 换态并清打盹；still 走 reset+sample(0) 一帧重采样 ── */
  useEffect(() => {
    const mapped = STATE_MAP[resolved]
    stateRef.current = mapped
    baseStateRef.current = mapped
    lastInteractRef.current = clockRef.current
    drowsyRef.current = false
    engine.setExpression(NEUTRE, clockRef.current)
    if (still) { engine.reset(mapped, 0); setFrame(engine.sample(0)) } else { engine.setState(mapped, clockRef.current) }
  }, [engine, still, resolved])

  /* ── shape 变化 → morph 换形；still 传 -1 使 0 点即新形（k≥1 全量应用） ── */
  useEffect(() => {
    const radii = shapeOf(shape)
    if (still) { engine.setShape(radii, -1); setFrame(engine.sample(0)) } else { engine.setShape(radii, clockRef.current) }
  }, [engine, still, shape])

  /* ── 交互监听：唤醒 + follow 指针（触屏跳过，pointerleave 归还）+ 拖拽 move/up（blur 兜底视为松手） ── */
  useEffect(() => {
    if (still) return
    const onMove = (e: PointerEvent) => {
      wake()
      if (follow && e.pointerType !== 'touch') pointerRef.current = { x: e.clientX, y: e.clientY }
      const s = dragStartRef.current
      if (!s) return
      const dx = e.clientX - s.x, dy = e.clientY - s.y
      if (!draggedRef.current && Math.hypot(dx, dy) < DRAG_PX) return
      if (!draggedRef.current) {
        // 过 4px 阈值进入拖拽：唤醒 + 表情固定 surpris + 清单击回落 timer；跟随由主循环暂停
        draggedRef.current = true
        wake()
        window.clearTimeout(singleTimerRef.current)
        engine.setExpression(SURPRIS, clockRef.current)
      }
      setDrag({ x: dx, y: dy })
    }
    const onUp = () => {
      if (!dragStartRef.current) return
      dragStartRef.current = null
      suppressClickRef.current = draggedRef.current
      draggedRef.current = false
      setDrag(null) // transform 归零：CSS transition 回弹原位
      if (!suppressClickRef.current) return
      wake()
      engine.setExpression(HEUREUX, clockRef.current)
      window.clearTimeout(singleTimerRef.current)
      singleTimerRef.current = window.setTimeout(() => engine.setExpression(NEUTRE, clockRef.current), DRAG_MS)
    }
    const onLeave = () => { pointerRef.current = null }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('blur', onUp)
    window.addEventListener('click', wake)
    if (follow) document.addEventListener('pointerleave', onLeave)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('blur', onUp)
      window.removeEventListener('click', wake)
      if (follow) document.removeEventListener('pointerleave', onLeave)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- wake/engine 只触 refs，首帧闭包即正确
  }, [follow, still])

  /* ── 点击：双击 → wink（1.6s 回底态）；单击 → 随机表情（1.2s 回落，连点重置+换新）；拖拽过的 click 吞掉 ── */
  const handleClick = () => {
    if (suppressClickRef.current) { suppressClickRef.current = false; return }
    wake()
    const now = performance.now()
    const gap = now - lastClickRef.current
    lastClickRef.current = gap <= DOUBLE_CLICK_MS ? 0 : now
    if (gap <= DOUBLE_CLICK_MS) {
      window.clearTimeout(singleTimerRef.current)
      window.clearTimeout(winkTimerRef.current)
      stateRef.current = 'wink'
      engine.setState('wink', clockRef.current)
      winkTimerRef.current = window.setTimeout(() => {
        stateRef.current = baseStateRef.current
        engine.setExpression(NEUTRE, clockRef.current)
        engine.setState(baseStateRef.current, clockRef.current)
      }, WINK_MS)
      return
    }
    // 非 baseFace 态只换表情不抢状态（引擎在非 baseFace 忽略表情，回底态后生效）
    const pool = baseStateRef.current === 'idle' ? HUMEURS_POOL : ALL_POOL
    const fresh = pool.filter((e) => e.id !== lastExprRef.current)
    const expr = fresh[Math.floor(Math.random() * fresh.length)] ?? pool[0]
    lastExprRef.current = expr!.id
    engine.setExpression(expr!, clockRef.current)
    window.clearTimeout(singleTimerRef.current)
    singleTimerRef.current = window.setTimeout(() => engine.setExpression(NEUTRE, clockRef.current), EXPR_MS)
  }

  /** 拖拽起点：pointerdown 在 SVG 上记录（4px 前不干扰 click/跟随） */
  const onDragDown = (e: ReactPointerEvent) => {
    suppressClickRef.current = false
    dragStartRef.current = { x: e.clientX, y: e.clientY }
  }

  /* ── 主循环：clock 有界增量 + 入场脚本优先于 follow + 打盹调度 ── */
  useEffect(() => {
    if (still) return
    let raf = 0
    let last = 0
    /** true = 视线目标已压在引擎上，松开才有意义（照上游 aiming） */
    let aiming = false
    /** 半转开始时钟 / 入场一圈已收尾（aim 首接把 turnSince 回拨 TURN_TIME，不重爬坡） */
    let turnSince = 0, tourDone = false
    let gazeSince = 0, scripted = false

    /** 归还视线（照上游 release）：与去程同速半转回去 */
    const release = () => {
      if (!aiming) return
      engine.setLook(null, clockRef.current, TURN_TIME)
      aiming = false
    }

    const aim = () => {
      // 只在 baseFace 状态跟随：其余状态的视线就是动画本身，叠跟会糊
      if (!STATE_BY_ID.get(stateRef.current)?.baseFace) {
        release()
        return
      }
      const box = svgRef.current?.getBoundingClientRect()
      // 尺寸为 0 的盒子（面板隐藏）会让归一化变 0/0=NaN，引擎永久保留坏目标
      if (!box || box.width === 0 || box.height === 0) return
      if (!aiming) turnSince = tourDone ? clockRef.current - TURN_TIME : clockRef.current
      // 归一化按半窗宽高：视线在指针抵达屏幕边缘时饱和（与头像占位无关）
      const halfW = Math.max(1, window.innerWidth / 2), halfH = Math.max(1, window.innerHeight / 2)
      const p = pointerRef.current
      const dx = p ? p.x - (box.left + box.width / 2) : 0
      const dy = p ? p.y - (box.top + box.height / 2) : 0
      // 远不跟近才跟：超 6×size 按无指针处理（nx/ny=0、wander=1，视线自然回中）
      const near = p !== null && Math.hypot(dx, dy) <= FOLLOW_RANGE * box.width
      engine.setLook(lookTargetCentered({
        nx: near ? clamp(dx / halfW, -1, 1) : 0,
        ny: near ? clamp(dy / halfH, -1, 1) : 0,
        tour: easings.easeOutQuint(clamp((clockRef.current - turnSince) / TURN_TIME)),
        pointer: near,
      }), clockRef.current)
      aiming = true
    }

    /** 打盹：仅 idle 底态无交互时调度；somnolent 幂等重设（同引用早退） */
    const scheduleSleep = () => {
      if (baseStateRef.current !== 'idle' || stateRef.current !== 'idle') return
      const quiet = clockRef.current - lastInteractRef.current
      if (quiet >= SLEEP_S) { stateRef.current = 'sleep'; engine.setState('sleep', clockRef.current) }
      else if (quiet >= DROWSY_S) { drowsyRef.current = true; engine.setExpression(DROWSY, clockRef.current) }
    }

    const tick = (ms: number) => {
      raf = requestAnimationFrame(tick)
      tickedRef.current = true // 首帧真渲染打点：区分 StrictMode 丢弃挂载与真实挂载
      // 场景时钟按帧增量有界：标签页隐藏再回来不跳帧（上游同款）
      const dt = last ? Math.min((ms - last) / 1000, 0.064) : 0
      last = ms
      clockRef.current += dt

      // 入场收尾：脚本播满 TOUR_TIME + 0.2s 后松开，交还状态自带视线
      if (scripted && clockRef.current - gazeSince >= SCRIPT_RELEASE) { engine.setLook(null, clockRef.current); scripted = false; tourDone = true }
      // scripted 优先；其后 follow 接管（拖拽中暂停 aim），无 follow 归还视线
      if (scripted) {
        engine.setLook(tourLook(clockRef.current - gazeSince), clockRef.current, SCRIPT_MORPH)
      } else if (followRef.current && !draggedRef.current) {
        aim()
      } else {
        release()
      }
      scheduleSleep()
      setFrame(engine.sample(clockRef.current))
    }
    raf = requestAnimationFrame(tick)

    // 入场（模块级 once）：预热目标提前 SCRIPT_MORPH 落位，首帧即全量应用（照上游 watch(gaze)）
    if (!introPlayed) {
      introPlayed = true; ownsIntroRef.current = true; gazeSince = clockRef.current; scripted = true
      engine.setLook(tourLook(0), clockRef.current - SCRIPT_MORPH, SCRIPT_MORPH)
    }

    return () => {
      cancelAnimationFrame(raf)
      release()
      // StrictMode 丢弃首跑（认领过但零帧渲染）回退 once 旗标；真实卸载不回退
      if (ownsIntroRef.current && !tickedRef.current) introPlayed = false
    }
  }, [engine, still])

  /* ── 渲染：实心 ink 身体 + paper 色眼/notch 叠画进 clipPath；wrapper 拖拽位移 + 松手回弹 ── */

  /** 粒子渲染：显式色优先；depth 混 paper（离得越远越融进背景） */
  const renderDot = (dot: BotFrame['dots'][number], key: string) => {
    const fill = dot.color ?? (dot.depth === undefined ? ink : mixHex(paper, ink, dot.depth))
    const attrs = dot.d
      ? { fill, opacity: dot.opacity, d: dot.d, transform: `translate(${dot.x} ${dot.y}) rotate(${dot.rot ?? 0}) scale(${R})` }
      : { fill, opacity: dot.opacity, cx: dot.x, cy: dot.y, r: dot.r }
    return dot.d ? <path key={key} {...attrs} /> : <circle key={key} {...attrs} />
  }

  return (
    <div
      className={className}
      style={{
        width: size, height: size, display: 'grid', placeItems: 'center', overflow: 'visible',
        // 拖拽中 wrapper 跟随指针且关过渡；松手后经弹性 transition 回弹原位
        transform: drag ? `translate(${drag.x}px, ${drag.y}px)` : undefined,
        transition: drag ? 'none' : 'transform 0.45s cubic-bezier(0.22, 1.75, 0.4, 1)',
      }}
      onClick={still ? undefined : handleClick}
    >
      <svg
        ref={svgRef}
        width={size} height={size}
        viewBox={`${-VB} ${-VB} ${VB * 2} ${VB * 2}`}
        role="img" aria-label="AI 管家"
        onPointerDown={still ? undefined : onDragDown}
        style={{ display: 'block', overflow: 'visible' }}
      >
        <defs>
          {/* 眼/notch 是叠画的 paper 色块，clip 到身体轮廓：视线滑向边缘时被裁掉 */}
          <clipPath id={clipId}>
            <path d={frame.bodyPath} />
          </clipPath>
          {frame.arcs.map((arc) => (
            <linearGradient key={arc.id} id={`${uid}-${arc.id}`} gradientUnits="userSpaceOnUse"
              x1={arc.grad.x1} y1={arc.grad.y1} x2={arc.grad.x2} y2={arc.grad.y2}>
              {arc.grad.stops.map((c, i) => (<stop key={i} offset={i / (arc.grad.stops.length - 1)} stopColor={c} />))}
            </linearGradient>
          ))}
        </defs>

        {/* 轨道后半：先画被身体遮住（真深度排序）；爆散粒子从核后飞出 */}
        <g fill="none" strokeLinecap="round">
          {frame.arcs.map((arc) => (
            <path key={`b${arc.id}`} d={arc.back} stroke={`url(#${uid}-${arc.id})`} strokeWidth={arc.width} opacity={arc.opacity} />
          ))}
        </g>
        {frame.dotsBehind && frame.dots.map((dot, i) => renderDot(dot, `pb${i}`))}

        <g opacity={frame.bodyAlpha}>
          <path d={frame.bodyPath} fill={ink} />
          {/* 眼/notch：paper = 页面底色 → 读作身体上的真洞，clip 防出轮廓 */}
          <g clipPath={`url(#${clipId})`}>
            {frame.eyes.map((eye, i) => (<path key={i} d={eye.d} transform={eye.matrix} opacity={eye.alpha} fill={paper} />))}
            {frame.notch && <circle cx={frame.notch.x} cy={frame.notch.y} r={frame.notch.r} fill={paper} />}
          </g>
        </g>
        {!frame.dotsBehind && frame.dots.map((dot, i) => renderDot(dot, `pf${i}`))}

        {frame.notif && <circle cx={frame.notif.x} cy={frame.notif.y} r={frame.notif.r} fill={NOTIF_BLUE} />}

        <g fill="none" strokeLinecap="round">
          {frame.arcs.map((arc) => (
            <path key={`f${arc.id}`} d={arc.front} stroke={`url(#${uid}-${arc.id})`} strokeWidth={arc.width} opacity={arc.opacity} />
          ))}
        </g>
      </svg>
    </div>
  )
}

export default Mascot
