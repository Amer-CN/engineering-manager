/**
 * RecoveryCard — 错误恢复卡片
 * 来源：TurboKach/ai-native-react-components（Beautiful UI recommendation-card，MIT），按项目风格适配。
 *
 * 标题「刚才的回复出错了」+ 错误正文（去掉 ❌ 前缀）；底部左侧 3 格信号表
 * （红 tone、signal=1、标签「请求失败」，沿用原版 Meter 视觉），右侧主按钮
 * 「重试」+「其他恢复方式」开抽屉；抽屉（原版 Alternatives 交互语法，网格行
 * 0fr→1fr 展开）提供「编辑后重发」「新开话题」两个恢复动作。
 *
 * 裁剪说明：原版 OPTIONS 多方案选择 / accepted 态切换不移植——错误场景只有
 * 一组固定动作；「重试」点击直接触发（不转 accepted 态，交互更直接）。
 * 触发由 AgentDashboard 裁决：最后一轮 assistant 消息以 ❌ 开头时渲染。
 */

import React, { useState } from 'react'
import type { LocalMessage } from './types'

interface RecoveryCardProps {
  /** 错误正文（已去掉 ❌ 前缀） */
  errorText: string
  /** 重试（重跑本轮） */
  onRetry: () => void
  /** 编辑后重发（该轮用户问题回填输入框并聚焦） */
  onEdit: () => void
  /** 新开话题 */
  onNewTopic: () => void
}

/** 3 格信号表（原版 Meter：signal=1 格点亮红 tone） */
function Meter() {
  return (
    <span className="flex items-end gap-0.5" aria-hidden>
      {[0, 1, 2].map((bar) => (
        <span
          key={bar}
          className="w-1 rounded-full"
          style={{ height: 10, background: bar < 1 ? 'var(--danger)' : 'var(--border)' }}
        />
      ))}
    </span>
  )
}

const RecoveryCard: React.FC<RecoveryCardProps> = ({ errorText, onRetry, onEdit, onNewTopic }) => {
  const [open, setOpen] = useState(false)

  return (
    <div
      className="w-full max-w-xl overflow-hidden rounded-2xl"
      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
    >
      <div className="px-4 pt-3.5 pb-3">
        <span className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>
          刚才的回复出错了
        </span>
        <p className="mt-1.5 break-words text-sm leading-relaxed" style={{ color: 'var(--fg-2)' }}>
          {errorText}
        </p>
      </div>

      {/* 恢复方式抽屉（原版 Alternatives 交互语法：网格行 0fr→1fr 展开） */}
      <div
        className="grid transition-[grid-template-rows,opacity] duration-300"
        style={{
          gridTemplateRows: open ? '1fr' : '0fr',
          opacity: open ? 1 : 0,
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div className="overflow-hidden">
          <div className="border-t px-3 py-2" style={{ borderColor: 'var(--border)', background: 'var(--panel-2)' }}>
            {[
              { key: 'edit', label: '编辑后重发', desc: '把该轮问题回填输入框，修改后再发送', action: onEdit },
              { key: 'new', label: '新开话题', desc: '另起会话，不带当前上下文', action: onNewTopic },
            ].map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={opt.action}
                className="flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left transition-colors duration-100 hover:bg-[color:var(--card)]"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium" style={{ color: 'var(--fg)' }}>{opt.label}</span>
                  <span className="block text-xs" style={{ color: 'var(--muted)' }}>{opt.desc}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        className="flex items-center justify-between gap-3 border-t px-4 py-2.5"
        style={{ borderColor: 'var(--border)', background: 'var(--panel-2)' }}
      >
        <span className="flex items-center gap-2">
          <Meter />
          <span className="text-xs font-medium" style={{ color: 'var(--fg-2)' }}>请求失败</span>
        </span>

        <span className="flex items-center gap-2">
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((current) => !current)}
            className="flex h-7 items-center rounded-lg px-2.5 text-xs font-medium transition-colors duration-100 hover:bg-[color:var(--card)]"
            style={{ background: 'var(--card)', color: 'var(--fg-2)', border: '1px solid var(--border)' }}
          >
            其他恢复方式
          </button>
          <button
            type="button"
            onClick={onRetry}
            className="flex h-7 items-center rounded-lg px-3 text-xs font-medium transition-[background-color,transform] duration-150 active:scale-[0.96]"
            style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
          >
            重试
          </button>
        </span>
      </div>
    </div>
  )
}

/** 错误恢复上下文：最后一轮 assistant ❌ 消息 + 其对应用户问题（AgentDashboard 触发裁决用） */
export interface RecoveryContext {
  /** 出错的 assistant 消息 clientId（重试用） */
  assistantClientId: string
  /** 该轮用户问题原文（编辑回填用） */
  userContent: string
  /** 错误正文（去掉 ❌ 前缀后的文案） */
  errorText: string
}

/** 错误判定（启发式）：最后一条消息是 assistant、非 sending、content 以 ❌ 开头；
    向前找最近一条 user 消息作为「该轮问题」。不满足返回 null。 */
export function findRecoveryContext(messages: LocalMessage[]): RecoveryContext | null {
  const last = messages[messages.length - 1]
  if (!last || last.role !== 'assistant' || last.sending) return null
  const content = last.content ?? ''
  if (!content.startsWith('❌')) return null
  let userContent = ''
  for (let i = messages.length - 2; i >= 0; i--) {
    if (messages[i].role === 'user') {
      userContent = messages[i].content ?? ''
      break
    }
  }
  return {
    assistantClientId: last.clientId,
    userContent,
    errorText: content.replace(/^❌\s*/, ''),
  }
}

export default RecoveryCard
