import { useMask } from '@/contexts/MaskContext';
import { maskIdCard, maskPhone, maskBankAccount } from "@/utils/mask";
import React from 'react'

interface WorkerPickerItemProps {
  w: any
  isExisting: boolean
  isSelected: boolean
  onToggle: (worker: any) => void
}

export const WorkerPickerItem = React.memo(function WorkerPickerItem({

  const { masked } = useMask();
  w,
  isExisting,
  isSelected,
  onToggle,
}: WorkerPickerItemProps) {
  return (
  <div
  className={`flex items-center px-6 py-3 cursor-pointer transition-colors ${
  isExisting
  ? 'bg-slate-50 opacity-60'
  : isSelected
  ? 'bg-blue-50'
  : 'hover:bg-slate-50'
  }`}
  onClick={() => !isExisting && onToggle(w)}
  >
  <input
  type="checkbox"
  checked={isSelected}
  disabled={isExisting}
  onChange={() => onToggle(w)}
  className="rounded mr-3 pointer-events-none"
  />
  <div className="flex-1 min-w-0">
  <div className="flex items-center gap-2">
  <span className="text-sm font-medium text-slate-800 truncate">{w.name}</span>
  <span className="text-xs text-slate-400">{w.gender}</span>
  </div>
  <div className="text-xs text-slate-400 mt-0.5">{masked ? maskIdCard(w.idCard)}</div>
  </div>
  <div className="flex items-center gap-3 text-xs text-slate-500">
  {w.projectCount > 0 && (
  <span className="px-2 py-0.5 bg-slate-100 rounded-full">{w.projectCount} 个项目</span>
  )}
  {isExisting && (
  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
  已加入
  </span>
  )}
  </div>
  </div>
  )
})
