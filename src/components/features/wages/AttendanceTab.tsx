import React from 'react'
import type { Member, Project, WorkerTeam, AttendanceRecord, DayStatus } from '@/types'
import { Icon } from '../../ui/Icon'
import { FILE_CATEGORIES, uploadFile, readUploadedFile, deleteUploadedFile, readFileAsDataUrl } from '../../../services/fileService'

interface AttendanceTabProps {
  selectedProject: Project | null
  selectedMonth: string
  daysInMonth: number
  members: Member[]
  workerTeams: WorkerTeam[]
  attendances: AttendanceRecord[]
  projectMemberCount: number
  uploadingFileId: number | null
  setUploadingFileId: (id: number | null) => void
  selectedIds: Set<number>
  toggleSelect: (id: number) => void
  toggleAll: () => void
  onGenerateAttendance: () => void
  onOpenDetail: (record: AttendanceRecord) => void
  onDelete: (record: AttendanceRecord) => void
  onFileUpload: (record: AttendanceRecord, file: File) => void
  onFileDelete: (record: AttendanceRecord) => void
  onFilePreview: (record: AttendanceRecord) => void
  onBatchDelete: () => void
  loading: boolean
}

const summaryDot: Record<DayStatus, string> = {
  work: 'bg-emerald-500', holiday: 'bg-blue-500', sick_leave: 'bg-amber-500',
  personal_leave: 'bg-orange-500', absent: 'bg-red-500',
}
const summaryLabel: Record<DayStatus, string> = {
  work: '出勤', holiday: '法定假', sick_leave: '病假', personal_leave: '事假', absent: '缺勤',
}

export default function AttendanceTab({
  selectedProject, selectedMonth, daysInMonth, members, workerTeams,
  attendances, projectMemberCount, uploadingFileId, setUploadingFileId,
  selectedIds, toggleSelect, toggleAll, onGenerateAttendance, onOpenDetail,
  onDelete, onFileUpload, onFileDelete, onFilePreview, onBatchDelete, loading,
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
          <div className="text-slate-500">
            {projectMemberCount} 名成员 | 当月天数: {daysInMonth} 天
          </div>
          {selectedIds.size > 0 && (
            <button onClick={onBatchDelete}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
              删除选中 ({selectedIds.size})
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={onGenerateAttendance} disabled={loading}
            className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            生成默认考勤
          </button>
        </div>
      </div>

      {attendances.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Icon name="ClipboardFile" size={48} className="mx-auto mb-4" />
          <p>暂无考勤记录</p>
          <p className="text-sm mt-1">点击"生成默认考勤"为项目成员创建考勤</p>
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
                <th className="px-4 py-3 font-medium text-slate-600">类型</th>
                <th className="px-4 py-3 font-medium text-slate-600">班组</th>
                <th className="px-4 py-3 font-medium text-slate-600">考勤摘要</th>
                <th className="px-4 py-3 font-medium text-slate-600">状态</th>
                <th className="px-4 py-3 font-medium text-slate-600">考勤附件</th>
                <th className="px-4 py-3 font-medium text-slate-600">操作</th>
              </tr>
            </thead>
            <tbody>
              {attendances.map(a => {
                const member = members.find(m => m.id === a.memberId)
                const team = workerTeams.find(t => t.id === member?.teamId)
                const dailyStatus = a.dailyStatus || {}
                let workCount = 0, holidayCount = 0, sickCount = 0, personalCount = 0, absentCount = 0
                for (let d = 1; d <= daysInMonth; d++) {
                  const s = dailyStatus[d] || 'work'
                  if (s === 'work') workCount++
                  else if (s === 'holiday') holidayCount++
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
                  <tr key={a.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-3">
                      <input type="checkbox" checked={selectedIds.has(a.id)}
                        onChange={() => toggleSelect(a.id)} className="rounded" />
                    </td>
                    <td className="px-4 py-3 font-medium">{a.memberName || member?.name || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        member?.memberType === 'staff' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                        {member?.memberType === 'staff' ? '管理' : '工人'}
                      </span>
                    </td>
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
                      {member?.memberType === 'worker' ? (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600">日薪制</span>
                      ) : a.isFullAttendance ? (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700">全勤</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">缺勤</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {!a.fileUrl ? (
                          <button
                            onClick={() => document.getElementById(`att-file-${a.id}`)?.click()}
                            disabled={uploadingFileId === a.id}
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded transition-colors" title="上传考勤附件">
                            <Icon name={uploadingFileId === a.id ? 'Loader2' : 'Paperclip'} size={15} />
                          </button>
                        ) : (
                          <div className="flex items-center gap-1 max-w-[120px]">
                            <button onClick={() => onFilePreview(a)}
                              className="text-blue-600 hover:text-blue-800 text-xs underline flex items-center gap-1 truncate" title={a.fileName || '预览'}>
                              {a.fileName?.match(/\.(xlsx?)$/i) ? <Icon name="File" size={14} /> :
                               a.fileName?.match(/\.pdf$/i) ? <Icon name="FileText" size={14} /> :
                               <Icon name="Image" size={14} />}
                              <span className="truncate">{a.fileName}</span>
                            </button>
                            <button onClick={() => onFileDelete(a)}
                              className="p-1 text-red-400 hover:text-red-600 rounded flex-shrink-0" title="删除附件">
                              <Icon name="X" size={14} />
                            </button>
                          </div>
                        )}
                        <input type="file" id={`att-file-${a.id}`} accept="image/*,.xlsx,.xls,.pdf" className="hidden"
                          onChange={e => {
                            const file = e.target.files?.[0]
                            if (file) onFileUpload(a, file)
                            e.target.value = ''
                          }} />
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
