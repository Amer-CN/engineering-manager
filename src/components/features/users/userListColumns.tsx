import type { Column } from '@/components/DataTable'
import type { UserInfo } from '../../../types/electron'
import { StatusBadge, USER_STATUS } from '../../../constants/status'
import { Button } from '../../ui/Button'

export const ROLE_OPTIONS = [
  { value: 'admin', label: '管理员' },
  { value: 'manager', label: '项目经理' },
  { value: 'accountant', label: '财务人员' },
  { value: 'worker', label: '普通员工' },
]

export function getRoleLabel(roleId: string): string {
  const role = ROLE_OPTIONS.find(r => r.value === roleId)
  return role ? role.label : roleId
}

export interface UserListColumnsDeps {
  onEdit: (user: UserInfo) => void
  onDelete: (userId: string) => void
}

export function getUserListColumns(deps: UserListColumnsDeps): Column<UserInfo>[] {
  const { onEdit, onDelete } = deps

  return [
    {
      key: 'username',
      title: '用户名',
      render: (item) => (
        <span className="font-medium text-[color:var(--fg)]">{item.username}</span>
      )
    },
    {
      key: 'displayName',
      title: '显示名称',
      render: (item) => (
        <span>{item.displayName}</span>
      )
    },
    {
      key: 'roleId',
      title: '角色',
      filterable: 'select',
      filterOptions: ROLE_OPTIONS,
      filterAccessor: (item: UserInfo) => item.roleId,
      render: (item) => (
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          item.roleId === 'admin' ? 'bg-danger-100 text-danger-700' :
          item.roleId === 'manager' ? 'bg-[color:var(--accent-soft)] text-[color:var(--accent)]' :
          item.roleId === 'accountant' ? 'bg-success-100 text-success-700' :
          'bg-[color:var(--panel-2)] text-[color:var(--fg-2)]'
        }`}>
          {getRoleLabel(item.roleId)}
        </span>
      )
    },
    {
      key: 'status',
      title: '状态',
      filterable: 'select',
      filterOptions: [{ label: '正常', value: 'active' }, { label: '已禁用', value: 'disabled' }],
      filterAccessor: (item: UserInfo) => item.status,
      render: (item) => (
        <StatusBadge status={item.status} config={USER_STATUS} />
      )
    },
    {
      key: 'createdAt',
      title: '创建时间',
      sortable: true,
      sorter: (a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''),
      render: (item) => (
        <span className="text-[color:var(--muted)]">{new Date(item.createdAt).toLocaleDateString()}</span>
      )
    },
    {
      key: 'lastLoginAt',
      title: '最后登录',
      render: (item) => (
        <span className="text-[color:var(--muted)]">
          {item.lastLoginAt ? new Date(item.lastLoginAt).toLocaleString() : '从未登录'}
        </span>
      )
    },
    {
      key: 'actions',
      title: '操作',
      render: (item) => (
        <div className="flex gap-2">
          <Button
            onClick={() => onEdit(item)}
            
           variant="ghost" size="sm" className="text-[color:var(--accent)]">
            编辑
          </Button>
          {item.roleId !== 'admin' && (
            <Button
              onClick={() => onDelete(item.id)}
              
             variant="danger" size="sm">
              删除
            </Button>
          )}
        </div>
      )
    }
  ]
}
