import { Settlement as SettlementData, Project } from '../../../types/electron'
import { useToastStore } from '@/store/toastStore'
import { useConfirm } from '@/hooks/useConfirm'
import { logCreate, logUpdate, logDelete } from '../../../utils/audit'
import { usePermission } from '../../../hooks/usePermission.tsx'
import { getAPI } from '@/services/api-adapter'

const COLORS = {
  bodyBg: '#f1f5f9',
  cardBg: '#fff',
  cardBorder: '#e2e8f0',
  primary: '#6366f1',
  mutedText: '#94a3b8',
} as const

export interface SettlementActionParams {
  project: Project
  settlements: SettlementData[]
  editingSettlement: SettlementData | null
  setEditingSettlement: (s: SettlementData | null) => void
  setShowModal: (v: boolean) => void
  onDataChange: () => void
}

export function useSettlementActions({
  project, settlements, editingSettlement, setEditingSettlement, setShowModal, onDataChange,
}: SettlementActionParams) {
  const showToast = useToastStore(state => state.showToast)
  const { confirm, ConfirmDialog } = useConfirm()
  const { can } = usePermission()

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
          const saveResult = await (await getAPI()).saveFile({
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
        await (await getAPI()).updateSettlement({ ...editingSettlement, ...data })
        logUpdate('settlements', data.settlementNo, editingSettlement.id, {
          before: editingSettlement,
          after: data,
        })
      } else {
        const result = await (await getAPI()).createSettlement(data)
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

  const handleDelete = async (id: number) => {
    if (!can('settlement:delete')) {
      showToast('您没有删除结算单的权限', 'error')
      return
    }
    const ok = await confirm({ title: '确认删除', content: '确定要删除这个结算单吗？', confirmVariant: 'danger' })
    if (ok) {
      const settlementToDelete = settlements.find(s => s.id === id)
      try {
        await (await getAPI()).deleteSettlement(id)
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
      const result = await (await getAPI()).processSettlement(id)
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
      await (await getAPI()).unarchiveSettlement(id)
      onDataChange()
      showToast('已取消归档', 'success')
    } catch (error: any) {
      showToast(error?.message || '操作失败', 'error')
    }
  }

  const handleEdit = (settlement: SettlementData) => {
    setEditingSettlement(settlement)
    setShowModal(true)
  }

  const handlePreviewFile = async (settlement: SettlementData) => {
    const fileList = (settlement as any).files?.length > 0 ? (settlement as any).files
      : settlement.fileUrl ? [{ url: settlement.fileUrl, name: settlement.fileName || '凭证', type: settlement.fileType || 'image' }] : []
    if (fileList.length === 0) return
    try {
      const w = window.open('', '_blank')
      if (!w) return
      let html = `<html><head><meta charset="utf-8"><title>结算凭证</title><style>body{font-family:sans-serif;margin:0;padding:16px;background:${COLORS.bodyBg}}.file-item{background:${COLORS.cardBg};border:1px solid ${COLORS.cardBorder};border-radius:8px;padding:12px;margin-bottom:8px}.file-item a{color:${COLORS.primary};text-decoration:none}.file-item img{max-width:100%;max-height:70vh}</style></head><body>`
      for (const f of fileList) {
        const result = await (await getAPI()).readFile({
          category: 'settlement', subCategory: 'files', fileName: f.url, projectName: project.name,
        })
        if (result.success && result.data) {
          html += `<div class="file-item"><p style="font-weight:600;margin:0 0 8px">${f.name}</p>`
          if (f.type === 'pdf') {
            html += `<iframe src="${result.data.dataUrl}" width="100%" height="500" style="border:none"></iframe>`
          } else if (f.type === 'image') {
            html += `<img src="${result.data.dataUrl}" />`
          } else {
            html += `<p style="color:${COLORS.mutedText}">Excel 文件不支持在线预览，请下载后查看</p><a href="${result.data.dataUrl}" download>下载文件</a>`
          }
          html += '</div>'
        }
      }
      html += '</body></html>'
      w.document.write(html)
    } catch { showToast('预览失败', 'error') }
  }

  return {
    handleSubmit, handleEdit, handleDelete, handleProcess, handleUnarchive, handlePreviewFile, ConfirmDialog,
  }
}

