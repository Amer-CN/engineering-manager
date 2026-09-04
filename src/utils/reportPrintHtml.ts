/**
 * reportPrintHtml.ts — 报告中心整页印刷品化模板（打印/预览用单文件 HTML）
 *
 * 版式正本：vendor/lieflat-charts/templates/reports/report-04.zh.html（官方模板，只读）
 *   学其版式参数转写：左侧书脊竖排大标题（writing-mode:vertical-rl）+ 底部竖排小字、
 *   顶部页眉（左产品名 | 右数据说明）+ 发丝横线、小节 = 右对齐小节名（宽字距）+
 *   结论句标题 + 内容、节间细线分隔、大写来源行（SECTION · 来源 · 日期）、
 *   「值得记住的数字」大数字块（特大等宽数字 + 双行小注）、双行页脚。
 * 色值正本：vendor/lieflat-charts/mono-tokens.js 的 MONO 墨阶
 *   （INK #1C1C1A / PAPER #F0EFEB / MUTED #8F8E88 / FAINT #C6C5BF / GRID #DEDDD6）。
 * 图表正本（本批新增）：glance-gallery.html 的 dot waffle 方阵
 *   （COLS=10 / CELL=21 / R=7.5 / X0=8 / Y0=10，图例=色点+名称+特大百分比）与
 *   basics-gallery.html C1 tick rows 横条骨架（类目名左侧小字 + 发丝轨道 + 条尾数值），
 *   参数转写、代码自写；色板 = colorPresets palm.ser 正本转写（与预览同系统）。
 *
 * hex 只出现在本文件：打印产物是独立单文件 HTML（不进产品组件），浅色打印前提。
 * 字体：Inter（Google Fonts link，与 .work/fidelity-sample 保真样张同法）。
 * 产物为静态版面：不含任何 <script>、无动画、无随机数（打印是静态媒介）；
 * 所有动态内容（含图表 name / 单元格）先经 escapeHtml 转义，无注入面。
 */

import { escapeHtml } from './templateMarkup'
import {
  chartBlockSvg,
  chartCaption,
  type ChartReportData,
} from './chartReport'

/** 大数字块单项（诚实原则：无真实数据就不传、不渲染，不从文本硬凑数字） */
export interface ReportPrintBigNumber {
  /** 特大等宽数字（如 "1,502" / "96.5%"） */
  value: string
  /** 标签（最下一行，宽字距小字） */
  label: string
  /** 小注（标签上一行，gray） */
  sub: string
}

/** markdown 表格块（连续行首 | 的行块解析产物；分隔行跳过） */
export interface ReportPrintTable {
  type: 'table'
  headers: string[]
  rows: string[][]
}

/** 方阵行（每点 = 1%；color 传入优先，缺省按 mono 墨阶递推） */
export interface ReportPrintWaffleRow {
  name: string
  /** 百分比（0-100，调用方算好） */
  pct: number
  color?: string
}

/** 报告附图数据（可选传入：不传整块不渲染，向后兼容） */
export interface ReportPrintCharts {
  /** 发票状态方阵（100 点）；total = 发票合计张数（大数字兜底用） */
  waffle?: { rows: ReportPrintWaffleRow[]; total: number }
  /** 支出 TOP 条形（调用方已降序）；unit 为数值前缀（如 ¥） */
  topBars?: { rows: { name: string; value: number }[]; unit: string }
  /** 大数字兜底显式覆盖（缺省由 waffle/topBars 真实数据派生） */
  bigNumbers?: ReportPrintBigNumber[]
}

/** 报告小节（AI markdown 只做结构化解析，不改写内容） */
export interface ReportPrintSection {
  /** 小节名（来自 "## "/"### " 行，右对齐宽字距）；引言节为 null（无小节名） */
  name: string | null
  /** 结论句标题（该节首个非列表/非表格段落行；无则为空串，不渲染） */
  heading: string
  /** 正文行：段落原样；"- "/"* " 开头 = 列表项；行首 | 连续块 = 表格（渲染时分组） */
  lines: string[]
  /** 该节大数字块（可选；不传则整块不渲染） */
  bigNumbers?: ReportPrintBigNumber[]
}

/** 页面级元信息（页眉 / 页脚 / 来源行共用） */
export interface ReportPrintMeta {
  /** 页眉左侧产品名（大写样式） */
  productName: string
  /** 页眉右侧数据说明 */
  dataNote: string
  /** 来源（来源行 + 页脚右侧共用） */
  source: string
  /** 取数/打印日（来源行 + 页脚右侧共用） */
  takenAt: string
  /** 页脚左侧文案（如「月度运营简报 · 2026 年 9 月」） */
  footerLeft: string
}

