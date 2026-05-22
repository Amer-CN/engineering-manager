// @ts-nocheck
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act, cleanup } from '@testing-library/react'
import { useForm } from '../../hooks/useForm'

interface FormValues {
  name: string
  email: string
  age: number
}

const initialValues: FormValues = { name: '', email: '', age: 0 }

describe('useForm', () => {
  afterEach(() => {
    cleanup()
  })

  it('应使用初始值初始化', () => {
    const onSubmit = vi.fn().mockResolvedValue({ success: true })
    const { result } = renderHook(() =>
      useForm<FormValues>({ initialValues, onSubmit })
    )

    expect(result.current.values).toEqual(initialValues)
    expect(result.current.errors).toEqual({})
    expect(result.current.touched).toEqual({})
    expect(result.current.isSubmitting).toBe(false)
    expect(result.current.isValid).toBe(true)
    expect(result.current.isDirty).toBe(false)
  })

  it('handleChange 应更新字段值', () => {
    const onSubmit = vi.fn().mockResolvedValue({ success: true })
    const { result } = renderHook(() =>
      useForm<FormValues>({ initialValues, onSubmit })
    )

    act(() => { result.current.handleChange('name', 'John') })
    expect(result.current.values.name).toBe('John')
    expect(result.current.isDirty).toBe(true)
  })

  it('setFieldValue 应更新字段值', () => {
    const onSubmit = vi.fn().mockResolvedValue({ success: true })
    const { result } = renderHook(() =>
      useForm<FormValues>({ initialValues, onSubmit })
    )

    act(() => { result.current.setFieldValue('email', 'test@example.com') })
    expect(result.current.values.email).toBe('test@example.com')
  })

  it('setValues 应批量更新值', () => {
    const onSubmit = vi.fn().mockResolvedValue({ success: true })
    const { result } = renderHook(() =>
      useForm<FormValues>({ initialValues, onSubmit })
    )

    act(() => { result.current.setValues({ name: 'Jane', email: 'jane@test.com' }) })
    expect(result.current.values.name).toBe('Jane')
    expect(result.current.values.email).toBe('jane@test.com')
    expect(result.current.values.age).toBe(0)
  })

  it('handleBlur 应标记字段为 touched', () => {
    const onSubmit = vi.fn().mockResolvedValue({ success: true })
    const { result } = renderHook(() =>
      useForm<FormValues>({ initialValues, onSubmit })
    )

    act(() => { result.current.handleBlur('name') })
    expect(result.current.touched.name).toBe(true)
  })

  it('handleChange + validate 应立即验证', () => {
    const validate = vi.fn((values: FormValues) => {
      const errors: Record<string, string | null> = {}
      if (!values.name) errors.name = '名称必填'
      return errors
    })
    const onSubmit = vi.fn().mockResolvedValue({ success: true })

    const { result } = renderHook(() =>
      useForm<FormValues>({ initialValues, validate, onSubmit })
    )

    act(() => { result.current.handleChange('name', '') })
    expect(validate).toHaveBeenCalled()
  })

  it('handleBlur + validate 应验证字段', () => {
    const validate = (values: FormValues) => {
      const errors: Record<string, string | null> = {}
      if (!values.email) errors.email = '邮箱必填'
      return errors
    }
    const onSubmit = vi.fn().mockResolvedValue({ success: true })

    const { result } = renderHook(() =>
      useForm<FormValues>({ initialValues, validate, onSubmit })
    )

    act(() => { result.current.handleBlur('email') })
    expect(result.current.errors.email).toBe('邮箱必填')
    expect(result.current.isValid).toBe(false)
  })

  it('handleSubmit 有验证错误时不应调用 onSubmit', async () => {
    const validate = (values: FormValues) => {
      const errors: Record<string, string | null> = {}
      if (!values.name) errors.name = '名称必填'
      return errors
    }
    const onSubmit = vi.fn().mockResolvedValue({ success: true })

    const { result } = renderHook(() =>
      useForm<FormValues>({ initialValues, validate, onSubmit })
    )

    await act(async () => { await result.current.handleSubmit() })

    expect(onSubmit).not.toHaveBeenCalled()
    expect(result.current.touched.name).toBe(true)
  })

  it('handleSubmit 通过验证后应调用 onSubmit', async () => {
    const onSubmit = vi.fn().mockResolvedValue({ success: true })
    const filledValues: FormValues = { name: 'John', email: 'john@test.com', age: 30 }

    const { result } = renderHook(() =>
      useForm<FormValues>({ initialValues: filledValues, onSubmit })
    )

    await act(async () => { await result.current.handleSubmit() })

    expect(onSubmit).toHaveBeenCalledWith(filledValues)
  })

  it('reset 应恢复初始状态', () => {
    const onSubmit = vi.fn().mockResolvedValue({ success: true })
    const { result } = renderHook(() =>
      useForm<FormValues>({ initialValues, onSubmit })
    )

    act(() => { result.current.handleChange('name', 'Changed') })
    expect(result.current.values.name).toBe('Changed')

    act(() => { result.current.reset() })
    expect(result.current.values).toEqual(initialValues)
    expect(result.current.errors).toEqual({})
    expect(result.current.touched).toEqual({})
    expect(result.current.isDirty).toBe(false)
  })

  it('handleSubmit 失败时应设置错误', async () => {
    const onSubmit = vi.fn().mockResolvedValue({ success: false, error: '服务器错误' })
    const filledValues: FormValues = { name: 'John', email: 'a@b.com', age: 20 }

    const { result } = renderHook(() =>
      useForm<FormValues>({ initialValues: filledValues, onSubmit })
    )

    await act(async () => { await result.current.handleSubmit() })

    expect(result.current.errors._form).toBe('服务器错误')
  })

  it('handleSubmit 抛异常时应设置通用错误', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Network error'))
    const filledValues: FormValues = { name: 'John', email: 'a@b.com', age: 20 }

    const { result } = renderHook(() =>
      useForm<FormValues>({ initialValues: filledValues, onSubmit })
    )

    await act(async () => { await result.current.handleSubmit() })

    expect(result.current.errors._form).toBe('提交失败，请重试')
  })
})
