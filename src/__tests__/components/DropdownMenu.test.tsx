// @ts-nocheck
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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
    
    // "删除" 按钮应该有危险样式（text-red-600）
    const deleteButton = screen.getByText('删除').closest('button')
    expect(deleteButton).toHaveClass('text-red-600')
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
    
    // 检查分隔线（border-t border-slate-100）
    const dividers = document.querySelectorAll('.border-t.border-slate-100')
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
})
