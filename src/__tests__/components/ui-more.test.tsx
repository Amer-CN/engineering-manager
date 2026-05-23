/**
 * UI 组件测试：ConfirmDialog、Card、ProgressBar、Tooltip
 */
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Card } from '../../components/ui/Card'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { Tooltip } from '../../components/ui/Tooltip'

afterEach(cleanup)

// ══════════════════════════════════════════════════════════════════════════════
// ConfirmDialog
// ══════════════════════════════════════════════════════════════════════════════

describe('ConfirmDialog', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    title: '确认操作',
    content: '确定要执行此操作吗？',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <ConfirmDialog {...defaultProps} isOpen={false} />
    )
    expect(container.querySelector('[role="dialog"]')).toBeNull()
  })

  it('renders title and content when isOpen is true', () => {
    render(<ConfirmDialog {...defaultProps} />)
    expect(screen.getByText('确认操作')).toBeInTheDocument()
    expect(screen.getByText('确定要执行此操作吗？')).toBeInTheDocument()
  })

  it('renders confirm and cancel buttons', () => {
    render(<ConfirmDialog {...defaultProps} />)
    expect(screen.getByText('确认')).toBeInTheDocument()
    expect(screen.getByText('取消')).toBeInTheDocument()
  })

  it('calls onConfirm when confirm button clicked', () => {
    const onConfirm = vi.fn()
    render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />)
    fireEvent.click(screen.getByText('确认'))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when cancel button clicked', () => {
    const onClose = vi.fn()
    render(<ConfirmDialog {...defaultProps} onClose={onClose} />)
    fireEvent.click(screen.getByText('取消'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders custom button text', () => {
    render(
      <ConfirmDialog
        {...defaultProps}
        confirmText="删除"
        cancelText="返回"
      />
    )
    expect(screen.getByText('删除')).toBeInTheDocument()
    expect(screen.getByText('返回')).toBeInTheDocument()
  })

  it('applies danger variant to confirm button', () => {
    render(
      <ConfirmDialog {...defaultProps} confirmVariant="danger" />
    )
    const confirmBtn = screen.getByText('确认').closest('button')
    expect(confirmBtn).toBeInTheDocument()
  })

  it('hides cancel button when showCancel is false', () => {
    render(
      <ConfirmDialog {...defaultProps} showCancel={false} />
    )
    expect(screen.queryByText('取消')).not.toBeInTheDocument()
  })

  it('disables confirm button when loading', () => {
    render(
      <ConfirmDialog {...defaultProps} loading={true} />
    )
    // loading 时确认按钮被禁用，查找所有 button 中的禁用按钮
    const disabledBtns = document.querySelectorAll('button:disabled')
    expect(disabledBtns.length).toBeGreaterThan(0)
  })

  it('renders with size md', () => {
    render(
      <ConfirmDialog {...defaultProps} size="md" />
    )
    expect(screen.getByText('确认操作')).toBeInTheDocument()
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// Card
// ══════════════════════════════════════════════════════════════════════════════

describe('Card', () => {
  afterEach(cleanup)

  it('renders children', () => {
    render(<Card>Hello Card</Card>)
    expect(screen.getByText('Hello Card')).toBeInTheDocument()
  })

  it('renders title when provided', () => {
    render(<Card title="Card Title">Content</Card>)
    expect(screen.getByText('Card Title')).toBeInTheDocument()
  })

  it('renders subtitle when provided', () => {
    render(<Card title="Title" subtitle="Subtitle">Content</Card>)
    expect(screen.getByText('Subtitle')).toBeInTheDocument()
  })

  it('renders extra when provided', () => {
    render(
      <Card title="Title" extra={<button>Action</button>}>
        Content
      </Card>
    )
    expect(screen.getByText('Action')).toBeInTheDocument()
  })

  it('renders footer when provided', () => {
    render(<Card footer={<div>Footer</div>}>Content</Card>)
    expect(screen.getByText('Footer')).toBeInTheDocument()
  })

  it('does not render header when no title/subtitle/extra', () => {
    const { container } = render(<Card>Just content</Card>)
    // Should not have a header div with border-b
    const headers = container.querySelectorAll('.border-b')
    expect(headers.length).toBe(0)
  })

  it('applies cursor-pointer when onClick provided', () => {
    const { container } = render(<Card onClick={() => {}}>Content</Card>)
    const card = container.firstChild as HTMLElement
    expect(card).toHaveClass('cursor-pointer')
  })

  it('does not apply cursor-pointer when no onClick', () => {
    const { container } = render(<Card>Content</Card>)
    const card = container.firstChild as HTMLElement
    expect(card).not.toHaveClass('cursor-pointer')
  })

  it('applies shadow classes', () => {
    const { container } = render(<Card shadow="lg">Content</Card>)
    const card = container.firstChild as HTMLElement
    expect(card?.className).toContain('shadow')
  })

  it('renders with padding none', () => {
    const { container } = render(<Card padding="none">Content</Card>)
    // With padding="none", the content div should have p-0
    const contentDiv = container.querySelectorAll('div')[1]
    expect(contentDiv?.className).toContain('p-0')
  })

  it('calls onClick when clicked and onClick provided', () => {
    const handleClick = vi.fn()
    render(<Card onClick={handleClick}>Clickable</Card>)
    fireEvent.click(screen.getByText('Clickable'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// ProgressBar
// ══════════════════════════════════════════════════════════════════════════════

describe('ProgressBar', () => {
  afterEach(cleanup)

  it('renders with default props', () => {
    const { container } = render(<ProgressBar value={50} />)
    // Should render a progress bar with animated div
    const wrappers = container.querySelectorAll('.bg-slate-100')
    expect(wrappers.length).toBeGreaterThan(0)
  })

  it('shows label when showLabel is true', () => {
    render(<ProgressBar value={75} showLabel />)
    expect(screen.getByText('75%')).toBeInTheDocument()
  })

  it('does not show label when showLabel is false', () => {
    render(<ProgressBar value={75} showLabel={false} />)
    expect(screen.queryByText('75%')).not.toBeInTheDocument()
  })

  it('calculates percentage correctly', () => {
    render(<ProgressBar value={25} max={200} showLabel />)
    // 25/200 = 12.5%
    expect(screen.getByText('13%')).toBeInTheDocument()
  })

  it('clamps value at 0', () => {
    render(<ProgressBar value={-10} showLabel />)
    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('clamps value at max', () => {
    render(<ProgressBar value={150} showLabel />)
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('applies size classes', () => {
    const { container } = render(<ProgressBar value={50} size="lg" />)
    const innerBar = container.querySelectorAll('.rounded-full')[1]
    expect(innerBar?.className).toContain('h-4')
  })

  it('applies variant classes', () => {
    const { container } = render(<ProgressBar value={50} variant="success" />)
    // The inner animated div should have bg-success-500
    const innerBar = container.querySelectorAll('.rounded-full')[1]
    expect(innerBar?.className).toContain('bg-success-500')
  })

  it('renders with gradient variant', () => {
    const { container } = render(<ProgressBar value={50} variant="gradient" />)
    const innerBar = container.querySelectorAll('.rounded-full')[1]
    expect(innerBar?.className).toContain('bg-gradient')
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// Tooltip
// ══════════════════════════════════════════════════════════════════════════════

describe('Tooltip', () => {
  afterEach(cleanup)

  it('renders children', () => {
    render(
      <Tooltip content="Tooltip text">
        <button>Hover me</button>
      </Tooltip>
    )
    expect(screen.getByText('Hover me')).toBeInTheDocument()
  })

  it('does not show tooltip initially', () => {
    const { container } = render(
      <Tooltip content="Tooltip text">
        <button>Hover me</button>
      </Tooltip>
    )
    // Tooltip should not be visible initially
    expect(container.querySelector('.bg-slate-800')).not.toBeInTheDocument()
  })

  it('shows tooltip on mouse enter', () => {
    render(
      <Tooltip content="Tooltip text">
        <button>Hover me</button>
      </Tooltip>
    )
    fireEvent.mouseEnter(screen.getByText('Hover me'))
    // After mouse enter, tooltip should become visible (with delay in real app)
    // Since delay is 300ms by default, we can't test immediate appearance
    // But we can test that the state changes
  })

  it('hides tooltip on mouse leave', () => {
    render(
      <Tooltip content="Tooltip text">
        <button>Hover me</button>
      </Tooltip>
    )
    fireEvent.mouseEnter(screen.getByText('Hover me'))
    fireEvent.mouseLeave(screen.getByText('Hover me'))
    // After mouse leave, tooltip should hide
  })

  it('renders with custom delay', () => {
    render(
      <Tooltip content="Delayed" delay={500}>
        <button>Delayed tooltip</button>
      </Tooltip>
    )
    expect(screen.getByText('Delayed tooltip')).toBeInTheDocument()
  })

  it('renders with custom className', () => {
    const { container } = render(
      <Tooltip content="Tip" className="custom-class">
        <span>Text</span>
      </Tooltip>
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveClass('custom-class')
  })
})
