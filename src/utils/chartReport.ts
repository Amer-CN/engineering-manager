/**
 * chartReport.ts — 图形版报告（R04 同款整页）解析 + SVG 生成
 *
 * 数据链路：AI 按图形版提示词产出 Markdown（结论句标题 + 要点 + ```chart-* JSON 数据块），
 * parseChartReport 解析为结构化 ChartReportData；三图型（trend/waffle/bars）SVG 由本文件
 * 生成器产出（ChartReportView 预览与 buildChartReportPrintHtml 打印同源，观感一致）。
 *
 * 版式/参数正本（只读）：
 * - 折线：vendor/lieflat-charts/templates/basics-gallery.html B2「hairline line」
 *   （日历地板发丝 + 发丝折线 + 逐日圆点（周末空心）+ 峰值 top-2 标数 + X 轴 3 锚点）；
 * - 方阵：官方 glance dot waffle 参数（COLS=10 / CELL=21 / R=7.5 / X0=8 / Y0=10，同
 *   reportPrintHtml.buildWaffleSvg 转写口径），色板换 porcelain；
 * - 条形：官方 basics C1 tick rows 骨架（类目名左 + 发丝轨道 + 条尾数值，同
 *   reportPrintHtml.buildTopBarsSvg 参数），色板换 porcelain。
 *
 * 色板纪律：图形版统一 Porcelain 青瓷蓝（PRESETS.porcelain + PORCELAIN_INK，import 取色，
 * 本文件零 hex）。SVG 生成器纪律沿 reportPrintHtml：纯静态（无 <script> / 无动画 /
 * 无 Math.random）、动态内容全转义、条长/点距正比守卫（max / step 由数据推导）。
 *
 * 兜底纪律（不吞内容）：chart 块 JSON 解析失败 → 整块原文降级为该节文本行；
 * 全篇无有效 chart 块 → console.warn 一次，节退纯文本展示，不白屏。
 */

import { escapeHtml } from './templateMarkup'
import { PRESETS, PORCELAIN_INK, rampColor } from '@/components/ui/charts/colorPresets'

// ── 类型 ──

/** 折线点（AI 数据段：x 短日期标签，y 真实数字；weekend 可选 → 空心点） */
export interface ChartTrendPoint {
  x: string
  y: number
  weekend?: boolean
}

/** 方阵/条形行（waffle value=百分比 0-100；bars value=金额元或计数） */
export interface ChartNamedRow {
  name: string
  value: number
}

/** 图表数据块（kind 由 AI 的 fence 类型决定，前端不二次判型） */
export interface ChartBlock {
  kind: 'trend' | 'waffle' | 'bars'
  /** trend 块 label / waffle·bars 块 title（图名小字，AI 给了才渲染） */
  label?: string
  title?: string
  points?: ChartTrendPoint[]
  rows?: ChartNamedRow[]
}

/** 图形版小节：结论句标题 + 要点 + 可选图 + 兜底文本行 */
export interface ChartReportSection {
  headline: string
  bullets: string[]
  chart?: ChartBlock
  /** 非约定行（坏块原文 / 额外段落）原样保留，不吞内容 */
  lines: string[]
}

/** 「值得记住的数字」单项（AI 产出：`- {数字}｜{一行说明}`） */
export interface ChartBigNumber {
  value: string
  label: string
}

export interface ChartReportData {
  title: string
  period: string
  sections: ChartReportSection[]
  bigNumbers: ChartBigNumber[]
}

// ── 解析 ──

