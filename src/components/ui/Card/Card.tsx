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
  glass?: boolean
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
  glass = false,
  headerDivider = true,
  footerDivider = true,
  className = '',
  onClick,
}: CardProps) {
  return (
    <motion.div
      whileHover={hoverable || onClick ? { y: -3, boxShadow: '0 12px 30px rgba(0,0,0,0.08)' } : undefined}
      transition={{ duration: 0.2 }}
      className={`
        rounded-xl
        ${glass
          ? 'bg-white/80 backdrop-blur-lg'
          : 'bg-white'
        }
        ${bordered ? 'border border-slate-100' : ''}
        ${shadowStyles[shadow]}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {(title || subtitle || extra) && (
        <div className={`${paddingStyles[padding]} ${headerDivider ? 'border-b border-slate-100' : ''}`}>
          <div className="flex items-center justify-between">
            <div>
              {title && (
                <h3 className="text-lg font-semibold text-slate-800">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
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
        <div className={`${paddingStyles[padding]} ${footerDivider ? 'border-t border-slate-100 bg-slate-50' : ''} rounded-b-xl`}>
          {footer}
        </div>
      )}
    </motion.div>
  )
}
