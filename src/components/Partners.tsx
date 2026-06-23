import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Icon } from './ui/Icon'
import { Tabs } from './ui/Tabs'
import { HoverScrollbar } from './ui/HoverScrollbar'
import Spinner from './ui/Spinner'
import { Partner, Supervisor, Project } from '../types/electron'
import { PartnerList, PartnerForm, SupervisorList, SupervisorForm } from './features/partners'
import { readUploadedFile, FILE_CATEGORIES } from '../services/fileService'
import { usePartnerActions } from './features/partners/usePartnerActions'
import { getAPI } from '@/services/api-adapter'
import { Button } from './ui/Button'

interface PartnersProps {
  refresh?: () => void
}

type UnitType = 'partner' | 'supervisor'

const Partners: React.FC<PartnersProps> = ({ refresh }) => {
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

  const { handlePartnerSubmit, handlePartnerDelete, handleSupervisorSubmit, handleSupervisorDelete } = usePartnerActions({
    partners, supervisors, projects, loadData, refresh,
  })

  const handlePartnerEdit = async (partner: Partner) => {
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

  const handleSupervisorEdit = (supervisor: Supervisor) => {
    setEditingSupervisor(supervisor)
    setShowSupervisorModal(true)
  }

  if (loading) {
    return <Spinner size="lg" text="加载单位数据..." />
  }

  return (
    <div className="h-[calc(100vh-60px)] flex flex-col overflow-hidden p-6">
      {/* 页面标题 - 固定高度 */}
      <div className="flex items-center justify-between mb-5 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">单位管理</h1>
          <p className="text-slate-500 mt-1">管理所有往来单位信息</p>
        </div>
        <Button
          onClick={() => {
            if (activeTab === 'partner') {
              setEditingPartner(null)
              setShowPartnerModal(true)
            } else {
              setEditingSupervisor(null)
              setShowSupervisorModal(true)
            }
          }}
          
         variant="primary" size="sm" className="btn">
          <Icon name="Plus" size={14} /> 添加{activeTab === 'partner' ? '合作单位' : '监管单位'}
        </Button>
      </div>

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
                        onSubmit={(data) => handlePartnerSubmit(data, editingPartner)}
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
                        onSubmit={(data) => handleSupervisorSubmit(data, editingSupervisor)}
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
