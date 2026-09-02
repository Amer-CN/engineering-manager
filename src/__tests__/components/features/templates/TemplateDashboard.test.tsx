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

  test('不渲染旧版「全部模板」筛选 pill，所有分类卡 label 渲染', async () => {
    const { default: TemplateDashboard } = await importModule()
    render(React.createElement(TemplateDashboard, baseProps as any))
    // 卡片墙重构后，旧 pill-tabs 筛选语义（「全部模板」按钮）已移除
    expect(screen.queryByText('全部模板')).toBeNull()
    expect(screen.getByText('合同模板')).toBeTruthy()
    expect(screen.getByText('结算模板')).toBeTruthy()
    expect(screen.getByText('其他')).toBeTruthy()
  })

  test('分类卡标题为分类 label（非模板名）', async () => {
    const { default: TemplateDashboard } = await importModule()
    const { container } = render(React.createElement(TemplateDashboard, baseProps as any))
    const headings = container.querySelectorAll('h3')
    const names = Array.from(headings).map(h => h.textContent)
    expect(names).toEqual(['合同模板', '结算模板', '其他'])
  })

  test('每个分类一张卡', async () => {
    const { default: TemplateDashboard } = await importModule()
    const { container } = render(React.createElement(TemplateDashboard, baseProps as any))
    // 每个分类渲染一张 button 卡（mock 3 个分类，无「全部模板」聚合卡）
    const cards = container.querySelectorAll('.grid > button')
    expect(cards.length).toBe(3)
  })
})
