import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import React from 'react'

// Mock Icon
vi.mock('@/components/ui/Icon', () => ({
  Icon: ({ name, size, className }: any) => <span data-testid={`icon-${name}`} className={className}>{name}</span>,
}))

// Mock categoryConfig
vi.mock('@/components/features/templates/config', () => ({
  categoryConfig: {
    contract: { label: '合同模板', icon: 'FileText', fileType: 'docx', description: '合同模板', defaultVariables: [] },
    settlement: { label: '结算模板', icon: 'ClipboardList', fileType: 'xlsx', description: '结算模板', defaultVariables: [] },
  },
}))

// Mock TemplateCard
vi.mock('@/components/features/templates/TemplateCard', () => ({
  TemplateCard: ({ template, onEdit, onDelete, onPreview, onGenerate }: any) => (
    <div data-testid="template-card">{template.name}</div>
  ),
}))

const importModule = () => import('@/components/features/templates/TemplateList')

describe('TemplateList', () => {
  const mockOnBack = vi.fn()
  const mockOnEdit = vi.fn()
  const mockOnDelete = vi.fn()
  const mockOnPreview = vi.fn()
  const mockOnGenerate = vi.fn()
  const mockOnCreate = vi.fn()

  const templates = [
    { id: 1, name: '合同A', category: 'contract', fileType: 'docx', fileName: 'a.docx', storedFileName: 'a.docx', description: '', variables: [], createdAt: '', updatedAt: '' },
    { id: 2, name: '合同B', category: 'contract', fileType: 'xlsx', fileName: 'b.xlsx', storedFileName: 'b.xlsx', description: '', variables: [], createdAt: '', updatedAt: '' },
  ]

  const baseProps: any = {
    category: 'contract' as const,
    templates,
    onBack: mockOnBack,
    onEdit: mockOnEdit,
    onDelete: mockOnDelete,
    onPreview: mockOnPreview,
    onGenerate: mockOnGenerate,
    onCreate: mockOnCreate,
  }

  beforeEach(() => { vi.clearAllMocks() })
  afterEach(cleanup)

  test('应渲染分类标题', async () => {
    const { default: TemplateList } = await importModule()
    const { container } = render(React.createElement(TemplateList, baseProps as any))
    // 标题是 h1 元素
    const h1 = container.querySelector('h1')
    expect(h1?.textContent).toBe('合同模板')
  })

  test('应渲染模板统计', async () => {
    const { default: TemplateList } = await importModule()
    render(React.createElement(TemplateList, baseProps as any))
    expect(screen.getByText('模板总数')).toBeTruthy()
    expect(screen.getByText('2')).toBeTruthy()
    expect(screen.getByText('Word 文档')).toBeTruthy()
    expect(screen.getByText('Excel 表格')).toBeTruthy()
  })

  test('应渲染模板卡片', async () => {
    const { default: TemplateList } = await importModule()
    render(React.createElement(TemplateList, baseProps as any))
    const cards = screen.getAllByTestId('template-card')
    expect(cards.length).toBe(2)
  })

  test('应渲染新建模板按钮', async () => {
    const { default: TemplateList } = await importModule()
    render(React.createElement(TemplateList, baseProps as any))
    expect(screen.getByText('新建模板')).toBeTruthy()
  })

  test('空列表应显示提示', async () => {
    const { default: TemplateList } = await importModule()
    render(React.createElement(TemplateList, { ...baseProps, templates: [] } as any))
    expect(screen.getByText('此分类暂无模板')).toBeTruthy()
  })

  test('点击返回应触发 onBack', async () => {
    const { default: TemplateList } = await importModule()
    render(React.createElement(TemplateList, baseProps as any))
    // 返回按钮是第一个按钮
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[0])
    expect(mockOnBack).toHaveBeenCalled()
  })
})
