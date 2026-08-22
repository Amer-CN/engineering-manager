/** AgentTopBar — AI 助手对话态顶部工具栏（助手标识 + 新对话 + 搜索 + 移动端历史） */

import React from 'react'
import { Icon } from '@/components/ui/Icon'

interface AgentTopBarProps {
  modelName: string
  onNewConversation: () => void
  onSearchOpen: () => void
  onHistoryOpen: () => void
}

const AgentTopBar: React.FC<AgentTopBarProps> = ({
  modelName, onNewConversation, onSearchOpen, onHistoryOpen,
}) => (
  <div className="flex items-center justify-between gap-3 px-6 pt-4 pb-2 flex-shrink-0">
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
        <Icon name="Bot" size={16} />
      </div>
      <div className="min-w-0 flex items-center gap-3">
        <p className="text-sm font-semibold flex-shrink-0" style={{ color: 'var(--fg)' }}>AI 管家</p>
        {modelName && (
          <>
            <span className="text-xs flex-shrink-0" style={{ color: 'var(--muted)' }}>|</span>
            <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>{modelName}</p>
          </>
        )}
      </div>
    </div>
    <div className="flex items-center gap-2 flex-shrink-0">
      <button
        onClick={onNewConversation}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-[color:var(--panel-2)]"
        style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--fg-2)' }}
        title="返回欢迎页 / 开始新对话"
      >
        <Icon name="ArrowLeft" size={14} />
        <span className="hidden sm:inline">返回</span>
        <span className="hidden sm:inline" style={{ color: 'var(--muted)' }}>·</span>
        <Icon name="Plus" size={14} />
        <span className="hidden sm:inline">新对话</span>
      </button>
      <button
        onClick={onSearchOpen}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-[color:var(--panel-2)]"
        style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--fg-2)' }}
      >
        <Icon name="Search" size={14} />
        <kbd className="hidden md:inline-flex items-center px-1 py-0.5 rounded text-caption font-mono" style={{ background: 'var(--panel-2)', color: 'var(--muted)' }}>⌘K</kbd>
      </button>
      <button
        onClick={onHistoryOpen}
        className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-[color:var(--panel-2)]"
        style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--fg-2)' }}
        title="对话历史"
      >
        <Icon name="Inbox" size={14} />
        <span className="hidden sm:inline">历史</span>
      </button>
    </div>
  </div>
)

export default AgentTopBar
