// @ts-nocheck
/**
 * UI 组件测试：Modal、Toast、Pagination
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { Modal } from '../../components/ui/Modal'
import Toast from '../../components/ui/Toast'
import { Pagination } from '../../components/ui/Pagination'
import type { ToastInfo } from '../../hooks/useToast'

afterEach(cleanup)

// ═══════════════════════════════════════════════════════════════════════════════
// Modal
// ═══════════════════════════════════════════════════════════════════════════════

describe('Modal', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <Modal isOpen={false} onClose={() => {}}>
        Content
      </Modal>
    )
    expect(container.querySelector('[role="dialog"]')).toBeNull()
  })

  it('renders content when isOpen is true', () => {
    render(
      <Modal isOpen={true} onClose={() => {}}>
        <p>Modal Content</p>
      </Modal>
    )
    expect(screen.getByText('Modal Content')).toBeInTheDocument()
  })

  it('renders title when provided', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Test Modal">
        Content
      </Modal>
    )
    expect(screen.getByText('Test Modal')).toBeInTheDocument()
  })

  it('calls onClose when close button clicked', () => {
    const handleClose = vi.fn()
    render(
      <Modal isOpen={true} onClose={handleClose} title="Closable">
        Content
      </Modal>
    )
    const closeBtn = screen.getByLabelText('关闭')
    fireEvent.click(closeBtn)
    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose on Escape key press', () => {
    const handleClose = vi.fn()
    render(
      <Modal isOpen={true} onClose={handleClose}>
        Content
      </Modal>
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('renders footer when provided', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} footer={<button>Submit</button>}>
        Content
      </Modal>
    )
    expect(screen.getByText('Submit')).toBeInTheDocument()
  })

  it('does not render footer when not provided', () => {
    const { container } = render(
      <Modal isOpen={true} onClose={() => {}}>
        Content
      </Modal>
    )
    // Footer area should not exist
    expect(container.querySelector('.bg-slate-50.rounded-b-2xl')).toBeNull()
  })

  it('sets aria-modal attribute', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="ARIA Test">
        Content
      </Modal>
    )
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
  })

  it('sets aria-labelledby when title is provided', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Labelled">
        Content
      </Modal>
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Toast
// ═══════════════════════════════════════════════════════════════════════════════

describe('Toast', () => {
  it('renders nothing when toast is null', () => {
    const { container } = render(<Toast toast={null} />)
    expect(container.textContent).toBe('')
  })

  it('renders success toast', () => {
    const toastInfo: ToastInfo = { message: 'Operation successful', type: 'success' }
    render(<Toast toast={toastInfo} />)
    expect(screen.getByText('Operation successful')).toBeInTheDocument()
  })

  it('renders error toast', () => {
    const toastInfo: ToastInfo = { message: 'Something failed', type: 'error' }
    render(<Toast toast={toastInfo} />)
    expect(screen.getByText('Something failed')).toBeInTheDocument()
  })

  it('renders info toast', () => {
    const toastInfo: ToastInfo = { message: 'Just info', type: 'info' }
    render(<Toast toast={toastInfo} />)
    expect(screen.getByText('Just info')).toBeInTheDocument()
  })

  it('renders success icon checkmark', () => {
    const toastInfo: ToastInfo = { message: 'OK', type: 'success' }
    render(<Toast toast={toastInfo} />)
    expect(screen.getByText('✓')).toBeInTheDocument()
  })

  it('renders error icon cross', () => {
    const toastInfo: ToastInfo = { message: 'FAIL', type: 'error' }
    render(<Toast toast={toastInfo} />)
    expect(screen.getByText('✗')).toBeInTheDocument()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Pagination
// ═══════════════════════════════════════════════════════════════════════════════

describe('Pagination', () => {
  it('renders page numbers for small total', () => {
    render(<Pagination current={1} total={3} onChange={() => {}} />)
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('shows total count when showTotal is true', () => {
    render(<Pagination current={1} total={10} onChange={() => {}} showTotal />)
    expect(screen.getByText('共 10 条')).toBeInTheDocument()
  })

  it('hides total count when showTotal is false', () => {
    render(<Pagination current={1} total={10} onChange={() => {}} showTotal={false} />)
    expect(screen.queryByText('共 10 条')).toBeNull()
  })

  it('calls onChange when page button clicked', () => {
    const handleChange = vi.fn()
    render(<Pagination current={1} total={5} onChange={handleChange} />)
    fireEvent.click(screen.getByText('3'))
    expect(handleChange).toHaveBeenCalledWith(3)
  })

  it('disables previous button on first page', () => {
    render(<Pagination current={1} total={5} onChange={() => {}} />)
    const prevBtn = screen.getByLabelText('上一页')
    expect(prevBtn).toBeDisabled()
  })

  it('disables next button on last page', () => {
    render(<Pagination current={5} total={5} onChange={() => {}} />)
    const nextBtn = screen.getByLabelText('下一页')
    expect(nextBtn).toBeDisabled()
  })

  it('renders simple mode', () => {
    render(<Pagination current={2} total={5} onChange={() => {}} simple />)
    expect(screen.getByText('2 / 5')).toBeInTheDocument()
  })

  it('renders page size selector when onPageSizeChange provided', () => {
    const handlePageSizeChange = vi.fn()
    render(
      <Pagination
        current={1}
        total={10}
        onChange={() => {}}
        onPageSizeChange={handlePageSizeChange}
      />
    )
    const select = screen.getByDisplayValue('10')
    expect(select).toBeInTheDocument()
  })

  it('renders ellipsis for large page counts', () => {
    render(<Pagination current={5} total={20} onChange={() => {}} />)
    const ellipses = screen.getAllByText('...')
    expect(ellipses.length).toBeGreaterThanOrEqual(1)
  })

  it('highlights current page', () => {
    render(<Pagination current={3} total={5} onChange={() => {}} />)
    const activeBtn = screen.getByText('3')
    expect(activeBtn.className).toContain('bg-primary-600')
  })
})
