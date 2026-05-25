import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Icon } from '../../ui/Icon'
import { PartnerSelect } from '../partners/PartnerSelect'
import { FileDropZone } from '../partners/FileDropZone'
import { logCreate, logUpdate } from '../../../utils/audit'
import { useToastStore } from '@/store/toastStore'
import { paymentMethods, contractStatuses } from '../../../data/regions'
import type { Project, Partner, AgreementSubType } from '../../../types/electron'
import type { Contract, ContractType } from './contractConfig'
import { CONFIG, AGREEMENT_SUB_TYPE_LABELS } from './contractConfig'

interface Props {
  show: boolean
  type: ContractType
  editingContract: Contract | null
  projects: Project[]
  partners: Partner[]
  api: { createContract: (d: any) => Promise<any>; updateContract: (d: any) => Promise<any> }
  onClose: () => void
  onSuccess: () => void
  onShowTemplateSelector: () => void
}

const emptyForm = {
  projectId: 0, partnerId: 0, contractNo: '', name: '', amount: 0,
  signedDate: '', startDate: '', endDate: '', status: 'draft' as Contract['status'],
  paymentMethod: 'by_progress' as 'one_time' | 'monthly' | 'by_progress' | 'by_stage', remarks: '',
  agreementType: 'cooperation' as AgreementSubType,
  fileUrl: '', fileType: undefined as 'pdf' | 'image' | 'word' | 'excel' | undefined,
}

