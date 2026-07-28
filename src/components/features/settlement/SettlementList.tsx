import React from 'react'
import { DataTable, type Column } from '@/components/DataTable'
import { Settlement as SettlementData } from '../../../types/electron'
import { statusConfig, typeConfig, subTypeConfig } from './config'
import { Icon } from '../../ui/Icon'
import { Tooltip } from '../../ui/Tooltip/Tooltip'
import { formatMoney } from '@/utils/format'
import { Button } from '../../ui/Button'

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
        <span style={{ color: 'var(--muted)' }}>
          {typeConfig[item.type].icon}
        </span>
        <div>
          <div className="font-medium text-sm" style={{ color: 'var(--fg)' }}>{item.name}</div>
          <div className="text-xs tabular-nums" style={{ color: 'var(--muted)' }}>{item.settlementNo}</div>
        </div>
      </div>
    )},
    { key: 'subType', title: '类别',
      filterable: 'select',
      filterOptions: Object.entries(subTypeConfig).map(([k, v]) => ({ label: v.label, value: k })),
      filterAccessor: (item: any) => item.subType || '',
      render: (item) => (
      <span className="text-sm" style={{ color: 'var(--fg-2)' }}>{item.subType ? subTypeConfig[item.subType]?.label : '-'}</span>
    )},
    { key: 'partnerName', title: '单位', render: (item) => <span className="text-sm" style={{ color: 'var(--fg-2)' }}>{item.partnerName || '-'}</span> },
    { key: 'settlementDate', title: '结算日期', sortable: true,
      sorter: (a, b) => (a.settlementDate || '').localeCompare(b.settlementDate || ''),
      render: (item) => <span className="text-sm font-mono tabular-nums" style={{ color: 'var(--muted)' }}>{item.settlementDate || item.periodStart || '-'}</span> },
    { key: 'amount', title: '金额', align: 'right', sortable: true,
      sorter: (a, b) => ((a.amount || 0) - (b.amount || 0)),
      render: (item) => <span className="font-semibold font-mono tabular-nums" style={{ color: 'var(--fg)' }}>¥{formatMoney(item.amount)}</span> },
    { key: 'status', title: '状态', align: 'center',
      filterable: 'select',
      filterOptions: Object.entries(statusConfig).map(([k, v]) => ({ label: v.label, value: k })),
      filterAccessor: (item: SettlementData) => item.status,
      render: (item) => (
      <div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig[item.status]?.bgColor || 'bg-[color:var(--panel-2)]'} ${statusConfig[item.status]?.color || 'text-[color:var(--muted)]'}`}>
          {statusConfig[item.status]?.label || item.status || '草稿'}
        </span>
        {(item as SettlementData & { warnings?: string[] }).warnings && (item as SettlementData & { warnings?: string[] }).warnings!.length > 0 && (
          <div className="mt-1 space-y-0.5">
            {(item as SettlementData & { warnings?: string[] }).warnings!.map((w: string, i: number) => (
              <p key={i} className="text-xs max-w-[160px] leading-tight" style={{ color: 'var(--danger)' }}>{w}</p>
            ))}
          </div>
        )}
      </div>
    )},
    { key: 'actions', title: '操作', align: 'center', render: (item) => (
      <div className="flex items-center justify-center gap-0.5">
        {((item.files?.length ?? 0) > 0 || item.fileUrl) && (
          <Tooltip content={`查看凭证 (${item.files?.length || 1}个文件)`} position="top" delay={300}>
            <button onClick={() => onPreviewFile(item)} className="p-1.5 rounded text-[color:var(--accent)] hover:bg-[color:var(--accent-soft)]">
              <Icon name="Eye" size={14} />
            </button>
          </Tooltip>
        )}
        <Tooltip content="打印" position="top" delay={300}>
          <button onClick={() => onPrint(item)} className="p-1.5 rounded text-[color:var(--muted)] hover:text-[color:var(--fg-2)] hover:bg-[color:var(--panel-2)]">
            <Icon name="Printer" size={14} />
          </button>
        </Tooltip>
        {item.status !== 'archived' && (
          <Tooltip content="办理" position="top" delay={300}>
            <button onClick={() => onProcess(item.id)} className="p-1.5 rounded text-[color:var(--success)] hover:bg-[color:var(--success-soft)]">
              <Icon name="Check" size={14} />
            </button>
          </Tooltip>
        )}
        {item.status === 'archived' && (
          <Tooltip content="取消归档" position="top" delay={300}>
            <button onClick={() => onUnarchive(item.id)} className="p-1.5 rounded text-[color:var(--warning)] hover:bg-[color:var(--warning-soft)]">
              <Icon name="Undo" size={14} />
            </button>
          </Tooltip>
        )}
        <Tooltip content="编辑" position="top" delay={300}>
          <button onClick={() => onEdit(item)} className="p-1.5 rounded text-[color:var(--accent)] hover:bg-[color:var(--accent-soft)]">
            <Icon name="Edit3" size={14} />
          </button>
        </Tooltip>
        <Tooltip content="删除" position="top" delay={300}>
          <Button onClick={() => onDelete(item.id)}  variant="danger" size="sm">
            <Icon name="Trash2" size={14} />
          </Button>
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
