import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Icon } from './ui/Icon'
import { Partner, Supervisor, Project } from '../types/electron'
import { PartnerList, PartnerForm, SupervisorList, SupervisorForm } from './features/partners'
import { logCreate, logUpdate, logDelete } from '../utils/audit'
import { guessFileExt, readUploadedFile, deleteUploadedFile, uploadFile, FILE_CATEGORIES } from '../services/fileService'
import { useToastStore } from '@/store/toastStore'
import PageContainer from './ui/PageContainer'

interface PartnersProps {
  refresh?: () => void
}

// 单位类型：合作单位监管单位
type UnitType = 'partner' | 'supervisor'

const Partners: React.FC<PartnersProps> = ({ refresh }) => {
  const showToast = useToastStore(state => state.showToast)
  const [activeTab, setActiveTab] = useState<UnitType>('partner')
  const [partners, setPartners] = useState<Partner[]>([])
  const [supervisors, setSupervisors] = useState<Supervisor[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  
  const [showPartnerModal, setShowPartnerModal] = useState(false)
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null)
  const [partnerSearch, setPartnerSearch] = useState('')
  const [partnerFilterCategory, setPartnerFilterCategory] = useState<string>('')
  const [partnerFilterProject, setPartnerFilterProject] = useState<string>('')

  const [showSupervisorModal, setShowSupervisorModal] = useState(false)
  const [editingSupervisor, setEditingSupervisor] = useState<Supervisor | null>(null)
  const [supervisorSearch, setSupervisorSearch] = useState('')
  const [supervisorFilterCategory, setSupervisorFilterCategory] = useState<string>('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [partnersResult, supervisorsResult, projectsResult] = await Promise.all([
        window.electronAPI.getPartners(),
        window.electronAPI.getSupervisors(),
        window.electronAPI.getProjects()
      ])
      
      if (partnersResult.success && partnersResult.data) setPartners(partnersResult.data)
      if (supervisorsResult.success && supervisorsResult.data) {
        // 关联项目名称
        const supervisorsWithProjects = supervisorsResult.data.map((sup: Supervisor) => {
          const projectNames = sup.projectIds?.map((pid: number) => {
            const project = projectsResult.data?.find((p: Project) => p.id === pid)
            return project?.name || ''
          }).filter(Boolean).join(', ') || ''
          return { ...sup, projectNames }
        })
        setSupervisors(supervisorsWithProjects)
      }
      if (projectsResult.success && projectsResult.data) setProjects(projectsResult.data)
    } catch (error) {
      console.error('加载数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // ==================== 合作单位操作 ====================
  const handlePartnerSubmit = async (formData: any) => {
    try {
      // 处理文件字段
      let processed = { ...formData }

      // 解析合作单位关联的项目名
      const partnerProjectName = processed.projectIds?.length > 0
        ? projects.find(p => p.id === processed.projectIds[0])?.name || null
        : null

      // 处理 licenseFile
      if (processed.licenseFile && processed.licenseFile.startsWith('data:')) {
        const ext = guessFileExt(processed.licenseFile, processed.licenseFileType)
        const fileName = await uploadFile(
          FILE_CATEGORIES.PARTNER_LICENSE.category,
          FILE_CATEGORIES.PARTNER_LICENSE.subCategory,
          processed.licenseFile,
          `${processed.name || '单位'}_营业执照${ext}`,
          partnerProjectName,
        ).catch((err: any) => {
          showToast(err?.message || '营业执照文件上传失败', 'error')
          return ''
        })
        if (fileName) processed.licenseFile = fileName
      }

      // 处理 otherFiles（多个文件用 ||| 分隔）
      if (processed.otherFiles && typeof processed.otherFiles === 'string') {
        const parts = processed.otherFiles.split('|||')
        const newParts: string[] = []
        for (const part of parts) {
          if (part.startsWith('data:')) {
            const ext = guessFileExt(part, '')
            const fn = await uploadFile(
              FILE_CATEGORIES.PARTNER_ATTACHMENT.category,
              FILE_CATEGORIES.PARTNER_ATTACHMENT.subCategory,
              part,
              `${processed.name || '单位'}_附件${ext}`,
              partnerProjectName,
            ).catch((err: any) => {
              showToast(err?.message || '附件上传失败', 'error')
              return ''
            })
            newParts.push(fn || part)
          } else {
            newParts.push(part)
          }
        }
        processed.otherFiles = newParts.join('|||')
      }

      if (editingPartner) {
        await window.electronAPI.updatePartner({ ...editingPartner, ...processed })
        // 审计日志
        logUpdate('partners', processed.name, editingPartner.id, { before: editingPartner, after: processed })
      } else {
        const result = await window.electronAPI.createPartner(processed)
        if (result.success && result.data) {
          // 审计日志
          logCreate('partners', processed.name, result.data.id, processed)
        }
      }
      loadData()
      setShowPartnerModal(false)
      setEditingPartner(null)
      refresh?.()
      showToast(editingPartner ? '合作单位更新成功' : '合作单位创建成功', 'success')
    } catch (error: any) {
      console.error('保存失败:', error)
      showToast(error?.message || '保存失败', 'error')
    }
  }

  const handlePartnerEdit = async (partner: Partner) => {
    // 从磁盘加载文件用于编辑预览
    const loaded = { ...partner }
    const partnerProjName = loaded.projectIds?.length > 0
      ? projects.find(p => p.id === loaded.projectIds[0])?.name || null
      : null
    if (loaded.licenseFile && !loaded.licenseFile.startsWith('data:')) {
      const url = await readUploadedFile(FILE_CATEGORIES.PARTNER_LICENSE.category, FILE_CATEGORIES.PARTNER_LICENSE.subCategory, loaded.licenseFile, partnerProjName)
      if (url) loaded.licenseFile = url
    }
    setEditingPartner(loaded)
    setShowPartnerModal(true)
  }

  const handlePartnerDelete = async (id: number) => {
    if (confirm('确定要删除这个合作单位吗？')) {
      try {
        // 记录删除前的信息
        const partnerToDelete = partners.find(p => p.id === id)

        // 清理关联的磁盘文件
        if (partnerToDelete) {
          const delProjName = partnerToDelete.projectIds?.length > 0
            ? projects.find(p => p.id === partnerToDelete.projectIds[0])?.name || null
            : null
          await deleteUploadedFile(FILE_CATEGORIES.PARTNER_LICENSE.category, FILE_CATEGORIES.PARTNER_LICENSE.subCategory, partnerToDelete.licenseFile, delProjName)
          if (partnerToDelete.otherFiles) {
            const parts = partnerToDelete.otherFiles.split('|||')
            for (const part of parts) {
              if (part && !part.startsWith('data:')) {
                await deleteUploadedFile(FILE_CATEGORIES.PARTNER_ATTACHMENT.category, FILE_CATEGORIES.PARTNER_ATTACHMENT.subCategory, part, delProjName)
              }
            }
          }
        }

        await window.electronAPI.deletePartner(id)

        // 审计日志
        logDelete('partners', partnerToDelete?.name || '合作单位', id)

        loadData()
        refresh?.()
      } catch (error) {
        console.error('删除失败:', error)
      }
    }
  }

  // ==================== 监管单位操作 ====================
  const handleSupervisorSubmit = async (formData: any) => {
    try {
      if (editingSupervisor) {
        await window.electronAPI.updateSupervisor({ ...editingSupervisor, ...formData })
        // 审计日志
        logUpdate('partners', formData.name, editingSupervisor.id, { before: editingSupervisor, after: formData })
      } else {
        const result = await window.electronAPI.createSupervisor(formData)
        if (result.success && result.data) {
          // 审计日志
          logCreate('partners', formData.name, result.data.id, formData)
        }
      }
      loadData()
      setShowSupervisorModal(false)
      setEditingSupervisor(null)
      refresh?.()
    } catch (error) {
      console.error('保存失败:', error)
    }
  }

  const handleSupervisorEdit = (supervisor: Supervisor) => {
    setEditingSupervisor(supervisor)
    setShowSupervisorModal(true)
  }

  const handleSupervisorDelete = async (id: number) => {
    if (confirm('确定要删除这个监管单位吗？')) {
      try {
        // 记录删除前的信息
        const supervisorToDelete = supervisors.find(s => s.id === id)
        
        await window.electronAPI.deleteSupervisor(id)
        
        // 审计日志
        logDelete('partners', supervisorToDelete?.name || '监管单位', id)
        
        loadData()
        refresh?.()
      } catch (error) {
        console.error('删除失败:', error)
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 dark:border-slate-700 border-t-primary-600"></div>
          <span className="text-slate-500">加载中...</span>
        </div>
      </div>
    )
  }

  return (
    <PageContainer className="h-full flex flex-col">
      <motion.div className="h-full flex flex-col" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">单位管理</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">管理所有往来单位信息</p>
        </div>
        <button
          onClick={() => {
            if (activeTab === 'partner') {
              setEditingPartner(null)
              setShowPartnerModal(true)
            } else {
              setEditingSupervisor(null)
              setShowSupervisorModal(true)
            }
          }}
          className="btn btn-primary btn-sm"
        >
          <Icon name="Plus" size={14} /> 添加{activeTab === 'partner' ? '合作单位' : '监管单位'}
        </button>
      </div>

      {/* Spring-animated Tab Bar */}
      <div className="flex items-center gap-1 mb-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 rounded-2xl w-fit shadow-sm">
        {[
          { id: 'partner' as UnitType, label: '合作单位', icon: 'Building2' as const },
          { id: 'supervisor' as UnitType, label: '监管单位', icon: 'Shield' as const },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`relative px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === tab.id ? 'text-white' : 'text-slate-600 hover:text-slate-800'
            }`}>
            {activeTab === tab.id && (
              <motion.div layoutId="partner-tab" className="absolute inset-0 bg-primary-600 rounded-xl shadow-md"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
            )}
            <span className="relative z-10 flex items-center gap-1.5"><Icon name={tab.icon} size={14} />{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ==================== 合作单位内容 ==================== */}
      {activeTab === 'partner' && (
        <>
          <PartnerList
            partners={partners}
            projects={projects}
            search={partnerSearch}
            filterCategory={partnerFilterCategory}
            filterProject={partnerFilterProject}
            onSearchChange={setPartnerSearch}
            onCategoryChange={setPartnerFilterCategory}
            onProjectChange={setPartnerFilterProject}
            onEdit={handlePartnerEdit}
            onDelete={handlePartnerDelete}
          />

          {/* 合作单位模态框 */}
          {showPartnerModal && (
            <motion.div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
              <div className="modal-content max-h-[90vh] overflow-y-auto">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white">
                  <h2 className="text-xl font-semibold text-slate-800">
                    {editingPartner ? '编辑单位' : '添加单位'}
                  </h2>
                </div>
                <PartnerForm
                  partner={editingPartner}
                  projects={projects}
                  onSubmit={handlePartnerSubmit}
                  onCancel={() => {
                    setShowPartnerModal(false)
                    setEditingPartner(null)
                  }}
                />
              </div>
            </motion.div>
          )}
        </>
      )}

      {/* ==================== 监管单位内容 ==================== */}
      {activeTab === 'supervisor' && (
        <>
          <SupervisorList
            supervisors={supervisors}
            projects={projects}
            search={supervisorSearch}
            filterCategory={supervisorFilterCategory}
            onSearchChange={setSupervisorSearch}
            onCategoryChange={setSupervisorFilterCategory}
            onEdit={handleSupervisorEdit}
            onDelete={handleSupervisorDelete}
          />

          {/* 监管单位模态框 */}
          {showSupervisorModal && (
            <motion.div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
              <div className="modal-content max-h-[90vh] overflow-y-auto">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white">
                  <h2 className="text-xl font-semibold text-slate-800">
                    {editingSupervisor ? '编辑单位' : '添加单位'}
                  </h2>
                </div>
                <SupervisorForm
                  supervisor={editingSupervisor}
                  projects={projects}
                  onSubmit={handleSupervisorSubmit}
                  onCancel={() => {
                    setShowSupervisorModal(false)
                    setEditingSupervisor(null)
                  }}
                />
              </div>
            </motion.div>
          )}
        </>
      )}
          </motion.div>
    </PageContainer>
  )
}

export default Partners