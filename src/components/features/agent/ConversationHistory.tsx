/**
 * ConversationHistory — 对话历史（改造：右栏常驻 + 搜索 + 删除 + 日期分组）
 *
 * 支持两种模式:
 * - inline=true: 右栏常驻面板（桌面 ≥lg）
 * - inline=false + open=true: 滑出抽屉（移动端 <lg）
 *
 * 搜索：客户端 filter title/lastMessage
 * 分组：今天 / 昨天 / 更早
 * 删除：乐观更新 + Toast + ConfirmDialog
 * 重命名本批不做（留第二批）
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@/components/ui/Icon'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { HoverScrollbar } from '@/components/ui/HoverScrollbar'
import { useToastStore } from '@/store/toastStore'
import {
  getAgentConversations,
  deleteAgentConversation,
} from '@/services/agent-client'
import type { AgentConversation } from '@/types/agent'

interface ConversationHistoryProps {
  /** 当前对话 ID（高亮） */
  currentConversationId?: number | null
  /** 选择对话回调 */
  onSelectConversation: (conversation: AgentConversation) => void
  /** 新建对话回调 */
  onNewConversation: () => void
  /** 抽屉模式：是否打开 */
  open?: boolean
  /** 抽屉模式：关闭回调 */
  onClose?: () => void
  /** 内联模式（右栏常驻） */
  inline?: boolean
  /** 刷新触发器（父组件发送消息后递增以刷新列表） */
  refreshTrigger?: number
}

/** 日期分组 */
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

const GROUP_LABELS: Record<GroupKey, string> = {
  today: '今天',
  yesterday: '昨天',
  earlier: '更早',
}

const GROUP_ORDER: GroupKey[] = ['today', 'yesterday', 'earlier']

