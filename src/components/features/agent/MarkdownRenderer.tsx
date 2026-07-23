/**
 * MarkdownRenderer — 轻量 Markdown 渲染器（输出 React 元素）
 *
 * 设计原则（与代码库约定一致）：
 *  - 不使用 dangerouslySetInnerHTML，全部输出 React 节点，天然免疫 XSS
 *  - 零新依赖，自带块级 + 行内两级解析
 *  - 配色走主题 token（primary-* / slate-*），跟随三主题
 *
 * 支持：标题、粗体、斜体、删除线、行内代码、围栏代码块、
 *       有序/无序列表（含一层嵌套）、GFM 表格、引用、分割线、链接。
 * 链接：仅放行 http(s)/mailto，点击拦截默认导航（避免 WebView2 内整页跳转）。
 */

import React, { useMemo } from 'react'

// ═══════════════════════════════════════════════════════════════
// 行内解析
// ═══════════════════════════════════════════════════════════════

/** 校验链接协议，非白名单返回 null（则按纯文本渲染） */
function safeHref(url: string): string | null {
  const trimmed = url.trim()
  return /^(https?:\/\/|mailto:)/i.test(trimmed) ? trimmed : null
}

/** 桌面环境下拦截链接导航，改为尝试外部打开，避免替换掉 SPA */
function handleLinkClick(e: React.MouseEvent<HTMLAnchorElement>) {
  e.preventDefault()
  const href = e.currentTarget.getAttribute('href')
  if (!href) return
  try { window.open(href, '_blank', 'noopener,noreferrer') } catch { /* no-op */ }
}

interface InlineRule {
  type: 'code' | 'bold' | 'strike' | 'italic' | 'link'
  re: RegExp
}

