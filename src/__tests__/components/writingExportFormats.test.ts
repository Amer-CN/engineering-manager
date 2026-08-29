/**
 * exportFormats 单测（写作中心 R15）
 *
 * - stripMarkdownSyntax：markdown → 纯文本剥标记（标题/粗斜删高亮/图片/链接/表格/引用/任务/围栏/分隔线）
 * - downloadTextFile：Blob + URL.createObjectURL + a.click + revoke 触发下载
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { downloadTextFile, stripMarkdownSyntax } from '../../utils/exportFormats'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('stripMarkdownSyntax（markdown → 纯文本）', () => {
  it('标题剥 #（多级）', () => {
    expect(stripMarkdownSyntax('# 一级标题\n## 二级标题\n### 三级标题')).toBe('一级标题\n二级标题\n三级标题')
  })

  it('行内粗/斜/删/高亮/代码剥标记留内容', () => {
    expect(stripMarkdownSyntax('**粗体** *斜体* ~~删除~~ ==高亮== `代码`')).toBe('粗体 斜体 删除 高亮 代码')
  })

  it('图片 ![alt](url) → [图片: alt]', () => {
    expect(stripMarkdownSyntax('见下图：![施工现场图](http://x/1.png)')).toBe('见下图：[图片: 施工现场图]')
  })

  it('链接 [text](url) → text', () => {
    expect(stripMarkdownSyntax('请查收[工程验收单](https://x/1.pdf)已盖章')).toBe('请查收工程验收单已盖章')
  })

  it('表格行 |a|b| → a\\tb，对齐分隔行剔除', () => {
    const md = '| 姓名 | 工种 |\n| --- | --- |\n| 张三 | 电工 |'
    expect(stripMarkdownSyntax(md)).toBe('姓名\t工种\n张三\t电工')
  })

  it('引用剥 >', () => {
    expect(stripMarkdownSyntax('> 引用一段话\n正文')).toBe('引用一段话\n正文')
  })

  it('任务 - [ ] → ☐、- [x] → ☑', () => {
    expect(stripMarkdownSyntax('- [ ] 待办事项\n- [x] 已完成')).toBe('☐ 待办事项\n☑ 已完成')
  })

  it('代码围栏：删 ``` 标记行，围栏内代码保留', () => {
    const md = '```js\nconst a = 1;\n```'
    expect(stripMarkdownSyntax(md)).toBe('const a = 1;')
  })

  it('分隔线 --- → ————', () => {
    expect(stripMarkdownSyntax('上\n---\n下')).toBe('上\n————\n下')
  })

  it('列表前缀保留（非任务列表）', () => {
    expect(stripMarkdownSyntax('- 无序项\n1. 有序项')).toBe('- 无序项\n1. 有序项')
  })
})

describe('downloadTextFile（Blob 下载触发）', () => {
  it('createObjectURL + a.download + a.click + revoke 全链路', () => {
    let captured: Blob | null = null
    const createSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockImplementation((blob: Blob) => {
        captured = blob
        return 'blob:mock-url'
      })
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const anchor = document.createElement('a')
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) =>
      tag === 'a' ? anchor : document.createElement(tag),
    )

    downloadTextFile('测试文档.md', '# 标题', 'text/markdown')

    expect(createSpy).toHaveBeenCalledTimes(1)
    expect(captured?.type).toBe('text/markdown')
    expect(anchor.download).toBe('测试文档.md')
    expect(anchor.href).toBe('blob:mock-url')
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(revokeSpy).toHaveBeenCalledWith('blob:mock-url')
  })
})
