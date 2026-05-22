/**
 * 工资管理模块 — 自定义 Hook
 * 只管理状态 + 数据加载，处理函数由组件自行定义
 */
import { useState, useEffect, useCallback } from 'react'
import type { Project, WorkerTeam, AttendanceRecord, WageRecord, OverdueStats } from '@/types'

export type ViewMode = 'dashboard' | 'cycle' | 'batch' | 'batch-confirm' | 'payment-records'

export function useWageManagement() {
  // ── 基础数据 ──
  const [projects, setProjects] = useState<Project[]>([])
  const [workerTeams, setWorkerTeams] = useState<WorkerTeam[]>([])

  // ── UI 状态 ──
  const [view, setView] = useState<ViewMode>('dashboard')
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [loading, setLoading] = useState(false)

  // ── 考勤数据 ──
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([])
  const [allProjectAttendances, setAllProjectAttendances] = useState<AttendanceRecord[]>([])
  const [attendanceDetailRecord, setAttendanceDetailRecord] = useState<AttendanceRecord | null>(null)

  // ── 工资表数据 ──
  const [wageRecords, setWageRecords] = useState<WageRecord[]>([])

  // ── 工资发放编辑 ──
  const [paymentEdits, setPaymentEdits] = useState<Map<number, { paidAmount: string; paidDate: string; bankReceiptPath?: string }>>(new Map())

  // ── 记录和统计 ──
  const [allWageRecords, setAllWageRecords] = useState<WageRecord[]>([])

  // ── 批量选中 ──
  const [selectedAttendanceIds, setSelectedAttendanceIds] = useState<Set<number>>(new Set())
  const [selectedWageIds, setSelectedWageIds] = useState<Set<number>>(new Set())

  // ── 项目工人数据 ──
  const [projectWorkerList, setProjectWorkerList] = useState<{ pwId: number; name: string; teamName: string; idCard: string }[]>([])
  const [workerPwIds, setWorkerPwIds] = useState<number[]>([])

  // ── 项目和欠薪统计 ──
  const [overdueStats, setOverdueStats] = useState<OverdueStats | null>(null)

  // ── 数据加载 ──
  const loadBaseData = useCallback(async () => {
    setLoading(true)
    try {
      const [projectsRes, teamsRes] = await Promise.all([
        window.electronAPI.getProjects(),
        window.electronAPI.getWorkerTeams(),
      ])
      if (projectsRes.success && projectsRes.data) setProjects(projectsRes.data.filter((p: Project) => p.status !== 'archived'))
      if (teamsRes.success && teamsRes.data) setWorkerTeams(teamsRes.data)
    } catch (error) { console.error('加载基础数据失败:', error) }
    finally { setLoading(false) }
  }, [])

  const loadAttendances = useCallback(async () => {
    if (!selectedProject) return
    try {
      const result = await window.electronAPI.getAttendances(selectedProject.id, selectedMonth)
      if (result.success && result.data) setAttendances(result.data)
    } catch (error) { console.error('加载考勤失败:', error) }
  }, [selectedProject, selectedMonth])

  const loadAllProjectAttendances = useCallback(async () => {
    if (!selectedProject) return
    try {
      const result = await window.electronAPI.getAttendances(selectedProject.id, undefined)
      if (result.success && result.data) setAllProjectAttendances(result.data)
    } catch (error) { console.error('加载全部考勤失败:', error) }
  }, [selectedProject])

  const loadWages = useCallback(async () => {
    if (!selectedProject) return
    try {
      const result = await window.electronAPI.getWages(selectedProject.id, selectedMonth)
      if (result.success && result.data) setWageRecords(result.data)
    } catch (error) { console.error('加载工资数据失败:', error) }
  }, [selectedProject, selectedMonth])

  const loadAllRecords = useCallback(async () => {
    try {
      const projectId = view === 'cycle' ? selectedProject?.id : undefined
      const result = await window.electronAPI.getWages(projectId, undefined)
      if (result.success && result.data) setAllWageRecords(result.data)
    } catch (error) { console.error('加载工资记录失败:', error) }
  }, [selectedProject, view])

  const loadProjectWorkers = useCallback(async () => {
    if (!selectedProject) { setProjectWorkerList([]); setWorkerPwIds([]); return }
    const list: { pwId: number; name: string; teamName: string; idCard: string }[] = []
    const pwIds: number[] = []
    try {
      const [pwResult, workersResult] = await Promise.all([
        window.electronAPI.getProjectWorkers(selectedProject.id),
        window.electronAPI.getWorkers(),
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

  // ── 欠薪统计加载 ──
  const loadOverdueStats = useCallback(async () => {
    try {
      const result = await window.electronAPI.getWageOverdueStats()
      if (result.success && result.data) {
        setOverdueStats(result.data)
      }
    } catch (error) { console.error('加载欠薪统计失败:', error) }
  }, [])

  // ── useEffect ──
  useEffect(() => { loadBaseData() }, [loadBaseData])
  useEffect(() => { loadAttendances() }, [loadAttendances])
  useEffect(() => { loadWages() }, [loadWages])
  useEffect(() => { loadAllRecords() }, [loadAllRecords])
  useEffect(() => { loadProjectWorkers() }, [loadProjectWorkers])
  useEffect(() => { if (selectedProject) loadAllProjectAttendances() }, [selectedProject, loadAllProjectAttendances])
  useEffect(() => { loadOverdueStats() }, [loadOverdueStats])

  return {
    // 状态
    projects, workerTeams,
    view, setView,
    selectedProject, setSelectedProject,
    selectedMonth, setSelectedMonth,
    loading, setLoading,
    attendances, setAttendances,
    allProjectAttendances, setAllProjectAttendances,
    attendanceDetailRecord, setAttendanceDetailRecord,
    wageRecords, setWageRecords,
    paymentEdits, setPaymentEdits,
    allWageRecords, setAllWageRecords,
    selectedAttendanceIds, setSelectedAttendanceIds,
    selectedWageIds, setSelectedWageIds,
    projectWorkerList, setProjectWorkerList,
    workerPwIds, setWorkerPwIds,
    overdueStats, setOverdueStats,
    // 加载函数（供组件调用刷新）
    loadAttendances, loadAllProjectAttendances, loadWages, loadAllRecords,
    loadOverdueStats,
  }
}
