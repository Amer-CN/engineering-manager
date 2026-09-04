import { describe, test, expect, vi, afterEach } from 'vitest'
import {
  parseChartReport,
  buildTrendSvg,
  buildChartWaffleSvg,
  buildChartBarsSvg,
} from '@/utils/chartReport'

const FULL_MD = [
  '# 9月第1周运营快报',
  '> 期间：9/1~9/7',
  '',
  '## 日活持续爬升，周五创出新高',
  '- 周五日活 35，为周内峰值',
  '- 工作日日均 24',
  '',
  '```chart-trend',
  '{"label":"每日日活","points":[{"x":"9/1","y":18},{"x":"9/2","y":22},{"x":"9/3","y":31},{"x":"9/4","y":27},{"x":"9/5","y":35}]}',
  '```',
  '',
  '## 发票结构健康，三成已收齐',
  '- 已收齐 33%，待开票 67%',
  '',
  '```chart-waffle',
  '{"title":"发票状态","rows":[{"name":"已收齐","value":33},{"name":"待开票","value":67}]}',
  '```',
  '',
  '## 支出集中于采购',
  '- 采购 12,345 元居首',
  '',
  '```chart-bars',
  '{"title":"支出TOP","rows":[{"name":"采购","value":12345},{"name":"物流","value":4321}]}',
  '```',
  '',
  '## 值得记住的数字',
  '- 12345｜支出 TOP1 金额',
  '- 33%｜已收齐占比',
].join('\n')

const TREND_POINTS = [
  { x: '9/1', y: 18 },
  { x: '9/2', y: 22 },
  { x: '9/3', y: 31 },
  { x: '9/4', y: 27 },
  { x: '9/5', y: 35 },
]

describe('parseChartReport（三块型 roundtrip）', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('title/period 提取 + 三节结构 + 各节 chart 块类型与数据正确', () => {
    const data = parseChartReport(FULL_MD)
    expect(data.title).toBe('9月第1周运营快报')
    expect(data.period).toBe('9/1~9/7')
    expect(data.sections).toHaveLength(3)

    const [s0, s1, s2] = data.sections
    expect(s0.headline).toBe('日活持续爬升，周五创出新高')
    expect(s0.bullets).toEqual(['周五日活 35，为周内峰值', '工作日日均 24'])
    expect(s0.chart?.kind).toBe('trend')
    expect(s0.chart?.label).toBe('每日日活')
    expect(s0.chart?.points).toHaveLength(5)
    expect(s0.chart?.points?.[4]).toEqual({ x: '9/5', y: 35 })

    expect(s1.headline).toBe('发票结构健康，三成已收齐')
    expect(s1.chart?.kind).toBe('waffle')
    expect(s1.chart?.title).toBe('发票状态')
    expect(s1.chart?.rows).toEqual([
      { name: '已收齐', value: 33 },
      { name: '待开票', value: 67 },
    ])

    expect(s2.headline).toBe('支出集中于采购')
    expect(s2.chart?.kind).toBe('bars')
    expect(s2.chart?.rows?.[0]).toEqual({ name: '采购', value: 12345 })
  })

  test('「值得记住的数字」节解析为 bigNumbers（数字｜说明），不进 sections', () => {
    const data = parseChartReport(FULL_MD)
    expect(data.sections.some((s) => s.headline === '值得记住的数字')).toBe(false)
    expect(data.bigNumbers).toEqual([
      { value: '12345', label: '支出 TOP1 金额' },
      { value: '33%', label: '已收齐占比' },
    ])
  })

  test('chart 块挂到所属节（节中位置正确）：trend 在节 0、waffle 在节 1、bars 在节 2', () => {
    const data = parseChartReport(FULL_MD)
    expect(data.sections.map((s) => s.chart?.kind)).toEqual(['trend', 'waffle', 'bars'])
  })

  test('weekend 字段透传（含时趋势 caption 语义）', () => {
    const md = [
      '## 周末回落',
      '- 两天低于工作日',
      '',
      '```chart-trend',
      '{"points":[{"x":"9/6","y":9,"weekend":true},{"x":"9/7","y":8,"weekend":true}]}',
      '```',
    ].join('\n')
    const data = parseChartReport(md)
    expect(data.sections[0].chart?.points?.[0]?.weekend).toBe(true)
  })

  test('坏 JSON 块整块降级为文本行（不吞内容、不 throw、chart 为空）', () => {
    const md = [
      '## 节甲',
      '- 要点',
      '',
      '```chart-trend',
      '{"label":"坏块","points":[{"x":"9/1"',
      '```',
    ].join('\n')
    const data = parseChartReport(md)
    expect(data.sections).toHaveLength(1)
    expect(data.sections[0].chart).toBeUndefined()
    expect(data.sections[0].lines).toEqual(['```chart-trend', '{"label":"坏块","points":[{"x":"9/1"', '```'])
    expect(data.sections[0].bullets).toEqual(['要点'])
  })

  test('结构不符（rows 非数组 / y 非数字）同样降级为文本行', () => {
    const md = [
      '## 节甲',
      '```chart-waffle',
      '{"rows":"不是数组"}',
      '```',
      '## 节乙',
      '```chart-bars',
      '{"rows":[{"name":"采购","value":"一万二"}]}',
      '```',
    ].join('\n')
    const data = parseChartReport(md)
    expect(data.sections[0].chart).toBeUndefined()
    expect(data.sections[1].chart).toBeUndefined()
    expect(data.sections[1].lines.join('\n')).toContain('{"rows":[')
  })

  test('未知 chart kind（AI 自创第四种 fence）整块原文降级，不吞内容', () => {
    const md = [
      '## 节甲',
      '- 要点',
      '```chart-pie',
      '{"rows":[{"name":"甲","value":40}]}',
      '```',
    ].join('\n')
    const data = parseChartReport(md)
    expect(data.sections[0].chart).toBeUndefined()
    expect(data.sections[0].lines.join('\n')).toContain('chart-pie')
  })

  test('无 chart 块 → 纯文本节（headline/bullets 保留）+ console.warn 一次', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const md = ['# 周报', '> 期间：a~b', '## 结论一', '- 要点一'].join('\n')
    const data = parseChartReport(md)
    expect(data.sections).toHaveLength(1)
    expect(data.sections[0].headline).toBe('结论一')
    expect(data.sections[0].bullets).toEqual(['要点一'])
    expect(data.sections[0].chart).toBeUndefined()
    expect(data.bigNumbers).toEqual([])
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })

  test('title/period 缺省 → 空串（组件侧兜底文案）', () => {
    const data = parseChartReport('## 结论\n- 要点')
    expect(data.title).toBe('')
    expect(data.period).toBe('')
  })

  test('非 chart fence 块原文保留为文本行；标题/期间前的引言行进匿名节', () => {
    const md = ['引言一句。', '```text', '普通内容', '```', '## 结论', '- 要点'].join('\n')
    const data = parseChartReport(md)
    expect(data.sections).toHaveLength(2)
    expect(data.sections[0].headline).toBe('')
    expect(data.sections[0].lines).toEqual(['引言一句。', '```text', '普通内容', '```'])
    expect(data.sections[1].headline).toBe('结论')
  })
})