// ── 色值正本转写（mono-tokens.js MONO 墨阶 + colorPresets palm.ser，仅本文件使用 hex） ──
const INK = '#1C1C1A'
const MUTED = '#8F8E88'
const FAINT = '#C6C5BF'
const GRID = '#DEDDD6'
/** mono-tokens LAD 墨阶（方阵无传入色段的递推色） */
const MONO_LAD = ['#1C1C1A', '#4A4944', '#8F8E88', '#B0AFA9', '#D8D7D1']
/** colorPresets.ts palm.ser 正本转写（与预览 ReportCharts 同系统：同数据同色） */
const PALM_SER = ['#43593B', '#D4A017', '#77835A', '#F2D17E', '#ACAD79', '#58402E']

const UL_RE = /^[-*]\s+(.*)/
const TABLE_LINE_RE = /^\|/

/** 行内标记 → HTML（输入须已转义）：**粗体** / *斜体*，与 templateMarkup 打印路径同规则 */
function inlineToHtml(escaped: string): string {
  return escaped
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
}

/** 千分位格式化（与 formatMoney 同口径的确定性转写：去尾零 + 千分位；金额单位为元） */
export function fmtThousands(n: number): string {
  if (!Number.isFinite(n)) return '0'
  const rounded = Math.round(n * 100) / 100
  const [int, dec] = String(rounded).split('.')
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return dec ? `${grouped}.${dec}` : grouped
}

/** 表格行拆单元格：去首尾管道符，按 | 分列（"| a | b |" → [a, b]） */
function splitRowCells(line: string): string[] {
  let s = line.trim()
  if (s.startsWith('|')) s = s.slice(1)
  if (s.endsWith('|')) s = s.slice(0, -1)
  return s.split('|').map((c) => c.trim())
}

/** 分隔行（|---| / |:--:|）：所有单元格均为 -: 组合 */
function isSeparatorRow(cells: string[]): boolean {
  return cells.length > 0 && cells.every((c) => /^:?-+:?$/.test(c))
}

/** 连续表格行块 → 表结构（首行 = 表头，分隔行跳过；块长 <2 不成表由调用方拦截） */
export function parseTableBlock(block: string[]): ReportPrintTable {
  const all = block.map(splitRowCells)
  const [headers, ...rest] = all
  return { type: 'table', headers, rows: rest.filter((cells) => !isSeparatorRow(cells)) }
}

/** 官方细线表：表头小写字距 + 发丝行线，无竖线无背景色块；单元格内 **bold** 保留 */
function renderTable(t: ReportPrintTable): string {
  const th = t.headers.map((h) => `<th>${inlineToHtml(escapeHtml(h))}</th>`).join('')
  const trs = t.rows
    .map((r) => `<tr>${r.map((c) => `<td>${inlineToHtml(escapeHtml(c))}</td>`).join('')}</tr>`)
    .join('')
  return `<div class="tablewrap"><table class="tb"><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table></div>`
}

/**
 * AI 报告 markdown → 结构化 sections（纯解析，不改写任何文字）。
 * 规则：
 * - "# " 行（首个）= 报告大标题（进书脊竖排，不进正文）；
 * - "## " / "### " 行 = 小节标题，其后续非井号行归该节；
 * - "#### " 行 = 子条，井号不裸露，并入节内容作加粗行（**子条**）；
 * - 首个 ## 之前的行 = 引言节（name = null，无小节名）；
 * - "- "/"* " 开头行 = 列表项（保留记号原样，渲染时并入 <ul>）；
 * - 行首 | 的连续行块 = 表格（渲染时整块转细线表；孤行不成表）；
 * - 每节首个非列表/非表格行提为结论句 heading（内容不丢，仍渲染为标题）；
 * - 空行剔除；无任何 ## 时自然兜底为单节（全部行进该节，不丢内容）。
 */
export function parseReportMarkdown(markdown: string): {
  title: string | null
  sections: ReportPrintSection[]
} {
  const lines = (markdown || '').split('\n')
  let title: string | null = null
  const raw: { name: string | null; lines: string[] }[] = []
  let current: { name: string | null; lines: string[] } | null = null

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue // 空行剔除
    const h = /^(#{1,4})\s*(.*)$/.exec(line)
    if (h) {
      const level = h[1].length
      const text = h[2].trim()
      if (level === 1) {
        if (title === null) {
          title = text // 首个单井号 = 报告大标题
          continue
        }
        // 非首个 # 行按普通内容落下（维持旧行为）
      } else if (level <= 3) {
        current = { name: text, lines: [] } // ## / ### = 小节
        raw.push(current)
        continue
      } else if (text) {
        // #### 子条：并入节内容首行加粗（井号不裸露）
        if (!current) {
          current = { name: null, lines: [] }
          raw.push(current)
        }
        current.lines.push(`**${text}**`)
        continue
      }
    }
    if (!current) {
      current = { name: null, lines: [] } // 引言节
      raw.push(current)
    }
    current.lines.push(line)
  }

  const sections: ReportPrintSection[] = raw.map((rs) => {
    let heading = ''
    const rest: string[] = []
    let headingTaken = false
    for (const line of rs.lines) {
      if (!headingTaken && !UL_RE.test(line) && !TABLE_LINE_RE.test(line)) {
        heading = line // 首个非列表/非表格行 → 结论句标题
        headingTaken = true
        continue
      }
      rest.push(line)
    }
    return { name: rs.name, heading, lines: rest }
  })

  return { title, sections }
}

