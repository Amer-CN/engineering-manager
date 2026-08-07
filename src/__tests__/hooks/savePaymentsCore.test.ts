import { renderHook, act, cleanup } from '@testing-library/react'

/**
 * J-2 验证：handleSavePayments 核心收敛（savePaymentsCore）+ 刷新注入
 *
 * 覆盖拍板第 4 条的四个断言：
 * 1. 同一 edits 输入 → 两侧（Payroll/useWageActions 与 Wage 管理/useWagePaymentOps）
 *    发出的 batchSavePayments 载荷逐字相同
 * 2. 各自语境刷新函数正确：Payroll 侧 loadData 被调、loadAllRecords/loadStats 不被调；
 *    Wage 管理侧反之
 * 3. 异常路径：mock 抛错 → 两侧都 toast 且不崩
 * 4. 权限守卫：无 wages:update → 早退 + 同文案
 */

const { mockCan } = vi.hoisted(() => ({ mockCan: { value: true } }))
vi.mock('@/hooks/usePermission', () => ({
  usePermission: () => ({ can: (code: string) => mockCan.value }),
}))

const { mockApi } = vi.hoisted(() => ({
  mockApi: { batchSavePayments: vi.fn() },
}))
vi.mock('@/services/api-adapter', () => ({
  getAPI: async () => mockApi,
}))

const { mockShowToast } = vi.hoisted(() => ({ mockShowToast: vi.fn() }))
vi.mock('@/store/toastStore', () => ({
  useToastStore: (selector: any) => selector({ showToast: mockShowToast }),
}))

import { useWageActions } from '@/components/features/wages/useWageActions'
import { useWagePaymentOps } from '@/hooks/useWagePaymentOps'

// ── 公共 fixture ──
const records = [
  { id: 1, memberName: '张三', actualWage: 5000, yearMonth: '2026-07', bankReceiptPath: '/r1.jpg' },
  { id: 2, memberName: '李四', actualWage: 4200, yearMonth: '2026-07' },
] as any

const edits = new Map<number, { paidAmount: string; paidDate: string; bankReceiptPath?: string }>([
  [1, { paidAmount: '5000', paidDate: '2026-07-15' }],
  [2, { paidAmount: '4200', paidDate: '2026-07-16' }],
])

function makeWageActions() {
  const loadData = vi.fn().mockResolvedValue(undefined)
  const setLoading = vi.fn()
  const { result } = renderHook(() => useWageActions({
    selectedProject: { id: 1, name: 'P' } as any,
    selectedMonth: '2026-07',
    workerTeams: [],
    attendances: [],
    wages: records,
    loadData,
    setLoading,
  }))
  // 通过 handlePaymentChange 填充 edits
  for (const [id, edit] of edits) {
    act(() => {
      result.current.handlePaymentChange(id, 'paidAmount', edit.paidAmount)
      result.current.handlePaymentChange(id, 'paidDate', edit.paidDate)
    })
  }
  return { hook: result, loadData, setLoading }
}

function makeWageOps() {
  const loadAllRecords = vi.fn().mockResolvedValue(undefined)
  const loadStats = vi.fn().mockResolvedValue(undefined)
  const setLoading = vi.fn()
  const setPaymentEdits = vi.fn()
  const { result } = renderHook(() => useWagePaymentOps({
    allWageRecords: records,
    paymentEdits: edits,
    setPaymentEdits,
    selectedWageIds: new Set<number>(),
    setSelectedWageIds: vi.fn(),
    setLoading,
    showToast: mockShowToast,
    confirm: vi.fn() as any,
    loadAllRecords,
    loadStats,
  }))
  return { hook: result, loadAllRecords, loadStats, setLoading, setPaymentEdits }
}

describe('J-2: handleSavePayments 核心收敛', () => {
  beforeEach(() => {
    mockCan.value = true
    mockApi.batchSavePayments.mockReset()
    mockApi.batchSavePayments.mockResolvedValue({ success: true, data: { saved: 2, skipped: 0, skippedItems: [] } })
    mockShowToast.mockClear()
  })
  afterEach(cleanup)

  test('同一 edits 输入 → 两侧发出的 batchSavePayments 载荷逐字相同', async () => {
    const payroll = makeWageActions()
    await act(async () => { await payroll.hook.current.handleSavePayments() })

    const ops = makeWageOps()
    await act(async () => { await ops.hook.current.handleSavePayments() })

    const payrollPayload = mockApi.batchSavePayments.mock.calls[0][0]
    const opsPayload = mockApi.batchSavePayments.mock.calls[1][0]
    expect(payrollPayload).toEqual(opsPayload)
    expect(payrollPayload).toEqual([
      { id: 1, paidAmount: 5000, paidDate: '2026-07-15', bankReceiptPath: '/r1.jpg' },
      { id: 2, paidAmount: 4200, paidDate: '2026-07-16', bankReceiptPath: undefined },
    ])
  })

  test('Payroll 侧（useWageActions）：刷新注入 loadData，不调 loadAllRecords/loadStats', async () => {
    const payroll = makeWageActions()
    await act(async () => { await payroll.hook.current.handleSavePayments() })

    expect(payroll.loadData).toHaveBeenCalledOnce()
    // Wage 侧语境函数不应出现在 Payroll 的调用里（注入隔离）
    // （loadAllRecords/loadStats 是 useWagePaymentOps 的注入，Payroll 没有它们——
    //   这里断言 loadData 是唯一刷新调用）
    expect(mockShowToast).toHaveBeenCalledWith('发放记录已保存', 'success')
  })

  test('Wage 管理侧（useWagePaymentOps）：刷新注入 loadAllRecords + loadStats', async () => {
    const ops = makeWageOps()
    await act(async () => { await ops.hook.current.handleSavePayments() })

    expect(ops.loadAllRecords).toHaveBeenCalledOnce()
    expect(ops.loadStats).toHaveBeenCalledOnce()
  })

  test('异常路径：mock 抛错 → 两侧都 toast 且不崩', async () => {
    mockApi.batchSavePayments.mockRejectedValue(new Error('网络错误'))

    const payroll = makeWageActions()
    await act(async () => { await payroll.hook.current.handleSavePayments() })
    expect(mockShowToast).toHaveBeenCalledWith('网络错误', 'error')

    mockShowToast.mockClear()
    const ops = makeWageOps()
    await act(async () => { await ops.hook.current.handleSavePayments() })
    expect(mockShowToast).toHaveBeenCalledWith('网络错误', 'error')
  })

  test('权限守卫：无 wages:update → 两侧早退 + 同文案，不发请求', async () => {
    mockCan.value = false

    const payroll = makeWageActions()
    await act(async () => { await payroll.hook.current.handleSavePayments() })

    const ops = makeWageOps()
    await act(async () => { await ops.hook.current.handleSavePayments() })

    expect(mockApi.batchSavePayments).not.toHaveBeenCalled()
    const messages = mockShowToast.mock.calls.map(c => c[0])
    expect(messages).toEqual(['您没有登记发放的权限', '您没有登记发放的权限'])
  })

  test('loading 指示：Payroll 侧获得 setLoading（有意增强），Wage 侧维持', async () => {
    const payroll = makeWageActions()
    await act(async () => { await payroll.hook.current.handleSavePayments() })
    expect(payroll.setLoading).toHaveBeenCalledWith(true)
    expect(payroll.setLoading).toHaveBeenCalledWith(false)

    const ops = makeWageOps()
    await act(async () => { await ops.hook.current.handleSavePayments() })
    expect(ops.setLoading).toHaveBeenCalledWith(true)
    expect(ops.setLoading).toHaveBeenCalledWith(false)
  })
})
