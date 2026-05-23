/**
 * FileDropZone 组件测试
 * - 无文件时显示上传区
 * - 有文件时显示文件信息
 * - 点击触发上传
 * - 拖拽事件
 * - 删除按钮
 */
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock：Icon 组件
vi.mock('@/ui/Icon', () => ({
  default: vi.fn(({ name, size }: any) => (
    <span data-testid={`icon-${name}`} data-size={size}>{name}</span>
  )),
}))

// 动态 import —— FileDropZone 是 named export
const importModule = async () => {
  const mod = await import('@/components/features/partners/FileDropZone')
  return { FileDropZone: mod.FileDropZone }
}

describe('FileDropZone', () => {
  const mockOnClickUpload = vi.fn()
  const mockOnRemove = vi.fn()
  const mockOnFileSelect = vi.fn()
  const mockOnDragOver = vi.fn()
  const mockOnDragLeave = vi.fn()
  const mockOnDrop = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  const baseProps = {
    label: '营业执照',
    iconName: 'FileText',
    file: '',
    fileType: '',
    fileLabel: '',
    dragOver: false,
    inputRef: { current: null as HTMLInputElement | null },
    onFileSelect: mockOnFileSelect,
    onRemove: mockOnRemove,
    onDragOver: mockOnDragOver,
    onDragLeave: mockOnDragLeave,
    onDrop: mockOnDrop,
    onClickUpload: mockOnClickUpload,
  }

  it('renders upload zone when no file', async () => {
    const { FileDropZone } = await importModule()
    render(<FileDropZone {...baseProps} />)
    expect(screen.getByText('点击上传 / 拖拽上传 / Ctrl+V 粘贴')).toBeInTheDocument()
    expect(screen.getByText('支持 JPG、PNG、WebP、PDF 格式，最大 10MB')).toBeInTheDocument()
  })

  it('applies drag-over style when dragOver=true', async () => {
    const { FileDropZone } = await importModule()
    const { container } = render(<FileDropZone {...baseProps} dragOver={true} />)
    // 最外层 div 有 border-2 border-dashed，dragOver 时追加 border-primary-500
    const zone = container.querySelector('.border-2') as HTMLElement
    expect(zone?.className).toContain('border-primary-500')
  })

  it('renders file info when file is provided', async () => {
    const { FileDropZone } = await importModule()
    render(
      <FileDropZone
        {...baseProps}
        file="data:image/png;base64,abc123"
        fileType="image"
        fileLabel="营业执照.png"
      />
    )
    expect(screen.getByText('营业执照.png')).toBeInTheDocument()
    expect(screen.getByText('图片文件')).toBeInTheDocument()
    expect(screen.getByText('删除')).toBeInTheDocument()
  })

  it('calls onClickUpload when upload zone clicked', async () => {
    const user = userEvent.setup()
    const { FileDropZone } = await importModule()
    render(<FileDropZone {...baseProps} />)
    await user.click(screen.getByText('点击上传 / 拖拽上传 / Ctrl+V 粘贴'))
    expect(mockOnClickUpload).toHaveBeenCalledTimes(1)
  })

  it('calls onRemove when remove button clicked', async () => {
    const user = userEvent.setup()
    const { FileDropZone } = await importModule()
    render(
      <FileDropZone
        {...baseProps}
        file="data:image/png;base64,abc123"
        fileType="image"
        fileLabel="test.png"
      />
    )
    await user.click(screen.getByText('删除'))
    expect(mockOnRemove).toHaveBeenCalledTimes(1)
  })

  it('shows preview button when onPreview is provided', async () => {
    const { FileDropZone } = await importModule()
    const mockOnPreview = vi.fn()
    render(
      <FileDropZone
        {...baseProps}
        file="data:image/png;base64,abc123"
        fileType="image"
        fileLabel="test.png"
        onPreview={mockOnPreview}
      />
    )
    expect(screen.getByText('预览')).toBeInTheDocument()
  })

  it('shows add-more button when multiple and onAddMore are provided', async () => {
    const { FileDropZone } = await importModule()
    const mockOnAddMore = vi.fn()
    render(
      <FileDropZone
        {...baseProps}
        file="data:image/png;base64,abc123"
        fileType="image"
        fileLabel="test.png"
        multiple={true}
        onAddMore={mockOnAddMore}
      />
    )
    expect(screen.getByText('继续添加')).toBeInTheDocument()
  })
})
