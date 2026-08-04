/**
 * useConversationList — ConversationHistory 的状态与交互逻辑（R3.4 行为不变拆分）
 *
 * 从 ConversationHistory.tsx 提取：对话列表加载、删除/归档/取消归档/恢复、
 * 重命名（含取消/防重入）、搜索、日期分组。组件只保留布局与渲染。
 * 处理器体与原组件逐字一致，行为不变。
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
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

export type GroupKey = 'today' | 'yesterday' | 'earlier'

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

export function useConversationList(refreshTrigger: number = 0) {
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

  return {
    conversations, deletedConversations, loading,
    searchQuery, setSearchQuery,
    deleteTarget, setDeleteTarget, deleting,
    renamingId, setRenamingId, renameValue, setRenameValue,
    archivedOpen, setArchivedOpen, deletedOpen, setDeletedOpen,
    cancelRenameRef,
    loadConversations, handleDelete, handleArchive, handleUnarchive, handleRestore,
    startRename, commitRename,
    groupedOngoing, archivedItems, deletedItems, ongoingCount, isAllEmpty,
  }
}
