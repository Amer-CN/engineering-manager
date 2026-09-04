// LaborDashboard.tsx - 工人看板Tab

import React from 'react'
import { motion } from 'framer-motion'
import { Icon } from '../../ui/Icon'
import { HoverScrollbar } from '../../ui/HoverScrollbar'
import type { Project } from '@/types/electron'
import type { Member, WorkerTeam } from '../../../types/electron'
import { calcAge } from '../../../utils/member'
import { EditorialBars } from '@/components/ui/charts/EditorialBars'

interface LaborDashboardProps {
  members: Member[]
  projects: Project[]
  workerTeams: WorkerTeam[]
}



const LaborDashboard: React.FC<LaborDashboardProps> = ({ members, projects, workerTeams }) => {
  // KPI calculations
  const totalWorkers = members.length
  const activeWorkers = members.filter(m => (m.status || 'active') === 'active').length
  const leftWorkers = members.filter(m => m.status === 'left').length
  const overAgeWorkers = members.filter(m => {
    if (!m.birthDate) return false
    return calcAge(m.birthDate) > 60
  }).length

  // Project distribution for pie chart
  const projectDistribution = projects.map(project => {
    const count = members.filter((m: Member) => m.projectId === project.id).length
    return { name: project.name, value: count }
  }).filter(item => item.value > 0)

  // Add unassigned workers
  const unassignedCount = members.filter((m: Member) => !m.projectId).length
  if (unassignedCount > 0) {
    projectDistribution.push({ name: '未分配', value: unassignedCount })
  }

  // 工人分布条形数据：EditorialBars 契约要求降序；>8 条截断取 TOP8，
  // 其余条目以底注「其余 N 项合计 M 人」诚实注记（不藏数据）
  const distributionSorted = [...projectDistribution].sort((a, b) => b.value - a.value)
  const projectBars = distributionSorted.slice(0, 8)
  const distributionRest = distributionSorted.slice(8)
  const distributionRestSum = distributionRest.reduce((s, d) => s + d.value, 0)

  // KPI cards config
  const kpiCards = [
    {
      label: '工人总数',
      value: totalWorkers,
      icon: 'Users',
      color: 'bg-warning-50 text-warning-600',
      suffix: '人',
    },
    {
      label: '在场工人',
      value: activeWorkers,
      icon: 'UserCheck',
      color: 'bg-success-50 text-success-600',
      suffix: '人',
    },
    {
      label: '已离场',
      value: leftWorkers,
      icon: 'LogOut',
      color: 'bg-[color:var(--panel-2)] text-[color:var(--fg-2)]',
      suffix: '人',
    },
    {
      label: '超龄工人',
      value: overAgeWorkers,
      icon: 'AlertTriangle',
      color: 'bg-danger-50 text-danger-600',
      suffix: '人',
      suffixColor: overAgeWorkers > 0 ? 'text-danger-500' : 'text-[color:var(--muted)]',
    },
    {
      label: '班组数量',
      value: workerTeams.length,
      icon: 'Building2',
      color: 'bg-[color:var(--panel-2)] text-[color:var(--fg-2)]',
      suffix: '个',
    },
  ]

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {kpiCards.map((kpi, index) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.03 }}
            className="bg-[color:var(--card)] rounded-xl border border-[color:var(--border)] shadow-sm p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-[color:var(--muted)]">{kpi.label}</span>
              <div className={`p-2 rounded-lg ${kpi.color}`}>
                <Icon name={kpi.icon} size={18} />
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-numeric-xl font-mono tabular-nums tracking-tight text-[color:var(--fg)]">{kpi.value}</span>
              <span className={`text-sm ${kpi.suffixColor || 'text-[color:var(--muted)]'}`}>{kpi.suffix}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Distribution Pie Chart */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="bg-[color:var(--card)] rounded-xl border border-[color:var(--border)] shadow-sm p-6"
        >
          <h3 className="text-lg font-semibold text-[color:var(--fg)] mb-4">工人分布</h3>
          {projectBars.length > 0 ? (
            /* 编辑风横向条形：工人按项目分布降序（冠军=人数最多项目，默认墨阶），
               每行自带名称+人数，原饼图手写图例移除；>8 条截断 + 底注诚实注记 */
            <>
              <EditorialBars
                data={projectBars}
                formatValue={(n) => `${n} 人`}
              />
              {distributionRest.length > 0 && (
                <p className="mt-3 text-caption" style={{ color: 'var(--muted)' }}>
                  其余 {distributionRest.length} 项合计 {distributionRestSum} 人
                </p>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-64 text-[color:var(--muted)]">
              暂无数据
            </div>
          )}
        </motion.div>

        {/* Team Overview List */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-[color:var(--card)] rounded-xl border border-[color:var(--border)] shadow-sm p-6"
        >
          <h3 className="text-lg font-semibold text-[color:var(--fg)] mb-4">班组概览</h3>
          {workerTeams.length > 0 ? (
            <HoverScrollbar className="flex-1 max-h-[300px]"><div className="space-y-3">
              {workerTeams.slice(0, 10).map(team => {
                const teamWorkers = members.filter((m: Member) => m.teamId === team.id)
                return (
                  <div
                    key={team.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-[color:var(--panel-2)] hover:bg-[color:var(--panel-2)] transition-colors"
                  >
                    <div>
                      <div className="font-medium text-[color:var(--fg-2)]">{team.name}</div>
                      <div className="text-sm text-[color:var(--muted)]">
                        {team.projectName || '未分配项目'}
                        {team.leaderName && ` · 组长: ${team.leaderName}`}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-semibold text-warning-600">{teamWorkers.length}</span>
                      <span className="text-sm text-[color:var(--muted)] ml-1">人</span>
                    </div>
                  </div>
                )
              })}
            </div></HoverScrollbar>
          ) : (
            <div className="flex items-center justify-center h-64 text-[color:var(--muted)]">
              暂无班组
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

export default LaborDashboard
