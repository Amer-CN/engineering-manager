import { RolePermissionsTab } from './RolePermissionsTab'

import React, { useState, useEffect } from 'react'
import { usePermission } from '../hooks/usePermission'
import { useAuth } from '../hooks/useAuth'
import { setCurrentUser } from '../types/permissions'
import type { UserInfo } from '../types/electron'
import { Icon } from './ui/Icon'
import PageContainer from './ui/PageContainer'
import PageHeader from './ui/PageHeader'
import { Tabs } from './ui/Tabs'
import { AuditLogsContent } from './AuditLogs'
import { ProjectAuthorizationsTab } from '@/components/features/users/ProjectAuthorizationsTab'
import { getAPI } from '@/services/api-adapter'
import { UserListTab } from './UserListTab'
import { useHasFeature } from '@/store/editionStore'
import { EDITION_FEATURE_KEYS } from '@/constants/editionFeatures'

const Users: React.FC = () => {
  const { isAdmin } = usePermission()
  const auth = useAuth()
  // F3: Tab 级能力 gate（防御性——整页已被 UserManagement gate 冻结，双保险）
  const hasRoleManagement = useHasFeature(EDITION_FEATURE_KEYS.RoleManagement)
  const hasProjectAuthorization = useHasFeature(EDITION_FEATURE_KEYS.ProjectAuthorization)
  const [users, setUsers] = useState<UserInfo[]>([])
  const [activeTab, setActiveTab] = useState('user_list')

  useEffect(() => {
    if (auth.currentUser && !isAdmin()) {
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

  const loadUsers = async () => {
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
      console.error('加载用户失败:', err)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  if (!isAdmin()) {
    return (
      <div className="p-6">
        <div className="bg-danger-50 border border-danger-200 rounded-xl p-6 text-center">
          <div className="text-4xl mb-3"><Icon name="Ban" size={48} /></div>
          <h2 className="text-xl font-semibold text-danger-700 mb-2">权限不足</h2>
          <p className="text-danger-600">只有管理员可以访问用户管理页面</p>
        </div>
      </div>
    )
  }

  return (
    <PageContainer>
      <PageHeader title="用户管理" subtitle="管理系统用户与权限"
        actions={activeTab === 'user_list' ? (
          <div />
        ) : undefined}
      />

      <div className="mb-6">
        <Tabs
          value={activeTab}
          onChange={setActiveTab}
          tabs={[
            { key: 'user_list', label: '用户列表', icon: 'Users' },
            ...(hasRoleManagement ? [{ key: 'role_permissions', label: '角色权限', icon: 'Shield' as const }] : []),
            ...(hasProjectAuthorization ? [{ key: 'project_authorizations', label: '项目授权', icon: 'KeyRound' as const }] : []),
            { key: 'audit_logs', label: '操作日志', icon: 'ClipboardList' },
          ]}
        />
      </div>

      {activeTab === 'user_list' && <UserListTab users={users} onRefresh={loadUsers} />}

      {activeTab === 'role_permissions' && hasRoleManagement && <RolePermissionsTab />}
      {activeTab === 'project_authorizations' && hasProjectAuthorization && <ProjectAuthorizationsTab />}

      {activeTab === 'audit_logs' && (
        <AuditLogsContent refresh={undefined} />
      )}
    </PageContainer>
  )
}

export default Users
