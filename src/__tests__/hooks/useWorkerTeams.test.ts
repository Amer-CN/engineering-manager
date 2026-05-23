/**
 * useWorkerTeams Hook 测试
 * 测试班组管理 CRUD + useWorkerTransfers
 */
import { renderHook, act, waitFor } from '@testing-library/react'

const mockTeams: any[] = [
  { id: 1, name: '电工班组', projectId: 10, leaderName: '张三', memberCount: 8 },
  { id: 2, name: '水管班组', projectId: 20, leaderName: '李四', memberCount: 5 },
  { id: 3, name: '泥工班组', projectId: 10, leaderName: '王五', memberCount: 12 },
]


describe('useWorkerTeams', () => {
  let ea: Record<string, any>

  beforeEach(() => {
    vi.clearAllMocks()
    ea = window.electronAPI as Record<string, any>
    ea.getWorkerTeams = vi.fn().mockResolvedValue({ success: true, data: mockTeams })
    ea.createWorkerTeam = vi.fn().mockResolvedValue({ success: true, data: { id: 4 } })
    ea.updateWorkerTeam = vi.fn().mockResolvedValue({ success: true })
    ea.deleteWorkerTeam = vi.fn().mockResolvedValue({ success: true })
  })

  it('挂载时自动加载', async () => {
    const { useWorkerTeams } = await import('@/hooks/useWorkerTeams')
    const { result } = renderHook(() => useWorkerTeams())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toHaveLength(3)
  })

  it('按 projectId 筛选', async () => {
    const { useWorkerTeams } = await import('@/hooks/useWorkerTeams')
    const { result } = renderHook(() => useWorkerTeams(10))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toHaveLength(2)
    expect(result.current.data[0].name).toBe('电工班组')
  })

  it('创建班组成功', async () => {
    const { useWorkerTeams } = await import('@/hooks/useWorkerTeams')
    const { result } = renderHook(() => useWorkerTeams())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => {
      const res = await result.current.create({ name: '新班组', projectId: 10, leaderId: 1 } as any)
      expect(res.success).toBe(true)
    })
    expect(ea.createWorkerTeam).toHaveBeenCalled()
  })

  it('创建失败设置 error', async () => {
    ea.createWorkerTeam = vi.fn().mockResolvedValue({ success: false, error: '创建失败' })
    const { useWorkerTeams } = await import('@/hooks/useWorkerTeams')
    const { result } = renderHook(() => useWorkerTeams())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => {
      const res = await result.current.create({ name: '新班组', projectId: 10, leaderId: 1 } as any)
      expect(res.success).toBe(false)
    })
    expect(result.current.error).toBe('创建失败')
  })

  it('更新班组成功并同步 selectedItem', async () => {
    const { useWorkerTeams } = await import('@/hooks/useWorkerTeams')
    const { result } = renderHook(() => useWorkerTeams())
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => { result.current.setSelectedItem(mockTeams[0]) })
    const updated = { ...mockTeams[0], name: '电工班组更新' }
    await act(async () => {
      const res = await result.current.update(updated)
      expect(res.success).toBe(true)
    })
    expect(result.current.selectedItem?.name).toBe('电工班组更新')
  })

  it('删除班组成功并清除 selectedItem', async () => {
    const { useWorkerTeams } = await import('@/hooks/useWorkerTeams')
    const { result } = renderHook(() => useWorkerTeams())
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => { result.current.setSelectedItem(mockTeams[0]) })
    await act(async () => {
      const res = await result.current.delete(1)
      expect(res.success).toBe(true)
    })
    expect(result.current.selectedItem).toBeNull()
  })

  it('加载失败设置 error', async () => {
    ea.getWorkerTeams = vi.fn().mockResolvedValue({ success: false, error: '加载失败' })
    const { useWorkerTeams } = await import('@/hooks/useWorkerTeams')
    const { result } = renderHook(() => useWorkerTeams())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('加载失败')
  })
})
