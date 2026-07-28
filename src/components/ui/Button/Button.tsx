import React from 'react'

import { Icon } from '../Icon'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'link' | 'outline' | 'success' | 'warning'
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  block?: boolean
  iconOnly?: boolean
  leftIcon?: React.ReactNode | string
  rightIcon?: React.ReactNode | string
  children?: React.ReactNode
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
      'bg-[color:var(--accent)] text-[color:var(--on-accent)] hover:opacity-90 active:opacity-80 shadow-sm hover:shadow-md',
  secondary:
  'bg-[color:var(--card)] text-[color:var(--fg-2)] border border-[color:var(--border)] hover:bg-[color:var(--panel-2)] active:bg-[color:var(--panel-2)] shadow-sm',
  danger:
  'bg-danger-500 text-white hover:bg-danger-600 active:bg-danger-700 shadow-sm hover:shadow-md',
  ghost:
  'bg-transparent text-[color:var(--fg-2)] hover:bg-[color:var(--panel-2)]',
  link:
      'bg-transparent text-[color:var(--accent)] hover:opacity-80 hover:underline shadow-none',
  outline:
      'bg-transparent text-[color:var(--accent)] border border-[color:var(--border)] hover:bg-[color:var(--accent-soft)] active:bg-[color:var(--accent-soft)]',
  success:
  'bg-success-600 text-white hover:bg-success-700 active:bg-success-800 shadow-sm hover:shadow-md',
  warning:
  'bg-warning-500 text-white hover:bg-warning-600 active:bg-warning-700 shadow-sm hover:shadow-md',
}

const sizeStyles: Record<ButtonSize, string> = {
  xs: 'px-2 py-1 text-xs gap-1',
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2 text-base gap-2',
  lg: 'px-6 py-3 text-lg gap-2',
  xl: 'px-8 py-4 text-xl gap-3',
}

const iconSizeStyles: Record<ButtonSize, string> = {
  xs: 'p-1',
  sm: 'p-1.5',
  md: 'p-2',
  lg: 'p-3',
  xl: 'p-4',
}

function renderIcon(icon: React.ReactNode | string | undefined, size: number): React.ReactNode {
  if (icon == null) return null
  if (typeof icon === 'string') {
  return <Icon name={icon} size={size} />
  }
  return <span className="flex-shrink-0">{icon}</span>
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  block = false,
  iconOnly = false,
  leftIcon,
  rightIcon,
  children,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading

  const baseClasses = `
  inline-flex items-center justify-center font-medium rounded-lg
  transition-all duration-150 ease-out
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--accent-soft)]
  disabled:opacity-50 disabled:cursor-not-allowed select-none
  ${variantStyles[variant]}
  ${block ? 'w-full' : ''}
  ${iconOnly ? iconSizeStyles[size] : sizeStyles[size]}
  ${className}
  `

  const iconSize = { xs: 14, sm: 16, md: 18, lg: 20, xl: 22 }[size]

  return (
  <button
  className={baseClasses}
  disabled={isDisabled}
  {...props}
  >
  {loading ? (
  <>
  <Icon name="Loader2" size={iconSize} className="animate-spin" />
  {children && !iconOnly && <span>{children}</span>}
  </>
  ) : (
  <>
  {renderIcon(leftIcon, iconSize)}
  {children && (iconOnly ? null : <span>{children}</span>)}
  {renderIcon(rightIcon, iconSize)}
  </>
  )}
  </button>
  )
}
