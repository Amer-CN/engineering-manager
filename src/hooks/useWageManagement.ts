import { useState, useEffect } from 'react'

import type { Project, WorkerTeam, AttendanceRecord, WageRecord, WageStats } from '@/types'
import { getAPI } from '@/services/api-adapter'
import { useBankReceipt } from '../components/features/wages/useBankReceipt'
import { useWageAttendance } from './useWageAttendance'
import { useWageTable } from './useWageTable'
import type { ViewMode, ProjectWorkerItem, UseWageManagementOptions } from './useWageManagementTypes'
import { useWageDataLoader } from './useWageDataLoader'
import { useWagePaymentOps } from './useWagePaymentOps'
import { useWageProjectWorkers } from './useWageProjectWorkers'

export type { ViewMode, ProjectWorkerItem, UseWageManagementOptions }

export default function useWageManagement({ showToast, confirm }: UseWageManagementOptions) {
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
  const [attendanceDetailRecord, setAttendanceDetailRecord] = useState<AttendanceRecord | null>(null)
  const [wageRecords, setWageRecords] = useState<WageRecord[]>([])
  const [editingWages, setEditingWages] = useState<Map<number, { bonus: number; deduction: number }>>(new Map())
  const [paymentEdits, setPaymentEdits] = useState<Map<number, { paidAmount: string; paidDate: string; bankReceiptPath?: string }>>(new Map())
  const [allWageRecords, setAllWageRecords] = useState<WageRecord[]>([])
  const [wageStats, setWageStats] = useState<WageStats | null>(null)
  const [filterMemberName, setFilterMemberName] = useState('')
  const [selectedAttendanceIds, setSelectedAttendanceIds] = useState<Set<number>>(new Set())
  const [selectedWageTableIds, setSelectedWageTableIds] = useState<Set<number>>(new Set())
  const [selectedWageIds, setSelectedWageIds] = useState<Set<number>>(new Set())
  const [projectWorkerList, setProjectWorkerList] = useState<ProjectWorkerItem[]>([])
  const [workerPwIds, setWorkerPwIds] = useState<number[]>([])

  // ── 数据加载 ──
  const { loadBaseData, loadAllRecords, loadStats } = useWageDataLoader({
    view, selectedProject, selectedMonth, setLoading, setProjects, setWorkerTeams, setAllWageRecords, setWageStats })
  useEffect(() => { loadBaseData() }, [loadBaseData])
  useEffect(() => { loadAllRecords() }, [loadAllRecords])
  useEffect(() => { loadStats() }, [loadStats])

  // ── 考勤操作 ──
  const { loadAttendances, handleGenerateAttendance, handleDeleteAttendance } =
    useWageAttendance({ selectedProject, selectedMonth, workerPwIds, setAttendances, setLoading, showToast, confirm })
  useEffect(() => { loadAttendances() }, [loadAttendances])

  const handleBatchDeleteAttendances = async () => {
    if (selectedAttendanceIds.size === 0) return
    const ok = await confirm({ title: '确认删除', content: `确认删除选中的 ${selectedAttendanceIds.size} 条考勤记录吗？`, confirmVariant: 'danger' })
    if (!ok) return
    try {
      const result = await (await getAPI()).batchDeleteAttendances(Array.from(selectedAttendanceIds))
      if (result.success) { showToast(`已删除 ${selectedAttendanceIds.size} 条考勤记录`, 'success'); setSelectedAttendanceIds(new Set()); await loadAttendances() }
      else showToast(result.error || '批量删除失败', 'error')
    } catch (error: any) { showToast(error?.message || '批量删除失败', 'error') }
  }

  // ── 工资表操作 ──
  const { loadWages, handleGenerateWages, handleWageBonusDeductionChange, handleSaveWages } =
    useWageTable({ selectedProject, selectedMonth, wageRecords, editingWages, setWageRecords, setEditingWages, setLoading, showToast, loadAllRecords, loadStats })
  useEffect(() => { loadWages() }, [loadWages])

  const handleBatchDeleteWageTable = async () => {
    if (selectedWageTableIds.size === 0) return
    const ok = await confirm({ title: '确认删除', content: `确认删除选中的 ${selectedWageTableIds.size} 条工资记录吗？`, confirmVariant: 'danger' })
    if (!ok) return
    try {
      const result = await (await getAPI()).batchDeleteWages(Array.from(selectedWageTableIds))
      if (result.success) { showToast(`已删除 ${selectedWageTableIds.size} 条工资记录`, 'success'); setSelectedWageTableIds(new Set()); await loadWages() }
      else showToast(result.error || '批量删除失败', 'error')
    } catch (error: any) { showToast(error?.message || '批量删除失败', 'error') }
  }

  // ── 项目工人 ──
  const { loadProjectWorkers } = useWageProjectWorkers({
    selectedProject, workerTeams, setProjectWorkerList, setWorkerPwIds })
  useEffect(() => { loadProjectWorkers() }, [loadProjectWorkers])

  // ── 工资发放操作 ──
  const { handleBatchDeleteWages, handleBatchArchivePayments, handlePaymentChange, handleSavePayments } =
    useWagePaymentOps({ allWageRecords, paymentEdits, setPaymentEdits, selectedWageIds, setSelectedWageIds, setLoading, showToast, confirm, loadAllRecords, loadStats })

  const { receiptParsing, receiptResult, handleBankReceiptUpload } = useBankReceipt({ allWageRecords, selectedProject, paymentEdits, setPaymentEdits, showToast })

  // ── 选中切换 ──
  const toggleAttendanceSelect = (id: number) => setSelectedAttendanceIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next })
  const toggleAllAttendances = () => setSelectedAttendanceIds(prev => prev.size === attendances.length ? new Set() : new Set(attendances.map(a => a.id)))
  const toggleWageTableSelect = (id: number) => setSelectedWageTableIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next })
  const toggleAllWageTable = () => setSelectedWageTableIds(prev => prev.size === wageRecords.length ? new Set() : new Set(wageRecords.map(w => w.id)))
  const toggleWageSelect = (id: number) => setSelectedWageIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next })
  const toggleAllWages = () => {
    const filtered = allWageRecords.filter(w => !filterMemberName || (w.memberName || '').includes(filterMemberName))
    setSelectedWageIds(prev => prev.size === filtered.length ? new Set() : new Set(filtered.map(w => w.id)))
  }

  return {
    projects, workerTeams,
    view, setView, selectedProject, setSelectedProject,
    selectedMonth, setSelectedMonth, loading, setLoading,
    attendances, attendanceDetailRecord, setAttendanceDetailRecord,
    wageRecords, editingWages, paymentEdits,
    allWageRecords, wageStats, filterMemberName, setFilterMemberName,
    selectedAttendanceIds, selectedWageTableIds, selectedWageIds,
    projectWorkerList, workerPwIds,
    handleGenerateAttendance, handleDeleteAttendance,
    handleGenerateWages, handleWageBonusDeductionChange, handleSaveWages,
    handleBatchDeleteAttendances, handleBatchDeleteWageTable,
    handleBatchDeleteWages, handleBatchArchivePayments,
    handlePaymentChange, handleSavePayments,
    toggleAttendanceSelect, toggleAllAttendances,
    toggleWageTableSelect, toggleAllWageTable,
    toggleWageSelect, toggleAllWages,
    receiptParsing, receiptResult, handleBankReceiptUpload,
    loadAttendances, loadWages, loadAllRecords, loadStats,
  }
}
