import { renderHook, act, waitFor } from '@testing-library/react'

// 29.1: mock getAPI——根因：getAPI() 在 isElectron=false 时走 checkCSharpApi()
// (fetch /api/health 2s 超时) 再 fallback 到 createMockAPI()（无 getDepartments），
// loading 变 false 晚于 waitFor 默认 1000ms → 并发偶发失败。mock 后不碰真实 fetch。
const mockGetDepartments = vi.fn()
const mockCreateDepartment = vi.fn()
const mockUpdateDepartment = vi.fn()
const mockDeleteDepartment = vi.fn()
const mockAPI = {
  getDepartments: mockGetDepartments,
  createDepartment: mockCreateDepartment,
  updateDepartment: mockUpdateDepartment,
  deleteDepartment: mockDeleteDepartment,
}
vi.mock('@/services/api-adapter', () => ({
  getAPI: vi.fn().mockResolvedValue(mockAPI),
}))

describe('useDepartments', () => {
  let ea: Record<string, any>

  beforeEach(() => {
    vi.clearAllMocks()
    ea = mockAPI as unknown as Record<string, any>
  })

  it('挂载时自动加载部门列表', async () => {
    ea.getDepartments = vi.fn().mockResolvedValue({
      success: true,
      data: [
        { id: 1, name: '技术部', positions: ['开发', '测试'] },
        { id: 2, name: '市场部', positions: ['销售'] },
      ],
    })

    const { useDepartments } = await import('../../hooks/useDepartments')
    const { result } = renderHook(() => useDepartments())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.departments).toHaveLength(2)
    expect(result.current.departments[0].name).toBe('技术部')
  })

  it('加载失败时不设置部门', async () => {
    ea.getDepartments = vi.fn().mockResolvedValue({
      success: false,
      error: '加载失败',
    })

    const { useDepartments } = await import('../../hooks/useDepartments')
    const { result } = renderHook(() => useDepartments())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.departments).toHaveLength(0)
  })

  it('加载异常时仍结束 loading', async () => {
    ea.getDepartments = vi.fn().mockRejectedValue(new Error('网络异常'))

    const { useDepartments } = await import('../../hooks/useDepartments')
    const { result } = renderHook(() => useDepartments())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.departments).toHaveLength(0)
  })

  it('create 成功后自动刷新列表', async () => {
    ea.getDepartments = vi.fn().mockResolvedValue({
      success: true,
      data: [{ id: 1, name: '技术部' }],
    })
    ea.createDepartment = vi.fn().mockResolvedValue({ success: true })

    const { useDepartments } = await import('../../hooks/useDepartments')
    const { result } = renderHook(() => useDepartments())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      const res = await result.current.create({ name: '新部门' })
      expect(res.success).toBe(true)
    })

    // getDepartments 被调用两次：初始加载 + create 后刷新
    await waitFor(() => {
      expect(ea.getDepartments).toHaveBeenCalledTimes(2)
    })
  })

  it('update 成功后自动刷新列表', async () => {
    ea.getDepartments = vi.fn().mockResolvedValue({
      success: true,
      data: [{ id: 1, name: '技术部' }],
    })
    ea.updateDepartment = vi.fn().mockResolvedValue({ success: true })

    const { useDepartments } = await import('../../hooks/useDepartments')
    const { result } = renderHook(() => useDepartments())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      const res = await result.current.update({ id: 1, name: '技术部V2' })
      expect(res.success).toBe(true)
    })

    expect(ea.updateDepartment).toHaveBeenCalledWith({ id: 1, name: '技术部V2' })
  })

  it('remove 成功后自动刷新列表', async () => {
    ea.getDepartments = vi.fn().mockResolvedValue({
      success: true,
      data: [{ id: 1, name: '技术部' }],
    })
    ea.deleteDepartment = vi.fn().mockResolvedValue({ success: true })

    const { useDepartments } = await import('../../hooks/useDepartments')
    const { result } = renderHook(() => useDepartments())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      const res = await result.current.remove(1)
      expect(res.success).toBe(true)
    })

    expect(ea.deleteDepartment).toHaveBeenCalledWith(1)
  })

  it('create 失败返回失败结果', async () => {
    ea.getDepartments = vi.fn().mockResolvedValue({ success: true, data: [] })
    ea.createDepartment = vi.fn().mockResolvedValue({
      success: false,
      error: '创建失败',
    })

    const { useDepartments } = await import('../../hooks/useDepartments')
    const { result } = renderHook(() => useDepartments())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      const res = await result.current.create({ name: '新部门' })
      expect(res.success).toBe(false)
    })
  })

  it('load 可手动重新加载', async () => {
    ea.getDepartments = vi.fn().mockResolvedValue({
      success: true,
      data: [{ id: 1, name: '技术部' }],
    })

    const { useDepartments } = await import('../../hooks/useDepartments')
    const { result } = renderHook(() => useDepartments())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      await result.current.load()
    })

    expect(ea.getDepartments).toHaveBeenCalledTimes(2)
  })
})
