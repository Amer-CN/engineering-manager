/**
 * AgentDashboard — AI 助手主组件（重构：混合式工作台）
 *
 * 空态（无消息）：丰富工作台
 *   AgentHero → StatOverview → AgentComposer + SuggestionChips → CapabilityGrid + InsightPanel
 *
 * 对话态（有消息）：专注聊天
 *   [紧凑 Hero 条 → 消息流 → 底部 Composer] [右侧 ConversationHistory 常驻]
 *   <lg: 右栏转抽屉
 *
 * ⌘K 唤起 AgentSearch 命令面板
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@/components/ui/Icon'
import PageContainer from '@/components/ui/PageContainer'
import { HoverScrollbar } from '@/components/ui/HoverScrollbar'
import { useAuth } from '@/hooks/useAuth'
import { usePermission } from '@/hooks/usePermission'
import {
  sendAgentMessage,
  getAgentConversationDetail,
} from '@/services/agent-client'
import type {
  AgentChatResponse,
  AgentConversation,
  SuggestionCardConfig,
} from '@/types/agent'
import type { LocalMessage } from './types'
import { genClientId } from './types'

import AgentHero from './AgentHero'
import AgentComposer from './AgentComposer'
import StatOverview from './StatOverview'
import CapabilityGrid from './CapabilityGrid'
import InsightPanel from './InsightPanel'
import SuggestionChips from './SuggestionChips'
import MessageBubble from './MessageBubble'
import ConversationHistory from './ConversationHistory'
import AgentSearch from './AgentSearch'

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
  const [searchOpen, setSearchOpen] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // ── 自动滚动 ──
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  // ── ⌘K / Ctrl+K 唤起搜索 ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // ── 辅助函数 ──

  const addMessage = useCallback((msg: Omit<LocalMessage, 'clientId'>) => {
    setMessages(prev => [...prev, { ...msg, clientId: genClientId() }])
  }, [])

  /** 发送消息 */
  const handleSend = useCallback(
    async (text?: string) => {
      const content = (text ?? inputValue).trim()
      if (!content || loading) return

      setInputValue('')
      setLoading(true)
      addMessage({ role: 'user', content, sending: true })

      try {
        const response: AgentChatResponse = await sendAgentMessage({
          message: content,
          ...(conversationId ? { conversationId } : {}),
        })

        if (response.conversationId && !conversationId) {
          setConversationId(response.conversationId)
          setRefreshTrigger(t => t + 1)
        }

        setMessages(prev =>
          prev.map(m =>
            m.sending && m.role === 'user' ? { ...m, sending: false } : m,
          ),
        )

        if (response.message) {
          addMessage({
            role: 'assistant',
            content: response.message.content,
            toolCalls: response.toolCalls || response.message.toolCalls,
          })
        } else if (response.toolCalls && response.toolCalls.length > 0) {
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
        setRefreshTrigger(t => t + 1)
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
          const mapped: LocalMessage[] = detail.messages.map(m => ({
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

  /** 重发（重跑上一条 user 消息） */
  const handleResend = useCallback(() => {
    // 找到最后一条 user 消息
    const lastUserIdx = [...messages].reverse().findIndex(m => m.role === 'user')
    if (lastUserIdx === -1) return
    const actualIdx = messages.length - 1 - lastUserIdx
    const lastUserMsg = messages[actualIdx]
    if (!lastUserMsg?.content) return

    // 移除从该消息开始的所有消息
    setMessages(prev => prev.slice(0, actualIdx))
    // 重新发送
    setTimeout(() => handleSend(lastUserMsg.content), 50)
  }, [messages, handleSend])

  /** Insight/Search 触发提问 */
  const handleAsk = useCallback(
    (prompt: string) => {
      handleSend(prompt)
    },
    [handleSend],
  )

  // ── 建议卡片配置 ──
  const allSuggestions: SuggestionCardConfig[] = [
    { icon: 'FolderKanban', title: '项目概况', prompt: '帮我总结一下目前所有项目的状态', requiredPermission: 'projects:read', color: 'blue' },
    { icon: 'Receipt', title: '发票待办', prompt: '有哪些发票需要付款？', requiredPermission: 'invoices:read', color: 'amber' },
    { icon: 'ClipboardList', title: '结算进度', prompt: '最近的结算办理情况如何？', requiredPermission: 'settlement:read', color: 'emerald' },
    { icon: 'Users', title: '团队成员', prompt: '我们有多少员工和工人？', requiredPermission: 'hr:read', color: 'violet' },
    { icon: 'Package', title: '库存物料', prompt: '仓库里有哪些物料？', requiredPermission: 'inventory:read', color: 'orange' },
    { icon: 'DollarSign', title: '成本分析', prompt: '帮我分析一下成本支出情况', requiredPermission: 'costLedger:read', color: 'rose' },
  ]

  const suggestionCards = allSuggestions.filter(s =>
    !s.requiredPermission || can(s.requiredPermission as any),
  )

  const isEmpty = messages.length === 0

  // ═══════════════════════════════════════════════════════════════
  // 空态：丰富工作台
  // ═══════════════════════════════════════════════════════════════
  if (isEmpty) {
    return (
      <>
        <PageContainer maxWidth="default" className="!max-w-[1200px]">
          <HoverScrollbar className="h-[calc(100vh-120px)]">
            <AgentHero username={username} onOpenSearch={() => setSearchOpen(true)} />

            <StatOverview />

            {/* 居中 Composer + 建议词 */}
            <div className="mb-8">
              <AgentComposer
                value={inputValue}
                onChange={setInputValue}
                onSend={handleSend}
                disabled={loading}
                inputRef={inputRef}
                centered
              />
              <div className="max-w-2xl mx-auto mt-4">
                <SuggestionChips
                  suggestions={suggestionCards}
                  onSelect={handleSend}
                  disabled={loading}
                />
              </div>
            </div>

            {/* 两栏：能力模块 + 智能建议 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-8">
              <CapabilityGrid />
              <InsightPanel onAsk={handleAsk} />
            </div>
          </HoverScrollbar>
        </PageContainer>

        {/* 搜索命令面板 */}
        <AgentSearch
          open={searchOpen}
          onClose={() => setSearchOpen(false)}
          onAsk={handleAsk}
          onSelectConversation={handleSelectConversation}
        />
      </>
    )
  }

  // ═══════════════════════════════════════════════════════════════
  // 对话态：专注聊天
  // ═══════════════════════════════════════════════════════════════
  return (
    <>
      <div className="flex h-[calc(100vh-120px)]">
        {/* 主区 */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* 紧凑 Hero 条 */}
          <div className="px-6 pt-4 flex-shrink-0">
            <AgentHero
              username={username}
              onOpenSearch={() => setSearchOpen(true)}
              compact
            />
            {/* 移动端历史按钮 */}
            <button
              onClick={() => setHistoryOpen(true)}
              className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors mb-3"
            >
              <Icon name="Inbox" size={14} />
              对话历史
            </button>
          </div>

          {/* 消息流 */}
          <HoverScrollbar className="flex-1 px-6">
            <div className="max-w-3xl mx-auto py-4">
              <AnimatePresence>
                {messages.map((msg, idx) => (
                  <MessageBubble
                    key={msg.clientId}
                    message={msg}
                    isUser={msg.role === 'user'}
                    onResend={
                      msg.role === 'assistant' && idx > 0
                        ? handleResend
                        : undefined
                    }
                  />
                ))}
              </AnimatePresence>

              {/* 思考中 */}
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
          </HoverScrollbar>

          {/* 底部 Composer */}
          <div className="px-6 py-3 border-t border-slate-100 bg-white/60 backdrop-blur-sm flex-shrink-0">
            <div className="max-w-3xl mx-auto">
              <AgentComposer
                value={inputValue}
                onChange={setInputValue}
                onSend={handleSend}
                disabled={loading}
                inputRef={inputRef}
              />
            </div>
          </div>
        </div>

        {/* 右栏：对话历史（桌面 ≥lg 常驻） */}
        <div className="hidden lg:block w-80 flex-shrink-0">
          <ConversationHistory
            inline
            currentConversationId={conversationId}
            onSelectConversation={handleSelectConversation}
            onNewConversation={handleNewConversation}
            refreshTrigger={refreshTrigger}
          />
        </div>
      </div>

      {/* 移动端对话历史抽屉 */}
      <ConversationHistory
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        currentConversationId={conversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        refreshTrigger={refreshTrigger}
      />

      {/* 搜索命令面板 */}
      <AgentSearch
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onAsk={handleAsk}
        onSelectConversation={handleSelectConversation}
      />
    </>
  )
}

export default AgentDashboard
