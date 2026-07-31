import React, { useState, useEffect, useMemo } from 'react'
import { DataTable } from '@/components/DataTable'
import Spinner from './ui/Spinner'
import { Drawing, Project } from '../types/electron'
import PageContainer from './ui/PageContainer'
import { EmptyState } from './ui/EmptyState'
import { useToastStore } from '@/store/toastStore'
import { useConfirm } from '@/hooks/useConfirm'
import { logCreate, logUpdate, logDelete } from '../utils/audit'
import { getAPI } from '@/services/api-adapter'
import { categories, normalizeDrawingCategory } from './drawingsConstants'
import { DrawingsFormModal } from './DrawingsFormModal'
import type { FormDataState } from './DrawingsFormModal'
import { Button } from './ui/Button'
import { Icon } from './ui/Icon'
import { createDrawingColumns } from './features/drawings/drawingsColumns'
import { DrawingsGallery } from './features/drawings/DrawingsGallery'
import { DrawingViewer } from './features/drawings/DrawingViewer'
import { useDrawingsView } from './features/drawings/useDrawingsView'
import { buildDrawingStackGroups } from './features/drawings/drawingStackGroups'
import { FolderStack3D, STACK_GROUP_LIMIT, type StackGroup } from '@/components/ui/FolderStack3D'

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
  // Stage-Surface 红线：扁平视图默认（列表），堆叠主动进入且选择持久化 localStorage
  const { viewMode, setViewMode } = useDrawingsView()
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

  const filteredDrawings = useMemo(() => drawings.filter(drawing => {
  if (filterProject && drawing.projectId !== filterProject) return false
  // 类别比较走归一：脏类别归「其他」，与堆叠分组计数/展示口径一致（B1 方案 C）
  if (filterCategory && normalizeDrawingCategory(drawing.category) !== filterCategory) return false
  return true
  }), [drawings, filterProject, filterCategory])

  const getProjectName = (projectId: number) => {
  const project = projects.find(p => p.id === projectId)
  return project?.name || '未分配'
  }

  const columns = createDrawingColumns(getProjectName, handleEdit, handleDelete)

  // FolderStack3D：一张卡 = 一个类别分组；堆叠不受类别筛选影响（它本身就是类别导航），只受项目筛选
  // useMemo 稳定引用：否则每次渲染新数组 → StackCard 的 memo 永远失效，40 卡全量重渲染
  const stackGroups = useMemo(
    () => buildDrawingStackGroups(filterProject ? drawings.filter(d => d.projectId === filterProject) : drawings),
    [drawings, filterProject],
  )
  // 卡数门禁：超 40 强制回退列表（DESIGN.md § Stage Surfaces · 决策 4）
  const stackAllowed = stackGroups.length > 0 && stackGroups.length <= STACK_GROUP_LIMIT
  const effectiveView = viewMode === 'stack' && !stackAllowed ? 'list' : viewMode

  // 打开分组 = 带类别筛选回到扁平列表（舞台只做导航与概览，不承载操作）
  const handleStackOpen = (g: StackGroup) => {
    setFilterCategory(String(g.id))
    setViewMode('list')
  }

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
  {/* S26 画廊 / 列表 + Stage-Surface 堆叠（主动进入）切换 */}
  <div className="inline-flex rounded-lg p-0.5" style={{ background: 'var(--panel-2)' }}>
    {([['gallery', '画廊', 'Image'], ['list', '列表', 'List'], ...(stackAllowed ? [['stack', '堆叠', 'FolderKanban']] as const : [])] as ReadonlyArray<readonly [string, string, string]>).map(([mode, label, icon]) => {
      const active = effectiveView === mode
      return (
        <button key={mode} onClick={() => setViewMode(mode as 'gallery' | 'list' | 'stack')}
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

  {/* 图纸列表 / 画廊 / 堆叠舞台 */}
  {effectiveView === 'stack' ? (
  /* Stage-Surface 舞台区：只做导航与概览，打开分组回扁平列表 */
  <FolderStack3D
    groups={stackGroups}
    onOpen={handleStackOpen}
    onExit={() => setViewMode('list')}
    ariaLabel="图纸类别分组堆叠"
  />
  ) : filteredDrawings.length > 0 ? (
  effectiveView === 'gallery' ? (
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
