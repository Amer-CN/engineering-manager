import type { Column } from '@/components/DataTable'
import type { Member, AttendanceRecord, DayStatus } from '@/types/electron'
import type { StatusMeta } from '@/constants/attendance'

/**
 * StaffAttendance columns 工厂（v1.1.0 拆分自 StaffAttendance）
 * 把 126 行的 DataTable 列定义抽出到独立文件，避免 StaffAttendance.tsx 超长
 *
 * 依赖通过 deps 注入（避免循环 import + 提升测试性）
 */

/** 行数据结构：StaffAttendance 页面构造并传入 */
export interface AttendanceRow {
  s: Member
  att: AttendanceRecord | undefined
  isSelected: boolean
  deptName: string
  entryDay: number
  historyMonths: string[]
}

export interface AttendanceColumnDeps {
  rows: AttendanceRow[]
  selectedIds: Set<number>
  daysInMonth: number
  yearMonth: string
  summaryDot: Record<string, string>
  STATUS_META: StatusMeta[]
  computeAttendanceSummary: (dailyStatus: Record<number, DayStatus> | undefined, days: number, entryDay: number) => { counts: Record<DayStatus, number>; workDays: number; daysOff: number; applicableDays: number }
  toggleAll: () => void
  toggleSelect: (id: number) => void
  setTimelineMember: (member: Member) => void
  openHistoryMonth: (memberId: number, ym: string) => void
  handleDelete: (record: AttendanceRecord) => void
}

export function getAttendanceColumns(deps: AttendanceColumnDeps): Column<Member>[] {
  const {
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
      render: (item: Member) => {
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
      render: (item: Member) => {
        const row = rows.find(r => r.s.id === item.id)
        if (!row) return null
        return (
          <button onClick={() => setTimelineMember(row.s)}
            className="text-sm font-medium text-[color:var(--accent)] hover:opacity-80 hover:underline text-left">
            {row.s.name}
          </button>
        )
      }
    },
    {
      key: 'departmentId', title: '部门',
      render: (item: Member) => {
        const row = rows.find(r => r.s.id === item.id)
        if (!row) return null
        return <span className="text-[color:var(--muted)]">{row.deptName}</span>
      }
    },
    {
      key: 'attendance', title: '当月考勤',
      render: (item: Member) => {
        const row = rows.find(r => r.s.id === item.id)
        if (!row) return null
        const att = row.att
        const ready = !!(att && att.dailyStatus && Object.keys(att.dailyStatus).length > 0)
        const summary = computeAttendanceSummary(att?.dailyStatus, daysInMonth, row.entryDay)
        const summaryItems = STATUS_META.filter(x => x.key !== undefined)
          .map(st => ({ ...st, count: summary.counts[st.key!] }))
          .filter(item => item.count > 0)
        return ready ? (
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {summaryItems.map(si => (
              <span key={si.key} className="inline-flex items-center gap-1 whitespace-nowrap">
                <span className={`w-2 h-2 rounded-full ${summaryDot[si.key!]}`} />
                <span className="text-[color:var(--fg-2)]">{si.label}</span>
                <span className="font-medium text-[color:var(--fg-2)]">{si.count}天</span>
              </span>
            ))}
          </div>
        ) : (
          <span className="text-xs text-[color:var(--muted)]">未标记</span>
        )
      }
    },
    {
      key: 'status', title: '状态', align: 'center',
      render: (item: Member) => {
        const row = rows.find(r => r.s.id === item.id)
        if (!row) return null
        const att = row.att
        const ready = !!(att && att.dailyStatus && Object.keys(att.dailyStatus).length > 0)
        const summary = computeAttendanceSummary(att?.dailyStatus, daysInMonth, row.entryDay)
        return ready ? (
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
        )
      }
    },
    {
      key: 'history', title: '历史考勤',
      render: (item: Member) => {
        const row = rows.find(r => r.s.id === item.id)
        if (!row) return null
        const historyYears = [...new Set(row.historyMonths.map((ym: string) => ym.slice(0, 4)))].sort()
        return row.historyMonths.length > 0 ? (
          <button onClick={() => setTimelineMember(row.s)}
            className="text-xs text-[color:var(--accent)] hover:opacity-80 hover:underline">
            {historyYears.length}年 · {row.historyMonths.length}个月
          </button>
        ) : (
          <span className="text-xs text-[color:var(--border-strong)]">-</span>
        )
      }
    },
    {
      key: 'actions', title: '操作', align: 'center',
      render: (item: Member) => {
        const row = rows.find(r => r.s.id === item.id)
        if (!row) return null
        return (
          <div className="flex items-center justify-center gap-1">
            {row.att ? (
              <>
                <button onClick={() => openHistoryMonth(row.s.id, yearMonth)}
                  className="text-[color:var(--accent)] hover:opacity-80 text-sm font-medium">编辑</button>
                <button onClick={() => handleDelete(row.att!)}
                  className="text-danger-400 hover:text-danger-600 text-sm">删除</button>
              </>
            ) : (
              <button onClick={() => openHistoryMonth(row.s.id, yearMonth)}
                className="text-[color:var(--accent)] hover:opacity-80 text-sm">创建</button>
            )}
          </div>
        )
      }
    },
  ]
}