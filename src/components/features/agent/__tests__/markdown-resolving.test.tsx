/**
 * markdown-resolving.test.tsx — 流式旧块退后测试（Beautiful UI A4）
 *
 *  - streaming 中：最新块之前的旧块退后（style 直写 filter blur/opacity/scale，无 animation）；
 *    最新块保持全清晰（无 filter）。
 *  - streaming 结束（false）：全部块恢复正常（无任何退后样式）。
 */

import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import MarkdownRenderer from '../MarkdownRenderer'

describe('MarkdownRenderer 流式旧块退后（A4）', () => {
  it('流式中旧块 filter 含 blur/opacity 0.55，最新块不含退后样式', () => {
    const { container, rerender } = render(<MarkdownRenderer content="第一段正文" streaming />)
    rerender(<MarkdownRenderer content={'第一段正文\n\n第二段正文'} streaming />)
    const ps = container.querySelectorAll('p')
    expect(ps.length).toBe(2)
    // 旧块：退后样式直写 style（不用 animation）
    expect((ps[0] as HTMLElement).style.filter).toContain('blur')
    expect((ps[0] as HTMLElement).style.opacity).toBe('0.55')
    expect((ps[0] as HTMLElement).style.transform).toContain('scale')
    expect((ps[0] as HTMLElement).style.animation).toBe('')
    // 最新块：全清晰（无 filter/opacity 退后）
    expect((ps[1] as HTMLElement).style.filter).toBe('')
    expect((ps[1] as HTMLElement).style.opacity).toBe('')
  })

  it('streaming 结束（false）→ 全部块退后样式清空', () => {
    const { container, rerender } = render(<MarkdownRenderer content={'第一段\n\n第二段'} streaming />)
    rerender(<MarkdownRenderer content={'第一段\n\n第二段'} streaming={false} />)
    const ps = container.querySelectorAll('p')
    expect(ps.length).toBe(2)
    ps.forEach((p) => {
      expect((p as HTMLElement).style.filter).toBe('')
      expect((p as HTMLElement).style.opacity).toBe('')
      expect((p as HTMLElement).style.animation).toBe('')
    })
  })

  it('单块流式（无旧块）→ 不退后', () => {
    const { container } = render(<MarkdownRenderer content="只有一段" streaming />)
    const p = container.querySelector('p') as HTMLElement
    expect(p.style.filter).toBe('')
    expect(p.style.opacity).toBe('')
    expect(p.style.animation).toContain('stream-in')
  })
})
