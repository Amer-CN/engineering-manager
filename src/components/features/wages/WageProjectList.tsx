import React, { useMemo } from 'react'
import type { WageRecord, Project } from '@/types'
import { WageProjectCard, type WageProjectData } from './WageProjectCard'

interface WageProjectListProps {
  allWageRecords: WageRecord[]
  projects: Project[]
  selectedMonth: string
  onProjectClick: (project: Project) => void
}

export default function WageProjectList({ allWageRecords, projects, selectedMonth, onProjectClick }: WageProjectListProps) {
  const projectWageMap = useMemo(() => {
    const map = new Map<number, WageProjectData>()

    // Initialize from projects (show all projects, even those without wages)
    for (const p of projects) {
      map.set(p.id, {
        projectId: p.id,
        projectName: p.name,
        totalWages: 0,
        recordCount: 0,
        latestMonth: '',
        currentMonthWages: 0,
        currentMonthCount: 0,
      })
    }

    // Aggregate wage data
    for (const w of allWageRecords) {
      const entry = map.get(w.projectId)
      if (!entry) continue

      entry.totalWages += w.actualWage || 0
      entry.recordCount += 1

      if (!entry.latestMonth || w.yearMonth > entry.latestMonth) {
        entry.latestMonth = w.yearMonth
      }

      if (w.yearMonth === selectedMonth) {
        entry.currentMonthWages += w.actualWage || 0
        entry.currentMonthCount += 1
      }
    }

    // Sort: projects with wages first (by total), then projects without wages
    const result = Array.from(map.values())
    result.sort((a, b) => {
      if (a.totalWages > 0 && b.totalWages === 0) return -1
      if (a.totalWages === 0 && b.totalWages > 0) return 1
      return b.totalWages - a.totalWages
    })

    return result
  }, [allWageRecords, selectedMonth])

  const totalProjects = projectWageMap.length
  const activeProjects = projectWageMap.filter(p => p.totalWages > 0).length

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">项目工资概览</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {activeProjects}/{totalProjects} 个项目有工资记录
          </p>
        </div>
      </div>

      {projectWageMap.length === 0 ? (
        <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-200">
          <p className="text-lg">暂无项目数据</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {projectWageMap.map((data) => {
            const project = projects.find(p => p.id === data.projectId)
            if (!project) return null
            return (
              <WageProjectCard
                key={data.projectId}
                data={data}
                selectedMonth={selectedMonth}
                onClick={() => onProjectClick(project)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
