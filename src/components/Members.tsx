// Members.tsx - 员工管理页面

import React, { useState, useEffect, useRef, Suspense } from 'react'
import type { Member, MemberType, WorkerType, WorkerTeam, WorkerStatus } from '../types/electron'
import { recognizeIdCard, OCRProvider, getOCRConfig } from '../services/ocr'
import { useToastContext } from '../hooks/useToast'
import { Icon } from './ui/Icon'
import { processFileFields, guessFileExt, FILE_CATEGORIES } from '../services/fileService'

// 导入拆分后的组件
import {
  MemberForm,
  MemberDetail,
  StaffFormData,
  WorkerFormData,
  defaultStaffFormData,
  defaultWorkerFormData,
  memberToStaffForm,
  memberToWorkerForm
} from './features/members'
import StaffManagementTab from './features/members/StaffManagementTab'
import { useMemberOperations } from './features/members/useMemberOperations'
import { useTeamOps } from './features/members/useTeamOps'
import { useMemberPasteHandler } from './features/members/useMemberPasteHandler'

import { staffRoles, workerTypes } from './features/members'
import { useWorkerImport } from './features/members/useWorkerImport'

const WorkerSection = React.lazy(() => import('./features/members/WorkerSection'))
const WorkerImportModal = React.lazy(() => import('./features/members/WorkerImportModal').then(m => ({ default: m.WorkerImportModal })))
const WorkerPickerModal = React.lazy(() => import('./features/members/WorkerPickerModal').then(m => ({ default: m.WorkerPickerModal })))

// Types

interface MembersProps {
  refresh?: () => void
}

// Helper Functions

function getRoleIcon(role: string, memberType: MemberType) {
  if (memberType === 'worker') return '👷'
  const found = staffRoles.find(r => r.value === role)
  return found?.icon || '👤'
}

// Component

