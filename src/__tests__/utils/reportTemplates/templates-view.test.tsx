/** 三模板预览组件测试（R01/R05/R12 React 预览收尾项 1/3/5/6/8） */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import R01EvidenceView from '@/components/features/reports/tpl/R01EvidenceView'
import R05WorkView from '@/components/features/reports/tpl/R05WorkView'
import R12WeeklyView from '@/components/features/reports/tpl/R12WeeklyView'
import type { TemplateReportData } from '@/utils/reportTemplates/types'

const META: TemplateReportData['meta'] = {
  product: '工程管家',
  generatedBy: 'AI 生成',
  dataSource: '工资台账',
  date: '2026-09-04',
}

const R01_DATA: TemplateReportData = {
  title: '工资月报（工资专项）',
  period: '2026-09',
  meta: META,
  sections: [
    { name: '一、总额', heading: '本月工资 128 万元', lines: ['共 41 人', '- 出勤 <正常>'] },
    { name: null, heading: '', lines: [] },
  ],
  charts: {
    bigNumbers: [
      { value: '128万', label: '本月工资总额', sub: '41 人' },
      { value: '3.1万', label: '人均', sub: '环比 +2%' },
    ],
  },
}

describe('R01EvidenceView 预览（收尾项 1/2/3/4）', () => {
  it('渲染叙事区：kick/claim/body 三态齐全', () => {
    render(<R01EvidenceView data={R01_DATA} />)
    expect(screen.getByText(/一、总额/)).toBeTruthy() // kick（含序号 span）
    expect(screen.getByText('本月工资 128 万元')).toBeTruthy() // claim
    expect(screen.getByText('共 41 人')).toBeTruthy() // body 普通行
    expect(screen.getByText(/出勤/)).toBeTruthy() // body 列表行（• 前缀）
  })
  it('证据带与打印同源 bigNumbers，且侧栏补 meta.product 链接', () => {
    render(<R01EvidenceView data={R01_DATA} />)
    // 证据带值（bigNumbers 源）——同一值在底部「关键数据」也会出现，故用 getAllByText
    expect(screen.getAllByText('128万').length).toBeGreaterThan(0)
    expect(screen.getByText('工程管家')).toBeTruthy() // 侧栏 product 链接
  })
  it('空数据安全：无 bigNumbers 时证据带与 LEDGER 行不渲染，sections 空不崩', () => {
    const { container } = render(
      <R01EvidenceView data={{ ...R01_DATA, charts: undefined, sections: [] }} />,
    )
    expect(screen.queryByText(/EVIDENCE LEDGER/)).toBeNull()
    // 标题同时出现在 h1 与侧栏 h3，用 getAllByText 断言
    expect(screen.getAllByText('工资月报（工资专项）').length).toBeGreaterThan(0)
    expect(container.querySelectorAll('div').length).toBeGreaterThan(0)
  })
})

describe('R12WeeklyView 预览（收尾项 5/6/7）', () => {
  const R12_BASE: TemplateReportData = {
    title: '本周工地速览',
    period: '第36周',
    meta: META,
    sections: [],
    charts: {
      waffle: { title: '占比', rows: [] },
      bigNumbers: [
        { value: '326万', label: '本周产值', sub: '环比 +4%' },
        { value: '3.1万', label: '人均', sub: '41 人' },
      ],
    },
  }

  it('sumA>100 溢出不截断布局：累计封顶 100 点（60+60 → 60+40）', () => {
    const { container } = render(
      <R12WeeklyView
        data={{
          ...R12_BASE,
          charts: {
            ...R12_BASE.charts!,
            waffle: {
              title: '占比',
              rows: [
                { name: '一线', pct: 60, color: '#43593B' },
                { name: '管理', pct: 60, color: '#D4A017' },
              ],
            },
          },
        }}
      />,
    )
    // 方阵内点 = 60 + 40（第二段封顶）+ 0（余量）
    const grid = container.querySelector('[data-testid="r12-waffle-dots"]')!
    expect(grid.querySelectorAll('span').length).toBe(100)
    expect(screen.getByText('一线 · 60%')).toBeTruthy()
    expect(screen.getByText('管理 · 60%')).toBeTruthy()
  })
  it('图例浮点 pct 取整（Math.round）', () => {
    render(
      <R12WeeklyView
        data={{
          ...R12_BASE,
          charts: {
            ...R12_BASE.charts!,
            waffle: {
              title: '占比',
              rows: [
                { name: 'A', pct: 33.333, color: '#43593B' },
                { name: 'B', pct: 66.667, color: '#D4A017' },
              ],
            },
          },
        }}
      />,
    )
    expect(screen.getByText('A · 33%')).toBeTruthy()
    expect(screen.getByText('B · 67%')).toBeTruthy()
  })
})

describe('R05WorkView 预览（收尾项 8）', () => {
  it('补图区：TICK STRIP 与 HUNDRED FIELD 均渲染（与 r05Print 同数据源）', () => {
    const { container } = render(
      <R05WorkView
        data={{
          title: '本月工作汇报',
          period: '2026-09',
          meta: META,
          sections: [{ name: null, heading: '本月关键事项', lines: ['- 完成结算', '推进资料归档'] }],
          charts: {
            waffle: {
              title: '构成',
              rows: [
                { name: '一线', pct: 70, color: '#43593B' },
                { name: '管理', pct: 30, color: 'red' }, // 非法色 → palette 兜底，不注入
              ],
            },
            topBars: {
              title: '项目 TOP',
              unit: '¥',
              rows: [
                { name: 'A 项目', value: 800000 },
                { name: 'B 项目', value: 480000 },
              ],
            },
            bigNumbers: [{ value: '128万', label: '本月产值', sub: '' }],
          },
        }}
      />,
    )
    expect(screen.getByText(/TICK STRIP/)).toBeTruthy()
    expect(screen.getByText(/HUNDRED FIELD/)).toBeTruthy()
    // tick 100 格 + waffle 100 点（70+30 恰好满额）
    const strip = container.querySelector('[data-testid="r05-tick-strip"]')!
    const dots = container.querySelector('[data-testid="r05-waffle-dots"]')!
    expect(strip.querySelectorAll('span').length).toBe(100)
    expect(dots.querySelectorAll('span').length).toBe(100)
    // 非法色 'red' 不进入预览 DOM
    expect(container.querySelector('[style*="red"]')).toBeNull()
  })
})
