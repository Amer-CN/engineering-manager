import { formatMoney } from '../../../utils/format'

export const CHART_COLORS = ['#3b82f6', '#10b981', '#f97316', '#8b5cf6', '#06b6d4', '#f59e0b']

export interface StatCardConfig {
  key: string
  label: string
  icon: string
  color: string
}

export const statCards: StatCardConfig[] = [
  { key: 'projects', label: '项目总数', icon: 'FolderKanban', color: 'bg-blue-50 text-blue-600' },
  { key: 'settlements', label: '待办结算', icon: 'ClipboardList', color: 'bg-amber-50 text-amber-600' },
  { key: 'members', label: '团队成员', icon: 'Users', color: 'bg-violet-50 text-violet-600' },
  { key: 'costLedger', label: '总支出', icon: 'Wallet', color: 'bg-emerald-50 text-emerald-600' },
  { key: 'invoices', label: '发票记录', icon: 'Receipt', color: 'bg-teal-50 text-teal-600' },
  { key: 'inventory', label: '库存物料', icon: 'Package', color: 'bg-orange-50 text-orange-600' },
]

export const cardHover = { y: -4, boxShadow: '0 12px 30px rgba(0,0,0,0.1)', transition: { duration: 0.2 } }

export function formatCurrency(n: number): string {
  return n >= 10000 ? `¥${(n / 10000).toFixed(1)}万` : `¥${formatMoney(n)}`
}
