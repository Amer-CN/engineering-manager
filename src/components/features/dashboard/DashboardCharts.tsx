import React from 'react'
import { motion } from 'framer-motion'
import {
  Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { Icon } from '@/components/ui/Icon'
import { Card } from '@/components/ui/Card'
import { SimpleBarChart } from '@/components/ui/SimpleBarChart'
import { sectionVariant } from '@/constants/animations'
import { CHART_COLORS, formatCurrency, invoiceStatusLabels } from './dashboardConstants'

export interface ChartData {
  expenseByCategory: { name: string; amount: number; color?: string }[]
  invoiceStatus: { name: string; value: number; color: string }[]
}

interface DashboardChartsProps {
  chartData: ChartData
}

const DashboardCharts: React.FC<DashboardChartsProps> = ({ chartData }) => {
  return (
    <motion.section variants={sectionVariant} className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
      {/* BarChart — 原生 SVG，无 Recharts hover 干扰 */}
      <Card title={<span className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2"><Icon name="BarChart3" size={14} /> 支出分类</span>} headerDivider className="hover:shadow-[0_8px_25px_rgba(0,0,0,0.08)] transition-shadow">
        {chartData.expenseByCategory.length > 0 ? (
          <SimpleBarChart data={chartData.expenseByCategory} colors={CHART_COLORS} formatValue={formatCurrency} />
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <Icon name="Wallet" size={32} className="mb-2 opacity-40" /><p className="text-sm">暂无支出数据</p>
          </div>
        )}
      </Card>

      {/* Invoice Status PieChart */}
      <Card title={<span className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2"><Icon name="PieChart" size={14} /> 发票状态</span>} headerDivider className="hover:shadow-[0_8px_25px_rgba(0,0,0,0.08)] transition-shadow">
        {chartData.invoiceStatus.length > 0 ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4, duration: 0.4 }}
            className="flex items-center h-72">
            <div className="flex-1 h-full min-w-0">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={chartData.invoiceStatus} cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={3} dataKey="value" strokeWidth={0}
                    animationDuration={1200} animationEasing="ease-out">
                    {chartData.invoiceStatus.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, boxShadow: 'var(--shadow-md)', color: 'var(--fg)' }} formatter={((value: any, name: any) => [value, invoiceStatusLabels[name ?? '']?.text || name]) as any} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-36 space-y-3 pl-2">
              {chartData.invoiceStatus.map((entry, i) => (
                <motion.div key={entry.name} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.1 }}
                  className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                  <div className="flex-1 min-w-0"><div className="text-xs text-slate-500 truncate">{invoiceStatusLabels[entry.name]?.text || entry.name}</div><div className="text-sm font-semibold text-slate-800">{entry.value}</div></div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <Icon name="Receipt" size={32} className="mb-2 opacity-40" /><p className="text-sm">暂无发票数据</p>
          </div>
        )}
      </Card>
    </motion.section>
  )
}

export default DashboardCharts
