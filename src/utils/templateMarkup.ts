/**
 * templateMarkup.ts — 合同模板轻量标记转换器（M-S29B 富文本）
 *
 * 支持的 Markdown 子集（S29 编辑器工具条对应）：
 * - **粗体**
 * - *斜体*
 * - 行首 "## " 条款标题
 * - {{变量}} 占位符（由调用方决定渲染为徽章或替换为值）
 *
 * 三端共享：编辑器预览（React 节点）与打印（HTML 字符串，全程先转义防注入）。
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

/**
 * 模板正文 → 打印 HTML（不处理 {{变量}}，替换值由调用方先行完成并传入）。
 * 段落规则与旧打印一致：每行一个 <p>（首行缩进 2em）；"## " 行渲染为条款标题。
 */
export function templateMarkupToPrintHtml(text: string): string {
  return (text || '')
    .split('\n')
    .map(line => {
      const escaped = escapeHtml(line)
      if (/^## /.test(line)) {
        return `<p style="font-weight: bold; margin: 16px 0 6px;">${inlineToHtml(escaped.slice(3))}</p>`
      }
      return `<p style="text-indent: 2em; margin: 10px 0;">${inlineToHtml(escaped)}</p>`
    })
    .join('')
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
}

/** 全文 → 行结构（预览渲染用） */
export function parseMarkup(text: string): MarkupLine[] {
  return (text || '').split('\n').map(line => {
    const heading = /^## /.test(line)
    return { heading, tokens: tokenizeInline(heading ? line.slice(3) : line) }
  })
}
