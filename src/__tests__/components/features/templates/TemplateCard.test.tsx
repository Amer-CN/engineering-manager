import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import React from 'react'

// Mock Icon 组件
vi.mock('@/components/ui/Icon', () => ({
  Icon: ({ name, size, className }: any) => <span data-testid={`icon-${name}`} className={className}>{name}</span>,
}))

// Mock categoryConfig
vi.mock('@/components/features/templates/config', () => ({
  categoryConfig: {
    contract: { label: '合同模板', icon: 'FileText', fileType: 'docx', description: '合同模板描述', defaultVariables: [] },
    settlement: { label: '结算模板', icon: 'ClipboardList', fileType: 'xlsx', description: '结算模板描述', defaultVariables: [] },
    other: { label: '其他', icon: 'File', fileType: 'both', description: '其他', defaultVariables: [] },
  },
}))

const importModule = () => import('@/components/features/templates/TemplateCard')

describe('TemplateCard', () => {
  const mockOnEdit = vi.fn()
  const mockOnDelete = vi.fn()
  const mockOnPreview = vi.fn()
  const mockOnGenerate = vi.fn()

  const baseTemplate: import('@/types').Template = {
    id: 1,
    name: '收入合同模板',
    category: 'contract' as const,
    fileType: 'docx' as const,
    fileName: 'contract.docx',
    storedFileName: 'uuid-contract.docx',
    description: '标准收入合同模板',
    variables: [
      { key: 'partyA', label: '甲方', type: 'text', defaultValue: '', required: true },
      { key: 'partyB', label: '乙方', type: 'text', defaultValue: '', required: true },
    ],
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  }

  beforeEach(() => { vi.clearAllMocks() })
  afterEach(cleanup)

  test('应渲染模板名称和分类', async () => {
    const { default: TemplateCard } = await importModule()
    render(React.createElement(TemplateCard, {
      template: baseTemplate,
      onEdit: mockOnEdit,
      onDelete: mockOnDelete,
      onPreview: mockOnPreview,
      onGenerate: mockOnGenerate,
    }))
    expect(screen.getByText('收入合同模板')).toBeTruthy()
    expect(screen.getByText('合同模板')).toBeTruthy()
    expect(screen.getByText('DOCX')).toBeTruthy()
  })

  test('xlsx 文件应显示正确图标色', async () => {
    const { default: TemplateCard } = await importModule()
    const xlsxTemplate = { ...baseTemplate, fileType: 'xlsx' as const }
    render(React.createElement(TemplateCard, {
      template: xlsxTemplate,
      onEdit: mockOnEdit,
      onDelete: mockOnDelete,
      onPreview: mockOnPreview,
      onGenerate: mockOnGenerate,
    }))
    expect(screen.getByText('XLSX')).toBeTruthy()
  })

  test('应渲染描述', async () => {
    const { default: TemplateCard } = await importModule()
    render(React.createElement(TemplateCard, {
      template: baseTemplate,
      onEdit: mockOnEdit,
      onDelete: mockOnDelete,
      onPreview: mockOnPreview,
      onGenerate: mockOnGenerate,
    }))
    expect(screen.getByText('标准收入合同模板')).toBeTruthy()
  })

  test('应渲染变量标签', async () => {
    const { default: TemplateCard } = await importModule()
    render(React.createElement(TemplateCard, {
      template: baseTemplate,
      onEdit: mockOnEdit,
      onDelete: mockOnDelete,
      onPreview: mockOnPreview,
      onGenerate: mockOnGenerate,
    }))
    expect(screen.getByText('甲方')).toBeTruthy()
    expect(screen.getByText('乙方')).toBeTruthy()
  })

  test('超过 4 个变量应显示 +N', async () => {
    const { default: TemplateCard } = await importModule()
    const manyVars = {
      ...baseTemplate,
      variables: Array.from({ length: 6 }, (_, i) => ({
        key: `v${i}`, label: `变量${i}`, type: 'text', defaultValue: '', required: false,
      })),
    } as any
    render(React.createElement(TemplateCard, {
      template: manyVars,
      onEdit: mockOnEdit,
      onDelete: mockOnDelete,
      onPreview: mockOnPreview,
      onGenerate: mockOnGenerate,
    }))
    expect(screen.getByText('+2')).toBeTruthy()
  })

  test('点击预览按钮应触发 onPreview', async () => {
    const { default: TemplateCard } = await importModule()
    render(React.createElement(TemplateCard, {
      template: baseTemplate,
      onEdit: mockOnEdit,
      onDelete: mockOnDelete,
      onPreview: mockOnPreview,
      onGenerate: mockOnGenerate,
    }))
    fireEvent.click(screen.getByTitle('预览'))
    expect(mockOnPreview).toHaveBeenCalledWith(baseTemplate)
  })

  test('点击生成按钮应触发 onGenerate', async () => {
    const { default: TemplateCard } = await importModule()
    render(React.createElement(TemplateCard, {
      template: baseTemplate,
      onEdit: mockOnEdit,
      onDelete: mockOnDelete,
      onPreview: mockOnPreview,
      onGenerate: mockOnGenerate,
    }))
    fireEvent.click(screen.getByTitle('生成文档'))
    expect(mockOnGenerate).toHaveBeenCalledWith(baseTemplate)
  })

  test('点击编辑按钮应触发 onEdit', async () => {
    const { default: TemplateCard } = await importModule()
    render(React.createElement(TemplateCard, {
      template: baseTemplate,
      onEdit: mockOnEdit,
      onDelete: mockOnDelete,
      onPreview: mockOnPreview,
      onGenerate: mockOnGenerate,
    }))
    fireEvent.click(screen.getByTitle('编辑'))
    expect(mockOnEdit).toHaveBeenCalledWith(baseTemplate)
  })
})
