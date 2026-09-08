/**
 * useAgentConversationFlow — AgentDashboard 的会话流管理 hook
 * -------------------------------------------------------------------
 * 消息/会话/加载/刷新状态、mascot 状态推导与首轮视图切换（finishRound）、
 * 发送（流式优先 → 失败回退非流式）、历史对话加载、新建会话、重发。
 * 在途流按会话注册（streamsRef）：切换/新建会话不 abort，生成在后台继续、
 * 内容累积进记录；切回会话时把半截回复重挂到视图。分叉/删除/离开页面才掐流。
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Dispatch, RefObject, SetStateAction } from 'react'
import {
  sendAgentMessage,
  sendAgentMessageStream,
  getAgentConversationDetail,
} from '@/services/agent-client'
import type { AgentStreamCallbacks } from '@/services/agent-client'
import type { AgentConversation, AgentMessageResponse, ApprovalRequest, ToolCallResult } from '@/types/agent'
import type { LocalMessage } from './types'
import { genClientId } from './types'
import type { InFlightTool } from './ToolCallChips'
import type { MascotState } from './Mascot'

export interface UseAgentConversationFlowOptions {
  inputValue: string
  setInputValue: Dispatch<SetStateAction<string>>
  inputRef: RefObject<HTMLTextAreaElement>
  /** 本次会话覆盖模型（null = 跟随后端配置默认） */
  model?: string | null
  /** 推理档位 off/medium/high（off 显式传：内置 Agnes 映射为 reasoning_effort:none） */
  reasoningLevel?: string
}

export interface UseAgentConversationFlowResult {
  messages: LocalMessage[]
  conversationId: number | null
  loading: boolean
  refreshTrigger: number
  mascotState: MascotState
  firstDone: boolean
  handleSend: (overrideContent?: string, opts?: { inheritVersions?: string[] }) => Promise<void>
  handleSelectConversation: (conv: AgentConversation) => Promise<void>
  handleNewConversation: () => void
  handleResend: (assistantClientId: string) => void
  /** 版本切换：dir=-1 向旧 / +1 向新 */
  handleSwitchVersion: (clientId: string, dir: -1 | 1) => void
  /** 上下文用量（最近一轮 prompt tokens；null = 未知） */
  contextTokens: number | null
  /** 本轮工具调用条目（running → onDone/onError 翻转终态；完成后保留为摘要，下一轮 send 重置） */
  inFlightTools: InFlightTool[]
  /** 分叉：截断消息列表到指定下标（含）并置空会话 */
  handleForkTo: (idx: number) => void
  /** 会话被删除（软删）后：掐掉这些会话名下的在途流（继续生成只会写入已删会话） */
  handleConversationsDeleted: (deletedIds: number[]) => void
}

/** 在途流记录：切走会话不 abort，内容累积于此；切回会话时重挂到视图 */
interface StreamRecord {
  controller: AbortController
  /** 流所属会话（新会话首轮为 null，收到 conversation_id 后回填） */
  convId: number | null
  assistantClientId: string
  userClientId: string
  userContent: string
  sentAt: number
  content: string
  reasoning: string
  tools: InFlightTool[]
  repliedOnce: boolean
  receivedId: boolean
  mascot: MascotState
}

