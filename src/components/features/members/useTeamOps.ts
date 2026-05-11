import type { WorkerTeam } from '../../../types/electron'
import { logCreate, logUpdate, logDelete } from '../../../utils/audit'

interface TeamOpsOptions {
  workerTeams: WorkerTeam[]
  loadData: () => Promise<void>
  showToast: (msg: string, type: 'success' | 'error') => void
}

export function useTeamOps({ workerTeams, loadData, showToast }: TeamOpsOptions) {
  const handleCreateTeam = async (name: string, projectId: number, leaderId?: number | null) => {
    try {
      const result = await window.electronAPI.createWorkerTeam({ name, projectId, leaderId } as WorkerTeam)
      if (result.success && result.data) logCreate('members', `班组: ${name}`, result.data.id, { projectId, leaderId })
      loadData(); showToast('班组创建成功', 'success')
    } catch (error: any) { showToast(error.message || '班组创建失败', 'error') }
  }

  const handleUpdateTeam = async (team: WorkerTeam) => {
    try {
      await window.electronAPI.updateWorkerTeam(team)
      logUpdate('members', `班组: ${team.name}`, team.id)
      loadData(); showToast('班组更新成功', 'success')
    } catch (error: any) { showToast(error.message || '班组更新失败', 'error') }
  }

  const handleDeleteTeam = async (id: number) => {
    try {
      const teamToDelete = workerTeams.find(t => t.id === id)
      const result = await window.electronAPI.deleteWorkerTeam(id)
      if (!result.success) { showToast(result.error || '删除失败', 'error'); return }
      logDelete('members', teamToDelete?.name ? `班组: ${teamToDelete.name}` : '班组', id)
      loadData(); showToast('班组删除成功', 'success')
    } catch (error: any) { showToast(error.message || '班组删除失败', 'error') }
  }

  return { handleCreateTeam, handleUpdateTeam, handleDeleteTeam }
}
