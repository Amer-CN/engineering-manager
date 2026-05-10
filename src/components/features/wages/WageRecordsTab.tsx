import React from 'react'
import type { WageRecord } from '@/types'
import { Icon } from '../../ui/Icon'

const MONTHS = ['全部', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']

interface WageRecordsTabProps {
  allWageRecords: WageRecord[]
  filterYear: string
  filterMonth: string
  filterMemberName: string
  selectedIds: Set<number>
  paymentEdits: Map<number, { paidAmount: number; paidDate: string }>
  onFilterYearChange: (val: string) => void
  onFilterMonthChange: (val: string) => void
  onFilterNameChange: (val: string) => void
  onPaymentChange: (recordId: number, field: 'paidAmount' | 'paidDate', value: string | number) => void
  onSavePayments: () => void
  toggleSelect: (id: number) => void
  toggleAll: () => void
  onBatchDelete: () => void
}

function getEditPaidAmount(record: WageRecord, edits: Map<number, { paidAmount: number; paidDate: string }>) {
  const edit = edits.get(record.id)
  return edit?.paidAmount ?? record.paidAmount ?? record.actualWage
}

function getEditPaidDate(record: WageRecord, edits: Map<number, { paidAmount: number; paidDate: string }>) {
  const edit = edits.get(record.id)
  return edit?.paidDate ?? record.paidDate ?? ''
}

export default function WageRecordsTab({
  allWageRecords, filterYear, filterMonth, filterMemberName,
  selectedIds, paymentEdits,
  onFilterYearChange, onFilterMonthChange, onFilterNameChange,
  onPaymentChange, onSavePayments,
  toggleSelect, toggleAll, onBatchDelete,
}: WageRecordsTabProps) {
  const filtered = allWageRecords.filter(w => {
    if (filterMemberName && !(w.memberName || '').includes(filterMemberName)) return false
    if (filterYear && filterYear !== '全部' && !w.yearMonth.startsWith(filterYear)) return false
    if (filterMonth && filterMonth !== '全部' && w.yearMonth !== `${filterYear}-${filterMonth}`) return false
    return true
  })
  const changedCount = paymentEdits.size
  const currentYear = new Date().getFullYear().toString()
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
        {selectedIds.size > 0 && (
          <button onClick={onBatchDelete}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
            删除选中 ({selectedIds.size})
          </button>
        )}
      </div>

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
              {filtered.map(w => {
                const paidAmount = getEditPaidAmount(w, paymentEdits)
                const paidDate = getEditPaidDate(w, paymentEdits)
                const diff = paidAmount - w.actualWage
                const diffColor = diff > 0.01 ? 'text-red-600' : diff < -0.01 ? 'text-orange-600' : 'text-green-600'
                const diffSign = diff > 0.01 ? '+' : ''

                return (
                  <tr key={w.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-3">
                      <input type="checkbox" checked={selectedIds.has(w.id)}
                        onChange={() => toggleSelect(w.id)} className="rounded" />
                    </td>
                    <td className="px-3 py-3 font-medium">{w.memberName || '-'}</td>
                    <td className="px-3 py-3">{w.yearMonth}</td>
                    <td className="px-3 py-3">{w.workDays} 天</td>
                    <td className="px-3 py-3 font-medium">¥{w.actualWage.toFixed(2)}</td>
                    <td className="px-3 py-3">
                      <input type="number" min={0} step={0.01} value={paidAmount}
                        onChange={e => onPaymentChange(w.id, 'paidAmount', parseFloat(e.target.value) || 0)}
                        className="w-24 px-2 py-1 border border-slate-300 rounded text-center text-sm" />
                    </td>
                    <td className="px-3 py-3">
                      <input type="date" value={paidDate}
                        onChange={e => onPaymentChange(w.id, 'paidDate', e.target.value)}
                        className="w-32 px-2 py-1 border border-slate-300 rounded text-sm" />
                    </td>
                    <td className={`px-3 py-3 font-medium ${diffColor}`}>
                      {diffSign}¥{diff.toFixed(2)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
