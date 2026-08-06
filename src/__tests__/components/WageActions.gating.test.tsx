import { renderHook, act, cleanup } from '@testing-library/react'
import React from 'react'

/**
 * G2 B2 前端门控测试：useWageActions 的写 handler 守卫
 * 无 wages:create 码角色触发「生成考勤/生成工资表」→ API 不被调用（守卫拦截 + toast）；
 * 有码角色 → API 正常调用。
 * 门控形式：handler 首行 if (!can(code)) { showToast; return }（useWageActions.ts）。
 */

const { mockCan } = vi.hoisted(() => ({ mockCan: { value: true } }))
vi.mock('@/hooks/usePermission', () => ({
  usePermission: () => ({ can: (code: string) => mockCan.value, canAny: () => mockCan.value }),
}))

const { mockApi } = vi.hoisted(() => ({
  mockApi: {
    getProjectWorkers: vi.fn(),
    generateDefaultAttendancesV2: vi.fn(),
    generateProjectWages: vi.fn(),
    deleteAttendance: vi.fn(),
    batchDeleteAttendances: vi.fn(),
    batchImportAttendances: vi.fn(),
    batchSaveWages: vi.fn(),
    batchDeleteWages: vi.fn(),
    batchSavePayments: vi.fn(),
    batchClearPayments: vi.fn(),
    batchArchiveWages: vi.fn(),
  },
}))
vi.mock('@/services/api-adapter', () => ({
  getAPI: async () => mockApi,
}))

import { useWageActions } from '@/components/features/wages/useWageActions'

const baseDeps = () => ({
  selectedProject: { id: 1, name: '测试项目' } as any,
  selectedMonth: '2026-08',
  workerTeams: [],
  attendances: [],
  wages: [],
  loadData: vi.fn(),
})

describe('useWageActions 门控（wages:create / wages:update / wages:delete）', () => {
  beforeEach(() => {
    mockCan.value = true
    for (const fn of Object.values(mockApi)) fn.mockReset()
    mockApi.getProjectWorkers.mockResolvedValue({ success: true, data: [{ id: 1, status: 'active' }] })
    mockApi.generateDefaultAttendancesV2.mockResolvedValue({ success: true, data: { count: 1 } })
    mockApi.generateProjectWages.mockResolvedValue({ success: true, data: [], newCount: 1 })
  })
  afterEach(cleanup)

  test('无 wages:create 码 → 生成工资表不调用 API', async () => {
    mockCan.value = false
    const { result } = renderHook(() => useWageActions(baseDeps()))

    await act(async () => { await result.current.handleGenerateWages() })

    expect(mockApi.generateProjectWages).not.toHaveBeenCalled()
  })

  test('有 wages:create 码 → 生成工资表调用 API', async () => {
    mockCan.value = true
    const { result } = renderHook(() => useWageActions(baseDeps()))

    await act(async () => { await result.current.handleGenerateWages() })

    expect(mockApi.generateProjectWages).toHaveBeenCalledTimes(1)
  })

  test('无 wages:create 码 → 生成考勤不调用 API', async () => {
    mockCan.value = false
    const { result } = renderHook(() => useWageActions(baseDeps()))

    await act(async () => { await result.current.handleGenerateAttendance() })

    expect(mockApi.generateDefaultAttendancesV2).not.toHaveBeenCalled()
  })

  test('无 wages:update 码 → 保存工资表不调用 API', async () => {
    mockCan.value = false
    const deps = baseDeps()
    deps.wages = [{ id: 1, dailyWage: 200, workDays: 22, bonus: 0, deduction: 0, actualWage: 4400 }] as any
    const { result } = renderHook(() => useWageActions(deps))
    // 造一个编辑态，使 handleSaveWages 走到 API 调用点
    act(() => { result.current.handleBonusDeductionChange(1, 'bonus', 100) })

    await act(async () => { await result.current.handleSaveWages() })

    expect(mockApi.batchSaveWages).not.toHaveBeenCalled()
  })

  test('无 wages:delete 码 → 删除考勤不调用 API', async () => {
    mockCan.value = false
    const { result } = renderHook(() => useWageActions(baseDeps()))
    // confirm 需要 resolve——mock 默认 undefined 会卡住，直接验证守卫层
    // 守卫在 confirm 之前，can=false 时直接 return，不弹 confirm
    await act(async () => { await result.current.handleDeleteAttendance({ id: 1, memberName: '张三' } as any) })

    expect(mockApi.deleteAttendance).not.toHaveBeenCalled()
  })
})
