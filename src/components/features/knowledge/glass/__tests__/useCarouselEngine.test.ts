/**
 * useCarouselEngine 测试
 *
 * 1. computeCardTransform 纯函数：聚焦/相邻/边缘公式逐项断言（含 offset*1.5 斜率项）
 * 2. 引擎集成：有界 clamp（stepNext 到末尾不再前进）、lerp 吸附收敛、聚焦索引变化
 * 3. 首尾释放滚动权：边界判定在 preventDefault 之前（严禁 scroll trapping）
 * 4. prefers-reduced-motion → 平铺模式标志
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import React from 'react'
import { computeCardTransform, useCarouselEngine, GC_PARAMS } from '../useCarouselEngine'

// jsdom 默认 matchMedia 缺失/不可靠，统一 stub
function stubMatchMedia(matches: boolean) {
  const mq = { matches, addEventListener: vi.fn(), removeEventListener: vi.fn() }
  vi.stubGlobal('matchMedia', vi.fn(() => mq))
  return mq
}

describe('computeCardTransform — 公式纯函数', () => {
  const base = {
    slot: 0, pos: 0,
    itemSpacing: GC_PARAMS.itemSpacing,
    rotateYAngle: GC_PARAMS.rotateYAngle,
    rotateXAngle: GC_PARAMS.rotateXAngle,
  }

  it('聚焦卡（offset=0）：上浮 36px + 前推 6px + scale 1.03', () => {
    const t = computeCardTransform(base)
    expect(t.activeFactor).toBe(1)
    expect(t.transform).toContain('translate3d(0.00px, -36.00px, 6.00px)')
    expect(t.transform).toContain('rotateY(-26.00deg)')
    expect(t.transform).toContain('rotateX(10.00deg)')
    expect(t.transform).toContain('rotateZ(-5.50deg)') // -3 - 2.5*1 + 0
    expect(t.transform).toContain('scale(1.030)')
    expect(t.opacity).toBe(1)
    expect(t.zIndex).toBe(10000) // rotateY≤0 → 10000 - slot
  })

  it('相邻卡（offset=1）：translateY 含 offset*1.5 斜率项（=1.5px），无选中补偿', () => {
    const t = computeCardTransform({ ...base, slot: 1 })
    expect(t.activeFactor).toBe(0)
    // -36*0 + 1*1.5 = 1.5 —— 源码公式的 offset*1.5 项
    expect(t.transform).toContain('translate3d(75.00px, 1.50px, -14.00px)')
    expect(t.transform).toContain('rotateY(-24.80deg)') // -26 + 1*1.2
    expect(t.transform).toContain('rotateZ(-2.80deg)')  // -3 + 1*0.2
    expect(t.transform).toContain('scale(1.000)')
    expect(t.zIndex).toBe(9999) // 靠左排被遮挡
  })

  it('深度方向随 rotateY 符号翻转（rotateYAngle>0 时乘 +1）', () => {
    const t = computeCardTransform({ ...base, slot: 1, rotateYAngle: 26 })
    expect(t.transform).toContain('translate3d(75.00px, 1.50px, 14.00px)')
    expect(t.zIndex).toBe(10001) // 10000 + slot
  })

  it('边缘透明度：absOffset>6 起每张 -0.25，10 张外归零', () => {
    expect(computeCardTransform({ ...base, slot: 6 }).opacity).toBe(1)   // 6 以内不衰减
    expect(computeCardTransform({ ...base, slot: 7 }).opacity).toBeCloseTo(0.75)
    expect(computeCardTransform({ ...base, slot: 9 }).opacity).toBeCloseTo(0.25)
    expect(computeCardTransform({ ...base, slot: 10 }).opacity).toBe(0)
  })

  it('activeFactor 为线性插值（offset=0.5 → 0.5）', () => {
    const t = computeCardTransform({ ...base, pos: 0.5 })
    expect(t.activeFactor).toBeCloseTo(0.5)
    // translateY = -36*0.5 + (-0.5)*1.5 = -18.75；translateZ = (-0.5)*(-1)*14 + 0.5*6 = 10
    expect(t.transform).toContain('translate3d(-37.50px, -18.75px, 10.00px)')
  })
})

describe('useCarouselEngine — 有界模式', () => {
  let els: HTMLDivElement[]

  const N = 5
  const count = N

  function registerAll(result: { current: ReturnType<typeof useCarouselEngine> }) {
    els = []
    for (let i = 0; i < count; i++) {
      const el = document.createElement('div')
      document.body.appendChild(el)
      els.push(el)
      result.current.registerCard(i)(el)
    }
  }

  beforeEach(() => {
    stubMatchMedia(false)
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
  })

  it('初始聚焦 0；stepNext lerp 吸附到 1，且直写卡片 transform', () => {
    const { result } = renderHook(() => useCarouselEngine({ count }))
    registerAll(result)

    expect(result.current.focusIndex).toBe(0)

    act(() => { result.current.stepNext() })
    act(() => { vi.advanceTimersByTime(2000) }) // lerp 0.18 收敛 ~35 帧

    expect(result.current.focusIndex).toBe(1)
    expect(els[1].style.transform).toContain('translate3d(0.00px, -36.00px, 6.00px)')
    expect(els[1].dataset.gcActive).toBe('1')
    expect(els[0].style.transform).toContain('translate3d(-75.00px')
  })

  it('有界 clamp：末尾 stepNext 不再前进（不做取模循环）', () => {
    const { result } = renderHook(() => useCarouselEngine({ count }))
    registerAll(result)

    act(() => { result.current.dotGoTo(count - 1) })
    act(() => { vi.advanceTimersByTime(2000) })
    expect(result.current.focusIndex).toBe(count - 1)

    act(() => { result.current.stepNext() })
    act(() => { vi.advanceTimersByTime(2000) })
    expect(result.current.focusIndex).toBe(count - 1) // 停在末尾
    expect(els[count - 1].dataset.gcActive).toBe('1')
  })

  it('有界 clamp：首端 stepPrev 不再后退', () => {
    const { result } = renderHook(() => useCarouselEngine({ count }))
    registerAll(result)

    act(() => { result.current.dotGoTo(2) })
    act(() => { vi.advanceTimersByTime(2000) })

    act(() => { result.current.stepPrev() })
    act(() => { vi.advanceTimersByTime(2000) })
    act(() => { result.current.stepPrev() })
    act(() => { vi.advanceTimersByTime(2000) })
    act(() => { result.current.stepPrev() })
    act(() => { vi.advanceTimersByTime(2000) })

    expect(result.current.focusIndex).toBe(0) // 首端封死
  })

  it('滚轮首端朝外（deltaY<0）→ 不 preventDefault，滚动权还给页面', () => {
    const { result } = renderHook(() => useCarouselEngine({ count }))
    registerAll(result)

    const evt = new WheelEvent('wheel', { deltaY: -100, cancelable: true })
    result.current.onWheelNative(evt)
    expect(evt.defaultPrevented).toBe(false)
  })

  it('滚轮首端朝内（deltaY>0）→ preventDefault，位置前进', () => {
    const { result } = renderHook(() => useCarouselEngine({ count }))
    registerAll(result)

    // 400px（clamp 到 360）→ 0.0035*360 ≈ 1.26 卡 → round 后吸附到 1
    const evt = new WheelEvent('wheel', { deltaY: 400, cancelable: true })
    act(() => { result.current.onWheelNative(evt) })
    expect(evt.defaultPrevented).toBe(true)

    // 停顿 120ms 后吸附最近卡
    act(() => { vi.advanceTimersByTime(120) })
    act(() => { vi.advanceTimersByTime(2000) })
    expect(result.current.focusIndex).toBe(1)
  })

  it('滚轮末端朝外（deltaY>0，已到末尾）→ 不 preventDefault', () => {
    const { result } = renderHook(() => useCarouselEngine({ count }))
    registerAll(result)

    act(() => { result.current.dotGoTo(count - 1) })
    act(() => { vi.advanceTimersByTime(2000) })

    const evt = new WheelEvent('wheel', { deltaY: 100, cancelable: true })
    result.current.onWheelNative(evt)
    expect(evt.defaultPrevented).toBe(false)
  })

  it('拖拽松手吸附最近整数槽', () => {
    const { result } = renderHook(() => useCarouselEngine({ count }))
    registerAll(result)

    // jsdom 无 PointerEvent 构造器，用最小形状对象（handler 只读 clientX）
    const down = { clientX: 100 } as unknown as React.PointerEvent<HTMLDivElement>
    act(() => { result.current.handlePointerDown(down) })

    // 左拖 200px → indexDelta = +200/(75*1.2) ≈ +2.22 → clamp 后 2.22
    const move = { clientX: -100 } as unknown as React.PointerEvent<HTMLDivElement>
    act(() => { result.current.handlePointerMove(move) })

    const up = {} as React.PointerEvent<HTMLDivElement>
    act(() => { result.current.handlePointerUp(up) })
    act(() => { vi.advanceTimersByTime(2000) })

    expect(result.current.focusIndex).toBe(2)
  })

  it('prefers-reduced-motion → reducedMotion=true（渲染层出平铺列表）', () => {
    stubMatchMedia(true)
    const { result } = renderHook(() => useCarouselEngine({ count }))
    expect(result.current.reducedMotion).toBe(true)
  })

  it('loop 模式：末尾 stepNext 回绕到 0（不做有界封死）', () => {
    const { result } = renderHook(() => useCarouselEngine({ count, loop: true }))
    registerAll(result)

    act(() => { result.current.dotGoTo(count - 1) })
    act(() => { vi.advanceTimersByTime(2000) })
    expect(result.current.focusIndex).toBe(count - 1)

    act(() => { result.current.stepNext() })
    act(() => { vi.advanceTimersByTime(2000) })
    expect(result.current.focusIndex).toBe(0) // 回绕（参考项目取模语义）
  })

  it('loop 模式：末尾 wheel 朝外仍 preventDefault（无边界不释放）', () => {
    const { result } = renderHook(() => useCarouselEngine({ count, loop: true }))
    registerAll(result)

    act(() => { result.current.dotGoTo(count - 1) })
    act(() => { vi.advanceTimersByTime(2000) })

    const evt = new WheelEvent('wheel', { deltaY: 100, cancelable: true })
    act(() => { result.current.onWheelNative(evt) })
    expect(evt.defaultPrevented).toBe(true) // loop 无首尾释放
  })

  it('交互忠实度：参数变化触发实时重摆（renderNow 直写卡 transform）', () => {
    const { result, rerender } = renderHook<
      ReturnType<typeof useCarouselEngine>,
      { spacing: number }
    >((props) => useCarouselEngine({ count, itemSpacing: props.spacing }), { initialProps: { spacing: 75 } })
    registerAll(result)
    act(() => { result.current.renderNow?.() }) // 初始摆位一次

    // 卡[1] 在 spacing=75 下的 translateX
    expect(els[1].style.transform).toContain('translate3d(75.00px')
    // 改变 spacing → 实时重摆（无需手动 step/滚动）
    rerender({ spacing: 100 })
    act(() => { })
    expect(els[1].style.transform).toContain('translate3d(100.00px')
  })

  it('交互忠实度：自动循环开启 → 自动推进播放（loop 无限）', () => {
    const { result, rerender } = renderHook<ReturnType<typeof useCarouselEngine>, { play: boolean }>(
      (props) => useCarouselEngine({ count, isPlaying: props.play, loop: true }),
      { initialProps: { play: false } },
    )
    registerAll(result)
    act(() => { result.current.renderNow?.() })

    // 开启自动循环 → 1.5s 后应已推进到卡1（0.35/s × 1.5 ≈ 0.5，聚焦取模到 1）
    rerender({ play: true })
    act(() => { vi.advanceTimersByTime(1600) })
    expect(els[1].dataset.gcActive).toBe('1')
    expect(result.current.focusIndex).toBe(1)
  })

  it('loop 自动播放无限推进（wrap 下聚焦持续环转，不 clamp 停边界）', () => {
    const { result, rerender } = renderHook<ReturnType<typeof useCarouselEngine>, { play: boolean }>(
      (props) => useCarouselEngine({ count, isPlaying: props.play, loop: true }),
      { initialProps: { play: false } },
    )
    registerAll(result)
    act(() => { result.current.renderNow?.() })

    rerender({ play: true })
    // 长时间自动播放越过末尾（pos 增长超过 n）→ wrap 聚焦仍合法（不 clamp 停住）
    act(() => { vi.advanceTimersByTime(4000) }) // pos ≈ 1.4 ≈ 5 卡 × 时间…… 0.35×4 = 1.4，仍 < 5
    act(() => { vi.advanceTimersByTime(12000) }) // 累计 ~5.6，越过 count=5 → wrap 回
    expect(result.current.focusIndex).toBeGreaterThanOrEqual(0)
    expect(result.current.focusIndex).toBeLessThan(count)
  })

  it('loop 长时间自动播放无飘移（真机 bug 回归：pos 超过 n 后卡片不得漂出屏幕）', () => {
    const { result, rerender } = renderHook<ReturnType<typeof useCarouselEngine>, { play: boolean }>(
      (props) => useCarouselEngine({ count, isPlaying: props.play, loop: true }),
      { initialProps: { play: false } },
    )
    registerAll(result)
    act(() => { result.current.renderNow?.() })

    rerender({ play: true })
    // 累计 pos ≈ 0.35 × 18s = 6.3，远超 count=5 —— 老代码此处 offset 单次调整不够、
    // 全部卡漂出屏幕；新代码（pos 先归一化到 [0,n)）所有卡必须留在环形窗口内
    act(() => { vi.advanceTimersByTime(18000) })

    const spacing = 75
    const bound = (count / 2 + 0.6) * spacing // 环形半圈 + 余量
    for (const el of els) {
      expect(el.style.visibility).not.toBe('hidden')
      const m = el.style.transform.match(/translate3d\((-?[\d.]+)px/)
      expect(m).not.toBeNull()
      const x = Math.abs(parseFloat(m![1]))
      expect(x).toBeLessThanOrEqual(bound)
    }
    // 聚焦始终合法
    expect(result.current.focusIndex).toBeGreaterThanOrEqual(0)
    expect(result.current.focusIndex).toBeLessThan(count)
  })

  it('数据量变化：count 变小时位置被 clamp 回界内', () => {
    const { result, rerender } = renderHook<ReturnType<typeof useCarouselEngine>, { n: number }>(
      (props) => useCarouselEngine({ count: props.n }),
      { initialProps: { n: 8 } },
    )
    registerAll(result)

    act(() => { result.current.dotGoTo(6) })
    act(() => { vi.advanceTimersByTime(2000) })
    expect(result.current.focusIndex).toBe(6)

    // 收缩到 3 张：聚焦 clamp 回 2
    rerender({ n: 3 })
    expect(result.current.focusIndex).toBe(2)
  })
})
