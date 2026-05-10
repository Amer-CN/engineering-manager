import React from 'react'
import { InventoryTransaction, InventoryTransactionType, InventoryItem, Project, Partner } from '../../../types/electron'
import { Icon } from '../../ui/Icon'
import { formatMoney } from '@/utils/format'

interface TransListProps {
  transactions: InventoryTransaction[]
  items: InventoryItem[]
  projects: Project[]
  partners: Partner[]
  filterProject: number | ''
  onDelete: (id: number) => void
}

const typeConfig: Record<InventoryTransactionType, { label: string; icon: React.ReactNode; color: string }> = {
  purchase: { label: '采购入库', icon: <Icon name="Download" size={18} />, color: 'text-green-600 bg-green-100' },
  sale: { label: '销售出库', icon: <Icon name="Upload" size={18} />, color: 'text-red-600 bg-red-100' },
  adjustment: { label: '库存调整', icon: <Icon name="RefreshCw" size={18} />, color: 'text-blue-600 bg-blue-100' },
  return_in: { label: '退货入库', icon: <Icon name="Undo" size={18} />, color: 'text-purple-600 bg-purple-100' },
  return_out: { label: '退货出库', icon: <Icon name="Redo" size={18} />, color: 'text-orange-600 bg-orange-100' }
}

export const TransList: React.FC<TransListProps> = ({
  transactions,
  items,
  projects,
  partners,
  filterProject,
  onDelete
}) => {
  const getItemName = (itemId: number) => items.find(i => i.id === itemId)?.name || '-'
  const getProjectName = (projectId: number) => projects.find(p => p.id === projectId)?.name || '-'
  const getPartnerName = (partnerId: number) => partners.find(p => p.id === partnerId)?.name || '-'

  const filteredTransactions = transactions.filter(t => {
    if (filterProject && t.projectId !== filterProject) return false
    return true
  })

  return filteredTransactions.length > 0 ? (
    <div className="space-y-3">
      {filteredTransactions.map(trans => (
        <div key={trans.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${typeConfig[trans.type].color}`}>
              {typeConfig[trans.type].icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-800">{getItemName(trans.itemId)}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs ${typeConfig[trans.type].color}`}>
                  {typeConfig[trans.type].label}
                </span>
              </div>
              <p className="text-sm text-slate-500">
                单号: {trans.documentNo} • 项目: {getProjectName(trans.projectId || 0)} • 对方: {getPartnerName(trans.counterpartyId || 0)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-lg font-bold ${
              trans.type === 'purchase' || trans.type === 'return_in' ? 'text-green-600' : 'text-red-600'
            }`}>
              {trans.type === 'purchase' || trans.type === 'return_in' ? '+' : '-'}{trans.quantity}
            </p>
            <p className="text-sm text-slate-500">¥{formatMoney(trans.totalAmount)}</p>
            <p className="text-xs text-slate-400">{trans.transactionDate}</p>
          </div>
        </div>
      ))}
    </div>
  ) : (
    <div className="text-center py-12">
      <div className="text-6xl mb-4"><Icon name="ClipboardList" size={48} /></div>
      <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100 mb-2">暂无出入库记录</h3>
      <p className="text-slate-500 dark:text-slate-400 mb-6">点击上方"出入库"按钮记录您的第一笔业务</p>
    </div>
  )
}

export default TransList