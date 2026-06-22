import { EmptyState } from '../../ui/EmptyState'
import { usePayrollData, type PayrollMode } from './usePayrollData'
import AttendanceTab from '../wages/AttendanceTab'
import WageTableTab from '../wages/WageTableTab'
import WageRecordsTab from '../wages/WageRecordsTab'
import { StaffPayrollTable } from '../hr/StaffPayrollTable'
import StaffAttendance from '../hr/StaffAttendance'
import type { useWageActions } from '../wages/useWageActions'
import { getAPI } from '@/services/api-adapter'

type TabId = 'attendance' | 'wages' | 'payments' | 'payroll'

interface PayrollTableProps {
  mode: PayrollMode
  activeTab: TabId
  data: ReturnType<typeof usePayrollData>
  selectedProject: any
  projectAttendances: any[]
  projectWages: any[]
  daysInMonth: number
  wageActions: ReturnType<typeof useWageActions>
  paymentFilteredWages: any[]
  filterYearMonth: string
  setFilterYearMonth: (v: string) => void
  confirm: any
}

export function PayrollTable({
  mode, activeTab, data, selectedProject, projectAttendances, projectWages,
  daysInMonth, wageActions, paymentFilteredWages, filterYearMonth, setFilterYearMonth, confirm,
}: PayrollTableProps) {
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
                onDeleteWage={async (wage: any) => {
                  const ok = await confirm({ title: '确认删除', content: `确认删除 ${wage.memberName || ''} ${wage.yearMonth} 的薪酬？`, confirmVariant: 'danger' })
                  if (!ok) return
                  await (await getAPI()).deleteWage(wage.id)
                  await data.loadData()
                }}
                onPaidChange={async (wage: any, field: string, value: any) => {
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
                projectMemberCount={data.people.filter((p: any) => p.projectId === selectedProject.id).length}
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
