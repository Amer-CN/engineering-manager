import React, { useMemo } from 'react'
import { Settlement as SettlementData, Project } from '../../../types/electron'
import { SettlementProjectCard, type SettlementProjectSummary } from './SettlementProjectCard'
import { formatMoney } from '../../../utils/format'

interface SettlementDashboardProps {
  settlements: SettlementData[]
  projects: Project[]
  onProjectClick: (project: Project) => void
}

export default function SettlementDashboard({ settlements, projects, onProjectClick }: SettlementDashboardProps) {
  const projectSettlementMap = useMemo(() => {
    const map = new Map<number, SettlementProjectSummary>()

    // Initialize from active projects
    for (const p of projects) {
      if (p.status === 'archived') continue
      map.set(p.id, {
        projectId: p.id,
        projectName: p.name,
        totalCount: 0,
        pendingCount: 0,
        completedCount: 0,
        archivedCount: 0,
        totalAmount: 0,
        incomeAmount: 0,
        expenseAmount: 0,
        latestDate: '',
      })
    }

    // Aggregate settlement data
    for (const s of settlements) {
      if (s.projectId == null) continue
      const entry = map.get(s.projectId)
      if (!entry) continue

      entry.totalCount += 1
      entry.totalAmount += s.amount

      if (s.status === 'pending' || s.status === 'draft') entry.pendingCount += 1
      else if (s.status === 'completed') entry.completedCount += 1
      else if (s.status === 'archived') entry.archivedCount += 1

      if (s.type === 'income') entry.incomeAmount += s.amount
      else if (s.type === 'expense') entry.expenseAmount += s.amount

      const date = (s as any).settlementDate || s.periodStart || ''
      if (date && (!entry.latestDate || date > entry.latestDate)) {
        entry.latestDate = date
      }
    }

    // Sort: projects with settlements first (by total count), then empty
    const result = Array.from(map.values())
    result.sort((a, b) => {
      if (a.totalCount > 0 && b.totalCount === 0) return -1
      if (a.totalCount === 0 && b.totalCount > 0) return 1
      return b.totalCount - a.totalCount
    })

    return result
  }, [settlements, projects])

  // Overall stats
  const activeProjects = projectSettlementMap.filter(p => p.totalCount > 0).length
  const totalProjects = projectSettlementMap.length
  const totalPending = projectSettlementMap.reduce((sum, p) => sum + p.pendingCount, 0)
  const totalAmount = projectSettlementMap.reduce((sum, p) => sum + p.totalAmount, 0)

  return (
    <div>
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-slate-500">结算项目</p>
          <p className="text-2xl font-bold text-slate-800">
            {activeProjects}<span className="text-base font-normal text-slate-400">/{totalProjects}</span>
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-slate-500">待办结算</p>
          <p className={`text-2xl font-bold ${totalPending > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
            {totalPending}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-slate-500">结算总笔数</p>
          <p className="text-2xl font-bold text-slate-800">
            {settlements.length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-slate-500">结算总金额</p>
          <p className="text-2xl font-bold text-primary-600">¥{formatMoney(totalAmount)}</p>
        </div>
      </div>

      {/* 项目结算列表 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">项目结算概览</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {activeProjects}/{totalProjects} 个项目有结算记录
            </p>
          </div>
        </div>

        {projectSettlementMap.length === 0 ? (
          <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-200">
            <p className="text-lg">暂无项目数据</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {projectSettlementMap.map((data) => {
              const project = projects.find(p => p.id === data.projectId)
              if (!project) return null
              return (
                <SettlementProjectCard
                  key={data.projectId}
                  data={data}
                  onClick={() => onProjectClick(project)}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
