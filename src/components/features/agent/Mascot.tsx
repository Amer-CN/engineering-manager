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
 */

import { useEffect, useMemo, useRef } from 'react'
import { GROK_EXPRESSIONS, GROK_BODY_PATH, GROK_CANVAS, GROK_CENTERED_EXPR, type GrokEyeRing } from './grok-eyes-data'

export type MascotState =
  | 'idle'
  | 'thinking'
  | 'searching'
  | 'replying'
  | 'success'
  | 'error'
  | 'sleep' // 内部自动：闲置超时打盹（外部 props 不会直接传入）
  | 'listening' // 旧状态别名 → 归一为 idle

interface MascotProps {
  /** 渲染尺寸（正方形，px），默认 96 */
  size?: number
  /** 表情状态，默认 idle */
  state?: MascotState
  /** 是否启用眼睛跟随鼠标，默认 true */
  follow?: boolean
  className?: string
}

/* ══════════════ SVG 坐标系常量（viewBox 跟随 Grok 画布 228.5×238） ══════════════ */

const CX = GROK_CANVAS.w / 2 // 114.25
const CY = GROK_CANVAS.h / 2 // 119
/** 身体覆盖层（渐变/红晕）用圆半径：足以盖住 blob 最远点，由 clipPath 兜底不外溢 */
const BALL_R = 130
/** 单眼轮廓点数（Grok 官方 48 点 / 眼） */
const PT = 48
const SVG_NS = 'http://www.w3.org/2000/svg'
const ZERO_OFF = { x: 0, y: 0 }
/**
 * 鼠标跟随的基准表情：合成的绝对居中对称表情（官方表情 24 的左眼为种子，
 * 右眼镜像生成、双眼中点平移到画布正中）——跟随位移叠加在纯净的正中眼位上。
 * 详见 grok-eyes-data.ts 的 GROK_CENTERED_EXPR。
 */
/** 点击球身的俏皮表情候选（官方表情 id：3 不对称大眼-搞怪 / 5 圆睁惊 / 6 歪头困惑 / 9 大小眼 / 11 搞怪 / 12 大椭圆-得意 / 16 错位-鬼脸 / 19 对称大竖眼-好奇 / 21 鬼精灵 / 25 惊讶） */
const FUN_EXPRS = [3, 5, 6, 9, 11, 12, 16, 19, 21, 25]

/* ══════════════ 弹簧引擎（自研） ══════════════ */

interface SpringState {
  v: number
  vel: number
  t: number
}

/**
 * 极简弹簧：每帧 vel += (target - value) * stiffness * dt；
 * vel *= exp(-damping * dt)；value += vel * dt。
 * 接近目标且速度趋零时直接贴平，避免残余微振荡。
 */
class Engine {
  private m = new Map<string, SpringState>()
  private k = 46
  private d = 9

  constructor(names: string[]) {
    for (const n of names) this.m.set(n, { v: 0, vel: 0, t: 0 })
  }

  /** 设置目标值（动画平滑逼近） */
  setTarget(name: string, value: number): void {
    const s = this.m.get(name)
    if (s) s.t = value
  }

  /** 读取当前（已插值）值 */
  get(name: string): number {
    return this.m.get(name)?.v ?? 0
  }

  /** 运行时切换刚度（searching 用快节奏） */
  setStiffness(k: number, d: number): void {
    this.k = k
    this.d = d
  }

  /** 全部贴平到目标（reduced-motion 跳变用） */
  snapAll(): void {
    for (const s of this.m.values()) {
      s.v = s.t
      s.vel = 0
    }
  }

  step(dt: number): void {
    for (const s of this.m.values()) {
      s.vel += (s.t - s.v) * this.k * dt
      s.vel *= Math.exp(-this.d * dt)
      s.v += s.vel * dt
      if (Math.abs(s.t - s.v) < 0.0005 && Math.abs(s.vel) < 0.005) {
        s.v = s.t
        s.vel = 0
      }
    }
  }
}

/** 弹簧名：Lx0..Lx47、Ly0..Ly47、Rx0..Rx47、Ry0..Ry47 + lid / gx / gy */
const SPRING_NAMES: string[] = []
for (const side of ['L', 'R'] as const) {
  for (const ax of ['x', 'y'] as const) {
    for (let i = 0; i < PT; i++) SPRING_NAMES.push(`${side}${ax}${i}`)
  }
}
SPRING_NAMES.push('lid', 'gx', 'gy', 'bx', 'by', 'br', 'bs')

