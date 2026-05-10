/**
 * ProjectCard - 领导视角项目卡片
 * 含健康环、预算信息、玻璃态设计
 */
import React from 'react'
import type { Project, Member } from '@/types'
import { usePermission } from '@/hooks/usePermission.tsx'
import { Icon } from '../../ui/Icon'

const statusLabels: Record<string, { text: string; color: string; dot: string }> = {
  planning: { text: '筹备中', color: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  in_progress: { text: '进行中', color: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  completed: { text: '已完成', color: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
  archived: { text: '已归档', color: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
}

export interface ProjectCardProps {
  project: Project
  members: Member[]
  index: number
  onClick: (project: Project) => void
  onEdit: (project: Project) => void
  onDelete: (id: number) => void
}

function HealthRing({ score, size = 44 }: { score: number; size?: number }) {
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#3b82f6' : score >= 40 ? '#f59e0b' : '#ef4444'
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

export function ProjectCard({ project, members, index, onClick, onEdit, onDelete }: ProjectCardProps) {
  const { can } = usePermission()

  const getManagerName = () => {
    if (project.projectManagerName) return project.projectManagerName
    if (project.projectManagerId) { const m = members.find(m => m.id === project.projectManagerId); return m?.name || '-' }
    return '-'
  }

  const getDuration = () => {
    if (!project.startDate) return null
    if (!project.endDate) return project.startDate
    const start = new Date(project.startDate); const end = new Date(project.endDate)
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    return `${project.startDate} 至 ${project.endDate} (${days}天)`
  }

  const healthScore = project.status === 'completed' ? 95 : project.status === 'archived' ? 85 : project.status === 'in_progress' ? 72 : project.status === 'planning' ? 55 : 50
  const status = statusLabels[project.status] || { text: project.status, color: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' }
  const budgetM = project.budget > 0 ? (project.budget / 10000).toFixed(1) : null

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm group hover:-translate-y-1 hover:shadow-lg transition-all duration-300 cursor-pointer"
      onClick={() => onClick(project)}>
      {/* 顶部：健康环 + 名称 + 状态 */}
      <div className="flex items-start gap-3 mb-4">
        <div className="relative">
          <HealthRing score={healthScore} />
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-700">{healthScore}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-slate-800 group-hover:text-primary-600 transition-colors truncate">{project.name}</h3>
          <p className="text-xs text-slate-400 mt-0.5 truncate">{project.address || '暂无地址'}</p>
        </div>
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${status.color}`}>
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${status.dot} mr-1`} />{status.text}
        </span>
      </div>

      <p className="text-xs text-slate-500 mb-4 line-clamp-2 leading-relaxed">{project.description || '暂无描述'}</p>

      <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
        <div className="flex items-center gap-1.5 text-slate-500">
          <Icon name="UserCircle" size={13} className="text-slate-400 flex-shrink-0" />
          <span className="truncate">{getManagerName()}</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-500">
          <Icon name="DollarSign" size={13} className="text-emerald-500 flex-shrink-0" />
          <span className="font-medium text-emerald-600">¥{project.budget > 0 ? (project.budget / 10000).toFixed(1) + '万' : '-'}</span>
        </div>
        {getDuration() && (
          <div className="flex items-center gap-1.5 text-slate-500 col-span-2">
            <Icon name="Calendar" size={13} className="text-slate-400 flex-shrink-0" />
            <span className="truncate text-[11px]">{getDuration()}</span>
          </div>
        )}
      </div>

      {budgetM && (
        <div className="mb-3 flex items-center gap-2 text-xs">
          <span className="text-slate-400">合同价</span>
          <span className="font-semibold text-emerald-600">¥{budgetM}万</span>
        </div>
      )}

      <div className="flex items-center gap-2 pt-3 border-t border-slate-100" onClick={e => e.stopPropagation()}>
        <button onClick={() => onEdit(project)} className="btn btn-secondary btn-sm flex-1"><Icon name="Edit3" size={14} /> 编辑</button>
        {can('projects:delete') && (
          <button onClick={() => onDelete(project.id)} className="btn btn-ghost btn-sm text-danger-500 hover:bg-danger-50">
            <Icon name="Trash2" size={16} />
          </button>
        )}
      </div>
    </div>
  )
}
