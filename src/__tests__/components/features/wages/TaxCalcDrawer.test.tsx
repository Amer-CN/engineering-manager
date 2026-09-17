/**
 * 个税引擎 Wave-T2 前端测试
 * TaxCalcDrawer：GS02 默认值 / 城市下拉 6 城切换 / 年终奖三态开关 / 结果展示 / 确认落库
 * WageRecordsTab：税额只读列（本期税额/累计口径说明）渲染
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

// ── Mock framer-motion（简化版，既有惯例）──
vi.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: () => (props: any) => React.createElement('div', props) }),
  AnimatePresence: ({ children }: any) => React.createElement(React.Fragment, null, children),
}))

// ── Mock 权限：全放行 ──
vi.mock('@/hooks/usePermission', () => ({
  usePermission: () => ({ can: () => true, canAny: () => true, isAdmin: () => true, isLoggedIn: () => true }),
}))

// ── Mock getAPI ──
const mockCalcTax = vi.fn()
const mockConfirmTax = vi.fn()
const SIX_CITIES = [
  { cityCode: 'beijing', cityName: '北京', effectiveYear: '2026', status: 'official' },
  { cityCode: 'shanghai', cityName: '上海', effectiveYear: '2026', status: '转载' },
  { cityCode: 'guangzhou', cityName: '广州', effectiveYear: '2025', status: '待核实' },
  { cityCode: 'shenzhen', cityName: '深圳', effectiveYear: '2025', status: '待核实' },
  { cityCode: 'sichuan', cityName: '四川', effectiveYear: '2026', status: '转载' },
  { cityCode: 'chengdu', cityName: '成都', effectiveYear: '2026', status: '转载' },
]
vi.mock('@/services/api-adapter', () => ({
  getAPI: async () => ({
    getTaxCities: async () => ({ success: true, data: SIX_CITIES }),
    calcTax: (...args: any[]) => mockCalcTax(...args),
    confirmTax: (...args: any[]) => mockConfirmTax(...args),
  }),
}))

const { TaxCalcDrawer } = await import('@/components/features/payroll/TaxCalcDrawer')
const { default: WageRecordsTab, taxLedgerKey } = await import('@/components/features/wages/WageRecordsTab')

const CALC_RESULT = {
  currentWithholdingYuan: 500,
  firstNote: '本年首次测算',
  calcNote: '累计口径：累计收入20000元 − 累计减除40000元 = 累计应纳税0元',
  bonus: {
    amountYuan: 12000,
    separateTaxYuan: 360,
    combinedExtraYuan: 0,
    recommended: 'combined',
    mode: 'combined',
    savingYuan: 360,
    lawRef: '国税发〔2005〕9号方法 + 财税〔2018〕164号 + 财政部 税务总局公告2023年第30号（执行至2027-12-31）',
  },
}

function renderDrawer() {
  return render(React.createElement(TaxCalcDrawer, {
    open: true,
    onClose: vi.fn(),
    mode: 'staff',
    people: [{ id: 1, name: '张三' }],
    defaultYearMonth: '2026-08',
  }))
}

describe('TaxCalcDrawer', () => {
  beforeEach(() => {
    mockCalcTax.mockReset()
    mockConfirmTax.mockReset()
    mockCalcTax.mockResolvedValue({ success: true, data: CALC_RESULT })
    mockConfirmTax.mockResolvedValue({ success: true, data: { ledgerId: 7 } })
  })

  test('专项扣除默认值 = GS02（2000/2000/400/1000/1500/3000，大病医疗仅说明）', async () => {
    renderDrawer()
    await waitFor(() => expect(screen.getByText('北京（2026 · official）')).toBeTruthy())
    const inputs = screen.getAllByRole('textbox') as HTMLInputElement[]
    const values = inputs.map(i => i.value)
    // 子女2000、婴幼儿2000、继续教育400、房贷1000、赡养3000
    expect(values).toContain('2000')
    expect(values).toContain('400')
    expect(values).toContain('1000')
    expect(values).toContain('3000')
    // 租金三档默认 1500
    const rentSelect = screen.getByDisplayValue(/1500/) as HTMLSelectElement
    expect(rentSelect.value).toBe('1500')
    // 大病医疗不可月输说明
    expect(screen.getByText(/大病医疗不可按月输入/)).toBeTruthy()
    // 三态开关默认自动择优
    expect(screen.getByRole('button', { name: '自动择优' }).getAttribute('aria-pressed')).toBe('true')
  })

  test('城市下拉含 6 城；切换城市后试算 payload 跟随', async () => {
    renderDrawer()
    await waitFor(() => expect(screen.getByText('成都（2026 · 转载）')).toBeTruthy())
    for (const name of ['北京', '上海', '广州', '深圳', '四川', '成都']) {
      expect(screen.getByText(new RegExp(name))).toBeTruthy()
    }
    const citySelect = screen.getByDisplayValue(/成都/) as HTMLSelectElement
    fireEvent.change(citySelect, { target: { value: 'beijing' } })
    fireEvent.click(screen.getByRole('button', { name: '试算' }))
    await waitFor(() => expect(mockCalcTax).toHaveBeenCalled())
    expect(mockCalcTax.mock.calls[0][0].cityCode).toBe('beijing')
    expect(mockCalcTax.mock.calls[0][0].memberId).toBe(1)
  })

  test('年终奖三态开关：单独计税 payload bonusMode=separate', async () => {
    renderDrawer()
    await waitFor(() => expect(screen.getByText('北京（2026 · official）')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: '单独计税' }))
    expect(screen.getByRole('button', { name: '单独计税' }).getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: '试算' }))
    await waitFor(() => expect(mockCalcTax).toHaveBeenCalled())
    expect(mockCalcTax.mock.calls[0][0].bonusMode).toBe('separate')
  })

  test('结果区展示两种方式 + 建议 + 差额 + 累计口径 + lawRef（含30号）', async () => {
    renderDrawer()
    await waitFor(() => expect(screen.getByText('北京（2026 · official）')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: '试算' }))
    await waitFor(() => expect(screen.getByText('¥360')).toBeTruthy())
    expect(screen.getByText('¥500')).toBeTruthy()
    expect(screen.getByText(/并入综合（省/)).toBeTruthy()
    expect(screen.getByText('本期预扣')).toBeTruthy()
    expect(screen.getByText(/累计口径/)).toBeTruthy()
    expect(screen.getByText(/2023年第30号/)).toBeTruthy()
  })

  test('确认落库调用 confirm-tax（同 payload）', async () => {
    renderDrawer()
    await waitFor(() => expect(screen.getByText('北京（2026 · official）')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: '试算' }))
    await waitFor(() => expect(mockCalcTax).toHaveBeenCalled())
    fireEvent.click(screen.getByRole('button', { name: '确认落库' }))
    await waitFor(() => expect(mockConfirmTax).toHaveBeenCalled())
    expect(mockConfirmTax.mock.calls[0][0].cityCode).toBe('chengdu')
    expect(mockConfirmTax.mock.calls[0][0].bonusMode).toBe('auto')
  })
})

describe('WageRecordsTab 税额只读列', () => {
  const baseProps = {
    allWageRecords: [{
      id: 1, projectId: 1, memberId: 1, yearMonth: '2026-08',
      dailyWage: 300, workDays: 25, bonus: 0, deduction: 0, actualWage: 7500,
      createdAt: '', updatedAt: '',
    }],
    filterYearMonth: '2026-08',
    filterMemberName: '',
    selectedIds: new Set<number>(),
    paymentEdits: new Map(),
    onFilterYearMonthChange: vi.fn(),
    onFilterNameChange: vi.fn(),
    onPaymentChange: vi.fn(),
    onSavePayments: vi.fn(),
    onBankReceiptUpload: vi.fn(),
    onOpenBatchReceipt: vi.fn(),
    showBatchReceipt: false,
    receiptParsing: false,
    receiptResult: null,
    toggleSelect: vi.fn(),
    toggleAll: vi.fn(),
    onBatchDelete: vi.fn(),
    onBatchArchive: vi.fn(),
  }

  test('有 ledger 行：本期税额 + 累计口径说明渲染', () => {
    const key = taxLedgerKey({ memberId: 1, yearMonth: '2026-08' } as any)
    render(React.createElement(WageRecordsTab, {
      ...baseProps,
      taxLedgerMap: { [key]: { paidTaxYuan: 123.45, calcNote: '累计口径：累计收入20000元' } },
    }))
    expect(screen.getByText('本期税额')).toBeTruthy()
    expect(screen.getByText('累计口径说明')).toBeTruthy()
    expect(screen.getByText('¥123.45')).toBeTruthy()
    expect(screen.getByTitle('累计口径：累计收入20000元')).toBeTruthy()
  })

  test('无 ledger 行：只读列显示 -，不报错', () => {
    render(React.createElement(WageRecordsTab, baseProps))
    expect(screen.getByText('本期税额')).toBeTruthy()
    expect(screen.getByText('累计口径说明')).toBeTruthy()
    expect(screen.getAllByText('-').length).toBeGreaterThan(0)
  })
})
