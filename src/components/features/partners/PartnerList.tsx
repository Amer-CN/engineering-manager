import React from 'react'
import { DataTable, TableCell } from '../../DataTable'
import { Partner, Project } from '../../../types/electron'
import { partnerCategories } from '../../../data/regions'
import { Icon } from '../../ui/Icon'

interface PartnerListProps {
  partners: Partner[]
  projects: Project[]
  search: string
  filterCategory: string
  filterProject: string
  onSearchChange: (value: string) => void
  onCategoryChange: (value: string) => void
  onProjectChange: (value: string) => void
  onEdit: (partner: Partner) => void
  onDelete: (id: number) => void
}

const getPartnerCategoryLabel = (category: string) => {
  return partnerCategories.find(c => c.value === category)?.label || category
}

export const PartnerList: React.FC<PartnerListProps> = ({
  partners,
  projects,
  search,
  filterCategory,
  filterProject,
  onSearchChange,
  onCategoryChange,
  onProjectChange,
  onEdit,
  onDelete
}) => {
  const filteredPartners = partners.filter(p => {
    if (filterCategory && p.category !== filterCategory) return false
    if (filterProject && filterProject !== 'none' && !p.projectIds?.includes(Number(filterProject))) return false
    if (filterProject === 'none' && p.projectIds && p.projectIds.length > 0) return false
    if (search) {
      const keyword = search.toLowerCase()
      return (
        p.name.toLowerCase().includes(keyword) ||
        p.contact?.toLowerCase().includes(keyword) ||
        p.phone?.toLowerCase().includes(keyword)
      )
    }
    return true
  })

  return (
    <>
      {/* 筛选器 */}
      <div className="card p-4 mb-4 flex items-center gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="搜索单位名称、联系人、电话..."
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            className="input"
          />
        </div>
        <select
          value={filterCategory}
          onChange={e => onCategoryChange(e.target.value)}
          className="select w-auto"
        >
          <option value="">全部类型</option>
          {partnerCategories.map(cat => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>
        <select
          value={filterProject}
          onChange={e => onProjectChange(e.target.value)}
          className="select w-auto"
        >
          <option value="">全部项目</option>
          <option value="none">未关联项目</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* 列表 */}
      <div className="card flex-1 overflow-hidden relative">
        <DataTable
          data={filteredPartners}
          columns={[
            {
              key: 'name',
              title: '单位名称',
              sortable: true,
              render: (partner) => (
                <div>
                  <div className="font-medium text-slate-900">{partner.name}</div>
                  {partner.projectIds && partner.projectIds.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {partner.projectIds.slice(0, 3).map(projectId => {
                        const project = projects.find(p => p.id === projectId)
                        return project ? (
                          <span
                            key={projectId}
                            className="px-1.5 py-0.5 bg-primary-100 text-primary-700 text-xs rounded"
                          >
                            <Icon name="Building2" size={12} className="inline-block" /> {project.name}
                          </span>
                        ) : null
                      })}
                      {partner.projectIds.length > 3 && (
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-xs rounded">
                          +{partner.projectIds.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )
            },
            {
              key: 'category',
              title: '类型',
              width: '120px',
              sortable: true,
              render: (partner) => (
                <TableCell.Badge color="primary">
                  {getPartnerCategoryLabel(partner.category)}
                </TableCell.Badge>
              )
            },
            {
              key: 'contact',
              title: '联系人',
              width: '100px',
              render: (partner) => partner.contact || '-'
            },
            {
              key: 'phone',
              title: '电话',
              width: '130px',
              render: (partner) => partner.phone || '-'
            },
            {
              key: 'bankAccount',
              title: '银行账号',
              render: (partner) => partner.bankAccount
                ? <span>{partner.bankAccount}{(partner as any).bankName && <span className="text-slate-400 ml-1">({(partner as any).bankName})</span>}</span>
                : '-'
            },
            {
              key: 'projectCount',
              title: '关联项目',
              width: '80px',
              render: (partner) => partner.projectIds?.length || 0
            },
            {
              key: 'actions',
              title: '操作',
              width: '140px',
              render: (partner) => (
                <TableCell.Actions>
                  <button
                    onClick={(e) => { e.stopPropagation(); onEdit(partner) }}
                    className="px-3 py-1 text-xs text-primary-600 hover:bg-primary-50 rounded"
                  >
                    编辑
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(partner.id) }}
                    className="px-3 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                  >
                    删除
                  </button>
                </TableCell.Actions>
              )
            }
          ]}
          rowKey="id"
          emptyText="暂无合作单位"
          emptyIcon={<Icon name="Building2" size={20} />}
        />

        {filteredPartners.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center pointer-events-auto">
              <div className="empty-state-icon"><Icon name="Building2" size={48} /></div>
              <h3 className="empty-state-title">暂无合作单位</h3>
              <p className="empty-state-description mb-6">点击上方按钮添加您的第一个合作单位</p>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default PartnerList