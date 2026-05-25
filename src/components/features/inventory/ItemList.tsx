import React from 'react'
import { InventoryItem, Partner } from '../../../types/electron'
import { Icon } from '../../ui/Icon'
import { formatMoney } from '@/utils/format'

interface ItemListProps {
  items: InventoryItem[]
  partners: Partner[]
  filterCategory: string
  categories: string[]
  onEdit: (item: InventoryItem) => void
  onDelete: (id: number) => void
  onTrans: (item: InventoryItem) => void
}

export const ItemList: React.FC<ItemListProps> = ({
  items,
  partners,
  filterCategory,
  categories,
  onEdit,
  onDelete,
  onTrans
}) => {
  const filteredItems = items.filter(item => {
    if (filterCategory && item.category !== filterCategory) return false
    return true
  })

  return filteredItems.length > 0 ? (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">编码</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">名称</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">类别</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">规格</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">单位</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">库存</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">采购价</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">销售价</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {filteredItems.map(item => (
            <tr key={item.id} className="table-row-hover">
              <td className="px-4 py-3 text-sm font-mono text-slate-600">{item.code}</td>
              <td className="px-4 py-3">
                <div className="font-medium text-slate-800">{item.name}</div>
                {item.currentStock <= item.minStock && (
                  <span className="text-xs text-red-500"><Icon name="AlertTriangle" size={12} className="inline-block" /> 库存不足</span>
                )}
              </td>
              <td className="px-4 py-3 text-sm text-slate-600">{item.category}</td>
              <td className="px-4 py-3 text-sm text-slate-600">{item.specifications || '-'}</td>
              <td className="px-4 py-3 text-center text-sm text-slate-600">{item.unit}</td>
              <td className={`px-4 py-3 text-right text-sm font-medium ${
                item.currentStock <= item.minStock ? 'text-red-600' : 'text-slate-800'
              }`}>
                {item.currentStock}
              </td>
              <td className="px-4 py-3 text-right text-sm text-slate-600">
                ¥{formatMoney(item.purchasePrice)}
              </td>
              <td className="px-4 py-3 text-right text-sm text-slate-600">
                ¥{formatMoney(item.salePrice)}
              </td>
              <td className="px-4 py-3 text-center">
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => onTrans(item)}
                    className="px-2 py-1 text-xs text-primary-600 hover:bg-primary-50 rounded"
                  >
                    出入库
                  </button>
                  <button
                    onClick={() => onEdit(item)}
                    className="px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => onDelete(item.id)}
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
      <div className="text-6xl mb-4"><Icon name="Package" size={48} /></div>
      <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100 mb-2">暂无物料</h3>
      <p className="text-slate-500 dark:text-slate-400 mb-6">点击上方按钮添加您的第一种物料</p>
    </div>
  )
}

export default ItemList