const ConversationHistory: React.FC<ConversationHistoryProps> = ({
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  open = false,
  onClose,
  inline = false,
  refreshTrigger = 0,
}) => {
  const [conversations, setConversations] = useState<AgentConversation[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<AgentConversation | null>(null)
  const [deleting, setDeleting] = useState(false)
  const toast = useToastStore()

  /** 加载对话列表 */
  const loadConversations = useCallback(async () => {
    setLoading(true)
    try {
      const list = await getAgentConversations()
      setConversations(list)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadConversations()
  }, [loadConversations, refreshTrigger])

  /** 删除对话 */
  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    setDeleting(true)
    // 乐观更新
    const targetId = deleteTarget.id
    setConversations(prev => prev.filter(c => c.id !== targetId))
    try {
      const ok = await deleteAgentConversation(targetId)
      if (ok) {
        toast.success('对话已删除')
      } else {
        // 回滚
        setConversations(prev => [...prev, deleteTarget].sort((a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        ))
        toast.error('删除失败')
      }
    } catch {
      setConversations(prev => [...prev, deleteTarget].sort((a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      ))
      toast.error('删除失败')
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }, [deleteTarget, toast])

  /** 搜索过滤 */
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return conversations
    const q = searchQuery.toLowerCase()
    return conversations.filter(
      c =>
        (c.title || '').toLowerCase().includes(q) ||
        (c.lastMessage || '').toLowerCase().includes(q),
    )
  }, [conversations, searchQuery])

  /** 分组 */
  const grouped = useMemo(() => {
    const map = new Map<GroupKey, AgentConversation[]>()
    for (const conv of filtered) {
      const key = getGroupKey(conv.updatedAt)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(conv)
    }
    return GROUP_ORDER
      .filter(k => map.has(k))
      .map(k => ({ key: k, label: GROUP_LABELS[k], items: map.get(k)! }))
  }, [filtered])

  /** 格式化时间 */
  const formatTime = (iso: string): string => {
    try {
      const d = new Date(iso)
      const now = new Date()
      const isToday = d.toDateString() === now.toDateString()
      if (isToday) {
        return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      }
      return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
    } catch {
      return ''
    }
  }

  /** 截断最后一条消息预览 */
  const truncate = (text: string | undefined, max = 32): string => {
    if (!text) return ''
    return text.length > max ? text.slice(0, max) + '…' : text
  }

  // ── 渲染内容 ──
  const content = (
    <>
      {/* 搜索框 */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Icon name="Search" size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索对话..."
            className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
            >
              <Icon name="X" size={14} />
            </button>
          )}
        </div>
      </div>

      {/* 新对话按钮 */}
      <div className="px-3 pb-2">
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => {
            onNewConversation()
            if (!inline) onClose?.()
          }}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white text-sm font-medium shadow-md shadow-blue-200/40 hover:shadow-lg hover:shadow-blue-300/50 transition-shadow"
        >
          <Icon name="Plus" size={16} />
          新对话
        </motion.button>
      </div>

      {/* 对话列表 */}
      <HoverScrollbar className="flex-1">
        <div className="px-2 pb-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Icon name="Loader2" size={20} className="text-slate-300" />
              </motion.div>
            </div>
          ) : grouped.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Icon name="Inbox" size={32} className="text-slate-200 mb-2" />
              <p className="text-sm text-slate-400">
                {searchQuery ? '未找到匹配的对话' : '暂无对话记录'}
              </p>
              {!searchQuery && (
                <p className="text-xs text-slate-300 mt-1">点击「新对话」开始</p>
              )}
            </div>
          ) : (
            grouped.map(group => (
              <div key={group.key} className="mb-3">
                <p className="text-xs font-medium text-slate-400 px-2 py-1.5">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {group.items.map(conv => {
                    const isActive = currentConversationId === conv.id
                    return (
                      <div
                        key={conv.id}
                        className={`group relative rounded-xl transition-colors ${
                          isActive ? 'bg-blue-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <button
                          onClick={() => {
                            onSelectConversation(conv)
                            if (!inline) onClose?.()
                          }}
                          className="w-full text-left px-3 py-2.5 pr-8"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm font-medium truncate flex-1 ${
                              isActive ? 'text-blue-700' : 'text-slate-700'
                            }`}>
                              {conv.title || `对话 ${conv.id}`}
                            </p>
                            <span className="text-xs text-slate-400 flex-shrink-0 mt-0.5">
                              {formatTime(conv.updatedAt)}
                            </span>
                          </div>
                          {conv.lastMessage && (
                            <p className="text-xs text-slate-400 mt-0.5 truncate">
                              {truncate(conv.lastMessage)}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-slate-300">
                              {conv.messageCount} 条消息
                            </span>
                          </div>
                        </button>

                        {/* 删除按钮 */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteTarget(conv)
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                          title="删除对话"
                        >
                          <Icon name="Trash2" size={14} />
                        </button>
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

  // ── 内联模式（右栏常驻） ──
  if (inline) {
    return (
      <div className="flex flex-col h-full bg-white border-l border-slate-100">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Icon name="Inbox" size={16} />
            对话历史
          </h3>
          <span className="text-xs text-slate-400">{conversations.length}</span>
        </div>
        {content}

        {/* 删除确认对话框 */}
        <ConfirmDialog
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          title="删除对话"
          content={`确定要删除「${deleteTarget?.title || `对话 ${deleteTarget?.id}`}」吗？此操作无法撤销。`}
          confirmText="删除"
          confirmVariant="danger"
          loading={deleting}
        />
      </div>
    )
  }

  // ── 抽屉模式（移动端） ──
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          />
          <motion.aside
            initial={{ x: -320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -320, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="fixed top-0 left-0 bottom-0 w-80 bg-white border-r border-slate-200 z-50 flex flex-col shadow-xl"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Icon name="Inbox" size={16} />
                对话历史
              </h3>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
              >
                <Icon name="X" size={18} />
              </button>
            </div>
            {content}

            <ConfirmDialog
              isOpen={!!deleteTarget}
              onClose={() => setDeleteTarget(null)}
              onConfirm={handleDelete}
              title="删除对话"
              content={`确定要删除「${deleteTarget?.title || `对话 ${deleteTarget?.id}`}」吗？此操作无法撤销。`}
              confirmText="删除"
              confirmVariant="danger"
              loading={deleting}
            />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

export default ConversationHistory
