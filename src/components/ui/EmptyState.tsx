import React from 'react'
import { Icon } from './Icon'

export interface EmptyStateProps {
  icon?: string | React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action, className = '' }) => (
  <div className={`flex flex-col items-center justify-center py-16 text-center ${className}`}>
  <div className="w-16 h-16 rounded-full bg-[color:var(--panel-2)] border border-[color:var(--border)] flex items-center justify-center mb-4">
  {typeof icon === 'string' ? <Icon name={icon} size={32} className="text-[color:var(--muted)]" /> : (icon || <Icon name="FolderOpen" size={32} className="text-[color:var(--muted)]" />)}
  </div>

  <h3 className="text-base font-semibold text-[color:var(--fg)] mb-1">{title}</h3>

  {description && (
  <p className="text-sm text-[color:var(--muted)] mb-5 max-w-[240px]">{description}</p>
  )}

  {action && <div>{action}</div>}
  </div>
)
