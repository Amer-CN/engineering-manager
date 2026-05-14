import { useCallback, useRef } from 'react'
import type { Member, WorkerTeam } from '../../../../types/electron'
import { useToastContext } from '../../../../hooks/useToast'
import { useConfirm } from '../../../../hooks/useConfirm'
import { useMemberOperations } from '../../members/useMemberOperations'
import { useTeamOps } from '../../members/useTeamOps'
import type { WorkerFormData } from '../../members/memberFormTypes'

interface UseLaborOperationsOptions {
  members: Member[]
  projects: any[]
  workerTeams: WorkerTeam[]
  loadData: () => Promise<void>
  onSuccess?: () => void
}

interface UseLaborOperationsReturn {
  // Member operations
  handleDeleteMember: (id: number) => Promise<void>
  handleSubmitWorker: (data: WorkerFormData) => Promise<void>
  handleFileModified: (field: string) => void
  handleWorkerTransfer: (worker: Member, toTeamId: number, toProjectId: number, transferDate: string, reason: string, workerTeams: WorkerTeam[]) => Promise<void>
  handleWorkerLeave: (worker: Member, actualLeaveDate: string, remarks: string) => Promise<void>
  handleWorkerReEntry: (worker: Member) => Promise<void>

  // Team operations
  handleCreateTeam: (name: string, projectId: number, leaderId?: number | null) => Promise<void>
  handleUpdateTeam: (team: WorkerTeam) => Promise<void>
  handleDeleteTeam: (id: number) => Promise<void>

  // Pool worker operations
  handleSubmitPoolWorker: (formData: any, editingWorker?: any | null) => Promise<void>
  handleDeletePoolWorker: (workerId: number) => Promise<void>

  // Project worker operations
  handleBatchAddWorkers: (entries: any[]) => Promise<void>
  handleUpdateProjectWorker: (pwId: number, data: Record<string, any>) => Promise<void>
  handleDeleteProjectWorker: (pwId: number) => Promise<void>
  handleTeamWorkerTransfer: (pwId: number, toTeamId: number) => Promise<void>
}

/**
 * 工人管理操作 Hook
 * 整合 useMemberOperations、useTeamOps 和 PoolWorker 操作
 */
