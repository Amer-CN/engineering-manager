import { useRef } from 'react'
import type { Project, WorkerTeam, AttendanceRecord } from '@/types'
import { summaryDot, summaryLabel } from '../../../constants/attendance'
import type { DayStatus } from '../../../types/electron'
import { EmptyState } from '../../ui/EmptyState'
import FilterBar from '../../ui/FilterBar'
import { DataTable, type Column } from '@/components/DataTable'

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
  onOpenHistory?: (projectWorkerId: number, workerName: string, teamName: string) => void
  onImportAttendance: (data: { projectWorkerId: number; workDays: number; workerName: string }[]) => void
}

export default function AttendanceTab({
  selectedProject, selectedMonth, daysInMonth, workerTeams,
  attendances, projectMemberCount,
  selectedIds, toggleSelect, toggleAll, onGenerateAttendance, onOpenDetail,
  onDelete, onBatchDelete, loading,
  onOpenHistory, onImportAttendance,}: AttendanceTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const filteredAttendances = attendances

  if (!selectedProject) {
    return (
      <div className="p-4">
        <EmptyState icon="ClipboardFile" title="请先选择项目和月份" />
      </div>
    )
  }

  const columns: Column<any>[] = [
    {
      key: 'select',
      title: '',
      width: '40px',
      render: (item) => (
        <input type="checkbox" checked={selectedIds.has(item.id)}
          onChange={() => toggleSelect(item.id)} className="rounded" />
      )
    },
    {
      key: 'memberName',
      title: '姓名',
      render: (item) => (
        <span className="font-medium">{item.memberName || '-'}</span>
      )
    },
    {
      key: 'teamName',
      title: '班组',
      filterable: 'select',
      filterOptions: workerTeams
        .filter(t => t.projectId === selectedProject?.id)
        .map(t => ({ label: t.name, value: t.name })),
      filterAccessor: (item: any) => item.teamName || '',
      render: (item) => (
        <span className="text-slate-500">{(item as any).teamName || '-'}</span>
      )
    },
    {
      key: 'summary',
      title: '考勤摘要',
      render: (item) => {
        const workCount = item.workDays || 0
        let holidayCount = 0, sickCount = 0, personalCount = 0
        const dailyStatus = item.dailyStatus || {}
        for (let d = 1; d <= daysInMonth; d++) {
          const s = dailyStatus[d]
          if (!s) continue
          if (s === 'holiday') holidayCount++
          else if (s === 'sick_leave') sickCount++
          else if (s === 'personal_leave') personalCount++
        }
        type SummaryItem = { status: DayStatus; count: number }
        const summaryItems: SummaryItem[] = ([
          { status: 'work' as DayStatus, count: workCount },
          { status: 'holiday' as DayStatus, count: holidayCount },
          { status: 'sick_leave' as DayStatus, count: sickCount },
          { status: 'personal_leave' as DayStatus, count: personalCount },
        ] as SummaryItem[]).filter(si => si.count > 0)

        return (
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {summaryItems.map(si => (
              <span key={si.status} className="inline-flex items-center gap-1 whitespace-nowrap">
                <span className={`w-2 h-2 rounded-full ${summaryDot[si.status]}`}></span>
                <span className="text-slate-600">{summaryLabel[si.status]}</span>
                <span className="font-medium text-slate-700">{si.count}天</span>
              </span>
            ))}
          </div>
        )
      }
    },
    {
      key: 'actions',
      title: '操作',
      render: (item) => (
        <div className="flex items-center gap-2">
          <button onClick={() => onOpenDetail(item)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium">编辑</button>
          <button onClick={() => onOpenHistory?.((item as any).projectWorkerId, item.memberName || '', (item as any).teamName || '')}
            className="text-indigo-500 hover:text-indigo-700 text-sm">历史</button>
          <button onClick={() => onDelete(item)}
            className="text-red-400 hover:text-red-600 text-sm">删除</button>
        </div>
      )
    }
  ]

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <FilterBar className="mb-6">
        <div className="flex items-center gap-3">
          <input type="checkbox"
            checked={selectedIds.size === filteredAttendances.length && filteredAttendances.length > 0}
            onChange={toggleAll} className="rounded" />
          <div className="text-slate-500">
            {filteredAttendances.length} / {attendances.length} 人 | 当月天数: {daysInMonth} 天
          </div>
          {selectedIds.size > 0 && (
            <button onClick={onBatchDelete}
              className="btn btn-danger btn-sm">
              删除选中 ({selectedIds.size})
            </button>
          )}
        </div>
        <div className="flex-1" />
        <div className="flex gap-2">
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            style={{ display: 'none' }}
            ref={fileInputRef}
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              try {
                const text = await file.text()
                const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
                const header = lines[0].split(',').map(h => h.trim())
                const pIdx = header.findIndex(h => h.includes('pwId') || h.includes('projectWorkerId') || h.includes('id'))
                const dIdx = header.findIndex(h => h.includes('workDays') || h.includes('days'))
                const nameIdx = header.findIndex(h => h.includes('name') || h.includes('worker'))
                const result: { projectWorkerId: number; workDays: number; workerName: string }[] = []
                for (let i = 1; i < lines.length; i++) {
                  const cols = lines[i].split(',').map(c => c.trim())
                  result.push({
                    projectWorkerId: pIdx >= 0 ? Number(cols[pIdx]) : 0,
                    workDays: dIdx >= 0 ? Number(cols[dIdx]) : 0,
                    workerName: nameIdx >= 0 ? cols[nameIdx] : '',
                  })
                }
                onImportAttendance(result)
              } catch (err) { console.error('解析考勤文件失败:', err) }
            }}
          />
          <button
            onClick={() => { fileInputRef.current?.click() }}
            className="btn btn-primary btn-sm">导入考勤</button>
          <button onClick={onGenerateAttendance} disabled={loading}
            className="btn btn-warning btn-sm">
            生成默认考勤
          </button>
        </div>
      </FilterBar>

      <DataTable
        data={filteredAttendances}
        columns={columns}
        rowKey="id"
        pagination={false}
        useHoverScrollbar={true}
        scrollClassName="h-full"
        emptyText="暂无考勤记录"
        emptyIcon="ClipboardFile"
      />
    </div>
  )
}
