import React, { useEffect, useState } from 'react'
import { DataTable } from '@/components/DataTable'
import FilterBar from '../../ui/FilterBar'
import { Button } from '../../ui/Button'
import { EmptyState } from '../../ui/EmptyState'
import ButtonLoader from '../../ui/ButtonLoader'
import Spinner from '../../ui/Spinner'
import { STATUS_META } from '../../../constants/attendance'
import type { Column } from '@/components/DataTable'
import type { AttendanceRecord, Member, Department } from '@/types/electron'
import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { BarcodeCalendar } from '@/components/ui/charts/BarcodeCalendar'
import { getAPI } from '@/services/api-adapter'

interface StaffAttendanceDashboardProps {
  loading: boolean
  yearMonth: string
  setYearMonth: (ym: string) => void
  filterDept: number | ''
  setFilterDept: (d: number | '') => void
  daysInMonth: number
  departments: Department[]
  filteredStaff: Member[]
  joinedAfter: number
  selectedIds: Set<number>
  handleBatchDelete: () => void
  handleExport: () => void
  handleGenerateDefaults: () => void
  generating: boolean
  tableData: (Member & { __rowIndex?: number })[]
  columns: Column<Member & { __rowIndex?: number }>[]
  ConfirmDialog: React.ReactNode
  staff: Member[]
}

export function StaffAttendanceDashboard({
  loading,
  yearMonth,
  setYearMonth,
  filterDept,
  setFilterDept,
  daysInMonth,
  departments,
  filteredStaff,
  joinedAfter,
  selectedIds,
  handleBatchDelete,
  handleExport,
  handleGenerateDefaults,
  generating,
  tableData,
  columns,
  ConfirmDialog,
  staff,
}: StaffAttendanceDashboardProps) {
  // 条码日历数据：当月每日出勤人数（getAttendances(undefined, 当月) → dailyStatus==='work' 去重成员数，全月补天）
  const [monthBarcode, setMonthBarcode] = useState<{ label: string; value: number; weekend?: boolean }[] | null>(null)

  useEffect(() => {
    let cancelled = false
    setMonthBarcode(null)
    ;(async () => {
      try {
        const api = await getAPI()
        const res = await api.getAttendances(undefined, yearMonth)
        if (cancelled) return
        const records: AttendanceRecord[] = res?.success && res.data ? res.data : []
        if (records.length === 0) return // 当月无任何考勤数据 → 整卡不渲染
        const [y, m] = yearMonth.split('-').map(Number)
        const total = daysInMonth
        // 每日出勤成员集合（memberId 去重；同成员多项目记录只计一次）
        const workSets = new Map<number, Set<number>>()
        for (const rec of records) {
          const ds = rec.dailyStatus
          if (!ds) continue
          for (const key of Object.keys(ds)) {
            const d = Number(key)
            if (d >= 1 && d <= total && ds[d] === 'work') {
              if (!workSets.has(d)) workSets.set(d, new Set())
              workSets.get(d)!.add(rec.memberId)
            }
          }
        }
        const barData = Array.from({ length: total }, (_, idx) => {
          const d = idx + 1
          const wd = new Date(y, (m || 1) - 1, d).getDay()
          return { label: String(d), value: workSets.get(d)?.size ?? 0, weekend: wd === 0 || wd === 6 }
        })
        if (!cancelled) setMonthBarcode(barData)
      } catch (err) {
        console.error('[StaffAttendanceDashboard] 条码日历加载失败:', err)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [yearMonth, daysInMonth])

  if (loading) {
    return <Spinner size="md" text="加载考勤数据..." />
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {ConfirmDialog}
      <FilterBar className="mb-6">
        <div className="flex items-center gap-2">
          <input type="month" value={yearMonth} onChange={e => setYearMonth(e.target.value)}
            className="px-3 py-1.5 border border-[color:var(--border)] rounded-lg text-sm" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-[color:var(--muted)]">部门</label>
          <select value={filterDept} onChange={e => setFilterDept(e.target.value ? Number(e.target.value) : '')}
            className="px-2 py-1.5 border border-[color:var(--border)] rounded-lg text-sm">
            <option value="">全部</option>
            {departments.map((d: Department) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <span className="text-xs text-[color:var(--muted)]">{filteredStaff.length} 人 · {daysInMonth} 天</span>
        {joinedAfter > 0 && <span className="text-xs text-warning-600">（{joinedAfter} 人本月尚未入职已隐藏）</span>}
        <div className="flex-1" />
        {selectedIds.size > 0 && (
          <Button onClick={handleBatchDelete} size="sm" variant="danger">删除选中 ({selectedIds.size})</Button>
        )}
        <Button onClick={handleExport} size="sm" variant="secondary" disabled={filteredStaff.length === 0}>
          导出Excel
        </Button>
        <Button onClick={handleGenerateDefaults} disabled={generating || filteredStaff.length === 0} size="sm">
          <ButtonLoader loading={generating} loadingText="生成中...">
            生成默认考勤
          </ButtonLoader>
        </Button>
      </FilterBar>

      {/* 条码日历卡：当月每日出勤人数（无考勤数据不渲染；shrink-0 保持自然高，表格区 flex-1 吸收挤压滚动） */}
      {monthBarcode && (
        <Card
          title={
            <span className="text-sm font-semibold uppercase tracking-wider text-[color:var(--muted)] flex items-center gap-2">
              <Icon name="Calendar" size={14} /> 当月出勤 · 条码日历
            </span>
          }
          headerDivider
          className="mb-6 shrink-0"
        >
          <BarcodeCalendar
            data={monthBarcode}
            formatValue={(n) => `${n} 人`}
            caption="一根线 = 一天 · 点高 = 当日出勤人数 · 空心 = 周末"
          />
        </Card>
      )}

      {filteredStaff.length === 0 ? (
        <Card bordered={false} className="flex-1 py-12">
          <EmptyState icon="Calendar" title="暂无符合条件的人员"
            description={staff.length === 0 ? '请先在人员档案中添加管理人员' : '请调整筛选条件'} />
        </Card>
      ) : (
        <>
          <DataTable
            data={tableData}
            columns={columns}
            rowKey="id"
            useHoverScrollbar={true}
            scrollClassName="h-full"
            pagination={false}
          />
        </>
      )}

      <div className="flex items-center gap-3 text-xs text-[color:var(--muted)] flex-wrap">
        {STATUS_META.map(s => (
          <span key={s.key ?? 'unset'} className="flex items-center gap-1">
            <span className={`w-3 h-3 rounded ${s.color}`} />{s.label}
          </span>
        ))}
        <span className="text-[color:var(--border-strong)]">|</span>
        <span>点击「生成默认考勤」→ 全勤 → 编辑调整</span>
        <span className="text-[color:var(--border-strong)]">|</span>
        <span>点击姓名查看历史考勤时间线</span>
      </div>
    </div>
  )
}
