/**
 * useCarouselEngine — 3D 玻璃文件夹轮播引擎（有界模式）
 *
 * 蓝本：参考项目 FolderCarousel（AI Studio 3D Glass Folder Carousel）的视效参数；
 * 物理内核沿用既有舞台引擎模式（旧 FolderStack3D/useWheelStack，已于 M4 下线）的「每帧直写 style + 聚焦索引才 setState」
 * （DESIGN.md Stage-Surface 验收门：每帧直写，聚焦索引变化才 setState 一次）。
 *
 * 有界决策（2026-08-06 产品拍板，交接文档 §2.3「无限循环保留」作废）：
 * - 位置硬 clamp [0, n-1]，不做取模无限循环
 * - 首/尾 EDGE_EPS 释放滚动权：边界判定在 preventDefault 之前，严禁 scroll trapping
 * - 自动播放默认关闭（管理场景非海报），由参数抽屉控制
 *
 * 降级：
 * - prefers-reduced-motion → 平铺模式（引擎停摆，渲染层出扁平列表）
 * - FPS watchdog：400ms 采样 <45fps 持续 500ms → 降级（关玻璃模糊 + 渲染窗口 ±4）
 */

import { useState, useEffect, useRef, useMemo, useLayoutEffect } from 'react'
import type React from 'react'

// ── 视效参数（参考项目真值，勿凭感觉改）──
export const GC_PARAMS = {
  /** 容器透视 */
  perspective: 1400,
  /** 全排基础 Y 旋转（可调 -60~60） */
  rotateYAngle: -26,
  /** 俯仰 */
  rotateXAngle: 10,
  /** 相邻卡横向步距 px（可调 40~140） */
  itemSpacing: 75,
  /** Z 深度步距 px，方向随 rotateY 符号 */
  depthStep: 14,
  /** 渲染窗口：左右各 N 张 */
  visibleRadius: 8,
  /** 低帧降级后的渲染窗口 */
  downgradedRadius: 4,
  /** 边缘透明度：absOffset>6 起每张 -0.25 */
  edgeOpacityStart: 6,
  edgeOpacityStep: 0.25,
  /** 选中补偿（activeFactor 插值，非阶跃） */
  activePushZ: 6,
  activeLiftY: 36,
  activeScale: 0.03, // 1.03
  /** 附加旋转项 */
  baseRotateZ: -3,
  activeTiltZ: 2.5,
  offsetTiltZ: 0.2,
  offsetYaw: 1.2,
  /** 纵向随 offset 的斜率项（源码公式：translateY = -af*36 + offset*1.5） */
  offsetSlopeY: 1.5,
} as const

/** 物理参数（参考项目 + 旧引擎） */
const EDGE_EPS = 0.02            // 首尾释放阈值
const WHEEL_SENSITIVITY = 0.0035 // 滚轮灵敏度 /px
const SNAP_DELAY = 120           // 滚轮停顿吸附延迟 ms
const LERP_FACTOR = 0.18         // 吸附 lerp 系数
const LERP_EPS = 0.001           // 吸附收敛容差
const MAX_WHEEL_DELTA = 360      // 单事件限幅 = 3 张卡
const AUTOPLAY_STEP = 0.35       // 自动播放步进 /s（默认关闭）
const FPS_WINDOW_MS = 400
const FPS_THRESHOLD = 45
const FPS_BAD_MS = 500

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export interface CardTransformParams {
  slot: number
  pos: number
  itemSpacing: number
  rotateYAngle: number
  rotateXAngle: number
}

export interface CardTransform {
  transform: string
  opacity: number
  zIndex: number
  activeFactor: number
}

/**
 * 单卡 3D 变换公式（纯函数，供渲染层与单测共用）。
 * 公式与参考项目 FolderCarousel 逐项对齐：
 * translateX = offset*spacing；translateY = -af*36 + offset*1.5；
 * translateZ = offset*(±14) + af*6（深度方向随 rotateY 符号）；
 * rotateY = base + offset*1.2；rotateZ = -3 - af*2.5 + offset*0.2；scale = 1 + af*0.03。
 */
