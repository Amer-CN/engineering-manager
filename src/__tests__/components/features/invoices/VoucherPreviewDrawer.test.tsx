/**
 * VoucherPreviewDrawer（T5b/T6a）测试
 * - 只读预览：展示借/贷分录、科目、金额与借贷合计
 * - 服务端错误（科目无命中/不平）原样展示，不伪造分录
 * - 发票类型 → 模板 code 映射
 * - 生成凭证草稿：成功 toast 凭证号并关闭；失败展示服务端 error 且不关闭；无权限不显示按钮
 */
import React from 'react'
import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'

const hookState: { mutate: ReturnType<typeof vi.fn>; data?: any; error?: any; isPending?: boolean } = {
  mutate: vi.fn(),
  isPending: false,
}

const permissionState = { can: true }
const createVoucherDraft = vi.fn()
const showToast = vi.fn()

vi.mock('@/hooks/data/useVoucherPreview', () => ({
  useVoucherPreview: () => hookState,
}))

vi.mock('@/hooks/usePermission', () => ({
  usePermission: () => ({ can: () => permissionState.can }),
}))

vi.mock('@/services/api-adapter', () => ({
  getAPI: async () => ({ createVoucherDraft }),
}))

vi.mock('@/store/toastStore', () => ({
  useToastStore: (selector: (s: { showToast: typeof showToast }) => unknown) =>
    selector({ showToast }),
}))

vi.mock('@/components/ui/Drawer', () => ({
  Drawer: ({ children, footer }: { children: React.ReactNode; footer?: React.ReactNode }) => (
    <div>{children}{footer}</div>
  ),
}))

import { VoucherPreviewDrawer, voucherTemplateCodeFor } from '@/components/features/invoices/VoucherPreviewDrawer'

const invoice = {
  id: 12,
  type: 'invoice_out',
  invoiceNo: 'INV-012',
  name: '测试发票',
} as any

const previewData = {
  templateCode: 'INV_REVENUE',
  invoiceId: 12,
  totalDebit: 1060,
  totalCredit: 1060,
  lines: [
    { lineNo: 1, dc: 1, accountCode: '1122', accountName: '应收账款', summary: '测试发票', amount: 1060 },
    { lineNo: 2, dc: -1, accountCode: '6001', accountName: '主营业务收入', summary: '测试发票', amount: 1000 },
    { lineNo: 3, dc: -1, accountCode: '22210105', accountName: '应交税费-销项', summary: '销项税额', amount: 60 },
  ],
}

function renderDrawer(onClose = vi.fn()) {
  const utils = render(<VoucherPreviewDrawer invoice={invoice} onClose={onClose} />)
  return { onClose, ...utils }
}

afterEach(() => {
  cleanup()
  hookState.mutate.mockClear()
  hookState.data = undefined
  hookState.error = undefined
  hookState.isPending = false
  permissionState.can = true
  createVoucherDraft.mockReset()
  showToast.mockClear()
})

describe('VoucherPreviewDrawer（T5b）', () => {
  test('渲染借贷分录与合计', () => {
    hookState.data = previewData
    renderDrawer()

    expect(screen.getByText('1122')).toBeTruthy()
    expect(screen.getByText('6001')).toBeTruthy()
    expect(screen.getByText('22210105')).toBeTruthy()
    expect(screen.getAllByText('借').length).toBeGreaterThan(0)
    expect(screen.getAllByText('贷').length).toBeGreaterThan(0)
    // formatMoney 不强制两位小数：借方行与合计都可能是 ¥1,060
    expect(screen.getAllByText(/1,060/).length).toBeGreaterThan(0)
  })

  test('服务端错误原样展示，不显示分录', () => {
    const serverMessage = '第 2 行未找到匹配科目（请检查科目规则的 priority/filter）'
    hookState.error = new Error(serverMessage)
    renderDrawer()

    expect(screen.getByText(/无法生成凭证预览/)).toBeTruthy()
    // 服务端原文必须原样到达，不能被泛化成“预览失败”
    expect(screen.getByText(new RegExp(serverMessage.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))).toBeTruthy()
    expect(screen.queryByText('1122')).toBeNull()
  })

  test('计算中显示进行态', () => {
    hookState.isPending = true
    renderDrawer()
    expect(screen.getByText(/正在计算凭证分录/)).toBeTruthy()
  })

  test('发票类型映射模板 code', () => {
    expect(voucherTemplateCodeFor('invoice_out')).toBe('INV_REVENUE')
    expect(voucherTemplateCodeFor('invoice_in')).toBe('INV_COST')
  })

  test('进入时按发票类型与 id 只触发一次预览（重渲染不重复请求）', () => {
    const { rerender } = renderDrawer()
    expect(hookState.mutate).toHaveBeenCalledTimes(1)
    expect(hookState.mutate).toHaveBeenCalledWith({ code: 'INV_REVENUE', invoiceId: 12 })

    rerender(<VoucherPreviewDrawer invoice={invoice} onClose={vi.fn()} />)
    expect(hookState.mutate).toHaveBeenCalledTimes(1)
  })

  test('收票发票走 INV_COST 模板', () => {
    const invoiceIn = { ...invoice, id: 34, type: 'invoice_in', invoiceNo: 'INV-034' }
    render(<VoucherPreviewDrawer invoice={invoiceIn} onClose={vi.fn()} />)
    expect(hookState.mutate).toHaveBeenCalledWith({ code: 'INV_COST', invoiceId: 34 })
  })
})

describe('VoucherPreviewDrawer 生成凭证草稿（T6a）', () => {
  test('成功：按预览模板生成草稿，toast 凭证号并关闭抽屉', async () => {
    hookState.data = previewData
    createVoucherDraft.mockResolvedValue({
      success: true,
      data: { id: 9, voucherNo: '记-202610-0001', totalDebit: 1060, totalCredit: 1060 },
    })
    const { onClose } = renderDrawer()

    fireEvent.click(screen.getByRole('button', { name: '生成凭证草稿' }))

    await waitFor(() => expect(createVoucherDraft).toHaveBeenCalledWith(12, 'INV_REVENUE'))
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('已生成凭证草稿 记-202610-0001', 'success'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  test('失败：展示服务端 error 且不关闭抽屉、不弹成功 toast', async () => {
    hookState.data = previewData
    createVoucherDraft.mockResolvedValue({ success: false, error: '该发票已生成凭证草稿' })
    const { onClose } = renderDrawer()

    fireEvent.click(screen.getByRole('button', { name: '生成凭证草稿' }))

    await screen.findByText(/该发票已生成凭证草稿/)
    expect(onClose).not.toHaveBeenCalled()
    expect(showToast).not.toHaveBeenCalled()
    // 失败时预览仍在，不伪造草稿
    expect(screen.getByText('1122')).toBeTruthy()
  })

  test('无 vouchers:create 权限时不显示生成按钮', () => {
    hookState.data = previewData
    permissionState.can = false
    renderDrawer()
    expect(screen.queryByRole('button', { name: '生成凭证草稿' })).toBeNull()
  })
})
