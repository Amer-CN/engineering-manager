import React, { useState, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { EASE_OUT } from '@/constants/animations'
import { Icon } from '@/components/ui/Icon'
import { parseMarkup, tokenizeInline } from '@/utils/templateMarkup'
import {
  parseReportMarkdown,
  buildReportPrintHtml,
  buildChartReportPrintHtml,
  type ReportPrintCharts,
} from '@/utils/reportPrintHtml'
import { parseChartReport } from '@/utils/chartReport'
import { ReportCharts, fetchReportChartsData } from './ReportCharts'
import ChartReportView from './ChartReportView'

interface ReportResultPanelProps {
  markdown: string
  onUpdateMarkdown: (md: string) => void
  /** 报告形式（Modal 生成时快照透传）：chart=图形版预览/打印走 R04 整页链路；缺省 text */
  format?: 'text' | 'chart'
}

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

/**
 * 报告结果面板 — 预览/编辑切换 + 复制/打印工具栏
 * 文本版（缺省）：markdown 段落流预览 + 打印附图链路（零改动）；
 * 图形版（format=chart）：预览渲染 ChartReportView（R04 整页），打印同版式静态 HTML。
 */
const ReportResultPanel: React.FC<ReportResultPanelProps> = ({ markdown, onUpdateMarkdown, format }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [copied, setCopied] = useState(false)
  const isChart = format === 'chart'

  const parsedLines = useMemo(() => parseMarkup(markdown), [markdown])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(markdown)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = markdown
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [markdown])

  const handlePrint = useCallback(async () => {
    // 先开窗保住用户手势上下文（异步拉数后再写入，避免弹窗拦截）
    const win = window.open('', '_blank')
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`

    // 图形版：数据完全来自 AI 数据段（不拉本地附图数据），解析后走 R04 同款整页打印
    if (isChart) {
      const data = parseChartReport(markdown)
      const html = buildChartReportPrintHtml(data, {
        productName: '工程管家',
        dataNote: 'AI 生成 · 图形版',
        source: '本地数据台账',
        takenAt: today,
        footerLeft: `${data.title || '运营报告'} · ${now.getFullYear()} 年 ${now.getMonth() + 1} 月`,
      })
      if (win) {
        win.document.write(html)
        win.document.close()
        win.print()
      }
      return
    }

    // markdown → 结构（##/### 分节；#/#### 井号处理；表格块；首段引言；无 ## 兜底单节），
    // 不改写 AI 内容
    const { title, sections } = parseReportMarkdown(markdown)
    // 附图数据：与预览 ReportCharts 同口径拉取（发票状态计数 / 支出分类 TOP）；
    // 失败则跳过图表区，打印页正文照常
    let charts: ReportPrintCharts | undefined
    try {
      const d = await fetchReportChartsData()
      if (d) {
        const invoiceTotal = d.statusSegments.reduce((s, x) => s + x.value, 0)
        charts = {
          waffle: {
            rows: d.statusSegments.map((s) => ({
              name: s.name,
              pct: invoiceTotal > 0 ? Math.round((s.value / invoiceTotal) * 100) : 0,
              color: s.color,
            })),
            total: invoiceTotal,
          },
          topBars: {
            rows: d.expenseTop.map((e) => ({ name: e.name, value: e.amount })),
            unit: '¥',
          },
        }
      }
    } catch (err) {
      console.error('[ReportResultPanel] 附图数据拉取失败:', err)
    }
    const html = buildReportPrintHtml(
      title ?? '运营报告',
      `AI 生成 · ${now.getFullYear()}`,
      sections,
      {
        productName: '工程管家',
        dataNote: `AI 生成报告 · ${today} 打印`,
        source: '本地数据台账',
        takenAt: today,
        footerLeft: `运营报告 · ${now.getFullYear()} 年 ${now.getMonth() + 1} 月`,
      },
      charts,
    )
    if (win) {
      win.document.write(html)
      win.document.close()
      win.print()
    }
  }, [markdown, isChart])

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: EASE_OUT }}
      className="rounded-xl border overflow-hidden"
      style={{ borderColor: 'var(--border)' }}
    >
      {/* 工具栏 */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b"
        style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
      >
        <div className="flex gap-1">
          <button
            onClick={() => setIsEditing(false)}
            className="px-2.5 py-1 rounded text-xs font-medium transition-colors"
            style={{
              background: !isEditing ? 'var(--fg)' : 'transparent',
              color: !isEditing ? 'var(--bg)' : 'var(--fg-2)',
            }}
          >
            预览
          </button>
          <button
            onClick={() => setIsEditing(true)}
            className="px-2.5 py-1 rounded text-xs font-medium transition-colors"
            style={{
              background: isEditing ? 'var(--fg)' : 'transparent',
              color: isEditing ? 'var(--bg)' : 'var(--fg-2)',
            }}
          >
            编辑
          </button>
        </div>
        <div className="flex gap-1">
          <button
            onClick={handleCopy}
            className="px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors"
            style={{ color: 'var(--fg-2)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--sidebar-item-hover)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <Icon name={copied ? 'Check' : 'Copy'} size={14} />
            {copied ? '已复制' : '复制'}
          </button>
          <button
            onClick={handlePrint}
            className="px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors"
            style={{ color: 'var(--fg-2)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--sidebar-item-hover)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <Icon name="Printer" size={14} />
            打印
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="p-4" style={{ background: 'var(--bg)' }}>
        {isEditing ? (
          <textarea
            value={markdown}
            onChange={(e) => onUpdateMarkdown(e.target.value)}
            className="w-full min-h-[300px] p-3 rounded-lg text-xs font-mono border resize-y"
            style={{
              borderColor: 'var(--border)',
              background: 'var(--panel)',
              color: 'var(--fg)',
            }}
          />
        ) : isChart ? (
          <ChartReportView markdown={markdown} />
        ) : (
          <>
            <div className="prose prose-sm max-w-none text-xs" style={{ color: 'var(--fg)' }}>
            {parsedLines.map((line, i) => {
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
              if (line.heading) {
                return (
                  <h3
                    key={i}
                    className="text-sm font-bold mt-4 mb-2"
                    style={{ color: 'var(--fg)' }}
                  >
                    {line.tokens.map((t, j) =>
                      t.type === 'bold' ? (
                        <strong key={j}>{t.content}</strong>
                      ) : t.type === 'italic' ? (
                        <em key={j}>{t.content}</em>
                      ) : (
                        <span key={j}>{t.content}</span>
                      )
                    )}
                  </h3>
                )
              }
              if (line.listType === 'ul') {
                return (
                  <li key={i} className="ml-4 list-disc" style={{ color: 'var(--fg-2)' }}>
                    {line.listContent}
                  </li>
                )
              }
              if (line.listType === 'ol') {
                return (
                  <li key={i} className="ml-4 list-decimal" style={{ color: 'var(--fg-2)' }}>
                    {line.listContent}
                  </li>
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
        )}
      </div>
    </motion.div>
  )
}

export default ReportResultPanel
