/**
 * KnowledgeSourceCard — 知识库检索来源卡片
 *
 * 在 Agent 对话中渲染 searchKnowledgeBase 工具结果。
 * 兼容普通 chat 和 SSE chat 的工具结果结构。
 *
 * 交互：点击来源卡片 → 导航到知识库页面并打开文档详情
 *
 * 安全：
 * - React 默认转义文本，不使用 dangerouslySetInnerHTML
 * - 不显示 created_by
 * - 不渲染 embedding
 * - 不把 tool result JSON 原样暴露
 */

import React, { useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { Badge } from '@/components/ui/Badge'
import { useMask } from '@/contexts/MaskContext'
import { maskKnowledgeText, getHitType, getHitTypeLabel, formatSpeakers } from '@/utils/knowledgeTextMask'

interface KnowledgeHitItem {
  documentId?: number
  chunkId?: number
  chunkIndex?: number
  title?: string
  docTitle?: string
  sourceType?: string
  sourceRef?: string
  projectId?: number
  occurredAt?: string
  speakers?: string
  text?: string
  relevance?: {
    ftsRank?: number | null
    semanticRank?: number | null
    rrfScore?: number | null
  }
  ftsRank?: number | null
  semanticRank?: number | null
}

interface KnowledgeSourceCardProps {
  result: unknown
}

const MAX_EXPANDED = 3

/** 点击来源卡片 → 导航到知识库页面并打开文档
 *  使用 sessionStorage 可靠传递 pendingDocId，避免页面尚未挂载时丢事件
 */
function handleOpenDocument(docId: number) {
  sessionStorage.setItem('knowledge:pendingDocId', String(docId))
  window.dispatchEvent(new CustomEvent('navigate', { detail: 'knowledge' }))
}

const KnowledgeSourceCard: React.FC<KnowledgeSourceCardProps> = ({ result }) => {
  const { masked } = useMask()
  const [expanded, setExpanded] = useState(false)

  const data = result as {
    success?: boolean
    query?: string
    totalHits?: number
    usedSemantic?: boolean
    hits?: KnowledgeHitItem[]
  } | null

  if (!data || !data.hits || data.hits.length === 0) {
    return (
      <div className="text-xs text-[color:var(--muted)] p-2">
        <p>知识库检索：无命中结果</p>
      </div>
    )
  }

  const hits = data.hits
  const shown = expanded ? hits : hits.slice(0, MAX_EXPANDED)

  return (
    <div className="space-y-2">
      {/* 头部 */}
      <div className="flex items-center gap-2 text-xs">
        <Icon name="Library" size={14} className="text-[color:var(--accent)]" />
        <span className="font-semibold text-[color:var(--fg-2)]">知识库检索</span>
        <span className="text-[color:var(--muted)]">·</span>
        <span className="text-[color:var(--muted)]">查询："{data.query}"</span>
        <Badge variant="primary" size="sm">{data.totalHits || hits.length} 条命中</Badge>
      </div>

      {/* 来源卡片 — 可点击打开文档 */}
      <div className="space-y-1.5">
        {shown.map((hit, i) => {
          const ftsRank = hit.relevance?.ftsRank ?? hit.ftsRank
          const semanticRank = hit.relevance?.semanticRank ?? hit.semanticRank
          const hitType = getHitType({ ftsRank, semanticRank })
          const title = hit.docTitle || hit.title || '未命名文档'
          const text = hit.text || ''
          const docId = hit.documentId

          return (
            <div
              key={hit.chunkId || i}
              className={`p-2.5 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] hover:border-[color:var(--accent)] hover:shadow-sm transition-[box-shadow,border-color] ${
                docId ? 'cursor-pointer' : ''
              }`}
              onClick={() => docId && handleOpenDocument(docId)}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-[color:var(--fg-2)] truncate flex-1">{title}</span>
                <Badge
                  variant={hitType === 'mixed' ? 'primary' : hitType === 'keyword' ? 'gray' : 'success'}
                  size="sm"
                >
                  {getHitTypeLabel(hitType)}
                </Badge>
              </div>
              <p className="text-xs text-[color:var(--muted)] line-clamp-2 break-words">
                {maskKnowledgeText(text, masked)}
              </p>
              <div className="flex items-center gap-2 mt-1 text-xs text-[color:var(--muted)]">
                {hit.sourceType && <span>{hit.sourceType}</span>}
                {hit.occurredAt && <span>· {hit.occurredAt}</span>}
                {hit.speakers && <span>· {formatSpeakers(hit.speakers)}</span>}
                {docId && <span className="ml-auto text-[color:var(--accent)]">点击查看 →</span>}
              </div>
            </div>
          )
        })}
      </div>

      {/* 展开/折叠 */}
      {hits.length > MAX_EXPANDED && (
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="text-xs text-[color:var(--accent)] hover:opacity-80 font-medium"
        >
          {expanded ? '收起' : `查看全部来源（共 ${hits.length} 条）`}
        </button>
      )}

      {/* 调试信息折叠区 */}
      <details className="text-xs text-[color:var(--muted)]">
        <summary className="cursor-pointer hover:text-[color:var(--muted)]">调试信息</summary>
        <div className="mt-1 space-y-0.5">
          {shown.map((hit, i) => (
            <div key={i} className="flex gap-2">
              <span>#{i + 1}</span>
              {hit.relevance?.ftsRank != null && <span>FTS rank: {hit.relevance.ftsRank}</span>}
              {hit.relevance?.semanticRank != null && <span>Semantic rank: {hit.relevance.semanticRank}</span>}
              {hit.relevance?.rrfScore != null && <span>RRF: {hit.relevance.rrfScore.toFixed(6)}</span>}
            </div>
          ))}
        </div>
      </details>
    </div>
  )
}

export default KnowledgeSourceCard