/** 正文行 → HTML："- " 连续行并入 <ul>；行首 | 连续块（≥2 行）转细线表，孤行按段落；每行全转义 */
function renderLines(lines: string[]): string {
  const out: string[] = []
  let inList = false
  const closeList = () => {
    if (inList) {
      out.push('</ul>')
      inList = false
    }
  }
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (TABLE_LINE_RE.test(line)) {
      const block: string[] = []
      while (i < lines.length && TABLE_LINE_RE.test(lines[i])) {
        block.push(lines[i])
        i++
      }
      closeList()
      if (block.length >= 2) {
        out.push(renderTable(parseTableBlock(block)))
      } else {
        for (const l of block) out.push(`<p>${inlineToHtml(escapeHtml(l))}</p>`) // 孤行不成表
      }
      continue
    }
    const m = UL_RE.exec(line)
    if (m) {
      if (!inList) {
        out.push('<ul>')
        inList = true
      }
      out.push(`<li>${inlineToHtml(escapeHtml(m[1]))}</li>`)
    } else {
      closeList()
      out.push(`<p>${inlineToHtml(escapeHtml(line))}</p>`)
    }
    i++
  }
  closeList()
  return out.join('')
}

/** 大数字块（版式参数转写自 report-04 的 .stats/.kpi） */
function renderStats(nums: ReportPrintBigNumber[]): string {
  const cells = nums
    .map(
      (n) =>
        `<div><div class="kpi"><div class="v">${escapeHtml(n.value)}</div>` +
        `<div class="r">${escapeHtml(n.sub)}</div>` +
        `<div class="l">${escapeHtml(n.label)}</div></div></div>`,
    )
    .join('')
  return `<div class="stats" style="grid-template-columns:repeat(${nums.length},1fr)">${cells}</div>`
}

/**
 * 发票状态方阵（报告附图）：100 点方阵（10×10，每点 = 1%）静态 SVG 字符串。
 * 版式参数转写自官方 glance-gallery dot waffle（COLS=10 / CELL=21 / R=7.5 / X0=8 / Y0=10）；
 * 图例 = 色点 + 名称小字（宽字距）+ 特大百分比（report-04 排版层级：30px 等宽）。
 * 点位分配口径与预览 SquareHundred 一致：每段 round(pct) 点、累计封顶 100、
 * 余量补「其他」段、超量截断加「占比四舍五入」底注。纯静态：无 <script>、无动画、无随机数。
 */
export function buildWaffleSvg(rows: ReportPrintWaffleRow[]): string {
  const COLS = 10
  const CELL = 21
  const R = 7.5
  const X0 = 8
  const Y0 = 10
  const PITCH = 44 // 图例行距

  // 点位分配（SquareHundred 口径：round + 封顶 100）
  const assigned: number[] = []
  let cum = 0
  for (const r of rows) {
    const n = Math.max(0, Math.min(Math.round(r.pct), 100 - cum))
    assigned.push(n)
    cum += n
  }
  const remainder = 100 - cum
  const overflow = rows.reduce((s, r) => s + Math.round(r.pct), 0) > 100

  const legendRows = rows.map((r, i) => ({
    name: r.name,
    pct: Math.round(r.pct),
    color: r.color ?? MONO_LAD[i % MONO_LAD.length],
  }))
  if (remainder > 0) legendRows.push({ name: '其他', pct: remainder, color: FAINT })

  const H = Math.max(300, 32 + (legendRows.length - 1) * PITCH + 34)
  const parts: string[] = []
  parts.push(
    `<svg viewBox="0 0 380 ${H}" font-family="Inter,sans-serif" style="font-variant-numeric:tabular-nums" role="img" aria-label="共 100 点，每点 1%">`,
  )

  const dot = (c: number, fill: string) => {
    const cx = X0 + (c % COLS) * CELL + R
    const cy = Y0 + Math.floor(c / COLS) * CELL + R
    parts.push(`<circle cx="${cx}" cy="${cy}" r="${R}" fill="${fill}"/>`)
  }
  let idx = 0
  rows.forEach((r, g) => {
    for (let k = 0; k < assigned[g]; k++) dot(idx + k, r.color ?? MONO_LAD[g % MONO_LAD.length])
    idx += assigned[g]
  })
  for (let k = 0; k < remainder; k++) dot(idx + k, FAINT)

  // 图例：色点 + 名称小字 + 特大百分比
  legendRows.forEach((r, g) => {
    const y = 32 + g * PITCH
    parts.push(`<circle cx="246" cy="${y}" r="5" fill="${r.color}"/>`)
    parts.push(
      `<text x="258" y="${y - 8}" font-size="10" font-weight="600" letter-spacing=".08em" fill="${MUTED}">${escapeHtml(r.name)}</text>`,
    )
    parts.push(
      `<text x="258" y="${y + 22}" font-size="30" font-weight="800" fill="${INK}">${r.pct}%</text>`,
    )
  })

  if (overflow) {
    parts.push(
      `<text x="${X0}" y="${Y0 + 10 * CELL + 14}" font-size="7" font-weight="600" letter-spacing=".12em" fill="#B0AFA9">占比四舍五入</text>`,
    )
  }
  parts.push('</svg>')
  return parts.join('')
}

