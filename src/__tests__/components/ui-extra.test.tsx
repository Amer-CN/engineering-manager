// @ts-nocheck
/**
 * UI 组件测试：FormField、Spinner、Skeleton、Loading、PageContainer
 */
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { FormField } from '../../components/ui/FormField'
import { Spinner, Skeleton, Loading } from '../../components/ui/Loading'
import PageContainer from '../../components/ui/PageContainer'

afterEach(cleanup)

// ══════════════════════════════════════════════════════════════════════════════
// FormField
// ══════════════════════════════════════════════════════════════════════════════

describe('FormField', () => {
  afterEach(cleanup)

  it('renders label', () => {
    render(
      <FormField label="用户名">
        <input />
      </FormField>
    )
    expect(screen.getByText('用户名')).toBeInTheDocument()
  })

  it('shows required asterisk when required', () => {
    render(
      <FormField label="用户名" required>
        <input />
      </FormField>
    )
    expect(screen.getByText('*')).toBeInTheDocument()
  })

  it('does not show required asterisk when not required', () => {
    render(
      <FormField label="用户名">
        <input />
      </FormField>
    )
    expect(screen.queryByText('*')).not.toBeInTheDocument()
  })

  it('renders error message', () => {
    render(
      <FormField label="用户名" error="用户名不能为空">
        <input />
      </FormField>
    )
    expect(screen.getByText('用户名不能为空')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('renders help text when no error', () => {
    render(
      <FormField label="用户名" helpText="请输入用户名">
        <input />
      </FormField>
    )
    expect(screen.getByText('请输入用户名')).toBeInTheDocument()
  })

  it('does not render help text when error exists', () => {
    render(
      <FormField label="用户名" error="错误" helpText="帮助文本">
        <input />
      </FormField>
    )
    expect(screen.queryByText('帮助文本')).not.toBeInTheDocument()
    expect(screen.getByText('错误')).toBeInTheDocument()
  })

  it('renders children', () => {
    render(
      <FormField label="测试">
        <input placeholder="请输入" />
      </FormField>
    )
    expect(screen.getByPlaceholderText('请输入')).toBeInTheDocument()
  })

  it('renders with horizontal layout', () => {
    const { container } = render(
      <FormField label="用户名" layout="horizontal">
        <input />
      </FormField>
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper?.className).toContain('flex')
  })

  it('applies custom className', () => {
    const { container } = render(
      <FormField label="测试" className="custom-class">
        <input />
      </FormField>
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveClass('custom-class')
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// Spinner
// ══════════════════════════════════════════════════════════════════════════════

describe('Spinner', () => {
  afterEach(cleanup)

  it('renders SVG element', () => {
    const { container } = render(<Spinner />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('applies size classes', () => {
    const { container } = render(<Spinner size="lg" />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveClass('w-9', 'h-9')
  })

  it('applies color classes', () => {
    const { container } = render(<Spinner color="white" />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveClass('text-white')
  })

  it('applies custom className', () => {
    const { container } = render(<Spinner className="mx-auto" />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveClass('mx-auto')
  })

  it('renders with default props', () => {
    const { container } = render(<Spinner />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg).toHaveClass('animate-spin')
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// Skeleton
// ══════════════════════════════════════════════════════════════════════════════

describe('Skeleton', () => {
  afterEach(cleanup)

  it('renders with default props', () => {
    const { container } = render(<Skeleton />)
    const el = container.firstChild as HTMLElement
    expect(el).toHaveClass('bg-slate-200', 'animate-pulse')
  })

  it('applies width and height styles', () => {
    const { container } = render(<Skeleton width={200} height={20} />)
    const el = container.firstChild as HTMLElement
    expect(el).toHaveStyle({ width: '200px', height: '20px' })
  })

  it('applies string width/height', () => {
    const { container } = render(<Skeleton width="100%" height="1rem" />)
    const el = container.firstChild as HTMLElement
    expect(el).toHaveStyle({ width: '100%', height: '1rem' })
  })

  it('applies rounded classes', () => {
    const { container } = render(<Skeleton rounded="full" />)
    const el = container.firstChild as HTMLElement
    expect(el).toHaveClass('rounded-full')
  })

  it('applies custom className', () => {
    const { container } = render(<Skeleton className="mb-4" />)
    const el = container.firstChild as HTMLElement
    expect(el).toHaveClass('mb-4')
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// Loading
// ══════════════════════════════════════════════════════════════════════════════

describe('Loading', () => {
  afterEach(cleanup)

  it('renders spinner when loading is true', () => {
    const { container } = render(
      <Loading loading={true}>
        <div>Content</div>
      </Loading>
    )
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('renders children when loading is false', () => {
    render(
      <Loading loading={false}>
        <div>Content</div>
      </Loading>
    )
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('renders custom indicator', () => {
    render(
      <Loading loading={true} indicator={<div>Custom</div>}>
        <div>Content</div>
      </Loading>
    )
    expect(screen.getByText('Custom')).toBeInTheDocument()
  })

  it('applies custom className when loading', () => {
    const { container } = render(
      <Loading loading={true} className="min-h-32">
        <div>Content</div>
      </Loading>
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveClass('min-h-32')
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// PageContainer
// ══════════════════════════════════════════════════════════════════════════════

describe('PageContainer', () => {
  afterEach(cleanup)

  it('renders children', () => {
    render(<PageContainer>Page Content</PageContainer>)
    expect(screen.getByText('Page Content')).toBeInTheDocument()
  })

  it('applies maxWidth class', () => {
    const { container } = render(<PageContainer maxWidth="wide">Content</PageContainer>)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper?.className).toContain('max-w-')
  })

  it('applies custom className', () => {
    const { container } = render(<PageContainer className="py-8">Content</PageContainer>)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveClass('py-8')
  })

  it('renders with narrow maxWidth', () => {
    const { container } = render(<PageContainer maxWidth="narrow">Content</PageContainer>)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper?.className).toContain('max-w-4xl')
  })

  it('renders with full maxWidth', () => {
    const { container } = render(<PageContainer maxWidth="full">Content</PageContainer>)
    const wrapper = container.firstChild as HTMLElement
    // full = '', so just check it renders
    expect(wrapper).toBeInTheDocument()
  })
})
