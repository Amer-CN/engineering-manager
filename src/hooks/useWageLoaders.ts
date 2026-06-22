import { useCallback } from 'react'
import type { Project, WorkerTeam, AttendanceRecord, WageRecord, OverdueStats } from '@/types'
import { getAPI } from '@/services/api-adapter'

type ProjectWorkerRow = { pwId: number; name: string; teamName: string; idCard: string }

export type ViewMode = 'dashboard' | 'cycle' | 'batch' | 'batch-confirm' | 'payment-records'

export function useWageLoaders(deps: {
  selectedProject: Project | null
  selectedMonth: string
  view: ViewMode
  workerTeams: WorkerTeam[]
  setLoading: (b: boolean) => void
  setProjects: (p: Project[]) => void
  setWorkerTeams: (t: WorkerTeam[]) => void
  setAttendances: (a: AttendanceRecord[]) => void
  setAllProjectAttendances: (a: AttendanceRecord[]) => void
  setWageRecords: (w: WageRecord[]) => void
  setAllWageRecords: (w: WageRecord[]) => void
  setProjectWorkerList: (l: ProjectWorkerRow[]) => void
  setWorkerPwIds: (ids: number[]) => void
  setOverdueStats: (s: OverdueStats) => void
}) {
  const {
    selectedProject, selectedMonth, view, workerTeams,
    setLoading, setProjects, setWorkerTeams, setAttendances,
    setAllProjectAttendances, setWageRecords, setAllWageRecords,
    setProjectWorkerList, setWorkerPwIds, setOverdueStats,
  } = deps

  const loadBaseData = useCallback(async () => {
    setLoading(true)
    try {
      const api = await getAPI()
      const [projectsRes, teamsRes] = await Promise.all([
        api.getProjects(),
        api.getWorkerTeams(),
      ])
      if (projectsRes.success && projectsRes.data) setProjects(projectsRes.data.filter((p: Project) => p.status !== 'archived'))
      if (teamsRes.success && teamsRes.data) setWorkerTeams(teamsRes.data)
    } catch (error) { console.error('加载基础数据失败:', error) }
    finally { setLoading(false) }
  }, [])

  const loadAttendances = useCallback(async () => {
    if (!selectedProject) return
    try {
      const result = await (await getAPI()).getAttendances(selectedProject.id, selectedMonth)
      if (result.success && result.data) setAttendances(result.data)
    } catch (error) { console.error('加载考勤失败:', error) }
  }, [selectedProject, selectedMonth])

  const loadAllProjectAttendances = useCallback(async () => {
    if (!selectedProject) return
    try {
      const result = await (await getAPI()).getAttendances(selectedProject.id, undefined)
      if (result.success && result.data) setAllProjectAttendances(result.data)
    } catch (error) { console.error('加载全部考勤失败:', error) }
  }, [selectedProject])

  const loadWages = useCallback(async () => {
    if (!selectedProject) return
    try {
      const result = await (await getAPI()).getWages(selectedProject.id, selectedMonth)
      if (result.success && result.data) setWageRecords(result.data)
    } catch (error) { console.error('加载工资数据失败:', error) }
  }, [selectedProject, selectedMonth])

  const loadAllRecords = useCallback(async () => {
    try {
      const projectId = view === 'cycle' ? selectedProject?.id : undefined
      const result = await (await getAPI()).getWages(projectId, undefined)
      if (result.success && result.data) setAllWageRecords(result.data)
    } catch (error) { console.error('加载工资记录失败:', error) }
  }, [selectedProject, view])

  const loadProjectWorkers = useCallback(async () => {
    if (!selectedProject) { setProjectWorkerList([]); setWorkerPwIds([]); return }
    const list: ProjectWorkerRow[] = []
    const pwIds: number[] = []
    try {
      const api = await getAPI()
      const [pwResult, workersResult] = await Promise.all([
        api.getProjectWorkers(selectedProject.id),
        api.getWorkers(),
      ])
      const idCardMap = new Map<number, string>()
      if (workersResult.success && workersResult.data) {
        for (const w of workersResult.data) idCardMap.set(w.id, w.idCard || '')
      }
      if (pwResult.success && pwResult.data) {
        for (const pw of pwResult.data) {
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

  const loadOverdueStats = useCallback(async () => {
    try {
      const result = await (await getAPI()).getWageOverdueStats()
      if (result.success && result.data) {
        setOverdueStats(result.data)
      }
    } catch (error) { console.error('加载欠薪统计失败:', error) }
  }, [])

  return {
    loadBaseData, loadAttendances, loadAllProjectAttendances,
    loadWages, loadAllRecords, loadProjectWorkers, loadOverdueStats,
  }
}
