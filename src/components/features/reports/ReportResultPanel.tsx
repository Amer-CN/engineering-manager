import React, { useState, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { EASE_OUT } from '@/constants/animations'
import { Icon } from '@/components/ui/Icon'
import { parseMarkup, tokenizeInline, type MarkupLine } from '@/utils/templateMarkup'
import {
  parseReportMarkdown,
  buildReportPrintHtml,
  buildChartReportPrintHtml,
  type ReportPrintCharts,
} from '@/utils/reportPrintHtml'
import { parseChartReport, type ChartReportData } from '@/utils/chartReport'
import { buildTemplatePrintHtml, type ReportTemplateId, type TemplateReportData } from '@/utils/reportTemplates'
import { PRESETS } from '@/components/ui/charts/colorPresets'
import { ReportCharts, fetchReportChartsData } from './ReportCharts'
import ChartReportView from './ChartReportView'
import R01EvidenceView from './tpl/R01EvidenceView'; import R05WorkView from './tpl/R05WorkView'; import R12WeeklyView from './tpl/R12WeeklyView'
interface ReportResultPanelProps {
  markdown: string
  onUpdateMarkdown: (md: string) => void
  /** 报告形式（Modal 生成时快照透传）：chart=图形版预览/打印走模板链路；缺省 text */
  format?: 'text' | 'chart'
  /** 报告模板（Modal 生成时快照透传，由 purpose 映射）；缺省 'r04' */
  templateId?: string
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
 * 图形版模板数据装配（预览 tplData 与打印 collectTplCharts 共用同一口径）：
 * waffle/topBars/trend 来自各节 chart 块，bigNumbers 来自顶层「值得记住的数字」节；
 * 全空时返回 undefined（组件侧以 ?? [] 兜底）。
 */
const collectTplCharts = (d: ChartReportData) => {
  let waffle: { title: string; rows: { name: string; pct: number; color: string }[] } | undefined
  let topBars: { title: string; unit: string; rows: { name: string; value: number }[] } | undefined
  let trend: { title: string; unit: string; points: { x: string; y: number }[] } | undefined
  for (const s of d.sections) {
    const c = s.chart
    if (!c) continue
    if (c.kind === 'waffle' && c.rows && !waffle) {
      const total = c.rows.reduce((a, r) => a + r.value, 0)
      waffle = { title: c.title ?? '', rows: c.rows.map((r) => ({ name: r.name, pct: total > 0 ? Math.round((r.value / total) * 100) : 0, color: PRESETS.porcelain.hero })) }
    } else if (c.kind === 'bars' && c.rows && !topBars) {
      topBars = { title: c.title ?? '', unit: '¥', rows: c.rows.map((r) => ({ name: r.name, value: r.value })) }
    } else if (c.kind === 'trend' && c.points && !trend) {
      trend = { title: c.label ?? '', unit: '¥', points: c.points.map((pt) => ({ x: pt.x, y: pt.y })) }
    }
  }
  const bigNumbers = d.bigNumbers.map((b) => ({ value: b.value, label: b.label, sub: '' }))
  if (!waffle && !topBars && !trend && bigNumbers.length === 0) return undefined
  return { waffle, topBars, trend, bigNumbers }
}
/**
 * 报告结果面板 — 预览/编辑切换 + 复制/打印工具栏
 * 文本版（缺省）：markdown 段落流预览 + 打印附图链路（零改动）；
 * 图形版（format=chart）：预览渲染 ChartReportView（R04 整页），打印同版式静态 HTML。
 */
const ReportResultPanel: React.FC<ReportResultPanelProps> = ({ markdown, onUpdateMarkdown, format, templateId }) => {
  // templateId 由 Modal 快照透传（purpose→templateId 已在 ReportGeneratorModal 映射完成），
  // 此处只做白名单直通，不再二次映射（getTemplateId(purpose) 会把 'r01'/'r05'/'r12' 误落回 'r04'）
  const tpl: ReportTemplateId = templateId === 'r01' || templateId === 'r05' || templateId === 'r12' ? templateId : 'r04'
  const [isEditing, setIsEditing] = useState(false)
  const [copied, setCopied] = useState(false)
  const isChart = format === 'chart'
  // 图形版数据桥：parseChartReport(AI 数据段) → TemplateReportData（三新模板共用；与打印 collectTplCharts 同口径）。
  // 文本格式不消费 tplData：跳过 parseChartReport（白算且每次渲染打 chart 数据块缺失警告）
  const tplData = useMemo<TemplateReportData>(() => {
    if (!isChart) {
      return {
        title: '运营报告',
        period: '',
        meta: {
          product: '工程管家',
          generatedBy: 'AI 生成',
          dataSource: '本地数据台账',
          date: '',
        },
        sections: [],
      }
    }
    const data = parseChartReport(markdown)
    return {
      title: data.title || '运营报告',
      period: data.period || '',
      meta: {
        product: '工程管家',
        generatedBy: 'AI 生成',
        dataSource: '本地数据台账',
        date: new Date().toISOString().slice(0, 10),
      },
      sections: data.sections.map((sec) => ({ name: null, heading: sec.headline, lines: [...sec.bullets, ...sec.lines] })),
      charts: collectTplCharts(data),
    }
  }, [markdown, isChart])

  // 文本分支渲染单元：blockquote 引用行按弱化元信息行识别；连续同类型列表行合并为
  // list 块（镜像打印链 renderLines 的 closeList 口径：类型切换或非列表行时闭合）
  const parsedBlocks = useMemo(() => {
    const blocks: (
      | { kind: 'line'; line: MarkupLine }
      | { kind: 'list'; type: 'ul' | 'ol'; items: MarkupLine[] }
    )[] = []
    for (const line of parseMarkup(markdown, { blockquote: true })) {
      const last = blocks[blocks.length - 1]
      if (line.listType === 'ul' || line.listType === 'ol') {
        if (last?.kind === 'list' && last.type === line.listType) last.items.push(line)
        else blocks.push({ kind: 'list', type: line.listType, items: [line] })
      } else {
        blocks.push({ kind: 'line', line })
      }
    }
    return blocks
  }, [markdown])
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

    // 图形版：数据完全来自 AI 数据段（不拉本地附图数据），解析后走模板打印
    // 装配口径与预览 tplData 统一：collectTplCharts（waffle/topBars/trend 来自各节 chart 块，bigNumbers 来自顶层大数）
    if (isChart) {
      const data = parseChartReport(markdown)
      if (tpl !== 'r04') {
        // 新模板（r01/r05/r12）：走 reportTemplates 专属生成器
        const tplData: TemplateReportData = {
          title: data.title || '运营报告',
          period: data.period || '',
          meta: {
            product: '工程管家',
            generatedBy: 'AI 生成',
            dataSource: '本地数据台账',
            date: today,
          },
          sections: data.sections.map((s) => ({ name: null, heading: s.headline, lines: [...s.bullets, ...s.lines] })),
          charts: collectTplCharts(data),
        }
        const tplHtml = buildTemplatePrintHtml(tpl, tplData)
        if (win) {
          win.document.write(tplHtml)
          win.document.close()
          win.print()
        }
        return
      }
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

    // markdown → 结构（##/### 分节；#/#### 井号处理；> 引用行；表格块；首段引言；无 ## 兜底单节），
    // 不改写 AI 内容
    const { title, period, sections } = parseReportMarkdown(markdown)
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
      period ?? `AI 生成 · ${now.getFullYear()}`, // 书脊底部小字：解析出的真实期间，无则回退
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
  }, [markdown, isChart, tpl])

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
        ) : isChart && tpl === 'r01' ? (
          <R01EvidenceView data={tplData} />
        ) : isChart && tpl === 'r05' ? (
          <R05WorkView data={tplData} />
        ) : isChart && tpl === 'r12' ? (
          <R12WeeklyView data={tplData} />
        ) : isChart ? (
          <ChartReportView markdown={markdown} />
        ) : (
          <>
            <div className="prose prose-sm max-w-none text-xs" style={{ color: 'var(--fg)' }}>
            {parsedBlocks.map((block, i) => {
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
        )}
      </div>
    </motion.div>
  )
}

export default ReportResultPanel
