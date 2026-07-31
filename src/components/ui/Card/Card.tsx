import React from 'react'
import { motion } from 'framer-motion'

export type CardPadding = 'none' | 'sm' | 'md' | 'lg'

export interface CardProps {
  title?: React.ReactNode
  subtitle?: React.ReactNode
  extra?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  bordered?: boolean
  hoverable?: boolean
  shadow?: 'none' | 'sm' | 'md' | 'lg'
  padding?: CardPadding
  headerDivider?: boolean
  footerDivider?: boolean
  className?: string
  onClick?: () => void
}

const shadowStyles = {
  none: '',
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
}

const paddingStyles: Record<CardPadding, string> = {
  none: 'p-0',
  sm: 'px-4 py-3',
  md: 'px-5 py-4',
  lg: 'px-6 py-6',
}

export function Card({
  title,
  subtitle,
  extra,
  children,
  footer,
  bordered = true,
  hoverable = false,
  shadow = 'sm',
  padding = 'md',
  headerDivider = true,
  footerDivider = true,
  className = '',
  onClick,
}: CardProps) {
  return (
  <motion.div
  whileHover={hoverable || onClick ? { y: -3, boxShadow: 'var(--shadow-lift)' } : undefined}
  transition={{ duration: 0.2 }}
  className={`
  rounded-xl
  bg-[color:var(--card)]
  ${bordered ? 'border border-[color:var(--border)]' : ''}
  ${shadowStyles[shadow]}
  ${onClick ? 'cursor-pointer' : ''}
  ${className}
  `}
  onClick={onClick}
  >
  {(title || subtitle || extra) && (
  <div className={`${paddingStyles[padding]} ${headerDivider ? 'border-b border-[color:var(--border)]' : ''}`}>
  <div className="flex items-center justify-between">
  <div>
  {title && (
  <h3 className="text-lg font-semibold text-[color:var(--fg)]">
  {title}
  </h3>
  )}
  {subtitle && (
  <p className="text-sm text-[color:var(--muted)] mt-0.5">
  {subtitle}
  </p>
  )}
  </div>
  {extra && (
  <div className="flex-shrink-0">
  {extra}
  </div>
  )}
  </div>
  </div>
  )}

  <div className={paddingStyles[padding]}>
  {children}
  </div>

  {footer && (
  <div className={`${paddingStyles[padding]} ${footerDivider ? 'border-t border-[color:var(--border)] bg-[color:var(--panel-2)]' : ''} rounded-b-xl`}>
  {footer}
  </div>
  )}
  </motion.div>
  )
}
