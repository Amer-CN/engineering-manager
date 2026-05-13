// useForm Hook - 表单状态管理
import { useState, useCallback, useMemo } from 'react'
import type { Result, VoidResult } from '@/types'

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 表单字段错误
 */
export type FieldError = string | null

/**
 * 表单错误集合
 */
export type FormErrors<T extends Record<string, unknown>> = Partial<Record<keyof T, FieldError>>

/**
 * 字段是否被触碰过
 */
export type TouchedFields<T extends Record<string, unknown>> = Partial<Record<keyof T, boolean>>

/**
 * 验证函数类型
 */
export type Validator<T extends Record<string, unknown>> = (values: T) => FormErrors<T>

/**
 * 提交函数类型
 */
export type SubmitHandler<T extends Record<string, unknown>, R = void> = (
  values: T
) => Promise<Result<R> | VoidResult>

/**
 * useForm 返回类型
 */
export interface UseFormReturn<T extends Record<string, unknown>, R = void> {
  // 值
  values: T
  errors: FormErrors<T>
  touched: TouchedFields<T>
  isSubmitting: boolean
  
  // 方法
  handleChange: (field: keyof T, value: T[keyof T]) => void
  handleBlur: (field: keyof T) => void
  handleSubmit: (e?: React.FormEvent) => Promise<void>
  reset: () => void
  setValues: (values: Partial<T>) => void
  setFieldValue: (field: keyof T, value: T[keyof T]) => void
  
  // 辅助
  isValid: boolean
  isDirty: boolean
  getFieldProps: (field: keyof T) => {
    name: keyof T
    value: T[keyof T]
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void
    onBlur: () => void
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hook Implementation
// ═══════════════════════════════════════════════════════════════════════════════

/** 通用表单 Hook — initialValues + validate + onSubmit */
export function useForm<
  T extends Record<string, unknown>,
  R = void
>(options: {
  initialValues: T
  validate?: Validator<T>
  onSubmit: SubmitHandler<T, R>
}): UseFormReturn<T, R> {
  const { initialValues, validate, onSubmit } = options

  const [values, setValuesState] = useState<T>(initialValues)
  const [errors, setErrors] = useState<FormErrors<T>>({})
  const [touched, setTouched] = useState<TouchedFields<T>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [initialValuesCopy] = useState(initialValues)

  // 是否有错误
  const isValid = useMemo(() => {
    return Object.values(errors).every(e => e === null || e === undefined)
  }, [errors])

  // 是否有修改
  const isDirty = useMemo(() => {
    return JSON.stringify(values) !== JSON.stringify(initialValuesCopy)
  }, [values, initialValuesCopy])

  // 设置字段值
  const setFieldValue = useCallback((field: keyof T, value: T[keyof T]) => {
    setValuesState(prev => ({ ...prev, [field]: value }))
  }, [])

  // 处理变更
  const handleChange = useCallback((field: keyof T, value: T[keyof T]) => {
    setFieldValue(field, value)
    
    // 如果有验证器，立即验证
    if (validate) {
      const newValues = { ...values, [field]: value }
      const newErrors = validate(newValues)
      setErrors(prev => ({ ...prev, [field]: newErrors[field] }))
    }
  }, [setFieldValue, validate, values])

  // 处理失焦
  const handleBlur = useCallback((field: keyof T) => {
    setTouched(prev => ({ ...prev, [field]: true }))
    
    // 失焦时验证
    if (validate) {
      const newErrors = validate(values)
      setErrors(prev => ({ ...prev, [field]: newErrors[field] }))
    }
  }, [validate, values])

  // 获取字段属性 (用于快速绑定到表单元素)
  const getFieldProps = useCallback((field: keyof T) => {
    return {
      name: field,
      value: values[field] as T[keyof T],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const target = e.target
        const value = target.type === 'checkbox' 
          ? (target as HTMLInputElement).checked 
          : target.value
        handleChange(field, value as T[keyof T])
      },
      onBlur: () => handleBlur(field),
    }
  }, [values, handleChange, handleBlur])

  // 处理提交
  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault()
    }

    // 标记所有字段为已触碰
    const allTouched = Object.keys(values).reduce((acc, key) => {
      acc[key as keyof T] = true
      return acc
    }, {} as TouchedFields<T>)
    setTouched(allTouched)

    // 验证
    if (validate) {
      const newErrors = validate(values)
      setErrors(newErrors)
      
      if (Object.values(newErrors).some(e => e !== null && e !== undefined)) {
        return // 有错误，不提交
      }
    }

    setIsSubmitting(true)
    
    try {
      const result = await onSubmit(values)
      
      if (result && 'success' in result && !result.success) {
        // 处理返回的错误
        setErrors({ _form: (result as { error: string }).error } as FormErrors<T>)
      }
    } catch (err) {
      setErrors({ _form: '提交失败，请重试' } as FormErrors<T>)
    } finally {
      setIsSubmitting(false)
    }
  }, [values, validate, onSubmit])

  // 重置表单
  const reset = useCallback(() => {
    setValuesState(initialValues)
    setErrors({})
    setTouched({})
    setIsSubmitting(false)
  }, [initialValues])

  // 设置多个值
  const setValues = useCallback((newValues: Partial<T>) => {
    setValuesState(prev => ({ ...prev, ...newValues }))
  }, [])

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    setValues,
    setFieldValue,
    isValid,
    isDirty,
    getFieldProps,
  }
}
