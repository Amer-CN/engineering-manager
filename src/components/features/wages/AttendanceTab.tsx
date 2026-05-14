import React from 'react'
import type { Project, WorkerTeam, AttendanceRecord } from '@/types'
import { Icon } from '../../ui/Icon'
import { summaryDot, summaryLabel } from '../../../constants/attendance'
import type { DayStatus } from '../../../types/electron'

interface AttendanceTabProps {
  selectedProject: Project | null
  selectedMonth: string
  daysInMonth: number
  workerTeams: WorkerTeam[]
  attendances: AttendanceRecord[]
  projectMemberCount: number
  selectedIds: Set<number>
  toggleSelect: (id: number) => void
  toggleAll: () => void
  onGenerateAttendance: () => void
  onOpenDetail: (record: AttendanceRecord) => void
  onDelete: (record: AttendanceRecord) => void
  onBatchDelete: () => void
  loading: boolean
  onImportAttendance: () => void
  onChangeMonth: (month: string) => void
}

export default function AttendanceTab({
  selectedProject, selectedMonth, daysInMonth, workerTeams,
  attendances, projectMemberCount,
  selectedIds, toggleSelect, toggleAll, onGenerateAttendance, onOpenDetail,
  onDelete, onBatchDelete, loading,
  onImportAttendance, onChangeMonth,
}: AttendanceTabProps) {
  if (!selectedProject) {
    return (
      <div className="p-4 text-center py-12 text-slate-400">
        <Icon name="ClipboardFile" size={48} className="mx-auto mb-4" />
        <p>请先选择项目和月份</p>
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <input type="month" value={selectedMonth} onChange={e => onChangeMonth(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500" />
          <div className="text-slate-500">
            {projectMemberCount} 名工人 | 当月天数: {daysInMonth} 天
          </div>
          {selectedIds.size > 0 && (
            <button onClick={onBatchDelete}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
              删除选中 ({selectedIds.size})
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={onImportAttendance}
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            导入考勤
          </button>
          <button onClick={onGenerateAttendance} disabled={loading}
            className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            生成默认考勤
          </button>
        </div>
      </div>

      {attendances.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Icon name="ClipboardFile" size={48} className="mx-auto mb-4" />
          <p>暂无考勤记录</p>
          <p className="text-sm mt-1">点击"生成默认考勤"为项目工人创建考勤</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-3 py-3 w-10">
                  <input type="checkbox"
                    checked={selectedIds.size === attendances.length && attendances.length > 0}
                    onChange={toggleAll} className="rounded" />
                </th>
                <th className="px-4 py-3 font-medium text-slate-600">姓名</th>
                <th className="px-4 py-3 font-medium text-slate-600">班组</th>
                <th className="px-4 py-3 font-medium text-slate-600">考勤摘要</th>
                <th className="px-4 py-3 font-medium text-slate-600">操作</th>
              </tr>
            </thead>
            <tbody>
              {attendances.map(a => {
                const team = (a as any).teamName ? { name: (a as any).teamName } : undefined
                // 使用已持久化的 workDays（backend update/batchImport 均保持同步）
                // 不再从 dailyStatus 逐天计，避免未标记天数默认'work'导致膨胀
                const workCount = a.workDays || 0
                let holidayCount = 0, sickCount = 0, personalCount = 0, absentCount = 0
                const dailyStatus = a.dailyStatus || {}
                for (let d = 1; d <= daysInMonth; d++) {
                  const s = dailyStatus[d]
                  if (!s) continue // 未标记日不计数
                  if (s === 'holiday') holidayCount++
                  else if (s === 'sick_leave') sickCount++
                  else if (s === 'personal_leave') personalCount++
                  else if (s === 'absent') absentCount++
                }
                type SummaryItem = { status: DayStatus; count: number }
                const summaryItems: SummaryItem[] = ([
                  { status: 'work' as DayStatus, count: workCount }, { status: 'holiday' as DayStatus, count: holidayCount },
                  { status: 'sick_leave' as DayStatus, count: sickCount }, { status: 'personal_leave' as DayStatus, count: personalCount },
                  { status: 'absent' as DayStatus, count: absentCount },
                ] as SummaryItem[]).filter(item => item.count > 0)

                return (
                  <tr key={a.id} className="border-t border-slate-100 table-row-hover">
                    <td className="px-3 py-3">
                      <input type="checkbox" checked={selectedIds.has(a.id)}
                        onChange={() => toggleSelect(a.id)} className="rounded" />
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
                        <button onClick={() => onDelete(a)}
                          className="text-red-400 hover:text-red-600 text-sm" title="删除考勤">删除</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
