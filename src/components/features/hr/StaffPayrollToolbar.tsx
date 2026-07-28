import React from 'react'
import type { Department, Project, Member, AttendanceRecord } from '@/types'
import type { PayrollWage } from '../payroll/usePayrollData'
import { DropdownMenu } from '../../ui/DropdownMenu/DropdownMenu'
import { Button } from '../../ui/Button'
import ButtonLoader from '../../ui/ButtonLoader'
import { MONTHS } from '@/constants'
import { filteredStaffForGenerate, isAttendanceReady } from '../../../utils/staff-payroll-utils'
import { Card } from '@/components/ui/Card'

interface StaffPayrollToolbarProps {
  filterYear: string
  filterMonth: string
  filterMemberName: string
  filterDept: number | ''
  filterProject: string
  yearOptions: string[]
  effectiveYearMonth: string
  filteredWages: PayrollWage[]
  staff: Member[]
  departments: Department[]
  projects: Project[]
  attendances: AttendanceRecord[]
  generating: boolean
  setFilterYear: (v: string) => void
  setFilterMonth: (v: string) => void
  setFilterMemberName: (v: string) => void
  setFilterDept: (v: number | '') => void
  setFilterProject: (v: string) => void
  onGenerate: () => void
  onDeleteAllMonth: () => void
  onExportExcel: () => void
}

const StaffPayrollToolbar: React.FC<StaffPayrollToolbarProps> = ({
  filterYear, filterMonth, filterMemberName, filterDept, filterProject,
  yearOptions, effectiveYearMonth, filteredWages, staff, departments, projects,
  attendances, generating,
  setFilterYear, setFilterMonth, setFilterMemberName, setFilterDept, setFilterProject,
  onGenerate, onDeleteAllMonth, onExportExcel,
}) => (
  <Card bordered={false} className="px-5 py-3 flex items-center gap-4 flex-wrap flex-shrink-0">
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium text-[color:var(--fg-2)]">年份</label>
      <select value={filterYear}
        onChange={e => { setFilterYear(e.target.value); setFilterMonth('全部') }}
        className="px-3 py-1.5 border border-[color:var(--border)] rounded-lg text-sm">
        <option value="全部">全部</option>
        {yearOptions.map(y => <option key={y} value={y}>{y}年</option>)}
      </select>
    </div>
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium text-[color:var(--fg-2)]">月份</label>
      <select value={filterMonth}
        onChange={e => setFilterMonth(e.target.value)}
        className="px-3 py-1.5 border border-[color:var(--border)] rounded-lg text-sm">
        {MONTHS.map(m => <option key={m} value={m}>{m === '全部' ? '全部' : `${m}月`}</option>)}
      </select>
    </div>
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium text-[color:var(--fg-2)]">姓名</label>
      <input type="text" placeholder="搜索姓名..."
        value={filterMemberName}
        onChange={e => setFilterMemberName(e.target.value)}
        className="px-3 py-1.5 border border-[color:var(--border)] rounded-lg text-sm w-36 focus:ring-2 focus:ring-[color:var(--accent-soft)]" />
    </div>
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium text-[color:var(--fg-2)]">部门</label>
      <select value={filterDept} onChange={e => setFilterDept(e.target.value ? Number(e.target.value) : '')}
        className="px-3 py-1.5 border border-[color:var(--border)] rounded-lg text-sm">
        <option value="">全部</option>
        {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
      </select>
    </div>
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium text-[color:var(--fg-2)]">项目</label>
      <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
        className="px-3 py-1.5 border border-[color:var(--border)] rounded-lg text-sm">
        <option value="全部">全部</option>
        {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
    </div>
    {filterYear !== '全部' && filterMonth !== '全部' && (() => {
      const candidates = filteredStaffForGenerate(staff, filterDept, effectiveYearMonth)
      const ready = candidates.filter(s => isAttendanceReady(s.id, effectiveYearMonth, attendances)).length
      return ready < candidates.length ? (
        <span className="text-xs text-warning-500">考勤{ready}/{candidates.length}</span>
      ) : null
    })()}
    <div className="flex-1" />
    <Button onClick={onGenerate}
      disabled={generating || staff.length === 0 || filterYear === '全部' || filterMonth === '全部'}
      size="sm"
      title={filterYear === '全部' || filterMonth === '全部' ? '请先选择具体年份和月份' : undefined}>
      <ButtonLoader loading={generating} loadingText="计算中...">
        {`生成${filterYear !== '全部' && filterMonth !== '全部' ? effectiveYearMonth : ''}`}
      </ButtonLoader>
    </Button>
    {filteredWages.length > 0 && filterYear !== '全部' && filterMonth !== '全部' && (
      <Button onClick={onDeleteAllMonth} size="sm" variant="danger">
        删除本月
      </Button>
    )}
    {filteredWages.length > 0 && (
      <DropdownMenu
        trigger={<Button  variant="secondary" className="text-sm">更多 ▾</Button>}
        items={[
          { key: 'export', label: '导出Excel', onClick: onExportExcel },
          { key: 'print', label: '打印', onClick: () => window.print() },
        ]}
        align="end"
      />
    )}
  </Card>
)

export default StaffPayrollToolbar
