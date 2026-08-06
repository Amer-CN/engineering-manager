import { EmptyState } from '../../ui/EmptyState'
import { usePayrollData, type PayrollMode, type PayrollWage } from './usePayrollData'
import type { Project, AttendanceRecord } from '@/types'
import AttendanceTab from '../wages/AttendanceTab'
import WageTableTab from '../wages/WageTableTab'
import WageRecordsTab from '../wages/WageRecordsTab'
import { StaffPayrollTable } from '../hr/StaffPayrollTable'
import StaffAttendance from '../hr/StaffAttendance'
import type { useWageActions } from '../wages/useWageActions'
import { getAPI } from '@/services/api-adapter'
import { usePermission } from '@/hooks/usePermission'
import { useToastStore } from '@/store/toastStore'

type TabId = 'attendance' | 'wages' | 'payments' | 'payroll'

interface PayrollTableProps {
  mode: PayrollMode
  activeTab: TabId
  data: ReturnType<typeof usePayrollData>
  selectedProject: Project | null
  projectAttendances: AttendanceRecord[]
  projectWages: PayrollWage[]
  daysInMonth: number
  wageActions: ReturnType<typeof useWageActions>
  paymentFilteredWages: PayrollWage[]
  filterYearMonth: string
  setFilterYearMonth: (v: string) => void
  confirm: (options: { title?: string; content: React.ReactNode; confirmVariant?: "primary" | "danger" }) => Promise<boolean>
}

export function PayrollTable({
  mode, activeTab, data, selectedProject, projectAttendances, projectWages,
  daysInMonth, wageActions, paymentFilteredWages, filterYearMonth, setFilterYearMonth, confirm,
}: PayrollTableProps) {
  const { can } = usePermission()
  const showToast = useToastStore(state => state.showToast)
  return (
    <div className="flex-1 min-h-0 overflow-hidden">
      {mode === 'staff' ? (
        <>
          {activeTab === 'attendance' && <StaffAttendance />}
          {activeTab === 'payroll' && (
            data.filteredWages.length > 0 ? (
              <StaffPayrollTable
                filteredWages={data.filteredWages} staff={data.people} departments={data.departments}
                summaryTotals={data.summary}
                onDeleteWage={async (wage: PayrollWage) => {
                  // G2 B2: 删除薪酬 → wages:delete
                  if (!can('wages:delete')) { showToast('您没有删除薪酬的权限', 'error'); return }
                  const ok = await confirm({ title: '确认删除', content: `确认删除 ${wage.memberName || ''} ${wage.yearMonth} 的薪酬？`, confirmVariant: 'danger' })
                  if (!ok) return
                  await (await getAPI()).deleteWage(wage.id)
                  await data.loadData()
                }}
                onPaidChange={async (wage: PayrollWage, field: string, value: number | string) => {
                  // G2 B2: 实发金额编辑 → wages:update
                  if (!can('wages:update')) { showToast('您没有编辑薪酬的权限', 'error'); return }
                  await (await getAPI()).updateWage({ ...wage, [field]: value })
                  await data.loadData()
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <EmptyState icon="Banknote" title="暂无薪酬记录" description="点击工具栏「生成薪酬」开始计算" />
              </div>
            )
          )}
        </>
      ) : (
        <>
          {activeTab === 'attendance' && (
            selectedProject ? (
              <AttendanceTab
                selectedProject={selectedProject} selectedMonth={data.selectedMonth}
                daysInMonth={daysInMonth} workerTeams={data.workerTeams}
                attendances={projectAttendances}
                projectMemberCount={data.people.filter((p) => p.projectId === selectedProject.id).length}
                selectedIds={wageActions.selectedAttendanceIds}
                toggleSelect={wageActions.toggleAttendanceSelect}
                toggleAll={wageActions.toggleAllAttendance}
                onGenerateAttendance={wageActions.handleGenerateAttendance}
                onOpenDetail={wageActions.handleOpenAttendanceDetail}
                onDelete={wageActions.handleDeleteAttendance}
                onBatchDelete={wageActions.handleBatchDeleteAttendance}
                loading={false} onImportAttendance={wageActions.handleImportAttendance}
              />
            ) : <div className="flex items-center justify-center h-full"><EmptyState icon="Calendar" title="请先选择项目" description="在工具栏的项目下拉框中选择一个项目" /></div>
          )}
          {activeTab === 'wages' && (
            selectedProject ? (
              <WageTableTab
                selectedProject={selectedProject} selectedMonth={data.selectedMonth}
                workerTeams={data.workerTeams} wageRecords={projectWages}
                attendancesCount={projectAttendances.length}
                editingWages={wageActions.editingWages}
                selectedIds={wageActions.selectedWageTableIds}
                toggleSelect={wageActions.toggleWageTableSelect}
                toggleAll={wageActions.toggleAllWageTable}
                onGenerate={wageActions.handleGenerateWages}
                onSave={wageActions.handleSaveWages}
                onBonusDeductionChange={wageActions.handleBonusDeductionChange}
                onBatchDelete={wageActions.handleBatchDeleteWages}
                loading={false}
              />
            ) : <div className="flex items-center justify-center h-full"><EmptyState icon="FileText" title="请先选择项目" description="在工具栏的项目下拉框中选择一个项目" /></div>
          )}
          {activeTab === 'payments' && (
            <WageRecordsTab
              allWageRecords={paymentFilteredWages}
              filterYearMonth={filterYearMonth} filterMemberName={data.filterName}
              selectedIds={wageActions.selectedWageIds}
              paymentEdits={wageActions.paymentEdits}
              onFilterYearMonthChange={setFilterYearMonth}
              onFilterNameChange={v => data.setFilterName(v)}
              onPaymentChange={wageActions.handlePaymentChange}
              onSavePayments={wageActions.handleSavePayments}
              onBankReceiptUpload={wageActions.handleBankReceiptUpload}
              receiptParsing={wageActions.receiptParsing}
              receiptResult={wageActions.receiptResult}
              toggleSelect={wageActions.toggleWageSelect}
              toggleAll={wageActions.toggleAllWage}
              onBatchDelete={wageActions.handleBatchDeletePayments}
              onBatchArchive={wageActions.handleBatchArchivePayments}
            />
          )}
        </>
      )}
    </div>
  )
}
