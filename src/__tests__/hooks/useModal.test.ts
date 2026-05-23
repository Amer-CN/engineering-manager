import { renderHook, act, cleanup } from '@testing-library/react'
import { useModal, useConfirm } from '../../hooks/useModal'

describe('useModal', () => {
  afterEach(() => {
    cleanup()
  })

  it('初始状态应为关闭', () => {
    const { result } = renderHook(() => useModal())
    expect(result.current.isOpen).toBe(false)
    expect(result.current.modalData).toBeUndefined()
  })

  it('open 应打开弹窗', () => {
    const { result } = renderHook(() => useModal())
    act(() => { result.current.open() })
    expect(result.current.isOpen).toBe(true)
  })

  it('open 可传递数据', () => {
    const { result } = renderHook(() => useModal<{ id: number; name: string }>())
    act(() => { result.current.open({ id: 1, name: 'test' }) })
    expect(result.current.modalData).toEqual({ id: 1, name: 'test' })
  })

  it('close 应关闭弹窗', () => {
    const { result } = renderHook(() => useModal())
    act(() => { result.current.open() })
    expect(result.current.isOpen).toBe(true)

    act(() => { result.current.close() })
    expect(result.current.isOpen).toBe(false)
  })

  it('关闭后 modalData 不被清除（当前实现）', () => {
    const { result } = renderHook(() => useModal<string>())
    act(() => { result.current.open('data') })
    act(() => { result.current.close() })
    expect(result.current.modalData).toBe('data')
  })

  it('toggle 应切换状态', () => {
    const { result } = renderHook(() => useModal())
    expect(result.current.isOpen).toBe(false)

    act(() => { result.current.toggle() })
    expect(result.current.isOpen).toBe(true)

    act(() => { result.current.toggle() })
    expect(result.current.isOpen).toBe(false)
  })

  it('可传入初始数据', () => {
    const { result } = renderHook(() => useModal('initial'))
    expect(result.current.modalData).toBe('initial')
  })
})

describe('useConfirm', () => {
  afterEach(() => {
    cleanup()
  })

  it('初始状态应为关闭且无配置', () => {
    const { result } = renderHook(() => useConfirm())
    expect(result.current.isOpen).toBe(false)
    expect(result.current.config).toBeNull()
  })

  it('confirm 应设置配置并打开', () => {
    const { result } = renderHook(() => useConfirm())
    const config = {
      title: '确认删除',
      content: '确定要删除吗？',
      onConfirm: vi.fn(),
    }

    act(() => { result.current.confirm(config) })
    expect(result.current.isOpen).toBe(true)
    expect(result.current.config).toEqual(config)
  })

  it('handleConfirm 应调用 onConfirm 并关闭', () => {
    const onConfirm = vi.fn()
    const { result } = renderHook(() => useConfirm())

    act(() => {
      result.current.confirm({
        title: '确认',
        content: '内容',
        onConfirm,
      })
    })

    act(() => { result.current.handleConfirm() })
    expect(onConfirm).toHaveBeenCalled()
    expect(result.current.isOpen).toBe(false)
    expect(result.current.config).toBeNull()
  })

  it('handleCancel 应调用 onCancel 并关闭', () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    const { result } = renderHook(() => useConfirm())

    act(() => {
      result.current.confirm({
        title: '确认',
        content: '内容',
        onConfirm,
        onCancel,
      })
    })

    act(() => { result.current.handleCancel() })
    expect(onCancel).toHaveBeenCalled()
    expect(result.current.isOpen).toBe(false)
    expect(result.current.config).toBeNull()
  })

  it('handleCancel 无 onCancel 时不报错', () => {
    const { result } = renderHook(() => useConfirm())

    act(() => {
      result.current.confirm({
        title: '确认',
        content: '内容',
        onConfirm: vi.fn(),
      })
    })

    expect(() => {
      act(() => { result.current.handleCancel() })
    }).not.toThrow()
  })

  it('close 应关闭但不调用回调', () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    const { result } = renderHook(() => useConfirm())

    act(() => {
      result.current.confirm({
        title: '确认',
        content: '内容',
        onConfirm,
        onCancel,
      })
    })

    act(() => { result.current.close() })
    expect(onConfirm).not.toHaveBeenCalled()
    expect(onCancel).not.toHaveBeenCalled()
    expect(result.current.isOpen).toBe(false)
  })
})
