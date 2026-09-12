/**
 * R01 调研一页纸——对外举证正式凭证风格
 * 版式正本：~/.zcode/skills/lieflat-charts/templates/reports/report-01.zh.html（主栏 + 彩色右栏）
 * 打印版双栏：正文文档流 + 每页固定右侧彩栏——position:fixed 在 Chromium 打印下
 * 逐页重复（100vh=每页内容高），规避双栏 grid 跨页碎片化塌架（2026-09-07 两轮迭代定案）
 * 色值转写自 color-presets.js PORCELAIN 正本（参数层事实，代码自写）
 * 2026-09-08 上下 10mm 纸边防跨页文字贴顶，左右仍满版出血（@page margin:10mm 0）
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
--grid:${PORCELAIN.grid};--railbg:${PORCELAIN.railBg};--raildark:${PORCELAIN.railDark};
--serif:${PORCELAIN.serif};--sans:${PORCELAIN.sans}}
*{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{background:var(--bg);color:var(--txt);font-family:var(--sans);-webkit-font-smoothing:antialiased;
font-variant-numeric:tabular-nums lining-nums;display:block}
.sheet{width:auto;max-width:794px;margin:0 auto;background:var(--bg);padding:14mm 58mm 14mm 13mm}
/* 字号体系与预览(R01EvidenceView)完全一致——R04 一致性经验：打印不缩放字号 */
h1{font-family:var(--serif);font-size:50px;font-weight:400;letter-spacing:.01em;line-height:1.2;margin-bottom:8px;break-after:avoid}
h1 b{font-weight:700}
.dek{font-family:var(--serif);font-size:25px;font-weight:400;line-height:1.45;margin:44px 0 6px}
.kick{font-size:12px;font-weight:700;letter-spacing:.16em;color:var(--mut);margin-bottom:14px;break-after:avoid}
.kick .n{color:var(--data)}
.claim{font-size:16px;font-weight:700;margin:34px 0 4px;break-after:avoid}
.body{font-size:14px;line-height:1.8;color:var(--lab);margin-top:8px}
.srcline{font-size:10px;font-weight:600;letter-spacing:.11em;color:var(--faint);margin-top:10px}
.fig{margin-top:14px;break-inside:avoid}.fig svg{width:100%;height:auto;display:block}
.traits{display:grid;grid-template-columns:repeat(3,1fr);gap:26px;margin-top:44px;border-top:1px solid var(--txt);padding-top:24px;break-inside:avoid}
.traits .t .big{font-size:30px;font-weight:800;letter-spacing:-.03em;color:var(--data)}
.traits .t .nm{font-size:12px;font-weight:700;margin-top:8px}
.traits .t .ds{font-size:12px;line-height:1.7;color:var(--mut);margin-top:5px}
/* 固定右栏：Chromium 打印对 position:fixed 逐页重复，实现正本的每页彩栏 */
.rail{position:fixed;top:0;right:0;width:52mm;height:100vh;background:var(--railbg);color:var(--bg);display:flex;flex-direction:column}
.rail .top{padding:36px 19px 30px;flex:1}
.rail .bot{background:var(--raildark);padding:24px 19px 30px;margin-top:auto}
.rail h3{font-size:19px;font-weight:700;line-height:1.5;margin-bottom:18px}
.rail p{font-size:12px;line-height:1.9;opacity:.88}.rail p+p{margin-top:12px}
.rail .lbl{font-size:12px;font-weight:700;letter-spacing:.16em;opacity:.6;margin-bottom:12px}
.rail .link{font-size:12px;font-weight:700;margin-top:20px;text-decoration:underline;text-underline-offset:3px}
/* 上下 10mm 纸边防跨页文字贴顶，左右仍满版出血（页内左右留白由 .sheet padding 承担） */
@media print{@page{size:A4;margin:10mm 0}}
</style></head><body>
<div class="sheet">
<h1>${t}</h1>
<div class="dek">${period}</div>
${chartSvg}
${bodyHtml}
</div>
<div class="rail">
<div class="top"><div class="lbl">关于这份报告</div><h3>${t}</h3><p>数据来源：${source}。</p><p>统计期间：${period}。取数日期：${date}。</p></div>
<div class="bot"><div class="lbl">口径说明</div><p>本报告数据全部来自工程管家本地台账，可溯源至原始操作记录。</p><div class="link">${esc(data.meta.product)}</div></div>
</div>
</body></html>`
}

/** R01 举证 SVG：横贯主栏的细线数据带（viewBox 460 对齐减窄后的主栏宽，字号按此档标定） */
function buildEvidenceSvg(data: TemplateReportData): string {
  const bigNums = data.charts?.bigNumbers
  if (!bigNums?.length) return ''
  const w = 460
  const barH = 56
  const rows = bigNums.slice(0, 5)
  const h = rows.length * barH + 40
  let svg = `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" style="max-width:100%">`
  rows.forEach((bn, i) => {
    const y = 24 + i * barH
    const label = xml(bn.label)
    const value = xml(bn.value)
    svg += `<text x="8" y="${y + 8}" font-size="10" font-weight="700" fill="${PORCELAIN.mut}" letter-spacing=".06em">${label}</text>`
    svg += `<line x1="8" y1="${y + 18}" x2="${w - 8}" y2="${y + 18}" stroke="${PORCELAIN.grid}" stroke-width=".8"/>`
    // 徽章宽随值自适应：按字符估宽（CJK 全角≈11 / 其余≈6.2，font-size 11 基准）+ 左右余量 16，
    // 基于转义前原始值——长数值（如 "999999.00 元"）不再溢出徽章被 viewBox 右缘硬裁
    const numW = Math.max(54, Math.round([...bn.value].reduce((s, ch) => s + (/[\u2E80-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF]/.test(ch) ? 11 : 6.2), 0) + 16))
    svg += `<rect x="${w - 8 - numW}" y="${y - 4}" width="${numW}" height="18" rx="4" fill="${PORCELAIN.data}" opacity="${i === 0 ? 1 : 0.15 + i * 0.2}"/>`
    svg += `<text x="${w - 8 - numW / 2}" y="${y + 9}" font-size="11" font-weight="800" fill="${PORCELAIN.bg}" text-anchor="middle">${value}</text>`
  })
  svg += `<text x="${w / 2}" y="${h - 4}" font-size="11" font-weight="600" fill="${PORCELAIN.faint}" text-anchor="middle" letter-spacing=".1em">一格 = 一条记录 · 来源可溯源</text>`
  svg += '</svg>'
  return `<div class="fig">${svg}</div><div class="srcline">EVIDENCE LEDGER · 数据可溯源至操作记录</div>`
}
