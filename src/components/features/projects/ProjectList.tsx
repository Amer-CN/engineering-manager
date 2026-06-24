/**
 * ProjectList - 项目卡片网格（精简版）
 * Hero 横幅已提取到 Projects.tsx 页面顶部
 */
import type { Project, Member } from '@/types'
import { ProjectCard } from './ProjectCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { motion } from 'framer-motion'
import { Icon } from '../../ui/Icon'
import type { AlertItem } from './AlertBar'
import { Button } from '../../ui/Button'

export interface ProjectListProps {
  projects: Project[]
  members: Member[]
  loading: boolean
  onProjectClick: (project: Project) => void
  onEdit: (project: Project) => void
  onDelete: (id: number) => void
  onAdd: () => void
  alerts?: AlertItem[]
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
} as const
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
} as const

export function ProjectList({ projects, members, loading, onProjectClick, onEdit, onDelete, onAdd, alerts = [] }: ProjectListProps) {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => <div key={i} className="rounded-2xl bg-slate-100 animate-pulse h-56" />)}
        </div>
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
        <Icon name="FolderKanban" size={48} className="mx-auto mb-4 text-slate-300" />
        <EmptyState title="暂无项目" description="点击下方按钮创建您的第一个项目" />
        <Button onClick={onAdd}  variant="primary" className="mt-6">
          <Icon name="Plus" size={16} className="inline-block" /> 创建项目
        </Button>
      </div>
    )
  }

  // 构建告警映射：projectName -> alert
  const alertMap = new Map<string, AlertItem>()
  for (const a of alerts) {
    alertMap.set(a.projectName, a)
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {projects.map((project, index) => {
          const alertItem = alertMap.get(project.name)
          return (
            <motion.div key={project.id} variants={itemVariants} className="h-full">
              <ProjectCard
                project={project}
                members={members}
                index={index}
                onClick={onProjectClick}
                alert={alertItem?.message}
                alertLevel={alertItem?.level}
              />
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}
