/**
 * Settlement.tsx - 结算办理页面（看板+项目详情）
 */
import React, { useState, useEffect, useCallback } from 'react'
import type { Settlement as SettlementData, Project, Partner } from '../types/electron'
import { SettlementDashboard, SettlementProjectDetail } from './features/settlement'

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
      const [settlementsResult, projectsResult, partnersResult] = await Promise.allSettled([
        window.electronAPI.getSettlements(),
        window.electronAPI.getProjects(),
        window.electronAPI.getPartners(),
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
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">结算办理</h1>
          <p className="text-slate-500 mt-1">管理工程结算单据</p>
        </div>
      </div>
      <SettlementDashboard
        settlements={settlements}
        projects={projects}
        onProjectClick={handleProjectClick}
      />
    </div>
  )
}

export default Settlement
