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
        <span className="font-medium text-slate-800">{item.username}</span>
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
          item.roleId === 'admin' ? 'bg-red-100 text-red-700' :
          item.roleId === 'manager' ? 'bg-blue-100 text-blue-700' :
          item.roleId === 'accountant' ? 'bg-green-100 text-green-700' :
          'bg-slate-100 text-slate-700'
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
        <span className="text-slate-500">{new Date(item.createdAt).toLocaleDateString()}</span>
      )
    },
    {
      key: 'lastLoginAt',
      title: '最后登录',
      render: (item) => (
        <span className="text-slate-500">
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
            
           variant="ghost" size="sm" className="text-primary-600">
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
