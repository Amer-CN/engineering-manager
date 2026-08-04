/** ConversationHistory — 对话历史（右栏常驻/抽屉 + 搜索 + 重命名 + 归档/取消归档 + 删除/恢复） */

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@/components/ui/Icon'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { HoverScrollbar } from '@/components/ui/HoverScrollbar'
import type { AgentConversation } from '@/types/agent'
import { ConversationHistoryItem, CollapsibleSection } from './ConversationHistoryItem'
import type { ItemVariant } from './ConversationHistoryItem'
import { useConversationList } from './useConversationList'

interface ConversationHistoryProps {
  currentConversationId?: number | null
  onSelectConversation: (conversation: AgentConversation) => void
  onNewConversation: () => void
  open?: boolean
  onClose?: () => void
  inline?: boolean
  refreshTrigger?: number
}

const ConversationHistory: React.FC<ConversationHistoryProps> = ({
  currentConversationId, onSelectConversation, onNewConversation,
  open = false, onClose, inline = false, refreshTrigger = 0,
}) => {
  const list = useConversationList(refreshTrigger)

  /** 渲染单条会话行（传给 CollapsibleSection 的回调） */
  const renderItem = (conv: AgentConversation, variant: ItemVariant) => (
    <ConversationHistoryItem
      key={conv.id}
      conv={conv}
      variant={variant}
      currentConversationId={currentConversationId}
      renamingId={list.renamingId}
      renameValue={list.renameValue}
      cancelRenameRef={list.cancelRenameRef}
      setRenamingId={list.setRenamingId}
      setRenameValue={list.setRenameValue}
      commitRename={list.commitRename}
      onSelectConversation={onSelectConversation}
      onClose={onClose}
      inline={inline}
      startRename={list.startRename}
      handleArchive={list.handleArchive}
      handleUnarchive={list.handleUnarchive}
      handleRestore={list.handleRestore}
      setDeleteTarget={list.setDeleteTarget}
    />
  )

  // ── 渲染内容 ──
  const content = (
    <>
      <div className="px-3 pb-2">
        <div className="relative">
          <Icon name="Search" size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[color:var(--muted)]" />
          <input type="text" value={list.searchQuery} onChange={(e) => list.setSearchQuery(e.target.value)}
            placeholder="搜索对话..."
            className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--fg-2)] placeholder-[color:var(--muted)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-soft)] focus:border-[color:var(--accent)] transition-all" />
          {list.searchQuery && (
            <button onClick={() => list.setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[color:var(--border-strong)] hover:text-[color:var(--muted)]">
              <Icon name="X" size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="px-3 pb-2">
        <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
          onClick={() => { onNewConversation(); if (!inline) onClose?.() }}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium shadow-sm transition-opacity"
          style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}>
          <Icon name="Plus" size={16} />新对话
        </motion.button>
      </div>

      <HoverScrollbar className="flex-1">
        <div className="px-2 pb-4">
          {list.loading ? (
            <div className="flex items-center justify-center py-12">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                <Icon name="Loader2" size={20} className="text-[color:var(--border-strong)]" />
              </motion.div>
            </div>
          ) : list.isAllEmpty ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Icon name="Inbox" size={32} className="text-[color:var(--border-strong)] mb-2" />
              <p className="text-sm text-[color:var(--muted)]">{list.searchQuery ? '未找到匹配的对话' : '暂无对话记录'}</p>
              {!list.searchQuery && <p className="text-xs text-[color:var(--border-strong)] mt-1">点击「新对话」开始</p>}
            </div>
          ) : (
            <>
              {/* 进行中：按日期分组 */}
              {list.groupedOngoing.map(group => (
                <div key={group.key} className="mb-3">
                  <p className="text-xs font-medium text-[color:var(--muted)] px-2 py-1.5">{group.label}</p>
                  <div className="space-y-0.5">
                    {group.items.map(conv => renderItem(conv, 'active'))}
                  </div>
                </div>
              ))}

              {/* 已归档（可折叠） */}
              {list.archivedItems.length > 0 && (
                <CollapsibleSection
                  label="已归档" count={list.archivedItems.length}
                  isOpen={list.archivedOpen} onToggle={() => list.setArchivedOpen(o => !o)}
                  items={list.archivedItems} variant="archived" renderItem={renderItem} />
              )}

              {/* 最近删除（可折叠，可恢复） */}
              {list.deletedItems.length > 0 && (
                <CollapsibleSection
                  label="最近删除" count={list.deletedItems.length}
                  isOpen={list.deletedOpen} onToggle={() => list.setDeletedOpen(o => !o)}
                  items={list.deletedItems} variant="deleted" renderItem={renderItem} />
              )}
            </>
          )}
        </div>
      </HoverScrollbar>
    </>
  )

  const confirmDialog = (
    <ConfirmDialog isOpen={!!list.deleteTarget} onClose={() => list.setDeleteTarget(null)} onConfirm={list.handleDelete}
      title="删除对话"
      content={`确定要删除「${list.deleteTarget?.title || `对话 ${list.deleteTarget?.id}`}」吗？删除后可在「最近删除」中恢复。`}
      confirmText="删除" confirmVariant="danger" loading={list.deleting} />
  )

  if (inline) {
    return (
      <div className="flex flex-col h-full bg-[color:var(--card)] border-l border-[color:var(--border)]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[color:var(--border)]">
          <h3 className="text-sm font-semibold text-[color:var(--fg-2)] flex items-center gap-2">
            <Icon name="Inbox" size={16} />对话历史
          </h3>
          <span className="text-xs text-[color:var(--muted)]">{list.conversations.length}</span>
        </div>
        {content}
        {confirmDialog}
      </div>
    )
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }} onClick={onClose}
            className="fixed inset-0 bg-black/20 z-40" />
          <motion.aside initial={{ x: -320, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
            exit={{ x: -320, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="fixed top-0 left-0 bottom-0 w-80 bg-[color:var(--card)] border-r border-[color:var(--border)] z-50 flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[color:var(--border)]">
              <h3 className="text-sm font-semibold text-[color:var(--fg-2)] flex items-center gap-2">
                <Icon name="Inbox" size={16} />对话历史
              </h3>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[color:var(--panel-2)] text-[color:var(--muted)] transition-colors">
                <Icon name="X" size={18} />
              </button>
            </div>
            {content}
            {confirmDialog}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

export default ConversationHistory
