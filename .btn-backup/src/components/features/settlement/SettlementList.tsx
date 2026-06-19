import React from 'react'
import { DataTable, type Column } from '@/components/DataTable'
import { Settlement as SettlementData } from '../../../types/electron'
import { statusConfig, typeConfig, subTypeConfig } from './config'
import { Icon } from '../../ui/Icon'
import { Tooltip } from '../../ui/Tooltip/Tooltip'
import { formatMoney } from '@/utils/format'

interface SettlementListProps {
  settlements: SettlementData[]
  onEdit: (settlement: SettlementData) => void
  onDelete: (id: number) => void
  onProcess: (id: number) => void
  onUnarchive: (id: number) => void
  onPrint: (settlement: SettlementData) => void
  onPreviewFile: (settlement: SettlementData) => void
}

export const SettlementList: React.FC<SettlementListProps> = ({
  settlements,
  onEdit,
  onDelete,
  onProcess,
  onUnarchive,
  onPrint,
  onPreviewFile,
}) => {
  const columns: Column<SettlementData>[] = [
    { key: 'name', title: '结算名称', render: (item) => (
      <div className="flex items-center gap-2">
        <span className={item.type === 'income' ? 'text-emerald-500' : 'text-red-500'}>
          {typeConfig[item.type].icon}
        </span>
        <div>
          <div className="font-medium text-slate-800 text-sm">{item.name}</div>
          <div className="text-xs text-slate-400">{item.settlementNo}</div>
        </div>
      </div>
    )},
    { key: 'subType', title: '类别',
      filterable: 'select',
      filterOptions: Object.entries(subTypeConfig).map(([k, v]) => ({ label: v.label, value: k })),
      filterAccessor: (item: any) => item.subType || '',
      render: (item) => (
      <span className="text-sm text-slate-600">{(item as any).subType ? subTypeConfig[(item as any).subType]?.label : '-'}</span>
    )},
    { key: 'partnerName', title: '单位', render: (item) => <span className="text-sm text-slate-600">{item.partnerName || '-'}</span> },
    { key: 'settlementDate', title: '结算日期', sortable: true,
      sorter: (a, b) => ((a as any).settlementDate || '').localeCompare((b as any).settlementDate || ''),
      render: (item) => <span className="text-sm text-slate-500">{(item as any).settlementDate || item.periodStart || '-'}</span> },
    { key: 'amount', title: '金额', align: 'right', sortable: true,
      sorter: (a, b) => ((a.amount || 0) - (b.amount || 0)),
      render: (item) => <span className="font-semibold text-slate-800">¥{formatMoney(item.amount)}</span> },
    { key: 'status', title: '状态', align: 'center',
      filterable: 'select',
      filterOptions: Object.entries(statusConfig).map(([k, v]) => ({ label: v.label, value: k })),
      filterAccessor: (item: SettlementData) => item.status,
      render: (item) => (
      <div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig[item.status]?.bgColor || 'bg-slate-100'} ${statusConfig[item.status]?.color || 'text-slate-600'}`}>
          {statusConfig[item.status]?.label || item.status || '草稿'}
        </span>
        {(item as any).warnings && (item as any).warnings.length > 0 && (
          <div className="mt-1 space-y-0.5">
            {(item as any).warnings.map((w: string, i: number) => (
              <p key={i} className="text-xs text-red-500 max-w-[160px] leading-tight">{w}</p>
            ))}
          </div>
        )}
      </div>
    )},
    { key: 'actions', title: '操作', align: 'center', render: (item) => (
      <div className="flex items-center justify-center gap-0.5">
        {((item as any).files?.length > 0 || item.fileUrl) && (
          <Tooltip content={`查看凭证 (${(item as any).files?.length || 1}个文件)`} position="top" delay={300}>
            <button onClick={() => onPreviewFile(item)} className="p-1.5 text-violet-500 hover:bg-violet-50 rounded">
              <Icon name="Eye" size={14} />
            </button>
          </Tooltip>
        )}
        <Tooltip content="打印" position="top" delay={300}>
          <button onClick={() => onPrint(item)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded">
            <Icon name="Printer" size={14} />
          </button>
        </Tooltip>
        {item.status !== 'archived' && (
          <Tooltip content="办理" position="top" delay={300}>
            <button onClick={() => onProcess(item.id)} className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded">
              <Icon name="Check" size={14} />
            </button>
          </Tooltip>
        )}
        {item.status === 'archived' && (
          <Tooltip content="取消归档" position="top" delay={300}>
            <button onClick={() => onUnarchive(item.id)} className="p-1.5 text-amber-500 hover:bg-amber-50 rounded">
              <Icon name="Undo" size={14} />
            </button>
          </Tooltip>
        )}
        <Tooltip content="编辑" position="top" delay={300}>
          <button onClick={() => onEdit(item)} className="p-1.5 text-primary-500 hover:bg-primary-50 rounded">
            <Icon name="Edit3" size={14} />
          </button>
        </Tooltip>
        <Tooltip content="删除" position="top" delay={300}>
          <button onClick={() => onDelete(item.id)} className="btn btn-danger btn-sm">
            <Icon name="Trash2" size={14} />
          </button>
        </Tooltip>
      </div>
    )},
  ]

  return (
    <DataTable
      data={settlements}
      columns={columns}
      rowKey="id"
      pagination={false}
      showContainer={true}
      stickyHeader={true}
      emptyText="暂无结算单"
      emptyIcon="ClipboardList"
    />
  )
}

export default SettlementList
