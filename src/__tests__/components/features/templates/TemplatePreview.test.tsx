import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react'
import React from 'react'

// Mock Icon
vi.mock('@/components/ui/Icon', () => ({
  Icon: ({ name, size, className }: any) => <span data-testid={`icon-${name}`} className={className}>{name}</span>,
}))

const importModule = () => import('@/components/features/templates/TemplatePreview')

describe('TemplatePreview', () => {
  const mockOnClose = vi.fn()

  const baseTemplate = {
    id: 1,
    name: '合同模板预览',
    category: 'contract' as const,
    fileType: 'docx' as const,
    fileName: 'contract.docx',
    storedFileName: 'uuid-contract.docx',
  } as any

  beforeEach(() => {
    vi.clearAllMocks()
    ;(window.electronAPI as any).readFile = vi.fn()
  })
  afterEach(cleanup)

  const mockReadFileSuccess = () => {
    ;(window.electronAPI as any).readFile.mockResolvedValue({
      success: true, data: { dataUrl: 'data:application/octet-stream;base64,test' },
    })
  }

  test('应渲染模板名称', async () => {
    mockReadFileSuccess()
    const { default: TemplatePreview } = await importModule()
    render(React.createElement(TemplatePreview, { template: baseTemplate, onClose: mockOnClose }))
    // 等待异步状态更新完成（消除 Act 警告）
    await waitFor(() => {
      expect(screen.getByText('合同模板预览')).toBeTruthy()
      expect(screen.getByText('Word 文档暂不支持在线预览')).toBeTruthy()
    })
  })

  test('docx 类型应调用 readFile 并提供下载链接', async () => {
    mockReadFileSuccess()
    const { default: TemplatePreview } = await importModule()
    render(React.createElement(TemplatePreview, { template: baseTemplate, onClose: mockOnClose }))
    await waitFor(() => {
      expect((window.electronAPI as any).readFile).toHaveBeenCalled()
      expect(screen.getByText('下载查看')).toBeTruthy()
    })
  })

  test('xlsx 类型应调用 readFile', async () => {
    mockReadFileSuccess()
    const { default: TemplatePreview } = await importModule()
    const xlsxTemplate = { ...baseTemplate, fileType: 'xlsx' }
    render(React.createElement(TemplatePreview, { template: xlsxTemplate, onClose: mockOnClose }))
    await waitFor(() => {
      expect((window.electronAPI as any).readFile).toHaveBeenCalled()
      expect(screen.getByText('Excel 模板无法在线预览')).toBeTruthy()
    })
  })

  test('关闭按钮应触发 onClose', async () => {
    mockReadFileSuccess()
    const { default: TemplatePreview } = await importModule()
    render(React.createElement(TemplatePreview, { template: baseTemplate, onClose: mockOnClose }))
    await waitFor(() => expect(screen.getByText('Word 文档暂不支持在线预览')).toBeTruthy())
    // 点击关闭按钮 (aria-label="关闭", Modal 用 createPortal 渲染到 document.body)
    const closeBtn = screen.getByRole('button', { name: "关闭" })
    fireEvent.click(closeBtn)
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled()
    })
  })
})
