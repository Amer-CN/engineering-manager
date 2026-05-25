import React from 'react'

import { Icon } from '../Icon'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'link' | 'outline'
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
    'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 shadow-sm hover:shadow-md',
  secondary:
    'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 active:bg-slate-100 shadow-sm',
  danger:
    'bg-danger-500 text-white hover:bg-danger-600 active:bg-danger-700 shadow-sm hover:shadow-md',
  ghost:
    'bg-transparent text-slate-600 hover:bg-slate-100 dark:active:bg-slate-200 dark:bg-slate-700',
  link:
    'bg-transparent text-primary-600 hover:text-primary-700 hover:underline shadow-none dark:text-primary-300',
  outline:
    'bg-transparent text-primary-600 border border-primary-300 hover:bg-primary-50 active:bg-primary-100 dark:active:bg-primary-900/20',
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
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500
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
      {...(props as any)}
    >
      {loading ? (
        <Icon name="Loader2" size={iconSize} className="animate-spin" />
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
