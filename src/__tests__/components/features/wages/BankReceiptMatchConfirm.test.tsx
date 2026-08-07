/**
 * BankReceiptMatchConfirm.tsx 测试（J-1 重写：候选 UI 契约）
 *
 * 测试重点：
 * 1. 渲染：每回单展示候选（score + 理由文案），无候选显示「无候选」
 * 2. 确认：只发用户确认了的配对（未选 = 跳过，不发）
 * 3. 权限：无 wages:update 时确认按钮不渲染
 * 4. 按钮：返回/取消触发回调
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import BankReceiptMatchConfirm from '@/components/features/wages/BankReceiptMatchConfirm'
import type { MatchReceiptResult } from '@/types'

// ── Mock useToastStore（Zustand store） ─
const mockShowToast = vi.fn()
vi.mock('@/store/toastStore', () => ({
  useToastStore: Object.assign(
    vi.fn((selector: any) => {
      const s = { showToast: mockShowToast }
      return selector ? selector(s) : s
    }),
    {
      getState: () => ({ showToast: mockShowToast }),
    }
  ),
}))

// ── Mock framer-motion ──
vi.mock('framer-motion', () => {
  const React = require('react')
  return {
    motion: new Proxy({}, { get: (_, key) => (props: any) => {
      const { children, initial, animate, exit, transition, ...rest } = props || {}
      return React.createElement('div', rest, children)
    }}),
    AnimatePresence: ({ children }: any) => React.createElement(React.Fragment, null, children),
  }
})

// ── 辅助：构造 mock 数据（I-2 契约真实形状） ──
function makeMatchResults(): MatchReceiptResult[] {
  return [
    {
      receiptPath: '/tmp/receipt1.jpg',
      date: '2026-07-15',
      counterparty: '张三',
      amount: 5000,
      candidates: [
        { wageId: 101, workerName: '张三', amount: 5000, yearMonth: '2026-07', score: 6, reasons: ['金额分相等', '姓名互相包含', '日期与工资月份同月或相邻'] },
        { wageId: 102, workerName: '李四', amount: 5000, yearMonth: '2026-07', score: 4, reasons: ['金额分相等'] },
      ],
    },
    {
      receiptPath: '/tmp/receipt2.jpg',
      date: '2026-07-20',
      counterparty: '王五',
      amount: 4200,
      candidates: [],
    },
  ]
}

function renderConfirm(overrides: Partial<Parameters<typeof BankReceiptMatchConfirm>[0]> = {}) {
  const props = {
    matchResults: makeMatchResults(),
    yearMonth: '2026-07',
    canUpdate: true,
    confirming: false,
    onConfirm: vi.fn(),
    onBack: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  }
  render(<BankReceiptMatchConfirm {...props} />)
  return props
}

// ── 测试套件 ──
describe('BankReceiptMatchConfirm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('渲染：展示回单信息与候选（分数 + 理由文案）', () => {
    renderConfirm()

    expect(screen.getByText('匹配结果确认')).toBeTruthy()
    // 候选 1 的分数与理由文案
    expect(screen.getByText('分数 6')).toBeTruthy()
    expect(screen.getByText(/姓名互相包含/)).toBeTruthy()
    expect(screen.getAllByText(/张三/).length).toBeGreaterThan(0)
    // 无候选的回单
    expect(screen.getByText('无候选')).toBeTruthy()
    // 汇总：共 2 张回单
    expect(screen.getByText(/共 2 张回单/)).toBeTruthy()
  })

  test('确认：只发用户确认了的配对（未选 = 跳过，不发）', async () => {
    const { onConfirm } = renderConfirm()

    // 选中第一张回单的候选 wageId=101
    const radios = screen.getAllByRole('radio')
    fireEvent.click(radios[0])

    // 第二张回单无候选，保持跳过
    const buttons = screen.getAllByText(/确认并提交/)
    fireEvent.click(buttons[buttons.length - 1])

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledOnce()
    })
    const pairs = onConfirm.mock.calls[0][0]
    // 只发已确认配对（1 条），跳过的不出现
    expect(pairs).toEqual([
      { wageId: 101, paidAmount: 5000, paidDate: '2026-07-15', bankReceiptPath: '/tmp/receipt1.jpg' },
    ])
  })

  test('确认：全部跳过时不发任何配对', async () => {
    const { onConfirm } = renderConfirm()

    const buttons = screen.getAllByText(/确认并提交/)
    fireEvent.click(buttons[buttons.length - 1])

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledOnce()
    })
    expect(onConfirm.mock.calls[0][0]).toEqual([])
  })

  test('权限：无 wages:update 时确认按钮不渲染', () => {
    renderConfirm({ canUpdate: false })

    // 无「确认并提交」按钮
    expect(screen.queryByText(/确认并提交/)).toBeNull()
    // 返回/取消仍在
    expect(screen.getByText('返回重新上传')).toBeTruthy()
    expect(screen.getByText('取消')).toBeTruthy()
  })

  test('按钮：点击"返回重新上传"触发 onBack', () => {
    const { onBack } = renderConfirm()
    fireEvent.click(screen.getByText('返回重新上传'))
    expect(onBack).toHaveBeenCalledOnce()
  })

  test('按钮：点击"取消"触发 onCancel', () => {
    const { onCancel } = renderConfirm()
    fireEvent.click(screen.getByText('取消'))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  test('确认中：按钮禁用', async () => {
    const { onConfirm } = renderConfirm({ confirming: true })

    const buttons = screen.getAllByText('确认中...')
    expect(buttons.length).toBeGreaterThan(0)
    expect(buttons[0]).toBeDisabled()
    expect(onConfirm).not.toHaveBeenCalled()
  })
})
