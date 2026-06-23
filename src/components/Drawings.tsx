import React, { useState, useEffect } from 'react'
import { DataTable, type Column } from '@/components/DataTable'
import FilterBar from './ui/FilterBar'
import Spinner from './ui/Spinner'
import { Drawing, Project } from '../types/electron'
import { Icon } from './ui/Icon'
import PageContainer from './ui/PageContainer'
import { EmptyState } from './ui/EmptyState'
import { useToastStore } from '@/store/toastStore'
import { useConfirm } from '@/hooks/useConfirm'
import { logCreate, logUpdate, logDelete } from '../utils/audit'
import { getAPI } from '@/services/api-adapter'
import { categories, categoryIcons, categoryColors } from './drawingsConstants'
import { DrawingsFormModal } from './DrawingsFormModal'
import type { FormDataState } from './DrawingsFormModal'

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
  const [filterPosition, setFilterPosition] = useState<string>('')
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
  if (filterPosition && !(drawing.position || '').includes(filterPosition)) return false
  return true
  })

  const getProjectName = (projectId: number) => {
  const project = projects.find(p => p.id === projectId)
  return project?.name || '未分配'
  }

  const columns: Column<Drawing>[] = [
    { key: 'name', title: '图纸名称', render: (item) => (
      <div className="flex items-center gap-2">
        <Icon name={categoryIcons[item.category || ''] || 'File'} size={18} className="text-slate-400" />
        <span className="font-medium text-slate-800">{item.name}</span>
      </div>
    )},
    { key: 'projectId', title: '所属项目', render: (item) => <span className="text-sm text-slate-600">{getProjectName(item.projectId)}</span> },
    { key: 'category', title: '图纸类型', render: (item) => (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${categoryColors[item.category || ''] || 'bg-slate-100 text-slate-800'}`}>
        {item.category || '其他'}
      </span>
    )},
    { key: 'position', title: '部位', render: (item) => <span className="text-sm text-slate-600">{item.position || '-'}</span> },
    { key: 'remarks', title: '备注', render: (item) => <span className="text-sm text-slate-600 max-w-xs truncate">{item.remarks || '-'}</span> },
    { key: 'createdAt', title: '上传日期', render: (item) => <span className="text-sm text-slate-500">{new Date(item.createdAt).toLocaleDateString('zh-CN')}</span> },
    { key: 'actions', title: '操作', align: 'center', render: (item) => (
      <div className="flex items-center justify-center gap-2">
        <button onClick={() => handleEdit(item)} className="btn btn-ghost btn-sm">编辑</button>
        <button onClick={() => handleDelete(item.id)} className="btn btn-danger btn-sm">删除</button>
      </div>
    )},
  ]

  if (loading) {
  return <Spinner size="lg" text="加载图纸数据..." />
  }

  return (
  <PageContainer>
  {ConfirmDialog}
  {/* 页面标题 */}
  <div className="flex items-center justify-between mb-8">
  <div>
  <h1 className="text-2xl font-bold text-slate-800">图纸管理</h1>
  <p className="text-slate-500 mt-1">上传和管理工程图纸</p>
  </div>
  <button
  onClick={() => {
  resetForm()
  setShowModal(true)
  }}
  className="btn btn-primary px-6 py-3 flex items-center"
  >
  <span className="text-xl mr-2">+</span>
  上传图纸
  </button>
  </div>

  {/* 统计卡片 */}
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
  <div className="bg-white rounded-xl shadow-sm p-4">
  <p className="text-sm text-slate-500">图纸总数</p>
  <p className="text-2xl font-bold text-slate-800">{filteredDrawings.length}</p>
  </div>
  <div className="bg-white rounded-xl shadow-sm p-4">
  <p className="text-sm text-slate-500">涉及项目</p>
  <p className="text-2xl font-bold text-slate-800">{new Set(filteredDrawings.map(d => d.projectId)).size}</p>
  </div>
  <div className="bg-white rounded-xl shadow-sm p-4">
  <p className="text-sm text-slate-500">图纸类型</p>
  <p className="text-2xl font-bold text-slate-800">{new Set(filteredDrawings.map(d => d.category)).size}</p>
  </div>
  </div>

  {/* 筛选器 */}
  <FilterBar className="mb-6">
  <div className="flex items-center gap-2">
  <label className="text-sm text-slate-600">筛选项目</label>
  <select
  value={filterProject}
  onChange={e => setFilterProject(e.target.value ? Number(e.target.value) : '')}
  className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
  >
  <option value="">全部项目</option>
  {projects.map(project => (
  <option key={project.id} value={project.id}>{project.name}</option>
  ))}
  </select>
  </div>
  <div className="flex items-center gap-2">
  <label className="text-sm text-slate-600">筛选类型</label>
  <select
  value={filterCategory}
  onChange={e => setFilterCategory(e.target.value)}
  className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
  >
  <option value="">全部类型</option>
  {categories.map(cat => (
  <option key={cat} value={cat}>{cat}</option>
  ))}
  </select>
  </div>
  <div className="flex items-center gap-2">
  <label className="text-sm text-slate-600">筛选部位</label>
  <input
  type="text"
  value={filterPosition}
  onChange={e => setFilterPosition(e.target.value)}
  className="px-3 py-2 border border-slate-300 rounded-lg text-sm w-36 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
  placeholder="输入部位名称..."
  />
  </div>
  </FilterBar>

  {/* 图纸列表 */}
  {filteredDrawings.length > 0 ? (
  <DataTable
    data={filteredDrawings}
    columns={columns}
    rowKey="id"
    pagination={false}
    showContainer={true}
    stickyHeader={true}
    useHoverScrollbar={true}
    emptyText="暂无图纸"
    emptyIcon="Ruler"
  />
  ) : (
  <EmptyState icon="Ruler" title="暂无图纸" description="点击下方按钮上传您的第一张图纸"
  action={<button onClick={() => { resetForm(); setShowModal(true) }} className="btn btn-primary px-6 py-3">上传图纸</button>}
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
  </PageContainer>
  )
}

export default Drawings