export function useLaborOperations({
  members,
  projects,
  workerTeams,
  loadData,
  onSuccess,
}: UseLaborOperationsOptions): UseLaborOperationsReturn {
  const { showToast } = useToastContext()
  const { confirm, ConfirmDialog } = useConfirm()
  const originalMemberFileRef = useRef<Record<number, Record<string, string>>>({})

  // Member operations (from useMemberOperations)
  const {
    handleDeleteMember: originalHandleDeleteMember,
    handleSubmitWorker: originalHandleSubmitWorker,
    handleFileModified,
    handleWorkerTransfer,
    handleWorkerLeave,
    handleWorkerReEntry,
  } = useMemberOperations({
    editingStaff: null,
    editingWorker: null,
    projects,
    originalMemberFileRef,
    loadData,
    showToast: (msg: string, type: any) => showToast(msg, type),
    onSuccess: onSuccess || (() => {}),
  })

  // Team operations (from useTeamOps)
  const { handleCreateTeam, handleUpdateTeam, handleDeleteTeam } = useTeamOps({
    workerTeams,
    loadData,
    showToast: (msg: string, type: any) => showToast(msg, type),
  })

  // Wrap delete member with confirm dialog
  const handleDeleteMember = useCallback(async (id: number) => {
    const memberToDelete = members.find(m => m.id === id)
    const ok = await confirm({
      title: '确认删除',
      content: `确定要删除成员"${memberToDelete?.name || ''}"吗？`,
      confirmVariant: 'danger',
    })
    if (ok) {
      await originalHandleDeleteMember(id, members)
    }
  }, [members, originalHandleDeleteMember, confirm])

  // Wrap submit worker
  const handleSubmitWorker = useCallback(async (data: WorkerFormData) => {
    await originalHandleSubmitWorker(data)
  }, [originalHandleSubmitWorker])

  // Pool worker operations
  const handleSubmitPoolWorker = useCallback(async (formData: any, editingWorker?: any | null) => {
    const data = {
      name: formData.name,
      phone: formData.phone,
      idCard: formData.idCard,
      gender: formData.gender || undefined,
      ethnicity: formData.ethnicity || undefined,
      birthDate: formData.birthDate || undefined,
      address: formData.idCardAddress || undefined,
      bankAccount: formData.bankAccount || undefined,
      bankName: formData.bankName || undefined,
      bankLineNo: formData.bankLineNo || undefined,
      workerType: formData.workerType || undefined,
      dailyWage: formData.dailyWage ? Number(formData.dailyWage) || undefined : undefined,
    }

    try {
      if (editingWorker) {
        const result = await window.electronAPI.updateWorker({
          id: editingWorker.workerId || editingWorker.id,
          ...data,
        } as any)
        if (result.success) {
          showToast('工人信息已更新', 'success')
          await loadData()
        } else {
          showToast(result.error || '更新失败', 'error')
        }
      } else {
        const result = await window.electronAPI.createWorker(data as any)
        if (result.success) {
          showToast('工人已添加', 'success')
          await loadData()
        } else {
          showToast(result.error || '添加失败', 'error')
        }
      }
    } catch (err: any) {
      showToast(err.message || '操作失败', 'error')
    }
  }, [loadData, showToast])

  const handleDeletePoolWorker = useCallback(async (workerId: number) => {
    const worker = members.find(m => (m as any).workerId === workerId || m.id === workerId)
    const ok = await confirm({
      title: '确认删除',
      content: `确定删除工人"${worker?.name || ''}"？将从所有项目中移除。`,
      confirmVariant: 'danger',
    })
    if (!ok) return

    try {
      const result = await window.electronAPI.deleteWorker(workerId)
      if (result.success) {
        showToast('工人已删除', 'success')
        await loadData()
      } else {
        showToast(result.error || '删除失败', 'error')
      }
    } catch (err: any) {
      showToast(err.message || '删除失败', 'error')
    }
  }, [members, confirm, loadData, showToast])

  // Project worker operations
  const handleBatchAddWorkers = useCallback(async (entries: any[]) => {
    try {
      const result = await window.electronAPI.batchCreateProjectWorkers(entries as any[])
      if (result.success) {
        showToast(`成功添加 ${entries.length} 名工人`, 'success')
        await loadData()
      } else {
        showToast(result.error || '添加失败', 'error')
      }
    } catch (err: any) {
      showToast(err.message || '添加失败', 'error')
    }
  }, [loadData, showToast])

  const handleUpdateProjectWorker = useCallback(async (pwId: number, data: Record<string, any>) => {
    try {
      const result = await window.electronAPI.updateProjectWorker({ id: pwId, ...data } as any)
      if (result.success) {
        showToast('更新成功', 'success')
        await loadData()
      } else {
        showToast(result.error || '更新失败', 'error')
      }
    } catch (err: any) {
      showToast(err.message || '更新失败', 'error')
    }
  }, [loadData, showToast])

  const handleDeleteProjectWorker = useCallback(async (pwId: number) => {
    try {
      const result = await window.electronAPI.deleteProjectWorker(pwId)
      if (result.success) {
        showToast('已移除', 'success')
        await loadData()
      } else {
        showToast(result.error || '移除失败', 'error')
      }
    } catch (err: any) {
      showToast(err.message || '移除失败', 'error')
    }
  }, [loadData, showToast])

  const handleTeamWorkerTransfer = useCallback(async (pwId: number, toTeamId: number) => {
    try {
      const result = await window.electronAPI.updateProjectWorker({ id: pwId, teamId: toTeamId } as any)
      if (result.success) {
        showToast('调组成功', 'success')
        await loadData()
      } else {
        showToast(result.error || '调组失败', 'error')
      }
    } catch (err: any) {
      showToast(err.message || '调组失败', 'error')
    }
  }, [loadData, showToast])

  return {
    handleDeleteMember,
    handleSubmitWorker,
    handleFileModified,
    handleWorkerTransfer,
    handleWorkerLeave,
    handleWorkerReEntry,
    handleCreateTeam,
    handleUpdateTeam,
    handleDeleteTeam,
    handleSubmitPoolWorker,
    handleDeletePoolWorker,
    handleBatchAddWorkers,
    handleUpdateProjectWorker,
    handleDeleteProjectWorker,
    handleTeamWorkerTransfer,
  }
}
