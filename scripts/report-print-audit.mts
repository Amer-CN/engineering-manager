/**
 * 报告模板打印 HTML 全量体检（审计脚本，不入库）
 * 从 .work/audit 提升而来，见 docs/REPORT-PRINT-CONTRACT.md §10
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { buildR01PrintHtml } from '../src/utils/reportTemplates/r01Print'
import { buildR05PrintHtml } from '../src/utils/reportTemplates/r05Print'
import { buildR12PrintHtml } from '../src/utils/reportTemplates/r12Print'
import { buildChartReportPrintHtml } from '../src/utils/reportPrintHtml'
import { parseChartReport } from '../src/utils/chartReport'

const full: any = {
  title: '工程管家周报（图形版）',
  period: '2026-09-01 ~ 2026-09-07',
  meta: { product: '工程管家', generatedBy: 'AI 生成', dataSource: '本地数据台账', date: '2026-09-08' },
  sections: [
    { name: '合同情况', heading: '新签为零，结构待改善', lines: ['新签收入合同：0 份，金额 0.00 元。', '- 要点甲：操作日志口径', '- 要点乙：业务指标口径'] },
    { name: '收支情况', heading: '', lines: ['发票：2 张，金额 2.18 元。', '结算：0 笔，金额 0.00 元。'] },
  ],
  charts: {
    waffle: { title: '占比速览', rows: [ { name: 'writing_documents', pct: 56, color: '#334EAC' }, { name: 'auth', pct: 40, color: '#7096D1' }, { name: '其他', pct: 4, color: '#BAD6EB' } ] },
    topBars: { title: '排行速览', unit: '¥', rows: [ { name: '系统管理员', value: 175 }, { name: 'admin', value: 129 }, { name: 'guest', value: 6 } ] },
    trend: { title: '走势', unit: '¥', points: [ { x: '9/1', y: 10 }, { x: '9/2', y: 12 } ] },
    bigNumbers: [ { value: '305', label: '本周总操作数', sub: '来源：操作日志模块' }, { value: '2.18 元', label: '发票金额合计', sub: '含税合计' } ],
  },
}
const empty: any = {
  title: '空数据报告', period: '',
  meta: { product: '工程管家', generatedBy: 'AI 生成', dataSource: '本地数据台账', date: '2026-09-08' },
  sections: [], charts: undefined,
}
const evil: any = {
  title: '<script>alert(1)</script>**加粗**标题',
  period: '2026-09-01 ~ 2026-09-07',
  meta: { product: '工程管家</div>', generatedBy: 'AI', dataSource: '**台账**', date: '2026-09-08' },
  sections: [
    { name: '**节名**<img src=x onerror=alert(2)>', heading: '</div>收尾**粗**', lines: ['**粗体**泄漏<script>alert(3)</script>', 'x'.repeat(5000)] },
  ],
  charts: {
    waffle: { title: '**图**', rows: [ { name: '**<b>注入</b>**', pct: 120, color: 'red' }, { name: '负值', pct: -30, color: 'blue' } ] },
    topBars: { title: '排行', unit: '¥', rows: [ { name: '<i>x</i>', value: 0 } ] },
    bigNumbers: [ { value: '**1 元**', label: '<u>标签</u>', sub: '**子**' } ],
  },
}

const outDir = ".work/audit"
mkdirSync(outDir, { recursive: true })

function check(tpl: string, scenario: string, html: string, expectSvg: number, expectPage: string): string[] {
  const issues: string[] = []
  if (/<script/i.test(html)) issues.push('含 <script>（应为纯静态）')
  if (html.includes('${')) issues.push('存在未插值的 ${')
  if (/\bundefined\b/.test(html)) issues.push('泄漏 undefined（常量缺失类 bug）')
  if (html.includes('NaN')) issues.push('泄漏 NaN')
  const open = (html.match(/<div\b/g) || []).length
  const close = (html.match(/<\/div>/g) || []).length
  if (open !== close) issues.push(`div 标签不配对 ${open}/${close}`)
  const svgs = (html.match(/<svg\b/g) || []).length
  if (svgs < expectSvg) issues.push(`svg 数量 ${svgs} < 期望 ${expectSvg}`)
  if (!html.includes(expectPage)) issues.push(`@page 不符（期望含 ${expectPage}）`)
  for (const i of issues) console.log(`  [${tpl}/${scenario}] ✗ ${i}`)
  if (issues.length === 0) console.log(`  [${tpl}/${scenario}] ✓`)
  writeFileSync(`${outDir}/${tpl}-${scenario}.html`, html)
  return issues
}

let total = 0
for (const [scenario, data] of [['full', full], ['empty', empty], ['evil', evil]] as const) {
  console.log(`--- 场景: ${scenario} ---`)
  total += check('r01', scenario, buildR01PrintHtml(data), data.charts?.bigNumbers?.length ? 1 : 0, 'margin:10mm 0').length
  total += check('r05', scenario, buildR05PrintHtml(data), 0, 'margin:10mm 0').length
  total += check('r12', scenario, buildR12PrintHtml(data), 2, 'margin:10mm 0').length
  const waffleMd = data.charts ? '```chart-waffle\n' + JSON.stringify({ title: data.charts.waffle.title, rows: data.charts.waffle.rows.map((r: any) => ({ name: r.name, value: r.pct })) }) + '\n```' : ''
  const barsMd = data.charts ? '```chart-bars\n' + JSON.stringify({ title: data.charts.topBars.title, rows: data.charts.topBars.rows }) + '\n```' : ''
  const md = [
    `# ${data.title}`,
    `> 期间：${data.period}`,
    `## 值得记住的数字`,
    ...(data.charts?.bigNumbers ?? []).map((b: any) => `- ${b.value}｜${b.label}｜${b.sub}`),
    ...data.sections.map((s: any, i: number) => `## ${s.name ?? s.heading}\n${s.lines.join('\n')}\n${i === 0 ? waffleMd : barsMd}`),
  ].filter(Boolean).join('\n')
  const r04data = parseChartReport(md)
  const r04opts = { productName: '工程管家', dataNote: '审计', source: '本地数据台账', takenAt: '2026-09-08', footerLeft: '审计' }
  total += check('r04', scenario, buildChartReportPrintHtml(r04data, r04opts), scenario === 'full' ? 2 : 0, 'margin:14mm 12mm').length
}
console.log(total === 0 ? '\n=== 结构检查全部通过 ===' : `\n=== ${total} 项问题 ===`)
