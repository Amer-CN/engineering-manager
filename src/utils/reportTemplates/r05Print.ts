/**
 * R05 影响力故事——工作汇报叙事风格
 * 版式正本：vendor/lieflat-charts/templates/reports/report-05.zh.html
 * 打印版心 max-width:794px 单栏文档流 + Mono 墨阶 + 标题关键词反色高亮 + 叙事故事线
 * （原 760px 窄版心，2026-09-07 改打印安全版式）
 */
import type { TemplateReportData } from './types'
import { MONO, tplEscapeHtml as esc, tplEscapeXml as xml } from './types'

/** 生成 R05 版式打印 HTML */
export function buildR05PrintHtml(data: TemplateReportData): string {
  const t = esc(data.title)
  const period = esc(data.period)
  const source = esc(data.meta.dataSource)
  const date = esc(data.meta.date)
  const fonts = `<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+SC:wght@400;500;700;900&display=swap" rel="stylesheet">`

  // 导语：首节第一行取 2 行
  const intro = data.sections[0]?.lines.filter((l) => l.trim()).slice(0, 2).join(' ') ?? ''

  // 大数 + 条带：charts.bigNumbers
  const bigNums = data.charts?.bigNumbers ?? []
  const bignum = bigNums.length > 0
    ? `<div class="bignum"><div class="v">${esc(bigNums[0].value)}</div><div class="l">${esc(bigNums[0].label)}${bigNums[0].sub ? ` · ${esc(bigNums[0].sub)}` : ''}</div></div>`
    : ''
  const strip = buildTickStripSvg(data)

  // 故事线：剩余节 → storyline 高亮句 + 旁注
  const stories = data.sections
    .slice(1)
    .map((s) => {
      const hl = s.heading ? `<div class="storyline">本节聚焦<span class="hl">${esc(s.heading)}</span></div>` : ''
      const note = s.lines
        .filter((l) => l.trim())
        .slice(0, 2)
        .map((l) => `<p class="sidenote">${esc(l.replace(/^[-*]\s/, ''))}</p>`)
        .join('')
      return `${hl}${note}`
    })
    .join('')

  const chartSvg = buildStoryChartSvg(data)

  return `<!DOCTYPE html>
<html lang="zh-Hans"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${t}</title>${fonts}
<style>
:root{--bg:${MONO.bg};--ink:${MONO.ink};--muted:${MONO.mut};--faint:${MONO.faint};--grid:${MONO.grid}}
*{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{background:var(--bg);color:var(--ink);font-family:'Inter','Noto Sans SC',sans-serif;-webkit-font-smoothing:antialiased;font-variant-numeric:tabular-nums lining-nums;display:block}
.sheet{width:auto;max-width:794px;margin:0 auto}
h1{font-size:28px;font-weight:900;letter-spacing:.01em;line-height:1.3;max-width:560px;break-after:avoid}
h1 .hl{background:var(--ink);color:var(--bg);padding:0 12px;box-decoration-break:clone;-webkit-box-decoration-break:clone}
.lede{font-size:11px;line-height:1.95;color:#4A4944;max-width:520px;margin-top:26px}
.lede b{font-weight:700;color:var(--ink)}
.bignum{display:flex;align-items:baseline;gap:14px;margin-top:52px;break-inside:avoid}
.bignum .v{font-size:38px;font-weight:800;letter-spacing:-.04em;line-height:1}
.bignum .l{font-size:10.5px;color:var(--muted);font-weight:500}
.fig{margin-top:10px;break-inside:avoid}.fig svg{width:100%;height:auto;display:block}
.srcline{font-size:8px;font-weight:600;letter-spacing:.1em;color:var(--faint);margin-top:8px}
.storyline{font-size:16px;font-weight:700;letter-spacing:.01em;line-height:1.6;margin-top:68px;max-width:600px;break-after:avoid}
.storyline .hl{background:var(--ink);color:var(--bg);padding:1px 12px 2px;box-decoration-break:clone;-webkit-box-decoration-break:clone}
.sidenote{font-size:10px;line-height:1.85;color:var(--muted);max-width:260px;margin-top:20px}
.close{font-size:11px;line-height:1.95;color:#4A4944;max-width:560px;margin-top:56px}
.close b{color:var(--ink)}
.cta{margin-top:22px;font-size:11.5px;font-weight:700}
.cta .hl{background:var(--ink);color:var(--bg);padding:3px 14px 4px}
.foot{margin-top:64px;padding-top:14px;border-top:1px solid var(--grid);display:flex;justify-content:space-between;font-size:8px;font-weight:600;letter-spacing:.12em;color:var(--faint);break-inside:avoid}
@media print{@page{size:A4;margin:14mm 13mm}}
</style></head><body>
<div class="sheet">
<h1>${t}</h1>
<p class="lede">${esc(intro || period)}</p>
${bignum}
${strip}
${chartSvg}
${stories}
<div class="close">数据来源：<b>${source}</b>，取数日期 <b>${date}</b>。</div>
<div class="foot"><span>${t} · ${period}</span><span>来源 · ${source}</span></div>
</div>
</body></html>`
}

