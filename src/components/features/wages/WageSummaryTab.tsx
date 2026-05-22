// WageSummaryTab.tsx — 项目工资汇总（归档记录按年月+班组层级折叠）

import { useState, useMemo } from 'react'
import type { WageRecord } from '@/types'
import { Icon } from '../../ui/Icon'

interface WageSummaryTabProps {
  allWageRecords: WageRecord[]
  projectId: number
  projectName: string
}

export default function WageSummaryTab({ allWageRecords, projectId, projectName }: WageSummaryTabProps) {
  const [expandedYears, setExpandedYears] = useState<Set<string>>(() => new Set())
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(() => new Set())

  const toggleYear = (y: string) => {
    setExpandedYears(prev => {
      const next = new Set(prev)
      next.has(y) ? next.delete(y) : next.add(y)
      return next
    })
  }

  const toggleMonth = (ym: string) => {
    setExpandedMonths(prev => {
      const next = new Set(prev)
      next.has(ym) ? next.delete(ym) : next.add(ym)
      return next
    })
  }

  // 该项目所有已归档的发放记录
  const archived = useMemo(() =>
    allWageRecords.filter(w => w.projectId === projectId && w.paymentLocked),
    [allWageRecords, projectId]
  )

  // 按年分组（单次遍历 O(n)，原 O(n²) 嵌套 filter 已优化）
  const byYear = useMemo(() => {
    const yearMap = new Map<string, {
      totalPaid: number; workerCount: number; recordCount: number
      months: Map<string, {
        totalPaid: number; workerCount: number; recordCount: number
        teams: Map<string, { totalPaid: number; workerCount: number }>
      }>
    }>()

    // 辅助：worker 名称收集器
    const yearWorkers = new Map<string, Set<string>>()     // year -> Set<memberName>
    const monthWorkers = new Map<string, Set<string>>()    // yearMonth -> Set<memberName>
    const teamWorkers = new Map<string, Set<string>>()     // yearMonth:team -> Set<memberName>

    for (const w of archived) {
      const y = w.yearMonth.slice(0, 4)
      const ym = w.yearMonth
      const team = w.teamName || '未分组'
      const paid = Number(w.paidAmount) || 0

      // 确保 year 条目
      if (!yearMap.has(y)) yearMap.set(y, { totalPaid: 0, workerCount: 0, recordCount: 0, months: new Map() })
      const yearEntry = yearMap.get(y)!
      yearEntry.totalPaid += paid
      yearEntry.recordCount++

      // 确保 month 条目
      if (!yearEntry.months.has(ym)) yearEntry.months.set(ym, { totalPaid: 0, workerCount: 0, recordCount: 0, teams: new Map() })
      const monthEntry = yearEntry.months.get(ym)!
      monthEntry.totalPaid += paid
      monthEntry.recordCount++

      // 确保 team 条目
      if (!monthEntry.teams.has(team)) monthEntry.teams.set(team, { totalPaid: 0, workerCount: 0 })
      monthEntry.teams.get(team)!.totalPaid += paid

      // 累计 worker 名称（避免重复 filter）
      if (!yearWorkers.has(y)) yearWorkers.set(y, new Set())
      yearWorkers.get(y)!.add(w.memberName ?? '')

      if (!monthWorkers.has(ym)) monthWorkers.set(ym, new Set())
      monthWorkers.get(ym)!.add(w.memberName ?? '')

      const teamKey = `${ym}::${team}`
      if (!teamWorkers.has(teamKey)) teamWorkers.set(teamKey, new Set())
      teamWorkers.get(teamKey)!.add(w.memberName ?? '')
    }

    // 回写 workerCount
    for (const [y, entry] of yearMap) {
      entry.workerCount = yearWorkers.get(y)?.size ?? 0
      for (const [ym, monthEntry] of entry.months) {
        monthEntry.workerCount = monthWorkers.get(ym)?.size ?? 0
        for (const [teamName, teamEntry] of monthEntry.teams) {
          teamEntry.workerCount = teamWorkers.get(`${ym}::${teamName}`)?.size ?? 0
        }
      }
    }

    return Array.from(yearMap.entries()).sort(([a], [b]) => b.localeCompare(a))
  }, [archived])

  const totalPaid = useMemo(() => archived.reduce((s, w) => s + (Number(w.paidAmount) || 0), 0), [archived])
  const totalWorkers = useMemo(() => new Set(archived.map(w => w.memberName)).size, [archived])

  // 全部年份的班组累计排名
  const teamRanking = useMemo(() => {
    const map = new Map<string, number>()
    for (const w of archived) {
      const team = w.teamName || '未分组'
      map.set(team, (map.get(team) || 0) + (Number(w.paidAmount) || 0))
    }
    return Array.from(map.entries()).sort(([, a], [, b]) => b - a)
  }, [archived])

  if (archived.length === 0) {
    return (
      <div className="p-4">
        <div className="text-center py-16 text-slate-400">
          <Icon name="BarChart3" size={48} className="mx-auto mb-4" />
          <p className="text-lg">暂无归档数据</p>
          <p className="text-sm mt-1">发放工资后归档，即可在此查看汇总</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-5">
      {/* 顶部 KPI */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 rounded-xl p-5 text-center">
          <div className="text-xs text-green-600 mb-1">累计发放</div>
          <div className="text-2xl font-bold text-green-700">¥{totalPaid.toLocaleString()}</div>
        </div>
        <div className="bg-blue-50 rounded-xl p-5 text-center">
          <div className="text-xs text-blue-600 mb-1">发放人次</div>
          <div className="text-2xl font-bold text-blue-700">{archived.length}</div>
        </div>
        <div className="bg-amber-50 rounded-xl p-5 text-center">
          <div className="text-xs text-amber-600 mb-1">覆盖工人</div>
          <div className="text-2xl font-bold text-amber-700">{totalWorkers}</div>
        </div>
      </div>

      {/* 班组累计排名（一眼看各班组总发放） */}
      {teamRanking.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-2">班组累计发放排名</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {teamRanking.map(([name, amount]) => (
              <div key={name} className="bg-white border border-slate-200 rounded-lg px-4 py-2.5 flex items-center justify-between">
                <span className="text-sm text-slate-700">{name}</span>
                <span className="text-sm font-medium text-green-600">¥{amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 层级明细：年 → 月 → 班组 */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">发放明细</h3>
        <div className="space-y-2">
          {byYear.map(([year, yearData]) => {
            const expanded = expandedYears.has(year)
            return (
              <div key={year} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                {/* 年份行 */}
                <button onClick={() => toggleYear(year)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-bold text-slate-700 transition-transform ${expanded ? 'rotate-90' : ''}`}>▶</span>
                    <span className="text-sm font-bold text-slate-800">{year}年</span>
                    <span className="text-xs text-slate-400">{yearData.recordCount} 条 · {yearData.workerCount} 人</span>
                  </div>
                  <span className="text-sm font-bold text-green-700">¥{yearData.totalPaid.toLocaleString()}</span>
                </button>

                {/* 该年的月份列表 */}
                {expanded && (
                  <div className="divide-y divide-slate-100">
                    {Array.from(yearData.months.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([ym, monthData]) => {
                      const mExpanded = expandedMonths.has(ym)
                      return (
                        <div key={ym}>
                          {/* 月份行 */}
                          <button onClick={() => toggleMonth(ym)}
                            className="w-full flex items-center justify-between px-6 py-2.5 hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-3">
                              <span className={`text-xs text-slate-400 transition-transform ${mExpanded ? 'rotate-90' : ''}`}>▶</span>
                              <span className="text-sm text-slate-700">{parseInt(ym.split('-')[1])}月</span>
                              <span className="text-xs text-slate-400">{monthData.recordCount} 条 · {monthData.workerCount} 人</span>
                            </div>
                            <span className="text-sm font-bold text-green-600">¥{monthData.totalPaid.toLocaleString()}</span>
                          </button>

                          {/* 班组行 */}
                          {mExpanded && (
                            <div className="px-10 pb-2 divide-y divide-slate-50">
                              {Array.from(monthData.teams.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([teamName, teamData]) => (
                                <div key={teamName} className="flex items-center justify-between py-1.5">
                                  <div className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                    <span className="text-sm text-slate-500">{teamName}</span>
                                    <span className="text-xs text-slate-400">{teamData.workerCount} 人</span>
                                  </div>
                                  <span className="text-sm text-green-600">¥{teamData.totalPaid.toLocaleString()}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
