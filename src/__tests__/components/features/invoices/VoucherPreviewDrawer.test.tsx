/**
 * VoucherPreviewDrawer（T5b）测试
 * - 只读预览：展示借/贷分录、科目、金额与借贷合计
 * - 服务端错误（科目无命中/不平）原样展示，不伪造分录
 * - 发票类型 → 模板 code 映射
 */
import React from 'react'
import { render, screen, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'

const hookState: { mutate: ReturnType<typeof vi.fn>; data?: any; error?: any; isPending?: boolean } = {
  mutate: vi.fn(),
  isPending: false,
}

vi.mock('@/hooks/data/useVoucherPreview', () => ({
  useVoucherPreview: () => hookState,
}))

vi.mock('@/components/ui/Drawer', () => ({
  Drawer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

import { VoucherPreviewDrawer, voucherTemplateCodeFor } from '@/components/features/invoices/VoucherPreviewDrawer'

const invoice = {
  id: 12,
  type: 'invoice_out',
  invoiceNo: 'INV-012',
  name: '测试发票',
} as any

function renderDrawer() {
  return render(<VoucherPreviewDrawer invoice={invoice} onClose={vi.fn()} />)
}

afterEach(() => {
  cleanup()
  hookState.mutate.mockClear()
  hookState.data = undefined
  hookState.error = undefined
  hookState.isPending = false
})

describe('VoucherPreviewDrawer（T5b）', () => {
  test('渲染借贷分录与合计', () => {
    hookState.data = {
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
