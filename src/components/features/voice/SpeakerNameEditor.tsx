/**
 * SpeakerNameEditor — 段落发言人标识：圆形首字头像 + 显示名（可就地改名）
 *
 * - 头像：显示名第一个字，底色用 speakers 表的 color（AutoSubs 8 色 hex，inline style），
 *   文字固定白色；未入库编号由 speakerOf 按色板轮换兜底
 * - 显示名徽标可点击 → 就地小输入框：Enter / 失焦确认，Esc 取消
 * - 改名只回传 onRename(新名)，状态由父组件（TaskDetailView.speakers 实体表）持有，
 *   实现左栏全部段落 / 摘取笔记 / 导出全局同步（纯前端会话内，不落库）
 * - name 为用户输入，一律作为 {文本} 由 React 转义渲染，无 HTML 注入面
 */

import React, { useState, useRef, useEffect } from 'react'
import { Icon } from '@/components/ui/Icon'

/** 说话人实体（AutoSubs speakers 模型，前端会话内）：id = 原始编号 */
export interface SpeakerInfo {
  id: number
  name: string
  color: string
}

/** 头像底色板（AutoSubs DEFAULT_COLORS 8 色 hex，按说话人编号轮换；inline style 使用） */
export const DEFAULT_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
]

/** speakers 表统一查询：显示名/头像色（未改名 → 「说话人N」；未入库编号按色板轮换兜底） */
export function speakerOf(speakers: SpeakerInfo[] | undefined, id: number): { name: string; color: string } {
  const hit = speakers?.find(s => s.id === id)
  const n = DEFAULT_COLORS.length
  return {
    name: hit?.name ?? `说话人${id}`,
    color: hit?.color ?? DEFAULT_COLORS[((id % n) + n) % n],
  }
}

interface SpeakerNameEditorProps {
  /** 当前显示名（默认「说话人N」） */
  name: string
  /** 头像底色（speakers 表的 color，hex） */
  color: string
  /** 确认改名回调（空/未变不触发） */
  onRename: (name: string) => void
}

const SpeakerNameEditor: React.FC<SpeakerNameEditorProps> = ({ name, color, onRename }) => {
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
        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 text-white"
        style={{ backgroundColor: color }}
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
