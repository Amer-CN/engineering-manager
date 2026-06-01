import React from 'react'
import { Material, Project } from '../../../types/electron'
import { Icon } from '../../ui/Icon'
import { formatMoney } from '@/utils/format'
import { TABLE } from '@/constants/table'

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

  return filteredMaterials.length > 0 ? (
    <div className="overflow-x-auto">
      <table className={TABLE.table}>
        <thead className={TABLE.headerRow + ' ' + TABLE.stickyHeader}>
          <tr>
            <th className={TABLE.headerCell}>材料名称</th>
            <th className={TABLE.headerCell}>所属项目</th>
            <th className={TABLE.headerCell}>类别</th>
            <th className={TABLE.headerCell}>单位</th>
            <th className={TABLE.headerCell + ' text-right'}>数量</th>
            <th className={TABLE.headerCell + ' text-right'}>单价</th>
            <th className={TABLE.headerCell + ' text-right'}>小计</th>
            <th className={TABLE.headerCell + ' text-center'}>操作</th>
          </tr>
        </thead>
        <tbody>
          {filteredMaterials.map(material => (
            <tr key={material.id} className={TABLE.bodyRow}>
              <td className={TABLE.bodyCell}>
                <div className="font-medium text-slate-800">{material.name}</div>
              </td>
              <td className={TABLE.bodyCell + ' text-sm text-slate-600'}>{getProjectName(material.projectId)}</td>
              <td className={TABLE.bodyCell}>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${categoryColors[material.category || ''] || 'bg-slate-100 text-slate-800'}`}>
                  {categoryIcons[material.category || ''] || <Icon name="Package" size={14} className="inline-block" />} {material.category || '其他'}
                </span>
              </td>
              <td className={TABLE.bodyCell + ' text-sm text-slate-600'}>{material.unit || '-'}</td>
              <td className={TABLE.bodyCell + ' text-right text-sm text-slate-800'}>{material.quantity.toLocaleString()}</td>
              <td className={TABLE.bodyCell + ' text-right text-sm text-slate-800'}>¥{formatMoney(material.price)}</td>
              <td className={TABLE.bodyCell + ' text-right text-sm font-medium text-slate-800'}>
                ¥{formatMoney((material.quantity * material.price))}
              </td>
              <td className={TABLE.bodyCell + ' text-center'}>
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => onEdit(material)}
                    className="btn btn-ghost btn-sm text-primary-600"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => onDelete(material.id)}
                    className="btn btn-danger btn-sm"
                  >
                    删除
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <div className="text-center py-12">
      <div className="text-6xl mb-4"><Icon name="ClipboardList" size={48} /></div>
      <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100 mb-2">暂无项目材料</h3>
      <p className="text-slate-500 dark:text-slate-400 mb-6">点击上方"添加项目材料"按钮记录您的项目材料</p>
    </div>
  )
}

export default MaterialList