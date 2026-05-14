// LaborManagement.tsx - 工人管理页面（重构版：4-Tab容器）

import React, { useState, useCallback, useRef, Suspense } from 'react'
import { motion } from 'framer-motion'
import { Icon } from './ui/Icon'
import { useToastContext } from '../hooks/useToast'
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
const WorkerPoolForm = React.lazy(() => import('./features/members/WorkerPoolForm'))

const TABS = [
  { id: 'dashboard', label: '看板', icon: 'LayoutDashboard' },
  { id: 'workers', label: '工人库', icon: 'Construction' },
  { id: 'teams', label: '班组管理', icon: 'Building2' },
  { id: 'wages', label: '工资管理', icon: 'Wallet' },
]

const LaborManagement: React.FC = () => {
  const { showToast } = useToastContext()

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
    onSuccess: () => {
      modals.closeWorkerModal()
      modals.closePoolForm()
    },
  })

  // Worker import
  const fileInputRef = useRef<HTMLInputElement>(null)
  const existingIdCards = new Set(members.filter(m => m.memberType === 'worker' && m.idCard).map(m => m.idCard!))
  const { importState, progress, result, phase, error: importError, parseFile, switchSheet, setHeaderRow, setMapping, getConfidence, executeImport, saveCurrentMappingAsPreset, reset: resetImport } = useWorkerImport(existingIdCards)

  // Worker form state
  const [workerFormData, setWorkerFormData] = useState<WorkerFormData>(defaultWorkerFormData)
  const originalMemberFileRef = useRef<Record<number, Record<string, string>>>({})
  const resetWorkerForm = () => {
    setWorkerFormData(defaultWorkerFormData)
  }

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

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 border-b border-slate-200">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setTab(tab.id)}
            className={`relative px-5 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-amber-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <Icon name={tab.icon} size={16} />
              {tab.label}
            </span>
            {activeTab === tab.id && (
              <motion.div
                layoutId="labor-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-600"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
      >
        <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-amber-500" /></div>}>
          {activeTab === 'dashboard' && (
            <LaborDashboard
              members={workerMembers}
              projects={projects}
              workerTeams={workerTeams}
            />
          )}

          {activeTab === 'workers' && (
            <LaborWorkerList
              members={workerMembers}
              projects={projects}
              workerTeams={workerTeams}
              onRefresh={loadData}
              onAddWorker={() => modals.openPoolForm()}
              onEditWorker={(worker) => modals.openPoolForm(worker)}
              onDeleteWorker={ops.handleDeletePoolWorker}
              onImportClick={() => fileInputRef.current?.click()}
            />
          )}

          {activeTab === 'teams' && (
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
          )}

          {activeTab === 'wages' && <WageManagement />}
        </Suspense>
      </motion.div>

      {/* Hidden file input for Excel import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0]
          if (f) parseFile(f)
          e.target.value = ''
        }}
      />

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
        />
      </Suspense>

      <Suspense fallback={null}>
        <WorkerPoolForm
          visible={modals.showPoolForm}
          editing={modals.editingPoolWorker}
          onClose={modals.closePoolForm}
          onSubmit={(formData) => ops.handleSubmitPoolWorker(formData, modals.editingPoolWorker)}
          onSwitchToFull={(worker) => {
            modals.closePoolForm()
            handleEditWorker(worker)
          }}
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
          onSubmit={ops.handleSubmitWorker}
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
          onSubmit={ops.handleSubmitWorker}
          onFileModified={ops.handleFileModified}
        />
      )}
    </div>
  )
}

export default LaborManagement
