import React from 'react'

/**
 * 状态栏（极简）
 * - 左侧：版本号
 * - 右侧：数据存储模式指示器
 */
const StatusBar: React.FC = () => {
  const version = (window as any).__APP_VERSION__ || '0.56.0'

  return (
    <div
      className="flex items-center justify-between h-6 px-3 text-[11px] text-[var(--text-tertiary)] border-t border-[var(--border-primary)] bg-[var(--sidebar-bg)] select-none"
      role="status"
      aria-live="polite"
    >
      <span>v{version}</span>
      <span className="flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        SQLite
      </span>
    </div>
  )
}

export default StatusBar