/** R05 tick 条带：100 格队列分段（从正本 strip 转写） */
function buildTickStripSvg(data: TemplateReportData): string {
  const bars = data.charts?.topBars?.rows
  if (!bars?.length) return ''
  const total = bars.reduce((s, r) => s + r.value, 0)
  if (total <= 0) return ''
  const w = 720
  const y = 30
  // 三段：TOP1 深墨 / 次级中灰 / 其余淡灰
  const shares = bars.slice(0, 3).map((r) => Math.round((r.value / total) * 100))
  while (shares.length < 3) shares.push(0)
  const shades = [MONO.ink, '#8F8E88', '#C6C5BF']
  let svg = `<svg viewBox="0 0 ${w} 70" xmlns="http://www.w3.org/2000/svg" style="max-width:100%">`
  let x0 = 8
  const tickW = (w - 16) / 100
  shares.forEach((v, si) => {
    for (let k = 0; k < v; k++) {
      const x = x0 + k * tickW
      svg += `<line x1="${x.toFixed(1)}" y1="${y}" x2="${x.toFixed(1)}" y2="${y - 8}" stroke="${shades[si]}" stroke-width="0.9" opacity="0.85"/>`
    }
    x0 += v * tickW
  })
  svg += `<text x="${w / 2}" y="64" font-size="7" font-weight="600" fill="#B0AFA9" text-anchor="middle" letter-spacing=".1em">每格 = 1% · ${shares.map((v, i) => `${xml(bars[i]?.name ?? '')} ${v}%`).join(' + ')}</text>`
  svg += '</svg>'
  return `<div class="fig">${svg}</div><div class="srcline">TICK STRIP · 一格 = 1% · 深墨 = 最大占比</div>`
}

/** R05 故事图：Waffle 方阵（从既有 buildWaffleSvg 口径转写：round + 累计封顶 100 + 余量补 faint） */
function buildStoryChartSvg(data: TemplateReportData): string {
  const waffle = data.charts?.waffle
  if (!waffle?.rows.length) return ''
  const COLS = 10
  const CELL = 34
  const R = 11
  const w = COLS * CELL + 16
  const rows = Math.ceil(100 / COLS)
  const h = rows * CELL + 16
  const palette = [MONO.ink, '#4A4944', '#8F8E88', '#B0AFA9', '#C6C5BF', '#D8D7D1']
  // 颜色白名单校验（深审 P2 安全）：仅允许 hex，非法用 palette 兜底
  const validColor = (c: string | undefined, fallback: string) => (/^#[0-9a-fA-F]{3,8}$/.test(c ?? '') ? c! : fallback)
  // 点位分配：round + 累计封顶 100（与既有 buildWaffleSvg 同口径），余量补 faint 段
  const assigned: number[] = []
  let cum = 0
  for (const r of waffle.rows) {
    const n = Math.max(0, Math.min(Math.round(r.pct), 100 - cum))
    assigned.push(n)
    cum += n
  }
  const remainder = 100 - cum
  let svg = `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" style="max-width:320px">`
  let idx = 0
  waffle.rows.forEach((r, si) => {
    const color = validColor(r.color, palette[si % palette.length])
    for (let k = 0; k < assigned[si]; k++) {
      const pos = idx + k
      const cx = 8 + (pos % COLS) * CELL + CELL / 2
      const cy = 8 + Math.floor(pos / COLS) * CELL + CELL / 2
      svg += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${color}"/>`
    }
    idx += assigned[si]
  })
  for (let k = 0; k < remainder; k++) {
    const pos = idx + k
    const cx = 8 + (pos % COLS) * CELL + CELL / 2
    const cy = 8 + Math.floor(pos / COLS) * CELL + CELL / 2
    svg += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${MONO.faint}"/>`
  }
  svg += '</svg>'
  const legend = waffle.rows
    .map((s, si) => `<div style="font-size:10px;font-weight:600;color:#8F8E88">${xml(s.name)} · ${assigned[si]}%</div>`)
    .join('')
  return `<div class="fig" style="display:flex;gap:16px;align-items:flex-start">${svg}<div>${legend}</div></div><div class="srcline">HUNDRED FIELD · 一点 = 一人</div>`
}
