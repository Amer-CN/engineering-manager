import { ipcMain } from 'electron'
import log from 'electron-log'
import { db, saveDatabase } from '../database'

const SYSTEM_ROLE_NAMES: Record<string, string> = {
  admin: '管理员', manager: '项目经理', accountant: '财务人员', worker: '普通员工',
}

const SYSTEM_ROLE_DEFAULTS: Record<string, string[]> = {
  admin: [
    'dashboard:read', 'dashboard:export',
    'projects:create', 'projects:read', 'projects:update', 'projects:delete', 'projects:export', 'projects:import',
    'contracts:create', 'contracts:read', 'contracts:update', 'contracts:delete', 'contracts:approve', 'contracts:export', 'contracts:import',
    'partners:create', 'partners:read', 'partners:update', 'partners:delete', 'partners:export', 'partners:import',
    'members:create', 'members:read', 'members:update', 'members:delete', 'members:export', 'members:import',
    'wages:create', 'wages:read', 'wages:update', 'wages:delete', 'wages:approve', 'wages:export',
    'settlement:create', 'settlement:read', 'settlement:update', 'settlement:delete', 'settlement:approve', 'settlement:export',
    'inventory:create', 'inventory:read', 'inventory:update', 'inventory:delete', 'inventory:export', 'inventory:import',
    'invoices:create', 'invoices:read', 'invoices:update', 'invoices:delete', 'invoices:export',
    'expenses:create', 'expenses:read', 'expenses:update', 'expenses:delete', 'expenses:export',
    'costLedger:create', 'costLedger:read', 'costLedger:update', 'costLedger:delete', 'costLedger:export',
    'drawings:create', 'drawings:read', 'drawings:update', 'drawings:delete', 'drawings:export', 'drawings:import',
    'settings:read', 'settings:update', 'users:create', 'users:read', 'users:update', 'users:delete',
    'roles:read', 'roles:update', 'audit_logs:read', 'audit_logs:export',
  ],
  manager: [
    'dashboard:read', 'dashboard:export',
    'projects:create', 'projects:read', 'projects:update', 'projects:delete', 'projects:export', 'projects:import',
    'contracts:create', 'contracts:read', 'contracts:update', 'contracts:approve', 'contracts:export', 'contracts:import',
    'partners:create', 'partners:read', 'partners:update', 'partners:export',
    'members:create', 'members:read', 'members:update', 'members:export',
    'wages:read', 'wages:export',
    'settlement:create', 'settlement:read', 'settlement:update', 'settlement:export',
    'inventory:create', 'inventory:read', 'inventory:update', 'inventory:export', 'inventory:import',
    'invoices:read', 'invoices:export',
    'expenses:create', 'expenses:read', 'expenses:update', 'expenses:export',
    'costLedger:create', 'costLedger:read', 'costLedger:update', 'costLedger:export',
    'drawings:create', 'drawings:read', 'drawings:update', 'drawings:export', 'drawings:import',
  ],
  accountant: [
    'dashboard:read', 'dashboard:export', 'projects:read', 'projects:export',
    'contracts:read', 'contracts:approve', 'contracts:export', 'partners:read', 'partners:export',
    'members:read', 'members:export',
    'wages:create', 'wages:read', 'wages:update', 'wages:approve', 'wages:export',
    'settlement:create', 'settlement:read', 'settlement:update', 'settlement:approve', 'settlement:export',
    'inventory:read', 'inventory:export',
    'invoices:create', 'invoices:read', 'invoices:update', 'invoices:delete', 'invoices:export',
    'expenses:create', 'expenses:read', 'expenses:update', 'expenses:delete', 'expenses:export',
    'costLedger:create', 'costLedger:read', 'costLedger:update', 'costLedger:delete', 'costLedger:export',
    'audit_logs:read', 'audit_logs:export',
  ],
  worker: [
    'dashboard:read', 'projects:read', 'projects:export', 'contracts:read', 'contracts:export',
    'partners:read', 'members:read', 'inventory:read', 'inventory:export',
    'invoices:read', 'expenses:read', 'expenses:export',
    'costLedger:read', 'costLedger:export', 'drawings:read',
  ],
}

export function getRoleName(roleId: string): string {
  const customRole = db.roles?.find(r => r.id === roleId)
  if (customRole) return customRole.name
  return SYSTEM_ROLE_NAMES[roleId] || roleId
}

export function getRolePermissions(roleId: string): string[] {
  const customRole = db.roles?.find(r => r.id === roleId)
  if (customRole?.permissions) return customRole.permissions
  return SYSTEM_ROLE_DEFAULTS[roleId] || []
}

ipcMain.handle('roles:getAll', async () => {
  try {
    if (!db.roles) db.roles = []
    return { success: true, data: db.roles }
  } catch (error: any) { log.error('roles:getAll error:', error); return { success: false, error: error.message } }
})

ipcMain.handle('roles:update', async (_event, roleId: string, permissions: string[]) => {
  try {
    if (!db.roles) db.roles = []
    const role = db.roles.find(r => r.id === roleId)
    if (!role) return { success: false, error: 'Role not found' }
    role.permissions = permissions
    saveDatabase()
    return { success: true }
  } catch (error: any) { log.error('roles:update error:', error); return { success: false, error: error.message } }
})

ipcMain.handle('roles:reset', async (_event, roleId: string) => {
  try {
    if (!db.roles) db.roles = []
    const defaults = SYSTEM_ROLE_DEFAULTS[roleId]
    if (!defaults) return { success: false, error: 'No defaults for role: ' + roleId }
    const role = db.roles.find(r => r.id === roleId)
    if (!role) return { success: false, error: 'Role not found' }
    role.permissions = [...defaults]
    saveDatabase()
    return { success: true, data: { permissions: [...defaults] } }
  } catch (error: any) { log.error('roles:reset error:', error); return { success: false, error: error.message } }
})