/* ══════════════ 状态配置表（六态 + listening 别名归 idle） ══════════════ */

/** 合成表情的虚拟 id（aimExpr 收到它时改用 GROK_CENTERED_EXPR） */
const CENTERED_EXPR_ID = -1

interface StateCfg {
  /** 官方表情 id 循环（exprIds 单元素或 stepMs 缺省 = 固定单表情） */
  exprIds: number[]
  stepMs?: number
  /** 是否跟随鼠标 */
  follow: boolean
  /** 是否随机眨眼 */
  blink: boolean
  /** replying 专用：小圆嘴（静态可辨"正在说话"） */
  mouth: boolean
  /** 身体动素：idle 呼吸 / think 缓晃 / scan 高频轻颤 / pulse 脉动 / pop 上弹 / shake 摇头 */
  body: 'idle' | 'think' | 'scan' | 'pulse' | 'pop' | 'shake'
}

type ResolvedState = Exclude<MascotState, 'listening'>

const STATE_CONFIG: Record<ResolvedState, StateCfg> = {
  idle: {
    // 正视表情 0 固定为主（无 stepMs = 不循环）；偶尔瞟一眼由 tick 内低频 glance 调度驱动
    exprIds: [CENTERED_EXPR_ID],
    follow: true,
    blink: true,
    mouth: false,
    body: 'idle',
  },
  thinking: {
    exprIds: [9, 17, 7, 14],
    stepMs: 1500,
    follow: false,
    blink: true,
    mouth: false,
    body: 'think',
  },
  searching: {
    exprIds: [7, 23, 4],
    stepMs: 300,
    follow: false,
    blink: false,
    mouth: false,
    body: 'scan',
  },
  replying: {
    exprIds: [10, 0, 24, 1],
    stepMs: 760,
    follow: false,
    blink: true,
    mouth: true,
    body: 'pulse',
  },
  success: {
    // [2 大圆睁惊一下 → 20 月牙笑]：多元素 exprIds 需 stepMs，600ms 一步循环，有"完成"的戏剧性
    exprIds: [2, 20],
    stepMs: 600,
    follow: false,
    blink: false,
    mouth: false,
    body: 'pop',
  },
  error: {
    exprIds: [18, 22],
    stepMs: 800,
    follow: false,
    blink: false,
    mouth: false,
    body: 'shake',
  },
  sleep: {
    // 闲置自动打盹（内部 tick 触发）：横平闭眼 + 极慢深呼吸（身体动素复用 idle 分支）
    exprIds: [13],
    follow: false,
    blink: false,
    mouth: false,
    body: 'idle',
  },
}

/* ══════════════ 眼环路径构建（48 点 → Catmull-Rom 平滑闭合） ══════════════ */

/** Catmull-Rom → 三次贝塞尔，闭合成光滑眼环 */
function smoothClosed(pts: Array<[number, number]>): string {
  const n = pts.length
  let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]
    const p1 = pts[i]
    const p2 = pts[(i + 1) % n]
    const p3 = pts[(i + 2) % n]
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    d += ` C${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`
  }
  return d + ' Z'
}

/** 单眼最终 d：48 点坐标整体平移 gx/gy + 眨眼按 lid 向眼中心垂直收缩 */
function eyeD(e: Engine, side: 'L' | 'R'): string {
  const gx = e.get('gx')
  const gy = e.get('gy')
  const lid = Math.max(e.get('lid'), 0.05) // 保留一丝细线，避免完全消失
  const pts: Array<[number, number]> = []
  let sumY = 0
  for (let i = 0; i < PT; i++) {
    const x = e.get(`${side}x${i}`) + gx
    const y = e.get(`${side}y${i}`) + gy
    sumY += y
    pts.push([x, y])
  }
  if (lid < 0.999) {
    const cy = sumY / PT
    for (const p of pts) p[1] = cy + (p[1] - cy) * lid
  }
  return smoothClosed(pts)
}

/* ══════════════ 表情调度与目标写入 ══════════════ */

