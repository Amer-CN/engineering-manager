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
    ;(window.electronAPI as any).convertTemplateDocxToHtml = vi.fn()
    ;(window.electronAPI as any).readFile = vi.fn()
  })
  afterEach(cleanup)

  test('应渲染模板名称', async () => {
    ;(window.electronAPI as any).convertTemplateDocxToHtml.mockResolvedValue({
      success: true, data: '<h1>合同内容</h1>',
    })
    const { default: TemplatePreview } = await importModule()
    render(React.createElement(TemplatePreview, { template: baseTemplate, onClose: mockOnClose }))
    // 等待异步状态更新完成（消除 Act 警告）
    await waitFor(() => {
      expect(screen.getByText('合同模板预览')).toBeTruthy()
      expect(screen.getByText('合同内容')).toBeTruthy()
    })
  })

  test('docx 类型应调用 convertTemplateDocxToHtml', async () => {
    ;(window.electronAPI as any).convertTemplateDocxToHtml.mockResolvedValue({
      success: true, data: '<h1>合同内容</h1>',
    })
    const { default: TemplatePreview } = await importModule()
    render(React.createElement(TemplatePreview, { template: baseTemplate, onClose: mockOnClose }))
    await waitFor(() => {
      expect((window.electronAPI as any).convertTemplateDocxToHtml).toHaveBeenCalledWith('uuid-contract.docx')
    })
  })

  test('xlsx 类型应调用 readFile', async () => {
    ;(window.electronAPI as any).readFile.mockResolvedValue({
      success: true, data: { dataUrl: 'data:application/octet-stream;base64,test' },
    })
    const { default: TemplatePreview } = await importModule()
    const xlsxTemplate = { ...baseTemplate, fileType: 'xlsx' }
    render(React.createElement(TemplatePreview, { template: xlsxTemplate, onClose: mockOnClose }))
    await waitFor(() => {
      expect((window.electronAPI as any).readFile).toHaveBeenCalled()
    })
  })

  test('关闭按钮应触发 onClose', async () => {
    ;(window.electronAPI as any).convertTemplateDocxToHtml.mockResolvedValue({
      success: true, data: '<h1>合同内容</h1>',
    })
    const { default: TemplatePreview } = await importModule()
    const { container } = render(React.createElement(TemplatePreview, { template: baseTemplate, onClose: mockOnClose }))
    await waitFor(() => expect(screen.getByText('合同内容')).toBeTruthy())
    // 点击 overlay 背景（fixed inset-0 元素）
    const overlay = container.querySelector('.fixed.inset-0')
    fireEvent.click(overlay!)
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled()
    })
  })
})
