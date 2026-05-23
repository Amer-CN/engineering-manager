import { useState, useMemo, useRef } from 'react'
import type { Project, WorkerTeam, AttendanceRecord } from '@/types'
import { Icon } from '../../ui/Icon'
import { AttendanceTabRow } from './AttendanceTabRow'

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
  onChangeMonth: (month: string) => void
}

export default function AttendanceTab({
  selectedProject, selectedMonth, daysInMonth, workerTeams,
  attendances, projectMemberCount,
  selectedIds, toggleSelect, toggleAll, onGenerateAttendance, onOpenDetail,
  onDelete, onBatchDelete, loading,
  onOpenHistory, onImportAttendance, onChangeMonth,
}: AttendanceTabProps) {
  const [filterTeamId, setFilterTeamId] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const filteredAttendances = useMemo(() => {
    if (!filterTeamId) return attendances
    return attendances.filter(a => (a as any).teamId === filterTeamId)
  }, [attendances, filterTeamId])

  if (!selectedProject) {
    return (
      <div className="p-4 text-center py-12 text-slate-400">
        <Icon name="ClipboardFile" size={48} className="mx-auto mb-4" />
        <p>请先选择项目和月份</p>
      </div>
    )
  }

  return (
    <div className="p-4 flex flex-col max-h-[calc(100vh-380px)]">
      <div className="shrink-0 flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <input type="month" value={selectedMonth} onChange={e => onChangeMonth(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" />
          <select value={filterTeamId ?? ''} onChange={e => setFilterTeamId(e.target.value ? Number(e.target.value) : null)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500">
            <option value="">全部班组</option>
            {workerTeams.filter(t => t.projectId === selectedProject.id).map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <div className="text-slate-500">
            {filteredAttendances.length} / {attendances.length} 人 | 当月天数: {daysInMonth} 天
          </div>
          {selectedIds.size > 0 && (
            <button onClick={onBatchDelete}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
              删除选中 ({selectedIds.size})
            </button>
          )}
        </div>
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
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >导入考勤</button>
          <button onClick={onGenerateAttendance} disabled={loading}
            className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            生成默认考勤
          </button>
        </div>
      </div>

      {filteredAttendances.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Icon name="ClipboardFile" size={48} className="mx-auto mb-4" />
          <p>暂无考勤记录</p>
          <p className="text-sm mt-1">点击"生成默认考勤"为项目工人创建考勤</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto min-h-0">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50">
              <tr className="text-left">
                <th className="px-3 py-3 w-10">
                  <input type="checkbox"
                    checked={selectedIds.size === filteredAttendances.length && filteredAttendances.length > 0}
                    onChange={toggleAll} className="rounded" />
                </th>
                <th className="px-4 py-3 font-medium text-slate-600">姓名</th>
                <th className="px-4 py-3 font-medium text-slate-600">班组</th>
                <th className="px-4 py-3 font-medium text-slate-600">考勤摘要</th>
                <th className="px-4 py-3 font-medium text-slate-600">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredAttendances.map(a => (
                <AttendanceTabRow
                  key={a.id}
                  a={a}
                  isSelected={selectedIds.has(a.id)}
                  daysInMonth={daysInMonth}
                  onToggleSelect={toggleSelect}
                  onOpenDetail={onOpenDetail}
                  onOpenHistory={onOpenHistory}
                  onDelete={onDelete}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
