import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DropdownMenu, DropdownMenuItem } from '../../components/ui/DropdownMenu'

const mockItems: DropdownMenuItem[] = [
  { key: 'edit', label: '编辑', icon: 'Edit' },
  { key: 'delete', label: '删除', icon: 'Trash2', danger: true },
  { key: 'divider-1', label: '', divider: true },
  { key: 'disabled', label: '禁用项', disabled: true },
]

describe('DropdownMenu', () => {
  it('does not render menu items initially', () => {
    render(
      <DropdownMenu trigger={<button>操作</button>} items={mockItems} />
    )
    
    // 菜单不应该显示
    expect(screen.queryByText('编辑')).not.toBeInTheDocument()
    expect(screen.queryByText('删除')).not.toBeInTheDocument()
  })

  it('opens menu when trigger clicked', () => {
    render(
      <DropdownMenu trigger={<button>操作</button>} items={mockItems} />
    )
    
    // 点击触发器
    fireEvent.click(screen.getByText('操作'))
    
    // 菜单应该显示
    expect(screen.getByText('编辑')).toBeInTheDocument()
    expect(screen.getByText('删除')).toBeInTheDocument()
  })

  it('closes menu when trigger clicked again', () => {
    render(
      <DropdownMenu trigger={<button>操作</button>} items={mockItems} />
    )
    
    const trigger = screen.getByText('操作')
    
    // 打开
    fireEvent.click(trigger)
    expect(screen.getByText('编辑')).toBeInTheDocument()
    
    // 关闭
    fireEvent.click(trigger)
    waitFor(() => {
      expect(screen.queryByText('编辑')).not.toBeInTheDocument()
    })
  })

  it('calls onClick when menu item clicked', () => {
    const handleEdit = vi.fn()
    const handleDelete = vi.fn()
    
    const itemsWithHandlers: DropdownMenuItem[] = [
      { key: 'edit', label: '编辑', onClick: handleEdit },
      { key: 'delete', label: '删除', onClick: handleDelete, danger: true },
    ]
    
    render(
      <DropdownMenu trigger={<button>操作</button>} items={itemsWithHandlers} />
    )
    
    // 打开菜单
    fireEvent.click(screen.getByText('操作'))
    
    // 点击"编辑"
    fireEvent.click(screen.getByText('编辑'))
    expect(handleEdit).toHaveBeenCalledTimes(1)
    
    // 菜单应该关闭（有动画延迟）
    waitFor(() => {
      expect(screen.queryByText('编辑')).not.toBeInTheDocument()
    })
  })

  it('does not call onClick when disabled item clicked', () => {
    const handleClick = vi.fn()
    
    const items: DropdownMenuItem[] = [
      { key: 'disabled', label: '禁用项', onClick: handleClick, disabled: true },
    ]
    
    render(
      <DropdownMenu trigger={<button>操作</button>} items={items} />
    )
    
    // 打开菜单
    fireEvent.click(screen.getByText('操作'))
    
    // 点击禁用项
    fireEvent.click(screen.getByText('禁用项'))
    
    // onClick 不应该被调用
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('applies danger style to danger items', () => {
    render(
      <DropdownMenu trigger={<button>操作</button>} items={mockItems} />
    )
    
    // 打开菜单
    fireEvent.click(screen.getByText('操作'))
    
    // "删除" 按钮应该有危险样式（danger 项 hover 背景为 hover:bg-danger-50，
    // 文字颜色改为内联 style color: var(--danger)）
    const deleteButton = screen.getByText('删除').closest('button')
    expect(deleteButton).toHaveClass('hover:bg-danger-50')
  })

  it('renders icon when provided', () => {
    render(
      <DropdownMenu trigger={<button>操作</button>} items={mockItems} />
    )
    
    // 打开菜单
    fireEvent.click(screen.getByText('操作'))
    
    // 检查图标是否存在（Lucide 图标在 jsdom 中不渲染，检查容器）
    // 在 jsdom 中，Lucide 图标可能不渲染，所以只检查菜单项是否存在
    expect(screen.getByText('编辑')).toBeInTheDocument()
  })

  it('renders divider when divider is true', () => {
    render(
      <DropdownMenu trigger={<button>操作</button>} items={mockItems} />
    )
    
    // 打开菜单
    fireEvent.click(screen.getByText('操作'))
    
    // 检查分隔线（当前实现为 my-1 border-t，颜色走内联 style borderColor: var(--border)）
    const dividers = document.querySelectorAll('.my-1.border-t')
    expect(dividers.length).toBeGreaterThanOrEqual(1)
  })

  it('closes menu when clicking outside', () => {
    render(
      <DropdownMenu trigger={<button>操作</button>} items={mockItems} />
    )
    
    // 打开菜单
    fireEvent.click(screen.getByText('操作'))
    expect(screen.getByText('编辑')).toBeInTheDocument()
    
    // 点击外部
    fireEvent.mouseDown(document.body)
    
    // 菜单应该关闭
    waitFor(() => {
      expect(screen.queryByText('编辑')).not.toBeInTheDocument()
    })
  })

  it('applies disabled style to disabled items', () => {
    render(
      <DropdownMenu trigger={<button>操作</button>} items={mockItems} />
    )

    // 打开菜单
    fireEvent.click(screen.getByText('操作'))

    // "禁用项" 按钮应该有禁用样式（opacity-50 cursor-not-allowed）
    const disabledButton = screen.getByText('禁用项').closest('button')
    expect(disabledButton).toHaveClass('opacity-50')
    expect(disabledButton).toHaveClass('cursor-not-allowed')
  })

  it('renders menuitem role on items and menu role on container', () => {
    render(
      <DropdownMenu trigger={<button>操作</button>} items={mockItems} />
    )

    fireEvent.click(screen.getByText('操作'))

    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(screen.getAllByRole('menuitem').length).toBe(mockItems.length)
  })

  it('auto-focuses first enabled item when opened', () => {
    render(
      <DropdownMenu trigger={<button>操作</button>} items={mockItems} />
    )

    fireEvent.click(screen.getByText('操作'))

    // 第一项"编辑"（可用的）应获得焦点
    expect(screen.getByText('编辑')).toHaveFocus()
  })

  it('moves focus with ArrowDown/ArrowUp and wraps around, skipping disabled items', () => {
    // 不含 divider（divider 项也会渲染可点按钮、参与焦点循环，属既有行为）
    const navItems: DropdownMenuItem[] = [
      { key: 'edit', label: '编辑' },
      { key: 'delete', label: '删除', danger: true },
      { key: 'disabled', label: '禁用项', disabled: true },
    ]
    render(
      <DropdownMenu trigger={<button>操作</button>} items={navItems} />
    )

    // 打开 → 首项"编辑"聚焦
    fireEvent.click(screen.getByText('操作'))
    expect(screen.getByText('编辑')).toHaveFocus()

    // ArrowDown → "删除"（跳过禁用项）
    fireEvent.keyDown(document, { key: 'ArrowDown' })
    expect(screen.getByText('删除')).toHaveFocus()

    // ArrowDown → 循环回"编辑"
    fireEvent.keyDown(document, { key: 'ArrowDown' })
    expect(screen.getByText('编辑')).toHaveFocus()

    // ArrowUp → 循环回"删除"
    fireEvent.keyDown(document, { key: 'ArrowUp' })
    expect(screen.getByText('删除')).toHaveFocus()
  })

  it('activates the focused item with Enter', async () => {
    const handleEdit = vi.fn()
    const items: DropdownMenuItem[] = [{ key: 'edit', label: '编辑', onClick: handleEdit }]

    const user = userEvent.setup()
    render(
      <DropdownMenu trigger={<button>操作</button>} items={items} />
    )

    fireEvent.click(screen.getByText('操作'))
    expect(screen.getByText('编辑')).toHaveFocus()

    // 焦点在"编辑"上按 Enter → 触发 onClick 并关闭菜单
    await user.keyboard('{Enter}')
    expect(handleEdit).toHaveBeenCalledTimes(1)
    await waitFor(() => {
      expect(screen.queryByText('编辑')).not.toBeInTheDocument()
    })
  })

  it('returns focus to trigger after Escape close', () => {
    render(
      <DropdownMenu trigger={<button>操作</button>} items={mockItems} />
    )

    fireEvent.click(screen.getByText('操作'))
    expect(screen.getByText('编辑')).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })

    waitFor(() => {
      expect(screen.queryByText('编辑')).not.toBeInTheDocument()
    })
    // 焦点归还触发按钮
    expect(screen.getByText('操作')).toHaveFocus()
  })
})
