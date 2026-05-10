// ContractPage.tsx — 通用合同管理页面

import React, { useState, useEffect, useRef } from 'react'
import type { IncomeContract, ExpenseContract, Partner, Project, PaymentRecord, Template, TemplateCategory } from '../types/electron'
import { contractStatuses, paymentMethods, partnerCategories } from '../data/regions'
import { logCreate, logUpdate, logDelete, logExport } from '../utils/audit'
import { usePermission } from '../hooks/usePermission'
import { exportContracts } from '../utils/export-import'
import { formatMoney } from '../utils/format'
import { PartnerSelect } from './features/partners/PartnerSelect'
import { useToastContext } from '../hooks/useToast'
import mammoth from 'mammoth'
import { motion } from 'framer-motion'
import { Icon } from './ui/Icon'
import { TemplateSelectorModal, TemplateGenerate } from './features/templates'

// Helper: data URL → ArrayBuffer (for mammoth .docx conversion)
const dataUrlToArrayBuffer = (dataUrl: string): ArrayBuffer => {
  const base64 = dataUrl.split(',')[1]
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

// 类型

type ContractType = 'income' | 'expense'
type Contract = IncomeContract | ExpenseContract

interface ContractPageProps {
  refresh?: () => void
  groupBy?: 'project' | 'role' | 'status'
  onGroupByChange?: (groupBy: 'project' | 'role' | 'status') => void
  type: ContractType
  onBack?: () => void
  autoCreate?: boolean
  onAutoCreateHandled?: () => void
}

// 配置：收入/支出合同的所有差异集中在此

interface TypeConfig {
  label: string
  auditResource: string
  partnerLabel: string
  partnerPlaceholder: string
  partnerCategoryDefault: string
  paymentColumnLabel: string
  paymentRecordType: string
  accentColor: string
  accentTextColor: string
  accentBgLight: string
  emptyTitle: string
  emptyDesc: string
  modalCreateTitle: string
  subCategory: 'income' | 'expense'
  exportType: string
}

const CONFIG: Record<ContractType, TypeConfig> = {
  income: {
    label: '收入合同',
    auditResource: 'incomeContracts',
    partnerLabel: '甲方单位',
    partnerPlaceholder: '选择甲方单位',
    partnerCategoryDefault: '甲方',
    paymentColumnLabel: '已收款',
    paymentRecordType: 'invoice_out',
    accentColor: 'bg-primary-500',
    accentTextColor: 'text-primary-600',
    accentBgLight: 'bg-primary-100',
    emptyTitle: '暂无收入合同',
    emptyDesc: '点击上方按钮添加您的第一份收入合同',
    modalCreateTitle: '新增收入合同',
    subCategory: 'income',
    exportType: 'income',
  },
  expense: {
    label: '支出合同',
    auditResource: 'expenseContracts',
    partnerLabel: '乙方单位',
    partnerPlaceholder: '选择乙方单位',
    partnerCategoryDefault: '乙方',
    paymentColumnLabel: '已付款',
    paymentRecordType: 'invoice_in',
    accentColor: 'bg-red-500',
    accentTextColor: 'text-red-600',
    accentBgLight: 'bg-red-100',
    emptyTitle: '暂无支出合同',
    emptyDesc: '点击上方按钮添加您的第一份支出合同',
    modalCreateTitle: '新增支出合同',
    subCategory: 'expense',
    exportType: 'expense',
  },
}

// API 分发

function getApi(type: ContractType) {
  const api = window.electronAPI
  return type === 'income'
    ? {
        getContracts: () => api.getIncomeContracts(),
        createContract: (data: any) => api.createIncomeContract(data),
        updateContract: (data: any) => api.updateIncomeContract(data),
        deleteContract: (id: number) => api.deleteIncomeContract(id),
      }
    : {
        getContracts: () => api.getExpenseContracts(),
        createContract: (data: any) => api.createExpenseContract(data),
        updateContract: (data: any) => api.updateExpenseContract(data),
        deleteContract: (id: number) => api.deleteExpenseContract(id),
      }
}

// 组件

const ContractPage: React.FC<ContractPageProps> = ({ refresh, groupBy = 'project', onGroupByChange, type, onBack, autoCreate, onAutoCreateHandled }) => {
  const config = CONFIG[type]
  const api = getApi(type)
  const { can } = usePermission()
  const { showToast } = useToastContext()

  const [contracts, setContracts] = useState<Contract[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingContract, setEditingContract] = useState<Contract | null>(null)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterProject, setFilterProject] = useState<string>('')
  const [previewFile, setPreviewFile] = useState<{ data: string; previewUrl: string; type: 'pdf' | 'image' | 'word' | 'excel'; title: string; html?: string } | null>(null)
  const [dragOverFile, setDragOverFile] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    projectId: 0,
    partnerId: 0,
    contractNo: '',
    name: '',
    amount: 0,
    signedDate: '',
    startDate: '',
    endDate: '',
    status: 'draft' as Contract['status'],
    paymentMethod: 'by_progress' as Contract['paymentMethod'],
    remarks: '',
    fileUrl: '',
    fileType: undefined as 'pdf' | 'image' | 'word' | 'excel' | undefined,
  })
  const [showTemplateSelector, setShowTemplateSelector] = useState(false)
  const [generatingTemplate, setGeneratingTemplate] = useState<Template | null>(null)

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    if (autoCreate) {
      resetForm()
      setShowModal(true)
      onAutoCreateHandled?.()
    }
  }, [autoCreate])

  const loadData = async () => {
    try {
      const [contractsResult, projectsResult, partnersResult, paymentResult] = await Promise.all([
        api.getContracts(),
        window.electronAPI.getProjects(),
        window.electronAPI.getPartners(),
        window.electronAPI.getPaymentRecords(),
      ])
      if (contractsResult.success && contractsResult.data) setContracts(contractsResult.data)
      if (projectsResult.success && projectsResult.data) setProjects(projectsResult.data)
      if (partnersResult.success && partnersResult.data) setPartners(partnersResult.data)
      if (paymentResult.success && paymentResult.data) setPaymentRecords(paymentResult.data)
    } catch (error) {
      console.error('加载数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) { showToast('请输入合同名称', 'error'); return }
    if (!formData.projectId) { showToast('请选择关联项目', 'error'); return }
    if (!formData.amount || formData.amount <= 0) { showToast('请输入有效的合同金额', 'error'); return }

    try {
      let fileUrl = formData.fileUrl
      if (fileUrl && fileUrl.startsWith('data:')) {
        const ext = formData.fileType === 'pdf' ? 'pdf' : formData.fileType === 'image' ? 'png' : formData.fileType === 'word' ? 'docx' : 'xlsx'
        const saveResult = await window.electronAPI.saveContractFile({
          fileData: fileUrl,
          fileName: `${formData.name}_${formData.amount}元.${ext}`,
          subCategory: config.subCategory,
          projectName: projects.find(p => p.id === formData.projectId)?.name || null,
        })
        if (saveResult.success) { fileUrl = saveResult.data.fileName }
        else { showToast(saveResult.error || '文件保存失败', 'error'); return }
      }
      const submissionData = { ...formData, fileUrl }

      if (editingContract) {
        const updateData: any = { ...editingContract }
        for (const [key, value] of Object.entries(submissionData)) {
          if (value !== undefined && value !== '') { (updateData as any)[key] = value }
        }
        await api.updateContract(updateData)
        const stripFileUrl = (obj: any) => {
          if (!obj || !obj.fileUrl) return obj
          return { ...obj, fileUrl: obj.fileUrl.startsWith('data:') ? '[base64 data]' : obj.fileUrl }
        }
        logUpdate(config.auditResource, formData.name, editingContract.id, {
          before: stripFileUrl(editingContract),
          after: stripFileUrl(submissionData),
        })
      } else {
        const result = await api.createContract(submissionData)
        const auditDetails = { ...submissionData }
        if (auditDetails.fileUrl && auditDetails.fileUrl.startsWith('data:')) {
          auditDetails.fileUrl = '[base64 data]'
        }
        logCreate(config.auditResource, formData.name, result?.data?.id, auditDetails)
      }
      loadData()
      setShowModal(false)
      resetForm()
      refresh?.()
      showToast(editingContract ? '合同更新成功！' : '合同创建成功！', 'success')
    } catch (error: any) {
      console.error('保存失败:', error)
      showToast('保存失败: ' + (error?.message || error), 'error')
    }
  }

  const handleEdit = (contract: Contract) => {
    setEditingContract(contract)
    setFormData({
      projectId: contract.projectId,
      partnerId: contract.partnerId || 0,
      contractNo: contract.contractNo,
      name: contract.name,
      amount: contract.amount,
      signedDate: contract.signedDate,
      startDate: contract.startDate,
      endDate: contract.endDate,
      status: contract.status,
      paymentMethod: contract.paymentMethod,
      remarks: contract.remarks || '',
      fileUrl: contract.fileUrl || '',
      fileType: contract.fileType,
    })
    setShowModal(true)
  }

  const handleExport = () => {
    if (!can('contracts:export')) { alert('您没有导出合同数据的权限'); return }
    try {
      exportContracts(filteredContracts as any, config.exportType as any)
      logExport(config.auditResource, filteredContracts.length)
      showToast(`已导出 ${filteredContracts.length} 条合同`, 'success')
    } catch (error) {
      console.error('导出失败:', error)
      showToast('导出失败', 'error')
    }
  }

  const handleDelete = async (id: number) => {
    if (!can('contracts:delete')) { alert('您没有删除合同的权限'); return }
    if (!confirm('确定要删除这个合同吗？')) return
    const contractToDelete = contracts.find(c => c.id === id)
    try {
      await api.deleteContract(id)
      logDelete(config.auditResource, contractToDelete?.name || config.label, id, {
        contractNo: contractToDelete?.contractNo,
        amount: contractToDelete?.amount,
      })
      loadData()
      refresh?.()
    } catch (error) {
      console.error('删除失败:', error)
    }
  }

  const resetForm = () => {
    setEditingContract(null)
    setFormData({
      projectId: 0, partnerId: 0, contractNo: '', name: '', amount: 0,
      signedDate: '', startDate: '', endDate: '', status: 'draft',
      paymentMethod: 'by_progress', remarks: '', fileUrl: '', fileType: undefined,
    })
  }

  // 文件上传
  const processFileForUpload = (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.docx', '.xlsx']
    const fileName = file.name.toLowerCase()
    if (!allowedTypes.includes(file.type) && !allowedExtensions.some(ext => fileName.endsWith(ext))) {
      showToast('只能上传 JPG、PNG、WebP、PDF、DOCX、XLSX 格式的文件', 'error'); return
    }
    if (file.size > 30 * 1024 * 1024) { showToast('文件大小不能超过 30MB', 'error'); return }
    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      let fileType: 'pdf' | 'image' | 'word' | 'excel' = 'image'
      const mimeType = file.type.toLowerCase()
      const fname = file.name.toLowerCase()
      if (mimeType === 'application/pdf' || fname.endsWith('.pdf')) fileType = 'pdf'
      else if (mimeType.includes('word') || mimeType.includes('document') || fname.endsWith('.doc') || fname.endsWith('.docx')) fileType = 'word'
      else if (mimeType.includes('sheet') || mimeType.includes('excel') || fname.endsWith('.xls') || fname.endsWith('.xlsx')) fileType = 'excel'
      else if (mimeType.startsWith('image/')) fileType = 'image'
      setFormData(prev => ({ ...prev, fileUrl: base64, fileType }))
    }
    reader.readAsDataURL(file)
  }

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragOverFile(true) }
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragOverFile(false) }
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragOverFile(false)
    const files = e.dataTransfer.files
    if (files.length > 0) processFileForUpload(files[0])
  }
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFileForUpload(file)
    e.target.value = ''
  }
  const handleDeleteFile = () => setFormData(prev => ({ ...prev, fileUrl: '', fileType: undefined }))

  const resolvePreviewFileUrl = async (fileUrl: string, projectName?: string): Promise<{ previewUrl: string; downloadUrl: string }> => {
    if (!fileUrl) return { previewUrl: '', downloadUrl: '' }
    if (fileUrl.startsWith('data:')) return { previewUrl: fileUrl, downloadUrl: fileUrl }
    const result = await window.electronAPI.readContractFile(fileUrl, config.subCategory, projectName ?? null)
    const prefix = projectName ? `${encodeURIComponent(projectName)}/` : ''
    return {
      previewUrl: `contract-file:///${prefix}${config.subCategory}/${fileUrl}`,
      downloadUrl: result.success ? result.data.dataUrl : '',
    }
  }

  const handlePreviewFile = async () => {
    if (!formData.fileUrl) return
    const fileType = formData.fileType || 'image'
    const urls = await resolvePreviewFileUrl(formData.fileUrl, projects.find(p => p.id === formData.projectId)?.name)
    if (!urls.downloadUrl && !urls.previewUrl) { showToast('附件文件不存在或已损坏', 'error'); return }
    if (fileType === 'word' && urls.downloadUrl) {
      setPreviewFile({ data: urls.downloadUrl, previewUrl: urls.previewUrl, type: 'word', title: '合同附件预览' })
      try {
        const html = await mammoth.convertToHtml({ arrayBuffer: dataUrlToArrayBuffer(urls.downloadUrl) })
        setPreviewFile(prev => prev ? { ...prev, html: html.value } : null)
      } catch { showToast('Word 文档转换失败，请下载后查看', 'error') }
      return
    }
    setPreviewFile({ data: urls.downloadUrl || urls.previewUrl, previewUrl: urls.previewUrl, type: fileType, title: '合同附件预览' })
  }

  const getStatusLabel = (status: string) => contractStatuses.find(s => s.value === status)?.label || status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-slate-100 text-slate-600'
      case 'pending': return 'bg-yellow-100 text-yellow-600'
      case 'active': return 'bg-green-100 text-green-600'
      case 'expired': return 'bg-orange-100 text-orange-600'
      case 'terminated': return 'bg-red-100 text-red-600'
      case 'archived': return 'bg-blue-100 text-blue-600'
      default: return 'bg-slate-100 text-slate-600'
    }
  }
  const getPaymentLabel = (method: string) => paymentMethods.find(p => p.value === method)?.label || method

  const getContractPaymentTotal = (contractId: number) => {
    return paymentRecords
      .filter(r => r.contractId === contractId && r.type === config.paymentRecordType)
      .reduce((sum, r) => sum + r.amount, 0)
  }

  const filteredContracts = contracts.filter(c => {
    if (filterStatus && c.status !== filterStatus) return false
    if (filterProject && c.projectId !== parseInt(filterProject)) return false
    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase()
      return c.name.toLowerCase().includes(keyword) || c.contractNo.toLowerCase().includes(keyword)
    }
    return true
  })

  const groupedContracts = () => {
    const groups: Record<string, Contract[]> = {}
    filteredContracts.forEach(contract => {
      let key = '未分类'
      if (groupBy === 'project') {
        const project = projects.find(p => p.id === contract.projectId)
        key = project?.name || '未分配项目'
      } else if (groupBy === 'status') {
        key = getStatusLabel(contract.status)
      } else if (groupBy === 'role') {
        const partner = partners.find(p => p.id === contract.partnerId)
        key = partner ? partnerCategories.find(c => c.value === partner.category)?.label || partner.name : config.partnerCategoryDefault
      }
      if (!groups[key]) groups[key] = []
      groups[key].push(contract)
    })
    return groups
  }

  const formatCurrency = (amount: number) => formatMoney(amount)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* 页面头部：返回按钮 + 合同类型标识 */}
      <div className="flex items-center gap-4 mb-6">
        {onBack && (
          <button onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors">
            <Icon name="ArrowLeft" size={16} />
            <span>返回看板</span>
          </button>
        )}
        <div className="flex items-center gap-3">
          <span className={`w-1.5 h-8 rounded-full ${type === 'income' ? 'bg-emerald-500' : 'bg-red-500'}`} />
          <div>
            <h2 className="text-lg font-semibold text-slate-800">{config.label}管理</h2>
            <p className="text-sm text-slate-500">
              {type === 'income' ? '记录和管理所有收入相关合同' : '记录和管理所有支出相关合同（分包、采购等）'}
            </p>
          </div>
        </div>
      </div>

      {/* 工具栏 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {/* 分组方式 */}
          {onGroupByChange && (
            <div className="flex items-center bg-slate-100 rounded-lg p-1">
              <button onClick={() => onGroupByChange('project')}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${groupBy === 'project' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}>
                按项目
              </button>
              <button onClick={() => onGroupByChange('role')}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${groupBy === 'role' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}>
                {type === 'income' ? '按甲方' : '按乙方'}
              </button>
              <button onClick={() => onGroupByChange('status')}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${groupBy === 'status' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}>
                按状态
              </button>
            </div>
          )}
          <input type="text" placeholder="搜索合同名称、编号..." value={searchKeyword}
            onChange={e => setSearchKeyword(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent w-64" />
          <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent">
            <option value="">全部项目</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent">
            <option value="">全部状态</option>
            {contractStatuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-3">
          {can('contracts:export') && (
            <button onClick={handleExport}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium transition-colors flex items-center">
              <Icon name="Download" size={16} /> 导出
            </button>
          )}
          <button onClick={() => { resetForm(); setShowModal(true) }}
            className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2 rounded-lg font-medium transition-colors flex items-center">
            <span className="text-lg mr-1">+</span>新增合同
          </button>
        </div>
      </div>

      {/* 分组展示 */}
      {Object.entries(groupedContracts()).map(([groupName, groupContracts]) => (
        <div key={groupName} className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
              <span className={`w-2 h-2 ${config.accentColor} rounded-full`}></span>
              {groupName}
              <span className="text-sm font-normal text-slate-400">({groupContracts.length} 份合同)</span>
            </h3>
            <span className="text-sm text-slate-500">
              合计: ¥ {formatCurrency(groupContracts.reduce((sum, c) => sum + c.amount, 0))}
            </span>
          </div>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">合同名称</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">合同编号</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">{config.partnerCategoryDefault}方</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">合同金额</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">{config.paymentColumnLabel}</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">状态</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">到期日期</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {groupContracts.map(contract => {
                  const paymentTotal = getContractPaymentTotal(contract.id)
                  const partner = partners.find(p => p.id === contract.partnerId)
                  return (
                    <tr key={contract.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3"><div className="font-medium text-slate-800">{contract.name}</div></td>
                      <td className="px-4 py-3 text-sm text-slate-500">{contract.contractNo}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{partner?.name || '-'}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-800">¥ {formatCurrency(contract.amount)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className={`font-medium ${paymentTotal >= contract.amount ? 'text-green-600' : 'text-slate-800'}`}>
                          ¥ {formatCurrency(paymentTotal)}
                        </div>
                        <div className="text-xs text-slate-400">
                          {contract.amount > 0 ? ((paymentTotal / contract.amount) * 100).toFixed(0) + '%' : '0%'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(contract.status)}`}>
                          {getStatusLabel(contract.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-slate-500">{contract.endDate || '-'}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {contract.fileUrl && (
                            <button onClick={async () => {
                              const fileType = (contract.fileType || 'image') as 'pdf' | 'image' | 'word' | 'excel'
                              const urls = await resolvePreviewFileUrl(contract.fileUrl!, contract.projectName)
                              if (!urls.downloadUrl && !urls.previewUrl) { showToast('附件文件不存在或已损坏', 'error'); return }
                              if (fileType === 'word' && urls.downloadUrl) {
                                setPreviewFile({ data: urls.downloadUrl, previewUrl: urls.previewUrl, type: 'word', title: `${contract.name} - 合同附件` })
                                try {
                                  const html = await mammoth.convertToHtml({ arrayBuffer: dataUrlToArrayBuffer(urls.downloadUrl) })
                                  setPreviewFile(prev => prev ? { ...prev, html: html.value } : null)
                                } catch { showToast('Word 文档转换失败，请下载后查看', 'error') }
                                return
                              }
                              setPreviewFile({ data: urls.downloadUrl || urls.previewUrl, previewUrl: urls.previewUrl, type: fileType, title: `${contract.name} - 合同附件` })
                            }} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded transition-colors" title="预览附件">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                          )}
                          <button onClick={() => handleEdit(contract)} className="px-2 py-1 text-xs text-primary-600 hover:bg-primary-50 rounded">编辑</button>
                          <button onClick={() => handleDelete(contract.id)} className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded">删除</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {filteredContracts.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <div className="text-5xl mb-4">
            <Icon name="ClipboardList" size={44} className="text-slate-300" />
          </div>
          <h3 className="text-lg font-medium text-slate-800 mb-2">{config.emptyTitle}</h3>
          <p className="text-slate-500">{config.emptyDesc}</p>
        </div>
      )}

      {/* 新增/编辑模态框 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
            <div className="px-6 py-4 border-b border-slate-200 sticky top-0 bg-white flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-800">
                {editingContract ? '编辑合同' : config.modalCreateTitle}
              </h2>
              <div className="flex items-center gap-2">
                {!editingContract && (
                  <button type="button" onClick={() => setShowTemplateSelector(true)}
                    className="px-3 py-1.5 text-xs bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-200 rounded-lg flex items-center gap-1 transition-colors">
                    <Icon name="FileText" size={14} /> 从模板生成
                  </button>
                )}
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {config.label}
                </span>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">合同名称 *</label>
                  <input type="text" value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">关联项目 *</label>
                  <select value={formData.projectId}
                    onChange={e => setFormData({ ...formData, projectId: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500" required>
                    <option value="">选择项目</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{config.partnerLabel}</label>
                  <PartnerSelect partners={partners} value={formData.partnerId || null}
                    onChange={(partnerId) => setFormData({ ...formData, partnerId: partnerId || 0 })}
                    placeholder={config.partnerPlaceholder} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">合同编号</label>
                  <input type="text" value={formData.contractNo}
                    onChange={e => setFormData({ ...formData, contractNo: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">合同金额 *</label>
                  <input type="number" value={formData.amount}
                    onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">签订日期</label>
                  <input type="date" value={formData.signedDate}
                    onChange={e => setFormData({ ...formData, signedDate: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">付款方式</label>
                  <select value={formData.paymentMethod}
                    onChange={e => setFormData({ ...formData, paymentMethod: e.target.value as any })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500">
                    {paymentMethods.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">开始日期</label>
                  <input type="date" value={formData.startDate}
                    onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">结束日期</label>
                  <input type="date" value={formData.endDate}
                    onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">合同状态</label>
                  <select value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500">
                    {contractStatuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">备注</label>
                  <textarea value={formData.remarks}
                    onChange={e => setFormData({ ...formData, remarks: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500" rows={3} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">上传合同附件</label>
                  <input ref={fileInputRef} type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf,.docx,.xlsx"
                    onChange={handleFileInputChange} className="hidden" />
                  {formData.fileUrl ? (
                    <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg ${config.accentBgLight} flex items-center justify-center`}>
                            {formData.fileType === 'pdf' ? <Icon name="File" size={20} className={config.accentTextColor} /> :
                             formData.fileType === 'word' ? <Icon name="FileText" size={20} className={config.accentTextColor} /> :
                             formData.fileType === 'excel' ? <Icon name="LayoutDashboard" size={20} className={config.accentTextColor} /> :
                             <Icon name="Image" size={20} className={config.accentTextColor} />}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-700">
                              {formData.fileType === 'pdf' ? 'PDF文件' : formData.fileType === 'word' ? 'Word文档' : formData.fileType === 'excel' ? 'Excel表格' : '图片文件'}
                            </p>
                            <p className="text-xs text-slate-400">
                              {formData.fileType === 'excel' ? '不支持在线预览，请下载后查看' : '点击预览'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {(formData.fileType === 'pdf' || formData.fileType === 'image') && (
                            <button type="button" onClick={handlePreviewFile}
                              className={`px-3 py-1.5 text-xs ${config.accentTextColor} hover:bg-primary-50 rounded-lg transition-colors`}>预览</button>
                          )}
                          <button type="button" onClick={handleDeleteFile}
                            className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors">删除</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
                      dragOverFile ? 'border-primary-500 bg-primary-50' : 'border-slate-300 hover:border-primary-400 hover:bg-slate-50'
                    }`}
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
                      <div className="text-slate-400">
                        <Icon name="Paperclip" size={36} className="text-slate-300 mb-2" />
                        <p className="text-sm font-medium">点击上传 / 拖拽上传</p>
                        <p className="text-xs mt-1">支持 JPG、PNG、WebP、PDF、DOCX、XLSX 格式，最大 30MB</p>
                        <p className="text-xs mt-1 text-primary-500">可上传合同扫描件、清单、出库单、供货单等</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
                <button type="button" onClick={() => { setShowModal(false); resetForm() }}
                  className="px-6 py-2 text-slate-700 hover:bg-slate-100 rounded-lg">取消</button>
                <button type="submit" className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg">
                  {editingContract ? '保存' : '添加'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* 预览模态框 */}
      {previewFile && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60]" onClick={() => setPreviewFile(null)}>
          <motion.div className="bg-white rounded-2xl w-[95vw] h-[90vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
              <h3 className="text-lg font-semibold text-slate-800">{previewFile.title}</h3>
              <div className="flex items-center gap-3">
                {previewFile.type !== 'image' && (
                  <a href={previewFile.data}
                    download={`合同附件.${previewFile.type === 'pdf' ? 'pdf' : previewFile.type === 'word' ? 'docx' : 'xlsx'}`}
                    className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700">下载文件</a>
                )}
                <button onClick={() => setPreviewFile(null)} className="text-slate-400 hover:text-slate-600">
                  <Icon name="X" size={20} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-slate-100">
              {previewFile.type === 'pdf' && (
                <iframe src={previewFile.previewUrl || previewFile.data} className="w-full h-full border-0" title={previewFile.title} />
              )}
              {previewFile.type === 'word' && previewFile.html && (
                <iframe srcDoc={previewFile.html} className="w-full h-full border-0 bg-white" title={previewFile.title} />
              )}
              {previewFile.type === 'word' && !previewFile.html && (
                <div className="flex flex-col items-center justify-center text-slate-500 h-full">
                  <Icon name="Loader" size={36} className="animate-spin text-slate-300 mb-4" />
                  <p className="text-sm">正在转换文档...</p>
                </div>
              )}
              {previewFile.type === 'excel' && (
                <div className="flex flex-col items-center justify-center text-slate-500 h-full">
                  <Icon name="LayoutDashboard" size={56} className="text-slate-300 mb-4" />
                  <p className="text-lg font-medium mb-2">Excel 表格</p>
                  <p className="text-sm">此文件类型不支持在线预览，请下载后使用相应软件打开</p>
                </div>
              )}
              {previewFile.type === 'image' && (
                <img src={previewFile.data} alt="预览" className="max-w-full max-h-full object-contain mx-auto" />
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* 模板选择器 */}
      {showTemplateSelector && (
        <TemplateSelectorModal
          category="contract"
          onSelect={(template) => {
            setShowTemplateSelector(false)
            setGeneratingTemplate(template)
          }}
          onClose={() => setShowTemplateSelector(false)}
        />
      )}

      {/* 模板生成 */}
      {generatingTemplate && (
        <TemplateGenerate
          template={generatingTemplate}
          onClose={() => setGeneratingTemplate(null)}
        />
      )}
    </div>
  )
}

export default ContractPage
