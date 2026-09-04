import { describe, test, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  parseReportMarkdown,
  buildReportPrintHtml,
  buildWaffleSvg,
  buildTopBarsSvg,
} from '@/utils/reportPrintHtml'

const META = {
  productName: '工程管家',
  dataNote: 'AI 生成报告 · 测试',
  source: '本地数据台账',
  takenAt: '2026-09-03',
  footerLeft: '月度运营简报 · 2026 年 9 月',
}

describe('parseReportMarkdown', () => {
  test('## 分节正确：## 行为小节名，其后行归该节', () => {
    const { title, sections } = parseReportMarkdown(
      '# 运营月报\n## 摘要\n本月整体平稳。\n- 发票 12 张\n## 总结建议\n继续跟进回款',
    )
    expect(title).toBe('运营月报')
    expect(sections).toHaveLength(2) // 无首段 → 不产引言节
    expect(sections[0].name).toBe('摘要')
    expect(sections[0].heading).toBe('本月整体平稳。') // 首个非列表行 → 结论句
    expect(sections[0].lines).toEqual(['- 发票 12 张'])
    expect(sections[1].name).toBe('总结建议')
    expect(sections[1].heading).toBe('继续跟进回款')
    expect(sections[1].lines).toEqual([])
  })

  test('首段归引言节（无小节名）', () => {
    const { sections } = parseReportMarkdown('这是引言第一段。\n## 摘要\n正文。')
    expect(sections).toHaveLength(2)
    expect(sections[0].name).toBeNull()
    expect(sections[0].heading).toBe('这是引言第一段。')
    expect(sections[1].name).toBe('摘要')
  })

  test('无 ## 时兜底单节，内容不丢', () => {
    const { sections } = parseReportMarkdown('只有段落一。\n- 列表项\n段落二。')
    expect(sections).toHaveLength(1)
    expect(sections[0].name).toBeNull()
    // 全部行仍在（首个非列表行作结论句，其余进 lines）
    expect(sections[0].heading).toBe('只有段落一。')
    expect(sections[0].lines).toEqual(['- 列表项', '段落二。'])
  })

  test('空行剔除', () => {
    const { sections } = parseReportMarkdown('第一段。\n\n\n第二段。\n')
    expect(sections).toHaveLength(1)
    expect(sections[0].heading).toBe('第一段。')
    expect(sections[0].lines).toEqual(['第二段。'])
  })

  test('空输入 → 无 section', () => {
    const { title, sections } = parseReportMarkdown('')
    expect(title).toBeNull()
    expect(sections).toHaveLength(0)
  })
})

