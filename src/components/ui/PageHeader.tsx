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
  <div className={`flex items-center justify-between mb-6 ${className}`}>
  <div className="flex items-center gap-3">
  {onBack && (
  <button
  onClick={onBack}
  className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
  >
  <Icon name="ArrowLeft" size={20} />
  </button>
  )}
  {icon && !onBack && (
  <Icon name={icon} size={24} className="text-slate-400" />
  )}
  <div>
  <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
  {subtitle && (
  <p className="text-slate-500 mt-1">{subtitle}</p>
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
