/**
 * CostLedgerList 测试
 * 用相对于测试文件的路径 mock CostLedgerRow
 */
import { render, screen } from '@testing-library/react'
import { CostLedgerList } from '@/components/features/costLedger/CostLedgerList'
import type { CostLedgerEntry } from '@/types'

// ═══════════════════════════════════
// Mock CostLedgerRow - 使用相对于测试文件的路径
// 测试文件：src/__tests__/components/features/costLedger/CostLedgerList.test.tsx
// 源文件：src/components/features/costLedger/CostLedgerRow.tsx
// 相对路径：../../../../components/features/costLedger/CostLedgerRow
// ═══════════════════════════════════
vi.mock('@/components/features/costLedger/CostLedgerRow', () => ({
  CostLedgerRow: vi.fn((props: any) => (
    <div data-testid="cost-ledger-row" data-id={props.entry?.id}>
      {props.entry?.summary || 'row'}
    </div>
  )),
}))

// Mock printExport
vi.mock('@/components/features/costLedger/printExport', () => ({
  printCostLedgerList: vi.fn(),
  exportCostLedgerList: vi.fn(),
}))

// Mock config - 使用 importOriginal 合并原始导出
vi.mock('@/components/features/costLedger/config', async (importOriginal) => {
  const actual = await importOriginal() as any
  return {
    ...actual,
    // 根据需要覆盖的方法
    getLevel1ForCode: vi.fn(() => '材料费'),
    getCategoriesByDirection: vi.fn(() => []),
    getLevel1GroupsMerged: vi.fn(() => [
      { name: '材料费', color: '#f59e0b', codes: ['material'] },
    ]),
    getCategoryColor: vi.fn(() => '#6b7280'),
  }
})

// ═══════════════════════════════════
// 测试数据工厂
// ═══════════════════════════════════
function makeEntry(overrides?: Partial<CostLedgerEntry>): CostLedgerEntry {
  return {
    id: 1,
    date: '2025-03-01',
    direction: 'expense',
    category: 'material',
    counterparty: 'ABC建材',
    channel: '银行',
    amount: 5000,
    summary: '购买水泥',
    notes: '',
    voucherNo: '1',
    ...overrides,
  } as unknown as CostLedgerEntry
}

function makeSummary() {
  return { totalExpense: 5000, totalIncome: 0 }
}

// ═══════════════════════════════════
// 测试
// ═══════════════════════════════════
describe('CostLedgerList', () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear() })
  afterEach(() => { vi.restoreAllMocks() })

  test('渲染：传入 entries 后显示列表行', () => {
    const entries = [makeEntry()]
    render(
      <CostLedgerList
        entries={entries}
        summary={makeSummary()}
        loading={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    )
    expect(screen.getByTestId('cost-ledger-row')).toBeTruthy()
  })

  test('空状态：entries 为空时显示空提示', () => {
    render(
      <CostLedgerList
        entries={[]}
        summary={null}
        loading={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    )
    expect(screen.getByText('暂无台账记录')).toBeTruthy()
  })

  test('loading 状态：显示加载提示', () => {
    const { container } = render(
      <CostLedgerList
        entries={[]}
        summary={null}
        loading={true}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    )
    // loading 时显示 animate-pulse 骨架屏
    const pulses = container.querySelectorAll('.animate-pulse')
    expect(pulses.length).toBeGreaterThan(0)
  })
})
