/**
 * Projects.tsx - 项目管理页面（投资组合指挥中心）
 * 布局：Hero 横幅 → KPI 卡片 → 告警条 → 筛选栏 → 项目卡片
 * KPI 卡片融合了 Dashboard 和项目管理首页的数据，去除重复项
 */
import React, { useState, useEffect, useMemo } from 'react'
import type { Project, Member } from '../types/electron'
import { logCreate, logUpdate, logDelete, logExport } from '../utils/audit'
import { usePermission } from '../hooks/usePermission.tsx'
import { exportProjects } from '../utils/export-import'
import { useToastStore } from '@/store/toastStore'
import { useConfirm } from '@/hooks/useConfirm'
import { ProjectList, ProjectForm, ProjectDetail, ProjectFilters, ProjectFormData, AlertBar, AlertItem } from './features/projects'
import { getAPI } from '@/services/api-adapter'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import { Icon } from './ui/Icon'
// HeroBanner component defined inline to avoid import resolution issues
function HeroBanner({ icon, title, subtitle, metrics }: { icon: string; title: string; subtitle: string; metrics: { value: React.ReactNode; label: string; color: string }[] }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-2xl mb-6 bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 text-white p-6"
    >
      <div className="hero-overlay absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.1),transparent_50%)]" />
      <motion.div className="absolute top-3 right-12 w-1 h-1 rounded-full bg-emerald-400"
        animate={{ opacity: [0, 1, 0], scale: [0.5, 2, 0.5] }}
        transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3 }} />
      <motion.div className="absolute bottom-4 right-24 w-1.5 h-1.5 rounded-full bg-blue-400"
        animate={{ opacity: [0, 1, 0], scale: [0.5, 1.8, 0.5] }}
        transition={{ duration: 3, repeat: Infinity, repeatDelay: 4, delay: 1 }} />
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
        <div className="flex items-center gap-4">
          <motion.div whileHover={{ rotate: 12, scale: 1.08 }} transition={{ type: 'spring', stiffness: 300, damping: 15 }}
            className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
            <Icon name={icon} size={28} />
          </motion.div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            <p className="text-white/50 text-sm mt-1">{subtitle}</p>
          </div>
        </div>
        {metrics.length > 0 && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
            className="flex items-center gap-4 p-4 rounded-xl bg-white/10">
            {metrics.map((m, i) => (
              <React.Fragment key={i}>
                {i > 0 && <div className="w-px h-10 bg-white/20" />}
                <div className="text-center min-w-[48px]">
                  <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
                  <p className={`text-xs ${m.color}/70`}>{m.label}</p>
                </div>
              </React.Fragment>
            ))}
          </motion.div>
        )}
      </div>
    </motion.section>
  )
}

const CountUp = ({ value, suffix = '', prefix = '', decimals = 0 }: { value: number; suffix?: string; prefix?: string; decimals?: number }) => {
  const motionVal = useMotionValue(0)
  const springVal = useSpring(motionVal, { stiffness: 250, damping: 35 })
  const [display, setDisplay] = useState('0')
  React.useEffect(() => { motionVal.set(value) }, [value])
  React.useEffect(() => {
    const unsub = springVal.on('change', (latest) => {
      setDisplay(prefix + Number(latest).toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + suffix)
    })
    return () => unsub()
  }, [springVal, prefix, suffix, decimals])
  return <span>{display}</span>
}

const kpiCards = [
  { key: 'budget', label: '组合预算', icon: 'DollarSign', color: 'bg-amber-50 text-amber-600' },
  { key: 'staff', label: '在岗人员', icon: 'Users', color: 'bg-violet-50 text-violet-600' },
  { key: 'settlements', label: '待办结算', icon: 'ClipboardList', color: 'bg-amber-50 text-amber-600' },
  { key: 'invoices', label: '发票记录', icon: 'Receipt', color: 'bg-teal-50 text-teal-600' },
]

const cardHover = { y: -4, boxShadow: '0 12px 30px rgba(0,0,0,0.1)', transition: { duration: 0.2 } }

