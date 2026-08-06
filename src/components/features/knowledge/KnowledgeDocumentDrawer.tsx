/**
 * KnowledgeDocumentDrawer — 文档详情抽屉
 *
 * 使用右侧滑出 Drawer 显示文档完整内容。
 * React 默认转义文本，不使用 dangerouslySetInnerHTML。
 */

import React from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'
import { maskKnowledgeText, formatSpeakers } from '@/utils/knowledgeTextMask'
import type { KnowledgeDocumentDetail } from '@/services/knowledge-client'

interface KnowledgeDocumentDrawerProps {
  doc: KnowledgeDocumentDetail | null
  loading: boolean
  masked: boolean
  onClose: () => void
}

const KnowledgeDocumentDrawer: React.FC<KnowledgeDocumentDrawerProps> = ({ doc, loading, masked, onClose }) => {
  if (typeof document === 'undefined') return null

  // S31B Stitch: 问 AI 关于本文 — 预填提问并跳转 AI 助手
  const askAgentAboutDoc = () => {
    if (!doc) return
    sessionStorage.setItem('agent:prefill', `请在知识库中查询并总结文档《${doc.title}》的要点`)
    window.dispatchEvent(new CustomEvent('navigate', { detail: 'dashboard' }))
    window.dispatchEvent(new Event('agent:prefill'))
    onClose()
  }

  return createPortal(
    <AnimatePresence>
      {(doc || loading) && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/30 z-40"
            onClick={onClose}
          />

          {/* 抽屉 */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-xl bg-[color:var(--card)] z-50 flex flex-col shadow-xl"
          >
            {/* 头部 */}
            <div className="flex items-center justify-between gap-2 p-4 border-b border-[color:var(--border)]">
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-semibold text-[color:var(--fg)] truncate">
                  {loading ? '加载中...' : doc?.title || '文档详情'}
                </h2>
              </div>
              {/* S31B Stitch: 问 AI 关于本文入口 */}
              {doc && (
                <Button variant="secondary" size="xs" onClick={askAgentAboutDoc} leftIcon="Sparkles">
                  问 AI 关于本文
                </Button>
              )}
              <Button variant="ghost" size="xs" onClick={onClose} iconOnly>
                <Icon name="X" size={18} />
              </Button>
            </div>

            {/* 内容 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-[color:var(--muted)] py-8 justify-center">
                  <Icon name="Loader2" size={16} className="animate-spin" />
                  <span>加载中...</span>
                </div>
              ) : doc ? (
                <>
                  {/* 元信息 */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex gap-1.5">
                      <span className="text-[color:var(--muted)]">来源：</span>
                      <span className="text-[color:var(--fg-2)]">{doc.sourceType || '—'}</span>
                    </div>
                    <div className="flex gap-1.5">
                      <span className="text-[color:var(--muted)]">时间：</span>
                      <span className="text-[color:var(--fg-2)]">{doc.occurredAt || '—'}</span>
                    </div>
                    <div className="flex gap-1.5">
                      <span className="text-[color:var(--muted)]">项目ID：</span>
                      <span className="text-[color:var(--fg-2)]">{doc.projectId ?? '—'}</span>
                    </div>
                    <div className="flex gap-1.5">
                      <span className="text-[color:var(--muted)]">分块：</span>
                      <span className="text-[color:var(--fg-2)]">{doc.chunkCount} 块</span>
                    </div>
                  </div>

                  {doc.speakers && (
                    <div className="text-xs">
                      <span className="text-[color:var(--muted)]">说话人：</span>
                      <span className="text-[color:var(--fg-2)]">{formatSpeakers(doc.speakers)}</span>
                    </div>
                  )}

                  {doc.sourceRef && (
                    <div className="text-xs">
                      <Badge variant="gray" size="sm">来源：转写任务 #{doc.sourceRef}</Badge>
                    </div>
                  )}

                  {/* 全文 */}
                  <div>
                    <h3 className="text-sm font-medium text-[color:var(--fg-2)] mb-2">全文</h3>
                    <div className="text-sm text-[color:var(--fg-2)] whitespace-pre-wrap break-words p-3 bg-[color:var(--panel-2)] rounded-lg max-h-64 overflow-y-auto">
                      {maskKnowledgeText(doc.fullText, masked)}
                    </div>
                  </div>

                  {/* 分块 */}
                  {doc.chunks && doc.chunks.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-[color:var(--fg-2)] mb-2">分块内容</h3>
                      <div className="space-y-2">
                        {doc.chunks.map((chunk, i) => (
                          <div key={chunk.id || i} className="p-2 border border-[color:var(--border)] rounded text-xs">
                            <span className="text-[color:var(--muted)]">#{chunk.index}</span>
                            <p className="text-[color:var(--fg-2)] mt-1 whitespace-pre-wrap break-words">
                              {maskKnowledgeText(chunk.text, masked)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center text-sm text-[color:var(--muted)] py-8">文档不存在或无权访问</div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}

export default KnowledgeDocumentDrawer
