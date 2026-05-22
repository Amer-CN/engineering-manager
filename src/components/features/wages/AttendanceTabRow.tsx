import React from 'react'
import { summaryDot, summaryLabel } from '../../../constants/attendance'
import type { DayStatus } from '../../../types/electron'

interface AttendanceTabRowProps {
  a: any
  isSelected: boolean
  daysInMonth: number
  onToggleSelect: (id: number) => void
  onOpenDetail: (record: any) => void
  onOpenHistory?: (projectWorkerId: number, workerName: string, teamName: string) => void
  onDelete: (record: any) => void
}

export const AttendanceTabRow = React.memo(function AttendanceTabRow({
  a,
  isSelected,
  daysInMonth,
  onToggleSelect,
  onOpenDetail,
  onOpenHistory,
  onDelete,
}: AttendanceTabRowProps) {
  const team = (a as any).teamName ? { name: (a as any).teamName } : undefined
  const workCount = a.workDays || 0
  let holidayCount = 0, sickCount = 0, personalCount = 0
  const dailyStatus = a.dailyStatus || {}
  for (let d = 1; d <= daysInMonth; d++) {
    const s = dailyStatus[d]
    if (!s) continue
    if (s === 'holiday') holidayCount++
    else if (s === 'sick_leave') sickCount++
    else if (s === 'personal_leave') personalCount++
  }
  type SummaryItem = { status: DayStatus; count: number }
  const summaryItems: SummaryItem[] = ([
    { status: 'work' as DayStatus, count: workCount }, { status: 'holiday' as DayStatus, count: holidayCount },
    { status: 'sick_leave' as DayStatus, count: sickCount }, { status: 'personal_leave' as DayStatus, count: personalCount },
  ] as SummaryItem[]).filter(item => item.count > 0)

  return (
    <tr className="border-t border-slate-100 table-row-hover">
      <td className="px-3 py-3">
        <input type="checkbox" checked={isSelected}
          onChange={() => onToggleSelect(a.id)} className="rounded" />
      </td>
      <td className="px-4 py-3 font-medium">{a.memberName || '-'}</td>
      <td className="px-4 py-3 text-slate-500">{team?.name || '-'}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {summaryItems.map(item => (
            <span key={item.status} className="inline-flex items-center gap-1 whitespace-nowrap">
              <span className={`w-2 h-2 rounded-full ${summaryDot[item.status]}`}></span>
              <span className="text-slate-600">{summaryLabel[item.status]}</span>
              <span className="font-medium text-slate-700">{item.count}天</span>
            </span>
          ))}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button onClick={() => onOpenDetail(a)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium">编辑</button>
          <button onClick={() => onOpenHistory?.((a as any).projectWorkerId, a.memberName || '', (a as any).teamName || '')}
            className="text-indigo-500 hover:text-indigo-700 text-sm">历史</button>
          <button onClick={() => onDelete(a)}
            className="text-red-400 hover:text-red-600 text-sm" title="删除考勤">删除</button>
        </div>
      </td>
    </tr>
  )
})
