/**
 * useAgentConversationFlow — AgentDashboard 的会话流管理 hook
 * -------------------------------------------------------------------
 * 从 AgentDashboard.tsx 原样迁移（CI 行数门禁拆分，零行为变化）：
 * 消息/会话/加载/刷新状态、mascot 状态推导与首轮视图切换（finishRound）、
 * 发送（流式优先 → 失败回退非流式）、历史对话加载、新建会话、重发。
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Dispatch, RefObject, SetStateAction } from 'react'
import {
  sendAgentMessage,
  sendAgentMessageStream,
  getAgentConversationDetail,
} from '@/services/agent-client'
import type { AgentStreamCallbacks } from '@/services/agent-client'
import type { AgentConversation } from '@/types/agent'
import type { LocalMessage } from './types'
import { genClientId } from './types'
import type { MascotState } from './Mascot'

export interface UseAgentConversationFlowOptions {
  inputValue: string
  setInputValue: Dispatch<SetStateAction<string>>
  inputRef: RefObject<HTMLTextAreaElement>
}

export interface UseAgentConversationFlowResult {
  messages: LocalMessage[]
  conversationId: number | null
  loading: boolean
  refreshTrigger: number
  mascotState: MascotState
  firstDone: boolean
  handleSend: (overrideContent?: string) => Promise<void>
  handleSelectConversation: (conv: AgentConversation) => Promise<void>
  handleNewConversation: () => void
  handleResend: (assistantClientId: string) => void
}

export function useAgentConversationFlow({
  inputValue,
  setInputValue,
  inputRef,
}: UseAgentConversationFlowOptions): UseAgentConversationFlowResult {
  const [messages, setMessages] = useState<LocalMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<number | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
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

  return {
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
  }
}