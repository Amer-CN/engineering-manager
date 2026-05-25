// LaborManagement.tsx - 工人管理主页面（使用统一 Tabs 组件）
import React, { useState, useCallback, useRef, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Tabs } from './ui/Tabs'
import { useLaborData } from './features/labor/hooks/useLaborData'
import { useLaborModals } from './features/labor/hooks/useLaborModals'
import { useLaborOperations } from './features/labor/hooks/useLaborOperations'
import { LABOR_TAB_KEY } from './features/labor/theme'
import { useWorkerImport } from './features/members/useWorkerImport'
import { MemberForm, WorkerFormData, defaultWorkerFormData, memberToWorkerForm } from './features/members'

// Lazy load tab content components
const LaborDashboard = React.lazy(() => import('./features/labor/LaborDashboard'))
const LaborWorkerList = React.lazy(() => import('./features/labor/LaborWorkerList'))
const LaborTeamManager = React.lazy(() => import('./features/labor/LaborTeamManager'))
const WageManagement = React.lazy(() => import('./WageManagement'))

// Lazy load modals
const WorkerImportModal = React.lazy(() => import('./features/members/WorkerImportModal').then(m => ({ default: m.WorkerImportModal })))
const WorkerPickerModal = React.lazy(() => import('./features/members/WorkerPickerModal').then(m => ({ default: m.WorkerPickerModal })))
const TeamWorkerModal = React.lazy(() => import('./features/members/TeamWorkerModal'))
const FileImportDialog = React.lazy(() => import('./features/wages/FileImportDialog').then(m => ({ default: m.FileImportDialog })))

const TABS = [
  { id: 'dashboard', label: '看板', icon: 'LayoutDashboard' },
  { id: 'workers', label: '人员�?', icon: 'Construction' },
  { id: 'teams', label: '班组管理', icon: 'Building2' },
  { id: 'wages', label: '赖资管理', icon: 'Wallet' },
]

const LaborManagement: React.FC = () => {

  // Tab state with localStorage persistence
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem(LABOR_TAB_KEY) || 'dashboard')
  const setTab = useCallback((id: string) => {
    setActiveTab(id)
    localStorage.setItem(LABOR_TAB_KEY, id)
  }, [])

  // Data hook
  const { members, projects, workerTeams, loading, loadData } = useLaborData()

  // Modals hook
  const modals = useLaborModals()

  // Operations hook
  const ops = useLaborOperations({
    members,
    projects,
    workerTeams,
    loadData,
    editingWorker: modals.editingWorker,
    onSuccess: () => {
      modals.closeWorkerModal()
      modals.closePoolForm()
    },
  })

  // Worker import
  const [showFileDialog, setShowFileDialog] = useState(false)
  const existingIdCards = new Set(members.filter(m => m.memberType === 'worker' && m.idCard).map(m => m.idCard!))
  const { importState, progress, result, phase, error: importError, parseFile, switchSheet, setHeaderRow, setMapping, getConfidence, executeImport, saveCurrentMappingAsPreset, reset: resetImport } = useWorkerImport(existingIdCards)

  // Worker form state
// @ts-ignore TS6133: workerFormData and setWorkerFormData are declared but never read
  const [workerFormData, setWorkerFormData] = useState<WorkerFormData>(defaultWorkerFormData)
  const originalMemberFileRef = useRef<Record<number, Record<string, string>>>({})

