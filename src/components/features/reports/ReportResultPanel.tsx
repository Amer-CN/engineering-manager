import React, { useState, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { EASE_OUT } from '@/constants/animations'
import { Icon } from '@/components/ui/Icon'
import { parseMarkup, templateMarkupToPrintHtml } from '@/utils/templateMarkup'
import { ReportCharts } from './ReportCharts'

interface ReportResultPanelProps {
  markdown: string
  onUpdateMarkdown: (md: string) => void
}

/**
 * 报告结果面板 — 预览/编辑切换 + 复制/打印工具栏
 */
const ReportResultPanel: React.FC<ReportResultPanelProps> = ({ markdown, onUpdateMarkdown }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [copied, setCopied] = useState(false)

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

  const handlePrint = useCallback(() => {
    const html = templateMarkupToPrintHtml(markdown)
    const win = window.open('', '_blank')
    if (win) {
      const doc = win.document
      const styleEl = doc.createElement('style')
      styleEl.textContent = 'body{font-family:system-ui,sans-serif;padding:40px;color:#333;font-size:14px;line-height:1.6}'
      doc.head.appendChild(styleEl)
      const body = doc.createElement('div')
      body.innerHTML = html
      doc.body.appendChild(body)
      win.print()
    }
  }, [markdown])

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
        ) : (
          <>
            <div className="prose prose-sm max-w-none text-xs" style={{ color: 'var(--fg)' }}>
            {parsedLines.map((line, i) => {
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