/**
 * 支出 TOP 横向条形（报告附图）：静态 SVG 字符串。
 * 版式参数转写自官方 basics-gallery C1 tick rows 骨架（类目名左侧小字宽字距 +
 * 发丝轨道 + 条尾等宽数值），条形为细条（10px，EditorialBars 同手感）。
 * 条长严格正比（max 守卫：全量最大值为满条，0/负值条宽 0 但名称数值仍显）。
 * 色板 = palm.ser 正本（与预览同系统，逐条按序取色）；纯静态：无 <script>、无动画、无随机数。
 */
export function buildTopBarsSvg(rows: { name: string; value: number }[], unit: string): string {
  const X0 = 126
  const BARMAX = 380
  const PITCH = 36
  const BH = 10
  const max = rows.length > 0 ? Math.max(...rows.map((r) => r.value)) : 0
  const H = rows.length * PITCH + 14

  const parts: string[] = []
  parts.push(
    `<svg viewBox="0 0 620 ${H}" font-family="Inter,sans-serif" style="font-variant-numeric:tabular-nums" role="img" aria-label="支出分类条形图">`,
  )
  rows.forEach((r, i) => {
    const y = 12 + i * PITCH
    parts.push(
      `<text x="118" y="${y + 9}" text-anchor="end" font-size="10" font-weight="600" letter-spacing=".06em" fill="#6A6963">${escapeHtml(r.name)}</text>`,
    )
    parts.push(
      `<line x1="${X0}" y1="${y + 5}" x2="${X0 + BARMAX}" y2="${y + 5}" stroke="${GRID}" stroke-width="1"/>`,
    )
    const w = max > 0 && r.value > 0 ? Math.round((r.value / max) * BARMAX * 100) / 100 : 0
    parts.push(
      `<rect x="${X0}" y="${y}" width="${w}" height="${BH}" rx="2" fill="${PALM_SER[i % PALM_SER.length]}"/>`,
    )
    parts.push(
      `<text x="${X0 + w + 10}" y="${y + 9}" font-size="11" font-weight="700" fill="${INK}">${escapeHtml(unit)}${escapeHtml(fmtThousands(r.value))}</text>`,
    )
  })
  parts.push('</svg>')
  return parts.join('')
}

/** 大数字兜底：AI sections 无数字块时，从 charts 真实数据派生（发票合计 / TOP1 金额 / TOP 类目占比） */
function deriveBigNumbers(charts: ReportPrintCharts): ReportPrintBigNumber[] {
  const out: ReportPrintBigNumber[] = []
  if (charts.waffle && charts.waffle.total > 0) {
    out.push({
      value: fmtThousands(charts.waffle.total),
      sub: '发票台账实时计数',
      label: '发票合计 · 张',
    })
  }
  const bars = charts.topBars
  if (bars && bars.rows.length > 0) {
    const top = bars.rows[0]
    const total = bars.rows.reduce((s, r) => s + r.value, 0)
    out.push({
      value: `${bars.unit}${fmtThousands(top.value)}`,
      sub: top.name,
      label: '支出 TOP1 金额',
    })
    if (total > 0) {
      out.push({
        value: `${Math.round((top.value / total) * 100)}%`,
        sub: `占支出总额 ${bars.unit}${fmtThousands(total)}`,
        label: 'TOP 类目占比',
      })
    }
  }
  return out
}

