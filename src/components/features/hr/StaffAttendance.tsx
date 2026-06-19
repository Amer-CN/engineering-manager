import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useToastStore } from '@/store/toastStore'
import { useConfirm } from '@/hooks/useConfirm'
import { logCreate, logDelete } from '../../../utils/audit'
import { STATUS_META, computeAttendanceSummary, summaryDot } from '../../../constants/attendance'
import type { AttendanceRecord } from '../../../types/electron'
import AttendanceDetail from '../../AttendanceDetail'
import AttendanceTimeline from './AttendanceTimeline'
import { getAPI } from '@/services/api-adapter'
import { getAttendanceColumns } from './staffAttendanceColumns'
import { getDaysInMonth, getLastDayOfMonth, formatMonthLabel } from './staffAttendanceUtils'
import { StaffAttendanceDashboard } from './StaffAttendanceDashboard'


const StaffAttendance: React.FC = () => {
  const showToast = useToastStore(state => state.showToast)
  const { confirm, ConfirmDialog } = useConfirm()
  const now = new Date()
  const [yearMonth, setYearMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
  const [staff, setStaff] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [filterDept, setFilterDept] = useState<number | ''>('')
  const [allAttendances, setAllAttendances] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  // Sub-page: attendance timeline for one person (all months, year-grouped)
  const [timelineMember, setTimelineMember] = useState<any | null>(null)
  // Sub-page: attendance detail for one person at a specific month
  const [detailRecord, setDetailRecord] = useState<AttendanceRecord | null>(null)
  const [detailMember, setDetailMember] = useState<any | null>(null)
  const [detailYearMonth, setDetailYearMonth] = useState('')

  const daysInMonth = useMemo(() => getDaysInMonth(yearMonth), [yearMonth])

  // Reset selection when filters change
  useEffect(() => { setSelectedIds(new Set()) }, [yearMonth, filterDept])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const api = await getAPI()
      const [memRes, attRes, deptRes] = await Promise.allSettled([
        api.getMembers(),
        api.getAttendances(undefined, undefined),
        api.getDepartments()
      ])
      const get = (r: PromiseSettledResult<any>) => r.status === 'fulfilled' && r.value?.success ? r.value.data || [] : []
      setStaff(get(memRes).filter((m: any) => m.memberType === 'staff' || m.memberType === undefined))
      setAllAttendances(get(attRes))
      setDepartments(get(deptRes))
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Current-month attendances (client-side filter from allAttendances)
  const currentMonthAttendances = useMemo(
    () => allAttendances.filter((a: any) => a.yearMonth === yearMonth),
    [allAttendances, yearMonth]
  )

  // Build history map: memberId → sorted yearMonth strings
  const historyMap = useMemo(() => {
    const map = new Map<number, string[]>()
    for (const a of allAttendances) {
      if (!map.has(a.memberId)) map.set(a.memberId, [])
      const months = map.get(a.memberId)!
      if (!months.includes(a.yearMonth)) months.push(a.yearMonth)
    }
    for (const months of map.values()) months.sort()
    return map
  }, [allAttendances])

  // Filter: only staff who joined on or before end of selected month, and haven't left before this month
  const monthEnd = getLastDayOfMonth(yearMonth)
  const monthStart = `${yearMonth}-01`
  const getEntryDate = useCallback((s: any) => s.entryDate || (s.createdAt ? s.createdAt.split('T')[0] : null), [])

  const filterableStaff = useMemo(() => staff.filter((s: any) => {
    const ed = getEntryDate(s)
    if (!ed) return true
    if (ed > monthEnd) return false
    if (s.leaveDate && !s.reentryDate && s.leaveDate < monthStart) return false
    if (s.leaveDate && s.reentryDate && s.leaveDate < monthStart && s.reentryDate > monthEnd) return false
    return true
  }), [staff, monthEnd, monthStart, getEntryDate])

  const filteredStaff = useMemo(() => filterableStaff.filter((s: any) => {
    if (filterDept && s.departmentId !== filterDept) return false
    return true
  }), [filterableStaff, filterDept])

  const getAttendanceForMember = useCallback((memberId: number) =>
    currentMonthAttendances.find((a: any) => a.memberId === memberId),
    [currentMonthAttendances]
  )

  const getAttendanceForMemberMonth = useCallback((memberId: number, ym: string) =>
    allAttendances.find((a: any) => a.memberId === memberId && a.yearMonth === ym),
    [allAttendances]
  )

  const hasAttendance = useCallback((memberId: number): boolean => {
    const att = getAttendanceForMember(memberId)
    return !!(att && att.dailyStatus && Object.keys(att.dailyStatus).length > 0)
  }, [getAttendanceForMember])

  const getDeptName = useCallback((id?: number) => departments.find((d: any) => d.id === id)?.name || '-', [departments])

  // Pre-compute entry day for a staff member in the current month
  const getEntryDay = useCallback((s: any) => {
    const ed = getEntryDate(s)
    if (!ed) return 1
    const [ey, em, ed2] = ed.split('-').map(Number)
    const [cy, cm] = yearMonth.split('-').map(Number)
    return (ey === cy && em === cm) ? ed2 : 1
  }, [getEntryDate, yearMonth])

  // Batch select
  const toggleSelect = useCallback((id: number) => {
    setSelectedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }, [])
  const toggleAll = () => {
    const recordIds = filteredStaff.map(s => getAttendanceForMember(s.id)).filter(Boolean).map((a: any) => a.id)
    if (recordIds.length === 0) return
    setSelectedIds(prev => prev.size === recordIds.length ? new Set() : new Set(recordIds))
  }

  const handleGenerateDefaults = async () => {
    if (filteredStaff.length === 0) { showToast('没有可生成考勤的人员', 'info'); return }
    setGenerating(true)
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
    finally { setGenerating(false) }
  }

  const handleDelete = async (record: any) => {
    const ok = await confirm({ title: '确认删除', content: `确定删除 ${record.memberName || '该员工'} ${formatMonthLabel(record.yearMonth || '')} 的考勤记录吗？此操作不可撤销。`, confirmVariant: 'danger' })
    if (!ok) return
    try {
      const result = await (await getAPI()).deleteAttendance(record.id)
      if (result.success) { showToast('已删除', 'success'); loadData(); logDelete('attendances', record.memberName || '考勤', record.id, {}) }
      else showToast(result.error || '删除失败', 'error')
    } catch (e: any) { showToast(e?.message || '删除失败', 'error') }
  }

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return
    const ok = await confirm({ title: '确认删除', content: `确认删除选中的 ${selectedIds.size} 条考勤记录吗？此操作不可撤销。`, confirmVariant: 'danger' })
    if (!ok) return
    try {
      const result = await (await getAPI()).batchDeleteAttendances(Array.from(selectedIds))
      if (result.success) { showToast(`已删除 ${selectedIds.size} 条`, 'success'); setSelectedIds(new Set()); loadData(); logDelete('attendances', `${selectedIds.size} 条考勤`, 0, {}) }
      else showToast(result.error || '批量删除失败', 'error')
    } catch (e: any) { showToast(e?.message || '批量删除失败', 'error') }
  }

  // Export
  const handleExport = async () => {
    try {
      const XLSX = await import('xlsx')
      const rows = filteredStaff.map(s => {
        const att = getAttendanceForMember(s.id)
        const s2 = computeAttendanceSummary(att?.dailyStatus, daysInMonth, (() => { const ed = getEntryDate(s); if (!ed) return 1; const [ey, em, ed2] = ed.split('-').map(Number); const [cy, cm] = yearMonth.split('-').map(Number); return (ey === cy && em === cm) ? ed2 : 1 })())
        const dept = departments.find((d: any) => d.id === s.departmentId)
        return { '姓名': s.name, '部门': dept?.name || '', '职位': s.position || '', '出勤': s2.counts.work, '法定假': s2.counts.holiday, '病假': s2.counts.sick_leave, '事假': s2.counts.personal_leave, '状态': hasAttendance(s.id) ? (s2.daysOff <= 4 ? '全勤' : '缺勤') : '无考勤' }
      })
      const wb = XLSX.utils.book_new(); wb.SheetNames.push('考勤汇总'); wb.Sheets['考勤汇总'] = XLSX.utils.json_to_sheet(rows)
      XLSX.writeFile(wb, `考勤汇总_${yearMonth}.xlsx`)
      showToast('导出成功', 'success')
    } catch (e: any) { showToast(e?.message || '导出失败', 'error') }
  }

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
  }, [staff, allAttendances, getAttendanceForMemberMonth, showToast, loadData])

  // Show timeline sub-page for attendance history
  if (timelineMember) {
    const memberAttendances = allAttendances.filter((a: any) => a.memberId === timelineMember.id)
    return (
      <AttendanceTimeline
        member={timelineMember}
        attendances={memberAttendances}
        deptName={getDeptName(timelineMember.departmentId)}
        onBack={() => { setTimelineMember(null); loadData() }}
        onSaved={loadData}
      />
    )
  }

  // Show detail sub-page for editing
  if (detailRecord && detailMember) {
    return (
      <AttendanceDetail
        record={detailRecord}
        member={detailMember}
        teamName={getDeptName(detailMember.departmentId)}
        yearMonth={detailYearMonth}
        daysInMonth={getDaysInMonth(detailYearMonth)}
        projectName=""
        onBack={() => { setDetailRecord(null); setDetailMember(null); setDetailYearMonth(''); loadData() }}
        onSaved={loadData}
      />
    )
  }

  const joinedAfter = useMemo(() => staff.filter((s: any) => { const ed = getEntryDate(s); return ed && ed > monthEnd }).length, [staff, getEntryDate, monthEnd])

  // ── Pre-compute row data FIRST (before columns, since columns reference rows) ──
  const rows = useMemo(() => filteredStaff.map(s => {
    const att = getAttendanceForMember(s.id)
    const isSelected = !!att && selectedIds.has(att.id)
    const deptName = getDeptName(s.departmentId)
    const entryDay = getEntryDay(s)
    const historyMonths = historyMap.get(s.id) || []
    return { s, att, isSelected, deptName, entryDay, historyMonths }
  }), [filteredStaff, getAttendanceForMember, selectedIds, getDeptName, getEntryDay, historyMap])

  // Build data array for DataTable
  const tableData = useMemo(() => rows.map((r) => ({ ...r.s, __rowIndex: rows.indexOf(r) })), [rows])

  // ── DataTable 列定义 (rows must be defined before this) ──
  const columns = getAttendanceColumns({
    rows,
    selectedIds,
    daysInMonth,
    yearMonth,
    summaryDot,
    STATUS_META,
    computeAttendanceSummary,
    toggleAll,
    toggleSelect,
    setTimelineMember,
    openHistoryMonth,
    handleDelete,
  })


  return (
    <StaffAttendanceDashboard
      loading={loading}
      yearMonth={yearMonth}
      setYearMonth={setYearMonth}
      filterDept={filterDept}
      setFilterDept={setFilterDept}
      daysInMonth={daysInMonth}
      departments={departments}
      filteredStaff={filteredStaff}
      joinedAfter={joinedAfter}
      selectedIds={selectedIds}
      handleBatchDelete={handleBatchDelete}
      handleExport={handleExport}
      handleGenerateDefaults={handleGenerateDefaults}
      generating={generating}
      tableData={tableData}
      columns={columns}
      ConfirmDialog={ConfirmDialog}
      staff={staff}
    />
  )
}

export default StaffAttendance