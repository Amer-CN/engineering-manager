/**
 * useMembers Hook 测试
 * 测试人员管理 CRUD + 筛选
 */
import { renderHook, act, waitFor } from '@testing-library/react'

const mockMembers: any[] = [
  { id: 1, name: '张三', memberType: 'staff', workerType: 'management', status: 'active', phone: '13800000001', idCard: '510000199001011234', projectId: 10, teamId: 100, createdAt: '2024-01-01' },
  { id: 2, name: '李四', memberType: 'worker', workerType: 'electrician', status: 'active', phone: '13800000002', idCard: '510000199002021234', projectId: 20, teamId: 200, createdAt: '2024-01-02' },
  { id: 3, name: '王五', memberType: 'worker', workerType: 'plumber', status: 'left', phone: '13800000003', idCard: '510000199003031234', projectId: 10, teamId: 100, createdAt: '2024-01-03' },
]

describe('useMembers', () => {
  let ea: Record<string, any>

  beforeEach(() => {
    vi.clearAllMocks()
    ea = window.electronAPI as Record<string, any>
    ea.getMembers = vi.fn().mockResolvedValue({ success: true, data: mockMembers })
    ea.createMember = vi.fn().mockResolvedValue({ success: true, data: { id: 4 } })
    ea.updateMember = vi.fn().mockResolvedValue({ success: true })
    ea.deleteMember = vi.fn().mockResolvedValue({ success: true })
  })

  it('挂载时自动加载数据', async () => {
    const { useMembers } = await import('@/hooks/useMembers')
    const { result } = renderHook(() => useMembers())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toHaveLength(3)
    expect(ea.getMembers).toHaveBeenCalled()
  })

  it('按 type 筛选', async () => {
    const { useMembers } = await import('@/hooks/useMembers')
    const { result } = renderHook(() => useMembers({ type: 'staff' }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toHaveLength(1)
    expect(result.current.data[0].name).toBe('张三')
  })

  it('创建成员成功并添加进列表', async () => {
    const { useMembers } = await import('@/hooks/useMembers')
    const { result } = renderHook(() => useMembers())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => {
      const res = await result.current.create({ name: '赵六', memberType: 'staff', workerType: 'management', status: 'active', phone: '13800000004', idCard: '510000199004041234' } as any)
      expect(res.success).toBe(true)
    })
    expect(ea.createMember).toHaveBeenCalled()
  })

  it('创建失败设置 error', async () => {
    ea.createMember = vi.fn().mockResolvedValue({ success: false, error: '创建失败' })
    const { useMembers } = await import('@/hooks/useMembers')
    const { result } = renderHook(() => useMembers())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => {
      const res = await result.current.create({ name: '赵六', memberType: 'staff', workerType: 'management', status: 'active', phone: '13800000004', idCard: '510000199004041234' } as any)
      expect(res.success).toBe(false)
    })
    expect(result.current.error).toBe('创建失败')
  })

  it('更新成员成功并同步 selectedItem', async () => {
    const { useMembers } = await import('@/hooks/useMembers')
    const { result } = renderHook(() => useMembers())
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => { result.current.setSelectedItem(mockMembers[0]) })
    const updated = { ...mockMembers[0], name: '张三丰' }
    await act(async () => {
      const res = await result.current.update(updated)
      expect(res.success).toBe(true)
    })
    expect(result.current.selectedItem?.name).toBe('张三丰')
  })

  it('删除成员成功并清除 selectedItem', async () => {
    const { useMembers } = await import('@/hooks/useMembers')
    const { result } = renderHook(() => useMembers())
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => { result.current.setSelectedItem(mockMembers[0]) })
    await act(async () => {
      const res = await result.current.delete(1)
      expect(res.success).toBe(true)
    })
    expect(result.current.data.find(m => m.id === 1)).toBeUndefined()
    expect(result.current.selectedItem).toBeNull()
  })
})
