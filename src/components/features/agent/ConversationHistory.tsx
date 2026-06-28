/**
 * ConversationHistory — 对话历史侧边栏
 *
 * 左侧滑出面板，展示对话列表 + "新对话"按钮，点击加载历史对话
 */

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@/components/ui/Icon'
import {
  getAgentConversations,
} from '@/services/agent-client'
import type { AgentConversation } from '@/types/agent'

interface ConversationHistoryProps {
  /** 是否显示面板 */
  open: boolean
  /** 关闭回调 */
  onClose: () => void
  /** 选择对话回调 */
  onSelectConversation: (conversation: AgentConversation) => void
  /** 新建对话回调 */
  onNewConversation: () => void
}

const ConversationHistory: React.FC<ConversationHistoryProps> = ({
  open,
  onClose,
  onSelectConversation,
  onNewConversation,
}) => {
  const [conversations, setConversations] = useState<AgentConversation[]>([])
  const [loading, setLoading] = useState(false)

  /** 加载对话列表 */
  const loadConversations = useCallback(async () => {
    setLoading(true)
    try {
      const list = await getAgentConversations()
      setConversations(list)
    } catch {
      // 静默失败
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      loadConversations()
    }
  }, [open, loadConversations])

  /** 格式化时间 */
  const formatTime = (iso: string): string => {
    try {
      const d = new Date(iso)
      const now = new Date()
      const isToday = d.toDateString() === now.toDateString()
      if (isToday) {
        return d.toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit',
        })
      }
      return d.toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric',
      })
    } catch {
      return ''
    }
  }

  /** 截断最后一条消息预览 */
  const truncate = (text: string | undefined, max = 36): string => {
    if (!text) return ''
    return text.length > max ? text.slice(0, max) + '…' : text
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* 遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          />

          {/* 面板 */}
          <motion.aside
            initial={{ x: -320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -320, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="fixed top-0 left-0 bottom-0 w-80 bg-white border-r border-slate-200 z-50 flex flex-col shadow-xl"
          >
            {/* 头部 */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Icon name="Inbox" size={16} />
                对话历史
              </h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
              >
                <Icon name="X" size={18} />
              </button>
            </div>

            {/* 新对话按钮 */}
            <div className="px-4 py-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  onNewConversation()
                  onClose()
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white text-sm font-medium shadow-md shadow-blue-200/40 hover:shadow-lg hover:shadow-blue-300/50 transition-shadow"
              >
                <Icon name="Plus" size={16} />
                新对话
              </motion.button>
            </div>

            {/* 对话列表 */}
            <div className="flex-1 overflow-y-auto px-2">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Icon name="Loader2" size={24} className="text-slate-300" />
                  </motion.div>
                </div>
              ) : conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Icon name="Inbox" size={36} className="text-slate-200 mb-3" />
                  <p className="text-sm text-slate-400">暂无对话记录</p>
                  <p className="text-xs text-slate-300 mt-1">点击「新对话」开始</p>
                </div>
              ) : (
                <div className="space-y-1 pb-4">
                  {conversations.map((conv) => (
                    <motion.button
                      key={conv.id}
                      whileHover={{ scale: 1.01, backgroundColor: 'rgb(248 250 252)' }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => {
                        onSelectConversation(conv)
                        onClose()
                      }}
                      className="w-full text-left px-3 py-3 rounded-xl transition-colors hover:bg-slate-50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-slate-700 truncate flex-1">
                          {conv.title || `对话 ${conv.id}`}
                        </p>
                        <span className="text-xs text-slate-400 flex-shrink-0 mt-0.5">
                          {formatTime(conv.updatedAt)}
                        </span>
                      </div>
                      {conv.lastMessage && (
                        <p className="text-xs text-slate-400 mt-1 truncate">
                          {truncate(conv.lastMessage)}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs text-slate-300">
                          {conv.messageCount} 条消息
                        </span>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

export default ConversationHistory