export const ContractFormModal: React.FC<Props> = ({ show, type, editingContract, projects, partners, api, onClose, onSuccess, onShowTemplateSelector }) => {
  const config = CONFIG[type]
  const showToast = useToastStore(state => state.showToast)
  const [formData, setFormData] = useState(emptyForm)
  const [dragOverFile, setDragOverFile] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isEditing = !!editingContract

  useEffect(() => {
    if (editingContract) {
      const agreementContract = editingContract as any
      setFormData({
        projectId: editingContract.projectId, partnerId: editingContract.partnerId || 0,
        contractNo: editingContract.contractNo, name: editingContract.name,
        amount: editingContract.amount || 0, signedDate: editingContract.signedDate,
        startDate: editingContract.startDate, endDate: editingContract.endDate,
        status: editingContract.status, paymentMethod: (editingContract as any).paymentMethod || 'by_progress',
        remarks: editingContract.remarks || '', fileUrl: editingContract.fileUrl || '',
        fileType: editingContract.fileType,
        agreementType: agreementContract.agreementType || 'cooperation',
      })
    } else setFormData(emptyForm)
  }, [editingContract, show])

  const processFileForUpload = (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.docx', '.xlsx']
    const fileName = file.name.toLowerCase()
    if (!allowedTypes.includes(file.type) && !allowedExtensions.some(ext => fileName.endsWith(ext))) { showToast('只能上传 JPG、PNG、WebP、PDF、DOCX、XLSX 格式的文件', 'error'); return }
    if (file.size > 30 * 1024 * 1024) { showToast('文件大小不能超过 30MB', 'error'); return }
    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      let ft: 'pdf' | 'image' | 'word' | 'excel' = 'image'
      const fn = file.name.toLowerCase(); const mt = file.type.toLowerCase()
      if (mt === 'application/pdf' || fn.endsWith('.pdf')) ft = 'pdf'
      else if (mt.includes('word') || mt.includes('document') || fn.endsWith('.docx')) ft = 'word'
      else if (mt.includes('sheet') || mt.includes('excel') || fn.endsWith('.xlsx')) ft = 'excel'
      setFormData(prev => ({ ...prev, fileUrl: base64, fileType: ft }))
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) { showToast('请输入合同名称', 'error'); return }
    if (!formData.projectId) { showToast('请选择关联项目', 'error'); return }
    if (type !== 'agreement' && (!formData.amount || formData.amount <= 0)) { showToast('请输入有效的合同金额', 'error'); return }
    try {
      let fileUrl = formData.fileUrl
      if (fileUrl && fileUrl.startsWith('data:')) {
        const ext = formData.fileType === 'pdf' ? 'pdf' : formData.fileType === 'word' ? 'docx' : formData.fileType === 'excel' ? 'xlsx' : 'png'
        const amountSuffix = type === 'agreement' ? (formData.amount ? `_${formData.amount}元` : '') : `_${formData.amount}元`
        const saveResult = await window.electronAPI.saveContractFile({
          fileData: fileUrl, fileName: `${formData.name}${amountSuffix}.${ext}`,
          subCategory: config.subCategory,
          projectName: projects.find(p => p.id === formData.projectId)?.name || null,
        })
        if (saveResult.success) fileUrl = saveResult?.data?.fileName ?? ''
        else { showToast(saveResult.error || '文件保存失败', 'error'); return }
      }
      const submissionData = { ...formData, fileUrl }
      if (isEditing) {
        const updateData: any = { ...editingContract }
        for (const [key, value] of Object.entries(submissionData)) { if (value !== undefined && value !== '') (updateData as any)[key] = value }
        await api.updateContract(updateData)
        const strip = (obj: any) => obj?.fileUrl ? { ...obj, fileUrl: obj.fileUrl.startsWith('data:') ? '[base64 data]' : obj.fileUrl } : obj
        logUpdate(config.auditResource, formData.name, editingContract!.id, { before: strip(editingContract), after: strip(submissionData) })
      } else {
        const result = await api.createContract(submissionData)
        const auditDetails = { ...submissionData }; if (auditDetails.fileUrl?.startsWith('data:')) auditDetails.fileUrl = '[base64 data]'
        logCreate(config.auditResource, formData.name, result?.data?.id, auditDetails)
      }
      onClose(); onSuccess()
      showToast(isEditing ? '合同更新成功！' : '合同创建成功！', 'success')
    } catch (error: any) { showToast('保存失败: ' + (error?.message || error), 'error') }
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <motion.div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
        <div className="px-6 py-4 border-b border-slate-200 sticky top-0 bg-white flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-800">{isEditing ? '编辑合同' : config.modalCreateTitle}</h2>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <button type="button" onClick={onShowTemplateSelector} className="px-3 py-1.5 text-xs bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-200 rounded-lg flex items-center gap-1 transition-colors">
                <Icon name="FileText" size={14} /> 从模板生成
              </button>
            )}
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${type === 'income' ? 'bg-emerald-100 text-emerald-700' : type === 'expense' ? 'bg-red-100 text-red-700' : 'bg-sky-100 text-sky-700'}`}>{config.label}</span>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1">合同名称 *</label><input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500" required /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">关联项目 *</label><select value={formData.projectId} onChange={e => setFormData({ ...formData, projectId: parseInt(e.target.value) })} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500" required><option value="">选择项目</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">{config.partnerLabel}</label><PartnerSelect partners={partners} value={formData.partnerId || null} onChange={(partnerId) => setFormData({ ...formData, partnerId: partnerId || 0 })} placeholder={config.partnerPlaceholder} /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">合同编号</label><input type="text" value={formData.contractNo} onChange={e => setFormData({ ...formData, contractNo: e.target.value })} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">合同金额{type !== 'agreement' ? ' *' : ''}</label><input type="number" value={formData.amount || ''} onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500" required={type !== 'agreement'} /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">签订日期</label><input type="date" value={formData.signedDate} onChange={e => setFormData({ ...formData, signedDate: e.target.value })} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500" /></div>
            {type !== 'agreement' && (
              <div><label className="block text-sm font-medium text-slate-700 mb-1">付款方式</label><select value={formData.paymentMethod} onChange={e => setFormData({ ...formData, paymentMethod: e.target.value as any })} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500">{paymentMethods.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}</select></div>
            )}
            {type === 'agreement' && (
              <div><label className="block text-sm font-medium text-slate-700 mb-1">协议类型</label><select value={formData.agreementType} onChange={e => setFormData({ ...formData, agreementType: e.target.value as AgreementSubType })} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500">{Object.entries(AGREEMENT_SUB_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
            )}
            <div><label className="block text-sm font-medium text-slate-700 mb-1">开始日期</label><input type="date" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">结束日期</label><input type="date" value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">合同状态</label><select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as any })} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500">{contractStatuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></div>
            <div className="col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1">备注</label><textarea value={formData.remarks} onChange={e => setFormData({ ...formData, remarks: e.target.value })} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500" rows={3} /></div>
            <div className="col-span-2">
              <FileDropZone label="上传合同附件" iconName="Paperclip" file={formData.fileUrl} fileType={formData.fileType || 'image'}
                fileLabel={formData.fileType === 'pdf' ? 'PDF文件' : formData.fileType === 'word' ? 'Word文档' : formData.fileType === 'excel' ? 'Excel表格' : '图片文件'}
                dragOver={dragOverFile} inputRef={fileInputRef} iconBgClass={config.accentBgLight}
                onFileSelect={processFileForUpload}
                onRemove={() => setFormData(prev => ({ ...prev, fileUrl: '', fileType: undefined }))}
                onDragOver={(e) => { e.preventDefault(); setDragOverFile(true) }}
                onDragLeave={() => setDragOverFile(false)}
                onDrop={(e) => { e.preventDefault(); setDragOverFile(false); const files = e.dataTransfer.files; if (files.length > 0) processFileForUpload(files[0]) }}
                onClickUpload={() => fileInputRef.current?.click()}
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
            <button type="button" onClick={onClose} className="btn btn-secondary">取消</button>
            <button type="submit" className="btn btn-primary">{isEditing ? '保存' : '添加'}</button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
