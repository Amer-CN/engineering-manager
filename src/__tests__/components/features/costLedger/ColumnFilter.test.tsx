// @ts-nocheck
/**
 * ColumnFilter 组件测试
 * - 渲染筛选按钮
 * - 点击打开/关闭弹出层
 * - 搜索过滤
 * - 全选/清除
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ═══════════════════════════════════════════════
// Mock：DateFilterTree 组件（用别名匹配组件中的模块）
// ═══════════════════════════════════════════════
vi.mock('@/components/features/costLedger/DateFilterTree', () => ({
  DateFilterTree: vi.fn(({ values, checked, toggle, setAll, clear }: any) => (
    <div data-testid="date-filter-tree">
      {values.map((v: string) => (
        <label key={v}>
          <input
            type="checkbox"
            checked={checked.has(v)}
            onChange={() => toggle(v)}
          />
          <span>{v}</span>
        </label>
      ))}
      <button type="button" onClick={() => setAll(values)}>全选</button>
      <button type="button" onClick={clear}>清除</button>
    </div>
  )),
}))

// ═══════════════════════════════════════════════
// 动态 import —— ColumnFilter 是 named export
// ═══════════════════════════════════════════════
const importModule = async () => {
  const mod = await import('@/components/features/costLedger/ColumnFilter')
  return { ColumnFilter: mod.ColumnFilter }
}

describe('ColumnFilter', () => {
  const mockOnToggle = vi.fn()
  const mockOnSetAll = vi.fn()
  const mockOnClear = vi.fn()

  const baseProps = {
    col: 'counterparty' as const,
    colValues: {
      counterparties: ['甲方A', '乙方B'],
      channels: ['银行转账'],
      voucherNos: ['V001'],
      summaries: ['材料费'],
      notesList: ['备注A'],
      dates: ['2025-01-01', '2025-02-01'],
      amounts: ['100.00'],
    },
    checkedCounterparties: new Set<string>(),
    checkedChannels: new Set<string>(),
    checkedVoucherNos: new Set<string>(),
    checkedSummaries: new Set<string>(),
    checkedNotesSet: new Set<string>(),
    checkedDates: new Set<string>(),
    checkedAmounts: new Set<string>(),
    onToggleCounterparty: mockOnToggle,
    onToggleChannel: mockOnToggle,
    onToggleVoucherNo: mockOnToggle,
    onToggleSummary: mockOnToggle,
    onToggleNote: mockOnToggle,
    onToggleDate: mockOnToggle,
    onToggleAmount: mockOnToggle,
    onSetAllCounterparties: mockOnSetAll,
    onSetAllChannels: mockOnSetAll,
    onSetAllVoucherNos: mockOnSetAll,
    onSetAllSummaries: mockOnSetAll,
    onSetAllNotes: mockOnSetAll,
    onSetAllDates: mockOnSetAll,
    onSetAllAmounts: mockOnSetAll,
    onClearCounterparties: mockOnClear,
    onClearChannels: mockOnClear,
    onClearVoucherNos: mockOnClear,
    onClearSummaries: mockOnClear,
    onClearNotes: mockOnClear,
    onClearDates: mockOnClear,
    onClearAmounts: mockOnClear,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders filter button', async () => {
    const { ColumnFilter } = await importModule()
    render(<ColumnFilter {...baseProps} />)
    // 筛选按钮（漏斗图标）
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('opens popup on button click', async () => {
    const user = userEvent.setup()
    const { ColumnFilter } = await importModule()
    render(<ColumnFilter {...baseProps} />)
    const btn = screen.getByRole('button')
    await user.click(btn)
    // 弹出层应包含搜索框
    await waitFor(() => {
      expect(screen.getByPlaceholderText('搜索...')).toBeInTheDocument()
    })
  })

  it('closes popup on outside click', async () => {
    const user = userEvent.setup()
    const { ColumnFilter } = await importModule()
    render(<ColumnFilter {...baseProps} />)
    const btn = screen.getByRole('button')
    // 打开
    await user.click(btn)
    await waitFor(() => {
      expect(screen.getByPlaceholderText('搜索...')).toBeInTheDocument()
    })
    // 点击外部（body）
    await user.click(document.body)
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('搜索...')).not.toBeInTheDocument()
    })
  })

  it('renders value list for non-date columns', async () => {
    const user = userEvent.setup()
    const { ColumnFilter } = await importModule()
    render(<ColumnFilter {...baseProps} />)
    await user.click(screen.getByRole('button'))
    // counterparties 的值应显示
    await waitFor(() => {
      expect(screen.getByText('甲方A')).toBeInTheDocument()
    })
    expect(screen.getByText('乙方B')).toBeInTheDocument()
  })

  it('renders date filter tree for date column', async () => {
    const user = userEvent.setup()
    const { ColumnFilter } = await importModule()
    render(<ColumnFilter {...baseProps} col="date" />)
    await user.click(screen.getByRole('button'))
    // DateFilterTree mock 应渲染
    await waitFor(() => {
      expect(screen.getByTestId('date-filter-tree')).toBeInTheDocument()
    })
  })

  it('search filters values', async () => {
    const user = userEvent.setup()
    const { ColumnFilter } = await importModule()
    render(<ColumnFilter {...baseProps} />)
    await user.click(screen.getByRole('button'))
    const searchInput = await screen.findByPlaceholderText('搜索...') as HTMLInputElement
    await user.type(searchInput, '甲方')
    // 应只显示匹配项
    expect(await screen.findByText('甲方A')).toBeInTheDocument()
    expect(screen.queryByText('乙方B')).not.toBeInTheDocument()
  })
})
