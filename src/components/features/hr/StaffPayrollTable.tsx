import { useMemo } from 'react'
import { StaffPayrollRow } from './StaffPayrollRow'

interface StaffPayrollTableProps {
  filteredWages: any[]
  staff: any[]
  departments: any[]
  summaryTotals: { totalNet: number; totalPaid: number; totalDiff: number }
  onDeleteWage: (wage: any) => void
  onPaidChange: (wage: any, field: string, value: any) => void
}

export function StaffPayrollTable({
  filteredWages, staff, departments, summaryTotals,
  onDeleteWage, onPaidChange,
}: StaffPayrollTableProps) {
  const staffMap = useMemo(() => {
    const m = new Map<number, any>()
    for (const s of staff) m.set(s.id, s)
    return m
  }, [staff])

  return (
    <div className="bg-white rounded-xl shadow-sm flex-1 mt-4 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-auto min-h-0">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">姓名</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">月份</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">基本工资</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">出勤天数</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">补助</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">扣款</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">应发工资</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">实发金额</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">发放日期</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">差额</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredWages.map((w: any) => (
              <StaffPayrollRow
                key={w.id}
                wage={w}
                staffName={staffMap.get(w.memberId)?.name || ''}
                onPaidChange={onPaidChange}
                onDeleteWage={onDeleteWage}
              />
            ))}
          </tbody>
        </table>
      </div>
      {/* 底部汇总条 */}
      <div className="shrink-0 flex items-center justify-end gap-6 px-4 py-2.5 border-t border-slate-200 text-sm">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">应发</span>
          <span className="font-semibold text-slate-800">¥{summaryTotals.totalNet.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">实发</span>
          <span className="font-semibold text-green-700">¥{summaryTotals.totalPaid.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">{summaryTotals.totalDiff >= 0 ? '未发' : '多发'}</span>
          <span className={`font-semibold ${summaryTotals.totalDiff === 0 ? 'text-emerald-600' : summaryTotals.totalDiff > 0 ? 'text-amber-600' : 'text-red-600'}`}>
            {summaryTotals.totalDiff === 0 ? '已结清' : `¥${Math.abs(summaryTotals.totalDiff).toLocaleString()}`}
          </span>
        </div>
      </div>
    </div>
  )
}
