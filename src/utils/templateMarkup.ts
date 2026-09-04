/**
 * templateMarkup.ts — 合同模板轻量标记转换器（M-S29B 富文本）
 *
 * 支持的 Markdown 子集（S29 编辑器工具条对应）：
 * - **粗体**
 * - *斜体*
 * - 行首 "# "~"#### " 标题（全层级井号不裸露字面量）
 * - {{变量}} 占位符（由调用方决定渲染为徽章或替换为值）
 * - 无序列表："- item" 或 "* item"
 * - 有序列表："1. item"（任意数字前缀）
 * - 表格：连续行首 | 的行块（≥2 行）→ table 结构（分隔行 |---| 跳过），
 *   规则与 reportPrintHtml 打印链一致（孤行不成表；两文件各自持有同规则的
 *   拆分/判定辅助，避免 reportPrintHtml → escapeHtml 的既有单向依赖成环）
 *
 * 三端共享：编辑器预览（React 节点）与打印（HTML 字符串，全程先转义防注入）。
 * 注意：templateMarkupToPrintHtml（合同打印链，printContractTemplate 消费）
 * 不解析表格/多级井号，保持既有行为不变。
 */

/** HTML 转义（打印路径防注入：模板正文与变量值均不可信） */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** 行内标记 → HTML（输入须已转义）：**粗体** / *斜体* */
function inlineToHtml(escaped: string): string {
  return escaped
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
}

const UL_RE_PRINT = /^[-*]\s+(.*)/
const OL_RE_PRINT = /^\d+\.\s+(.*)/

function listItemToHtml(raw: string): string {
  const escaped = escapeHtml(raw)
  return `<li style="margin: 4px 0;">${inlineToHtml(escaped)}</li>`
}

/**
 * 模板正文 → 打印 HTML（不处理 {{变量}}，替换值由调用方先行完成并传入）。
 * 段落规则与旧打印一致：每行一个 <p>（首行缩进 2em）；"## " 行渲染为条款标题。
 * 连续无序/有序列表行合并为 <ul>/<ol>。
 */
export function templateMarkupToPrintHtml(text: string): string {
  const lines = (text || '').split('\n')
  const out: string[] = []
  let listBuf: { type: 'ul' | 'ol'; items: string[] } | null = null

  const flushList = () => {
    if (!listBuf) return
    const tag = listBuf.type
    out.push(`<${tag} style="margin: 8px 0; padding-left: 2em;">${listBuf.items.join('')}</${tag}>`)
    listBuf = null
  }

  for (const line of lines) {
    const ulMatch = UL_RE_PRINT.exec(line)
    const olMatch = !ulMatch ? OL_RE_PRINT.exec(line) : null

    if (ulMatch) {
      if (listBuf?.type !== 'ul') { flushList(); listBuf = { type: 'ul', items: [] } }
      listBuf.items.push(listItemToHtml(ulMatch[1]))
      continue
    }
    if (olMatch) {
      if (listBuf?.type !== 'ol') { flushList(); listBuf = { type: 'ol', items: [] } }
      listBuf.items.push(listItemToHtml(olMatch[1]))
      continue
    }

    flushList()
    const escaped = escapeHtml(line)
    if (/^## /.test(line)) {
      out.push(`<p style="font-weight: bold; margin: 16px 0 6px;">${inlineToHtml(escaped.slice(3))}</p>`)
    } else {
      out.push(`<p style="text-indent: 2em; margin: 10px 0;">${inlineToHtml(escaped)}</p>`)
    }
  }
  flushList()
  return out.join('')
}

export interface MarkupToken {
  type: 'text' | 'bold' | 'italic' | 'variable'
  content: string
}