/** 报告附图单块：图名 + SVG + 官方大写来源行 */
function renderChartBlock(name: string, svg: string, srcline: string): string {
  return (
    `<div class="chartblk"><div class="chartname">${escapeHtml(name)}</div>` +
    svg +
    `<div class="srcline">${escapeHtml(srcline)}</div></div>`
  )
}

/**
 * 报告 → 整页印刷品单文件 HTML（书脊竖排 + 细线分节 + 表格 + 报告附图 SVG + 双行页脚）。
 * 返回完整 HTML 文档字符串（含 <head> 样式），供 window.open 打印链路整页写入。
 * charts 可选：传入时正文后追加「值得记住的数字」兜底（AI 无数字块时）与「报告附图」区。
 * 无 <script>、不使用随机数（打印产物确定性）；动态内容全部经 escapeHtml 转义。
 */
export function buildReportPrintHtml(
  title: string,
  period: string,
  sections: ReportPrintSection[],
  meta: ReportPrintMeta,
  charts?: ReportPrintCharts,
): string {
  const t = escapeHtml(title)
  const p = escapeHtml(period)
  const site = escapeHtml(meta.productName)
  const tag = escapeHtml(meta.dataNote)
  const src = escapeHtml(meta.source)
  const at = escapeHtml(meta.takenAt)
  const footL = escapeHtml(meta.footerLeft)

  const body = sections
    .map((s, i) => {
      const first = i === 0 ? ' first' : ''
      const secthead = s.name
        ? `<div class="secthead${first}"><span class="line"></span><span class="t">${escapeHtml(s.name)}</span></div>`
        : ''
      const claim = s.heading ? `<div class="claim">${inlineToHtml(escapeHtml(s.heading))}</div>` : ''
      const stats = s.bigNumbers && s.bigNumbers.length > 0 ? renderStats(s.bigNumbers) : ''
      const srcName = s.name ? `${escapeHtml(s.name)} · ` : ''
      return (
        `<section class="section">` +
        secthead +
        claim +
        renderLines(s.lines) +
        stats +
        `<div class="srcline">${srcName}${src} · ${at}</div>` +
        `</section>`
      )
    })
    .join('\n')

  // 大数字兜底：AI sections 均无数字块时，用 charts 真实数据生成（显式 bigNumbers 优先）
  const hasSectionNumbers = sections.some((s) => s.bigNumbers && s.bigNumbers.length > 0)
  const fallbackNumbers =
    hasSectionNumbers || !charts
      ? []
      : charts.bigNumbers && charts.bigNumbers.length > 0
        ? charts.bigNumbers
        : deriveBigNumbers(charts)
  const statsSection =
    fallbackNumbers.length > 0
      ? `<section class="section">` +
        `<div class="secthead"><span class="line"></span><span class="t">值得记住的数字</span></div>` +
        renderStats(fallbackNumbers) +
        `<div class="srcline">数据 · 发票台账 + 成本台账 · ${at}</div>` +
        `</section>`
      : ''

  // 报告附图：官方正本参数的静态 SVG（方阵 + 横条），来源行沿官方大写格式
  const chartBlocks: string[] = []
  if (charts?.waffle && charts.waffle.rows.length > 0) {
    chartBlocks.push(
      renderChartBlock('发票状态', buildWaffleSvg(charts.waffle.rows), 'WAFFLE 100 · PALM · 发票台账'),
    )
  }
  if (charts?.topBars && charts.topBars.rows.length > 0) {
    chartBlocks.push(
      renderChartBlock(
        `支出分类 TOP ${charts.topBars.rows.length}`,
        buildTopBarsSvg(charts.topBars.rows, charts.topBars.unit),
        'TOP BARS · PALM · 成本台账',
      ),
    )
  }
  const chartsSection =
    chartBlocks.length > 0
      ? `<section class="section">` +
        `<div class="secthead"><span class="line"></span><span class="t">报告附图</span></div>` +
        chartBlocks.join('') +
        `</section>`
      : ''

  // 注意：本模板不含任何脚本；产物中禁止出现字面 </script>（无脚本块，天然满足）
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${t} · 工程管家报告</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  /* 版式参数转写自 vendor report-04.zh.html 正本；色值 = mono-tokens.js MONO 墨阶。
     浅色打印前提（纸底 #F0EFEB / 墨 #1C1C1A），hex 仅存在于本生成器。 */
  :root{
    --paper:#F0EFEB; --ink:${INK}; --muted:${MUTED}; --faint:${FAINT}; --grid:${GRID};
    --num:'Inter',sans-serif;
  }
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:var(--paper);color:var(--ink);font-family:'Inter',sans-serif;
    -webkit-font-smoothing:antialiased;font-variant-numeric:tabular-nums lining-nums;
    display:flex;justify-content:center;padding:56px 24px}
  .sheet{width:1080px;max-width:1080px;display:grid;grid-template-columns:110px 1fr}

  /* ── 书脊：竖排大标题 + 底部竖排小字 ── */
  .spine{position:relative;border-right:1px solid var(--ink)}
  .spine .t{position:absolute;top:0;left:14px;writing-mode:vertical-rl;
    font-weight:900;font-size:56px;line-height:1.1;letter-spacing:.06em;white-space:nowrap}
  .spine .b{position:absolute;bottom:0;left:48px;writing-mode:vertical-rl;
    font-size:9px;font-weight:700;letter-spacing:.26em;color:var(--muted)}

  .content{padding-left:40px}

  /* ── 顶部页眉：左产品名 | 右数据说明 ── */
  .tophead{display:flex;gap:18px;align-items:baseline;border-bottom:1px solid var(--ink);
    padding-bottom:10px;margin-bottom:40px}
  .tophead .site{font-family:var(--num);font-weight:600;font-size:13px;
    letter-spacing:.08em;text-transform:uppercase}
  .tophead .sep{color:var(--faint)}
  .tophead .tag{font-size:10px;font-weight:600;letter-spacing:.12em;color:var(--muted)}

  /* ── 小节：右对齐小节名（宽字距）+ 发丝线；结论句标题；正文 ── */
  .secthead{display:flex;align-items:baseline;gap:14px;margin:44px 0 8px}
  .secthead .line{flex:1;border-top:1px solid var(--ink)}
  .secthead .t{font-weight:700;font-size:15px;letter-spacing:.2em;text-align:right}
  .secthead.first{margin-top:0}

  .claim{font-size:13px;font-weight:700;color:var(--ink);margin:4px 0 2px}
  .section p{font-size:12.5px;line-height:1.8;margin:8px 0;color:var(--ink)}
  .section ul{margin:8px 0;padding-left:1.6em}
  .section li{font-size:12.5px;line-height:1.8;margin:3px 0;color:var(--ink)}

  /* ── 正文表格：官方细线表（表头小写字距 · 发丝行线 · 无竖线 · 无背景色块） ── */
  .tablewrap{margin:10px 0}
  table.tb{width:100%;border-collapse:collapse}
  .tb th{font-size:9px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;
    color:var(--muted);text-align:left;padding:6px 10px 5px;border-bottom:1px solid var(--ink)}
  .tb td{font-size:11.5px;line-height:1.6;padding:6px 10px;border-bottom:1px solid var(--grid)}

  /* ── 大写来源行：SECTION · 来源 · 日期 ── */
  .srcline{font-size:9px;font-weight:600;letter-spacing:.1em;
    color:var(--faint);margin-top:8px;text-transform:uppercase}

  /* ── 值得记住的数字：大数字块（特大等宽数字 + 双行小注）── */
  .stats{display:grid;gap:0;margin-top:14px;border-top:1px solid var(--ink)}
  .stats>div{padding:22px 20px 6px;border-right:1px dotted var(--faint)}
  .stats>div:first-child{padding-left:0}
  .stats>div:last-child{border-right:0;padding-right:0}
  .kpi .v{font-family:var(--num);font-weight:800;font-size:38px;line-height:1}
  .kpi .r{font-size:10px;font-weight:700;color:var(--muted);margin-top:4px}
  .kpi .l{font-size:9.5px;font-weight:600;letter-spacing:.12em;
    color:var(--faint);margin-top:3px}

  /* ── 报告附图：官方正本参数的静态 SVG（方阵 + 横条）── */
  .chartblk{margin:24px 0 4px}
  .chartname{font-size:10px;font-weight:700;letter-spacing:.14em;color:var(--muted);
    margin-bottom:2px;text-transform:uppercase}
  .chartblk svg{width:100%;height:auto;display:block}

  /* ── 页脚：左文案 · 右数据来源行 ── */
  .foot{margin-top:48px;border-top:1px solid var(--ink);padding-top:12px;
    display:flex;justify-content:space-between;font-size:9px;font-weight:600;
    letter-spacing:.12em;color:var(--muted)}

  /* ── A4 打印适配：页边距 + 分页避免 ── */
  @page{size:A4;margin:14mm 12mm}
  @media print{
    body{padding:0}
    .sheet{width:100%;max-width:none;display:block}
    /* 书脊每页贯穿：fixed 定位元素在 Chromium 打印时逐页重复（多页报告每页左侧都有书脊）。
       官方 report-04 为单页 sheet 无多页方案，此为打印链路自有实现；
       @page 左边距 12mm + 书脊 24mm + 空隙 6mm，正文 .content 让位 30mm。 */
    .spine{position:fixed;left:0;top:0;bottom:0;width:24mm;border-right:1px solid var(--ink)}
    .content{padding-left:30mm}
    .tophead,.section,.stats,.foot,.chartblk{break-inside:avoid;page-break-inside:avoid}
  }
