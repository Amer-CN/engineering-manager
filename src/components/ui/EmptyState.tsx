import React from 'react'
import { Icon } from './Icon'

interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: React.ReactNode
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => (
  <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-12 text-center">
    {icon && <Icon name={icon} size={44} className="text-slate-300 dark:text-slate-600 mx-auto mb-4" />}
    <h3 className="text-lg font-medium text-slate-700 dark:text-slate-200 mb-2">{title}</h3>
    {description && <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
)
