/**
 * KnowledgeLibrary — 知识库 Tab
 *
 * 包含搜索 + 文档列表 + 文档详情抽屉
 */

import React, { useState, useCallback, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'
import { EmptyState } from '@/components/ui/EmptyState'
import { Pagination } from '@/components/ui/Pagination'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToastContext } from '@/hooks/useToast'
import { useMask } from '@/contexts/MaskContext'
import {
  knowledgeClient,
  type KnowledgeHit,
  type KnowledgeDocumentSummary,
  type KnowledgeDocumentDetail,
} from '@/services/knowledge-client'
import { maskKnowledgeText, getHitType, getHitTypeLabel, formatSpeakers } from '@/utils/knowledgeTextMask'
import KnowledgeDocumentDrawer from './KnowledgeDocumentDrawer'

interface KnowledgeLibraryProps {
  openDocId?: number | null
  onOpenDocIdConsumed?: () => void
}

const KnowledgeLibrary: React.FC<KnowledgeLibraryProps> = ({ openDocId, onOpenDocIdConsumed }) => {
  const { showToast } = useToastContext()
  const { masked } = useMask()

  // 搜索
  const [query, setQuery] = useState('')
  const [searchStatus, setSearchStatus] = useState<'idle' | 'searching' | 'done'>('idle')
  const [hits, setHits] = useState<KnowledgeHit[]>([])

  // 文档列表
  const [docs, setDocs] = useState<KnowledgeDocumentSummary[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [listLoading, setListLoading] = useState(false)
  const size = 10

  // 文档详情
  const [drawerDoc, setDrawerDoc] = useState<KnowledgeDocumentDetail | null>(null)
  const [drawerLoading, setDrawerLoading] = useState(false)

  // 删除确认
  const [deleteTarget, setDeleteTarget] = useState<KnowledgeDocumentSummary | null>(null)
  const [deleting, setDeleting] = useState(false)

  // 搜索 debounce
  const [debouncedQuery, setDebouncedQuery] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  // 执行搜索
  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setHits([])
      setSearchStatus('idle')
      return
    }
    setSearchStatus('searching')
    const res = await knowledgeClient.searchKnowledge(q.trim(), 10)
    setSearchStatus('done')
    if (res.success && res.data) {
      setHits(res.data.hits || [])
    } else {
      showToast(res.error || '搜索失败', 'error')
    }
  }, [showToast])

  useEffect(() => {
    doSearch(debouncedQuery)
  }, [debouncedQuery, doSearch])

  // 文档列表
  const fetchDocs = useCallback(async () => {
    setListLoading(true)
    const res = await knowledgeClient.listKnowledgeDocuments(page, size)
    setListLoading(false)
    if (res.success && res.data) {
      setDocs(res.data.data || [])
      setTotal(res.data.total || 0)
    }
  }, [page])

  useEffect(() => {
    fetchDocs()
  }, [fetchDocs])

  // 打开文档详情
  const openDocument = useCallback(async (docId: number) => {
    setDrawerLoading(true)
    setDrawerDoc(null)
    const res = await knowledgeClient.getKnowledgeDocument(docId)
    setDrawerLoading(false)
    if (res.success && res.data) {
      setDrawerDoc(res.data)
    } else {
      showToast(res.error || '获取文档详情失败', 'error')
    }
  }, [showToast])

  // 打开指定文档（从外部传入）
  useEffect(() => {
    if (openDocId != null) {
      openDocument(openDocId)
      onOpenDocIdConsumed?.()
    }
  }, [openDocId, openDocument, onOpenDocIdConsumed])

  // 删除
  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    setDeleting(true)
    const res = await knowledgeClient.deleteKnowledgeDocument(deleteTarget.id)
    setDeleting(false)
    if (res.success) {
      showToast('文档已删除', 'success')
      setDeleteTarget(null)
      fetchDocs()
      // 重新搜索
      if (debouncedQuery) doSearch(debouncedQuery)
    } else {
      showToast(res.error || '删除失败', 'error')
    }
  }, [deleteTarget, showToast, fetchDocs, debouncedQuery, doSearch])

  const handleSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    doSearch(query)
  }, [query, doSearch])

  return (
    <div className="space-y-6">
      {/* 搜索 */}
      <Card padding="md" shadow="sm">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="flex-1">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="输入关键词或自然语言搜索知识库..."
              leftIcon="Search"
            />
          </div>
          <Button type="submit" variant="primary" size="md" loading={searchStatus === 'searching'}>
            搜索
          </Button>
        </form>

        {/* 搜索结果 */}
        {searchStatus !== 'idle' && (
          <div className="mt-4">
            {searchStatus === 'searching' ? (
              <div className="flex items-center gap-2 text-sm text-[color:var(--muted)] py-4 justify-center">
                <Icon name="Loader2" size={16} className="animate-spin" />
                <span>搜索中...</span>
              </div>
            ) : hits.length === 0 ? (
              <EmptyState icon="Search" title="无搜索结果" description="尝试用不同的关键词搜索" />
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-[color:var(--muted)]">共 {hits.length} 条命中</p>
                {hits.map((hit, i) => {
                  const hitType = getHitType(hit)
                  return (
                    <div
                      key={i}
                      className="p-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] hover:border-[color:var(--accent)] hover:bg-[color:var(--accent-soft)] transition-colors cursor-pointer"
                      onClick={() => openDocument(hit.documentId)}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-[color:var(--fg-2)]">
                          {hit.docTitle || hit.title || '未命名文档'}
                        </span>
                        <Badge variant={hitType === 'mixed' ? 'primary' : hitType === 'keyword' ? 'gray' : 'success'} size="sm">
                          {getHitTypeLabel(hitType)}
                        </Badge>
                      </div>
                      <p className="text-xs text-[color:var(--muted)] line-clamp-2">
                        {maskKnowledgeText(hit.text, masked)}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-[color:var(--muted)]">
                        {hit.sourceType && <span>{hit.sourceType}</span>}
                        {hit.occurredAt && <span className="font-mono tabular-nums">{hit.occurredAt}</span>}
                        {hit.speakers && <span>说话人: {formatSpeakers(hit.speakers)}</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* 文档列表 */}
      <Card title="文档列表" padding="md" shadow="sm"
        extra={<Button variant="ghost" size="xs" onClick={fetchDocs} leftIcon="RefreshCw">刷新</Button>}
      >
        {listLoading ? (
          <div className="flex items-center gap-2 text-sm text-[color:var(--muted)] py-8 justify-center">
            <Icon name="Loader2" size={16} className="animate-spin" />
            <span>加载中...</span>
          </div>
        ) : docs.length === 0 ? (
          <EmptyState icon="Library" title="知识库为空" description="通过录音转写入库后会在这里显示" />
        ) : (
          <>
            <div className="space-y-2">
              {docs.map(doc => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] hover:bg-[color:var(--panel-2)] transition-colors"
                >
                  <Icon name="FileText" size={18} className="text-[color:var(--muted)] flex-shrink-0" />
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openDocument(doc.id)}>
                    <p className="text-sm font-medium text-[color:var(--fg-2)] truncate">{doc.title}</p>
                    <div className="flex items-center gap-3 text-xs text-[color:var(--muted)] mt-0.5">
                      {doc.sourceType && <span>{doc.sourceType}</span>}
                      {doc.occurredAt && <span>{doc.occurredAt}</span>}
                      {doc.chunkCount > 0 && <span>{doc.chunkCount} 块</span>}
                      <span>{doc.createdAt}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="xs" onClick={() => setDeleteTarget(doc)} iconOnly>
                    <Icon name="Trash2" size={14} className="text-danger-400" />
                  </Button>
                </div>
              ))}
            </div>
            {total > size && (
              <div className="mt-4 flex justify-center">
                <Pagination current={page} total={Math.ceil(total / size)} onChange={setPage} />
              </div>
            )}
          </>
        )}
      </Card>

      {/* 文档详情抽屉 */}
      <KnowledgeDocumentDrawer
        doc={drawerDoc}
        loading={drawerLoading}
        masked={masked}
        onClose={() => setDrawerDoc(null)}
      />

      {/* 删除确认 */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="删除文档"
        content={`确认删除文档「${deleteTarget?.title}」？此操作不可撤销。`}
        confirmText="删除"
        confirmVariant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}

export default KnowledgeLibrary
