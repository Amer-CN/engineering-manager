import { useMaskedFn } from "@/hooks/useMaskedValue";
import React from 'react'
import { getWorkerTypeLabel } from '../../../utils'
import { Button } from '../../ui/Button'

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
  const masked = useMaskedFn()
  const age = worker.birthDate ? calcAge(worker.birthDate) : null
  const isOverage = age !== null && age > 60

  return (
    <tr className="group hover:bg-[color:var(--panel-2)] transition-colors">
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-[color:var(--panel-2)] border border-[color:var(--border)] flex items-center justify-center flex-shrink-0 text-caption font-bold text-[color:var(--fg-2)]">
            {(worker.name || '?').charAt(0)}
          </div>
          <span className="font-semibold text-[color:var(--fg)]">{worker.name}</span>
        </div>
      </td>
      <td className="px-3 py-2.5 text-[color:var(--muted)] font-mono text-xs">{masked('idCard', worker.idCard) || '-'}</td>
      <td className={`px-3 py-2.5 text-center text-sm font-medium ${isOverage ? 'text-danger-600' : 'text-[color:var(--fg-2)]'}`}>
        {age !== null ? age : '-'}
      </td>
      <td className="px-3 py-2.5 text-[color:var(--fg-2)]">{worker.gender || '-'}</td>
      <td className="px-3 py-2.5 text-[color:var(--fg-2)]">{worker.workerType ? getWorkerTypeLabel(worker.workerType) : '-'}</td>
      <td className="px-3 py-2.5 text-right text-[color:var(--fg)] font-mono text-sm tabular-nums font-medium">{worker.dailyWage != null ? `¥${worker.dailyWage}` : '-'}</td>
      <td className="px-3 py-2.5 text-[color:var(--muted)] font-mono text-xs">{masked('bankAccount', worker.bankAccount) || '-'}</td>
      <td className="px-3 py-2.5">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(worker)}
            className="px-2 py-1 text-xs text-[color:var(--accent)] hover:bg-[color:var(--accent-soft)] rounded"
          >
            编辑
          </button>
          <button
            onClick={() => onWageModal(worker.workerId || worker.id, worker.name)}
            className="px-2 py-1 text-xs text-success-600 hover:bg-success-50 rounded"
          >
            工资
          </button>
          <Button
            onClick={() => onDelete(worker.workerId)}
            
           variant="danger" size="sm">
            删除
          </Button>
        </div>
      </td>
    </tr>
  )
})
