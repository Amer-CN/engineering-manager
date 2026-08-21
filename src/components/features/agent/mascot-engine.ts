/**
 * Mascot 引擎 — AI 管家圆球（SVG 渲染 + 自研弹簧引擎 + Grok 官方形象数据）
 * -------------------------------------------------------------------
 * 形象数据（眼部轮廓 48 点 / 身体 blob / 画布尺寸）来自
 * zhulin025/LaoA-GrokBot（MIT）的 Grok 官方客户端提取数据，
 * 数据文件：src/components/features/agent/grok-eyes-data.ts（MIT 署名保留不变）。
 * 弹簧引擎、状态映射、表情驱动均为本项目实现。
 * -------------------------------------------------------------------
 * 架构分层：
 *   1. 自研弹簧引擎（Engine）：每眼 48 个控制点 × x/y 两轴共 192 个弹簧，
 *      加上 lid（眨眼开合）/ gx / gy（注视整体平移）。
 *   2. 官方表情数据驱动：状态配置表按 cycle 轮换表情，控制点弹簧逐点
 *      插值出丝滑形变；48 点 Catmull-Rom 平滑闭合成眼环 path。
 * 本文件为纯逻辑层（无 React / 无 DOM）：弹簧引擎 + 常量 + 类型 +
 * 状态配置表 + 表情/眼环纯函数。交互调度在 mascot-interactions.ts，
 * 渲染与 DOM 接线在 Mascot.tsx。
 */

import { GROK_EXPRESSIONS, GROK_CANVAS, GROK_CENTERED_EXPR, type GrokEyeRing } from './grok-eyes-data'

export type MascotState =
  | 'idle'
  | 'thinking'
  | 'searching'
  | 'replying'
  | 'success'
  | 'error'
  | 'sleep' // 内部自动：闲置超时打盹（外部 props 不会直接传入）
  | 'listening' // 旧状态别名 → 归一为 idle

export type ResolvedState = Exclude<MascotState, 'listening'>

/* ══════════════ SVG 坐标系常量（viewBox 跟随 Grok 画布 228.5×238） ══════════════ */

export const CX = GROK_CANVAS.w / 2 // 114.25
export const CY = GROK_CANVAS.h / 2 // 119
/** 身体覆盖层（渐变/红晕）用圆半径：足以盖住 blob 最远点，由 clipPath 兜底不外溢 */
export const BALL_R = 130
/** 单眼轮廓点数（Grok 官方 48 点 / 眼） */
export const PT = 48
export const SVG_NS = 'http://www.w3.org/2000/svg'
export const ZERO_OFF = { x: 0, y: 0 }
/**
 * 鼠标跟随的基准表情：合成的绝对居中对称表情（官方表情 24 的左眼为种子，
 * 右眼镜像生成、双眼中点平移到画布正中）——跟随位移叠加在纯净的正中眼位上。
 * 详见 grok-eyes-data.ts 的 GROK_CENTERED_EXPR。
 */

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
export class Engine {
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
export const SPRING_NAMES: string[] = []
for (const side of ['L', 'R'] as const) {
  for (const ax of ['x', 'y'] as const) {
    for (let i = 0; i < PT; i++) SPRING_NAMES.push(`${side}${ax}${i}`)
  }
}
SPRING_NAMES.push('lid', 'gx', 'gy', 'bx', 'by', 'br', 'bs')

/* ══════════════ 状态配置表（六态 + listening 别名归 idle） ══════════════ */

/** 合成表情的虚拟 id（aimExpr 收到它时改用 GROK_CENTERED_EXPR） */
export const CENTERED_EXPR_ID = -1

export interface StateCfg {
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

export const STATE_CONFIG: Record<ResolvedState, StateCfg> = {
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
export function smoothClosed(pts: Array<[number, number]>): string {
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
export function eyeD(e: Engine, side: 'L' | 'R'): string {
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
export function aimExpr(e: Engine, id: number): void {
  if (id === CENTERED_EXPR_ID) {
    aimRings(e, GROK_CENTERED_EXPR[0], GROK_CENTERED_EXPR[1])
    return
  }
  const [left, right] = GROK_EXPRESSIONS[id]
  aimRings(e, left, right)
}

/** 直接以环数据为目标的变体（跟随基准等合成表情用） */
export function aimRings(e: Engine, left: GrokEyeRing, right: GrokEyeRing): void {
  for (let i = 0; i < PT; i++) {
    e.setTarget(`Lx${i}`, left[i][0])
    e.setTarget(`Ly${i}`, left[i][1])
    e.setTarget(`Rx${i}`, right[i][0])
    e.setTarget(`Ry${i}`, right[i][1])
  }
}

/** 按状态时间取当前表情 id（cycle 按 stepMs 轮换；exprIds 单元素/无 stepMs 则固定） */
export function currentExpr(m: TickData, cfg: StateCfg): number {
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
export function restBody(e: Engine): void {
  e.setTarget('lid', 1)
  e.setTarget('gx', 0)
  e.setTarget('gy', 0)
  e.setTarget('bx', 0)
  e.setTarget('by', 0)
  e.setTarget('br', 0)
  e.setTarget('bs', 1)
}

/* ══════════════ 撒花粒子（success 一次性事件，≤14 个，1s 内消散） ══════════════ */

export interface Particle {
  el: SVGCircleElement
  x: number
  y: number
  vx: number
  vy: number
  born: number
  life: number
}

export interface TickData {
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