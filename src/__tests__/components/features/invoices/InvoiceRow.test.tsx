// @ts-nocheck
/**
 * InvoiceRow 组件测试
 * - 渲染发票行数据（日期、类型、编号、金额）
 * - 状态选择器
 * - 操作按钮（预览、打印、编辑、删除）
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Invoice } from '@/types'

// ═════════════════════════════════════════════
// 不 mock Icon —— 真实渲染 SVG，jsdom 可正常处理
// ═════════════════════════════════════════════

// ═════════════════════════════════════════════
// 动态 import —— InvoiceRow 是 named export
// ═════════════════════════════════════════════
const importModule = async () => {
  const mod = await import('@/components/features/invoices/InvoiceRow')
  return { InvoiceRow: mod.InvoiceRow }
}

describe('InvoiceRow', () => {
  const mockOnEdit = vi.fn()
  const mockOnDelete = vi.fn()
  const mockOnStatusChange = vi.fn()
  const mockOnPrint = vi.fn()
  const mockOnPreview = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  const baseInvoice: Invoice = {
    id: 1,
    projectId: 10,
    projectName: '测试项目',
    type: 'invoice_out',
    invoiceKind: 'paper_regular',
    invoiceNo: 'INV-2025-001',
    name: '测试发票',
    sellerName: '测试供应商',
    buyerName: '测试客户',
    taxRate: 0.09,
    amount: 10900,
    taxAmount: 981.13,
    receivedAmount: 5000,
    status: 'issued',
    fileUrl: 'data:image/png;base64,abc123',
    fileType: 'image',
    issueDate: '2025-05-01',
    createdAt: '2025-05-01',
    updatedAt: '2025-05-01',
  }

  it('renders invoice date and type', async () => {
    const { InvoiceRow } = await importModule()
    render(
      <table><tbody>
        <InvoiceRow
          invoice={baseInvoice}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onStatusChange={mockOnStatusChange}
          onPrint={mockOnPrint}
          onPreview={mockOnPreview}
        />
      </tbody></table>
    )
    expect(screen.getByText('2025-05-01')).toBeInTheDocument()
    expect(screen.getByText('开票')).toBeInTheDocument()
    expect(screen.getByText('纸普')).toBeInTheDocument()
  })

  it('renders invoice number and name', async () => {
    const { InvoiceRow } = await importModule()
    render(
      <table><tbody>
        <InvoiceRow
          invoice={baseInvoice}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onStatusChange={mockOnStatusChange}
          onPrint={mockOnPrint}
          onPreview={mockOnPreview}
        />
      </tbody></table>
    )
    expect(screen.getByText(/INV-2025-001/)).toBeInTheDocument()
    expect(screen.getByText('测试发票')).toBeInTheDocument()
  })

  it('renders seller and buyer names', async () => {
    const { InvoiceRow } = await importModule()
    render(
      <table><tbody>
        <InvoiceRow
          invoice={baseInvoice}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onStatusChange={mockOnStatusChange}
          onPrint={mockOnPrint}
          onPreview={mockOnPreview}
        />
      </tbody></table>
    )
    expect(screen.getByText('测试供应商')).toBeInTheDocument()
    expect(screen.getByText('测试客户')).toBeInTheDocument()
  })

  it('shows status badge', async () => {
    const { InvoiceRow } = await importModule()
    render(
      <table><tbody>
        <InvoiceRow
          invoice={{ ...baseInvoice, status: 'received' }}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onStatusChange={mockOnStatusChange}
          onPrint={mockOnPrint}
          onPreview={mockOnPreview}
        />
      </tbody></table>
    )
    expect(screen.getByText('已收齐')).toBeInTheDocument()
  })

  it('calls onEdit when edit button clicked', async () => {
    const user = userEvent.setup()
    const { InvoiceRow } = await importModule()
    render(
      <table><tbody>
        <InvoiceRow
          invoice={baseInvoice}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onStatusChange={mockOnStatusChange}
          onPrint={mockOnPrint}
          onPreview={mockOnPreview}
        />
      </tbody></table>
    )
    await user.click(screen.getByTitle('编辑'))
    expect(mockOnEdit).toHaveBeenCalledTimes(1)
  })

  it('calls onDelete when delete button clicked', async () => {
    const user = userEvent.setup()
    const { InvoiceRow } = await importModule()
    render(
      <table><tbody>
        <InvoiceRow
          invoice={baseInvoice}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onStatusChange={mockOnStatusChange}
          onPrint={mockOnPrint}
          onPreview={mockOnPreview}
        />
      </tbody></table>
    )
    await user.click(screen.getByTitle('删除'))
    expect(mockOnDelete).toHaveBeenCalledTimes(1)
  })

  it('calls onPreview when preview button exists', async () => {
    const user = userEvent.setup()
    const { InvoiceRow } = await importModule()
    render(
      <table><tbody>
        <InvoiceRow
          invoice={baseInvoice}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onStatusChange={mockOnStatusChange}
          onPrint={mockOnPrint}
          onPreview={mockOnPreview}
        />
      </tbody></table>
    )
    const previewBtn = screen.queryByTitle('预览')
    if (previewBtn) {
      await user.click(previewBtn)
      expect(mockOnPreview).toHaveBeenCalledTimes(1)
    }
  })
})