/** 把某官方表情的左右眼 48 点坐标写到弹簧目标（逐点插值形变） */
function aimExpr(e: Engine, id: number): void {
  if (id === CENTERED_EXPR_ID) {
    aimRings(e, GROK_CENTERED_EXPR[0], GROK_CENTERED_EXPR[1])
    return
  }
  const [left, right] = GROK_EXPRESSIONS[id]
  aimRings(e, left, right)
}

/** 直接以环数据为目标的变体（跟随基准等合成表情用） */
function aimRings(e: Engine, left: GrokEyeRing, right: GrokEyeRing): void {
  for (let i = 0; i < PT; i++) {
    e.setTarget(`Lx${i}`, left[i][0])
    e.setTarget(`Ly${i}`, left[i][1])
    e.setTarget(`Rx${i}`, right[i][0])
    e.setTarget(`Ry${i}`, right[i][1])
  }
}

/** 按状态时间取当前表情 id（cycle 按 stepMs 轮换；exprIds 单元素/无 stepMs 则固定） */
function currentExpr(m: TickData, cfg: StateCfg): number {
  // 连点两下蹦跳覆盖（优先级最高）：dblJumpUntil 内固定 20 笑眼
  if (m.dblJumpExpr !== null && m.now < m.dblJumpUntil) return m.dblJumpExpr
  // 点击俏皮表情覆盖：funUntil 内优先展示 funExpr，过期后自动弹回状态表情
  if (m.funExpr !== null && m.now < m.funUntil) return m.funExpr
  // 犯困阶段：闲置 45s 起眯眼（表情 15），优先于 glance / 正视；鼠标一动直接回正视
  if (m.state === 'idle' && m.drowsy) return 15
  const ids = cfg.exprIds
  if (!cfg.stepMs || ids.length <= 1) {
    // idle 常态 = 合成对称正视（正对镜头，无官方表情自带的视线偏斜）；
    // 低频 glance 窗口内短暂切到 24/6（瞟眼）保持活物感
    if (m.state === 'idle' && m.glanceExpr !== null) return m.glanceExpr
    return ids[0]
  }
  const i = Math.floor((m.now - m.t0) / cfg.stepMs)
  return ids[((i % ids.length) + ids.length) % ids.length]
}

/** 静止辅助：身体/眼皮/注视归中性位（跳变快照与首帧同步用） */
function restBody(e: Engine): void {
  e.setTarget('lid', 1)
  e.setTarget('gx', 0)
  e.setTarget('gy', 0)
  e.setTarget('bx', 0)
  e.setTarget('by', 0)
  e.setTarget('br', 0)
  e.setTarget('bs', 1)
}

/* ══════════════ 身体动素（每个状态一档，振幅克制） ══════════════ */

