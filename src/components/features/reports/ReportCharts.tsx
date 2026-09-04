import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { SquareHundred } from '@/components/ui/charts/SquareHundred'
import { EditorialBars } from '@/components/ui/charts/EditorialBars'
import { formatMoney } from '@/utils/format'
import { formatDateTime } from '@/utils/date'
import { invoiceStatusLabels } from '@/components/features/dashboard/dashboardConstants'
import { getCategoryLabel } from '@/components/features/costLedger/config'
import { PRESETS } from '@/components/ui/charts/colorPresets'
import { getAPI } from '@/services/api-adapter'
import type { CostLedgerCategory, Invoice } from '@/types'

// ReportCharts — 报告中心「报告附图 · 数据快照」区块（预览态专用；打印链共用下方取数函数）
// 数据诚实：图表数值全部来自前端 getAPI() 真实聚合（发票状态计数 / 支出分类金额），
// 与 AI 生成的 markdown 文本互不伪造。加载失败或无数据时整个区块不渲染（返回 null）。
// 色彩：附图区视为一组图，统一 Palm · 椰林绿（官方 SER 正本）——方阵与条形同一系统，
// 逐条按序取 SER，消除「绿点阵+黑条形」的语义色/墨色割裂（原 DOT_FILL 语义色弃用）。

/** Palm SER（6 类容量正本，恰好覆盖 6 状态/6 条形，不循环） */
const PALM_SER: string[] = PRESETS.palm.ser ?? []

/** 发票按 status 聚合计数，段顺序/文案沿用 invoiceStatusLabels；颜色 = Palm SER 按状态顺序映射 */
function buildStatusSegments(invoices: Invoice[]): { name: string; value: number; color: string }[] {
  const counts: Record<string, number> = {}
  for (const inv of invoices) {
    const s = inv.status || '其他'
    counts[s] = (counts[s] || 0) + 1
  }
  const statusCodes = Object.keys(invoiceStatusLabels)
  const segments: { name: string; value: number; color: string }[] = []
  for (const code of statusCodes) {
    const v = counts[code] || 0
    if (v > 0) {
      segments.push({
        name: invoiceStatusLabels[code].text,
        value: v,
        // 按状态定义顺序取 Palm SER（与计数是否为 0 无关，颜色钉在状态顺序上）
        color: PALM_SER[statusCodes.indexOf(code)] ?? 'var(--muted)',
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

/** camelCase → snake_case（api-client convertKeysToCamelCase 的还原：expenseByCategory
 *  的 key 会被转成 intermediaryFee，而台账分类 code 正本是 intermediary_fee） */
function toSnakeCode(code: string): string {
  return code.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase()
}

/**
 * 支出类目 code → 中文标签：中文原样返回；否则传动态分类查 getCategoryLabel
 * （动态名优先 → 内置常量），仍无映射时不裸上墙，显示「自定义·code 前缀」。
 */
export function resolveCategoryLabel(
  code: string,
  dynamicCategories?: CostLedgerCategory[] | null,
): string {
  if (/[\u4e00-\u9fff]/.test(code)) return code
  const snake = toSnakeCode(code)
  const label = getCategoryLabel(snake, dynamicCategories)
  if (label !== snake) return label
  const bare = code.startsWith('custom_') ? code.slice('custom_'.length) : code
  return `自定义·${bare.slice(0, 6)}`
}

export interface ReportChartsData {
  statusSegments: { name: string; value: number; color: string }[]
  expenseTop: { name: string; amount: number }[]
  takenAt: string
}

/**
 * 拉取 + 聚合报告附图数据（预览 ReportCharts 与打印 ReportResultPanel 共用同一口径：
 * 发票状态计数 / 支出分类 TOP，类目名走动态分类中文）。无数据返回 null。
 */
export async function fetchReportChartsData(): Promise<ReportChartsData | null> {
  const api = await getAPI()
  if (!api?.getInvoices || !api?.getDashboardStats) return null
  const [invRes, statsRes, catRes] = await Promise.all([
    api.getInvoices(),
    api.getDashboardStats(),
    api.getCostLedgerCategories ? api.getCostLedgerCategories() : Promise.resolve(null),
  ])
  const invoices: Invoice[] = invRes?.success && invRes.data ? invRes.data : []
  const expenseByCategory: Record<string, number> =
    statsRes?.success && statsRes.data?.expenseByCategory ? statsRes.data.expenseByCategory : {}
  const categories: CostLedgerCategory[] | null =
    catRes?.success && catRes.data ? catRes.data : null
  const statusSegments = buildStatusSegments(invoices)
  const expenseTop = Object.entries(expenseByCategory)
    .map(([code, amount]) => ({ name: resolveCategoryLabel(code, categories), amount }))
    .filter((d) => d.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6)
  if (statusSegments.length === 0 && expenseTop.length === 0) return null // 无数据不渲染
  return { statusSegments, expenseTop, takenAt: formatDateTime(new Date()) }
}

export function ReportCharts() {
  const [data, setData] = useState<ReportChartsData | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchReportChartsData()
      .then((d) => {
        if (!cancelled && d) setData(d)
      })
      .catch((err) => {
        // 静默降级：失败不打扰报告文本，仅记录控制台
        console.error('[ReportCharts] 加载失败:', err)
      })
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

  // 条形数据由 EditorialBars 自行取满条基准（max = data[0].value），调用方无需再算

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
      {/* 上下堆叠（原 lg 并排时图例被卡片右缘截断）：两卡全幅，图例/类目名完整显示 */}
      <div className="grid grid-cols-1 gap-4">
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
            /* 编辑风横向条形（与打印生成器 buildTopBarsSvg 同口径）：降序传入 + 条尾 ¥ 金额。
               色逐条随数据取 Palm SER（与方阵同系统）；组件默认仅首条显色
               （上批裁定：不传 accentFirst），其余条为中性墨阶。 */
            <EditorialBars
              data={data.expenseTop.map((d, i) => ({
                name: d.name,
                value: d.amount,
                color: PALM_SER[i] ?? 'var(--muted)',
              }))}
              formatValue={(v) => `¥${formatMoney(v)}`}
            />
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
