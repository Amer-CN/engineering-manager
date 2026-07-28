import React from 'react'

/**
 * TableCell 辅助组件（v1.1.0 拆分自 DataTable.tsx）
 * - Text: 文本单元格
 * - Badge: 彩色徽章
 * - Actions: 操作按钮组
 */
export const TableCell = {
  Text: ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <span className={className}>{children}</span>
  ),
  Badge: ({
    children,
    color = 'primary',
  }: {
    children: React.ReactNode
    color?: string
  }) => {
    const colors: Record<string, string> = {
      primary: 'bg-[color:var(--accent-soft)] text-[color:var(--accent)]',
      green: 'bg-success-100 text-success-700',
      orange: 'bg-warning-100 text-warning-700',
      red: 'bg-danger-100 text-danger-700',
      gray: 'bg-[color:var(--panel-2)] text-[color:var(--fg-2)]',
      blue: 'bg-[color:var(--accent-soft)] text-[color:var(--accent)]',
    }
    return (
      <span
        className={`inline-block px-2 py-0.5 text-xs rounded-full ${colors[color] || colors.primary}`}
      >
        {children}
      </span>
    )
  },
  Actions: ({ children }: { children: React.ReactNode }) => (
    <div className="flex items-center gap-1">{children}</div>
  ),
}