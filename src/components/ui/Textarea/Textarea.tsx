import React, { forwardRef } from 'react'

export type TextareaSize = 'sm' | 'md' | 'lg'
export type TextareaStatus = 'default' | 'error' | 'warning' | 'success'

export interface TextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
  size?: TextareaSize
  status?: TextareaStatus
  error?: string
  label?: string
  helpText?: string
  containerClassName?: string
}

const sizeStyles: Record<TextareaSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2.5 text-base',
  lg: 'px-5 py-3 text-lg',
}

const statusBorderStyles: Record<TextareaStatus, string> = {
  default: 'border-[color:var(--border)] focus:ring-[color:var(--accent-soft)] focus:border-[color:var(--accent)] hover:border-[color:var(--border)]',
  error: 'border-danger-500 focus:ring-danger-500/20 focus:border-danger-500',
  warning: 'border-warning-500 focus:ring-warning-500/20 focus:border-warning-500',
  success: 'border-success-500 focus:ring-success-500/20 focus:border-success-500',
}

/**
 * Textarea — 多行输入框基元
 *
 * 与 <Input> 对齐的 API（size / status / error / label / helpText），
 * 供业务表单替换裸 <textarea>，收敛组件库 bypass。
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({
  size = 'md',
  status = 'default',
  error,
  label,
  helpText,
  containerClassName = '',
  className = '',
  disabled,
  id,
  rows = 4,
  ...props
}, ref) => {
  const textareaId = id || `textarea-${Math.random().toString(36).slice(2, 11)}`
  const resolvedStatus = error ? 'error' : status

  return (
    <div className={`w-full ${containerClassName}`}>
      {label && (
        <label
          htmlFor={textareaId}
          className="block text-sm font-medium text-[color:var(--fg-2)] mb-1.5"
        >
          {label}
          {props.required && <span className="text-danger-500 ml-1">*</span>}
        </label>
      )}

      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        className={`
          w-full
          bg-[color:var(--card)] text-[color:var(--fg)]
          border rounded-lg
          placeholder-[color:var(--muted)]
          transition-all duration-200
          resize-y
          focus:outline-none focus:ring-2
          disabled:bg-[color:var(--panel-2)] disabled:text-[color:var(--muted)] disabled:cursor-not-allowed
          ${sizeStyles[size]}
          ${statusBorderStyles[resolvedStatus]}
          ${className}
        `}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={error ? `${textareaId}-error` : helpText ? `${textareaId}-help` : undefined}
        {...props}
      />

      {error && (
        <p id={`${textareaId}-error`} className="mt-1.5 text-sm text-danger-500" role="alert">
          {error}
        </p>
      )}

      {helpText && !error && (
        <p id={`${textareaId}-help`} className="mt-1.5 text-sm text-[color:var(--muted)]">
          {helpText}
        </p>
      )}
    </div>
  )
})

Textarea.displayName = 'Textarea'
