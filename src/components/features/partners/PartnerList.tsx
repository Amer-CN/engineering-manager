import React from 'react'
import { DataTable, type Column } from '../../DataTable'
import { Partner, Project } from '../../../types/electron'
import { partnerCategories } from '../../../data/regions'
import { useMaskedFn } from '@/hooks/useMaskedValue'
import { Button } from '../../ui/Button'

interface PartnerListProps {
  partners: Partner[]
  projects: Project[]
  onEdit: (partner: Partner) => void
  onDelete: (id: number) => void
}

const getPartnerCategoryLabel = (category: string) => {
  return partnerCategories.find(c => c.value === category)?.label || category
}

export const PartnerList: React.FC<PartnerListProps> = ({
  partners,
  projects,
  onEdit,
  onDelete
}) => {
  // S21 Stitch: 电话脱敏中间位
  const mask = useMaskedFn()
  const columns: Column<Partner>[] = [
    {
      key: 'name',
      title: '单位名称',
      sortable: true,
      filterable: true,
    },
    {
      key: 'category',
      title: '类型',
      width: '120px',
      sortable: true,
      filterable: 'select',
      filterOptions: partnerCategories.map(c => ({ label: c.label, value: c.value })),
      filterAccessor: (p) => getPartnerCategoryLabel(p.category),
      render: (partner) => (
        <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-[color:var(--accent-soft)] text-[color:var(--accent)]">
          {getPartnerCategoryLabel(partner.category)}
        </span>
      )
    },
    {
      key: 'contact',
      title: '联系人',
      width: '100px',
      filterable: true,
    },
    {
      key: 'phone',
      title: '电话',
      width: '130px',
      filterable: true,
      render: (partner) => <span className="font-mono text-sm tabular-nums text-[color:var(--fg-2)]">{mask('phone', partner.phone) || '-'}</span>
    },
    {
      key: 'creditCode',
      title: '统一社会信用代码',
      width: '180px',
      render: (partner) => <span className="font-mono text-xs tabular-nums text-[color:var(--muted)]">{partner.creditCode || '-'}</span>
    },
    {
      key: 'projects',
      title: '关联项目',
      filterable: 'select',
      filterOptions: projects.map(p => ({ label: p.name, value: String(p.id) })),
      filterAccessor: (partner) => {
        if (!partner.projectIds || partner.projectIds.length === 0) return '未关联'
        return partner.projectIds
          .map(id => projects.find(p => p.id === id)?.name || '')
          .filter(Boolean)
          .join(',')
      },
      render: (partner) => {
        if (!partner.projectIds || partner.projectIds.length === 0) {
          return <span className="text-[color:var(--muted)] text-xs">未关联</span>
        }
        return (
          <div className="flex flex-wrap gap-1">
            {partner.projectIds.slice(0, 3).map(projectId => {
              const project = projects.find(p => p.id === projectId)
              return project ? (
                <span key={projectId} className="px-1.5 py-0.5 bg-[color:var(--accent-soft)] text-[color:var(--accent)] text-xs rounded">
                  {project.name}
                </span>
              ) : null
            })}
            {partner.projectIds.length > 3 && (
              <span className="px-1.5 py-0.5 bg-[color:var(--panel-2)] text-[color:var(--fg-2)] text-xs rounded">
                +{partner.projectIds.length - 3}
              </span>
            )}
          </div>
        )
      }
    },
    {
      key: 'actions',
      title: '操作',
      width: '140px',
      render: (partner) => (
        <div className="flex items-center gap-1">
          <Button
            onClick={(e) => { e.stopPropagation(); onEdit(partner) }}
            
           variant="ghost" size="sm">
            编辑
          </Button>
          <Button
            onClick={(e) => { e.stopPropagation(); onDelete(partner.id) }}
            
           variant="danger" size="sm">
            删除
          </Button>
        </div>
      )
    }
  ]

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <DataTable
        data={partners}
        columns={columns}
        rowKey="id"
        useHoverScrollbar={true}
        scrollClassName="h-full"
        pagination={false}
        emptyText="暂无合作单位"
        emptyIcon="Building2"
      />
    </div>
  )
}

export default PartnerList
