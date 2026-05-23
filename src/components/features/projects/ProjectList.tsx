/**
 * ProjectList - 投资组合仪表盘 + 项目卡片网格
 */
import type { Project, Member } from '@/types'
import { ProjectCard } from './ProjectCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { motion } from 'framer-motion'
import { Icon } from '../../ui/Icon'

export interface ProjectListProps {
  projects: Project[]; members: Member[]; loading: boolean
  onProjectClick: (project: Project) => void
  onEdit: (project: Project) => void
  onDelete: (id: number) => void
  onAdd: () => void
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
}

export function ProjectList({ projects, members, loading, onProjectClick, onEdit, onDelete, onAdd }: ProjectListProps) {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-slate-100 animate-pulse h-32" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => <div key={i} className="rounded-2xl bg-slate-100 animate-pulse h-64" />)}
        </div>
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
        <Icon name="FolderKanban" size={48} className="mx-auto mb-4 text-slate-300" />
        <EmptyState title="暂无项目" description="点击下方按钮创建您的第一个项目" />
        <button onClick={onAdd} className="btn btn-primary mt-6">
          <Icon name="Plus" size={16} className="inline-block" /> 创建项目
        </button>
      </div>
    )
  }

  const totalBudget = projects.reduce((s, p) => s + (p.budget || 0), 0)
  const activeCount = projects.filter(p => p.status === 'in_progress').length
  const completedCount = projects.filter(p => p.status === 'completed').length

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants}>
      {/* 投资组合概览横幅 */}
      <motion.div variants={itemVariants}
        className="relative overflow-hidden rounded-2xl mb-6 bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 text-white p-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.1),transparent_50%)]" />
        {/* 装饰光点 */}
        <motion.div className="absolute top-3 right-12 w-1 h-1 rounded-full bg-emerald-400"
          animate={{ opacity: [0, 1, 0], scale: [0.5, 2, 0.5] }}
          transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3 }}
        />
        <motion.div className="absolute bottom-4 right-24 w-1.5 h-1.5 rounded-full bg-blue-400"
          animate={{ opacity: [0, 1, 0], scale: [0.5, 1.8, 0.5] }}
          transition={{ duration: 3, repeat: Infinity, repeatDelay: 4, delay: 1 }}
        />
        <div className="relative z-10">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-4">项目投资组合概览</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: '项目总数', value: `${projects.length}`, sub: `${activeCount}个进行中`, icon: 'FolderKanban', accent: 'text-blue-300' },
              { label: '组合预算', value: `¥${totalBudget > 0 ? (totalBudget / 10000).toFixed(1) : '0'}万`, sub: `${completedCount}个已完成`, icon: 'DollarSign', accent: 'text-emerald-300' },
              { label: '进行中', value: `${activeCount}`, sub: `共${projects.length}个项目`, icon: 'LayoutDashboard', accent: 'text-amber-300' },
              { label: '整体健康度', value: '72分', sub: '良好水平', icon: 'Activity', accent: 'text-emerald-300' },
            ].map((kpi, i) => (
              <div key={i} className="p-3 rounded-xl bg-white/10">
                <div className="flex items-center gap-2 mb-1">
                  <Icon name={kpi.icon} size={14} className={kpi.accent} />
                  <p className="text-xs text-white/60">{kpi.label}</p>
                </div>
                <p className={`text-xl font-bold ${kpi.accent}`}>{kpi.value}</p>
                <p className="text-xs text-white/40">{kpi.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* 项目卡片网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {projects.map((project, index) => (
          <motion.div key={project.id} variants={itemVariants}>
            <ProjectCard project={project} members={members} index={index}
              onClick={onProjectClick} onEdit={onEdit} onDelete={onDelete} />
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
