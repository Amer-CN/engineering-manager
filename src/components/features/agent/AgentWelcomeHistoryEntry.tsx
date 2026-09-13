/**
 * AgentWelcomeHistoryEntry — 欢迎形态右上角「对话历史」入口（欢迎态无右栏，桌面也显示；抽屉复用 historyOpen）。
 * 从 AgentDashboard.tsx 机械搬移（门禁 400 行），零逻辑改动。
 */
import React from 'react'
import { Icon } from '@/components/ui/Icon'

interface AgentWelcomeHistoryEntryProps {
  onOpen: () => void
}

const AgentWelcomeHistoryEntry: React.FC<AgentWelcomeHistoryEntryProps> = ({ onOpen }) => (
  <div className="flex items-center justify-end px-6 pt-4 flex-shrink-0">
    <button
      onClick={onOpen}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
      style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--fg-2)' }}
    >
      <Icon name="Inbox" size={14} />
      对话历史
    </button>
  </div>
)

export default AgentWelcomeHistoryEntry