const FENCE_RE = /^```(\S*)\s*$/
const HEAD1_RE = /^#\s+(.*)$/
const HEAD2_RE = /^##\s+(.*)$/
const QUOTE_PERIOD_RE = /^>\s*期间[：:]\s*(.*)$/
const UL_RE = /^[-*]\s+(.*)$/
const NUMBERS_HEADING = '值得记住的数字'
const BIG_SEP = '｜'

function isFiniteNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

/** chart-* 块 JSON 文本 → ChartBlock；结构不符（rows/points 缺失、字段类型错）→ null */
function parseChartBlock(kind: string, jsonText: string): ChartBlock | null {
  // 白名单：未知 chart-* 类型（AI 自创第四种 fence）整块走原文降级，不吞内容
  if (kind !== 'trend' && kind !== 'waffle' && kind !== 'bars') return null
  let raw: unknown
  try {
    raw = JSON.parse(jsonText)
  } catch {
    return null
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  if (kind === 'trend') {
    if (!Array.isArray(o.points) || o.points.length === 0) return null
    const points: ChartTrendPoint[] = []
    for (const p of o.points) {
      if (!p || typeof p !== 'object' || Array.isArray(p)) return null
      const q = p as Record<string, unknown>
      if (typeof q.x !== 'string' || !isFiniteNum(q.y)) return null
      points.push(
        typeof q.weekend === 'boolean' ? { x: q.x, y: q.y, weekend: q.weekend } : { x: q.x, y: q.y },
      )
    }
    return { kind, points, label: typeof o.label === 'string' ? o.label : undefined }
  }
  if (!Array.isArray(o.rows) || o.rows.length === 0) return null
  const rows: ChartNamedRow[] = []
  for (const r of o.rows) {
    if (!r || typeof r !== 'object' || Array.isArray(r)) return null
    const q = r as Record<string, unknown>
    if (typeof q.name !== 'string' || !isFiniteNum(q.value)) return null
    rows.push({ name: q.name, value: q.value })
  }
  return { kind: kind as 'waffle' | 'bars', rows, title: typeof o.title === 'string' ? o.title : undefined }
}

/**
 * 图形版 markdown → ChartReportData。
 * 规则：
 * - 首个 `# ` 行 = 报告大标题；`> 期间：…` 行 = period；
 * - `## X` = 新节（X = 结论句标题）；`## 值得记住的数字` 为大数字专用节（不进 sections）；
 * - `- ` 行 = 要点（大数字节内解析 `数字｜说明`）；
 * - ```chart-trend / chart-waffle / chart-bars fenced 块 = 图表数据块，挂到当前节；
 *   坏 JSON / 结构不符 → 整块原文降级为该节 lines（不吞内容）；
 *   非 chart-* fence 块同样原文保留为 lines；
 * - 全篇无有效 chart 块 → console.warn 一次（每次解析至多一次）。
 */
export function parseChartReport(markdown: string): ChartReportData {
  const lines = (markdown || '').split('\n')
  let title = ''
  let period = ''
  const sections: ChartReportSection[] = []
  const bigNumbers: ChartBigNumber[] = []
  let cur: ChartReportSection | null = null
  let inNumbers = false
  let warned = false
  const warnOnce = (msg: string) => {
    if (!warned) {
      warned = true
      console.warn(`[chartReport] ${msg}`)
    }
  }

  let fenceKind: string | null = null // '' = 非 chart 的普通 fence
  let fenceClosed = true
  let fenceLines: string[] = []
  const flushFence = () => {
    if (fenceKind === null) return
    const raw = fenceClosed
      ? [`\`\`\`${fenceKind}`, ...fenceLines, '```']
      : [`\`\`\`${fenceKind}`, ...fenceLines]
    if (!cur) {
      cur = { headline: '', bullets: [], lines: [] }
      sections.push(cur)
    }
    if (fenceKind.startsWith('chart-')) {
      const blk = parseChartBlock(fenceKind.slice('chart-'.length), fenceLines.join('\n'))
      if (blk) {
        cur.chart = blk
      } else {
        warnOnce('图表数据块解析失败，该块已降级为文本行')
        cur.lines.push(...raw)
      }
    } else {
      cur.lines.push(...raw)
    }
    fenceKind = null
    fenceLines = []
    fenceClosed = true
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (fenceKind !== null) {
      if (FENCE_RE.test(line)) {
        fenceClosed = true
        flushFence()
      } else {
        fenceLines.push(line)
      }
      continue
    }
    if (!line) continue
    const f = FENCE_RE.exec(line)
    if (f) {
      fenceKind = f[1] ?? ''
      fenceClosed = false
      fenceLines = []
      continue
    }
    const h1 = HEAD1_RE.exec(line)
    if (h1) {
      if (!title) title = h1[1].trim()
      continue // 非首个 # 行按普通内容落下（维持解析宽容性）
    }
    const h2 = HEAD2_RE.exec(line)
    if (h2) {
      const name = h2[1].trim()
      if (name === NUMBERS_HEADING) {
        flushFence() // 保险：节边界前清空未闭合块
        inNumbers = true
        cur = null
        continue
      }
      inNumbers = false
      cur = { headline: name, bullets: [], lines: [] }
      sections.push(cur)
      continue
    }
    const qp = QUOTE_PERIOD_RE.exec(line)
    if (qp && !period) {
      period = qp[1].trim()
      continue
    }
    if (inNumbers) {
      const m = UL_RE.exec(line)
      if (m) {
        const [v, ...rest] = m[1].split(BIG_SEP)
        bigNumbers.push({ value: v.trim(), label: rest.join(BIG_SEP).trim() })
      }
      continue // 数字节非 list 行属 AI 偏离格式，不渲染
    }
    if (!cur) {
      cur = { headline: '', bullets: [], lines: [] } // 标题/期间前的引言行
      sections.push(cur)
    }
    const m = UL_RE.exec(line)
    if (m) {
      cur.bullets.push(m[1].trim())
    } else {
      cur.lines.push(line)
    }
  }
  flushFence() // 未闭合 fence 按已收内容处理

  if (!sections.some((s) => s.chart)) {
    warnOnce('图形版输出未包含任何 chart 数据块，按纯文本节展示')
  }
  return { title, period, sections, bigNumbers }
}

