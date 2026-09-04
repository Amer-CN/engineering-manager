/**
 * TranscriptRow — 编辑器单行（六期行内编辑模式，照 AutoSubs draft/original 双份）
 *
 * - 未激活段：纯展示（点击文本进入行内编辑）；激活段：contentEditable 就地编辑
 *   - Enter 提交并退出；Esc 还原到进入编辑前的原文（originalText 模式）；失焦自动提交
 * - 激活段显示操作按钮组：「↑首词→上一段」「←末词→下一段」「在此段后插入」「删除此段」
 *   （边界禁用：首段无↑、末段无←、单段不可删、无词段不可搬移）+ 归属修正下拉
 * - 搬移/插删只改 segments 数组由父组件处理；时间按字符比例重算（见 segmentUtils）
 * - 文本一律 React {文本} / contentEditable 初始子节点渲染，无 innerHTML 直插
 */

import React, { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import SpeakerNameEditor from './SpeakerNameEditor'
import type { SttSegment } from '@/services/stt-client'

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

interface TranscriptRowProps {
  seg: SttSegment
  index: number
  /** 当前激活段（行内编辑中；失焦提交后保持激活，Enter/Esc 或点其他段才切换） */
  active: boolean
  isFirst: boolean
  isLast: boolean
  /** 全列表仅此一段 → 不可删除 */
  isOnly: boolean
  /** 本段说话人显示名（speakers 表） */
  name: string
  /** 本段说话人头像色（speakers 表） */
  color: string
  /** 归属修正下拉选项（value = 原始编号） */
  speakerChoices: { value: number; label: string }[]
  nextSpeakerNum: number
  canPlay: boolean
  /** 激活/取消激活（-1 = 全部退出行内编辑） */
  onActivate: (index: number) => void
  /** 点时间戳跳播 */
  onSeekStart: (index: number) => void
  onTextCommit: (index: number, text: string) => void
  onSpeakerChange: (index: number, speaker: number) => void
  onMoveFirstWord: (index: number) => void
  onMoveLastWord: (index: number) => void
  onInsertAfter: (index: number) => void
  onDelete: (index: number) => void
  onRenameSpeaker?: (speaker: number, name: string) => void
}

const TranscriptRow: React.FC<TranscriptRowProps> = ({
  seg, index, active, isFirst, isLast, isOnly, name, color,
  speakerChoices, nextSpeakerNum, canPlay,
  onActivate, onSeekStart, onTextCommit, onSpeakerChange,
  onMoveFirstWord, onMoveLastWord, onInsertAfter, onDelete, onRenameSpeaker,
}) => {
  // 进入行内编辑那一刻的原文快照（Esc 还原用；也是 contentEditable 的初始子节点）
  const originalRef = useRef('')
  const editRef = useRef<HTMLDivElement | null>(null)
  const hasWord = seg.text.trim().length > 0

  // 激活时聚焦并把光标移到末尾（异常环境如 jsdom 忽略光标设置）
  useEffect(() => {
    if (!active) return
    const el = editRef.current
    if (!el) return
    el.focus()
    try {
      const range = document.createRange()
      range.selectNodeContents(el)
      range.collapse(false)
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(range)
    } catch { /* 光标设置失败不影响编辑 */ }
  }, [active])

  const startEdit = () => {
    originalRef.current = seg.text // 先快照再激活，渲染时作为初始子节点
    onActivate(index)
  }
  // 失焦自动提交（保持激活：按钮组/归属下拉不消失，可继续操作）
  const commitIfChanged = () => {
    const text = editRef.current?.textContent ?? ''
    if (text !== seg.text) onTextCommit(index, text)
  }
  // Esc 还原到进入编辑前的原文
  const restoreOriginal = () => {
    const text = editRef.current?.textContent ?? ''
    if (text !== originalRef.current) onTextCommit(index, originalRef.current)
  }

  return (
    <div className={`flex gap-2 items-start p-2 rounded-lg border transition-colors ${
      active ? 'border-[color:var(--accent)] bg-[color:var(--card)]' : 'border-[color:var(--border)] bg-[color:var(--card)]'
    }`}>
      <div className="flex-shrink-0 w-20">
        {/* 发言人徽标：头像（speakers.color 底色）+显示名，点击改名（与阅读态同一 speakers 表，全局同步） */}
        <SpeakerNameEditor name={name} color={color} onRename={n => onRenameSpeaker?.(seg.speaker, n)} />
        {/* 归属修正：把该段改挂到正确的人（选项显示名；激活段才显示，搬移/插删不改归属） */}
        {active && (
          <select
            value={seg.speaker}
            onChange={(e) => {
              const v = e.target.value
              onSpeakerChange(index, v === 'new' ? nextSpeakerNum : Number(v))
            }}
            title="修正此段说话人归属"
            className="mt-1 w-full text-xs bg-[color:var(--panel-2)] border border-[color:var(--border)] rounded px-1 py-0.5 text-[color:var(--fg-2)] outline-none focus:border-[color:var(--accent)]"
          >
            {speakerChoices.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
            <option value="new">新建（说话人{nextSpeakerNum}）</option>
          </select>
        )}
        <button
          type="button"
          onClick={() => onSeekStart(index)}
          disabled={!canPlay}
          className="text-xs text-[color:var(--muted)] hover:text-[color:var(--accent)] disabled:hover:text-[color:var(--muted)] disabled:cursor-default flex items-center gap-0.5 mt-0.5 font-mono tabular-nums"
          title={canPlay ? '跳转到此段播放' : undefined}
        >
          {canPlay && <Icon name="Play" size={9} />}
          {formatTimestamp(seg.start)} - {formatTimestamp(seg.end)}
        </button>
      </div>
      <div className="flex-1 min-w-0">
        {active ? (
          <div
            ref={editRef}
            contentEditable
            suppressContentEditableWarning
            spellCheck={false}
            className="text-sm text-[color:var(--fg-2)] whitespace-pre-wrap break-words outline-none min-h-[40px] p-1 rounded focus:bg-[color:var(--panel-2)]"
            onBlur={commitIfChanged}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                commitIfChanged()
                onActivate(-1)
              } else if (e.key === 'Escape') {
                e.preventDefault()
                restoreOriginal()
                onActivate(-1)
              }
            }}
          >
            {originalRef.current}
          </div>
        ) : (
          <p
            onClick={startEdit}
            title="点击编辑此段"
            className="text-sm text-[color:var(--fg-2)] whitespace-pre-wrap break-words cursor-text min-h-[22px] p-1 rounded hover:bg-[color:var(--panel-2)]"
          >
            {seg.text || <span className="text-[color:var(--muted)]">（空段落，点击编辑）</span>}
          </p>
        )}
        {active && (
          <div className="flex flex-wrap items-center gap-1 mt-1.5">
            <Button
              variant="ghost" size="xs" leftIcon="ArrowUpCircle"
              disabled={isFirst || !hasWord}
              title={isFirst ? '已是首段' : '移动首词到上一段'}
              onClick={() => onMoveFirstWord(index)}
            >
              首词→上一段
            </Button>
            <Button
              variant="ghost" size="xs" leftIcon="ArrowDownCircle"
              disabled={isLast || !hasWord}
              title={isLast ? '已是末段' : '移动末词到下一段'}
              onClick={() => onMoveLastWord(index)}
            >
              末词→下一段
            </Button>
            <Button
              variant="ghost" size="xs" leftIcon="Plus"
              title="在此段后插入新段（继承说话人）"
              onClick={() => onInsertAfter(index)}
            >
              在此段后插入
            </Button>
            <Button
              variant="ghost" size="xs" leftIcon="Trash2"
              disabled={isOnly}
              title={isOnly ? '至少保留一段' : '删除此段'}
              onClick={() => onDelete(index)}
            >
              删除此段
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default TranscriptRow
