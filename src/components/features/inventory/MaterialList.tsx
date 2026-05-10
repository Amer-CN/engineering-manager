import React from 'react'
import { Material, Project } from '../../../types/electron'
import { Icon } from '../../ui/Icon'
import { formatMoney } from '@/utils/format'

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
      <table className="w-full">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">材料名称</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">所属项目</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">类别</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">单位</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">数量</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">单价</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">小计</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {filteredMaterials.map(material => (
            <tr key={material.id} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                <div className="font-medium text-slate-800">{material.name}</div>
              </td>
              <td className="px-4 py-3 text-sm text-slate-600">{getProjectName(material.projectId)}</td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${categoryColors[material.category || ''] || 'bg-slate-100 text-slate-800'}`}>
                  {categoryIcons[material.category || ''] || <Icon name="Package" size={14} className="inline-block" />} {material.category || '其他'}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-slate-600">{material.unit || '-'}</td>
              <td className="px-4 py-3 text-right text-sm text-slate-800">{material.quantity.toLocaleString()}</td>
              <td className="px-4 py-3 text-right text-sm text-slate-800">¥{formatMoney(material.price)}</td>
              <td className="px-4 py-3 text-right text-sm font-medium text-slate-800">
                ¥{formatMoney((material.quantity * material.price))}
              </td>
              <td className="px-4 py-3 text-center">
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => onEdit(material)}
                    className="px-2 py-1 text-xs text-primary-600 hover:bg-primary-50 rounded"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => onDelete(material.id)}
                    className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
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