function aimBody(e: Engine, m: TickData, cfg: StateCfg): void {
  // 连点两下蹦跳（优先级最高）：1.8s 内 3 次欢快弹跳，比单击 funExpr 更强
  if (m.dblJumpExpr !== null && m.now < m.dblJumpUntil) {
    const elapsed = m.now - m.dblJumpAt
    const hopT = elapsed / 600 // 3 跳（600ms/跳）
    const hp = hopT - Math.floor(hopT) // 当前跳内相位 0..1
    const decay = 1 - 0.12 * Math.min(2, Math.floor(hopT)) // 逐跳轻微衰减
    e.setTarget('by', -Math.sin(Math.PI * hp) * 26 * decay)
    e.setTarget('bs', 1 + Math.sin(Math.PI * hp) * 0.03)
    e.setTarget('br', Math.sin(Math.PI * hp) * 6 * decay)
    e.setTarget('bx', 0)
    return
  }
  // 点击俏皮表情：复用 success 上弹动素（幅度更轻），funUntil 内覆盖身体动素
  if (m.funExpr !== null && m.now < m.funUntil) {
    const fp = Math.min(1, (m.now - m.funAt) / 900)
    e.setTarget('by', -Math.sin(Math.PI * fp) * 10)
    e.setTarget('bs', 1 + Math.sin(Math.PI * fp) * 0.018)
    e.setTarget('bx', 0)
    e.setTarget('br', 0)
    return
  }
  const p = Math.min(1, (m.now - m.t0) / 1000)
  switch (cfg.body) {
    case 'idle': {
      // 打盹：极慢深呼吸（bs 振幅 0.012，周期约为日常呼吸 2 倍）
      if (m.state === 'sleep') {
        e.setTarget('bs', 1 + Math.sin((m.now / 1000) * ((Math.PI * 2) / 9.2)) * 0.012)
        e.setTarget('by', Math.sin((m.now / 1000) * ((Math.PI * 2) / 18.4)) * 0.6)
        e.setTarget('bx', 0)
        e.setTarget('br', 0)
        break
      }
      // 犯困：身体轻微下垂（by +3）+ 呼吸放缓（眯眼前奏，表情 15 由 currentExpr 提供）
      if (m.drowsy) {
        e.setTarget('bs', 1 + Math.sin((m.now / 1000) * ((Math.PI * 2) / 6.8)) * 0.008)
        e.setTarget('by', 3 + Math.sin((m.now / 1000) * ((Math.PI * 2) / 13.6)) * 0.5)
        e.setTarget('bx', 0)
        e.setTarget('br', 0)
        break
      }
      // 慢呼吸 + 轻微起伏
      e.setTarget('bs', 1 + Math.sin((m.now / 1000) * ((Math.PI * 2) / 4.6)) * 0.016)
      e.setTarget('by', Math.sin((m.now / 1000) * ((Math.PI * 2) / 9.2)) * 0.9)
      e.setTarget('bx', 0)
      e.setTarget('br', 0)
      break
    }
    case 'think': {
      e.setTarget('br', Math.sin((m.now / 1000) * ((Math.PI * 2) / 6.2)) * 1.8)
      e.setTarget('by', Math.sin((m.now / 1000) * ((Math.PI * 2) / 3.8)) * 0.7)
      e.setTarget('bs', 1 + Math.sin((m.now / 1000) * ((Math.PI * 2) / 5.5)) * 0.01)
      e.setTarget('bx', 0)
      break
    }
    case 'scan': {
      e.setTarget('br', Math.sin((m.now / 1000) * Math.PI * 2 * 1.9) * 1.6)
      e.setTarget('bx', Math.sin((m.now / 1000) * Math.PI * 2 * 2.4) * 1.4)
      e.setTarget('by', 0)
      e.setTarget('bs', 1)
      break
    }
    case 'pulse': {
      e.setTarget('bs', 1 + Math.sin((m.now / 1000) * (2 * Math.PI) / 0.9) * 0.02)
      e.setTarget('bx', 0)
      e.setTarget('by', 0)
      e.setTarget('br', 0)
      break
    }
    case 'pop': {
      // success 单次上弹
      e.setTarget('by', -Math.sin(Math.PI * p) * 16)
      e.setTarget('bs', 1 + Math.sin(Math.PI * p) * 0.02)
      e.setTarget('bx', 0)
      e.setTarget('br', 0)
      break
    }
    case 'shake': {
      // error 短促摇头（≤0.52s 振幅衰减）
      const sp = Math.min(1, (m.now - m.t0) / 520)
      const shake = sp < 1 ? 1 : 0
      e.setTarget('br', Math.sin((m.now / 1000) * 2 * Math.PI * 6) * 2.6 * shake)
      e.setTarget('bx', Math.sin((m.now / 1000) * 2 * Math.PI * 5) * 3 * shake)
      e.setTarget('by', 0)
      e.setTarget('bs', 1)
      break
    }
  }
}

/* ══════════════ 撒花粒子（success 一次性事件，≤14 个，1s 内消散） ══════════════ */

interface Particle {
  el: SVGCircleElement
  x: number
  y: number
  vx: number
  vy: number
  born: number
  life: number
}

