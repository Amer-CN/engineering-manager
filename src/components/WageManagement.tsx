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
import { getAPI } from '@/services/api-adapter'
import useWageManagement from '../hooks/useWageManagement'

export default function WageManagement() {
  const { showToast } = useToastContext()
  const { confirm, ConfirmDialog } = useConfirm()

  const hook = useWageManagement({ showToast, confirm })
  const {
    projects, workerTeams,
    view, setView, selectedProject, setSelectedProject,
    selectedMonth, setSelectedMonth, loading, setLoading,
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
    loadAttendances, loadStats,
  } = hook

  if (view === 'cycle' && selectedProject) {
    return (
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
        onImportAttendance={async (data) => {
          if (!selectedProject) return
          setLoading(true)
          try {
            const result = await (await getAPI()).batchImportAttendances(selectedProject.id, selectedMonth, data)
            if (result.success && result.data) {
              showToast(`导入成功！新增 ${result.data.created} 条，更新 ${result.data.updated} 条`, 'success')
              await loadAttendances()
            } else {
              showToast(result.error || '导入失败', 'error')
            }
          } catch (e: any) { showToast(e?.message || '导入失败', 'error') }
          finally { setLoading(false) }
        }}
      />
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
