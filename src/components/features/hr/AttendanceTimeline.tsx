import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '../../ui/Icon'
import { EmptyState } from '../../ui/EmptyState'
import { useToastStore } from '@/store/toastStore'
import { computeAttendanceSummary } from '../../../constants/attendance'
import type { AttendanceRecord } from '../../../types/electron'
import AttendanceDetail from '../../AttendanceDetail'

function getDaysInMonth(yearMonth: string): number {
  const [y, m] = yearMonth.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

interface Props {
  member: any
  attendances: any[]
  deptName: string
  onBack: () => void
  onSaved: () => void
}

function getEntryDateStr(member: any): string | null {
  return member.entryDate || (member.createdAt ? member.createdAt.split('T')[0] : null)
}

function durationStr(entryDate: string | null): string {
  if (!entryDate) return ''
  const start = new Date(entryDate)
  const now = new Date()
  const totalMonths = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
  const years = Math.floor(totalMonths / 12)
  const months = totalMonths % 12
  if (years > 0 && months > 0) return `在职 ${years}年${months}个月`
  if (years > 0) return `在职 ${years}年`
  if (months > 0) return `在职 ${months}个月`
  return '本月入职'
}

const AttendanceTimeline: React.FC<Props> = ({ member, attendances, deptName, onBack, onSaved }) => {
  const showToast = useToastStore(state => state.showToast)
  const [expandedYears, setExpandedYears] = useState<Set<string>>(() => {
    // Expand current year by default
    const thisYear = String(new Date().getFullYear())
    const years = [...new Set(attendances.map((a: any) => a.yearMonth.slice(0, 4)))]
    return new Set(years.includes(thisYear) ? [thisYear] : years.length > 0 ? [years[years.length - 1]] : [])
  })
  const [yearFilter, setYearFilter] = useState<string>('全部')
  const [detailRecord, setDetailRecord] = useState<AttendanceRecord | null>(null)
  const [detailYearMonth, setDetailYearMonth] = useState('')

  // Group by year
  const grouped = useMemo(() => {
    const map = new Map<string, any[]>()
    for (const a of attendances) {
      const year = a.yearMonth.slice(0, 4)
      if (!map.has(year)) map.set(year, [])
      map.get(year)!.push(a)
    }
    for (const [_, records] of map) records.sort((a: any, b: any) => a.yearMonth.localeCompare(b.yearMonth))
    const sorted = [...map.entries()].sort(([a], [b]) => b.localeCompare(a)) // newest first
    return sorted
  }, [attendances])

  const allYears = useMemo(() => grouped.map(([y]) => y), [grouped])
  const filteredYears = yearFilter === '全部' ? grouped : grouped.filter(([y]) => y === yearFilter)

  const toggleYear = (year: string) => {
    setExpandedYears(prev => {
      const next = new Set(prev)
      next.has(year) ? next.delete(year) : next.add(year)
      return next
    })
  }

  const getEntryDay = (ym: string): number => {
    const ed = getEntryDateStr(member)
    if (!ed) return 1
    const [ey, em, ed2] = ed.split('-').map(Number)
    const [cy, cm] = ym.split('-').map(Number)
    return (ey === cy && em === cm) ? ed2 : 1
  }

  const yearSummary = (records: any[]) => {
    let workDays = 0
    let daysOff = 0
    let fullMonths = 0
    for (const a of records) {
      const dim = getDaysInMonth(a.yearMonth)
      const startDay = getEntryDay(a.yearMonth)
      const s = computeAttendanceSummary(a.dailyStatus, dim, startDay)
      workDays += s.workDays
      daysOff += s.daysOff
      if (s.daysOff <= 4) fullMonths++
    }
    const total = records.length
    const rate = total > 0 ? Math.round((fullMonths / total) * 100) : 0
    return { workDays, daysOff, fullMonths, total, rate }
  }

  const fullAttendanceColor = (rate: number) =>
    rate >= 90 ? 'text-emerald-600' : rate >= 70 ? 'text-amber-600' : 'text-red-600'

  const monthStatusBadge = (a: any) => {
    if (!a.dailyStatus || Object.keys(a.dailyStatus).length === 0) return { label: '无数据', cls: 'bg-slate-50 text-slate-400' }
    const dim = getDaysInMonth(a.yearMonth)
    const s = computeAttendanceSummary(a.dailyStatus, dim, getEntryDay(a.yearMonth))
    if (s.daysOff <= 4) return { label: '全勤', cls: 'bg-emerald-100 text-emerald-700' }
    return { label: `缺勤${s.daysOff}天`, cls: 'bg-red-100 text-red-700' }
  }

  const handleMonthClick = async (record: any) => {
    const ym = record.yearMonth
    if (!record.dailyStatus || Object.keys(record.dailyStatus).length === 0) {
      // Auto-fill defaults if empty
      const dailyStatus: Record<number, string> = {}
      for (let d = 1; d <= getDaysInMonth(ym); d++) dailyStatus[d] = 'work'
      try {
        await window.electronAPI.updateAttendance({ ...record, dailyStatus })
        record.dailyStatus = dailyStatus
        showToast('已自动填充默认出勤', 'success')
      } catch (e: any) { /* continue with edit anyway */ }
    }
    setDetailRecord(record)
    setDetailYearMonth(ym)
  }

  // Sub-page: attendance detail for a specific month
  if (detailRecord && detailYearMonth) {
    return (
      <AttendanceDetail
        record={detailRecord}
        member={member}
        teamName={deptName}
        yearMonth={detailYearMonth}
        daysInMonth={getDaysInMonth(detailYearMonth)}
        projectName=""
        onBack={() => { setDetailRecord(null); setDetailYearMonth(''); onSaved() }}
        onSaved={onSaved}
      />
    )
  }

  const entryDate = getEntryDateStr(member)
  const dur = durationStr(entryDate)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm px-5 py-4">
        <button onClick={onBack} className="flex items-center gap-1.5 text-slate-500 hover:text-indigo-600 mb-3 transition-colors">
          <Icon name="ArrowLeft" size={16} />
          <span className="text-sm">返回考勤列表</span>
        </button>
        <div>
          <h2 className="text-lg font-semibold text-slate-800">{member.name}</h2>
          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
            <span>{deptName}{member.position ? ` · ${member.position}` : ''}</span>
            {entryDate && <span>入职 {entryDate}</span>}
            {dur && <span className="text-indigo-600 font-medium">{dur}</span>}
          </div>
        </div>
      </div>

      {grouped.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm py-12">
          <EmptyState icon="Calendar" title="暂无考勤记录" description="该员工还没有任何月份的考勤数据" />
        </div>
      ) : (
        <>
          {/* Year filter pills */}
          <div className="bg-white rounded-xl shadow-sm px-5 py-3 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400 mr-1">年份</span>
            {['全部', ...allYears].map(y => (
              <button key={y} onClick={() => setYearFilter(y)}
                className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors ${yearFilter === y ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {y}
              </button>
            ))}
          </div>

          {/* Year groups */}
          {filteredYears.map(([year, records]) => {
            const s = yearSummary(records)
            const expanded = expandedYears.has(year)
            return (
              <div key={year} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <button onClick={() => toggleYear(year)}
                  className="w-full px-5 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left">
                  <Icon name={expanded ? 'ChevronDown' : 'ChevronRight'} size={16} className="text-slate-400" />
                  <span className="text-sm font-semibold text-slate-800">{year}年</span>
                  <span className="text-xs text-slate-400">{s.total}个月考勤</span>
                  <span className="text-xs text-slate-400">出勤 {s.workDays}天</span>
                  <span className="text-xs text-slate-400">缺勤 {s.daysOff}天</span>
                  <span className={`text-xs font-medium ${fullAttendanceColor(s.rate)}`}>全勤率 {s.rate}%</span>
                </button>
                <AnimatePresence>
                  {expanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }} className="overflow-hidden">
                      <div className="px-5 pb-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                        {records.map((a: any) => {
                          const badge = monthStatusBadge(a)
                          const month = parseInt(a.yearMonth.split('-')[1])
                          return (
                            <button key={a.id} onClick={() => handleMonthClick(a)}
                              className="p-2.5 border border-slate-200 rounded-lg hover:border-indigo-300 hover:shadow-sm transition-all text-left">
                              <div className="text-xs font-medium text-slate-700">{month}月</div>
                              <div className="text-xs text-slate-400 mt-0.5">
                                {a.workDays || 0}天出勤
                              </div>
                              <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-xs ${badge.cls}`}>
                                {badge.label}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}

export default AttendanceTimeline
