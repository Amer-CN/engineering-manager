/**
 * R01 调研一页纸——对外举证正式凭证风格
 * 版式正本：vendor/lieflat-charts/templates/reports/report-01.zh.html
 * 打印版单栏 A4 文档流；衬线大标题 + Porcelain 色系；纯 SVG 零脚本
 * （原主栏 1fr + 彩色侧栏 300px 双栏栅格跨打印分页塌架，2026-09-07 改打印安全版式）
 * 色值转写自 color-presets.js PORCELAIN 正本（参数层事实，代码自写）
 */
import type { TemplateReportData } from './types'
import { PORCELAIN, tplEscapeHtml as esc, tplEscapeXml as xml } from './types'

/** 生成 R01 版式打印 HTML */
export function buildR01PrintHtml(data: TemplateReportData): string {
  const t = esc(data.title)
  const period = esc(data.period)
  const source = esc(data.meta.dataSource)
  const date = esc(data.meta.date)
  const fonts = `<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;0,8..60,700&family=Noto+Serif+SC:wght@400;600;700&family=Noto+Sans+SC:wght@400;500;700&display=swap" rel="stylesheet">`

  const allBigNums = data.charts?.bigNumbers ?? []
  const sectionsHtml = data.sections
    .map((s, i) => {
      const kick = s.name
        ? `<div class="kick" style="margin-top:${i === 0 ? 30 : 44}px"><span class="n">${esc(String(i + 1).padStart(2, '0'))}</span> · ${esc(s.name)}</div>`
        : ''
      const heading = s.heading ? `<div class="claim">${esc(s.heading)}</div>` : ''
      const lines = s.lines
        .filter((l) => l.trim())
        .map((l) => {
          if (/^[-*]\s/.test(l.trim())) {
            return `<div class="body">• ${esc(l.trim().replace(/^[-*]\s/, ''))}</div>`
          }
          return `<div class="body">${esc(l)}</div>`
        })
        .join('')
      return `${kick}${heading}<div class="body">${lines}</div>`
    })
    .join('')
  const traitsHtml = allBigNums.length > 0
    ? `<div class="kick" style="margin-top:52px">关键数据</div><div class="traits">${allBigNums.map(
        (b) => `<div class="t"><div class="big">${esc(b.value)}</div><div class="nm">${esc(b.label)}</div><div class="ds">${esc(b.sub)}</div></div>`,
      ).join('')}</div>`
    : ''
  const bodyHtml = sectionsHtml + traitsHtml

  const chartSvg = buildEvidenceSvg(data)

  return `<!DOCTYPE html>
<html lang="zh-Hans"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${t}</title>${fonts}
<style>
:root{--bg:${PORCELAIN.bg};--txt:${PORCELAIN.txt};--mut:${PORCELAIN.mut};--lab:${PORCELAIN.lab};
--faint:${PORCELAIN.faint};--data:${PORCELAIN.data};--hero:${PORCELAIN.hero};--faintdata:${PORCELAIN.faintData};
--grid:${PORCELAIN.grid};--raildark:${PORCELAIN.railDark};
--serif:${PORCELAIN.serif};--sans:${PORCELAIN.sans}}
*{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{background:var(--bg);color:var(--txt);font-family:var(--sans);-webkit-font-smoothing:antialiased;
font-variant-numeric:tabular-nums lining-nums;display:block}
.sheet{width:auto;max-width:794px;margin:0 auto;background:var(--bg)}
h1{font-family:var(--serif);font-size:32px;font-weight:400;letter-spacing:.01em;line-height:1.2;margin-bottom:8px;break-after:avoid}
h1 b{font-weight:700}
.meta{border-top:1px solid var(--grid);margin-top:14px;padding-top:10px;font-size:9px;font-weight:600;letter-spacing:.11em;line-height:2;color:var(--mut);break-inside:avoid}
.dek{font-family:var(--serif);font-size:17px;font-weight:400;line-height:1.45;margin:44px 0 6px;max-width:520px}
.kick{font-size:8px;font-weight:700;letter-spacing:.16em;color:var(--mut);margin-bottom:14px;break-after:avoid}
.kick .n{color:var(--data)}
.claim{font-size:11.5px;font-weight:700;margin:34px 0 4px;break-after:avoid}
.body{font-size:10.5px;line-height:1.8;color:var(--lab);max-width:520px;margin-top:8px}
.srcline{font-size:8px;font-weight:600;letter-spacing:.11em;color:var(--faint);margin-top:10px}
.fig{margin-top:14px;break-inside:avoid}.fig svg{width:100%;height:auto;display:block}
.traits{display:grid;grid-template-columns:repeat(3,1fr);gap:26px;margin-top:44px;border-top:1px solid var(--txt);padding-top:24px;break-inside:avoid}
.traits .t .big{font-size:22px;font-weight:800;letter-spacing:-.03em;color:var(--data)}
.traits .t .nm{font-size:10px;font-weight:700;margin-top:8px}
.traits .t .ds{font-size:9.5px;line-height:1.7;color:var(--mut);margin-top:5px}
.colophon{background:var(--raildark);color:var(--bg);border-radius:6px;padding:18px 22px;margin-top:44px;break-inside:avoid}
.colophon p{font-size:10.5px;line-height:1.9;opacity:.88}
.colophon .lbl{font-size:8.5px;font-weight:700;letter-spacing:.16em;opacity:.6;margin-bottom:12px}
.colophon .link{font-size:10.5px;font-weight:700;margin-top:20px;text-decoration:underline;text-underline-offset:3px}
@media print{@page{size:A4;margin:14mm 13mm}}
</style></head><body>
<div class="sheet">
<h1>${t}</h1>
<div class="meta">数据来源：${source}<br>统计期间：${period}<br>取数日期：${date}</div>
<div class="dek">${period}</div>
${chartSvg}
${bodyHtml}
<div class="colophon"><div class="lbl">口径说明</div><p>本报告数据全部来自工程管家本地台账，可溯源至原始操作记录。</p><div class="link">${esc(data.meta.product)}</div></div>
</div>
</body></html>`
}

