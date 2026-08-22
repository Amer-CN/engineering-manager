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
  /** 本次会话覆盖模型（null = 跟随后端配置默认） */
  model?: string | null
  /** 推理档位 off/low/medium/high（off = 不传） */
  reasoningLevel?: string
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
  /** 分叉：截断消息列表到指定下标（含）并置空会话 */
  handleForkTo: (idx: number) => void
}

export function useAgentConversationFlow({
  inputValue,
  setInputValue,
  inputRef,
  model = null,
  reasoningLevel = 'off',
}: UseAgentConversationFlowOptions): UseAgentConversationFlowResult {
  const [messages, setMessages] = useState<LocalMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<number | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [mascotState, setMascotState] = useState<MascotState>('idle')

  /** 当前会话 id 的 ref 镜像：流式回调比对「流所属会话 == 当前会话」用 */
  const conversationIdRef = useRef<number | null>(null)
  /** 在途流式请求的 AbortController：切换/新建会话时 abort 旧流 */
  const abortRef = useRef<AbortController | null>(null)

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
      const sentAt = Date.now()

      // 1) 追加用户消息 + 助手占位（流式逐字填充）
      setMessages((prev) => [
        ...prev,
        { clientId: userClientId, role: 'user', content, at: sentAt },
        { clientId: assistantClientId, role: 'assistant', content: '', sending: true, at: sentAt },
      ])
      if (overrideContent === undefined) setInputValue('')
      setLoading(true)

      // 局部工具：按 clientId 更新助手占位（收尾自动带上本轮耗时）
      const patchAssistant = (patch: Partial<LocalMessage>) => {
        const done = 'sending' in patch && patch.sending === false
        setMessages((prev) =>
          prev.map((m) =>
            m.clientId === assistantClientId
              ? { ...m, ...patch, ...(done ? { durationSec: Math.round((Date.now() - sentAt) / 1000) } : {}) }
              : m,
          ),
        )
      }

      const request = {
        message: content,
        ...(conversationId ? { conversationId } : {}),
        ...(model ? { model } : {}),
        ...(reasoningLevel && reasoningLevel !== 'off' ? { reasoningLevel } : {}),
      }

      // 首次正文到达前记录，避免 tool 期间重复置 replying
      let repliedOnce = false

      // 流式竞态防护：记录本轮流式所属会话（新会话首轮为 null，收到 conversation_id 后回填），
      // 回调落地前比对 conversationIdRef（当前会话镜像）；会话切换会 abort，双保险。
      let streamConvId = conversationId
      // P2-7：本轮是否已从流里收到 conversationId（= 服务端已建会话并落库 user 消息）
      let receivedId = false
      const controller = new AbortController()
      abortRef.current = controller
      const isStale = () => controller.signal.aborted || conversationIdRef.current !== streamConvId

      try {
        const callbacks: AgentStreamCallbacks = {
          onConversationId: (id) => {
            if (isStale()) return
            streamConvId = id
            receivedId = true
            conversationIdRef.current = id
            setConversationId(id)
          },
          onTool: (name) => {
            if (isStale()) return
            patchAssistant({ content: `🔧 正在查询：${name}…` })
            setMascotState('searching')
          },
          onContent: (text) => {
            if (isStale()) return
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
          onReasoning: (text) => {
            if (isStale()) return
            // 思考过程流式聚合到独立字段（前端折叠展示，不混入正文）
            setMessages((prev) =>
              prev.map((m) =>
                m.clientId === assistantClientId
                  ? { ...m, reasoning: (m.reasoning ?? '') + text }
                  : m,
              ),
            )
          },
          onDone: ({ toolCalls, message }) => {
            if (isStale()) return
            setMessages((prev) =>
              prev.map((m) => {
                if (m.clientId !== assistantClientId) return m
                // 若正文仍是「🔧 正在查询」占位（工具跑完但模型没产出正文），视为无正文
                const streamed = m.content && !m.content.startsWith('🔧') ? m.content : ''
                return { ...m, sending: false, toolCalls, content: streamed || message || '', durationSec: Math.round((Date.now() - sentAt) / 1000) }
              }),
            )
            setRefreshTrigger((v) => v + 1) // 刷新洞察/统计
            finishRound(true, 1200)          // 主流程正常完成
          },
          onError: (err) => {
            if (isStale()) return
            patchAssistant({ sending: false, content: `❌ 出错了：${err}` })
            finishRound(false, 1600)        // 主流程出错
          },
        }

        await sendAgentMessageStream(request, callbacks, controller.signal)
      } catch {
        // 流被 abort（用户切换/新建会话）：放弃本轮，不回退、不落地状态
        if (controller.signal.aborted) return
        // P2-7：已收到 conversationId = user 消息已入库，重发非流式会造成重复入库；
        // 以已收到的内容收尾（有正文则保留，无正文则提示中断）。
        if (receivedId) {
          if (repliedOnce) {
            patchAssistant({ sending: false })
            finishRound(true, 1200)
          } else {
            patchAssistant({ sending: false, content: '❌ 连接中断，回复未送达' })
            finishRound(false, 1600)
          }
          return
        }
        // 2) 流式失败 → 无缝回退到非流式（现有逻辑保持不变）
        try {
          const resp = await sendAgentMessage(request)
          if (isStale()) return
          if (resp.success) {
            if (resp.conversationId) {
              streamConvId = resp.conversationId
              conversationIdRef.current = resp.conversationId
              setConversationId(resp.conversationId)
            }
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
        if (!controller.signal.aborted) {
          setLoading(false)
          setRefreshTrigger((v) => v + 1)
          setTimeout(() => inputRef.current?.focus(), 50)
        }
      }
    },
    [inputValue, loading, conversationId, finishRound],
  )

  /** 加载历史对话 */
  const handleSelectConversation = useCallback(
    async (conv: AgentConversation) => {
      // 切换会话：abort 旧流并同步会话镜像，避免旧流回调写入新会话视图
      abortRef.current?.abort()
      abortRef.current = null
      conversationIdRef.current = conv.id
      setLoading(true)
      setConversationId(conv.id)
      try {
        const detail = await getAgentConversationDetail(conv.id)
        if (detail && detail.messages) {
          // tool 行是给 LLM 的工具结果 JSON，不渲染为消息气泡
          const mapped: LocalMessage[] = detail.messages
            .filter(m => m.role !== 'tool')
            .map(m => ({
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
    // 新建会话：abort 旧流并同步会话镜像（被 abort 的流不执行 finally 清理，这里兜底复位 loading）
    abortRef.current?.abort()
    abortRef.current = null
    conversationIdRef.current = null
    setMessages([])
    setConversationId(null)
    setInputValue('')
    setLoading(false)
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
    /** 分叉：截断消息列表到指定下标（含）并置空会话——下次发送自动建新会话 */
    handleForkTo: (idx: number) => {
      abortRef.current?.abort()
      abortRef.current = null
      setMessages(prev => prev.slice(0, idx + 1))
      conversationIdRef.current = null
      setConversationId(null)
      setLoading(false)
      firstDoneRef.current = true
      setFirstDone(true)
      pendingFirstDoneRef.current = false
    },
  }
}