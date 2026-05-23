/**
 * InvoiceFilters.test.tsx - InvoiceFilters 组件测试
 * 测试发票/收款筛选器组件的渲染、筛选交互和按钮点击
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import React from 'react'

// Mock Icon 组件（必须匹配组件中的导入路径 ../../ui/Icon）
vi.mock('../../ui/Icon', () => ({
  Icon: ({ name, size }: { name: string; size?: number }) => 
    React.createElement('span', { 'data-testid': 'icon', 'data-icon-name': name }, `${name}-${size || 16}`)
}))

const mockProject = {
  id: 1,
  name: '测试项目'
}

const mockPartner = {
  id: 1,
  name: '测试单位'
}

describe('InvoiceFilters', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  // 动态导入避免模块缓存
  const importModule = async () => {
    const mod = await import('@/components/features/invoices/InvoiceFilters')
    return { InvoiceFilters: mod.InvoiceFilters }
  }

  it('发票模式：渲染筛选器', async () => {
    const { InvoiceFilters } = await importModule()

    render(
      <InvoiceFilters
        filterType=""
        filterStatus=""
        filterProject=""
        filterPaymentType=""
        filterPaymentProject=""
        filterDateStart=""
        filterDateEnd=""
        projects={[mockProject] as any}
        partners={[mockPartner] as any}
        onFilterTypeChange={vi.fn()}
        onFilterStatusChange={vi.fn()}
        onFilterProjectChange={vi.fn()}
        onFilterPaymentTypeChange={vi.fn()}
        onFilterPaymentProjectChange={vi.fn()}
        onFilterDateStartChange={vi.fn()}
        onFilterDateEndChange={vi.fn()}
        onPrint={vi.fn()}
        onExportExcel={vi.fn()}
        isPaymentFilter={false}
      />
    )

    // 检查发票模式筛选条件
    expect(screen.getByText('发票类型:')).toBeInTheDocument()
    expect(screen.getByText('状态:')).toBeInTheDocument()
    expect(screen.getByText('项目:')).toBeInTheDocument()
    expect(screen.getByText('日期:')).toBeInTheDocument()

    // 检查操作按钮
    expect(screen.getByText('打印')).toBeInTheDocument()
    expect(screen.getByText('导出Excel')).toBeInTheDocument()
  })

  it('收款模式：渲染筛选器', async () => {
    const { InvoiceFilters } = await importModule()

    render(
      <InvoiceFilters
        filterType=""
        filterStatus=""
        filterProject=""
        filterPaymentType=""
        filterPaymentProject=""
        filterDateStart=""
        filterDateEnd=""
        projects={[mockProject] as any}
        partners={[mockPartner] as any}
        onFilterTypeChange={vi.fn()}
        onFilterStatusChange={vi.fn()}
        onFilterProjectChange={vi.fn()}
        onFilterPaymentTypeChange={vi.fn()}
        onFilterPaymentProjectChange={vi.fn()}
        onFilterDateStartChange={vi.fn()}
        onFilterDateEndChange={vi.fn()}
        onPrint={vi.fn()}
        onExportExcel={vi.fn()}
        isPaymentFilter={true}
      />
    )

    // 检查收款模式筛选条件
    expect(screen.getByText('类型:')).toBeInTheDocument()
    expect(screen.getByText('项目:')).toBeInTheDocument()
    expect(screen.getByText('日期:')).toBeInTheDocument()

    // 收款模式不应该显示"状态"筛选
    expect(screen.queryByText('状态:')).not.toBeInTheDocument()
  })

  it('切换发票类型筛选', async () => {
    const { InvoiceFilters } = await importModule()
    const onFilterTypeChange = vi.fn()

    render(
      <InvoiceFilters
        filterType=""
        filterStatus=""
        filterProject=""
        filterPaymentType=""
        filterPaymentProject=""
        filterDateStart=""
        filterDateEnd=""
        projects={[mockProject] as any}
        partners={[mockPartner] as any}
        onFilterTypeChange={onFilterTypeChange}
        onFilterStatusChange={vi.fn()}
        onFilterProjectChange={vi.fn()}
        onFilterPaymentTypeChange={vi.fn()}
        onFilterPaymentProjectChange={vi.fn()}
        onFilterDateStartChange={vi.fn()}
        onFilterDateEndChange={vi.fn()}
        onPrint={vi.fn()}
        onExportExcel={vi.fn()}
        isPaymentFilter={false}
      />
    )

    // 找到发票类型下拉框
    const selects = document.querySelectorAll('select')
    const typeSelect = selects[0] as HTMLSelectElement
    fireEvent.change(typeSelect, { target: { value: 'invoice_in' } })

    expect(onFilterTypeChange).toHaveBeenCalledWith('invoice_in')
  })

  it('切换状态筛选', async () => {
    const { InvoiceFilters } = await importModule()
    const onFilterStatusChange = vi.fn()

    render(
      <InvoiceFilters
        filterType=""
        filterStatus=""
        filterProject=""
        filterPaymentType=""
        filterPaymentProject=""
        filterDateStart=""
        filterDateEnd=""
        projects={[mockProject] as any}
        partners={[mockPartner] as any}
        onFilterTypeChange={vi.fn()}
        onFilterStatusChange={onFilterStatusChange}
        onFilterProjectChange={vi.fn()}
        onFilterPaymentTypeChange={vi.fn()}
        onFilterPaymentProjectChange={vi.fn()}
        onFilterDateStartChange={vi.fn()}
        onFilterDateEndChange={vi.fn()}
        onPrint={vi.fn()}
        onExportExcel={vi.fn()}
        isPaymentFilter={false}
      />
    )

    // 找到状态下拉框
    const selects = document.querySelectorAll('select')
    const statusSelect = selects[1] as HTMLSelectElement
    fireEvent.change(statusSelect, { target: { value: 'issued' } })

    expect(onFilterStatusChange).toHaveBeenCalledWith('issued')
  })

  it('切换项目筛选', async () => {
    const { InvoiceFilters } = await importModule()
    const onFilterProjectChange = vi.fn()

    render(
      <InvoiceFilters
        filterType=""
        filterStatus=""
        filterProject=""
        filterPaymentType=""
        filterPaymentProject=""
        filterDateStart=""
        filterDateEnd=""
        projects={[mockProject] as any}
        partners={[mockPartner] as any}
        onFilterTypeChange={vi.fn()}
        onFilterStatusChange={vi.fn()}
        onFilterProjectChange={onFilterProjectChange}
        onFilterPaymentTypeChange={vi.fn()}
        onFilterPaymentProjectChange={vi.fn()}
        onFilterDateStartChange={vi.fn()}
        onFilterDateEndChange={vi.fn()}
        onPrint={vi.fn()}
        onExportExcel={vi.fn()}
        isPaymentFilter={false}
      />
    )

    // 找到项目下拉框（第三个 select）
    const selects = document.querySelectorAll('select')
    const projectSelect = selects[2] as HTMLSelectElement
    fireEvent.change(projectSelect, { target: { value: '1' } })

    expect(onFilterProjectChange).toHaveBeenCalledWith(1)
  })

  it('输入日期区间', async () => {
    const { InvoiceFilters } = await importModule()
    const onFilterDateStartChange = vi.fn()
    const onFilterDateEndChange = vi.fn()

    render(
      <InvoiceFilters
        filterType=""
        filterStatus=""
        filterProject=""
        filterPaymentType=""
        filterPaymentProject=""
        filterDateStart=""
        filterDateEnd=""
        projects={[mockProject] as any}
        partners={[mockPartner] as any}
        onFilterTypeChange={vi.fn()}
        onFilterStatusChange={vi.fn()}
        onFilterProjectChange={vi.fn()}
        onFilterPaymentTypeChange={vi.fn()}
        onFilterPaymentProjectChange={vi.fn()}
        onFilterDateStartChange={onFilterDateStartChange}
        onFilterDateEndChange={onFilterDateEndChange}
        onPrint={vi.fn()}
        onExportExcel={vi.fn()}
        isPaymentFilter={false}
      />
    )

    // 找到日期输入框
    const dateInputs = document.querySelectorAll('input[type="date"]')
    expect(dateInputs.length).toBe(2)

    const startDateInput = dateInputs[0] as HTMLInputElement
    const endDateInput = dateInputs[1] as HTMLInputElement

    fireEvent.change(startDateInput, { target: { value: '2026-01-01' } })
    expect(onFilterDateStartChange).toHaveBeenCalledWith('2026-01-01')

    fireEvent.change(endDateInput, { target: { value: '2026-12-31' } })
    expect(onFilterDateEndChange).toHaveBeenCalledWith('2026-12-31')
  })

  it('点击重置按钮', async () => {
    const { InvoiceFilters } = await importModule()
    const onFilterTypeChange = vi.fn()
    const onFilterStatusChange = vi.fn()
    const onFilterProjectChange = vi.fn()
    const onFilterDateStartChange = vi.fn()
    const onFilterDateEndChange = vi.fn()

    render(
      <InvoiceFilters
        filterType="invoice_in"
        filterStatus="issued"
        filterProject={1}
        filterPaymentType=""
        filterPaymentProject=""
        filterDateStart="2026-01-01"
        filterDateEnd="2026-12-31"
        projects={[mockProject] as any}
        partners={[mockPartner] as any}
        onFilterTypeChange={onFilterTypeChange}
        onFilterStatusChange={onFilterStatusChange}
        onFilterProjectChange={onFilterProjectChange}
        onFilterPaymentTypeChange={vi.fn()}
        onFilterPaymentProjectChange={vi.fn()}
        onFilterDateStartChange={onFilterDateStartChange}
        onFilterDateEndChange={onFilterDateEndChange}
        onPrint={vi.fn()}
        onExportExcel={vi.fn()}
        isPaymentFilter={false}
      />
    )

    // 有激活的筛选时，重置按钮应该显示
    const resetButton = screen.getByText('重置筛选')
    expect(resetButton).toBeInTheDocument()

    // 点击重置按钮
    fireEvent.click(resetButton)

    // 验证所有筛选回调被调用（清空）
    expect(onFilterTypeChange).toHaveBeenCalledWith('')
    expect(onFilterStatusChange).toHaveBeenCalledWith('')
    expect(onFilterProjectChange).toHaveBeenCalledWith('')
    expect(onFilterDateStartChange).toHaveBeenCalledWith('')
    expect(onFilterDateEndChange).toHaveBeenCalledWith('')
  })

  it('点击打印按钮', async () => {
    const { InvoiceFilters } = await importModule()
    const onPrint = vi.fn()

    render(
      <InvoiceFilters
        filterType=""
        filterStatus=""
        filterProject=""
        filterPaymentType=""
        filterPaymentProject=""
        filterDateStart=""
        filterDateEnd=""
        projects={[mockProject] as any}
        partners={[mockPartner] as any}
        onFilterTypeChange={vi.fn()}
        onFilterStatusChange={vi.fn()}
        onFilterProjectChange={vi.fn()}
        onFilterPaymentTypeChange={vi.fn()}
        onFilterPaymentProjectChange={vi.fn()}
        onFilterDateStartChange={vi.fn()}
        onFilterDateEndChange={vi.fn()}
        onPrint={onPrint}
        onExportExcel={vi.fn()}
        isPaymentFilter={false}
      />
    )

    const printButton = screen.getByText('打印')
    fireEvent.click(printButton)

    expect(onPrint).toHaveBeenCalledTimes(1)
  })

  it('点击导出Excel按钮', async () => {
    const { InvoiceFilters } = await importModule()
    const onExportExcel = vi.fn()

    render(
      <InvoiceFilters
        filterType=""
        filterStatus=""
        filterProject=""
        filterPaymentType=""
        filterPaymentProject=""
        filterDateStart=""
        filterDateEnd=""
        projects={[mockProject] as any}
        partners={[mockPartner] as any}
        onFilterTypeChange={vi.fn()}
        onFilterStatusChange={vi.fn()}
        onFilterProjectChange={vi.fn()}
        onFilterPaymentTypeChange={vi.fn()}
        onFilterPaymentProjectChange={vi.fn()}
        onFilterDateStartChange={vi.fn()}
        onFilterDateEndChange={vi.fn()}
        onPrint={vi.fn()}
        onExportExcel={onExportExcel}
        isPaymentFilter={false}
      />
    )

    const exportButton = screen.getByText('导出Excel')
    fireEvent.click(exportButton)

    expect(onExportExcel).toHaveBeenCalledTimes(1)
  })

  it('收款模式：切换收款类型', async () => {
    const { InvoiceFilters } = await importModule()
    const onFilterPaymentTypeChange = vi.fn()

    render(
      <InvoiceFilters
        filterType=""
        filterStatus=""
        filterProject=""
        filterPaymentType=""
        filterPaymentProject=""
        filterDateStart=""
        filterDateEnd=""
        projects={[mockProject] as any}
        partners={[mockPartner] as any}
        onFilterTypeChange={vi.fn()}
        onFilterStatusChange={vi.fn()}
        onFilterProjectChange={vi.fn()}
        onFilterPaymentTypeChange={onFilterPaymentTypeChange}
        onFilterPaymentProjectChange={vi.fn()}
        onFilterDateStartChange={vi.fn()}
        onFilterDateEndChange={vi.fn()}
        onPrint={vi.fn()}
        onExportExcel={vi.fn()}
        isPaymentFilter={true}
      />
    )

    // 找到收款类型下拉框
    const selects = document.querySelectorAll('select')
    const typeSelect = selects[0] as HTMLSelectElement
    fireEvent.change(typeSelect, { target: { value: 'invoice_out' } })

    expect(onFilterPaymentTypeChange).toHaveBeenCalledWith('invoice_out')
  })
})
