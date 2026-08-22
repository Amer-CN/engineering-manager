/**
 * ProtectedSpan Mark 往返无损测试（写作中心二期 R2）
 *
 * 验收标准 1：markdown `本周完成 [[3]] 个重点项目，投入 [[128.5万元]]`
 * 经 setContent({ contentType: "markdown" }) + getMarkdown() 后
 * [[3]] 与 [[128.5万元]] 原样保留。
 * 注：@tiptap/markdown 的 setContent 需显式传 contentType: "markdown"
 * 才走 markdown 解析链（否则按 HTML 解析），WritingEditor 侧沿用
 * editor.options.contentType 全局默认（见单测最后一项）。
 */
import { describe, it, expect } from 'vitest'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from '@tiptap/markdown'
import { ProtectedSpan } from '../../components/features/writing/protectedSpan'

describe('ProtectedSpan round-trip', () => {
  it('preserves [[3]] and [[128.5万元]] through setContent → getMarkdown', () => {
    const editor = new Editor({ extensions: [StarterKit, Markdown, ProtectedSpan], content: '' })
    editor.commands.setContent('本周完成 [[3]] 个重点项目，投入 [[128.5万元]]', {
      contentType: 'markdown',
    } as never)
    const md = editor.getMarkdown()
    expect(md).toContain('[[3]]')
    expect(md).toContain('[[128.5万元]]')
    editor.destroy()
  })

  it('renders [[...]] as span.protected-span in the editor DOM', () => {
    const editor = new Editor({ extensions: [StarterKit, Markdown, ProtectedSpan], content: '' })
    editor.commands.setContent('投入 [[128.5万元]]', { contentType: 'markdown' } as never)
    const html = editor.getHTML()
    expect(html).toContain('<span class="protected-span">128.5万元</span>')
    editor.destroy()
  })

  it('toggles the mark on selected text via toggleProtectedSpan command', () => {
    const editor = new Editor({ extensions: [StarterKit, Markdown, ProtectedSpan], content: '' })
    editor.commands.insertContent('三个重点项目')
    editor.commands.setTextSelection({ from: 1, to: 7 })
    expect(editor.commands.toggleProtectedSpan()).toBe(true)
    expect(editor.isActive('protectedSpan')).toBe(true)
    expect(editor.getMarkdown()).toBe('[[三个重点项目]]')
    editor.commands.setTextSelection({ from: 1, to: 7 })
    expect(editor.commands.toggleProtectedSpan()).toBe(true)
    expect(editor.isActive('protectedSpan')).toBe(false)
    expect(editor.getMarkdown()).toBe('三个重点项目')
    editor.destroy()
  })

  it('parses [[...]] in initial content when editor contentType is markdown', () => {
    const editor = new Editor({
      extensions: [StarterKit, Markdown, ProtectedSpan],
      content: '本周完成 [[3]] 个重点项目',
      contentType: 'markdown',
    })
    expect(editor.getMarkdown()).toContain('[[3]]')
    expect(editor.getHTML()).toContain('protected-span')
    editor.destroy()
  })
})
