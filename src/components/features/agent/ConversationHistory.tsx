/** ConversationHistory — 对话历史（右栏常驻/抽屉 + 搜索 + 重命名 + 归档/取消归档 + 删除/恢复） */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@/components/ui/Icon'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { HoverScrollbar } from '@/components/ui/HoverScrollbar'
import { useToastStore } from '@/store/toastStore'
import {
  getAgentConversations,
  getDeletedAgentConversations,
  deleteAgentConversation,
  renameAgentConversation,
  archiveConversation,
  unarchiveConversation,
  restoreConversation,
} from '@/services/agent-client'
import type { AgentConversation } from '@/types/agent'
import { ConversationHistoryItem, CollapsibleSection } from './ConversationHistoryItem'
import type { ItemVariant } from './ConversationHistoryItem'

interface ConversationHistoryProps {
  currentConversationId?: number | null
  onSelectConversation: (conversation: AgentConversation) => void
  onNewConversation: () => void
  open?: boolean
  onClose?: () => void
  inline?: boolean
  refreshTrigger?: number
}

type GroupKey = 'today' | 'yesterday' | 'earlier'

function getGroupKey(iso: string): GroupKey {
  try {
    const d = new Date(iso)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today.getTime() - 86400000)
    if (d >= today) return 'today'
    if (d >= yesterday) return 'yesterday'
    return 'earlier'
  } catch {
    return 'earlier'
  }
}

const GROUP_LABELS: Record<GroupKey, string> = { today: '今天', yesterday: '昨天', earlier: '更早' }
const GROUP_ORDER: GroupKey[] = ['today', 'yesterday', 'earlier']

const isArchived = (c: AgentConversation): boolean => !!c.archivedAt

