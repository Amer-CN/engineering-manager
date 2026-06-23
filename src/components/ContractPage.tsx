// ContractPage.tsx — 通用合同管理页面

import React, { useState, useEffect, useMemo } from 'react'
import { DataTable } from '@/components/DataTable'
import { HoverScrollbar } from './ui/HoverScrollbar'
import PageContainer from './ui/PageContainer'
import Spinner from './ui/Spinner'
import type { Partner, Project, PaymentRecord, Template } from '../types/electron'
import { partnerCategories, contractStatuses } from '../data/regions'
import { logDelete, logExport } from '../utils/audit'
import { usePermission } from '../hooks/usePermission'
import { exportContracts } from '../utils/export-import'
import { formatMoney } from '../utils/format'
import { useToastStore } from '@/store/toastStore'
import { Icon } from './ui/Icon'
import { EmptyState } from './ui/EmptyState'
import { TemplateSelectorModal, TemplateGenerate } from './features/templates'

import { CONFIG, getApi, getStatusLabel, type ContractType, type Contract } from './features/contracts/contractConfig'
import { ContractFormModal } from './features/contracts/ContractFormModal'
import ContractPreviewModal, { type ContractPreviewFile } from './features/contracts/ContractPreviewModal'
import { getContractColumns } from './features/contracts/contractPageColumns'
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
  const [previewFile, setPreviewFile] = useState<ContractPreviewFile | null>(null)
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

  const handlePreview = async (contract: Contract) => {
    const fileType = (contract.fileType || 'image') as 'pdf' | 'image' | 'word' | 'excel'
    const urls = await resolvePreviewFileUrl(contract.fileUrl!, contract.projectName)
    if (!urls.downloadUrl && !urls.previewUrl) { showToast('附件文件不存在或已损坏', 'error'); return }
    if (fileType === 'word' && urls.downloadUrl) {
      setPreviewFile({ data: urls.downloadUrl, previewUrl: urls.previewUrl, type: 'word', title: `${contract.name} - 合同附件` })
      try {
        const result = await (await getAPI()).convertTemplateDocxToHtml(contract.fileUrl!, 'contracts')
        if (result?.success && result.data) {
          setPreviewFile(prev => prev ? { ...prev, html: result.data } : null)
        } else {
          showToast('Word 文档转换失败，请下载后查看', 'error')
        }
      } catch { showToast('Word 文档转换失败，请下载后查看', 'error') }
      return
    }
    setPreviewFile({ data: urls.downloadUrl || urls.previewUrl, previewUrl: urls.previewUrl, type: fileType, title: `${contract.name} - 合同附件` })
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

  const columns = useMemo(() => getContractColumns({
    partners, paymentRecords, type, config, onEdit: handleEdit, onDelete: handleDelete, onPreview: handlePreview, showToast
  }), [partners, paymentRecords, type, config, handleEdit, handleDelete, handlePreview, showToast])

  if (loading) {
    return <Spinner size="lg" text="加载合同数据..." />
  }

  return (
    <PageContainer className="flex-1 flex flex-col overflow-hidden w-full">
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
            columns={columns}
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

      <ContractPreviewModal previewFile={previewFile} onClose={() => setPreviewFile(null)} />

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
    </PageContainer>
  )
}

export default ContractPage
