/**
 * 工资管理模块 — 容器组件（v3.0 纯工人日薪制）
 * Dashboard 视图：工资统计看板
 * Cycle 视图：WageCycleDetail（考勤/工资表/发放记录 3 Tab）
 */

import type { Project } from '@/types'
import { useToastContext } from '../hooks/useToast'
import { useConfirm } from '../hooks/useConfirm'
import PageHeader from './ui/PageHeader'
import PageContainer from './ui/PageContainer'
import WageCycleDetail from './features/wages/WageCycleDetail'
import WageStatsTab from './features/wages/WageStatsTab'
import WageProjectList from './features/wages/WageProjectList'
import { useWageBatchViews } from './features/wages/WageBatchViews'
import useWageManagement from '../hooks/useWageManagement'
import { useAttendanceImport } from './features/wages/useAttendanceImport'

export default function WageManagement() {
  const { showToast } = useToastContext()
  const { confirm, ConfirmDialog } = useConfirm()

  const hook = useWageManagement({ showToast, confirm })
  const {
    projects, workerTeams,
    view, setView, selectedProject, setSelectedProject,
    selectedMonth, setSelectedMonth, loading,
    attendances, attendanceDetailRecord, setAttendanceDetailRecord,
    wageRecords, editingWages, paymentEdits,
    allWageRecords, wageStats, filterMemberName, setFilterMemberName,
    selectedAttendanceIds, selectedWageTableIds, selectedWageIds,
    projectWorkerList,
    handleGenerateAttendance, handleDeleteAttendance,
    handleGenerateWages, handleWageBonusDeductionChange, handleSaveWages,
    handleBatchDeleteAttendances, handleBatchDeleteWageTable,
    handleBatchDeleteWages, handleBatchArchivePayments,
    handlePaymentChange, handleSavePayments,
    toggleAttendanceSelect, toggleAllAttendances,
    toggleWageTableSelect, toggleAllWageTable,
    toggleWageSelect, toggleAllWages,
    receiptParsing, receiptResult, handleBankReceiptUpload,
    loadAttendances, loadStats, loadWages, loadAllRecords,
  } = hook

  // J-1: 批量回单视图（上传 → 解析 → match 候选 → 确认落库），接线走 useBankReceiptBatch
  const batchViews = useWageBatchViews({
    selectedProject,
    selectedMonth,
    loadWages,
    loadAllRecords,
    onViewChange: setView,
  })

  // S2 带提醒覆盖：考勤导入统一走 useAttendanceImport（batch-import 三分 + 冲突裁决）
  const attImport = useAttendanceImport({ projectId: selectedProject?.id ?? null, yearMonth: selectedMonth, loadData: loadAttendances })

  if (view === 'batch' && selectedProject) {
    return (
      <PageContainer className="space-y-6">
        <PageHeader title={`${selectedProject.name} · 批量回单`} onBack={() => setView('cycle')} />
        {batchViews.renderBatchView()}
        {ConfirmDialog}
      </PageContainer>
    )
  }

  if (view === 'cycle' && selectedProject) {
    return (
      <>
      <WageCycleDetail
        selectedProject={selectedProject} selectedMonth={selectedMonth}
        workerTeams={workerTeams}
        attendances={attendances} attendancesCount={projectWorkerList.length}
        attendanceDetailRecord={attendanceDetailRecord}
        setAttendanceDetailRecord={setAttendanceDetailRecord}
        onGenerateAttendance={handleGenerateAttendance}
        onDeleteAttendance={handleDeleteAttendance}
        onBatchDeleteAttendances={handleBatchDeleteAttendances}
        selectedAttendanceIds={selectedAttendanceIds}
        toggleAttendanceSelect={toggleAttendanceSelect}
        toggleAllAttendances={toggleAllAttendances}
        wageRecords={wageRecords} editingWages={editingWages}
        onGenerateWages={handleGenerateWages} onSaveWages={handleSaveWages}
        onBonusDeductionChange={handleWageBonusDeductionChange}
        onBatchDeleteWageTable={handleBatchDeleteWageTable}
        selectedWageTableIds={selectedWageTableIds}
        toggleWageTableSelect={toggleWageTableSelect}
        toggleAllWageTable={toggleAllWageTable}
        allWageRecords={allWageRecords} paymentEdits={paymentEdits}
        onPaymentChange={handlePaymentChange} onSavePayments={handleSavePayments}
        onBankReceiptUpload={handleBankReceiptUpload}
        onOpenBatchReceipt={() => setView('batch')}
        receiptParsing={receiptParsing} receiptResult={receiptResult}
        onBatchDeleteWages={handleBatchDeleteWages}
        onBatchArchivePayments={handleBatchArchivePayments}
        selectedWageIds={selectedWageIds}
        toggleWageSelect={toggleWageSelect} toggleAllWages={toggleAllWages}
        filterMemberName={filterMemberName} setFilterMemberName={setFilterMemberName}
        loading={loading}
        onChangeMonth={setSelectedMonth}
        onBack={() => { setView('dashboard'); setAttendanceDetailRecord(null); loadStats() }}
        projectWorkerList={projectWorkerList.map(p => ({ id: p.pwId, name: p.name, teamName: p.teamName, idCard: p.idCard }))}
        onImportAttendance={attImport.importAttendance}
      />
      {attImport.ConflictDialog}
      </>
    )
  }

  const handleProjectClick = (project: Project) => {
    setSelectedProject(project)
    setView('cycle')
  }

  return (
    <PageContainer className="space-y-6">
      <PageHeader title="工资管理" />
      <WageStatsTab wageStats={wageStats} selectedMonth={selectedMonth} />
      <WageProjectList
        allWageRecords={allWageRecords}
        projects={projects}
        selectedMonth={selectedMonth}
        onProjectClick={handleProjectClick}
      />
      {ConfirmDialog}
    </PageContainer>
  )
}
