import { useMaskedFn } from "@/hooks/useMaskedValue";
import React from 'react'

interface WorkerPickerItemProps {
  w: any
  isExisting: boolean
  isSelected: boolean
  onToggle: (worker: any) => void
}

export const WorkerPickerItem = React.memo(function WorkerPickerItem({
  w,
  isExisting,
  isSelected,
  onToggle,
}: WorkerPickerItemProps) {
  const masked = useMaskedFn()
  return (
  <div
  className={`flex items-center px-6 py-3 cursor-pointer transition-colors ${
  isExisting
  ? 'bg-[color:var(--panel-2)] opacity-60'
  : isSelected
  ? 'bg-[color:var(--accent-soft)]'
  : 'hover:bg-[color:var(--panel-2)]'
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
  <span className="text-sm font-medium text-[color:var(--fg)] truncate">{w.name}</span>
  <span className="text-xs text-[color:var(--muted)]">{w.gender}</span>
  </div>
  <div className="text-xs text-[color:var(--muted)] mt-0.5">{masked('idCard', w.idCard)}</div>
  </div>
  <div className="flex items-center gap-3 text-xs text-[color:var(--muted)]">
  {w.projectCount > 0 && (
  <span className="px-2 py-0.5 bg-[color:var(--panel-2)] rounded-full">{w.projectCount} 个项目</span>
  )}
  {isExisting && (
  <span className="px-2 py-0.5 bg-[color:var(--accent-soft)] text-[color:var(--accent)] rounded-full text-xs font-medium">
  已加入
  </span>
  )}
  </div>
  </div>
  )
})
