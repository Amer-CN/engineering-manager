// @ts-nocheck
/**
 * PartnerSelect 组件测试
 * - 搜索、分组、选择回调
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PartnerSelect } from '@/components/features/partners/PartnerSelect'
import { mockPartnerList } from '@/__tests__/fixtures'

describe('PartnerSelect', () => {
  const defaultProps = {
    partners: mockPartnerList,
    value: null as number | null,
    onChange: vi.fn() as unknown as (partnerId: number | null) => void,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders placeholder when no value', () => {
    render(<PartnerSelect {...defaultProps} />)
    expect(screen.getByText('选择单位')).toBeInTheDocument()
  })

  it('shows selected partner name when value is set', () => {
    render(<PartnerSelect {...defaultProps} value={1} />)
    expect(screen.getByText('成都金图腾建筑劳务有限公司')).toBeInTheDocument()
  })

  it('opens dropdown on click', async () => {
    const user = userEvent.setup()
    render(<PartnerSelect {...defaultProps} />)
    await user.click(screen.getByRole('button'))
    // 下拉面板打开后显示单位名称
    expect(await screen.findByText('成都金图腾建筑劳务有限公司')).toBeInTheDocument()
  })

  it('groups partners by category', async () => {
    const user = userEvent.setup()
    render(<PartnerSelect {...defaultProps} />)
    await user.click(screen.getByRole('button'))
    // 检查分类标签（劳务分包、总承包、材料供应）
    expect(await screen.findByText('劳务分包')).toBeInTheDocument()
    expect(await screen.findByText('总承包')).toBeInTheDocument()
    expect(await screen.findByText('材料供应')).toBeInTheDocument()
  })

  it('filters partners by search term', async () => {
    const user = userEvent.setup()
    render(<PartnerSelect {...defaultProps} />)
    await user.click(screen.getByRole('button'))
    // 搜索"金图腾"
    const searchInput = screen.getByPlaceholderText('搜索单位名称、联系人...')
    await user.type(searchInput, '金图腾')
    expect(await screen.findByText('成都金图腾建筑劳务有限公司')).toBeInTheDocument()
    expect(screen.queryByText('中建一局')).not.toBeInTheDocument()
  })

  it('filters by category button', async () => {
    const user = userEvent.setup()
    render(<PartnerSelect {...defaultProps} />)
    await user.click(screen.getByRole('button'))
    // 点击"材料供应"分类按钮
    await user.click(await screen.findByText('材料供应'))
    expect(screen.queryByText('成都金图腾建筑劳务有限公司')).not.toBeInTheDocument()
    expect(await screen.findByText('华强材料')).toBeInTheDocument()
  })

  it('calls onChange when partner selected', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<PartnerSelect {...defaultProps} onChange={onChange} />)
    await user.click(screen.getByRole('button'))
    await user.click(await screen.findByText('成都金图腾建筑劳务有限公司'))
    expect(onChange).toHaveBeenCalledWith(1)
  })

  it('closes dropdown after selection', async () => {
    const user = userEvent.setup()
    render(<PartnerSelect {...defaultProps} />)
    await user.click(screen.getByRole('button'))
    await user.click(await screen.findByText('成都金图腾建筑劳务有限公司'))
    // 下拉面板应关闭（"搜索单位名称"输入框应消失）
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('搜索单位名称、联系人...')).not.toBeInTheDocument()
    })
  })

  // 注：选中项勾选图标通过 SVG 存在性验证，暂略

  it('clears selection when clear button clicked', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<PartnerSelect {...defaultProps} value={1} onChange={onChange} />)
    await user.click(screen.getByRole('button'))
    // 点击"清空选择"按钮
    const clearBtn = await screen.findByText('清空选择')
    await user.click(clearBtn)
    expect(onChange).toHaveBeenCalledWith(null)
  })
})
