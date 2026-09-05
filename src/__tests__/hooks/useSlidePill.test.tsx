/**
 * useSlidePill — 滑动胶囊 hook 测试（动效批 1）
 * 纵轴（top/height）与横轴（left/width）都要断言——横向切换器依赖横轴定位。
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import React from 'react'
import { useSlidePill } from '@/hooks/useSlidePill'

/** 简易测试容器：两项按钮 + 胶囊层，模拟真实用法（容器级 mouseleave 清 hover） */
function Harness({ active, onPick }: { active: string; onPick?: (k: string) => void }) {
  const pill = useSlidePill(active)
  return (
    <div ref={pill.containerRef} data-testid="container" style={{ position: 'relative' }}
      onMouseLeave={pill.leaveContainer}>
      <span aria-hidden data-testid="pill" style={{ ...pill.pillStyle, background: 'var(--panel-2)' }} />
      <button ref={pill.registerItem('a')} data-testid="btn-a"
        onMouseEnter={() => pill.setHovered('a')} onMouseLeave={pill.leaveItem}
        onClick={() => onPick?.('a')}>A</button>
      <button ref={pill.registerItem('b')} data-testid="btn-b"
        onMouseEnter={() => pill.setHovered('b')} onMouseLeave={pill.leaveItem}
        onClick={() => onPick?.('b')}>B</button>
    </div>
  )
}

/** jsdom 无真实布局（getBoundingClientRect 全 0），位置断言用 mock rect 驱动 */
let restoreRects: (() => void) | null = null
beforeEach(() => {
  const orig = Element.prototype.getBoundingClientRect
  const rects: Record<string, DOMRect> = {
    container: { top: 0, left: 0, height: 100, width: 400 } as DOMRect,
    'btn-a': { top: 10, left: 0, height: 32, width: 120 } as DOMRect,
    'btn-b': { top: 10, left: 160, height: 32, width: 140 } as DOMRect,
  }
  Element.prototype.getBoundingClientRect = function (this: Element) {
    const key = (this as HTMLElement).dataset?.testid
    if (key && rects[key]) return rects[key]
    return orig.call(this)
  }
  restoreRects = () => { Element.prototype.getBoundingClientRect = orig }
})
afterEach(() => { restoreRects?.() })

describe('useSlidePill', () => {
  it('active 项注册后胶囊可见（opacity 1）且纵轴+横轴位置正确', () => {
    const { getByTestId } = render(<Harness active="a" />)
    const pill = getByTestId('pill')
    expect(pill.style.opacity).toBe('1')
    expect(pill.style.top).toBe('10px')
    expect(pill.style.height).toBe('32px')
    expect(pill.style.left).toBe('0px')
    expect(pill.style.width).toBe('120px')
    expect(pill.style.transition).toContain('180ms')
    // 尺寸类属性不过渡（防挤压弹跳）：transition 只含 top/left 位移
    expect(pill.style.transition).not.toContain('width')
  })

  it('横向切换器语义：hover 右侧按钮时胶囊横向滑过去（left/width 变化，top 不变）', () => {
    const { getByTestId } = render(<Harness active="a" />)
    const pill = getByTestId('pill')
    expect(pill.style.left).toBe('0px')
    expect(pill.style.width).toBe('120px')
    fireEvent.mouseEnter(getByTestId('btn-b'))
    expect(pill.style.left).toBe('160px')
    expect(pill.style.width).toBe('140px')
    expect(pill.style.top).toBe('10px')
    // 按钮间 gap（按钮 mouseleave）不清 hover——胶囊停在目标上不跳回。
    // relatedTarget 须显式给容器：jsdom 对缺省 relatedTarget 塞的是 window（非 Node），
    // 会骗过 React 的祖先 leave 合成；真实浏览器里移入 gap 时 relatedTarget 就是容器。
    fireEvent.mouseLeave(getByTestId('btn-b'), { relatedTarget: getByTestId('container') })
    expect(pill.style.left).toBe('160px')
    // 整组离开（容器 mouseleave）才回落 active；relatedTarget=容器外（document.body）
    fireEvent.mouseLeave(getByTestId('container'), { relatedTarget: document.body })
    expect(pill.style.left).toBe('0px')
  })

  it('active 项未注册（key 不存在）时胶囊隐藏（opacity 0、宽高 0）', () => {
    const { result } = renderHookGhost()
    expect(result.current.pillStyle.opacity).toBe(0)
    expect((result.current.pillStyle as { width?: number }).width).toBe(0)
  })
})

/** active 指向不存在项的裸 hook */
function renderHookGhost() {
  const { result } = renderHookSimple()
  function renderHookSimple() {
    // 简单包装：直接用 React 的 renderHook 等价物
    let out: { current: ReturnType<typeof useSlidePill> } = { current: null as never }
    function Probe() {
      out.current = useSlidePill('ghost')
      return null
    }
    render(<Probe />)
    return { result: out }
  }
  return renderHookSimple()
}
