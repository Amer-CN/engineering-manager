import React, { useState, useEffect, useRef } from 'react'
import { Icon } from '../../ui/Icon'
import { Drawer } from '../../ui/Drawer'
import { Input } from '../../ui/Input/Input'
import { PartnerSelect } from '../partners/PartnerSelect'
import { FileDropZone } from '../partners/FileDropZone'
import { logCreate, logUpdate } from '../../../utils/audit'
import { useToastStore } from '@/store/toastStore'
import { paymentMethods, contractStatuses } from '../../../data/regions'
import type { Project, Partner, AgreementSubType } from '../../../types/electron'
import type { Contract, ContractType } from './contractConfig'
import type { AgreementContract, IncomeContract, ExpenseContract } from '@/types'
import { CONFIG, AGREEMENT_SUB_TYPE_LABELS } from './contractConfig'
import { getAPI } from '@/services/api-adapter'
import { Button } from '../../ui/Button'

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
      const agreementContract = editingContract as AgreementContract
      setFormData({
        projectId: editingContract.projectId, partnerId: editingContract.partnerId || 0,
        contractNo: editingContract.contractNo, name: editingContract.name,
        amount: editingContract.amount || 0, signedDate: editingContract.signedDate,
        startDate: editingContract.startDate, endDate: editingContract.endDate,
        status: editingContract.status, paymentMethod: (editingContract as IncomeContract | ExpenseContract).paymentMethod || 'by_progress',
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
        const saveResult = await (await getAPI()).saveContractFile({
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
        for (const [key, value] of Object.entries(submissionData)) { if (value !== undefined && value !== '') (updateData as Record<string, unknown>)[key] = value }
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

  return (
    <Drawer open={show} onClose={onClose}
      icon="FileText"
      width={560}
      title={
        <div className="flex items-center gap-2">
          <span>{isEditing ? '编辑合同' : config.modalCreateTitle}</span>
          {!isEditing && (
            <Button type="button" onClick={onShowTemplateSelector}  variant="ghost" size="sm" className="text-[color:var(--accent)]">
              <Icon name="FileText" size={14} /> 从模板生成
            </Button>
          )}
          <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: 'var(--panel-2)', color: 'var(--fg-2)' }}>{config.label}</span>
        </div>
      }
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button type="button" onClick={onClose}  variant="secondary">取消</Button>
          <Button type="button" onClick={handleSubmit}  variant="primary">{isEditing ? '保存' : '添加'}</Button>
        </div>
      }>
      <form onSubmit={handleSubmit} className="px-6 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><Input label="合同名称" type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} size="sm" required /></div>
          <div><label className="block text-sm font-medium mb-1 text-[color:var(--fg-2)]">关联项目 *</label><select value={formData.projectId} onChange={e => setFormData({ ...formData, projectId: parseInt(e.target.value) })} className="select" required><option value="">选择项目</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          <div><label className="block text-sm font-medium mb-1 text-[color:var(--fg-2)]">{config.partnerLabel}</label><PartnerSelect partners={partners} value={formData.partnerId || null} onChange={(partnerId) => setFormData({ ...formData, partnerId: partnerId || 0 })} placeholder={config.partnerPlaceholder} /></div>
          <div><Input label="合同编号" type="text" value={formData.contractNo} onChange={e => setFormData({ ...formData, contractNo: e.target.value })} size="sm" /></div>
          <div><Input label="合同金额" type="number" value={formData.amount || ''} onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })} size="sm" required={type !== 'agreement'} /></div>
          <div><Input label="签订日期" type="date" value={formData.signedDate} onChange={e => setFormData({ ...formData, signedDate: e.target.value })} size="sm" /></div>
          {type !== 'agreement' && (
            <div><label className="block text-sm font-medium mb-1 text-[color:var(--fg-2)]">付款方式</label><select value={formData.paymentMethod} onChange={e => setFormData({ ...formData, paymentMethod: e.target.value as typeof formData.paymentMethod })} className="select">{paymentMethods.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}</select></div>
          )}
          {type === 'agreement' && (
            <div><label className="block text-sm font-medium mb-1 text-[color:var(--fg-2)]">协议类型</label><select value={formData.agreementType} onChange={e => setFormData({ ...formData, agreementType: e.target.value as AgreementSubType })} className="select">{Object.entries(AGREEMENT_SUB_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
          )}
          <div><Input label="开始日期" type="date" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} size="sm" /></div>
          <div><Input label="结束日期" type="date" value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} size="sm" /></div>
          <div><label className="block text-sm font-medium mb-1 text-[color:var(--fg-2)]">合同状态</label><select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as typeof formData.status })} className="select">{contractStatuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></div>
          <div className="col-span-2"><label className="block text-sm font-medium mb-1 text-[color:var(--fg-2)]">备注</label><textarea value={formData.remarks} onChange={e => setFormData({ ...formData, remarks: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-[color:var(--card)] border border-[color:var(--border)] text-[color:var(--fg)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-soft)] focus:border-[color:var(--accent)]" rows={3} /></div>
          <div className="col-span-2">
            <FileDropZone label="上传合同附件" iconName="Paperclip" file={formData.fileUrl} fileType={formData.fileType || 'image'}
              fileLabel={formData.fileType === 'pdf' ? 'PDF文件' : formData.fileType === 'word' ? 'Word文档' : formData.fileType === 'excel' ? 'Excel表格' : '图片文件'}
              dragOver={dragOverFile} inputRef={fileInputRef} iconBgClass="bg-[color:var(--accent-soft)]"
              onFileSelect={processFileForUpload}
              onRemove={() => setFormData(prev => ({ ...prev, fileUrl: '', fileType: undefined }))}
              onDragOver={(e) => { e.preventDefault(); setDragOverFile(true) }}
              onDragLeave={() => setDragOverFile(false)}
              onDrop={(e) => { e.preventDefault(); setDragOverFile(false); const files = e.dataTransfer.files; if (files.length > 0) processFileForUpload(files[0]) }}
              onClickUpload={() => fileInputRef.current?.click()}
            />
          </div>
        </div>
      </form>
    </Drawer>
  )
}
