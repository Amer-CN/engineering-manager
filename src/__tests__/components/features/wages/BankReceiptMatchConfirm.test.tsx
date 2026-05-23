/**
 * BankReceiptMatchConfirm.tsx 测试
 *
 * 测试重点：
 * 1. 渲染测试：模态框显示/隐藏
 * 2. 匹配结果显示：正确显示匹配的员工和金额
 * 3. 确认操作：点击确认按钮调用回调
 * 4. 拒绝操作：点击拒绝按钮调用回调
 * 5. 错误处理：API 调用失败时的错误提示
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import BankReceiptMatchConfirm from '@/components/features/wages/BankReceiptMatchConfirm'
import type { BatchParseResult, BankReceiptMatch } from '@/types'

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

// ── 辅助：构造 mock 数据 ──
function makeParseResult(overrides: Partial<BatchParseResult> = {}): BatchParseResult {
  return {
    success: true,
    totalRows: 2,
    matches: [
      {
        parsedName: '张三',
        parsedAmount: 5000,
        parsedDate: '2025-03-15',
        receiptPath: '/tmp/receipt1.jpg',
        matchedWorkerId: 1,
        matchedWorkerName: '张三',
        matchedWageId: 101,
        confidence: 85,
        status: 'matched',
      },
      {
        parsedName: '李四',
        parsedAmount: 4200,
        parsedDate: '2025-03-20',
        receiptPath: '/tmp/receipt2.jpg',
        matchedWorkerId: null,
        matchedWorkerName: null,
        matchedWageId: null,
        confidence: 30,
        status: 'unmatched',
      },
    ],
    ...overrides,
  }
}

function makeWorkers() {
  return [
    { id: 1, name: '张三' },
    { id: 2, name: '李四' },
  ]
}

function makeWageRecords() {
  return [
    { id: 101, memberName: '张三', actualWage: 5000, yearMonth: '2025-03' },
    { id: 102, memberName: '李四', actualWage: 4200, yearMonth: '2025-03' },
  ]
}

// ── 测试套件 ──
describe('BankReceiptMatchConfirm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('渲染：传入 parseResult 后显示匹配结果表格', () => {
    const onConfirm = vi.fn()
    const onBack = vi.fn()
    const onCancel = vi.fn()
    const result = makeParseResult()

    render(
      <BankReceiptMatchConfirm
        parseResult={result}
        workers={makeWorkers()}
        wageRecords={makeWageRecords()}
        onConfirm={onConfirm}
        onBack={onBack}
        onCancel={onCancel}
      />
    )

    // 显示标题
    expect(screen.getByText('匹配结果确认')).toBeTruthy()
    // 显示解析金额
    expect(screen.getByText('¥5000.00')).toBeTruthy()
    expect(screen.getByText('¥4200.00')).toBeTruthy()
    // 显示统计卡片
    expect(screen.getByText('总计')).toBeTruthy()
  })

  test('渲染：空匹配结果时仍显示统计（0条）', () => {
    const onConfirm = vi.fn()
    const onBack = vi.fn()
    const onCancel = vi.fn()
    const result = makeParseResult({ matches: [], totalRows: 0 })

    render(
      <BankReceiptMatchConfirm
        parseResult={result}
        workers={[]}
        wageRecords={[]}
        onConfirm={onConfirm}
        onBack={onBack}
        onCancel={onCancel}
      />
    )

    expect(screen.getByText('匹配结果确认')).toBeTruthy()
    // 总计应为 0
    const totalEls = screen.getAllByText('0')
    expect(totalEls.length).toBeGreaterThan(0)
  })

  test('按钮：点击"返回重新上传"触发 onBack', () => {
    const onBack = vi.fn()
    render(
      <BankReceiptMatchConfirm
        parseResult={makeParseResult()}
        workers={makeWorkers()}
        wageRecords={makeWageRecords()}
        onConfirm={vi.fn()}
        onBack={onBack}
        onCancel={vi.fn()}
      />
    )

    fireEvent.click(screen.getByText('返回重新上传'))
    expect(onBack).toHaveBeenCalledOnce()
  })

  test('按钮：点击"取消"触发 onCancel', () => {
    const onCancel = vi.fn()
    render(
      <BankReceiptMatchConfirm
        parseResult={makeParseResult()}
        workers={makeWorkers()}
        wageRecords={makeWageRecords()}
        onConfirm={vi.fn()}
        onBack={vi.fn()}
        onCancel={onCancel}
      />
    )

    fireEvent.click(screen.getByText('取消'))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  test('统计：置信度≥80% 的高置信度匹配数量正确', () => {
    const result = makeParseResult()
    render(
      <BankReceiptMatchConfirm
        parseResult={result}
        workers={makeWorkers()}
        wageRecords={makeWageRecords()}
        onConfirm={vi.fn()}
        onBack={vi.fn()}
        onCancel={vi.fn()}
      />
    )

    // 高置信度匹配数量为 1（第一条 confidence=85）
    // 查找包含「高置信度」的段落，其兄弟元素应为「1」
    const el = screen.getByText((content, el) =>
      content === '1' && el?.tagName === 'SPAN'
    )
    expect(el).toBeTruthy()
  })

  test('底部确认按钮：点击"确认并提交"触发 onConfirm（有有效匹配时）', async () => {
    const onConfirm = vi.fn()
    render(
      <BankReceiptMatchConfirm
        parseResult={makeParseResult()}
        workers={makeWorkers()}
        wageRecords={makeWageRecords()}
        onConfirm={onConfirm}
        onBack={vi.fn()}
        onCancel={vi.fn()}
      />
    )

    // 组件内有两个「确认并提交」按钮（顶部和底部），取最后一个
    const buttons = screen.getAllByText('确认并提交')
    fireEvent.click(buttons[buttons.length - 1])
    // onConfirm 被调用，传入有效匹配（matchedWageId 非 null 的）
    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledOnce()
    })
    const calledArg = onConfirm.mock.calls[0][0]
    expect(Array.isArray(calledArg)).toBe(true)
  })

  test('一键确认高置信度：有高置信度匹配时点击触发 onConfirm', async () => {
    const onConfirm = vi.fn()
    render(
      <BankReceiptMatchConfirm
        parseResult={makeParseResult()}
        workers={makeWorkers()}
        wageRecords={makeWageRecords()}
        onConfirm={onConfirm}
        onBack={vi.fn()}
        onCancel={vi.fn()}
      />
    )

    const btn = screen.getByText(/一键确认高置信度/)
    fireEvent.click(btn)
    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledOnce()
    })
  })

  test('一键确认高置信度：无高置信度匹配时按钮为禁用状态', () => {
    const result = makeParseResult({
      matches: [
        {
          parsedName: '张三',
          parsedAmount: 5000,
          parsedDate: '2025-03-15',
          receiptPath: '/tmp/r.jpg',
          matchedWorkerId: null,
          matchedWorkerName: null,
          matchedWageId: null,
          confidence: 30,
          status: 'unmatched',
        },
      ],
    })
    render(
      <BankReceiptMatchConfirm
        parseResult={result}
        workers={makeWorkers()}
        wageRecords={makeWageRecords()}
        onConfirm={vi.fn()}
        onBack={vi.fn()}
        onCancel={vi.fn()}
      />
    )

    // 无高置信度匹配时按钮应为禁用状态
    const btn = screen.getByText(/一键确认高置信度/)
    expect(btn).toBeDisabled()
  })
})
