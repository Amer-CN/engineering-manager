import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Task, Project, Member } from '../types/electron'
import { Icon } from './ui/Icon'
import { useToastContext } from '../hooks/useToast'
import PageContainer from './ui/PageContainer'

interface TasksProps {
  refresh?: () => void
}

const Tasks: React.FC<TasksProps> = ({ refresh }) => {
  const { showToast } = useToastContext()
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [filterProject, setFilterProject] = useState<number | ''>('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [formData, setFormData] = useState({
    projectId: '' as number | '',
    title: '',
    description: '',
    assigneeId: '' as number | '',
    priority: 'medium' as Task['priority'],
    status: 'todo' as Task['status'],
    progress: 0,
    dueDate: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [tasksResult, projectsResult, membersResult] = await Promise.all([
        window.electronAPI.getTasks(),
        window.electronAPI.getProjects(),
        window.electronAPI.getMembers()
      ])

      if (tasksResult.success && tasksResult.data) setTasks(tasksResult.data)
      if (projectsResult.success && projectsResult.data) setProjects(projectsResult.data)
      if (membersResult.success && membersResult.data) setMembers(membersResult.data)
    } catch (error) {
      console.error('加载数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const taskData = {
        ...formData,
        projectId: formData.projectId || 0,
        assigneeId: formData.assigneeId || null
      }

      if (editingTask) {
        await window.electronAPI.updateTask({ ...editingTask, ...taskData })
      } else {
        await window.electronAPI.createTask(taskData)
      }
      loadData()
      setShowModal(false)
      resetForm()
      refresh?.()
      showToast(editingTask ? '任务更新成功' : '任务创建成功', 'success')
    } catch (error: any) {
      console.error('保存任务失败:', error)
      showToast(error?.message || '保存失败', 'error')
    }
  }

  const handleEdit = (task: Task) => {
    setEditingTask(task)
    setFormData({
      projectId: task.projectId || '',
      title: task.title,
      description: task.description || '',
      assigneeId: task.assigneeId || '',
      priority: task.priority,
      status: task.status,
      progress: task.progress || 0,
      dueDate: task.dueDate || ''
    })
    setShowModal(true)
  }

  const handleDelete = async (id: number) => {
    if (confirm('确定要删除这个任务吗？')) {
      try {
        await window.electronAPI.deleteTask(id)
        loadData()
        refresh?.()
        showToast('任务已删除', 'success')
      } catch (error: any) {
        console.error('删除任务失败:', error)
        showToast(error?.message || '删除失败', 'error')
      }
    }
  }

  const resetForm = () => {
    setEditingTask(null)
    setFormData({
      projectId: '',
      title: '',
      description: '',
      assigneeId: '',
      priority: 'medium',
      status: 'todo',
      progress: 0,
      dueDate: ''
    })
  }

  const filteredTasks = tasks.filter(task => {
    if (filterProject && task.projectId !== filterProject) return false
    if (filterStatus && task.status !== filterStatus) return false
    return true
  })

  const priorityLabels = {
    high: { text: '高', color: 'bg-danger-100 text-danger-700', icon: '🔴' },
    medium: { text: '中', color: 'bg-warning-100 text-warning-700', icon: '🟡' },
    low: { text: '低', color: 'bg-success-100 text-success-700', icon: '🟢' }
  }

  const statusLabels = {
    todo: { text: '待处理', color: 'bg-slate-100 text-slate-700', dot: 'bg-slate-400' },
    in_progress: { text: '进行中', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
    completed: { text: '已完成', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' }
  }

  const getProjectName = (projectId: number) => {
    const project = projects.find(p => p.id === projectId)
    return project?.name || '未分配'
  }

  const getMemberName = (assigneeId: number | null) => {
    if (!assigneeId) return '未分配'
    const member = members.find(m => m.id === assigneeId)
    return member?.name || '未知'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 dark:border-slate-700 border-t-primary-600"></div>
          <span className="text-slate-500">加载中...</span>
        </div>
      </div>
    )
  }

  return (
    <PageContainer>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">任务管</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">管理所有工程任</p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setShowModal(true)
          }}
          className="btn btn-primary"
        >
          <span className="text-lg">+</span>
          新建任务
        </button>
      </div>

      {/* 筛选器 */}
      <div className="card p-4 mb-5 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600 font-medium">筛选项</label>
          <select
            value={filterProject}
            onChange={e => setFilterProject(e.target.value ? Number(e.target.value) : '')}
          className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
        >
          <option value="">全部项目</option>
          {projects.map(project => (
            <option key={project.id} value={project.id}>{project.name}</option>
          ))}
        </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600 font-medium">筛选状</label>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
          >
            <option value="">全部状态</option>
            {Object.entries(statusLabels).map(([value, { text }]) => (
              <option key={value} value={value}>{text}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 任务列表 */}
      {filteredTasks.length > 0 ? (
        <div className="space-y-4">
          {filteredTasks.map(task => (
            <div key={task.id} className="card p-5 group hover:-translate-y-0.5 transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-slate-800">{task.title}</h3>
                    <span className={`badge ${priorityLabels[task.priority]?.color}`}>
                      {priorityLabels[task.priority]?.icon} {priorityLabels[task.priority]?.text}
                    </span>
                    <span className={`badge ${statusLabels[task.status]?.color}`}>
                      <span className={`status-dot ${statusLabels[task.status]?.dot} mr-1`}></span>
                      {statusLabels[task.status]?.text}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">{task.description || '暂无描述'}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-sm">
                  <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1"><Icon name="FolderKanban" size={14} /> 所属项目</span>
                  <span className="ml-1 text-slate-700 dark:text-slate-200 font-medium">{getProjectName(task.projectId)}</span>
                </div>
                <div className="text-sm">
                  <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1"><Icon name="UserCircle" size={14} /> 负责人</span>
                  <span className="ml-1 text-slate-700 dark:text-slate-200 font-medium">{getMemberName(task.assigneeId)}</span>
                </div>
                <div className="text-sm">
                  <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1"><Icon name="Calendar" size={14} /> 截止日期:</span>
                  <span className="ml-1 text-slate-700 dark:text-slate-200 font-medium">{task.dueDate || '未设置'}</span>
                </div>
              </div>

              {/* 进度材*/}
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="text-slate-500">完成进度</span>
                  <span className="font-medium text-slate-700">{task.progress || 0}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${task.status === 'completed' ? 'bg-emerald-500' : task.status === 'in_progress' ? 'bg-blue-500' : 'bg-slate-400'}`}
                    style={{ width: `${task.progress || 0}%` }}
                  ></div>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                <button
                  onClick={() => handleEdit(task)}
                  className="btn btn-secondary btn-sm flex-1"
                >
                  <Icon name="Edit3" size={14} /> 编辑
                </button>
                <button
                  onClick={() => handleDelete(task.id)}
                  className="btn btn-ghost btn-sm text-danger-500 hover:bg-danger-50"
                >
                  <Icon name="Trash2" size={14} />删除
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <Icon name="ClipboardList" size={48} className="text-slate-300 mb-4" />
          <h3 className="empty-state-title">暂无任务</h3>
          <p className="empty-state-description mb-6">点击下方按钮创建您的第一个任务</p>
          <button
            onClick={() => {
              resetForm()
              setShowModal(true)
            }}
            className="btn btn-primary"
          >
            + 创建任务
          </button>
        </div>
      )}

      {/* 模态框 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white">
              <h2 className="text-xl font-semibold text-slate-800">
                {editingTask ? '编辑任务' : '新建任务'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">任务名称 *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">任务描述</label>
                  <textarea
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">所属项目*</label>
                  <select
                    value={formData.projectId}
                    onChange={e => setFormData({ ...formData, projectId: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  >
                    <option value="">请选择项目</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">负责人</label>
                    <select
                      value={formData.assigneeId}
                      onChange={e => setFormData({ ...formData, assigneeId: e.target.value ? Number(e.target.value) : '' })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="">请选择负责人</option>
                      {members.map(member => (
                        <option key={member.id} value={member.id}>{member.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">截止日期</label>
                    <input
                      type="date"
                      value={formData.dueDate}
                      onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">优先级</label>
                    <select
                      value={formData.priority}
                      onChange={e => setFormData({ ...formData, priority: e.target.value as Task['priority'] })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="high">高</option>
                      <option value="medium">中</option>
                      <option value="low">低</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">状</label>
                    <select
                      value={formData.status}
                      onChange={e => setFormData({ ...formData, status: e.target.value as Task['status'] })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="todo">待处理</option>
                      <option value="in_progress">进行中</option>
                      <option value="completed">已完成</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">进度 (%)</label>
                    <input
                      type="number"
                      value={formData.progress}
                      onChange={e => setFormData({ ...formData, progress: Number(e.target.value) })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      min="0"
                      max="100"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    resetForm()
                  }}
                  className="px-6 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                >
                  {editingTask ? '保存' : '创建'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
    </PageContainer>
  )
}

export default Tasks
