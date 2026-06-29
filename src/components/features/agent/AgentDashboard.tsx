/**
 * AgentDashboard — AI 助手主组件
 *
 * Hero 横幅(Bot图标+"AI助手"+"用户名"), 消息列表+输入框+发送按钮,
 * 加载状态"思考中...", 建议卡片(空消息时展示, 按权限过滤), 对话历史侧边栏
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@/components/ui/Icon'
import HeroBanner from '@/components/ui/HeroBanner'
import PageContainer from '@/components/ui/PageContainer'
import { useAuth } from '@/hooks/useAuth'
import { usePermission } from '@/hooks/usePermission'
import {
  sendAgentMessage,
  getAgentConversationDetail,
} from '@/services/agent-client'
import type {
  AgentChatResponse,
  AgentMessage,
  AgentConversation,
  SuggestionCardConfig,
} from '@/types/agent'
import MessageBubble from './MessageBubble'
import SuggestionCards from './SuggestionCards'
import ConversationHistory from './ConversationHistory'

/** 本地消息模型（扩展自后端模型，增加客户端 id 和发送状态） */
interface LocalMessage {
  /** 客户端唯一 id */
  clientId: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content?: string
  toolCalls?: AgentMessage['toolCalls']
  /** 发送中 / 已完成 */
  sending?: boolean
}

let nextClientId = 1
function genClientId(): string {
  return `msg_${Date.now()}_${nextClientId++}`
}