interface TickData {
  state: ResolvedState
  t0: number
  now: number
  last: number
  blinkAt: number
  blinkOn: boolean
  blinkEnd: number
  flashAt: number
  /** idle 偶尔瞟一眼：下一次瞟眼的起始时刻 */
  nextGlanceAt: number
  /** 当前瞟眼表情 id（24 下瞟 / 6 中瞟），null = 正正视未在瞟 */
  glanceExpr: number | null
  /** 当前瞟眼结束时刻 */
  glanceUntil: number
  /** 点击俏皮表情临时覆盖：当前表情 id，null = 无 */
  funExpr: number | null
  /** 俏皮表情展示结束时刻（此后弹回状态表情） */
  funUntil: number
  /** 俏皮上弹起始时刻 */
  funAt: number
  /** props 传入的解析后状态（sleep 为内部临时态，唤醒后恢复回此状态） */
  baseState: ResolvedState
  /** 最近一次鼠标交互（mousemove/click）时刻，用于闲置超时打盹 */
  lastInteractAt: number
  /** 是否处于自动打盹（sleep）中 */
  sleeping: boolean
  /** 犯困阶段：闲置 45s 起眯眼（表情 15）+ 身体下垂，60s 才真正入睡；鼠标一动即回正视 */
  drowsy: boolean
  /** 犯困起始时刻（备用，便于扩展） */
  drowsyAt: number
  /** 连点两下蹦跳：上次点击时刻（350ms 阈值判双击） */
  lastClickAt: number
  /** 连点蹦跳临时表情（固定 20 笑眼），null = 无 */
  dblJumpExpr: number | null
  /** 连点蹦跳起始/结束时刻（总长约 1.8s） */
  dblJumpAt: number
  dblJumpUntil: number
  /** 鼠标拖拽进行中：暂停 aimBody 的 bx/by，改用拖拽偏移（松手后弹簧自动回弹原位） */
  dragging: boolean
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
  /** 拖拽生命周期（screen 坐标 → svg 坐标换算）：null = 无激活；on=false 按住=候选；on=true = 真正拖拽中 */
  const dragRef = useRef<{
    on: boolean
    sx: number
    sy: number
    bx0: number
    by0: number
    scale: number
    tx: number
    ty: number
  } | null>(null)

  const reduced = useMemo(
    () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    [],
  )

