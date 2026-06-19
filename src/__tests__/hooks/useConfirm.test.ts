import { renderHook, act, waitFor } from '@testing-library/react'
import type { ConfirmDialogProps } from '../../components/ui/ConfirmDialog/ConfirmDialog'

// Mock ConfirmDialog component (useConfirm calls it as a function)
// 正确类型化 vi.fn，使 mock.calls 有正确的元组类型
const mockConfirmDialog = vi.fn<(props: ConfirmDialogProps) => React.ReactElement>(
  () => null as unknown as React.ReactElement,
)
vi.mock('../../components/ui/ConfirmDialog/ConfirmDialog', () => ({
  ConfirmDialog: mockConfirmDialog,
}))

describe('useConfirm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('初始状态：ConfirmDialog 接收 isOpen=false', async () => {
    const { useConfirm } = await import('../../hooks/useConfirm')
    renderHook(() => useConfirm())

    const lastCall = mockConfirmDialog.mock.calls[mockConfirmDialog.mock.calls.length - 1]
    expect(lastCall?.[0]).toBeDefined()
    expect(lastCall![0].isOpen).toBe(false)
  })

  it('confirm 返回 Promise', async () => {
    const { useConfirm } = await import('../../hooks/useConfirm')
    const { result } = renderHook(() => useConfirm())
    let promise: Promise<boolean> | undefined
    act(() => {
      promise = result.current.confirm({ content: '确认操作？' })
    })
    expect(promise!).toBeInstanceOf(Promise)
    promise!.catch(() => {})
  })

  it('confirm 调用后 ConfirmDialog 接收 isOpen=true', async () => {
    const { useConfirm } = await import('../../hooks/useConfirm')
    const { result } = renderHook(() => useConfirm())

    act(() => {
      result.current.confirm({ content: '确认操作？' }).catch(() => {})
    })

    const lastCall = mockConfirmDialog.mock.calls[mockConfirmDialog.mock.calls.length - 1]
    expect(lastCall![0].isOpen).toBe(true)
  })

  it('confirm 选项正确传递给 ConfirmDialog', async () => {
    const { useConfirm } = await import('../../hooks/useConfirm')
    const { result } = renderHook(() => useConfirm())

    act(() => {
      result.current.confirm({
        title: '删除确认',
        content: '确定要删除吗？',
        confirmText: '删除',
        cancelText: '取消',
        confirmVariant: 'danger',
      }).catch(() => {})
    })

    const lastCall = mockConfirmDialog.mock.calls[mockConfirmDialog.mock.calls.length - 1]
    expect(lastCall![0].title).toBe('删除确认')
    expect(lastCall![0].content).toBe('确定要删除吗？')
    expect(lastCall![0].confirmText).toBe('删除')
    expect(lastCall![0].cancelText).toBe('取消')
    expect(lastCall![0].confirmVariant).toBe('danger')
  })

  it('onConfirm 回调 resolve(true)', async () => {
    const { useConfirm } = await import('../../hooks/useConfirm')
    const { result } = renderHook(() => useConfirm())

    // 调用 confirm 并获取 Promise
    let confirmPromise: Promise<boolean> | undefined
    act(() => {
      confirmPromise = result.current.confirm({ content: '确认' })
    })

    // 找到 isOpen=true 那次调用中的 onConfirm
    const openCall = mockConfirmDialog.mock.calls.find(c => c[0].isOpen === true)
    expect(openCall).toBeTruthy()

    // 调用 onConfirm
    act(() => {
      openCall![0].onConfirm()
    })

    // 验证 Promise resolve 为 true
    const val = await confirmPromise
    expect(val).toBe(true)
  })

  it('onConfirm 后 isOpen 变为 false', async () => {
    const { useConfirm } = await import('../../hooks/useConfirm')
    const { result } = renderHook(() => useConfirm())

    act(() => {
      result.current.confirm({ content: '确认' }).catch(() => {})
    })

    const openCall = mockConfirmDialog.mock.calls.find(c => c[0].isOpen === true)
    act(() => {
      openCall![0].onConfirm()
    })

    await waitFor(() => {
      const lastCall = mockConfirmDialog.mock.calls[mockConfirmDialog.mock.calls.length - 1]
      expect(lastCall[0].isOpen).toBe(false)
    })
  })

  it('handleClose 关闭对话框（isOpen 变 false）', async () => {
    const { useConfirm } = await import('../../hooks/useConfirm')
    const { result } = renderHook(() => useConfirm())

    act(() => {
      result.current.confirm({ content: '确认' }).catch(() => {})
    })

    const openCall = mockConfirmDialog.mock.calls.find(c => c[0].isOpen === true)
    expect(openCall).toBeTruthy()

    act(() => {
      openCall![0].onClose()
    })

    await waitFor(() => {
      const lastCall = mockConfirmDialog.mock.calls[mockConfirmDialog.mock.calls.length - 1]
      expect(lastCall[0].isOpen).toBe(false)
    })
  })

  it('连续调用 confirm 更新对话框内容', async () => {
    const { useConfirm } = await import('../../hooks/useConfirm')
    const { result } = renderHook(() => useConfirm())

    act(() => {
      result.current.confirm({ title: '第一个', content: '内容1' }).catch(() => {})
    })

    act(() => {
      result.current.confirm({ title: '第二个', content: '内容2' }).catch(() => {})
    })

    const lastCall = mockConfirmDialog.mock.calls[mockConfirmDialog.mock.calls.length - 1]
    expect(lastCall[0].title).toBe('第二个')
    expect(lastCall[0].content).toBe('内容2')
  })
})
