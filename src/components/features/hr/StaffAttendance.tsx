import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useConfirm } from '@/hooks/useConfirm'
import { STATUS_META, computeAttendanceSummary, summaryDot } from '../../../constants/attendance'
import type { AttendanceRecord } from '../../../types/electron'
import AttendanceDetail from '../../AttendanceDetail'
import AttendanceTimeline from './AttendanceTimeline'
import { getAPI } from '@/services/api-adapter'
import type { Member, Department } from '@/types'
import { getAttendanceColumns } from './staffAttendanceColumns'
import { getDaysInMonth, getLastDayOfMonth } from './staffAttendanceUtils'
import { StaffAttendanceDashboard } from './StaffAttendanceDashboard'
import { useStaffAttendanceActions } from './useStaffAttendanceActions'


const StaffAttendance: React.FC = () => {
  const { confirm, ConfirmDialog } = useConfirm()
  const now = new Date()
  const [yearMonth, setYearMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
  const [staff, setStaff] = useState<Member[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [filterDept, setFilterDept] = useState<number | ''>('')
  const [allAttendances, setAllAttendances] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  // Sub-page: attendance timeline for one person (all months, year-grouped)
  const [timelineMember, setTimelineMember] = useState<Member | null>(null)
  // Sub-page: attendance detail for one person at a specific month
  const [detailRecord, setDetailRecord] = useState<AttendanceRecord | null>(null)
  const [detailMember, setDetailMember] = useState<Member | null>(null)
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
      const get = <T,>(r: PromiseSettledResult<{ success?: boolean; data?: unknown }>): T[] => (r.status === 'fulfilled' && r.value?.success ? (r.value.data as T[] || []) : [])
      setStaff(get<Member>(memRes).filter((m: Member) => m.memberType === 'staff' || m.memberType === undefined))
      setAllAttendances(get<AttendanceRecord>(attRes))
      setDepartments(get<Department>(deptRes))
    } catch (e: unknown) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Current-month attendances (client-side filter from allAttendances)
  const currentMonthAttendances = useMemo(
    () => allAttendances.filter((a: AttendanceRecord) => a.yearMonth === yearMonth),
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
  const getEntryDate = useCallback((s: Member) => s.entryDate || (s.createdAt ? s.createdAt.split('T')[0] : null), [])

  const filterableStaff = useMemo(() => staff.filter((s: Member) => {
    const ed = getEntryDate(s)
    if (!ed) return true
    if (ed > monthEnd) return false
    if (s.leaveDate && !s.reentryDate && s.leaveDate < monthStart) return false
    if (s.leaveDate && s.reentryDate && s.leaveDate < monthStart && s.reentryDate > monthEnd) return false
    return true
  }), [staff, monthEnd, monthStart, getEntryDate])

  const filteredStaff = useMemo(() => filterableStaff.filter((s: Member) => {
    if (filterDept && s.departmentId !== filterDept) return false
    return true
  }), [filterableStaff, filterDept])

  const getAttendanceForMember = useCallback((memberId: number) =>
    currentMonthAttendances.find((a: AttendanceRecord) => a.memberId === memberId),
    [currentMonthAttendances]
  )

  const getAttendanceForMemberMonth = useCallback((memberId: number, ym: string) =>
    allAttendances.find((a: AttendanceRecord) => a.memberId === memberId && a.yearMonth === ym),
    [allAttendances]
  )

  const getDeptName = useCallback((id?: number) => departments.find((d: Department) => d.id === id)?.name || '-', [departments])

  // Pre-compute entry day for a staff member in the current month
  const getEntryDay = useCallback((s: Member) => {
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
    const recordIds = filteredStaff.map(s => getAttendanceForMember(s.id)).filter((a): a is AttendanceRecord => !!a).map(a => a.id)
    if (recordIds.length === 0) return
    setSelectedIds(prev => prev.size === recordIds.length ? new Set() : new Set(recordIds))
  }

  const {
    handleGenerateDefaults: rawGenerateDefaults,
    handleDelete,
    handleBatchDelete,
    handleExport,
    openHistoryMonth,
  } = useStaffAttendanceActions({
    filteredStaff, selectedIds, setSelectedIds, currentMonthAttendances,
    daysInMonth, yearMonth, allAttendances, staff, loadData,
    getAttendanceForMember, getAttendanceForMemberMonth, getEntryDate,
    departments, setDetailRecord, setDetailMember, setDetailYearMonth,
    confirm,
  })

  const handleGenerateDefaults = useCallback(async () => {
    setGenerating(true)
    try { await rawGenerateDefaults() } finally { setGenerating(false) }
  }, [rawGenerateDefaults])

  // Show timeline sub-page for attendance history
  if (timelineMember) {
    const memberAttendances = allAttendances.filter((a: AttendanceRecord) => a.memberId === timelineMember.id)
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

  const joinedAfter = useMemo(() => staff.filter((s: Member) => { const ed = getEntryDate(s); return ed && ed > monthEnd }).length, [staff, getEntryDate, monthEnd])

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