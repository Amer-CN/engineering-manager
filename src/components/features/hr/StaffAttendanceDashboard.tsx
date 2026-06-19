import React from 'react'
import { DataTable } from '@/components/DataTable'
import FilterBar from '../../ui/FilterBar'
import { Button } from '../../ui/Button'
import { EmptyState } from '../../ui/EmptyState'
import ButtonLoader from '../../ui/ButtonLoader'
import Spinner from '../../ui/Spinner'
import { STATUS_META } from '../../../constants/attendance'
import type { Column } from '@/components/DataTable'

interface StaffAttendanceDashboardProps {
  loading: boolean
  yearMonth: string
  setYearMonth: (ym: string) => void
  filterDept: number | ''
  setFilterDept: (d: number | '') => void
  daysInMonth: number
  departments: any[]
  filteredStaff: any[]
  joinedAfter: number
  selectedIds: Set<number>
  handleBatchDelete: () => void
  handleExport: () => void
  handleGenerateDefaults: () => void
  generating: boolean
  tableData: any[]
  columns: Column<any>[]
  ConfirmDialog: React.ReactNode
  staff: any[]
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
  if (loading) {
    return <Spinner size="md" text="加载考勤数据..." />
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {ConfirmDialog}
      <FilterBar className="mb-6">
        <div className="flex items-center gap-2">
          <input type="month" value={yearMonth} onChange={e => setYearMonth(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-400">部门</label>
          <select value={filterDept} onChange={e => setFilterDept(e.target.value ? Number(e.target.value) : '')}
            className="px-2 py-1.5 border border-slate-300 rounded-lg text-sm">
            <option value="">全部</option>
            {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <span className="text-xs text-slate-400">{filteredStaff.length} 人 · {daysInMonth} 天</span>
        {joinedAfter > 0 && <span className="text-xs text-amber-600">（{joinedAfter} 人本月尚未入职已隐藏）</span>}
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

      {filteredStaff.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm flex-1 py-12">
          <EmptyState icon="Calendar" title="暂无符合条件的人员"
            description={staff.length === 0 ? '请先在人员档案中添加管理人员' : '请调整筛选条件'} />
        </div>
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

      <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
        {STATUS_META.map(s => (
          <span key={s.key ?? 'unset'} className="flex items-center gap-1">
            <span className={`w-3 h-3 rounded ${s.color}`} />{s.label}
          </span>
        ))}
        <span className="text-slate-300">|</span>
        <span>点击「生成默认考勤」→ 全勤 → 编辑调整</span>
        <span className="text-slate-300">|</span>
        <span>点击姓名查看历史考勤时间线</span>
      </div>
    </div>
  )
}
