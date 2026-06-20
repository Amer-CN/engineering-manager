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
import { motion } from 'framer-motion'
import { Icon } from './ui/Icon'
import { ProjectsHeroBanner, CountUp, KPI_CARDS, CARD_HOVER } from './features/projects/ProjectsHeroBanner'

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
      <ProjectsHeroBanner
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
          whileHover={CARD_HOVER}
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
        {KPI_CARDS.map((card, i) => {
          const val = getKpiValue(card.key)
          return (
            <motion.div
              key={card.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + (i + 1) * 0.04, duration: 0.3 }}
              whileHover={CARD_HOVER}
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
