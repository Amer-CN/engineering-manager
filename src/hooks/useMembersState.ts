import { useState, useRef } from 'react'
import type { Member, WorkerTeam, WorkerStatus } from '../types/electron'
import type { OCRProvider } from '../services/ocr'
import {
  StaffFormData, WorkerFormData, defaultStaffFormData, defaultWorkerFormData,
} from '../components/features/members'

export interface MembersState {
  activeTab: 'staff' | 'worker'
  setActiveTab: React.Dispatch<React.SetStateAction<'staff' | 'worker'>>
  members: Member[]
  setMembers: React.Dispatch<React.SetStateAction<Member[]>>
  projects: any[]
  setProjects: React.Dispatch<React.SetStateAction<any[]>>
  workerTeams: WorkerTeam[]
  setWorkerTeams: React.Dispatch<React.SetStateAction<WorkerTeam[]>>
  loading: boolean
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
  showStaffModal: boolean
  setShowStaffModal: React.Dispatch<React.SetStateAction<boolean>>
  editingStaff: Member | null
  setEditingStaff: React.Dispatch<React.SetStateAction<Member | null>>
  showWorkerModal: boolean
  setShowWorkerModal: React.Dispatch<React.SetStateAction<boolean>>
  editingWorker: Member | null
  setEditingWorker: React.Dispatch<React.SetStateAction<Member | null>>
  showDetailModal: boolean
  setShowDetailModal: React.Dispatch<React.SetStateAction<boolean>>
  selectedMember: Member | null
  setSelectedMember: React.Dispatch<React.SetStateAction<Member | null>>
  showWorkerPicker: boolean
  setShowWorkerPicker: React.Dispatch<React.SetStateAction<boolean>>
  pickerProjectId: number
  setPickerProjectId: React.Dispatch<React.SetStateAction<number>>
  pickerExistingWorkerIds: Set<number>
  setPickerExistingWorkerIds: React.Dispatch<React.SetStateAction<Set<number>>>
  filterStatus: WorkerStatus | 'all'
  setFilterStatus: React.Dispatch<React.SetStateAction<WorkerStatus | 'all'>>
  ocrMode: OCRProvider
  setOcrMode: React.Dispatch<React.SetStateAction<OCRProvider>>
  originalMemberFileRef: React.MutableRefObject<Record<number, Record<string, string>>>
  staffFormData: StaffFormData
  setStaffFormData: React.Dispatch<React.SetStateAction<StaffFormData>>
  workerFormData: WorkerFormData
  setWorkerFormData: React.Dispatch<React.SetStateAction<WorkerFormData>>
  fileInputRef: React.RefObject<HTMLInputElement>
}

export function useMembersState(): MembersState {
  const [activeTab, setActiveTab] = useState<'staff' | 'worker'>('staff')
  const [members, setMembers] = useState<Member[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [workerTeams, setWorkerTeams] = useState<WorkerTeam[]>([])
  const [loading, setLoading] = useState(true)
  const [showStaffModal, setShowStaffModal] = useState(false)
  const [editingStaff, setEditingStaff] = useState<Member | null>(null)
  const [showWorkerModal, setShowWorkerModal] = useState(false)
  const [editingWorker, setEditingWorker] = useState<Member | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [showWorkerPicker, setShowWorkerPicker] = useState(false)
  const [pickerProjectId, setPickerProjectId] = useState<number>(0)
  const [pickerExistingWorkerIds, setPickerExistingWorkerIds] = useState<Set<number>>(new Set())
  const [filterStatus, setFilterStatus] = useState<WorkerStatus | 'all'>('all')
  const [ocrMode, setOcrMode] = useState<OCRProvider>('offline')
  const [staffFormData, setStaffFormData] = useState<StaffFormData>(defaultStaffFormData)
  const [workerFormData, setWorkerFormData] = useState<WorkerFormData>(defaultWorkerFormData)
  const originalMemberFileRef = useRef<Record<number, Record<string, string>>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  return {
    activeTab, setActiveTab,
    members, setMembers,
    projects, setProjects,
    workerTeams, setWorkerTeams,
    loading, setLoading,
    showStaffModal, setShowStaffModal,
    editingStaff, setEditingStaff,
    showWorkerModal, setShowWorkerModal,
    editingWorker, setEditingWorker,
    showDetailModal, setShowDetailModal,
    selectedMember, setSelectedMember,
    showWorkerPicker, setShowWorkerPicker,
    pickerProjectId, setPickerProjectId,
    pickerExistingWorkerIds, setPickerExistingWorkerIds,
    filterStatus, setFilterStatus,
    ocrMode, setOcrMode,
    originalMemberFileRef,
    staffFormData, setStaffFormData,
    workerFormData, setWorkerFormData,
    fileInputRef,
  }
}
