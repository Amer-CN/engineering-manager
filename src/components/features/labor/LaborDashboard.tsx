// LaborDashboard.tsx - 工人看板Tab

import React from 'react'
import { motion } from 'framer-motion'
import { Icon } from '../../ui/Icon'
import { HoverScrollbar } from '../../ui/HoverScrollbar'
import type { Project } from '@/types/electron'
import type { Member, WorkerTeam } from '../../../types/electron'
import { CHART_PALETTE } from './laborColors'
import { calcAge } from '../../../utils/member'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

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
          {projectDistribution.length > 0 ? (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={projectDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {projectDistribution.map((_, index) => (
                      <Cell key={index} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={((value: number, name: string) => [`${value ?? 0} 人`, name ?? '']) as never}
                    contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--fg)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-3 mt-4">
                {projectDistribution.map((item, index) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: CHART_PALETTE[index % CHART_PALETTE.length] }}
                    />
                    <span className="text-sm text-[color:var(--fg-2)]">{item.name}</span>
                    <span className="text-sm text-[color:var(--muted)]">({item.value})</span>
                  </div>
                ))}
              </div>
            </div>
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
