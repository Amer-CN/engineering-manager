// @ts-nocheck
/**
 * SupervisorForm.test.tsx - SupervisorForm 组件测试
 * 测试监管单位表单组件的渲染、输入、三级联动地区和提交
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

// Mock regions data
vi.mock('@/data/regions', () => ({
  supervisorCategories: [
    { value: 'quality', label: '质量监督' },
    { value: 'safety', label: '安全监管' },
    { value: 'environment', label: '环保监管' },
    { value: 'progress', label: '进度监管' }
  ],
  getProvinces: vi.fn(() => ['北京市', '上海市', '广东省']),
  getCities: vi.fn((province: string) => {
    if (province === '广东省') return ['广州市', '深圳市', '东莞市']
    return []
  }),
  getDistricts: vi.fn((province: string, city: string) => {
    if (province === '广东省' && city === '广州市') return ['天河区', '越秀区', '海珠区']
    return []
  })
}))

const mockProject = {
  id: 1,
  name: '测试项目'
}

const mockSupervisor = {
  id: 1,
  name: '测试监管单位',
  category: 'quality' as const,
  contact: '李四',
  phone: '13900139000',
  address: '测试地址',
  regionName: '广东省 / 广州市 / 天河区',
  projectIds: [1],
  remarks: '测试备注'
}

describe('SupervisorForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  // 动态导入避免模块缓存
  const importModule = async () => {
    const mod = await import('@/components/features/partners/SupervisorForm')
    return { SupervisorForm: mod.SupervisorForm }
  }

  it('新增模式：渲染空表单', async () => {
    const { SupervisorForm } = await importModule()
    const onSubmit = vi.fn()
    const onCancel = vi.fn()

    render(
      <SupervisorForm
        projects={[mockProject as any]}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    )

    // 检查按钮文字
    expect(screen.getByText('添加')).toBeInTheDocument()
    expect(screen.getByText('取消')).toBeInTheDocument()

    // 检查输入框为空
    const nameInput = document.querySelector('input[required]') as HTMLInputElement
    expect(nameInput.value).toBe('')
  })

  it('编辑模式：填充表单数据', async () => {
    const { SupervisorForm } = await importModule()
    const onSubmit = vi.fn()
    const onCancel = vi.fn()

    render(
      <SupervisorForm
        supervisor={mockSupervisor as any}
        projects={[mockProject as any]}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    )

    // 检查按钮文字变为"保存"
    expect(screen.getByText('保存')).toBeInTheDocument()

    // 检查单位名称已填充
    const nameInput = document.querySelector('input[required]') as HTMLInputElement
    expect(nameInput.value).toBe('测试监管单位')
  })

  it('输入单位名称', async () => {
    const { SupervisorForm } = await importModule()
    const onSubmit = vi.fn()
    const onCancel = vi.fn()

    render(
      <SupervisorForm
        projects={[mockProject as any]}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    )

    const nameInput = document.querySelector('input[required]') as HTMLInputElement
    fireEvent.change(nameInput, { target: { value: '新监管单位' } })
    expect(nameInput.value).toBe('新监管单位')
  })

  it('选择单位类型', async () => {
    const { SupervisorForm } = await importModule()
    const onSubmit = vi.fn()
    const onCancel = vi.fn()

    render(
      <SupervisorForm
        projects={[mockProject as any]}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    )

    // 找到单位类型下拉框
    const categorySelect = document.querySelector('select') as HTMLSelectElement
    expect(categorySelect).toBeInTheDocument()

    // 检查选项
    expect(screen.getByText('质量监督')).toBeInTheDocument()
    expect(screen.getByText('安全监管')).toBeInTheDocument()

    // 选择类型
    fireEvent.change(categorySelect, { target: { value: 'safety' } })
    expect(categorySelect.value).toBe('safety')
  })

  it('三级联动地区选择', async () => {
    const { SupervisorForm } = await importModule()
    const onSubmit = vi.fn()
    const onCancel = vi.fn()

    render(
      <SupervisorForm
        projects={[mockProject as any]}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    )

    // 找到所有下拉框：selects[0]=单位类型, selects[1]=省份, selects[2]=城市, selects[3]=区县
    const selects = document.querySelectorAll('select')
    expect(selects.length).toBeGreaterThanOrEqual(4)

    const provinceSelect = selects[1] as HTMLSelectElement  // 省份
    const citySelect = selects[2] as HTMLSelectElement      // 城市
    const districtSelect = selects[3] as HTMLSelectElement  // 区县

    // 选择省份
    fireEvent.change(provinceSelect, { target: { value: '广东省' } })
    expect(provinceSelect.value).toBe('广东省')

    // 选择城市（应该已启用）
    expect(citySelect.disabled).toBe(false)
    fireEvent.change(citySelect, { target: { value: '广州市' } })
    expect(citySelect.value).toBe('广州市')

    // 选择区县
    expect(districtSelect.disabled).toBe(false)
    fireEvent.change(districtSelect, { target: { value: '天河区' } })
    expect(districtSelect.value).toBe('天河区')
  })

  it('输入联系人和电话', async () => {
    const { SupervisorForm } = await importModule()
    const onSubmit = vi.fn()
    const onCancel = vi.fn()

    render(
      <SupervisorForm
        projects={[mockProject as any]}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    )

    // 找到所有 text input（排除 required 的那个 name input）
    const textInputs = document.querySelectorAll('input[type="text"]')
    expect(textInputs.length).toBeGreaterThanOrEqual(3) // name, contact, phone, address

    // 输入联系人
    const contactInput = textInputs[1] as HTMLInputElement
    fireEvent.change(contactInput, { target: { value: '王五' } })
    expect(contactInput.value).toBe('王五')

    // 输入电话
    const phoneInput = textInputs[2] as HTMLInputElement
    fireEvent.change(phoneInput, { target: { value: '13600136000' } })
    expect(phoneInput.value).toBe('13600136000')
  })

  it('输入地址', async () => {
    const { SupervisorForm } = await importModule()
    const onSubmit = vi.fn()
    const onCancel = vi.fn()

    render(
      <SupervisorForm
        projects={[mockProject as any]}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    )

    // 找到地址输入框
    const textInputs = document.querySelectorAll('input[type="text"]')
    const addressInput = textInputs[3] as HTMLInputElement
    fireEvent.change(addressInput, { target: { value: '广州市天河区测试路123号' } })
    expect(addressInput.value).toBe('广州市天河区测试路123号')
  })

  it('勾选项目复选框', async () => {
    const { SupervisorForm } = await importModule()
    const onSubmit = vi.fn()
    const onCancel = vi.fn()

    render(
      <SupervisorForm
        projects={[mockProject as any]}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    )

    // 找到项目复选框
    const checkboxes = document.querySelectorAll('input[type="checkbox"]')
    expect(checkboxes.length).toBeGreaterThanOrEqual(1)

    // 勾选第一个项目
    const projectCheckbox = checkboxes[0] as HTMLInputElement
    fireEvent.click(projectCheckbox)
    expect(projectCheckbox.checked).toBe(true)
  })

  it('输入备注', async () => {
    const { SupervisorForm } = await importModule()
    const onSubmit = vi.fn()
    const onCancel = vi.fn()

    render(
      <SupervisorForm
        projects={[mockProject as any]}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    )

    // 找到 textarea
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement
    expect(textarea).toBeInTheDocument()
    fireEvent.change(textarea, { target: { value: '这是备注信息' } })
    expect(textarea.value).toBe('这是备注信息')
  })

  it('提交表单（新增模式）', async () => {
    const { SupervisorForm } = await importModule()
    const onSubmit = vi.fn()
    const onCancel = vi.fn()

    render(
      <SupervisorForm
        projects={[mockProject as any]}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    )

    // 填写必填字段
    const nameInput = document.querySelector('input[required]') as HTMLInputElement
    fireEvent.change(nameInput, { target: { value: '测试单位' } })

    // 移除 required 属性
    document.querySelectorAll('[required]').forEach(el => el.removeAttribute('required'))

    // 提交表单
    const submitButton = screen.getByText('添加')
    fireEvent.click(submitButton)

    // 验证 onSubmit 被调用
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: '测试单位',
        category: 'quality'
      })
    )
  })

  it('提交表单（编辑模式）', async () => {
    const { SupervisorForm } = await importModule()
    const onSubmit = vi.fn()
    const onCancel = vi.fn()

    render(
      <SupervisorForm
        supervisor={mockSupervisor as any}
        projects={[mockProject as any]}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    )

    // 修改名称
    const nameInput = document.querySelector('input[required]') as HTMLInputElement
    fireEvent.change(nameInput, { target: { value: '修改后的单位' } })

    // 移除 required 属性
    document.querySelectorAll('[required]').forEach(el => el.removeAttribute('required'))

    // 提交表单
    const submitButton = screen.getByText('保存')
    fireEvent.click(submitButton)

    // 验证 onSubmit 被调用
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('点击取消按钮', async () => {
    const { SupervisorForm } = await importModule()
    const onSubmit = vi.fn()
    const onCancel = vi.fn()

    render(
      <SupervisorForm
        projects={[mockProject as any]}
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
