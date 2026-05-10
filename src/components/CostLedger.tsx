import { useState, useEffect, useCallback } from 'react'
import { CostLedgerDashboard } from './features/costLedger/CostLedgerDashboard'
import { CostLedgerProjectDetail } from './features/costLedger/CostLedgerProjectDetail'
import { CategoryManager } from './features/costLedger/CategoryManager'
import { useCostLedgerCategories } from '@/hooks/useCostLedgerCategories'
import type { Project, CostLedgerSummary } from '@/types'

type ViewMode = 'dashboard' | 'detail'

export default function CostLedger() {
  const [view, setView] = useState<ViewMode>('dashboard')
  const [projects, setProjects] = useState<Project[]>([])
  const [summaries, setSummaries] = useState<Record<number, CostLedgerSummary>>({})
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCategoryManager, setShowCategoryManager] = useState(false)

  const { categories, refresh: refreshCategories } = useCostLedgerCategories()

  const api = (window as any).electronAPI

  const loadDashboard = useCallback(async () => {
    if (!api?.getProjects) return
    setLoading(true)
    const projRes = await api.getProjects()
    const projectList = (projRes?.success ? projRes.data : projRes) || []
    setProjects(projectList)

    const sums: Record<number, CostLedgerSummary> = {}
    if (api.getCostLedgerSummary) {
      await Promise.all(projectList.map(async (p: Project) => {
        const r = await api.getCostLedgerSummary(p.id)
        if (r?.success) sums[p.id] = r.data
      }))
    }
    setSummaries(sums)
    setLoading(false)
  }, [])

  useEffect(() => { loadDashboard() }, [loadDashboard])

  const handleSelectProject = (projectId: number) => {
    const project = projects.find(p => p.id === projectId)
    if (project) {
      setSelectedProject(project)
      setView('detail')
    }
  }

  const handleBack = () => {
    setSelectedProject(null)
    setView('dashboard')
    loadDashboard()
  }

  if (view === 'detail' && selectedProject) {
    return (
      <>
        <CostLedgerProjectDetail
          project={selectedProject}
          onBack={handleBack}
          categories={categories}
          onManageCategories={() => setShowCategoryManager(true)}
        />
        {showCategoryManager && (
          <CategoryManager
            categories={categories}
            onClose={() => setShowCategoryManager(false)}
            onRefresh={refreshCategories}
          />
        )}
      </>
    )
  }

  return (
    <div className="mx-auto max-w-[1400px] p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-800">成本台账</h1>
        <p className="mt-1 text-sm text-slate-500">真实资金流追踪 — 经营支出、垫资进出、股东融资</p>
      </div>
      <CostLedgerDashboard
        projects={projects}
        summaries={summaries}
        loading={loading}
        onSelectProject={handleSelectProject}
        onManageCategories={() => setShowCategoryManager(true)}
      />

      {showCategoryManager && (
        <CategoryManager
          categories={categories}
          onClose={() => setShowCategoryManager(false)}
          onRefresh={refreshCategories}
        />
      )}
    </div>
  )
}
