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
    // S19 Stitch: 首列结算单号 mono
    { key: 'settlementNo', title: '结算单号', render: (item) => (
      <span className="text-sm font-mono tabular-nums" style={{ color: 'var(--fg)' }}>{item.settlementNo || '-'}</span>
    )},
    { key: 'name', title: '结算名称', render: (item) => (
      <div className="flex items-center gap-2">
        <span style={{ color: 'var(--muted)' }}>
          {typeConfig[item.type].icon}
        </span>
        <span className="font-medium text-sm" style={{ color: 'var(--fg)' }}>{item.name}</span>
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
    { key: 'amount', title: '结算金额 (¥)', align: 'right', sortable: true,
      sorter: (a, b) => ((a.amount || 0) - (b.amount || 0)),
      render: (item) => <span className="font-semibold font-mono tabular-nums" style={{ color: 'var(--fg)' }}>¥{formatMoney(item.amount)}</span> },
    // S19 Stitch: 核验/办理状态 — outlined 半透明药丸 + 语义小图标
    { key: 'status', title: '状态',
      filterable: 'select',
      filterOptions: Object.entries(statusConfig).map(([k, v]) => ({ label: v.label, value: k })),
      filterAccessor: (item: SettlementData) => item.status,
      render: (item) => (
      <div>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig[item.status]?.pill || 'bg-[color:var(--panel-2)] text-[color:var(--muted)] border border-[color:var(--border)]'}`}>
          <Icon name={statusConfig[item.status]?.icon || 'FileText'} size={12} />
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
    { key: 'settlementDate', title: '办理日期', sortable: true,
      sorter: (a, b) => (a.settlementDate || '').localeCompare(b.settlementDate || ''),
      render: (item) => <span className="text-sm font-mono tabular-nums" style={{ color: 'var(--fg-2)' }}>{item.settlementDate || item.periodStart || '-'}</span> },
    // S19 Stitch: 操作列右对齐 + hover 显隐
    { key: 'actions', title: '操作', align: 'right', render: (item) => (
      <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
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
      footer={
        <div className="flex items-center px-4 py-2.5 text-xs text-[color:var(--muted)]">
          {settlements.length > 0
            ? `显示 1 - ${settlements.length} 共 ${settlements.length} 条记录`
            : '共 0 条记录'}
        </div>
      }
    />
  )
}

export default SettlementList
