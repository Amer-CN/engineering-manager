import { useRef, useState } from 'react'
import type { WageRecord } from '@/types'
import { Icon } from '../../ui/Icon'
import FilterBar from '../../ui/FilterBar'
import { MonthPicker } from '../../ui/MonthPicker'
import { DataTable, type Column } from '@/components/DataTable'
import { Button } from '../../ui/Button'

interface WageRecordsTabProps {
  allWageRecords: WageRecord[]
  filterYearMonth: string
  filterMemberName: string
  selectedIds: Set<number>
  paymentEdits: Map<number, { paidAmount: string; paidDate: string; bankReceiptPath?: string }>
  onFilterYearMonthChange: (val: string) => void
  onFilterNameChange: (val: string) => void
  onPaymentChange: (recordId: number, field: 'paidAmount' | 'paidDate', value: string | number) => void
  onSavePayments: () => void
  onBankReceiptUpload: (pdfPath: string) => void
  receiptParsing: boolean
  receiptResult: { matched: number; failed: number; totalItems: number; date: string; receiptPath: string; totalAmount?: number; successAmount?: number; rawTextSnippet?: string } | null
  toggleSelect: (id: number) => void
  toggleAll: () => void
  onBatchDelete: () => void
  onBatchArchive: () => void
}

function getEditPaidAmount(record: WageRecord, edits: Map<number, { paidAmount: string; paidDate: string }>) {
  const edit = edits.get(record.id)
  if (edit !== undefined) return edit.paidAmount
  return record.paidAmount != null ? String(record.paidAmount) : ''
}

function getEditPaidDate(record: WageRecord, edits: Map<number, { paidAmount: string; paidDate: string }>) {
  const edit = edits.get(record.id)
  return edit?.paidDate ?? record.paidDate ?? ''
}

