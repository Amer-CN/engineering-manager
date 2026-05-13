/**
 * AttendanceDetail — 考勤详情子页面
 * 紧凑日历视图 + 逐日状态切换 + 附件管理
 */

import React, { useState } from 'react'
import type { AttendanceRecord, Member, DayStatus } from '@/types'
import { useToastContext } from '../hooks/useToast'
import { Icon } from './ui/Icon'
import { FILE_CATEGORIES, uploadFile, readUploadedFile, deleteUploadedFile, readFileAsDataUrl } from '../services/fileService'

// ═══════════════════════════════════════════════════════════════════════════════
// 常量
// ═══════════════════════════════════════════════════════════════════════════════

const CYCLE: DayStatus[] = ['work', 'holiday', 'sick_leave', 'personal_leave', 'absent']

const LABEL: Record<DayStatus, string> = {
  work: '出勤', holiday: '法定假', sick_leave: '病假', personal_leave: '事假', absent: '缺勤',
}

const CELL: Record<DayStatus, { bg: string; text: string; ring: string }> = {
  work:      { bg: 'bg-emerald-50 hover:bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-400' },
  holiday:   { bg: 'bg-blue-50 hover:bg-blue-100',       text: 'text-blue-700',    ring: 'ring-blue-400' },
  sick_leave:{ bg: 'bg-amber-50 hover:bg-amber-100',     text: 'text-amber-700',   ring: 'ring-amber-400' },
  personal_leave: { bg: 'bg-orange-50 hover:bg-orange-100', text: 'text-orange-700', ring: 'ring-orange-400' },
  absent:    { bg: 'bg-red-50 hover:bg-red-100',         text: 'text-red-700',     ring: 'ring-red-400' },
}

const DOT: Record<DayStatus, string> = {
  work: 'bg-emerald-500', holiday: 'bg-blue-500', sick_leave: 'bg-amber-500',
  personal_leave: 'bg-orange-500', absent: 'bg-red-500',
}

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

// ═══════════════════════════════════════════════════════════════════════════════
// Props
// ═══════════════════════════════════════════════════════════════════════════════

export interface AttendanceDetailProps {
  record: AttendanceRecord
  member: Member | undefined
  teamName: string
  yearMonth: string
  daysInMonth: number
  projectName: string
  onBack: () => void
  onSaved: () => void
}

// ═══════════════════════════════════════════════════════════════════════════════
// 组件
// ═══════════════════════════════════════════════════════════════════════════════

