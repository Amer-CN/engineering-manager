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
  <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center mb-6">
  {typeof icon === 'string' ? <Icon name={icon} size={40} className="text-slate-400" /> : (icon || <Icon name="FolderOpen" size={40} className="text-slate-400" />)}
  </div>

  <h3 className="text-lg font-medium text-slate-700 mb-2">{title}</h3>

  {description && (
  <p className="text-sm text-slate-500 mb-6 max-w-sm">{description}</p>
  )}

  {action && <div>{action}</div>}
  </div>
)
