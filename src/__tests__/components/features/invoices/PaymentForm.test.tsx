/**
 * PaymentForm 核销金额分配测试（T4b）
 * - 选中发票默认金额 = 剩余可核销额
 * - 用户可改，合计提示随输入变化
 * - X > Y / X <= 0 时红色提示并禁用提交
 * - 不静默覆盖用户已输入的金额
 */
import React from 'react'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { PaymentForm, type PaymentFormData } from '@/components/features/invoices/PaymentForm'

vi.mock('@/hooks/useBankReceiptOCR', () => ({
  useBankReceiptOCR: () => ({ processBankReceiptFile: vi.fn() }),
}))

vi.mock('@/components/features/invoices/PaymentFileUpload', () => ({
  PaymentFileUpload: () => <div data-testid="payment-file-upload" />,
}))

const initialData: PaymentFormData = {
  type: 'invoice_in',
  amount: 0,
  recordDate: '2026-10-01',
  projectId: '',
  partnerId: '',
  contractId: '',
  remarks: '',
  invoiceDetails: [],
  fileUrl: '',
  fileType: '',
}

function makeInvoice(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    type: 'invoice_in',
    status: 'issued',
    invoiceNo: 'INV-001',
    name: '测试发票',
    amount: 1000,
    receivedAmount: 400,
    allocatedAmount: 250,
    taxRate: 0.06,
    ...overrides,
  } as any
}

function renderForm(invoices: any[], initial: Partial<PaymentFormData> = {}) {
  return render(
    <PaymentForm
      initialData={{ ...initialData, ...initial }}
      projects={[]}
      partners={[]}
      contracts={{ income: [], expense: [] }}
      invoices={invoices}
      onSubmit={vi.fn()}
      onCancel={vi.fn()}
    />
  )
}

function selectInvoice(invoiceNo: string) {
  fireEvent.click(screen.getByText(invoiceNo))
}

function allocationInput(invoiceNo: string) {
  return screen.getByLabelText(`核销金额 ${invoiceNo}`) as HTMLInputElement
}

function paymentAmountInput() {
  return screen.getByRole('spinbutton', { name: /本次付款金额/ }) as HTMLInputElement
}

afterEach(cleanup)

describe('PaymentForm 核销金额分配（T4b）', () => {
  test('选中发票后默认金额 = 剩余可核销额（优先 allocatedAmount）', () => {
    renderForm([makeInvoice()])
    selectInvoice('INV-001')

    expect(allocationInput('INV-001').value).toBe('750')
  })

  test('后端无核销返回 allocatedAmount=0 时回退 receivedAmount 计算默认值', () => {
    // 真实 API 用 COALESCE(...,0) 返回 0（不是 undefined），这里按真实形状覆盖
    renderForm([makeInvoice({ allocatedAmount: 0, receivedAmount: 400 })])
    selectInvoice('INV-001')

    expect(allocationInput('INV-001').value).toBe('600')
  })

  test('金额可改，合计提示随输入变化，超付款金额时提示并禁用提交', () => {
    renderForm([makeInvoice()])
    selectInvoice('INV-001')

    const alloc = allocationInput('INV-001')
    fireEvent.change(alloc, { target: { value: '300' } })

    expect(alloc.value).toBe('300')
    expect(screen.getByText('已分配 ¥300 / 付款金额 ¥0')).toBeTruthy()
    expect(screen.getByText('核销合计不得超过付款金额')).toBeTruthy()
    expect(screen.getByRole('button', { name: '登记' })).toBeDisabled()

    fireEvent.change(paymentAmountInput(), { target: { value: '500' } })

    expect(screen.getByText('已分配 ¥300 / 付款金额 ¥500')).toBeTruthy()
    expect(screen.queryByText('核销合计不得超过付款金额')).toBeNull()
    expect(screen.getByRole('button', { name: '登记' })).not.toBeDisabled()
  })

  test('核销金额 <= 0 时提示「请填写核销金额」并禁用提交', () => {
    renderForm([makeInvoice()])
    selectInvoice('INV-001')

    fireEvent.change(allocationInput('INV-001'), { target: { value: '0' } })

    expect(screen.getByText('请填写核销金额')).toBeTruthy()
    expect(screen.getByRole('button', { name: '登记' })).toBeDisabled()
  })

  test('再选其它发票不会覆盖已手改的金额', () => {
    renderForm([
      makeInvoice({ id: 1, invoiceNo: 'INV-001' }),
      makeInvoice({ id: 2, invoiceNo: 'INV-002', amount: 500, allocatedAmount: 0, receivedAmount: 0 }),
    ])

    selectInvoice('INV-001')
    fireEvent.change(allocationInput('INV-001'), { target: { value: '123.45' } })
    selectInvoice('INV-002')

    expect(allocationInput('INV-001').value).toBe('123.45')
    expect(allocationInput('INV-002').value).toBe('500')
  })

  test('提交时把用户填写的 invoiceDetails 原样交给 onSubmit', () => {
    const onSubmit = vi.fn()
    render(
      <PaymentForm
        initialData={{ ...initialData }}
        projects={[]}
        partners={[]}
        contracts={{ income: [], expense: [] }}
        invoices={[makeInvoice()]}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />
    )
    selectInvoice('INV-001')
    fireEvent.change(paymentAmountInput(), { target: { value: '1000' } })
    fireEvent.change(allocationInput('INV-001'), { target: { value: '300' } })

    fireEvent.submit(document.getElementById('payment-form')!)

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0][0].invoiceDetails).toEqual([{ invoiceId: 1, paymentAmount: 300 }])
  })

  test('取消勾选会移除该发票的核销行', () => {
    renderForm([makeInvoice()])
    selectInvoice('INV-001')
    expect(allocationInput('INV-001')).toBeTruthy()

    selectInvoice('INV-001')

    expect(screen.queryByLabelText('核销金额 INV-001')).toBeNull()
  })

  test('单张发票核销超过剩余可核销额时提示并禁用提交', () => {
    renderForm([makeInvoice({ amount: 1000, allocatedAmount: 250, receivedAmount: 0 })])
    selectInvoice('INV-001')
    fireEvent.change(paymentAmountInput(), { target: { value: '2000' } })
    fireEvent.change(allocationInput('INV-001'), { target: { value: '1500' } })

    expect(screen.getByText(/单张发票核销不得超过其剩余可核销额/)).toBeTruthy()
    expect(screen.getByRole('button', { name: '登记' })).toBeDisabled()
  })

  test('切换关联项目会清空已选发票，避免跨项目核销', () => {
    const { container } = render(
      <PaymentForm
        initialData={{ ...initialData }}
        projects={[{ id: 1, name: '项目A' }, { id: 2, name: '项目B' }] as any}
        partners={[]}
        contracts={{ income: [], expense: [] }}
        invoices={[makeInvoice({ projectId: 1 })]}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    const projectSelect = container.querySelectorAll('select')[1] as HTMLSelectElement
    fireEvent.change(projectSelect, { target: { value: '1' } })
    selectInvoice('INV-001')
    expect(allocationInput('INV-001')).toBeTruthy()

    fireEvent.change(projectSelect, { target: { value: '2' } })

    expect(screen.queryByLabelText('核销金额 INV-001')).toBeNull()
  })
})
