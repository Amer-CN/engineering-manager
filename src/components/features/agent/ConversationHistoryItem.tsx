/** ConversationHistoryItem — 单条会话卡片（行操作：置顶/重命名/删除） */

import React from 'react'
import { Icon } from '@/components/ui/Icon'
import type { AgentConversation } from '@/types/agent'

export interface ConversationHistoryItemProps {
  conv: AgentConversation
  currentConversationId?: number | null
  renamingId: number | null
  renameValue: string
  cancelRenameRef: React.MutableRefObject<boolean>
  setRenamingId: (id: number | null) => void
  setRenameValue: (v: string) => void
  commitRename: (convId: number) => void
  onSelectConversation: (conversation: AgentConversation) => void
  onClose?: () => void
  inline?: boolean
  startRename: (conv: { id: number; title: string }) => void
  setDeleteTarget: (conv: AgentConversation | null) => void
  /** 批量模式：显示勾选框，点条目=切换勾选（不进入对话） */
  batchMode?: boolean
  checked?: boolean
  onToggleCheck?: (id: number) => void
  /** 是否已置顶（显示置顶/取消置顶按钮） */
  pinned?: boolean
  onTogglePin?: (conv: AgentConversation) => void
}

const formatTime = (iso: string): string => {
  try {
    const d = new Date(iso)
    const isToday = d.toDateString() === new Date().toDateString()
    return isToday ? d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  } catch { return '' }
}

const truncate = (text: string | undefined, max = 32): string =>
  !text ? '' : text.length > max ? text.slice(0, max) + '…' : text

export const ConversationHistoryItem: React.FC<ConversationHistoryItemProps> = ({
  conv, currentConversationId, renamingId, renameValue,
  cancelRenameRef, setRenamingId, setRenameValue, commitRename,
  onSelectConversation, onClose, inline,
  startRename, setDeleteTarget,
  batchMode = false, checked = false, onToggleCheck, pinned = false, onTogglePin,
}) => {
  const isActive = currentConversationId === conv.id
  const isRenaming = renamingId === conv.id
  const showActions = !batchMode
  return (
    <div key={conv.id}
      className={`group relative rounded-xl transition-colors ${isActive ? 'bg-[color:var(--accent-soft)]' : 'hover:bg-[color:var(--panel-2)]'}`}>
      {isRenaming ? (
        <input type="text" value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitRename(conv.id)
            else if (e.key === 'Escape') { cancelRenameRef.current = true; setRenamingId(null) }
          }}
          onBlur={() => commitRename(conv.id)} autoFocus
          className="w-full px-2.5 py-2 text-sm rounded-xl border border-[color:var(--accent)] bg-[color:var(--card)] text-[color:var(--fg-2)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-soft)]" />
      ) : (
        <>
          <button onClick={() => {
            if (batchMode) onToggleCheck?.(conv.id)
            else { onSelectConversation(conv); if (!inline) onClose?.() }
          }}
            className={`w-full text-left px-2.5 py-2 ${showActions ? 'pr-24' : 'pr-3'}`}>
            <div className="flex items-start justify-between gap-2">
              <p className={`text-sm font-medium truncate flex-1 ${isActive ? 'text-[color:var(--accent)]' : 'text-[color:var(--fg-2)]'}`}>
                {conv.title || `对话 ${conv.id}`}
              </p>
              <span className="text-micro text-[color:var(--muted)] flex-shrink-0 mt-0.5">{formatTime(conv.updatedAt)}</span>
            </div>
            {/* 摘要降噪（K3 审查）：更弱的颜色 + 单行截短，不与标题抢对比度 */}
            {conv.lastMessage && <p className="text-micro text-[color:var(--border-strong)] mt-0.5 truncate">{truncate(conv.lastMessage, 20)}</p>}
            <div className="flex items-center gap-2 mt-1">
              <span className="text-micro text-[color:var(--border-strong)]">{conv.messageCount} 条</span>
            </div>
          </button>

          {/* 批量模式勾选框（点条目即切换） */}
          {batchMode && (
            <div className="absolute left-1 top-1/2 -translate-y-1/2 flex items-center pl-1.5 pointer-events-none">
              <span className={`flex items-center justify-center w-4 h-4 rounded border transition-colors ${
                checked
                  ? 'bg-[color:var(--accent)] border-[color:var(--accent)] text-[color:var(--on-accent)]'
                  : 'border-[color:var(--border-strong)] bg-[color:var(--card)]'
              }`}>
                {checked && <Icon name="Check" size={12} strokeWidth={3} />}
              </span>
            </div>
          )}

          {/* 行操作按钮簇（置顶/重命名/删除） */}
          {showActions && (
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {onTogglePin && (
                <button onClick={(e) => { e.stopPropagation(); onTogglePin(conv) }}
                  className="p-1.5 rounded-lg text-[color:var(--border-strong)] hover:text-[color:var(--accent)] hover:bg-[color:var(--accent-soft)] transition-colors"
                  title={pinned ? '取消置顶' : '置顶对话'}>
                  <Icon name={pinned ? 'PinOff' : 'Pin'} size={14} />
                </button>
              )}
              <button onClick={(e) => { e.stopPropagation(); startRename(conv) }}
                className="p-1.5 rounded-lg text-[color:var(--border-strong)] hover:text-[color:var(--accent)] hover:bg-[color:var(--accent-soft)] transition-colors"
                title="重命名对话">
                <Icon name="Edit3" size={14} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(conv) }}
                className="p-1.5 rounded-lg text-[color:var(--border-strong)] hover:text-danger-500 hover:bg-danger-50 transition-colors"
                title="删除对话">
                <Icon name="Trash2" size={14} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
