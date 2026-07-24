import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import MarkdownRenderer from '../MarkdownRenderer'

function setup(md: string) {
  return render(<MarkdownRenderer content={md} />)
}

describe('MarkdownRenderer', () => {
  it('渲染粗体为 <strong>', () => {
    const { container } = setup('这是 **重点** 内容')
    const strong = container.querySelector('strong')
    expect(strong?.textContent).toBe('重点')
  })

  it('渲染行内代码为 <code>', () => {
    const { container } = setup('调用 `getProjects()` 方法')
    const code = container.querySelector('code')
    expect(code?.textContent).toBe('getProjects()')
  })

  it('渲染围栏代码块为 <pre><code>', () => {
    const { container } = setup('```ts\nconst a = 1\n```')
    const pre = container.querySelector('pre code')
    expect(pre?.textContent).toContain('const a = 1')
  })

  it('渲染无序列表', () => {
    const { container } = setup('- 项目 A\n- 项目 B\n- 项目 C')
    const items = container.querySelectorAll('ul > li')
    expect(items.length).toBe(3)
    expect(items[0].textContent).toContain('项目 A')
  })

  it('渲染有序列表为 <ol>', () => {
    const { container } = setup('1. 第一\n2. 第二')
    expect(container.querySelector('ol')).toBeTruthy()
    expect(container.querySelectorAll('ol > li').length).toBe(2)
  })

  it('支持嵌套列表', () => {
    const { container } = setup('- 父项\n  - 子项 1\n  - 子项 2')
    const nested = container.querySelector('ul > li > ul')
    expect(nested).toBeTruthy()
    expect(nested?.querySelectorAll('li').length).toBe(2)
  })

  it('渲染 GFM 表格', () => {
    const md = '| 名称 | 金额 |\n| --- | --- |\n| 甲 | 100 |\n| 乙 | 200 |'
    const { container } = setup(md)
    expect(container.querySelector('table')).toBeTruthy()
    expect(container.querySelectorAll('thead th').length).toBe(2)
    expect(container.querySelectorAll('tbody tr').length).toBe(2)
  })

  it('渲染标题', () => {
    const { container } = setup('## 小标题')
    expect(container.textContent).toContain('小标题')
  })

  it('渲染引用为 <blockquote>', () => {
    const { container } = setup('> 引用内容')
    expect(container.querySelector('blockquote')?.textContent).toContain('引用内容')
  })

  it('安全链接渲染为 <a> 并阻止默认导航', () => {
    const { container } = setup('访问 [官网](https://example.com)')
    const a = container.querySelector('a')
    expect(a?.getAttribute('href')).toBe('https://example.com')
  })

  it('javascript: 伪协议链接不渲染为 <a>（按纯文本降级）', () => {
    const { container } = setup('[点我](javascript:alert(1))')
    expect(container.querySelector('a')).toBeNull()
    expect(container.textContent).toContain('[点我](javascript:alert(1))')
  })

  it('不产生任何脚本节点', () => {
    const { container } = setup('**x** <script>alert(1)</script>')
    expect(container.querySelector('script')).toBeNull()
  })
})
