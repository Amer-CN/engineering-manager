import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Icon } from './ui/Icon'
import { ContractTemplate, TemplateType, TemplateVariable, Project, Partner } from '../types/electron'
import { useToastContext } from '../hooks/useToast'

interface ContractTemplatesProps {
  refresh?: () => void
  onBack?: () => void
}

const templateTypeConfig: Record<TemplateType, { label: string; icon: string }> = {
  income: { label: '收入合同', icon: 'TrendingUp' },
  expense: { label: '支出合同', icon: 'TrendingDown' },
  labor: { label: '劳务合同', icon: 'Construction' },
  material: { label: '材料合同', icon: 'Package' },
  other: { label: '其他合同', icon: 'File' }
}

const ContractTemplates: React.FC<ContractTemplatesProps> = ({ refresh, onBack }) => {
  const { showToast } = useToastContext()
  const [templates, setTemplates] = useState<ContractTemplate[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<ContractTemplate | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
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
      const [templatesResult, projectsResult, partnersResult] = await Promise.all([
        window.electronAPI.getContractTemplates(),
        window.electronAPI.getProjects(),
        window.electronAPI.getPartners()
      ])
      
      if (templatesResult.success && templatesResult.data) setTemplates(templatesResult.data)
      if (projectsResult.success && projectsResult.data) setProjects(projectsResult.data)
      if (partnersResult.success && partnersResult.data) setPartners(partnersResult.data)
    } catch (error) {
      console.error('加载数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const base64 = event.target?.result as string
        setFormData(prev => ({
          ...prev,
          fileName: file.name,
          fileData: base64.split(',')[1] || base64
        }))
      }
      reader.readAsDataURL(file)
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
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors">
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
                    className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-12 text-center">
          <Icon name="FileText" size={48} className="mb-4" />
          <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100 mb-2">暂无合同模板</h3>
          <p className="text-slate-500 dark:text-slate-400 mb-6">点击下方按钮创建您的第一个合同模板</p>
          <button
            onClick={() => { resetForm(); setShowModal(true) }}
            className="btn btn-primary"
          >
            添加模板
          </button>
        </div>
      )}

      {/* 添加/编辑模板模态框 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-800">
                {editingTemplate ? '编辑模板' : '添加模板'}
              </h2>
              <button
                onClick={() => { setShowModal(false); resetForm() }}
                className="text-slate-400 hover:text-slate-600"
              >
                <Icon name="X" size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">模板名称 *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="input"
                      placeholder="如: 标准工程合同"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">模板类型 *</label>
                    <select
                      value={formData.type}
                      onChange={e => setFormData({ ...formData, type: e.target.value as TemplateType })}
                      className="input"
                      required
                    >
                      {Object.entries(templateTypeConfig).map(([type, config]) => (
                        <option key={type} value={type}>{config.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="label">模板描述 *</label>
                  <textarea
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="input min-h-[200px]"
                    placeholder="输入合同模板内容，使用 {{变量名}} 表示需要填充的内容..."
                    required
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    提示：使用 {"{{变量名}}"} 表示需要填充的内容，如 {"{{甲方名称}}"}、{"{{合同金额}}"}
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="label mb-0">模板变量</label>
                    <button
                      type="button"
                      onClick={addVariable}
                      className="btn btn-sm btn-secondary"
                    >
                      + 添加变量
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                    定义模板中使用的变量，生成合同时会提示填写
                  </p>
                  
                  {formData.variables.length > 0 ? (
                    <div className="space-y-3">
                      {formData.variables.map((variable, index) => (
                        <div key={index} className="grid grid-cols-4 gap-3 p-3 bg-slate-50 rounded-xl">
                          <input
                            type="text"
                            value={variable.key}
                            onChange={e => updateVariable(index, 'key', e.target.value)}
                            className="input text-sm"
                            placeholder="变量名"
                          />
                          <input
                            type="text"
                            value={variable.label}
                            onChange={e => updateVariable(index, 'label', e.target.value)}
                            className="input text-sm"
                            placeholder="显示标签"
                          />
                          <select
                            value={variable.type}
                            onChange={e => updateVariable(index, 'type', e.target.value)}
                            className="input text-sm"
                          >
                            <option value="text">文本</option>
                            <option value="number">数字</option>
                            <option value="date">日期</option>
                          </select>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={variable.required}
                              onChange={e => updateVariable(index, 'required', e.target.checked)}
                              className="w-4 h-4"
                            />
                            <span className="text-sm text-slate-600">必填</span>
                            <button
                              type="button"
                              onClick={() => removeVariable(index)}
                              className="ml-auto text-red-500 hover:text-red-700"
                            >
                              <Icon name="X" size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                      <p className="text-slate-500">点击上方按钮添加变量</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm() }}
                  className="btn btn-secondary"
                >
                  取消
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingTemplate ? '保存' : '创建'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
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
