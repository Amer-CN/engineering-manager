import React from 'react'
import { Icon } from '../../ui/Icon'
import { formatMoney } from '@/utils/format'

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
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center"><Icon name="Package" size={24} /></div>
          <div>
            <p className="text-sm text-slate-500">物料种类</p>
            <p className="text-2xl font-bold text-slate-800">{totalItems}</p>
          </div>
        </div>
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center"><Icon name="AlertTriangle" size={24} /></div>
          <div>
            <p className="text-sm text-slate-500">库存预警</p>
            <p className="text-2xl font-bold text-red-600">{lowStock}</p>
          </div>
        </div>
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center"><Icon name="DollarSign" size={24} /></div>
          <div>
            <p className="text-sm text-slate-500">库存总值</p>
            <p className="text-2xl font-bold text-slate-800">¥{formatMoney(totalValue)}</p>
          </div>
        </div>
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center"><Icon name="LayoutDashboard" size={24} /></div>
          <div>
            <p className="text-sm text-slate-500">项目材料</p>
            <p className="text-2xl font-bold text-slate-800">{totalMaterials}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default InventoryStats