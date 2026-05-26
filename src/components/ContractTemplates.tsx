import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Icon } from './ui/Icon'
import { EmptyState } from './ui/EmptyState'
import { ContractTemplate, TemplateType, TemplateVariable } from '../types/electron'
import { useToastStore } from '@/store/toastStore'
import { ContractTemplateFormModal, templateTypeConfig } from './ContractTemplateFormModal'

interface ContractTemplatesProps {
  refresh?: () => void
  onBack?: () => void
}

const ContractTemplates: React.FC<ContractTemplatesProps> = ({ refresh, onBack }) => {
  const showToast = useToastStore(state => state.showToast)
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
    fileName: '',
    fileData: '',
    variables: [] as TemplateVariable[]
  })

  const [generateForm, setGenerateForm] = useState<Record<string, string>>({})

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [templatesResult] = await Promise.all([
        window.electronAPI.getContractTemplates()
      ])
      
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
        filePath: formData.fileName,
        variables: formData.variables
      }
      
      if (editingTemplate) {
        await window.electronAPI.updateContractTemplate({ ...editingTemplate, ...data })
      } else {
        await window.electronAPI.createContractTemplate(data)
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
      fileName: template.fileName,
      fileData: '',
      variables: template.variables || []
    })
    setShowModal(true)
  }

  const handleDelete = async (id: number) => {
    if (confirm('确定要删除这个模板吗？')) {
      try {
        await window.electronAPI.deleteContractTemplate(id)
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
      const variables = selectedTemplate.variables || []
      let content = formData.description || ''
      
      // 替换变量
      variables.forEach(v => {
        const value = generateForm[v.key] || v.defaultValue || ''
        content = content.replace(new RegExp(`\\{\\{${v.key}\\}\\}`, 'g'), value)
      })

      const printContent = `
        <div style="padding: 40px; font-family: 'SimSun', serif; font-size: 12pt; line-height: 1.8;">
          <div style="text-align: center; font-size: 18pt; font-weight: bold; margin-bottom: 30px;">
            ${templateTypeConfig[selectedTemplate.type].label}
          </div>
          ${content.split('\n').map(line => `<p style="text-indent: 2em; margin: 10px 0;">${line}</p>`).join('')}
          <div style="margin-top: 60px; display: flex; justify-content: space-between;">
            <div style="text-align: center; width: 30%;">
              <p>甲方（签章）:</p>
              <p style="margin-top: 40px;">___________</p>
              <p style="margin-top: 10px;">年  月  日</p>
            </div>
            <div style="text-align: center; width: 30%;">
              <p>乙方（签章）:</p>
              <p style="margin-top: 40px;">___________</p>
              <p style="margin-top: 10px;">年  月  日</p>
            </div>
          </div>
        </div>
      `
      
      const originalContent = document.body.innerHTML
      document.body.innerHTML = printContent
      window.print()
      document.body.innerHTML = originalContent
      window.location.reload()
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
      fileName: '',
      fileData: '',
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
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* 打印内容容器 */}
      <div ref={printRef} className="hidden print:block"></div>

      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          {onBack && (
            <button onClick={onBack}
              className="btn btn-ghost btn-sm flex items-center gap-1.5">
              <Icon name="ArrowLeft" size={16} />
              <span>返回看板</span>
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-slate-800">合同模板</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">管理合同模板，快速生成合同文档</p>
          </div>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true) }}
          className="btn btn-primary"
        >
          <span className="text-xl">+</span>
          添加模板
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4">
          <p className="text-sm text-slate-500">模板总数</p>
          <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
        </div>
        {Object.entries(templateTypeConfig).map(([type, config]) => (
          <div key={type} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4">
            <p className="text-sm text-slate-500">{config.label}</p>
            <p className="text-2xl font-bold text-slate-800">{stats.byType[type] || 0}</p>
          </div>
        ))}
      </div>

      {/* 模板列表 */}
      {templates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map(template => (
            <div key={template.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:shadow-md transition-all">
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                    template.type === 'income' ? 'bg-green-100' :
                    template.type === 'expense' ? 'bg-red-100' :
                    template.type === 'labor' ? 'bg-blue-100' :
                    template.type === 'material' ? 'bg-purple-100' : 'bg-slate-100'
                  }`}>
                    <Icon name={templateTypeConfig[template.type].icon} size={24} />
                  </div>
                  <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">
                    {templateTypeConfig[template.type].label}
                  </span>
                </div>
                
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">{template.name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">{template.description || '暂无描述'}</p>
                
                {template.variables && template.variables.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-slate-400 mb-2">模板变量 ({template.variables.length}个)</p>
                    <div className="flex flex-wrap gap-1">
                      {template.variables.slice(0, 3).map((v, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-primary-50 text-primary-600 rounded text-xs">
                          {v.label || v.key}
                        </span>
                      ))}
                      {template.variables.length > 3 && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 dark:text-slate-400 rounded text-xs">
                          +{template.variables.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="text-xs text-slate-400 mb-4">
                  创建于 {new Date(template.createdAt).toLocaleDateString()}
                </div>
                
                <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => handleGenerate(template)}
                    className="flex-1 btn btn-primary btn-sm"
                  >
                    <Icon name="File" size={14} /> 生成合同
                  </button>
                  <button
                    onClick={() => handleEdit(template)}
                    className="btn btn-secondary btn-sm"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="btn btn-danger btn-sm"
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon="FileText" title="暂无合同模板" description="点击下方按钮创建您的第一个合同模板"
          action={<button onClick={() => { resetForm(); setShowModal(true) }} className="btn btn-primary">添加模板</button>}
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

      {/* 生成合同模态框 */}
      {showGenerateModal && selectedTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-800">生成合同</h2>
                <p className="text-sm text-slate-500">填写模板变量，生成合同文档</p>
              </div>
              <button
                onClick={() => { setShowGenerateModal(false); setSelectedTemplate(null) }}
                className="text-slate-400 hover:text-slate-600"
              >
                <Icon name="X" size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div className="space-y-4">
                {selectedTemplate.variables?.map(variable => (
                  <div key={variable.key}>
                    <label className="label">
                      {variable.label || variable.key}
                      {variable.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {variable.type === 'date' ? (
                      <input
                        type="date"
                        value={generateForm[variable.key] || ''}
                        onChange={e => setGenerateForm({ ...generateForm, [variable.key]: e.target.value })}
                        className="input"
                      />
                    ) : variable.type === 'number' ? (
                      <input
                        type="number"
                        value={generateForm[variable.key] || ''}
                        onChange={e => setGenerateForm({ ...generateForm, [variable.key]: e.target.value })}
                        className="input"
                        placeholder={variable.defaultValue || `请输入${variable.label || variable.key}`}
                      />
                    ) : (
                      <input
                        type="text"
                        value={generateForm[variable.key] || ''}
                        onChange={e => setGenerateForm({ ...generateForm, [variable.key]: e.target.value })}
                        className="input"
                        placeholder={variable.defaultValue || `请输入${variable.label || variable.key}`}
                      />
                    )}
                  </div>
                ))}
                
                {/* 预览区域 */}
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <h3 className="font-medium text-slate-800 dark:text-slate-100 mb-3">合同预览</h3>
                  <div className="bg-slate-50 rounded-xl p-6 max-h-[300px] overflow-y-auto text-sm leading-relaxed">
                    {(() => {
                      let content = selectedTemplate.description || ''
                      selectedTemplate.variables?.forEach(v => {
                        const value = generateForm[v.key] || v.defaultValue || `【${v.label || v.key}】`
                        content = content.replace(new RegExp(`\\{\\{${v.key}\\}\\}`, 'g'), `【${value}】`)
                      })
                      return content.split('\n').map((line, i) => (
                        <p key={i} style={{ textIndent: '2em' }}>{line}</p>
                      ))
                    })()}
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
              <button
                onClick={() => { setShowGenerateModal(false); setSelectedTemplate(null) }}
                className="btn btn-secondary"
              >
                取消
              </button>
              <button
                onClick={handlePrint}
                className="btn btn-primary"
              >
                <Icon name="Printer" size={14} /> 打印合同
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default ContractTemplates
