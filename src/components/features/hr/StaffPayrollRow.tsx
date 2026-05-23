import React from 'react'
import { Icon } from '../../ui/Icon'

interface StaffPayrollRowProps {
  wage: any
  staffName: string
  onPaidChange: (wage: any, field: string, value: any) => void
  onDeleteWage: (wage: any) => void
}

export const StaffPayrollRow = React.memo(function StaffPayrollRow({
  wage, staffName, onPaidChange, onDeleteWage,
}: StaffPayrollRowProps) {
  const ym = wage.yearMonth
  const diff = (wage.netSalary || 0) - (wage.deduction || 0) - (wage.paidAmount || 0)
  const wd = ym ? new Date(Number(ym.split('-')[0]), Number(ym.split('-')[1]), 0).getDate() : 30

  return (
    <tr className="hover:bg-slate-50">
      <td className="px-4 py-3 text-sm font-medium text-slate-800">{wage.memberName || staffName || '-'}</td>
      <td className="px-4 py-3 text-sm text-slate-600">{ym}</td>
      <td className="px-4 py-3 text-sm text-slate-600 text-right">{(wage.baseSalary || 0).toLocaleString()}</td>
      <td className="px-4 py-3 text-sm text-slate-600 text-center">{wage.attendanceDays} / {wd}</td>
      <td className="px-4 py-3 text-sm text-amber-600 text-right">{wage.subsidy > 0 ? `+${(wage.subsidy || 0).toLocaleString()}` : '-'}</td>
      <td className="px-4 py-3 text-sm text-right">
        <input type="number" defaultValue={wage.deduction || 0}
          onBlur={e => onPaidChange(wage, 'deduction', Number(e.target.value))}
          className="w-20 text-right px-2 py-1 border border-slate-200 rounded text-sm" />
      </td>
      <td className="px-4 py-3 text-sm font-medium text-slate-800 text-right">{((wage.netSalary || 0) - (wage.deduction || 0)).toLocaleString()}</td>
      <td className="px-4 py-3 text-center">
        <input type="number" defaultValue={wage.paidAmount || ''}
          onBlur={e => onPaidChange(wage, 'paidAmount', Number(e.target.value))}
          className="w-24 text-center px-2 py-1 border border-slate-200 rounded text-sm" placeholder="未发放" />
      </td>
      <td className="px-4 py-3 text-center">
        <input type="date" defaultValue={wage.paidDate || ''}
          onChange={e => onPaidChange(wage, 'paidDate', e.target.value)}
          className="px-2 py-1 border border-slate-200 rounded text-sm" />
      </td>
      <td className={`px-4 py-3 text-sm text-right font-medium ${diff === 0 ? 'text-emerald-600' : diff > 0 ? 'text-amber-600' : 'text-red-600'}`}>
        {diff === 0 ? '已结清' : diff.toLocaleString()}
      </td>
      <td className="px-4 py-3 text-center">
        <button onClick={() => onDeleteWage(wage)}
          className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded" title="删除此记录">
          <Icon name="Trash2" size={14} />
        </button>
      </td>
    </tr>
  )
})
