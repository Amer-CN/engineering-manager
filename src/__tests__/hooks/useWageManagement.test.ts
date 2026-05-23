import { renderHook, act, waitFor } from '@testing-library/react'
import { useWageManagement } from '@/hooks/useWageManagement'

describe('useWageManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(window.electronAPI as any).getProjects = vi.fn().mockResolvedValue({ success: true, data: [{ id: 1, name: '项目A', status: 'in_progress' }] })
    ;(window.electronAPI as any).getWorkerTeams = vi.fn().mockResolvedValue({ success: true, data: [] })
    ;(window.electronAPI as any).getAttendances = vi.fn().mockResolvedValue({ success: true, data: [] })
    ;(window.electronAPI as any).getWages = vi.fn().mockResolvedValue({ success: true, data: [] })
    ;(window.electronAPI as any).getProjectWorkers = vi.fn().mockResolvedValue({ success: true, data: [] })
    ;(window.electronAPI as any).getWorkers = vi.fn().mockResolvedValue({ success: true, data: [] })
    ;(window.electronAPI as any).getWageOverdueStats = vi.fn().mockResolvedValue({ success: true, data: null })
  })

  test('初始视图应为 dashboard', async () => {
    const { result } = renderHook(() => useWageManagement())
    // 等待 useEffect 完成（加载项目列表）
    await waitFor(() => {
      expect(result.current.view).toBe('dashboard')
    })
  })

  test('初始应加载项目列表', async () => {
    const { result } = renderHook(() => useWageManagement())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.projects).toEqual([{ id: 1, name: '项目A', status: 'in_progress' }])
  })

  test('setView 应切换视图', async () => {
    const { result } = renderHook(() => useWageManagement())
    await waitFor(() => {
      act(() => { result.current.setView('cycle') })
      expect(result.current.view).toBe('cycle')
    })
  })

  test('setSelectedMonth 应更新月份', async () => {
    const { result } = renderHook(() => useWageManagement())
    await waitFor(() => {
      act(() => { result.current.setSelectedMonth('2026-02') })
      expect(result.current.selectedMonth).toBe('2026-02')
    })
  })

  test('selectedProject 为 null 时考勤和工资应为空', async () => {
    const { result } = renderHook(() => useWageManagement())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.attendances).toEqual([])
    expect(result.current.wageRecords).toEqual([])
  })

  test('setSelectedProject 后应加载考勤和工资数据', async () => {
    ;(window.electronAPI as any).getAttendances.mockResolvedValue({ success: true, data: [{ id: 1 }] })
    ;(window.electronAPI as any).getWages.mockResolvedValue({ success: true, data: [{ id: 1 }] })

    const { result } = renderHook(() => useWageManagement())
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => {
      result.current.setSelectedProject({ id: 1, name: '项目A', status: 'in_progress' } as any)
    })

    // wait for effects
    await waitFor(() => {
      expect((window.electronAPI as any).getAttendances).toHaveBeenCalled()
    })
  })

  test('paymentEdits 应初始为空 Map', async () => {
    const { result } = renderHook(() => useWageManagement())
    await waitFor(() => {
      expect(result.current.paymentEdits).toBeInstanceOf(Map)
      expect(result.current.paymentEdits.size).toBe(0)
    })
  })

  test('selectedAttendanceIds 应初始为空 Set', async () => {
    const { result } = renderHook(() => useWageManagement())
    await waitFor(() => {
      expect(result.current.selectedAttendanceIds).toBeInstanceOf(Set)
      expect(result.current.selectedAttendanceIds.size).toBe(0)
    })
  })

  test('initial selectedMonth should be current month', async () => {
    const { result } = renderHook(() => useWageManagement())
    const now = new Date()
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    await waitFor(() => {
      expect(result.current.selectedMonth).toBe(expected)
    })
  })
})
