import React, { useState } from 'react'
import { useToastStore } from '@/store/toastStore'
import { useConfirm } from '@/hooks/useConfirm'
import { Drawer } from './ui/Drawer'
import { Input } from './ui/Input/Input'
import type { UserInfo } from '../types/electron'
import { Icon } from './ui/Icon'
import { DataTable } from '@/components/DataTable'
import { getAPI } from '@/services/api-adapter'
import { getUserListColumns, ROLE_OPTIONS } from './features/users/userListColumns'

interface UserListTabProps {
  users: UserInfo[]
  onRefresh: () => void
}

export const UserListTab: React.FC<UserListTabProps> = ({ users, onRefresh }) => {
  const showToast = useToastStore(state => state.showToast)
  const { confirm, ConfirmDialog } = useConfirm()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingUser, setEditingUser] = useState<UserInfo | null>(null)
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    displayName: '',
    roleId: 'worker',
  })

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
          onRefresh()
          showToast('用户更新成功', 'success')
        } else {
          throw new Error(result.error)
        }
      } else {
        const result = await (await getAPI()).createUser(formData)
        if (result.success) {
          setShowCreateForm(false)
          setFormData({ username: '', password: '', displayName: '', roleId: 'worker' })
          onRefresh()
          showToast('用户创建成功', 'success')
        } else {
          throw new Error(result.error)
        }
      }
    } catch (err: any) {
      showToast(err.message || '操作失败', 'error')
    }
  }

  const handleDelete = async (userId: string) => {
    const ok = await confirm({ title: '确认删除', content: '确定删除该用户吗？此操作不可恢复。', confirmVariant: 'danger' })
    if (!ok) return
    try {
      const result = await (await getAPI()).deleteUser(userId)
      if (result.success) {
        onRefresh()
        showToast('用户已删除', 'success')
      } else {
        throw new Error(result.error)
      }
    } catch (err: any) {
      showToast(err.message || '删除失败', 'error')
    }
  }

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
    <>
      {ConfirmDialog}
      <Drawer open={showCreateForm} onClose={() => { setShowCreateForm(false); setEditingUser(null) }}
        icon="UserCog" title={editingUser ? '编辑用户' : '添加用户'}
        footer={<div className="flex items-center gap-3">
          <button type="button" onClick={() => { setShowCreateForm(false); setEditingUser(null) }}
            className="px-4 py-3 bg-[color:var(--panel-2)] hover:bg-[color:var(--panel-2)] text-[color:var(--fg-2)] font-medium rounded-xl transition-colors">取消</button>
          <button type="submit" form="user-form"
            className="flex-1 px-4 py-3 bg-[color:var(--fg)] hover:opacity-90 text-[color:var(--bg)] font-medium rounded-xl transition-colors">
            {editingUser ? '保存修改' : '创建用户'}
          </button>
        </div>}>
        <form id="user-form" onSubmit={handleSubmit} className="space-y-5 px-6 py-4">
          <Input label="用户名" size="sm" type="text" required value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })}
            placeholder="请输入用户名" disabled={!!editingUser} />
          <Input label={editingUser ? '新密码（留空保持不变）' : '密码'} size="sm" type="password" required={!editingUser}
            value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })}
            placeholder={editingUser ? '留空保持不变' : '请输入密码'} />
          <Input label="显示名称" size="sm" type="text" required value={formData.displayName} onChange={e => setFormData({ ...formData, displayName: e.target.value })}
            placeholder="请输入显示名称" />
          <div>
            <label className="block text-sm font-medium text-[color:var(--fg-2)] mb-2">角色 *</label>
            <select value={formData.roleId} onChange={e => setFormData({ ...formData, roleId: e.target.value })}
              className="w-full px-4 py-3 bg-[color:var(--panel-2)] border border-[color:var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-soft)] focus:border-[color:var(--accent)]">
              {ROLE_OPTIONS.map(role => <option key={role.value} value={role.value}>{role.label}</option>)}
            </select>
          </div>
        </form>
      </Drawer>

      <DataTable
        data={users}
        columns={columns}
        rowKey="id"
        emptyText="暂无用户"
        emptyIcon="UserCircle"
        useHoverScrollbar
        scrollClassName="h-full"
      />

      <div className="mt-6 p-4 bg-[color:var(--panel-2)] rounded-xl text-sm text-[color:var(--fg-2)]">
        <p><Icon name="Lightbulb" size={16} className="inline-block mr-1" /><strong>权限说明：</strong>管理员拥有所有权限；项目经理可以管理项目和合同；财务人员负责工资和结算；普通员工只能查看基础信息。</p>
      </div>
    </>
  )
}
