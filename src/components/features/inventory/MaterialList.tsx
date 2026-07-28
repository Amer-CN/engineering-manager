import React from 'react'
import { Material, Project } from '../../../types/electron'
import { Icon } from '../../ui/Icon'
import { formatMoney } from '@/utils/format'
import { DataTable, type Column } from '@/components/DataTable'
import { Button } from '../../ui/Button'

interface MaterialListProps {
  materials: Material[]
  projects: Project[]
  filterProject: number | ''
  materialCategories: string[]
  categoryIcons: Record<string, string>
  categoryColors: Record<string, string>
  onEdit: (material: Material) => void
  onDelete: (id: number) => void
}

export const MaterialList: React.FC<MaterialListProps> = ({
  materials,
  projects,
  filterProject,
  materialCategories,
  categoryIcons,
  categoryColors,
  onEdit,
  onDelete
}) => {
  const getProjectName = (projectId: number) => projects.find(p => p.id === projectId)?.name || '-'

  const filteredMaterials = materials.filter(m => {
    if (filterProject && m.projectId !== filterProject) return false
    return true
  })

  const columns: Column<Material>[] = [
    {
      key: 'name',
      title: '材料名称',
      sortable: true,
      sorter: (a, b) => (a.name || '').localeCompare(b.name || '', 'zh-CN'),
      render: (item) => (
        <div className="font-medium text-[color:var(--fg)]">{item.name}</div>
      )
    },
    {
      key: 'projectId',
      title: '所属项目',
      render: (item) => (
        <span className="text-[color:var(--fg-2)]">{getProjectName(item.projectId)}</span>
      )
    },
    {
      key: 'category',
      title: '类别',
      filterable: 'select',
      filterOptions: materialCategories.map(c => ({ label: c, value: c })),
      filterAccessor: (item: Material) => item.category,
      render: (item) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${categoryColors[item.category || ''] || 'bg-[color:var(--panel-2)] text-[color:var(--fg)]'}`}>
          {categoryIcons[item.category || ''] || <Icon name="Package" size={14} className="inline-block" />} {item.category || '其他'}
        </span>
      )
    },
    {
      key: 'unit',
      title: '单位',
      render: (item) => (
        <span className="text-[color:var(--fg-2)]">{item.unit || '-'}</span>
      )
    },
    {
      key: 'quantity',
      title: '数量',
      align: 'right',
      sortable: true,
      sorter: (a, b) => ((a.quantity || 0) - (b.quantity || 0)),
      render: (item) => (
        <span className="text-[color:var(--fg)]">{item.quantity.toLocaleString()}</span>
      )
    },
    {
      key: 'price',
      title: '单价',
      align: 'right',
      sortable: true,
      sorter: (a, b) => ((a.price || 0) - (b.price || 0)),
      render: (item) => (
        <span className="text-[color:var(--fg)] font-mono tabular-nums">¥{formatMoney(item.price)}</span>
      )
    },
    {
      key: 'subtotal',
      title: '小计',
      align: 'right',
      render: (item) => (
        <span className="font-medium text-[color:var(--fg)] font-mono tabular-nums">
          ¥{formatMoney(item.quantity * item.price)}
        </span>
      )
    },
    {
      key: 'actions',
      title: '操作',
      align: 'center',
      render: (item) => (
        <div className="flex items-center justify-center gap-2">
          <Button
            onClick={() => onEdit(item)}
            
           variant="ghost" size="sm" className="text-[color:var(--accent)]">
            编辑
          </Button>
          <Button
            onClick={() => onDelete(item.id)}
            
           variant="danger" size="sm">
            删除
          </Button>
        </div>
      )
    }
  ]

  return (
    <DataTable
      data={filteredMaterials}
      columns={columns}
      rowKey="id"
      pagination={false}
      emptyText="暂无项目材料"
      emptyIcon="ClipboardList"
      useHoverScrollbar
      scrollClassName="h-full"
    />
  )
}

export default MaterialList
