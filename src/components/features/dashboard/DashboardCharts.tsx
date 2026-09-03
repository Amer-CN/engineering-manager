import React from 'react'
import { motion } from 'framer-motion'
import { Icon } from '@/components/ui/Icon'
import { Card } from '@/components/ui/Card'
import { SimpleBarChart } from '@/components/ui/SimpleBarChart'
import { EditorialDonut } from '@/components/ui/charts/EditorialDonut'
import { sectionVariant } from '@/constants/animations'
import { CHART_COLORS } from './dashboardColors'
import { formatCurrency, invoiceStatusLabels } from './dashboardConstants'

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
      <Card title={<span className="text-sm font-semibold uppercase tracking-wider text-[color:var(--muted)] flex items-center gap-2"><Icon name="BarChart3" size={14} /> 支出分类</span>} headerDivider className="hover:shadow-lift transition-shadow">
        {chartData.expenseByCategory.length > 0 ? (
          <SimpleBarChart data={chartData.expenseByCategory} colors={CHART_COLORS} formatValue={formatCurrency} />
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-[color:var(--muted)]">
            <Icon name="Wallet" size={32} className="mb-2 opacity-40" /><p className="text-sm">暂无支出数据</p>
          </div>
        )}
      </Card>

      {/* Invoice Status — 编辑风多段圆环（手写 SVG，无 recharts） */}
      <Card title={<span className="text-sm font-semibold uppercase tracking-wider text-[color:var(--muted)] flex items-center gap-2"><Icon name="PieChart" size={14} /> 发票状态</span>} headerDivider className="hover:shadow-lift transition-shadow">
        {chartData.invoiceStatus.length > 0 ? (
          <div className="flex items-center h-72 py-2">
            <EditorialDonut
              data={chartData.invoiceStatus.map((entry) => ({
                name: invoiceStatusLabels[entry.name]?.text || entry.name,
                value: entry.value,
                color: entry.color,
              }))}
              formatValue={String}
              centerLabel="发票合计"
              size={200}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-[color:var(--muted)]">
            <Icon name="Receipt" size={32} className="mb-2 opacity-40" /><p className="text-sm">暂无发票数据</p>
          </div>
        )}
      </Card>
    </motion.section>
  )
}

export default DashboardCharts

