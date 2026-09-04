/**
 * DictationButton — 听写麦克风按钮（AgentComposer 行数门禁拆分件）
 * 录音中：eq-bounce 三条声波错峰跳动 + aria-pressed；转写中：小 spinner；
 * STT / getUserMedia 不可用时由上层隐藏（不渲染）。
 */

import React from 'react'
import { Tooltip } from '@/components/ui/Tooltip'
import { Icon } from '@/components/ui/Icon'
import type { DictationPhase } from './useDictation'

interface DictationButtonProps {
  phase: DictationPhase
  onToggle: () => void
  disabled?: boolean
}

const DictationButton: React.FC<DictationButtonProps> = ({ phase, onToggle, disabled }) => {
  const recording = phase === 'recording'
  const transcribing = phase === 'transcribing'
  return (
    <Tooltip
      content={recording ? '点击麦克风结束听写' : transcribing ? '转写中，点击取消' : '语音听写（自动转文字）'}
      position="top"
    >
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-pressed={recording}
        aria-label={recording ? '结束听写' : transcribing ? '取消听写' : '开始听写'}
        className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
          recording
            ? 'text-[color:var(--danger)] bg-[color:var(--danger-soft)]'
            : 'text-[color:var(--muted)] hover:text-[color:var(--accent)] hover:bg-[color:var(--accent-soft)]'
        }`}
      >
        {transcribing ? (
          <span className="animate-spin" role="img" aria-label="转写中">
            <Icon name="Loader2" size={16} />
          </span>
        ) : recording ? (
          <span className="flex h-4 items-end gap-[2px]" aria-hidden>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-[3px] rounded-full bg-[color:var(--danger)]"
                style={{
                  height: '100%',
                  transformOrigin: 'bottom',
                  animation: `eq-bounce 900ms ease-in-out ${i * 150}ms infinite`,
                }}
              />
            ))}
          </span>
        ) : (
          <Icon name="Mic" size={16} />
        )}
      </button>
    </Tooltip>
  )
}

export default DictationButton
