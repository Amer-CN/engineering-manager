import { formatMoney } from '../../../utils/format'

export interface StatCardConfig {
  key: string
  label: string
  icon: string
  color: string
}

export const statCards: StatCardConfig[] = [
  { key: 'projects', label: '项目总数', icon: 'FolderKanban', color: 'bg-[color:var(--panel-2)] text-[color:var(--fg-2)]' },
  { key: 'settlements', label: '待办结算', icon: 'ClipboardList', color: 'bg-warning-50 text-warning-600' },
  { key: 'members', label: '团队成员', icon: 'Users', color: 'bg-[color:var(--panel-2)] text-[color:var(--fg-2)]' },
  { key: 'costLedger', label: '总支出', icon: 'Wallet', color: 'bg-[color:var(--panel-2)] text-[color:var(--fg-2)]' },
  { key: 'invoices', label: '发票记录', icon: 'Receipt', color: 'bg-[color:var(--panel-2)] text-[color:var(--fg-2)]' },
  { key: 'inventory', label: '库存物料', icon: 'Package', color: 'bg-[color:var(--panel-2)] text-[color:var(--fg-2)]' },
]

export const cardHover = { y: -4, boxShadow: '0 12px 30px rgba(0,0,0,0.1)', transition: { duration: 0.2 } }

export function formatCurrency(n: number): string {
  return n >= 10000 ? `¥${(n / 10000).toFixed(1)}万` : `¥${formatMoney(n)}`
}

export const statusLabels: Record<string, { text: string; color: string; dot: string }> = {
  planning: { text: '筹备中', color: 'bg-[color:var(--panel-2)] text-[color:var(--fg-2)]', dot: 'bg-[color:var(--muted)]' },
  in_progress: { text: '进行中', color: 'bg-success-100 text-success-700', dot: 'bg-success-500' },
  completed: { text: '已完成', color: 'bg-[color:var(--panel-2)] text-[color:var(--fg-2)]', dot: 'bg-[color:var(--muted)]' },
  archived: { text: '已归档', color: 'bg-[color:var(--panel-2)] text-[color:var(--muted)]', dot: 'bg-[color:var(--muted)]' },
}

export const invoiceStatusLabels: Record<string, { text: string; color: string; dot: string }> = {
  'received': { text: '已收齐', color: 'bg-success-100 text-success-700', dot: 'bg-success-500' },
  'partially_paid': { text: '部分收付', color: 'bg-warning-100 text-warning-700', dot: 'bg-warning-500' },
  'issued': { text: '已开具', color: 'bg-[color:var(--panel-2)] text-[color:var(--fg-2)]', dot: 'bg-[color:var(--muted)]' },
  'cancelled': { text: '已作废', color: 'bg-[color:var(--panel-2)] text-[color:var(--muted)]', dot: 'bg-[color:var(--muted)]' },
  'red_flushed': { text: '已红冲', color: 'bg-danger-100 text-danger-700', dot: 'bg-danger-500' },
  '其他': { text: '其他', color: 'bg-[color:var(--panel-2)] text-[color:var(--muted)]', dot: 'bg-[color:var(--muted)]' },
}

export function getGreeting(): string {
  const hour = new Date().getHours()
  return hour < 6 ? '夜深了' : hour < 9 ? '早上好' : hour < 12 ? '上午好' : hour < 14 ? '中午好' : hour < 18 ? '下午好' : '晚上好'
}
