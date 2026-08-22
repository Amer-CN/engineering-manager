import { useToastStore } from '@/store/toastStore'
import { useConfirm } from '@/hooks/useConfirm'
import { guessFileExt, deleteUploadedFile, uploadFile, FILE_CATEGORIES } from '../../../services/fileService'
import { logCreate, logUpdate, logDelete } from '../../../utils/audit'
import { getAPI } from '@/services/api-adapter'
import { usePermission } from '@/hooks/usePermission'
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
  const { can } = usePermission()

  // 安全表 #3 豁免: GET /api/partners 列表已按角色 PII mask（如 138****1234），
  // 编辑表单回填掩码值后直接提交会把掩码存库。提交前检测含 '*' 的 PII 字段，
  // 用原记录值替换（掩码 = 用户未改动该字段）。
  // 注: PUT /api/partners 为全字段 UPDATE，不能剔除字段（Dapper 缺参），只能回填原值。
  const PARTNER_PII_FIELDS = ['phone', 'bankAccount', 'taxNumber', 'creditCode'] as const
  const unmaskPartnerPii = (processed: Record<string, any>, editing: Partner | null) => {
    if (!editing) return processed
    const restored = { ...processed }
    for (const field of PARTNER_PII_FIELDS) {
      if (typeof restored[field] === 'string' && restored[field].includes('*')) {
        ;(restored as any)[field] = (editing as any)[field] ?? ''
      }
    }
    return restored
  }
  const SUPERVISOR_PII_FIELDS = ['phone'] as const
  const unmaskSupervisorPii = (processed: Record<string, any>, editing: Supervisor | null) => {
    if (!editing) return processed
    const restored = { ...processed }
    for (const field of SUPERVISOR_PII_FIELDS) {
      if (typeof restored[field] === 'string' && restored[field].includes('*')) {
        ;(restored as any)[field] = (editing as any)[field] ?? ''
      }
    }
    return restored
  }

  const handlePartnerSubmit = async (formData: any, editingPartner: Partner | null) => {
    // G2 B6: 单位新增/编辑 → partners:create / partners:update
    const need = editingPartner ? 'partners:update' : 'partners:create'
    if (!can(need as 'partners:create')) {
      showToast(editingPartner ? '您没有编辑单位的权限' : '您没有新增单位的权限', 'error')
      return
    }
    try {
      let processed = { ...formData }

      // R6-P1: stringify 前先存数组副本用于项目名计算（原顺序 stringify 后 [0] 取到字符 '['）
      const projectIdsArr: number[] = Array.isArray(processed.projectIds) ? processed.projectIds : []
      if (Array.isArray(processed.projectIds)) {
        processed.projectIds = JSON.stringify(processed.projectIds)
      }

      const partnerProjectName = projectIdsArr.length > 0
        ? projects.find(p => p.id === projectIdsArr[0])?.name || null
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
        // 安全表 #3 豁免: 掩码字段回填原记录值（见 unmaskPartnerPii 注释）
        processed = unmaskPartnerPii(processed, editingPartner) as any
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
    // G2 B6: 单位删除 → partners:delete
    if (!can('partners:delete')) { showToast('您没有删除单位的权限', 'error'); return }
    const ok = await confirm({ title: '确认删除', content: '确定要删除这个合作单位吗？', confirmVariant: 'danger' })
    if (!ok) return
    try {
      const partnerToDelete = partners.find(p => p.id === id)

      // R6-P1: 先删记录成功后再清理附件文件（原顺序 deletePartner 失败时文件已删不可恢复）
      await (await getAPI()).deletePartner(id)

      logDelete('partners', partnerToDelete?.name || '合作单位', id)

      if (partnerToDelete) {
        // R6-P1: projectIds 运行时可能是 JSON 字符串（DB 存 stringify 结果），先 typeof 判断再取
        let delIds: number[] = []
        const rawIds: unknown = partnerToDelete.projectIds
        if (Array.isArray(rawIds)) delIds = rawIds
        else if (typeof rawIds === 'string' && rawIds) {
          try { const parsed = JSON.parse(rawIds); if (Array.isArray(parsed)) delIds = parsed } catch { /* 忽略非法 JSON */ }
        }
        const delProjName = delIds.length > 0
          ? projects.find(p => p.id === delIds[0])?.name || null
          : null
        try {
          await deleteUploadedFile(FILE_CATEGORIES.PARTNER_LICENSE.category, FILE_CATEGORIES.PARTNER_LICENSE.subCategory, partnerToDelete.licenseFile, delProjName)
          if (partnerToDelete.otherFiles) {
            const parts = partnerToDelete.otherFiles.split('|||')
            for (const part of parts) {
              if (part && !part.startsWith('data:')) {
                await deleteUploadedFile(FILE_CATEGORIES.PARTNER_ATTACHMENT.category, FILE_CATEGORIES.PARTNER_ATTACHMENT.subCategory, part, delProjName)
              }
            }
          }
        } catch (fileErr) {
          console.error('附件清理失败:', fileErr) // 文件残留可接受，记录已删
        }
      }

      loadData()
      refresh?.()
    } catch (error: unknown) {
      console.error('删除失败:', error)
      try { showToast((error instanceof Error ? error.message : '删除失败'), 'error') } catch (e) { console.warn('[Partners] showToast失败:', e) }
    }
  }

  const handleSupervisorSubmit = async (formData: any, editingSupervisor: Supervisor | null) => {
    // G2 B6: 监管单位新增/编辑 → partners:create / partners:update
    const need = editingSupervisor ? 'partners:update' : 'partners:create'
    if (!can(need as 'partners:create')) {
      showToast(editingSupervisor ? '您没有编辑监管单位的权限' : '您没有新增监管单位的权限', 'error')
      return
    }
    try {
      if (editingSupervisor) {
        // 安全表 #3 豁免: 掩码字段回填原记录值（见 unmaskSupervisorPii 注释）
        const processed = unmaskSupervisorPii(formData, editingSupervisor)
        await (await getAPI()).updateSupervisor({ ...editingSupervisor, ...processed })
        logUpdate('partners', formData.name, editingSupervisor.id, { before: editingSupervisor, after: processed })
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
    // G2 B6: 监管单位删除 → partners:delete
    if (!can('partners:delete')) { showToast('您没有删除监管单位的权限', 'error'); return }
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
