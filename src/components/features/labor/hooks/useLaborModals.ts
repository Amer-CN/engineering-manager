import { useState, useCallback } from 'react'
import type { Member } from '../../../../types/electron'

interface UseLaborModalsReturn {
  // Worker modal (MemberForm)
  showWorkerModal: boolean
  editingWorker: Member | null
  openWorkerModal: (worker?: Member | null) => void
  closeWorkerModal: () => void

  // Detail modal (MemberForm)
  showDetailModal: boolean
  selectedMember: Member | null
  openDetailModal: (member: Member) => void
  closeDetailModal: () => void

  // Worker picker
  showWorkerPicker: boolean
  pickerProjectId: number
  pickerExistingWorkerIds: Set<number>
  pickerDefaultTeamId: number | undefined
  openWorkerPicker: (projectId: number, existingIds: Set<number>, defaultTeamId?: number) => void
  closeWorkerPicker: () => void

  // Team worker modal
  showTeamWorkerModal: boolean
  teamWorkerTeamId: number
  teamWorkerTeamName: string
  teamWorkerProjectId: number
  openTeamWorkerModal: (teamId: number, teamName: string, projectId: number) => void
  closeTeamWorkerModal: () => void

  // Pool form (WorkerPoolForm)
  showPoolForm: boolean
  editingPoolWorker: any | null
  openPoolForm: (worker?: any | null) => void
  closePoolForm: () => void
}

/**
 * 工人管理模态框状态 Hook
 * 收敛所有模态框的开关状态和参数
 */
export function useLaborModals(): UseLaborModalsReturn {
  // Worker modal
  const [showWorkerModal, setShowWorkerModal] = useState(false)
  const [editingWorker, setEditingWorker] = useState<Member | null>(null)

  // Detail modal
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)

  // Worker picker
  const [showWorkerPicker, setShowWorkerPicker] = useState(false)
  const [pickerProjectId, setPickerProjectId] = useState<number>(0)
  const [pickerExistingWorkerIds, setPickerExistingWorkerIds] = useState<Set<number>>(new Set())
  const [pickerDefaultTeamId, setPickerDefaultTeamId] = useState<number | undefined>(undefined)

  // Team worker modal
  const [showTeamWorkerModal, setShowTeamWorkerModal] = useState(false)
  const [teamWorkerTeamId, setTeamWorkerTeamId] = useState<number>(0)
  const [teamWorkerTeamName, setTeamWorkerTeamName] = useState('')
  const [teamWorkerProjectId, setTeamWorkerProjectId] = useState<number>(0)

  // Pool form
  const [showPoolForm, setShowPoolForm] = useState(false)
  const [editingPoolWorker, setEditingPoolWorker] = useState<any | null>(null)

  // Worker modal
  const openWorkerModal = useCallback((worker?: Member | null) => {
    setEditingWorker(worker || null)
    setShowWorkerModal(true)
  }, [])

  const closeWorkerModal = useCallback(() => {
    setShowWorkerModal(false)
    setEditingWorker(null)
  }, [])

  // Detail modal
  const openDetailModal = useCallback((member: Member) => {
    setSelectedMember(member)
    setShowDetailModal(true)
  }, [])

  const closeDetailModal = useCallback(() => {
    setShowDetailModal(false)
    setSelectedMember(null)
  }, [])

  // Worker picker
  const openWorkerPicker = useCallback((projectId: number, existingIds: Set<number>, defaultTeamId?: number) => {
    setPickerProjectId(projectId)
    setPickerExistingWorkerIds(existingIds)
    setPickerDefaultTeamId(defaultTeamId)
    setShowWorkerPicker(true)
  }, [])

  const closeWorkerPicker = useCallback(() => {
    setShowWorkerPicker(false)
    setPickerDefaultTeamId(undefined)
  }, [])

  // Team worker modal
  const openTeamWorkerModal = useCallback((teamId: number, teamName: string, projectId: number) => {
    setTeamWorkerTeamId(teamId)
    setTeamWorkerTeamName(teamName)
    setTeamWorkerProjectId(projectId)
    setShowTeamWorkerModal(true)
  }, [])

  const closeTeamWorkerModal = useCallback(() => {
    setShowTeamWorkerModal(false)
  }, [])

  // Pool form
  const openPoolForm = useCallback((worker?: any | null) => {
    setEditingPoolWorker(worker || null)
    setShowPoolForm(true)
  }, [])

  const closePoolForm = useCallback(() => {
    setShowPoolForm(false)
    setEditingPoolWorker(null)
  }, [])

  return {
    showWorkerModal, editingWorker, openWorkerModal, closeWorkerModal,
    showDetailModal, selectedMember, openDetailModal, closeDetailModal,
    showWorkerPicker, pickerProjectId, pickerExistingWorkerIds, pickerDefaultTeamId, openWorkerPicker, closeWorkerPicker,
    showTeamWorkerModal, teamWorkerTeamId, teamWorkerTeamName, teamWorkerProjectId, openTeamWorkerModal, closeTeamWorkerModal,
    showPoolForm, editingPoolWorker, openPoolForm, closePoolForm,
  }
}
