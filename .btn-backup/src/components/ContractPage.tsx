// ContractPage.tsx — 通用合同管理页面

import React, { useState, useEffect } from 'react'
import { DataTable, type Column } from '@/components/DataTable'
import { HoverScrollbar } from './ui/HoverScrollbar'
import Spinner from './ui/Spinner'
import type { AgreementContract, Partner, Project, PaymentRecord, Template } from '../types/electron'
import { partnerCategories, contractStatuses } from '../data/regions'
import { logDelete, logExport } from '../utils/audit'
import { usePermission } from '../hooks/usePermission'
import { exportContracts } from '../utils/export-import'
import { formatMoney } from '../utils/format'
import { useToastStore } from '@/store/toastStore'
import { motion } from 'framer-motion'
import { Icon } from './ui/Icon'
import { Tooltip } from './ui/Tooltip/Tooltip'
import { EmptyState } from './ui/EmptyState'
import { TemplateSelectorModal, TemplateGenerate } from './features/templates'

import { CONFIG, getApi, getStatusLabel, getStatusColor, getContractPaymentTotal, AGREEMENT_SUB_TYPE_LABELS, type ContractType, type Contract } from './features/contracts/contractConfig'
import { ContractFormModal } from './features/contracts/ContractFormModal'
import { getAPI } from '@/services/api-adapter'

interface ContractPageProps {
  refresh?: () => void; groupBy?: 'project' | 'role' | 'status'
  onGroupByChange?: (g: 'project' | 'role' | 'status') => void
  type: ContractType; onBack?: () => void; autoCreate?: boolean; onAutoCreateHandled?: () => void
}

// 组件

