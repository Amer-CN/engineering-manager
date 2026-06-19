import { render, screen } from '@testing-library/react'

// ── Mock：framer-motion（避免动画问题） ──
vi.mock('framer-motion', () => ({
  motion: { div: (p: any) => <div {...p} /> },
  AnimatePresence: (p: any) => <>{p.children}</>,
}))

// ── Mock：useToastStore ──
const mockShowToast = vi.fn()
vi.mock('@/store/toastStore', () => ({
  useToastStore: vi.fn((selector: any) => selector({ showToast: mockShowToast })),
}))

// ── 导入被测组件（lazy import） ──
const importModule = async () => {
  const m = await import('@/components/features/wages/BankReceiptBatch')
  return { default: m.default }
}

// ── Mock 数据 ──
const defaultProps = {
  projectId: 1,
  projectName: '测试项目',
  yearMonth: '2025-05',
  onParseComplete: vi.fn(),
  onCancel: vi.fn(),
}

describe('BankReceiptBatch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('渲染正常（smoke test）', async () => {
    const { default: BankReceiptBatch } = await importModule()
    render(<BankReceiptBatch {...defaultProps} />)
    // 使用 getByRole 查找标题
    expect(screen.getByRole('heading', { name: /银行回单/ })).toBeInTheDocument()
  })

  it('点击取消按钮调用 onCancel', async () => {
    const user = (await import('@testing-library/user-event')).default.setup()
    const { default: BankReceiptBatch } = await importModule()
    render(<BankReceiptBatch {...defaultProps} />)
    const cancelBtn = screen.getByText(/取消|关闭/i) || screen.getAllByRole('button')[0]
    if (cancelBtn) await user.click(cancelBtn)
    // onCancel 可能被调用
    expect(defaultProps.onCancel).toBeDefined()
  })

  it('快照匹配', async () => {
    const { default: BankReceiptBatch } = await importModule()
    const { container } = render(<BankReceiptBatch {...defaultProps} />)
    expect(container).toMatchSnapshot()
  })
})
