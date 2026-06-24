// Members.tsx - 员工管理页面

import React, { Suspense } from 'react'
import type { WorkerStatus } from '../types/electron'
import { Icon } from './ui/Icon'
import { Card } from './ui/Card'
import PageContainer from './ui/PageContainer'
import Spinner from './ui/Spinner'

import {
  MemberForm,
  MemberDetail,
} from './features/members'
import StaffManagementTab from './features/members/StaffManagementTab'
import MemberWorkerSection from './features/members/MemberWorkerSection'
import { useMembersPage } from '../hooks/useMembersPage'

const WorkerImportModal = React.lazy(() => import('./features/members/WorkerImportModal').then(m => ({ default: m.WorkerImportModal })))
const WorkerPickerModal = React.lazy(() => import('./features/members/WorkerPickerModal').then(m => ({ default: m.WorkerPickerModal })))

interface MembersProps {
  refresh?: () => void
}

const Members: React.FC<MembersProps> = ({ refresh }) => {
  const {
    activeTab, setActiveTab,
    members, projects, workerTeams, loading, loadData,
    showStaffModal, setShowStaffModal, editingStaff,
    showWorkerModal, setShowWorkerModal, editingWorker,
    showDetailModal, setShowDetailModal, selectedMember, setSelectedMember,
    showWorkerPicker, setShowWorkerPicker, pickerProjectId, setPickerProjectId,
    pickerExistingWorkerIds, setPickerExistingWorkerIds,
    filterStatus, setFilterStatus,
    resetStaffForm, resetWorkerForm,
    fileInputRef,
    handleBatchAddWorkers, handleMemberClick, handleEditStaff, handleEditWorker,
    handleDeleteMember, handleFileModified, handleSubmitStaff, handleSubmitWorker,
    handleWorkerTransfer, handleWorkerLeave, handleWorkerReEntry, handleStaffStatusChange,
    handleCreateTeam, handleUpdateTeam, handleDeleteTeam,
    importState, progress, result, phase, importError,
    parseFile, switchSheet, setHeaderRow, setMapping, getConfidence,
    executeImport, saveCurrentMappingAsPreset, resetImport,
    staffMembers, workerMembers, filteredStaff, filteredWorkers,
  } = useMembersPage({ refresh })

  if (loading) {
    return <Spinner size="lg" text="加载人员数据..." />
  }

  return (
    <PageContainer className="relative">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">员工管理</h1>
          <p className="text-slate-500 mt-1">管理公司员工与农民工信息</p>
        </div>
      </div>

      {/* 主 Tab */}
      <Card bordered={false} className="mb-6">
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('staff')}
            className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
              activeTab === 'staff'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon name="UserCheck" size={16} /> 管理人员 ({staffMembers.length})
          </button>
          <button
            onClick={() => setActiveTab('worker')}
            className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
              activeTab === 'worker'
                ? 'text-orange-600 border-b-2 border-orange-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon name="HardHat" size={16} /> 农民工 ({workerMembers.length})
          </button>
        </div>
      </Card>

      {/* 管理人员 Tab */}
      {activeTab === 'staff' && (
        <StaffManagementTab
          filteredStaff={filteredStaff}
          filterStatus={filterStatus}
          onFilterStatusChange={(v) => setFilterStatus(v as WorkerStatus | 'all')}
          onAdd={() => { resetStaffForm(); setShowStaffModal(true) }}
          onEdit={handleEditStaff}
          onDelete={(id: number) => handleDeleteMember(id, members)}
          onClick={handleMemberClick}
          onStatusChange={handleStaffStatusChange}
        />
      )}

      {/* 农民工 Tab - React.lazy 动态加载 */}
      {activeTab === 'worker' && (
        <MemberWorkerSection
          members={filteredWorkers}
          projects={projects.map(p => ({ id: p.id, name: p.name }))}
          workerTeams={workerTeams}
          loading={false}
          onRefresh={loadData}
          onAddWorker={() => { resetWorkerForm(); setShowWorkerModal(true) }}
          onEditWorker={handleEditWorker}
          onDeleteWorker={(id: number) => handleDeleteMember(id, members)}
          onAddTeam={handleCreateTeam}
          onEditTeam={handleUpdateTeam}
          onDeleteTeam={handleDeleteTeam}
          onTransfer={(worker, toTeamId, toProjectId, transferDate, reason) => handleWorkerTransfer(worker, toTeamId, toProjectId, transferDate, reason, workerTeams)}
          onLeave={(worker, actualLeaveDate, remarks) => handleWorkerLeave(worker, actualLeaveDate, remarks)}
          onReEntry={handleWorkerReEntry}
          onImportClick={() => fileInputRef.current?.click()}
          onFileDrop={(file) => parseFile(file)}
          onAddFromPool={(projectId, existingIds) => {
            setPickerProjectId(projectId)
            setPickerExistingWorkerIds(existingIds)
            setShowWorkerPicker(true)
          }}
        />
      )}

      {/* 隐藏文件选择器 + Excel导入模态框 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) parseFile(f); e.target.value = '' }}
      />
      <Suspense fallback={null}>
        <WorkerImportModal
          show={phase !== 'idle' || !!importError}
          importState={importState}
          progress={progress}
          result={result}
          phase={phase}
          error={importError}
          onClose={() => { resetImport() }}
          onSetHeaderRow={setHeaderRow}
          onSwitchSheet={switchSheet}
          onSetMapping={setMapping}
          onGetConfidence={getConfidence}
          onExecuteImport={() => executeImport(
            (_data) => Promise.resolve({ success: true, data: { id: 0 } }),
            () => loadData()
          )}
          onSavePreset={saveCurrentMappingAsPreset}
        />
      </Suspense>

      {/* WorkerPickerModal — 从全局工人库批量添加 */}
      <Suspense fallback={null}>
        <WorkerPickerModal
          show={showWorkerPicker}
          projectId={pickerProjectId}
          workerTeams={workerTeams}
          existingWorkerIds={pickerExistingWorkerIds}
          onClose={() => setShowWorkerPicker(false)}
          onConfirm={handleBatchAddWorkers}
        />
      </Suspense>

      {/* 管理人员表单模态框 */}
      {showStaffModal && (
        <MemberForm
          type="staff"
          editingMember={editingStaff}
          projects={projects}
          workerTeams={workerTeams}
          visible={showStaffModal}
          onClose={() => { setShowStaffModal(false); resetStaffForm() }}
          onSubmit={handleSubmitStaff as any}
          onFileModified={handleFileModified}
        />
      )}

      {/* 农民工表单模态框 */}
      {showWorkerModal && (
        <MemberForm
          type="worker"
          editingMember={editingWorker}
          projects={projects}
          workerTeams={workerTeams}
          visible={showWorkerModal}
          onClose={() => { setShowWorkerModal(false); resetWorkerForm() }}
          onSubmit={handleSubmitWorker as any}
          onFileModified={handleFileModified}
        />
      )}

      {/* 详情模态框 */}
      {showDetailModal && selectedMember && (
        <MemberDetail
          member={selectedMember}
          onClose={() => { setShowDetailModal(false); setSelectedMember(null) }}
          onEdit={(selectedMember.memberType === "worker" ? handleEditWorker : handleEditStaff) as any}
          onDelete={handleDeleteMember as any}
        />
      )}
    </PageContainer>
  )
}

export default Members
