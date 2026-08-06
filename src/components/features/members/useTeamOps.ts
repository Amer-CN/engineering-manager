import type { WorkerTeam } from '../../../types/electron'
import { logCreate, logUpdate, logDelete } from '../../../utils/audit'
import { getAPI } from '@/services/api-adapter'
import { usePermission } from '@/hooks/usePermission'

interface TeamOpsOptions {
  workerTeams: WorkerTeam[]
  loadData: () => Promise<void>
  showToast: (msg: string, type: 'success' | 'error') => void
}

export function useTeamOps({ workerTeams, loadData, showToast }: TeamOpsOptions) {
  const { can } = usePermission()
  const handleCreateTeam = async (name: string, projectId: number, leaderId?: number | null) => {
    // G2 B5: 班组新建 → members:create
    if (!can('members:create')) { showToast('您没有新建班组的权限', 'error'); return }
    try {
      const result = await (await getAPI()).createWorkerTeam({ name, projectId, leaderId } as WorkerTeam)
      if (result.success && result.data) logCreate('members', `班组: ${name}`, result.data.id, { projectId, leaderId })
      loadData(); showToast('班组创建成功', 'success')
    } catch (error: any) { showToast(error.message || '班组创建失败', 'error') }
  }

  const handleUpdateTeam = async (team: WorkerTeam) => {
    // G2 B5: 班组编辑 → members:update
    if (!can('members:update')) { showToast('您没有编辑班组的权限', 'error'); return }
    try {
      await (await getAPI()).updateWorkerTeam(team)
      logUpdate('members', `班组: ${team.name}`, team.id)
      loadData(); showToast('班组更新成功', 'success')
    } catch (error: any) { showToast(error.message || '班组更新失败', 'error') }
  }

  const handleDeleteTeam = async (id: number) => {
    // G2 B5: 班组删除 → members:delete
    if (!can('members:delete')) { showToast('您没有删除班组的权限', 'error'); return }
    try {
      const teamToDelete = workerTeams.find(t => t.id === id)
      const result = await (await getAPI()).deleteWorkerTeam(id)
      if (!result.success) { showToast(result.error || '删除失败', 'error'); return }
      logDelete('members', teamToDelete?.name ? `班组: ${teamToDelete.name}` : '班组', id)
      loadData(); showToast('班组删除成功', 'success')
    } catch (error: any) { showToast(error.message || '班组删除失败', 'error') }
  }

  return { handleCreateTeam, handleUpdateTeam, handleDeleteTeam }
}
