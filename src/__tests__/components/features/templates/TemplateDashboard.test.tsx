import { render, screen, cleanup } from '@testing-library/react'
import React from 'react'

// Mock Icon
vi.mock('@/components/ui/Icon', () => ({
  Icon: ({ name, size, className }: any) => <span data-testid={`icon-${name}`} className={className}>{name}</span>,
}))

// Mock categoryConfig and categoryColors
vi.mock('@/components/features/templates/config', () => ({
  categoryConfig: {
    contract: { label: '合同模板', icon: 'FileText', fileType: 'docx', description: '合同模板描述', defaultVariables: [] },
    settlement: { label: '结算模板', icon: 'ClipboardList', fileType: 'xlsx', description: '结算模板描述', defaultVariables: [] },
    other: { label: '其他', icon: 'File', fileType: 'both', description: '其他', defaultVariables: [] },
  },
  categoryColors: {
    contract: 'text-violet-600 bg-violet-50 border-violet-200',
    settlement: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    other: 'text-slate-500 bg-slate-100 border-slate-200',
  },
}))

const importModule = () => import('@/components/features/templates/TemplateDashboard')

describe('TemplateDashboard', () => {
  const baseProps: any = {
    templates: [
      { id: 1, name: '合同A', category: 'contract', fileType: 'docx', fileName: 'a.docx', storedFileName: 'a.docx', description: '', variables: [], createdAt: '', updatedAt: '' },
      { id: 2, name: '结算A', category: 'settlement', fileType: 'xlsx', fileName: 's.xlsx', storedFileName: 's.xlsx', description: '', variables: [], createdAt: '', updatedAt: '' },
      { id: 3, name: '合同B', category: 'contract', fileType: 'docx', fileName: 'b.docx', storedFileName: 'b.docx', description: '', variables: [], createdAt: '', updatedAt: '' },
    ],
    stats: { total: 3 },
    onCategoryClick: vi.fn(),
  }

  afterEach(cleanup)

  test('应渲染模板总数统计', async () => {
    const { default: TemplateDashboard } = await importModule()
    render(React.createElement(TemplateDashboard, baseProps as any))
    expect(screen.getByText('模板总数')).toBeTruthy()
    expect(screen.getByText('3')).toBeTruthy()
  })

  test('应渲染 Word 和 Excel 模板统计', async () => {
    const { default: TemplateDashboard } = await importModule()
    render(React.createElement(TemplateDashboard, baseProps as any))
    expect(screen.getByText('Word 模板')).toBeTruthy()
    expect(screen.getByText('Excel 模板')).toBeTruthy()
  })

  test('应渲染分类卡片', async () => {
    const { default: TemplateDashboard } = await importModule()
    const { container } = render(React.createElement(TemplateDashboard, baseProps as any))
    // 用 h3 查找分类标题
    const headings = container.querySelectorAll('h3')
    const labels = Array.from(headings).map(h => h.textContent)
    expect(labels).toContain('合同模板')
    expect(labels).toContain('结算模板')
    expect(labels).toContain('其他')
  })

  test('应显示分类标题', async () => {
    const { default: TemplateDashboard } = await importModule()
    const { container } = render(React.createElement(TemplateDashboard, baseProps as any))
    const h2 = container.querySelector('h2')
    expect(h2?.textContent).toBe('模板分类')
  })

  test('分类卡片应显示模板数量', async () => {
    const { default: TemplateDashboard } = await importModule()
    render(React.createElement(TemplateDashboard, baseProps as any))
    // contract has 2 templates
    expect(screen.getByText('2 个模板')).toBeTruthy()
    // settlement has 1 template
    expect(screen.getByText('1 个模板')).toBeTruthy()
  })
})
