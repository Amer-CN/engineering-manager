import React, { useState, useEffect } from 'react'
import { DataTable } from '@/components/DataTable'
import Spinner from './ui/Spinner'
import { Drawing, Project } from '../types/electron'
import PageContainer from './ui/PageContainer'
import { EmptyState } from './ui/EmptyState'
import { useToastStore } from '@/store/toastStore'
import { useConfirm } from '@/hooks/useConfirm'
import { logCreate, logUpdate, logDelete } from '../utils/audit'
import { getAPI } from '@/services/api-adapter'
import { categories } from './drawingsConstants'
import { DrawingsFormModal } from './DrawingsFormModal'
import type { FormDataState } from './DrawingsFormModal'
import { Button } from './ui/Button'
import { Icon } from './ui/Icon'
import { createDrawingColumns } from './features/drawings/drawingsColumns'
import { DrawingsGallery } from './features/drawings/DrawingsGallery'
import { DrawingViewer } from './features/drawings/DrawingViewer'

interface DrawingsProps {
  refresh?: () => void
}

const Drawings: React.FC<DrawingsProps> = ({ refresh }) => {
  const showToast = useToastStore(state => state.showToast)
  const { confirm, ConfirmDialog } = useConfirm()
  const [drawings, setDrawings] = useState<Drawing[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingDrawing, setEditingDrawing] = useState<Drawing | null>(null)
  const [filterProject, setFilterProject] = useState<number | ''>('')
  const [filterCategory, setFilterCategory] = useState<string>('')
  // S26 Stitch: 画廊 / 列表双视图（画廊为默认）
  const [viewMode, setViewMode] = useState<'gallery' | 'list'>('gallery')
  // S27 Stitch: 图纸查看器（Lightbox）
  const [viewerDrawing, setViewerDrawing] = useState<Drawing | null>(null)
  const [formData, setFormData] = useState<FormDataState>({
  projectId: '',
  name: '',
  category: '',
  remarks: '',
  position: '',
  files: []
  })
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 })

  useEffect(() => {
  loadData()
  }, [])

  const loadData = async () => {
  try {
  const api = await getAPI()
  const [r0, r1] = await Promise.allSettled([
  api.getDrawings(),
  api.getProjects()
  ])
  const get = (r: PromiseSettledResult<any>) => r.status === 'fulfilled' && r.value?.success ? r.value.data || [] : []
  setDrawings([...get(r0)])
  setProjects([...get(r1)])
  } catch (error) {
  console.error('加载数据失败:', error)
  } finally {
  setLoading(false)
  }
  }

  const handleFilesAdd = (newFiles: FileList | File[]) => {
  const list = Array.from(newFiles)
  setFormData(prev => ({
  ...prev,
  files: [...prev.files, ...list],
  name: prev.name || (list[0]?.name || ''),
  }))
  }

  const handleFileRemove = (index: number) => {
  setFormData(prev => ({
  ...prev,
  files: prev.files.filter((_, i) => i !== index),
  }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()

  if (!editingDrawing && formData.files.length === 0) {
  showToast('请选择要上传的文件', 'error')
  return
  }

  try {
  if (editingDrawing) {
  await (await getAPI()).updateDrawing({
  ...editingDrawing,
  projectId: formData.projectId as number,
  name: formData.name,
  category: formData.category,
  remarks: formData.remarks,
  position: formData.position
  })
  logUpdate('drawings', formData.name, editingDrawing!.id, { position: formData.position })
  loadData()
  setShowModal(false)
  resetForm()
  refresh?.()
  showToast('图纸更新成功', 'success')
  } else if (formData.files.length > 0) {
  setUploading(true)
  const total = formData.files.length
  let successCount = 0
  let failCount = 0

  for (let i = 0; i < total; i++) {
  const file = formData.files[i]
  setUploadProgress({ current: i + 1, total })

  try {
  const base64 = await new Promise<string>((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(reader.result as string)
  reader.onerror = () => reject(new Error('文件读取失败'))
  reader.readAsDataURL(file)
  })
  const base64Data = base64.split(',')[1]

  const result = await (await getAPI()).uploadDrawing({
  projectId: formData.projectId as number,
  name: formData.files.length === 1 ? formData.name : file.name,
  category: formData.category,
  remarks: formData.remarks,
  position: formData.position,
  fileName: file.name,
  fileData: base64Data
  })

  if (result.success) {
  successCount++
  logCreate('drawings', file.name, result.data?.id, { projectId: formData.projectId, category: formData.category, position: formData.position })
  } else {
  failCount++
  }
  } catch (error: any) {
  failCount++
  }
  }

  setUploading(false)
  setUploadProgress({ current: 0, total: 0 })
  await loadData()
  setShowModal(false)
  resetForm()
  refresh?.()

  if (successCount > 0 && failCount === 0) {
  showToast(`${successCount} 个图纸上传成功`, 'success')
  } else if (successCount > 0) {
  showToast(`${successCount} 个上传成功，${failCount} 个失败`, 'warning')
  } else {
  showToast('上传失败', 'error')
  }
  return
  }
  } catch (error: any) {
  console.error('保存图纸失败:', error)
  showToast(error?.message || '保存失败', 'error')
  }
  }

  const handleEdit = (drawing: Drawing) => {
  setEditingDrawing(drawing)
  setFormData({
  projectId: drawing.projectId || '',
  name: drawing.name,
  category: drawing.category || '',
  remarks: drawing.remarks || '',
  position: drawing.position || '',
  files: []
  })
  setShowModal(true)
  }

  const handleDelete = async (id: number) => {
  const ok = await confirm({ title: '确认删除', content: '确定要删除这张图纸吗？', confirmVariant: 'danger' })
  if (ok) {
  try {
  const drawing = drawings.find(d => d.id === id)
  await (await getAPI()).deleteDrawing(id)
  logDelete('drawings', drawing?.name || '图纸', id, { projectId: drawing?.projectId })
  loadData()
  refresh?.()
  } catch (error) {
  console.error('删除图纸失败:', error)
  }
  }
  }

  const resetForm = () => {
  setEditingDrawing(null)
  setFormData({
  projectId: '',
  name: '',
  category: '',
  remarks: '',
  position: '',
  files: []
  })
  }

  const filteredDrawings = drawings.filter(drawing => {
  if (filterProject && drawing.projectId !== filterProject) return false
  if (filterCategory && drawing.category !== filterCategory) return false
  return true
  })

  const getProjectName = (projectId: number) => {
  const project = projects.find(p => p.id === projectId)
  return project?.name || '未分配'
  }

  const columns = createDrawingColumns(getProjectName, handleEdit, handleDelete)

  if (loading) {
  return <Spinner size="lg" text="加载图纸数据..." />
  }

  return (
  <PageContainer>
  {ConfirmDialog}
  {/* 页面标题 */}
  <div className="flex items-center justify-between mb-8">
  <div>
  <h1 className="text-base font-semibold tracking-tight text-[color:var(--fg)]">图纸管理</h1>
  <p className="text-[color:var(--muted)] mt-1">查看与管理所有工程图纸及修订版本</p>
  </div>
  <div className="flex items-center gap-3">
  {/* S26 Stitch: 画廊 / 列表切换 */}
  <div className="inline-flex rounded-lg p-0.5" style={{ background: 'var(--panel-2)' }}>
    {([['gallery', '画廊', 'Image'], ['list', '列表', 'List']] as const).map(([mode, label, icon]) => {
      const active = viewMode === mode
      return (
        <button key={mode} onClick={() => setViewMode(mode)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
          style={active ? { background: 'var(--card)', color: 'var(--fg)', boxShadow: 'var(--shadow-card)' } : { background: 'transparent', color: 'var(--muted)' }}>
          <Icon name={icon} size={14} />
          {label}
        </button>
      )
    })}
  </div>
  <Button
  onClick={() => {
  resetForm()
  setShowModal(true)
  }}
  
   variant="primary" className="px-6 py-3 flex items-center">
  <span className="text-xl mr-2">+</span>
  上传图纸
  </Button>
  </div>
  </div>

  {/* S26 Stitch: category pill-tabs + project filter (no stat cards) */}
  <div className="flex items-center gap-3 mb-6 flex-wrap">
    <div className="flex items-center gap-1.5">
      {['', ...categories].map(cat => (
        <button
          key={cat}
          onClick={() => setFilterCategory(cat)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            filterCategory === cat
              ? 'bg-[color:var(--accent)] text-[color:var(--on-accent)]'
              : 'bg-[color:var(--panel-2)] text-[color:var(--fg-2)] hover:bg-[color:var(--panel-2)]'
          }`}
        >
          {cat || '全部'}
        </button>
      ))}
    </div>
    <select
      value={filterProject}
      onChange={e => setFilterProject(e.target.value ? Number(e.target.value) : '')}
      className="px-3 py-1.5 border border-[color:var(--border)] rounded-lg text-xs bg-[color:var(--card)]"
    >
      <option value="">全部项目</option>
      {projects.map(project => (
        <option key={project.id} value={project.id}>{project.name}</option>
      ))}
    </select>
  </div>

  {/* 图纸列表 */}
  {filteredDrawings.length > 0 ? (
  viewMode === 'gallery' ? (
  <DrawingsGallery
    drawings={filteredDrawings}
    getProjectName={getProjectName}
    onOpen={setViewerDrawing}
    onEdit={handleEdit}
    onDelete={handleDelete}
  />
  ) : (
  <DataTable
    data={filteredDrawings}
    columns={columns}
    rowKey="id"
    showContainer={true}
    stickyHeader={true}
    useHoverScrollbar={true}
    onRowClick={(d) => setViewerDrawing(d)}
    emptyText="暂无图纸"
    emptyIcon="Ruler"
  />
  )
  ) : (
  <EmptyState icon="Ruler" title="暂无图纸" description="点击下方按钮上传您的第一张图纸"
  action={<Button onClick={() => { resetForm(); setShowModal(true) }}  variant="primary" className="px-6 py-3">上传图纸</Button>}
  />
  )}

  <DrawingsFormModal
    showModal={showModal}
    editingDrawing={editingDrawing}
    formData={formData}
    setFormData={setFormData}
    projects={projects}
    uploading={uploading}
    uploadProgress={uploadProgress}
    handleSubmit={handleSubmit}
    handleFilesAdd={handleFilesAdd}
    handleFileRemove={handleFileRemove}
    setShowModal={setShowModal}
    resetForm={resetForm}
  />

  {/* S27 图纸查看器（Lightbox） */}
  {viewerDrawing && (
    <DrawingViewer
      drawing={viewerDrawing}
      projectName={getProjectName(viewerDrawing.projectId)}
      onClose={() => setViewerDrawing(null)}
    />
  )}
  </PageContainer>
  )
}

export default Drawings
