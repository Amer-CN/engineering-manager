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

          {/* Mascot 状态头像（K3 审查改版）：不再占据欢迎页中心——缩为 32px，
              欢迎态嵌在输入框左侧（随 AI 状态变表情），对话态在 TopBar 下常驻。
              等比缩放过渡（scale 补间，球不变形） */}
          {chatMode && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 30 }}
              className="flex justify-center flex-shrink-0 pt-2"
              style={{ overflow: 'visible' }}
            >
              <Mascot size={40} state={mascotState} />
            </motion.div>
          )}

          {/* 欢迎形态：窄屏历史入口（TopBar 仅对话形态显示，此处补欢迎态的入口） */}
          {!chatMode && (
            <div className="flex items-center justify-end px-6 pt-4 flex-shrink-0">
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

          {/* 欢迎态主轴（K3 审查改版）：问候语 → 输入框 → 建议，垂直居中一组，
              同一 max-w 网格；球缩进输入框做状态头像（见 Composer 内 mascotSlot）。
              对话形态整组淡出卸载 */}
          <AnimatePresence>
            {!chatMode && (
              <motion.div
                key="greeting"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -24, transition: { duration: 0.25, ease: EASE } }}
                className="flex-1 flex flex-col items-center justify-center px-6 gap-5 min-h-0"
              >
                <div className="text-center">
                  <h1 className="text-4xl font-bold tracking-tight" style={{ color: 'var(--fg)' }}>
                    {getGreeting()}，{username}
                  </h1>
                  {modelName && (
                    <p className="mt-3 text-xs" style={{ color: 'var(--muted)' }}>
                      <span className="inline-block w-1.5 h-1.5 rounded-full align-middle mr-1.5" style={{ background: 'var(--success)' }} />
                      {providerName ? `${providerName} · ` : ''}{modelName}
                    </p>
                  )}
                </div>

                {/* 输入框 + 状态球头像：同一宽度网格（max-w-2xl），紧凑主轴 */}
                <div className="w-full max-w-2xl">
                  <AgentComposer
                    value={inputValue}
                    onChange={setInputValue}
                    onSend={handleSend}
                    disabled={loading}
                    inputRef={inputRef}
                    placeholder={composerPlaceholder}
                    centered={false}
                    mascot={<Mascot size={32} state={mascotState} />}
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

                {/* 快捷建议：紧随输入框的从属组（同一网格） */}
                <SuggestionChips
                  suggestions={suggestionCards}
                  onSelect={handleSend}
                  disabled={loading}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* 消息流：常驻挂载（首轮流式期间即出现，占据欢迎区让出的空间） */}
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

          {/* Composer：对话态锚定底部（欢迎态已内联到问候组内，此处仅对话态渲染） */}
          {chatMode && (
            <motion.div
              layout
              transition={LAYOUT_TRANSITION}
              className="px-6 py-3 border-t flex-shrink-0"
              style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
            >
              <div className="max-w-3xl mx-auto w-full">
                <AgentComposer
                  value={inputValue}
                  onChange={setInputValue}
                  onSend={handleSend}
                  disabled={loading}
                  inputRef={inputRef}
                  placeholder={composerPlaceholder}
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
          )}
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
