/**
 * markdown-streaming.test.tsx — MarkdownRenderer 流式进场动画测试（Beautiful UI 第二批）
 *
 *  (a) streaming=true：新块首现带 stream-in 进场动画 + 末尾闪烁光标；
 *  (b) 流式追加：已见过的块绝不重放动画，只有新出现的块有动画；
 *  (c) streaming=false / 未传：无动画、无光标（与非流式行为完全一致）。
 */

import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import MarkdownRenderer from '../MarkdownRenderer'

describe('MarkdownRenderer streaming', () => {
  it('streaming=true：新块首现带 stream-in 动画，且末尾有闪烁光标', () => {
    const { container } = render(<MarkdownRenderer content="第一段正文" streaming />)
    const p = container.querySelector('p') as HTMLElement
    expect(p).not.toBeNull()
    expect(p.style.animation).toContain('stream-in')
    expect(container.innerHTML).toContain('caret-blink')
  })

  it('流式追加：已见过的块不重放动画，新块带动画，光标仍在', () => {
    const { container, rerender } = render(<MarkdownRenderer content="第一段正文" streaming />)
    expect((container.querySelector('p') as HTMLElement).style.animation).toContain('stream-in')

    // 第二个分片到达：追加第二段（key 位置序号 b1 首次出现）
    rerender(<MarkdownRenderer content={'第一段正文\n\n第二段正文'} streaming />)
    const ps = container.querySelectorAll('p')
    expect(ps.length).toBe(2)
    // 旧块：无动画（不重放）
    expect((ps[0] as HTMLElement).style.animation).toBe('')
    // 新块：有动画
    expect((ps[1] as HTMLElement).style.animation).toContain('stream-in')
    expect(container.innerHTML).toContain('caret-blink')
  })

  it('streaming=false：无动画、无光标', () => {
    const { container } = render(<MarkdownRenderer content="普通渲染" streaming={false} />)
    expect((container.querySelector('p') as HTMLElement).style.animation).toBe('')
    expect(container.innerHTML).not.toContain('caret-blink')
  })

  it('未传 streaming（缺省）：行为与非流式完全一致', () => {
    const { container } = render(<MarkdownRenderer content="**加粗**内容" />)
    expect(container.querySelector('strong')?.textContent).toBe('加粗')
    expect((container.querySelector('p') as HTMLElement).style.animation).toBe('')
    expect(container.innerHTML).not.toContain('caret-blink')
  })

  it('streaming 翻 false（完成）：光标消失，已渲染内容不受影响', () => {
    const { container, rerender } = render(<MarkdownRenderer content={'第一段\n\n第二段'} streaming />)
    expect(container.innerHTML).toContain('caret-blink')
    rerender(<MarkdownRenderer content={'第一段\n\n第二段'} streaming={false} />)
    expect(container.innerHTML).not.toContain('caret-blink')
    const ps = container.querySelectorAll('p')
    expect(ps.length).toBe(2)
    expect(ps[0].textContent).toBe('第一段')
    expect(ps[1].textContent).toBe('第二段')
  })
})