// ── SVG 生成（porcelain 青瓷蓝单色系）──

const HERO = PRESETS.porcelain.hero

/** 千分位（与 reportPrintHtml.fmtThousands 同口径的确定性转写；独立副本避免循环 import） */
function fmtThousands(n: number): string {
  if (!Number.isFinite(n)) return '0'
  const rounded = Math.round(n * 100) / 100
  const [int, dec] = String(rounded).split('.')
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return dec ? `${grouped}.${dec}` : grouped
}

/** 坐标保留 2 位小数（SVG 属性干净） */
const r2 = (v: number) => Math.round(v * 100) / 100

/**
 * 折线（basics-gallery B2「hairline line」参数转写，色板 porcelain）：
 * 日历地板每点一根发丝 + 发丝折线 + 逐点圆点（weekend 空心）+ 峰值 top-2（间隔≥5）标数
 * + X 轴首/中/尾锚点。x 坐标按点数均分（正比守卫），y 比例由 max 推导（峰值不越顶）。
 * 纯静态：无 <script>、无动画、无随机数；x 标签 / 峰值数字全转义。
 */
export function buildTrendSvg(points: ChartTrendPoint[]): string {
  const N = points.length
  const X0 = 30
  const XEND = 370
  const BASE = 262
  const TOP = 40 // 顶部留白（峰值标数空间）
  const step = N > 1 ? (XEND - X0) / (N - 1) : 0
  const xAt = (d: number) => X0 + d * step
  const maxY = Math.max(...points.map((p) => p.y), 0)
  const scale = maxY > 0 ? (BASE - TOP) / maxY : 1
  const yAt = (v: number) => BASE - v * scale

  // 峰值 top-2，间隔 ≥5（正本口径）
  const order = points.map((_, i) => i).sort((a, b) => points[b].y - points[a].y)
  const top: number[] = []
  for (const d of order) {
    if (top.every((t) => Math.abs(t - d) >= 5)) top.push(d)
    if (top.length === 2) break
  }

  const parts: string[] = []
  parts.push(
    `<svg viewBox="0 0 400 320" font-family="Inter,sans-serif" style="font-variant-numeric:tabular-nums" role="img" aria-label="折线图：一点 = 一天">`,
  )
  // 日历地板（正本：无论有没有事，每天一根发丝）
  for (let d = 0; d < N; d++) {
    parts.push(
      `<line x1="${r2(xAt(d))}" y1="${BASE}" x2="${r2(xAt(d))}" y2="${BASE - 7}" stroke="${PORCELAIN_INK.grid}" stroke-width="1"/>`,
    )
  }
  // 底线
  parts.push(`<line x1="${X0 - 6}" y1="${BASE}" x2="${XEND + 6}" y2="${BASE}" stroke="${PORCELAIN_INK.faint}" stroke-width="1"/>`)
  // 发丝折线
  if (N > 1) {
    const path = points.map((p, d) => `${r2(xAt(d))} ${r2(yAt(p.y))}`).join(' L ')
    parts.push(`<path d="M${path}" fill="none" stroke="${HERO}" stroke-width="1"/>`)
  }
  // 逐点圆点 + 峰值标数
  points.forEach((p, d) => {
    const big = top.includes(d)
    const cx = r2(xAt(d))
    const cy = r2(yAt(p.y))
    if (p.weekend) {
      parts.push(`<circle cx="${cx}" cy="${cy}" r="${big ? 4.2 : 2.1}" fill="none" stroke="${HERO}" stroke-width="1"/>`)
    } else {
      parts.push(`<circle cx="${cx}" cy="${cy}" r="${big ? 4.2 : 2.1}" fill="${HERO}"/>`)
    }
    if (big) {
      parts.push(
        `<text x="${cx}" y="${r2(cy - 11)}" font-size="9.5" font-weight="800" fill="${HERO}" text-anchor="middle">${fmtThousands(p.y)}</text>`,
      )
    }
  })
  // X 轴首/中/尾锚点
  if (N > 0) {
    const anchors = [...new Set(N >= 3 ? [0, Math.floor((N - 1) / 2), N - 1] : N === 2 ? [0, 1] : [0])]
    for (const d of anchors) {
      parts.push(
        `<text x="${r2(xAt(d))}" y="${BASE + 18}" font-size="7.5" font-weight="600" fill="${PORCELAIN_INK.mut}" text-anchor="middle" letter-spacing=".1em">${escapeHtml(points[d].x)}</text>`,
      )
    }
  }
  parts.push('</svg>')
  return parts.join('')
}

