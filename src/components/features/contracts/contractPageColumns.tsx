import type { Column } from '@/components/DataTable'
import type { AgreementContract, Partner, PaymentRecord } from '../../../types/electron'
import type { ContractType, Contract, TypeConfig } from './contractConfig'
import { AGREEMENT_SUB_TYPE_LABELS, getContractPaymentTotal, getStatusLabel, getStatusColor } from './contractConfig'
import { contractStatuses } from '../../../data/regions'
import { formatMoney } from '../../../utils/format'
import { Tooltip } from '../../ui/Tooltip/Tooltip'

export interface ContractColumnsDeps {
  partners: Partner[]
  paymentRecords: PaymentRecord[]
  type: ContractType
  config: TypeConfig
  onEdit: (contract: Contract) => void
  onDelete: (id: number) => void
  onPreview: (contract: Contract) => void
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void
}

export function getContractColumns(deps: ContractColumnsDeps): Column<Contract>[] {
  const { partners, paymentRecords, type, config, onEdit, onDelete, onPreview } = deps

  const baseColumns: Column<Contract>[] = [
    { key: 'name', title: '合同名称', render: (item) => (
      <div className="font-medium text-slate-800">{item.name}
        {type === 'agreement' && (item as AgreementContract).agreementType && (
          <span className="ml-2 px-1.5 py-0.5 text-xs rounded bg-sky-50 text-sky-600 border border-sky-200">
            {AGREEMENT_SUB_TYPE_LABELS[(item as AgreementContract).agreementType] || '协议'}
          </span>
        )}
      </div>
    )},
    { key: 'contractNo', title: '合同编号', render: (item) => <span className="text-sm text-slate-500">{item.contractNo}</span> },
    { key: 'partnerId', title: `${config.partnerCategoryDefault}方`, render: (item) => {
      const partner = partners.find(p => p.id === item.partnerId)
      return <span className="text-sm text-slate-600">{partner?.name || '-'}</span>
    }},
    { key: 'amount', title: '合同金额', align: 'right', sortable: true,
      sorter: (a, b) => ((a.amount || 0) - (b.amount || 0)),
      render: (item) => (
      <span className="font-medium text-slate-800">
        {type === 'agreement' ? (item.amount ? `¥ ${formatMoney(item.amount)}` : '—') : `¥ ${formatMoney(item.amount)}`}
      </span>
    )},
  ]

  const paymentColumn: Column<Contract> = { key: 'payment', title: config.paymentColumnLabel, align: 'right', render: (item) => {
    const paymentTotal = getContractPaymentTotal(item.id, paymentRecords, config)
    return (
      <div>
        <div className={`font-medium ${paymentTotal >= (item.amount ?? 0) ? 'text-green-600' : 'text-slate-800'}`}>
          ¥ {formatMoney(paymentTotal)}
        </div>
        <div className="text-xs text-slate-400">
          {(item.amount ?? 0) > 0 ? ((paymentTotal / (item.amount ?? 0)) * 100).toFixed(0) + '%' : '0%'}
        </div>
      </div>
    )
  }}

  const statusColumn: Column<Contract> = { key: 'status', title: '状态', align: 'center',
    filterable: 'select',
    filterOptions: contractStatuses.map(s => ({ label: s.label, value: s.value })),
    filterAccessor: (item: Contract) => item.status,
    render: (item) => (
    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(item.status)}`}>
      {getStatusLabel(item.status)}
    </span>
  )}

  const endDateColumn: Column<Contract> = { key: 'endDate', title: '到期日期', align: 'center',
    sortable: true,
    sorter: (a, b) => (a.endDate || '').localeCompare(b.endDate || ''),
    render: (item) => (
    <span className="text-sm text-slate-500">{item.endDate || '-'}</span>
  )}

  const actionsColumn: Column<Contract> = { key: 'actions', title: '操作', align: 'center', render: (item) => (
    <div className="flex items-center justify-center gap-1">
      {item.fileUrl && (
        <Tooltip content="预览附件" position="top" delay={300}>
        <button onClick={() => onPreview(item)} className="btn btn-ghost btn-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </button>
      </Tooltip>
      )}
      <button onClick={() => onEdit(item)} className="btn btn-ghost btn-sm text-primary-600">编辑</button>
      <button onClick={() => onDelete(item.id)} className="btn btn-danger btn-sm">删除</button>
    </div>
  )}

  const contractColumns: Column<Contract>[] = type !== 'agreement'
    ? [...baseColumns, paymentColumn, statusColumn, endDateColumn, actionsColumn]
    : [...baseColumns, statusColumn, endDateColumn, actionsColumn]

  return contractColumns
}