/** R01 举证 SVG：横贯全宽的细线数据带（从正本 ballot tally 转写布局参数） */
function buildEvidenceSvg(data: TemplateReportData): string {
  const bigNums = data.charts?.bigNumbers
  if (!bigNums?.length) return ''
  const w = 780
  const barH = 56
  const rows = bigNums.slice(0, 5)
  const h = rows.length * barH + 40
  let svg = `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" style="max-width:100%">`
  rows.forEach((bn, i) => {
    const y = 24 + i * barH
    const label = xml(bn.label)
    const value = xml(bn.value)
    svg += `<text x="8" y="${y + 8}" font-size="8.5" font-weight="700" fill="${PORCELAIN.mut}" letter-spacing=".06em">${label}</text>`
    svg += `<line x1="8" y1="${y + 18}" x2="${w - 8}" y2="${y + 18}" stroke="${PORCELAIN.grid}" stroke-width=".8"/>`
    const numW = 60
    svg += `<rect x="${w - 8 - numW}" y="${y - 4}" width="${numW}" height="18" rx="4" fill="${PORCELAIN.data}" opacity="${i === 0 ? 1 : 0.15 + i * 0.2}"/>`
    svg += `<text x="${w - 8 - numW / 2}" y="${y + 9}" font-size="10" font-weight="800" fill="${PORCELAIN.bg}" text-anchor="middle">${value}</text>`
  })
  svg += `<text x="${w / 2}" y="${h - 4}" font-size="7.5" font-weight="600" fill="${PORCELAIN.faint}" text-anchor="middle" letter-spacing=".1em">一格 = 一条记录 · 来源可溯源</text>`
  svg += '</svg>'
  return `<div class="fig">${svg}</div><div class="srcline">EVIDENCE LEDGER · 数据可溯源至操作记录</div>`
}
