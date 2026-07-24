import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: { div: React.forwardRef(({ children, ...props }: any, ref: any) => <div ref={ref} {...props}>{children}</div>) },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

import { FilePreviewModal } from '@/components/features/invoices/FilePreviewModal'

describe('FilePreviewModal', () => {
  const mockOnClose = vi.fn()

  test('应渲染 PDF 类型文件', () => {
    render(React.createElement(FilePreviewModal, {
      file: { data: 'data:application/pdf;base64,test', type: 'pdf', title: '发票.pdf' },
      onClose: mockOnClose,
    }))
    expect(screen.getByText('发票.pdf')).toBeTruthy()
  })

  test('应渲染图片类型文件', () => {
    render(React.createElement(FilePreviewModal, {
      file: { data: 'data:image/png;base64,test', type: 'image', title: '扫描件.png' },
      onClose: mockOnClose,
    }))
    expect(screen.getByText('扫描件.png')).toBeTruthy()
  })

  test('点击关闭按钮应触发 onClose', () => {
    render(React.createElement(FilePreviewModal, {
      file: { data: 'data:application/pdf;base64,test', type: 'pdf', title: '发票.pdf' },
      onClose: mockOnClose,
    }))
    // 关闭按钮现为 <Icon name="X" />，通过 Modal 头部按钮的 aria-label 定位
    fireEvent.click(screen.getByLabelText('关闭'))
    expect(mockOnClose).toHaveBeenCalled()
  })

  test('点击背景 overlay 应触发 onClose', () => {
    render(React.createElement(FilePreviewModal, {
      file: { data: 'data:application/pdf;base64,test', type: 'pdf', title: '发票.pdf' },
      onClose: mockOnClose,
    }))
    // Modal 通过 portal 渲染到 document.body，遮罩层是 .bg-black/50 元素
    const overlay = document.querySelector('.bg-black\\/50') as HTMLElement
    expect(overlay).toBeTruthy()
    fireEvent.click(overlay)
    expect(mockOnClose).toHaveBeenCalled()
  })
})
