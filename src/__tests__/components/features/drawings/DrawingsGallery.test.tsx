/**
 * DrawingsGallery / DrawingViewer 组件测试（S26 图纸画廊 + S27 查看器）
 */
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import type { Drawing } from '@/types/electron'

vi.mock('@/components/ui/Icon', () => ({
  Icon: ({ name }: any) => <span data-testid={`icon-${name}`}>{name}</span>,
}))

vi.mock('@/services/fileService', () => ({
  FILE_CATEGORIES: { DRAWING_FILE: { category: 'drawings', subCategory: 'files' } },
  readUploadedFile: vi.fn().mockResolvedValue('data:image/png;base64,xxx'),
}))

const importGallery = () => import('@/components/features/drawings/DrawingsGallery')
const importViewer = () => import('@/components/features/drawings/DrawingViewer')

const drawings: Drawing[] = [
  { id: 1, projectId: 1, name: '一期 A1 楼结构平面图', category: '结构', filePath: 'a1.png', remarks: '', position: '1-4层', createdAt: '2026-07-01' },
  { id: 2, projectId: 1, name: '地下车库暖通总图', category: '机电', filePath: 'b2.pdf', remarks: '审核中', createdAt: '2026-07-02' },
]

const getProjectName = () => '一期 A1 综合楼'

describe('DrawingsGallery (S26)', () => {
  const onOpen = vi.fn()
  const onEdit = vi.fn()
  const onDelete = vi.fn()

  beforeEach(() => vi.clearAllMocks())
  afterEach(() => cleanup())

  it('渲染画廊卡片：图纸名/类别 chip/项目名', async () => {
    const { DrawingsGallery } = await importGallery()
    render(<DrawingsGallery drawings={drawings} getProjectName={getProjectName} onOpen={onOpen} onEdit={onEdit} onDelete={onDelete} />)
    expect(screen.getByText('一期 A1 楼结构平面图')).toBeInTheDocument()
    expect(screen.getByText('结构')).toBeInTheDocument()
    expect(screen.getAllByText('一期 A1 综合楼').length).toBe(2)
  })

  it('非图片文件显示扩展名占位', async () => {
    const { DrawingsGallery } = await importGallery()
    render(<DrawingsGallery drawings={drawings} getProjectName={getProjectName} onOpen={onOpen} onEdit={onEdit} onDelete={onDelete} />)
    expect(screen.getByText('pdf')).toBeInTheDocument()
  })

  it('点击卡片触发 onOpen', async () => {
    const { DrawingsGallery } = await importGallery()
    render(<DrawingsGallery drawings={drawings} getProjectName={getProjectName} onOpen={onOpen} onEdit={onEdit} onDelete={onDelete} />)
    fireEvent.click(screen.getByText('地下车库暖通总图'))
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }))
  })
})

describe('DrawingViewer (S27)', () => {
  const onClose = vi.fn()

  beforeEach(() => vi.clearAllMocks())
  afterEach(() => cleanup())

  it('渲染顶栏图纸名与信息栏字段', async () => {
    const { DrawingViewer } = await importViewer()
    render(<DrawingViewer drawing={drawings[0]} projectName="一期 A1 综合楼" onClose={onClose} />)
    expect(screen.getByText('一期 A1 楼结构平面图')).toBeInTheDocument()
    expect(screen.getByText('图纸信息')).toBeInTheDocument()
    expect(screen.getByText('所属项目')).toBeInTheDocument()
    expect(screen.getByText('1-4层')).toBeInTheDocument()
  })

  it('图片类型显示缩放控件', async () => {
    const { DrawingViewer } = await importViewer()
    render(<DrawingViewer drawing={drawings[0]} projectName="一期 A1 综合楼" onClose={onClose} />)
    expect(screen.getByLabelText('放大')).toBeInTheDocument()
    expect(screen.getByLabelText('缩小')).toBeInTheDocument()
    expect(screen.getByText('100%')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('放大'))
    expect(screen.getByText('125%')).toBeInTheDocument()
  })

  it('Esc 关闭查看器', async () => {
    const { DrawingViewer } = await importViewer()
    render(<DrawingViewer drawing={drawings[0]} projectName="一期 A1 综合楼" onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('点击关闭按钮触发 onClose', async () => {
    const { DrawingViewer } = await importViewer()
    render(<DrawingViewer drawing={drawings[0]} projectName="一期 A1 综合楼" onClose={onClose} />)
    fireEvent.click(screen.getByLabelText('关闭'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
