/** 三模板生成器测试（R01/R05/R12 + getTemplateId 映射 + 向后兼容） */
import { describe, it, expect } from 'vitest'
import { getTemplateId, buildTemplatePrintHtml } from '@/utils/reportTemplates'
import { buildR01PrintHtml } from '@/utils/reportTemplates/r01Print'
import { buildR05PrintHtml } from '@/utils/reportTemplates/r05Print'
import { buildR12PrintHtml } from '@/utils/reportTemplates/r12Print'
import type { TemplateReportData } from '@/utils/reportTemplates/types'
import { MONO } from '@/utils/reportTemplates/types'

const SAMPLE: TemplateReportData = {
  title: '工资月报（工资专项）',
  period: '2026-09',
  meta: {
    product: '工程管家',
    generatedBy: 'AI 生成',
    dataSource: '工资台账',
    date: '2026-09-04',
  },
  sections: [
    { name: '一、总额', heading: '本月工资 128 万元', lines: ['共 41 人', '- 出勤 <正常>'] },
    { name: null, heading: '', lines: [] },
  ],
  charts: {
    waffle: { title: '用工构成', rows: [{ name: '一线', pct: 70, color: '#43593B' }, { name: '管理', pct: 30, color: '#D4A017' }] },
    topBars: { title: '项目 TOP', unit: '¥', rows: [{ name: 'A<li>项目', value: 800000 }, { name: 'B 项目', value: 480000 }] },
    bigNumbers: [
      { value: '128万', label: '本月工资总额', sub: '41 人' },
      { value: '3.1万', label: '人均', sub: '环比 +2%' },
    ],
  },
}

describe('getTemplateId 映射', () => {
  it('purpose → templateId 写死映射', () => {
    expect(getTemplateId('review')).toBe('r04')
    expect(getTemplateId('evidence')).toBe('r01')
    expect(getTemplateId('work')).toBe('r05')
    expect(getTemplateId('weekly')).toBe('r12')
  })
  it('缺省/未知 purpose 回 R04（零回归）', () => {
    expect(getTemplateId(undefined)).toBe('r04')
    expect(getTemplateId('unknown')).toBe('r04')
  })
})

describe('R01 对外举证', () => {
  it('含侧栏轨道结构与衬线标题', () => {
    const html = buildR01PrintHtml(SAMPLE)
    expect(html).toContain('grid-template-columns:1fr 300px')
    expect(html).toContain('Source Serif 4')
    expect(html).toContain('口径说明')
  })
  it('转义 <script>（标题/类目名注入面）', () => {
    const html = buildR01PrintHtml({ ...SAMPLE, title: '<script>alert(1)</script>' })
    expect(html).not.toContain('<script>alert')
    expect(html).toContain('&lt;script&gt;')
  })
  it('空 charts 不崩', () => {
    const html = buildR01PrintHtml({ ...SAMPLE, charts: undefined })
    expect(html).toContain('工资月报')
  })
})

describe('R05 工作汇报', () => {
  it('含窄版心 760 + 反色高亮 + tick 条带', () => {
    const html = buildR05PrintHtml(SAMPLE)
    expect(html).toContain('760px')
    expect(html).toContain('box-decoration-break')
    expect(html).toContain('TICK STRIP')
  })
  it('转义与空 charts', () => {
    const bad = buildR05PrintHtml({ ...SAMPLE, title: 'x & y <z>' })
    expect(bad).toContain('x &amp; y')
    const empty = buildR05PrintHtml({ ...SAMPLE, charts: undefined })
    expect(empty).toContain('工资月报')
  })
})

describe('R05 打印 Waffle 口径（P2 收尾项 9/10）', () => {
  it('seg.color 白名单：非法色不注入 SVG 属性，用 palette 兜底；合法 hex 放行', () => {
    const html = buildR05PrintHtml({
      ...SAMPLE,
      charts: {
        waffle: {
          title: '用工构成',
          rows: [
            { name: '一线', pct: 50, color: 'red' },
            { name: '管理', pct: 50, color: '#D4A017' },
          ],
        },
      },
    })
    expect(html).not.toContain('fill="red"')
    expect(html).toContain(`fill="${MONO.ink}"`) // 首行非法 → palette 兜底 MONO.ink
    expect(html).toContain('fill="#D4A017"') // 合法 hex 原样放行
  })
  it('点位分配累计封顶 100：pct 溢出不超 100 点（Math.max(0, min(round, 100-cum))）', () => {
    const html = buildR05PrintHtml({
      ...SAMPLE,
      charts: {
        waffle: {
          title: '用工构成',
          rows: [
            { name: 'A', pct: 80, color: '#1C1C1A' },
            { name: 'B', pct: 80, color: '#4A4944' },
          ],
        },
      },
    })
    expect(html).toContain('HUNDRED FIELD')
    // 80 + 20 封顶（B 段被压到余量），无第 3 段溢出
    const circles = (html.match(/<circle /g) ?? []).length
    expect(circles).toBe(100)
    // 图例显示分配后的封顶值而非原始 pct
    expect(html).toContain('A · 80%')
    expect(html).toContain('B · 20%')
  })
})

