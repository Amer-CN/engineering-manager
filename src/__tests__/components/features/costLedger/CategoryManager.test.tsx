/**
 * CategoryManager.tsx 测试
 *
 * 测试重点：
 * 1. 渲染测试：模态框显示/隐藏，支出/收入标签页
 * 2. 标签切换：切换支出/收入标签页
 * 3. 编辑分类：编辑 L2 分类
 * 4. 添加分类：添加新分类
 * 5. 删除分类：删除分类
 * 6. 恢复默认：恢复默认分类
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CategoryManager } from '@/components/features/costLedger/CategoryManager'
import type { CostLedgerCategory } from '@/types'

// ── Mock window.electronAPI ──
beforeEach(() => {
  // 确保 window.electronAPI 对象存在，然后设置 mock 方法
  if (!(window as any).electronAPI) {
    (window as any).electronAPI = {}
  }
  const api = (window as any).electronAPI
  // 分类管理相关 API
  api.getCostLedgerMatchRules = vi.fn().mockResolvedValue({ success: true, data: [] })
  api.updateCostLedgerCategory = vi.fn().mockResolvedValue({ success: true })
  api.deleteCostLedgerCategory = vi.fn().mockResolvedValue({ success: true })
  api.createCostLedgerCategory = vi.fn().mockResolvedValue({ success: true, data: { id: 99 } })
  api.resetCostLedgerCategories = vi.fn().mockResolvedValue({ success: true })
})

// ── 辅助：构造 mock 分类数据 ──
function makeCategories(): CostLedgerCategory[] {
  return [
    { id: 1, code: 'material', label: '材料费', direction: 'expense', color: '#f59e0b', isEnabled: true, isBuiltin: true },
    { id: 2, code: 'labor', label: '人工费', direction: 'expense', color: '#3b82f6', isEnabled: true, isBuiltin: true },
    { id: 3, code: 'custom_1', label: '自定义费', direction: 'expense', color: '#10b981', isEnabled: true, isBuiltin: false },
  ] as unknown as CostLedgerCategory[]
}

// ── 测试套件 ──
describe('CategoryManager', () => {
  test('渲染：传入 categories 后显示模态框', () => {
    const onClose = vi.fn()
    const onRefresh = vi.fn()
    render(
      <CategoryManager
        categories={makeCategories()}
        onClose={onClose}
        onRefresh={onRefresh}
      />
    )

    expect(screen.getByText('管理分类')).toBeTruthy()
  })

  test('渲染：不传入 categories 时不崩溃', () => {
    const onClose = vi.fn()
    const onRefresh = vi.fn()
    render(
      <CategoryManager
        categories={[]}
        onClose={onClose}
        onRefresh={onRefresh}
      />
    )

    expect(screen.getByText('管理分类')).toBeTruthy()
  })

  test('标签切换：点击「收入分类」切换标签', async () => {
    const onClose = vi.fn()
    const onRefresh = vi.fn()
    render(
      <CategoryManager
        categories={makeCategories()}
        onClose={onClose}
        onRefresh={onRefresh}
      />
    )

    // 默认显示「支出分类」
    expect(screen.getByText('支出分类')).toBeTruthy()

    // 点击「收入分类」
    fireEvent.click(screen.getByText('收入分类'))
    await waitFor(() => {
      expect(screen.getByText('收入分类')).toBeTruthy()
    })
  })

  test('关闭：点击 X 按钮触发 onClose', () => {
    const onClose = vi.fn()
    const onRefresh = vi.fn()
    render(
      <CategoryManager
        categories={makeCategories()}
        onClose={onClose}
        onRefresh={onRefresh}
      />
    )

    // 点击关闭按钮（×）
    const closeBtn = screen.getByText('✕')
    fireEvent.click(closeBtn)
    expect(onClose).toHaveBeenCalledOnce()
  })

  test('关闭：点击「关闭」按钮触发 onClose', () => {
    const onClose = vi.fn()
    const onRefresh = vi.fn()
    render(
      <CategoryManager
        categories={makeCategories()}
        onClose={onClose}
        onRefresh={onRefresh}
      />
    )

    fireEvent.click(screen.getByText('关闭'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  test('编辑 L2：点击「编辑」按钮进入编辑模式', async () => {
    const onClose = vi.fn()
    const onRefresh = vi.fn()
    render(
      <CategoryManager
        categories={makeCategories()}
        onClose={onClose}
        onRefresh={onRefresh}
      />
    )

    // 找到第一个「编辑」按钮并点击
    const editBtns = screen.getAllByText('编辑')
    expect(editBtns.length).toBeGreaterThan(0)
    fireEvent.click(editBtns[0])
    // 进入编辑模式后显示「保存」按钮
    await waitFor(() => {
      expect(screen.getByText('保存')).toBeTruthy()
    })
  })

  test('编辑 L2：保存编辑调用 updateCostLedgerCategory', async () => {
    const api = (window as any).electronAPI
    const onClose = vi.fn()
    const onRefresh = vi.fn()
    render(
      <CategoryManager
        categories={makeCategories()}
        onClose={onClose}
        onRefresh={onRefresh}
      />
    )

    // 找到 L2 分类「材料费」所在行的「编辑」按钮（不用 getAllByText 避免点到 L1 的编辑）
    const labelSpan = screen.getByText('材料费')
    const row = labelSpan.closest('div.flex.items-center.gap-2')
    expect(row).toBeTruthy()
    const editBtn = row!.querySelector('button') as HTMLElement
    expect(editBtn).toBeTruthy()
    fireEvent.click(editBtn!)

    // 等待「保存」按钮出现
    const saveBtn = await screen.findByText('保存')

    // 点击保存
    fireEvent.click(saveBtn)

    // 等待 API 被调用
    await waitFor(() => {
      expect(api.updateCostLedgerCategory).toHaveBeenCalled()
    }, { timeout: 3000 })

    // 保存成功后应触发 onRefresh
    await waitFor(() => {
      expect(onRefresh).toHaveBeenCalled()
    })
  })

  test('添加 L2：点击「+ 添加二级」显示输入框', async () => {
    const onClose = vi.fn()
    const onRefresh = vi.fn()
    render(
      <CategoryManager
        categories={makeCategories()}
        onClose={onClose}
        onRefresh={onRefresh}
      />
    )

    // 找到第一个「+ 添加二级」按钮
    const addBtns = screen.getAllByText(/\+ 添加二级/)
    expect(addBtns.length).toBeGreaterThan(0)
    fireEvent.click(addBtns[0])
    // 显示输入框
    await waitFor(() => {
      expect(screen.getByPlaceholderText('二级分类名')).toBeTruthy()
    })
  })

  test('新建一级分类：点击「+ 新建一级分类」显示输入框', async () => {
    const onClose = vi.fn()
    const onRefresh = vi.fn()
    render(
      <CategoryManager
        categories={makeCategories()}
        onClose={onClose}
        onRefresh={onRefresh}
      />
    )

    // 点击「+ 新建一级分类」
    const newBtn = screen.getByText('+ 新建一级分类')
    fireEvent.click(newBtn)
    // 显示一级和二级输入框
    await waitFor(() => {
      expect(screen.getByPlaceholderText('一级分类名')).toBeTruthy()
      expect(screen.getByPlaceholderText('第一个二级分类名')).toBeTruthy()
    })
  })

  test('恢复默认：点击「恢复默认」触发确认', async () => {
    // 模拟 confirm 返回 true
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const api = (window as any).electronAPI

    const onClose = vi.fn()
    const onRefresh = vi.fn()
    render(
      <CategoryManager
        categories={makeCategories()}
        onClose={onClose}
        onRefresh={onRefresh}
      />
    )

    // 点击「恢复默认」
    const resetBtn = screen.getByText('恢复默认')
    fireEvent.click(resetBtn)

    await waitFor(() => {
      expect(api.resetCostLedgerCategories).toHaveBeenCalled()
    })
  })

  test('学习规则视图：点击「学习规则」切换视图', async () => {
    const onClose = vi.fn()
    const onRefresh = vi.fn()
    render(
      <CategoryManager
        categories={makeCategories()}
        onClose={onClose}
        onRefresh={onRefresh}
      />
    )

    // 点击「学习规则 (0)」
    const rulesBtn = screen.getByText(/学习规则/)
    fireEvent.click(rulesBtn)
    // 切换到学习规则视图
    await waitFor(() => {
      expect(screen.getByText('暂无学习规则')).toBeTruthy()
    })
  })
})
