import { useRef, useState } from 'react'
import type { WageRecord } from '@/types'
import { Icon } from '../../ui/Icon'
import { MONTHS } from '@/constants'
import { WageRecordRow } from './WageRecordRow'

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
    if (filterYear && filterYear !== '全部' && !w.yearMonth.startsWith(filterYear)) return false
    if (filterMonth && filterMonth !== '全部' && w.yearMonth !== `${filterYear}-${filterMonth}`) return false
    return true
  })
  const changedCount = paymentEdits.size
  const currentYear = new Date().getFullYear().toString()
// @ts-ignore TS6133: effectiveYear is declared but never read
  const effectiveYear = filterYear || currentYear

  return (
    <div className="p-4">
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600">年份</label>
          <select value={filterYear || currentYear}
            onChange={e => { onFilterYearChange(e.target.value); onFilterMonthChange('全部') }}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm">
            <option value="全部">全部</option>
            {Array.from({ length: 21 }, (_, i) => {
              const y = (new Date().getFullYear() - 10 + i).toString()
              return <option key={y} value={y}>{y}年</option>
            })}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600">月份</label>
          <select value={filterMonth || '全部'}
            onChange={e => onFilterMonthChange(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm">
            {MONTHS.map(m => <option key={m} value={m}>{m === '全部' ? '全部' : `${m}月`}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600">姓名</label>
          <input type="text" value={filterMemberName}
            onChange={e => onFilterNameChange(e.target.value)}
            placeholder="搜索姓名..." className="px-3 py-2 border border-slate-300 rounded-lg text-sm w-40" />
        </div>
        <span className="text-sm text-slate-400">{filtered.length} 条记录</span>
        {changedCount > 0 && (
          <button onClick={onSavePayments}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
            保存发放 ({changedCount})
          </button>
        )}
        <button onClick={onBatchArchive}
          className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
        >
          <Icon name="Lock" size={14} />
          归档
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={receiptParsing}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
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
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
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
        <div className="text-center py-12 text-slate-400">
          <Icon name="File" size={48} className="mx-auto mb-4" />
          <p>暂无工资发放记录</p>
          <p className="text-sm mt-1">请先在"项目工资表"中生成并保存工资</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-3 py-3 w-10">
                  <input type="checkbox"
                    checked={selectedIds.size === filtered.length && filtered.length > 0}
                    onChange={toggleAll} className="rounded" />
                </th>
                <th className="px-3 py-3 font-medium text-slate-600">姓名</th>
                <th className="px-3 py-3 font-medium text-slate-600">月份</th>
                <th className="px-3 py-3 font-medium text-slate-600">出勤</th>
                <th className="px-3 py-3 font-medium text-slate-600">应发工资</th>
                <th className="px-3 py-3 font-medium text-slate-600">实发金额</th>
                <th className="px-3 py-3 font-medium text-slate-600">发放日期</th>
                <th className="px-3 py-3 font-medium text-slate-600">差额</th>
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
        </div>
      )}
    </div>
  )
}
