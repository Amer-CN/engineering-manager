import type { Partner, Invoice, Material } from '@/types'
import { Icon } from '../../ui/Icon'
import { formatMoney } from '@/utils/format'
import { motion } from 'framer-motion'
import { sectionVariant } from '@/constants/animations'

const partnerRoleLabels: Record<string, string> = {
  owner: '建设单位', general_contract: '总承包', professional: '专业分包',
  labor: '劳务分包', material: '材料供应', equipment: '设备租赁',
  design: '设计单位', supervisor: '监理单位', survey: '地勘单位',
  testing: '检测单位', other: '其他',
}

interface Props {
  partnerStats: (Partner & { incAmt: number; expAmt: number })[]
  invoices: Invoice[]
  materials: Material[]
  materialCount: number
  materialTotalAmt: number
  stats: {
    invoiceInTotal: number; receivedInTotal: number
    invoiceOutTotal: number; receivedOutTotal: number
  }
}

function EmptyState({ text }: { text: string }) {
  return <div className="flex flex-col items-center justify-center py-12 text-[color:var(--muted)]"><Icon name="Inbox" size={32} className="mb-2 opacity-40" /><p className="text-sm">{text}</p></div>
}

export function ProjectCommandCenterDetail({ partnerStats, invoices, materials, materialCount, materialTotalAmt, stats }: Props) {
  return (
    <>
      {/* ═══ 5. Partners + Invoices + Materials ═══ */}
      <motion.section variants={sectionVariant} className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-6">
        <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-xl shadow-sm p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[color:var(--muted)] mb-3 flex items-center gap-2"><Icon name="Building2" size={14} /> 关联单位 ({partnerStats.length})</h3>
          {partnerStats.length > 0 ? (
            <div className="space-y-2 max-h-[260px] overflow-y-auto">
              {partnerStats.map(p => (
                <div key={p.id} className="p-2.5 rounded-lg bg-[color:var(--panel-2)] border border-[color:var(--border)] hover:shadow-sm transition-shadow cursor-pointer">
                  <div className="flex items-center gap-2 mb-1"><div className="w-6 h-6 rounded-lg bg-[color:var(--accent-soft)] flex items-center justify-center"><Icon name="Building2" size={12} className="text-[color:var(--accent)]" /></div><span className="text-xs font-medium text-[color:var(--fg-2)] truncate">{p.name}</span><span className="text-caption px-1.5 py-0.5 rounded bg-[color:var(--panel-2)] text-[color:var(--muted)] ml-auto flex-shrink-0">{partnerRoleLabels[p.category] || p.category}</span></div>
                  {(p.incAmt > 0 || p.expAmt > 0) && <div className="flex gap-2 text-caption">{p.incAmt > 0 && <span className="text-success-600">收入 ¥{(p.incAmt / 10000).toFixed(1)}万</span>}{p.expAmt > 0 && <span className="text-danger-500">支出 ¥{(p.expAmt / 10000).toFixed(1)}万</span>}</div>}
                </div>
              ))}
            </div>
          ) : <EmptyState text="暂无关联单位" />}
        </div>
        <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-xl shadow-sm p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[color:var(--muted)] mb-3 flex items-center gap-2"><Icon name="Receipt" size={14} /> 发票概览</h3>
          {invoices.length > 0 ? (
            <div className="space-y-1 max-h-[220px] overflow-y-auto">
              {invoices.slice(0, 6).map(inv => {
                const statusMap: Record<string, { label: string; color: string }> = {
                  received: { label: '已收齐', color: 'bg-success-100 text-success-700' },
                  partially_paid: { label: '部分收款', color: 'bg-warning-100 text-warning-700' },
                  issued: { label: '已开具', color: 'bg-[color:var(--panel-2)] text-[color:var(--fg-2)]' },
                }
                const si = statusMap[inv.status] || { label: inv.status || '未知', color: 'bg-[color:var(--panel-2)] text-[color:var(--muted)]' }
                return (
                  <div key={inv.id} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-[color:var(--panel-2)] transition-colors">
                    <span className="text-xs text-[color:var(--fg-2)] truncate flex-1 min-w-0">{inv.invoiceNo || '无号'}</span>
                    <span className="text-caption text-[color:var(--muted)] flex-shrink-0 font-mono tabular-nums">¥{formatMoney(inv.amount)}</span>
                    <span className={`text-caption px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${si.color}`}>{si.label}</span>
                  </div>
                )
              })}
            </div>
          ) : <EmptyState text="暂无发票" />}
        </div>
        <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-xl shadow-sm p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[color:var(--muted)] mb-3 flex items-center gap-2"><Icon name="Package" size={14} /> 材料使用</h3>
          <div className="flex items-center gap-3 mb-3 text-xs"><span className="text-[color:var(--muted)]">{materialCount}种</span><span className="w-px h-3 bg-[color:var(--panel-2)]" /><span className="font-bold text-[color:var(--fg)] font-mono tabular-nums">¥{formatMoney(materialTotalAmt)}</span></div>
          {materials.length > 0 ? (
            <div className="space-y-1 max-h-[220px] overflow-y-auto">
              {materials.slice(0, 8).map(m => (
                <div key={m.id} className="flex items-center justify-between p-1.5 rounded-lg hover:bg-[color:var(--panel-2)] transition-colors text-xs">
                  <span className="text-[color:var(--fg-2)] truncate max-w-[100px]">{m.name}</span><span className="text-[color:var(--muted)] font-mono tabular-nums">{m.quantity}{m.unit}</span><span className="font-medium text-[color:var(--fg)] font-mono tabular-nums">¥{formatMoney((m.price * m.quantity))}</span>
                </div>
              ))}
              {materials.length > 8 && <p className="text-center text-xs text-[color:var(--muted)] pt-1">还有 {materials.length - 8} 种...</p>}
            </div>
          ) : <EmptyState text="暂未登记材料" />}
        </div>
      </motion.section>

      {/* ═══ 6. Invoice stats + Info ═══ */}
      <motion.section variants={sectionVariant} className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        {[{ l: '收票总额', v: `¥${formatMoney(stats.invoiceInTotal)}`, s: `已付款 ¥${formatMoney(stats.receivedInTotal)}`, cls: 'border-success-200 bg-success-50' },
          { l: '开票总额', v: `¥${formatMoney(stats.invoiceOutTotal)}`, s: `已回款 ¥${formatMoney(stats.receivedOutTotal)}`, cls: 'border-[color:var(--border)] bg-[color:var(--panel-2)]' },
          { l: '应付未付', v: `¥${formatMoney(Math.max(0, stats.invoiceInTotal - stats.receivedInTotal))}`, s: '已收票，尚未付款', cls: 'border-warning-200 bg-warning-50' },
          { l: '应收未收', v: `¥${formatMoney(Math.max(0, stats.invoiceOutTotal - stats.receivedOutTotal))}`, s: '发票已开尚未收款', cls: 'border-danger-200 bg-danger-50' },
        ].map((card, i) => (
          <div key={i} className={`bg-[color:var(--card)] border border-[color:var(--border)] rounded-xl shadow-sm p-3 border ${card.cls}`}>
            <p className="text-xs text-[color:var(--muted)] mb-1">{card.l}</p><p className="text-lg font-bold font-mono tabular-nums tracking-tight text-[color:var(--fg)]">{card.v}</p><p className="text-xs text-[color:var(--muted)]">{card.s}</p>
          </div>
        ))}
      </motion.section>
    </>
  )
}
