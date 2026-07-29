import React, { useState, useEffect, useRef } from 'react'
import { Icon } from './ui/Icon'
import { Card } from './ui/Card'
import PageContainer from './ui/PageContainer'
import { Drawer } from './ui/Drawer'
import PageHeader from './ui/PageHeader'
import { EmptyState } from './ui/EmptyState'
import { Input } from './ui/Input/Input'
import { ContractTemplate, TemplateType, TemplateVariable } from '../types/electron'
import { useToastStore } from '@/store/toastStore'
import { useConfirm } from '@/hooks/useConfirm'
import { Spinner } from './ui/Loading/Loading'
import { ContractTemplateFormModal, templateTypeConfig } from './ContractTemplateFormModal'
import { getAPI } from '@/services/api-adapter'
import { printContractTemplate } from '../utils/printContractTemplate'
import { Button } from './ui/Button'

interface ContractTemplatesProps {
  refresh?: () => void
  onBack?: () => void
}

const ContractTemplates: React.FC<ContractTemplatesProps> = ({ refresh, onBack }) => {
  const showToast = useToastStore(state => state.showToast)
  const { confirm, ConfirmDialog } = useConfirm()
  const [templates, setTemplates] = useState<ContractTemplate[]>([])

  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<ContractTemplate | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null)
  const printRef = useRef<HTMLDivElement>(null)
  
  const [formData, setFormData] = useState({
  name: '',
  type: 'income' as TemplateType,
  description: '',
  variables: [] as TemplateVariable[]
  })

  const [generateForm, setGenerateForm] = useState<Record<string, string>>({})

  useEffect(() => {
  loadData()
  }, [])

  const loadData = async () => {
  try {
  const templatesResult = await (await getAPI()).getContractTemplates()
  if (templatesResult.success && templatesResult.data) setTemplates(templatesResult.data)
  } catch (error) {
  console.error('加载数据失败:', error)
  } finally {
  setLoading(false)
  }
  }

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  try {
  const data = {
  ...formData,
  variables: formData.variables
  }
  
  if (editingTemplate) {
  await (await getAPI()).updateContractTemplate({ ...editingTemplate, ...data })
  } else {
  await (await getAPI()).createContractTemplate(data)
  }
  loadData()
  setShowModal(false)
  resetForm()
  refresh?.()
  showToast(editingTemplate ? '模板更新成功' : '模板创建成功', 'success')
  } catch (error: any) {
  console.error('保存模板失败:', error)
  showToast(error?.message || '保存失败', 'error')
  }
  }

  const handleEdit = (template: ContractTemplate) => {
  setEditingTemplate(template)
  setFormData({
  name: template.name,
  type: template.type,
  description: template.description,
  variables: template.variables || []
  })
  setShowModal(true)
  }

  const handleDelete = async (id: number) => {
  const ok = await confirm({ title: '确认删除', content: '确定要删除这个模板吗？', confirmVariant: 'danger' })
  if (ok) {
  try {
  await (await getAPI()).deleteContractTemplate(id)
  loadData()
  refresh?.()
  showToast('模板已删除', 'success')
  } catch (error: any) {
  console.error('删除模板失败:', error)
  showToast(error?.message || '删除失败', 'error')
  }
  }
  }

  const handleGenerate = (template: ContractTemplate) => {
  setSelectedTemplate(template)
  const initialVars: Record<string, string> = {}
  template.variables?.forEach(v => {
  initialVars[v.key] = v.defaultValue || ''
  })
  setGenerateForm(initialVars)
  setShowGenerateModal(true)
  }

  const handlePrint = () => {
  if (selectedTemplate) {
    // 修复: 原误传 formData.description(新建表单 state, 生成流程中为空) 导致打印正文恒空
    printContractTemplate(selectedTemplate, selectedTemplate.description || '', generateForm)
  }
}

  const addVariable = () => {
  setFormData(prev => ({
  ...prev,
  variables: [...prev.variables, { key: '', label: '', type: 'text', defaultValue: '', required: false }]
  }))
  }

  const updateVariable = (index: number, field: string, value: any) => {
  setFormData(prev => {
  const newVars = [...prev.variables]
  newVars[index] = { ...newVars[index], [field]: value }
  return { ...prev, variables: newVars }
  })
  }

  const removeVariable = (index: number) => {
  setFormData(prev => ({
  ...prev,
  variables: prev.variables.filter((_, i) => i !== index)
  }))
  }

  const resetForm = () => {
  setEditingTemplate(null)
  setFormData({
  name: '',
  type: 'income',
  description: '',
  variables: []
  })
  }

  const stats = {
  total: templates.length,
  byType: templates.reduce((acc, t) => {
  acc[t.type] = (acc[t.type] || 0) + 1
  return acc
  }, {} as Record<string, number>)
  }

  if (loading) {
  return (
  <div className="flex items-center justify-center h-full">
  <Spinner size="lg" />
  </div>
  )
  }

  return (
  <PageContainer>
  {ConfirmDialog}
  {/* 打印内容容器 */}
  <div ref={printRef} className="hidden print:block"></div>

  <PageHeader title="合同模板" subtitle="在线编辑的文本变量模板：编辑正文、绑定变量、填值后直接打印（Word/Excel 文件模板请用「模板管理」）" onBack={onBack}
  actions={
  <Button onClick={() => { resetForm(); setShowModal(true) }}  variant="primary">
  <span className="text-xl">+</span> 添加模板
  </Button>
  }
  />

  {/* 统计卡片 */}
  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
  <Card bordered={false} className="p-4">
  <p className="text-sm" style={{ color: 'var(--muted)' }}>模板总数</p>
  <p className="text-numeric-xl font-mono tabular-nums tracking-tight" style={{ color: 'var(--fg)' }}>{stats.total}</p>
  </Card>
  {Object.entries(templateTypeConfig).map(([type, config]) => (
  <Card key={type} bordered={false} className="p-4">
  <p className="text-sm" style={{ color: 'var(--muted)' }}>{config.label}</p>
  <p className="text-numeric-xl font-mono tabular-nums tracking-tight" style={{ color: 'var(--fg)' }}>{stats.byType[type] || 0}</p>
  </Card>
  ))}
  </div>

  {/* 模板列表 */}
  {templates.length > 0 ? (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {templates.map(template => (
  <Card key={template.id} bordered={false} hoverable className="hover:shadow-md transition-all">
  <div className="p-5">
  <div className="flex items-start justify-between mb-4">
  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
  <Icon name={templateTypeConfig[template.type].icon} size={24} />
  </div>
  <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: 'var(--panel-2)', color: 'var(--muted)' }}>
  {templateTypeConfig[template.type].label}
  </span>
  </div>
  
  <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--fg)' }}>{template.name}</h3>
  <p className="text-sm mb-4 line-clamp-2" style={{ color: 'var(--muted)' }}>{template.description || '暂无描述'}</p>
  
  {template.variables && template.variables.length > 0 && (
  <div className="mb-4">
  <p className="text-xs mb-2" style={{ color: 'var(--muted)' }}>模板变量 ({template.variables.length}个)</p>
  <div className="flex flex-wrap gap-1">
  {template.variables.slice(0, 3).map((v, idx) => (
  <span key={idx} className="px-2 py-0.5 rounded text-xs" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
  {v.label || v.key}
  </span>
  ))}
  {template.variables.length > 3 && (
  <span className="px-2 py-0.5 rounded text-xs" style={{ background: 'var(--panel-2)', color: 'var(--muted)' }}>
  +{template.variables.length - 3}
  </span>
  )}
  </div>
  </div>
  )}
  
  <div className="text-xs mb-4" style={{ color: 'var(--muted)' }}>
  创建于 {new Date(template.createdAt).toLocaleDateString()}
  </div>
  
  <div className="flex items-center gap-2 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
  <Button
  onClick={() => handleGenerate(template)}
  
   variant="primary" size="sm" className="flex-1 ">
  <Icon name="File" size={14} /> 生成合同
  </Button>
  <Button
  onClick={() => handleEdit(template)}
  
   variant="secondary" size="sm">
  编辑
  </Button>
  <Button
  onClick={() => handleDelete(template.id)}
  
   variant="danger" size="sm">
  删除
  </Button>
  </div>
  </div>
  </Card>
  ))}
  </div>
  ) : (
  <EmptyState icon="FileText" title="暂无合同模板" description="点击下方按钮创建您的第一个合同模板"
  action={<Button onClick={() => { resetForm(); setShowModal(true) }}  variant="primary">添加模板</Button>}
  />
  )}

  {showModal && (
  <ContractTemplateFormModal
  editingTemplate={editingTemplate}
  formData={formData}
  setFormData={setFormData}
  onClose={() => { setShowModal(false); resetForm() }}
  onSubmit={handleSubmit}
  onFileUpload={() => {}}
  onAddVariable={addVariable}
  onUpdateVariable={updateVariable}
  onRemoveVariable={removeVariable}
  />
  )}

  <Drawer open={showGenerateModal && !!selectedTemplate} onClose={() => { setShowGenerateModal(false); setSelectedTemplate(null) }}
  dirty={Object.values(generateForm).some(v => v && v.trim() !== '')}
  icon="Stamp" title="生成合同" width={560}
  footer={<div className="flex items-center justify-end gap-3">
  <Button onClick={() => { setShowGenerateModal(false); setSelectedTemplate(null) }}  variant="secondary">取消</Button>
  <Button onClick={handlePrint}  variant="primary"><Icon name="Printer" size={14} /> 打印合同</Button>
  </div>}>
  <div className="px-6 py-4">
  <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>填写模板变量，生成合同文档</p>
  <div className="space-y-4">
  {selectedTemplate?.variables?.map(variable => (
  <div key={variable.key}>
  <label className="label">{variable.label || variable.key}{variable.required && <span className="ml-1" style={{ color: 'var(--danger)' }}>*</span>}</label>
  {variable.type === 'date' ? (
  <Input size="sm" type="date" value={generateForm[variable.key] || ''} onChange={e => setGenerateForm({ ...generateForm, [variable.key]: e.target.value })} />
  ) : variable.type === 'number' ? (
  <Input size="sm" type="number" value={generateForm[variable.key] || ''} onChange={e => setGenerateForm({ ...generateForm, [variable.key]: e.target.value })} placeholder={variable.defaultValue || `请输入${variable.label || variable.key}`} />
  ) : (
  <Input size="sm" type="text" value={generateForm[variable.key] || ''} onChange={e => setGenerateForm({ ...generateForm, [variable.key]: e.target.value })} placeholder={variable.defaultValue || `请输入${variable.label || variable.key}`} />
  )}
  </div>
  ))}
  <div className="mt-6 pt-6" style={{ borderTop: '1px solid var(--border)' }}>
  <h3 className="font-medium mb-3" style={{ color: 'var(--fg)' }}>合同预览</h3>
  <div className="rounded-xl p-6 max-h-[300px] overflow-y-auto text-sm leading-relaxed" style={{ background: 'var(--panel-2)' }}>
  {(() => {
  let content = selectedTemplate?.description || ''
  selectedTemplate?.variables?.forEach(v => {
  const value = generateForm[v.key] || v.defaultValue || `【${v.label || v.key}】`
  // split/join 字面量全替换：key 含正则元字符时 new RegExp 会抛异常或误匹配
  content = content.split(`{{${v.key}}}`).join(`【${value}】`)
  })
  return content.split('\n').map((line, i) => <p key={i} style={{ textIndent: '2em' }}>{line}</p>)
  })()}
  </div>
  </div>
  </div>
  </div>
  </Drawer>
  </PageContainer>
  )
}

export default ContractTemplates
