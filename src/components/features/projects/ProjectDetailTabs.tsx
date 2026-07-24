import { DataTable, type Column } from '@/components/DataTable'
import type { Partner, IncomeContract, ExpenseContract, Invoice } from '@/types'
import { ProjectStatsData } from './ProjectStats'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '../../ui/Icon'
import { formatMoney } from '@/utils/format'

export { MembersTab } from './MembersTab'

const CARD = 'bg-white border border-slate-200 rounded-xl shadow-sm'
const partnerRoleLabels: Record<string, string> = {
  owner: '建设单位', general_contract: '总承包', professional: '专业分包',
  labor: '劳务分包', material: '材料供应', equipment: '设备租赁',
  design: '设计单位', supervisor: '监理单位', survey: '勘察单位',
  testing: '检测单位', other: '其他',
}

function EmptyState({ text }: { text: string }) {
  return <div className="flex flex-col items-center justify-center py-12 text-slate-400"><Icon name="Inbox" size={32} className="mb-2 opacity-40" /><p className="text-sm">{text}</p></div>
}

function InvoiceStatusBadge({ status, type }: { status: string; type?: string }) {
  const v: Record<string, 'success' | 'warning' | 'danger' | 'info'> = { received: 'success', partially_paid: 'warning', cancelled: 'danger', issued: 'info' }
  const isIn = type === 'invoice_in'
  const l: Record<string, string> = {
    received: isIn ? '已付清' : '已收齐',
    partially_paid: isIn ? '部分付款' : '部分收款',
    cancelled: '已作废',
    issued: isIn ? '已收票' : '已开具'
  }
  return <Badge variant={v[status] || 'info'}>{l[status] || status}</Badge>
}

export function ContractsTab({ incomeContracts, expenseContracts, stats }: {
  incomeContracts: IncomeContract[]; expenseContracts: ExpenseContract[]; stats: ProjectStatsData
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center"><Icon name="TrendingUp" size={14} className="text-emerald-600" /></span>收入合同
        </h3>
        {incomeContracts.length > 0 ? (
          <div className="space-y-2">
            {incomeContracts.map(c => (
              <div key={c.id} className={`${CARD} p-3 border-l-2 border-l-emerald-400`}>
                <div className="flex items-center justify-between mb-1"><span className="font-medium text-sm text-slate-800">{c.name}</span><span className="font-bold text-sm text-emerald-600 tabular-nums">¥{formatMoney(c.amount)}</span></div>
                <div className="text-xs text-slate-400">{c.partnerName || '未知'} · {c.signedDate}</div>
              </div>
            ))}
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="flex justify-between text-sm"><span className="text-emerald-700 font-medium">合计</span><span className="text-emerald-700 font-bold tabular-nums">¥{formatMoney(stats.incomeTotal)}</span></div>
            </div>
          </div>
        ) : <EmptyState text="暂无收入合同" />}
      </div>
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center"><Icon name="TrendingDown" size={14} className="text-red-600" /></span>支出合同
        </h3>
        {expenseContracts.length > 0 ? (
          <div className="space-y-2">
            {expenseContracts.map(c => (
              <div key={c.id} className={`${CARD} p-3 border-l-2 border-l-red-400`}>
                <div className="flex items-center justify-between mb-1"><span className="font-medium text-sm text-slate-800">{c.name}</span><span className="font-bold text-sm text-red-600 tabular-nums">¥{formatMoney(c.amount)}</span></div>
                <div className="text-xs text-slate-400">{c.partnerName || '未知'} · {c.signedDate}</div>
              </div>
            ))}
            <div className="p-3 rounded-xl bg-red-50 border border-red-200">
              <div className="flex justify-between text-sm"><span className="text-red-700 font-medium">合计</span><span className="text-red-700 font-bold tabular-nums">¥{formatMoney(stats.expenseTotal)}</span></div>
            </div>
          </div>
        ) : <EmptyState text="暂无支出合同" />}
      </div>
    </div>
  )
}