// 顺序即优先级：先 code（内容不再二次解析），再强调，最后链接/斜体
const INLINE_RULES: InlineRule[] = [
  { type: 'code', re: /`([^`]+)`/ },
  { type: 'bold', re: /\*\*([^*]+?)\*\*|__([^_]+?)__/ },
  { type: 'strike', re: /~~([^~]+?)~~/ },
  { type: 'link', re: /\[([^\]]+)\]\(([^)\s]+)\)/ },
  { type: 'italic', re: /\*([^*\n]+?)\*/ },
]

/** 解析行内格式，返回 React 节点数组 */
export function parseInline(text: string, keyPrefix = ''): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  let rest = text
  let counter = 0

  while (rest.length > 0) {
    let best: { rule: InlineRule; match: RegExpExecArray } | null = null
    for (const rule of INLINE_RULES) {
      const m = rule.re.exec(rest)
      if (m && (best === null || m.index < best.match.index)) {
        best = { rule, match: m }
      }
    }

    if (!best) { nodes.push(rest); break }

    const { rule, match } = best
    if (match.index > 0) nodes.push(rest.slice(0, match.index))

    const key = `${keyPrefix}-${counter++}`
    switch (rule.type) {
      case 'code':
        nodes.push(
          <code key={key} className="px-1 py-0.5 rounded bg-slate-100 text-primary-700 font-mono text-xs">
            {match[1]}
          </code>,
        )
        break
      case 'bold':
        nodes.push(<strong key={key} className="font-semibold">{parseInline(match[1] ?? match[2] ?? '', key)}</strong>)
        break
      case 'strike':
        nodes.push(<del key={key} className="text-slate-400">{parseInline(match[1], key)}</del>)
        break
      case 'italic':
        nodes.push(<em key={key}>{parseInline(match[1], key)}</em>)
        break
      case 'link': {
        const href = safeHref(match[2])
        if (href) {
          nodes.push(
            <a
              key={key}
              href={href}
              onClick={handleLinkClick}
              className="text-primary-600 underline underline-offset-2 hover:text-primary-700 break-all"
            >
              {parseInline(match[1], key)}
            </a>,
          )
        } else {
          nodes.push(match[0])
        }
        break
      }
    }
    rest = rest.slice(match.index + match[0].length)
  }

  return nodes
}

// ═══════════════════════════════════════════════════════════════
// 块级解析
// ═══════════════════════════════════════════════════════════════

interface ListItemLine { indent: number; ordered: boolean; content: string }

function matchListItem(line: string): ListItemLine | null {
  const ul = /^(\s*)[-*+]\s+(.*)$/.exec(line)
  if (ul) return { indent: ul[1].length, ordered: false, content: ul[2] }
  const ol = /^(\s*)\d+\.\s+(.*)$/.exec(line)
  if (ol) return { indent: ol[1].length, ordered: true, content: ol[2] }
  return null
}

/** 递归构建（支持嵌套）列表；返回节点与消费到的下标 */
function buildList(items: ListItemLine[], pos: number, indent: number, keyPrefix: string): [React.ReactNode, number] {
  const ordered = items[pos].ordered
  const lis: React.ReactNode[] = []
  let i = pos
  while (i < items.length && items[i].indent >= indent) {
    if (items[i].indent > indent) break // 交给上层（理论不会命中）
    const item = items[i]
    const key = `${keyPrefix}-li${i}`
    let children: React.ReactNode = null
    i++
    if (i < items.length && items[i].indent > indent) {
      const [sub, next] = buildList(items, i, items[i].indent, key)
      children = sub
      i = next
    }
    lis.push(<li key={key} className="leading-relaxed">{parseInline(item.content, key)}{children}</li>)
  }
  const Tag = ordered ? 'ol' : 'ul'
  const cls = ordered
    ? 'list-decimal pl-5 space-y-0.5 my-1'
    : 'list-disc pl-5 space-y-0.5 my-1'
  return [<Tag key={`${keyPrefix}-list${pos}`} className={cls}>{lis}</Tag>, i]
}

function isTableSeparator(line: string): boolean {
  return line.includes('-') && /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?\s*$/.test(line)
}

function splitTableRow(line: string): string[] {
  let s = line.trim()
  if (s.startsWith('|')) s = s.slice(1)
  if (s.endsWith('|')) s = s.slice(0, -1)
  return s.split('|').map(c => c.trim())
}

/** 解析整段文本为块级 React 节点 */
export function parseBlocks(input: string): React.ReactNode[] {
  const LF = String.fromCharCode(10)
  const CR = String.fromCharCode(13)
  const lines = input.split(CR + LF).join(LF).split(CR).join(LF).split(LF)
  const blocks: React.ReactNode[] = []
  let i = 0
  let key = 0

  while (i < lines.length) {
    const line = lines[i]

    // 空行
    if (line.trim() === '') { i++; continue }

    // 围栏代码块
    const fence = /^```(.*)$/.exec(line)
    if (fence) {
      const codeLines: string[] = []
      i++
      while (i < lines.length && !/^```\s*$/.test(lines[i])) { codeLines.push(lines[i]); i++ }
      i++ // 跳过结束围栏
      blocks.push(
        <pre key={`b${key++}`} className="my-2 p-3 rounded-lg bg-slate-800 text-slate-100 text-xs font-mono overflow-x-auto">
          <code>{codeLines.join('\n')}</code>
        </pre>,
      )
      continue
    }

    // 标题
    const heading = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line)
    if (heading) {
      const level = heading[1].length
      const big = level <= 2
      blocks.push(
        <p key={`b${key++}`} className={`${big ? 'text-base' : 'text-sm'} font-semibold text-slate-800 mt-2 mb-1`}>
          {parseInline(heading[2], `b${key}`)}
        </p>,
      )
      i++
      continue
    }

    // 分割线
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
      blocks.push(<hr key={`b${key++}`} className="my-3 border-slate-200" />)
      i++
      continue
    }

    // 表格：当前行含 | 且下一行是分隔行
    if (line.includes('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const header = splitTableRow(line)
      i += 2 // 跳过表头 + 分隔行
      const rows: string[][] = []
      while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') {
        rows.push(splitTableRow(lines[i]))
        i++
      }
      const kb = key++
      blocks.push(
        <div key={`b${kb}`} className="my-2 overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                {header.map((h, hi) => (
                  <th key={hi} className="py-1.5 px-2 font-medium whitespace-nowrap">{parseInline(h, `b${kb}h${hi}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri} className="border-b border-slate-100 last:border-0">
                  {header.map((_, ci) => (
                    <td key={ci} className="py-1.5 px-2 text-slate-700 align-top">{parseInline(r[ci] ?? '', `b${kb}r${ri}c${ci}`)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      )
      continue
    }

    // 引用
    if (/^>\s?/.test(line)) {
      const quote: string[] = []
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^>\s?/, ''))
        i++
      }
      blocks.push(
        <blockquote key={`b${key++}`} className="my-2 pl-3 border-l-2 border-slate-300 text-slate-500 italic">
          {parseInline(quote.join(' '), `b${key}`)}
        </blockquote>,
      )
      continue
    }

    // 列表
    if (matchListItem(line)) {
      const items: ListItemLine[] = []
      while (i < lines.length) {
        const info = matchListItem(lines[i])
        if (!info) break
        items.push(info)
        i++
      }
      const [node] = buildList(items, 0, items[0].indent, `b${key++}`)
      blocks.push(node)
      continue
    }

    // 段落：收集连续的普通行
    const para: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^```/.test(lines[i]) &&
      !/^(#{1,6})\s+/.test(lines[i]) &&
      !/^>\s?/.test(lines[i]) &&
      !matchListItem(lines[i]) &&
      !(lines[i].includes('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1]))
    ) {
      para.push(lines[i])
      i++
    }
    const kb = key++
    blocks.push(
      <p key={`b${kb}`} className="leading-relaxed break-words">
        {para.map((pl, pi) => (
          <React.Fragment key={pi}>
            {pi > 0 && <br />}
            {parseInline(pl, `b${kb}p${pi}`)}
          </React.Fragment>
        ))}
      </p>,
    )
  }

  return blocks
}

// ═══════════════════════════════════════════════════════════════
// 组件
// ═══════════════════════════════════════════════════════════════

interface MarkdownRendererProps {
  content: string
  className?: string
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
  const blocks = useMemo(() => parseBlocks(content), [content])
  return <div className={`space-y-1 ${className ?? ''}`}>{blocks}</div>
}

export default MarkdownRenderer
