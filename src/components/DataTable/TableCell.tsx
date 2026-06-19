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
      primary: 'bg-primary-100 text-primary-700',
      green: 'bg-green-100 text-green-700',
      orange: 'bg-orange-100 text-orange-700',
      red: 'bg-red-100 text-red-700',
      gray: 'bg-slate-100 text-slate-700',
      blue: 'bg-blue-100 text-blue-700',
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