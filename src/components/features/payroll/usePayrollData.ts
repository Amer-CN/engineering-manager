/**
 * 统一考勤薪酬数据加载 Hook
 * staff 模式（人事管理）和 worker 模式（工人管理）共用
 *
 * staff 模式：全量加载（人员少，一次性加载没问题）
 * worker 模式：按项目按需加载（数据量大，不能一次全加载）
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { getAPI } from '@/services/api-adapter'

export type PayrollMode = 'staff' | 'worker'

export interface PayrollDataOptions {
  mode: PayrollMode
}

export interface PayrollData {
  loading: boolean
  selectedMonth: string
  setSelectedMonth: (m: string) => void
  projects: any[]
  departments: any[]
  workerTeams: any[]
  filterDept: number | ''
  setFilterDept: (d: number | '') => void
  filterProject: string
  setFilterProject: (p: string) => void
  filterName: string
  setFilterName: (n: string) => void
  // 人员/工人（worker 模式下是选中项目的人）
  people: any[]
  // 考勤
  attendances: any[]
  // 工资
  wages: any[]
  filteredWages: any[]
  // 统计
  summary: { totalNet: number; totalPaid: number; totalDiff: number }
  // 操作
  loadData: () => Promise<void>
  generating: boolean
  setGenerating: (v: boolean) => void
}

const now = new Date()
const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

export function usePayrollData({ mode }: PayrollDataOptions): PayrollData {
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth)
  const [generating, setGenerating] = useState(false)

  // 基础数据
  const [projects, setProjects] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [workerTeams, setWorkerTeams] = useState<any[]>([])

  // 筛选
  const [filterDept, setFilterDept] = useState<number | ''>('')
  const [filterProject, setFilterProject] = useState<string>('全部')
  const [filterName, setFilterName] = useState('')

  // 业务数据
  const [people, setPeople] = useState<any[]>([])
  const [attendances, setAttendances] = useState<any[]>([])
  const [wages, setWages] = useState<any[]>([])

  // ── 加载基础数据（项目/部门/班组） ──
  const loadBaseData = useCallback(async () => {
    try {
      const api = await getAPI()
      if (mode === 'staff') {
        const [memRes, deptRes, projRes] = await Promise.allSettled([
          api.getMembers(),
          api.getDepartments(),
          api.getProjects(),
        ])
        const get = (r: PromiseSettledResult<any>) => r.status === 'fulfilled' && r.value?.success ? r.value.data || [] : []
        const staffOnly = get(memRes).filter((m: any) => m.memberType === 'staff' || m.memberType === undefined)
        setPeople(staffOnly)
        setDepartments(get(deptRes))
        setProjects(get(projRes).filter((p: any) => p.status !== 'archived'))
      } else {
        const [projRes, teamsRes] = await Promise.allSettled([
          api.getProjects(),
          api.getWorkerTeams(),
        ])
        const get = (r: PromiseSettledResult<any>) => r.status === 'fulfilled' && r.value?.success ? r.value.data || [] : []
        setProjects(get(projRes).filter((p: any) => p.status !== 'archived'))
        setWorkerTeams(get(teamsRes))
      }
    } catch (e) {
      console.error('加载基础数据失败:', e)
    }
  }, [mode])

  // ── staff 模式：加载工资+考勤（全量） ──
  const loadStaffWages = useCallback(async () => {
    setLoading(true)
    try {
      const api = await getAPI()
      const [wageRes, attRes] = await Promise.allSettled([
        api.getWages(undefined, undefined),
        api.getAttendances(undefined, undefined),
      ])
      const get = (r: PromiseSettledResult<any>) => r.status === 'fulfilled' && r.value?.success ? r.value.data || [] : []
      const staffIds = new Set(people.map((m: any) => m.id))
      setWages(get(wageRes).filter((w: any) => staffIds.has(w.memberId)))
      setAttendances(get(attRes))
    } catch (e) { console.error('加载工资数据失败:', e) }
    finally { setLoading(false) }
  }, [people])

  // ── worker 模式：按项目加载工资+考勤 ──
  const loadProjectData = useCallback(async (projectId: number) => {
    setLoading(true)
    try {
      const api = await getAPI()
      const [pwRes, wageRes, attRes] = await Promise.allSettled([
        api.getProjectWorkers(projectId),
        api.getWages(projectId, undefined),
        api.getAttendances(projectId, undefined),
      ])
      const get = (r: PromiseSettledResult<any>) => r.status === 'fulfilled' && r.value?.success ? r.value.data || [] : []

      // 构建项目工人列表
      const pwData = get(pwRes)
      const allPw = pwData.map((pw: any) => ({
        id: pw.id, workerId: pw.workerId,
        name: pw.workerName || pw.worker?.name || '',
        idCard: pw.workerIdCard || pw.worker?.idCard || '',
        teamId: pw.teamId, teamName: pw.teamName || '',
        projectId: pw.projectId, projectName: pw.projectName || '',
        dailyWage: pw.dailyWage || pw.worker?.dailyWage || 0,
        workerType: pw.worker?.workerType || pw.workerType,
        entryDate: pw.entryDate, status: pw.status || 'active',
      }))
      setPeople(allPw)

      const pwIds = new Set(allPw.map((pw: any) => pw.id))
      setWages(get(wageRes).filter((w: any) => pwIds.has(w.projectWorkerId)))
      setAttendances(get(attRes))
    } catch (e) { console.error('加载项目数据失败:', e) }
    finally { setLoading(false) }
  }, [])

  // ── 初始化 ──
  useEffect(() => { loadBaseData() }, [loadBaseData])

  // ── staff 模式：基础数据加载后自动加载工资 ──
  useEffect(() => {
    if (mode === 'staff' && people.length > 0) loadStaffWages()
  }, [mode, people, loadStaffWages])

  // ── worker 模式：选中项目后加载数据 ──
  useEffect(() => {
    if (mode !== 'worker') return
    if (filterProject === '全部') {
      setPeople([]); setWages([]); setAttendances([])
      setLoading(false)
      return
    }
    loadProjectData(Number(filterProject))
  }, [mode, filterProject, loadProjectData])

  // ── 公开的 loadData 函数 ──
  const loadData = useCallback(async () => {
    if (mode === 'staff') {
      await loadStaffWages()
    } else if (filterProject !== '全部') {
      await loadProjectData(Number(filterProject))
    }
  }, [mode, filterProject, loadStaffWages, loadProjectData])

  // 客户端过滤工资（staff 模式用，worker 模式数据已按项目过滤）
  const filteredWages = useMemo(() => {
    if (mode === 'worker') {
      // worker 模式：数据已按项目加载，只需按月过滤
      const [year, month] = selectedMonth.split('-')
      return wages.filter((w: any) => {
        if (w.yearMonth?.slice(0, 4) !== year) return false
        if (w.yearMonth?.slice(5, 7) !== month) return false
        if (filterName && !(w.memberName || '').includes(filterName)) return false
        return true
      })
    }
    // staff 模式：按年月+部门+项目+姓名过滤
    const [year, month] = selectedMonth.split('-')
    return wages.filter((w: any) => {
      if (w.yearMonth?.slice(0, 4) !== year) return false
      if (w.yearMonth?.slice(5, 7) !== month) return false
      if (filterName && !(w.memberName || '').includes(filterName)) return false
      if (filterDept) {
        const p = people.find((m: any) => m.id === w.memberId)
        if (p && (p.departmentId ?? -1) !== filterDept) return false
      }
      if (filterProject !== '全部') {
        if (w.projectId != null && w.projectId !== Number(filterProject)) return false
      }
      return true
    })
  }, [wages, selectedMonth, filterName, filterDept, filterProject, mode, people])

  // 汇总统计
  const summary = useMemo(() => {
    const totalNet = filteredWages.reduce((s: number, w: any) => s + (w.actualWage || w.netSalary || 0), 0)
    const totalPaid = filteredWages.reduce((s: number, w: any) => s + (Number(w.paidAmount) || 0), 0)
    return { totalNet, totalPaid, totalDiff: totalNet - totalPaid }
  }, [filteredWages])

  return {
    loading, selectedMonth, setSelectedMonth,
    projects, departments, workerTeams,
    filterDept, setFilterDept, filterProject, setFilterProject,
    filterName, setFilterName,
    people, attendances, wages, filteredWages, summary,
    loadData, generating, setGenerating,
  }
}