const Members: React.FC<MembersProps> = ({ refresh }) => {
  // 状态定义
  
  // Tab 状态
  const [activeTab, setActiveTab] = useState<'staff' | 'worker'>('staff')
  const [workerSubTab, setWorkerSubTab] = useState<'teams' | 'workers'>('teams')
  
  // 数据状态
  const [members, setMembers] = useState<Member[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [workerTeams, setWorkerTeams] = useState<WorkerTeam[]>([])
  const [loading, setLoading] = useState(true)
  
  // 模态框状态
  const [showStaffModal, setShowStaffModal] = useState(false)
  const [editingStaff, setEditingStaff] = useState<Member | null>(null)
  const [showWorkerModal, setShowWorkerModal] = useState(false)
  const [editingWorker, setEditingWorker] = useState<Member | null>(null)
  
  // 详情模态框
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)

  // WorkerPickerModal
  const [showWorkerPicker, setShowWorkerPicker] = useState(false)
  const [pickerProjectId, setPickerProjectId] = useState<number>(0)
  const [pickerExistingWorkerIds, setPickerExistingWorkerIds] = useState<Set<number>>(new Set())
  
  // 筛选状态
  const [filterProject, setFilterProject] = useState<number | null>(null)
  const [filterTeam, setFilterTeam] = useState<number | null>(null)
  const [filterStatus, setFilterStatus] = useState<WorkerStatus | 'all'>('all')

  // UI 状态
  const [ocrMode, setOcrMode] = useState<OCRProvider>('offline')
  const { showToast } = useToastContext()
  const originalMemberFileRef = useRef<Record<number, Record<string, string>>>({})
  
  // 表单数据
  const [staffFormData, setStaffFormData] = useState<StaffFormData>(defaultStaffFormData)
  const [workerFormData, setWorkerFormData] = useState<WorkerFormData>(defaultWorkerFormData)
  
  // 拖拽状态
  const [dragOverField, setDragOverField] = useState<string | null>(null)
  const [activeDropZone, setActiveDropZone] = useState<string | null>(null)

  // Excel导入状态
  const fileInputRef = useRef<HTMLInputElement>(null)
  const existingIdCards = new Set(
    members.filter(m => m.memberType === 'worker' && m.idCard).map(m => m.idCard!)
  )
  const {
    importState, progress, result, phase, error: importError,
    parseFile, switchSheet, setHeaderRow, setMapping, getConfidence,
    executeImport, saveCurrentMappingAsPreset, reset: resetImport,
  } = useWorkerImport(existingIdCards)

  // 工具函数
  
  const resetStaffForm = () => {
    setStaffFormData(defaultStaffFormData)
    setEditingStaff(null)
  }

  const resetWorkerForm = () => {
    setWorkerFormData(defaultWorkerFormData)
    setEditingWorker(null)
  }

  // 文件处理辅助函数（OCR 自动识别）
  const processFileForIdCard = async (file: File, field: 'idCardFront' | 'idCardBack', setFormData: React.Dispatch<React.SetStateAction<StaffFormData | WorkerFormData>>) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      const base64 = e.target?.result as string
      setFormData(prev => ({ ...prev, [field]: base64 }))
      setOcrMode(getOCRConfig().provider)
      if (ocrMode === 'offline' || ocrMode === 'baidu') {
        try {
          const result = await recognizeIdCard(base64)
          if ((result as any).success && (result as any).data) {
            const data = (result as any).data
            setFormData(prev => ({ ...prev, name: data.name || prev.name, gender: data.gender || prev.gender, ethnicity: data.ethnicity || prev.ethnicity, birthDate: data.birthDate || prev.birthDate, idCard: data.idCard || prev.idCard, idCardAddress: data.address || prev.idCardAddress, idCardFront: data.portraitBase64 || prev.idCardFront }))
            showToast('OCR 识别成功', 'success')
          }
        } catch (err) { console.error('OCR 识别失败:', err) }
      }
    }
    reader.readAsDataURL(file)
  }

  const processUploadFile = async (file: File, field: string, setFormData: React.Dispatch<React.SetStateAction<any>>) => {
    const reader = new FileReader()
    reader.onload = (e) => { setFormData(prev => ({ ...prev, [field]: e.target?.result as string, [`${field}Type`]: file.type === 'application/pdf' ? 'pdf' : 'image' })) }
    reader.readAsDataURL(file)
  }

  // WorkerPicker 批量添加处理器
  const handleBatchAddWorkers = async (entries: Partial<import('../types/electron').ProjectWorker>[]) => {
    try {
      const result = await window.electronAPI.batchCreateProjectWorkers(entries as any[])
      if (result.success) {
        showToast(`成功添加 ${entries.length} 名工人`, 'success')
        loadData()
      } else {
        showToast(result.error || '添加失败', 'error')
      }
    } catch (err: any) {
      showToast(err.message || '添加失败', 'error')
    }
  }

  // 数据加载

  const loadData = async () => {
    try {
      setLoading(true)
      const [membersRes, projectsRes, teamsRes] = await Promise.all([
        window.electronAPI.getMembers(),
        window.electronAPI.getProjects(),
        window.electronAPI.getWorkerTeams()
      ])

      if (membersRes.success) {
        const membersWithRelations = (membersRes.data || []).map((m: Member) => {
          if (m.memberType === 'worker' && m.teamId) {
            const team = (teamsRes.data || []).find((t: WorkerTeam) => t.id === m.teamId)
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
      }

      if (projectsRes.success) {
        setProjects(projectsRes.data || [])
      }

      if (teamsRes.success) {
        const teamsWithRelations = (teamsRes.data || []).map((t: WorkerTeam) => {
          const project = (projectsRes.data || []).find((p: any) => p.id === t.projectId)
          const leader = (membersRes.data || []).find((m: Member) => m.id === t.leaderId)
          return {
            ...t,
            projectName: project?.name,
            leaderName: leader?.name,
          }
        })
        setWorkerTeams(teamsWithRelations)
      }
    } catch (error) {
      console.error('加载数据失败:', error)
      showToast('加载数据失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    const config = getOCRConfig()
    setOcrMode(config.provider)
  }, [refresh])

  // 粘贴事件处理
  useMemberPasteHandler({
    visible: showWorkerModal || showStaffModal,
    type: showWorkerModal ? 'worker' : 'staff',
    staffFormData, workerFormData,
    setStaffFormData, setWorkerFormData,
    processIdCardFile: processFileForIdCard,
    processUploadFile: processUploadFile as any,
  })

  // CRUD + 生命周期 + 班组操作
  const { handleDeleteMember, handleFileModified, handleSubmitStaff, handleSubmitWorker, handleWorkerTransfer, handleWorkerLeave, handleWorkerReEntry, handleStaffStatusChange } = useMemberOperations({
    editingStaff, editingWorker, projects, originalMemberFileRef, loadData,
    showToast: (msg, type) => showToast(msg, type),
    onSuccess: () => { setShowStaffModal(false); setShowWorkerModal(false); resetStaffForm(); resetWorkerForm() }
  })

  const { handleCreateTeam, handleUpdateTeam, handleDeleteTeam } = useTeamOps({ workerTeams, loadData, showToast: (msg, type) => showToast(msg, type) })

  const handleMemberClick = (member: Member) => { setSelectedMember(member); setShowDetailModal(true) }

  const handleEditStaff = (staff: Member) => {
    setEditingStaff(staff)
    const formData = memberToStaffForm(staff)
    originalMemberFileRef.current[staff.id] = {}
    for (const key of ['idCardFront', 'idCardBack', 'contractFile']) {
      const val = (formData as any)[key]
      if (val && !val.startsWith('data:')) originalMemberFileRef.current[staff.id][key] = val
    }
    setShowStaffModal(true)
  }

  const handleEditWorker = (worker: Member) => {
    setEditingWorker(worker)
    const formData = memberToWorkerForm(worker)
    originalMemberFileRef.current[worker.id] = {}
    for (const key of ['idCardFront', 'idCardBack', 'contractFile', 'safetyTrainingFile', 'healthReportFile', 'specialCertificateFile']) {
      const val = (formData as any)[key]
      if (val && !val.startsWith('data:')) originalMemberFileRef.current[worker.id][key] = val
    }
    setShowWorkerModal(true)
  }

  // 数据过滤
  
  const staffMembers = members.filter(m => m.memberType !== 'worker' || !m.memberType)
  const workerMembers = members.filter(m => m.memberType === 'worker')

  const filteredStaff = staffMembers.filter(m => {
    const status = m.status || 'active'
    if (filterStatus !== 'all' && status !== filterStatus) return false
    return true
  })

  const filteredWorkers = workerMembers.filter(w => {
    if (filterProject && w.projectId !== filterProject) return false
    if (filterTeam && w.teamId !== filterTeam) return false
    const status = w.status || 'active'
    if (filterStatus !== 'all' && status !== filterStatus) return false
    return true
  })

  // WorkerSection props (cast to avoid strict type check on extra props)
  const workerSectionProps = {
    members: filteredWorkers,
    projects: projects.map(p => ({ id: p.id, name: p.name })),
    workerTeams,
    loading: false,
    onRefresh: loadData,
    onAddWorker: () => { resetWorkerForm(); setShowWorkerModal(true) },
    onEditWorker: handleEditWorker,
    onDeleteWorker: (id: number) => handleDeleteMember(id, members),
    onAddTeam: handleCreateTeam,
    onEditTeam: handleUpdateTeam,
    onDeleteTeam: handleDeleteTeam,
    onTransfer: (worker: any, toTeamId: number, toProjectId: number, transferDate: string, reason: string) => handleWorkerTransfer(worker, toTeamId, toProjectId, transferDate, reason, workerTeams),
    onLeave: (worker: any, actualLeaveDate: string, remarks: string) => handleWorkerLeave(worker, actualLeaveDate, remarks),
    onReEntry: handleWorkerReEntry,
    onImportClick: () => fileInputRef.current?.click(),
    onFileDrop: (file: File) => parseFile(file),
    onAddFromPool: (projectId: number, existingIds: Set<number>) => {
      setPickerProjectId(projectId)
      setPickerExistingWorkerIds(existingIds)
      setShowWorkerPicker(true)
    },
  }

  // 渲染
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto relative">
      {/* Toast 提示 */}
      
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">员工管理</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">管理公司员工与农民工信息</p>
        </div>
      </div>

      {/* 主 Tab */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm mb-6">
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('staff')}
            className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
              activeTab === 'staff'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
            }`}
          >
            <Icon name="UserCheck" size={16} /> 管理人员 ({staffMembers.length})
          </button>
          <button
            onClick={() => setActiveTab('worker')}
            className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
              activeTab === 'worker'
                ? 'text-orange-600 border-b-2 border-orange-600'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
            }`}
          >
            <Icon name="HardHat" size={16} /> 农民工 ({workerMembers.length})
          </button>
        </div>
      </div>

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
        <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-orange-500"></div></div>}>
          <WorkerSection {...workerSectionProps as any} />
        </Suspense>
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
          onSubmit={handleSubmitStaff}
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
          onSubmit={handleSubmitWorker}
          onFileModified={handleFileModified}
        />
      )}

      {/* 详情模态框 */}
      {showDetailModal && selectedMember && (
        <MemberDetail
          member={selectedMember}
          onClose={() => { setShowDetailModal(false); setSelectedMember(null) }}
          onEdit={(selectedMember.memberType === 'worker' ? handleEditWorker : handleEditStaff) as any}
          onDelete={handleDeleteMember as any}
        />
      )}
    </div>
  )
}

export default Members
