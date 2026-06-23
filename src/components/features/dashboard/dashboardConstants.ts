import { formatMoney } from '../../../utils/format'

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

export const statusLabels: Record<string, { text: string; color: string; dot: string }> = {
  planning: { text: '筹备中', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  in_progress: { text: '进行中', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  completed: { text: '已完成', color: 'bg-slate-100 text-slate-700', dot: 'bg-slate-400' },
  archived: { text: '已归档', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
}

export const invoiceStatusLabels: Record<string, { text: string; color: string; dot: string }> = {
  'received': { text: '已收齐', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  'partially_paid': { text: '部分收付', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  'issued': { text: '已开具', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  'cancelled': { text: '已作废', color: 'bg-slate-100 text-slate-700', dot: 'bg-slate-400' },
  'red_flushed': { text: '已红冲', color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
  '其他': { text: '其他', color: 'bg-slate-100 text-slate-700', dot: 'bg-slate-400' },
}

export function getGreeting(): string {
  const hour = new Date().getHours()
  return hour < 6 ? '夜深了' : hour < 9 ? '早上好' : hour < 12 ? '上午好' : hour < 14 ? '中午好' : hour < 18 ? '下午好' : '晚上好'
}