describe('buildTrendSvg（basics B2 参数转写）', () => {
  test('点数 = points.length（圆点计数，无 weekend 时全实心）', () => {
    const svg = buildTrendSvg(TREND_POINTS)
    expect((svg.match(/<circle/g) || []).length).toBe(TREND_POINTS.length)
  })

  test('weekend 点为空心（fill="none" 描边），实心点数相应减少', () => {
    const svg = buildTrendSvg([
      { x: '9/1', y: 5 },
      { x: '9/2', y: 9, weekend: true },
    ])
    expect(svg).toContain('fill="none"')
    expect((svg.match(/<circle/g) || []).length).toBe(2)
  })

  test('峰值 top1 标数（最高 y 值出现在文本节点）', () => {
    const svg = buildTrendSvg(TREND_POINTS) // 峰值 35
    expect(svg).toContain('>35</text>')
  })

  test('X 轴首/中/尾锚点文本齐全', () => {
    const svg = buildTrendSvg(TREND_POINTS)
    expect(svg).toContain('>9/1</text>')
    expect(svg).toContain('>9/3</text>') // floor(4/2)=2 → 中位
    expect(svg).toContain('>9/5</text>')
  })

  test('无 <script、x 标签转义（无注入面）', () => {
    const svg = buildTrendSvg([{ x: '<b>9/1</b>', y: 3 }, { x: '9/2<script>', y: 6 }])
    expect(svg).toContain('&lt;b&gt;9/1&lt;/b&gt;')
    expect(svg).toContain('&lt;script&gt;')
    expect(svg).not.toContain('<script')
  })

  test('正比守卫：y 比例由 max 推导，峰值不越顶（y 坐标 ≥ 顶部留白）', () => {
    const svg = buildTrendSvg([
      { x: 'a', y: 1 },
      { x: 'b', y: 1000 },
      { x: 'c', y: 2 },
    ])
    const cys = [...svg.matchAll(/<circle[^>]*cy="([\d.]+)"/g)].map((m) => Number(m[1]))
    expect(cys.length).toBe(3)
    expect(Math.min(...cys)).toBeGreaterThanOrEqual(40 - 12) // TOP=40 减峰值点半径/标数余量
    expect(Math.max(...cys)).toBeLessThanOrEqual(262) // 底线 BASE
  })
})

describe('buildChartWaffleSvg / buildChartBarsSvg（porcelain 转写）', () => {
  test('方阵：点位满 100（round+封顶+补「其他」）、无 script、名称转义', () => {
    const svg = buildChartWaffleSvg([
      { name: '已收齐', value: 40 },
      { name: '待<b>开票</b>', value: 40 },
    ])
    expect((svg.match(/<circle[^>]*r="7\.5"/g) || []).length).toBe(100) // 40+40+其他 20
    expect(svg).toContain('其他')
    expect(svg).toContain('20%')
    expect(svg).toContain('&lt;b&gt;')
    expect(svg).not.toContain('<script')
  })

  test('条形：条数=行数、条长严格正比（max 守卫）、无 script', () => {
    const svg = buildChartBarsSvg([
      { name: '采购', value: 100 },
      { name: '物流', value: 50 },
      { name: '劳务', value: 0 },
    ])
    expect((svg.match(/<rect /g) || []).length).toBe(3)
    const widths = [...svg.matchAll(/width="([\d.]+)" height="10"/g)].map((m) => Number(m[1]))
    expect(widths[0] / widths[1]).toBeCloseTo(2, 5)
    expect(widths[2]).toBe(0)
    expect(svg).not.toContain('<script')
  })

  test('条形：名称转义', () => {
    const svg = buildChartBarsSvg([{ name: '费<用>', value: 1 }])
    expect(svg).toContain('&lt;')
    expect(svg).not.toContain('费<')
  })
})
