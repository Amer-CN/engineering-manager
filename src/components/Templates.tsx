/**
 * Templates.tsx - 模板管理页面（看板+分类详情）
 */
import React, { useState, useEffect, useCallback } from 'react'
import type { Template, TemplateCategory } from '../types/electron'
import { useToastContext } from '../hooks/useToast'
import { TemplateDashboard, TemplateList, TemplateForm, TemplatePreview, TemplateGenerate } from './features/templates'
import { logCreate, logUpdate, logDelete } from '../utils/audit'
import { motion } from 'framer-motion'
import { Icon } from './ui/Icon'

type ViewMode = 'dashboard' | 'detail'

const Templates: React.FC = () => {
  const { showToast } = useToastContext()
  const [templates, setTemplates] = useState<Template[]>([])
  const [stats, setStats] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<ViewMode>('dashboard')
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory>('contract')
  const [showModal, setShowModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null)
  const [generateTemplate, setGenerateTemplate] = useState<Template | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [tResult, sResult] = await Promise.all([
        window.electronAPI.getTemplates(),
        window.electronAPI.getTemplateStats(),
      ])
      if (tResult.success && tResult.data) setTemplates(tResult.data)
      if (sResult.success && sResult.data) setStats(sResult.data)
    } catch (error) {
      console.error('加载模板数据失败:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleCategoryClick = (category: TemplateCategory) => {
    setSelectedCategory(category)
    setView('detail')
  }

  const handleBack = () => {
    setView('dashboard')
    loadData()
  }

  const handleCreate = () => {
    setEditingTemplate(null)
    setShowModal(true)
  }

  const handleEdit = (template: Template) => {
    setEditingTemplate(template)
    setShowModal(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除此模板？关联文件也将被删除。')) return
    try {
      const template = templates.find(t => t.id === id)
      const result = await window.electronAPI.deleteTemplate(id)
      if (result.success) {
        logDelete('templates', template?.name || '模板', id, { name: template?.name })
        loadData()
        showToast('模板已删除', 'success')
      } else {
        showToast(result.error || '删除失败', 'error')
      }
    } catch (error: any) {
      showToast(error?.message || '删除失败', 'error')
    }
  }

  const handleSubmit = async (formData: any) => {
    try {
      if (editingTemplate) {
        const result = await window.electronAPI.updateTemplate({ ...editingTemplate, ...formData })
        if (!result.success) throw new Error(result.error || '更新失败')
        logUpdate('templates', formData.name, editingTemplate.id, { before: editingTemplate, after: formData })
        showToast('模板已更新', 'success')
      } else {
        const result = await window.electronAPI.createTemplate(formData)
        if (!result.success) throw new Error(result.error || '创建失败')
        logCreate('templates', formData.name, result.data?.id, formData)
        const varCount = result.data?.variables?.length || 0
        showToast(varCount > 0 ? `模板已创建，自动识别到 ${varCount} 个变量` : '模板已创建', 'success')
      }
      loadData()
      setShowModal(false)
      setEditingTemplate(null)
    } catch (error: any) {
      showToast(error.message || '操作失败', 'error')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    )
  }

  // 分类详情视图
  if (view === 'detail') {
    const categoryTemplates = templates.filter(t => t.category === selectedCategory)
    return (
      <div className="p-6 max-w-[1400px] mx-auto">
        <TemplateList
          category={selectedCategory}
          templates={categoryTemplates}
          onBack={handleBack}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onPreview={setPreviewTemplate}
          onGenerate={setGenerateTemplate}
          onCreate={handleCreate}
        />

        {/* Create/Edit modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <motion.div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                <h2 className="text-lg font-semibold text-slate-800">
                  {editingTemplate ? '编辑模板' : '新建模板'}
                </h2>
                <button onClick={() => { setShowModal(false); setEditingTemplate(null) }} className="text-slate-400 hover:text-slate-600">
                  <Icon name="X" size={18} />
                </button>
              </div>
              <div className="overflow-y-auto flex-1">
                <TemplateForm
                  template={editingTemplate}
                  onSubmit={handleSubmit}
                  onCancel={() => { setShowModal(false); setEditingTemplate(null) }}
                />
              </div>
            </motion.div>
          </div>
        )}

        {/* Preview modal */}
        {previewTemplate && (
          <TemplatePreview template={previewTemplate} onClose={() => setPreviewTemplate(null)} />
        )}

        {/* Generate modal */}
        {generateTemplate && (
          <TemplateGenerate template={generateTemplate} onClose={() => setGenerateTemplate(null)} />
        )}
      </div>
    )
  }

  // 看板首页
  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">模板管理</h1>
          <p className="text-slate-500 mt-1">管理文档模板，支持 Word/Excel 文件上传与变量填充</p>
        </div>
      </div>
      <TemplateDashboard
        templates={templates}
        stats={stats}
        onCategoryClick={handleCategoryClick}
      />
    </div>
  )
}

export default Templates
