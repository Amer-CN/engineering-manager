/** ConversationHistory — 对话历史（右栏常驻/抽屉 + 搜索 + 删除 + 重命名 + 日期分组） */

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

const ConversationHistory: React.FC<ConversationHistoryProps> = ({
  currentConversationId, onSelectConversation, onNewConversation,
  open = false, onClose, inline = false, refreshTrigger = 0,
}) => {
  const [conversations, setConversations] = useState<AgentConversation[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<AgentConversation | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [renamingId, setRenamingId] = useState<number | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const committingRef = useRef(false)
  const cancelRenameRef = useRef(false)
  const toast = useToastStore()

  const loadConversations = useCallback(async () => {
    setLoading(true)
    try {
      const list = await getAgentConversations()
      setConversations(list)
    } catch { /* silent */ } finally { setLoading(false) }
  }, [])

  useEffect(() => { loadConversations() }, [loadConversations, refreshTrigger])

  const rollbackInsert = (target: AgentConversation) => {
    setConversations(prev => [...prev, target].sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()))
  }

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    setDeleting(true)
    const targetId = deleteTarget.id
    setConversations(prev => prev.filter(c => c.id !== targetId))
    try {
      const ok = await deleteAgentConversation(targetId)
      if (ok) { toast.success('对话已删除') }
      else { rollbackInsert(deleteTarget); toast.error('删除失败') }
    } catch { rollbackInsert(deleteTarget); toast.error('删除失败') }
    finally { setDeleting(false); setDeleteTarget(null) }
  }, [deleteTarget, toast])

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
      if (ok) { toast.success('已重命名') }
      else {
        setConversations(prev => prev.map(c => c.id === convId && prevTitle ? { ...c, title: prevTitle } : c))
        toast.error('重命名失败')
      }
    } catch {
      setConversations(prev => prev.map(c => c.id === convId && prevTitle ? { ...c, title: prevTitle } : c))
      toast.error('重命名失败')
    } finally { committingRef.current = false }
  }, [renameValue, conversations, toast])

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return conversations
    const q = searchQuery.toLowerCase()
    return conversations.filter(c =>
      (c.title || '').toLowerCase().includes(q) || (c.lastMessage || '').toLowerCase().includes(q))
  }, [conversations, searchQuery])

  const grouped = useMemo(() => {
    const map = new Map<GroupKey, AgentConversation[]>()
    for (const conv of filtered) {
      const key = getGroupKey(conv.updatedAt)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(conv)
    }
    return GROUP_ORDER.filter(k => map.has(k)).map(k => ({ key: k, label: GROUP_LABELS[k], items: map.get(k)! }))
  }, [filtered])

  const formatTime = (iso: string): string => {
    try {
      const d = new Date(iso)
      const isToday = d.toDateString() === new Date().toDateString()
      return isToday ? d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
        : d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
    } catch { return '' }
  }

  const truncate = (text: string | undefined, max = 32): string =>
    !text ? '' : text.length > max ? text.slice(0, max) + '…' : text

  // ── 渲染内容 ──
  const content = (
    <>
      <div className="px-3 pb-2">
        <div className="relative">
          <Icon name="Search" size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索对话..."
            className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-400/30 focus:border-primary-400 transition-all" />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
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
                <Icon name="Loader2" size={20} className="text-slate-300" />
              </motion.div>
            </div>
          ) : grouped.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Icon name="Inbox" size={32} className="text-slate-200 mb-2" />
              <p className="text-sm text-slate-400">{searchQuery ? '未找到匹配的对话' : '暂无对话记录'}</p>
              {!searchQuery && <p className="text-xs text-slate-300 mt-1">点击「新对话」开始</p>}
            </div>
          ) : (
            grouped.map(group => (
              <div key={group.key} className="mb-3">
                <p className="text-xs font-medium text-slate-400 px-2 py-1.5">{group.label}</p>
                <div className="space-y-0.5">
                  {group.items.map(conv => {
                    const isActive = currentConversationId === conv.id
                    const isRenaming = renamingId === conv.id
                    return (
                      <div key={conv.id}
                        className={`group relative rounded-xl transition-colors ${isActive ? 'bg-primary-50' : 'hover:bg-slate-50'}`}>
                        {isRenaming ? (
                          <input type="text" value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitRename(conv.id)
                              else if (e.key === 'Escape') {
                                cancelRenameRef.current = true; setRenamingId(null)
                              }
                            }}
                            onBlur={() => commitRename(conv.id)} autoFocus
                            className="w-full px-3 py-2.5 text-sm rounded-xl border border-primary-400 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-400/30" />
                        ) : (
                          <>
                            <button onClick={() => { onSelectConversation(conv); if (!inline) onClose?.() }}
                              className="w-full text-left px-3 py-2.5 pr-16">
                              <div className="flex items-start justify-between gap-2">
                                <p className={`text-sm font-medium truncate flex-1 ${isActive ? 'text-primary-700' : 'text-slate-700'}`}>
                                  {conv.title || `对话 ${conv.id}`}
                                </p>
                                <span className="text-xs text-slate-400 flex-shrink-0 mt-0.5">{formatTime(conv.updatedAt)}</span>
                              </div>
                              {conv.lastMessage && <p className="text-xs text-slate-400 mt-0.5 truncate">{truncate(conv.lastMessage)}</p>}
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-slate-300">{conv.messageCount} 条消息</span>
                              </div>
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); startRename(conv) }}
                              className="absolute right-9 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-300 hover:text-primary-500 hover:bg-primary-50 opacity-0 group-hover:opacity-100 transition-all"
                              title="重命名对话">
                              <Icon name="Edit3" size={14} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(conv) }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                              title="删除对话">
                              <Icon name="Trash2" size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </HoverScrollbar>
    </>
  )

  const confirmDialog = (
    <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
      title="删除对话"
      content={`确定要删除「${deleteTarget?.title || `对话 ${deleteTarget?.id}`}」吗？此操作无法撤销。`}
      confirmText="删除" confirmVariant="danger" loading={deleting} />
  )

  if (inline) {
    return (
      <div className="flex flex-col h-full bg-white border-l border-slate-100">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Icon name="Inbox" size={16} />对话历史
          </h3>
          <span className="text-xs text-slate-400">{conversations.length}</span>
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
            className="fixed inset-0 bg-black/20 z-40 lg:hidden" />
          <motion.aside initial={{ x: -320, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
            exit={{ x: -320, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="fixed top-0 left-0 bottom-0 w-80 bg-white border-r border-slate-200 z-50 flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Icon name="Inbox" size={16} />对话历史
              </h3>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
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
