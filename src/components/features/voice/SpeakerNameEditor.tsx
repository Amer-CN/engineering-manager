/**
 * SpeakerNameEditor — 段落发言人标识：圆形首字头像 + 显示名（可就地改名）
 *
 * - 头像：显示名第一个字，按说话人编号从 AVATAR_STYLES 固定柔和底色轮换
 * - 显示名徽标可点击 → 就地小输入框：Enter / 失焦确认，Esc 取消
 * - 改名只回传 onRename(新名)，状态由父组件（TaskDetailView.speakerNames）持有，
 *   实现左栏全部段落 / 摘取笔记 / 导出全局同步（纯前端会话内，不落库）
 * - name 为用户输入，一律作为 {文本} 由 React 转义渲染，无 HTML 注入面
 */

import React, { useState, useRef, useEffect } from 'react'
import { Icon } from '@/components/ui/Icon'

/** 头像柔和底色（Tailwind 固定色，按说话人编号轮换）：浅紫/浅绿/浅琥珀/浅蓝/浅玫 */
export const AVATAR_STYLES = [
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-sky-100 text-sky-700',
  'bg-rose-100 text-rose-700',
]

export function speakerAvatarClass(speaker: number): string {
  const n = AVATAR_STYLES.length
  return AVATAR_STYLES[((speaker % n) + n) % n]
}

interface SpeakerNameEditorProps {
  /** 原始说话人编号（决定头像配色轮换） */
  speaker: number
  /** 当前显示名（默认「说话人N」） */
  name: string
  /** 确认改名回调（空/未变不触发） */
  onRename: (name: string) => void
}

const SpeakerNameEditor: React.FC<SpeakerNameEditorProps> = ({ speaker, name, onRename }) => {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (open) inputRef.current?.select()
  }, [open])

  const startEdit = () => {
    setDraft(name)
    setOpen(true)
  }

  const confirm = () => {
    setOpen(false)
    const next = draft.trim()
    if (next && next !== name) onRename(next)
  }

  const cancel = () => setOpen(false)

  if (open) {
    return (
      <input
        ref={inputRef}
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={confirm}
        onKeyDown={e => {
          if (e.key === 'Enter') confirm()
          else if (e.key === 'Escape') cancel()
        }}
        maxLength={20}
        className="w-24 px-1.5 py-0.5 text-xs rounded border border-[color:var(--accent)] bg-[color:var(--card)] text-[color:var(--fg)] outline-none"
        title="Enter 确认，Esc 取消"
      />
    )
  }

  return (
    <button
      type="button"
      onClick={startEdit}
      title="点击修改发言人名称"
      className="flex items-center gap-2 group min-w-0"
    >
      <span
        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${speakerAvatarClass(speaker)}`}
      >
        {name.charAt(0) || '说'}
      </span>
      <span className="text-xs font-medium text-[color:var(--accent)] truncate">{name}</span>
      <Icon
        name="Pencil" size={10}
        className="flex-shrink-0 text-[color:var(--muted)] opacity-0 group-hover:opacity-100 transition-opacity"
      />
    </button>
  )
}

export default SpeakerNameEditor
