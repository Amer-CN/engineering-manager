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

  test('应渲染分类筛选 pill-tabs（S28 Stitch）', async () => {
    const { default: TemplateDashboard } = await importModule()
    render(React.createElement(TemplateDashboard, baseProps as any))
    expect(screen.getByText('全部模板')).toBeTruthy()
    // 合同模板 appears as both pill-tab and badge on cards
    expect(screen.getAllByText('合同模板').length).toBeGreaterThan(0)
    expect(screen.getAllByText('结算模板').length).toBeGreaterThan(0)
  })

  test('应渲染模板卡片名称', async () => {
    const { default: TemplateDashboard } = await importModule()
    const { container } = render(React.createElement(TemplateDashboard, baseProps as any))
    const headings = container.querySelectorAll('h3')
    const names = Array.from(headings).map(h => h.textContent)
    expect(names).toContain('合同A')
    expect(names).toContain('结算A')
    expect(names).toContain('合同B')
  })

  test('应渲染 3 个模板卡片', async () => {
    const { default: TemplateDashboard } = await importModule()
    const { container } = render(React.createElement(TemplateDashboard, baseProps as any))
    // Each template renders as a button card
    const cards = container.querySelectorAll('.grid > button')
    expect(cards.length).toBe(3)
  })
})
