import React from 'react'
import { DataTable, TableCell } from '../../DataTable'
import { Supervisor, Project } from '../../../types/electron'
import { supervisorCategories } from '../../../data/regions'
import { Icon } from '../../ui/Icon'

interface SupervisorListProps {
  supervisors: Supervisor[]
  projects: Project[]
  search: string
  filterCategory: string
  onSearchChange: (value: string) => void
  onCategoryChange: (value: string) => void
  onEdit: (supervisor: Supervisor) => void
  onDelete: (id: number) => void
}

const getSupervisorCategoryLabel = (category: string) => {
  return supervisorCategories.find(c => c.value === category)?.label || category
}

export const SupervisorList: React.FC<SupervisorListProps> = ({
  supervisors,
  projects,
  search,
  filterCategory,
  onSearchChange,
  onCategoryChange,
  onEdit,
  onDelete
}) => {
  const filteredSupervisors = supervisors.filter(s => {
    if (filterCategory && s.category !== filterCategory) return false
    if (search) {
      const keyword = search.toLowerCase()
      return (
        s.name.toLowerCase().includes(keyword) ||
        s.contact?.toLowerCase().includes(keyword) ||
        s.phone?.toLowerCase().includes(keyword) ||
        s.regionName?.toLowerCase().includes(keyword)
      )
    }
    return true
  })

  const stats = {
    total: filteredSupervisors.length,
    quality: filteredSupervisors.filter(s => s.category === 'quality' || s.category === 'housing').length,
    facility: filteredSupervisors.filter(s => s.category === 'fire' || s.category === 'power' || s.category === 'gas').length,
    withProject: filteredSupervisors.filter(s => s.projectIds && s.projectIds.length > 0).length
  }

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
          {supervisorCategories.map(cat => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="card p-4">
          <div className="text-2xl font-bold text-primary-600">{stats.total}</div>
          <div className="text-sm text-slate-500">监管单位总数</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-green-600">{stats.quality}</div>
          <div className="text-sm text-slate-500">建设口单位</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-blue-600">{stats.facility}</div>
          <div className="text-sm text-slate-500">配套设施单位</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-orange-600">{stats.withProject}</div>
          <div className="text-sm text-slate-500">已关联项目</div>
        </div>
      </div>

      {/* 列表 */}
      <div className="card flex-1 overflow-hidden relative">
        <DataTable
          data={filteredSupervisors}
          columns={[
            {
              key: 'name',
              title: '单位名称',
              sortable: true,
              render: (supervisor) => (
                <div>
                  <div className="font-medium text-slate-900">{supervisor.name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-block px-1.5 py-0.5 bg-primary-100 text-primary-700 text-xs rounded">
                      {getSupervisorCategoryLabel(supervisor.category)}
                    </span>
                    {supervisor.regionName && (
                      <span className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-600 text-xs rounded">
                        <Icon name="MapPin" size={12} className="inline-block" /> {supervisor.regionName}
                      </span>
                    )}
                  </div>
                </div>
              )
            },
            {
              key: 'contact',
              title: '联系人',
              width: '100px',
              render: (supervisor) => supervisor.contact || '-'
            },
            {
              key: 'phone',
              title: '电话',
              width: '130px',
              render: (supervisor) => supervisor.phone || '-'
            },
            {
              key: 'address',
              title: '地址',
              render: (supervisor) => supervisor.address || '-'
            },
            {
              key: 'projectCount',
              title: '关联项目',
              width: '80px',
              render: (supervisor) => supervisor.projectIds?.length || 0
            },
            {
              key: 'actions',
              title: '操作',
              width: '140px',
              render: (supervisor) => (
                <TableCell.Actions>
                  <button
                    onClick={(e) => { e.stopPropagation(); onEdit(supervisor) }}
                    className="px-3 py-1 text-xs text-primary-600 hover:bg-primary-50 rounded"
                  >
                    编辑
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(supervisor.id) }}
                    className="px-3 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                  >
                    删除
                  </button>
                </TableCell.Actions>
              )
            }
          ]}
          rowKey="id"
          emptyText="暂无监管单位"
          emptyIcon={<Icon name="Landmark" size={20} />}
        />

        {filteredSupervisors.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center pointer-events-auto">
              <div className="empty-state-icon"><Icon name="Landmark" size={48} /></div>
              <h3 className="empty-state-title">暂无监管单位</h3>
              <p className="empty-state-description mb-6">点击上方按钮添加您的第一个监管单位</p>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default SupervisorList