</style>
</head>
<body>
<div class="sheet">
  <div class="spine">
    <div class="t">${t}</div>
    <div class="b">${p}</div>
  </div>
  <div class="content">
    <div class="tophead">
      <span class="site">${site}</span><span class="sep">|</span>
      <span class="tag">${tag}</span>
    </div>
${body}${statsSection}${chartsSection}
    <div class="foot">
      <span>${footL}</span>
      <span>数据 · ${src} · ${at}</span>
    </div>
  </div>
</div>
</body>
</html>`
}

/**
 * 图形版报告 → R04 同款整页单文件 HTML（书脊竖排 + 每节一图 + 4 栏大数字 + 双行页脚）。
 * 图表区直接内嵌 chartReport.ts 同源 SVG 生成器产物（与 ChartReportView 预览同观感）；
 * 色板 = Porcelain 青瓷蓝（#081F5C 墨 + 米纸底），hex 豁免沿本文件既有约定。
 * 版式参数与书脊/来源行/页脚 CSS 沿上方文本版模板转写（独立 CSS 副本，
 * 不触碰 buildReportPrintHtml 实现——文本版全链路零回归）；书脊每页贯穿沿
 * @media print fixed 既有方案。静态产物：无 <script>、动态内容全转义。
 */
export function buildChartReportPrintHtml(data: ChartReportData, meta: ReportPrintMeta): string {
  const t = escapeHtml(data.title || '运营报告')
  const p = escapeHtml(data.period)
  const site = escapeHtml(meta.productName)
  const tag = escapeHtml(meta.dataNote)
  const src = escapeHtml(meta.source)
  const at = escapeHtml(meta.takenAt)
  const footL = escapeHtml(meta.footerLeft)

  const body = data.sections
    .map((s, i) => {
      const n = String(i + 1).padStart(2, '0')
      const svg = s.chart ? chartBlockSvg(s.chart) : ''
      const chartName = s.chart?.title ?? s.chart?.label ?? ''
      const claim = s.headline ? `<div class="claim">${inlineToHtml(escapeHtml(s.headline))}</div>` : ''
      const bullets =
        s.bullets.length > 0
          ? `<ul>${s.bullets.map((b) => `<li>${inlineToHtml(escapeHtml(b))}</li>`).join('')}</ul>`
          : ''
      const paras = s.lines.map((l) => `<p>${inlineToHtml(escapeHtml(l))}</p>`).join('')
      const figure =
        svg && s.chart
          ? `<div class="chartblk">` +
            (chartName ? `<div class="chartname">${escapeHtml(chartName)}</div>` : '') +
            svg +
            `<div class="caption">${escapeHtml(chartCaption(s.chart))}</div>` +
            `</div>`
          : ''
      return (
        `<section class="section">` +
        `<div class="secthead${i === 0 ? ' first' : ''}"><span class="line"></span><span class="t">${n}</span></div>` +
        claim +
        paras +
        bullets +
        figure +
        `<div class="srcline">SECTION ${n} · ${src} · ${at}</div>` +
        `</section>`
      )
    })
    .join('\n')

  // 值得记住的数字：AI 产出大数字（缺失时整节隐藏，不硬凑）
  const stats =
    data.bigNumbers.length > 0
      ? `<section class="section">` +
        `<div class="secthead"><span class="line"></span><span class="t">值得记住的数字</span></div>` +
        `<div class="stats" style="grid-template-columns:repeat(${Math.min(data.bigNumbers.length, 4)},1fr)">` +
        data.bigNumbers
          .slice(0, 4)
          .map(
            (b) =>
              `<div><div class="kpi"><div class="v">${escapeHtml(b.value)}</div>` +
              (b.label ? `<div class="l">${escapeHtml(b.label)}</div>` : '') +
              `</div></div>`,
          )
          .join('') +
        `</div>` +
        `<div class="srcline">数据 · ${src} · ${at}</div>` +
        `</section>`
      : ''

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${t} · 工程管家图形版报告</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  /* 图形版（R04 转写）：米纸底 + Porcelain 青瓷蓝墨（#081F5C 单色系）。
     色值：hex 豁免沿 reportPrintHtml 既有约定；图表 SVG 内嵌同源生成器产物。 */
  :root{
    --paper:#F0EFEB; --ink:#081F5C; --mut:rgba(8,31,92,.60);
    --lab:rgba(8,31,92,.72); --faint:rgba(8,31,92,.32); --grid:rgba(8,31,92,.16);
    --num:'Inter',sans-serif;
  }
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:var(--paper);color:var(--ink);font-family:'Inter',sans-serif;
    -webkit-font-smoothing:antialiased;font-variant-numeric:tabular-nums lining-nums;
    display:flex;justify-content:center;padding:56px 24px}
  .sheet{width:1080px;max-width:1080px;display:grid;grid-template-columns:110px 1fr}

  /* ── 书脊：竖排大标题 + 底部竖排小字 ── */
  .spine{position:relative;border-right:1px solid var(--ink)}
  .spine .t{position:absolute;top:0;left:14px;writing-mode:vertical-rl;
    font-weight:900;font-size:56px;line-height:1.1;letter-spacing:.06em;white-space:nowrap}
  .spine .b{position:absolute;bottom:0;left:48px;writing-mode:vertical-rl;
    font-size:9px;font-weight:700;letter-spacing:.26em;color:var(--mut)}

  .content{padding-left:40px}

  /* ── 顶部页眉 ── */
  .tophead{display:flex;gap:18px;align-items:baseline;border-bottom:1px solid var(--ink);
    padding-bottom:10px;margin-bottom:36px}
  .tophead .site{font-family:var(--num);font-weight:600;font-size:13px;
    letter-spacing:.08em;text-transform:uppercase}
  .tophead .sep{color:var(--faint)}
  .tophead .tag{font-size:10px;font-weight:600;letter-spacing:.12em;color:var(--mut)}

  /* ── 小节：右对齐小节名（宽字距）+ 发丝线；结论句标题；要点 ── */
  .secthead{display:flex;align-items:baseline;gap:14px;margin:44px 0 8px}
  .secthead .line{flex:1;border-top:1px solid var(--ink)}
  .secthead .t{font-weight:700;font-size:15px;letter-spacing:.2em;text-align:right}
  .secthead.first{margin-top:0}

  .claim{font-size:13px;font-weight:700;color:var(--ink);margin:4px 0 2px}
  .section p{font-size:12.5px;line-height:1.8;margin:8px 0;color:var(--ink)}
  .section ul{margin:8px 0;padding-left:1.6em}
  .section li{font-size:12.5px;line-height:1.8;margin:3px 0;color:var(--ink)}

  /* ── 大写来源行 ── */
  .srcline{font-size:9px;font-weight:600;letter-spacing:.1em;
    color:var(--faint);margin-top:8px;text-transform:uppercase}

  /* ── 图块：图名小字 + SVG（宽 100%）+ 图例句 ── */
  .chartblk{margin:18px 0 4px}
  .chartname{font-size:10px;font-weight:700;letter-spacing:.14em;color:var(--mut);
    margin-bottom:2px;text-transform:uppercase}
  .chartblk svg{width:100%;height:auto;display:block}
  .caption{font-size:9px;font-weight:600;letter-spacing:.12em;color:var(--mut);margin-top:4px}

  /* ── 值得记住的数字：大数字块 ── */
  .stats{display:grid;gap:0;margin-top:14px;border-top:1px solid var(--ink)}
  .stats>div{padding:22px 20px 6px;border-right:1px dotted var(--faint)}
  .stats>div:first-child{padding-left:0}
  .stats>div:last-child{border-right:0;padding-right:0}
  .kpi .v{font-family:var(--num);font-weight:800;font-size:38px;line-height:1}
  .kpi .l{font-size:9.5px;font-weight:600;letter-spacing:.12em;color:var(--mut);margin-top:3px}

  /* ── 页脚 ── */
  .foot{margin-top:48px;border-top:1px solid var(--ink);padding-top:12px;
    display:flex;justify-content:space-between;font-size:9px;font-weight:600;
    letter-spacing:.12em;color:var(--mut)}

  /* ── A4 打印适配：书脊每页贯穿（fixed 逐页重复） ── */
  @page{size:A4;margin:14mm 12mm}
  @media print{
    body{padding:0}
    .sheet{width:100%;max-width:none;display:block}
    .spine{position:fixed;left:0;top:0;bottom:0;width:24mm;border-right:1px solid var(--ink)}
    .content{padding-left:30mm}
    .tophead,.section,.stats,.foot,.chartblk{break-inside:avoid;page-break-inside:avoid}
  }
</style>
</head>
<body>
<div class="sheet">
  <div class="spine">
    <div class="t">${t}</div>
    <div class="b">${p}</div>
  </div>
  <div class="content">
    <div class="tophead">
      <span class="site">${site}</span><span class="sep">|</span>
      <span class="tag">${tag}</span>
    </div>
${body}${stats}
    <div class="foot">
      <span>${footL}</span>
      <span>数据 · ${src} · ${at}</span>
    </div>
  </div>
</div>
</body>
</html>`
}
