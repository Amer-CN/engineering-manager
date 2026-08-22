/**
 * AgentOverlays — AI 助手浮动层集合
 * HistorySidebar：右栏对话历史（桌面 ≥md 常驻）
 * AgentOverlays：<md 历史抽屉（由工具栏/欢迎屏「历史」按钮唤起，任意窄屏可达）+ ⌘K 搜索命令面板
 */

import React from 'react'
import type { AgentConversation } from '@/types/agent'
import ConversationHistory from './ConversationHistory'
import AgentSearch from './AgentSearch'

interface HistorySidebarProps {
  conversationId: number | null
  onSelectConversation: (conv: AgentConversation) => void
  onNewConversation: () => void
  onCurrentConversationDeleted?: () => void
  refreshTrigger: number
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({
  conversationId,
  onSelectConversation,
  onNewConversation,
  onCurrentConversationDeleted,
  refreshTrigger,
}) => (
  <div className="hidden md:block w-80 flex-shrink-0 min-h-0">
    <ConversationHistory
      inline
      currentConversationId={conversationId}
      onSelectConversation={onSelectConversation}
      onNewConversation={onNewConversation}
      onCurrentConversationDeleted={onCurrentConversationDeleted}
      refreshTrigger={refreshTrigger}
    />
  </div>
)

interface AgentOverlaysProps extends HistorySidebarProps {
  historyOpen: boolean
  onHistoryClose: () => void
  searchOpen: boolean
  onSearchClose: () => void
  onAsk: (prompt: string) => void
}

const AgentOverlays: React.FC<AgentOverlaysProps> = ({
  conversationId,
  onSelectConversation,
  onNewConversation,
  onCurrentConversationDeleted,
  refreshTrigger,
  historyOpen,
  onHistoryClose,
  searchOpen,
  onSearchClose,
  onAsk,
}) => (
  <>
    {/* 移动端对话历史抽屉 */}
    <ConversationHistory
      open={historyOpen}
      onClose={onHistoryClose}
      currentConversationId={conversationId}
      onSelectConversation={onSelectConversation}
      onNewConversation={onNewConversation}
      onCurrentConversationDeleted={onCurrentConversationDeleted}
      refreshTrigger={refreshTrigger}
    />

    {/* 搜索命令面板 */}
    <AgentSearch
      open={searchOpen}
      onClose={onSearchClose}
      onAsk={onAsk}
      onSelectConversation={onSelectConversation}
    />
  </>
)

export default AgentOverlays
