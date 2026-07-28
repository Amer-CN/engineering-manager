/**
 * ProjectTable - 项目表格视图（S11B，对齐 Stitch）
 * 列：项目名称 / 状态 / 项目经理 / 预算金额 / 整体进度 / 更新日期
 * 全 token 化；金额右对齐等宽；进度 = 迷你条 + %；行点击进详情。
 * 注：Project 无「已用金额」真实字段，故不虚构该列。
 */
import type { Project, Member } from '@/types'
import { StatusBadge, PROJECT_STATUS } from '@/constants/status'

/** 按工期时间推导整体进度（与 ProjectCard 一致） */
function calcProgress(p: Project): number {
  if (p.status === 'completed' || p.status === 'archived') return 100
  if (p.status === 'planning') return 0
  const start = p.startDate ? new Date(p.startDate).getTime() : 0
  const end = p.endDate ? new Date(p.endDate).getTime() : 0
  if (!start || !end || end <= start) return 0
  return Math.min(100, Math.max(0, Math.round(((Date.now() - start) / (end - start)) * 100)))
}

export interface ProjectTableProps {
  projects: Project[]
  members: Member[]
  onProjectClick: (p: Project) => void
}

const th = 'py-3 px-3 text-caption font-semibold uppercase tracking-wider'

export function ProjectTable({ projects, members, onProjectClick }: ProjectTableProps) {
  const managerName = (p: Project) =>
    p.projectManagerName || (p.projectManagerId ? members.find(m => m.id === p.projectManagerId)?.name : '') || '未指派'

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left" style={{ borderBottom: '1px solid var(--border)' }}>
              <th className={`${th} pl-5`} style={{ color: 'var(--muted)' }}>项目名称</th>
              <th className={th} style={{ color: 'var(--muted)' }}>状态</th>
              <th className={th} style={{ color: 'var(--muted)' }}>项目经理</th>
              <th className={`${th} text-right`} style={{ color: 'var(--muted)' }}>预算金额</th>
              <th className={th} style={{ color: 'var(--muted)' }}>整体进度</th>
              <th className={`${th} pr-5 text-right`} style={{ color: 'var(--muted)' }}>更新日期</th>
            </tr>
          </thead>
          <tbody>
            {projects.map(p => {
              const progress = calcProgress(p)
              return (
                <tr
                  key={p.id}
                  onClick={() => onProjectClick(p)}
                  className="cursor-pointer transition-colors"
                  style={{ borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--sidebar-item-hover)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  <td className="py-3.5 pl-5 pr-3 font-medium" style={{ color: 'var(--fg)' }}>{p.name}</td>
                  <td className="py-3.5 px-3"><StatusBadge status={p.status} config={PROJECT_STATUS} /></td>
                  <td className="py-3.5 px-3" style={{ color: 'var(--fg-2)' }}>{managerName(p)}</td>
                  <td className="py-3.5 px-3 text-right font-mono tabular-nums tracking-tight" style={{ color: 'var(--fg)' }}>¥{(p.budget || 0).toLocaleString('zh-CN')}</td>
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1 rounded-full overflow-hidden" style={{ background: 'var(--panel-2)' }}>
                        <div className="h-full rounded-full" style={{ width: `${progress}%`, background: 'var(--accent)' }} />
                      </div>
                      <span className="text-xs tabular-nums w-9" style={{ color: 'var(--muted)' }}>{progress}%</span>
                    </div>
                  </td>
                  <td className="py-3.5 pr-5 pl-3 text-right font-mono tabular-nums text-xs" style={{ color: 'var(--muted)' }}>{(p.updatedAt || '').slice(0, 10)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="px-5 py-3 text-xs" style={{ color: 'var(--muted)', borderTop: '1px solid var(--border)' }}>共 {projects.length} 条记录</div>
    </div>
  )
}
