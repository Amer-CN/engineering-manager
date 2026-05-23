import React from 'react'
import { getWorkerTypeLabel } from '../../../utils'

function calcAge(birthDate: string): number {
  const birth = new Date(birthDate)
  if (isNaN(birth.getTime())) return 0
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

interface LaborWorkerRowProps {
  worker: any
  onEdit: (worker: any) => void
  onDelete: (workerId: number) => void
  onWageModal: (id: number, name: string) => void
}

export const LaborWorkerRow = React.memo(function LaborWorkerRow({
  worker,
  onEdit,
  onDelete,
  onWageModal,
}: LaborWorkerRowProps) {
  const age = worker.birthDate ? calcAge(worker.birthDate) : null
  const isOverage = age !== null && age > 60

  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="px-3 py-2.5 font-medium text-slate-800">{worker.name}</td>
      <td className="px-3 py-2.5 text-slate-500 font-mono text-xs">{worker.idCard || '-'}</td>
      <td className={`px-3 py-2.5 text-center text-sm font-medium ${isOverage ? 'text-red-600' : 'text-slate-600'}`}>
        {age !== null ? age : '-'}
      </td>
      <td className="px-3 py-2.5 text-slate-600">{worker.gender || '-'}</td>
      <td className="px-3 py-2.5 text-slate-600">{worker.workerType ? getWorkerTypeLabel(worker.workerType as any) : '-'}</td>
      <td className="px-3 py-2.5 text-right text-slate-700 font-medium">{worker.dailyWage ? `¥${worker.dailyWage}` : '-'}</td>
      <td className="px-3 py-2.5 text-slate-500 font-mono text-xs">{(worker as any).bankAccount || '-'}</td>
      <td className="px-3 py-2.5">
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => onEdit(worker)}
            className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded"
          >
            编辑
          </button>
          <button
            onClick={() => onWageModal((worker as any).workerId || worker.id, worker.name)}
            className="px-2 py-1 text-xs text-green-600 hover:bg-green-50 rounded"
          >
            工资
          </button>
          <button
            onClick={() => onDelete((worker as any).workerId)}
            className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded"
          >
            删除
          </button>
        </div>
      </td>
    </tr>
  )
})
