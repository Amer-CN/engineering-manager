/**
 * ProjectFilters - 项目筛选栏
 */
import type { Member } from '@/types'
import { usePermission } from '@/hooks/usePermission.tsx'
import { Icon } from '../../ui/Icon'

const statusOptions = [
  { value: '', label: '全部状态' },
  { value: 'planning', label: '筹备中' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'archived', label: '已归档' },
]

const inputClass = 'bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200'
const selectClass = 'bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20 cursor-pointer transition-all duration-200'

export interface ProjectFiltersProps {
  searchTerm: string
  status: string | null
  manager: number | null
  managers: Member[]
  onSearchChange: (value: string) => void
  onStatusChange: (value: string | null) => void
  onManagerChange: (value: number | null) => void
  onAdd: () => void
  onExport: () => void
  projectCount: number
}

export function ProjectFilters({
  searchTerm, status, manager, managers,
  onSearchChange, onStatusChange, onManagerChange,
  onAdd, onExport, projectCount,
}: ProjectFiltersProps) {
  const { can } = usePermission()

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 shadow-sm">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative flex-1 max-w-md">
            <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input type="text" value={searchTerm} onChange={e => onSearchChange(e.target.value)}
              placeholder="搜索项目名称..." className={`${inputClass} pl-10 w-full`} />
          </div>
          <select value={status || ''} onChange={e => onStatusChange(e.target.value || null)} className={selectClass}>
            {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={manager || ''} onChange={e => onManagerChange(e.target.value ? Number(e.target.value) : null)} className={selectClass}>
            <option value="">全部负责人</option>
            {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-full bg-primary-50 text-primary-700 text-xs font-medium border border-primary-200">
            共 {projectCount} 个项目
          </span>
          {can('projects:export') && (
            <button onClick={onExport} className="btn btn-secondary btn-sm">
              <Icon name="Download" size={14} className="inline-block" /> 导出
            </button>
          )}
          {can('projects:create') && (
            <button onClick={onAdd} className="btn btn-primary">
              <Icon name="Plus" size={16} className="inline-block" /> 新增项目
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
