/**
 * AgentDashboard — AI 助手主组件（单棵布局树 + 连续形态过渡）
 *
 * 布局形态由 messages.length 驱动（按下发送瞬间即切换，不再等回答结束）：
 *  - 欢迎形态：问候/徽章/快捷提问居中，大球（104px）+ 输入框居中
 *  - 对话形态：TopBar 淡入，球缩至顶部（68px），输入框锚定底部，消息流占主区
 *  - Mascot / AgentComposer / 消息流为常驻单实例（key 稳定，绝不卸载重建），
 *    形态变化由 framer-motion layout 动画连续补间 —— 消除旧版双 return
 *    整树切换造成的卡顿与闪断
 * ⌘K 唤起 AgentSearch；会话流逻辑在 useAgentConversationFlow.ts
 */

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@/components/ui/Icon'
import { HoverScrollbar } from '@/components/ui/HoverScrollbar'
import { useAuth } from '@/hooks/useAuth'
import { usePermission } from '@/hooks/usePermission'
import { getLlmProviderConfig } from '@/services/agent-client'

import AgentComposer from './AgentComposer'
import AgentOverlays, { HistorySidebar } from './AgentOverlays'
import AgentTopBar from './AgentTopBar'
import MessageBubble from './MessageBubble'
import { getFilteredSuggestions } from './suggestions'
import { useAgentPrefill } from './useAgentPrefill'
import { useAgentConversationFlow } from './useAgentConversationFlow'
import Mascot from './Mascot'
import ModelPicker, { type ReasoningLevel } from './ModelPicker'
import { getGreeting } from '@/components/features/dashboard/dashboardConstants'
import SuggestionChips from './SuggestionChips'

/** 形态过渡动效参数：一次连续变形约 400ms */
const EASE = [0.4, 0, 0.2, 1] as const
const LAYOUT_TRANSITION = { duration: 0.4, ease: EASE } as const

