import type { Member, WorkerTeam, WorkerStatus } from '../../../types/electron'
import { logCreate, logUpdate, logDelete } from '../../../utils/audit'
import { processFileFields, guessFileExt, FILE_CATEGORIES } from '../../../services/fileService'
import type { StaffFormData, WorkerFormData } from './memberFormTypes'

interface SubmitMemberOptions {
  editingStaff: Member | null
  editingWorker: Member | null
  projects: any[]
  originalMemberFileRef: React.MutableRefObject<Record<number, Record<string, string>>>
  loadData: () => Promise<void>
  showToast: (msg: string, type: 'success' | 'error') => void
  onSuccess: () => void
}

function stripEmpties(obj: any) {
  Object.keys(obj).forEach(key => {
    if (typeof obj[key] === 'string' && obj[key] === '') obj[key] = undefined
  })
}

export function useMemberOperations({
  editingStaff, editingWorker, projects, originalMemberFileRef, loadData, showToast, onSuccess
}: SubmitMemberOptions) {

  const handleDeleteMember = async (id: number, members: Member[]) => {
    if (!confirm('确定要删除该成员吗？')) return
    try {
      const memberToDelete = members.find(m => m.id === id)
      const result = await window.electronAPI.deleteMember(id)
      if (result.success) {
        logDelete('members', memberToDelete?.name || '员工', id, { memberType: memberToDelete?.memberType })
        loadData()
        showToast('删除成功', 'success')
      } else { showToast(result.error || '删除失败', 'error') }
    } catch (error) { showToast('删除失败', 'error') }
  }

  const handleFileModified = (field: string) => {
    for (const member of [editingStaff, editingWorker]) {
      if (member) {
        const ref = originalMemberFileRef.current[member.id]
        if (ref) delete ref[field]
      }
    }
  }

  const handleSubmitStaff = async (data: StaffFormData) => {
    try {
      let submitFileData: any = data
      if (editingStaff) {
        const orig = originalMemberFileRef.current[editingStaff.id] || {}
        const restored: any = { ...data }
        let hasRestore = false
        for (const key of ['idCardFront', 'idCardBack', 'contractFile']) {
          if (typeof restored[key] === 'string' && restored[key].startsWith('data:') && orig[key]) {
            restored[key] = orig[key]; hasRestore = true
          }
        }
        if (hasRestore) submitFileData = restored
      }
      const processed = await processFileFields(submitFileData, [
        { field: 'idCardFront', ...FILE_CATEGORIES.MEMBER_ID_CARD, getFileName: () => `${data.name || '员工'}_身份证人像${guessFileExt(data.idCardFront)}` },
        { field: 'idCardBack', ...FILE_CATEGORIES.MEMBER_ID_CARD, getFileName: () => `${data.name || '员工'}_身份证国徽${guessFileExt(data.idCardBack)}` },
        { field: 'contractFile', ...FILE_CATEGORIES.MEMBER_CONTRACT, getFileName: () => `${data.name || '员工'}_劳动合同${guessFileExt(data.contractFile, data.contractFileType)}` },
      ], null)
      const submitData = { ...processed, memberType: 'staff' as const }
      stripEmpties(submitData)
      if (editingStaff) {
        const result = await window.electronAPI.updateMember({ ...editingStaff, ...submitData })
        if (result.success) logUpdate('members', submitData.name, editingStaff.id, { before: editingStaff, after: submitData })
      } else {
        const result = await window.electronAPI.createMember(submitData)
        if (result.success && result.data) logCreate('members', submitData.name, result.data.id, submitData)
      }
      onSuccess()
      showToast(editingStaff ? '更新成功' : '创建成功', 'success')
    } catch (error: any) { showToast(error?.message || '保存失败', 'error') }
  }

  const handleSubmitWorker = async (data: WorkerFormData) => {
    try {
      let submitFileData: any = data
      if (editingWorker) {
        const orig = originalMemberFileRef.current[editingWorker.id] || {}
        const restored: any = { ...data }
        let hasRestore = false
        for (const key of ['idCardFront', 'idCardBack', 'contractFile', 'safetyTrainingFile', 'healthReportFile', 'specialCertificateFile']) {
          if (typeof restored[key] === 'string' && restored[key].startsWith('data:') && orig[key]) {
            restored[key] = orig[key]; hasRestore = true
          }
        }
        if (hasRestore) submitFileData = restored
      }
      const workerProjectName = data.projectId ? projects.find((p: any) => p.id === data.projectId)?.name : null
      const processed = await processFileFields(submitFileData, [
        { field: 'idCardFront', ...FILE_CATEGORIES.MEMBER_ID_CARD, getFileName: () => `${data.name || '工人'}_身份证人像${guessFileExt(data.idCardFront)}` },
        { field: 'idCardBack', ...FILE_CATEGORIES.MEMBER_ID_CARD, getFileName: () => `${data.name || '工人'}_身份证国徽${guessFileExt(data.idCardBack)}` },
        { field: 'contractFile', ...FILE_CATEGORIES.MEMBER_CONTRACT, getFileName: () => `${data.name || '工人'}_劳动合同${guessFileExt(data.contractFile, data.contractFileType)}` },
        { field: 'safetyTrainingFile', ...FILE_CATEGORIES.MEMBER_TRAINING, getFileName: () => `${data.name || '工人'}_安全培训${guessFileExt(data.safetyTrainingFile || '')}` },
        { field: 'healthReportFile', ...FILE_CATEGORIES.MEMBER_HEALTH, getFileName: () => `${data.name || '工人'}_健康报告${guessFileExt(data.healthReportFile || '')}` },
        { field: 'specialCertificateFile', ...FILE_CATEGORIES.MEMBER_CERTIFICATE, getFileName: () => `${data.name || '工人'}_特种证${guessFileExt(data.specialCertificateFile || '')}` },
      ], workerProjectName)
      const submitData = { ...processed, memberType: 'worker' as const, status: 'active' as WorkerStatus }
      stripEmpties(submitData)
      if (editingWorker) {
        const result = await window.electronAPI.updateMember({ ...editingWorker, ...submitData })
        if (result.success) logUpdate('members', submitData.name, editingWorker.id, { before: editingWorker, after: submitData })
      } else {
        const result = await window.electronAPI.createMember(submitData)
        if (result.success && result.data) logCreate('members', submitData.name, result.data.id, submitData)
      }
      onSuccess()
      showToast(editingWorker ? '更新成功' : '创建成功', 'success')
    } catch (error: any) { showToast(error?.message || '保存失败', 'error') }
  }

  const handleWorkerTransfer = async (worker: Member, toTeamId: number, toProjectId: number, transferDate: string, reason: string, workerTeams: WorkerTeam[]) => {
    try {
      const toTeam = workerTeams.find((t: WorkerTeam) => t.id === toTeamId)
      if (!toTeam) { showToast('找不到目标班组', 'error'); return }
      await (window.electronAPI as any).createWorkerTransfer({ workerId: worker.id, fromTeamId: worker.teamId, toTeamId, fromProjectId: worker.projectId, toProjectId, transferDate, reason })
      await window.electronAPI.updateMember({ ...worker, teamId: toTeamId, projectId: toProjectId, status: 'active' })
      logUpdate('members', worker.name, worker.id, { action: 'transfer', toTeam: toTeam.name, reason })
      loadData(); showToast('调组成功', 'success')
    } catch (error) { showToast('调组失败', 'error') }
  }

  const handleWorkerLeave = async (worker: Member, actualLeaveDate: string, remarks: string) => {
    try {
      await window.electronAPI.updateMember({ ...worker, status: 'left', actualLeaveDate, remarks })
      logUpdate('members', worker.name, worker.id, { action: 'leave', leaveDate: actualLeaveDate, remarks })
      loadData(); showToast('工人已离场', 'success')
    } catch (error) { showToast('离场失败', 'error') }
  }

  const handleWorkerReEntry = async (worker: Member, teamId: number, projectId: number) => {
    try {
      await window.electronAPI.updateMember({ ...worker, teamId, projectId, status: 'active', entryDate: new Date().toISOString().split('T')[0], actualLeaveDate: undefined })
      logUpdate('members', worker.name, worker.id, { action: 'reentry' })
      loadData(); showToast('工人已重新入场', 'success')
    } catch (error) { showToast('重新入场失败', 'error') }
  }

  const handleStaffStatusChange = async (staff: Member, newStatus: string) => {
    try {
      if (newStatus === 'left') {
        const today = new Date().toISOString().split('T')[0]
        await window.electronAPI.updateMember({ ...staff, status: 'left', actualLeaveDate: today })
        logUpdate('members', staff.name, staff.id, { action: 'leave', leaveDate: today })
        showToast(`${staff.name} 已离职`, 'success')
      } else {
        await window.electronAPI.updateMember({ ...staff, status: 'active', actualLeaveDate: undefined, remarks: undefined })
        logUpdate('members', staff.name, staff.id, { action: 'reentry' })
        showToast(`${staff.name} 已恢复在职`, 'success')
      }
      loadData()
    } catch (error) { showToast('状态更新失败', 'error') }
  }

  return { handleDeleteMember, handleFileModified, handleSubmitStaff, handleSubmitWorker, handleWorkerTransfer, handleWorkerLeave, handleWorkerReEntry, handleStaffStatusChange }
}
