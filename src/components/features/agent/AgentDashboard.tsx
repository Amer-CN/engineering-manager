/**
 * AgentDashboard — AI 助手主组件（纯对话优先布局）
 * 空态：AgentWelcome（居中问候+输入+快捷提问）+ 右栏历史
 * 对话态：极简顶条→消息流→Composer + 右栏历史
 * ⌘K 唤起 AgentSearch
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@/components/ui/Icon'
import { HoverScrollbar } from '@/components/ui/HoverScrollbar'
import { useAuth } from '@/hooks/useAuth'
import { usePermission } from '@/hooks/usePermission'
import {
  sendAgentMessage,
  sendAgentMessageStream,
  getAgentConversationDetail,
  getLlmProviderConfig,
} from '@/services/agent-client'
import type { AgentStreamCallbacks } from '@/services/agent-client'
import type { AgentConversation } from '@/types/agent'
import type { LocalMessage } from './types'
import { genClientId } from './types'

import AgentComposer from './AgentComposer'
import AgentWelcome from './AgentWelcome'
import AgentOverlays, { HistorySidebar } from './AgentOverlays'
import AgentTopBar from './AgentTopBar'
import MessageBubble from './MessageBubble'
import { getFilteredSuggestions } from './suggestions'
import { useAgentPrefill } from './useAgentPrefill'
import Mascot, { type MascotState } from './Mascot'

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
  const [modelName, setModelName] = useState('')
  const [providerName, setProviderName] = useState('')

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // ── mascot 状态推导 + 首次响应视图切换 ──
  const [mascotState, setMascotState] = useState<MascotState>('idle')
  /** 首次响应已结束（含 success/error 短暂展示）→ 此后进入对话视图 */
const [firstDone, setFirstDone] = useState(false)
  const firstDoneRef = useRef(false)
  /** 首轮视图切换定时器是否仍挂起（若在 success/error 窗内被新一轮发送清掉，需同步补位） */
  const pendingFirstDoneRef = useRef(false)
  const mascotTimer = useRef<number | undefined>(undefined)

  /** 响应收尾：展示 success/error 窗口后回落 idle；首轮结束时定时切到对话视图 */
  const finishRound = useCallback((ok: boolean, ms: number) => {
    setMascotState(ok ? 'success' : 'error')
    window.clearTimeout(mascotTimer.current)
    // 首轮视图切换由该定时器执行，挂起期间标记 pending；被清掉时由 handleSend 补位置位
    if (!firstDoneRef.current) pendingFirstDoneRef.current = true
    mascotTimer.current = window.setTimeout(() => {
      pendingFirstDoneRef.current = false
      setMascotState('idle')
      if (!firstDoneRef.current) {
        firstDoneRef.current = true
        setFirstDone(true)
      }
    }, ms)
  }, [])

  useEffect(() => () => { if (mascotTimer.current) window.clearTimeout(mascotTimer.current) }, [])

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

  // ── 辅助函数 ──

  /** 发送消息（流式优先，失败回退非流式） */
  const handleSend = useCallback(
    async (overrideContent?: string) => {
      const content = (overrideContent ?? inputValue).trim()
      if (!content || loading) return

      // 新一轮发送：清掉上一轮残留的 success/error 回切定时器，进入 thinking。
      // 若被清掉的是首轮挂起的视图切换定时器，须同步补位置位 firstDone——
      // 否则第二轮仍停在欢迎区，圆球会再次出现（违反「第二次提问不再显示圆球」）。
      window.clearTimeout(mascotTimer.current)
      if (!firstDoneRef.current && pendingFirstDoneRef.current) {
        firstDoneRef.current = true
        setFirstDone(true)
        pendingFirstDoneRef.current = false
      }
      setMascotState('thinking')

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

      // 首次正文到达前记录，避免 tool 期间重复置 replying
      let repliedOnce = false

      try {
        const callbacks: AgentStreamCallbacks = {
          onConversationId: (id) => setConversationId(id),
          onTool: (name) => {
            patchAssistant({ content: `🔧 正在查询：${name}…` })
            setMascotState('searching')
          },
          onContent: (text) => {
            if (!repliedOnce) {
              repliedOnce = true
              setMascotState('replying')
            }
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
            finishRound(true, 1200)          // 主流程正常完成
          },
          onError: (err) => {
            patchAssistant({ sending: false, content: `❌ 出错了：${err}` })
            finishRound(false, 1600)        // 主流程出错
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
            finishRound(true, 1200)
          } else {
            patchAssistant({ sending: false, content: `❌ ${resp.error ?? '请求失败'}` })
            finishRound(false, 1600)
          }
        } catch (e) {
          patchAssistant({
            sending: false,
            content: `❌ 请求失败：${e instanceof Error ? e.message : '未知错误'}`,
          })
          finishRound(false, 1600)
        }
      } finally {
        setLoading(false)
        setRefreshTrigger((v) => v + 1)
        setTimeout(() => inputRef.current?.focus(), 50)
      }
    },
    [inputValue, loading, conversationId, finishRound],
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
          if (mapped.length > 0) {
            // 有历史消息 → 直接以对话视图呈现，跳过首次欢迎区
            firstDoneRef.current = true
            setFirstDone(true)
            pendingFirstDoneRef.current = false
          }
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
    // 重置「首次响应」标记与 mascot，回到欢迎区
    firstDoneRef.current = false
    setFirstDone(false)
    pendingFirstDoneRef.current = false
    setMascotState('idle')
    window.clearTimeout(mascotTimer.current)
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