export function computeCardTransform({ slot, pos, itemSpacing, rotateYAngle, rotateXAngle }: CardTransformParams): CardTransform {
  const offset = slot - pos
  const absOffset = Math.abs(offset)
  const activeFactor = Math.max(0, 1 - absOffset)
  const isFacingRight = rotateYAngle <= 0
  const depthMultiplier = isFacingRight ? -1 : 1
  const translateX = offset * itemSpacing
  const translateY = -activeFactor * GC_PARAMS.activeLiftY + offset * GC_PARAMS.offsetSlopeY
  const translateZ = offset * depthMultiplier * GC_PARAMS.depthStep + activeFactor * GC_PARAMS.activePushZ
  const rotateY = rotateYAngle + offset * GC_PARAMS.offsetYaw
  const rotateX = rotateXAngle
  const rotateZ = GC_PARAMS.baseRotateZ - activeFactor * GC_PARAMS.activeTiltZ + offset * GC_PARAMS.offsetTiltZ
  const scale = 1 + activeFactor * GC_PARAMS.activeScale
  const opacity = absOffset <= GC_PARAMS.edgeOpacityStart
    ? 1
    : Math.max(0, 1 - (absOffset - GC_PARAMS.edgeOpacityStart) * GC_PARAMS.edgeOpacityStep)
  const zIndex = isFacingRight ? 10000 - slot : 10000 + slot
  const transform = [
    `translate3d(${translateX.toFixed(2)}px, ${translateY.toFixed(2)}px, ${translateZ.toFixed(2)}px)`,
    `rotateY(${rotateY.toFixed(2)}deg)`,
    `rotateX(${rotateX.toFixed(2)}deg)`,
    `rotateZ(${rotateZ.toFixed(2)}deg)`,
    `scale(${scale.toFixed(3)})`,
  ].join(' ')
  return { transform, opacity, zIndex, activeFactor }
}

export interface UseCarouselEngineOptions {
  count: number
  itemSpacing?: number
  rotateYAngle?: number
  rotateXAngle?: number
  isPlaying?: boolean
  scrollSpeed?: number
}