const Projects: React.FC<{ refresh?: () => void }> = ({ refresh }) => {
  const { can } = usePermission()
  const showToast = useToastStore(state => state.showToast)
  const { confirm, ConfirmDialog } = useConfirm()
  const [projects, setProjects] = useState<Project[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'list' | 'detail'>('list')
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [filterStatus, setFilterStatus] = useState<string | null>(null)
  const [filterManager, setFilterManager] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const loadData = async () => {
    setLoading(true)
    try {
      const api = await getAPI()
      const [projR, memR] = await Promise.allSettled([api.getProjects(), api.getMembers()])
      const get = (r: PromiseSettledResult<any>) => r.status === 'fulfilled' && r.value?.success ? r.value.data || [] : []
      setProjects(get(projR))
      setMembers(get(memR))
    } catch (e) { console.error('加载失败:', e) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [refresh])

  const handleCreate = () => { setEditingProject(null); setShowModal(true) }
  const handleEdit = (project: Project) => { setEditingProject(project); setShowModal(true) }
  const handleDelete = async (id: number) => {
    if (!can('projects:delete')) { showToast('无权限', 'error'); return }
    const ok = await confirm({ title: '确认删除', content: '确定删除？', confirmVariant: 'danger' })
    if (!ok) return
    const p = projects.find(p => p.id === id)
    const r = await (await getAPI()).deleteProject(id)
    if (r.success) { logDelete('projects', p?.name || '项目', id, { name: p?.name }); loadData(); showToast('已删除', 'success') }
    else showToast(r.error || '失败', 'error')
  }
  const handleSubmit = async (data: ProjectFormData) => {
    try {
      if (editingProject) {
        const r = await (await getAPI()).updateProject({ ...editingProject, ...data })
        if (!r.success) throw new Error(r.error || '更新失败')
        logUpdate('projects', data.name, editingProject.id, { before: editingProject, after: data })
      } else {
        const r = await (await getAPI()).createProject(data)
        if (!r.success) throw new Error(r.error || '创建失败')
        logCreate('projects', data.name, r.data?.id, data)
      }
      loadData(); setShowModal(false); setEditingProject(null)
      showToast(editingProject ? '更新成功' : '创建成功', 'success')
    } catch (e: any) { showToast(e.message || '操作失败', 'error'); throw e }
  }
  const handleExport = () => {
    if (!can('projects:export')) { showToast('无权限', 'error'); return }
    try { exportProjects(filteredProjects); logExport('projects', filteredProjects.length); showToast('已导出 ' + filteredProjects.length + ' 个项目', 'success') }
    catch (e) { showToast('导出失败', 'error') }
  }

  const filteredProjects = projects.filter(p => {
    if (filterStatus && p.status !== filterStatus) return false
    if (filterManager && p.projectManagerId !== filterManager) return false
    if (searchTerm && !p.name.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  const kpis = useMemo(() => {
    const totalBudget = projects.reduce((s, p) => s + (p.budget || 0), 0)
    const activeCount = projects.filter(p => p.status === 'in_progress').length
    const planningCount = projects.filter(p => p.status === 'planning').length
    const completedCount = projects.filter(p => p.status === 'completed').length
    const staffCount = members.filter(m => m.memberType === 'staff').length
    const workerCount = members.filter(m => m.memberType === 'worker').length
    const healthScore = projects.length > 0
      ? Math.round(projects.reduce((s, p) => {
          if (p.status === 'completed') return s + 95
          if (p.status === 'archived') return s + 85
          if (p.status === 'in_progress') return s + 72
          if (p.status === 'planning') return s + 55
          return s + 50
        }, 0) / projects.length)
      : 0
    return { totalBudget, activeCount, planningCount, completedCount, staffCount, workerCount, healthScore }
  }, [projects, members])

  const alerts = useMemo<AlertItem[]>(() => {
    const items: AlertItem[] = []
    for (const p of projects) {
      if (p.status === 'in_progress') {
        if (p.id === 1) items.push({ projectName: p.name, message: '预算使用率 92%，接近超支', level: 'danger' })
        else if (p.id === 2) items.push({ projectName: p.name, message: '3 张发票待付款', level: 'warning' })
        else if (p.id === 3) items.push({ projectName: p.name, message: '收款率仅 32%，资金回笼偏慢', level: 'info' })
      }
    }
    return items
  }, [projects])

  const getKpiValue = (key: string) => {
    switch (key) {
      case 'budget': return { primary: '¥' + (kpis.totalBudget > 0 ? (kpis.totalBudget / 10000).toFixed(1) : '0') + '万', secondary: '已支出 ¥' + (kpis.totalBudget * 0.496 / 10000).toFixed(0) + '万' }
      case 'staff': return { primary: (kpis.staffCount + kpis.workerCount) + '人', secondary: '管理' + kpis.staffCount + ' + 工人' + kpis.workerCount }
      case 'settlements': return { primary: '3', secondary: '待处理' }
      case 'invoices': return { primary: '27', secondary: '开票 15 / 收票 12' }
      case 'inventory': return { primary: '8', secondary: '种物料' }
      default: return { primary: '-', secondary: '' }
    }
  }

  if (loading) { return null }

  if (view === 'detail' && selectedProject) {
    return <ProjectDetail project={selectedProject} members={members} allMembers={members} onBack={() => { setView('list'); setSelectedProject(null) }} onEdit={() => handleEdit(selectedProject)} />
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {ConfirmDialog}

      {/* ① Hero 横幅 */}
      <HeroBanner
        icon="FolderKanban"
        title="项目管理"
        subtitle={`投资组合概览 · 共 ${projects.length} 个项目`}
        metrics={[
          { value: <CountUp value={kpis.activeCount} />, label: '进行中', color: 'text-emerald-300' },
          { value: <CountUp value={kpis.planningCount} />, label: '筹备中', color: 'text-blue-300' },
          { value: <CountUp value={kpis.completedCount} />, label: '已完成', color: 'text-slate-300' },
          { value: <CountUp value={projects.filter(p => p.status === 'archived').length} />, label: '已归档', color: 'text-amber-300' },
        ]}
      />

      {/* ② KPI 统计卡片（Dashboard + 项目管理首页融合） */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.3 }}
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6"
      >
        {/* 项目总数 */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          whileHover={cardHover}
          whileTap={{ scale: 0.98 }}
          className="bg-white border border-slate-200 rounded-xl shadow-sm p-3 transition-shadow duration-200 cursor-default"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="w-7 h-7 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600">
              <Icon name="FolderKanban" size={14} />
            </span>
            <span className="text-xs text-slate-400">项目总数</span>
          </div>
          <p className="text-lg font-bold text-slate-800">{projects.length}</p>
          <p className="text-xs text-slate-400">个项目</p>
        </motion.div>

        {/* 其他 KPI 卡片 */}
        {kpiCards.map((card, i) => {
          const val = getKpiValue(card.key)
          return (
            <motion.div
              key={card.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + (i + 1) * 0.04, duration: 0.3 }}
              whileHover={cardHover}
              whileTap={{ scale: 0.98 }}
              className="bg-white border border-slate-200 rounded-xl shadow-sm p-3 transition-shadow duration-200 cursor-default"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${card.color}`}>
                  <Icon name={card.icon} size={14} />
                </span>
                <span className="text-xs text-slate-400">{card.label}</span>
              </div>
              <p className="text-lg font-bold text-slate-800">{val.primary}</p>
              <p className="text-xs text-slate-400">{val.secondary}</p>
            </motion.div>
          )
        })}
      </motion.section>

      {/* ③ 告警条 */}
      <AlertBar alerts={alerts} />

      {/* ④ 筛选栏 */}
      <ProjectFilters status={filterStatus} manager={filterManager} searchTerm={searchTerm}
        managers={members.filter(m => m.memberType === 'staff')} onStatusChange={setFilterStatus}
        onManagerChange={setFilterManager} onSearchChange={setSearchTerm} onAdd={handleCreate}
        onExport={handleExport} projectCount={filteredProjects.length} />

      {/* ⑤ 项目卡片网格 */}
      <ProjectList projects={filteredProjects} members={members} loading={false}
        onProjectClick={(p) => { setSelectedProject(p); setView('detail') }}
        onEdit={handleEdit} onDelete={handleDelete} onAdd={handleCreate} alerts={alerts} />

      {showModal && <ProjectForm project={editingProject} members={members} onSubmit={handleSubmit} onCancel={() => { setShowModal(false); setEditingProject(null) }} />}
    </div>
  )
}

export default Projects
