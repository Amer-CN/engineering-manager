/**
 * Mascot 交互调度 — AI 管家圆球的交互/身体动素调度逻辑
 * -------------------------------------------------------------------
 * 形象数据（眼部轮廓 48 点 / 身体 blob / 画布尺寸）来自
 * zhulin025/LaoA-GrokBot（MIT）的 Grok 官方客户端提取数据（MIT 署名保留不变，
 * 数据文件：src/components/features/agent/grok-eyes-data.ts）。弹簧引擎与
 * 状态映射见 mascot-engine.ts；本文件承载交互调度（点击俏皮表情候选、
 * 身体动素、犯困/入睡、瞟眼、眨眼）与 DOM 接线 helpers（paint、特效、
 * 点击/拖拽、逐帧 step），由 Mascot.tsx 的 rAF 循环与事件处理器调用。
 */

import type { MutableRefObject, RefObject, MouseEvent as ReactMouseEvent } from 'react'
import {
  CX,
  CY,
  SVG_NS,
  ZERO_OFF,
  STATE_CONFIG,
  aimExpr,
  aimRings,
  currentExpr,
  eyeD,
  type Engine,
  type Particle,
  type StateCfg,
  type TickData,
} from './mascot-engine'
import { GROK_CANVAS, GROK_CENTERED_EXPR } from './grok-eyes-data'

/** 点击球身的俏皮表情候选（官方表情 id：3 不对称大眼-搞怪 / 5 圆睁惊 / 6 歪头困惑 / 9 大小眼 / 11 搞怪 / 12 大椭圆-得意 / 16 错位-鬼脸 / 19 对称大竖眼-好奇 / 21 鬼精灵 / 25 惊讶） */
export const FUN_EXPRS = [3, 5, 6, 9, 11, 12, 16, 19, 21, 25]

/* ══════════════ 组件 DOM 接线上下文（组件内一次性构造，字段与组件 ref 一一对应） ══════════════ */

/** 拖拽生命周期（screen 坐标 → svg 坐标换算）：null = 无激活；on=false 按住=候选；on=true = 真正拖拽中 */
export interface DragState {
  on: boolean
  sx: number
  sy: number
  bx0: number
  by0: number
  scale: number
  tx: number
  ty: number
}

export interface MascotDom {
  svg: RefObject<SVGSVGElement>
  body: RefObject<SVGGElement>
  eyeL: RefObject<SVGPathElement>
  eyeR: RefObject<SVGPathElement>
  flash: RefObject<SVGCircleElement>
  mouth: RefObject<SVGEllipseElement>
  particles: RefObject<SVGGElement>
  particleList: MutableRefObject<Particle[]>
  engine: MutableRefObject<Engine | null>
  meta: MutableRefObject<TickData>
  pulseOff: MutableRefObject<{ x: number; y: number }>
  follow: MutableRefObject<boolean>
  drag: MutableRefObject<DragState | null>
  reduced: boolean
}

/* ══════════════ 身体动素（每个状态一档，振幅克制） ══════════════ */