export function InvoicesTab({ invoices, stats }: { invoices: Invoice[]; stats: ProjectStatsData }) {
  const invoiceColumns: Column<Invoice>[] = [
    { key: 'invoiceNo', title: '发票号', render: (item) => <span className="text-sm font-mono text-slate-700">{item.invoiceNo}</span> },
    { key: 'type', title: '类型', render: (item) => <Badge variant={item.type === 'invoice_in' ? 'success' : 'info'}>{item.type === 'invoice_in' ? '进项' : '销项'}</Badge> },
    { key: 'name', title: '名称', render: (item) => <span className="text-sm text-slate-700">{item.name}</span> },
    { key: 'amount', title: '金额', align: 'right', render: (item) => <span className="font-medium text-slate-800 text-sm tabular-nums">¥{formatMoney(item.amount)}</span> },
    { key: 'receivedAmount', title: '已收/已付', align: 'right', render: (item) => <span className="text-sm text-emerald-600 tabular-nums">¥{formatMoney(item.receivedAmount)}</span> },
    { key: 'status', title: '状态', align: 'center', render: (item) => <InvoiceStatusBadge status={item.status} type={item.type} /> },
  ]

  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {[{ label: '进项发票', icon: 'Download', cls: 'border-emerald-200 bg-emerald-50', color: 'emerald', total: stats.invoiceInTotal, received: stats.receivedInTotal, unreceived: stats.invoiceInTotal - stats.receivedInTotal, paidLabel: '已付款', unpaidLabel: '未付款' },
          { label: '销项发票', icon: 'Upload', cls: 'border-blue-200 bg-blue-50', color: 'blue', total: stats.invoiceOutTotal, received: stats.receivedOutTotal, unreceived: stats.invoiceOutTotal - stats.receivedOutTotal, paidLabel: '已回款', unpaidLabel: '未回款' },
        ].map((card, i) => (
          <div key={i} className={`${CARD} p-5 border ${card.cls}`}>
            <div className="flex items-center gap-2 mb-3"><Icon name={card.icon} size={16} className={`text-${card.color}-600`} /><span className={`font-semibold text-sm text-${card.color}-700`}>{card.label}</span></div>
            <p className="text-2xl font-bold text-slate-800 mb-2">¥{formatMoney(card.total)}</p>
            <div className="text-sm space-y-1">
              <p className="text-slate-500">{card.paidLabel}: <span className="text-emerald-600 font-medium">¥{formatMoney(card.received)}</span></p>
              <p className="text-slate-500">{card.unpaidLabel}: <span className="text-amber-600 font-medium">¥{formatMoney(Math.max(0, card.unreceived))}</span></p>
            </div>
          </div>
        ))}
      </div>
      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">发票列表</h3>
      {invoices.length > 0 ? (
        <DataTable
          data={invoices}
          columns={invoiceColumns}
          rowKey="id"
          pagination={false}
          showContainer={true}
          stickyHeader={true}
          emptyText="暂无发票记录"
        />
      ) : <EmptyState text="暂无发票记录" />}
    </div>
  )
}

export function PartnersTab({ partners }: { partners: Partner[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">关联单位 ({partners.length})</h3>
      {partners.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {partners.map(p => (
            <div key={p.id} className={`${CARD} p-4 hover:shadow-md transition-shadow`}>
              <div className="flex items-center gap-3 mb-3"><div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center"><Icon name="Building2" size={18} className="text-violet-600" /></div><div className="flex-1 min-w-0"><p className="text-sm font-medium text-slate-800 truncate">{p.name}</p><p className="text-xs text-slate-500">{partnerRoleLabels[p.category] || p.category}</p></div></div>
              <div className="grid grid-cols-2 gap-2 text-xs"><div><span className="text-slate-400">联系人:</span><span className="ml-1 text-slate-600">{p.contact || '-'}</span></div><div><span className="text-slate-400">电话:</span><span className="ml-1 text-slate-600">{p.phone || '-'}</span></div></div>
            </div>
          ))}
        </div>
      ) : <EmptyState text="暂无关联单位" />}
    </div>
  )
}