export default function AttendanceDetail({
  record, member, teamName, yearMonth, daysInMonth, projectName, onBack, onSaved,
}: AttendanceDetailProps) {
  const { showToast } = useToastContext()

  // 入职日：若 member.entryDate 落在当前月份内，取其日号；否则从1号开始
  const [year, month] = yearMonth.split('-').map(Number)
  const entryDay = (() => {
    if (!member?.entryDate) return 1
    const ed = member.entryDate // e.g. "2022-11-20"
    const [ey, em, ed2] = ed.split('-').map(Number)
    if (ey === year && em === month) return ed2
    return 1
  })()

  // 本地编辑状态
  const [dailyStatus, setDailyStatus] = useState<Record<number, DayStatus>>(() => {
    const existing = record.dailyStatus || {}
    const filled: Record<number, DayStatus> = {}
    for (let d = 1; d <= daysInMonth; d++) {
      if (d < entryDay) { filled[d] = existing[d] || 'work'; continue }
      filled[d] = existing[d] || 'work'
    }
    return filled
  })
  const [activeStatus, setActiveStatus] = useState<DayStatus>('work')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  // 当月第一天周几
  const firstDow = new Date(year, month - 1, 1).getDay()
  const leadingBlanks = firstDow === 0 ? 6 : firstDow - 1

  // 今天
  const today = new Date()
  const todayNum = (today.getFullYear() === year && today.getMonth() === month - 1) ? today.getDate() : null

  // 统计（仅计算入职日及之后的天数）
  const counts: Record<DayStatus, number> = { work: 0, holiday: 0, sick_leave: 0, personal_leave: 0, absent: 0 }
  for (let d = entryDay; d <= daysInMonth; d++) counts[dailyStatus[d] || 'work']++

  // 画笔：左键涂 activeStatus，右键循环切换（入职日前不可操作）
  const paintDay = (day: number) => {
    if (day < entryDay) return
    setDailyStatus(prev => ({ ...prev, [day]: activeStatus }))
  }

  const paintRange = (from: number, to: number) => {
    const start = Math.max(Math.min(from, to), entryDay)
    const end = Math.max(from, to)
    if (start > end) return
    setDailyStatus(prev => {
      const next = { ...prev }
      for (let d = start; d <= end; d++) next[d] = activeStatus
      return next
    })
  }

  const cycleDay = (day: number) => {
    if (day < entryDay) return
    setDailyStatus(prev => {
      const current = prev[day] || 'work'
      const idx = CYCLE.indexOf(current)
      return { ...prev, [day]: CYCLE[(idx + 1) % CYCLE.length] }
    })
  }

  const [shiftAnchor, setShiftAnchor] = useState<number | null>(null)

  const handleDayClick = (day: number, e: React.MouseEvent) => {
    if (day < entryDay) return
    if (e.shiftKey && shiftAnchor !== null) {
      paintRange(shiftAnchor, day)
    } else {
      paintDay(day)
      setShiftAnchor(day)
    }
  }

  const handleDayContextMenu = (day: number, e: React.MouseEvent) => {
    e.preventDefault()
    cycleDay(day)
  }

  // 保存
  const handleSave = async () => {
    setSaving(true)
    try {
      const result = await window.electronAPI.updateAttendance({ ...record, dailyStatus })
      if (result.success) { showToast('考勤已保存', 'success'); onSaved() }
      else showToast(result.error || '保存失败', 'error')
    } catch (e: any) { showToast(e?.message || '保存失败', 'error') }
    finally { setSaving(false) }
  }

  // 附件
  const handleFileUpload = async (file: File) => {
    setUploading(true)
    try {
      const dataUrl = await readFileAsDataUrl(file)
      const storedName = await uploadFile(FILE_CATEGORIES.ATTENDANCE_FILE.category, FILE_CATEGORIES.ATTENDANCE_FILE.subCategory, dataUrl, file.name, projectName)
      await window.electronAPI.updateAttendance({ ...record, dailyStatus, fileUrl: storedName, fileName: file.name })
      showToast('附件已上传', 'success')
      onSaved()
    } catch (e: any) { showToast(e?.message || '上传失败', 'error') }
    finally { setUploading(false) }
  }

  const handlePreview = async () => {
    if (!record.fileUrl) return
    try {
      const dataUrl = await readUploadedFile(FILE_CATEGORIES.ATTENDANCE_FILE.category, FILE_CATEGORIES.ATTENDANCE_FILE.subCategory, record.fileUrl, projectName)
      if (!dataUrl) { showToast('无法读取文件', 'error'); return }
      const isImage = record.fileName ? /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(record.fileName) : false
      if (isImage) {
        const win = window.open('', '_blank')
        if (win) { win.document.write(`<img src="${dataUrl}" style="max-width:100%;max-height:100vh;display:block;margin:auto;" />`); win.document.title = record.fileName || '预览' }
      } else {
        const a = document.createElement('a'); a.href = dataUrl; a.download = record.fileName || '考勤附件'; a.click()
      }
    } catch { showToast('文件读取失败', 'error') }
  }

  const handleDeleteFile = async () => {
    if (!record.fileUrl) return
    try {
      await deleteUploadedFile(FILE_CATEGORIES.ATTENDANCE_FILE.category, FILE_CATEGORIES.ATTENDANCE_FILE.subCategory, record.fileUrl, projectName)
      await window.electronAPI.updateAttendance({ ...record, dailyStatus, fileUrl: '', fileName: '' })
      showToast('附件已删除', 'success')
      onSaved()
    } catch (e: any) { showToast(e?.message || '删除失败', 'error') }
  }

  // ════════════════════════════════════════════════════════════════════
  // 渲染
  // ════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-4">
      {/* 顶部栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="flex items-center gap-1 px-2 py-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200 hover:bg-slate-100 rounded-lg transition-colors">
            <Icon name="ChevronLeft" size={18} /><span className="text-sm">返回</span>
          </button>
          <h2 className="text-lg font-bold text-slate-800">{record.memberName || member?.name || '-'}</h2>
          <span className="text-sm text-slate-400">{yearMonth}</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${member?.memberType === 'staff' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
            {member?.memberType === 'staff' ? '管理' : '工人'}
          </span>
          <span className="text-xs text-slate-400">{teamName}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={async () => {
            if (!confirm(`确认删除 ${record.memberName || member?.name || '该员工'} ${yearMonth} 的考勤记录吗？此操作不可撤销。`)) return
            try {
              const result = await window.electronAPI.deleteAttendance(record.id)
              if (result.success) { showToast('已删除', 'success'); onSaved(); onBack() }
              else showToast(result.error || '删除失败', 'error')
            } catch (e: any) { showToast(e?.message || '删除失败', 'error') }
          }} className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg text-sm transition-colors" title="删除此考勤记录">
            <Icon name="Trash2" size={16} />
          </button>
          <button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors">
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      {/* 主体卡片 */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-5 space-y-4">

        {/* 画笔工具栏 */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            {CYCLE.map(s => {
              const isActive = s === activeStatus
              return (
                <button
                  key={s}
                  onClick={() => setActiveStatus(s)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-white dark:bg-slate-800 shadow text-slate-800 dark:text-slate-100 ring-1 ring-slate-200'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <span className={`w-3 h-3 rounded-sm ${DOT[s]}`}></span>
                  {LABEL[s]}
                </button>
              )
            })}
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            {CYCLE.map(s => (
              <span key={s} className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${DOT[s]}`}></span>
                <span className="font-medium text-slate-700">{counts[s]}</span>天
              </span>
            ))}
          </div>
        </div>

        {/* 操作提示 */}
        <div className="text-xs text-slate-400">
          选一个状态 → <strong>点日期</strong>标记当天 · 按住 <strong>Shift</strong> 再点另一个日期，<strong>整段一起标</strong> · <strong>右键</strong>快速切换单天
        </div>

        {/* 日历网格 */}
        <div>
          {/* 列头 */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map((wd, i) => (
              <div key={wd} className={`text-center text-xs py-1 ${i >= 5 ? 'text-slate-300' : 'text-slate-400'}`}>
                {wd}
              </div>
            ))}
          </div>
          {/* 日期 */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: leadingBlanks }, (_, i) => <div key={`b-${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1
              const isBeforeEntry = day < entryDay
              const status = dailyStatus[day] || 'work'
              const col = isBeforeEntry ? { bg: 'bg-slate-100', text: 'text-slate-300', ring: 'ring-slate-200' } : CELL[status]
              const dow = (leadingBlanks + day - 1) % 7
              const isWeekend = dow >= 5
              const isToday = day === todayNum && !isBeforeEntry
              const isAnchor = day === shiftAnchor && !isBeforeEntry
              return (
                <button
                  key={day}
                  onClick={e => handleDayClick(day, e)}
                  onContextMenu={e => handleDayContextMenu(day, e)}
                  disabled={isBeforeEntry}
                  className={`h-9 rounded-md text-sm font-medium transition-all border
                    ${isBeforeEntry ? 'bg-slate-100 text-slate-300 cursor-not-allowed border-slate-100' : `cursor-pointer ${col.bg} ${col.text} ${isAnchor ? `ring-2 ${col.ring}` : 'border-transparent'} ${isWeekend ? 'bg-opacity-70' : ''} hover:scale-105 hover:shadow-sm`}
                    ${isToday ? 'ring-1 ring-slate-400 shadow-sm' : ''}`}
                  title={isBeforeEntry ? '入职前，不计入考勤' : `${day}日 ${LABEL[status]}${isToday ? ' (今天)' : ''}${isAnchor ? ' — Shift+点击其他日期批量涂色' : ''}\n右键: 循环切换`}
                >
                  {isBeforeEntry ? <span className="text-[10px]">-</span> : day}
                </button>
              )
            })}
          </div>
        </div>

        {/* 底部：附件 + 汇总 */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          {/* 附件 */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">凭证：</span>
            {record.fileUrl ? (
              <div className="flex items-center gap-1.5 text-xs bg-slate-50 rounded-lg px-2 py-1">
                {record.fileName?.match(/\.(xlsx?)$/i) ? <Icon name="File" size={14} className="text-emerald-600" /> :
                 record.fileName?.match(/\.pdf$/i) ? <Icon name="FileText" size={14} className="text-red-500" /> :
                 <Icon name="Image" size={14} className="text-blue-500" />}
                <span className="text-slate-600 max-w-[120px] truncate">{record.fileName}</span>
                <button onClick={handlePreview} className="text-blue-600 hover:text-blue-800 ml-1">预览</button>
                <button onClick={handleDeleteFile} className="text-red-400 hover:text-red-600">删除</button>
              </div>
            ) : (
              <>
                <button onClick={() => document.getElementById('att-file')?.click()} disabled={uploading}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-500 transition-colors">
                  <Icon name={uploading ? 'Loader2' : 'Paperclip'} size={13} />
                  {uploading ? '上传中...' : '上传'}
                </button>
                <input type="file" id="att-file" accept="image/*,.xlsx,.xls,.pdf" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = '' }} />
              </>
            )}
          </div>

          {/* 汇总 */}
          <div className="text-xs text-slate-500">
            应出勤 <span className="font-medium text-slate-700">{daysInMonth - counts.holiday}</span> 天
            &nbsp;·&nbsp; 实出勤 <span className="font-medium text-emerald-600">{counts.work}</span> 天
            &nbsp;·&nbsp; 休假 <span className="font-medium text-slate-700">{daysInMonth - counts.work}</span> 天
          </div>
        </div>
      </div>
    </div>
  )
}
