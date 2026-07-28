import React from 'react'
import { Icon } from '../../ui/Icon'
import { formatMoney } from '@/utils/format'
import { Card } from '@/components/ui/Card'

interface InventoryStatsProps {
  totalItems: number
  lowStock: number
  totalValue: number
  totalMaterials: number
}

export const InventoryStats: React.FC<InventoryStatsProps> = ({
  totalItems,
  lowStock,
  totalValue,
  totalMaterials
}) => {
  return (
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
  <Card bordered={false} className="p-5">
  <div className="flex items-center gap-4">
  <div className="w-12 h-12 rounded-xl bg-[color:var(--panel-2)] text-[color:var(--fg-2)] flex items-center justify-center"><Icon name="Package" size={24} /></div>
  <div>
  <p className="text-sm text-[color:var(--muted)]">物料种类</p>
  <p className="text-numeric-xl font-mono tabular-nums tracking-tight text-[color:var(--fg)]">{totalItems}</p>
  </div>
  </div>
  </Card>
  <Card bordered={false} className="p-5">
  <div className="flex items-center gap-4">
  <div className="w-12 h-12 rounded-xl bg-danger-100 flex items-center justify-center"><Icon name="AlertTriangle" size={24} /></div>
  <div>
  <p className="text-sm text-[color:var(--muted)]">库存预警</p>
  <p className="text-numeric-xl font-mono tabular-nums tracking-tight text-danger-600">{lowStock}</p>
  </div>
  </div>
  </Card>
  <Card bordered={false} className="p-5">
  <div className="flex items-center gap-4">
  <div className="w-12 h-12 rounded-xl bg-success-100 flex items-center justify-center"><Icon name="DollarSign" size={24} /></div>
  <div>
  <p className="text-sm text-[color:var(--muted)]">库存总值</p>
  <p className="text-numeric-xl font-mono tabular-nums tracking-tight text-[color:var(--fg)]">¥{formatMoney(totalValue)}</p>
  </div>
  </div>
  </Card>
  <Card bordered={false} className="p-5">
  <div className="flex items-center gap-4">
  <div className="w-12 h-12 rounded-xl bg-[color:var(--panel-2)] text-[color:var(--fg-2)] flex items-center justify-center"><Icon name="LayoutDashboard" size={24} /></div>
  <div>
  <p className="text-sm text-[color:var(--muted)]">项目材料</p>
  <p className="text-numeric-xl font-mono tabular-nums tracking-tight text-[color:var(--fg)]">{totalMaterials}</p>
  </div>
  </div>
  </Card>
  </div>
  )
}

export default InventoryStats