import { describe, test, expect } from 'vitest'
import { escapeHtml, templateMarkupToPrintHtml, tokenizeInline, parseMarkup } from '@/utils/templateMarkup'

describe('templateMarkup', () => {
  describe('escapeHtml', () => {
    test('转义 HTML 特殊字符', () => {
      expect(escapeHtml('<script>alert("x")</script>')).toBe('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;')
      expect(escapeHtml("a & b 'c'")).toBe('a &amp; b &#39;c&#39;')
    })
  })

  describe('templateMarkupToPrintHtml', () => {
    test('普通行渲染为缩进段落', () => {
      expect(templateMarkupToPrintHtml('甲方：某公司')).toBe('<p style="text-indent: 2em; margin: 10px 0;">甲方：某公司</p>')
    })

    test('## 行渲染为条款标题', () => {
      const html = templateMarkupToPrintHtml('## 一、合同价款')
      expect(html).toContain('font-weight: bold')
      expect(html).toContain('一、合同价款')
      expect(html).not.toContain('##')
    })

    test('粗体与斜体转换', () => {
      const html = templateMarkupToPrintHtml('金额 **伍佰万元** 按 *进度* 支付')
      expect(html).toContain('<strong>伍佰万元</strong>')
      expect(html).toContain('<em>进度</em>')
    })

    test('恶意 HTML 被转义（防注入）', () => {
      const html = templateMarkupToPrintHtml('<img src=x onerror=alert(1)>')
      expect(html).not.toContain('<img')
      expect(html).toContain('&lt;img')
    })

    test('多行按行分段', () => {
      const html = templateMarkupToPrintHtml('第一行\n第二行')
      expect(html.match(/<p /g)?.length).toBe(2)
    })

    test('空文本返回空段落', () => {
      expect(templateMarkupToPrintHtml('')).toBe('<p style="text-indent: 2em; margin: 10px 0;"></p>')
    })
  })

  describe('tokenizeInline', () => {
    test('拆分变量、粗体、斜体与文本', () => {
      const tokens = tokenizeInline('甲方 {{甲方名称}} 金额 **大写** 备注 *可选*')
      expect(tokens).toEqual([
        { type: 'text', content: '甲方 ' },
        { type: 'variable', content: '甲方名称' },
        { type: 'text', content: ' 金额 ' },
        { type: 'bold', content: '大写' },
        { type: 'text', content: ' 备注 ' },
        { type: 'italic', content: '可选' },
      ])
    })

    test('纯文本返回单 token', () => {
      expect(tokenizeInline('普通文字')).toEqual([{ type: 'text', content: '普通文字' }])
    })

    test('空行返回空数组', () => {
      expect(tokenizeInline('')).toEqual([])
    })
  })

  describe('parseMarkup', () => {
    test('识别标题行并剥离 ## 前缀', () => {
      const lines = parseMarkup('## 一、工程概况\n工程名称：{{工程名称}}')
      expect(lines[0].heading).toBe(true)
      expect(lines[0].tokens[0]).toEqual({ type: 'text', content: '一、工程概况' })
      expect(lines[1].heading).toBe(false)
      expect(lines[1].tokens[1]).toEqual({ type: 'variable', content: '工程名称' })
    })

    test('无序列表 - 前缀', () => {
      const lines = parseMarkup('- 第一项\n- 第二项')
      expect(lines[0].listType).toBe('ul')
      expect(lines[0].listContent).toBe('第一项')
      expect(lines[1].listType).toBe('ul')
      expect(lines[1].listContent).toBe('第二项')
    })

    test('无序列表 * 前缀', () => {
      const lines = parseMarkup('* 项目A\n* 项目B')
      expect(lines[0].listType).toBe('ul')
      expect(lines[0].listContent).toBe('项目A')
    })

    test('有序列表', () => {
      const lines = parseMarkup('1. 步骤一\n2. 步骤二\n10. 步骤十')
      expect(lines[0].listType).toBe('ol')
      expect(lines[0].listContent).toBe('步骤一')
      expect(lines[1].listType).toBe('ol')
      expect(lines[1].listContent).toBe('步骤二')
      expect(lines[2].listType).toBe('ol')
      expect(lines[2].listContent).toBe('步骤十')
    })

    test('混合内容：标题 + 普通行 + 列表', () => {
      const lines = parseMarkup('## 摘要\n普通段落\n- 列表项\n1. 有序项')
      expect(lines[0].heading).toBe(true)
      expect(lines[1].listType).toBeFalsy()
      expect(lines[2].listType).toBe('ul')
      expect(lines[3].listType).toBe('ol')
    })

    test('列表项支持行内标记', () => {
      const lines = parseMarkup('- **重要** 事项')
      expect(lines[0].listType).toBe('ul')
      expect(lines[0].listContent).toBe('**重要** 事项')
    })
  })

  describe('templateMarkupToPrintHtml 列表', () => {
    test('连续无序列表合并为 <ul>', () => {
      const html = templateMarkupToPrintHtml('- 第一项\n- 第二项')
      expect(html).toContain('<ul')
      expect(html).toContain('</ul>')
      expect(html).toContain('<li')
      expect(html).toContain('第一项')
      expect(html).toContain('第二项')
      expect((html.match(/<li/g) ?? []).length).toBe(2)
    })

    test('连续有序列表合并为 <ol>', () => {
      const html = templateMarkupToPrintHtml('1. 步骤一\n2. 步骤二')
      expect(html).toContain('<ol')
      expect(html).toContain('</ol>')
      expect((html.match(/<li/g) ?? []).length).toBe(2)
    })

    test('列表与段落混合', () => {
      const html = templateMarkupToPrintHtml('前言\n- 列表项\n后续')
      expect(html).toContain('<p style="text-indent: 2em')
      expect(html).toContain('<ul')
      expect(html).toContain('前言')
      expect(html).toContain('后续')
    })

    test('列表项内粗体渲染', () => {
      const html = templateMarkupToPrintHtml('- **重要** 内容')
      expect(html).toContain('<strong>重要</strong>')
    })

    test('列表项防注入', () => {
      const html = templateMarkupToPrintHtml('- <script>alert(1)</script>')
      expect(html).not.toContain('<script>')
      expect(html).toContain('&lt;script&gt;')
    })

    test('ul/ol 切换时分别输出', () => {
      const html = templateMarkupToPrintHtml('- 无序\n1. 有序')
      expect(html).toContain('<ul')
      expect(html).toContain('</ul>')
      expect(html).toContain('<ol')
      expect(html).toContain('</ol>')
    })
  })
})
