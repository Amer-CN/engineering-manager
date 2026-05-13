import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Button } from '../../ui/Button'
import { EmptyState } from '../../ui/EmptyState'
import { useToastContext } from '../../../hooks/useToast'
import { STATUS_META, summaryDot, computeAttendanceSummary } from '../../../constants/attendance'
import type { DayStatus, AttendanceRecord } from '../../../types/electron'
import AttendanceDetail from '../../AttendanceDetail'
import AttendanceTimeline from './AttendanceTimeline'

function getDaysInMonth(yearMonth: string): number {
  const [y, m] = yearMonth.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

function getLastDayOfMonth(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number)
  const d = new Date(y, m, 0).getDate()
  return `${yearMonth}-${String(d).padStart(2, '0')}`
}

function formatMonthLabel(ym: string): string {
  const [y, m] = ym.split('-')
  return `${y}年${parseInt(m)}月`
}

const StaffAttendance: React.FC = () => {
  const { showToast } = useToastContext()
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

  const daysInMonth = getDaysInMonth(yearMonth)

  // Reset selection when filters change
  useEffect(() => { setSelectedIds(new Set()) }, [yearMonth, filterDept])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [memRes, attRes, deptRes] = await Promise.all([
        window.electronAPI.getMembers(),
        window.electronAPI.getAttendances(undefined, undefined),
        window.electronAPI.getDepartments()
      ])
      if (memRes.success) setStaff((memRes.data || []).filter((m: any) => m.memberType === 'staff' || m.memberType === undefined))
      if (attRes.success) setAllAttendances(attRes.data || [])
      if (deptRes.success) setDepartments(deptRes.data || [])
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

  // Filter: only staff who joined on or before end of selected month
  const monthEnd = getLastDayOfMonth(yearMonth)
  const getEntryDate = (s: any) => s.entryDate || (s.createdAt ? s.createdAt.split('T')[0] : null)
  const filterableStaff = staff.filter((s: any) => {
    const ed = getEntryDate(s)
    if (!ed) return true
    return ed <= monthEnd
  })

  const filteredStaff = filterableStaff.filter((s: any) => {
    if (filterDept && s.departmentId !== filterDept) return false
    return true
  })

  const getAttendanceForMember = (memberId: number) =>
    currentMonthAttendances.find((a: any) => a.memberId === memberId)

  const getAttendanceForMemberMonth = (memberId: number, ym: string) =>
    allAttendances.find((a: any) => a.memberId === memberId && a.yearMonth === ym)

  const hasAttendance = (memberId: number): boolean => {
    const att = getAttendanceForMember(memberId)
    return !!(att && att.dailyStatus && Object.keys(att.dailyStatus).length > 0)
  }

  const getDeptName = (id?: number) => departments.find((d: any) => d.id === id)?.name || '-'

  // Batch select
  const toggleSelect = (id: number) => {
    setSelectedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }
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
        await window.electronAPI.createAttendance({ memberId, yearMonth, dailyStatus, createdAt: new Date().toISOString() } as any)
        created++
      }
      await loadData()
      showToast(created > 0 ? `已为 ${created} 人生成考勤（默认全部出勤）` : '所有人员已有考勤记录', created > 0 ? 'success' : 'info')
    } catch (e: any) { showToast(e?.message || '生成失败', 'error') }
    finally { setGenerating(false) }
  }

  const handleDelete = async (record: any) => {
    if (!confirm(`确定删除 ${record.memberName || '该员工'} ${formatMonthLabel(record.yearMonth || '')} 的考勤记录吗？此操作不可撤销。`)) return
    try {
      const result = await window.electronAPI.deleteAttendance(record.id)
      if (result.success) { showToast('已删除', 'success'); loadData() }
      else showToast(result.error || '删除失败', 'error')
    } catch (e: any) { showToast(e?.message || '删除失败', 'error') }
  }

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0 || !confirm(`确认删除选中的 ${selectedIds.size} 条考勤记录吗？此操作不可撤销。`)) return
    try {
      const result = await window.electronAPI.batchDeleteAttendances(Array.from(selectedIds))
      if (result.success) { showToast(`已删除 ${selectedIds.size} 条`, 'success'); setSelectedIds(new Set()); loadData() }
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
        return { '姓名': s.name, '部门': dept?.name || '', '职位': s.position || '', '出勤': s2.counts.work, '法定假': s2.counts.holiday, '病假': s2.counts.sick_leave, '事假': s2.counts.personal_leave, '缺勤': s2.counts.absent, '状态': hasAttendance(s.id) ? (s2.daysOff <= 4 ? '全勤' : '缺勤') : '无考勤' }
      })
      const wb = XLSX.utils.book_new(); wb.SheetNames.push('考勤汇总'); wb.Sheets['考勤汇总'] = XLSX.utils.json_to_sheet(rows)
      XLSX.writeFile(wb, `考勤汇总_${yearMonth}.xlsx`)
      showToast('导出成功', 'success')
    } catch (e: any) { showToast(e?.message || '导出失败', 'error') }
  }

  const openHistoryMonth = async (memberId: number, ym: string) => {
    const member = staff.find(s => s.id === memberId)
    if (!member) { showToast('人员不存在', 'error'); return }
    const record = getAttendanceForMemberMonth(memberId, ym)
    if (!record) {
      const dailyStatus: Record<number, string> = {}
      for (let d = 1; d <= getDaysInMonth(ym); d++) dailyStatus[d] = 'work'
      try {
        const res = await window.electronAPI.createAttendance({ memberId, yearMonth: ym, dailyStatus, createdAt: new Date().toISOString() } as any)
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
  }

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

  const joinedAfter = staff.filter((s: any) => { const ed = getEntryDate(s); return ed && ed > monthEnd }).length

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent" /></div>
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white rounded-xl shadow-sm px-5 py-3 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <input type="month" value={yearMonth} onChange={e => setYearMonth(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-400">部门</label>
          <select value={filterDept} onChange={e => setFilterDept(e.target.value ? Number(e.target.value) : '')}
            className="px-2 py-1.5 border border-slate-300 rounded-lg text-sm">
            <option value="">全部</option>
            {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <span className="text-xs text-slate-400">{filteredStaff.length} 人 · {daysInMonth} 天</span>
        {joinedAfter > 0 && <span className="text-xs text-amber-600">（{joinedAfter} 人本月尚未入职已隐藏）</span>}
        <div className="flex-1" />
        {selectedIds.size > 0 && (
          <Button onClick={handleBatchDelete} size="sm" variant="danger">删除选中 ({selectedIds.size})</Button>
        )}
        <Button onClick={handleExport} size="sm" variant="secondary" disabled={filteredStaff.length === 0}>
          导出Excel
        </Button>
        <Button onClick={handleGenerateDefaults} disabled={generating || filteredStaff.length === 0} size="sm">
          {generating ? '生成中...' : '生成默认考勤'}
        </Button>
      </div>

      {/* Summary list */}
      {filteredStaff.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm py-12">
          <EmptyState icon="Calendar" title="暂无符合条件的人员"
            description={staff.length === 0 ? '请先在人员档案中添加管理人员' : '请调整筛选条件'} />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-3 py-3 w-10">
                  <input type="checkbox"
                    checked={selectedIds.size > 0 && (() => { const ids = filteredStaff.map(s => getAttendanceForMember(s.id)).filter(Boolean).map((a: any) => a.id); return ids.length > 0 && ids.every((id: number) => selectedIds.has(id)) })()}
                    onChange={toggleAll} className="rounded" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">姓名</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">部门</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">当月考勤</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">状态</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">历史考勤</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStaff.map(s => {
                const att = getAttendanceForMember(s.id)
                const summary = computeAttendanceSummary(att?.dailyStatus, daysInMonth, (() => { const ed = getEntryDate(s); if (!ed) return 1; const [ey, em, ed2] = ed.split('-').map(Number); const [cy, cm] = yearMonth.split('-').map(Number); return (ey === cy && em === cm) ? ed2 : 1 })())
                const ready = hasAttendance(s.id)
                const summaryItems = (STATUS_META.filter(x => x.key !== undefined) as { key: DayStatus; label: string; color: string }[])
                  .map(st => ({ ...st, count: summary.counts[st.key] }))
                  .filter(item => item.count > 0)
                const historyMonths = historyMap.get(s.id) || []
                const historyYears = [...new Set(historyMonths.map((ym: string) => ym.slice(0, 4)))].sort()

                return (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-3 py-3">
                      {att && <input type="checkbox" checked={selectedIds.has(att.id)}
                        onChange={() => toggleSelect(att.id)} className="rounded" />}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setTimelineMember(s)}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline text-left">
                        {s.name}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">{getDeptName(s.departmentId)}</td>
                    <td className="px-4 py-3">
                      {ready ? (
                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          {summaryItems.map(item => (
                            <span key={item.key} className="inline-flex items-center gap-1 whitespace-nowrap">
                              <span className={`w-2 h-2 rounded-full ${summaryDot[item.key]}`} />
                              <span className="text-slate-600">{item.label}</span>
                              <span className="font-medium text-slate-700">{item.count}天</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">未标记</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {ready ? (
                        summary.daysOff <= 4 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />全勤
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />缺勤
                          </span>
                        )
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-500">未标记</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {historyMonths.length > 0 ? (
                        <button onClick={() => setTimelineMember(s)}
                          className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline">
                          {historyYears.length}年 · {historyMonths.length}个月
                        </button>
                      ) : (
                        <span className="text-xs text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {att ? (
                          <>
                            <button onClick={() => openHistoryMonth(s.id, yearMonth)}
                              className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">编辑</button>
                            <button onClick={() => handleDelete(att)}
                              className="text-red-400 hover:text-red-600 text-sm" title="删除本月考勤">删除</button>
                          </>
                        ) : (
                          <button onClick={() => openHistoryMonth(s.id, yearMonth)}
                            className="text-indigo-600 hover:text-indigo-800 text-sm">创建</button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
        {STATUS_META.map(s => (
          <span key={s.key ?? 'unset'} className="flex items-center gap-1">
            <span className={`w-3 h-3 rounded ${s.color}`} />{s.label}
          </span>
        ))}
        <span className="text-slate-300">|</span>
        <span>点击「生成默认考勤」→ 全勤 → 编辑调整</span>
        <span className="text-slate-300">|</span>
        <span>点击姓名查看历史考勤时间线</span>
      </div>
    </div>
  )
}

export default StaffAttendance
