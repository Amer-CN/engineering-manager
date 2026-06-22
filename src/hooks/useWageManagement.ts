import { useState, useEffect } from 'react'
import type { Project, WorkerTeam, AttendanceRecord, WageRecord, OverdueStats } from '@/types'
import { useWageLoaders } from './useWageLoaders'
import type { ViewMode } from './useWageLoaders'
export type { ViewMode }

export function useWageManagement() {
  const [projects, setProjects] = useState<Project[]>([])
  const [workerTeams, setWorkerTeams] = useState<WorkerTeam[]>([])
  const [view, setView] = useState<ViewMode>('dashboard')
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [loading, setLoading] = useState(false)
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([])
  const [allProjectAttendances, setAllProjectAttendances] = useState<AttendanceRecord[]>([])
  const [attendanceDetailRecord, setAttendanceDetailRecord] = useState<AttendanceRecord | null>(null)
  const [wageRecords, setWageRecords] = useState<WageRecord[]>([])
  const [paymentEdits, setPaymentEdits] = useState<Map<number, { paidAmount: string; paidDate: string; bankReceiptPath?: string }>>(new Map())
  const [allWageRecords, setAllWageRecords] = useState<WageRecord[]>([])
  const [selectedAttendanceIds, setSelectedAttendanceIds] = useState<Set<number>>(new Set())
  const [selectedWageIds, setSelectedWageIds] = useState<Set<number>>(new Set())
  const [projectWorkerList, setProjectWorkerList] = useState<{ pwId: number; name: string; teamName: string; idCard: string }[]>([])
  const [workerPwIds, setWorkerPwIds] = useState<number[]>([])
  const [overdueStats, setOverdueStats] = useState<OverdueStats | null>(null)

  const { loadBaseData, loadAttendances, loadAllProjectAttendances, loadWages, loadAllRecords, loadProjectWorkers, loadOverdueStats } = useWageLoaders({
    selectedProject, selectedMonth, view, workerTeams,
    setLoading, setProjects, setWorkerTeams, setAttendances,
    setAllProjectAttendances, setWageRecords, setAllWageRecords,
    setProjectWorkerList, setWorkerPwIds, setOverdueStats,
  })

  useEffect(() => { loadBaseData() }, [loadBaseData])
  useEffect(() => { loadAttendances() }, [loadAttendances])
  useEffect(() => { loadWages() }, [loadWages])
  useEffect(() => { loadAllRecords() }, [loadAllRecords])
  useEffect(() => { loadProjectWorkers() }, [loadProjectWorkers])
  useEffect(() => { if (selectedProject) loadAllProjectAttendances() }, [selectedProject, loadAllProjectAttendances])
  useEffect(() => { loadOverdueStats() }, [loadOverdueStats])

  return {
    projects, workerTeams, view, setView,
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
    loadAttendances, loadAllProjectAttendances, loadWages, loadAllRecords,
    loadOverdueStats,
  }
}
