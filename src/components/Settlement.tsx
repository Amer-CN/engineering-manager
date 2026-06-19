/**
 * Settlement.tsx - 结算办理页面（看板+项目详情）
 */
import React, { useState, useEffect, useCallback } from 'react'
import type { Settlement as SettlementData, Project, Partner } from '../types/electron'
import PageHeader from './ui/PageHeader'
import { Spinner } from './ui/Loading/Loading'
import { SettlementDashboard, SettlementProjectDetail } from './features/settlement'
import { getAPI } from '@/services/api-adapter'

type ViewMode = 'dashboard' | 'detail'

const Settlement: React.FC<{ refresh?: () => void }> = ({ refresh }) => {
  const [settlements, setSettlements] = useState<SettlementData[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<ViewMode>('dashboard')
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const api = await getAPI()
      const [settlementsResult, projectsResult, partnersResult] = await Promise.allSettled([
        api.getSettlements(),
        api.getProjects(),
        api.getPartners(),
      ])
      const get = (r: PromiseSettledResult<any>) => r.status === 'fulfilled' && r.value?.success ? r.value.data || [] : []
      setSettlements(get(settlementsResult))
      setProjects(get(projectsResult))
      setPartners(get(partnersResult))
    } catch (error) {
      console.error('加载数据失败:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleProjectClick = (project: Project) => {
    setSelectedProject(project)
    setView('detail')
  }

  const handleBack = () => {
    setView('dashboard')
    setSelectedProject(null)
    loadData()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" />
      </div>
    )
  }

  // 项目详情视图
  if (view === 'detail' && selectedProject) {
    const projectSettlements = settlements.filter(s => s.projectId === selectedProject.id)
    return (
      <SettlementProjectDetail
        project={selectedProject}
        settlements={projectSettlements}
        partners={partners}
        onBack={handleBack}
        onDataChange={loadData}
      />
    )
  }

  // 看板首页
  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader title="结算办理" subtitle="管理工程结算单据" />
      <SettlementDashboard
        settlements={settlements}
        projects={projects}
        onProjectClick={handleProjectClick}
      />
    </div>
  )
}

export default Settlement