describe('buildTemplatePrintHtml 分发', () => {
  it('r01 → R01 版式', () => {
    const html = buildTemplatePrintHtml('r01', SAMPLE)
    expect(html).toContain('Source Serif 4')
    expect(html).toContain('口径说明')
  })
  it('r05 → R05 版式', () => {
    const html = buildTemplatePrintHtml('r05', SAMPLE)
    expect(html).toContain('760px')
    expect(html).toContain('TICK STRIP')
  })
  it('r12 → R12 版式', () => {
    const html = buildTemplatePrintHtml('r12', SAMPLE)
    expect(html).toContain('CHUNKY BARS')
  })
  it('未知 id → R01（零回归兜底）', () => {
    const html = buildTemplatePrintHtml('unknown', SAMPLE)
    expect(html).toContain('Source Serif 4')
    expect(html).toContain('口径说明')
  })
})

describe('R12 打印结构（P0 修复项）', () => {
  it('JSON 数据块位于主脚本之前（先声明后读取）', () => {
    const html = buildR12PrintHtml(SAMPLE)
    const jsonPos = html.indexOf('id="r12adata"')
    const mainScriptPos = html.indexOf('(function(){')
    expect(jsonPos).toBeGreaterThan(-1)
    expect(mainScriptPos).toBeGreaterThan(jsonPos)
  })
  it('JSON 不被 esc 实体转义：`<` 走 \\u003c 方案，JSON.parse 可原样还原（</script> 注入面闭合）', () => {
    const html = buildR12PrintHtml({
      ...SAMPLE,
      charts: {
        ...SAMPLE.charts,
        waffle: { title: 'w', rows: [{ name: 'X</sc', pct: 60, color: '#43593B' }, { name: 'Y', pct: 40, color: '#D4A017' }] },
        topBars: { title: 't', unit: '¥', rows: [{ name: 'A</script><b>', value: 1 }] },
      },
    })
    expect(html).not.toContain('A</script><b>')
    expect(html).toContain('\\u003c')
    const m = html.match(/id="r12bdata">(.*?)<\/script>/)
    expect(m).not.toBeNull()
    const parsed = JSON.parse(m![1])
    expect(parsed[0].name).toBe('A</script><b>')
  })
  it('r12adata 数据形状含 pct 字段（waffleRows 累计封顶 100，与 r05Print 同口径）', () => {
    const html = buildR12PrintHtml(SAMPLE)
    expect(html).toContain('function waffleRows(')
    expect(html).toContain('100-cum')
    const m = html.match(/id="r12adata">(.*?)<\/script>/)
    expect(m).not.toBeNull()
    const parsed = JSON.parse(m![1]) as { name: string; pct: number }[]
    expect(parsed[0].pct).toBe(70)
    expect(parsed[0].value).toBeUndefined()
  })
})

describe('R12 周报速览', () => {
  it('含速览条 + 双图区 + 页脚三栏，无 CDN URL', () => {
    const html = buildR12PrintHtml(SAMPLE)
    expect(html).toContain('grid-template-columns:repeat(2,1fr)')
    expect(html).toContain('CHUNKY BARS')
    expect(html).not.toContain('cdn.jsdelivr')
    expect(html).not.toContain('unpkg.com')
  })
  it('方阵恒 100 点（含补足点）——静态 SVG + JS 数据双断言', () => {
    const html = buildR12PrintHtml(SAMPLE)
    // waffleRows 为 JS 动态渲染：数据 JSON 内嵌且分段函数存在
    expect(html).toContain('id="r12adata"')
    expect(html).toContain('PICTORIAL ROWS')
    // SAMPLE: waffle rows pct 70+30=100 → 恰好 100 点无需补足
    expect(SAMPLE.charts!.waffle!.rows.reduce((s, r) => s + r.pct, 0)).toBe(100)
    // JS 分段算法存在（assigned/补足逻辑）+ 渲染目标存在
    expect(html).toContain('r12a')
    expect(html).toContain('for(;x<100;x++)')
  })
  it('转义与空 charts', () => {
    const bad = buildR12PrintHtml({ ...SAMPLE, charts: { topBars: { title: 't', unit: '¥', rows: [{ name: '"><img', value: 1 }] } } })
    expect(bad).not.toContain('"><img')
  })
  it('累计封顶：pct 溢出 80+80 首段按 80 显示（与 waffleRows 100-cum 同口径）', () => {
    const html = buildR12PrintHtml({
      ...SAMPLE,
      charts: {
        ...SAMPLE.charts,
        waffle: { title: '构成', rows: [{ name: 'A', pct: 80, color: '#43593B' }, { name: 'B', pct: 80, color: '#D4A017' }] },
      },
    })
    expect(html).toContain('A 80%')
    expect(html).toContain('100-cum')
  })
  it('图卡标题取 charts.title，空 title 回退构成速览/排行速览', () => {
    const html = buildR12PrintHtml({
      ...SAMPLE,
      charts: {
        waffle: { title: '用工构成', rows: [{ name: 'X', pct: 100, color: '#43593B' }] },
        topBars: { title: '', unit: '¥', rows: [{ name: 'Y', value: 1 }] },
      },
    })
    expect(html).toContain('用工构成')
    expect(html).toContain('排行速览')
    expect(html).not.toContain('>X<')
    const empty = buildR12PrintHtml({ ...SAMPLE, charts: undefined })
    expect(empty).toContain('构成速览')
  })
})
