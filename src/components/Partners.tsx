import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Icon } from './ui/Icon'
import { Tabs } from './ui/Tabs'
import { HoverScrollbar } from './ui/HoverScrollbar'
import Spinner from './ui/Spinner'
import { Partner, Supervisor, Project } from '../types/electron'
import { PartnerList, PartnerForm, SupervisorList, SupervisorForm } from './features/partners'
import { logCreate, logUpdate, logDelete } from '../utils/audit'
import { guessFileExt, readUploadedFile, deleteUploadedFile, uploadFile, FILE_CATEGORIES } from '../services/fileService'
import { useToastStore } from '@/store/toastStore'
import { useConfirm } from '@/hooks/useConfirm'
import { getAPI } from '@/services/api-adapter'

interface PartnersProps {
  refresh?: () => void
}

// 单位类型：合作单位监管单位
type UnitType = 'partner' | 'supervisor'

const Partners: React.FC<PartnersProps> = ({ refresh }) => {
  const showToast = useToastStore(state => state.showToast)
  const { confirm, ConfirmDialog } = useConfirm()
  const [activeTab, setActiveTab] = useState<UnitType>('partner')
  const [partners, setPartners] = useState<Partner[]>([])
  const [supervisors, setSupervisors] = useState<Supervisor[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  
  const [showPartnerModal, setShowPartnerModal] = useState(false)
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null)

  const [showSupervisorModal, setShowSupervisorModal] = useState(false)
  const [editingSupervisor, setEditingSupervisor] = useState<Supervisor | null>(null)
  const [supervisorSearch, setSupervisorSearch] = useState('')
  const [supervisorFilterCategory, setSupervisorFilterCategory] = useState<string>('')

  useEffect(() => {
  loadData()
  }, [])

  const loadData = async () => {
  try {
  const api = await getAPI()
  const [r0, r1, r2] = await Promise.allSettled([
  api.getPartners(),
  api.getSupervisors(),
  api.getProjects()
  ])
  const get = (r: PromiseSettledResult<any>) => r.status === 'fulfilled' && r.value?.success ? r.value.data || [] : []
  const normalizeProjectIds = (item: any) => {
  if (typeof item.projectIds === 'string') {
  try { item.projectIds = JSON.parse(item.projectIds) } catch { item.projectIds = [] }
  }
  return item
  }
  const partnersData = (get(r0) || []).map(normalizeProjectIds)
  const supervisorsData = (get(r1) || []).map(normalizeProjectIds)
  const projectsData = get(r2)
  setPartners(partnersData)
  // 关联项目名称
  const supervisorsWithProjects = supervisorsData.map((sup: Supervisor) => {
  const projectNames = sup.projectIds?.map((pid: number) => {
  const project = projectsData.find((p: Project) => p.id === pid)
  return project?.name || ''
  }).filter(Boolean).join(', ') || ''
  return { ...sup, projectNames }
  })
  setSupervisors(supervisorsWithProjects)
  setProjects(projectsData)
  } catch (error) {
  console.error('加载数据失败:', error)
  } finally {
  setLoading(false)
  }
  }

  // ==================== 合作单位操作 ====================
  const handlePartnerSubmit = async (formData: any) => {
  console.log('[PartnerSubmit] called, name:', formData.name)
  try {
  // 处理文件字段
  let processed = { ...formData }

  // projectIds 数组转 JSON 字符串（后端期望字符串）
  if (Array.isArray(processed.projectIds)) {
    processed.projectIds = JSON.stringify(processed.projectIds)
  }

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
  try { showToast(err?.message || '营业执照文件上传失败', 'error') } catch {}
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
  try { showToast(err?.message || '附件上传失败', 'error') } catch {}
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
  await (await getAPI()).updatePartner({ ...editingPartner, ...processed })
  // 审计日志
  logUpdate('partners', processed.name, editingPartner.id, { before: editingPartner, after: processed })
  } else {
  console.log('[PartnerSubmit] creating partner with data:', JSON.stringify(processed).substring(0, 200))
  const result = await (await getAPI()).createPartner(processed)
  console.log('[PartnerSubmit] result:', JSON.stringify(result))
  if (result.success && result.data) {
  // 审计日志
  logCreate('partners', processed.name, result.data.id, processed)
  }
  }
  console.log('[PartnerSubmit] loadData...')
  loadData()
  setShowPartnerModal(false)
  setEditingPartner(null)
  refresh?.()
  try { showToast(editingPartner ? '合作单位更新成功' : '合作单位创建成功', 'success') } catch {}
  } catch (error: any) {
  console.error('保存失败:', error)
  try { showToast(error?.message || '保存失败', 'error') } catch {}
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
  const ok = await confirm({ title: '确认删除', content: '确定要删除这个合作单位吗？', confirmVariant: 'danger' })
  if (!ok) return
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

  await (await getAPI()).deletePartner(id)

  // 审计日志
  logDelete('partners', partnerToDelete?.name || '合作单位', id)

  loadData()
  refresh?.()
  } catch (error) {
  console.error('删除失败:', error)
  }
  }

  // ==================== 监管单位操作 ====================
  const handleSupervisorSubmit = async (formData: any) => {
  try {
  if (editingSupervisor) {
  await (await getAPI()).updateSupervisor({ ...editingSupervisor, ...formData })
  // 审计日志
  logUpdate('partners', formData.name, editingSupervisor.id, { before: editingSupervisor, after: formData })
  } else {
  const result = await (await getAPI()).createSupervisor(formData)
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
  const ok = await confirm({ title: '确认删除', content: '确定要删除这个监管单位吗？', confirmVariant: 'danger' })
  if (!ok) return
  try {
  // 记录删除前的信息
  const supervisorToDelete = supervisors.find(s => s.id === id)

  await (await getAPI()).deleteSupervisor(id)

  // 审计日志
  logDelete('partners', supervisorToDelete?.name || '监管单位', id)

  loadData()
  refresh?.()
  } catch (error) {
  console.error('删除失败:', error)
  }
  }

  if (loading) {
  return <Spinner size="lg" text="加载单位数据..." />
  }

  return (
  <div className="h-[calc(100vh-60px)] flex flex-col overflow-hidden p-6">
  {ConfirmDialog}
  {/* 页面标题 - 固定高度 */}
  <div className="flex items-center justify-between mb-5 shrink-0">
  <div>
  <h1 className="text-2xl font-bold text-slate-800">单位管理</h1>
  <p className="text-slate-500 mt-1">管理所有往来单位信息</p>
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

  {/* 统一 Tabs 组件 - 填满剩余空间 */}
  <Tabs
  value={activeTab}
  onChange={(value: string) => setActiveTab(value as UnitType)}
  tabs={[
  { key: 'partner', label: '合作单位', icon: 'Building2' },
  { key: 'supervisor', label: '监管单位', icon: 'Shield' },
  ]}
  animated={true}
  className="flex-1 flex flex-col min-h-0"
  contentClassName="flex-1 flex flex-col min-h-0"
  >
  {activeTab === 'partner' && (
  <>
  <PartnerList
  partners={partners}
  projects={projects}
  onEdit={handlePartnerEdit}
  onDelete={handlePartnerDelete}
  />
  {showPartnerModal && (
  <motion.div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
  <div className="modal-content flex flex-col" style={{ height: 'min(90vh, 800px)' }}>
  <div className="px-6 py-4 border-b border-slate-200 bg-white shrink-0 flex items-center justify-between">
  <h2 className="text-xl font-semibold text-slate-800">
  {editingPartner ? '编辑单位' : '添加单位'}
  </h2>
  <button type="button" onClick={() => { setShowPartnerModal(false); setEditingPartner(null) }} className="text-slate-400 hover:text-slate-600 p-1">
  <Icon name="X" size={20} />
  </button>
  </div>
  <div className="flex-1 min-h-0 overflow-hidden">
  <HoverScrollbar className="h-full">
  <PartnerForm
  partner={editingPartner}
  projects={projects}
  onSubmit={handlePartnerSubmit}
  onCancel={() => {
  setShowPartnerModal(false)
  setEditingPartner(null)
  }}
  />
  </HoverScrollbar>
  </div>
  </div>
  </motion.div>
  )}
  </>
  )}
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
  {showSupervisorModal && (
  <motion.div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
  <div className="modal-content flex flex-col" style={{ height: 'min(90vh, 800px)' }}>
  <div className="px-6 py-4 border-b border-slate-200 bg-white shrink-0 flex items-center justify-between">
  <h2 className="text-xl font-semibold text-slate-800">
  {editingSupervisor ? '编辑单位' : '添加单位'}
  </h2>
  <button type="button" onClick={() => { setShowSupervisorModal(false); setEditingSupervisor(null) }} className="text-slate-400 hover:text-slate-600 p-1">
  <Icon name="X" size={20} />
  </button>
  </div>
  <div className="flex-1 min-h-0 overflow-hidden">
  <HoverScrollbar className="h-full">
  <SupervisorForm
  supervisor={editingSupervisor}
  projects={projects}
  onSubmit={handleSupervisorSubmit}
  onCancel={() => {
  setShowSupervisorModal(false)
  setEditingSupervisor(null)
  }}
  />
  </HoverScrollbar>
  </div>
  </div>
  </motion.div>
  )}
  </>
  )}
  </Tabs>
  </div>
  )
}

export default Partners