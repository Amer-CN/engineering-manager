// Users.tsx - 用户管理页面
import { RolePermissionsTab } from './RolePermissionsTab'

import React, { useState, useEffect } from 'react'
import { usePermission } from '../hooks/usePermission'
import { useAuth } from '../hooks/useAuth'
import { useToastStore } from '@/store/toastStore'
import { setCurrentUser } from '../types/permissions'
import type { UserInfo } from '../types/electron'
import { Icon } from './ui/Icon'
import { Tabs } from './ui/Tabs'
import { AuditLogsContent } from './AuditLogs'
import { SnapshotsTab } from './SnapshotsTab'

// 角色选项
const ROLE_OPTIONS = [
  { value: 'admin', label: '管理员' },
  { value: 'manager', label: '项目经理' },
  { value: 'accountant', label: '财务人员' },
  { value: 'worker', label: '普通员工' },
]

// 状态选项
const STATUS_OPTIONS = [
  { value: 'active', label: '启用' },
  { value: 'disabled', label: '禁用' },
]

const Users: React.FC = () => {
// @ts-ignore TS6133: can is declared but never read
  const { can, isAdmin } = usePermission()
  const auth = useAuth()
  const showToast = useToastStore(state => state.showToast)
  const [users, setUsers] = useState<UserInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingUser, setEditingUser] = useState<UserInfo | null>(null)
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    displayName: '',
    roleId: 'worker',
  })

  // Tab 和角色权限编辑
  const [activeTab, setActiveTab] = useState('user_list')



  // 同步权限用户：如果 AuthContext 中有用户但权限模块中没有，则同步
  useEffect(() => {
    if (auth.currentUser && !isAdmin()) {
      // 当前已登录用户，但权限模块中未设置，尝试同步
      console.log('🔄 同步权限用户数据:', auth.currentUser.username)
      const permissionsUser = {
        userId: auth.currentUser.userId,
        username: auth.currentUser.username,
        roleId: auth.currentUser.roleId,
        roleName: auth.currentUser.roleName,
        permissions: auth.currentUser.permissions as any
      }
      setCurrentUser(permissionsUser)
    }
  }, [auth.currentUser, isAdmin])

  // 加载用户列表
  const loadUsers = async () => {
    setLoading(true)
    try {
      if (!window.electronAPI?.getAllUsers) {
        throw new Error('API 未就绪')
      }
      const result = await window.electronAPI.getAllUsers()
      if (result.success && result.data) {
        setUsers(result.data)
      } else {
        throw new Error(result.error || '加载失败')
      }
    } catch (err: any) {
      showToast(err.message || '加载用户列表失败', 'error')
      console.error('加载用户失败:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  // 检查权限
  if (!isAdmin()) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <div className="text-4xl mb-3"><Icon name="Ban" size={48} /></div>
          <h2 className="text-xl font-semibold text-red-700 mb-2">权限不足</h2>
          <p className="text-red-600">只有管理员可以访问用户管理页面</p>
        </div>
      </div>
    )
  }

  // 处理创建/编辑表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingUser) {
        const updates: any = {}
        if (formData.displayName) updates.displayName = formData.displayName
        if (formData.roleId) updates.roleId = formData.roleId
        if (formData.password) updates.password = formData.password
        const result = await window.electronAPI.updateUser(editingUser.id, updates)
        if (result.success) {
          setEditingUser(null)
          setShowCreateForm(false)
          setFormData({ username: '', password: '', displayName: '', roleId: 'worker' })
          loadUsers()
          showToast('用户更新成功', 'success')
        } else {
          throw new Error(result.error)
        }
      } else {
        const result = await window.electronAPI.createUser(formData)
        if (result.success) {
          setShowCreateForm(false)
          setFormData({ username: '', password: '', displayName: '', roleId: 'worker' })
          loadUsers()
          showToast('用户创建成功', 'success')
        } else {
          throw new Error(result.error)
        }
      }
    } catch (err: any) {
      showToast(err.message || '操作失败', 'error')
    }
  }

  // 处理删除
  const handleDelete = async (userId: string) => {
    if (!confirm('确定删除该用户吗？此操作不可恢复。')) return
    try {
      const result = await window.electronAPI.deleteUser(userId)
      if (result.success) {
        loadUsers()
        showToast('用户已删除', 'success')
      } else {
        throw new Error(result.error)
      }
    } catch (err: any) {
      showToast(err.message || '删除失败', 'error')
    }
  }

  // 开始编辑
  const startEdit = (user: UserInfo) => {
    setEditingUser(user)
    setFormData({
      username: user.username,
      password: '',
      displayName: user.displayName,
      roleId: user.roleId,
    })
    setShowCreateForm(true)
  }

  // 获取角色标签
  const getRoleLabel = (roleId: string) => {
    const role = ROLE_OPTIONS.find(r => r.value === roleId)
    return role ? role.label : roleId
  }

  // 获取状态标签
  const getStatusLabel = (status: string) => {
    const statusOpt = STATUS_OPTIONS.find(s => s.value === status)
    return statusOpt ? statusOpt.label : status
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">用户管理</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">管理系统用户与权限</p>
        </div>
        {activeTab === 'user_list' && (
          <div className="flex gap-3">
            <button
              onClick={() => {
                setEditingUser(null)
                setFormData({ username: '', password: '', displayName: '', roleId: 'worker' })
                setShowCreateForm(true)
              }}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white font-medium rounded-xl transition-colors"
            >
              + 添加用户
            </button>
          </div>
        )}
      </div>

      {/* Tab 导航 */}
      <div className="mb-6">
        <Tabs
          value={activeTab}
          onChange={setActiveTab}
          tabs={[
            { key: 'user_list', label: '用户列表', icon: 'Users' },
            { key: 'role_permissions', label: '角色权限', icon: 'Shield' },
            { key: 'audit_logs', label: '操作日志', icon: 'ClipboardList' },
            { key: 'snapshots', label: '数据回滚', icon: 'RotateCcw' },
          ]}
        />
      </div>

      {/* 用户列表 Tab */}
      {activeTab === 'user_list' && (
      <>
      {/* 创建/编辑表单弹窗 */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-semibold text-slate-800">
                {editingUser ? '编辑用户' : '添加用户'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                  用户名 *
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={e => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="请输入用户名"
                  required
                  disabled={!!editingUser}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                  {editingUser ? '新密码（留空保持不变）' : '密码 *'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder={editingUser ? '留空保持不变' : '请输入密码'}
                  required={!editingUser}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                  显示名称 *
                </label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="请输入显示名称"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                  角色 *
                </label>
                <select
                  value={formData.roleId}
                  onChange={e => setFormData({ ...formData, roleId: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  {ROLE_OPTIONS.map(role => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-primary-600 hover:bg-primary-500 text-white font-medium rounded-xl transition-colors"
                >
                  {editingUser ? '保存修改' : '创建用户'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false)
                    setEditingUser(null)
                  }}
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-medium rounded-xl transition-colors"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 用户列表 */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="text-slate-500 dark:text-slate-400 mt-3">加载中...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-4xl mb-3"><Icon name="UserCircle" size={48} /></div>
            <h3 className="text-lg font-medium text-slate-700 dark:text-slate-200 mb-1">暂无用户</h3>
            <p className="text-slate-500">点击上方按钮添加用户</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-4 px-6 text-slate-700 dark:text-slate-200 font-medium">用户名</th>
                  <th className="text-left py-4 px-6 text-slate-700 dark:text-slate-200 font-medium">显示名称</th>
                  <th className="text-left py-4 px-6 text-slate-700 dark:text-slate-200 font-medium">角色</th>
                  <th className="text-left py-4 px-6 text-slate-700 dark:text-slate-200 font-medium">状态</th>
                  <th className="text-left py-4 px-6 text-slate-700 dark:text-slate-200 font-medium">创建时间</th>
                  <th className="text-left py-4 px-6 text-slate-700 dark:text-slate-200 font-medium">最后登录</th>
                  <th className="text-left py-4 px-6 text-slate-700 dark:text-slate-200 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} className="border-b border-slate-100 table-row-hover">
                    <td className="py-4 px-6 font-medium text-slate-800">{user.username}</td>
                    <td className="py-4 px-6">{user.displayName}</td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        user.roleId === 'admin' ? 'bg-red-100 text-red-700' :
                        user.roleId === 'manager' ? 'bg-blue-100 text-blue-700' :
                        user.roleId === 'accountant' ? 'bg-green-100 text-green-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {getRoleLabel(user.roleId)}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {getStatusLabel(user.status)}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-500">
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : '从未登录'}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(user)}
                          className="px-3 py-1.5 text-sm text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                        >
                          编辑
                        </button>
                        {user.roleId !== 'admin' && (
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            删除
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 权限提示 */}
      <div className="mt-6 p-4 bg-slate-50 rounded-xl text-sm text-slate-600">
        <p><Icon name="Lightbulb" size={16} className="inline-block mr-1" /><strong>权限说明：</strong>管理员拥有所有权限；项目经理可以管理项目和合同；财务人员负责工资和结算；普通员工只能查看基础信息。</p>
      </div>
      </>
      )}

      {activeTab === 'role_permissions' && <RolePermissionsTab />}

      {/* 操作日志 Tab */}
      {activeTab === 'audit_logs' && (
        <AuditLogsContent refresh={undefined} />
      )}

      {/* 数据回滚 Tab */}
      {activeTab === 'snapshots' && (
        <SnapshotsTab />
      )}
    </div>
  )
}

export default Users
