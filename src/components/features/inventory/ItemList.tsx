import React from 'react'
import { InventoryItem, Partner } from '../../../types/electron'
import { Icon } from '../../ui/Icon'
import { formatMoney } from '@/utils/format'
import { TABLE } from '@/constants/table'

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
  <table className={TABLE.table}>
  <thead className={TABLE.headerRow + ' ' + TABLE.stickyHeader}>
  <tr>
  <th className={TABLE.headerCell}>编码</th>
  <th className={TABLE.headerCell}>名称</th>
  <th className={TABLE.headerCell}>类别</th>
  <th className={TABLE.headerCell}>规格</th>
  <th className={TABLE.headerCell + ' text-center'}>单位</th>
  <th className={TABLE.headerCell + ' text-right'}>库存</th>
  <th className={TABLE.headerCell + ' text-right'}>采购价</th>
  <th className={TABLE.headerCell + ' text-right'}>销售价</th>
  <th className={TABLE.headerCell + ' text-center'}>操作</th>
  </tr>
  </thead>
  <tbody>
  {filteredItems.map(item => (
  <tr key={item.id} className={TABLE.bodyRow}>
  <td className={TABLE.bodyCell + ' text-sm font-mono text-slate-600'}>{item.code}</td>
  <td className={TABLE.bodyCell}>
  <div className="font-medium text-slate-800">{item.name}</div>
  {item.currentStock <= item.minStock && (
  <span className="text-xs text-red-500"><Icon name="AlertTriangle" size={12} className="inline-block" /> 库存不足</span>
  )}
  </td>
  <td className={TABLE.bodyCell + ' text-sm text-slate-600'}>{item.category}</td>
  <td className={TABLE.bodyCell + ' text-sm text-slate-600'}>{item.specifications || '-'}</td>
  <td className={TABLE.bodyCell + ' text-center text-sm text-slate-600'}>{item.unit}</td>
  <td className={TABLE.bodyCell + ` text-right text-sm font-medium ${
  item.currentStock <= item.minStock ? 'text-red-600' : 'text-slate-800'
  }`}>
  {item.currentStock}
  </td>
  <td className={TABLE.bodyCell + ' text-right text-sm text-slate-600'}>
  ¥{formatMoney(item.purchasePrice)}
  </td>
  <td className={TABLE.bodyCell + ' text-right text-sm text-slate-600'}>
  ¥{formatMoney(item.salePrice)}
  </td>
  <td className={TABLE.bodyCell + ' text-center'}>
  <div className="flex items-center justify-center gap-2">
  <button
  onClick={() => onTrans(item)}
  className="btn btn-ghost btn-sm text-primary-600"
  >
  出入库
  </button>
  <button
  onClick={() => onEdit(item)}
  className="btn btn-secondary btn-sm"
  >
  编辑
  </button>
  <button
  onClick={() => onDelete(item.id)}
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
  <div className="text-6xl mb-4"><Icon name="Package" size={48} /></div>
  <h3 className="text-lg font-medium text-slate-800 mb-2">暂无物料</h3>
  <p className="text-slate-500 mb-6">点击上方按钮添加您的第一种物料</p>
  </div>
  )
}

export default ItemList