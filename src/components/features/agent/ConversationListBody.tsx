/**
 * ConversationListBody — 对话历史列表主体（加载/错误/空态 + 置顶/日期档/归档/删除四组渲染）
 * 从 ConversationHistory.tsx 抽出（CI 行数门禁拆分）。
 */

import React from 'react'
import { motion } from 'framer-motion'
import { Icon } from '@/components/ui/Icon'
import type { AgentConversation } from '@/types/agent'
import type { ConversationGroups } from './conversationGrouping'
import { CollapsibleSection } from './ConversationHistoryItem'
import type { ItemVariant } from './ConversationHistoryItem'

interface ConversationListBodyProps {
  groups: ConversationGroups
  loading: boolean
  loadError: boolean
  searchQuery: string
  archivedOpen: boolean
  deletedOpen: boolean
  onToggleArchived: () => void
  onToggleDeleted: () => void
  onRetry: () => void
  renderItem: (conv: AgentConversation, variant: ItemVariant) => React.ReactNode
}

const ConversationListBody: React.FC<ConversationListBodyProps> = ({
  groups, loading, loadError, searchQuery,
  archivedOpen, deletedOpen, onToggleArchived, onToggleDeleted, onRetry, renderItem,
}) => {
  const { pinnedItems, groupedOngoing, archivedItems, deletedItems, isAllEmpty } = groups

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
          <Icon name="Loader2" size={20} className="text-[color:var(--border-strong)]" />
        </motion.div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Icon name="AlertCircle" size={32} className="text-[color:var(--border-strong)] mb-2" />
        <p className="text-sm text-[color:var(--muted)]">加载失败，请检查网络</p>
        <button onClick={onRetry}
          className="mt-3 px-3 py-1.5 rounded-lg text-sm border border-[color:var(--border)] hover:bg-[color:var(--panel-2)] text-[color:var(--fg-2)] transition-colors">
          重试
        </button>
      </div>
    )
  }

  if (isAllEmpty) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Icon name="Inbox" size={32} className="text-[color:var(--border-strong)] mb-2" />
        <p className="text-sm text-[color:var(--muted)]">{searchQuery ? '未找到匹配的对话' : '暂无对话记录'}</p>
        {!searchQuery && <p className="text-xs text-[color:var(--border-strong)] mt-1">点击「新对话」开始</p>}
      </div>
    )
  }

  return (
    <>
      {/* 置顶（不分日期档） */}
      {pinnedItems.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-medium text-[color:var(--muted)] px-2 py-1 mb-1">置顶</p>
          <div className="flex flex-col gap-1">
            {pinnedItems.map(conv => renderItem(conv, 'active'))}
          </div>
        </div>
      )}

      {/* 进行中：按日期分档 */}
      {groupedOngoing.map(group => (
        <div key={group.key} className="mb-4">
          <p className="text-xs font-medium text-[color:var(--muted)] px-2 py-1 mb-1">{group.label}</p>
          <div className="flex flex-col gap-1">
            {group.items.map(conv => renderItem(conv, 'active'))}
          </div>
        </div>
      ))}

      {/* 已归档（可折叠） */}
      {archivedItems.length > 0 && (
        <CollapsibleSection
          label="已归档" count={archivedItems.length}
          isOpen={archivedOpen} onToggle={onToggleArchived}
          items={archivedItems} variant="archived" renderItem={renderItem} />
      )}

      {/* 最近删除（可折叠，可恢复） */}
      {deletedItems.length > 0 && (
        <CollapsibleSection
          label="最近删除" count={deletedItems.length}
          isOpen={deletedOpen} onToggle={onToggleDeleted}
          items={deletedItems} variant="deleted" renderItem={renderItem} />
      )}
    </>
  )
}

export default ConversationListBody
