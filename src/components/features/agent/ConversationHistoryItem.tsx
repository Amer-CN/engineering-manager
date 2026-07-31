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
}) => {
  const isActive = currentConversationId === conv.id
  const isRenaming = renamingId === conv.id
  const selectable = variant !== 'deleted'
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
          className="w-full px-3 py-2.5 text-sm rounded-xl border border-[color:var(--accent)] bg-[color:var(--card)] text-[color:var(--fg-2)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-soft)]" />
      ) : (
        <>
          {selectable ? (
            <button onClick={() => { onSelectConversation(conv); if (!inline) onClose?.() }}
              className="w-full text-left px-3 py-2.5 pr-24">
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
            <div className="w-full text-left px-3 py-2.5 pr-14">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium truncate flex-1 text-[color:var(--muted)]">
                  {conv.title || `对话 ${conv.id}`}
                </p>
              </div>
              {conv.lastMessage && <p className="text-xs text-[color:var(--border-strong)] mt-0.5 truncate">{truncate(conv.lastMessage)}</p>}
            </div>
          )}

          {/* 行操作按钮簇 */}
          {variant === 'deleted' ? (
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center">
              <button onClick={(e) => { e.stopPropagation(); handleRestore(conv) }}
                className="p-1.5 rounded-lg text-[color:var(--border-strong)] hover:text-[color:var(--accent)] hover:bg-[color:var(--accent-soft)] transition-all"
                title="恢复对话">
                <Icon name="RotateCcw" size={14} />
              </button>
            </div>
          ) : (
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
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
  <div className="mb-3">
    <button onClick={onToggle}
      className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-[color:var(--muted)] hover:text-[color:var(--fg-2)] transition-colors">
      <Icon name={isOpen ? 'ChevronDown' : 'ChevronRight'} size={14} />
      <span>{label}</span>
      <span className="text-[color:var(--border-strong)]">{count}</span>
    </button>
    {isOpen && <div className="space-y-0.5">{items.map(conv => renderItem(conv, variant))}</div>}
  </div>
)
