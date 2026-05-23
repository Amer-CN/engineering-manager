import React from 'react'
import { HR_STATUS_LABELS, HR_STATUS_COLORS } from './config'

interface StaffListRowProps {
  m: any
  deptName: string
  onEdit: (m: any) => void
  onStatusChange: (m: any, newStatus: string) => void
  onSalaryHistory: (m: any) => void
}

export const StaffListRow = React.memo(function StaffListRow({
  m,
  deptName,
  onEdit,
  onStatusChange,
  onSalaryHistory,
}: StaffListRowProps) {
  return (
    <tr className="hover:bg-slate-50">
      <td className="px-4 py-3 font-medium text-slate-800">{m.name}</td>
      <td className="px-4 py-3 text-sm text-slate-600">{deptName}</td>
      <td className="px-4 py-3 text-sm text-slate-600">{m.position || '-'}</td>
      <td className="px-4 py-3 text-sm text-slate-600">{m.phone || '-'}</td>
      <td className="px-4 py-3">
        <select value={m.status || 'active'} onChange={e => onStatusChange(m, e.target.value)}
          className={`px-2 py-1 rounded-full text-xs font-medium border-0 ${HR_STATUS_COLORS[m.status || 'active'] || 'bg-slate-100 text-slate-600'}`}>
          {Object.entries(HR_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </td>
      <td className="px-4 py-3 text-sm text-slate-500">{m.entryDate || '-'}</td>
      <td className="px-4 py-3 text-sm text-slate-500">{m.leaveDate || '-'}</td>
      <td className="px-4 py-3 text-center">
        <div className="flex items-center justify-center gap-1">
          <button onClick={() => onEdit(m)} className="px-3 py-1 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg">编辑</button>
          <button onClick={() => onSalaryHistory(m)} className="px-2 py-1 text-xs text-amber-600 hover:bg-amber-50 rounded-lg" title="薪资历史">薪资</button>
        </div>
      </td>
    </tr>
  )
})
