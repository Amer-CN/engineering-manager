/**
 * R12 周报速览——Glance 系三秒快读 + Palm 色系 + 手写静态 SVG 双图
 * 版式正本：~/.zcode/skills/lieflat-charts/templates/reports/report-12.zh.html
 * 打印版心 max-width 794px 单栏文档流 + 顶部速览条两数 + 两张图区（原双列改上下排）+ 三栏页脚
 * （原版心 1080 双列图区跨打印分页塌架，2026-09-07 改打印安全版式）
 * 图表：图A 象形点阵（手写静态 SVG，100 点方阵）+ 图B 粗柱（手写静态 SVG）
 * 色板正本：color-presets.js PALM（与模板 02 共用，深绿主墨 + 琥珀强调 + 浓咖衬底）
 * 2026-09-08 上下 10mm 纸边防跨页文字贴顶，左右仍满版出血（@page margin:10mm 0）
 */
import type { TemplateReportData } from './types'
import { PALM, tplEscapeHtml as esc, tplEscapeXml as xml } from './types'

/** 生成 R12 版式打印 HTML（图表为手写静态 SVG，零外部依赖，离线可用） */
export function buildR12PrintHtml(data: TemplateReportData): string {
  const t = esc(data.title)
  const period = esc(data.period)
  const source = esc(data.meta.dataSource)
  const date = esc(data.meta.date)
  const product = esc(data.meta.product)
  const fonts = `<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+SC:wght@400;500;700;900&display=swap" rel="stylesheet">`

  const waffle = data.charts?.waffle
  const topBars = data.charts?.topBars
  const bigNums = data.charts?.bigNumbers ?? []

  const feat1 = bigNums[0]
  const feat2 = bigNums[1]
  const feat1Html = feat1
    ? `<div class="m frame"><div class="tag">${esc(feat1.label)}</div><div class="v">${esc(feat1.value)}</div><div class="l">${esc(feat1.sub)}</div></div>`
    : `<div class="m frame"><div class="tag">本周合计</div><div class="v">${esc(period)}</div><div class="l">${esc(source)}</div></div>`
  const feat2Html = feat2
    ? `<div class="m green"><div class="tag">${esc(feat2.label)}</div><div class="v">${esc(feat2.value)}</div><div class="l">${esc(feat2.sub)}</div></div>`
    : `<div class="m green"><div class="tag">取数</div><div class="v">${esc(date)}</div><div class="l">${esc(source)}</div></div>`

  const rowsA = waffle?.rows.slice(0, 7) ?? []
  const rowsB = topBars?.rows.slice(0, 6) ?? []
  // 图例封顶口径：与 waffleRows 点位分配一致（累计封顶 100），图例显示封顶后百分比
  const assignedA: number[] = []
  let cumA = 0
  for (const r of rowsA) {
    const n = Math.max(0, Math.min(Math.round(r.pct), 100 - cumA))
    assignedA.push(n)
    cumA += n
  }
  // 图卡静态 SVG：构建时内联。原实现为打印窗口内联脚本现场渲染——页头 Google Fonts 样式表
  // 会阻塞内联脚本执行，慢网下 win.print() 先于脚本跑完，双图卡整体丢失（2026-09-08 实测）。
  // 改静态内联后与 R01/R05 同架构，页脚印"零外部依赖"名副其实。
  // 图A：象形点阵（100 点方阵；点位分配复用上方 assignedA 累计封顶口径）
  const COLS = 20, CELL = 22, R = 7
  const W = COLS * CELL
  const H = Math.ceil(100 / COLS) * CELL
  let dots = ''
  let pos = 0
  rowsA.forEach((r, i) => {
    const col = PALM.ser[i % PALM.ser.length]
    for (let k = 0; k < assignedA[i]; k++) {
      const p = pos++
      if (p >= 100) break
      dots += `<circle cx="${(p % COLS) * CELL + CELL / 2}" cy="${Math.floor(p / COLS) * CELL + CELL / 2}" r="${R}" fill="${col}"/>`
    }
  })
  for (; pos < 100; pos++) {
    dots += `<circle cx="${(pos % COLS) * CELL + CELL / 2}" cy="${Math.floor(pos / COLS) * CELL + CELL / 2}" r="${R}" fill="${PALM.faint}" opacity=".5"/>`
  }
  const pictorSvg = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto" xmlns="http://www.w3.org/2000/svg">${dots}</svg>`
  // 图B：粗柱（条长与金额成正比 · 深绿 = 最大）
  const maxV = Math.max(...rowsB.map((r) => r.value), 1)
  let bars = ''
  rowsB.forEach((r, i) => {
    const y = 18 + i * 56
    const w = Math.max(4, Math.round((r.value / maxV) * 300))
    const col = i === 0 ? PALM.data : PALM.ramp[Math.min(3, Math.max(0, 3 - Math.round((i / Math.max(1, rowsB.length - 2)) * 3)))]
    bars += `<rect x="10" y="${y}" width="${w}" height="26" rx="13" fill="${col}"/>`
    bars += `<text x="${10 + w + 8}" y="${y + 18}" font-size="18" font-weight="700" fill="${PALM.txt}">¥${r.value.toLocaleString()}</text>`
    bars += `<text x="10" y="${y - 2}" font-size="17" fill="${PALM.faint}">${xml(r.name)}</text>`
  })
  // viewBox 高度按行数计算：末行条形底 18+(n-1)*56+26，加 14 底部余量——3 行数据不再半空卡
  const barsSvg = `<svg viewBox="0 0 460 ${58 + (rowsB.length - 1) * 56}" style="width:100%;height:auto" xmlns="http://www.w3.org/2000/svg">${bars}</svg>`

  return `<!DOCTYPE html>
<html lang="zh-Hans"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${t}</title>${fonts}
<style>
:root{--paper:${PALM.bg};--txt:${PALM.txt};--mut:${PALM.mut};--lab:${PALM.lab};
--faint:${PALM.faint};--grid:${PALM.grid};--data:${PALM.data};--data2:${PALM.data2};--hero:${PALM.hero};
--faintdata:${PALM.faintData};--bead:${PALM.bead};--mat:${PALM.data2};
--dmid:rgba(240,239,235,.62);--dq:rgba(240,239,235,.24);
--sans:'Inter','Noto Sans SC',sans-serif}
*{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{background:var(--paper);font-family:var(--sans);color:var(--txt);-webkit-font-smoothing:antialiased;font-variant-numeric:tabular-nums lining-nums;display:block}
/* body 底色=纸色：末页内容不足一页时不再露出成片 mat 底（2026-09-08 实测"棕色空底"根因）；
   mat 色带已回退：@page 上下 10mm 纸边 + 色带双重堆叠会导致顶部白边叠加（2026-09-08） */
.sheet{width:auto;max-width:794px;margin:0 auto;background:var(--paper);padding:14mm 13mm}
/* 节标题 flex 两端对齐（与预览同款修复）：float:right 不撑开父高度，长标题换行时期间文字压线 */
.sect{display:flex;justify-content:space-between;align-items:baseline;gap:16px;font-size:14px;font-weight:800;letter-spacing:.2em;padding-bottom:10px;border-bottom:2px solid var(--txt);margin-bottom:22px;break-after:avoid}
.sect .yr{font-weight:600;color:var(--mut);letter-spacing:.1em;flex-shrink:0;font-size:12px}
.miles{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:44px}
.miles .m{padding:18px 16px 16px;position:relative;break-inside:avoid}
.miles .m.hero{background:var(--hero);color:var(--paper)}
.miles .m.frame{border:1px solid var(--faint)}
.miles .m.green{background:var(--data);color:var(--paper)}
.miles .m .tag{font-size:12px;font-weight:700;letter-spacing:.14em;opacity:.7}
.miles .m .v{font-size:20px;font-weight:800;letter-spacing:-.03em;line-height:1;margin-top:6px}
.miles .m .l{font-size:12px;line-height:1.65;margin-top:8px;opacity:.85}
/* 双图卡并排（对齐预览：占比速览 + 排行速览一行两卡）；整组防跨页拆散 */
.duo{display:grid;grid-template-columns:repeat(2,1fr);gap:24px;break-inside:avoid}
.duo+.duo{margin-top:40px}
.gcard{padding:24px 26px 22px;border:1px solid var(--faint);break-inside:avoid}
.sub{font-size:12px;color:var(--mut);margin-bottom:14px;line-height:1.75}
.claim{font-size:14px;font-weight:700;margin-bottom:10px;line-height:1.6;break-after:avoid}
/* 图区自然高：svg width:100%+height:auto 自适应（与预览一致）；
   写死 280px 会在短图/空数据时留出成片卡片底部空白（2026-09-08 实测） */
.ch{min-height:40px}
svg text{font-family:var(--sans)}
.srcline{font-size:10px;font-weight:600;letter-spacing:.1em;color:var(--faint);margin-top:10px;line-height:1.6}
.foot{margin-top:52px;padding-top:16px;border-top:2px solid var(--txt);display:grid;grid-template-columns:1fr 1.55fr .85fr;gap:26px;font-size:12px;font-weight:600;letter-spacing:.08em;color:var(--mut);break-inside:avoid}
.foot .warn{color:var(--data);font-weight:700;line-height:1.75}
.foot .end{text-align:right;line-height:1.75}
@media print{@page{size:A4;margin:10mm 0}}
</style></head><body>
<div class="sheet">
<div class="sect">${t}<span class="yr">${period}</span></div>
<div class="miles">${feat1Html}${feat2Html}</div>
<div class="duo">
<div class="gcard">
<div class="sect" style="border-bottom-width:1px">${esc(waffle?.title || '构成速览')}</div>
<div class="sub">占比 · 共 ${rowsA.length} 类</div>
<div class="claim">${rowsA[0] ? esc(rowsA[0].name + ' ' + assignedA[0] + '%') : ''}</div>
<div class="ch" id="r12a">${pictorSvg}</div>
<div class="srcline">PICTORIAL ROWS · 一点 = 1% · 深绿到麦黄按序</div>
</div>
<div class="gcard">
<div class="sect" style="border-bottom-width:1px">${esc(topBars?.title || '排行速览')}</div>
<div class="sub">金额 · 共 ${rowsB.length} 条</div>
<div class="claim">${esc(rowsB[0] ? `${rowsB[0].name} ¥${rowsB[0].value.toLocaleString()}` : '')}</div>
<div class="ch" id="r12b">${barsSvg}</div>
<div class="srcline">CHUNKY BARS · 条长与金额成正比 · 深绿 = 最大</div>
</div>
</div>
<div class="foot">
<div class="warn">数据 · ${source}<br>取数 · ${date}</div>
<div class="dep">图表为手写静态 SVG（零外部依赖，随软件安装，离线可用）。</div>
<div class="end">${t}<br>${product}</div>
</div>
</div>
</body></html>`
}
