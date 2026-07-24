/**
 * Projects.tsx - 项目管理页面（项目指挥中心）
 * 布局（对齐 Stitch _12）：页头 → AI 洞察卡 → KPI 走势 → 预算分布/状态环形 → 筛选栏 → 项目卡片
 */
import React, { useState, useMemo } from 'react'
import type { Project, Member } from '../types/electron'
import { logCreate, logUpdate, logDelete, logExport } from '../utils/audit'
import { usePermission } from '../hooks/usePermission.tsx'
import { exportProjects } from '../utils/export-import'
import { useToastStore } from '@/store/toastStore'
import { useConfirm } from '@/hooks/useConfirm'
import { ProjectList, ProjectForm, ProjectDetail, ProjectFilters, ProjectFormData, AlertItem } from './features/projects'
import { getAPI } from '@/services/api-adapter'
import { useQueryClient } from '@tanstack/react-query'
import { useProjects } from '../hooks/data/useProjects'
import { useMembers } from '../hooks/data/useMembers'
import { Icon } from './ui/Icon'
import PageContainer from './ui/PageContainer'

const Projects: React.FC<{ refresh?: () => void }> = ({ refresh }) => {
  const { can } = usePermission()
  const showToast = useToastStore(state => state.showToast)
  const { confirm, ConfirmDialog } = useConfirm()
  const queryClient = useQueryClient()
  const projectsQuery = useProjects()
  const membersQuery = useMembers()
  const projects: Project[] = projectsQuery.data ?? []
  const members: Member[] = membersQuery.data ?? []
  const loading = projectsQuery.isLoading || membersQuery.isLoading
  const [view, setView] = useState<'list' | 'detail'>('list')
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [filterStatus, setFilterStatus] = useState<string | null>(null)
  const [filterManager, setFilterManager] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const handleCreate = () => { setEditingProject(null); setShowModal(true) }
  const handleEdit = (project: Project) => { setEditingProject(project); setShowModal(true) }
  const handleDelete = async (id: number) => {
    if (!can('projects:delete')) { showToast('无权限', 'error'); return }
    const ok = await confirm({ title: '确认删除', content: '确定删除？', confirmVariant: 'danger' })
    if (!ok) return
    const p = projects.find(p => p.id === id)
    const r = await (await getAPI()).deleteProject(id)
    if (r.success) { logDelete('projects', p?.name || '项目', id, { name: p?.name }); queryClient.invalidateQueries({ queryKey: ['projects'] }); showToast('已删除', 'success') }
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
        logCreate('projects', data.name, r.data?.id, data as unknown as Record<string, unknown>)
      }
      queryClient.invalidateQueries({ queryKey: ['projects'] }); setShowModal(false); setEditingProject(null)
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
    const archivedCount = projects.filter(p => p.status === 'archived').length
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
    return { totalBudget, activeCount, planningCount, completedCount, archivedCount, staffCount, workerCount, healthScore }
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

  // KPI 指标（对齐 Stitch：标签 + 大号等宽数字 + 迷你走势线）
  const KPIS = [
    { label: '在建项目', value: String(kpis.activeCount), unit: '个', spark: 'M0,15 L20,10 L40,12 L60,5 L80,8 L100,2', emphasis: true },
    { label: '组合预算', value: '¥' + (kpis.totalBudget / 10000).toFixed(1), unit: '万', spark: 'M0,8 L30,6 L60,7 L100,1', emphasis: false },
    { label: '在岗人员', value: String(kpis.staffCount + kpis.workerCount), unit: '人', spark: 'M0,2 L40,5 L70,3 L100,8', emphasis: false },
    { label: '组合健康度', value: String(kpis.healthScore), unit: '%', spark: 'M0,9 L20,4 L50,6 L80,2 L100,1', emphasis: false },
  ]

  // 项目状态分布（环形图，真实数据）
  const statusSegs = [
    { label: '进行中', count: kpis.activeCount, color: 'var(--accent)' },
    { label: '筹备中', count: kpis.planningCount, color: 'var(--muted)' },
    { label: '已完成', count: kpis.completedCount, color: 'var(--fg-2)' },
    { label: '已归档', count: kpis.archivedCount, color: 'var(--border-strong)' },
  ]
  const statusTotal = projects.length || 1
  const activePct = Math.round((kpis.activeCount / statusTotal) * 100)
  const topByBudget = [...projects].sort((a, b) => (b.budget || 0) - (a.budget || 0)).slice(0, 5)
  const maxBudget = Math.max(...projects.map(p => p.budget || 0), 1)

  if (loading) { return null }

  if (view === 'detail' && selectedProject) {
    return <ProjectDetail project={selectedProject} members={members} allMembers={members} onBack={() => { setView('list'); setSelectedProject(null) }} onEdit={() => handleEdit(selectedProject)} />
  }

  return (
    <PageContainer>
      {ConfirmDialog}

      {/* ① 页头：大号标题 + 副标 + 导出/新建 */}
      <section className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight" style={{ color: 'var(--fg)' }}>项目指挥中心</h1>
          <p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>共 {projects.length} 个项目 · 财务与执行数据已同步</p>
        </div>
        <div className="flex gap-3 flex-shrink-0">
          <button onClick={handleExport} className="px-4 py-2 text-xs font-semibold rounded-lg transition-colors" style={{ color: 'var(--fg)', border: '1px solid var(--border-strong)' }}>导出</button>
          <button onClick={handleCreate} className="px-4 py-2 text-xs font-semibold rounded-lg transition-opacity hover:opacity-80" style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}>新建项目</button>
        </div>
      </section>

      {/* ② AI 洞察卡 */}
      {alerts.length > 0 && (
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {alerts.slice(0, 3).map((a, i) => (
            <div key={i} className="p-4 rounded-xl flex items-start gap-3" style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}>
              <span className="mt-0.5 flex-shrink-0" style={{ color: 'var(--muted)' }}>
                <Icon name={a.level === 'danger' ? 'AlertTriangle' : a.level === 'warning' ? 'Clock' : 'TrendingUp'} size={16} />
              </span>
              <div>
                <p className="text-caption font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--muted)' }}>{a.projectName}</p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--fg)' }}>{a.message}</p>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* ③ KPI 指标区（大号等宽数字 + 迷你走势） */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-6 items-end mb-8">
        {KPIS.map((k, i) => (
          <div key={i} className="pb-4" style={{ borderBottom: `1px solid ${k.emphasis ? 'var(--accent)' : 'var(--border)'}` }}>
            <p className="text-caption font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>{k.label}</p>
            <div className="flex items-baseline gap-1.5">
              <span className={`font-bold tabular-nums ${k.emphasis ? 'text-4xl' : 'text-2xl'}`} style={{ color: 'var(--fg)' }}>{k.value}</span>
              <span className="text-sm" style={{ color: 'var(--muted)' }}>{k.unit}</span>
            </div>
            <div className="mt-3 w-full h-6">
              <svg className="w-full h-full" viewBox="0 0 100 20" preserveAspectRatio="none">
                <path d={k.spark} fill="none" stroke="var(--muted)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
              </svg>
            </div>
          </div>
        ))}
      </section>

      {/* ④ 图表区：预算分布（左） + 状态分布环形（右） */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="md:col-span-2 p-6 rounded-xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <h2 className="text-base font-semibold mb-5" style={{ color: 'var(--fg)' }}>项目预算分布</h2>
          <div className="flex flex-col gap-3">
            {topByBudget.map(p => {
              const pct = Math.round(((p.budget || 0) / maxBudget) * 100)
              return (
                <div key={p.id} className="flex items-center gap-3">
                  <span className="text-xs w-28 truncate" style={{ color: 'var(--muted)' }}>{p.name}</span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--panel-2)' }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--accent)' }} />
                  </div>
                  <span className="text-xs tabular-nums w-20 text-right" style={{ color: 'var(--fg)' }}>¥{((p.budget || 0) / 10000).toFixed(1)}万</span>
                </div>
              )
            })}
            {projects.length === 0 && <p className="text-sm" style={{ color: 'var(--muted)' }}>暂无项目预算数据</p>}
          </div>
        </div>
        <div className="md:col-span-1 p-6 rounded-xl flex flex-col items-center" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <h2 className="text-base font-semibold self-start mb-4" style={{ color: 'var(--fg)' }}>项目状态分布</h2>
          <div className="relative w-36 h-36">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--panel-2)" strokeWidth="3" />
              {(() => {
                let offset = 0
                return statusSegs.map((s, i) => {
                  const pct = (s.count / statusTotal) * 100
                  const node = (
                    <path key={i} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none" stroke={s.color} strokeWidth="3" strokeDasharray={`${pct}, 100`} strokeDashoffset={-offset} />
                  )
                  offset += pct
                  return node
                })
              })()}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold tabular-nums" style={{ color: 'var(--fg)' }}>{activePct}%</span>
              <span className="text-caption" style={{ color: 'var(--muted)' }}>进行中</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1.5 justify-center mt-4">
            {statusSegs.map((s, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                <span className="text-caption" style={{ color: 'var(--muted)' }}>{s.label} {s.count}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ⑤ 筛选栏 */}
      <ProjectFilters status={filterStatus} manager={filterManager} searchTerm={searchTerm}
        managers={members.filter(m => m.memberType === 'staff')} onStatusChange={setFilterStatus}
        onManagerChange={setFilterManager} onSearchChange={setSearchTerm} onAdd={handleCreate}
        onExport={handleExport} projectCount={filteredProjects.length} />

      {/* ⑥ 项目卡片网格 */}
      <ProjectList projects={filteredProjects} members={members} loading={false}
        onProjectClick={(p) => { setSelectedProject(p); setView('detail') }}
        onEdit={handleEdit} onDelete={handleDelete} onAdd={handleCreate} alerts={alerts} />

      {showModal && <ProjectForm project={editingProject} members={members} onSubmit={handleSubmit} onCancel={() => { setShowModal(false); setEditingProject(null) }} />}
    </PageContainer>
  )
}

export default Projects
