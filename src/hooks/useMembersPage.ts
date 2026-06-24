import { useEffect, useCallback } from 'react'
import type { Member } from '../types/electron'
import { getOCRConfig } from '../services/ocr'
import { useToastStore } from '../store/toastStore'
import { defaultStaffFormData, defaultWorkerFormData } from '../components/features/members'
import { useMemberOperations } from '../components/features/members/useMemberOperations'
import { useTeamOps } from '../components/features/members/useTeamOps'
import { useLaborOperations } from '../components/features/labor/hooks/useLaborOperations'
import { useMemberPasteHandler } from '../components/features/members/useMemberPasteHandler'
import { useWorkerImport } from '../components/features/members/useWorkerImport'
import { useMembersOCR } from './useMembersOCR'
import { useMembersBatch } from './useMembersBatch'
import { useMembersState } from './useMembersState'
import { useMembersLoadData } from './useMembersLoadData'
import { useMembersEditHandlers } from './useMembersEditHandlers'

interface UseMembersPageProps {
  refresh?: () => void
}

export function useMembersPage({ refresh }: UseMembersPageProps) {
  const state = useMembersState()
  const {
    members, setMembers, projects, setProjects, workerTeams, setWorkerTeams,
    setLoading, setOcrMode,
    showStaffModal, setShowStaffModal, editingStaff,
    showWorkerModal, setShowWorkerModal, editingWorker,
    setShowDetailModal, selectedMember, setSelectedMember,
    filterStatus, setFilterStatus,
    staffFormData, setStaffFormData, workerFormData, setWorkerFormData,
    originalMemberFileRef, fileInputRef,
    showWorkerPicker, setShowWorkerPicker,
    pickerProjectId, setPickerProjectId,
    pickerExistingWorkerIds, setPickerExistingWorkerIds,
    activeTab, setActiveTab, loading,
  } = state

  const showToast = useToastStore(s => s.showToast)
  const { loadData } = useMembersLoadData({ setMembers, setProjects, setWorkerTeams, setLoading })
  const { handleBatchAddWorkers } = useMembersBatch({ loadData })
  const { processFileForIdCard, processUploadFile } = useMembersOCR({ setOcrMode })

  const resetStaffForm = useCallback(() => {
    state.setStaffFormData(defaultStaffFormData); state.setEditingStaff(null)
  }, [])
  const resetWorkerForm = useCallback(() => {
    state.setWorkerFormData(defaultWorkerFormData); state.setEditingWorker(null)
  }, [])

  const { handleEditStaff, handleEditWorker } = useMembersEditHandlers({
    setEditingStaff: state.setEditingStaff, setEditingWorker: state.setEditingWorker,
    setShowStaffModal, setShowWorkerModal, originalMemberFileRef,
  })

  useEffect(() => {
    loadData()
    setOcrMode(getOCRConfig().provider)
  }, [refresh, loadData, setOcrMode])

  useMemberPasteHandler({
    visible: showWorkerModal || showStaffModal,
    type: showWorkerModal ? 'worker' : 'staff',
    staffFormData, workerFormData, setStaffFormData, setWorkerFormData,
    processIdCardFile: processFileForIdCard,
    processUploadFile: processUploadFile as any,
  })

  const { handleDeleteMember, handleFileModified, handleSubmitStaff, handleSubmitWorker } = useMemberOperations({
    editingStaff, editingWorker, projects, originalMemberFileRef, loadData, showToast,
    onSuccess: () => { setShowStaffModal(false); setShowWorkerModal(false); resetStaffForm(); resetWorkerForm() },
  })

  const { handleWorkerTransfer, handleWorkerLeave, handleWorkerReEntry, handleStaffStatusChange } = useLaborOperations({
    members, projects, workerTeams, loadData, editingWorker,
    onSuccess: () => { setShowStaffModal(false); setShowWorkerModal(false) },
  })

  const { handleCreateTeam, handleUpdateTeam, handleDeleteTeam } = useTeamOps({ workerTeams, loadData, showToast })
  const handleMemberClick = useCallback((m: Member) => { setSelectedMember(m); setShowDetailModal(true) }, [])

  const existingIdCards = new Set(members.filter(m => m.memberType === 'worker' && m.idCard).map(m => m.idCard!))
  const {
    importState, progress, result, phase, error: importError,
    parseFile, switchSheet, setHeaderRow, setMapping, getConfidence,
    executeImport, saveCurrentMappingAsPreset, reset: resetImport,
  } = useWorkerImport(existingIdCards)

  const staffMembers = members.filter(m => m.memberType !== 'worker' || !m.memberType)
  const workerMembers = members.filter(m => m.memberType === 'worker')
  const filteredStaff = staffMembers.filter(m => filterStatus === 'all' || (m.status || 'active') === filterStatus)
  const filteredWorkers = workerMembers.filter(w => filterStatus === 'all' || (w.status || 'active') === filterStatus)

  return {
    activeTab, setActiveTab,
    members, projects, workerTeams, loading, loadData,
    showStaffModal, setShowStaffModal, editingStaff,
    showWorkerModal, setShowWorkerModal, editingWorker,
    showDetailModal: state.showDetailModal, setShowDetailModal, selectedMember, setSelectedMember,
    showWorkerPicker, setShowWorkerPicker, pickerProjectId, setPickerProjectId,
    pickerExistingWorkerIds, setPickerExistingWorkerIds,
    filterStatus, setFilterStatus,
    staffFormData, setStaffFormData, workerFormData, setWorkerFormData,
    resetStaffForm, resetWorkerForm,
    processFileForIdCard, processUploadFile, fileInputRef,
    handleBatchAddWorkers, handleMemberClick, handleEditStaff, handleEditWorker,
    handleDeleteMember, handleFileModified, handleSubmitStaff, handleSubmitWorker,
    handleWorkerTransfer, handleWorkerLeave, handleWorkerReEntry, handleStaffStatusChange,
    handleCreateTeam, handleUpdateTeam, handleDeleteTeam,
    importState, progress, result, phase, importError,
    parseFile, switchSheet, setHeaderRow, setMapping, getConfidence,
    executeImport, saveCurrentMappingAsPreset, resetImport,
    staffMembers, workerMembers, filteredStaff, filteredWorkers,
  }
}
