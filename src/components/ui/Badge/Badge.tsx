import React from 'react'
import { motion } from 'framer-motion'

export type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'gray' | 'info' | 'purple' | 'orange' | 'cyan'
export type BadgeSize = 'sm' | 'md' | 'lg'

export interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  size?: BadgeSize
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full'
  dot?: boolean
  outlined?: boolean
  className?: string
}

const variantStyles: Record<BadgeVariant, string> = {
  primary: 'bg-primary-100 text-primary-700',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
  gray: 'bg-slate-100 text-slate-700',
  info: 'bg-blue-100 text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
  orange: 'bg-orange-100 text-orange-700',
  cyan: 'bg-cyan-100 text-cyan-700',
}

const outlinedStyles: Record<BadgeVariant, string> = {
  primary: 'border border-primary-300 text-primary-700',
  success: 'border border-emerald-300 text-emerald-700',
  warning: 'border border-amber-300 text-amber-700',
  danger: 'border border-red-300 text-red-700',
  gray: 'border border-slate-300 text-slate-700',
  info: 'border border-blue-300 text-blue-700',
  purple: 'border border-purple-300 text-purple-700',
  orange: 'border border-orange-300 text-orange-700',
  cyan: 'border border-cyan-300 text-cyan-700',
}

const dotVariantStyles: Record<BadgeVariant, string> = {
  primary: 'bg-primary-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  gray: 'bg-slate-500',
  info: 'bg-blue-500',
  purple: 'bg-purple-500',
  orange: 'bg-orange-500',
  cyan: 'bg-cyan-500',
}

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-0.5 text-sm',
  lg: 'px-3 py-1 text-base',
}

const dotSizeStyles: Record<BadgeSize, string> = {
  sm: 'w-1.5 h-1.5',
  md: 'w-2 h-2',
  lg: 'w-2.5 h-2.5',
}

const roundedStyles = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  full: 'rounded-full',
}

export function Badge({
  children,
  variant = 'primary',
  size = 'md',
  rounded = 'full',
  dot = false,
  outlined = false,
  className = '',
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        font-medium
        ${outlined ? outlinedStyles[variant] : variantStyles[variant]}
        ${sizeStyles[size]}
        ${roundedStyles[rounded]}
        ${className}
      `}
    >
      {dot && (
        <motion.span
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className={`
            ${dotSizeStyles[size]}
            ${dotVariantStyles[variant]}
            rounded-full
          `}
        />
      )}
      {children}
    </span>
  )
}
