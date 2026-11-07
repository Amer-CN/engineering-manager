/**
 * VoucherListPanel（T6c）测试
 * - 渲染草稿/已过账凭证与借贷合计
 * - 已过账行只读：不显示过账/删除按钮，显示 postedAt
 * - 过账：二次确认 → postVoucher(id) → 成功 toast；失败展示后端 error
 * - 删除：确认 → deleteVoucher(id) → toast
 * - 无 vouchers:approve / vouchers:delete 权限时隐藏按钮
 */
import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'

const vouchersState: { data?: any[]; isLoading?: boolean; error?: any } = {}
const summaryState: { data?: any } = {}
const openingState: { data?: any } = {}
const periodLocksState: { data?: any[] } = {}
const postMutate = vi.fn()
const unpostMutate = vi.fn()
const deleteMutate = vi.fn()
const saveOpeningMutate = vi.fn()
const lockMutate = vi.fn()
const unlockMutate = vi.fn()
const permission = { allowed: new Set(['vouchers:approve', 'vouchers:delete']), isAdmin: true }
const confirmMock = vi.fn(async (..._args: any[]) => true)
const showToast = vi.fn()
const exportCsv = vi.fn()
const printList = vi.fn()

vi.mock('@/components/features/invoices/voucherPrintExport', () => ({
  exportVoucherCsv: (...args: any[]) => exportCsv(...args),
  printVoucherList: (...args: any[]) => printList(...args),
}))

vi.mock('@/hooks/data/useVouchers', () => ({
  useVouchers: () => ({
    data: vouchersState.data,
    isLoading: vouchersState.isLoading ?? false,
    error: vouchersState.error,
  }),
  useVoucherSummary: () => ({ data: summaryState.data }),
  usePostVoucher: () => ({ mutateAsync: postMutate, isPending: false }),
  useUnpostVoucher: () => ({ mutateAsync: unpostMutate, isPending: false }),
  useDeleteVoucher: () => ({ mutateAsync: deleteMutate, isPending: false }),
  useOpeningBalances: () => ({ data: openingState.data }),
  useSaveOpeningBalances: () => ({ mutateAsync: saveOpeningMutate, isPending: false }),
  usePeriodLocks: () => ({ data: periodLocksState.data ?? [] }),
  useLockPeriod: () => ({ mutateAsync: lockMutate, isPending: false }),
  useUnlockPeriod: () => ({ mutateAsync: unlockMutate, isPending: false }),
}))

vi.mock('@/components/ui/Drawer', () => ({
  Drawer: ({ open, title, children, footer }: { open: boolean; title: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode }) =>
    open ? <div><h2>{title}</h2>{children}{footer}</div> : null,
}))

vi.mock('@/hooks/usePermission', () => ({
  usePermission: () => ({
    can: (code: string) => permission.allowed.has(code),
    isAdmin: () => permission.isAdmin,
  }),
}))

vi.mock('@/hooks/useConfirm', () => ({
  useConfirm: () => ({ confirm: confirmMock, ConfirmDialog: null }),
}))

vi.mock('@/store/toastStore', () => ({
  useToastStore: (selector: (s: { showToast: typeof showToast }) => unknown) => selector({ showToast }),
}))

import { VoucherListPanel } from '@/components/features/invoices/VoucherListPanel'

const draftVoucher = {
  id: 11,
  voucherNo: '记-202605-0001',
  voucherDate: '2026-05-18',
  period: '202605',
  sourceType: 'invoice',
  sourceId: 5,
  templateCode: 'INV_REVENUE',
  status: 'draft',
  postedAt: null,
  postedBy: null,
  totalDebit: 1060,
  totalCredit: 1060,
  entries: [{}, {}, {}],
}

const postedVoucher = {
  ...draftVoucher,
  id: 12,
  voucherNo: '记-202605-0002',
  status: 'posted',
  postedAt: '2026-05-19 10:00:00',
  postedBy: '1',
}