export default function WageRecordsTab({
  allWageRecords, filterYearMonth, filterMemberName,
  selectedIds, paymentEdits,
  onFilterYearMonthChange, onFilterNameChange,
  onPaymentChange, onSavePayments,
  onBankReceiptUpload, receiptParsing, receiptResult,
  toggleSelect, toggleAll, onBatchDelete, onBatchArchive,
}: WageRecordsTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showRawText, setShowRawText] = useState(false)
  const filtered = allWageRecords.filter(w => {
    if (filterMemberName && !(w.memberName || '').includes(filterMemberName)) return false
    if (filterYearMonth && (w.yearMonth ?? '') !== filterYearMonth) return false
    return true
  })
  const changedCount = paymentEdits.size

  const columns: Column<WageRecord>[] = [
    {
      key: 'select',
      title: '',
      width: '40px',
      render: (item) => (
        <input type="checkbox" checked={selectedIds.has(item.id)}
          onChange={() => toggleSelect(item.id)} className="rounded" />
      )
    },
    {
      key: 'memberName',
      title: '姓名',
      filterable: true,
      filterPlaceholder: '搜索姓名...',
      render: (item) => (
        <span className="font-medium">{item.memberName || '-'}</span>
      )
    },
    {
      key: 'yearMonth',
      title: '月份',
      sortable: true,
      filterable: true,
      sorter: (a, b) => (a.yearMonth || '').localeCompare(b.yearMonth || ''),
      render: (item) => (
        <span>{item.yearMonth}</span>
      )
    },
    {
      key: 'workDays',
      title: '出勤',
      render: (item) => (
        <span>{item.workDays} 天</span>
      )
    },
    {
      key: 'actualWage',
      title: '应发工资',
      sortable: true,
      sorter: (a, b) => ((a.actualWage || 0) - (b.actualWage || 0)),
      render: (item) => (
        <span className="font-medium font-mono tabular-nums">¥{(item.actualWage ?? 0).toFixed(2)}</span>
      )
    },
    {
      key: 'paidAmount',
      title: '实发金额',
      render: (item) => {
        const paidAmount = getEditPaidAmount(item, paymentEdits)
        return (
          <input type="text" inputMode="decimal" value={paidAmount}
            placeholder="0.00"
            onChange={e => onPaymentChange(item.id, 'paidAmount', e.target.value)}
            disabled={!!item.paymentLocked}
            className={`w-24 px-2 py-1 border rounded text-center text-sm ${item.paymentLocked ? 'bg-[color:var(--panel-2)] border-[color:var(--border)] text-[color:var(--muted)] cursor-not-allowed' : 'border-[color:var(--border)]'}`} />
        )
      }
    },
    {
      key: 'paidDate',
      title: '发放日期',
      render: (item) => {
        const paidDate = getEditPaidDate(item, paymentEdits)
        return (
          <div className="flex items-center gap-1">
            <input type="date" value={paidDate}
              onChange={e => onPaymentChange(item.id, 'paidDate', e.target.value)}
              disabled={!!item.paymentLocked}
              className={`w-32 px-2 py-1 border rounded text-sm ${item.paymentLocked ? 'bg-[color:var(--panel-2)] border-[color:var(--border)] text-[color:var(--muted)] cursor-not-allowed' : 'border-[color:var(--border)]'}`} />
            {item.bankReceiptPath && (
              <span className="text-success-500 text-xs" title={`凭证: ${item.bankReceiptPath}`}>📎</span>
            )}
          </div>
        )
      }
    },
    {
      key: 'diff',
      title: '差额',
      render: (item) => {
        const paidAmount = getEditPaidAmount(item, paymentEdits)
        const actualWage = item.actualWage ?? 0
        const diff = (parseFloat(paidAmount) || 0) - actualWage
        const diffColor = diff > 0.01 ? 'text-danger-600' : diff < -0.01 ? 'text-warning-600' : 'text-success-600'
        const diffSign = diff > 0.01 ? '+' : ''
        return (
          <span className={`font-medium ${diffColor}`}>
            {diffSign}¥{diff.toFixed(2)}
          </span>
        )
      }
    }
  ]

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <FilterBar className="mb-6">
        <div className="flex items-center gap-3">
          <input type="checkbox"
            checked={selectedIds.size === filtered.length && filtered.length > 0}
            onChange={toggleAll} className="rounded" />
          <span className="text-sm text-[color:var(--muted)]">{filtered.length} 条记录</span>
          {changedCount > 0 && (
            <Button onClick={onSavePayments}
               variant="success" size="sm">
              保存发放 ({changedCount})
            </Button>
          )}
          {selectedIds.size > 0 && (
            <Button onClick={onBatchDelete}
               variant="danger" size="sm">
              删除选中 ({selectedIds.size})
            </Button>
          )}
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <label className="text-sm text-[color:var(--muted)]">月份</label>
          <MonthPicker value={filterYearMonth} onChange={onFilterYearMonthChange} />
        </div>
        <div className="flex gap-2">
          <Button onClick={onBatchArchive}
            
           variant="warning" size="sm" className="flex items-center gap-1">
            <Icon name="Lock" size={14} />
            归档
          </Button>
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={receiptParsing}
            
           variant="primary" size="sm" className="flex items-center gap-1">
            <Icon name="Upload" size={14} />
            {receiptParsing ? '解析中...' : '上传银行回单'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0]
              if (file && ((file as File & { path?: string }).path ?? "")) {
                onBankReceiptUpload((file as File & { path?: string }).path ?? "")
              }
              e.target.value = ''
            }}
          />
        </div>
      </FilterBar>

      {/* 回单解析结果 */}
      {receiptResult && (
        <div className="mb-4 shrink-0">
          <div className="p-3 bg-[color:var(--panel-2)] border border-[color:var(--border)] rounded-lg text-sm flex items-center gap-4 flex-wrap">
            <span className="font-medium text-[color:var(--fg)]">回单解析结果</span>
            <span className="text-[color:var(--fg-2)]">日期: {receiptResult.date || '未识别'}</span>
            <span className="text-[color:var(--muted)]">总金额: ¥{(receiptResult.totalAmount ?? 0).toFixed(2)}</span>
            <span className="text-[color:var(--muted)]">成功金额: ¥{(receiptResult.successAmount ?? 0).toFixed(2)}</span>
            <span className="text-[color:var(--muted)]">明细行: {receiptResult.totalItems} 条</span>
            <span className="text-success-600 font-medium">✓ 匹配 {receiptResult.matched} 条</span>
            {receiptResult.failed > 0 && (
              <span className="text-warning-600">⚠ 未匹配 {receiptResult.failed} 条</span>
            )}
            {receiptResult.totalItems === 0 && receiptResult.rawTextSnippet && (
              <button onClick={() => setShowRawText(!showRawText)}
                className="text-[color:var(--accent)] underline hover:opacity-80 text-xs ml-auto">
                {showRawText ? '收起提取内容' : '查看提取内容'}
              </button>
            )}
          </div>
          {showRawText && receiptResult.rawTextSnippet && (
            <div className="mt-1 p-3 bg-warning-50 border border-warning-200 rounded-lg text-xs font-mono whitespace-pre-wrap break-all max-h-48 overflow-auto text-[color:var(--fg-2)]">
              {receiptResult.rawTextSnippet}
            </div>
          )}
        </div>
      )}

      <DataTable
        data={filtered}
        columns={columns}
        rowKey="id"
        pagination={false}
        useHoverScrollbar={true}
        scrollClassName="h-full"
        emptyText="暂无工资发放记录"
        emptyIcon="File"
      />
    </div>
  )
}
