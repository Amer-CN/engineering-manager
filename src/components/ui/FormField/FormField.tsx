import React from 'react'

export interface FormFieldProps {
  label: string
  required?: boolean
  error?: string
  helpText?: string
  children: React.ReactNode
  layout?: 'vertical' | 'horizontal'
  className?: string
}

export function FormField({
  label,
  required = false,
  error,
  helpText,
  children,
  layout = 'vertical',
  className = '',
}: FormFieldProps) {
  if (layout === 'horizontal') {
    return (
      <div className={`flex items-start gap-4 ${className}`}>
        <label className="text-sm font-medium text-slate-700 dark:text-slate-200 pt-2.5 flex-shrink-0 w-32">
          {label}
          {required && <span className="text-danger-500 ml-0.5">*</span>}
        </label>
        <div className="flex-1">
          {children}
          {error && <p className="mt-1 text-sm text-danger-500" role="alert">{error}</p>}
          {helpText && !error && <p className="mt-1 text-sm text-slate-500">{helpText}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
        {label}
        {required && <span className="text-danger-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-sm text-danger-500" role="alert">{error}</p>}
      {helpText && !error && <p className="mt-1 text-sm text-slate-500">{helpText}</p>}
    </div>
  )
}
