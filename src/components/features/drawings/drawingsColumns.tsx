import { type Column } from '@/components/DataTable'
import { Icon } from '../../ui/Icon'
import { Button } from '../../ui/Button'
import { categoryIcons, categoryColors } from '../../drawingsConstants'
import type { Drawing } from '../../../types/electron'

export function createDrawingColumns(
  getProjectName: (projectId: number) => string,
  onEdit: (drawing: Drawing) => void,
  onDelete: (id: number) => void
): Column<Drawing>[] {
  return [
    { key: 'name', title: '图纸名称', width: '200px', render: (item) => (
      <div className="flex items-center gap-2">
        <Icon name={categoryIcons[item.category || ''] || 'File'} size={18} className="text-[color:var(--muted)] shrink-0" />
        <span className="font-medium text-[color:var(--fg)] truncate">{item.name}</span>
      </div>
    )},
    { key: 'projectId', title: '所属项目', width: '140px', render: (item) => <span className="text-sm text-[color:var(--fg-2)] truncate block">{getProjectName(item.projectId)}</span> },
    { key: 'category', title: '图纸类型', width: '100px', render: (item) => (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${categoryColors[item.category || ''] || 'bg-[color:var(--panel-2)] text-[color:var(--fg)]'}`}>
        {item.category || '其他'}
      </span>
    )},
    { key: 'position', title: '部位', width: '100px', render: (item) => <span className="text-sm text-[color:var(--fg-2)] truncate block">{item.position || '-'}</span> },
    { key: 'remarks', title: '备注', width: '160px', render: (item) => <span className="text-sm text-[color:var(--fg-2)] truncate block max-w-[160px]">{item.remarks || '-'}</span> },
    { key: 'createdAt', title: '上传日期', width: '110px', render: (item) => <span className="text-sm text-[color:var(--muted)] whitespace-nowrap">{new Date(item.createdAt).toLocaleDateString('zh-CN')}</span> },
    { key: 'actions', title: '操作', width: '120px', align: 'center', render: (item) => (
      <div className="flex items-center justify-center gap-2">
        <Button onClick={() => onEdit(item)} variant="ghost" size="sm">编辑</Button>
        <Button onClick={() => onDelete(item.id)} variant="danger" size="sm">删除</Button>
      </div>
    )},
  ]
}