const ConversationHistory: React.FC<ConversationHistoryProps> = ({
  currentConversationId, onSelectConversation, onNewConversation,
  open = false, onClose, inline = false, refreshTrigger = 0,
}) => {
  const [conversations, setConversations] = useState<AgentConversation[]>([])
  const [deletedConversations, setDeletedConversations] = useState<AgentConversation[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<AgentConversation | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [renamingId, setRenamingId] = useState<number | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [archivedOpen, setArchivedOpen] = useState(false)
  const [deletedOpen, setDeletedOpen] = useState(false)
  const committingRef = useRef(false)
  const cancelRenameRef = useRef(false)
  const showToast = useToastStore(s => s.showToast)

  const loadConversations = useCallback(async () => {
    setLoading(true)
    try {
      const [active, deleted] = await Promise.all([
        getAgentConversations(),
        getDeletedAgentConversations(),
      ])
      setConversations(active)
      setDeletedConversations(deleted)
    } catch { /* silent */ } finally { setLoading(false) }
  }, [])

  useEffect(() => { loadConversations() }, [loadConversations, refreshTrigger])

  // ── 删除（软删除）：从进行中/已归档移除，乐观放入「最近删除」 ──
  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    setDeleting(true)
    const target = deleteTarget
    setConversations(prev => prev.filter(c => c.id !== target.id))
    try {
      const ok = await deleteAgentConversation(target.id)
      if (ok) {
        setDeletedConversations(prev => [
          { ...target, deletedAt: new Date().toISOString() }, ...prev,
        ])
        showToast('对话已删除', 'success')
      } else {
        setConversations(prev => [...prev, target])
        showToast('删除失败', 'error')
      }
    } catch {
      setConversations(prev => [...prev, target])
      showToast('删除失败', 'error')
    } finally { setDeleting(false); setDeleteTarget(null) }
  }, [deleteTarget, showToast])

  // ── 归档 ──
  const handleArchive = useCallback(async (conv: AgentConversation) => {
    const now = new Date().toISOString()
    setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, archivedAt: now } : c))
    try {
      const ok = await archiveConversation(conv.id)
      if (ok) { showToast('已归档', 'success') }
      else {
        setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, archivedAt: null } : c))
        showToast('归档失败', 'error')
      }
    } catch {
      setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, archivedAt: null } : c))
      showToast('归档失败', 'error')
    }
  }, [showToast])

  // ── 取消归档 ──
  const handleUnarchive = useCallback(async (conv: AgentConversation) => {
    const prevArchivedAt = conv.archivedAt
    setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, archivedAt: null } : c))
    try {
      const ok = await unarchiveConversation(conv.id)
      if (ok) { showToast('已取消归档', 'success') }
      else {
        setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, archivedAt: prevArchivedAt } : c))
        showToast('操作失败', 'error')
      }
    } catch {
      setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, archivedAt: prevArchivedAt } : c))
      showToast('操作失败', 'error')
    }
  }, [showToast])

  // ── 恢复（从最近删除还原） ──
  const handleRestore = useCallback(async (conv: AgentConversation) => {
    setDeletedConversations(prev => prev.filter(c => c.id !== conv.id))
    const restored: AgentConversation = { ...conv, deletedAt: null }
    setConversations(prev => [...prev, restored].sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()))
    try {
      const ok = await restoreConversation(conv.id)
      if (ok) { showToast('对话已恢复', 'success') }
      else {
        setConversations(prev => prev.filter(c => c.id !== conv.id))
        setDeletedConversations(prev => [conv, ...prev])
        showToast('恢复失败', 'error')
      }
    } catch {
      setConversations(prev => prev.filter(c => c.id !== conv.id))
      setDeletedConversations(prev => [conv, ...prev])
      showToast('恢复失败', 'error')
    }
  }, [showToast])

  const startRename = useCallback((conv: { id: number; title: string }) => {
    cancelRenameRef.current = false
    setRenamingId(conv.id); setRenameValue(conv.title)
  }, [])

  const commitRename = useCallback(async (convId: number) => {
    if (cancelRenameRef.current) { cancelRenameRef.current = false; return }
    if (committingRef.current) return
    committingRef.current = true
    const newTitle = renameValue.trim()
    const target = conversations.find(c => c.id === convId)
    if (!newTitle || (target && newTitle === target.title)) {
      setRenamingId(null); committingRef.current = false; return
    }
    const prevTitle = target?.title
    setConversations(prev => prev.map(c => c.id === convId ? { ...c, title: newTitle } : c))
    setRenamingId(null)
    try {
      const ok = await renameAgentConversation(convId, newTitle)
      if (ok) { showToast('已重命名', 'success') }
      else {
        setConversations(prev => prev.map(c => c.id === convId && prevTitle ? { ...c, title: prevTitle } : c))
        showToast('重命名失败', 'error')
      }
    } catch {
      setConversations(prev => prev.map(c => c.id === convId && prevTitle ? { ...c, title: prevTitle } : c))
      showToast('重命名失败', 'error')
    } finally { committingRef.current = false }
  }, [renameValue, conversations, showToast])

  const matchesQuery = useCallback((c: AgentConversation): boolean => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (c.title || '').toLowerCase().includes(q) || (c.lastMessage || '').toLowerCase().includes(q)
  }, [searchQuery])

  // 进行中（未归档）按日期分组
  const groupedOngoing = useMemo(() => {
    const ongoing = conversations.filter(c => !isArchived(c) && matchesQuery(c))
    const map = new Map<GroupKey, AgentConversation[]>()
    for (const conv of ongoing) {
      const key = getGroupKey(conv.updatedAt)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(conv)
    }
    return GROUP_ORDER.filter(k => map.has(k)).map(k => ({ key: k, label: GROUP_LABELS[k], items: map.get(k)! }))
  }, [conversations, matchesQuery])

  const archivedItems = useMemo(
    () => conversations.filter(c => isArchived(c) && matchesQuery(c)),
    [conversations, matchesQuery])

  const deletedItems = useMemo(
    () => deletedConversations.filter(matchesQuery),
    [deletedConversations, matchesQuery])

  const ongoingCount = groupedOngoing.reduce((n, g) => n + g.items.length, 0)
  const isAllEmpty = ongoingCount === 0 && archivedItems.length === 0 && deletedItems.length === 0

  /** 渲染单条会话行（传给 CollapsibleSection 的回调） */
  const renderItem = (conv: AgentConversation, variant: ItemVariant) => (
    <ConversationHistoryItem
      key={conv.id}
      conv={conv}
      variant={variant}
      currentConversationId={currentConversationId}
      renamingId={renamingId}
      renameValue={renameValue}
      cancelRenameRef={cancelRenameRef}
      setRenamingId={setRenamingId}
      setRenameValue={setRenameValue}
      commitRename={commitRename}
      onSelectConversation={onSelectConversation}
      onClose={onClose}
      inline={inline}
      startRename={startRename}
      handleArchive={handleArchive}
      handleUnarchive={handleUnarchive}
      handleRestore={handleRestore}
      setDeleteTarget={setDeleteTarget}
    />
  )

  // ── 渲染内容 ──
  const content = (
    <>
      <div className="px-3 pb-2">
        <div className="relative">
          <Icon name="Search" size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[color:var(--muted)]" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索对话..."
            className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--fg-2)] placeholder-[color:var(--muted)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-soft)] focus:border-[color:var(--accent)] transition-all" />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[color:var(--border-strong)] hover:text-[color:var(--muted)]">
              <Icon name="X" size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="px-3 pb-2">
        <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
          onClick={() => { onNewConversation(); if (!inline) onClose?.() }}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium shadow-sm transition-opacity"
          style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}>
          <Icon name="Plus" size={16} />新对话
        </motion.button>
      </div>

      <HoverScrollbar className="flex-1">
        <div className="px-2 pb-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                <Icon name="Loader2" size={20} className="text-[color:var(--border-strong)]" />
              </motion.div>
            </div>
          ) : isAllEmpty ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Icon name="Inbox" size={32} className="text-[color:var(--border-strong)] mb-2" />
              <p className="text-sm text-[color:var(--muted)]">{searchQuery ? '未找到匹配的对话' : '暂无对话记录'}</p>
              {!searchQuery && <p className="text-xs text-[color:var(--border-strong)] mt-1">点击「新对话」开始</p>}
            </div>
          ) : (
            <>
              {/* 进行中：按日期分组 */}
              {groupedOngoing.map(group => (
                <div key={group.key} className="mb-3">
                  <p className="text-xs font-medium text-[color:var(--muted)] px-2 py-1.5">{group.label}</p>
                  <div className="space-y-0.5">
                    {group.items.map(conv => renderItem(conv, 'active'))}
                  </div>
                </div>
              ))}

              {/* 已归档（可折叠） */}
              {archivedItems.length > 0 && (
                <CollapsibleSection
                  label="已归档" count={archivedItems.length}
                  isOpen={archivedOpen} onToggle={() => setArchivedOpen(o => !o)}
                  items={archivedItems} variant="archived" renderItem={renderItem} />
              )}

              {/* 最近删除（可折叠，可恢复） */}
              {deletedItems.length > 0 && (
                <CollapsibleSection
                  label="最近删除" count={deletedItems.length}
                  isOpen={deletedOpen} onToggle={() => setDeletedOpen(o => !o)}
                  items={deletedItems} variant="deleted" renderItem={renderItem} />
              )}
            </>
          )}
        </div>
      </HoverScrollbar>
    </>
  )

  const confirmDialog = (
    <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
      title="删除对话"
      content={`确定要删除「${deleteTarget?.title || `对话 ${deleteTarget?.id}`}」吗？删除后可在「最近删除」中恢复。`}
      confirmText="删除" confirmVariant="danger" loading={deleting} />
  )

  if (inline) {
    return (
      <div className="flex flex-col h-full bg-[color:var(--card)] border-l border-[color:var(--border)]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[color:var(--border)]">
          <h3 className="text-sm font-semibold text-[color:var(--fg-2)] flex items-center gap-2">
            <Icon name="Inbox" size={16} />对话历史
          </h3>
          <span className="text-xs text-[color:var(--muted)]">{conversations.length}</span>
        </div>
        {content}
        {confirmDialog}
      </div>
    )
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }} onClick={onClose}
            className="fixed inset-0 bg-black/20 z-40" />
          <motion.aside initial={{ x: -320, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
            exit={{ x: -320, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="fixed top-0 left-0 bottom-0 w-80 bg-[color:var(--card)] border-r border-[color:var(--border)] z-50 flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[color:var(--border)]">
              <h3 className="text-sm font-semibold text-[color:var(--fg-2)] flex items-center gap-2">
                <Icon name="Inbox" size={16} />对话历史
              </h3>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[color:var(--panel-2)] text-[color:var(--muted)] transition-colors">
                <Icon name="X" size={18} />
              </button>
            </div>
            {content}
            {confirmDialog}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

export default ConversationHistory
