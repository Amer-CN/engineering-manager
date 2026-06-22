/**
 * ProjectCard - 项目卡片（精简版）
 * 只展示项目级关键字段：健康环 + 名称 + 状态 + 负责人 + 预算 + 进度
 * 预警项目带彩色边框 + 告警标签
 */
import React from 'react'
import type { Project, Member } from '@/types'
import { Icon } from '../../ui/Icon'
import { StatusBadge, PROJECT_STATUS } from '@/constants/status'

const COLORS = {
  healthGood: '#10b981',
  healthModerate: '#3b82f6',
  healthWarning: '#f59e0b',
  healthCritical: '#ef4444',
} as const

export interface ProjectCardProps {
  project: Project
  members: Member[]
  index: number
  onClick: (project: Project) => void
  alert?: string // 告警文本（可选）
  alertLevel?: 'danger' | 'warning' | 'info'
}

function HealthRing({ score, size = 44 }: { score: number; size?: number }) {
  const color = score >= 80 ? COLORS.healthGood : score >= 60 ? COLORS.healthModerate : score >= 40 ? COLORS.healthWarning : COLORS.healthCritical
  const sw = 4; const r = (size - sw) / 2
  const circumference = 2 * Math.PI * r
  const offset = circumference - (Math.min(100, Math.max(0, score)) / 100) * circumference
  return (
    <svg width={size} height={size} className="transform -rotate-90 flex-shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="currentColor" className="text-slate-200" strokeWidth={sw} fill="none" />
      <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={sw} fill="none" strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={offset} className="transition-all duration-700 ease-out" />
    </svg>
  )
}

function calcHealth(p: Project): number {
  if (p.status === 'completed') return 95
  if (p.status === 'archived') return 85
  if (p.status === 'in_progress') return 72
  if (p.status === 'planning') return 55
  return 50
}

const alertBorderMap: Record<string, string> = {
  danger: 'border-red-200',
  warning: 'border-amber-200',
  info: 'border-blue-200',
}

const alertBgMap: Record<string, string> = {
  danger: 'bg-red-50 border-red-100',
  warning: 'bg-amber-50 border-amber-100',
  info: 'bg-blue-50 border-blue-100',
}

const alertTextMap: Record<string, string> = {
  danger: 'text-red-700',
  warning: 'text-amber-700',
  info: 'text-blue-700',
}

export const ProjectCard = React.memo(function ProjectCard({ project, members, index, onClick, alert, alertLevel }: ProjectCardProps) {
  const getManagerName = () => {
    if (project.projectManagerName) return project.projectManagerName
    if (project.projectManagerId) { const m = members.find(m => m.id === project.projectManagerId); return m?.name || '-' }
    return '-'
  }

  const healthScore = calcHealth(project)
  const budgetWan = project.budget > 0 ? (project.budget / 10000).toFixed(1) : null
  const hasAlert = !!alert
  const borderClass = hasAlert && alertLevel ? alertBorderMap[alertLevel] : 'border-slate-200'

  return (
    <div className={`bg-white border ${borderClass} rounded-2xl p-5 shadow-sm group hover:-translate-y-1 hover:shadow-lg transition-all duration-300 cursor-pointer h-full flex flex-col`}
      onClick={() => onClick(project)}>
      {/* 顶部：健康环 + 名称 + 状态 */}
      <div className="flex items-start gap-3 mb-3">
        <div className="relative">
          <HealthRing score={healthScore} />
          <span className="absolute inset-0 flex items-center justify-center text-caption font-bold text-slate-700">{healthScore}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-slate-800 group-hover:text-primary-600 transition-colors truncate">{project.name}</h3>
          <p className="text-xs text-slate-400 mt-0.5 truncate">{project.address || '暂无地址'}</p>
        </div>
        <StatusBadge status={project.status} config={PROJECT_STATUS} />
      </div>

      {/* 告警标签（如有） */}
      {hasAlert && alertLevel && (
        <div className={`mb-2 px-2 py-1.5 rounded-lg border flex items-center gap-1.5 ${alertBgMap[alertLevel]}`}>
          <Icon name="AlertTriangle" size={11} className={alertTextMap[alertLevel]} />
          <span className={`text-caption font-medium ${alertTextMap[alertLevel]}`}>{alert}</span>
        </div>
      )}

      {/* 描述区域 - flex-1 使其占据剩余空间，line-clamp-2 限制行数 */}
      <p className="text-xs text-slate-500 mb-3 line-clamp-2 leading-relaxed flex-1">{project.description || '暂无描述'}</p>

      {/* 底部信息 - 固定在底部 */}
      <div className="grid grid-cols-2 gap-2 text-xs mt-auto">
        <div className="flex items-center gap-1.5 text-slate-500">
          <Icon name="UserCircle" size={13} className="text-slate-400 flex-shrink-0" />
          <span className="truncate">{getManagerName()}</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-500">
          <Icon name="DollarSign" size={13} className="text-emerald-500 flex-shrink-0" />
          <span className="font-medium text-emerald-600">{budgetWan ? `¥${budgetWan}万` : '-'}</span>
        </div>
      </div>
    </div>
  )
})
