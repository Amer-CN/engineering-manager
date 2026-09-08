/**
 * R12 周报速览——Glance 系三秒快读 + Palm 色系 + 手写静态 SVG 双图
 * 版式正本：vendor/lieflat-charts/templates/reports/report-12.zh.html
 * 打印版心 max-width 794px 单栏文档流 + 顶部速览条两数 + 两张图区（原双列改上下排）+ 三栏页脚
 * （原版心 1080 双列图区跨打印分页塌架，2026-09-07 改打印安全版式）
 * 图表：图A 象形点阵（手写静态 SVG，100 点方阵）+ 图B 粗柱（手写静态 SVG）
 * 色板正本：color-presets.js PALM（与模板 02 共用，深绿主墨 + 琥珀强调 + 浓咖衬底）
 * 2026-09-08 上下 10mm 纸边防跨页文字贴顶，左右仍满版出血（@page margin:10mm 0）
 */
import type { TemplateReportData } from './types'
import { PALM, tplEscapeHtml as esc } from './types'

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
  // 内嵌 <script type="application/json">：不能走 esc() HTML 实体转义——script 数据态不解码 &quot;，
  // JSON.parse 拿到 &quot; 必挂。改用 `\u003c` 方案：仅转义 < >（阻断 </script> 逃逸），JSON.parse 可原样还原。
  const jsonForScript = (v: unknown) => JSON.stringify(v).replace(/</g, '\\u003c').replace(/>/g, '\\u003e')
  const jsonA = jsonForScript(rowsA)
  const jsonB = jsonForScript(rowsB.map((r) => ({ name: r.name, value: r.value })))

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
.sect{display:flex;justify-content:space-between;align-items:baseline;gap:16px;font-size:11px;font-weight:800;letter-spacing:.2em;padding-bottom:10px;border-bottom:2px solid var(--txt);margin-bottom:22px;break-after:avoid}
.sect .yr{font-weight:600;color:var(--mut);letter-spacing:.1em;flex-shrink:0}
.miles{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:44px}
.miles .m{padding:18px 16px 16px;position:relative;break-inside:avoid}
.miles .m.hero{background:var(--hero);color:var(--paper)}
.miles .m.frame{border:1px solid var(--faint)}
.miles .m.green{background:var(--data);color:var(--paper)}
.miles .m .tag{font-size:8px;font-weight:700;letter-spacing:.14em;opacity:.7}
.miles .m .v{font-size:20px;font-weight:800;letter-spacing:-.03em;line-height:1;margin-top:6px}
.miles .m .l{font-size:9px;line-height:1.65;margin-top:8px;opacity:.85}
/* 双图卡并排（对齐预览：占比速览 + 排行速览一行两卡）；整组防跨页拆散 */
.duo{display:grid;grid-template-columns:repeat(2,1fr);gap:24px;break-inside:avoid}
.duo+.duo{margin-top:40px}
.gcard{padding:24px 26px 22px;border:1px solid var(--faint);break-inside:avoid}
.sub{font-size:10px;color:var(--mut);margin-bottom:14px;line-height:1.75}
.claim{font-size:11px;font-weight:700;margin-bottom:10px;line-height:1.6;break-after:avoid}
/* 图区自然高：svg width:100%+height:auto 自适应（与预览一致）；
   写死 280px 会在短图/空数据时留出成片卡片底部空白（2026-09-08 实测） */
