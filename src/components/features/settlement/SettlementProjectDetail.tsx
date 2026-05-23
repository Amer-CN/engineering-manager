import React, { useState, useRef } from 'react'
import { Settlement as SettlementData, SettlementStatus, SettlementType, Project, Partner, Template } from '../../../types/electron'
import { useToastStore } from '@/store/toastStore'
import { SettlementList } from './SettlementList'
import { SettlementForm } from './SettlementForm'
import { PrintContent } from './SettlementPrintTemplate'
import { logCreate, logUpdate, logDelete } from '../../../utils/audit'
import { usePermission } from '../../../hooks/usePermission.tsx'
import { formatMoney } from '../../../utils/format'
import { motion } from 'framer-motion'
import { Icon } from '../../ui/Icon'
import { TemplateSelectorModal, TemplateGenerate } from '../templates'

interface SettlementProjectDetailProps {
  project: Project
  settlements: SettlementData[]
  partners: Partner[]
  onBack: () => void
  onDataChange: () => void
}

const SettlementProjectDetail: React.FC<SettlementProjectDetailProps> = ({
  project,
  settlements,
  partners,
  onBack,
  onDataChange,
}) => {
  const showToast = useToastStore(state => state.showToast)
  const { can } = usePermission()

  const [showModal, setShowModal] = useState(false)
  const [editingSettlement, setEditingSettlement] = useState<SettlementData | null>(null)
  const [filterType, setFilterType] = useState<SettlementType | ''>('')
  const [filterStatus, setFilterStatus] = useState<SettlementStatus | ''>('')
  const [showTemplateSelector, setShowTemplateSelector] = useState(false)
  const [generatingTemplate, setGeneratingTemplate] = useState<Template | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  const filteredSettlements = settlements.filter(s => {
    if (filterType && s.type !== filterType) return false
    if (filterStatus && s.status !== filterStatus) return false
    return true
  })

  const stats = {
    total: filteredSettlements.length,
    pending: filteredSettlements.filter(s => s.status === 'pending' || s.status === 'draft').length,
    completed: filteredSettlements.filter(s => s.status === 'completed').length,
    archived: filteredSettlements.filter(s => s.status === 'archived').length,
    totalAmount: filteredSettlements.reduce((sum, s) => sum + s.amount, 0),
  }

  const handleSubmit = async (formData: any) => {
    if (!formData.partnerId) {
      showToast('请选择关联单位', 'error')
      return
    }

    try {
      const files = formData.files || []
      const savedFiles: { url: string; name: string; type: string }[] = []
      for (const f of files) {
        if (f.url && f.url.startsWith('data:')) {
          const ext = f.type === 'pdf' ? 'pdf' : f.type === 'excel' ? 'xlsx' : 'png'
          const saveResult = await window.electronAPI.saveFile({
            category: 'settlement',
            subCategory: 'files',
            fileData: f.url,
            fileName: f.name || `结算凭证.${ext}`,
            projectName: project.name,
          })
          if (saveResult.success) {
            savedFiles.push({ url: saveResult?.data?.fileName ?? '', name: f.name, type: f.type })
          } else {
            showToast(saveResult.error || '凭证保存失败', 'error')
            return
          }
        } else {
          savedFiles.push(f)
        }
      }

      const data = {
        ...formData,
        files: savedFiles,
        projectId: project.id,
        partnerId: formData.partnerId,
        settlementNo: editingSettlement?.settlementNo || `S${Date.now()}`,
        items: formData.items.map((item: any, idx: number) => ({
          ...item,
          id: editingSettlement?.items?.[idx]?.id || Date.now() + idx,
        })),
      }

      if (editingSettlement) {
        if (editingSettlement && savedFiles.length === 0) {
          data.files = (editingSettlement as any).files || (editingSettlement.fileUrl ? [{ url: editingSettlement.fileUrl, name: editingSettlement.fileName || '', type: editingSettlement.fileType || 'image' }] : [])
        }
        await window.electronAPI.updateSettlement({ ...editingSettlement, ...data })
        logUpdate('settlements', data.settlementNo, editingSettlement.id, {
          before: editingSettlement,
          after: data,
        })
      } else {
        const result = await window.electronAPI.createSettlement(data)
        logCreate('settlements', data.settlementNo, result?.data?.id, data)
      }
      onDataChange()
      setShowModal(false)
      setEditingSettlement(null)
      showToast(editingSettlement ? '结算单更新成功' : '结算单创建成功', 'success')
    } catch (error: any) {
      console.error('保存结算单失败:', error)
      showToast(error?.message || '保存失败', 'error')
    }
  }

  const handleEdit = (settlement: SettlementData) => {
    setEditingSettlement(settlement)
    setShowModal(true)
  }

  const handleDelete = async (id: number) => {
    if (!can('settlement:delete')) {
      showToast('您没有删除结算单的权限', 'error')
      return
    }
    if (confirm('确定要删除这个结算单吗？')) {
      const settlementToDelete = settlements.find(s => s.id === id)
      try {
        await window.electronAPI.deleteSettlement(id)
        logDelete('settlements', settlementToDelete?.settlementNo || '结算单', id, {
          settlementNo: settlementToDelete?.settlementNo,
          type: settlementToDelete?.type,
          amount: settlementToDelete?.amount,
        })
        onDataChange()
        showToast('结算单已删除', 'success')
      } catch (error: any) {
        console.error('删除结算单失败:', error)
        showToast(error?.message || '删除失败', 'error')
      }
    }
  }

  const handleProcess = async (id: number) => {
    if (!can('settlement:approve')) {
      showToast('您没有操作权限', 'error')
      return
    }
    try {
      const result = await window.electronAPI.processSettlement(id)
      onDataChange()
      if (result.data?.warnings && result.data.warnings.length > 0) {
        showToast('已办理，但存在问题：' + result.data.warnings.join('；'), 'warning')
      } else {
        showToast('付款与发票核验通过，已自动归档', 'success')
      }
    } catch (error: any) {
      showToast(error?.message || '操作失败', 'error')
    }
  }

  const handleUnarchive = async (id: number) => {
    try {
      await window.electronAPI.unarchiveSettlement(id)
      onDataChange()
      showToast('已取消归档', 'success')
    } catch (error: any) {
      showToast(error?.message || '操作失败', 'error')
    }
  }

  const handlePreviewFile = async (settlement: SettlementData) => {
    const fileList = (settlement as any).files?.length > 0 ? (settlement as any).files
      : settlement.fileUrl ? [{ url: settlement.fileUrl, name: settlement.fileName || '凭证', type: settlement.fileType || 'image' }] : []
    if (fileList.length === 0) return
    try {
      const w = window.open('', '_blank')
      if (!w) return
      let html = '<html><head><meta charset="utf-8"><title>结算凭证</title><style>body{font-family:sans-serif;margin:0;padding:16px;background:#f1f5f9}.file-item{background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-bottom:8px}.file-item a{color:#6366f1;text-decoration:none}.file-item img{max-width:100%;max-height:70vh}</style></head><body>'
      for (const f of fileList) {
        const result = await window.electronAPI.readFile({
          category: 'settlement', subCategory: 'files', fileName: f.url, projectName: project.name,
        })
        if (result.success && result.data) {
          html += `<div class="file-item"><p style="font-weight:600;margin:0 0 8px">${f.name}</p>`
          if (f.type === 'pdf') {
            html += `<iframe src="${result.data.dataUrl}" width="100%" height="500" style="border:none"></iframe>`
          } else if (f.type === 'image') {
            html += `<img src="${result.data.dataUrl}" />`
          } else {
            html += `<p style="color:#94a3b8">Excel 文件不支持在线预览，请下载后查看</p><a href="${result.data.dataUrl}" download>下载文件</a>`
          }
          html += '</div>'
        }
      }
      html += '</body></html>'
      w.document.write(html)
    } catch { showToast('预览失败', 'error') }
  }

  const handlePrint = (settlement: SettlementData) => {
    const printContent = printRef.current
    if (printContent) {
      const originalContent = document.body.innerHTML
      const printSection = printContent.querySelector('.print-content')
      if (printSection) {
        document.body.innerHTML = printSection.innerHTML
        window.print()
        document.body.innerHTML = originalContent
        window.location.reload()
      }
    }
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* 打印内容 */}
      <div ref={printRef}>
        {filteredSettlements.map(s => (
          <PrintContent key={s.id} settlement={s} projects={[project]} partners={partners} />
        ))}
      </div>

      {/* 头部：返回 + 项目名 */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
        >
          <Icon name="ArrowLeft" size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{project.name}</h1>
          <p className="text-slate-500 mt-1">结算办理</p>
        </div>
        <div className="flex-1" />
        <button
          onClick={() => setShowTemplateSelector(true)}
          className="btn btn-secondary flex items-center gap-1.5 mr-2"
        >
          <Icon name="FileText" size={16} /> 从模板生成
        </button>
        <button
          onClick={() => { setEditingSettlement(null); setShowModal(true) }}
          className="btn btn-primary"
        >
          <span className="text-xl">+</span>
          新建结算单
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-slate-500">结算单总数</p>
          <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-slate-500">未办理</p>
          <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-slate-500">已办理</p>
          <p className="text-2xl font-bold text-emerald-600">{stats.completed}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-slate-500">已归档</p>
          <p className="text-2xl font-bold text-slate-500">{stats.archived}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-slate-500">结算总金额</p>
          <p className="text-2xl font-bold text-primary-600">¥{formatMoney(stats.totalAmount)}</p>
        </div>
      </div>

      {/* 筛选器 */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">结算类型:</label>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value as SettlementType | '')}
            className="select text-sm"
          >
            <option value="">全部</option>
            <option value="income">收入结算</option>
            <option value="expense">支出结算</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">状态:</label>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as SettlementStatus | '')}
            className="select text-sm"
          >
            <option value="">全部</option>
            <option value="pending">未办理</option>
            <option value="completed">已办理</option>
            <option value="archived">已归档</option>
          </select>
        </div>
      </div>

      {/* 结算单列表 */}
      <SettlementList
        settlements={filteredSettlements}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onProcess={handleProcess}
        onUnarchive={handleUnarchive}
        onPrint={handlePrint}
        onPreviewFile={handlePreviewFile}
      />

      {/* 模态框 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h2 className="text-xl font-semibold text-slate-800">
                {editingSettlement ? '编辑结算单' : '新建结算单'}
              </h2>
              <button
                onClick={() => { setShowModal(false); setEditingSettlement(null) }}
                className="text-slate-400 hover:text-slate-600"
              >
                <Icon name="X" size={16} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              <SettlementForm
                settlement={editingSettlement}
                projects={[project]}
                partners={partners}
                onSubmit={handleSubmit}
                onCancel={() => { setShowModal(false); setEditingSettlement(null) }}
              />
            </div>
          </motion.div>
        </div>
      )}

      {/* 模板选择器 */}
      {showTemplateSelector && (
        <TemplateSelectorModal
          category="settlement"
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

export default SettlementProjectDetail
