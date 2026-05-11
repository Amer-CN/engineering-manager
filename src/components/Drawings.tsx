import React, { useState, useEffect, useRef } from 'react'
import { Drawing, Project } from '../types/electron'
import { motion } from 'framer-motion'
import { Icon } from './ui/Icon'
import { EmptyState } from './ui/EmptyState'
import { useToastContext } from '../hooks/useToast'

interface DrawingsProps {
  refresh?: () => void
}

const Drawings: React.FC<DrawingsProps> = ({ refresh }) => {
  const { showToast } = useToastContext()
  const [drawings, setDrawings] = useState<Drawing[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingDrawing, setEditingDrawing] = useState<Drawing | null>(null)
  const [filterProject, setFilterProject] = useState<number | ''>('')
  const [filterCategory, setFilterCategory] = useState<string>('')
  const [formData, setFormData] = useState({
    projectId: '' as number | '',
    name: '',
    category: '',
    remarks: '',
    file: null as File | null
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [drawingsResult, projectsResult] = await Promise.all([
        window.electronAPI.getDrawings(),
        window.electronAPI.getProjects()
      ])

      if (drawingsResult.success && drawingsResult.data) setDrawings(drawingsResult.data)
      if (projectsResult.success && projectsResult.data) setProjects(projectsResult.data)
    } catch (error) {
      console.error('加载数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData({ ...formData, file })
      if (!formData.name && file) {
        setFormData({ ...formData, name: file.name.replace(/\.[^/.]+$/, ''), file })
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!editingDrawing && !formData.file) {
      showToast('请选择要上传的文件', 'error')
      return
    }

    try {
      if (editingDrawing) {
        await window.electronAPI.updateDrawing({
          ...editingDrawing,
          projectId: formData.projectId as number,
          name: formData.name,
          category: formData.category,
          remarks: formData.remarks
        })
        loadData()
        setShowModal(false)
        resetForm()
        refresh?.()
        showToast('图纸更新成功', 'success')
      } else if (formData.file) {
        const reader = new FileReader()
        reader.onload = async (event) => {
          const base64 = event.target?.result as string
          const base64Data = base64.split(',')[1]

          await window.electronAPI.uploadDrawing({
            projectId: formData.projectId as number,
            name: formData.name,
            category: formData.category,
            remarks: formData.remarks,
            fileName: formData.file!.name,
            fileData: base64Data
          })

          loadData()
          setShowModal(false)
          resetForm()
          refresh?.()
          showToast('图纸上传成功', 'success')
        }
        reader.readAsDataURL(formData.file)
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
      file: null
    })
    setShowModal(true)
  }

  const handleDelete = async (id: number) => {
    if (confirm('确定要删除这张图纸吗？')) {
      try {
        await window.electronAPI.deleteDrawing(id)
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
      file: null
    })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
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

  const categories = ['建筑图', '结构图', '电气图', '给排水图', '暖通图', '装饰图', '其他']
  const categoryIcons: Record<string, string> = {
    '建筑图': 'Building2',
    '结构图': 'HardHat',
    '电气图': 'Settings',
    '给排水图': 'Droplets',
    '暖通图': 'Snowflake',
    '装饰图': 'Palette',
    '其他': 'File'
  }

  const categoryColors: Record<string, string> = {
    '建筑图': 'bg-blue-100 text-blue-800',
    '结构图': 'bg-orange-100 text-orange-800',
    '电气图': 'bg-yellow-100 text-yellow-800',
    '给排水图': 'bg-cyan-100 text-cyan-800',
    '暖通图': 'bg-purple-100 text-purple-800',
    '装饰图': 'bg-pink-100 text-pink-800',
    '其他': 'bg-slate-100 text-slate-800'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">图纸管理</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">上传和管理工程图纸</p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setShowModal(true)
          }}
          className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center"
        >
          <span className="text-xl mr-2">+</span>
          上传图纸
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4">
          <p className="text-sm text-slate-500">图纸总数</p>
          <p className="text-2xl font-bold text-slate-800">{filteredDrawings.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4">
          <p className="text-sm text-slate-500">涉及项目</p>
          <p className="text-2xl font-bold text-slate-800">{new Set(filteredDrawings.map(d => d.projectId)).size}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4">
          <p className="text-sm text-slate-500">图纸类型</p>
          <p className="text-2xl font-bold text-slate-800">{new Set(filteredDrawings.map(d => d.category)).size}</p>
        </div>
      </div>

      {/* 筛选器 */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4 mb-6 flex items-center gap-4">
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
      </div>

      {/* 图纸列表 */}
      {filteredDrawings.length > 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm">
          <table className="w-full border-separate border-spacing-0">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase bg-slate-50">图纸名称</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase bg-slate-50">所属项目</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase bg-slate-50">图纸类型</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase bg-slate-50">备注</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase bg-slate-50">上传日期</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase bg-slate-50">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDrawings.map(drawing => (
                <tr key={drawing.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Icon name={categoryIcons[drawing.category || ''] || 'File'} size={18} className="text-slate-400" />
                      <span className="font-medium text-slate-800">{drawing.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{getProjectName(drawing.projectId)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${categoryColors[drawing.category || ''] || 'bg-slate-100 text-slate-800'}`}>
                      {drawing.category || '其他'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate">{drawing.remarks || '-'}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{new Date(drawing.createdAt).toLocaleDateString('zh-CN')}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleEdit(drawing)}
                        className="px-3 py-1 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDelete(drawing.id)}
                        className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon="Ruler" title="暂无图纸" description="点击下方按钮上传您的第一张图纸"
          action={<button onClick={() => { resetForm(); setShowModal(true) }} className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">上传图纸</button>}
        />
      )}

      {/* 模态框 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md mx-4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-800">
                {editingDrawing ? '编辑图纸' : '上传图纸'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">所属项目*</label>
                  <select
                    value={formData.projectId}
                    onChange={e => setFormData({ ...formData, projectId: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  >
                    <option value="">请选择项目</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">图纸名称 *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">图纸类型</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">请选择类型</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                    {editingDrawing ? '替换文件 (可选' : '选择文件 *'}
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf,.dwg,.dxf"
                    onChange={handleFileChange}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">支持 JPG、PNG、PDF、DWG、DXF 格式</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">备注说明</label>
                  <textarea
                    value={formData.remarks}
                    onChange={e => setFormData({ ...formData, remarks: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    rows={3}
                    placeholder="请输入图纸的备注说明..."
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    resetForm()
                  }}
                  className="px-6 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                >
                  {editingDrawing ? '保存' : '上传'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default Drawings