.ch{min-height:40px}
svg text{font-family:var(--sans)}
.srcline{font-size:8px;font-weight:600;letter-spacing:.1em;color:var(--faint);margin-top:10px;line-height:1.6}
.foot{margin-top:52px;padding-top:16px;border-top:2px solid var(--txt);display:grid;grid-template-columns:1fr 1.55fr .85fr;gap:26px;font-size:8px;font-weight:600;letter-spacing:.08em;color:var(--mut);break-inside:avoid}
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
<div class="ch" id="r12a"></div>
<div class="srcline">PICTORIAL ROWS · 一点 = 1% · 深绿到麦黄按序</div>
</div>
<div class="gcard">
<div class="sect" style="border-bottom-width:1px">${esc(topBars?.title || '排行速览')}</div>
<div class="sub">金额 · 共 ${rowsB.length} 条</div>
<div class="claim">${esc(rowsB[0] ? `${rowsB[0].name} ¥${rowsB[0].value.toLocaleString()}` : '')}</div>
<div class="ch" id="r12b"></div>
<div class="srcline">CHUNKY BARS · 条长与金额成正比 · 深绿 = 最大</div>
</div>
</div>
<div class="foot">
<div class="warn">数据 · ${source}<br>取数 · ${date}</div>
<div class="dep">图表为手写静态 SVG（零外部依赖，随软件安装，离线可用）。</div>
<div class="end">${t}<br>${product}</div>
</div>
</div>
<script type="application/json" id="r12adata">${jsonA}</script>
<script type="application/json" id="r12bdata">${jsonB}</script>
<script>
	(function(){
	// SVG name 转义：与 tplEscapeXml 同口径（打印窗口自包含，内联实现）
	function xml(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
	var A=JSON.parse(document.getElementById('r12adata').textContent);
var B=JSON.parse(document.getElementById('r12bdata').textContent);
var RAMP=${JSON.stringify(PALM.ramp)};
var SER=${JSON.stringify(PALM.ser)};
var PALM_TXT='${PALM.txt}', PALM_DATA='${PALM.data}', PALM_FAINT='${PALM.faint}';
// 图A：象形点阵（手写静态 SVG，100 点方阵；点位分配累计封顶 100，与 r05Print 同口径）
function waffleRows(rows){
  var out='',x=0,cum=0,assigned=[];
  rows.forEach(function(r,i){var n=Math.max(0,Math.min(Math.round(r.pct),100-cum));assigned[i]=n;cum+=n;});
  var rest=100-cum;
  var COLS=20,CELL=22,R=7,W=COLS*CELL,H=Math.ceil(100/COLS)*CELL;
  out+='<svg viewBox="0 0 '+W+' '+H+'" style="width:100%;height:auto" xmlns="http://www.w3.org/2000/svg">';
  rows.forEach(function(r,i){
    var col=SER[i%SER.length];
    for(var k=0;k<assigned[i];k++){
      var pos=x++;
      if(pos>=100)break;
      var cx=(pos%COLS)*CELL+CELL/2,cy=Math.floor(pos/COLS)*CELL+CELL/2;
      out+='<circle cx="'+cx+'" cy="'+cy+'" r="'+R+'" fill="'+col+'"/>';
    }
  });
  for(;x<100;x++){
    var cx2=(x%COLS)*CELL+CELL/2,cy2=Math.floor(x/COLS)*CELL+CELL/2;
    out+='<circle cx="'+cx2+'" cy="'+cy2+'" r="'+R+'" fill="'+PALM_FAINT+'" opacity=".5"/>';
  }
  out+='</svg>';
  return out;
}
// 图B：粗柱（CHUNKY 手写静态版）
function barsRows(rows){
  var max=Math.max.apply(null,rows.map(function(r){return r.value}).concat([1]));
  var out='<svg viewBox="0 0 460 300" style="width:100%;height:auto" xmlns="http://www.w3.org/2000/svg">';
  rows.forEach(function(r,i){
    var y=10+i*46,w=Math.max(4,Math.round(r.value/max*300));
    var col=i===0?PALM_DATA:RAMP[Math.min(3,Math.max(0,3-Math.round(i/Math.max(1,rows.length-2)*3)))];
    out+='<rect x="10" y="'+y+'" width="'+w+'" height="26" rx="13" fill="'+col+'"/>';
    out+='<text x="'+(10+w+8)+'" y="'+(y+18)+'" font-size="11" font-weight="700" fill="'+PALM_TXT+'">¥'+r.value.toLocaleString()+'</text>';
    out+='<text x="10" y="'+(y-2)+'" font-size="9" fill="'+PALM_FAINT+'">'+xml(r.name)+'</text>';
  });
  out+='</svg>';
  return out;
}
document.getElementById('r12a').innerHTML=waffleRows(A);
document.getElementById('r12b').innerHTML=barsRows(B);
})();
</script>
</body></html>`
}
