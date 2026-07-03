/**
 * AgentDashboard — AI 助手主组件（混合式工作台）
 * 空态：Hero→Stats→Composer+Chips→Capability+Insight
 * 对话态：紧凑Hero→消息流→Composer + 右栏History
 * ⌘K 唤起 AgentSearch
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
  sendAgentMessageStream,
  getAgentConversationDetail,
} from '@/services/agent-client'
import type { AgentStreamCallbacks } from '@/services/agent-client'
import type { AgentConversation } from '@/types/agent'
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
import { getFilteredSuggestions } from './suggestions'

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

  /** 发送消息（流式优先，失败回退非流式） */
  const handleSend = useCallback(
    async (overrideContent?: string) => {
      const content = (overrideContent ?? inputValue).trim()
      if (!content || loading) return

      const userClientId = genClientId()
      const assistantClientId = genClientId()

      // 1) 追加用户消息 + 助手占位（流式逐字填充）
      setMessages((prev) => [
        ...prev,
        { clientId: userClientId, role: 'user', content },
        { clientId: assistantClientId, role: 'assistant', content: '', sending: true },
      ])
      if (overrideContent === undefined) setInputValue('')
      setLoading(true)

      // 局部工具：按 clientId 更新助手占位
      const patchAssistant = (patch: Partial<LocalMessage>) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.clientId === assistantClientId ? { ...m, ...patch } : m,
          ),
        )
      }

      const request = { message: content, ...(conversationId ? { conversationId } : {}) }

      try {
        const callbacks: AgentStreamCallbacks = {
          onConversationId: (id) => setConversationId(id),
          onTool: (name) => patchAssistant({ content: `🔧 正在查询：${name}…` }),
          onContent: (text) => {
            // 第一段正文到达时，清掉「正在查询」提示
            setMessages((prev) =>
              prev.map((m) => {
                if (m.clientId !== assistantClientId) return m
                const base = m.content?.startsWith('🔧') ? '' : (m.content ?? '')
                return { ...m, content: base + text }
              }),
            )
          },
          onDone: ({ toolCalls, message }) => {
            setMessages((prev) =>
              prev.map((m) => {
                if (m.clientId !== assistantClientId) return m
                // 若正文仍是「🔧 正在查询」占位（工具跑完但模型没产出正文），视为无正文
                const streamed = m.content && !m.content.startsWith('🔧') ? m.content : ''
                return { ...m, sending: false, toolCalls, content: streamed || message || '' }
              }),
            )
            setRefreshTrigger((v) => v + 1) // 刷新洞察/统计
          },
          onError: (err) => {
            patchAssistant({ sending: false, content: `❌ 出错了：${err}` })
          },
        }

        await sendAgentMessageStream(request, callbacks)
      } catch {
        // 2) 流式失败 → 无缝回退到非流式（现有逻辑保持不变）
        try {
          const resp = await sendAgentMessage(request)
          if (resp.success) {
            if (resp.conversationId) setConversationId(resp.conversationId)
            patchAssistant({
              sending: false,
              content: resp.message?.content ?? '',
              toolCalls: resp.toolCalls,
            })
            setRefreshTrigger((v) => v + 1)
          } else {
            patchAssistant({ sending: false, content: `❌ ${resp.error ?? '请求失败'}` })
          }
        } catch (e) {
          patchAssistant({
            sending: false,
            content: `❌ 请求失败：${e instanceof Error ? e.message : '未知错误'}`,
          })
        }
      } finally {
        setLoading(false)
        setRefreshTrigger((v) => v + 1)
        setTimeout(() => inputRef.current?.focus(), 50)
      }
    },
    [inputValue, loading, conversationId],
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

  /** 重发（按目标 AI 气泡的 clientId 定位其前一条 user 消息并重发） */
  const handleResend = useCallback(
    (assistantClientId: string) => {
      const aIdx = messages.findIndex(m => m.clientId === assistantClientId)
      if (aIdx < 0) return
      // 向前找最近的一条 user 消息
      let uIdx = -1
      for (let i = aIdx - 1; i >= 0; i--) {
        if (messages[i].role === 'user') { uIdx = i; break }
      }
      if (uIdx < 0) return
      const userContent = messages[uIdx].content ?? ''
      // 截断到该 user 消息之前（移除这条 user 及其之后的所有消息），再重新发送
      setMessages(prev => prev.slice(0, uIdx))
      setTimeout(() => handleSend(userContent), 50)
    },
    [messages, handleSend],
  )

  /** Insight/Search 触发提问 */
  const handleAsk = useCallback(
    (prompt: string) => {
      handleSend(prompt)
    },
    [handleSend],
  )

  const suggestionCards = getFilteredSuggestions(can)

  const isEmpty = messages.length === 0

  const lastMsg = messages[messages.length - 1]
  const showThinking =
    loading &&
    (!lastMsg ||
      lastMsg.role !== 'assistant' ||
      (!!lastMsg.sending && !lastMsg.content))

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
                        ? () => handleResend(msg.clientId)
                        : undefined
                    }
                  />
                ))}
              </AnimatePresence>

              {/* 思考中 */}
              {showThinking && (
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
