import { useState, useEffect, useRef, useCallback } from 'react'
import type { Member, WorkerTeam, WorkerStatus } from '../types/electron'
import { OCRProvider, getOCRConfig } from '../services/ocr'
import { useToastStore } from '../store/toastStore'
import {
  StaffFormData,
  WorkerFormData,
  defaultStaffFormData,
  defaultWorkerFormData,
  memberToStaffForm,
  memberToWorkerForm
} from '../components/features/members'
import { useMemberOperations } from '../components/features/members/useMemberOperations'
import { useTeamOps } from '../components/features/members/useTeamOps'
import { useLaborOperations } from '../components/features/labor/hooks/useLaborOperations'
import { useMemberPasteHandler } from '../components/features/members/useMemberPasteHandler'
import { getAPI } from '../services/api-adapter'
import { useWorkerImport } from '../components/features/members/useWorkerImport'
import { useMembersOCR } from './useMembersOCR'
import { useMembersBatch } from './useMembersBatch'

interface UseMembersPageProps {
  refresh?: () => void
}

export function useMembersPage({ refresh }: UseMembersPageProps) {
  // Tab state
  const [activeTab, setActiveTab] = useState<'staff' | 'worker'>('staff')

  // Data state
  const [members, setMembers] = useState<Member[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [workerTeams, setWorkerTeams] = useState<WorkerTeam[]>([])
  const [loading, setLoading] = useState(true)

  // Modal state
  const [showStaffModal, setShowStaffModal] = useState(false)
  const [editingStaff, setEditingStaff] = useState<Member | null>(null)
  const [showWorkerModal, setShowWorkerModal] = useState(false)
  const [editingWorker, setEditingWorker] = useState<Member | null>(null)

  // Detail modal
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)

  // WorkerPickerModal
  const [showWorkerPicker, setShowWorkerPicker] = useState(false)
  const [pickerProjectId, setPickerProjectId] = useState<number>(0)
  const [pickerExistingWorkerIds, setPickerExistingWorkerIds] = useState<Set<number>>(new Set())

  // Filter state
  const [filterStatus, setFilterStatus] = useState<WorkerStatus | 'all'>('all')

  // UI state
  const [, setOcrMode] = useState<OCRProvider>('offline')
  const showToast = useToastStore(state => state.showToast)
  const originalMemberFileRef = useRef<Record<number, Record<string, string>>>({})

  // Form data
  const [staffFormData, setStaffFormData] = useState<StaffFormData>(defaultStaffFormData)
  const [workerFormData, setWorkerFormData] = useState<WorkerFormData>(defaultWorkerFormData)

  // Excel import state
  const fileInputRef = useRef<HTMLInputElement>(null)
  const existingIdCards = new Set(
    members.filter(m => m.memberType === 'worker' && m.idCard).map(m => m.idCard!)
  )
  const {
    importState, progress, result, phase, error: importError,
    parseFile, switchSheet, setHeaderRow, setMapping, getConfidence,
    executeImport, saveCurrentMappingAsPreset, reset: resetImport,
  } = useWorkerImport(existingIdCards)

  // Form reset helpers
  const resetStaffForm = useCallback(() => {
    setStaffFormData(defaultStaffFormData)
    setEditingStaff(null)
  }, [])


  const resetWorkerForm = useCallback(() => {
    setWorkerFormData(defaultWorkerFormData)
    setEditingWorker(null)
  }, [])

  // OCR file processing
  const { processFileForIdCard, processUploadFile } = useMembersOCR({ setOcrMode })

  

  // Data loading
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const api = await getAPI()
      const [membersRes, projectsRes, teamsRes] = await Promise.allSettled([
        api.getMembers(),
        api.getProjects(),
        api.getWorkerTeams()
      ])
      const get = (r: PromiseSettledResult<any>) => r.status === 'fulfilled' && r.value?.success ? r.value.data || [] : []
      const membersData = get(membersRes)
      const projectsData = get(projectsRes)
      const teamsData = get(teamsRes)

      const membersWithRelations = membersData.map((m: Member) => {
        if (m.memberType === 'worker' && m.teamId) {
          const team = teamsData.find((t: WorkerTeam) => t.id === m.teamId)
          return {
            ...m,
            teamName: team?.name,
            projectId: team?.projectId,
            projectName: team?.projectName,
          }
        }
        return m
      })
      setMembers(membersWithRelations)
      setProjects(projectsData)

      const teamsWithRelations = teamsData.map((t: WorkerTeam) => {
        const project = projectsData.find((p: any) => p.id === t.projectId)
        const leader = membersData.find((m: Member) => m.id === t.leaderId)
        return {
          ...t,
          projectName: project?.name,
          leaderName: leader?.name,
        }
      })
      setWorkerTeams(teamsWithRelations)
    } catch (error) {
      console.error('加载数据失败:', error)
      showToast('加载数据失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  // WorkerPicker batch add
  const { handleBatchAddWorkers } = useMembersBatch({ loadData })

  useEffect(() => {
    loadData()
    const config = getOCRConfig()
    setOcrMode(config.provider)
  }, [refresh, loadData])

  // Paste handler
  useMemberPasteHandler({
    visible: showWorkerModal || showStaffModal,
    type: showWorkerModal ? 'worker' : 'staff',
    staffFormData, workerFormData,
    setStaffFormData, setWorkerFormData,
    processIdCardFile: processFileForIdCard,
    processUploadFile: processUploadFile as any,
  })

  // CRUD + lifecycle + team ops
  const { handleDeleteMember, handleFileModified, handleSubmitStaff, handleSubmitWorker } = useMemberOperations({
    editingStaff, editingWorker, projects, originalMemberFileRef, loadData,
    showToast,
    onSuccess: () => { setShowStaffModal(false); setShowWorkerModal(false); resetStaffForm(); resetWorkerForm() }
  })

  const {
    handleWorkerTransfer,
    handleWorkerLeave,
    handleWorkerReEntry,
    handleStaffStatusChange,
  } = useLaborOperations({
    members,
    projects,
    workerTeams,
    loadData,
    editingWorker,
    onSuccess: () => { setShowStaffModal(false); setShowWorkerModal(false) },
  })

  const { handleCreateTeam, handleUpdateTeam, handleDeleteTeam } = useTeamOps({ workerTeams, loadData, showToast })

  const handleMemberClick = useCallback((member: Member) => {
    setSelectedMember(member)
    setShowDetailModal(true)
  }, [])

  const handleEditStaff = useCallback((staff: Member) => {
    setEditingStaff(staff)
    const formData = memberToStaffForm(staff)
    originalMemberFileRef.current[staff.id] = {}
    for (const key of ['idCardFront', 'idCardBack', 'contractFile']) {
      const val = (formData as any)[key]
      if (val && !val.startsWith('data:')) originalMemberFileRef.current[staff.id][key] = val
    }
    setShowStaffModal(true)
  }, [])

  const handleEditWorker = useCallback((worker: Member) => {
    setEditingWorker(worker)
    const formData = memberToWorkerForm(worker)
    originalMemberFileRef.current[worker.id] = {}
    for (const key of ['idCardFront', 'idCardBack', 'contractFile', 'safetyTrainingFile', 'healthReportFile', 'specialCertificateFile']) {
      const val = (formData as any)[key]
      if (val && !val.startsWith('data:')) originalMemberFileRef.current[worker.id][key] = val
    }
    setShowWorkerModal(true)
  }, [])

  // Data filtering
  const staffMembers = members.filter(m => m.memberType !== 'worker' || !m.memberType)
  const workerMembers = members.filter(m => m.memberType === 'worker')
  const filteredStaff = staffMembers.filter(m => filterStatus === 'all' || (m.status || 'active') === filterStatus)
  const filteredWorkers = workerMembers.filter(w => filterStatus === 'all' || (w.status || 'active') === filterStatus)

  return {
    // Tab
    activeTab, setActiveTab,
    // Data
    members, projects, workerTeams, loading, loadData,
    // Modals
    showStaffModal, setShowStaffModal, editingStaff,
    showWorkerModal, setShowWorkerModal, editingWorker,
    showDetailModal, setShowDetailModal, selectedMember, setSelectedMember,
    showWorkerPicker, setShowWorkerPicker, pickerProjectId, setPickerProjectId,
    pickerExistingWorkerIds, setPickerExistingWorkerIds,
    // Filter
    filterStatus, setFilterStatus,
    // Form
    staffFormData, setStaffFormData, workerFormData, setWorkerFormData,
    resetStaffForm, resetWorkerForm,
    // File
    processFileForIdCard, processUploadFile,
    fileInputRef,
    // Handlers
    handleBatchAddWorkers, handleMemberClick, handleEditStaff, handleEditWorker,
    handleDeleteMember, handleFileModified, handleSubmitStaff, handleSubmitWorker,
    handleWorkerTransfer, handleWorkerLeave, handleWorkerReEntry, handleStaffStatusChange,
    handleCreateTeam, handleUpdateTeam, handleDeleteTeam,
    // Import
    importState, progress, result, phase, importError,
    parseFile, switchSheet, setHeaderRow, setMapping, getConfidence,
    executeImport, saveCurrentMappingAsPreset, resetImport,
    // Filtered data
    staffMembers, workerMembers, filteredStaff, filteredWorkers,
  }
}
