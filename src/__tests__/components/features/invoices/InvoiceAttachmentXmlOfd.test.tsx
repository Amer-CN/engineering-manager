/**
 * FP04 发票附件 XML/OFD 支持 — 新增用例
 * 锚点：InvoiceForm.test.tsx:14 FileDropZone mock（表单经 FileDropZone 接附件）+
 * partners/FileDropZone.test.tsx（共享上传区行为基线）。
 * 本文件用真实组件断言：FileDropZone accept/文案、FilePreviewModal xml/ofd 下载降级、
 * pdf/image 零回归。
 */
import React from 'react'
import { render, screen, cleanup } from '@testing-library/react'

// Mock framer-motion（与 FilePreviewModal.test.tsx 同模式，Modal 依赖它）
vi.mock('framer-motion', () => ({
  motion: { div: React.forwardRef(({ children, ...props }: any, ref: any) => <div ref={ref} {...props}>{children}</div>) },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

import { FilePreviewModal } from '@/components/features/invoices/FilePreviewModal'
import { FileDropZone } from '@/components/features/partners/FileDropZone'

afterEach(() => {
  cleanup()
})

const dropZoneBaseProps = {
  label: '上传发票',
  iconName: 'Paperclip',
  file: '',
  fileType: '',
  fileLabel: '',
  dragOver: false,
  inputRef: { current: null as HTMLInputElement | null },
  onFileSelect: vi.fn(),
  onRemove: vi.fn(),
  onDragOver: vi.fn(),
  onDragLeave: vi.fn(),
  onDrop: vi.fn(),
  onClickUpload: vi.fn(),
}

describe('FP04 FileDropZone xml/ofd', () => {
  it('accept 放行 xml/ofd（mime + 后缀）', async () => {
    const { container } = render(<FileDropZone {...dropZoneBaseProps} />)
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const accept = input.getAttribute('accept') || ''
    expect(accept).toContain('text/xml')
    expect(accept).toContain('application/ofd')
    expect(accept).toContain('.xml')
    expect(accept).toContain('.ofd')
    // 旧口径保留
    expect(accept).toContain('image/jpeg')
    expect(accept).toContain('application/pdf')
  })

  it('提示文案与 InvoiceForm toast 同口径（含 XML、OFD）', async () => {
    render(<FileDropZone {...dropZoneBaseProps} />)
    expect(screen.getByText('支持 JPG、PNG、WebP、PDF、XML、OFD 格式，最大 10MB')).toBeInTheDocument()
  })

  it('已上传 xml/ofd 显示对应文件标签（非“图片文件”）', async () => {
    const { unmount } = render(
      <FileDropZone {...dropZoneBaseProps} file="data:text/xml;base64,xxx" fileType="xml" fileLabel="发票附件.xml" />
    )
    expect(screen.getByText('发票附件.xml')).toBeInTheDocument()
    expect(screen.getByText('XML文件')).toBeInTheDocument()
    unmount()
    render(
      <FileDropZone {...dropZoneBaseProps} file="data:application/ofd;base64,xxx" fileType="ofd" fileLabel="发票附件.ofd" />
    )
    expect(screen.getByText('发票附件.ofd')).toBeInTheDocument()
    expect(screen.getByText('OFD文件')).toBeInTheDocument()
  })
})

describe('FP04 FilePreviewModal xml/ofd 降级', () => {
  const mockOnClose = vi.fn()

  it('xml 显示下载链接而非 img/iframe', async () => {
    render(
      React.createElement(FilePreviewModal, {
        file: { data: 'data:text/xml;base64,xxx', type: 'xml', title: '发票.xml' },
        onClose: mockOnClose,
      })
    )
    expect(screen.getByText('该格式不支持在线预览，请下载查看')).toBeTruthy()
    const link = screen.getByText('下载文件')
    expect(link.getAttribute('href')).toBe('data:text/xml;base64,xxx')
    // Modal 经 portal 渲染到 document.body
    expect(document.body.querySelector('img')).toBeNull()
    expect(document.body.querySelector('iframe')).toBeNull()
  })

  it('ofd 显示下载链接而非 img/iframe', async () => {
    render(
      React.createElement(FilePreviewModal, {
        file: { data: 'data:application/ofd;base64,xxx', type: 'ofd', title: '发票.ofd' },
        onClose: mockOnClose,
      })
    )
    expect(screen.getByText('该格式不支持在线预览，请下载查看')).toBeTruthy()
    expect(screen.getByText('下载文件').getAttribute('href')).toBe('data:application/ofd;base64,xxx')
    expect(document.body.querySelector('img')).toBeNull()
    expect(document.body.querySelector('iframe')).toBeNull()
  })

  it('pdf/image 保持内联预览零回归', async () => {
    // Modal 经 portal 渲染到 document.body，断言必须查 body 而非 container
    const { unmount } = render(
      React.createElement(FilePreviewModal, {
        file: { data: 'data:application/pdf;base64,test', type: 'pdf', title: '发票.pdf' },
        onClose: mockOnClose,
      })
    )
    expect(document.body.querySelector('iframe')).not.toBeNull()
    unmount()
    const r2 = render(
      React.createElement(FilePreviewModal, {
        file: { data: 'data:image/png;base64,test', type: 'image', title: '扫描件.png' },
        onClose: mockOnClose,
      })
    )
    expect(r2.baseElement.querySelector('img')).not.toBeNull()
  })
})
