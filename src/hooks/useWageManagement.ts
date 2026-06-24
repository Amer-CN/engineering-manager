import { useState, useEffect, useCallback } from 'react'

import type { Project, WorkerTeam, AttendanceRecord, WageRecord, WageStats } from '@/types'
import { getAPI } from '@/services/api-adapter'
import { useBankReceipt } from '../components/features/wages/useBankReceipt'
import { useWageAttendance } from './useWageAttendance'
import { useWageTable } from './useWageTable'

type ViewMode = 'dashboard' | 'cycle'

export interface ProjectWorkerItem {
  pwId: number
  name: string
  teamName: string
  idCard: string
}

interface UseWageManagementOptions {
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void
  confirm: (opts: { title: string; content: string; confirmVariant: 'primary' | 'danger' }) => Promise<boolean>
}

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
      const projectId = view === 'cycle' ? selectedProject?.id : undefined
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
  useEffect(() => { loadProjectWorkers() }, [loadProjectWorkers])

  // ── 工资发放操作 ──

  const handleBatchDeleteWages = async () => {
    if (selectedWageIds.size === 0) return
    const ok = await confirm({ title: '确认清除', content: `确认清除选中的 ${selectedWageIds.size} 条发放记录吗？（不会删除工资记录本身）`, confirmVariant: 'danger' })
    if (!ok) return
    try {
      const result = await (await getAPI()).batchClearPayments(Array.from(selectedWageIds))
      if (result.success) {
        showToast(`已清除 ${result.data?.cleared ?? selectedWageIds.size} 条发放记录`, 'success')
        setSelectedWageIds(new Set())
        setPaymentEdits(prev => { const next = new Map(prev); for (const id of selectedWageIds) next.delete(id); return next })
        await loadAllRecords()
      } else showToast(result.error || '清除失败', 'error')
    } catch (error: any) { showToast(error?.message || '清除失败', 'error') }
  }

  const handleBatchArchivePayments = async () => {
    const toArchive = selectedWageIds.size > 0 ? Array.from(selectedWageIds) : allWageRecords.filter(w => !w.paymentLocked).map(w => w.id)
    if (toArchive.length === 0) { showToast('没有可归档的记录', 'info'); return }
    const prompt = selectedWageIds.size > 0
      ? `确认归档选中的 ${selectedWageIds.size} 条发放记录吗？归档后实发金额与日期将不能修改。`
      : `确认归档该项目当前月份全部 ${toArchive.length} 条发放记录吗？`
    const ok = await confirm({ title: '确认归档', content: prompt, confirmVariant: 'primary' })
    if (!ok) return
    try {
      const result = await (await getAPI()).batchArchivePayments(toArchive)
      if (result.success && result.data) {
        showToast(`已归档 ${result.data?.archived ?? toArchive.length} 条发放记录`, 'success')
        setSelectedWageIds(new Set()); await loadAllRecords(); setPaymentEdits(new Map())
      } else showToast(result.error || '归档失败', 'error')
    } catch (error: any) { showToast(error?.message || '归档失败', 'error') }
  }

  const handlePaymentChange = (recordId: number, field: 'paidAmount' | 'paidDate', value: string | number) => {
    setPaymentEdits(prev => {
      const next = new Map(prev)
      const record = allWageRecords.find(w => w.id === recordId)
      const current = next.get(recordId) || { paidAmount: record?.paidAmount != null ? String(record.paidAmount) : '', paidDate: record?.paidDate ?? '', bankReceiptPath: record?.bankReceiptPath }
      next.set(recordId, { ...current, [field]: value })
      return next
    })
  }

  const handleSavePayments = async () => {
    if (paymentEdits.size === 0) { showToast('没有需要保存的修改', 'info'); return }
    setLoading(true)
    try {
      const updated = allWageRecords.map(w => {
        const edit = paymentEdits.get(w.id)
        if (!edit) return w
        return { ...w, paidAmount: parseFloat(edit.paidAmount) || 0, paidDate: edit.paidDate, bankReceiptPath: edit.bankReceiptPath ?? w.bankReceiptPath, updatedAt: new Date().toISOString() }
      })
      const result = await (await getAPI()).batchSaveWages(updated)
      if (result.success) { showToast('发放记录已保存', 'success'); setPaymentEdits(new Map()); await loadAllRecords(); await loadStats() }
      else showToast(result.error || '保存失败', 'error')
    } catch (error: any) { showToast(error?.message || '保存失败', 'error') }
    finally { setLoading(false) }
  }

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
