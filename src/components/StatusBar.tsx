import React from 'react'

const StatusBar: React.FC = () => {
  const version = (window as any).__APP_VERSION__ || '0.58.0'

  return (
    <div
      className="flex items-center justify-between h-6 px-3 text-[11px] select-none"
      style={{ background: 'var(--bg-2)', color: 'var(--fg-2)', borderTop: '1px solid var(--border)' } as React.CSSProperties}
      role="status"
      aria-live="polite"
    >
      <span>v{version}</span>
      <span className="flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--success)' }} />
        SQLite
      </span>
    </div>
  )
}

export default StatusBar
