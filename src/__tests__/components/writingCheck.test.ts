/**
 * 交稿体检 + 导出清洗单测（写作中心 R6）
 *
 * - runWritingCheck 纯函数：干净文档四项全绿；[[x]] 报残留；H1→H3 报跳号；
 *   套话计数与首次上下文；字数统计
 * - stripProtectedSpans：单层剥壳 / 嵌套残壳 / 无标记不变形
 */
import { describe, it, expect } from 'vitest'
import { runWritingCheck } from '../../components/features/writing/WritingCheckPanel'
import { stripProtectedSpans } from '../../utils/docxExport'

function docOf(md: string) {
  // 不引入 tiptap，最小手写 doc JSON
  // 输入约定：每行一个块；"# x" → heading1（## / ### 同理）；其余 → 段落
  const content = md.split('\n').filter((l) => l !== '').map((line) => {
    const m = /^(#{1,3})\s+(.*)$/.exec(line)
    if (m) {
      return { type: 'heading', attrs: { level: m[1].length }, content: [{ type: 'text', text: m[2] }] }
    }
    return { type: 'paragraph', content: [{ type: 'text', text: line }] }
  })
  return { type: 'doc', content }
}

describe('runWritingCheck（doc JSON 输入）', () => {
  it('干净文档四项全绿', () => {
    const results = runWritingCheck(docOf('# 工作总结\n本月完成 3 个项目。\n## 具体情况\n一切正常。'))
    expect(results).toHaveLength(4)
    for (const r of results) expect(r.ok).toBe(true)
  })

  it('含 [[3]] 时残留标记项报警且计数正确', () => {
    const results = runWritingCheck(docOf('本周完成 [[3]] 个项目，投入 [[128.5万元]]。'))
    const marker = results.find((r) => r.id === 'marker')!
    expect(marker.ok).toBe(false)
    expect(marker.summary).toContain('2 处')
    expect(marker.details).toContain('[[3]]')
    expect(marker.details).toContain('[[128.5万元]]')
  })

  it('残留超过 5 处只展示前 5 片段 + 合计', () => {
    const text = Array.from({ length: 7 }, (_, i) => `[[数据${i}]]`).join('')
    const results = runWritingCheck(docOf(text))
    const marker = results.find((r) => r.id === 'marker')!
    expect(marker.ok).toBe(false)
    expect(marker.summary).toContain('7 处')
    expect(marker.details).toHaveLength(6) // 前 5 + 「…等共 7 处」
    expect(marker.details[5]).toContain('共 7 处')
  })

  it('H1→H3 报层级跳号，H1→H2 不报', () => {
    const skip = runWritingCheck(docOf('# 总标题\n正文。\n### 三级\n内容。'))
    const heading = skip.find((r) => r.id === 'heading')!
    expect(heading.ok).toBe(false)
    expect(heading.summary).toContain('1 处')
    expect(heading.details[0]).toContain('H1')
    expect(heading.details[0]).toContain('H3')

    const okCase = runWritingCheck(docOf('# 总标题\n正文。\n## 二级\n内容。'))
    expect(okCase.find((r) => r.id === 'heading')!.ok).toBe(true)
  })

  it('套话：计数正确且给出首次上下文（前后各 12 字）', () => {
    const body = '公司领导高度重视安全生产工作，全流程高度重视落实。'
    const results = runWritingCheck(docOf(body))
    const cliche = results.find((r) => r.id === 'cliche')!
    expect(cliche.ok).toBe(false)
    expect(cliche.details[0]).toContain('高度重视')
    expect(cliche.details[0]).toContain('× 2')
    expect(cliche.details[0]).toContain('公司领导高度重视安全生产工作')
  })

  it('字数：去空白后按字符计', () => {
    const results = runWritingCheck(docOf('你好 world\n\tsecond line'))
    // 你好worldsecondline = 17 字符
    expect(results.find((r) => r.id === 'wordcount')!.summary).toBe('17 字')
  })
})

describe('runWritingCheck（字符串输入）', () => {
  it('markdown 字符串同样报 [[x]] 与标题跳号', () => {
    const results = runWritingCheck('# 标题\n\n段落含 [[42]] 条。\n\n### 跳号')
    expect(results.find((r) => r.id === 'marker')!.ok).toBe(false)
    expect(results.find((r) => r.id === 'heading')!.ok).toBe(false)
  })
})

describe('stripProtectedSpans（导出清洗）', () => {
  it('单层：[[3]] 个项目 → 3 个项目', () => {
    expect(stripProtectedSpans('本周完成 [[3]] 个项目，投入 [[128.5万元]]。')).toBe(
      '本周完成 3 个项目，投入 128.5万元。',
    )
  })

  it('嵌套残壳：从最内层剥到不动点', () => {
    expect(stripProtectedSpans('[[外层 [[内层]] 尾]]')).toBe('外层 内层 尾')
  })

  it('无标记文本不变形', () => {
    const md = '# 标题\n\n正文 **加粗** 与 ==高亮==，普通方括号 [1] 保留。'
    expect(stripProtectedSpans(md)).toBe(md)
  })

  it('单侧残括号不误伤', () => {
    expect(stripProtectedSpans('只开 [[ 没关')).toBe('只开 [[ 没关')
    expect(stripProtectedSpans('内容含 [ 括号 ] 字符')).toBe('内容含 [ 括号 ] 字符')
  })
})
