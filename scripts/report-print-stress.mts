/**
 * 压力场景体检（审计脚本，不入库）：长类目名 / 6 行条形 / 超大数值 / chart-trend 打印首验
 * 从 .work/audit 提升而来，见 docs/REPORT-PRINT-CONTRACT.md §10
 */
import { writeFileSync } from 'node:fs'
import { buildR01PrintHtml } from '../src/utils/reportTemplates/r01Print'
import { buildR05PrintHtml } from '../src/utils/reportTemplates/r05Print'
import { buildR12PrintHtml } from '../src/utils/reportTemplates/r12Print'
import { buildChartReportPrintHtml } from '../src/utils/reportPrintHtml'
import { parseChartReport } from '../src/utils/chartReport'

const stress: any = {
  title: '压力测试报告（长名/多行/大值）',
  period: '2026-09-01 ~ 2026-09-07',
  meta: { product: '工程管家', generatedBy: 'AI 生成', dataSource: '本地数据台账', date: '2026-09-08' },
  sections: [
    { name: '收支情况', heading: '极端数据形态下的版式稳定性', lines: ['发票：12345 张，金额 1234567.89 元。', '结算：999 笔，金额 999999.00 元。'] },
  ],
  charts: {
    waffle: { title: '占比速览', rows: [
      { name: 'writing_documents_archive_2024', pct: 40, color: '#334EAC' },
      { name: '非常长的中文类目名称一共十二个别超', pct: 25, color: '#7096D1' },
      { name: 'auth', pct: 15, color: '#BAD6EB' },
      { name: '结算管理', pct: 12, color: '#334EAC' },
      { name: '其他', pct: 8, color: '#7096D1' },
    ] },
    topBars: { title: '排行速览', unit: '¥', rows: [
      { name: '非常长的中文类目名称一共十二别超', value: 12345679 },
      { name: 'writing_documents_archive', value: 987654 },
      { name: '系统管理员', value: 175129 },
      { name: 'admin', value: 129 },
      { name: 'guest', value: 6 },
      { name: '十二字测试类目名称测完了', value: 1 },
    ] },
    trend: { title: '走势', unit: '¥', points: Array.from({ length: 30 }, (_, i) => ({ x: `${(i % 30) + 1}/9`, y: Math.round(Math.sin(i / 3) * 500 + 1000) })) },
    bigNumbers: [ { value: '12345679', label: '最大单笔金额', sub: '来源：结算模块' }, { value: '999999.00 元', label: '期间合计', sub: '含税' } ],
  },
}

const outDir = ".work/audit"
function check(tpl: string, html: string): string[] {
  const issues: string[] = []
  if (/<script/i.test(html)) issues.push('含 <script>')
  if (html.includes('${')) issues.push('未插值 ${')
  if (/\bundefined\b/.test(html)) issues.push('泄漏 undefined')
  if (html.includes('NaN')) issues.push('泄漏 NaN')
  const open = (html.match(/<div\b/g) || []).length
  const close = (html.match(/<\/div>/g) || []).length
  if (open !== close) issues.push(`div 不配对 ${open}/${close}`)
  for (const i of issues) console.log(`  [${tpl}/stress] ✗ ${i}`)
  if (issues.length === 0) console.log(`  [${tpl}/stress] ✓`)
  writeFileSync(`${outDir}/${tpl}-stress.html`, html)
  return issues
}

let total = 0
total += check('r01', buildR01PrintHtml(stress)).length
total += check('r05', buildR05PrintHtml(stress)).length
total += check('r12', buildR12PrintHtml(stress)).length

const md = [
  `# ${stress.title}`,
  `> 期间：${stress.period}`,
  `## 值得记住的数字`,
  ...stress.charts.bigNumbers.map((b: any) => `- ${b.value}｜${b.label}｜${b.sub}`),
  // r04 数据模型"每节一个图槽"：每种图必须独占一节，否则后者覆盖前者
  `## 占比情况\n发票：12345 张。\n`,
  '```chart-waffle\n' + JSON.stringify({ title: '占比速览', rows: stress.charts.waffle.rows.map((r: any) => ({ name: r.name, value: r.pct })) }) + '\n```',
  `## 排行情况\n结算：999 笔。\n`,
  '```chart-bars\n' + JSON.stringify({ title: '排行速览', unit: '¥', rows: stress.charts.topBars.rows }) + '\n```',
  `## 走势情况\n近 30 日走势如下。\n`,
  '```chart-trend\n' + JSON.stringify({ title: '走势', unit: '¥', points: stress.charts.trend.points }) + '\n```',
].join('\n')
const r04data = parseChartReport(md)
console.log('  [r04] 各节挂载的图:', (r04data.sections ?? []).map((s: any) => s.chart?.kind ?? '-'))
const r04opts = { productName: '工程管家', dataNote: '审计', source: '本地数据台账', takenAt: '2026-09-08', footerLeft: '审计' }
total += check('r04', buildChartReportPrintHtml(r04data, r04opts)).length
console.log(total === 0 ? '\n=== 压力场景结构检查通过 ===' : `\n=== ${total} 项问题 ===`)
