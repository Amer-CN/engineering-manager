/**
 * UI 组件测试：Spinner、Skeleton、Loading、PageContainer
 */
import { render, screen, cleanup } from '@testing-library/react'
import { Spinner, Skeleton, Loading } from '../../components/ui/Loading'
import PageContainer from '../../components/ui/PageContainer'

afterEach(cleanup)

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
