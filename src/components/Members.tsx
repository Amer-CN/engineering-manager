// Members.tsx - 员工管理页面

import React, { useState, useEffect, useRef } from 'react'
import type { Member, MemberType, WorkerType, WorkerTeam, WorkerStatus } from '../types/electron'
import { recognizeIdCard, OCRProvider, getOCRConfig } from '../services/ocr'
import { logCreate, logUpdate, logDelete } from '../utils/audit'
import { useToastContext } from '../hooks/useToast'
import { Icon } from './ui/Icon'
import { processFileFields, guessFileExt, FILE_CATEGORIES, readUploadedFile } from '../services/fileService'

// 导入拆分后的组件
import {
  MemberForm,
  WorkerSection,
  MemberDetail,
  StaffFormData,
  WorkerFormData,
  defaultStaffFormData,
  defaultWorkerFormData,
  memberToStaffForm,
  memberToWorkerForm
} from './features/members'
import StaffManagementTab from './features/members/StaffManagementTab'

// 常量（从 features/members 导入，避免重复定义）

import { staffRoles, workerTypes } from './features/members'

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

  // 工具函数
  
  const resetStaffForm = () => {
    setStaffFormData(defaultStaffFormData)
    setEditingStaff(null)
  }

  const resetWorkerForm = () => {
    setWorkerFormData(defaultWorkerFormData)
    setEditingWorker(null)
  }

  // 文件处理辅助函数
  const processFileForIdCard = async (
    file: File,
    field: 'idCardFront' | 'idCardBack',
    setFormData: React.Dispatch<React.SetStateAction<StaffFormData | WorkerFormData>>
  ) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      const base64 = e.target?.result as string
      setFormData(prev => ({ ...prev, [field]: base64 }))
      
      // 自动 OCR 识别
      setOcrMode(getOCRConfig().provider)
      if (ocrMode === 'offline' || ocrMode === 'baidu') {
        try {
          const result = await recognizeIdCard(base64)
          if ((result as any).success && (result as any).data) {
            const data = (result as any).data
            setFormData(prev => ({
              ...prev,
              name: data.name || prev.name,
              gender: data.gender || prev.gender,
              ethnicity: data.ethnicity || prev.ethnicity,
              birthDate: data.birthDate || prev.birthDate,
              idCard: data.idCard || prev.idCard,
              idCardAddress: data.address || prev.idCardAddress,
              idCardFront: data.portraitBase64 || prev.idCardFront,
            }))
            showToast('OCR 识别成功', 'success')
          }
        } catch (err) {
          console.error('OCR 识别失败:', err)
        }
      }
    }
    reader.readAsDataURL(file)
  }

  const processFileForUpload = (file: File, field: string, setFormData: React.Dispatch<React.SetStateAction<any>>) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const base64 = e.target?.result as string
      const isPdf = file.type === 'application/pdf'
      setFormData(prev => ({ 
        ...prev, 
        [field]: base64,
        [`${field}Type`]: isPdf ? 'pdf' : 'image'
      }))
    }
    reader.readAsDataURL(file)
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
  useEffect(() => {
    if (!showWorkerModal && !showStaffModal) return

    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) {
            if (showWorkerModal) {
              if (!workerFormData.idCardFront) {
                processFileForIdCard(file, 'idCardFront', setWorkerFormData)
              } else if (!workerFormData.idCardBack) {
                processFileForIdCard(file, 'idCardBack', setWorkerFormData)
              }
            } else if (showStaffModal) {
              if (!staffFormData.idCardFront) {
                processFileForIdCard(file, 'idCardFront', setStaffFormData)
              } else if (!staffFormData.idCardBack) {
                processFileForIdCard(file, 'idCardBack', setStaffFormData)
              }
            }
            e.preventDefault()
            return
          }
        }

        if (item.type === 'application/pdf') {
          const file = item.getAsFile()
          if (file) {
            if (showWorkerModal && !workerFormData.contractFile) {
              processFileForUpload(file, 'contractFile', setWorkerFormData)
            } else if (showStaffModal && !staffFormData.contractFile) {
              processFileForUpload(file, 'contractFile', setStaffFormData)
            }
            e.preventDefault()
            return
          }
        }
      }
    }

    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [showWorkerModal, showStaffModal, workerFormData, staffFormData])

  // 事件处理
  
  // 成员操作
  const handleDeleteMember = async (id: number) => {
    if (!confirm('确定要删除该成员吗？')) return
    try {
      // 记录删除前的信息用于日志
      const memberToDelete = members.find(m => m.id === id)
      
      const result = await window.electronAPI.deleteMember(id)
      if (result.success) {
        // 审计日志
        logDelete('members', memberToDelete?.name || '员工', id, { memberType: memberToDelete?.memberType })
        loadData()
        showToast('删除成功', 'success')
      } else {
        showToast(result.error || '删除失败', 'error')
      }
    } catch (error) {
      console.error('删除失败:', error)
      showToast('删除失败', 'error')
    }
  }

  const handleMemberClick = (member: Member) => {
    setSelectedMember(member)
    setShowDetailModal(true)
  }

  // 文件被修改时清除原始文件引用（避免 restore 逻辑覆盖新文件）
  const handleFileModified = (field: string) => {
    if (editingStaff) {
      const ref = originalMemberFileRef.current[editingStaff.id]
      if (ref) delete ref[field]
    }
    if (editingWorker) {
      const ref = originalMemberFileRef.current[editingWorker.id]
      if (ref) delete ref[field]
    }
  }

  // 管理人员表单
  const handleEditStaff = (staff: Member) => {
    setEditingStaff(staff)
    // 记录原始文件名，用于提交时恢复未改动的文件字段
    const formData = memberToStaffForm(staff)
    originalMemberFileRef.current[staff.id] = {}
    for (const key of ['idCardFront', 'idCardBack', 'contractFile']) {
      const val = (formData as any)[key]
      if (val && !val.startsWith('data:')) {
        originalMemberFileRef.current[staff.id][key] = val
      }
    }
    setShowStaffModal(true)
  }

  const handleSubmitStaff = async (data: StaffFormData) => {
    try {
      // 如果是编辑，恢复未改动的文件字段（避免把预览 data URL 重复上传）
      let submitFileData = data
      if (editingStaff) {
        const orig = originalMemberFileRef.current[editingStaff.id] || {}
        const restored: any = { ...data }
        let hasRestore = false
        for (const key of ['idCardFront', 'idCardBack', 'contractFile']) {
          if (typeof restored[key] === 'string' && restored[key].startsWith('data:') && orig[key]) {
            restored[key] = orig[key]
            hasRestore = true
          }
        }
        if (hasRestore) submitFileData = restored
      }
      // 处理文件字段：将 data URL 上传为磁盘文件
      const processed = await processFileFields(submitFileData, [
        { field: 'idCardFront', ...FILE_CATEGORIES.MEMBER_ID_CARD, getFileName: () => `${data.name || '员工'}_身份证人像${guessFileExt(data.idCardFront)}` },
        { field: 'idCardBack', ...FILE_CATEGORIES.MEMBER_ID_CARD, getFileName: () => `${data.name || '员工'}_身份证国徽${guessFileExt(data.idCardBack)}` },
        { field: 'contractFile', ...FILE_CATEGORIES.MEMBER_CONTRACT, getFileName: () => `${data.name || '员工'}_劳动合同${guessFileExt(data.contractFile, data.contractFileType)}` },
      ], null)

      const submitData = {
        ...processed,
        memberType: 'staff' as MemberType
      }

      // 清理空字符串
      Object.keys(submitData).forEach(key => {
        if (typeof submitData[key as keyof typeof submitData] === 'string' &&
            submitData[key as keyof typeof submitData] === '') {
          (submitData as any)[key] = undefined
        }
      })

      if (editingStaff) {
        const result = await window.electronAPI.updateMember({ ...editingStaff, ...submitData })
        if (result.success) {
          // 审计日志
          logUpdate('members', submitData.name, editingStaff.id, { before: editingStaff, after: submitData })
        }
      } else {
        const result = await window.electronAPI.createMember(submitData)
        if (result.success && result.data) {
          // 审计日志
          logCreate('members', submitData.name, result.data.id, submitData)
        }
      }
      loadData()
      setShowStaffModal(false)
      resetStaffForm()
      showToast(editingStaff ? '更新成功' : '创建成功', 'success')
    } catch (error: any) {
      console.error('保存失败:', error)
      showToast(error?.message || '保存失败', 'error')
    }
  }

  // 农民工表单
  const handleEditWorker = (worker: Member) => {
    setEditingWorker(worker)
    // 记录原始文件名，用于提交时恢复未改动的文件字段
    const formData = memberToWorkerForm(worker)
    originalMemberFileRef.current[worker.id] = {}
    for (const key of ['idCardFront', 'idCardBack', 'contractFile', 'safetyTrainingFile', 'healthReportFile', 'specialCertificateFile']) {
      const val = (formData as any)[key]
      if (val && !val.startsWith('data:')) {
        originalMemberFileRef.current[worker.id][key] = val
      }
    }
    setShowWorkerModal(true)
  }

  const handleSubmitWorker = async (data: WorkerFormData) => {
    try {
      // 如果是编辑，恢复未改动的文件字段
      let submitFileData = data
      if (editingWorker) {
        const orig = originalMemberFileRef.current[editingWorker.id] || {}
        const restored: any = { ...data }
        let hasRestore = false
        for (const key of ['idCardFront', 'idCardBack', 'contractFile', 'safetyTrainingFile', 'healthReportFile', 'specialCertificateFile']) {
          if (typeof restored[key] === 'string' && restored[key].startsWith('data:') && orig[key]) {
            restored[key] = orig[key]
            hasRestore = true
          }
        }
        if (hasRestore) submitFileData = restored
      }
      // 处理文件字段：将 data URL 上传为磁盘文件
      const workerProjectName = data.projectId ? projects.find(p => p.id === data.projectId)?.name : null
      const processed = await processFileFields(submitFileData, [
        { field: 'idCardFront', ...FILE_CATEGORIES.MEMBER_ID_CARD, getFileName: () => `${data.name || '工人'}_身份证人像${guessFileExt(data.idCardFront)}` },
        { field: 'idCardBack', ...FILE_CATEGORIES.MEMBER_ID_CARD, getFileName: () => `${data.name || '工人'}_身份证国徽${guessFileExt(data.idCardBack)}` },
        { field: 'contractFile', ...FILE_CATEGORIES.MEMBER_CONTRACT, getFileName: () => `${data.name || '工人'}_劳动合同${guessFileExt(data.contractFile, data.contractFileType)}` },
        { field: 'safetyTrainingFile', ...FILE_CATEGORIES.MEMBER_TRAINING, getFileName: () => `${data.name || '工人'}_安全培训${guessFileExt(data.safetyTrainingFile || '')}` },
        { field: 'healthReportFile', ...FILE_CATEGORIES.MEMBER_HEALTH, getFileName: () => `${data.name || '工人'}_健康报告${guessFileExt(data.healthReportFile || '')}` },
        { field: 'specialCertificateFile', ...FILE_CATEGORIES.MEMBER_CERTIFICATE, getFileName: () => `${data.name || '工人'}_特种证${guessFileExt(data.specialCertificateFile || '')}` },
      ], workerProjectName)

      const submitData = {
        ...processed,
        memberType: 'worker' as MemberType,
        status: 'active' as WorkerStatus
      }

      Object.keys(submitData).forEach(key => {
        if (typeof submitData[key as keyof typeof submitData] === 'string' &&
            submitData[key as keyof typeof submitData] === '') {
          (submitData as any)[key] = undefined
        }
      })

      if (editingWorker) {
        const result = await window.electronAPI.updateMember({ ...editingWorker, ...submitData })
        if (result.success) {
          // 审计日志
          logUpdate('members', submitData.name, editingWorker.id, { before: editingWorker, after: submitData })
        }
      } else {
        const result = await window.electronAPI.createMember(submitData)
        if (result.success && result.data) {
          // 审计日志
          logCreate('members', submitData.name, result.data.id, submitData)
        }
      }
      loadData()
      setShowWorkerModal(false)
      resetWorkerForm()
      showToast(editingWorker ? '更新成功' : '创建成功', 'success')
    } catch (error: any) {
      console.error('保存失败:', error)
      showToast(error?.message || '保存失败', 'error')
    }
  }

  // 农民工操作（调组、离场、重新入场）
  const handleWorkerTransfer = async (worker: Member, toTeamId: number, toProjectId: number, transferDate: string, reason: string) => {
    try {
      const toTeam = workerTeams.find(t => t.id === toTeamId)
      if (!toTeam) {
        showToast('找不到目标班组', 'error')
        return
      }

      await (window.electronAPI as any).createWorkerTransfer({
        workerId: worker.id,
        fromTeamId: worker.teamId,
        toTeamId,
        fromProjectId: worker.projectId,
        toProjectId,
        transferDate,
        reason
      })

      await window.electronAPI.updateMember({
        ...worker,
        teamId: toTeamId,
        projectId: toProjectId,
        status: 'active'
      })

      // 审计日志
      logUpdate('members', worker.name, worker.id, {
        action: 'transfer',
        toTeam: toTeam.name,
        reason
      })

      loadData()
      showToast('调组成功', 'success')
    } catch (error) {
      console.error('调组失败:', error)
      showToast('调组失败', 'error')
    }
  }

  const handleWorkerLeave = async (worker: Member, actualLeaveDate: string, remarks: string) => {
    try {
      await window.electronAPI.updateMember({
        ...worker,
        status: 'left',
        actualLeaveDate,
        remarks
      })

      // 审计日志
      logUpdate('members', worker.name, worker.id, {
        action: 'leave',
        leaveDate: actualLeaveDate,
        remarks
      })

      loadData()
      showToast('工人已离场', 'success')
    } catch (error) {
      console.error('离场失败:', error)
      showToast('离场失败', 'error')
    }
  }

  const handleWorkerReEntry = async (worker: Member, teamId: number, projectId: number) => {
    try {
      await window.electronAPI.updateMember({
        ...worker,
        teamId,
        projectId,
        status: 'active',
        entryDate: new Date().toISOString().split('T')[0],
        actualLeaveDate: undefined
      })

      // 审计日志
      logUpdate('members', worker.name, worker.id, { action: 'reentry' })

      loadData()
      showToast('工人已重新入场', 'success')
    } catch (error) {
      console.error('重新入场失败:', error)
      showToast('重新入场失败', 'error')
    }
  }

  // 管理人员状态下拉直接切换
  const handleStaffStatusChange = async (staff: Member, newStatus: string) => {
    try {
      if (newStatus === 'left') {
        const today = new Date().toISOString().split('T')[0]
        await window.electronAPI.updateMember({
          ...staff,
          status: 'left',
          actualLeaveDate: today
        })
        logUpdate('members', staff.name, staff.id, { action: 'leave', leaveDate: today })
        showToast(`${staff.name} 已离职`, 'success')
      } else {
        await window.electronAPI.updateMember({
          ...staff,
          status: 'active',
          actualLeaveDate: undefined,
          remarks: undefined
        })
        logUpdate('members', staff.name, staff.id, { action: 'reentry' })
        showToast(`${staff.name} 已恢复在职`, 'success')
      }
      loadData()
    } catch (error) {
      console.error('状态更新失败:', error)
      showToast('状态更新失败', 'error')
    }
  }

  // 班组操作
  const handleCreateTeam = async (name: string, projectId: number, leaderId?: number | null) => {
    try {
      const result = await window.electronAPI.createWorkerTeam({ name, projectId, leaderId } as WorkerTeam)
      if (result.success && result.data) {
        // 审计日志
        logCreate('members', `班组: ${name}`, result.data.id, { projectId, leaderId })
      }
      loadData()
      showToast('班组创建成功', 'success')
    } catch (error: any) {
      showToast(error.message || '班组创建失败', 'error')
    }
  }

  const handleUpdateTeam = async (team: WorkerTeam) => {
    try {
      await window.electronAPI.updateWorkerTeam(team)
      // 审计日志
      logUpdate('members', `班组: ${team.name}`, team.id)
      loadData()
      showToast('班组更新成功', 'success')
    } catch (error: any) {
      showToast(error.message || '班组更新失败', 'error')
    }
  }

  const handleDeleteTeam = async (id: number) => {
    try {
      // 记录删除前的信息
      const teamToDelete = workerTeams.find(t => t.id === id)
      
      const result = await window.electronAPI.deleteWorkerTeam(id)
      if (!result.success) {
        showToast(result.error || '删除失败', 'error')
        return
      }
      
      // 审计日志
      logDelete('members', teamToDelete?.name ? `班组: ${teamToDelete.name}` : '班组', id)
      
      loadData()
      showToast('班组删除成功', 'success')
    } catch (error: any) {
      showToast(error.message || '班组删除失败', 'error')
    }
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
          onDelete={handleDeleteMember}
          onClick={handleMemberClick}
          onStatusChange={handleStaffStatusChange}
        />
      )}

      {/* 农民工 Tab - 使用 WorkerSection 组件 */}
      {activeTab === 'worker' && (
        <WorkerSection
          members={filteredWorkers}
          projects={projects.map(p => ({ id: p.id, name: p.name }))}
          workerTeams={workerTeams}
          loading={false}
          onRefresh={loadData}
          onAddWorker={() => { resetWorkerForm(); setShowWorkerModal(true) }}
          onEditWorker={handleEditWorker}
          onDeleteWorker={handleDeleteMember}
          onAddTeam={handleCreateTeam}
          onEditTeam={handleUpdateTeam}
          onDeleteTeam={handleDeleteTeam}
          onTransfer={(worker) => handleWorkerTransfer(worker, worker.teamId || 0, worker.projectId || 0, new Date().toISOString().split('T')[0], '')}
          onLeave={handleWorkerLeave as any}
          onReEntry={handleWorkerReEntry as any}
        />
      )}

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
