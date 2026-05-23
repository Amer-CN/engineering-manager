import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import React from 'react'

// Mock Icon
vi.mock('@/components/ui/Icon', () => ({
  Icon: ({ name, size, className }: any) => <span data-testid={`icon-${name}`} className={className}>{name}</span>,
}))

// Mock settlement config
vi.mock('@/components/features/settlement/config', () => ({
  statusConfig: {
    draft: { label: '草稿', color: 'text-slate-600', bgColor: 'bg-slate-100' },
    pending: { label: '未办理', color: 'text-amber-600', bgColor: 'bg-amber-100' },
    completed: { label: '已办理', color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
    archived: { label: '已归档', color: 'text-slate-500', bgColor: 'bg-slate-100' },
  },
  typeConfig: {
    income: { label: '收入结算', icon: '↑' },
    expense: { label: '支出结算', icon: '↓' },
  },
  subTypeConfig: {
    material: { label: '材料结算' },
    labor: { label: '劳务人工结算' },
  },
}))

const importModule = () => import('@/components/features/settlement/SettlementList')

describe('SettlementList', () => {
  const mockOnEdit = vi.fn()
  const mockOnDelete = vi.fn()
  const mockOnProcess = vi.fn()
  const mockOnUnarchive = vi.fn()
  const mockOnPrint = vi.fn()
  const mockOnPreviewFile = vi.fn()

  const baseSettlement = {
    id: 1,
    name: '材料结算单-001',
    settlementNo: 'JS-2026-001',
    type: 'income' as const,
    subType: 'material',
    partnerName: '测试材料公司',
    settlementDate: '2026-01-15',
    amount: 100000,
    status: 'draft' as const,
    projectId: 1,
    partnerId: 1,
    periodStart: '2026-01-01',
    periodEnd: '2026-01-31',
    fileUrl: '',
  }

  const baseProps = {
    settlements: [baseSettlement as any],
    onEdit: mockOnEdit,
    onDelete: mockOnDelete,
    onProcess: mockOnProcess,
    onUnarchive: mockOnUnarchive,
    onPrint: mockOnPrint,
    onPreviewFile: mockOnPreviewFile,
  }

  beforeEach(() => { vi.clearAllMocks() })
  afterEach(cleanup)

  test('空列表应显示空状态', async () => {
    const { SettlementList } = await importModule()
    render(React.createElement(SettlementList, { ...baseProps, settlements: [] }))
    expect(screen.getByText('暂无结算单')).toBeTruthy()
  })

  test('应渲染结算名称和编号', async () => {
    const { SettlementList } = await importModule()
    render(React.createElement(SettlementList, baseProps))
    expect(screen.getByText('材料结算单-001')).toBeTruthy()
    expect(screen.getByText('JS-2026-001')).toBeTruthy()
  })

  test('应渲染单位和日期', async () => {
    const { SettlementList } = await importModule()
    render(React.createElement(SettlementList, baseProps))
    expect(screen.getByText('测试材料公司')).toBeTruthy()
    expect(screen.getByText('2026-01-15')).toBeTruthy()
  })

  test('应渲染金额', async () => {
    const { SettlementList } = await importModule()
    render(React.createElement(SettlementList, baseProps))
    // ¥{formatMoney(100000)} 
    expect(screen.getByText(/100/)).toBeTruthy()
  })

  test('应渲染状态标签', async () => {
    const { SettlementList } = await importModule()
    render(React.createElement(SettlementList, baseProps))
    expect(screen.getByText('草稿')).toBeTruthy()
  })

  test('应渲染操作按钮', async () => {
    const { SettlementList } = await importModule()
    render(React.createElement(SettlementList, baseProps))
    expect(screen.getByTitle('编辑')).toBeTruthy()
    expect(screen.getByTitle('打印')).toBeTruthy()
    expect(screen.getByTitle('办理')).toBeTruthy()
    expect(screen.getByTitle('删除')).toBeTruthy()
  })

  test('点击编辑应触发 onEdit', async () => {
    const { SettlementList } = await importModule()
    render(React.createElement(SettlementList, baseProps))
    fireEvent.click(screen.getByTitle('编辑'))
    expect(mockOnEdit).toHaveBeenCalledWith(baseSettlement)
  })

  test('点击删除应触发 onDelete', async () => {
    const { SettlementList } = await importModule()
    render(React.createElement(SettlementList, baseProps))
    fireEvent.click(screen.getByTitle('删除'))
    expect(mockOnDelete).toHaveBeenCalledWith(1)
  })
})
