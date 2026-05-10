/**
 * 权限管理模块
 * 
 * 包含：权限定义、角色配置、权限检查
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 权限定义
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 权限操作类型
 */
export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'export' | 'import' | 'approve'

/**
 * 资源类型（与页面 ID 对应）
 */
export type PermissionResource = 
  | 'dashboard'
  | 'projects'
  | 'contracts'
  | 'partners'
  | 'members'
  | 'wages'
  | 'settlement'
  | 'inventory'
  | 'invoices'
  | 'expenses'
  | 'costLedger'
  | 'drawings'
  | 'settings'
  | 'users'
  | 'roles'
  | 'audit_logs'

/**
 * 权限定义
 */
export interface Permission {
  resource: PermissionResource
  actions: PermissionAction[]
  description: string
}

/**
 * 权限编码格式: resource:action
 * 例如: projects:create, contracts:read, invoices:delete
 */
export type PermissionCode = `${PermissionResource}:${PermissionAction}`

// ═══════════════════════════════════════════════════════════════════════════════
// 角色定义
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 系统角色
 */
export type SystemRole = 'admin' | 'manager' | 'accountant' | 'worker'

/**
 * 角色定义
 */
export interface Role {
  id: string
  name: string
  description: string
  isSystem: boolean  // 是否为系统内置角色
  permissions: PermissionCode[]
}

/**
 * 系统预定义角色
 */
export const SYSTEM_ROLES: Role[] = [
  {
    id: 'admin',
    name: '管理员',
    description: '系统管理员，拥有所有权限',
    isSystem: true,
    permissions: [
      // 所有资源的完全权限
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
      'drawings:create', 'drawings:read', 'drawings:update', 'drawings:delete', 'drawings:export', 'drawings:import',
      'settings:read', 'settings:update',
      'users:create', 'users:read', 'users:update', 'users:delete',
      'roles:read', 'roles:update',
      'audit_logs:read', 'audit_logs:export',
    ],
  },
  {
    id: 'manager',
    name: '项目经理',
    description: '项目管理人员，拥有项目相关所有权限',
    isSystem: true,
    permissions: [
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
      'drawings:create', 'drawings:read', 'drawings:update', 'drawings:export', 'drawings:import',
    ],
  },
  {
    id: 'accountant',
    name: '财务人员',
    description: '财务管理人员，负责账务和发票',
    isSystem: true,
    permissions: [
      'dashboard:read', 'dashboard:export',
      'projects:read', 'projects:export',
      'contracts:read', 'contracts:approve', 'contracts:export',
      'partners:read', 'partners:export',
      'members:read', 'members:export',
      'wages:create', 'wages:read', 'wages:update', 'wages:approve', 'wages:export',
      'settlement:create', 'settlement:read', 'settlement:update', 'settlement:approve', 'settlement:export',
      'inventory:read', 'inventory:export',
      'invoices:create', 'invoices:read', 'invoices:update', 'invoices:delete', 'invoices:export',
      'expenses:create', 'expenses:read', 'expenses:update', 'expenses:delete', 'expenses:export',
      'audit_logs:read', 'audit_logs:export',
    ],
  },
  {
    id: 'worker',
    name: '普通员工',
    description: '普通员工，只有查看权限',
    isSystem: true,
    permissions: [
      'dashboard:read',
      'projects:read', 'projects:export',
      'contracts:read', 'contracts:export',
      'partners:read',
      'members:read',
      'inventory:read', 'inventory:export',
      'invoices:read',
      'expenses:read', 'expenses:export',
      'drawings:read',
    ],
  },
]

// ═══════════════════════════════════════════════════════════════════════════════
// 用户权限上下文
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 用户权限上下文
 */
export interface AuthContext {
  userId: string
  username: string
  roleId: string
  roleName: string
  permissions: PermissionCode[]
}

/**
 * 当前登录用户（简化版，可替换为真实用户系统）
 */
let currentUser: AuthContext | null = null

/**
 * 设置当前用户
 */
export function setCurrentUser(user: AuthContext | null): void {
  currentUser = user
}

/**
 * 获取当前用户
 */
export function getCurrentUser(): AuthContext | null {
  return currentUser
}

/**
 * 检查是否已登录
 */
export function isAuthenticated(): boolean {
  return currentUser !== null
}

// ═══════════════════════════════════════════════════════════════════════════════
// 权限检查函数
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 检查是否拥有指定权限
 */
export function hasPermission(permission: PermissionCode): boolean {
  if (!currentUser) return false
  return currentUser.permissions.includes(permission)
}

/**
 * 检查是否拥有所有指定权限
 */
export function hasAllPermissions(permissions: PermissionCode[]): boolean {
  if (!currentUser) return false
  return permissions.every(p => currentUser!.permissions.includes(p))
}

/**
 * 检查是否拥有任一指定权限
 */
export function hasAnyPermission(permissions: PermissionCode[]): boolean {
  if (!currentUser) return false
  return permissions.some(p => currentUser!.permissions.includes(p))
}

/**
 * 检查是否为管理员
 */
export function isAdmin(): boolean {
  return currentUser?.roleId === 'admin'
}

/**
 * 检查是否拥有指定角色
 */
export function hasRole(roleId: string): boolean {
  return currentUser?.roleId === roleId
}

/**
 * 获取用户的角色定义
 */
export function getUserRole(): Role | undefined {
  if (!currentUser) return undefined
  return SYSTEM_ROLES.find(r => r.id === currentUser!.roleId)
}

// ═══════════════════════════════════════════════════════════════════════════════
// 权限配置辅助
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 资源权限标签映射
 */
export const RESOURCE_LABELS: Record<PermissionResource, string> = {
  dashboard: '首页看板',
  projects: '项目管理',
  contracts: '合同管理',
  partners: '单位管理',
  members: '员工管理',
  wages: '工资管理',
  settlement: '结算办理',
  inventory: '仓库管理',
  invoices: '发票管理',
  expenses: '成本管理',
  costLedger: '成本台账',
  drawings: '图纸管理',
  settings: '系统设置',
  users: '用户管理',
  roles: '角色管理',
  audit_logs: '审计日志',
}

/**
 * 操作权限标签映射
 */
export const ACTION_LABELS: Record<PermissionAction, string> = {
  create: '新增',
  read: '查看',
  update: '编辑',
  delete: '删除',
  export: '导出',
  import: '导入',
  approve: '审批',
}

/**
 * 获取权限的显示名称
 */
export function getPermissionLabel(permission: PermissionCode): string {
  const [resource, action] = permission.split(':') as [PermissionResource, PermissionAction]
  return `${RESOURCE_LABELS[resource] || resource}:${ACTION_LABELS[action] || action}`
}
