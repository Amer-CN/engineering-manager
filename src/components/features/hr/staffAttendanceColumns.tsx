import React from 'react'
import { Icon } from '../../../ui/Icon'
import type { Column } from '../../../DataTable'

/**
 * StaffAttendance columns 工厂（v1.1.0 拆分自 StaffAttendance）
 * 把 126 行的 DataTable 列定义抽出到独立文件，避免 StaffAttendance.tsx 超长
 *
 * 依赖通过 deps 注入（避免循环 import + 提升测试性）
 */
export interface AttendanceColumnDeps {
  rows: any[]
  selectedIds: Set<number>
  daysInMonth: number
  yearMonth: string
  summaryDot: Record<string, string>
  STATUS_META: any[]
  DayStatus: any
  computeAttendanceSummary: (dailyStatus: any, days: number, entryDay: number) => any
  toggleAll: () => void
  toggleSelect: (id: number) => void
  setTimelineMember: (member: any) => void
  openHistoryMonth: (memberId: number, ym: string) => void
  handleDelete: (record: any) => void
}

export function getAttendanceColumns(deps: AttendanceColumnDeps): Column<any>[] {
  const {
    rows,
    selectedIds,
    daysInMonth,
    yearMonth,
    summaryDot,
    STATUS_META,
    DayStatus,
    computeAttendanceSummary,
    toggleAll,
    toggleSelect,
    setTimelineMember,
    openHistoryMonth,
    handleDelete
  } = deps

  return [
    {
      key: 'checkbox', title: '', width: '40px',
      headerRender: (
        <input type="checkbox"
          checked={rows.length > 0 && rows.every(r => r.att && selectedIds.has(r.att.id))}
          onChange={toggleAll} className="rounded" />
      ),
      render: (item: any) => {
        const row = rows.find(r => r.s.id === item.id)
        if (!row) return null
        return row.att && (
          <input type="checkbox" checked={row.isSelected}
            onChange={() => toggleSelect(row.att!.id)} className="rounded" />
        )
      }
    },
    {
      key: 'name', title: '姓名',
      render: (item: any) => {
        const row = rows.find(r => r.s.id === item.id)
        if (!row) return null
        return (
          <button onClick={() => setTimelineMember(row.s)}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline text-left">
            {row.s.name}
          </button>
        )
      }
    },
    {
      key: 'departmentId', title: '部门',
      render: (item: any) => {
        const row = rows.find(r => r.s.id === item.id)
        if (!row) return null
        return <span className="text-slate-500">{row.deptName}</span>
      }
    },
    {
      key: 'attendance', title: '当月考勤',
      render: (item: any) => {
        const row = rows.find(r => r.s.id === item.id)
        if (!row) return null
        const att = row.att
        const ready = !!(att && att.dailyStatus && Object.keys(att.dailyStatus).length > 0)
        const summary = computeAttendanceSummary(att?.dailyStatus, daysInMonth, row.entryDay)
        const summaryItems = (STATUS_META.filter(x => x.key !== undefined) as { key: any; label: string; color: string }[])
          .map(st => ({ ...st, count: summary.counts[st.key] }))
          .filter(item => item.count > 0)
        return ready ? (
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {summaryItems.map(si => (
              <span key={si.key} className="inline-flex items-center gap-1 whitespace-nowrap">
                <span className={`w-2 h-2 rounded-full ${summaryDot[si.key]}`} />
                <span className="text-slate-600">{si.label}</span>
                <span className="font-medium text-slate-700">{si.count}天</span>
              </span>
            ))}
          </div>
        ) : (
          <span className="text-xs text-slate-400">未标记</span>
        )
      }
    },
    {
      key: 'status', title: '状态', align: 'center',
      render: (item: any) => {
        const row = rows.find(r => r.s.id === item.id)
        if (!row) return null
        const att = row.att
        const ready = !!(att && att.dailyStatus && Object.keys(att.dailyStatus).length > 0)
        const summary = computeAttendanceSummary(att?.dailyStatus, daysInMonth, row.entryDay)
        return ready ? (
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
        )
      }
    },
    {
      key: 'history', title: '历史考勤',
      render: (item: any) => {
        const row = rows.find(r => r.s.id === item.id)
        if (!row) return null
        const historyYears = [...new Set(row.historyMonths.map((ym: string) => ym.slice(0, 4)))].sort()
        return row.historyMonths.length > 0 ? (
          <button onClick={() => setTimelineMember(row.s)}
            className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline">
            {historyYears.length}年 · {row.historyMonths.length}个月
          </button>
        ) : (
          <span className="text-xs text-slate-300">-</span>
        )
      }
    },
    {
      key: 'actions', title: '操作', align: 'center',
      render: (item: any) => {
        const row = rows.find(r => r.s.id === item.id)
        if (!row) return null
        return (
          <div className="flex items-center justify-center gap-1">
            {row.att ? (
              <>
                <button onClick={() => openHistoryMonth(row.s.id, yearMonth)}
                  className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">编辑</button>
                <button onClick={() => handleDelete(row.att)}
                  className="text-red-400 hover:text-red-600 text-sm">删除</button>
              </>
            ) : (
              <button onClick={() => openHistoryMonth(row.s.id, yearMonth)}
                className="text-indigo-600 hover:text-indigo-800 text-sm">创建</button>
            )}
          </div>
        )
      }
    },
  ]
}