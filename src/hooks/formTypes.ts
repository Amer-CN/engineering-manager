import type { Result, VoidResult } from '@/types'

export type FieldError = string | null

export type FormErrors<T extends Record<string, unknown>> = Partial<Record<keyof T, FieldError>>

export type TouchedFields<T extends Record<string, unknown>> = Partial<Record<keyof T, boolean>>

export type Validator<T extends Record<string, unknown>> = (values: T) => FormErrors<T>

export type SubmitHandler<T extends Record<string, unknown>, R = void> = (
  values: T
) => Promise<Result<R> | VoidResult>

export interface UseFormReturn<T extends Record<string, unknown>, R = void> {
  values: T
  errors: FormErrors<T>
  touched: TouchedFields<T>
  isSubmitting: boolean

  handleChange: (field: keyof T, value: T[keyof T]) => void
  handleBlur: (field: keyof T) => void
  handleSubmit: (e?: React.FormEvent) => Promise<void>
  reset: () => void
  setValues: (values: Partial<T>) => void
  setFieldValue: (field: keyof T, value: T[keyof T]) => void

  isValid: boolean
  isDirty: boolean
  getFieldProps: (field: keyof T) => {
    name: keyof T
    value: T[keyof T]
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void
    onBlur: () => void
  }
}