const ContractPage: React.FC<ContractPageProps> = ({ refresh, groupBy = 'project', onGroupByChange, type, onBack, autoCreate, onAutoCreateHandled }) => {
  const config = CONFIG[type]
  const [api, setApi] = useState<Awaited<ReturnType<typeof getApi>> | null>(null)
  const { can } = usePermission()
  const showToast = useToastStore(state => state.showToast)

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
  const [showTemplateSelector, setShowTemplateSelector] = useState(false)
  const [generatingTemplate, setGeneratingTemplate] = useState<Template | null>(null)

  useEffect(() => {
    getApi(type).then(setApi)
  }, [type])

  useEffect(() => { if (api) loadData() }, [api])

  useEffect(() => {
    if (autoCreate) { setEditingContract(null); setShowModal(true); onAutoCreateHandled?.() }
  }, [autoCreate])

  const loadData = async () => {
    if (!api) return
    const electronAPI = await getAPI()
    const results = await Promise.allSettled([
      api.getContracts(),                          // 0
      electronAPI.getProjects(),                   // 1
      electronAPI.getPartners(),                   // 2
      electronAPI.getWagePaymentRecords(),         // 3
    ])
    const res = (i: number) => {
      const r = results[i]
      if (r.status === 'rejected') { console.error(`[ContractPage] API #${i} rejected:`, r.reason); return null }
      const val = r.value as any
      if (!val?.success) { console.warn(`[ContractPage] API #${i} failed:`, val?.error); return null }
      return val.data || []
    }
    setContracts(res(0) || [])
    setProjects(res(1) || [])
    setPartners(res(2) || [])
    setPaymentRecords(res(3) || [])
    setLoading(false)
  }

  const handleEdit = (contract: Contract) => { setEditingContract(contract); setShowModal(true) }

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
    if (!api) return
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

  const resolvePreviewFileUrl = async (fileUrl: string, projectName?: string): Promise<{ previewUrl: string; downloadUrl: string }> => {
    if (!fileUrl) return { previewUrl: '', downloadUrl: '' }
    if (fileUrl.startsWith('data:')) return { previewUrl: fileUrl, downloadUrl: fileUrl }
    const result = await (await getAPI()).readContractFile(fileUrl, config.subCategory, projectName ?? null)
    const prefix = projectName ? `${encodeURIComponent(projectName)}/` : ''
    return { previewUrl: `contract-file:///${prefix}${config.subCategory}/${fileUrl}`, downloadUrl: result.success && result.data ? result.data.dataUrl : '' }
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

  // DataTable 列定义
  const baseColumns: Column<Contract>[] = [
    { key: 'name', title: '合同名称', render: (item) => (
      <div className="font-medium text-slate-800">{item.name}
        {type === 'agreement' && (item as AgreementContract).agreementType && (
          <span className="ml-2 px-1.5 py-0.5 text-xs rounded bg-sky-50 text-sky-600 border border-sky-200">
            {AGREEMENT_SUB_TYPE_LABELS[(item as AgreementContract).agreementType] || '协议'}
          </span>
        )}
      </div>
    )},
    { key: 'contractNo', title: '合同编号', render: (item) => <span className="text-sm text-slate-500">{item.contractNo}</span> },
    { key: 'partnerId', title: `${config.partnerCategoryDefault}方`, render: (item) => {
      const partner = partners.find(p => p.id === item.partnerId)
      return <span className="text-sm text-slate-600">{partner?.name || '-'}</span>
    }},
    { key: 'amount', title: '合同金额', align: 'right', sortable: true,
      sorter: (a, b) => ((a.amount || 0) - (b.amount || 0)),
      render: (item) => (
      <span className="font-medium text-slate-800">
        {type === 'agreement' ? (item.amount ? `¥ ${formatMoney(item.amount)}` : '—') : `¥ ${formatMoney(item.amount)}`}
      </span>
    )},
  ]

  const paymentColumn: Column<Contract> = { key: 'payment', title: config.paymentColumnLabel, align: 'right', render: (item) => {
    const paymentTotal = getContractPaymentTotal(item.id, paymentRecords, config)
    return (
      <div>
        <div className={`font-medium ${paymentTotal >= (item.amount ?? 0) ? 'text-green-600' : 'text-slate-800'}`}>
          ¥ {formatMoney(paymentTotal)}
        </div>
        <div className="text-xs text-slate-400">
          {(item.amount ?? 0) > 0 ? ((paymentTotal / (item.amount ?? 0)) * 100).toFixed(0) + '%' : '0%'}
        </div>
      </div>
    )
  }}

  const statusColumn: Column<Contract> = { key: 'status', title: '状态', align: 'center',
    filterable: 'select',
    filterOptions: contractStatuses.map(s => ({ label: s.label, value: s.value })),
    filterAccessor: (item: Contract) => item.status,
    render: (item) => (
    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(item.status)}`}>
      {getStatusLabel(item.status)}
    </span>
  )}

  const endDateColumn: Column<Contract> = { key: 'endDate', title: '到期日期', align: 'center',
    sortable: true,
    sorter: (a, b) => (a.endDate || '').localeCompare(b.endDate || ''),
    render: (item) => (
    <span className="text-sm text-slate-500">{item.endDate || '-'}</span>
  )}

  const actionsColumn: Column<Contract> = { key: 'actions', title: '操作', align: 'center', render: (item) => (
    <div className="flex items-center justify-center gap-1">
      {item.fileUrl && (
        <Tooltip content="预览附件" position="top" delay={300}>
        <button onClick={async () => {
          const fileType = (item.fileType || 'image') as 'pdf' | 'image' | 'word' | 'excel'
          const urls = await resolvePreviewFileUrl(item.fileUrl!, item.projectName)
          if (!urls.downloadUrl && !urls.previewUrl) { showToast('附件文件不存在或已损坏', 'error'); return }
          if (fileType === 'word' && urls.downloadUrl) {
            setPreviewFile({ data: urls.downloadUrl, previewUrl: urls.previewUrl, type: 'word', title: `${item.name} - 合同附件` })
            try {
              const result = await (await getAPI()).convertTemplateDocxToHtml(item.fileUrl!, 'contracts')
              if (result?.success && result.data) {
                setPreviewFile(prev => prev ? { ...prev, html: result.data } : null)
              } else {
                showToast('Word 文档转换失败，请下载后查看', 'error')
              }
            } catch { showToast('Word 文档转换失败，请下载后查看', 'error') }
            return
          }
          setPreviewFile({ data: urls.downloadUrl || urls.previewUrl, previewUrl: urls.previewUrl, type: fileType, title: `${item.name} - 合同附件` })
        }} className="btn btn-ghost btn-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </button>
      </Tooltip>
      )}
      <button onClick={() => handleEdit(item)} className="btn btn-ghost btn-sm text-primary-600">编辑</button>
      <button onClick={() => handleDelete(item.id)} className="btn btn-danger btn-sm">删除</button>
    </div>
  )}

  const contractColumns: Column<Contract>[] = type !== 'agreement'
    ? [...baseColumns, paymentColumn, statusColumn, endDateColumn, actionsColumn]
    : [...baseColumns, statusColumn, endDateColumn, actionsColumn]

  if (loading) {
    return <Spinner size="lg" text="加载合同数据..." />
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-6 max-w-[1400px] mx-auto w-full">
      {/* 页面头部：返回按钮 + 合同类型标识 */}
      <div className="flex items-center gap-4 mb-6">
        {onBack && (
          <button onClick={onBack}
            className="btn btn-ghost btn-sm flex items-center gap-1.5">
            <Icon name="ArrowLeft" size={16} />
            <span>返回看板</span>
          </button>
        )}
        <div className="flex items-center gap-3">
          <span className={`w-1.5 h-8 rounded-full ${type === 'income' ? 'bg-emerald-500' : type === 'expense' ? 'bg-red-500' : 'bg-sky-500'}`} />
          <div>
            <h2 className="text-lg font-semibold text-slate-800">{config.label}管理</h2>
            <p className="text-sm text-slate-500">
              {type === 'income' ? '记录和管理所有收入相关合同' : type === 'expense' ? '记录和管理所有支出相关合同（分包、采购等）' : '记录和管理所有协议类合同（框架、合作、赔偿等）'}
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
                {type === 'agreement' ? '按协议方' : type === 'income' ? '按甲方' : '按乙方'}
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
              className="btn btn-secondary flex items-center gap-2">
              <Icon name="Download" size={16} /> 导出
            </button>
          )}
          <button onClick={() => { setEditingContract(null); setShowModal(true) }}
            className="btn btn-primary px-5 py-2 flex items-center">
            <span className="text-lg mr-1">+</span>新增合同
          </button>
        </div>
      </div>

      {/* 分组展示 */}
      <HoverScrollbar className="flex-1 min-h-0">
      {Object.entries(groupedContracts()).map(([groupName, groupContracts]) => (
        <div key={groupName} className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
              <span className={`w-2 h-2 ${config.accentColor} rounded-full`}></span>
              {groupName}
              <span className="text-sm font-normal text-slate-400">({groupContracts.length} 份合同)</span>
            </h3>
            <span className="text-sm text-slate-500">
              合计: ¥ {formatMoney(groupContracts.reduce((sum, c) => sum + (c.amount || 0), 0))}
            </span>
          </div>

          <DataTable
            data={groupContracts}
            columns={contractColumns}
            rowKey="id"
            pagination={false}
            showContainer={true}
            stickyHeader={true}
            onRowClick={handleEdit}
            emptyText="该分组下暂无合同"
          />
        </div>
      ))}

      {filteredContracts.length === 0 && (
        <EmptyState icon="ClipboardList" title={config.emptyTitle} description={config.emptyDesc} />
      )}
      </HoverScrollbar>

      <ContractFormModal
        show={showModal} type={type} editingContract={editingContract}
        projects={projects} partners={partners} api={api!}
        onClose={() => { setShowModal(false); setEditingContract(null) }}
        onSuccess={() => { loadData(); refresh?.() }}
        onShowTemplateSelector={() => setShowTemplateSelector(true)}
      />

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
                    className="btn btn-primary btn-sm">下载文件</a>
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