export function useCarouselEngine({
  count,
  itemSpacing = GC_PARAMS.itemSpacing,
  rotateYAngle = GC_PARAMS.rotateYAngle,
  rotateXAngle = GC_PARAMS.rotateXAngle,
  isPlaying = false,
  scrollSpeed = 1,
}: UseCarouselEngineOptions) {
  const stageRef = useRef<HTMLDivElement | null>(null)
  const cardElsRef = useRef(new Map<number, HTMLDivElement>())
  const cardRefFnsRef = useRef(new Map<number, (el: HTMLDivElement | null) => void>())
  const lastWrittenRef = useRef(new WeakMap<HTMLElement, string>())

  // 物理状态全在 ref：每帧绕开 React
  const posRef = useRef(0)
  const targetRef = useRef<number | null>(null)
  const rafRef = useRef(0)
  const runningRef = useRef(false)
  const lastTRef = useRef(0)
  const wheelTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const dragRef = useRef({ active: false, startX: 0, startIndex: 0 })
  const lastEmittedRef = useRef(0)
  const windowRef = useRef<number>(GC_PARAMS.visibleRadius)
  const fpsRef = useRef({ frames: 0, start: 0, badSince: 0 })

  // 参数与数据量走 ref 同步（引擎只创建一次）
  const countRef = useRef(count)
  const itemSpacingRef = useRef(itemSpacing)
  const rotateYAngleRef = useRef(rotateYAngle)
  const rotateXAngleRef = useRef(rotateXAngle)
  const isPlayingRef = useRef(isPlaying)
  const scrollSpeedRef = useRef(scrollSpeed)
  countRef.current = count
  itemSpacingRef.current = itemSpacing
  rotateYAngleRef.current = rotateYAngle
  rotateXAngleRef.current = rotateXAngle
  isPlayingRef.current = isPlaying
  scrollSpeedRef.current = scrollSpeed

  const [focusIndex, setFocusIndex] = useState(0)
  const [downgraded, setDowngraded] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)

  // prefers-reduced-motion 检测
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(mq.matches)
    update()
    mq.addEventListener?.('change', update)
    return () => mq.removeEventListener?.('change', update)
  }, [])

  const engine = useMemo(() => {
    /** 每帧直写全部已注册卡片；窗口外卡片隐藏；聚焦索引变化才 setState 一次 */
    function renderFrame() {
      const n = countRef.current
      const R = windowRef.current
      const pos = posRef.current
      const focus = clamp(Math.round(pos), 0, Math.max(0, n - 1))
      for (const [i, el] of cardElsRef.current) {
        if (i < focus - R || i > focus + R) {
          if (lastWrittenRef.current.get(el) !== 'gc-hide') {
            lastWrittenRef.current.set(el, 'gc-hide')
            el.style.visibility = 'hidden'
          }
          continue
        }
        const t = computeCardTransform({
          slot: i, pos, itemSpacing: itemSpacingRef.current,
          rotateYAngle: rotateYAngleRef.current, rotateXAngle: rotateXAngleRef.current,
        })
        const key = `${t.transform}|${t.opacity.toFixed(3)}|${t.zIndex}`
        if (lastWrittenRef.current.get(el) === key) continue
        lastWrittenRef.current.set(el, key)
        el.style.transform = t.transform
        el.style.opacity = t.opacity.toFixed(3)
        el.style.zIndex = String(t.zIndex)
        el.style.visibility = 'visible'
        el.dataset.gcActive = t.activeFactor > 0.5 ? '1' : '0'
      }
      if (focus !== lastEmittedRef.current) {
        lastEmittedRef.current = focus
        setFocusIndex(focus)
      }
    }

    /** FPS 采样看门狗：400ms 窗口 <45fps 持续 500ms → 降级（缩窗口，组件侧关玻璃） */
    function measure(now: number) {
      const m = fpsRef.current
      if (!m.start) { m.start = now; m.frames = 0; return }
      m.frames++
      const dur = now - m.start
      if (dur >= FPS_WINDOW_MS) {
        const fps = Math.round((m.frames * 1000) / dur)
        m.start = now
        m.frames = 0
        if (fps < FPS_THRESHOLD) {
          if (!m.badSince) m.badSince = now
          else if (now - m.badSince > FPS_BAD_MS && windowRef.current !== GC_PARAMS.downgradedRadius) {
            windowRef.current = GC_PARAMS.downgradedRadius
            setDowngraded(true)
          }
        } else m.badSince = 0
      }
    }

    /** rAF 循环：lerp 吸附 / 有界自动播放；静止即停（桌面端不空转） */
    function frame(now: number) {
      const dt = Math.min(0.1, (now - lastTRef.current) / 1000) || 0.016
      lastTRef.current = now
      const n = countRef.current
      const target = targetRef.current
      if (target !== null) {
        const diff = target - posRef.current
        if (Math.abs(diff) < LERP_EPS) {
          posRef.current = target
          targetRef.current = null
        } else {
          posRef.current += diff * LERP_FACTOR
        }
      } else if (isPlayingRef.current) {
        // 有界自动播放：clamp 到边界自然停
        const step = AUTOPLAY_STEP * scrollSpeedRef.current * dt
        const next = clamp(posRef.current + step, 0, n - 1)
        posRef.current = next
        if (next >= n - 1 || next <= 0) isPlayingRef.current = false
      }
      renderFrame()
      measure(now)
      if (targetRef.current !== null || isPlayingRef.current) {
        rafRef.current = requestAnimationFrame(frame)
      } else {
        runningRef.current = false
      }
    }

    function kick() {
      if (!runningRef.current) {
        runningRef.current = true
        lastTRef.current = performance.now()
        rafRef.current = requestAnimationFrame(frame)
      }
    }

    /** 原生 wheel（渲染层挂 passive:false）。边界判定在 preventDefault 之前 → 释放滚动权 */
    function onWheelNative(e: WheelEvent) {
      const n = countRef.current
      let d = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX
      if (e.deltaMode === 1) d *= 32
      else if (e.deltaMode === 2) d *= 300
      d = clamp(d, -MAX_WHEEL_DELTA, MAX_WHEEL_DELTA)
      const atStart = posRef.current <= EDGE_EPS && d < 0
      const atEnd = posRef.current >= n - 1 - EDGE_EPS && d > 0
      if (atStart || atEnd) return
      e.preventDefault()
      targetRef.current = null // 打断吸附，跟手
      posRef.current = clamp(posRef.current + d * WHEEL_SENSITIVITY, 0, n - 1)
      renderFrame()
      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current)
      wheelTimerRef.current = setTimeout(() => {
        targetRef.current = clamp(Math.round(posRef.current), 0, n - 1)
        kick()
      }, SNAP_DELAY)
    }

    function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
      dragRef.current = { active: true, startX: e.clientX, startIndex: posRef.current }
      targetRef.current = null
      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current)
    }

    function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
      if (!dragRef.current.active) return
      const deltaX = e.clientX - dragRef.current.startX
      // 像素 → 索引：deltaX / (spacing*1.2)
      const indexDelta = -deltaX / (itemSpacingRef.current * 1.2)
      posRef.current = clamp(dragRef.current.startIndex + indexDelta, 0, countRef.current - 1)
      renderFrame()
    }

    function handlePointerUp(_e?: React.PointerEvent<HTMLDivElement>) {
      if (!dragRef.current.active) return
      dragRef.current.active = false
      // 松手吸附最近整数槽
      targetRef.current = clamp(Math.round(posRef.current), 0, countRef.current - 1)
      kick()
    }

    function stepNext() {
      const base = targetRef.current ?? posRef.current
      targetRef.current = clamp(Math.round(base) + 1, 0, countRef.current - 1)
      kick()
    }

    function stepPrev() {
      const base = targetRef.current ?? posRef.current
      targetRef.current = clamp(Math.round(base) - 1, 0, countRef.current - 1)
      kick()
    }

    function dotGoTo(index: number) {
      targetRef.current = clamp(index, 0, countRef.current - 1)
      kick()
    }

    return { renderFrame, kick, onWheelNative, handlePointerDown, handlePointerMove, handlePointerUp, stepNext, stepPrev, dotGoTo }
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
    posRef.current = clamp(posRef.current, 0, max)
    if (targetRef.current !== null) targetRef.current = clamp(targetRef.current, 0, max)
    const f = Math.min(max, lastEmittedRef.current)
    if (f !== lastEmittedRef.current) {
      lastEmittedRef.current = f
      setFocusIndex(f)
    }
    engine.renderFrame()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count])

  // 每次提交后同步一次静止画面：首渲染/数据变化后立即摆位
  useLayoutEffect(() => {
    if (reducedMotion) return
    engine.renderFrame()
  }, [engine, reducedMotion])

  // 清理：静止 rAF + 吸附定时器
  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current)
    clearTimeout(wheelTimerRef.current)
    runningRef.current = false
  }, [])

  return {
    stageRef,
    registerCard,
    onWheelNative: engine.onWheelNative,
    handlePointerDown: engine.handlePointerDown,
    handlePointerMove: engine.handlePointerMove,
    handlePointerUp: engine.handlePointerUp,
    stepNext: engine.stepNext,
    stepPrev: engine.stepPrev,
    dotGoTo: engine.dotGoTo,
    focusIndex,
    downgraded,
    reducedMotion,
  }
}
