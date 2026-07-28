/**
 * ProjectCard - 项目卡片（S11A 卡片视图，对齐 Stitch）
 * 名称 + 状态药丸 + 告警角标 + 总预算大号等宽数字 + 整体进度条 + 负责人
 * 进度按工期时间推导（真实 startDate/endDate），全 token 化支撑三主题
 */
import React from 'react'
import type { Project, Member } from '@/types'
import { Icon } from '../../ui/Icon'
import { StatusBadge, PROJECT_STATUS } from '@/constants/status'

export interface ProjectCardProps {
  project: Project
  members: Member[]
  index: number
  onClick: (project: Project) => void
  alert?: string // 告警文本（可选）
  alertLevel?: 'danger' | 'warning' | 'info'
}

/** 按工期时间推导整体进度（无 progress 字段时的真实近似） */
function calcProgress(p: Project): number {
  if (p.status === 'completed' || p.status === 'archived') return 100
  if (p.status === 'planning') return 0
  const start = p.startDate ? new Date(p.startDate).getTime() : 0
  const end = p.endDate ? new Date(p.endDate).getTime() : 0
  if (!start || !end || end <= start) return 0
  return Math.min(100, Math.max(0, Math.round(((Date.now() - start) / (end - start)) * 100)))
}

export const ProjectCard = React.memo(function ProjectCard({ project, members, onClick, alert, alertLevel }: ProjectCardProps) {
  const managerName =
    project.projectManagerName ||
    (project.projectManagerId ? members.find(m => m.id === project.projectManagerId)?.name : '') ||
    '未指派'
  const progress = calcProgress(project)

  // 语义色：danger/warning 走状态色，info 走中性（Bedrock 无信息蓝）
  const accentColor = alertLevel === 'danger' ? 'var(--danger)' : alertLevel === 'warning' ? 'var(--warning)' : 'var(--accent)'
  const badgeBg = alertLevel === 'danger' ? 'var(--danger-soft)' : alertLevel === 'warning' ? 'var(--warning-soft)' : 'var(--panel-2)'
  const badgeColor = alertLevel === 'danger' ? 'var(--danger)' : alertLevel === 'warning' ? 'var(--warning)' : 'var(--muted)'
  const hasAlert = !!alert && !!alertLevel

  return (
    <div
      onClick={() => onClick(project)}
      className="relative rounded-xl p-4 h-full flex flex-col cursor-pointer transition-all duration-200 hover:shadow-lift hover:-translate-y-0.5"
      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-strong)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
    >
      {/* 告警角标（右上角，语义色低饱和） */}
      {hasAlert && (
        <div
          className="absolute top-0 right-0 flex items-center gap-1 px-2.5 py-1 rounded-tr-2xl rounded-bl-xl text-caption font-medium"
          style={{ background: badgeBg, color: badgeColor, maxWidth: '72%' }}
        >
          <Icon name={alertLevel === 'danger' ? 'AlertTriangle' : alertLevel === 'warning' ? 'Clock' : 'Info'} size={11} />
          <span className="truncate">{alert}</span>
        </div>
      )}

      {/* 名称 + 状态药丸 */}
      <h3 className="text-base font-semibold truncate pr-6" style={{ color: 'var(--fg)' }}>{project.name}</h3>
      <div className="mt-2 mb-4">
        <StatusBadge status={project.status} config={PROJECT_STATUS} />
      </div>

      {/* 总预算金额（大号等宽） */}
      <p className="text-caption font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--muted)' }}>总预算金额</p>
      <p className="text-numeric-xl font-mono tabular-nums tracking-tight mb-5" style={{ color: 'var(--fg)' }}>
        ¥{(project.budget || 0).toLocaleString('zh-CN')}
      </p>

      {/* 整体进度 + 负责人（固定底部） */}
      <div className="mt-auto">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs" style={{ color: 'var(--muted)' }}>整体进度</span>
          <span className="text-xs font-semibold tabular-nums" style={{ color: accentColor }}>{progress}%</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--panel-2)' }}>
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progress}%`, background: accentColor }} />
        </div>

        <div className="flex items-center gap-2 mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-caption font-medium flex-shrink-0"
            style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
          >
            {managerName.charAt(0)}
          </div>
          <span className="text-sm truncate" style={{ color: 'var(--fg-2)' }}>{managerName}</span>
        </div>
      </div>
    </div>
  )
})
