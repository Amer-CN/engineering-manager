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
        <span className="text-sm font-mono text-[color:var(--fg-2)]">{item.code}</span>
      )
    },
    {
      key: 'name',
      title: '名称',
      sortable: true,
      sorter: (a, b) => (a.name || '').localeCompare(b.name || '', 'zh-CN'),
      render: (item) => (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-[color:var(--panel-2)] border border-[color:var(--border)] flex items-center justify-center flex-shrink-0 text-[color:var(--muted)]">
            <Icon name="Package" size={14} />
          </div>
          <span className="font-medium text-[color:var(--fg)]">{item.name}</span>
        </div>
      )
    },
    {
      key: 'category',
      title: '类别',
      filterable: 'select',
      filterOptions: categories.map(c => ({ label: c, value: c })),
      filterAccessor: (item: InventoryItem) => item.category,
      render: (item) => (
        <span className="text-[color:var(--fg-2)]">{item.category}</span>
      )
    },
    {
      key: 'specifications',
      title: '规格型号',
      render: (item) => (
        <span className="text-[color:var(--fg-2)]">{item.specifications || '-'}</span>
      )
    },
    {
      key: 'unit',
      title: '单位',
      align: 'center',
      render: (item) => (
        <span className="text-[color:var(--fg-2)]">{item.unit}</span>
      )
    },
    {
      key: 'currentStock',
      title: '库存量',
      align: 'right',
      sortable: true,
      sorter: (a, b) => ((a.currentStock || 0) - (b.currentStock || 0)),
      render: (item) => (
        <span className={`font-medium font-mono tabular-nums ${
          item.currentStock <= item.minStock ? 'text-danger-600' : 'text-[color:var(--fg)]'
        }`}>
          {item.currentStock}
        </span>
      )
    },
    {
      key: 'purchasePrice',
      title: '平均单价',
      align: 'right',
      sortable: true,
      sorter: (a, b) => ((a.purchasePrice || 0) - (b.purchasePrice || 0)),
      render: (item) => (
        <span className="text-[color:var(--fg-2)] font-mono tabular-nums">¥{formatMoney(item.purchasePrice)}</span>
      )
    },
    {
      key: 'totalValue',
      title: '库存总额',
      align: 'right',
      sortable: true,
      sorter: (a, b) => (((a.currentStock || 0) * (a.purchasePrice || 0)) - ((b.currentStock || 0) * (b.purchasePrice || 0))),
      render: (item) => (
        // s25：库存总额 = 库存量 × 采购单价，primary 强调色 + 等宽数字
        <span className="font-medium font-mono tabular-nums text-[color:var(--accent)]">¥{formatMoney((item.currentStock || 0) * (item.purchasePrice || 0))}</span>
      )
    },
    {
      key: 'status',
      title: '状态',
      align: 'center',
      render: (item) => {
        const low = (item.currentStock || 0) <= (item.minStock || 0)
        return (
          // s25：状态圆点（低库存 danger / 正常 ok）
          <span className="inline-flex items-center justify-center" title={low ? '低库存预警' : '库存正常'}>
            <span className={`w-2 h-2 rounded-full ${low ? 'bg-danger-500' : 'bg-success-500'}`} />
          </span>
        )
      }
    },
    {
      key: 'actions',
      title: '操作',
      align: 'center',
      render: (item) => (
        <div className="flex items-center justify-center gap-2">
          <Button
            onClick={() => onTrans(item)}
            
           variant="ghost" size="sm" className="text-[color:var(--accent)]">
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
