/**
 * SelectionAiBar — 选中文字 AI 操作条（Beautiful UI B1）
 *
 * 来源：TurboKach/ai-native-react-components（MIT）selection-actions.tsx 裁剪移植（简化：
 * 不做 rAF 测量优化、不做宽度动画，pop-in 入场）。只在 agent assistant 气泡
 * （MarkdownRenderer 输出区域）内选中 >20 字符时浮出，挂载于 MarkdownRenderer 容器内。
 *
 * 接口：复用现成 POST /api/writing/assist（writing-client.writingAssist），指令映射
 * 改进→polish / 缩短→shorten / 自定义输入→custom；「解释」不调接口，直接把
 * 「请解释：{原文}」送回输入框（解释型回答长，放输入框合理）。
 * 回流：走 useAgentPrefill 同款通道——sessionStorage('agent:prefill') + window
 * 'agent:prefill' 事件，把文本送进 agent 输入框。
 * 权限：端点要求 writing:create，失败（success:false / 异常）时 toast
 * 「当前账号无此权限」，操作条不隐藏但按钮置灰。
 */

import React, { useEffect, useRef, useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { useToastStore } from '@/store/toastStore'
import { writingAssist } from '@/services/writing-client'
import { useTextSelection } from './useTextSelection'

interface SelectionAiBarProps {
  /** 选区作用域（assistant 气泡渲染容器） */
  containerRef: React.RefObject<HTMLElement | null>
}

type Phase = 'idle' | 'busy' | 'done' | 'denied'

const actionBtnCls =
  'flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition-colors hover:bg-[color:var(--panel-2)] disabled:cursor-not-allowed disabled:opacity-50'

const SelectionAiBar: React.FC<SelectionAiBarProps> = ({ containerRef }) => {
  const info = useTextSelection(containerRef)
  const [phase, setPhase] = useState<Phase>('idle')
  const [prompt, setPrompt] = useState('')
  const showToast = useToastStore((s) => s.showToast)
  /** 记录当前选区文本，选区变化时重置操作条状态 */
  const lastTextRef = useRef<string | null>(null)

  // 新选区 → 重置为初始态（权限置灰/完成态不复用）
  useEffect(() => {
    if (info?.text !== lastTextRef.current) {
      lastTextRef.current = info?.text ?? null
      setPhase('idle')
      setPrompt('')
    }
  }, [info?.text])

  /** useAgentPrefill 同款回流通道 */
  const prefill = (text: string) => {
    try {
      sessionStorage.setItem('agent:prefill', text)
    } catch { /* ignore */ }
    window.dispatchEvent(new Event('agent:prefill'))
  }

  const finishByAssist = async (
    body: Parameters<typeof writingAssist>[0],
  ) => {
    if (!info) return
    setPhase('busy')
    try {
      const res = await writingAssist(body)
      if (res.success && res.data?.text) {
        prefill(res.data.text)
        setPhase('done')
      } else {
        showToast('当前账号无此权限', 'error')
        setPhase('denied')
      }
    } catch {
      showToast('当前账号无此权限', 'error')
      setPhase('denied')
    }
  }

  /** 「解释」：不调 writing/assist，把问题直接送回输入框 */
  const explain = () => {
    if (!info) return
    prefill(`请解释：${info.text}`)
    setPhase('done')
  }

  const runCustom = () => {
    const input = prompt.trim()
    if (!input || !info) return
    void finishByAssist({ instruction: 'custom', selectedText: info.text, customInstruction: input })
  }

  const dismiss = () => {
    try { window.getSelection()?.removeAllRanges() } catch { /* ignore */ }
    setPhase('idle')
    setPrompt('')
  }

  if (!info) return null
  const denied = phase === 'denied'

  return (
    <div
      className="fixed z-50 flex items-center gap-1 rounded-xl border px-2 py-1.5 shadow-lg"
      style={{
        top: info.top,
        left: info.left,
        transform: 'translateX(-50%)',
        background: 'var(--card)',
        borderColor: 'var(--border)',
        animation: 'pop-in 220ms cubic-bezier(0.23,1,0.32,1) both',
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {phase === 'busy' ? (
        <span className="flex items-center gap-1.5 px-1 text-xs" style={{ color: 'var(--fg-2)' }}>
          <Icon name="Loader" size={13} className="animate-spin" />
          处理中…
        </span>
      ) : phase === 'done' ? (
        <span className="flex items-center gap-1.5 px-1 text-xs" style={{ color: 'var(--success)' }}>
          <Icon name="Check" size={13} />
          已复制到输入框
        </span>
      ) : (
        <>
          <button type="button" className={actionBtnCls} style={{ color: 'var(--fg)' }} disabled={denied} onClick={explain}>
            <Icon name="MessageSquare" size={13} />
            解释
          </button>
          <button
            type="button"
            className={actionBtnCls}
            style={{ color: 'var(--fg)' }}
            disabled={denied}
            onClick={() => void finishByAssist({ instruction: 'polish', selectedText: info.text })}
          >
            <Icon name="Sparkles" size={13} />
            改进
          </button>
          <button
            type="button"
            className={actionBtnCls}
            style={{ color: 'var(--fg)' }}
            disabled={denied}
            onClick={() => void finishByAssist({ instruction: 'shorten', selectedText: info.text })}
          >
            <Icon name="Minimize2" size={13} />
            缩短
          </button>
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') runCustom() }}
            placeholder="用一句话描述你想要的效果"
            aria-label="自定义效果描述"
            className="w-36 bg-transparent text-xs outline-none"
            style={{ color: 'var(--fg)' }}
          />
          <button
            type="button"
            aria-label="发送"
            disabled={denied || prompt.trim().length === 0}
            onClick={runCustom}
            className="flex items-center rounded-lg px-1.5 py-1 text-xs transition-colors hover:bg-[color:var(--panel-2)] disabled:cursor-not-allowed disabled:opacity-50"
            style={{ color: 'var(--fg)' }}
          >
            <Icon name="CornerDownLeft" size={13} />
          </button>
        </>
      )}
      <button
        type="button"
        aria-label="关闭"
        onClick={dismiss}
        className="flex items-center rounded-lg px-1 py-1 transition-colors hover:bg-[color:var(--panel-2)]"
        style={{ color: 'var(--muted)' }}
      >
        <Icon name="X" size={13} />
      </button>
    </div>
  )
}

export default SelectionAiBar
