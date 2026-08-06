/**
 * Projects.tsx - 项目管理页面（S11A 卡片视图 + S11B 表格视图双视图）
 * 布局（对齐 Stitch S11A/S11B）：页头「项目管理」+ 卡片/表格切换 → 筛选栏 → 卡片网格 / 表格
 * 详情页（S12）走 ProjectDetail。告警从真实工期推导（非硬编码 id）。
 */
import React, { useState, useMemo } from 'react'
import { LayoutGrid, Table2 } from 'lucide-react'
import type { Project, Member } from '../types/electron'
import { logCreate, logUpdate, logDelete, logExport } from '../utils/audit'
import { usePermission } from '../hooks/usePermission.tsx'
import { exportProjects } from '../utils/export-import'
import { useToastStore } from '@/store/toastStore'
import { useConfirm } from '@/hooks/useConfirm'
import { ProjectList, ProjectTable, ProjectForm, ProjectDetail, ProjectFilters, ProjectFormData, AlertItem } from './features/projects'
import { getAPI } from '@/services/api-adapter'
import { useQueryClient } from '@tanstack/react-query'
import { useProjects } from '../hooks/data/useProjects'
import { useMembers } from '../hooks/data/useMembers'
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
  const [listMode, setListMode] = useState<'card' | 'table'>('card')
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
    // G2 B7: 项目编辑 → projects:update
    if (editingProject && !can('projects:update')) { showToast('您没有编辑项目的权限', 'error'); return }
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

  // 告警从真实工期推导（供卡片角标）：逾期未完工 = 危险，30 天内交付 = 提醒
  const alerts = useMemo<AlertItem[]>(() => {
    const now = Date.now()
    const DAY = 86400000
    const items: AlertItem[] = []
    for (const p of projects) {
      if (p.status !== 'in_progress' || !p.endDate) continue
      const end = new Date(p.endDate).getTime()
      if (!end) continue
      if (end < now) items.push({ projectName: p.name, message: '工期已逾期', level: 'danger' })
      else if (end - now <= 30 * DAY) items.push({ projectName: p.name, message: '临近交付', level: 'warning' })
    }
    return items
  }, [projects])

  if (loading) { return null }

  if (view === 'detail' && selectedProject) {
    return <ProjectDetail project={selectedProject} members={members} allMembers={members} onBack={() => { setView('list'); setSelectedProject(null) }} onEdit={() => handleEdit(selectedProject)} />
  }

  const openDetail = (p: Project) => { setSelectedProject(p); setView('detail') }

  return (
    <PageContainer>
      {ConfirmDialog}

      {/* 页头：标题 + 卡片/表格切换 */}
      <section className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-base font-semibold tracking-tight" style={{ color: 'var(--fg)' }}>项目管理</h1>
          <p className="text-sm mt-1.5" style={{ color: 'var(--muted)' }}>共 {projects.length} 个项目</p>
        </div>
        <div className="inline-flex rounded-lg p-0.5 flex-shrink-0" style={{ background: 'var(--panel-2)' }}>
          {([['card', '卡片', LayoutGrid], ['table', '表格', Table2]] as const).map(([mode, label, IconCmp]) => {
            const active = listMode === mode
            return (
              <button
                key={mode}
                onClick={() => setListMode(mode)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                style={active ? { background: 'var(--card)', color: 'var(--fg)', boxShadow: 'var(--shadow-card)' } : { background: 'transparent', color: 'var(--muted)' }}
              >
                <IconCmp size={14} />
                {label}
              </button>
            )
          })}
        </div>
      </section>

      {/* 筛选栏 */}
      <ProjectFilters status={filterStatus} manager={filterManager} searchTerm={searchTerm}
        managers={members.filter(m => m.memberType === 'staff')} onStatusChange={setFilterStatus}
        onManagerChange={setFilterManager} onSearchChange={setSearchTerm} onAdd={handleCreate}
        onExport={handleExport} projectCount={filteredProjects.length} />

      {/* 卡片视图（S11A） / 表格视图（S11B） */}
      {listMode === 'card' ? (
        <ProjectList projects={filteredProjects} members={members} loading={false}
          onProjectClick={openDetail}
          onEdit={handleEdit} onDelete={handleDelete} onAdd={handleCreate} alerts={alerts} />
      ) : (
        <ProjectTable projects={filteredProjects} members={members} onProjectClick={openDetail} />
      )}

      {showModal && <ProjectForm project={editingProject} members={members} onSubmit={handleSubmit} onCancel={() => { setShowModal(false); setEditingProject(null) }} />}
    </PageContainer>
  )
}

export default Projects
