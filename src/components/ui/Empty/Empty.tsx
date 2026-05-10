/**
 * Empty & EmptyState 组件
 * 
 * 空状态组件
 */

import React from 'react'

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Empty 简单空状态
 * 
 * @example
 * ```tsx
 * <Empty description="暂无数据" />
 * ```
 */
export function Empty({ description = '暂无数据' }: { description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-6xl opacity-50 mb-4">📭</div>
      <p className="text-slate-500">{description}</p>
    </div>
  )
}

/**
 * EmptyState 完整空状态组件
 * 
 * @example
 * ```tsx
 * <EmptyState
 *   icon={<EmptyIcon />}
 *   title="暂无项目"
 *   description="创建您的第一个项目来开始使用"
 *   action={<Button onClick={handleCreate}>创建项目</Button>}
 * />
 * ```
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 text-center ${className}`}>
      {/* 图标 */}
      <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center text-5xl mb-6">
        {icon || '📭'}
      </div>

      {/* 标题 */}
      <h3 className="text-lg font-medium text-slate-700 dark:text-slate-200 mb-2">
        {title}
      </h3>

      {/* 描述 */}
      {description && (
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-sm">
          {description}
        </p>
      )}

      {/* 操作 */}
      {action && (
        <div>
          {action}
        </div>
      )}
    </div>
  )
}
