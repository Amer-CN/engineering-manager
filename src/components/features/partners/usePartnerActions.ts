import { useToastStore } from '@/store/toastStore'
import { useConfirm } from '@/hooks/useConfirm'
import { guessFileExt, deleteUploadedFile, uploadFile, FILE_CATEGORIES } from '../../../services/fileService'
import { logCreate, logUpdate, logDelete } from '../../../utils/audit'
import { getAPI } from '@/services/api-adapter'
import type { Partner, Supervisor, Project } from '../../../types/electron'

interface UsePartnerActionsOptions {
  partners: Partner[]
  supervisors: Supervisor[]
  projects: Project[]
  loadData: () => Promise<void>
  refresh?: () => void
}

export function usePartnerActions({ partners, supervisors, projects, loadData, refresh }: UsePartnerActionsOptions) {
  const showToast = useToastStore(state => state.showToast)
  const { confirm } = useConfirm()

  const handlePartnerSubmit = async (formData: any, editingPartner: Partner | null) => {
    try {
      let processed = { ...formData }

      if (Array.isArray(processed.projectIds)) {
        processed.projectIds = JSON.stringify(processed.projectIds)
      }

      const partnerProjectName = processed.projectIds?.length > 0
        ? projects.find(p => p.id === processed.projectIds[0])?.name || null
        : null

      if (processed.licenseFile && processed.licenseFile.startsWith('data:')) {
        const ext = guessFileExt(processed.licenseFile, processed.licenseFileType)
        const fileName = await uploadFile(
          FILE_CATEGORIES.PARTNER_LICENSE.category,
          FILE_CATEGORIES.PARTNER_LICENSE.subCategory,
          processed.licenseFile,
          `${processed.name || '单位'}_营业执照${ext}`,
          partnerProjectName,
        ).catch((err: unknown) => {
          try { showToast((err instanceof Error ? err.message : '营业执照文件上传失败'), 'error') } catch (e) { console.warn('[Partners] showToast失败:', e) }
          return ''
        })
        if (fileName) processed.licenseFile = fileName
      }

      if (processed.otherFiles && typeof processed.otherFiles === 'string') {
        const parts = processed.otherFiles.split('|||')
        const newParts: string[] = []
        for (const part of parts) {
          if (part.startsWith('data:')) {
            const ext = guessFileExt(part, '')
            const fn = await uploadFile(
              FILE_CATEGORIES.PARTNER_ATTACHMENT.category,
              FILE_CATEGORIES.PARTNER_ATTACHMENT.subCategory,
              part,
              `${processed.name || '单位'}_附件${ext}`,
              partnerProjectName,
            ).catch((err: unknown) => {
              try { showToast((err instanceof Error ? err.message : '附件上传失败'), 'error') } catch (e) { console.warn('[Partners] showToast失败:', e) }
              return ''
            })
            newParts.push(fn || part)
          } else {
            newParts.push(part)
          }
        }
        processed.otherFiles = newParts.join('|||')
      }

      if (editingPartner) {
        await (await getAPI()).updatePartner({ ...editingPartner, ...processed })
        logUpdate('partners', processed.name, editingPartner.id, { before: editingPartner, after: processed })
      } else {
        const result = await (await getAPI()).createPartner(processed)
        if (result.success && result.data) {
          logCreate('partners', processed.name, result.data.id, processed)
        }
      }
      loadData()
      refresh?.()
      try { showToast(editingPartner ? '合作单位更新成功' : '合作单位创建成功', 'success') } catch (e) { console.warn('[Partners] showToast失败:', e) }
    } catch (error: unknown) {
      console.error('保存失败:', error)
      try { showToast((error instanceof Error ? error.message : '保存失败'), 'error') } catch (e) { console.warn('[Partners] showToast失败:', e) }
    }
  }

  const handlePartnerDelete = async (id: number) => {
    const ok = await confirm({ title: '确认删除', content: '确定要删除这个合作单位吗？', confirmVariant: 'danger' })
    if (!ok) return
    try {
      const partnerToDelete = partners.find(p => p.id === id)

      if (partnerToDelete) {
        const delProjName = partnerToDelete.projectIds?.length > 0
          ? projects.find(p => p.id === partnerToDelete.projectIds[0])?.name || null
          : null
        await deleteUploadedFile(FILE_CATEGORIES.PARTNER_LICENSE.category, FILE_CATEGORIES.PARTNER_LICENSE.subCategory, partnerToDelete.licenseFile, delProjName)
        if (partnerToDelete.otherFiles) {
          const parts = partnerToDelete.otherFiles.split('|||')
          for (const part of parts) {
            if (part && !part.startsWith('data:')) {
              await deleteUploadedFile(FILE_CATEGORIES.PARTNER_ATTACHMENT.category, FILE_CATEGORIES.PARTNER_ATTACHMENT.subCategory, part, delProjName)
            }
          }
        }
      }

      await (await getAPI()).deletePartner(id)

      logDelete('partners', partnerToDelete?.name || '合作单位', id)

      loadData()
      refresh?.()
    } catch (error) {
      console.error('删除失败:', error)
    }
  }

  const handleSupervisorSubmit = async (formData: any, editingSupervisor: Supervisor | null) => {
    try {
      if (editingSupervisor) {
        await (await getAPI()).updateSupervisor({ ...editingSupervisor, ...formData })
        logUpdate('partners', formData.name, editingSupervisor.id, { before: editingSupervisor, after: formData })
      } else {
        const result = await (await getAPI()).createSupervisor(formData)
        if (result.success && result.data) {
          logCreate('partners', formData.name, result.data.id, formData)
        }
      }
      loadData()
      refresh?.()
    } catch (error) {
      console.error('保存失败:', error)
    }
  }

  const handleSupervisorDelete = async (id: number) => {
    const ok = await confirm({ title: '确认删除', content: '确定要删除这个监管单位吗？', confirmVariant: 'danger' })
    if (!ok) return
    try {
      const supervisorToDelete = supervisors.find(s => s.id === id)

      await (await getAPI()).deleteSupervisor(id)

      logDelete('partners', supervisorToDelete?.name || '监管单位', id)

      loadData()
      refresh?.()
    } catch (error) {
      console.error('删除失败:', error)
    }
  }

  return { handlePartnerSubmit, handlePartnerDelete, handleSupervisorSubmit, handleSupervisorDelete }
}
