import { useCallback } from 'react'
import type { WorkerTeam } from '@/types'
import { getAPI } from '@/services/api-adapter'
import type { ProjectWorkerItem } from './useWageManagementTypes'

export function useWageProjectWorkers(deps: {
  selectedProject: { id: number } | null
  workerTeams: WorkerTeam[]
  setProjectWorkerList: (l: ProjectWorkerItem[]) => void
  setWorkerPwIds: (ids: number[]) => void
}) {
  const { selectedProject, workerTeams, setProjectWorkerList, setWorkerPwIds } = deps

  const loadProjectWorkers = useCallback(async () => {
    if (!selectedProject) { setProjectWorkerList([]); setWorkerPwIds([]); return }
    const list: ProjectWorkerItem[] = []
    const pwIds: number[] = []
    try {
      const api = await getAPI()
      const [pwResult, workersResult] = await Promise.allSettled([api.getProjectWorkers(selectedProject.id), api.getWorkers()])
      const getVal = (r: PromiseSettledResult<any>) => r.status === 'fulfilled' && r.value?.success ? r.value.data || [] : []
      const pwData = getVal(pwResult)
      const workersData = getVal(workersResult)
      const idCardMap = new Map<number, string>()
      for (const w of workersData) idCardMap.set(w.id, w.idCard || '')
      if (pwData.length > 0) {
        for (const pw of pwData) {
          if (pw.status !== 'active') continue
          pwIds.push(pw.id)
          const teamName = workerTeams.find((t: WorkerTeam) => t.id === pw.teamId)?.name || '-'
          const idCard = idCardMap.get(pw.workerId) || ''
          list.push({ pwId: pw.id, name: pw.workerName || '', teamName, idCard })
        }
      }
    } catch (e) { console.error('获取项目工人失败:', e) }
    setProjectWorkerList(list)
    setWorkerPwIds(pwIds)
  }, [selectedProject, workerTeams])

  return { loadProjectWorkers }
}