/**
 * 方阵（官方 glance dot waffle 参数：COLS=10 / CELL=21 / R=7.5 / X0=8 / Y0=10），
 * 每点 = 1%；点位分配与 reportPrintHtml.buildWaffleSvg 同口径（round + 封顶 100 +
 * 余量补「其他」+ 超量底注）；图例 = 色点 + 名称 + 特大百分比。
 * 色板 porcelain ramp（rank0 最深），余量段 faint。纯静态、name 全转义。
 */
export function buildChartWaffleSvg(rows: ChartNamedRow[]): string {
  const COLS = 10
  const CELL = 21
  const R = 7.5
  const X0 = 8
  const Y0 = 10
  const PITCH = 44

  const assigned: number[] = []
  let cum = 0
  for (const r of rows) {
    const n = Math.max(0, Math.min(Math.round(r.value), 100 - cum))
    assigned.push(n)
    cum += n
  }
  const remainder = 100 - cum
  const overflow = rows.reduce((s, r) => s + Math.round(r.value), 0) > 100

  const legendRows = rows.map((r, i) => ({
    name: r.name,
    pct: Math.round(r.value),
    color: rampColor('porcelain', i, rows.length),
  }))
  if (remainder > 0) legendRows.push({ name: '其他', pct: remainder, color: PORCELAIN_INK.faint })

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
    const color = rampColor('porcelain', g, rows.length)
    for (let k = 0; k < assigned[g]; k++) dot(idx + k, color)
    idx += assigned[g]
  })
  for (let k = 0; k < remainder; k++) dot(idx + k, PORCELAIN_INK.faint)

  legendRows.forEach((r, g) => {
    const y = 32 + g * PITCH
    parts.push(`<circle cx="246" cy="${y}" r="5" fill="${r.color}"/>`)
    parts.push(
      `<text x="258" y="${y - 8}" font-size="10" font-weight="600" letter-spacing=".08em" fill="${PORCELAIN_INK.lab}">${escapeHtml(r.name)}</text>`,
    )
    parts.push(
      `<text x="258" y="${y + 22}" font-size="30" font-weight="800" fill="${HERO}">${r.pct}%</text>`,
    )
  })

  if (overflow) {
    parts.push(
      `<text x="${X0}" y="${Y0 + 10 * CELL + 14}" font-size="7" font-weight="600" letter-spacing=".12em" fill="${PORCELAIN_INK.faint}">占比四舍五入</text>`,
    )
  }
  parts.push('</svg>')
  return parts.join('')
}

