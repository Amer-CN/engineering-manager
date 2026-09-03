import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { SquareHundred } from '@/components/ui/charts/SquareHundred'
import { SimpleBarChart } from '@/components/ui/SimpleBarChart'
import { formatMoney } from '@/utils/format'
import { formatDateTime } from '@/utils/date'
import { invoiceStatusLabels } from '@/components/features/dashboard/dashboardConstants'
import { CHART_COLORS } from '@/components/features/dashboard/dashboardColors'
import { getCategoryLabel } from '@/components/features/costLedger/config'
import { getAPI } from '@/services/api-adapter'
import type { Invoice } from '@/types'

// ReportCharts — 报告中心「报告附图 · 数据快照」区块（预览态专用）
// 数据诚实：图表数值全部来自前端 getAPI() 真实聚合（发票状态计数 / 支出分类金额），
// 与 AI 生成的 markdown 文本互不伪造。加载失败或无数据时整个区块不渲染（返回 null）。

/** invoiceStatusLabels 的 dot 类名 → 可用于 SVG fill 的语义色（同源色板，未知 fallback var(--muted)） */
const DOT_FILL: Record<string, string> = {
  'bg-success-500': 'var(--success)',
  'bg-warning-500': 'var(--warning)',
  'bg-danger-500': 'var(--danger)',
  'bg-[color:var(--muted)]': 'var(--muted)',
}

/** 发票按 status 聚合计数，段顺序/文案/颜色沿用 invoiceStatusLabels */
function buildStatusSegments(invoices: Invoice[]): { name: string; value: number; color: string }[] {
  const counts: Record<string, number> = {}
  for (const inv of invoices) {
    const s = inv.status || '其他'
    counts[s] = (counts[s] || 0) + 1
  }
  const segments: { name: string; value: number; color: string }[] = []
  for (const code of Object.keys(invoiceStatusLabels)) {
    const v = counts[code] || 0
    if (v > 0) {
      segments.push({
        name: invoiceStatusLabels[code].text,
        value: v,
        color: DOT_FILL[invoiceStatusLabels[code].dot] || 'var(--muted)',
      })
    }
  }
  // 未知状态追加在末尾，颜色 fallback var(--muted)
  for (const code of Object.keys(counts)) {
    if (!invoiceStatusLabels[code]) {
      segments.push({ name: code, value: counts[code], color: 'var(--muted)' })
    }
  }
  return segments
}

interface ReportChartsData {
  statusSegments: { name: string; value: number; color: string }[]
  expenseTop: { name: string; amount: number }[]
  takenAt: string
}

export function ReportCharts() {
  const [data, setData] = useState<ReportChartsData | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const api = await getAPI()
        if (!api?.getInvoices || !api?.getDashboardStats) return
        const [invRes, statsRes] = await Promise.all([
          api.getInvoices(),
          api.getDashboardStats(),
        ])
        if (cancelled) return
        const invoices: Invoice[] = invRes?.success && invRes.data ? invRes.data : []
        const expenseByCategory: Record<string, number> =
          statsRes?.success && statsRes.data?.expenseByCategory ? statsRes.data.expenseByCategory : {}
        const statusSegments = buildStatusSegments(invoices)
        const expenseTop = Object.entries(expenseByCategory)
          .map(([code, amount]) => ({ name: getCategoryLabel(code), amount }))
          .filter((d) => d.amount > 0)
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 6)
        if (statusSegments.length === 0 && expenseTop.length === 0) return // 无数据不渲染
        setData({ statusSegments, expenseTop, takenAt: formatDateTime(new Date()) })
      } catch (err) {
        // 静默降级：失败不打扰报告文本，仅记录控制台
        console.error('[ReportCharts] 加载失败:', err)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (!data) return null

  // 发票状态计数 → 百分比（count/total*100 四舍五入，Σ 偏差由 SquareHundred 兜底）
  const invoiceTotal = data.statusSegments.reduce((s, x) => s + x.value, 0)
  const statusPct = data.statusSegments.map((s) => ({
    name: s.name,
    value: invoiceTotal > 0 ? Math.round((s.value / invoiceTotal) * 100) : 0,
    color: s.color,
  }))

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="mt-6"
    >
      <div className="flex items-center gap-2 mb-3">
        <Icon name="BarChart3" size={14} className="text-[color:var(--muted)]" />
        <h3 className="text-sm font-semibold text-[color:var(--fg-2)]">报告附图 · 数据快照</h3>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card
          title={
            <span className="text-sm font-semibold uppercase tracking-wider text-[color:var(--muted)] flex items-center gap-2">
              <Icon name="PieChart" size={14} /> 发票状态
            </span>
          }
          headerDivider
        >
          {data.statusSegments.length > 0 ? (
            <div>
              {/* 原「发票合计」中心数：方阵无中心，挪到卡首行右侧大数字 */}
              <div className="flex items-end justify-between mb-4">
                <span className="text-caption" style={{ color: 'var(--muted)' }}>发票合计</span>
                <span className="font-mono text-numeric-xl tabular-nums" style={{ color: 'var(--fg)' }}>
                  {invoiceTotal}
                </span>
              </div>
              <SquareHundred data={statusPct} />
            </div>
          ) : (
            <p className="text-sm text-[color:var(--muted)]">无发票数据</p>
          )}
        </Card>
        <Card
          title={
            <span className="text-sm font-semibold uppercase tracking-wider text-[color:var(--muted)] flex items-center gap-2">
              <Icon name="BarChart3" size={14} /> 支出分类 TOP 6
            </span>
          }
          headerDivider
        >
          {data.expenseTop.length > 0 ? (
            <SimpleBarChart data={data.expenseTop} colors={CHART_COLORS} formatValue={formatMoney} />
          ) : (
            <p className="text-sm text-[color:var(--muted)]">无支出数据</p>
          )}
        </Card>
      </div>
      <p className="mt-2 text-caption" style={{ color: 'var(--muted)' }}>
        数据来源：发票台账 · 成本台账 · 取数时间 {data.takenAt}
      </p>
    </motion.div>
  )
}

export default ReportCharts
