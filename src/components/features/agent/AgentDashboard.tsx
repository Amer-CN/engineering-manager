/**
 * AgentDashboard — AI 助手主组件（纯对话优先布局）
 * 空态：AgentWelcome（居中问候+输入+快捷提问）+ 右栏历史
 * 对话态：极简顶条→消息流→Composer + 右栏历史
 * ⌘K 唤起 AgentSearch
 * 会话流逻辑已抽至 useAgentConversationFlow.ts（CI 行数门禁拆分）
 */

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@/components/ui/Icon'
import { HoverScrollbar } from '@/components/ui/HoverScrollbar'
import { useAuth } from '@/hooks/useAuth'
import { usePermission } from '@/hooks/usePermission'
import { getLlmProviderConfig } from '@/services/agent-client'

import AgentComposer from './AgentComposer'
import AgentWelcome from './AgentWelcome'
import AgentOverlays, { HistorySidebar } from './AgentOverlays'
import AgentTopBar from './AgentTopBar'
import MessageBubble from './MessageBubble'
import { getFilteredSuggestions } from './suggestions'
import { useAgentPrefill } from './useAgentPrefill'
import { useAgentConversationFlow } from './useAgentConversationFlow'
import Mascot from './Mascot'

const AgentDashboard: React.FC = () => {
  const { currentUser } = useAuth()
  const { can } = usePermission()
  const username = currentUser?.displayName || currentUser?.username || '用户'

  // ── 状态（会话流相关状态见 useAgentConversationFlow） ──
  const [inputValue, setInputValue] = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [modelName, setModelName] = useState('')
  const [providerName, setProviderName] = useState('')

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const {
    messages,
    conversationId,
    loading,
    refreshTrigger,
    mascotState,
    firstDone,
    handleSend,
    handleSelectConversation,
    handleNewConversation,
    handleResend,
  } = useAgentConversationFlow({ inputValue, setInputValue, inputRef })

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

  // ── S31B：外部预填提问（如知识库“问 AI 关于本文”）──
  useAgentPrefill(setInputValue, () => inputRef.current?.focus())

  // ── 拉取当前模型名（顶部徽章展示）──
  useEffect(() => {
    let cancelled = false
    getLlmProviderConfig().then(cfg => {
      if (cancelled || !cfg) return
      setProviderName(cfg.providerName || '')
      setModelName(cfg.model || '')
    }).catch(() => { /* silent */ })
    return () => { cancelled = true }
  }, [])

  const suggestionCards = getFilteredSuggestions(can)

  const isEmpty = messages.length === 0

  /** 首次响应结束前保持欢迎布局（空态 + 首轮流式期间都走这里） */
  const showWelcome = !firstDone

  const lastMsg = messages[messages.length - 1]
  const showThinking =
    loading &&
    (!lastMsg ||
      lastMsg.role !== 'assistant' ||
      (!!lastMsg.sending && !lastMsg.content))

  // ═══════════════════════════════════════════════════════════════
  // 欢迎区（空态居中工作台 / 首轮流式期间：欢迎区保持在顶部，回复渲染其下）
  // ═══════════════════════════════════════════════════════════════
  if (showWelcome) {
    return (
      <>
        <div className="flex h-[calc(100vh-60px)]">
          <div className="flex-1 flex flex-col min-w-0">
            <AgentWelcome
              username={username}
              modelName={modelName}
              providerName={providerName}
              inputValue={inputValue}
              onInputChange={setInputValue}
              onSend={handleSend}
              loading={loading}
              inputRef={inputRef}
              suggestions={suggestionCards}
              onOpenHistory={() => setHistoryOpen(true)}
              mascotState={mascotState}
              compact={!isEmpty}
            />
            {/* 首轮流式回复：渲染在欢迎区下方，直到底部滚动区 */}
            {!isEmpty && (
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 pb-4 min-h-0">
                <div className="max-w-3xl mx-auto">
                  {messages.map((msg, idx) => (
                    <MessageBubble
                      key={msg.clientId}
                      message={msg}
                      isUser={msg.role === 'user'}
                      onResend={msg.role === 'assistant' && idx > 0 ? () => handleResend(msg.clientId) : undefined}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
          <HistorySidebar
            conversationId={conversationId}
            onSelectConversation={handleSelectConversation}
            onNewConversation={handleNewConversation}
            refreshTrigger={refreshTrigger}
          />
        </div>
        <AgentOverlays
          conversationId={conversationId}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
          refreshTrigger={refreshTrigger}
          historyOpen={historyOpen}
          onHistoryClose={() => setHistoryOpen(false)}
          searchOpen={searchOpen}
          onSearchClose={() => setSearchOpen(false)}
          onAsk={handleSend}
        />
      </>
    )
  }

  // ═══════════════════════════════════════════════════════════════
  // 对话态：专注聊天
  // ═══════════════════════════════════════════════════════════════
  return (
    <>
      <div className="flex h-[calc(100vh-60px)]">
        {/* 主区 */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* 顶部条：助手标识 + 搜索 + 移动端历史 */}
          <AgentTopBar
            modelName={modelName}
            onNewConversation={handleNewConversation}
            onSearchOpen={() => setSearchOpen(true)}
            onHistoryOpen={() => setHistoryOpen(true)}
          />

          {/* 对话期间常驻小圆球：实时表达 AI 工作状态（thinking/searching/replying
              轮转、success 短暂展示后回 idle、error；空闲/待命时回 idle 不消失） */}
          <div className="flex justify-center pt-3 flex-shrink-0" style={{ overflow: 'visible' }}>
            <Mascot size={68} state={mascotState} />
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
                    onResend={msg.role === 'assistant' && idx > 0 ? () => handleResend(msg.clientId) : undefined}
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
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl rounded-bl-md" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                    >
                      <Icon name="Loader2" size={16} className="text-[color:var(--accent)]" />
                    </motion.div>
                    <span className="text-sm" style={{ color: 'var(--muted)' }}>思考中...</span>
                  </div>
                </motion.div>
              )}
            </div>
          </HoverScrollbar>

          {/* 底部 Composer */}
          <div className="px-6 py-3 border-t flex-shrink-0" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
            <div className="max-w-3xl mx-auto">
              <AgentComposer
                value={inputValue}
                onChange={setInputValue}
                onSend={handleSend}
                disabled={loading}
                inputRef={inputRef}
              />
              <p className="text-center mt-2 text-xs" style={{ color: 'var(--muted)' }}>AI 可能会产生错误，请核实重要信息。</p>
            </div>
          </div>
        </div>

        {/* 右栏：对话历史（桌面 ≥lg 常驻） */}
        <HistorySidebar
          conversationId={conversationId}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
          refreshTrigger={refreshTrigger}
        />
      </div>

      <AgentOverlays
        conversationId={conversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        refreshTrigger={refreshTrigger}
        historyOpen={historyOpen}
        onHistoryClose={() => setHistoryOpen(false)}
        searchOpen={searchOpen}
        onSearchClose={() => setSearchOpen(false)}
        onAsk={handleSend}
      />
    </>
  )
}

export default AgentDashboard