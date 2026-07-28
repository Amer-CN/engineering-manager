import React from 'react'
import { STATUS_META, summaryDot, computeAttendanceSummary } from '../../../constants/attendance'
import type { DayStatus } from '../../../types/electron'

interface StaffAttendanceRowProps {
  s: any
  att: any
  isSelected: boolean
  daysInMonth: number
  yearMonth: string
  historyMonths: string[]
  deptName: string
  entryDay: number
  onToggleSelect: (id: number) => void
  onTimeline: (s: any) => void
  onEdit: (memberId: number, ym: string) => void
  onDelete: (record: any) => void
}

export const StaffAttendanceRow = React.memo(function StaffAttendanceRow({
  s,
  att,
  isSelected,
  daysInMonth,
  yearMonth,
  historyMonths,
  deptName,
  entryDay,
  onToggleSelect,
  onTimeline,
  onEdit,
  onDelete,
}: StaffAttendanceRowProps) {
  const summary = computeAttendanceSummary(att?.dailyStatus, daysInMonth, entryDay)
  const ready = !!(att && att.dailyStatus && Object.keys(att.dailyStatus).length > 0)
  const summaryItems = (STATUS_META.filter(x => x.key !== undefined) as { key: DayStatus; label: string; color: string }[])
    .map(st => ({ ...st, count: summary.counts[st.key] }))
    .filter(item => item.count > 0)
  const historyYears = [...new Set(historyMonths.map((ym: string) => ym.slice(0, 4)))].sort()

  return (
    <tr className="hover:bg-[color:var(--panel-2)]">
      <td className="px-3 py-3">
        {att && <input type="checkbox" checked={isSelected}
          onChange={() => onToggleSelect(att.id)} className="rounded" />}
      </td>
      <td className="px-4 py-3">
        <button onClick={() => onTimeline(s)}
          className="text-sm font-medium text-[color:var(--accent)] hover:opacity-80 hover:underline text-left">
          {s.name}
        </button>
      </td>
      <td className="px-4 py-3 text-sm text-[color:var(--muted)]">{deptName}</td>
      <td className="px-4 py-3">
        {ready ? (
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {summaryItems.map(item => (
              <span key={item.key} className="inline-flex items-center gap-1 whitespace-nowrap">
                <span className={`w-2 h-2 rounded-full ${summaryDot[item.key]}`} />
                <span className="text-[color:var(--fg-2)]">{item.label}</span>
                <span className="font-medium text-[color:var(--fg-2)]">{item.count}天</span>
              </span>
            ))}
          </div>
        ) : (
          <span className="text-xs text-[color:var(--muted)]">未标记</span>
        )}
      </td>
      <td className="px-4 py-3 text-center">
        {ready ? (
          summary.daysOff <= 4 ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-success-100 text-success-700">
              <span className="w-1.5 h-1.5 rounded-full bg-success-500" />全勤
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-danger-100 text-danger-700">
              <span className="w-1.5 h-1.5 rounded-full bg-danger-500" />缺勤
            </span>
          )
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-[color:var(--panel-2)] text-[color:var(--muted)]">未标记</span>
        )}
      </td>
      <td className="px-4 py-3">
        {historyMonths.length > 0 ? (
          <button onClick={() => onTimeline(s)}
            className="text-xs text-[color:var(--accent)] hover:opacity-80 hover:underline">
            {historyYears.length}年 · {historyMonths.length}个月
          </button>
        ) : (
          <span className="text-xs text-[color:var(--border-strong)]">-</span>
        )}
      </td>
      <td className="px-4 py-3 text-center">
        <div className="flex items-center justify-center gap-1">
          {att ? (
            <>
              <button onClick={() => onEdit(s.id, yearMonth)}
                className="text-[color:var(--accent)] hover:opacity-80 text-sm font-medium">编辑</button>
              <button onClick={() => onDelete(att)}
                className="text-danger-400 hover:text-danger-600 text-sm">删除</button>
            </>
          ) : (
            <button onClick={() => onEdit(s.id, yearMonth)}
              className="text-[color:var(--accent)] hover:opacity-80 text-sm">创建</button>
          )}
        </div>
      </td>
    </tr>
  )
})
