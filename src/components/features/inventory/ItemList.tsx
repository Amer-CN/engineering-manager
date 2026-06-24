import React from 'react'
import { InventoryItem, Partner } from '../../../types/electron'
import { Icon } from '../../ui/Icon'
import { formatMoney } from '@/utils/format'
import { DataTable, type Column } from '@/components/DataTable'
import { Button } from '../../ui/Button'

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

  const columns: Column<InventoryItem>[] = [
    {
      key: 'code',
      title: '编码',
      render: (item) => (
        <span className="text-sm font-mono text-slate-600">{item.code}</span>
      )
    },
    {
      key: 'name',
      title: '名称',
      sortable: true,
      sorter: (a, b) => (a.name || '').localeCompare(b.name || '', 'zh-CN'),
      render: (item) => (
        <>
          <div className="font-medium text-slate-800">{item.name}</div>
          {item.currentStock <= item.minStock && (
            <span className="text-xs text-red-500">
              <Icon name="AlertTriangle" size={12} className="inline-block" /> 库存不足
            </span>
          )}
        </>
      )
    },
    {
      key: 'category',
      title: '类别',
      filterable: 'select',
      filterOptions: categories.map(c => ({ label: c, value: c })),
      filterAccessor: (item: InventoryItem) => item.category,
      render: (item) => (
        <span className="text-slate-600">{item.category}</span>
      )
    },
    {
      key: 'specifications',
      title: '规格',
      render: (item) => (
        <span className="text-slate-600">{item.specifications || '-'}</span>
      )
    },
    {
      key: 'unit',
      title: '单位',
      align: 'center',
      render: (item) => (
        <span className="text-slate-600">{item.unit}</span>
      )
    },
    {
      key: 'currentStock',
      title: '库存',
      align: 'right',
      sortable: true,
      sorter: (a, b) => ((a.currentStock || 0) - (b.currentStock || 0)),
      render: (item) => (
        <span className={`font-medium ${
          item.currentStock <= item.minStock ? 'text-red-600' : 'text-slate-800'
        }`}>
          {item.currentStock}
        </span>
      )
    },
    {
      key: 'purchasePrice',
      title: '采购价',
      align: 'right',
      sortable: true,
      sorter: (a, b) => ((a.purchasePrice || 0) - (b.purchasePrice || 0)),
      render: (item) => (
        <span className="text-slate-600">¥{formatMoney(item.purchasePrice)}</span>
      )
    },
    {
      key: 'salePrice',
      title: '销售价',
      align: 'right',
      render: (item) => (
        <span className="text-slate-600">¥{formatMoney(item.salePrice)}</span>
      )
    },
    {
      key: 'actions',
      title: '操作',
      align: 'center',
      render: (item) => (
        <div className="flex items-center justify-center gap-2">
          <Button
            onClick={() => onTrans(item)}
            
           variant="ghost" size="sm" className="text-primary-600">
            出入库
          </Button>
          <Button
            onClick={() => onEdit(item)}
            
           variant="secondary" size="sm">
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
      data={filteredItems}
      columns={columns}
      rowKey="id"
      pagination={false}
      emptyText="暂无物料"
      emptyIcon="Package"
      useHoverScrollbar
      scrollClassName="h-full"
    />
  )
}

export default ItemList
