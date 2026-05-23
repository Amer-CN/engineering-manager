/**
 * useProjects Hook 测试
 * 测试项目管理 CRUD + 筛选
 */
import { renderHook, act, waitFor } from '@testing-library/react'

const mockProjects: any[] = [
  { id: 1, name: '项目A', status: 'in_progress', description: '安岳县农田项目', projectManagerId: 10, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 2, name: '项目B', status: 'completed', description: '写字楼装修', projectManagerId: 20, createdAt: '2024-02-01', updatedAt: '2024-06-01' },
  { id: 3, name: '项目C', status: 'in_progress', description: '道路施工', projectManagerId: 10, createdAt: '2024-03-01', updatedAt: '2024-03-01' },
]

describe('useProjects', () => {
  let ea: Record<string, any>

  beforeEach(() => {
    vi.clearAllMocks()
    ea = window.electronAPI as Record<string, any>
    ea.getProjects = vi.fn().mockResolvedValue({ success: true, data: mockProjects })
    ea.createProject = vi.fn().mockResolvedValue({ success: true, data: { id: 4 } })
    ea.updateProject = vi.fn().mockResolvedValue({ success: true })
    ea.deleteProject = vi.fn().mockResolvedValue({ success: true })
  })

  it('挂载时自动加载', async () => {
    const { useProjects } = await import('@/hooks/useProjects')
    const { result } = renderHook(() => useProjects())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toHaveLength(3)
  })

  it('按 status 筛选', async () => {
    const { useProjects } = await import('@/hooks/useProjects')
    const { result } = renderHook(() => useProjects({ status: 'in_progress' }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toHaveLength(2)
    expect(result.current.data.every((p: any) => p.status === 'in_progress')).toBe(true)
  })

  it('按 searchTerm 筛选', async () => {
    const { useProjects } = await import('@/hooks/useProjects')
    const { result } = renderHook(() => useProjects({ searchTerm: '农田' }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toHaveLength(1)
    expect(result.current.data[0].name).toBe('项目A')
  })

  it('按 managerId 筛选', async () => {
    const { useProjects } = await import('@/hooks/useProjects')
    const { result } = renderHook(() => useProjects({ managerId: 20 }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toHaveLength(1)
    expect(result.current.data[0].name).toBe('项目B')
  })

  it('创建项目成功', async () => {
    const { useProjects } = await import('@/hooks/useProjects')
    const { result } = renderHook(() => useProjects())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => {
      const res = await result.current.create({ name: '新项目' } as any)
      expect(res.success).toBe(true)
    })
  })

  it('创建项目失败', async () => {
    ea.createProject = vi.fn().mockResolvedValue({ success: false, error: '创建失败' })
    const { useProjects } = await import('@/hooks/useProjects')
    const { result } = renderHook(() => useProjects())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => {
      const res = await result.current.create({ name: '新项目' } as any)
      expect(res.success).toBe(false)
    })
    expect(result.current.error).toBe('创建失败')
  })

  it('更新项目成功并同步 selectedItem', async () => {
    const { useProjects } = await import('@/hooks/useProjects')
    const { result } = renderHook(() => useProjects())
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => { result.current.setSelectedItem(mockProjects[0]) })
    const updated = { ...mockProjects[0], name: '项目A更新' }
    await act(async () => {
      const res = await result.current.update(updated as any)
      expect(res.success).toBe(true)
    })
    expect(result.current.selectedItem?.name).toBe('项目A更新')
  })

  it('删除项目成功并清除 selectedItem', async () => {
    const { useProjects } = await import('@/hooks/useProjects')
    const { result } = renderHook(() => useProjects())
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => { result.current.setSelectedItem(mockProjects[0]) })
    await act(async () => {
      const res = await result.current.delete(1)
      expect(res.success).toBe(true)
    })
    expect(result.current.selectedItem).toBeNull()
    expect(result.current.data.find((p: any) => p.id === 1)).toBeUndefined()
  })

  it('加载失败设置 error', async () => {
    ea.getProjects = vi.fn().mockResolvedValue({ success: false, error: '网络异常' })
    const { useProjects } = await import('@/hooks/useProjects')
    const { result } = renderHook(() => useProjects())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('网络异常')
  })

  it('clearError 和 refresh', async () => {
    ea.getProjects = vi.fn().mockResolvedValue({ success: false, error: 'err' })
    const { useProjects } = await import('@/hooks/useProjects')
    const { result } = renderHook(() => useProjects())
    await waitFor(() => expect(result.current.error).toBeTruthy())
    act(() => { result.current.clearError() })
    expect(result.current.error).toBeNull()
    // now make refresh work
    ea.getProjects = vi.fn().mockResolvedValue({ success: true, data: mockProjects })
    await act(async () => { await result.current.refresh() })
    expect(result.current.data).toHaveLength(3)
  })
})
