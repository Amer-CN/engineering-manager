/**
 * Agent 组件共享类型与工具函数
 */

import type { AgentMessage } from '@/types/agent'

/** 本地消息模型（扩展自后端模型，增加客户端 id 和发送状态） */
export interface LocalMessage {
  clientId: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content?: string
  toolCalls?: AgentMessage['toolCalls']
  sending?: boolean
}

/** 生成客户端消息 id */
let _nextId = 1
export function genClientId(): string {
  return `msg_${Date.now()}_${_nextId++}`
}

/** 跳转到指定页面（通过全局 navigate 事件） */
export function navigateTo(page: string): void {
  window.dispatchEvent(new CustomEvent('navigate', { detail: page }))
}

/** 斜杠命令定义 */
export interface SlashCommand {
  key: string
  label: string
  prompt: string
}

export const SLASH_COMMANDS: SlashCommand[] = [
  { key: '/项目', label: '项目查询', prompt: '帮我总结一下目前所有项目的状态' },
  { key: '/发票', label: '发票查询', prompt: '有哪些发票需要付款？' },
  { key: '/结算', label: '结算查询', prompt: '最近的结算办理情况如何？' },
  { key: '/成本', label: '成本分析', prompt: '帮我分析一下成本支出情况' },
  { key: '/人员', label: '人员查询', prompt: '我们有多少员工和工人？' },
]
