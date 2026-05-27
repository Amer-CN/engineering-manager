// LaborDashboard.tsx - 工人看板Tab

import React from 'react'
import { motion } from 'framer-motion'
import { Icon } from '../../ui/Icon'
import type { Member, WorkerTeam } from '../../../types/electron'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

interface LaborDashboardProps {
  members: Member[]
  projects: any[]
  workerTeams: WorkerTeam[]
}

const CHART_COLORS = [
  '#f59e0b', '#10b981', '#6366f1', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#14b8a6', '#e11d48', '#7c3aed',
]

const LaborDashboard: React.FC<LaborDashboardProps> = ({ members, projects, workerTeams }) => {
  // KPI calculations
  const totalWorkers = members.length
  const activeWorkers = members.filter(m => (m.status || 'active') === 'active').length
  const leftWorkers = members.filter(m => m.status === 'left').length
  const overAgeWorkers = members.filter(m => {
    if (!m.birthDate) return false
    const age = Math.floor((Date.now() - new Date(m.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    return age > 60
  }).length

  // Project distribution for pie chart
  const projectDistribution = projects.map(project => {
    const count = members.filter((m: any) => m.projectId === project.id).length
    return { name: project.name, value: count }
  }).filter(item => item.value > 0)

  // Add unassigned workers
  const unassignedCount = members.filter((m: any) => !m.projectId).length
  if (unassignedCount > 0) {
    projectDistribution.push({ name: '未分配', value: unassignedCount })
  }

  // KPI cards config
  const kpiCards = [
    {
      label: '工人总数',
      value: totalWorkers,
      icon: 'Users',
      color: 'bg-amber-50 text-amber-600',
      suffix: '人',
    },
    {
      label: '在场工人',
      value: activeWorkers,
      icon: 'UserCheck',
      color: 'bg-emerald-50 text-emerald-600',
      suffix: '人',
    },
    {
      label: '已离场',
      value: leftWorkers,
      icon: 'LogOut',
      color: 'bg-slate-50 text-slate-600',
      suffix: '人',
    },
    {
      label: '超龄工人',
      value: overAgeWorkers,
      icon: 'AlertTriangle',
      color: 'bg-red-50 text-red-600',
      suffix: '人',
      suffixColor: overAgeWorkers > 0 ? 'text-red-500' : 'text-slate-400',
    },
    {
      label: '班组数量',
      value: workerTeams.length,
      icon: 'Building2',
      color: 'bg-blue-50 text-blue-600',
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
            className="bg-white rounded-xl border border-slate-200 shadow-sm p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-500">{kpi.label}</span>
              <div className={`p-2 rounded-lg ${kpi.color}`}>
                <Icon name={kpi.icon} size={18} />
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-slate-800">{kpi.value}</span>
              <span className={`text-sm ${kpi.suffixColor || 'text-slate-400'}`}>{kpi.suffix}</span>
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
          className="bg-white rounded-xl border border-slate-200 shadow-sm p-6"
        >
          <h3 className="text-lg font-semibold text-slate-800 mb-4">工人分布</h3>
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
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={((value: any, name: any) => [`${value ?? 0} 人`, name ?? '']) as any}
                    contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--fg)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-3 mt-4">
                {projectDistribution.map((item, index) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                    />
                    <span className="text-sm text-slate-600">{item.name}</span>
                    <span className="text-sm text-slate-400">({item.value})</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-slate-400">
              暂无数据
            </div>
          )}
        </motion.div>

        {/* Team Overview List */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl border border-slate-200 shadow-sm p-6"
        >
          <h3 className="text-lg font-semibold text-slate-800 mb-4">班组概览</h3>
          {workerTeams.length > 0 ? (
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {workerTeams.slice(0, 10).map(team => {
                const teamWorkers = members.filter((m: any) => m.teamId === team.id)
                return (
                  <div
                    key={team.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <div>
                      <div className="font-medium text-slate-700">{team.name}</div>
                      <div className="text-sm text-slate-400">
                        {team.projectName || '未分配项目'}
                        {team.leaderName && ` · 组长: ${team.leaderName}`}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-semibold text-amber-600">{teamWorkers.length}</span>
                      <span className="text-sm text-slate-400 ml-1">人</span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-slate-400">
              暂无班组
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

export default LaborDashboard
