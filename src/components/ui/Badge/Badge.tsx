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
  primary: 'bg-[color:var(--accent-soft)] text-[color:var(--accent)]',
  success: 'bg-success-100 text-success-700',
  warning: 'bg-warning-100 text-warning-700',
  danger: 'bg-danger-100 text-danger-700',
  gray: 'bg-[color:var(--panel-2)] text-[color:var(--fg-2)]',
  info: 'bg-[color:var(--accent-soft)] text-[color:var(--accent)]',
  purple: 'bg-[color:var(--panel-2)] text-[color:var(--fg-2)]',
  orange: 'bg-[color:var(--panel-2)] text-[color:var(--fg-2)]',
  cyan: 'bg-[color:var(--panel-2)] text-[color:var(--fg-2)]',
}

const outlinedStyles: Record<BadgeVariant, string> = {
  primary: 'border border-[color:color-mix(in_oklch,var(--accent)_30%,transparent)] text-[color:var(--accent)] bg-transparent',
  success: 'border border-success-500/30 text-success-600 bg-transparent',
  warning: 'border border-warning-500/30 text-warning-600 bg-transparent',
  danger: 'border border-danger-500/30 text-danger-600 bg-transparent',
  gray: 'border border-[color:var(--border)] text-[color:var(--fg-2)] bg-transparent',
  info: 'border border-[color:color-mix(in_oklch,var(--accent)_30%,transparent)] text-[color:var(--accent)] bg-transparent',
  purple: 'border border-[color:var(--border)] text-[color:var(--fg-2)] bg-transparent',
  orange: 'border border-[color:var(--border)] text-[color:var(--fg-2)] bg-transparent',
  cyan: 'border border-[color:var(--border)] text-[color:var(--fg-2)] bg-transparent',
}

const dotVariantStyles: Record<BadgeVariant, string> = {
  primary: 'bg-[color:var(--accent)]',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  danger: 'bg-danger-500',
  gray: 'bg-[color:var(--muted)]',
  info: 'bg-[color:var(--accent)]',
  purple: 'bg-[color:var(--muted)]',
  orange: 'bg-[color:var(--muted)]',
  cyan: 'bg-[color:var(--muted)]',
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
