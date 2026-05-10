/**
 * ProjectStats - 统计卡片行
 */
import React from 'react'
import { Icon } from '../../ui/Icon'
import { formatMoney } from '@/utils/format'

export interface ProjectStatsData {
  totalExpenses: number; completedTasks: number; taskProgress: number
  incomeTotal: number; expenseTotal: number; invoiceInTotal: number
  invoiceOutTotal: number; receivedInTotal: number; receivedOutTotal: number
  staffCount: number; workerCount: number; teamCount: number
  materialTotal: number; settlementIncomeTotal: number; settlementExpenseTotal: number
  totalRevenue: number; totalCost: number; netProfit: number
  daysElapsed: number; totalDays: number; timeProgress: number
  overdueTasks: number; partnerCount: number; materialCount: number
  workerCountTotal: number
}

function StatCard({ icon, label, value, accent, valueColor }: {
  icon: React.ReactNode; label: string; value: string; accent?: string; valueColor?: string
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent || 'bg-slate-100'}`}>{icon}</div>
        <div>
          <p className="text-xs text-slate-400">{label}</p>
          <p className={`text-lg font-bold ${valueColor || 'text-slate-800'}`}>{value}</p>
        </div>
      </div>
    </div>
  )
}

export function ProjectStats({ budget, stats }: { budget: number; stats: ProjectStatsData }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
      <StatCard icon={<Icon name="DollarSign" size={20} className="text-emerald-500" />} accent="bg-emerald-50" label="合同价" value={`¥${formatMoney(budget)}`} />
      <StatCard icon={<Icon name="TrendingDown" size={20} className="text-red-500" />} accent="bg-red-50" label="已支出" value={`¥${formatMoney(stats.totalExpenses)}`} valueColor="text-red-500" />
      <StatCard icon={<Icon name="LayoutDashboard" size={20} className="text-blue-500" />} accent="bg-blue-50" label="任务完成" value={`${stats.taskProgress}%`} valueColor="text-blue-500" />
      <StatCard icon={<Icon name="UserCircle" size={20} className="text-purple-500" />} accent="bg-purple-50" label="管理人员" value={`${stats.staffCount}人`} />
      <StatCard icon={<Icon name="Construction" size={20} className="text-amber-500" />} accent="bg-amber-50" label="农民工" value={`${stats.workerCount}人`} />
      <StatCard icon={<Icon name="Building2" size={20} className="text-slate-500" />} accent="bg-slate-100" label="班组" value={`${stats.teamCount}个`} />
    </div>
  )
}