export function aimBody(e: Engine, m: TickData, cfg: StateCfg): void {
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

/* ══════════════ 逐帧 step（rAF tick 的正体，从 Mascot.tsx 原样迁移） ══════════════ */

export function stepMascot(dom: MascotDom, dt: number): void {
  const eng = dom.engine.current!
  const m = dom.meta.current
  const now = m.now

  const cfg = STATE_CONFIG[m.state]
  eng.setStiffness(m.state === 'searching' ? 150 : 46, m.state === 'searching' ? 14 : 9)

  // 犯困 → 入睡：idle 且无鼠标交互满 15s → 眯眼犯困（表情 15 + 身体下垂；
  // 鼠标一动由组件 onInteract 清 drowsy，直接回正视）；满 30s → 入 sleep。
  scheduleDrowsiness(m, now)

  // idle 偶尔瞟一眼（低频）：大部分时间正视（表情 0），每 4-7s 随机
  // 短暂切到 24/6 停留约 800ms 再回 0。鼠标跟随激活期间（存在注视偏移）
  // 暂停瞟眼——跟随用的就是居中基准表情，不与瞟眼叠加。
  const followActive =
    cfg.follow && dom.follow.current && (dom.pulseOff.current.x !== 0 || dom.pulseOff.current.y !== 0)
  scheduleGlance(m, now, followActive)

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
  const off = cfg.follow && dom.follow.current ? dom.pulseOff.current : ZERO_OFF
  eng.setTarget('gx', off.x)
  eng.setTarget('gy', off.y)

  // 随机眨眼（带过冲：眼皮弹簧从 1 → 0 → 1 自然回弹）
  eng.setTarget('lid', scheduleBlink(m, now, cfg))

  // 身体微动 / 一次性事件（success 上弹、error 摇头闪红）
  aimBody(eng, m, cfg)

  // 身体朝向跟随：眼睛位移 + 身体倾转叠加（跟随感加倍）。在 aimBody 之后覆盖写入
  // br/bx/by——仅 follow 启用且鼠标存在跟随偏移时；拖拽中
  //（bx/by 改由指针驱动）不叠加。
  if (cfg.follow && dom.follow.current && !m.dragging && (off.x !== 0 || off.y !== 0)) {
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
  if (m.dragging && dom.drag.current) {
    eng.setTarget('bx', dom.drag.current.tx)
    eng.setTarget('by', dom.drag.current.ty)
  }

  eng.step(dt)
  paintMascot(dom, eng, m, dt)
}

/* ══════════════ 一次性绘制（rAF/首帧直写 DOM，不触发 React 重渲染） ══════════════ */

export function paintMascot(dom: MascotDom, e: Engine, m: TickData, dt: number): void {
  dom.eyeL.current?.setAttribute('d', eyeD(e, 'L'))
  dom.eyeR.current?.setAttribute('d', eyeD(e, 'R'))

  dom.body.current?.setAttribute(
    'transform',
    `translate(${e.get('bx').toFixed(2)} ${e.get('by').toFixed(2)}) rotate(${e.get('br').toFixed(2)} ${CX} ${CY}) scale(${e.get('bs').toFixed(3)})`,
  )

  // replying 小圆嘴（其余状态隐藏）
  const hc = STATE_CONFIG[m.state]
  dom.mouth.current?.setAttribute('opacity', hc.mouth ? '0.85' : '0')

  // error 红色特征（两段）：前 0.5s 从峰值 0.35 衰减到常亮红晕 0.18，
  // 之后恒定 0.18 直到离开 error；非 error 归 0。
  // reduced-motion 下 flashAt 恒 0，直接落 0.18 常亮，静态帧可辨识。
  let flash = 0
  if (m.state === 'error') {
    const t = m.flashAt > 0 ? m.now - m.flashAt : 500
    const k = Math.min(1, t / 500)
    flash = 0.35 * (1 - k) + 0.18 * k
  }
  dom.flash.current?.setAttribute('opacity', flash.toFixed(3))

  // success 粒子演进
  const list = dom.particleList.current
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

/* ══════════════ 成功撒花（一次性挂载 ≥12 个粒子节点） ══════════════ */

export function spawnSuccessParticles(dom: MascotDom, now: number): void {
  const g = dom.particles.current
  if (!g) return
  const n = 12
  for (let i = 0; i < n; i++) {
    const el = document.createElementNS(SVG_NS, 'circle')
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.7
    const sp = 55 + Math.random() * 85
    el.setAttribute('r', (1.6 + Math.random() * 1.8).toFixed(2))
    el.setAttribute('fill', i % 2 === 0 ? 'var(--accent)' : 'var(--success)')
    g.appendChild(el)
    dom.particleList.current.push({
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

/* ══════════════ 点击与拖拽（鼠标交互） ══════════════ */

/** 点击球身：单击随机俏皮表情；连点两下（350ms 内）触发欢快蹦跳 */
export function handleBallClick(dom: MascotDom): void {
  // 双击优先：第二下取消正在播的单击表情，进入 1.8s 三连跳 + 撒花（reduced-motion 下不启用）
  if (dom.reduced) return
  const m = dom.meta.current
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
    if (!m.sleeping) spawnSuccessParticles(dom, now)
    return
  }

  // 单击：蹦跳进行中忽略（不打断），否则随机俏皮表情 + 轻微上弹
  if (now < m.dblJumpUntil) return
  m.funExpr = FUN_EXPRS[Math.floor(Math.random() * FUN_EXPRS.length)]
  m.funAt = now
  m.funUntil = now + 1000 + Math.random() * 200
}

/** 鼠标拖拽球身（仅 idle 且动画开启；reduced-motion 下禁用） */
export function handleBallMouseDown(dom: MascotDom, evt: ReactMouseEvent): void {
  // 位移 <6px 判点击（触发现有 onBallClick）；≥6px 判拖拽（表情固定 8 惊）。
  // 拖拽中 body 弹簧暂停 br/bs，bx/by 由指针驱动；松手后表情 20（笑）800ms
  // 再回状态表情（复用 funExpr/funUntil），bx/by 弹簧自然回弹原位（果冻感）。
  if (dom.reduced) return
  const m = dom.meta.current
  const el = dom.svg.current
  if (!el || !dom.engine.current) return
  const r = el.getBoundingClientRect()
  dom.drag.current = {
    on: false,
    sx: evt.clientX,
    sy: evt.clientY,
    bx0: dom.engine.current.get('bx'),
    by0: dom.engine.current.get('by'),
    // svg 坐标 / 屏幕像素 换算比例
    scale: GROK_CANVAS.h / r.height,
    tx: 0,
    ty: 0,
  }
  if (dom.body.current) dom.body.current.style.cursor = 'grabbing'
  m.lastInteractAt = performance.now()

  const onMove = (e: MouseEvent) => {
    const d = dom.drag.current
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
    const d = dom.drag.current
    dom.drag.current = null
    m.dragging = false
    if (dom.body.current) dom.body.current.style.cursor = 'grab'
    if (!d) return
    if (d.on) {
      // 拖拽结束：松手后先展示被拖过的表现，本次未拖为点击
      const now = performance.now()
      m.funExpr = 20
      m.funAt = now
      m.funUntil = now + 800
    } else {
      // 位移 <6px → 判点击，交由 handleBallClick（随机俏皮表情 / 双击蹦跳）
      handleBallClick(dom)
    }
  }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

/* ══════════════ 交互调度（逐帧 tick 内调用，只读写 TickData 与弹簧目标） ══════════════ */

/**
 * 犯困 → 自动入睡：idle 且无鼠标交互满 15s → 眯眼犯困（drowsy，表情 15 + 身体
 * 下垂；鼠标一动由 Mascot.tsx 的 onInteract 清 drowsy，直接回正视）；满 30s →
 * 入 sleep（闭眼 + 极慢呼吸，打盹清掉点击/瞟眼残留，避免与闭眼表情叠加）。
 */
export function scheduleDrowsiness(m: TickData, now: number): void {
  if (m.state === 'idle' && !m.sleeping && !m.drowsy && now - m.lastInteractAt >= 15000) {
    m.drowsy = true
    m.drowsyAt = now
    m.glanceExpr = null
    m.glanceUntil = 0
  }
  if (m.state === 'idle' && !m.sleeping && now - m.lastInteractAt >= 30000) {
    m.sleeping = true
    m.state = 'sleep'
    m.funExpr = null
    m.funUntil = 0
    m.funAt = 0
    m.dblJumpExpr = null
    m.dblJumpAt = 0
    m.dblJumpUntil = 0
    m.glanceExpr = null
    m.glanceUntil = 0
  }
}

/**
 * idle 偶尔瞟一眼（低频）：大部分时间正视（表情 0），每 4-7s 随机短暂切到
 * 24/6 停留约 800ms 再回 0。鼠标跟随激活期间（存在注视偏移）暂停瞟眼——
 * 跟随用的就是居中基准表情，不与瞟眼叠加。
 */
export function scheduleGlance(m: TickData, now: number, followActive: boolean): void {
  if (m.state !== 'idle' || followActive) return
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

/**
 * 随机眨眼调度（带过冲：眼皮弹簧从 1 → 0 → 1 自然回弹）。
 * 返回本帧 lid 目标值，由调用方写入弹簧目标。
 */
export function scheduleBlink(m: TickData, now: number, cfg: StateCfg): number {
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
  return lid
}