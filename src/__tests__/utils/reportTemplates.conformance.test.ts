/**
 * 报告模板打印 HTML 一致性守卫（四模板 × 数据场景矩阵）。
 * 背景：2026-09-08 前后多轮打印回归（图卡竞态丢失/白框/星号泄漏/undefined 常量缺失）
 * 后建立的常驻体检——新增模板或版式改动时跑本套即可兜住结构性回归。
 * 覆盖：零脚本、无未插值模板串、无常量泄漏（undefined/NaN）、div 配平、
 * SVG 数量、@page 规范、注入转义、用途+主题→模板映射。
 */
import { describe, it, expect } from 'vitest'
import { buildR01PrintHtml } from '../../utils/reportTemplates/r01Print'
import { buildR05PrintHtml } from '../../utils/reportTemplates/r05Print'
import { buildR12PrintHtml } from '../../utils/reportTemplates/r12Print'
import { buildChartReportPrintHtml } from '../../utils/reportPrintHtml'
import { parseChartReport } from '../../utils/chartReport'
import { getTemplateId } from '../../utils/reportTemplates/types'
import type { TemplateReportData } from '../../utils/reportTemplates/types'

const fullData: TemplateReportData = {
  title: '工程管家周报（图形版）',
  period: '2026-09-01 ~ 2026-09-07',
  meta: { product: '工程管家', generatedBy: 'AI 生成', dataSource: '本地数据台账', date: '2026-09-08' },
  sections: [
    { name: '合同情况', heading: '新签为零', lines: ['新签收入合同：0 份。', '- 要点甲'] },
    { name: '收支情况', heading: '', lines: ['发票：2 张。'] },
  ],
  charts: {
    waffle: { title: '占比速览', rows: [
      { name: 'writing_documents', pct: 56, color: '#334EAC' },
      { name: 'auth', pct: 40, color: '#7096D1' },
    ] },
    topBars: { title: '排行速览', unit: '¥', rows: [
      { name: '系统管理员', value: 175 },
      { name: 'admin', value: 129 },
    ] },
    trend: { title: '走势', unit: '¥', points: [ { x: '9/1', y: 10 }, { x: '9/2', y: 12 } ] },
    bigNumbers: [ { value: '305', label: '本周总操作数', sub: '来源：操作日志模块' } ],
  },
}
const emptyData: TemplateReportData = {
  title: '空数据报告', period: '',
  meta: { product: '工程管家', generatedBy: 'AI 生成', dataSource: '本地数据台账', date: '2026-09-08' },
  sections: [], charts: undefined,
}

/** 结构不变量：纯静态、无未插值串、无常量泄漏、div 配平、svg 数量、@page 规范 */
function expectSoundPrint(html: string, opts: { svg: number; page: string }) {
  expect(html).not.toMatch(/<script/i)
  expect(html).not.toContain('${')
  expect(html).not.toMatch(/\bundefined\b/)
  expect(html).not.toContain('NaN')
  expect((html.match(/<div\b/g) || []).length).toBe((html.match(/<\/div>/g) || []).length)
  expect((html.match(/<svg\b/g) || []).length).toBeGreaterThanOrEqual(opts.svg)
  expect(html).toContain(opts.page)
}

describe('报告模板打印 HTML 一致性守卫', () => {
  it('r01/r05/r12：完整数据（满版出血 + 上下 10mm 纸边）', () => {
    expectSoundPrint(buildR01PrintHtml(fullData), { svg: 1, page: 'margin:10mm 0' })
    expectSoundPrint(buildR05PrintHtml(fullData), { svg: 0, page: 'margin:10mm 0' })
    expectSoundPrint(buildR12PrintHtml(fullData), { svg: 2, page: 'margin:10mm 0' })
  })

  it('r01/r05/r12：空数据无 undefined/NaN/标签失衡', () => {
    expectSoundPrint(buildR01PrintHtml(emptyData), { svg: 0, page: 'margin:10mm 0' })
    expectSoundPrint(buildR05PrintHtml(emptyData), { svg: 0, page: 'margin:10mm 0' })
    expectSoundPrint(buildR12PrintHtml(emptyData), { svg: 2, page: 'margin:10mm 0' })
  })

  it('r04 图表版：双图渲染 + 注入转义 + 加粗标记剥离', () => {
    const evilMd = [
      '# <script>alert(1)</script>**加粗**标题',
      '## 值得记住的数字',
      '- **1 元**｜<u>标签</u>',
      '## **节名**',
      '正文**粗体**<script>alert(3)</script>',
      '```chart-waffle\n{"title":"占比","rows":[{"name":"**注入**","value":60}]}\n```',
    ].join('\n')
    const html = buildChartReportPrintHtml(parseChartReport(evilMd), {
      productName: '工程管家', dataNote: 't', source: 's', takenAt: '2026-09-08', footerLeft: 'f',
    })
    expectSoundPrint(html, { svg: 1, page: 'margin:14mm 12mm' })
    expect(html).not.toContain('**')
    expect(html).not.toContain('<script>alert')
    expect(html).toContain('&lt;script&gt;')
  })

  it('空数据 r04：纯文本节降级，零 svg 零脚本', () => {
    const html = buildChartReportPrintHtml(parseChartReport('# 空数据'), {
      productName: '工程管家', dataNote: 't', source: 's', takenAt: '2026-09-08', footerLeft: 'f',
    })
    expectSoundPrint(html, { svg: 0, page: 'margin:14mm 12mm' })
  })

  it('用途+主题 → 模板映射契约', () => {
    expect(getTemplateId('review')).toBe('r04')
    expect(getTemplateId('review', 'general')).toBe('r04')
    expect(getTemplateId('review', 'wage')).toBe('r12')
    expect(getTemplateId('evidence')).toBe('r01')
    expect(getTemplateId('work')).toBe('r05')
    expect(getTemplateId('weekly')).toBe('r12')
    expect(getTemplateId('unknown')).toBe('r04')
  })
})