describe('buildReportPrintHtml', () => {
  test('结构：书脊（竖排样式串）/小节/来源行/双行页脚齐全', () => {
    const { sections } = parseReportMarkdown('引言。\n## 摘要\n正文。\n- 条目')
    const html = buildReportPrintHtml('运营月报', '2026.09', sections, META)
    expect(html).toContain('class="spine"')
    expect(html).toContain('writing-mode:vertical-rl')
    expect(html).toContain('>运营月报</div>') // 书脊大标题
    expect(html).toContain('>2026.09</div>') // 书脊竖排小字
    expect(html).toContain('class="secthead')
    expect(html).toContain('class="claim"')
    expect(html).toContain('class="srcline"')
    expect(html).toContain('本地数据台账 · 2026-09-03') // 来源行：SECTION · 来源 · 日期
    expect(html).toContain('class="foot"')
    expect(html).toContain(`<span>${META.footerLeft}</span>`)
    expect(html).toContain(`<span>数据 · ${META.source} · ${META.takenAt}</span>`)
    expect(html).toContain('@page{size:A4')
    expect(html).toContain('position:fixed') // 书脊每页贯穿（@media print 下 fixed 逐页重复）
  })

  test('大数字块：传入时渲染 kpi 结构，双行小注', () => {
    const html = buildReportPrintHtml(
      '运营月报',
      '2026.09',
      [
        {
          name: '摘要',
          heading: '',
          lines: [],
          bigNumbers: [
            { value: '1,502', label: '发票总数', sub: '日均 50 张' },
          ],
        },
      ],
      META,
    )
    expect(html).toContain('class="stats"')
    expect(html).toContain('class="kpi"')
    expect(html).toContain('<div class="v">1,502</div>')
    expect(html).toContain('<div class="r">日均 50 张</div>')
    expect(html).toContain('<div class="l">发票总数</div>')
  })

  test('大数字块：不传则整块不渲染（诚实，不硬凑数字）', () => {
    const html = buildReportPrintHtml('运营月报', '2026.09', [{ name: '摘要', heading: '', lines: [] }], META)
    expect(html).not.toContain('class="stats"')
    expect(html).not.toContain('class="kpi"')
  })

  test('转义：heading / lines 含 <script> 与 & 时输出被转义，无注入面', () => {
    const html = buildReportPrintHtml(
      '标题<script>alert(1)</script>',
      '2026.09',
      [
        {
          name: '摘要',
          heading: '结论 <b>加粗</b> & "引号"',
          lines: ['- 注入 <script>alert("x")</script> & 尾随'],
        },
      ],
      META,
    )
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('&lt;/script&gt;')
    expect(html).toContain('&amp;')
    expect(html).toContain('&quot;')
    expect(html).not.toContain('<script')
  })

  test('列表行渲染为 <li> 并剔除记号，段落行渲染为 <p>', () => {
    const html = buildReportPrintHtml('t', 'p', [{ name: '摘要', heading: '', lines: ['- 条目甲', '段落乙'] }], META)
    expect(html).toContain('<ul>')
    expect(html).toContain('<li>条目甲</li>')
    expect(html).not.toContain('<li>- 条目甲</li>')
    expect(html).toContain('<p>段落乙</p>')
  })

  test('空 sections：仍输出完整文档骨架（书脊/页眉/页脚），无小节', () => {
    const html = buildReportPrintHtml('空报告', '2026.09', [], META)
    expect(html).toContain('<!doctype html>')
    expect(html).toContain('class="spine"')
    expect(html).toContain('class="tophead"')
    expect(html).toContain('class="foot"')
    expect(html).not.toContain('class="section"')
  })

  test('生成器无 Math.random（打印产物确定性）', () => {
    // vitest 模块运行器下 import.meta.url 指向 http://localhost，无法 fileURLToPath；
    // 测试从项目根运行（cwd = 项目根），用相对根路径读源码（同 pasteSanitizer.test 法）
    const src = readFileSync(join(process.cwd(), 'src/utils/reportPrintHtml.ts'), 'utf-8')
    expect(src).not.toContain('Math.random')
  })
})

describe('表格渲染（markdown 表 → 官方细线表）', () => {
  test('标准 md 表 → thead+tbody 结构，**bold** 单元格保留，管道符不裸露', () => {
    const { sections } = parseReportMarkdown(
      '## 明细\n| 状态 | 张数 | 金额 |\n|---|---|---|\n| 已开票 | **12** | 3,400 |\n| 已收齐 | 8 | 2,000 |',
    )
    const html = buildReportPrintHtml('t', 'p', sections, META)
    expect(html).toContain('<thead>')
    expect(html).toContain('<tbody>')
    expect(html).toContain('<th>状态</th>')
    expect(html).toContain('<td><strong>12</strong></td>')
    expect(html).toContain('<td>3,400</td>')
    expect(html).not.toContain('|---|')
    expect(html).not.toContain('<p>| 状态 |')
  })

  test('孤行 | 不成表（渲染为段落）', () => {
    const html = buildReportPrintHtml('t', 'p', [{ name: 'a', heading: '', lines: ['| 只有孤行'] }], META)
    expect(html).not.toContain('<thead>')
    expect(html).toContain('<p>| 只有孤行</p>')
  })

  test('表格行不抢占结论句 heading', () => {
    const { sections } = parseReportMarkdown('## 明细\n| a | b |\n|---|---|\n| 1 | 2 |')
    expect(sections).toHaveLength(1)
    expect(sections[0].heading).toBe('')
    expect(sections[0].lines).toEqual(['| a | b |', '|---|---|', '| 1 | 2 |'])
  })
})

describe('井号全层级（#/##/###/####）', () => {
  test('### 开新节、#### 并入节内容加粗，渲染后无井号字面量', () => {
    const md = '# 报告\n## 第一节\n正文。\n### 子节甲\n内容甲。\n#### 子条乙\n- 项一'
    const { title, sections } = parseReportMarkdown(md)
    expect(title).toBe('报告')
    expect(sections.map((s) => s.name)).toEqual(['第一节', '子节甲'])
    expect(sections[1].lines).toContain('**子条乙**')
    const html = buildReportPrintHtml('t', 'p', sections, META)
    expect(html).not.toContain('###')
    expect(html).not.toContain('####')
    expect(html).toContain('<strong>子条乙</strong>')
  })
})

