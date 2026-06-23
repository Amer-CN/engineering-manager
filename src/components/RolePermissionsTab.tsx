import React, { useState, useEffect } from 'react'
import { TABLE } from '@/constants/table'
import { useToastStore } from '@/store/toastStore'
import { useConfirm } from '@/hooks/useConfirm'
import { Spinner } from './ui/Loading/Loading'
import { SYSTEM_ROLES, RESOURCE_LABELS, ACTION_LABELS, getPermissionLabel } from '../types/permissions'
import type { PermissionResource, PermissionAction, PermissionCode } from '../types/permissions'
import { Icon } from './ui/Icon'
import { Card } from './ui/Card'
import { getAPI } from '@/services/api-adapter'

const resourceKeys: PermissionResource[] = ['dashboard', 'projects', 'contracts', 'partners', 'members', 'wages', 'settlement', 'inventory', 'invoices', 'costLedger', 'drawings', 'settings', 'users', 'roles', 'audit_logs']
const actionKeys: PermissionAction[] = ['read', 'create', 'update', 'delete', 'export', 'import', 'approve']

export const RolePermissionsTab: React.FC = () => {
  const showToast = useToastStore(state => state.showToast)
  const { confirm, ConfirmDialog } = useConfirm()
  const [roles, setRoles] = useState<{ id: string; name: string; description: string; isSystem: boolean; permissions: string[] }[]>([])
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null)
  const [editingPermissions, setEditingPermissions] = useState<string[]>([])
  const [rolesLoading, setRolesLoading] = useState(false)

  const loadRoles = async () => {
  setRolesLoading(true)
  try {
  const api = await getAPI()
  if (api?.getRoles) {
  const result = await api.getRoles()
  if (result.success && result.data) { setRoles(result.data); setRolesLoading(false); return }
  }
  } catch (e) { console.error(e) }
  setRoles(SYSTEM_ROLES.map(r => ({ ...r, permissions: [...r.permissions] })))
  setRolesLoading(false)
  }

  useEffect(() => { loadRoles() }, [])

  const startEditRole = (roleId: string) => {
  const role = roles.find(r => r.id === roleId)
  if (role) { setEditingRoleId(roleId); setEditingPermissions([...role.permissions]) }
  }

  const togglePermission = (code: PermissionCode) => {
  setEditingPermissions(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code])
  }

  const handleSavePermissions = async () => {
  if (!editingRoleId) return
  try {
  const api = await getAPI()
  if (api?.updateRole) {
  const result = await api.updateRole(editingRoleId, editingPermissions)
  if (result.success) { showToast('角色权限已保存', 'success'); loadRoles(); setEditingRoleId(null); return }
  }
  const systemRole = SYSTEM_ROLES.find(r => r.id === editingRoleId)
  if (systemRole) { systemRole.permissions = [...editingPermissions] as any; showToast('角色权限已保存（仅本地生效）', 'success') }
  } catch (e: any) { showToast(e?.message || '保存失败', 'error') }
  setEditingRoleId(null); loadRoles()
  }

  const handleResetRole = async (roleId: string) => {
  const ok = await confirm({ title: '确认重置', content: '确定要重置此角色的权限为默认值吗？', confirmVariant: 'danger' })
  if (!ok) return
  try { const api = await getAPI(); if (api?.resetRole) { await api.resetRole(roleId); loadRoles() } } catch {}
  }

  if (editingRoleId) return (
  <Card bordered={false} className="p-6">
  {ConfirmDialog}
  <div className="flex items-center justify-between mb-4">
  <h3 className="text-lg font-semibold text-slate-800">
  编辑权限 - {roles.find(r => r.id === editingRoleId)?.name || editingRoleId}
  </h3>
  <button onClick={() => setEditingRoleId(null)} className="px-3 py-1 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"><Icon name="X" size={14} /> 返回</button>
  </div>
  <div className="overflow-x-auto">
  <table className={TABLE.table}>
  <thead className={`${TABLE.headerRow} ${TABLE.stickyHeader}`}><tr><th className={TABLE.headerCell}>资源</th>{actionKeys.map(a => <th key={a} className={`${TABLE.headerCell} text-center`}>{ACTION_LABELS[a] || a}</th>)}</tr></thead>
  <tbody>
  {resourceKeys.map(resource => (
  <tr key={resource} className={TABLE.bodyRow}><td className={`${TABLE.bodyCell} font-medium`}>{RESOURCE_LABELS[resource] || resource}</td>
  {actionKeys.map(action => {
  const code = `${resource}:${action}` as PermissionCode
  return (<td key={action} className={`${TABLE.bodyCell} text-center`}><input type="checkbox" checked={editingPermissions.includes(code)} onChange={() => togglePermission(code)} className="w-4 h-4 text-primary-600 rounded" /></td>)
  })}
  </tr>
  ))}
  </tbody>
  </table>
  </div>
  <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
  <button onClick={() => setEditingRoleId(null)} className="btn btn-secondary">取消</button>
  <button onClick={handleSavePermissions} className="btn btn-primary">保存权限</button>
  </div>
  </Card>
  )

  return rolesLoading ? (
  <div className="flex items-center justify-center py-12"><Spinner size="md" /></div>
  ) : (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {ConfirmDialog}
  {roles.map(role => (
  <Card bordered={false} hoverable className="p-5 hover:shadow-md transition-all">
  <div className="flex items-start justify-between mb-3"><div><h4 className="font-semibold text-slate-800">{role.name}</h4><p className="text-xs text-slate-500 mt-0.5">{role.description}</p></div>{role.isSystem && <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-full">系统</span>}</div>
  <div className="flex flex-wrap gap-1 mb-4">{role.permissions.slice(0, 8).map(p => <span key={p} className="px-2 py-0.5 bg-primary-50 text-primary-700 text-xs rounded">{getPermissionLabel(p as PermissionCode)}</span>)}{role.permissions.length > 8 && <span className="px-2 py-0.5 bg-slate-50 text-slate-500 text-xs rounded">+{role.permissions.length - 8}</span>}</div>
  <div className="flex items-center gap-2 pt-3 border-t border-slate-100"><button onClick={() => startEditRole(role.id)} className="flex-1 px-3 py-1.5 text-xs font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700">编辑权限</button>{role.isSystem && <button onClick={() => handleResetRole(role.id)} className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg">重置</button>}</div>
  </Card>
  ))}
  </div>
  )
}
