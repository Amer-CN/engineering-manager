/** ConversationHistory — 对话历史（右栏常驻/抽屉 + 搜索 + 重命名 + 删除（确认后软删除）+ 置顶 + 批量管理）
 *  分组纯逻辑在 conversationGrouping.ts（CI 行数门禁拆分） */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@/components/ui/Icon'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { HoverScrollbar } from '@/components/ui/HoverScrollbar'
import { useToastStore } from '@/store/toastStore'
import {
  getAgentConversations,
  deleteAgentConversation,
  renameAgentConversation,
} from '@/services/agent-client'
import type { AgentConversation } from '@/types/agent'
import { getPinnedConversationIds, setPinnedConversationIds } from '@/utils/conversationPins'
import { buildConversationGroups } from './conversationGrouping'
import { ConversationHistoryItem } from './ConversationHistoryItem'
import ConversationListBody from './ConversationListBody'
import BatchActionBar from './BatchActionBar'

interface ConversationHistoryProps {
  currentConversationId?: number | null
  onSelectConversation: (conversation: AgentConversation) => void
  onNewConversation: () => void
  /** 删除的会话正是当前打开的会话时触发（父组件据此重置会话流，避免继续发送写入已删除会话） */
  onCurrentConversationDeleted?: () => void
  open?: boolean
  onClose?: () => void
  inline?: boolean
  refreshTrigger?: number
}

const ConversationHistory: React.FC<ConversationHistoryProps> = ({
  currentConversationId, onSelectConversation, onNewConversation, onCurrentConversationDeleted,
  open = false, onClose, inline = false, refreshTrigger = 0,
}) => {
  const [conversations, setConversations] = useState<AgentConversation[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<AgentConversation | null>(null)
  const [batchDeleteTargets, setBatchDeleteTargets] = useState<AgentConversation[] | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [renamingId, setRenamingId] = useState<number | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [batchMode, setBatchMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [pinnedIds, setPinnedIds] = useState<number[]>(() => getPinnedConversationIds())
  const committingRef = useRef(false)
  const cancelRenameRef = useRef(false)
  const showToast = useToastStore(s => s.showToast)

  const loadConversations = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    try {
      setConversations(await getAgentConversations())
    } catch {
      setLoadError(true)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { loadConversations() }, [loadConversations, refreshTrigger])

  // ── 删除（ConfirmDialog 确认后软删除）：从列表乐观移除 ──
  const handleDelete = useCallback(async () => {
    const targets = batchDeleteTargets ?? (deleteTarget ? [deleteTarget] : [])
    if (targets.length === 0) return
    setDeleting(true)
    const ids = new Set(targets.map(t => t.id))
    setConversations(prev => prev.filter(c => !ids.has(c.id)))
    try {
      await Promise.all(targets.map(t => deleteAgentConversation(t.id)))
      showToast(`已删除 ${targets.length} 个对话`, 'success')
      // 删除的正是当前打开的会话 → 重置会话流，避免继续发送写入已删除会话（黑洞）
      if (currentConversationId != null && ids.has(currentConversationId)) onCurrentConversationDeleted?.()
    } catch {
      setConversations(prev => [...prev, ...targets])
      showToast('删除失败', 'error')
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
      setBatchDeleteTargets(null)
      setSelectedIds(new Set())
    }
  }, [deleteTarget, batchDeleteTargets, showToast, currentConversationId, onCurrentConversationDeleted])

  // ── 置顶/取消置顶（localStorage 持久化） ──
  const handleTogglePin = useCallback((conv: AgentConversation) => {
    setPinnedIds(prev => {
      const next = prev.includes(conv.id) ? prev.filter(id => id !== conv.id) : [...prev, conv.id]
      setPinnedConversationIds(next)
      return next
    })
  }, [])

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

  const pinnedSet = useMemo(() => new Set(pinnedIds), [pinnedIds])

  // 两组数据（置顶 / 进行中按日期分档）——纯逻辑在 conversationGrouping.ts
  const { pinnedItems, groupedOngoing, isAllEmpty } = useMemo(
    () => buildConversationGroups(conversations, pinnedSet, matchesQuery),
    [conversations, pinnedSet, matchesQuery],
  )

  // ── 批量模式 ──
  const enterBatchMode = useCallback(() => {
    setBatchMode(true)
    setSelectedIds(new Set())
  }, [])

  const exitBatchMode = useCallback(() => {
    setBatchMode(false)
    setSelectedIds(new Set())
  }, [])

  const toggleCheck = useCallback((id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleBatchDelete = useCallback(() => {
    const targets = conversations.filter(c => selectedIds.has(c.id))
    if (targets.length === 0) return
    setBatchDeleteTargets(targets)
  }, [conversations, selectedIds])

  /** 渲染单条会话行（传给分组的回调） */
  const renderItem = (conv: AgentConversation) => (
    <ConversationHistoryItem
      key={conv.id}
      conv={conv}
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
      setDeleteTarget={setDeleteTarget}
      batchMode={batchMode}
      checked={selectedIds.has(conv.id)}
      onToggleCheck={toggleCheck}
      pinned={pinnedSet.has(conv.id)}
      onTogglePin={handleTogglePin}
    />
  )

  // ── 渲染内容 ──
  const content = (
    <>
      <div className="px-3 pt-3 pb-2">
        <div className="relative">
          <Icon name="Search" size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[color:var(--muted)]" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索对话..."
            className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--fg-2)] placeholder-[color:var(--muted)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-soft)] focus:border-[color:var(--accent)] transition-[box-shadow,border-color]" />
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
        {!batchMode && (
          <button onClick={enterBatchMode}
            className="mt-2 flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs text-[color:var(--muted)] hover:text-[color:var(--fg-2)] hover:bg-[color:var(--panel-2)] transition-colors"
            title="批量管理对话">
            <Icon name="SquareCheck" size={14} />多选
          </button>
        )}
      </div>

      <HoverScrollbar className="flex-1">
        <div className="px-2 pb-4">
          <ConversationListBody
            groups={{ pinnedItems, groupedOngoing, isAllEmpty }}
            loading={loading}
            loadError={loadError}
            searchQuery={searchQuery}
            onRetry={loadConversations}
            renderItem={renderItem}
          />
        </div>
      </HoverScrollbar>

      {/* 批量模式底部操作条 */}
      {batchMode && (
        <BatchActionBar
          selectedCount={selectedIds.size}
          onBatchDelete={handleBatchDelete}
          onExit={exitBatchMode}
        />
      )}
    </>
  )

  const confirmDialog = batchDeleteTargets ? (
    <ConfirmDialog isOpen onClose={() => setBatchDeleteTargets(null)} onConfirm={handleDelete}
      title="批量删除对话"
      content={`确定要删除所选的 ${batchDeleteTargets.length} 个对话吗？删除后 ${batchDeleteTargets.length} 个对话及其消息将无法恢复。`}
      confirmText="删除" confirmVariant="danger" loading={deleting} />
  ) : (
    <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
      title="删除对话"
      content={`确定要删除「${deleteTarget?.title || `对话 ${deleteTarget?.id}`}」吗？删除后该对话及其消息将无法恢复。`}
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
          <motion.aside initial={{ x: 320, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="fixed top-9 right-0 bottom-6 w-80 bg-[color:var(--card)] border-l border-[color:var(--border)] z-50 flex flex-col shadow-xl">
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