/** 行内容 → token 流（预览渲染用；variable 为 {{key}} 中的 key） */
export function tokenizeInline(line: string): MarkupToken[] {
  const tokens: MarkupToken[] = []
  // 优先级：变量 > 粗体 > 斜体（不支持嵌套，合同文本足够）
  const re = /(\{\{[^}]+\}\})|(\*\*[^*]+\*\*)|(\*[^*]+\*)/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) tokens.push({ type: 'text', content: line.slice(last, m.index) })
    if (m[1]) tokens.push({ type: 'variable', content: m[1].slice(2, -2) })
    else if (m[2]) tokens.push({ type: 'bold', content: m[2].slice(2, -2) })
    else if (m[3]) tokens.push({ type: 'italic', content: m[3].slice(1, -1) })
    last = m.index + m[0].length
  }
  if (last < line.length) tokens.push({ type: 'text', content: line.slice(last) })
  return tokens
}

export interface MarkupLine {
  heading: boolean
  tokens: MarkupToken[]
  /** 列表类型：ul=无序 ol=有序 null=非列表 */
  listType?: 'ul' | 'ol' | null
  /** 列表项内容（仅 listType 非 null 时有值） */
  listContent?: string
  /** 表格块（连续行首 | ≥2 行合并为一行结构；分隔行跳过）。tokens 保留原始行文本，未渲染 table 的调用方不丢内容 */
  table?: MarkupTable
}

/** markdown 表格块（与 reportPrintHtml 的 ReportPrintTable 同构） */
export interface MarkupTable {
  headers: string[]
  rows: string[][]
}

const UL_RE = /^[-*]\s+(.*)/
const OL_RE = /^\d+\.\s+(.*)/
/** 标题行：# ~ ####（全层级，井号不裸露） */
const HEADING_RE = /^(#{1,4}) /
/** 表格行（行首 |，允许行首空白） */
const TABLE_LINE_RE = /^\s*\|/

/** 表格行拆单元格：去首尾管道符，按 | 分列（与打印链 splitRowCells 同规则） */
function splitRowCells(line: string): string[] {
  let s = line.trim()
  if (s.startsWith('|')) s = s.slice(1)
  if (s.endsWith('|')) s = s.slice(0, -1)
  return s.split('|').map((c) => c.trim())
}

/** 分隔行（|---| / |:--:|）：所有单元格均为 -: 组合（与打印链同规则） */
function isSeparatorRow(cells: string[]): boolean {
  return cells.length > 0 && cells.every((c) => /^:?-+:?$/.test(c))
}

/** 单行 → 行结构（标题 / 列表 / 文本） */
function parseSingleLine(line: string): MarkupLine {
  const heading = HEADING_RE.test(line)
  if (heading) return { heading: true, tokens: tokenizeInline(line.replace(HEADING_RE, '')) }

  const ulMatch = UL_RE.exec(line)
  if (ulMatch) return { heading: false, tokens: [], listType: 'ul', listContent: ulMatch[1] }

  const olMatch = OL_RE.exec(line)
  if (olMatch) return { heading: false, tokens: [], listType: 'ol', listContent: olMatch[1] }

  return { heading: false, tokens: tokenizeInline(line) }
}

/** 连续表格行块 → 一行结构（首行 = 表头，分隔行跳过；tokens 留原始文本兜底） */
function parseTableLine(block: string[]): MarkupLine {
  const cells = block.map(splitRowCells)
  const [headers, ...rest] = cells
  return {
    heading: false,
    tokens: [{ type: 'text', content: block.join('\n') }],
    table: { headers, rows: rest.filter((c) => !isSeparatorRow(c)) },
  }
}

/** 全文 → 行结构（预览渲染用）；连续行首 | 的块（≥2 行）合并为表格行，孤行不成表 */
export function parseMarkup(text: string): MarkupLine[] {
  const lines = (text || '').split('\n')
  const out: MarkupLine[] = []
  let i = 0
  while (i < lines.length) {
    if (TABLE_LINE_RE.test(lines[i])) {
      const block: string[] = []
      let j = i
      while (j < lines.length && TABLE_LINE_RE.test(lines[j])) {
        block.push(lines[j])
        j++
      }
      if (block.length >= 2) {
        out.push(parseTableLine(block))
        i = j
        continue
      }
    }
    out.push(parseSingleLine(lines[i]))
    i++
  }
  return out
}
