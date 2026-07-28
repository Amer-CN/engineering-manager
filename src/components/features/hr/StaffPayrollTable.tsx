import { useMemo } from 'react'
import { Icon } from '../../ui/Icon'
import { DataTable, type Column } from '@/components/DataTable'
import { Button } from '../../ui/Button'
import type { Department } from '@/types'
import type { PayrollWage } from '../payroll/usePayrollData'

interface StaffPayrollTableProps {
  filteredWages: PayrollWage[]
  staff: ReadonlyArray<{ id: number; name?: string }>
  departments: Department[]
  summaryTotals: { totalNet: number; totalPaid: number; totalDiff: number }
  onDeleteWage: (wage: PayrollWage) => void
  onPaidChange: (wage: PayrollWage, field: string, value: number | string) => void
}

export function StaffPayrollTable({
  filteredWages, staff, departments, summaryTotals,
  onDeleteWage, onPaidChange,
}: StaffPayrollTableProps) {
  const staffMap = useMemo(() => {
    const m = new Map<number, { id: number; name?: string }>()
    for (const s of staff) m.set(s.id, s)
    return m
  }, [staff])

  const columns: Column<PayrollWage>[] = [
    {
      key: 'memberName',
      title: '姓名',
      render: (item) => (
        <span className="font-medium text-[color:var(--fg)]">{item.memberName || staffMap.get(item.memberId!)?.name || '-'}</span>
      )
    },
    {
      key: 'yearMonth',
      title: '月份',
      render: (item) => (
        <span className="text-[color:var(--fg-2)]">{item.yearMonth}</span>
      )
    },
    {
      key: 'baseSalary',
      title: '基本工资',
      align: 'right',
      render: (item) => (
        <span className="text-[color:var(--fg-2)] font-mono tabular-nums">{(item.baseSalary || 0).toLocaleString()}</span>
      )
    },
    {
      key: 'attendanceDays',
      title: '出勤天数',
      align: 'center',
      render: (item) => {
        const ym = item.yearMonth
        const wd = ym ? new Date(Number(ym.split('-')[0]), Number(ym.split('-')[1]), 0).getDate() : 30
        return <span className="text-[color:var(--fg-2)]">{item.attendanceDays} / {wd}</span>
      }
    },
    {
      key: 'subsidy',
      title: '补助',
      align: 'right',
      render: (item) => (
        <span className="text-warning-600 font-mono tabular-nums">{(item.subsidy ?? 0) > 0 ? `+${(item.subsidy || 0).toLocaleString()}` : '-'}</span>
      )
    },
    {
      key: 'deduction',
      title: '扣款',
      align: 'right',
      render: (item) => (
        <input type="number" defaultValue={item.deduction || 0}
          onBlur={e => onPaidChange(item, 'deduction', Number(e.target.value))}
          className="w-20 text-right px-2 py-1 border border-[color:var(--border)] rounded text-sm" />
      )
    },
    {
      key: 'netSalary',
      title: '应发工资',
      align: 'right',
      render: (item) => (
        <span className="font-medium text-[color:var(--fg)] font-mono tabular-nums">{((item.netSalary || 0) - (item.deduction || 0)).toLocaleString()}</span>
      )
    },
    {
      key: 'paidAmount',
      title: '实发金额',
      align: 'center',
      render: (item) => (
        <input type="number" defaultValue={item.paidAmount || ''}
          onBlur={e => onPaidChange(item, 'paidAmount', Number(e.target.value))}
          className="w-24 text-center px-2 py-1 border border-[color:var(--border)] rounded text-sm" placeholder="未发放" />
      )
    },
    {
      key: 'paidDate',
      title: '发放日期',
      align: 'center',
      render: (item) => (
        <input type="date" defaultValue={item.paidDate || ''}
          onChange={e => onPaidChange(item, 'paidDate', e.target.value)}
          className="px-2 py-1 border border-[color:var(--border)] rounded text-sm" />
      )
    },
    {
      key: 'diff',
      title: '差额',
      align: 'right',
      render: (item) => {
        const diff = (item.netSalary || 0) - (item.deduction || 0) - (item.paidAmount || 0)
        return (
          <span className={`font-medium font-mono tabular-nums ${diff === 0 ? 'text-success-600' : diff > 0 ? 'text-warning-600' : 'text-danger-600'}`}>
            {diff === 0 ? '已结清' : diff.toLocaleString()}
          </span>
        )
      }
    },
    {
      key: 'actions',
      title: '操作',
      align: 'center',
      render: (item) => (
        <Button onClick={() => onDeleteWage(item)}
           title="删除此记录" variant="danger" size="sm">
          <Icon name="Trash2" size={14} />
        </Button>
      )
    }
  ]

  const footer = (
    <div className="flex items-center justify-end gap-6 px-4 py-2.5 text-sm">
      <div className="flex items-center gap-1.5">
        <span className="text-[color:var(--muted)]">应发</span>
        <span className="font-semibold text-[color:var(--fg)] font-mono tabular-nums">¥{summaryTotals.totalNet.toLocaleString()}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-[color:var(--muted)]">实发</span>
        <span className="font-semibold text-success-700 font-mono tabular-nums">¥{summaryTotals.totalPaid.toLocaleString()}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-[color:var(--muted)]">{summaryTotals.totalDiff >= 0 ? '未发' : '多发'}</span>
        <span className={`font-semibold font-mono tabular-nums ${summaryTotals.totalDiff === 0 ? 'text-success-600' : summaryTotals.totalDiff > 0 ? 'text-warning-600' : 'text-danger-600'}`}>
          {summaryTotals.totalDiff === 0 ? '已结清' : `¥${Math.abs(summaryTotals.totalDiff).toLocaleString()}`}
        </span>
      </div>
    </div>
  )

  return (
    <DataTable
      data={filteredWages}
      columns={columns}
      rowKey="id"
      pagination={false}
      containerClassName="flex-1 mt-4"
      useHoverScrollbar
      scrollClassName="flex-1 min-h-0"
      footer={footer}
    />
  )
}
