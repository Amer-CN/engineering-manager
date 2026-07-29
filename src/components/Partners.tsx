import React, { useState, useEffect } from 'react'
import { Icon } from './ui/Icon'
import { Drawer } from './ui/Drawer'
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
      <div className="flex items-center justify-between mb-5 pb-4 border-b border-[color:var(--border)] shrink-0">
        <div>
          <h1 className="text-base font-semibold tracking-tight text-[color:var(--fg)]">单位管理</h1>
          <p className="text-[color:var(--muted)] mt-1">管理所有往来单位信息</p>
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
          
         variant="primary" size="sm">
          <Icon name="Plus" size={14} /> 添加{activeTab === 'partner' ? '合作单位' : '监管单位'}
        </Button>
      </div>

      {/* S21 Stitch: pill-toggle (合作单位/监管单位) */}
      <div className="flex items-center gap-3 mb-5 shrink-0">
        <div className="flex items-center gap-1 p-1 rounded-full" style={{ background: 'var(--panel-2)' }}>
          <button
            onClick={() => setActiveTab('partner')}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === 'partner' ? 'bg-[color:var(--accent)] text-[color:var(--on-accent)] shadow-sm' : 'text-[color:var(--fg-2)]'
            }`}
          >
            合作单位
          </button>
          <button
            onClick={() => setActiveTab('supervisor')}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === 'supervisor' ? 'bg-[color:var(--accent)] text-[color:var(--on-accent)] shadow-sm' : 'text-[color:var(--fg-2)]'
            }`}
          >
            监管单位
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        {activeTab === 'partner' && (
          <>
            <PartnerList
              partners={partners}
              projects={projects}
              onEdit={handlePartnerEdit}
              onDelete={handlePartnerDelete}
            />
            {showPartnerModal && (
              <Drawer open onClose={() => { setShowPartnerModal(false); setEditingPartner(null) }}
                icon="Building2" title={editingPartner ? '编辑单位' : '添加单位'} width={560}>
                <PartnerForm
                  partner={editingPartner}
                  projects={projects}
                  onSubmit={(data) => handlePartnerSubmit(data, editingPartner)}
                  onCancel={() => {
                    setShowPartnerModal(false)
                    setEditingPartner(null)
                  }}
                />
              </Drawer>
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
              <Drawer open onClose={() => { setShowSupervisorModal(false); setEditingSupervisor(null) }}
                icon="ShieldCheck" title={editingSupervisor ? '编辑单位' : '添加单位'} width={560}>
                <SupervisorForm
                  supervisor={editingSupervisor}
                  projects={projects}
                  onSubmit={(data) => handleSupervisorSubmit(data, editingSupervisor)}
                  onCancel={() => {
                    setShowSupervisorModal(false)
                    setEditingSupervisor(null)
                  }}
                />
              </Drawer>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default Partners
