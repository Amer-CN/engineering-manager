/**
 * ProjectFilters - 项目筛选栏
 */
import type { Member } from '@/types'
import { usePermission } from '@/hooks/usePermission.tsx'
import { Icon } from '../../ui/Icon'
import { Button } from '../../ui/Button'

const statusOptions = [
  { value: '', label: '全部状态' },
  { value: 'planning', label: '筹备中' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'archived', label: '已归档' },
]

const inputClass = 'bg-[color:var(--card)] border border-[color:var(--border)] rounded-xl px-4 py-2.5 text-sm text-[color:var(--fg)] placeholder-[color:var(--muted)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-soft)] focus:border-[color:var(--accent)] transition-all duration-200'
const selectClass = 'bg-[color:var(--card)] border border-[color:var(--border)] rounded-xl px-3 py-2.5 text-sm text-[color:var(--fg-2)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-soft)] cursor-pointer transition-all duration-200'

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
    <div className="rounded-xl p-4 mb-6" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative flex-1 max-w-md">
            <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--muted)] pointer-events-none" />
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
          <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
            共 {projectCount} 个项目
          </span>
          {can('projects:export') && (
            <Button onClick={onExport}  variant="secondary" size="sm">
              <Icon name="Download" size={14} className="inline-block" /> 导出
            </Button>
          )}
          {can('projects:create') && (
            <Button onClick={onAdd}  variant="primary">
              <Icon name="Plus" size={16} className="inline-block" /> 新增项目
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