export function useAgentConversationFlow({
  inputValue,
  setInputValue,
  inputRef,
  model = null,
  reasoningLevel = 'off',
}: UseAgentConversationFlowOptions): UseAgentConversationFlowResult {
  const [messages, setMessages] = useState<LocalMessage[]>([])
  /** 上下文用量（最近一轮 prompt_tokens——近似当前会话上下文规模；ContextMeter 用） */
  const [contextTokens, setContextTokens] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<number | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [mascotState, setMascotState] = useState<MascotState>('idle')
  /** 本轮工具调用条目（Beautiful UI 第二批：ToolCallChips 数据源） */
  const [inFlightTools, setInFlightTools] = useState<InFlightTool[]>([])
  /** 工具条目自增序号（一轮内同名工具可能多次调用，用序号去重） */
  const toolSeqRef = useRef(0)

  /** 终态翻转：按 onDone.toolCalls 顺序对齐（success→done / !success→failed）；
      数量不齐时按序消费，inFlightTools 多出的条目标 done */
  const settleTools = useCallback((results?: ToolCallResult[]) => {
    setInFlightTools((prev) => {
      if (prev.length === 0) return prev
      if (!results || results.length === 0) return prev.map((t) => ({ ...t, status: 'done' as const }))
      return prev.map((t, i) => ({
        ...t,
        status: (results[i] ? (results[i].success ? 'done' : 'failed') : 'done') as InFlightTool['status'],
      }))
    })
  }, [])

  /** 全部标 failed（流式 onError / 流中断时兜底） */
  const failAllTools = useCallback(() => {
    setInFlightTools((prev) => prev.map((t) => ({ ...t, status: 'failed' as const })))
  }, [])

  /** 当前会话 id 的 ref 镜像：流式回调比对「流所属会话 == 当前视图会话」用 */
  const conversationIdRef = useRef<number | null>(null)
  /** 在途流注册表（key = assistantClientId）：切换/新建会话不 abort，生成在后台继续 */
  const streamsRef = useRef(new Map<string, StreamRecord>())

  /** 当前视图的在途流（注册表中 convId === 视图会话的记录；新视图对应 convId 为 null 的记录） */
  const findActiveRecord = useCallback((): StreamRecord | undefined => {
    const view = conversationIdRef.current
    for (const rec of streamsRef.current.values()) {
      if (rec.convId === view) return rec
    }
    return undefined
  }, [])

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

  // 离开 AI 管家页面：停止全部在途流（本任务边界——只做会话间切换的后台续跑）
  useEffect(() => () => {
    if (mascotTimer.current) window.clearTimeout(mascotTimer.current)
    for (const rec of streamsRef.current.values()) rec.controller.abort()
    streamsRef.current.clear()
  }, [])

  /** 发送消息（流式优先，失败回退非流式；opts.inheritVersions = 重发时继承的历史版本） */
  const handleSend = useCallback(
    async (overrideContent?: string, opts?: { inheritVersions?: string[] }) => {
      const content = (overrideContent ?? inputValue).trim()
      // 当前视图已有在途流 → 拒绝重发（其他会话的后台流不阻塞本视图发送）
      if (!content || findActiveRecord()) return

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

      // 1) 追加用户消息 + 助手占位（流式逐字填充；重发时占位继承历史版本→版本切换器可用）
      setMessages((prev) => [
        ...prev,
        { clientId: userClientId, role: 'user', content, at: sentAt },
        {
          clientId: assistantClientId, role: 'assistant', content: '', sending: true, at: sentAt,
          ...(opts?.inheritVersions && opts.inheritVersions.length > 0
            ? { versions: opts.inheritVersions, activeVersion: -1 }
            : {}),
        },
      ])
      if (overrideContent === undefined) setInputValue('')
      setLoading(true)
      setInFlightTools([]) // 新一轮 send：清掉上一轮的工具摘要

      // 在途流记录：切走会话后回调继续写记录（后台续跑），仅当流属于当前视图才写视图
      const rec: StreamRecord = {
        controller: new AbortController(),
        convId: conversationId,
        assistantClientId,
        userClientId,
        userContent: content,
        sentAt,
        content: '',
        reasoning: '',
        tools: [],
        repliedOnce: false,
        receivedId: false,
        mascot: 'thinking',
      }
      streamsRef.current.set(assistantClientId, rec)

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
        ...(reasoningLevel ? { reasoningLevel } : {}),
      }

      /** 死流（分叉/删除/卸载触发的 abort）一律静默；视图写入仅当流仍属于当前视图
          （按 convId 归属判断，不查注册表——流结束后迟到的回调仍可落视图，维持旧语义） */
      const isActive = () => !rec.controller.signal.aborted && rec.convId === conversationIdRef.current

      try {
        const callbacks: AgentStreamCallbacks = {
          onConversationId: (id) => {
            if (rec.controller.signal.aborted) return
            // 采纳决策须在改键之前做（改键后 convId 变成新 id，null 视图会比对失配）
            const wasActive = rec.convId === conversationIdRef.current
            rec.convId = id
            rec.receivedId = true
            // 仅当流还在其发起点视图（新会话首轮视图）时采纳 id；用户已切走则不得劫持视图
            if (wasActive) {
              conversationIdRef.current = id
              setConversationId(id)
            }
          },
          onTool: (name) => {
            if (rec.controller.signal.aborted) return
            toolSeqRef.current += 1
            // id 在 setState 外同步取值：updater 会被批处理延迟执行，闭包内读 ref 会拿到同一值
            const id = `tool_${toolSeqRef.current}`
            rec.tools = [...rec.tools, { id, name, status: 'running' as const }]
            rec.mascot = 'searching'
            if (isActive()) {
              setInFlightTools([...rec.tools])
              setMascotState('searching')
            }
          },
          onContent: (text) => {
            if (rec.controller.signal.aborted) return
            const firstReply = !rec.repliedOnce
            if (firstReply) {
              rec.repliedOnce = true
              rec.mascot = 'replying'
            }
            rec.content += text
            if (!isActive()) return
            if (firstReply) setMascotState('replying')
            // 正文以记录为准整体覆盖（切走期间漏掉的片段切回后自愈）
            setMessages((prev) =>
              prev.map((m) =>
                m.clientId === assistantClientId
                  ? { ...m, content: rec.content }
                  : m,
              ),
            )
          },
          onReasoning: (text) => {
            if (rec.controller.signal.aborted) return
            rec.reasoning += text
            if (!isActive()) return
            // 思考过程流式聚合到独立字段（前端折叠展示，不混入正文）
            setMessages((prev) =>
              prev.map((m) =>
                m.clientId === assistantClientId
                  ? { ...m, reasoning: rec.reasoning }
                  : m,
              ),
            )
          },
          onDone: ({ conversationId: doneConvId, toolCalls, message, usage, approval }) => {
            const wasActive = isActive()
            setRefreshTrigger((v) => v + 1) // 刷新洞察/统计与侧栏（后台完成的会话标题/排序更新）
            if (!wasActive) return
            if (usage) setContextTokens(usage.prompt_tokens)
            settleTools(toolCalls) // 工具行按 toolCalls.success 翻转终态，完成后保留为摘要
            setMessages((prev) =>
              prev.map((m) => {
                if (m.clientId !== assistantClientId) return m
                return {
                  ...m, sending: false, toolCalls, content: m.content || message || '',
                  durationSec: Math.round((Date.now() - sentAt) / 1000),
                  // 行动确认卡：随 done 载荷捎带，挂到最终 assistant 消息（MessageBubble 渲染确认卡）；
                  // conversationId 一并挂上，resolve 回传时用（经 spread 附加，不进 LocalMessage 类型声明）
                  ...(approval ? { approval, conversationId: doneConvId } : {}),
                }
              }),
            )
            finishRound(true, 1200)          // 主流程正常完成
          },
          onError: (err) => {
            const wasActive = isActive()
            if (!wasActive) return
            failAllTools() // 全部标 failed
            patchAssistant({ sending: false, content: `❌ 出错了：${err}` })
            finishRound(false, 1600)        // 主流程出错
          },
        }

        await sendAgentMessageStream(request, callbacks, rec.controller.signal)
      } catch {
        // 流被 abort（分叉/删除/卸载）：放弃本轮，不回退、不落地状态
        // （记录清理由 abort 发起方处理）
        if (rec.controller.signal.aborted) return
        // 后台流连接断开：半截内容留在记录里，流将终结；不写视图、不回退非流式
        if (!isActive()) return
        failAllTools() // 流式连接断掉：在途工具全部标 failed
        // P2-7：已收到 conversationId = user 消息已入库，重发非流式会造成重复入库；
        // 以已收到的内容收尾（有正文则保留，无正文则提示中断）。
        if (rec.receivedId) {
          if (rec.repliedOnce) {
            patchAssistant({ sending: false })
            finishRound(true, 1200)
          } else {
            patchAssistant({ sending: false, content: '❌ 连接中断，回复未送达' })
            finishRound(false, 1600)
          }
          return
        }
        // 流式失败 → 无缝回退到非流式（现有逻辑保持不变）
        try {
          const resp = await sendAgentMessage(request)
          if (!isActive()) return
          if (resp.success) {
            if (resp.conversationId) {
              rec.convId = resp.conversationId
              conversationIdRef.current = resp.conversationId
              setConversationId(resp.conversationId)
            }
            settleTools(resp.toolCalls) // 非流式结果回填工具终态
            patchAssistant({
              sending: false,
              content: resp.message?.content ?? '',
              toolCalls: resp.toolCalls,
              // 行动确认卡：非流式响应 message.approval 透传挂载（含 conversationId，resolve 回传用）
              ...(resp.message?.approval
                ? { approval: resp.message.approval, conversationId: resp.conversationId }
                : {}),
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
        const wasActive = isActive()
        streamsRef.current.delete(assistantClientId)
        if (!rec.controller.signal.aborted) setRefreshTrigger((v) => v + 1)
        if (wasActive) {
          setLoading(false)
          setTimeout(() => inputRef.current?.focus(), 50)
        }
      }
    },
    [inputValue, conversationId, finishRound, settleTools, failAllTools, findActiveRecord],
  )

  /** 加载历史对话（在途流不中断；该会话有后台流时把半截回复重挂到视图） */
  const handleSelectConversation = useCallback(
    async (conv: AgentConversation) => {
      // 切换会话：不 abort 在途流（生成在后台继续）；同步会话镜像，旧流回调仅写记录不写新视图
      conversationIdRef.current = conv.id
      setLoading(true)
      setConversationId(conv.id)
      try {
        const detail = await getAgentConversationDetail(conv.id)
        if (detail && detail.messages) {
          // tool 行是给 LLM 的工具结果 JSON，不渲染为消息气泡
          // approval / conversationId 经 spread 附加（AgentMessageResponse 未声明 approval，
          // MessageBubble 侧按 AgentMessage.approval 读取；conversationId 供 resolve 回传用）
          const mapped: LocalMessage[] = detail.messages
            .filter(m => m.role !== 'tool')
            .map(m => {
              const approval = (m as AgentMessageResponse & { approval?: ApprovalRequest }).approval
              return {
                clientId: genClientId(),
                role: m.role as LocalMessage['role'],
                content: m.content,
                toolCalls: m.toolCalls,
                ...(approval ? { approval, conversationId: detail.id } : {}),
              }
            })
          // 重挂在途流：服务端历史已含本轮 user 消息（LLM 调用前落库），只补 assistant 活体占位；
          // clientId 沿用记录值，后续回调的 patchAssistant/整体覆盖仍可命中
          const rec = findActiveRecord()
          if (rec) {
            mapped.push({
              clientId: rec.assistantClientId, role: 'assistant', content: rec.content,
              ...(rec.reasoning ? { reasoning: rec.reasoning } : {}),
              sending: true, at: rec.sentAt,
            })
          }
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
        const rec = findActiveRecord()
        setLoading(rec != null) // 该会话有在途流 → 保持生成中；否则复位
        setInFlightTools(rec?.tools ?? [])
        setMascotState(rec?.mascot ?? 'idle')
      }
    },
    [findActiveRecord],
  )

  /** 新建对话（在途流不中断；新会话首轮若仍在跑 → 从记录重挂到新视图） */
  const handleNewConversation = useCallback(() => {
    conversationIdRef.current = null
    setConversationId(null)
    setInputValue('')
    const rec = findActiveRecord()
    if (rec) {
      // 重挂：null 视图没有服务端历史可拉，user 消息与 assistant 占位都从记录恢复
      setMessages([
        { clientId: rec.userClientId, role: 'user', content: rec.userContent, at: rec.sentAt },
        {
          clientId: rec.assistantClientId, role: 'assistant', content: rec.content,
          ...(rec.reasoning ? { reasoning: rec.reasoning } : {}),
          sending: true, at: rec.sentAt,
        },
      ])
      setMascotState(rec.mascot)
    } else {
      setMessages([])
      setMascotState('idle')
    }
    setLoading(rec != null)
    setInFlightTools(rec?.tools ?? []) // 新建会话：无在途流时清掉工具行
    // 重置「首次响应」标记与 mascot，回到欢迎区
    firstDoneRef.current = false
    setFirstDone(false)
    pendingFirstDoneRef.current = false
    window.clearTimeout(mascotTimer.current)
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [findActiveRecord])

  /** 重发（branchPicker 版）：旧回复存 versions 不丢弃，重发完成后再现版本切换器 */
  const handleResend = useCallback(
    (assistantClientId: string) => {
      const aIdx = messages.findIndex(m => m.clientId === assistantClientId)
      if (aIdx < 0) return
      let uIdx = -1
      for (let i = aIdx - 1; i >= 0; i--) {
        if (messages[i].role === 'user') { uIdx = i; break }
      }
      if (uIdx < 0) return
      const userContent = messages[uIdx].content ?? ''
      const oldMsg = messages[aIdx]
      // 版本打包：旧版本列表 + 当前正文（当前流也成历史）
      const oldVersions = [...(oldMsg.versions ?? []), ...(oldMsg.content ? [oldMsg.content] : [])]
      // 截断到 user 前，重发时把 oldVersions 注入新 assistant 占位
      setMessages(prev => prev.slice(0, uIdx))
      setTimeout(() => handleSend(userContent, { inheritVersions: oldVersions }), 50)
    },
    [messages, handleSend],
  )

  /** 版本切换（branchPicker）：dir=-1 向旧 / +1 向新；越过最新边界回 -1（最新流） */
  const handleSwitchVersion = useCallback(
    (clientId: string, dir: -1 | 1) => {
      setMessages(prev => prev.map(m => {
        if (m.clientId !== clientId || !m.versions || m.versions.length === 0) return m
        const cur = m.activeVersion ?? -1
        let next: number
        if (dir === -1) {
          next = cur === -1 ? m.versions.length - 1 : cur - 1
          if (next < 0) return m // 已在最旧
        } else {
          next = cur + 1
          if (next >= m.versions.length) next = -1 // 越过最新回 content
        }
        return { ...m, activeVersion: next }
      }))
    },
    [],
  )

  /** 会话被删除（软删）：掐掉这些会话名下的在途流——继续生成只会写入已删会话（黑洞） */
  const handleConversationsDeleted = useCallback((deletedIds: number[]) => {
    const ids = new Set(deletedIds)
    for (const [key, rec] of streamsRef.current) {
      if (rec.convId != null && ids.has(rec.convId)) {
        rec.controller.abort()
        streamsRef.current.delete(key)
      }
    }
    const rec = findActiveRecord()
    setLoading(rec != null)
    setInFlightTools(rec?.tools ?? [])
    if (!rec) setMascotState('idle')
  }, [findActiveRecord])

  return {
    messages,
    conversationId,
    loading,
    refreshTrigger,
    mascotState,
    firstDone,
    contextTokens,
    inFlightTools,
    handleSend,
    handleSelectConversation,
    handleNewConversation,
    handleResend,
    handleSwitchVersion,
    handleConversationsDeleted,
    /** 分叉：截断消息列表到指定下标（含）并置空会话——下次发送自动建新会话 */
    handleForkTo: (idx: number) => {
      // 分叉编辑当前会话：只掐当前视图自己的在途流，其他会话的后台流不受影响
      const rec = findActiveRecord()
      if (rec) {
        rec.controller.abort()
        streamsRef.current.delete(rec.assistantClientId)
      }
      setMessages(prev => prev.slice(0, idx + 1))
      conversationIdRef.current = null
      setConversationId(null)
      setLoading(false)
      setInFlightTools([]) // 分叉：清掉工具行
      firstDoneRef.current = true
      setFirstDone(true)
      pendingFirstDoneRef.current = false
    },
  }
}
