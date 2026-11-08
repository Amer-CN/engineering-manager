/**
 * VoucherDetailDrawer（T6d）测试
 * - 草稿：渲染凭证号/状态/日期/期间/模板/来源与分录（行号、方向、科目、摘要、金额）
 * - 已过账：显示过账时间/过账人，提示分录只读
 * - 借贷合计按方向求和；不平衡时给出警告
 * - 无分录时显示空态；voucher=null 时不渲染
 */
import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'

vi.mock('@/components/ui/Drawer', () => ({
  Drawer: ({ children, footer, title }: { children: React.ReactNode; footer?: React.ReactNode; title: React.ReactNode }) => (
    <div>
      <h2>{title}</h2>
      {children}
      {footer}
    </div>
  ),
}))

import { VoucherDetailDrawer } from '@/components/features/invoices/VoucherDetailDrawer'

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
  entries: [
    { lineNo: 1, dc: 1, accountCode: '1122', accountName: '应收账款', summary: '测试发票', amount: 1060 },
    { lineNo: 2, dc: -1, accountCode: '6001', accountName: '主营业务收入', summary: '测试发票', amount: 1000 },
    { lineNo: 3, dc: -1, accountCode: '22210105', accountName: '应交税费-销项', summary: '销项税额', amount: 60 },
  ],
} as any

const postedVoucher = {
  ...draftVoucher,
  id: 12,
  voucherNo: '记-202605-0002',
  status: 'posted',
  postedAt: '2026-05-19 10:00:00',
  postedBy: '1',
} as any

afterEach(() => {
  cleanup()
})

describe('VoucherDetailDrawer（T6d）', () => {
  test('草稿：渲染凭证信息与全部分录', () => {
    render(<VoucherDetailDrawer voucher={draftVoucher} onClose={vi.fn()} />)

    expect(screen.getByText('凭证详情 - 记-202605-0001')).toBeTruthy()
    expect(screen.getByText('草稿')).toBeTruthy()
    expect(screen.getByText('2026-05-18')).toBeTruthy()
    expect(screen.getByText('2026-05')).toBeTruthy()
    expect(screen.getByText('INV_REVENUE')).toBeTruthy()
    expect(screen.getByText(/#5/)).toBeTruthy()

    // 分录：行号、方向、科目、摘要、金额
    expect(screen.getByText('1122')).toBeTruthy()
    expect(screen.getByText('应收账款')).toBeTruthy()
    expect(screen.getByText('6001')).toBeTruthy()
    expect(screen.getByText('主营业务收入')).toBeTruthy()
    expect(screen.getByText('22210105')).toBeTruthy()
    expect(screen.getByText('销项税额')).toBeTruthy()
    expect(screen.getByText('1')).toBeTruthy()
    expect(screen.getByText('2')).toBeTruthy()
    expect(screen.getByText('3')).toBeTruthy()
    expect(screen.getAllByText('借').length).toBe(1)
    expect(screen.getAllByText('贷').length).toBe(2)

    // 合计：借 1060 / 贷 1060
    expect(screen.getAllByText(/1,060/).length).toBeGreaterThanOrEqual(2)
    expect(screen.queryByText(/借贷不平衡/)).toBeNull()
    expect(screen.getByText(/草稿凭证：确认借贷无误后可回到列表过账/)).toBeTruthy()
  })

  test('已过账：显示过账时间与过账人，提示分录只读', () => {
    render(<VoucherDetailDrawer voucher={postedVoucher} onClose={vi.fn()} />)

    expect(screen.getByText('已过账')).toBeTruthy()
    expect(screen.getByText('2026-05-19 10:00:00')).toBeTruthy()
    expect(screen.getAllByText('1').length).toBeGreaterThan(0)
    expect(screen.getByText(/该凭证已过账，分录只读，不可修改或删除/)).toBeTruthy()
    expect(screen.queryByText('草稿')).toBeNull()
  })

  test('无分录：显示空态', () => {
    render(<VoucherDetailDrawer voucher={{ ...draftVoucher, entries: [] }} onClose={vi.fn()} />)

    expect(screen.getByText('该凭证暂无分录明细')).toBeTruthy()
    expect(screen.queryByText(/借方合计/)).toBeNull()
  })

  test('借贷不平衡：给出警告', () => {
    const unbalanced = {
      ...draftVoucher,
      entries: [{ lineNo: 1, dc: 1, accountCode: '1122', accountName: '应收账款', summary: '测试', amount: 1060 }],
    }
    render(<VoucherDetailDrawer voucher={unbalanced} onClose={vi.fn()} />)

    expect(screen.getByText(/借贷不平衡/)).toBeTruthy()
  })

  test('voucher 为 null：不渲染任何内容', () => {
    const { container } = render(<VoucherDetailDrawer voucher={null} onClose={vi.fn()} />)
    expect(container.textContent).toBe('')
  })

  test('关闭按钮触发 onClose', () => {
    const onClose = vi.fn()
    render(<VoucherDetailDrawer voucher={draftVoucher} onClose={onClose} />)
    const buttons = screen.getAllByRole('button')
    buttons[0].click()
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})