  /* ── 一次性绘制：把当前弹簧值直写进 DOM（不触发 React 重渲染） ── */
  const paint = (e: Engine, m: TickData, dt: number) => {
    eyeLRef.current?.setAttribute('d', eyeD(e, 'L'))
    eyeRRef.current?.setAttribute('d', eyeD(e, 'R'))

    bodyRef.current?.setAttribute(
      'transform',
      `translate(${e.get('bx').toFixed(2)} ${e.get('by').toFixed(2)}) rotate(${e.get('br').toFixed(2)} ${CX} ${CY}) scale(${e.get('bs').toFixed(3)})`,
    )

    // replying 小圆嘴（其余状态隐藏）
    const hc = STATE_CONFIG[m.state]
    mouthRef.current?.setAttribute('opacity', hc.mouth ? '0.85' : '0')

    // error 红色特征（两段）：前 0.5s 从峰值 0.35 衰减到常亮红晕 0.18，
    // 之后恒定 0.18 直到离开 error；非 error 归 0。
    // reduced-motion 下 flashAt 恒 0，直接落 0.18 常亮，静态帧可辨识。
    let flash = 0
    if (m.state === 'error') {
      const t = m.flashAt > 0 ? m.now - m.flashAt : 500
      const k = Math.min(1, t / 500)
      flash = 0.35 * (1 - k) + 0.18 * k
    }
    flashRef.current?.setAttribute('opacity', flash.toFixed(3))

    // success 粒子演进
    const list = particlesListRef.current
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i]
      const spent = m.now - p.born
      if (spent >= p.life) {
        p.el.remove()
        list.splice(i, 1)
        continue
      }
      p.vy += 220 * dt
      p.vx *= 0.985
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.el.setAttribute('cx', p.x.toFixed(2))
      p.el.setAttribute('cy', p.y.toFixed(2))
      p.el.setAttribute('opacity', Math.max(0, 1 - spent / p.life).toFixed(3))
    }
  }

  /* ── success 撒花：一次性挂载 ≤14 个粒子节点 ── */
  const spawnSuccess = (now: number) => {
    const g = particlesRef.current
    if (!g) return
    const n = 12
    for (let i = 0; i < n; i++) {
      const el = document.createElementNS(SVG_NS, 'circle')
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.7
      const sp = 55 + Math.random() * 85
      el.setAttribute('r', (1.6 + Math.random() * 1.8).toFixed(2))
      el.setAttribute('fill', i % 2 === 0 ? 'var(--accent)' : 'var(--success)')
      g.appendChild(el)
      particlesListRef.current.push({
        el,
        // 出生点：画布上部、横向散开（避免粒子糊在双眼之间）
        x: CX + (Math.random() - 0.5) * 140,
        y: 30,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        born: now,
        life: 480 + Math.random() * 380,
      })
    }
  }

  /* ── 点击球身：单击随机俏皮表情；连点两下（350ms 内）触发欢快蹦跳 ── */
  /*   双击优先：第二下取消正在播的单击表情，进入 1.8s 三连跳 + 撒花粒子（reduced-motion 下不启用） */
  const onBallClick = () => {
    if (reduced) return
    const m = metaRef.current
    const now = performance.now()
    const sinceLast = m.lastClickAt ? now - m.lastClickAt : Infinity
    m.lastClickAt = now

    // 双击（与上次点击间隔 ≤350ms）：取消单击俏皮表情，触发连点蹦跳
    if (sinceLast <= 350) {
      m.funExpr = null
      m.funUntil = 0
      m.funAt = 0
      m.dblJumpExpr = 20
      m.dblJumpAt = now
      m.dblJumpUntil = now + 1800
      if (!m.sleeping) spawnSuccess(now)
      return
    }

    // 单击：蹦跳进行中忽略（不打断），否则随机俏皮表情 + 轻微上弹
    if (now < m.dblJumpUntil) return
    m.funExpr = FUN_EXPRS[Math.floor(Math.random() * FUN_EXPRS.length)]
    m.funAt = now
    m.funUntil = now + 1000 + Math.random() * 200
  }

  /* ── 鼠标拖拽球身（仅 idle 且动画开启；reduced-motion 下禁用） ── */
  /*   位移 <6px 判点击（触发现有 onBallClick）；≥6px 判拖拽（表情固定 8 惊）。      */
  /*   拖拽中 body 弹簧暂停 br/bs，bx/by 由指针驱动；松手后表情 20（笑）800ms      */
  /*   再回状态表情（复用 funExpr/funUntil），bx/by 弹簧自然回弹原位（果冻感）。    */
  const onBallMouseDown = (evt: React.MouseEvent) => {
    if (reduced) return
    const m = metaRef.current
    const el = svgRef.current
    if (!el || !engineRef.current) return
    const r = el.getBoundingClientRect()
    dragRef.current = {
      on: false,
      sx: evt.clientX,
      sy: evt.clientY,
      bx0: engineRef.current.get('bx'),
      by0: engineRef.current.get('by'),
      // svg 坐标 / 屏幕像素 换算比例
      scale: GROK_CANVAS.h / r.height,
      tx: 0,
      ty: 0,
    }
    if (bodyRef.current) bodyRef.current.style.cursor = 'grabbing'
    m.lastInteractAt = performance.now()

    const onMove = (e: MouseEvent) => {
      const d = dragRef.current
      if (!d) return
      const mx = e.clientX - d.sx
      const my = e.clientY - d.sy
      if (!d.on) {
        // 未达 6px 阈值前仍算点击候选，不动表情
        if (Math.hypot(mx, my) < 6) return
        // 非 idle 不可拖（thinking/searching/replying/success/error/sleep）
        if (m.state !== 'idle') return
        d.on = true
        m.dragging = true
        const now = performance.now()
        // 拖拽中表情固定 8（惊），funUntil 无限期直至松手覆盖
        m.funExpr = 8
        m.funAt = now
        m.funUntil = Number.POSITIVE_INFINITY
      }
      d.tx = d.bx0 + mx * d.scale
      d.ty = d.by0 + my * d.scale
    }
    const onUp = (e: MouseEvent) => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      const d = dragRef.current
      dragRef.current = null
      m.dragging = false
      if (bodyRef.current) bodyRef.current.style.cursor = 'grab'
      if (!d) return
      if (d.on) {
        // 拖拽结束：松手后先展示被拖过的表现，本次未抖为点击
        const now = performance.now()
        m.funExpr = 20
        m.funAt = now
        m.funUntil = now + 800
      } else {
        // 位移 <6px → 判点击，交由 onBallClick（随机俏皮表情 / 双击蹦跳）
        onBallClick()
      }
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  /* ── 状态切换：重置调度 / 触发一次性事件；reduced 时直接静态快照 ── */
  useEffect(() => {
    const eng = engineRef.current ?? (engineRef.current = new Engine(SPRING_NAMES))
    const m = metaRef.current
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
    dragRef.current = null
    if (bodyRef.current) bodyRef.current.style.cursor = 'grab'

    // 表情目标：reduced 下取首表情跳变；动画下首帧同步绘制确保加载间隙可见
    const exprId = currentExpr(m, STATE_CONFIG[resolved])
    aimExpr(eng, exprId)
    restBody(eng)
    eng.snapAll()
    paint(eng, m, 0)

    if (!reduced) {
      if (resolved === 'success') spawnSuccess(now)
      if (resolved === 'error') m.flashAt = now
    }
  }, [resolved, reduced])

  /* ── 眼睛跟随鼠标（坐标进 ref，由 rAF 循环消费；范围跟随） ── */
  useEffect(() => {
    if (reduced || !follow) return
    const onMove = (evt: MouseEvent) => {
      const el = svgRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      const dx = evt.clientX - cx
      const dy = evt.clientY - cy
      const dist = Math.hypot(dx, dy)
      // 范围跟随：鼠标进入球周围 6×半径内才跟随，超出则偏移归零（球回自己
      // 的表情状态）；范围内幅度随距离增长，46px 封顶（约眼宽 130%）
      const ballRpx = BALL_R * (r.height / GROK_CANVAS.h)
      if (dist > ballRpx * 6) {
        pulseOffRef.current = ZERO_OFF
        return
      }
      const mag = Math.min(46, 12 + dist * 0.06)
      const u = dist > 0 ? 1 / dist : 0
      pulseOffRef.current = { x: dx * u * mag, y: dy * u * mag }
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [reduced, follow])

  /* ── 交互计时与睡眠唤醒：mousemove/click 刷新 lastInteractAt；打盹中一动/一点即醒 ── */
  useEffect(() => {
    const m = metaRef.current
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
    if (!engineRef.current) engineRef.current = new Engine(SPRING_NAMES)
    if (reduced) return
    let raf = 0
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const eng = engineRef.current!
      const m = metaRef.current
      m.now = now
      if (!m.last) {
        m.last = now
        return
      }
      const dt = Math.min(0.05, (now - m.last) / 1000)
      m.last = now

      const cfg = STATE_CONFIG[m.state]
      eng.setStiffness(m.state === 'searching' ? 150 : 46, m.state === 'searching' ? 14 : 9)

      // 犯困阶段：idle 且无鼠标交互满 45s → 眯眼犯困（表情 15 + 身体下垂）
      //（60s 才入 sleep；鼠标一动由 onInteract 清 drowsy，直接回正视）
      if (m.state === 'idle' && !m.sleeping && !m.drowsy && now - m.lastInteractAt >= 15000) {
        m.drowsy = true
        m.drowsyAt = now
        m.glanceExpr = null
        m.glanceUntil = 0
      }

      // 自动打盹：idle 且无鼠标交互（mousemove/click）超过 60s → 切 sleep（闭眼 + 极慢呼吸）
      if (m.state === 'idle' && !m.sleeping && now - m.lastInteractAt >= 30000) {
        m.sleeping = true
        m.state = 'sleep'
        // 打盹清掉点击/瞟眼残留，避免与闭眼表情叠加
        m.funExpr = null
        m.funUntil = 0
        m.funAt = 0
        m.dblJumpExpr = null
        m.dblJumpAt = 0
        m.dblJumpUntil = 0
        m.glanceExpr = null
        m.glanceUntil = 0
      }

      // idle 偶尔瞟一眼（低频）：大部分时间正视（表情 0），每 4-7s 随机
      // 短暂切到 24/6 停留约 800ms 再回 0，替代原来的 720ms 持续大幅跳眼。
      // 鼠标跟随激活期间（存在注视偏移）暂停瞟眼——跟随用的就是居中基准表情，
      // 不与瞟眼叠加。
      const followActive =
        cfg.follow && followRef.current && (pulseOffRef.current.x !== 0 || pulseOffRef.current.y !== 0)
      if (m.state === 'idle' && !followActive) {
        if (m.glanceExpr !== null) {
          if (now >= m.glanceUntil) {
            m.glanceExpr = null
            m.nextGlanceAt = now + 4000 + Math.random() * 3000
          }
        } else if (now >= m.nextGlanceAt) {
          m.glanceExpr = Math.random() < 0.5 ? 24 : 6
          m.glanceUntil = now + 800
        }
      }

      // 表情调度优先级：交互覆盖（双击蹦跳 / 单击俏皮 / 拖拽惊）> 鼠标跟随基准
      // > 状态表情。交互触发的表情必须在跟随分支之前判定——点击时鼠标必然
      // 在球上（followActive=true），若跟随优先会短路掉全部交互动画。
      const hasInteraction =
        (m.dblJumpExpr !== null && now < m.dblJumpUntil) ||
        (m.funExpr !== null && now < m.funUntil) ||
        m.dragging
      if (followActive && m.state === 'idle' && !hasInteraction) {
        // 鼠标跟随：以合成对称正视为基准——注视位移叠加在正中眼位上，眼睛
        // 看向哪就是纯粹的"看向"，不叠加状态表情自带的视线偏斜。
        aimRings(eng, GROK_CENTERED_EXPR[0], GROK_CENTERED_EXPR[1])
      } else {
        aimExpr(eng, currentExpr(m, cfg))
      }

      // 注视整体平移（gx/gy）：仅配置开启且鼠标跟随启用时叠加
      const off = cfg.follow && followRef.current ? pulseOffRef.current : ZERO_OFF
      eng.setTarget('gx', off.x)
      eng.setTarget('gy', off.y)

      // 随机眨眼（带过冲：眼皮弹簧从 1 → 0 → 1 自然回弹）
      let lid = 1
      if (cfg.blink) {
        if (!m.blinkOn && now >= m.blinkAt) {
          m.blinkOn = true
          m.blinkEnd = now + 110
          lid = 0
        } else if (m.blinkOn && now >= m.blinkEnd) {
          m.blinkOn = false
          m.blinkAt = now + 2400 + Math.random() * 3200
          lid = 1
        } else if (m.blinkOn) {
          lid = 0
        }
      } else if (m.blinkOn) {
        m.blinkOn = false
      }
      eng.setTarget('lid', lid)

      // 身体微动 / 一次性事件（success 上弹、error 摇头闪红）
      aimBody(eng, m, cfg)

      // 身体朝向跟随：眼睛位移 + 身体倾转叠加（跟随感加倍）。在 aimBody 之后覆盖写入
      // br/bx/by——仅 follow 启用且鼠标存在跟随偏移时；拖拽中
      //（bx/by 改由指针驱动）不叠加。
      if (cfg.follow && followRef.current && !m.dragging && (off.x !== 0 || off.y !== 0)) {
        const distOff = Math.hypot(off.x, off.y)
        const ux = off.x / distOff
        const uy = off.y / distOff
        // 幅度与跟随强度联动：距离越远转得越多（封顶 5°/8px），近处温和
        const lean = Math.min(1, distOff / 46)
        eng.setTarget('br', ux * 5 * lean)
        eng.setTarget('bx', ux * 8 * lean)
        eng.setTarget('by', uy * 5 * lean)
      }

      // 拖拽中暂停 aimBody 的 bx/by，改用指针偏移目标；松手后 dragRef 置空，
      // bx/by 目标自然回到 aimBody 的中性位，弹簧产生"果冻回弹"落回原位。
      if (m.dragging && dragRef.current) {
        eng.setTarget('bx', dragRef.current.tx)
        eng.setTarget('by', dragRef.current.ty)
      }

      eng.step(dt)
      paint(eng, m, dt)
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
        ref={svgRef}
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
        <g ref={bodyRef} onMouseDown={onBallMouseDown} style={{ cursor: 'grab' }}>
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
            <circle ref={flashRef} cx={CX} cy={CY} r={BALL_R} fill="rgb(228,87,74)" opacity="0" pointerEvents="none" />
          </g>
          {/* 双眼：移出 clipPath 容器（不裁剪），避免 gx/gy 平移后被 blob 轮廓裁掉 */}
          <path ref={eyeLRef} fill="oklch(26% 0.015 70)" />
          <path ref={eyeRRef} fill="oklch(26% 0.015 70)" />
        </g>

        {/* replying 嘴：开口椭圆（正在说话，paint 直写 opacity），画布下部 */}
        <ellipse ref={mouthRef} cx={CX} cy={170} rx="5" ry="6.5" fill="oklch(26% 0.015 70)" opacity="0" />

        {/* success 撒花粒子容器（成功时按需挂载 ≤14 个） */}
        <g ref={particlesRef} />
      </svg>
    </div>
  )
}

export default Mascot
