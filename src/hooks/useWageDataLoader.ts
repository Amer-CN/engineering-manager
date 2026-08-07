import { useCallback } from 'react'
import type { Project, WorkerTeam, WageRecord, WageStats } from '@/types'
import type { ViewMode } from './useWageManagementTypes'
import { getAPI } from '@/services/api-adapter'

export function useWageDataLoader(deps: {
  view: ViewMode
  selectedProject: Project | null
  selectedMonth: string
  setLoading: (b: boolean) => void
  setProjects: (p: Project[]) => void
  setWorkerTeams: (t: WorkerTeam[]) => void
  setAllWageRecords: (r: WageRecord[]) => void
  setWageStats: (s: WageStats | null) => void
}) {
  const { view, selectedProject, selectedMonth, setLoading, setProjects, setWorkerTeams, setAllWageRecords, setWageStats } = deps

  const loadBaseData = useCallback(async () => {
    setLoading(true)
    try {
      const api = await getAPI()
      const [projectsRes, teamsRes] = await Promise.allSettled([api.getProjects(), api.getWorkerTeams()])
      const get = (r: PromiseSettledResult<any>) => r.status === 'fulfilled' && r.value?.success ? r.value.data || [] : []
      setProjects(get(projectsRes).filter((p: Project) => p.status !== 'archived'))
      setWorkerTeams(get(teamsRes))
    } catch (error) { console.error('加载基础数据失败:', error) }
    finally { setLoading(false) }
  }, [])

  const loadAllRecords = useCallback(async () => {
    try {
      // cycle/batch 视图都按项目加载（批量回单候选基于项目工资行）
      const projectId = view === 'cycle' || view === 'batch' ? selectedProject?.id : undefined
      const result = await (await getAPI()).getWages(projectId, undefined)
      if (result.success && result.data) setAllWageRecords(result.data)
    } catch (error) { console.error('加载工资记录失败:', error) }
  }, [selectedProject, view])

  const loadStats = useCallback(async () => {
    try {
      const result = await (await getAPI()).getWageStats(selectedMonth)
      if (result.success && result.data) setWageStats(result.data)
    } catch (error) { console.error('加载统计数据失败:', error) }
  }, [selectedMonth])

  return { loadBaseData, loadAllRecords, loadStats }
}