const AgentDashboard: React.FC = () => {
  const { currentUser } = useAuth()
  const { can } = usePermission()
  const username = currentUser?.displayName || currentUser?.username || '用户'

  // ── 状态 ──
  const [messages, setMessages] = useState<LocalMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<number | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)

  // 输入框 ref 和滚动容器 ref
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // ── 自动滚动到底部 ──
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // ── 辅助函数 ──

  /** 添加本地消息 */
  const addMessage = useCallback((msg: Omit<LocalMessage, 'clientId'>) => {
    setMessages((prev) => [...prev, { ...msg, clientId: genClientId() }])
  }, [])

  /** 发送消息 */
  const handleSend = useCallback(
    async (text?: string) => {
      const content = (text ?? inputValue).trim()
      if (!content || loading) return

      // 清空输入
      setInputValue('')
      setLoading(true)

      // 用户消息
      addMessage({ role: 'user', content, sending: true })

      try {
        const response: AgentChatResponse = await sendAgentMessage({
          message: content,
          ...(conversationId ? { conversationId } : {}),
        })

        // 更新 conversationId
        if (response.conversationId && !conversationId) {
          setConversationId(response.conversationId)
        }

        // 标记用户消息发送完成
        setMessages((prev) =>
          prev.map((m) =>
            m.sending && m.role === 'user' ? { ...m, sending: false } : m,
          ),
        )

        // 添加 AI 回复
        if (response.message) {
          addMessage({
            role: 'assistant',
            content: response.message.content,
            toolCalls: response.toolCalls || response.message.toolCalls,
          })
        } else if (response.toolCalls && response.toolCalls.length > 0) {
          // 仅有 toolCalls 没有 message 的情况
          addMessage({
            role: 'assistant',
            toolCalls: response.toolCalls,
          })
        } else if (response.error) {
          addMessage({
            role: 'assistant',
            content: `❌ ${response.error}`,
          })
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        addMessage({
          role: 'assistant',
          content: `❌ 请求失败: ${msg}`,
        })
      } finally {
        setLoading(false)
        // 焦点回到输入框
        setTimeout(() => inputRef.current?.focus(), 50)
      }
    },
    [inputValue, loading, conversationId, addMessage],
  )

  /** 加载历史对话 */
  const handleSelectConversation = useCallback(
    async (conv: AgentConversation) => {
      setLoading(true)
      setConversationId(conv.id)
      try {
        const detail = await getAgentConversationDetail(conv.id)
        if (detail && detail.messages) {
          const mapped: LocalMessage[] = detail.messages.map((m) => ({
            clientId: genClientId(),
            role: m.role as LocalMessage['role'],
            content: m.content,
            toolCalls: m.toolCalls,
          }))
          setMessages(mapped)
        } else {
          setMessages([])
        }
      } catch {
        setMessages([])
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  /** 新建对话 */
  const handleNewConversation = useCallback(() => {
    setMessages([])
    setConversationId(null)
    setInputValue('')
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

  // ── 键盘事件 ──
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend],
  )

  // ── 建议卡片配置（按权限过滤） ──
  const allSuggestions: SuggestionCardConfig[] = [
    {
      icon: 'FolderKanban',
      title: '项目概况',
      prompt: '帮我总结一下目前所有项目的状态',
      requiredPermission: 'projects:read',
      color: 'bg-blue-50 text-blue-600',
    },
    {
      icon: 'Receipt',
      title: '发票待办',
      prompt: '有哪些发票需要付款？',
      requiredPermission: 'invoices:read',
      color: 'bg-amber-50 text-amber-600',
    },
    {
      icon: 'ClipboardList',
      title: '结算进度',
      prompt: '最近的结算办理情况如何？',
      requiredPermission: 'settlement:read',
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      icon: 'Users',
      title: '团队成员',
      prompt: '我们有多少员工和工人？',
      requiredPermission: 'members:read',
      color: 'bg-violet-50 text-violet-600',
    },
    {
      icon: 'Package',
      title: '库存物料',
      prompt: '仓库里有哪些物料？',
      requiredPermission: 'inventory:read',
      color: 'bg-orange-50 text-orange-600',
    },
    {
      icon: 'DollarSign',
      title: '成本分析',
      prompt: '帮我分析一下成本支出情况',
      requiredPermission: 'costLedger:read',
      color: 'bg-rose-50 text-rose-600',
    },
  ]

  // 根据权限过滤建议卡片
  const suggestionCards = allSuggestions.filter(s =>
    !s.requiredPermission || can(s.requiredPermission as any)
  )

  const isEmpty = messages.length === 0

  // ── 渲染 ──
  return (
    <PageContainer>
      <div className="flex flex-col h-[calc(100vh-120px)]">
        {/* Hero 横幅 */}
        <HeroBanner
          icon="Bot"
          title="AI 助手"
          subtitle={`${username}，有什么可以帮您？`}
          accentColor="blue"
        >
          {/* 历史按钮 */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setHistoryOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/15 text-white/80 hover:bg-white/25 hover:text-white text-xs font-medium transition-colors"
          >
            <Icon name="Clock" size={14} />
            历史
          </motion.button>
        </HeroBanner>

      {/* 消息区域 */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 py-4"
        style={{ scrollBehavior: 'smooth' }}
      >
        {isEmpty ? (
          /* 空状态 + 建议卡片 */
          <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center gap-3"
            >
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-100 to-violet-100 flex items-center justify-center shadow-md shadow-blue-200/30">
                <Icon name="Sparkles" size={36} className="text-blue-500" />
              </div>
              <p className="text-lg font-semibold text-slate-600">
                有什么可以帮你的？
              </p>
              <p className="text-sm text-slate-400 text-center max-w-md">
                我可以帮你查询项目进度、发票状态、结算情况等工程管理信息。
              </p>
            </motion.div>

            <div className="w-full max-w-xl">
              <SuggestionCards
                suggestions={suggestionCards}
                onSelect={(prompt) => handleSend(prompt)}
                disabled={loading}
              />
            </div>
          </div>
        ) : (
          /* 消息列表 */
          <div className="max-w-3xl mx-auto">
            <AnimatePresence>
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.clientId}
                  message={msg}
                  isUser={msg.role === 'user'}
                />
              ))}
            </AnimatePresence>

            {/* 加载态："思考中..." */}
            {loading && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 ml-12 mb-4"
              >
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl rounded-bl-md bg-white border border-slate-200 shadow-sm">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                  >
                    <Icon name="Loader2" size={16} className="text-violet-500" />
                  </motion.div>
                  <span className="text-sm text-slate-500">思考中...</span>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* 底部输入区域 */}
      <div className="px-6 py-4 border-t border-slate-100 bg-white/60 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-3">
            {/* 输入框 */}
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入你的问题... (Shift+Enter 换行)"
                disabled={loading}
                rows={1}
                className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-shadow disabled:opacity-50 resize-none"
                style={{ minHeight: '48px', maxHeight: '120px' }}
              />
              {inputValue && (
                <button
                  onClick={() => setInputValue('')}
                  className="absolute right-3 top-3 p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <Icon name="X" size={14} />
                </button>
              )}
            </div>

            {/* 发送按钮 */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSend()}
              disabled={!inputValue.trim() || loading}
              className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white flex items-center justify-center shadow-md shadow-blue-200/40 disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-blue-300/50 transition-shadow"
            >
              {loading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <Icon name="Loader2" size={20} />
                </motion.div>
              ) : (
                <Icon name="ArrowUpCircle" size={20} />
              )}
            </motion.button>
          </div>
        </div>
      </div>

      {/* 对话历史侧边栏 */}
      <ConversationHistory
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
      />
      </div>
    </PageContainer>
  )
}

export default AgentDashboard