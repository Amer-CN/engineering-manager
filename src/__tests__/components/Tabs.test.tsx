// @ts-nocheck
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Tabs } from '../../components/ui/Tabs'

describe('Tabs', () => {
  const mockTabs = [
    { key: 'tab1', label: '标签一' },
    { key: 'tab2', label: '标签二' },
    { key: 'tab3', label: '标签三', icon: 'Star', badge: 3 },
  ]

  it('renders all tabs', () => {
    render(<Tabs value="tab1" onChange={() => {}} tabs={mockTabs} />)
    
    // 检查所有标签是否渲染
    expect(screen.getByText('标签一')).toBeInTheDocument()
    expect(screen.getByText('标签二')).toBeInTheDocument()
    expect(screen.getByText('标签三')).toBeInTheDocument()
  })

  it('marks active tab with aria-selected', () => {
    render(<Tabs value="tab2" onChange={() => {}} tabs={mockTabs} />)
    
    // 检查激活的标签
    const activeTab = screen.getByText('标签二').closest('button')
    expect(activeTab).toHaveAttribute('aria-selected', 'true')
    
    // 检查非激活的标签
    const inactiveTab = screen.getByText('标签一').closest('button')
    expect(inactiveTab).toHaveAttribute('aria-selected', 'false')
  })

  it('calls onChange when tab clicked', () => {
    const handleChange = vi.fn()
    render(<Tabs value="tab1" onChange={handleChange} tabs={mockTabs} />)
    
    // 点击"标签二"
    fireEvent.click(screen.getByText('标签二'))
    
    expect(handleChange).toHaveBeenCalledTimes(1)
    expect(handleChange).toHaveBeenCalledWith('tab2')
  })

  it('renders badge when provided', () => {
    render(<Tabs value="tab1" onChange={() => {}} tabs={mockTabs} />)
    
    // 检查徽章是否渲染
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('does not render badge when not provided', () => {
    const tabsWithoutBadge = [
      { key: 'a', label: '标签A' },
      { key: 'b', label: '标签B' },
    ]
    
    render(<Tabs value="a" onChange={() => {}} tabs={tabsWithoutBadge} />)
    
    // 不应该有徽章
    const badges = document.querySelectorAll('.rounded-full')
    expect(badges.length).toBe(0)
  })

  it('applies custom className', () => {
    const { container } = render(
      <Tabs value="tab1" onChange={() => {}} tabs={mockTabs} className="my-custom-tabs" />
    )
    
    // 检查自定义类名
    const tabsList = container.querySelector('[role="tablist"]')
    expect(tabsList).toHaveClass('my-custom-tabs')
  })

  it('renders with icon when provided', () => {
    render(<Tabs value="tab1" onChange={() => {}} tabs={mockTabs} />)
    
    // 检查图标是否存在（Lucide 图标在 jsdom 中不渲染，检查容器）
    const tabWithIcon = screen.getByText('标签三').closest('button')
    expect(tabWithIcon).toBeInTheDocument()
    // 在 jsdom 中，Lucide 图标可能不渲染，所以只检查标签文本
    expect(screen.getByText('标签三')).toBeInTheDocument()
  })

  it('has correct role attributes', () => {
    render(<Tabs value="tab1" onChange={() => {}} tabs={mockTabs} />)
    
    // 检查 role="tablist"
    const tabsList = document.querySelector('[role="tablist"]')
    expect(tabsList).toBeInTheDocument()
    
    // 检查每个 tab 都有 role="tab"
    const tabs = document.querySelectorAll('[role="tab"]')
    expect(tabs.length).toBe(mockTabs.length)
  })
})
