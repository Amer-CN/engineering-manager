/**
 * TaskDetailRailButton — 转写详情最左竖排操作栏按钮（图标 + 悬浮提示）。
 * 从 TaskDetailView.tsx 机械搬移（门禁 400 行），零逻辑改动。
 */
import React from 'react'
import { Icon } from '@/components/ui/Icon'

// 左侧竖排操作栏按钮（图标 + 悬浮提示）
const RailButton: React.FC<{ icon: string; title: string; active?: boolean; onClick: () => void }> = ({ icon, title, active, onClick }) => (
  <button
    type="button" title={title} onClick={onClick}
    className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${active ? 'bg-[color:var(--accent-soft)] text-[color:var(--accent)]' : 'text-[color:var(--muted)] hover:bg-[color:var(--panel-2)] hover:text-[color:var(--fg)]'}`}
  >
    <Icon name={icon} size={16} />
  </button>
)

export default RailButton