// @ts-ignore TS6133: handleEditWorker is declared but never read
  const handleEditWorker = (worker: any) => {
    const formData = memberToWorkerForm(worker)
    originalMemberFileRef.current[worker.id] = {}
    for (const key of ['idCardFront', 'idCardBack', 'contractFile', 'safetyTrainingFile', 'healthReportFile', 'specialCertificateFile']) {
      const val = (formData as any)[key]
      if (val && !val.startsWith('data:')) originalMemberFileRef.current[worker.id][key] = val
    }
    modals.openWorkerModal(worker)
  }

  const handleTeamAddWorkers = (teamId: number, projectId: number) => {
    const existingIds = new Set(members.filter((w: any) => w.projectId === projectId).map((w: any) => w.workerId))
    modals.openWorkerPicker(projectId, existingIds, teamId)
  }

  const workerMembers = members.filter(m => m.memberType === 'worker')

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">工人管理</h1>
        <p className="text-slate-500 mt-1">管理农民工信息、班组与工资</p>
      </div>

      {/* 统一 Tabs 组件 */}
      <Tabs
        value={activeTab}
        onChange={(value: string) => setTab(value)}
        tabs={TABS.map(tab => ({ key: tab.id, label: tab.label, icon: tab.icon }))}
        animated={true}
      >
        <AnimatePresence mode="sync">
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
            >
              <LaborDashboard
                members={workerMembers}
                projects={projects}
                workerTeams={workerTeams}
              />
            </motion.div>
          )}

          {activeTab === 'workers' && (
            <motion.div
              key="workers"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
            >
              <LaborWorkerList
                members={workerMembers}
                projects={projects}
                workerTeams={workerTeams}
                onRefresh={loadData}
                onAddWorker={() => modals.openWorkerModal()}
                onEditWorker={(worker) => modals.openWorkerModal(worker)}
                onDeleteWorker={ops.handleDeletePoolWorker}
                onImportClick={() => setShowFileDialog(true)}
              />
            </motion.div>
          )}

          {activeTab === 'teams' && (
            <motion.div
              key="teams"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
            >
              <LaborTeamManager
                members={workerMembers}
                projects={projects}
                workerTeams={workerTeams}
                onRefresh={loadData}
                onAddTeam={ops.handleCreateTeam}
                onEditTeam={ops.handleUpdateTeam}
                onDeleteTeam={ops.handleDeleteTeam}
                onManageWorkers={(teamId, teamName, projectId) => {
                  modals.openTeamWorkerModal(teamId, teamName, projectId)
                }}
              />
            </motion.div>
          )}

          {activeTab === 'wages' && (
            <motion.div
              key="wages"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
            >
              <WageManagement />
            </motion.div>
          )}
        </AnimatePresence>
      </Tabs>

      {/* File import dialog (shared) */}
      <Suspense fallback={null}>
        <FileImportDialog
          show={showFileDialog}
          title="导入 Excel"
          description="选择工人信息�?Excel 文件，支�?.xlsx / .xls / .csv 格式"
          accept=".xlsx,.xls,.csv"
          acceptText="Excel 表格 (.xlsx, .xls, .csv)"
          onFile={(file) => {
            setShowFileDialog(false)
            parseFile(file)
          }}
          onClose={() => setShowFileDialog(false)}
        />
      </Suspense>

      {/* Modals */}
      <Suspense fallback={null}>
        <WorkerImportModal
          show={phase !== 'idle' || !!importError}
          importState={importState}
          progress={progress}
          result={result}
          phase={phase}
          error={importError}
          onClose={resetImport}
          onSetHeaderRow={setHeaderRow}
          onSwitchSheet={switchSheet}
          onSetMapping={setMapping}
          onGetConfidence={getConfidence}
          onExecuteImport={() => executeImport(
            () => Promise.resolve({ success: true, data: { id: 0 } }),
            () => loadData()
          )}
          onSavePreset={saveCurrentMappingAsPreset}
        />
      </Suspense>

      <Suspense fallback={null}>
        <WorkerPickerModal
          show={modals.showWorkerPicker}
          projectId={modals.pickerProjectId}
          workerTeams={workerTeams}
          existingWorkerIds={modals.pickerExistingWorkerIds}
          defaultTeamId={modals.pickerDefaultTeamId}
          onClose={modals.closeWorkerPicker}
          onConfirm={ops.handleBatchAddWorkers}
        />
      </Suspense>

      <Suspense fallback={null}>
        <TeamWorkerModal
          show={modals.showTeamWorkerModal}
          teamId={modals.teamWorkerTeamId}
          teamName={modals.teamWorkerTeamName}
          projectId={modals.teamWorkerProjectId}
          members={members}
          workerTeams={workerTeams}
          onClose={modals.closeTeamWorkerModal}
          onUpdateWorker={ops.handleUpdateProjectWorker}
          onRemoveWorker={ops.handleDeleteProjectWorker}
          onTransferWorker={ops.handleTeamWorkerTransfer}
          onAddWorkers={handleTeamAddWorkers}
          onWageUpdated={() => loadData(true)}
        />
      </Suspense>

      {modals.showWorkerModal && (
        <MemberForm
          type="worker"
          editingMember={modals.editingWorker}
          projects={projects}
          workerTeams={workerTeams}
          visible={modals.showWorkerModal}
          onClose={modals.closeWorkerModal}
          onSubmit={ops.handleSubmitWorker as any}
          onFileModified={ops.handleFileModified}
        />
      )}

      {modals.showDetailModal && modals.selectedMember && (
        <MemberForm
          type="worker"
          editingMember={modals.selectedMember}
          projects={projects}
          workerTeams={workerTeams}
          visible={modals.showDetailModal}
          onClose={modals.closeDetailModal}
          onSubmit={ops.handleSubmitWorker as any}
          onFileModified={ops.handleFileModified}
        />
      )}

      {/* 确认对话�?(工人管理) */}
      {ops.ConfirmDialog}
    </div>
  )
}

export default LaborManagement
