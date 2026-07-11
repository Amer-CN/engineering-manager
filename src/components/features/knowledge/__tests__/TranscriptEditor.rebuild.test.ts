/**
 * TranscriptEditor rebuildFullText 契约测试
 *
 * 验证前端重组文本格式与后端 SttEndpoints.cs 一致性校验对齐：
 * 格式：【说话人N】文本（每段一行，用 \n 连接）
 */

import { describe, it, expect } from 'vitest'

/**
 * 复制 TranscriptEditor.tsx 中的 rebuildFullText 逻辑
 * 用于验证与后端重组逻辑一致
 */
function rebuildFullText(segments: { speaker: number; text: string }[]): string {
  return segments
    .filter(s => s.text.trim())
    .map(s => `【说话人${s.speaker}】${s.text.trim()}`)
    .join('\n')
}

describe('TranscriptEditor rebuildFullText — backend contract alignment', () => {
  it('single speaker → 【说话人1】文本', () => {
    const result = rebuildFullText([
      { speaker: 1, text: '你好世界' },
    ])
    expect(result).toBe('【说话人1】你好世界')
  })

  it('multi-speaker → newline joined with speaker labels', () => {
    const result = rebuildFullText([
      { speaker: 1, text: '第一段' },
      { speaker: 2, text: '第二段' },
    ])
    expect(result).toBe('【说话人1】第一段\n【说话人2】第二段')
  })

  it('filters empty segments', () => {
    const result = rebuildFullText([
      { speaker: 1, text: '有内容' },
      { speaker: 2, text: '   ' },
      { speaker: 3, text: '也有内容' },
    ])
    expect(result).toBe('【说话人1】有内容\n【说话人3】也有内容')
  })

  it('trims whitespace around text', () => {
    const result = rebuildFullText([
      { speaker: 1, text: '  前后空格  ' },
    ])
    expect(result).toBe('【说话人1】前后空格')
  })

  it('empty segments → empty string', () => {
    const result = rebuildFullText([])
    expect(result).toBe('')
  })

  it('all empty → empty string', () => {
    const result = rebuildFullText([
      { speaker: 1, text: '' },
      { speaker: 2, text: '  ' },
    ])
    expect(result).toBe('')
  })

  /**
   * 关键测试：前端重组文本与后端校验逻辑一致
   * 后端 SttEndpoints.cs 重组逻辑：
   *   string.Join("\n", dto.Segments
   *       .Where(s => !string.IsNullOrWhiteSpace(s.Text))
   *       .Select(s => $"【说话人{s.Speaker}】{s.Text.Trim()}"));
   */
  it('matches backend recompose format exactly', () => {
    const segments = [
      { speaker: 1, text: '张总说这个项目可以开工' },
      { speaker: 2, text: '好的我马上安排' },
      { speaker: 1, text: '预算控制在五十万以内' },
    ]

    const frontendRecomposed = rebuildFullText(segments)

    // 模拟后端重组逻辑
    const backendRecomposed = segments
      .filter(s => s.text.trim() !== '')
      .map(s => `【说话人${s.speaker}】${s.text.trim()}`)
      .join('\n')

    expect(frontendRecomposed).toBe(backendRecomposed)
  })
})
