import { renderHook, act, cleanup, waitFor } from '@testing-library/react'
import type { CRUDAPI } from '../../hooks/useCRUDBase.types'

afterEach(cleanup)

// 测试用实体类型
interface TestItem {
  id: number
  name: string
}

// 创建 mock API
function createMockApi(overrides?: Partial<CRUDAPI<TestItem, Partial<TestItem>, TestItem>>): CRUDAPI<TestItem, Partial<TestItem>, TestItem> {
  return {
    getAll: vi.fn().mockResolvedValue({ success: true, data: [] }),
    create: vi.fn().mockResolvedValue({ success: true, data: { id: 1 } }),
    update: vi.fn().mockResolvedValue({ success: true }),
    delete: vi.fn().mockResolvedValue({ success: true }),
    ...overrides,
  }
}

describe('useCRUDBase', () => {
  it('autoLoad=true 时应自动加载', async () => {
    const mockData: TestItem[] = [{ id: 1, name: '测试' }]
    const api = createMockApi({ getAll: vi.fn().mockResolvedValue({ success: true, data: mockData }) })
    const { useCRUDBase } = await import('../../hooks/useCRUDBase')

    const { result } = renderHook(() => useCRUDBase<TestItem>({ api }))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    expect(result.current.data).toEqual(mockData)
  })

  it('autoLoad=false 时不应自动加载', async () => {
    const api = createMockApi({ getAll: vi.fn().mockResolvedValue({ success: true, data: [{ id: 1, name: '测试' }] }) })
    const { useCRUDBase } = await import('../../hooks/useCRUDBase')

    const { result } = renderHook(() => useCRUDBase<TestItem>({ api, autoLoad: false }))

    // 不应调用 getAll
    expect(api.getAll).not.toHaveBeenCalled()
    expect(result.current.data).toEqual([])
  })

  it('loadData 成功时应设置 data', async () => {
    const mockData: TestItem[] = [{ id: 1, name: 'A' }, { id: 2, name: 'B' }]
    const api = createMockApi({ getAll: vi.fn().mockResolvedValue({ success: true, data: mockData }) })
    const { useCRUDBase } = await import('../../hooks/useCRUDBase')

    const { result } = renderHook(() => useCRUDBase<TestItem>({ api, autoLoad: false }))

    await act(async () => {
      await result.current.loadData()
    })

    expect(result.current.data).toEqual(mockData)
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('loadData 失败时应设置 error', async () => {
    const api = createMockApi({ getAll: vi.fn().mockResolvedValue({ success: false, error: '加载失败' }) })
    const { useCRUDBase } = await import('../../hooks/useCRUDBase')

    const { result } = renderHook(() => useCRUDBase<TestItem>({ api, autoLoad: false }))

    await act(async () => {
      await result.current.loadData()
    })

    expect(result.current.error).toBe('加载失败')
  })

  it('loadData 异常时应通过 handleError 获取错误消息', async () => {
    const api = createMockApi({ getAll: vi.fn().mockRejectedValue(new Error('网络错误')) })
    const { useCRUDBase } = await import('../../hooks/useCRUDBase')

    const { result } = renderHook(() => useCRUDBase<TestItem>({ api, autoLoad: false }))

    await act(async () => {
      await result.current.loadData()
    })

    expect(result.current.error).toBeTruthy()
  })

  it('create 成功后应重新加载数据', async () => {
    const api = createMockApi({
      getAll: vi.fn()
        .mockResolvedValueOnce({ success: true, data: [] })
        .mockResolvedValueOnce({ success: true, data: [{ id: 1, name: '新项目' }] }),
      create: vi.fn().mockResolvedValue({ success: true, data: { id: 1 } }),
    })
    const { useCRUDBase } = await import('../../hooks/useCRUDBase')

    const { result } = renderHook(() => useCRUDBase<TestItem>({ api, autoLoad: true }))

    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.create({ name: '新项目' })
    })

    expect(api.create).toHaveBeenCalledWith({ name: '新项目' })
    // 第二次调用 getAll（create 后 reload）
    expect(api.getAll).toHaveBeenCalledTimes(2)
  })

  it('create 失败时应返回错误', async () => {
    const api = createMockApi({
      create: vi.fn().mockResolvedValue({ success: false, error: '创建失败' }),
    })
    const { useCRUDBase } = await import('../../hooks/useCRUDBase')

    const { result } = renderHook(() => useCRUDBase<TestItem>({ api, autoLoad: false }))

    const res = await act(async () => {
      return await result.current.create({ name: '测试' })
    })

    // result 可能返回了 { success: false }
    expect(res.success).toBe(false)
  })

  it('api 无 create 方法时应返回不支持', async () => {
    const api = createMockApi({ create: undefined })
    const { useCRUDBase } = await import('../../hooks/useCRUDBase')

    const { result } = renderHook(() => useCRUDBase<TestItem>({ api, autoLoad: false }))

    await act(async () => {
      const res = await result.current.create({ name: '测试' })
      expect(res.success).toBe(false)
      if (!res.success) {
        expect(res.error).toBe('不支持创建操作')
      }
    })
  })

  it('update 成功后应重新加载数据', async () => {
    const original: TestItem = { id: 1, name: '旧名' }
    const updated: TestItem = { id: 1, name: '新名' }
    const api = createMockApi({
      getAll: vi.fn()
        .mockResolvedValueOnce({ success: true, data: [original] })
        .mockResolvedValueOnce({ success: true, data: [updated] }),
      update: vi.fn().mockResolvedValue({ success: true }),
    })
    const { useCRUDBase } = await import('../../hooks/useCRUDBase')

    const { result } = renderHook(() => useCRUDBase<TestItem>({ api, autoLoad: true }))

    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.update(updated)
    })

    expect(api.update).toHaveBeenCalledWith(updated)
  })

  it('update 时如果 selectedItem 是当前项，应更新 selectedItem', async () => {
    const item: TestItem = { id: 1, name: '旧名' }
    const updatedItem: TestItem = { id: 1, name: '新名' }
    const api = createMockApi({
      getAll: vi.fn()
        .mockResolvedValueOnce({ success: true, data: [item] })
        .mockResolvedValueOnce({ success: true, data: [updatedItem] }),
      update: vi.fn().mockResolvedValue({ success: true }),
    })
    const { useCRUDBase } = await import('../../hooks/useCRUDBase')

    const { result } = renderHook(() => useCRUDBase<TestItem>({ api, autoLoad: true }))

    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => {
      result.current.setSelectedItem(item)
    })
    expect(result.current.selectedItem).toEqual(item)

    await act(async () => {
      await result.current.update(updatedItem)
    })

    // selectedItem 应已更新
    expect(result.current.selectedItem?.name).toBe('新名')
  })

  it('delete 成功后应乐观删除', async () => {
    const items: TestItem[] = [{ id: 1, name: 'A' }, { id: 2, name: 'B' }]
    const api = createMockApi({
      getAll: vi.fn().mockResolvedValue({ success: true, data: items }),
      delete: vi.fn().mockResolvedValue({ success: true }),
    })
    const { useCRUDBase } = await import('../../hooks/useCRUDBase')

    const { result } = renderHook(() => useCRUDBase<TestItem>({ api, autoLoad: true }))

    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.delete(1)
    })

    expect(result.current.data).toEqual([{ id: 2, name: 'B' }])
  })

  it('delete 时如果 selectedItem 是被删项，应清空 selectedItem', async () => {
    const items: TestItem[] = [{ id: 1, name: 'A' }]
    const api = createMockApi({
      getAll: vi.fn().mockResolvedValue({ success: true, data: items }),
      delete: vi.fn().mockResolvedValue({ success: true }),
    })
    const { useCRUDBase } = await import('../../hooks/useCRUDBase')

    const { result } = renderHook(() => useCRUDBase<TestItem>({ api, autoLoad: true }))

    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => {
      result.current.setSelectedItem(items[0])
    })
    expect(result.current.selectedItem).not.toBeNull()

    await act(async () => {
      await result.current.delete(1)
    })

    expect(result.current.selectedItem).toBeNull()
  })

  it('clearError 应清除错误', async () => {
    const api = createMockApi({ getAll: vi.fn().mockResolvedValue({ success: false, error: '出错了' }) })
    const { useCRUDBase } = await import('../../hooks/useCRUDBase')

    const { result } = renderHook(() => useCRUDBase<TestItem>({ api, autoLoad: true }))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBeTruthy()

    act(() => {
      result.current.clearError()
    })

    expect(result.current.error).toBeNull()
  })

  it('refresh 应重新加载数据', async () => {
    const api = createMockApi({ getAll: vi.fn().mockResolvedValue({ success: true, data: [] }) })
    const { useCRUDBase } = await import('../../hooks/useCRUDBase')

    const { result } = renderHook(() => useCRUDBase<TestItem>({ api, autoLoad: true }))

    await waitFor(() => expect(result.current.loading).toBe(false))
    const initialCalls = (api.getAll as ReturnType<typeof vi.fn>).mock.calls.length

    await act(async () => {
      await result.current.refresh()
    })

    expect(api.getAll).toHaveBeenCalledTimes(initialCalls + 1)
  })

  it('updateData 应通过 updater 函数更新数据', async () => {
    const api = createMockApi({ getAll: vi.fn().mockResolvedValue({ success: true, data: [] }) })
    const { useCRUDBase } = await import('../../hooks/useCRUDBase')

    const { result } = renderHook(() => useCRUDBase<TestItem>({ api, autoLoad: false }))

    act(() => {
      result.current.updateData(() => [{ id: 1, name: '手动' }])
    })

    expect(result.current.data).toEqual([{ id: 1, name: '手动' }])
  })

  it('onLoaded 回调应在加载成功时调用', async () => {
    const mockData: TestItem[] = [{ id: 1, name: '测试' }]
    const onLoaded = vi.fn()
    const api = createMockApi({ getAll: vi.fn().mockResolvedValue({ success: true, data: mockData }) })
    const { useCRUDBase } = await import('../../hooks/useCRUDBase')

    renderHook(() => useCRUDBase<TestItem>({ api, autoLoad: true, onLoaded }))

    await waitFor(() => {
      expect(onLoaded).toHaveBeenCalledWith(mockData)
    })
  })

  it('loadData 应处理非数组返回（包装为数组）', async () => {
    const singleItem: TestItem = { id: 1, name: '单个' }
    const api = createMockApi({ getAll: vi.fn().mockResolvedValue({ success: true, data: singleItem }) })
    const { useCRUDBase } = await import('../../hooks/useCRUDBase')

    const { result } = renderHook(() => useCRUDBase<TestItem>({ api, autoLoad: true }))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data).toEqual([singleItem])
  })

  it('errorPrefix 应影响错误消息', async () => {
    const api = createMockApi({ getAll: vi.fn().mockResolvedValue({ success: false }) })
    const { useCRUDBase } = await import('../../hooks/useCRUDBase')

    const { result } = renderHook(() => useCRUDBase<TestItem>({ api, autoLoad: true, errorPrefix: '项目' }))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toContain('项目')
  })

  it('api 无 delete 方法时应返回不支持删除', async () => {
    const api = createMockApi({ delete: undefined })
    const { useCRUDBase } = await import('../../hooks/useCRUDBase')

    const { result } = renderHook(() => useCRUDBase<TestItem>({ api, autoLoad: false }))

    await act(async () => {
      const res = await result.current.delete(1)
      expect(res.success).toBe(false)
      if (!res.success) {
        expect(res.error).toBe('不支持删除操作')
      }
    })
  })

  it('api 无 update 方法时应返回不支持更新', async () => {
    const api = createMockApi({ update: undefined })
    const { useCRUDBase } = await import('../../hooks/useCRUDBase')

    const { result } = renderHook(() => useCRUDBase<TestItem>({ api, autoLoad: false }))

    await act(async () => {
      const res = await result.current.update({ id: 1, name: '测试' })
      expect(res.success).toBe(false)
      if (!res.success) {
        expect(res.error).toBe('不支持更新操作')
      }
    })
  })
})
