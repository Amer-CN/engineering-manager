/**
 * Projects.tsx - 项目管理页面
 */
import React, { useState, useEffect } from 'react'
import type { Project, Member } from '../types/electron'
import { logCreate, logUpdate, logDelete, logExport } from '../utils/audit'
import { usePermission } from '../hooks/usePermission.tsx'
import { exportProjects } from '../utils/export-import'
import { useToastStore } from '@/store/toastStore'
import { ProjectList, ProjectForm, ProjectDetail, ProjectFilters, ProjectFormData } from './features/projects'

const Projects: React.FC<{ refresh?: () => void }> = ({ refresh }) => {
  const { can } = usePermission()
  const showToast = useToastStore(state => state.showToast)
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
      const [projR, memR] = await Promise.allSettled([window.electronAPI.getProjects(), window.electronAPI.getMembers()])
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
    if (!can('projects:delete')) { alert('无权限'); return }
    if (!confirm('确定删除？')) return
    const p = projects.find(p => p.id === id)
    const r = await window.electronAPI.deleteProject(id)
    if (r.success) { logDelete('projects', p?.name || '项目', id, { name: p?.name }); loadData(); showToast('已删除', 'success') }
    else showToast(r.error || '失败', 'error')
  }
  const handleSubmit = async (data: ProjectFormData) => {
    try {
      if (editingProject) {
        const r = await window.electronAPI.updateProject({ ...editingProject, ...data })
        if (!r.success) throw new Error(r.error || '更新失败')
        logUpdate('projects', data.name, editingProject.id, { before: editingProject, after: data })
      } else {
        const r = await window.electronAPI.createProject(data)
        if (!r.success) throw new Error(r.error || '创建失败')
        logCreate('projects', data.name, r.data?.id, data)
      }
      loadData(); setShowModal(false); setEditingProject(null)
      showToast(editingProject ? '更新成功' : '创建成功', 'success')
    } catch (e: any) { showToast(e.message || '操作失败', 'error'); throw e }
  }
  const handleExport = () => {
    if (!can('projects:export')) { alert('无权限'); return }
    try { exportProjects(filteredProjects); logExport('projects', filteredProjects.length); showToast(`已导出 ${filteredProjects.length} 个项目`, 'success') }
    catch (e) { showToast('导出失败', 'error') }
  }

  const filteredProjects = projects.filter(p => {
    if (filterStatus && p.status !== filterStatus) return false
    if (filterManager && p.projectManagerId !== filterManager) return false
    if (searchTerm && !p.name.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  if (loading) {
    return (
      <div className="p-6 max-w-[1400px] mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-slate-200 rounded" />
          <div className="h-16 bg-slate-100 rounded-2xl" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">{[1, 2, 3].map(i => <div key={i} className="h-64 bg-slate-100 rounded-2xl" />)}</div>
        </div>
      </div>
    )
  }

  if (view === 'detail' && selectedProject) {
    return <ProjectDetail project={selectedProject} members={members} allMembers={members} onBack={() => { setView('list'); setSelectedProject(null) }} onEdit={() => handleEdit(selectedProject)} />
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-slate-800">项目管理</h1><p className="text-slate-500 dark:text-slate-400 mt-1">管理所有项目信息</p></div>
      </div>
      <ProjectFilters status={filterStatus} manager={filterManager} searchTerm={searchTerm}
        managers={members.filter(m => m.memberType === 'staff')} onStatusChange={setFilterStatus}
        onManagerChange={setFilterManager} onSearchChange={setSearchTerm} onAdd={handleCreate}
        onExport={handleExport} projectCount={filteredProjects.length} />
      <ProjectList projects={filteredProjects} members={members} loading={false}
        onProjectClick={(p) => { setSelectedProject(p); setView('detail') }}
        onEdit={handleEdit} onDelete={handleDelete} onAdd={handleCreate} />
      {showModal && <ProjectForm project={editingProject} members={members} onSubmit={handleSubmit} onCancel={() => { setShowModal(false); setEditingProject(null) }} />}
    </div>
  )
}

export default Projects
