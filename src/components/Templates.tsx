/**
 * Templates.tsx - 模板管理页面（看板+分类详情）
 */
import React, { useState, useEffect, useCallback } from 'react'
import type { Template, TemplateCategory } from '../types/electron'
import { useToastStore } from '@/store/toastStore'
import { useConfirm } from '@/hooks/useConfirm'
import { Spinner } from './ui/Loading/Loading'
import PageHeader from './ui/PageHeader'
import PageContainer from './ui/PageContainer'
import { TemplateDashboard, TemplateList, TemplateForm, TemplatePreview, TemplateGenerate } from './features/templates'
import { logCreate, logUpdate, logDelete } from '../utils/audit'
import { Drawer } from './ui/Drawer'
import { getAPI } from '@/services/api-adapter'
import { usePermission } from '@/hooks/usePermission'

type ViewMode = 'dashboard' | 'detail'

const Templates: React.FC = () => {
  const showToast = useToastStore(state => state.showToast)
  const { confirm, ConfirmDialog } = useConfirm()
  const { can } = usePermission()
  const [templates, setTemplates] = useState<Template[]>([])
  const [stats, setStats] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<ViewMode>('dashboard')
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory>('contract')
  const [showModal, setShowModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  // 子表单用户编辑过即 dirty（误触关闭先弹确认），关闭时重置
  const [formDirty, setFormDirty] = useState(false)
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null)
  const [generateTemplate, setGenerateTemplate] = useState<Template | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const api = await getAPI()
      const [tResult, sResult] = await Promise.allSettled([
        api.getTemplates(),
        api.getTemplateStats(),
      ])
      const get = (r: PromiseSettledResult<any>) => r.status === 'fulfilled' && r.value?.success ? r.value.data || [] : []
      setTemplates(get(tResult))
      const statsData = sResult.status === 'fulfilled' && sResult.value?.success ? sResult.value.data || {} : {}
      setStats(statsData)
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
    // G2 B1: 模板管理写操作 → settings:update
    if (!can('settings:update')) { showToast('您没有管理模板的权限', 'error'); return }
    setEditingTemplate(null)
    setShowModal(true)
  }

  const handleEdit = (template: Template) => {
    if (!can('settings:update')) { showToast('您没有管理模板的权限', 'error'); return }
    setEditingTemplate(template)
    setShowModal(true)
  }

  const handleDelete = async (id: number) => {
    if (!can('settings:update')) { showToast('您没有管理模板的权限', 'error'); return }
    const ok = await confirm({ title: '确认删除', content: '确定删除此模板？关联文件也将被删除。', confirmVariant: 'danger' })
    if (!ok) return
    try {
      const template = templates.find(t => t.id === id)
      const result = await (await getAPI()).deleteTemplate(id)
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
    if (!can('settings:update')) { showToast('您没有管理模板的权限', 'error'); return }
    try {
      if (editingTemplate) {
        const result = await (await getAPI()).updateTemplate({ ...editingTemplate, ...formData })
        if (!result.success) throw new Error(result.error || '更新失败')
        logUpdate('templates', formData.name, editingTemplate.id, { before: editingTemplate, after: formData })
        showToast('模板已更新', 'success')
      } else {
        const result = await (await getAPI()).createTemplate(formData)
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
        <Spinner size="lg" />
      </div>
    )
  }

  // 分类详情视图
  if (view === 'detail') {
    const categoryTemplates = templates.filter(t => t.category === selectedCategory)
    return (
      <PageContainer>
        {ConfirmDialog}
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

        <Drawer open={showModal} onClose={() => { setShowModal(false); setEditingTemplate(null); setFormDirty(false) }} dirty={formDirty}
          icon="FileText" title={editingTemplate ? '编辑模板' : '新建模板'} width={560}>
          <TemplateForm template={editingTemplate} onSubmit={handleSubmit}
            onDirtyChange={() => setFormDirty(true)}
            onCancel={() => { setShowModal(false); setEditingTemplate(null); setFormDirty(false) }} />
        </Drawer>

        {/* Preview modal */}
        {previewTemplate && (
          <TemplatePreview template={previewTemplate} onClose={() => setPreviewTemplate(null)} />
        )}

        {/* Generate modal */}
        {generateTemplate && (
          <TemplateGenerate template={generateTemplate} onClose={() => setGenerateTemplate(null)} />
        )}
      </PageContainer>
    )
  }

  // 看板首页
  return (
    <PageContainer>
      {ConfirmDialog}
      <PageHeader title="模板管理" subtitle="Word/Excel 文件模板：上传文件、识别 {{变量}}、填值生成文档（在线编辑的合同文本模板请用「合同管理 → 合同模板库」）" />
      <TemplateDashboard
        templates={templates}
        stats={stats}
        onCategoryClick={handleCategoryClick}
      />
    </PageContainer>
  )
}

export default Templates
