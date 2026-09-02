/**
 * ContextMeter — 输入框操作行右侧的上下文容量指示（ZCode 式）
 * 随最近一轮 prompt_tokens 显示当前会话上下文规模与剩余余量；
 * hover 展开明细（本轮输入/输出 token 与 1M 窗口占比）。
 */

import React, { useState } from 'react'
import { Icon } from '@/components/ui/Icon'

/** 上下文窗口（Agnes flash/pro 系列 1M；512K 保守取半亦可，这里用 1M） */
const CONTEXT_WINDOW = 1_000_000

interface ContextMeterProps {
  /** 最近一轮 prompt_tokens（近似当前上下文规模）；null = 未测量隐藏 */
  contextTokens: number | null
  /** 本轮输出 tokens（可选显示） */
  lastCompletionTokens?: number | null
}

const fmt = (n: number): string =>
  n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n)

const ContextMeter: React.FC<ContextMeterProps> = ({ contextTokens, lastCompletionTokens }) => {
  const [open, setOpen] = useState(false)

  if (contextTokens == null) return null

  const pct = Math.min(100, (contextTokens / CONTEXT_WINDOW) * 100)
  const remaining = Math.max(0, CONTEXT_WINDOW - contextTokens)
  // 余量分档：<20% 警示红 / <50% 琥珀 / 其后正常 muted
  const tone =
    pct > 80 ? 'var(--danger)' :
    pct > 50 ? 'var(--warning)' :
    'var(--muted)'

  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <div
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs"
        style={{ color: tone }}
        title="上下文容量"
      >
        {/* 容量微条 */}
        <span className="relative w-10 h-1 rounded-full overflow-hidden" style={{ background: 'var(--panel-2)' }}>
          <span
            className="absolute left-0 top-0 h-full rounded-full transition-[width,background-color]"
            style={{ width: `${pct}%`, background: tone }}
          />
        </span>
        <span>{fmt(remaining)} 余</span>
      </div>

      {open && (
        <div
          className="absolute bottom-full right-0 mb-1.5 px-3 py-2 rounded-xl border shadow-lg text-xs whitespace-nowrap z-30"
          style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--fg-2)' }}
        >
          <div className="flex items-center gap-1.5">
            <Icon name="Database" size={11} />
            <span>上下文 {fmt(contextTokens)} / 1M（{pct.toFixed(1)}%）</span>
          </div>
          {lastCompletionTokens != null && (
            <div className="mt-1" style={{ color: 'var(--muted)' }}>
              上轮输出 {fmt(lastCompletionTokens)} tokens
            </div>
          )}
          <div className="mt-1" style={{ color: 'var(--muted)' }}>
            剩余 {fmt(remaining)} tokens
          </div>
        </div>
      )}
    </div>
  )
}

export default ContextMeter
