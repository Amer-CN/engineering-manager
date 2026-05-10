import React, { forwardRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Icon } from '../Icon'

export type InputSize = 'sm' | 'md' | 'lg'
export type InputStatus = 'default' | 'error' | 'warning' | 'success'

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: InputSize
  status?: InputStatus
  error?: string
  label?: string
  leftIcon?: React.ReactNode | string
  rightIcon?: React.ReactNode | string
  helpText?: string
  leftSection?: React.ReactNode
  rightSection?: React.ReactNode
  containerClassName?: string
}

const sizeStyles: Record<InputSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2.5 text-base',
  lg: 'px-5 py-3 text-lg',
}

const statusBorderStyles: Record<InputStatus, string> = {
  default:
    'border-slate-200 dark:border-slate-700 focus:ring-primary-500/20 focus:border-primary-500 hover:border-slate-300:border-slate-500',
  error:
    'border-danger-500 focus:ring-danger-500/20 focus:border-danger-500',
  warning:
    'border-warning-500 focus:ring-warning-500/20 focus:border-warning-500',
  success:
    'border-success-500 focus:ring-success-500/20 focus:border-success-500',
}

function renderIcon(icon: React.ReactNode | string | undefined, size: number): React.ReactNode {
  if (icon == null) return null
  if (typeof icon === 'string') {
    return <Icon name={icon} size={size} />
  }
  return icon
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  size = 'md',
  status = 'default',
  error,
  label,
  leftIcon,
  rightIcon,
  helpText,
  leftSection,
  rightSection,
  containerClassName = '',
  className = '',
  disabled,
  id,
  ...props
}, ref) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`
  const resolvedStatus = error ? 'error' : status
  const iconSize = { sm: 16, md: 18, lg: 20 }[size]

  return (
    <div className={`w-full ${containerClassName}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5"
        >
          {label}
          {props.required && <span className="text-danger-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        {(leftIcon || leftSection) && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            {renderIcon(leftIcon, iconSize)}
            {leftSection}
          </div>
        )}

        <input
          ref={ref}
          id={inputId}
          className={`
            w-full
            bg-white dark:bg-slate-800 text-slate-800
            border rounded-lg
            placeholder-slate-400
            transition-all duration-200
            focus:outline-none focus:ring-2
            disabled:bg-slate-50 disabled:text-slate-500 dark:text-slate-400 disabled:cursor-not-allowed
           
           :bg-slate-900:text-slate-600
            ${sizeStyles[size]}
            ${statusBorderStyles[resolvedStatus]}
            ${leftIcon || leftSection ? 'pl-10' : ''}
            ${rightIcon || rightSection ? 'pr-10' : ''}
            ${className}
          `}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : helpText ? `${inputId}-help` : undefined}
          {...props}
        />

        {(rightIcon || rightSection) && (
          <div className={`absolute inset-y-0 right-0 pr-3 flex items-center ${rightSection ? '' : 'pointer-events-none'} text-slate-400`}>
            {rightSection}
            {renderIcon(rightIcon, iconSize)}
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {error && (
          <motion.p
            key={`${inputId}-error`}
            id={`${inputId}-error`}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="mt-1.5 text-sm text-danger-500"
            role="alert"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {helpText && !error && (
        <p
          id={`${inputId}-help`}
          className="mt-1.5 text-sm text-slate-500"
        >
          {helpText}
        </p>
      )}
    </div>
  )
})

Input.displayName = 'Input'
