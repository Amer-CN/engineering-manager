// useWheelStack.ts — FolderStack3D 物理内核（滚轮归一化 + 临界阻尼弹簧 + rAF 直写）
// 设计侧交接的硬约束（勿动物理参数，勿改结构性写法）：
// - 每帧绕开 React：pos/vel/target 全在 ref；rAF 逐节点直写 style，写前比对相同则跳过
// - 聚焦索引变化才 setState 一次（lastEmittedRef 挡重复）
// - wheel 必须原生 addEventListener({ passive:false })——React onWheel 在 root 委托，preventDefault 不可靠
// - 首尾释放滚动权：边界判定在 preventDefault 之前；阈值 0.02（弹簧渐近收敛，1e-3 永不满足）
// - target 硬 clamp [0, n-1]，不做橡皮筋回弹（回弹会和释放滚动权抢同一个手势）
// - deltaMode 换算：挂载/resize 时缓存行高与页高，wheel 回调内零 getComputedStyle
// - 单事件限幅 ±360（触控板惯性尾巴）；deltaX/deltaY 取绝对值大者，不相加
// - 静止即停 rAF（WebView2 桌面端省电），由 wheel / 键盘 kick 唤醒
// - 卡片用 Map<index, HTMLElement> 注册（索引稀疏，数组下标会错位）
// - 不给 3D 子元素设 z-index（会越过 preserve-3d 真实景深排序）
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'

/** 物理参数：真机调定，与 design-prototype/stack-3d.html v0.2 完全一致 */
export const STACK_PHYSICS = {
  baseRY: -58, focusRY: -16,
  stepX: 30, stepZ: -14,
  pastStepX: 150, pastRY: -72,
  focusZ: 96, focusScale: 1.04,
  tailStepX: 8, tailStepZ: -4,
  stiffness: 170, damping: 26,
  wheelPerCard: 120, snapDelay: 140,
} as const

const MAX_WHEEL_DELTA = 360   // 单事件限幅 = 3 张卡
const EDGE_EPS = 0.02         // 首尾释放阈值
/** 渲染窗口（非挂载窗口）：卡片全量常驻 DOM，视窗外由 rAF 置 fs3d-hide（display:none，
 *  不参与 paint/layout，≤40 张开销可忽略）；tailCount 与 windowRef 共用同一对常量防魔法数漂移 */
export const WINDOW_FULL = 12
export const WINDOW_DOWNGRADED = 6

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

interface UseWheelStackOptions {
  count: number
  onOpen?: (index: number) => void
  /** Esc 退出舞台；未提供时回落 stage.blur() */
  onExit?: () => void
}

