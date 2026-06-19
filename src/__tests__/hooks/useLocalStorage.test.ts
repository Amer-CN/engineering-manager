import { renderHook, act, cleanup } from '@testing-library/react'
import { useLocalStorage, useLocalStorageSync } from '../../hooks/useLocalStorage'

describe('useLocalStorage', () => {
  afterEach(() => {
    localStorage.clear()
    cleanup()
  })

  it('应返回默认值（localStorage 为空时）', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'))
    expect(result.current[0]).toBe('default')
  })

  it('应从 localStorage 读取已有值', () => {
    localStorage.setItem('test-key', JSON.stringify('stored'))
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'))
    expect(result.current[0]).toBe('stored')
  })

  it('setValue 应更新值和 localStorage', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'))

    act(() => { result.current[1]('new-value') })
    expect(result.current[0]).toBe('new-value')
    expect(JSON.parse(localStorage.getItem('test-key')!)).toBe('new-value')
  })

  it('setValue 应支持对象', () => {
    const { result } = renderHook(() => useLocalStorage('obj-key', { a: 1 }))

    act(() => { result.current[1]({ a: 2, b: 3 } as any) })
    expect(result.current[0]).toEqual({ a: 2, b: 3 })
  })

  it('removeValue 应恢复默认值', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'))

    act(() => { result.current[1]('something') })
    expect(result.current[0]).toBe('something')

    act(() => { result.current[2]() })
    expect(result.current[0]).toBe('default')
  })

  it('localStorage 数据损坏时应返回默认值', () => {
    localStorage.setItem('bad-json', '{invalid json')
    const { result } = renderHook(() => useLocalStorage('bad-json', 'fallback'))
    expect(result.current[0]).toBe('fallback')
  })
})

describe('useLocalStorageSync', () => {
  afterEach(() => {
    localStorage.clear()
    cleanup()
  })

  it('应返回对象形式接口', () => {
    const { result } = renderHook(() => useLocalStorageSync('sync-key', 'default'))

    expect(result.current.value).toBe('default')
    expect(result.current.error).toBeNull()
  })

  it('setValue 应更新值', () => {
    const { result } = renderHook(() => useLocalStorageSync('sync-key', 'default'))

    act(() => { result.current.setValue('updated') })
    expect(result.current.value).toBe('updated')
    expect(result.current.error).toBeNull()
  })

  it('removeValue 应恢复默认值', () => {
    const { result } = renderHook(() => useLocalStorageSync('sync-key', 'default'))

    act(() => { result.current.setValue('something') })
    act(() => { result.current.removeValue() })
    expect(result.current.value).toBe('default')
  })

  it('storage 事件应同步值', () => {
    const { result } = renderHook(() => useLocalStorageSync('sync-key', 'default'))

    act(() => {
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'sync-key',
        newValue: JSON.stringify('from-other-tab'),
      }))
    })

    expect(result.current.value).toBe('from-other-tab')
  })

  it('storage 事件 newValue 为 null 应恢复默认值', () => {
    const { result } = renderHook(() => useLocalStorageSync('sync-key', 'default'))

    act(() => { result.current.setValue('something') })

    act(() => {
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'sync-key',
        newValue: null,
      }))
    })

    expect(result.current.value).toBe('default')
  })

  it('其他 key 的 storage 事件不应影响值', () => {
    const { result } = renderHook(() => useLocalStorageSync('sync-key', 'default'))

    act(() => {
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'other-key',
        newValue: JSON.stringify('other-value'),
      }))
    })

    expect(result.current.value).toBe('default')
  })
})
