import React from 'react'
import { HR_STATUS_LABELS, HR_STATUS_COLORS } from './config'
import { Button } from '../../ui/Button'

interface StaffListRowProps {
  m: any
  deptName: string
  onEdit: (m: any) => void
  onStatusChange: (m: any, newStatus: string) => void
  onSalaryHistory: (m: any) => void
  onDelete: (id: number) => void
}

export const StaffListRow = React.memo(function StaffListRow({
  m,
  deptName,
  onEdit,
  onStatusChange,
  onSalaryHistory,
  onDelete,
}: StaffListRowProps) {
  return (
    <tr className="hover:bg-[color:var(--panel-2)]">
      <td className="px-4 py-3 font-medium text-[color:var(--fg)]">{m.name}</td>
      <td className="px-4 py-3 text-sm text-[color:var(--fg-2)]">{deptName}</td>
      <td className="px-4 py-3 text-sm text-[color:var(--fg-2)]">{m.position || '-'}</td>
      <td className="px-4 py-3 text-sm text-[color:var(--fg-2)]">{m.phone || '-'}</td>
      <td className="px-4 py-3">
        <select value={m.status || 'active'} onChange={e => onStatusChange(m, e.target.value)}
          className={`status-badge px-2 py-1 rounded-full text-xs font-medium cursor-pointer ${HR_STATUS_COLORS[m.status || 'active'] || 'bg-[color:var(--panel-2)] text-[color:var(--fg-2)]'}`}>
          {Object.entries(HR_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </td>
      <td className="px-4 py-3 text-sm text-[color:var(--muted)]">{m.entryDate || '-'}</td>
      <td className="px-4 py-3 text-sm text-[color:var(--muted)]">{m.leaveDate || '-'}</td>
      <td className="px-4 py-3 text-center">
        <div className="flex items-center justify-center gap-1">
          <Button onClick={() => onEdit(m)}  variant="ghost" size="sm" className="text-[color:var(--accent)]">编辑</Button>
          <Button onClick={() => onSalaryHistory(m)}  title="薪资历史" variant="ghost" size="sm" className="text-warning-600">薪资</Button>
          <Button onClick={() => { if (confirm("确定要删除 " + m.name + " 吗？")) onDelete(m.id) }}  title="删除" variant="ghost" size="sm" className="text-danger-500">删除</Button>
        </div>
      </td>
    </tr>
  )
})