export function useWheelStack({ count, onOpen, onExit }: UseWheelStackOptions) {
  const stageRef = useRef<HTMLDivElement | null>(null)
  const cardElsRef = useRef(new Map<number, HTMLDivElement>())
  const cardRefFnsRef = useRef(new Map<number, (el: HTMLDivElement | null) => void>())
  const lastWrittenRef = useRef(new WeakMap<HTMLElement, string>())

  const posRef = useRef(0)
  const velRef = useRef(0)
  const targetRef = useRef(0)
  const rafRef = useRef(0)
  const runningRef = useRef(false)
  const lastTRef = useRef(0)
  const snapTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const hoverRef = useRef(false)
  const lastEmittedRef = useRef(0)
  const windowRef = useRef(WINDOW_FULL)
  const countRef = useRef(count)
  const onOpenRef = useRef(onOpen)
  const onExitRef = useRef(onExit)
  countRef.current = count
  onOpenRef.current = onOpen
  onExitRef.current = onExit

  // deltaMode 换算缓存：挂载 + resize 时算一次，wheel 里绝不触发同步布局
  const lineHeightRef = useRef(16)
  const pageHeightRef = useRef(600)

  const fpsRef = useRef({ frames: 0, start: 0, badSince: 0 })

  const [focusIndex, setFocusIndex] = useState(0)
  const [downgraded, setDowngraded] = useState(false)

  // 引擎只创建一次：所有可变量走 ref，setter 是 React 稳定引用
  const engine = useMemo(() => {
    const P = STACK_PHYSICS

    function renderFrame() {
      const W = windowRef.current
      const pos = posRef.current
      for (const [i, el] of cardElsRef.current) {
        const d = i - pos
        if (d < -9 || d > W + 22) {
          if (lastWrittenRef.current.get(el) !== 'hide') {
            lastWrittenRef.current.set(el, 'hide')
            el.className = 'fs3d-card fs3d-hide'
          }
          continue
        }
        let x: number, z: number, ry: number, op: number
        let sc = 1
        let cls = 'fs3d-card fs3d-win'
        if (d > W) {
          // 深度压缩尾：合并成一片压扁的剪影
          const t = d - W
          x = W * P.stepX + t * P.tailStepX
          z = W * P.stepZ + t * P.tailStepZ
          ry = P.baseRY
          op = Math.max(0.10, 0.34 - t * 0.010)
          cls += ' fs3d-tail'
        } else if (d < -0.5) {
          // 已翻过的卡向左压缩成一叠薄片（位移量要够大，否则全被聚焦卡挡住）
          const t = Math.min(-d, 8)
          x = -P.pastStepX - (t - 1) * 13
          z = d * P.stepZ * 0.35
          ry = P.pastRY
          op = Math.max(0.13, 0.44 - (t - 1) * 0.055)
          cls += ' fs3d-past'
        } else {
          x = d * P.stepX
          z = d * P.stepZ
          const ad = Math.abs(d)
          op = ad < 1 ? 1 : Math.max(0.46, 1 - (ad - 1) * 0.16)
          const k = ad < 0.5 ? 1 - ad * 2 : 0 // 0.5 → 0 归零，避免跳变
          ry = P.baseRY + (P.focusRY - P.baseRY) * k // 倒角恒定值插值，不逐张累加
          z += P.focusZ * k
          sc = 1 + (P.focusScale - 1) * k
          if (k > 0) cls += ' fs3d-focus'
          if (d > 1.2) cls += ' fs3d-quiet'
        }
        const filter = cls.indexOf('fs3d-past') >= 0 ? 'saturate(.25) brightness(.86)'
          : d > 2.5 ? 'saturate(.7) brightness(.94)' : ''
        const transform = `translate3d(${x.toFixed(2)}px,0,${z.toFixed(2)}px) rotateY(${ry.toFixed(2)}deg) scale(${sc.toFixed(3)})`
        const opacity = op.toFixed(3)
        // 写之前比对：相同则跳过（静止和缓动尾段省掉大量无效样式写入）
        const key = `${cls}|${transform}|${opacity}|${filter}`
        if (lastWrittenRef.current.get(el) === key) continue
        lastWrittenRef.current.set(el, key)
        el.className = cls
        el.style.opacity = opacity
        el.style.filter = filter
        el.style.transform = transform
      }
      // 只有聚焦索引变化才回到 React
      const f = clamp(Math.round(pos), 0, Math.max(0, countRef.current - 1))
      if (f !== lastEmittedRef.current) {
        lastEmittedRef.current = f
        setFocusIndex(f)
      }
    }

    function measure(now: number) {
      const m = fpsRef.current
      if (!m.start) { m.start = now; m.frames = 0; return }
      m.frames++
      const dur = now - m.start
      if (dur >= 400) {
        const fps = Math.round(m.frames * 1000 / dur)
        m.start = now
        m.frames = 0
        if (fps < 45) {
          if (!m.badSince) m.badSince = now
          else if (now - m.badSince > 500 && windowRef.current !== WINDOW_DOWNGRADED) {
            // 自动降级：窗口 ±6 + 关玻璃模糊（fs3d-noglass 由组件挂类）
            windowRef.current = WINDOW_DOWNGRADED
            setDowngraded(true)
          }
        } else m.badSince = 0
      }
    }

    function frame(now: number) {
      const dt = Math.min(0.032, (now - lastTRef.current) / 1000) || 0.016
      lastTRef.current = now
      // 临界阻尼弹簧：无回弹
      const a = P.stiffness * (targetRef.current - posRef.current) - P.damping * velRef.current
      velRef.current += a * dt
      posRef.current += velRef.current * dt
      if (Math.abs(targetRef.current - posRef.current) < 0.0004 && Math.abs(velRef.current) < 0.02) {
        posRef.current = targetRef.current
        velRef.current = 0
      }
      renderFrame()
      measure(now)
      if (posRef.current !== targetRef.current || velRef.current !== 0) {
        rafRef.current = requestAnimationFrame(frame)
      } else {
        runningRef.current = false // 静止停 rAF：桌面端不空转
      }
    }

    function kick() {
      if (!runningRef.current) {
        runningRef.current = true
        lastTRef.current = performance.now()
        rafRef.current = requestAnimationFrame(frame)
      }
    }

    function goTo(index: number) {
      targetRef.current = clamp(Math.round(index), 0, Math.max(0, countRef.current - 1))
      kick()
    }

    function recalcWheelUnits() {
      const stage = stageRef.current
      if (!stage) return
      const lh = parseFloat(getComputedStyle(stage).lineHeight)
      lineHeightRef.current = Number.isNaN(lh) ? 16 : lh
      // 用舞台高度而不是纯视口高，否则舞台只占半屏时一页直接翻飞
      pageHeightRef.current = Math.min(stage.clientHeight || window.innerHeight, window.innerHeight)
    }

    function onWheelNative(e: WheelEvent) {
      const stage = stageRef.current
      // 只在指针 hover 舞台内或焦点在舞台子树内时捕获
      if (!hoverRef.current && !stage?.contains(document.activeElement)) return
      // 取绝对值大者，不相加（斜向滑动相加会双倍计数）
      let d = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX
      if (e.deltaMode === 1) d *= lineHeightRef.current
      else if (e.deltaMode === 2) d *= pageHeightRef.current
      d = clamp(d, -MAX_WHEEL_DELTA, MAX_WHEEL_DELTA)
      const n = countRef.current
      // 边界判定必须在 preventDefault 之前：已在边界且方向朝外 → 把滚动权还给页面
      const atStart = targetRef.current <= EDGE_EPS && d < 0
      const atEnd = targetRef.current >= n - 1 - EDGE_EPS && d > 0
      if (atStart || atEnd) return
      e.preventDefault()
      targetRef.current = clamp(targetRef.current + d / P.wheelPerCard, 0, n - 1)
      clearTimeout(snapTimerRef.current)
      snapTimerRef.current = setTimeout(() => {
        targetRef.current = Math.round(targetRef.current)
        kick()
      }, P.snapDelay)
      kick()
    }

    function handleKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
      const n = countRef.current
      const moves: Record<string, number> = {
        ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1, PageDown: 10, PageUp: -10,
      }
      // 键盘走同一个 target ref，不另开位置状态（两套状态一定不同步）
      if (e.key in moves) targetRef.current = clamp(Math.round(targetRef.current) + moves[e.key], 0, n - 1)
      else if (e.key === 'Home') targetRef.current = 0
      else if (e.key === 'End') targetRef.current = n - 1
      else if (e.key === 'Enter') { onOpenRef.current?.(lastEmittedRef.current); return }
      else if (e.key === 'Escape') {
        // 交互契约：Esc 退出舞台（消费方切回扁平视图）；未接 onExit 时回落 blur
        if (onExitRef.current) onExitRef.current()
        else stageRef.current?.blur()
        return
      }
      else return
      e.preventDefault()
      kick()
    }

    return { renderFrame, kick, goTo, recalcWheelUnits, onWheelNative, handleKeyDown }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** 卡片 callback ref：按索引缓存闭包，避免每次渲染触发 ref 卸载/重挂 */
  const registerCard = (index: number) => {
    let fn = cardRefFnsRef.current.get(index)
    if (!fn) {
      fn = (el: HTMLDivElement | null) => {
        if (el) cardElsRef.current.set(index, el)
        else cardElsRef.current.delete(index)
      }
      cardRefFnsRef.current.set(index, fn)
    }
    return fn
  }

  // 数据量变化：clamp 位置与聚焦，防越界
  useEffect(() => {
    const max = Math.max(0, count - 1)
    if (targetRef.current > max) targetRef.current = max
    if (posRef.current > max) { posRef.current = max; velRef.current = 0 }
    const f = Math.min(max, lastEmittedRef.current)
    if (f !== lastEmittedRef.current) {
      lastEmittedRef.current = f
      setFocusIndex(f)
    }
  }, [count])

  // 每次提交后同步一次静止画面：卡片全量常驻 DOM，首渲染/数据变化后立即摆位（无挂载窗口）
  useLayoutEffect(() => {
    engine.renderFrame()
  })

  // 原生监听器：wheel(passive:false) + pointerenter/leave + resize 重算换算单位
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    engine.recalcWheelUnits()
    const onEnter = () => { hoverRef.current = true }
    const onLeave = () => { hoverRef.current = false }
    stage.addEventListener('wheel', engine.onWheelNative, { passive: false })
    stage.addEventListener('pointerenter', onEnter)
    stage.addEventListener('pointerleave', onLeave)
    window.addEventListener('resize', engine.recalcWheelUnits)
    return () => {
      stage.removeEventListener('wheel', engine.onWheelNative)
      stage.removeEventListener('pointerenter', onEnter)
      stage.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('resize', engine.recalcWheelUnits)
      cancelAnimationFrame(rafRef.current)
      clearTimeout(snapTimerRef.current)
      runningRef.current = false
    }
  }, [engine])

  return {
    stageRef,
    registerCard,
    handleKeyDown: engine.handleKeyDown,
    goTo: engine.goTo,
    focusIndex,
    downgraded,
  }
}
