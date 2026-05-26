import type { Member, WorkerStatus } from '../../../types/electron'
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

  const handleSubmitStaff = async (data: StaffFormData | WorkerFormData) => {
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
        if (result.success) {
          logUpdate('members', submitData.name, editingStaff.id, { before: editingStaff, after: submitData })
          onSuccess()
          showToast('更新成功', 'success')
        } else {
          showToast(result.error || '更新失败', 'error')
          return
        }
      } else {
        // Create Worker in global pool, then ProjectWorker
        try {
          const d = data as any
          const workerRes = await window.electronAPI.createWorker({
            name: data.name,
            idCard: data.idCard,
            gender: data.gender,
            birthDate: data.birthDate,
            ethnicity: data.ethnicity,
            phone: data.phone,
            address: data.idCardAddress,
            bankAccount: d.wageBankAccount,
            bankName: d.wageBankName
          })
          if (!workerRes.success || !workerRes.data) {
            showToast(workerRes.error || '创建工人失败', 'error')
            return
          }
          const workerId = workerRes.data.id
          const pwRes = await window.electronAPI.createProjectWorker({
            workerId,
            projectId: d.projectId || 0,
            teamId: d.teamId,
            dailyWage: Number(d.dailyWage) || 0,
            workerType: d.workerType || 'other',
            entryDate: data.entryDate || new Date().toISOString().split('T')[0],
            status: 'active' as WorkerStatus
          })
          if (pwRes.success) {
            logCreate('workers', data.name, workerId, data)
            onSuccess()
            showToast('创建成功', 'success')
          } else {
            showToast(pwRes.error || '创建用工关系失败', 'error')
          }
        } catch (err: any) {
          showToast(err?.message || '创建失败', 'error')
        }
      }
    } catch (error: any) { showToast(error?.message || '保存失败', 'error') }
  }

  const handleSubmitWorker = async (data: StaffFormData | WorkerFormData) => {
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
      const processed = await processFileFields(submitFileData as any, [
        { field: 'idCardFront', ...FILE_CATEGORIES.MEMBER_ID_CARD, getFileName: () => `${data.name || '工人'}_身份证人像${guessFileExt(data.idCardFront)}` },
        { field: 'idCardBack', ...FILE_CATEGORIES.MEMBER_ID_CARD, getFileName: () => `${data.name || '工人'}_身份证国徽${guessFileExt(data.idCardBack)}` },
        { field: 'safetyTrainingFile', ...FILE_CATEGORIES.MEMBER_TRAINING, getFileName: () => `${data.name || '工人'}_安全培训${guessFileExt((data as any).safetyTrainingFile)}` },
        { field: 'healthReportFile', ...FILE_CATEGORIES.MEMBER_HEALTH, getFileName: () => `${data.name || '工人'}_体检报告${guessFileExt((data as any).healthReportFile)}` },
        { field: 'specialCertificateFile', ...FILE_CATEGORIES.MEMBER_CERTIFICATE, getFileName: () => `${data.name || '工人'}_特种证${guessFileExt((data as any).specialCertificateFile)}` },
      ], null)
      const d = data as any
      const submitData = {
        ...processed,
        name: data.name,
        idCard: data.idCard,
        gender: data.gender,
        birthDate: data.birthDate,
        ethnicity: data.ethnicity,
        phone: data.phone,
        address: data.idCardAddress,
        bankAccount: d.wageBankAccount,
        bankName: d.wageBankName,
        dailyWage: Number(d.dailyWage) || 0,
        workerType: d.workerType || 'other',
        memberType: 'worker' as const,
      }
      stripEmpties(submitData)
      if (editingWorker) {
        const result = await window.electronAPI.updateMember({ ...editingWorker, ...submitData })
        if (result.success) {
          logUpdate('members', submitData.name, editingWorker.id, { before: editingWorker, after: submitData })
          onSuccess()
          showToast('更新成功', 'success')
        } else {
          showToast(result.error || '更新失败', 'error')
        }
      } else {
        const workerRes = await window.electronAPI.createWorker({
          name: data.name, idCard: data.idCard, gender: data.gender, birthDate: data.birthDate,
          ethnicity: data.ethnicity, phone: data.phone, address: data.idCardAddress,
          bankAccount: d.wageBankAccount, bankName: d.wageBankName
        })
        if (!workerRes.success || !workerRes.data) {
          showToast(workerRes.error || '创建工人失败', 'error'); return
        }
        const pwRes = await window.electronAPI.createProjectWorker({
          workerId: workerRes.data.id, projectId: d.projectId || 0, teamId: d.teamId,
          dailyWage: Number(d.dailyWage) || 0, workerType: d.workerType || 'other',
          entryDate: data.entryDate || new Date().toISOString().split('T')[0], status: 'active' as WorkerStatus
        })
        if (pwRes.success) {
          logCreate('workers', data.name, workerRes.data.id, data)
          onSuccess()
          showToast('创建成功', 'success')
        } else {
          showToast(pwRes.error || '创建用工关系失败', 'error')
        }
      }
    } catch (err: any) { showToast(err?.message || '保存失败', 'error') }
  }

  return {
    handleDeleteMember,
    handleSubmitStaff,
    handleSubmitWorker,
    handleFileModified,
  }
}
