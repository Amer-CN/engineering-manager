import { DropdownMenu } from '../../ui/DropdownMenu/DropdownMenu'
import { MONTHS } from '@/constants'
import { exportWageDetailToExcel, printWageDetail } from '@/utils/wage-export'
import type { Project, WageRecord } from '@/types'
import { Button } from '../../ui/Button'

type DetailScope = 'project' | 'all'

interface WageDetailToolbarProps {
  scope: DetailScope
  onScopeChange: (scope: DetailScope) => void
  yearOptions: string[]
  filterYear: string
  onFilterYearChange: (year: string, resetMonth: string) => void
  filterMonth: string
  onFilterMonthChange: (month: string) => void
  filterMemberName: string
  onFilterMemberNameChange: (name: string) => void
  filterTeamName: string
  onFilterTeamNameChange: (name: string) => void
  teamOptions: string[]
  recordCount: number
  // 操作按钮
  onGenerateWages: () => void
  loading: boolean
  receiptParsing: boolean
  onImportReceipt: () => void
  onBatchArchive: () => void
  selectedIds: Set<number>
  changedCount: number
  onSavePayments: () => void
  onBatchDelete: () => void
  // 导出/打印
  scopeData: WageRecord[]
  selectedProject: Project | null
}

export function WageDetailToolbar({
  scope, onScopeChange,
  yearOptions, filterYear, onFilterYearChange,
  filterMonth, onFilterMonthChange,
  filterMemberName, onFilterMemberNameChange,
  filterTeamName, onFilterTeamNameChange,
  teamOptions,
  recordCount,
  onGenerateWages, loading,
  receiptParsing, onImportReceipt,
  onBatchArchive, selectedIds,
  changedCount, onSavePayments, onBatchDelete,
  scopeData, selectedProject,
}: WageDetailToolbarProps) {
  return (
    <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
      <div className="flex items-center gap-3 flex-wrap">
        {/* 作用域切换 */}
        <div className="flex bg-slate-100 rounded-lg p-0.5">
          <button onClick={() => onScopeChange('project')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${scope === 'project' ? 'bg-white shadow-sm text-amber-700' : 'text-slate-500 hover:text-slate-700'}`}>
            当前项目
          </button>
          <button onClick={() => onScopeChange('all')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${scope === 'all' ? 'bg-white shadow-sm text-amber-700' : 'text-slate-500 hover:text-slate-700'}`}>
            全部项目
          </button>
        </div>

        {/* 统一筛选：年份 + 月份 + 姓名 */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600">年份</label>
          <select value={filterYear}
            onChange={e => onFilterYearChange(e.target.value, '全部')}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm">
            <option value="全部">全部</option>
            {yearOptions.length > 0 ? yearOptions.map(y => <option key={y} value={y}>{y}年</option>)
              : Array.from({ length: 21 }, (_, i) => {
                const y = (new Date().getFullYear() - 10 + i).toString()
                return <option key={y} value={y}>{y}年</option>
              })}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600">月份</label>
          <select value={filterMonth}
            onChange={e => onFilterMonthChange(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm">
            {MONTHS.map(m => <option key={m} value={m}>{m === '全部' ? '全部' : `${m}月`}</option>)}
          </select>
        </div>
        <input type="text" placeholder="搜索姓名..." value={filterMemberName}
          onChange={e => onFilterMemberNameChange(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm w-40 focus:ring-2 focus:ring-primary-500" />
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600">班组</label>
          <select value={filterTeamName} onChange={e => onFilterTeamNameChange(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm">
            <option value="全部">全部班组</option>
            {teamOptions.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* 记录数 */}
        <span className="text-sm text-slate-500">
          {recordCount} 条记录
          {scope === 'project' && recordCount === 0 && (
            <span className="text-amber-600 ml-2">（提示：点击"生成工资表"）</span>
          )}
        </span>
      </div>

      {/* 右侧操作按钮组 */}
      <div className="flex items-center gap-2 flex-wrap">
        {scope === 'project' && (
          <button onClick={onGenerateWages}
            disabled={loading || filterYear === '全部' || filterMonth === '全部'}
            className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            生成工资表
          </button>
        )}

        {scope === 'project' && (
          <button onClick={onImportReceipt}
            disabled={receiptParsing || filterYear === '全部' || filterMonth === '全部'}
            className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            {receiptParsing ? '解析中…' : '导入回单'}
          </button>
        )}

        {scope === 'project' && (
          <Button onClick={onBatchArchive}
             variant="success" size="sm">
            归档{selectedIds.size > 0 ? `选中 (${selectedIds.size})` : '全部'}
          </Button>
        )}

        {changedCount > 0 && (
          <Button onClick={onSavePayments} disabled={loading}
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

        <DropdownMenu
          trigger={<Button  variant="secondary" size="sm">更多 ▾</Button>}
          items={[
            { key: 'export', label: '导出Excel', onClick: () => exportWageDetailToExcel(scopeData) },
            { key: 'print', label: '打印', onClick: () => printWageDetail(scopeData, scope === 'project' ? selectedProject?.name || '' : '全部项目') },
          ]}
          align="end"
        />
      </div>
    </div>
  )
}