afterEach(() => {
  cleanup()
  vouchersState.data = undefined
  vouchersState.isLoading = false
  vouchersState.error = undefined
  summaryState.data = undefined
  openingState.data = undefined
  periodLocksState.data = undefined
  saveOpeningMutate.mockReset()
  lockMutate.mockReset()
  unlockMutate.mockReset()
  permission.isAdmin = true
  postMutate.mockReset()
  unpostMutate.mockReset()
  deleteMutate.mockReset()
  confirmMock.mockClear()
  confirmMock.mockImplementation(async (..._args: any[]) => true)
  showToast.mockClear()
  exportCsv.mockClear()
  printList.mockClear()
  permission.allowed = new Set(['vouchers:approve', 'vouchers:delete'])
})

describe('VoucherListPanel（T6c）', () => {
  test('渲染草稿与已过账凭证、状态与借贷合计', () => {
    vouchersState.data = [draftVoucher, postedVoucher]
    render(<VoucherListPanel />)

    expect(screen.getByText('记-202605-0001')).toBeTruthy()
    expect(screen.getByText('记-202605-0002')).toBeTruthy()
    expect(screen.getByText('草稿')).toBeTruthy()
    expect(screen.getByText('已过账')).toBeTruthy()
    expect(screen.getAllByText(/1,060/).length).toBeGreaterThan(0)
    expect(screen.getAllByText('3 行').length).toBe(2)
  })

  test('已过账行只读：不显示过账按钮，显示过账时间', () => {
    vouchersState.data = [postedVoucher]
    render(<VoucherListPanel />)

    expect(screen.queryByRole('button', { name: '过账' })).toBeNull()
    expect(screen.queryByRole('button', { name: '删除' })).toBeNull()
    expect(screen.getByText('2026-05-19 10:00:00')).toBeTruthy()
  })

  test('过账：二次确认后调用 postVoucher 并 toast 凭证号', async () => {
    vouchersState.data = [draftVoucher]
    postMutate.mockResolvedValue({ id: 11, voucherNo: '记-202605-0001', status: 'posted', postedAt: '2026-05-19 10:00:00' })
    render(<VoucherListPanel />)

    fireEvent.click(screen.getByRole('button', { name: '过账' }))

    await waitFor(() => expect(postMutate).toHaveBeenCalledWith(11))
    expect(confirmMock).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('已过账 记-202605-0001', 'success'))
  })

  test('过账失败：toast 后端 error 原文，不伪造成功', async () => {
    vouchersState.data = [draftVoucher]
    postMutate.mockRejectedValue(new Error('仅草稿凭证可过账'))
    render(<VoucherListPanel />)

    fireEvent.click(screen.getByRole('button', { name: '过账' }))

    await waitFor(() => expect(showToast).toHaveBeenCalledWith('仅草稿凭证可过账', 'error'))
  })

  test('取消确认：不调用过账', async () => {
    vouchersState.data = [draftVoucher]
    confirmMock.mockResolvedValueOnce(false)
    render(<VoucherListPanel />)

    fireEvent.click(screen.getByRole('button', { name: '过账' }))

    await waitFor(() => expect(confirmMock).toHaveBeenCalledTimes(1))
    expect(postMutate).not.toHaveBeenCalled()
  })

  test('删除草稿：确认后调用 deleteVoucher 并 toast', async () => {
    vouchersState.data = [draftVoucher]
    deleteMutate.mockResolvedValue(11)
    render(<VoucherListPanel />)

    fireEvent.click(screen.getByRole('button', { name: '删除' }))

    await waitFor(() => expect(deleteMutate).toHaveBeenCalledWith(11))
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('已删除 记-202605-0001', 'success'))
  })

  test('无 vouchers:approve / vouchers:delete 权限时隐藏按钮', () => {
    permission.allowed = new Set(['vouchers:read'])
    vouchersState.data = [draftVoucher]
    render(<VoucherListPanel />)

    expect(screen.queryByRole('button', { name: '过账' })).toBeNull()
    expect(screen.queryByRole('button', { name: '删除' })).toBeNull()
  })

  test('加载失败展示错误原文', () => {
    vouchersState.data = []
    vouchersState.error = new Error('数据库连接失败')
    render(<VoucherListPanel />)

    expect(screen.getByText(/获取凭证失败：数据库连接失败/)).toBeTruthy()
  })

  test('汇总条展示张数与借贷合计；不平衡时给警告', () => {
    vouchersState.data = [draftVoucher, postedVoucher]
    summaryState.data = {
      period: '202605', totalCount: 2, draftCount: 1, postedCount: 1,
      totalDebit: 3180, totalCredit: 3180, balanced: true,
    }
    const { rerender } = render(<VoucherListPanel />)

    expect(screen.getAllByText(/3,180/).length).toBeGreaterThanOrEqual(2)
    expect(screen.queryByText('借贷不平衡')).toBeNull()

    summaryState.data = { ...summaryState.data, balanced: false }
    rerender(<VoucherListPanel />)
    expect(screen.getByText('借贷不平衡')).toBeTruthy()
  })

  test('反过账：填写原因后调用 unpost 并 toast', async () => {
    vouchersState.data = [postedVoucher]
    unpostMutate.mockResolvedValue({ id: 12, voucherNo: '记-202605-0002', status: 'draft' })
    render(<VoucherListPanel />)

    fireEvent.click(screen.getByRole('button', { name: '反过账' }))
    expect(screen.getByText('反过账 - 记-202605-0002')).toBeTruthy()

    const confirmBtn = screen.getByRole('button', { name: '确认反过账' }) as HTMLButtonElement
    expect(confirmBtn.disabled).toBe(true)

    fireEvent.change(screen.getByPlaceholderText(/反过账原因/), { target: { value: '发票信息有误' } })
    fireEvent.click(confirmBtn)

    await waitFor(() => expect(unpostMutate).toHaveBeenCalledWith({ id: 12, reason: '发票信息有误' }))
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('已反过账 记-202605-0002', 'success'))
  })

  test('无 vouchers:approve 权限时不显示反过账', () => {
    permission.allowed = new Set(['vouchers:read'])
    vouchersState.data = [postedVoucher]
    render(<VoucherListPanel />)

    expect(screen.queryByRole('button', { name: '反过账' })).toBeNull()
  })

  test('期初余额：展示已有科目，平衡时可保存并调用接口', async () => {
    const now = new Date()
    const expectedPeriod = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
    vouchersState.data = []
    openingState.data = {
      period: expectedPeriod,
      rows: [
        { accountCode: '1001', accountName: '库存现金', debit: 100, credit: 0 },
        { accountCode: '2001', accountName: '短期借款', debit: 0, credit: 100 },
      ],
      totalDebit: 100, totalCredit: 100, balanced: true,
    }
    saveOpeningMutate.mockResolvedValue(openingState.data)
    render(<VoucherListPanel />)

    fireEvent.click(screen.getByRole('button', { name: '期初余额' }))
    await waitFor(() => expect(screen.getByDisplayValue('1001')).toBeTruthy())

    const saveBtn = screen.getByRole('button', { name: '保存期初余额' }) as HTMLButtonElement
    expect(saveBtn.disabled).toBe(false)
    fireEvent.click(saveBtn)

    await waitFor(() => expect(saveOpeningMutate).toHaveBeenCalledTimes(1))
    const payload = saveOpeningMutate.mock.calls[0][0]
    expect(payload.period).toBe(expectedPeriod)
    expect(payload.rows).toHaveLength(2)
    await waitFor(() => expect(showToast).toHaveBeenCalled())
  })

  test('期初余额：借贷不平衡时保存禁用并提示', async () => {
    vouchersState.data = []
    openingState.data = {
      period: '202611',
      rows: [
        { accountCode: '1001', accountName: '库存现金', debit: 100, credit: 0 },
        { accountCode: '2001', accountName: '短期借款', debit: 0, credit: 90 },
      ],
      totalDebit: 100, totalCredit: 90, balanced: false,
    }
    render(<VoucherListPanel />)

    fireEvent.click(screen.getByRole('button', { name: '期初余额' }))
    await screen.findByText('借贷不平衡')
    const saveBtn = screen.getByRole('button', { name: '保存期初余额' }) as HTMLButtonElement
    expect(saveBtn.disabled).toBe(true)
  })

  test('期初余额：可添加与删除科目行', async () => {
    vouchersState.data = []
    openingState.data = { period: '202611', rows: [], totalDebit: 0, totalCredit: 0, balanced: true }
    render(<VoucherListPanel />)

    fireEvent.click(screen.getByRole('button', { name: '期初余额' }))
    await screen.findByText(/暂无期初余额/)
    fireEvent.click(screen.getByRole('button', { name: '+ 添加科目' }))
    expect(screen.getByPlaceholderText('1001')).toBeTruthy()

    fireEvent.change(screen.getByPlaceholderText('1001'), { target: { value: '1001' } })
    fireEvent.click(screen.getByRole('button', { name: '删除' }))
    expect(screen.queryByPlaceholderText('1001')).toBeNull()
  })

  test('无 vouchers:approve 权限时不显示期初余额', () => {
    permission.allowed = new Set(['vouchers:read'])
    vouchersState.data = []
    render(<VoucherListPanel />)
    expect(screen.queryByRole('button', { name: '期初余额' })).toBeNull()
  })

  test('期间锁定：当前期间锁定时显示徽标/解锁按钮，期初余额禁用', async () => {
    const now = new Date()
    const currentPeriod = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
    permission.isAdmin = true
    vouchersState.data = []
    periodLocksState.data = [{ period: currentPeriod, lockedAt: '2026-11-08 00:00:00', lockedBy: '1', reason: '月结' }]
    unlockMutate.mockResolvedValue({ period: currentPeriod, locked: false })
    render(<VoucherListPanel />)

    expect(screen.getByText('期间已锁定')).toBeTruthy()
    expect(screen.getByRole('button', { name: '解锁期间' })).toBeTruthy()
    expect((screen.getByRole('button', { name: '期初余额' }) as HTMLButtonElement).disabled).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: '解锁期间' }))
    await waitFor(() => expect(unlockMutate).toHaveBeenCalledWith({ period: currentPeriod }))
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(`已解锁期间 ${currentPeriod}`, 'success'))
  })

  test('期间锁定：锁定行的过账/删除按钮禁用', () => {
    vouchersState.data = [draftVoucher]
    periodLocksState.data = [{ period: '202605', lockedAt: '2026-11-08 00:00:00', lockedBy: '1', reason: '月结' }]
    render(<VoucherListPanel />)

    expect((screen.getByRole('button', { name: '过账' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: '删除' }) as HTMLButtonElement).disabled).toBe(true)
  })

  test('非管理员不显示锁定/解锁按钮', () => {
    permission.isAdmin = false
    vouchersState.data = []
    render(<VoucherListPanel />)
    expect(screen.queryByRole('button', { name: '锁定期间' })).toBeNull()
    expect(screen.queryByRole('button', { name: '解锁期间' })).toBeNull()
  })

  test('导出 CSV 与打印：按当前筛选结果调用', () => {
    vouchersState.data = [draftVoucher, postedVoucher]
    render(<VoucherListPanel />)

    fireEvent.click(screen.getByRole('button', { name: '导出 CSV' }))
    expect(exportCsv).toHaveBeenCalledTimes(1)
    expect((exportCsv.mock.calls[0][0] as unknown[]).length).toBe(2)

    fireEvent.click(screen.getByRole('button', { name: '打印' }))
    expect(printList).toHaveBeenCalledTimes(1)
    expect((printList.mock.calls[0][0] as unknown[]).length).toBe(2)
  })
})