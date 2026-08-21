/** ConversationHistoryItem — 单条会话卡片 + 折叠分区渲染 */

import React from 'react'
import { Icon } from '@/components/ui/Icon'
import type { AgentConversation } from '@/types/agent'

/** 行操作变体：active=进行中；archived=已归档；deleted=最近删除 */
export type ItemVariant = 'active' | 'archived' | 'deleted'

export interface ConversationHistoryItemProps {
  conv: AgentConversation
  variant: ItemVariant
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
  handleArchive: (conv: AgentConversation) => void
  handleUnarchive: (conv: AgentConversation) => void
  handleRestore: (conv: AgentConversation) => void
  setDeleteTarget: (conv: AgentConversation | null) => void
  /** 批量模式：显示勾选框，点条目=切换勾选（不进入对话） */
  batchMode?: boolean
  checked?: boolean
  onToggleCheck?: (id: number) => void
  /** 是否已置顶（active 条目显示置顶/取消置顶按钮） */
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
  conv, variant, currentConversationId, renamingId, renameValue,
  cancelRenameRef, setRenamingId, setRenameValue, commitRename,
  onSelectConversation, onClose, inline,
  startRename, handleArchive, handleUnarchive, handleRestore, setDeleteTarget,
  batchMode = false, checked = false, onToggleCheck, pinned = false, onTogglePin,
}) => {
  const isActive = currentConversationId === conv.id
  const isRenaming = renamingId === conv.id
  const selectable = variant !== 'deleted'
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
          {selectable ? (
            <button onClick={() => {
              if (batchMode) onToggleCheck?.(conv.id)
              else { onSelectConversation(conv); if (!inline) onClose?.() }
            }}
              className={`w-full text-left px-2.5 py-2 ${showActions ? 'pr-24' : 'pr-3'}`}>
              <div className="flex items-start justify-between gap-2">
                <p className={`text-sm font-medium truncate flex-1 ${isActive ? 'text-[color:var(--accent)]' : 'text-[color:var(--fg-2)]'}`}>
                  {conv.title || `对话 ${conv.id}`}
                </p>
                <span className="text-xs text-[color:var(--muted)] flex-shrink-0 mt-0.5">{formatTime(conv.updatedAt)}</span>
              </div>
              {conv.lastMessage && <p className="text-xs text-[color:var(--muted)] mt-0.5 truncate">{truncate(conv.lastMessage)}</p>}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-[color:var(--border-strong)]">{conv.messageCount} 条消息</span>
              </div>
            </button>
          ) : (
            <div className="w-full text-left px-2.5 py-2 pr-14">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium truncate flex-1 text-[color:var(--muted)]">
                  {conv.title || `对话 ${conv.id}`}
                </p>
              </div>
              {conv.lastMessage && <p className="text-xs text-[color:var(--border-strong)] mt-0.5 truncate">{truncate(conv.lastMessage)}</p>}
            </div>
          )}

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

          {/* 行操作按钮簇 */}
          {showActions && variant === 'deleted' ? (
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center">
              <button onClick={(e) => { e.stopPropagation(); handleRestore(conv) }}
                className="p-1.5 rounded-lg text-[color:var(--border-strong)] hover:text-[color:var(--accent)] hover:bg-[color:var(--accent-soft)] transition-all"
                title="恢复对话">
                <Icon name="RotateCcw" size={14} />
              </button>
            </div>
          ) : showActions && (
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {variant === 'active' && onTogglePin && (
                <button onClick={(e) => { e.stopPropagation(); onTogglePin(conv) }}
                  className="p-1.5 rounded-lg text-[color:var(--border-strong)] hover:text-[color:var(--accent)] hover:bg-[color:var(--accent-soft)] transition-all"
                  title={pinned ? '取消置顶' : '置顶对话'}>
                  <Icon name={pinned ? 'PinOff' : 'Pin'} size={14} />
                </button>
              )}
              <button onClick={(e) => { e.stopPropagation(); startRename(conv) }}
                className="p-1.5 rounded-lg text-[color:var(--border-strong)] hover:text-[color:var(--accent)] hover:bg-[color:var(--accent-soft)] transition-all"
                title="重命名对话">
                <Icon name="Edit3" size={14} />
              </button>
              {variant === 'archived' ? (
                <button onClick={(e) => { e.stopPropagation(); handleUnarchive(conv) }}
                  className="p-1.5 rounded-lg text-[color:var(--border-strong)] hover:text-[color:var(--accent)] hover:bg-[color:var(--accent-soft)] transition-all"
                  title="取消归档">
                  <Icon name="ArrowUpCircle" size={14} />
                </button>
              ) : (
                <button onClick={(e) => { e.stopPropagation(); handleArchive(conv) }}
                  className="p-1.5 rounded-lg text-[color:var(--border-strong)] hover:text-[color:var(--accent)] hover:bg-[color:var(--accent-soft)] transition-all"
                  title="归档对话">
                  <Icon name="Package" size={14} />
                </button>
              )}
              <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(conv) }}
                className="p-1.5 rounded-lg text-[color:var(--border-strong)] hover:text-danger-500 hover:bg-danger-50 transition-all"
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

interface CollapsibleSectionProps {
  label: string
  count: number
  isOpen: boolean
  onToggle: () => void
  items: AgentConversation[]
  variant: ItemVariant
  renderItem: (conv: AgentConversation, variant: ItemVariant) => React.ReactNode
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  label, count, isOpen, onToggle, items, variant, renderItem,
}) => (
  <div className="mb-4">
    <button onClick={onToggle}
      className="w-full flex items-center gap-1.5 px-2 py-1 mb-1 text-xs font-medium text-[color:var(--muted)] hover:text-[color:var(--fg-2)] transition-colors">
      <Icon name={isOpen ? 'ChevronDown' : 'ChevronRight'} size={14} />
      <span>{label}</span>
      <span className="text-[color:var(--border-strong)]">{count}</span>
    </button>
    {isOpen && <div className="flex flex-col gap-1">{items.map(conv => renderItem(conv, variant))}</div>}
  </div>
)
