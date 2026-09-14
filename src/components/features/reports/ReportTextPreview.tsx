/**
 * ReportTextPreview — 文本版预览渲染（blocks → 列表/标题/表格/段落）。
 * 与打印链 renderLines 同语义；从 ReportResultPanel 机械拆出（零逻辑改动），
 * 行内标记渲染口径与段落分支一致。
 */
import React from 'react'
import { tokenizeInline } from '@/utils/templateMarkup'
import { ReportCharts } from './ReportCharts'
import type { ReportPreviewBlock } from './ReportResultPanel'

/** 表格单元格行内标记渲染（与段落分支同规则：**粗体** / *斜体*） */
const renderCellInline = (text: string) =>
  tokenizeInline(text).map((t, j) =>
    t.type === 'bold' ? (
      <strong key={j} style={{ color: 'var(--fg)' }}>{t.content}</strong>
    ) : t.type === 'italic' ? (
      <em key={j}>{t.content}</em>
    ) : (
      <span key={j}>{t.content}</span>
    )
  )

interface ReportTextPreviewProps {
  blocks: ReportPreviewBlock[]
}

const ReportTextPreview: React.FC<ReportTextPreviewProps> = ({ blocks }) => {
  return (
    <>
      <div className="prose prose-sm max-w-none text-xs" style={{ color: 'var(--fg)' }}>
      {blocks.map((block, i) => {
        // 连续同类型列表块：<ul>/<ol> 包裹；行内标记经 tokenizeInline（bold/italic/text 三态，与段落分支同规则）
        if (block.kind === 'list') {
          return (
            <block.type
              key={i}
              className={block.type === 'ul' ? 'list-disc ml-4 my-1' : 'list-decimal ml-4 my-1'}
            >
              {block.items.map((item, j) => (
                <li key={j} style={{ color: 'var(--fg-2)' }}>
                  {tokenizeInline(item.listContent ?? '').map((t, k) =>
                    t.type === 'bold' ? (
                      <strong key={k} style={{ color: 'var(--fg)' }}>{t.content}</strong>
                    ) : t.type === 'italic' ? (
                      <em key={k}>{t.content}</em>
                    ) : (
                      <span key={k}>{t.content}</span>
                    )
                  )}
                </li>
              ))}
            </block.type>
          )
        }
        const line = block.line
        // 表格行：React 版细线表（表头小写字距 · 发丝行线 · 无竖线无色块，与打印链同观感）
        if (line.table) {
          return (
            <table key={i} className="my-2.5 w-full border-collapse">
              <thead>
                <tr>
                  {line.table.headers.map((h, j) => (
                    <th
                      key={j}
                      className="text-caption font-semibold uppercase tracking-wider text-left"
                      style={{
                        color: 'var(--muted)',
                        borderBottom: '1px solid var(--fg)',
                        padding: '6px 10px 5px',
                      }}
                    >
                      {renderCellInline(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {line.table.rows.map((row, r) => (
                  <tr key={r}>
                    {row.map((cell, c) => (
                      <td
                        key={c}
                        className="text-micro"
                        style={{
                          color: 'var(--fg-2)',
                          borderBottom: '1px solid var(--border)',
                          padding: '6px 10px',
                        }}
                      >
                        {renderCellInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )
        }
        // 引用行（"> " 已剥前缀）：弱化元信息行，不占结论句位
        if (line.quote) {
          return (
            <p key={i} className="mb-1 text-xs" style={{ color: 'var(--muted)' }}>
              {line.tokens.map((t, j) =>
                t.type === 'bold' ? (
                  <strong key={j}>{t.content}</strong>
                ) : t.type === 'italic' ? (
                  <em key={j}>{t.content}</em>
                ) : (
                  <span key={j}>{t.content}</span>
                )
              )}
            </p>
          )
        }
        if (line.heading) {
          const headingTokens = line.tokens.map((t, j) =>
            t.type === 'bold' ? (
              <strong key={j}>{t.content}</strong>
            ) : t.type === 'italic' ? (
              <em key={j}>{t.content}</em>
            ) : (
              <span key={j}>{t.content}</span>
            )
          )
          // 标题分层（与打印侧书脊/secthead/claim 三级对应）：1=报告大标题；2/3=节标题（既有样式）；4=子条小标题
          if (line.level === 1) {
            return (
              <h1 key={i} className="text-2xl font-black mt-1 mb-3" style={{ color: 'var(--fg)' }}>
                {headingTokens}
              </h1>
            )
          }
          if (line.level === 4) {
            return (
              <h4 key={i} className="text-xs font-bold mt-3 mb-1" style={{ color: 'var(--fg)' }}>
                {headingTokens}
              </h4>
            )
          }
          return (
            <h3
              key={i}
              className="text-sm font-bold mt-4 mb-2"
              style={{ color: 'var(--fg)' }}
            >
              {headingTokens}
            </h3>
          )
        }
        return (
          <p key={i} className="mb-1" style={{ color: 'var(--fg-2)' }}>
            {line.tokens.map((t, j) =>
              t.type === 'bold' ? (
                <strong key={j} style={{ color: 'var(--fg)' }}>
                  {t.content}
                </strong>
              ) : t.type === 'italic' ? (
                <em key={j}>{t.content}</em>
              ) : (
                <span key={j}>{t.content}</span>
              )
            )}
          </p>
        )
      })}
      </div>
      {/* 数据图表：仅预览态展示真实数据快照（编辑态/打印/复制不涉及） */}
      <ReportCharts />
    </>
  )
}

export default ReportTextPreview
