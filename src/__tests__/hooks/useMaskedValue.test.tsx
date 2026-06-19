/**
 * useMaskedFn hook 测试 (v0.73.0 PII Mask 闭环)
 * - 默认 MaskProvider masked=true -> 返回脱敏值
 * - 通过 setMasked(false) 切换 -> 返回原值
 * - 空值/null/undefined 全部返回 ''
 * - 4 种 type 枚举全覆盖
 *
 * 备注: MaskContext 没有导出 createContext 对象,
 * 因此用真实 MaskProvider 包装, 通过其提供的 setMasked API
 * 切换 masked 状态来验证两种路径。
 */

import { describe, it, expect, afterEach } from 'vitest'
import { renderHook, cleanup, act } from '@testing-library/react'
import { ReactNode } from 'react'
import { MaskProvider } from '../../contexts/MaskContext'
import { useMask } from '../../contexts/MaskContext'
import { useMaskedFn } from '../../hooks/useMaskedValue'

// 包装组件: 同时挂载 MaskProvider, 暴露 useMask 给测试
function wrapper({ children }: { children: ReactNode }) {
  return <MaskProvider>{children}</MaskProvider>
}

describe('useMaskedFn', () => {
  afterEach(() => {
    cleanup()
  })

  it('默认 masked=true (MaskProvider 默认值) -> 返回脱敏值', () => {
    const { result } = renderHook(() => useMaskedFn(), { wrapper })
    expect(result.current('idCard', '11010519491231002X')).toBe('1101**********002X')
    expect(result.current('phone', '[已脱敏]')).toBe('138****8000')
    expect(result.current('bankAccount', '6225880137660000')).toBe('6225********0000')
    expect(result.current('email', 'alice@example.com')).toBe('a***@example.com')
  })

  it('切到 unmasked (setMasked(false)) -> 返回原值', () => {
    // 双 hook: 拿 setMasked 来切状态, 同时测 useMaskedFn
    let setMaskedRef: ((v: boolean) => void) | null = null
    const { result } = renderHook(
      () => {
        const mask = useMask()
        setMaskedRef = mask.setMasked
        return useMaskedFn()
      },
      { wrapper }
    )

    // 默认脱敏
    expect(result.current('phone', '[已脱敏]')).toBe('138****8000')

    // 切到 unmasked
    act(() => {
      setMaskedRef!(false)
    })

    expect(result.current('phone', '[已脱敏]')).toBe('[已脱敏]')
    expect(result.current('idCard', '11010519491231002X')).toBe('11010519491231002X')
    expect(result.current('bankAccount', '6225880137660000')).toBe('6225880137660000')
    expect(result.current('email', 'alice@example.com')).toBe('alice@example.com')

    // 切回 masked -> 再次脱敏
    act(() => {
      setMaskedRef!(true)
    })
    expect(result.current('phone', '[已脱敏]')).toBe('138****8000')
  })

  it('空字符串 / null / undefined 在 masked 状态下返回空字符串', () => {
    const { result } = renderHook(() => useMaskedFn(), { wrapper })
    expect(result.current('idCard', '')).toBe('')
    expect(result.current('phone', null)).toBe('')
    expect(result.current('bankAccount', undefined)).toBe('')
    expect(result.current('email', null)).toBe('')
  })

  it('空字符串 / null / undefined 在 unmasked 状态下返回空字符串 (优先于原值)', () => {
    let setMaskedRef: ((v: boolean) => void) | null = null
    const { result } = renderHook(
      () => {
        const mask = useMask()
        setMaskedRef = mask.setMasked
        return useMaskedFn()
      },
      { wrapper }
    )
    act(() => { setMaskedRef!(false) })

    // 即使 unmasked, null/undefined/空串也返回 '' (hook 早返)
    expect(result.current('idCard', '')).toBe('')
    expect(result.current('phone', null)).toBe('')
    expect(result.current('bankAccount', undefined)).toBe('')
    expect(result.current('email', null)).toBe('')
  })

  it('4 种 type 枚举全覆盖 (masked=true 路径)', () => {
    const { result } = renderHook(() => useMaskedFn(), { wrapper })
    expect(result.current('idCard', '11010519491231002X')).toBe('1101**********002X')
    expect(result.current('phone', '[已脱敏]')).toBe('138****8000')
    expect(result.current('bankAccount', '6225880137660000')).toBe('6225********0000')
    expect(result.current('email', 'alice@example.com')).toBe('a***@example.com')
  })

  it('边界值: 太短身份证在 masked 下原样返回', () => {
    const { result } = renderHook(() => useMaskedFn(), { wrapper })
    expect(result.current('idCard', '1234567')).toBe('1234567')
  })

  it('边界值: 无 @ 邮箱原样返回', () => {
    const { result } = renderHook(() => useMaskedFn(), { wrapper })
    expect(result.current('email', 'no-at-sign')).toBe('no-at-sign')
  })
})
