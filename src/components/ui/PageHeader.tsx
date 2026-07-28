import React from 'react'
import { Icon } from './Icon'

interface PageHeaderProps {
  title: string
  subtitle?: string
  icon?: string
  onBack?: () => void
  actions?: React.ReactNode
  className?: string
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, icon, onBack, actions, className = '' }) => {
  return (
  <div className={`flex items-center justify-between pb-4 mb-6 border-b border-[color:var(--border)] ${className}`}>
  <div className="flex items-center gap-3">
  {onBack && (
  <button
  onClick={onBack}
  className="p-2 rounded-lg hover:bg-[color:var(--panel-2)] text-[color:var(--muted)] hover:text-[color:var(--fg-2)] transition-colors"
  >
  <Icon name="ArrowLeft" size={20} />
  </button>
  )}
  {icon && !onBack && (
  <Icon name={icon} size={24} className="text-[color:var(--muted)]" />
  )}
  <div>
  <h1 className="text-base font-semibold tracking-tight text-[color:var(--fg)]">{title}</h1>
  {subtitle && (
  <p className="text-[color:var(--muted)] mt-1">{subtitle}</p>
  )}
  </div>
  </div>
  {actions && (
  <div className="flex items-center gap-3">
  {actions}
  </div>
  )}
  </div>
  )
}

export default PageHeader
