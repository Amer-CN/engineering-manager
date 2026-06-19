// Users.tsx - 用户管理页面
import { RolePermissionsTab } from './RolePermissionsTab'

import React, { useState, useEffect } from 'react'
import { usePermission } from '../hooks/usePermission'
import { useAuth } from '../hooks/useAuth'
import { useToastStore } from '@/store/toastStore'
import { useConfirm } from '@/hooks/useConfirm'
import { Modal } from './ui/Modal/Modal'
import { Input } from './ui/Input/Input'
import { setCurrentUser } from '../types/permissions'
import type { UserInfo } from '../types/electron'
import { Icon } from './ui/Icon'

import PageHeader from './ui/PageHeader'
import { Tabs } from './ui/Tabs'
import { AuditLogsContent } from './AuditLogs'
import { SnapshotsTab } from './SnapshotsTab'
import { ProjectAuthorizationsTab } from '@/components/features/users/ProjectAuthorizationsTab'
import { DataTable } from '@/components/DataTable'
import { getAPI } from '@/services/api-adapter'
import { getUserListColumns, ROLE_OPTIONS } from './features/users/userListColumns'

const Users: React.FC = () => {
  const { isAdmin } = usePermission()
  const auth = useAuth()
  const showToast = useToastStore(state => state.showToast)
  const { confirm, ConfirmDialog } = useConfirm()
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
      const api = await getAPI()
      if (!api?.getAllUsers) {
        throw new Error('API 未就绪')
      }
      const result = await api.getAllUsers()
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
        const result = await (await getAPI()).updateUser(editingUser.id, updates)
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
        const result = await (await getAPI()).createUser(formData)
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
    const ok = await confirm({ title: '确认删除', content: '确定删除该用户吗？此操作不可恢复。', confirmVariant: 'danger' })
    if (!ok) return
    try {
      const result = await (await getAPI()).deleteUser(userId)
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

  const columns = getUserListColumns({
    onEdit: startEdit,
    onDelete: handleDelete,
  })

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {ConfirmDialog}
      <PageHeader title="用户管理" subtitle="管理系统用户与权限"
        actions={activeTab === 'user_list' ? (
          <button onClick={() => { setEditingUser(null); setFormData({ username: '', password: '', displayName: '', roleId: 'worker' }); setShowCreateForm(true) }}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white font-medium rounded-xl transition-colors">
            + 添加用户
          </button>
        ) : undefined}
      />

      {/* Tab 导航 */}
      <div className="mb-6">
        <Tabs
          value={activeTab}
          onChange={setActiveTab}
          tabs={[
            { key: 'user_list', label: '用户列表', icon: 'Users' },
            { key: 'role_permissions', label: '角色权限', icon: 'Shield' },
            { key: 'project_authorizations', label: '项目授权', icon: 'KeyRound' },
            { key: 'audit_logs', label: '操作日志', icon: 'ClipboardList' },
            { key: 'snapshots', label: '数据回滚', icon: 'RotateCcw' },
          ]}
        />
      </div>

      {/* 用户列表 Tab */}
      {activeTab === 'user_list' && (
        <>
          {/* 创建/编辑表单弹窗 */}
          <Modal isOpen={showCreateForm} onClose={() => { setShowCreateForm(false); setEditingUser(null) }}
            title={editingUser ? '编辑用户' : '添加用户'} size="md"
            footer={<>
              <button type="button" onClick={() => { setShowCreateForm(false); setEditingUser(null) }}
                className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors">取消</button>
              <button type="submit" form="user-form"
                className="flex-1 px-4 py-3 bg-primary-600 hover:bg-primary-500 text-white font-medium rounded-xl transition-colors">
                {editingUser ? '保存修改' : '创建用户'}
              </button>
            </>}>
            <form id="user-form" onSubmit={handleSubmit} className="space-y-5">
              <Input label="用户名" size="sm" type="text" required value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })}
                placeholder="请输入用户名" disabled={!!editingUser} />
              <Input label={editingUser ? '新密码（留空保持不变）' : '密码'} size="sm" type="password" required={!editingUser}
                value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })}
                placeholder={editingUser ? '留空保持不变' : '请输入密码'} />
              <Input label="显示名称" size="sm" type="text" required value={formData.displayName} onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                placeholder="请输入显示名称" />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">角色 *</label>
                <select value={formData.roleId} onChange={e => setFormData({ ...formData, roleId: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                  {ROLE_OPTIONS.map(role => <option key={role.value} value={role.value}>{role.label}</option>)}
                </select>
              </div>
            </form>
          </Modal>

          {/* 用户列表 */}
          <DataTable
            data={users}
            columns={columns}
            rowKey="id"
            loading={loading}
            emptyText="暂无用户"
            emptyIcon="UserCircle"
            useHoverScrollbar
            scrollClassName="h-full"
          />

          {/* 权限提示 */}
          <div className="mt-6 p-4 bg-slate-50 rounded-xl text-sm text-slate-600">
            <p><Icon name="Lightbulb" size={16} className="inline-block mr-1" /><strong>权限说明：</strong>管理员拥有所有权限；项目经理可以管理项目和合同；财务人员负责工资和结算；普通员工只能查看基础信息。</p>
          </div>
        </>
      )}

      {activeTab === 'role_permissions' && <RolePermissionsTab />}
      {activeTab === 'project_authorizations' && <ProjectAuthorizationsTab />}

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