/**
 * 横向条形（basics C1 tick rows 骨架，参数同 reportPrintHtml.buildTopBarsSvg：
 * X0=126 / BARMAX=380 / PITCH=36 / BH=10，viewBox 620）。
 * 色板 porcelain 且明度=数值（值越大色越深，按值排名取 rampColor）；
 * 条长严格正比（max 守卫：0/负值条宽 0 但名称数值仍显）。纯静态、name 全转义。
 */
export function buildChartBarsSvg(rows: ChartNamedRow[]): string {
  const X0 = 126
  const BARMAX = 380
  const PITCH = 36
  const BH = 10
  const max = rows.length > 0 ? Math.max(...rows.map((r) => r.value)) : 0
  const H = rows.length * PITCH + 14
  // 明度=数值：value 降序排名（最大 → rank0 最深 CAT4[0]）
  const rank = new Map<number, number>()
  ;[...rows.keys()]
    .sort((a, b) => rows[b].value - rows[a].value)
    .forEach((idx, position) => rank.set(idx, position))

  const parts: string[] = []
  parts.push(
    `<svg viewBox="0 0 620 ${H}" font-family="Inter,sans-serif" style="font-variant-numeric:tabular-nums" role="img" aria-label="类目条形图：条长与金额成正比">`,
  )
  rows.forEach((r, i) => {
    const y = 12 + i * PITCH
    parts.push(
      `<text x="118" y="${y + 9}" text-anchor="end" font-size="10" font-weight="600" letter-spacing=".06em" fill="${PORCELAIN_INK.lab}">${escapeHtml(r.name)}</text>`,
    )
    parts.push(
      `<line x1="${X0}" y1="${y + 5}" x2="${X0 + BARMAX}" y2="${y + 5}" stroke="${PORCELAIN_INK.grid}" stroke-width="1"/>`,
    )
    const w = max > 0 && r.value > 0 ? Math.round((r.value / max) * BARMAX * 100) / 100 : 0
    const color = rampColor('porcelain', rank.get(i) ?? 0, rows.length)
    parts.push(`<rect x="${X0}" y="${y}" width="${w}" height="${BH}" rx="2" fill="${color}"/>`)
    parts.push(
      `<text x="${X0 + w + 10}" y="${y + 9}" font-size="11" font-weight="700" fill="${HERO}">${fmtThousands(r.value)}</text>`,
    )
  })
  parts.push('</svg>')
  return parts.join('')
}

/** 图例句（官方风格）：trend 按数据是否含 weekend 字段增补「空心 = 周末」 */
export function chartCaption(block: ChartBlock): string {
  if (block.kind === 'trend') {
    return block.points?.some((p) => p.weekend) ? '一点 = 一天 · 空心 = 周末' : '一点 = 一天'
  }
  if (block.kind === 'waffle') return '一点 = 1%'
  return '条长与金额成正比'
}

/** 图块 → SVG 字符串（ChartReportView 预览与打印链共用；kind 与数据不符返回空串） */
export function chartBlockSvg(block: ChartBlock): string {
  if (block.kind === 'trend' && block.points) return buildTrendSvg(block.points)
  if (block.kind === 'waffle' && block.rows) return buildChartWaffleSvg(block.rows)
  if (block.kind === 'bars' && block.rows) return buildChartBarsSvg(block.rows)
  return ''
}
