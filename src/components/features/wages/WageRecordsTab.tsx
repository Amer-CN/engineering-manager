import { useRef, useState } from 'react'
import { HoverScrollbar } from '@/components/ui/HoverScrollbar'
import type { WageRecord } from '@/types'
import { Icon } from '../../ui/Icon'
import { EmptyState } from '../../ui/EmptyState'
import { WageRecordRow } from './WageRecordRow'
import { TABLE } from '@/constants/table'

interface WageRecordsTabProps {
  allWageRecords: WageRecord[]
  filterYear: string
  filterMonth: string
  filterMemberName: string
  selectedIds: Set<number>
  paymentEdits: Map<number, { paidAmount: string; paidDate: string; bankReceiptPath?: string }>
  onFilterYearChange: (val: string) => void
  onFilterMonthChange: (val: string) => void
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
  allWageRecords, filterYear, filterMonth, filterMemberName,
  selectedIds, paymentEdits,
  onFilterYearChange, onFilterMonthChange, onFilterNameChange,
  onPaymentChange, onSavePayments,
  onBankReceiptUpload, receiptParsing, receiptResult,
  toggleSelect, toggleAll, onBatchDelete, onBatchArchive,
}: WageRecordsTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showRawText, setShowRawText] = useState(false)
  const filtered = allWageRecords.filter(w => {
    if (filterMemberName && !(w.memberName || '').includes(filterMemberName)) return false
    if (filterYear && filterYear !== '全部' && !(w.yearMonth ?? '').startsWith(filterYear)) return false
    if (filterMonth && filterMonth !== '全部' && (w.yearMonth ?? '') !== `${filterYear}-${filterMonth}`) return false
    return true
  })
  const changedCount = paymentEdits.size

  return (
    <div className="p-4">
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <span className="text-sm text-slate-400">{filtered.length} 条记录</span>
        {changedCount > 0 && (
          <button onClick={onSavePayments}
            className="btn btn-success btn-sm">
            保存发放 ({changedCount})
          </button>
        )}
        <button onClick={onBatchArchive}
          className="btn btn-warning btn-sm flex items-center gap-1"
        >
          <Icon name="Lock" size={14} />
          归档
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={receiptParsing}
          className="btn btn-primary btn-sm flex items-center gap-1"
        >
          <Icon name="Upload" size={14} />
          {receiptParsing ? '解析中...' : '上传银行回单'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file && (file as any).path) {
              onBankReceiptUpload((file as any).path)
            }
            e.target.value = ''
          }}
        />
        {selectedIds.size > 0 && (
          <button onClick={onBatchDelete}
            className="btn btn-danger btn-sm">
            删除选中 ({selectedIds.size})
          </button>
        )}
      </div>

      {/* 回单解析结果 */}
      {receiptResult && (
        <div className="mb-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm flex items-center gap-4 flex-wrap">
            <span className="font-medium text-blue-800">回单解析结果</span>
            <span className="text-blue-600">日期: {receiptResult.date || '未识别'}</span>
            <span className="text-slate-500">总金额: ¥{(receiptResult.totalAmount ?? 0).toFixed(2)}</span>
            <span className="text-slate-500">成功金额: ¥{(receiptResult.successAmount ?? 0).toFixed(2)}</span>
            <span className="text-slate-500">明细行: {receiptResult.totalItems} 条</span>
            <span className="text-green-600 font-medium">✓ 匹配 {receiptResult.matched} 条</span>
            {receiptResult.failed > 0 && (
              <span className="text-amber-600">⚠ 未匹配 {receiptResult.failed} 条</span>
            )}
            {receiptResult.totalItems === 0 && receiptResult.rawTextSnippet && (
              <button onClick={() => setShowRawText(!showRawText)}
                className="text-blue-700 underline hover:text-blue-900 text-xs ml-auto">
                {showRawText ? '收起提取内容' : '查看提取内容'}
              </button>
            )}
          </div>
          {showRawText && receiptResult.rawTextSnippet && (
            <div className="mt-1 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs font-mono whitespace-pre-wrap break-all max-h-48 overflow-auto text-slate-700">
              {receiptResult.rawTextSnippet}
            </div>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState icon="File" title="暂无工资发放记录" description="请先在「项目工资表」中生成并保存工资" />
      ) : (
        <HoverScrollbar className="h-full">
          <table className={TABLE.table + ' text-sm'}>
            <thead className={TABLE.headerRow + ' ' + TABLE.stickyHeader}>
              <tr>
                <th className={TABLE.headerCell + ' w-10'}>
                  <input type="checkbox"
                    checked={selectedIds.size === filtered.length && filtered.length > 0}
                    onChange={toggleAll} className="rounded" />
                </th>
                <th className={TABLE.headerCell}>姓名</th>
                <th className={TABLE.headerCell}>月份</th>
                <th className={TABLE.headerCell}>出勤</th>
                <th className={TABLE.headerCell}>应发工资</th>
                <th className={TABLE.headerCell}>实发金额</th>
                <th className={TABLE.headerCell}>发放日期</th>
                <th className={TABLE.headerCell}>差额</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(w => (
                <WageRecordRow
                  key={w.id}
                  record={w}
                  isSelected={selectedIds.has(w.id)}
                  paidAmount={getEditPaidAmount(w, paymentEdits)}
                  paidDate={getEditPaidDate(w, paymentEdits)}
                  onToggleSelect={toggleSelect}
                  onPaymentChange={onPaymentChange}
                />
              ))}
            </tbody>
          </table>
        </HoverScrollbar>
      )}
    </div>
  )
}