const AgentDashboard: React.FC = () => {
  const { currentUser } = useAuth()
  const { can } = usePermission()
  const username = currentUser?.displayName || currentUser?.username || '用户'

  const [inputValue, setInputValue] = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [modelName, setModelName] = useState('')
  const [providerName, setProviderName] = useState('')
  /** ModelPicker 状态：null = 跟随配置默认模型 */
  const [pickModel, setPickModel] = useState<string | null>(null)
  const [reasoningLevel, setReasoningLevel] = useState<ReasoningLevel>('off')
  /** 用户是否主动上滚（暂停自动跟随，出现"回到底部"按钮） */
  const [autoFollow, setAutoFollow] = useState(true)

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const {
    messages,
    conversationId,
    loading,
    refreshTrigger,
    mascotState,
    handleSend,
    handleSelectConversation,
    handleNewConversation,
    handleResend,
    handleForkTo,
  } = useAgentConversationFlow({
    inputValue, setInputValue, inputRef,
    model: pickModel, reasoningLevel,
  })

  /** 对话形态：按下发送瞬间（首条消息入列）即切换；反向（新对话清空）自动回欢迎形态 */
  const chatMode = messages.length > 0
  const suggestionCards = getFilteredSuggestions(can)

  /** 状态化占位文案（复刻 ZCode 规格） */
  const composerPlaceholder = loading
    ? '初始化任务中…'
    : chatMode
      ? '提出后续问题…（Shift+Enter 换行）'
      : '向 AI 管家提问…（/ 快捷命令，可拖入文件）'

  /** user 消息编辑：内容回填输入框并聚焦（由用户改后手动重发） */
  const handleEditMessage = (content: string) => {
    setInputValue(content)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  /** assistant 消息分叉：截断到该消息（含）作为新对话起点 */
  const handleForkMessage = (idx: number) => {
    handleForkTo(idx)
  }

  // ── 自动滚动（用户上滚时暂停跟随）──
  useEffect(() => {
    if (scrollRef.current && autoFollow) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading, autoFollow])

  /** 滚动容器上滚检测：距底 >150px 视为脱离跟随 */
  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const away = el.scrollHeight - el.scrollTop - el.clientHeight > 150
    setAutoFollow(!away)
  }

  const scrollToBottom = () => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
    setAutoFollow(true)
  }

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

  // ── S31B：外部预填提问（如知识库"问 AI 关于本文"）──
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

  const lastMsg = messages[messages.length - 1]
  const showThinking =
    loading &&
    (!lastMsg ||
      lastMsg.role !== 'assistant' ||
      (!!lastMsg.sending && !lastMsg.content))

  const messageList = (
    <div className="max-w-3xl mx-auto py-4">
      <AnimatePresence>
        {messages.map((msg, idx) => (
          <MessageBubble
            key={msg.clientId}
            message={msg}
            isUser={msg.role === 'user'}
            onResend={msg.role === 'assistant' && idx > 0 ? () => handleResend(msg.clientId) : undefined}
            onEdit={msg.role === 'user' ? () => handleEditMessage(msg.content ?? '') : undefined}
            onFork={msg.role === 'assistant' ? () => handleForkMessage(idx) : undefined}
            at={msg.at}
            durationSec={msg.durationSec}
            reasoning={msg.reasoning}
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
  )

  return (
    <>
      <div className="flex h-full min-h-0">
        {/* 主区：单棵树，chatMode 驱动形态动画。min-h-0 保证 flex 高度约束向
            子级传播（否则内容自然高度会把 main 撑爆 → 整页滚动） */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {/* TopBar：对话形态淡入 */}
          <AnimatePresence>
            {chatMode && (
              <motion.div
                key="topbar"
                initial={{ opacity: 0, marginTop: -56 }}
                animate={{ opacity: 1, marginTop: 0 }}
                exit={{ opacity: 0, marginTop: -56 }}
                transition={{ duration: 0.3, ease: EASE }}
              >
                <AgentTopBar
                  modelName={modelName}
                  onNewConversation={handleNewConversation}
                  onSearchOpen={() => setSearchOpen(true)}
                  onHistoryOpen={() => setHistoryOpen(true)}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mascot：欢迎态居中大球 → 对话态顶部小球。
              等比缩放过渡：容器保持 104px 基准占位，仅用 scale(0.654=68/104) +
              容器 margin 补间位移 —— transform 的 scale 天然等比，球全程不变形
              （layout 补间会对宽高独立插值，中段拉成椭圆，故弃用） */}
          <motion.div
            animate={
              chatMode
                ? { scale: 0.654, marginTop: -36, marginBottom: -68 * 0.346 }
                : { scale: 1, marginTop: 0, marginBottom: 0 }
            }
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            className={
              chatMode
                ? 'flex justify-center flex-shrink-0'
                : 'flex justify-center flex-shrink-0 flex-1 items-start pt-16'
            }
            style={{ overflow: 'visible' }}
          >
            <Mascot size={104} state={mascotState} />
          </motion.div>

          {/* 欢迎形态：窄屏历史入口（TopBar 仅对话形态显示，此处补欢迎态的入口） */}
          {!chatMode && (
            <div className="flex items-center justify-end px-6 flex-shrink-0 -mt-24 relative z-10">
              <button
                onClick={() => setHistoryOpen(true)}
                className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--fg-2)' }}
              >
                <Icon name="Inbox" size={14} />
                对话历史
              </button>
            </div>
          )}

          {/* 问候区：欢迎形态展示（居中），对话形态整体淡出卸载 */}
          <AnimatePresence>
            {!chatMode && (
              <motion.div
                key="greeting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: -24, transition: { duration: 0.25, ease: EASE } }}
                className="flex-shrink-0 text-center px-6 -mt-6"
              >
                <h1 className="text-4xl font-bold tracking-tight" style={{ color: 'var(--fg)' }}>
                  {getGreeting()}，{username}
                </h1>
                {modelName && (
                  <div className="inline-flex items-center gap-1.5 mt-6 mb-8 px-2.5 py-1 rounded-lg" style={{ background: 'var(--panel-2)', border: '1px solid var(--border)' }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--success)' }} />
                    <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
                      {providerName ? `${providerName} · ` : ''}{modelName}
                    </span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* 消息流：常驻挂载（首轮流式期间即出现，占据问候区让出的空间） */}
          {chatMode && (
            <div className="relative flex-1 min-h-0">
              <HoverScrollbar className="h-full px-6" scrollRef={scrollRef} onScrollCapture={handleScroll}>
                {messageList}
              </HoverScrollbar>

              {/* 滚动到底部（用户上滚脱离跟随时出现） */}
              <AnimatePresence>
                {!autoFollow && (
                  <motion.button
                    key="scroll-bottom"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={scrollToBottom}
                    aria-label="滚动到底部"
                    className="absolute bottom-3 right-6 z-10 w-9 h-9 rounded-full flex items-center justify-center shadow-lg transition-colors"
                    style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--fg-2)' }}
                  >
                    <Icon name="ChevronDown" size={16} />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* 快捷提问：欢迎形态展示于输入框下 */}
          <AnimatePresence>
            {!chatMode && (
              <motion.div
                key="chips"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: 0.15 } }}
                exit={{ opacity: 0, transition: { duration: 0.2 } }}
                className="flex-shrink-0 px-6 pt-5 pb-6"
              >
                <div className="max-w-2xl mx-auto">
                  <SuggestionChips
                    suggestions={suggestionCards}
                    onSelect={handleSend}
                    disabled={loading}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Composer：欢迎态跟随居中（chips 上方留白由 flex 分配）→ 对话态锚定底部。
              单实例，layout 动画补间位置 */}
          <motion.div
            layout
            transition={LAYOUT_TRANSITION}
            className={
              chatMode
                ? 'px-6 py-3 border-t flex-shrink-0'
                : 'flex-1 flex items-start justify-center px-6 pb-6'
            }
            style={
              chatMode
                ? { borderColor: 'var(--border)', background: 'var(--bg)' }
                : undefined
            }
          >
            <div className={chatMode ? 'max-w-3xl mx-auto w-full' : 'max-w-2xl w-full'}>
              <AgentComposer
                value={inputValue}
                onChange={setInputValue}
                onSend={handleSend}
                disabled={loading}
                inputRef={inputRef}
                placeholder={composerPlaceholder}
                centered={!chatMode}
                toolbarSlot={
                  <ModelPicker
                    model={pickModel}
                    onModelChange={setPickModel}
                    reasoningLevel={reasoningLevel}
                    onReasoningLevelChange={setReasoningLevel}
                  />
                }
              />
            </div>
          </motion.div>
        </div>

        {/* 右栏：对话历史 */}
        <HistorySidebar
          conversationId={conversationId}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
          onCurrentConversationDeleted={handleNewConversation}
          refreshTrigger={refreshTrigger}
        />
      </div>

      <AgentOverlays
        conversationId={conversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onCurrentConversationDeleted={handleNewConversation}
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
