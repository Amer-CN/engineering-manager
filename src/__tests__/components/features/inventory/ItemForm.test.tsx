// @ts-nocheck
/**
 * ItemForm.test.tsx - ItemForm 组件测试
 * 测试物料表单组件的渲染、输入、提交和编辑模式
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

// Mock types
const mockInventoryItem = {
  id: 1,
  code: 'STL-001',
  name: '螺纹钢筋',
  category: '钢材',
  unit: '吨',
  specifications: 'HRB400 Φ12mm',
  purchasePrice: 3500,
  salePrice: 4200,
  currentStock: 50,
  minStock: 10,
  maxStock: 500,
  supplierId: 1,
  remarks: '测试备注'
}

const mockPartner = {
  id: 1,
  name: '测试供应商',
  category: 'material' as const,
  contact: '张三',
  phone: '13800138000',
  email: 'test@example.com',
  address: '测试地址',
  bankAccount: '6222021234567890123',
  bankName: '工商银行',
  taxNumber: '91110000MA00XXXXXX',
  creditCode: '91110000MA00XXXXXX',
  registeredAddress: '北京市朝阳区',
  businessScope: '建材销售',
  taxType: 'general',
  licenseFile: '',
  licenseFileType: '',
  otherFiles: '',
  otherFilesType: '',
  projectIds: [],
  remarks: '',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z'
}

const mockCategories = ['钢材', '水泥', '木材', '电缆']
const mockUnits = ['吨', '立方米', '米', '个']

describe('ItemForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  // 动态导入避免模块缓存
  const importModule = async () => {
    const mod = await import('@/components/features/inventory/ItemForm')
    return { ItemForm: mod.ItemForm }
  }

  it('新增模式：渲染空表单', async () => {
    const { ItemForm } = await importModule()
    const onSubmit = vi.fn()
    const onCancel = vi.fn()

    render(
      <ItemForm
        partners={[mockPartner]}
        categories={mockCategories}
        units={mockUnits}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    )

    // 检查标题/按钮
    expect(screen.getByText('添加')).toBeInTheDocument()
    expect(screen.getByText('取消')).toBeInTheDocument()

    // 检查输入框为空
    const codeInput = document.querySelector('input[placeholder*="STL"]') as HTMLInputElement
    expect(codeInput.value).toBe('')

    // 检查取消按钮
    expect(screen.getByText('取消')).toBeInTheDocument()
  })

  it('编辑模式：填充表单数据', async () => {
    const { ItemForm } = await importModule()
    const onSubmit = vi.fn()
    const onCancel = vi.fn()

    render(
      <ItemForm
        item={mockInventoryItem as any}
        partners={[mockPartner]}
        categories={mockCategories}
        units={mockUnits}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    )

    // 检查按钮文字变为"保存"
    expect(screen.getByText('保存')).toBeInTheDocument()

    // 检查输入框已填充
    const inputs = document.querySelectorAll('input[type="text"]')
    const codeInput = Array.from(inputs).find(input => (input as HTMLInputElement).value === 'STL-001')
    expect(codeInput).toBeDefined()
  })

  it('输入物料编码和名称', async () => {
    const { ItemForm } = await importModule()
    const onSubmit = vi.fn()
    const onCancel = vi.fn()

    render(
      <ItemForm
        partners={[mockPartner]}
        categories={mockCategories}
        units={mockUnits}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    )

    // 找到物料编码输入框
    const codeInput = document.querySelector('input[placeholder*="STL"]') as HTMLInputElement
    fireEvent.change(codeInput, { target: { value: 'TEST-001' } })
    expect(codeInput.value).toBe('TEST-001')

    // 找到物料名称输入框
    const nameInput = document.querySelector('input[placeholder*="螺纹"]') as HTMLInputElement
    fireEvent.change(nameInput, { target: { value: '测试物料' } })
    expect(nameInput.value).toBe('测试物料')
  })

  it('选择类别和单位', async () => {
    const { ItemForm } = await importModule()
    const onSubmit = vi.fn()
    const onCancel = vi.fn()

    render(
      <ItemForm
        partners={[mockPartner]}
        categories={mockCategories}
        units={mockUnits}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    )

    // 选择类别
    const categorySelect = document.querySelectorAll('select')[0] as HTMLSelectElement
    fireEvent.change(categorySelect, { target: { value: '钢材' } })
    expect(categorySelect.value).toBe('钢材')

    // 选择单位
    const unitSelect = document.querySelectorAll('select')[1] as HTMLSelectElement
    fireEvent.change(unitSelect, { target: { value: '吨' } })
    expect(unitSelect.value).toBe('吨')
  })

  it('输入数字字段', async () => {
    const { ItemForm } = await importModule()
    const onSubmit = vi.fn()
    const onCancel = vi.fn()

    render(
      <ItemForm
        partners={[mockPartner]}
        categories={mockCategories}
        units={mockUnits}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    )

    // 找到数字输入框（采购单价、销售单价、当前库存、最低库存）
    const numberInputs = document.querySelectorAll('input[type="number"]')
    expect(numberInputs.length).toBeGreaterThanOrEqual(4)

    // 输入采购单价
    const purchasePriceInput = numberInputs[0] as HTMLInputElement
    fireEvent.change(purchasePriceInput, { target: { value: '3500' } })
    expect(purchasePriceInput.value).toBe('3500')
  })

  it('选择供应商', async () => {
    const { ItemForm } = await importModule()
    const onSubmit = vi.fn()
    const onCancel = vi.fn()

    render(
      <ItemForm
        partners={[mockPartner]}
        categories={mockCategories}
        units={mockUnits}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    )

    // 找到供应商下拉框（最后一个 select）
    const selects = document.querySelectorAll('select')
    const supplierSelect = selects[selects.length - 1] as HTMLSelectElement
    fireEvent.change(supplierSelect, { target: { value: '1' } })
    expect(supplierSelect.value).toBe('1')
  })

  it('输入备注', async () => {
    const { ItemForm } = await importModule()
    const onSubmit = vi.fn()
    const onCancel = vi.fn()

    render(
      <ItemForm
        partners={[mockPartner]}
        categories={mockCategories}
        units={mockUnits}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    )

    // 找到 textarea
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement
    expect(textarea).toBeInTheDocument()
    fireEvent.change(textarea, { target: { value: '测试备注内容' } })
    expect(textarea.value).toBe('测试备注内容')
  })

  it('提交表单（新增模式）', async () => {
    const { ItemForm } = await importModule()
    const onSubmit = vi.fn()
    const onCancel = vi.fn()

    render(
      <ItemForm
        partners={[mockPartner]}
        categories={mockCategories}
        units={mockUnits}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    )

    // 填写必填字段
    const codeInput = document.querySelector('input[placeholder*="STL"]') as HTMLInputElement
    const nameInput = document.querySelector('input[placeholder*="螺纹"]') as HTMLInputElement
    fireEvent.change(codeInput, { target: { value: 'TEST-001' } })
    fireEvent.change(nameInput, { target: { value: '测试物料' } })

    // 移除 required 属性（jsdom 不支持 HTML5 验证）
    document.querySelectorAll('[required]').forEach(el => el.removeAttribute('required'))

    // 提交表单
    const submitButton = screen.getByText('添加')
    fireEvent.click(submitButton)

    // 验证 onSubmit 被调用
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'TEST-001',
        name: '测试物料',
        supplierId: 0
      })
    )
  })

  it('提交表单（编辑模式）', async () => {
    const { ItemForm } = await importModule()
    const onSubmit = vi.fn()
    const onCancel = vi.fn()

    render(
      <ItemForm
        item={mockInventoryItem as any}
        partners={[mockPartner]}
        categories={mockCategories}
        units={mockUnits}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    )

    // 修改名称
    const nameInput = document.querySelector('input[placeholder*="螺纹"]') as HTMLInputElement
    fireEvent.change(nameInput, { target: { value: '修改后的物料' } })

    // 移除 required 属性
    document.querySelectorAll('[required]').forEach(el => el.removeAttribute('required'))

    // 提交表单
    const submitButton = screen.getByText('保存')
    fireEvent.click(submitButton)

    // 验证 onSubmit 被调用
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('点击取消按钮', async () => {
    const { ItemForm } = await importModule()
    const onSubmit = vi.fn()
    const onCancel = vi.fn()

    render(
      <ItemForm
        partners={[mockPartner]}
        categories={mockCategories}
        units={mockUnits}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    )

    const cancelButton = screen.getByText('取消')
    fireEvent.click(cancelButton)

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