describe('buildWaffleSvg（发票状态方阵）', () => {
  test('100 点方阵 + 图例特大百分比 + 无 script', () => {
    const svg = buildWaffleSvg([
      { name: '已收齐', pct: 34, color: '#43593B' },
      { name: '部分收付', pct: 27, color: '#D4A017' },
    ])
    expect(svg).toContain('<svg')
    // 方阵网格点 r=7.5（图例色点为 r=5，分开计数）
    expect((svg.match(/<circle[^>]*r="7\.5"/g) || []).length).toBe(100) // 34+27 补满 100 点
    expect(svg).toContain('34%')
    expect(svg).toContain('27%')
    expect(svg).toContain('已收齐')
    expect(svg).not.toContain('<script')
  })

  test('图例 name 转义（无注入面）', () => {
    const svg = buildWaffleSvg([{ name: '状态<script>alert(1)</script>', pct: 50 }])
    expect(svg).toContain('&lt;script&gt;')
    expect(svg).not.toContain('<script')
  })

  test('Σ<100 时图例补「其他」段', () => {
    const svg = buildWaffleSvg([{ name: '已收齐', pct: 40 }])
    expect(svg).toContain('其他')
    expect(svg).toContain('60%')
  })
})

describe('buildTopBarsSvg（支出 TOP 条形）', () => {
  test('条数=行数、条尾等宽数值、无 script、条长严格正比（max 守卫）', () => {
    const svg = buildTopBarsSvg(
      [
        { name: '材料费', value: 100 },
        { name: '劳务费', value: 50 },
        { name: '机械费', value: 0 },
      ],
      '¥',
    )
    expect((svg.match(/<rect /g) || []).length).toBe(3)
    expect(svg).toContain('¥100')
    expect(svg).toContain('¥50')
    expect(svg).toContain('¥0')
    expect(svg).not.toContain('<script')
    const widths = [...svg.matchAll(/width="([\d.]+)" height="10"/g)].map((m) => Number(m[1]))
    expect(widths).toHaveLength(3)
    expect(widths[0]).toBeGreaterThan(0)
    expect(widths[0] / widths[1]).toBeCloseTo(2, 5) // 100:50 = 2:1 严格正比
    expect(widths[2]).toBe(0) // 0 值条宽 0，名称数值仍显
  })

  test('类目 name 转义', () => {
    const svg = buildTopBarsSvg([{ name: '费<用>', value: 1 }], '¥')
    expect(svg).toContain('&lt;')
    expect(svg).not.toContain('费<')
  })
})

describe('大数字兜底 + 报告附图注入（charts 参数）', () => {
  test('AI sections 无数字块时，charts 真实数据生成 3 块 + 报告附图区', () => {
    const html = buildReportPrintHtml('t', 'p', [{ name: '摘要', heading: '', lines: [] }], META, {
      waffle: { rows: [{ name: '已收齐', pct: 50 }], total: 12 },
      topBars: {
        rows: [
          { name: '材料费', value: 100 },
          { name: '劳务费', value: 50 },
        ],
        unit: '¥',
      },
    })
    expect(html).toContain('值得记住的数字')
    expect(html).toContain('数据 · 发票台账 + 成本台账')
    expect((html.match(/class="kpi"/g) || []).length).toBe(3) // 发票合计 / TOP1 金额 / TOP 类目占比
    expect(html).toContain('<div class="v">12</div>')
    expect(html).toContain('<div class="v">¥100</div>')
    expect(html).toContain('<div class="v">67%</div>')
    expect(html).toContain('报告附图')
    expect(html).toContain('WAFFLE 100 · PALM · 发票台账')
    expect(html).toContain('TOP BARS · PALM · 成本台账')
    expect(html).toContain('<svg') // 图表进打印页
  })

  test('sections 已有大数字时兜底不重复渲染', () => {
    const html = buildReportPrintHtml(
      't',
      'p',
      [{ name: 'a', heading: '', lines: [], bigNumbers: [{ value: '9', label: 'l', sub: 's' }] }],
      META,
      { waffle: { rows: [], total: 5 } },
    )
    expect((html.match(/class="stats"/g) || []).length).toBe(1)
    expect(html).not.toContain('数据 · 发票台账 + 成本台账') // 兜底块未渲染（无第二条来源行）
  })

  test('向后兼容：不传 charts 时无图表区/无兜底大数字（产物结构与旧调用一致）', () => {
    const html = buildReportPrintHtml('t', 'p', [{ name: '摘要', heading: '', lines: [] }], META)
    expect(html).not.toContain('<svg')
    expect(html).not.toContain('class="stats"')
    expect(html).not.toContain('class="chartblk"')
    expect(html).not.toContain('WAFFLE 100')
    expect(html).not.toContain('数据 · 发票台账 + 成本台账')
  })
})
