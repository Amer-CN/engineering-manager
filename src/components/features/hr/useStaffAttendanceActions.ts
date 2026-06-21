import { useCallback } from 'react'
import { useToastStore } from '@/store/toastStore'
import { logCreate, logDelete } from '../../../utils/audit'
import { computeAttendanceSummary } from '../../../constants/attendance'
import { getAPI } from '@/services/api-adapter'
import { getDaysInMonth, formatMonthLabel } from './staffAttendanceUtils'
import type { AttendanceRecord } from '../../../types/electron'

interface UseStaffAttendanceActionsParams {
  filteredStaff: any[]
  selectedIds: Set<number>
  setSelectedIds: (fn: (prev: Set<number>) => Set<number>) => void
  currentMonthAttendances: any[]
  daysInMonth: number
  yearMonth: string
  allAttendances: any[]
  staff: any[]
  loadData: () => Promise<void>
  getAttendanceForMember: (id: number) => any
  getAttendanceForMemberMonth: (id: number, ym: string) => any
  getEntryDate: (s: any) => string | null
  departments: any[]
  setDetailRecord: (r: AttendanceRecord | null) => void
  setDetailMember: (m: any | null) => void
  setDetailYearMonth: (ym: string) => void
  confirm: (opts: any) => Promise<boolean>
}

export function useStaffAttendanceActions(params: UseStaffAttendanceActionsParams) {
  const showToast = useToastStore(state => state.showToast)
  const {
    filteredStaff, selectedIds, setSelectedIds, currentMonthAttendances,
    daysInMonth, yearMonth, allAttendances, staff, loadData,
    getAttendanceForMember, getAttendanceForMemberMonth, getEntryDate,
    departments, setDetailRecord, setDetailMember, setDetailYearMonth,
    confirm,
  } = params

  const handleGenerateDefaults = useCallback(async () => {
    if (filteredStaff.length === 0) { showToast('没有可生成考勤的人员', 'info'); return }
    try {
      let created = 0
      for (const memberId of filteredStaff.map(s => s.id)) {
        if (currentMonthAttendances.some((a: any) => a.memberId === memberId)) continue
        const dailyStatus: Record<number, string> = {}
        for (let d = 1; d <= daysInMonth; d++) dailyStatus[d] = 'work'
        await (await getAPI()).createAttendance({ memberId, yearMonth, dailyStatus, createdAt: new Date().toISOString() } as any)
        created++
      }
      await loadData()
      showToast(created > 0 ? `已为 ${created} 人生成考勤（默认全部出勤）` : '所有人员已有考勤记录', created > 0 ? 'success' : 'info')
      if (created > 0) logCreate('attendances', `${yearMonth} 员工考勤`, 0, { members: filteredStaff.length, created })
    } catch (e: any) { showToast(e?.message || '生成失败', 'error') }
  }, [filteredStaff, currentMonthAttendances, daysInMonth, yearMonth, loadData, showToast])

  const handleDelete = useCallback(async (record: any) => {
    const ok = await confirm({ title: '确认删除', content: `确定删除 ${record.memberName || '该员工'} ${formatMonthLabel(record.yearMonth || '')} 的考勤记录吗？此操作不可撤销。`, confirmVariant: 'danger' })
    if (!ok) return
    try {
      const result = await (await getAPI()).deleteAttendance(record.id)
      if (result.success) { showToast('已删除', 'success'); loadData(); logDelete('attendances', record.memberName || '考勤', record.id, {}) }
      else showToast(result.error || '删除失败', 'error')
    } catch (e: any) { showToast(e?.message || '删除失败', 'error') }
  }, [confirm, loadData, showToast])

  const handleBatchDelete = useCallback(async () => {
    if (selectedIds.size === 0) return
    const ok = await confirm({ title: '确认删除', content: `确认删除选中的 ${selectedIds.size} 条考勤记录吗？此操作不可撤销。`, confirmVariant: 'danger' })
    if (!ok) return
    try {
      const result = await (await getAPI()).batchDeleteAttendances(Array.from(selectedIds))
      if (result.success) { showToast(`已删除 ${selectedIds.size} 条`, 'success'); setSelectedIds(() => new Set()); loadData(); logDelete('attendances', `${selectedIds.size} 条考勤`, 0, {}) }
      else showToast(result.error || '批量删除失败', 'error')
    } catch (e: any) { showToast(e?.message || '批量删除失败', 'error') }
  }, [selectedIds, confirm, setSelectedIds, loadData, showToast])

  const hasAttendance = useCallback((memberId: number): boolean => {
    const att = getAttendanceForMember(memberId)
    return !!(att && att.dailyStatus && Object.keys(att.dailyStatus).length > 0)
  }, [getAttendanceForMember])

  const handleExport = useCallback(async () => {
    try {
      const XLSX = await import('xlsx')
      const rows = filteredStaff.map(s => {
        const att = getAttendanceForMember(s.id)
        const ed = getEntryDate(s)
        const entryDay = (() => { if (!ed) return 1; const [ey, em, ed2] = ed.split('-').map(Number); const [cy, cm] = yearMonth.split('-').map(Number); return (ey === cy && em === cm) ? ed2 : 1 })()
        const s2 = computeAttendanceSummary(att?.dailyStatus, daysInMonth, entryDay)
        const dept = departments.find((d: any) => d.id === s.departmentId)
        return { '姓名': s.name, '部门': dept?.name || '', '职位': s.position || '', '出勤': s2.counts.work, '法定假': s2.counts.holiday, '病假': s2.counts.sick_leave, '事假': s2.counts.personal_leave, '状态': hasAttendance(s.id) ? (s2.daysOff <= 4 ? '全勤' : '缺勤') : '无考勤' }
      })
      const wb = XLSX.utils.book_new(); wb.SheetNames.push('考勤汇总'); wb.Sheets['考勤汇总'] = XLSX.utils.json_to_sheet(rows)
      XLSX.writeFile(wb, `考勤汇总_${yearMonth}.xlsx`)
      showToast('导出成功', 'success')
    } catch (e: any) { showToast(e?.message || '导出失败', 'error') }
  }, [filteredStaff, getAttendanceForMember, daysInMonth, yearMonth, getEntryDate, departments, hasAttendance, showToast])

  const openHistoryMonth = useCallback(async (memberId: number, ym: string) => {
    const member = staff.find(s => s.id === memberId)
    if (!member) { showToast('人员不存在', 'error'); return }
    const record = getAttendanceForMemberMonth(memberId, ym)
    if (!record) {
      const dailyStatus: Record<number, string> = {}
      for (let d = 1; d <= getDaysInMonth(ym); d++) dailyStatus[d] = 'work'
      try {
        const res = await (await getAPI()).createAttendance({ memberId, yearMonth: ym, dailyStatus, createdAt: new Date().toISOString() } as any)
        await loadData()
        if (res.success) {
          const created = allAttendances.find((a: any) => a.memberId === memberId && a.yearMonth === ym)
          if (created) { setDetailRecord(created); setDetailMember(member); setDetailYearMonth(ym) }
          else showToast('创建后未能加载记录', 'error')
        } else showToast(res.error || '创建失败', 'error')
      } catch (e: any) { showToast(e?.message || '创建失败', 'error') }
      return
    }
    setDetailRecord(record); setDetailMember(member); setDetailYearMonth(ym)
  }, [staff, allAttendances, getAttendanceForMemberMonth, showToast, loadData, setDetailRecord, setDetailMember, setDetailYearMonth])

  return {
    handleGenerateDefaults,
    handleDelete,
    handleBatchDelete,
    handleExport,
    openHistoryMonth,
    hasAttendance,
  }
}
