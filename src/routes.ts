/**
 * 路由配置文件
 * 
 * 集中管理所有页面路由的元数据
 * 支持：ID、标签、图标、快捷键、面包屑等
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 页面类型定义
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 合同管理子视图
 */
export type ContractView = 'dashboard' | 'income' | 'expense'

/**
 * 页面 ID 枚举
 */
export type PageId =
  | 'dashboard'
  | 'projects'
  | 'contracts'
  | 'partners'
  | 'members'
  | 'expenses'
  | 'costLedger'
  | 'drawings'
  | 'wages'
  | 'settlement'
  | 'templates'
  | 'inventory'
  | 'invoices'
  | 'settings'
  | 'users'

/**
 * 路由元数据
 */
export interface RouteMeta {
  /** 路由 ID */
  id: PageId
  /** 显示标签 */
  label: string
  /** 图标 emoji */
  icon: string
  /** 快捷键 */
  shortcut?: string
  /** 父路由 ID */
  parentId?: PageId
  /** 是否在侧边栏显示 */
  showInSidebar?: boolean
  /** 是否为系统页面 */
  isSystem?: boolean
  /** 路由描述 */
  description?: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// 路由配置
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 所有页面路由配置
 */
export const routes: RouteMeta[] = [
  // ─────────────────────────────────────────────────────────────────────────────
  // 核心业务模块
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'dashboard',
    label: '首页',
    icon: 'LayoutDashboard',
    shortcut: 'G D',
    description: '数据概览与统计',
  },
  {
    id: 'projects',
    label: '项目管理',
    icon: 'FolderKanban',
    shortcut: 'G P',
    description: '项目信息、任务、材料、费用等',
  },
  {
    id: 'contracts',
    label: '合同管理',
    icon: 'FileText',
    shortcut: 'G C',
    description: '收入合同与支出合同',
  },
  {
    id: 'partners',
    label: '单位管理',
    icon: 'Building2',
    shortcut: 'G O',
    description: '合作单位与监管单位',
  },
  {
    id: 'members',
    label: '员工管理',
    icon: 'Users',
    shortcut: 'G M',
    description: '管理人员与农民工',
  },
  
  // ─────────────────────────────────────────────────────────────────────────────
  // 财务模块
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'wages',
    label: '工资管理',
    icon: 'Wallet',
    shortcut: 'G W',
    description: '农民工工资核算与发放',
  },
  {
    id: 'settlement',
    label: '结算办理',
    icon: 'ClipboardList',
    shortcut: 'G J',
    description: '结算单编制与审核',
  },
  {
    id: 'templates',
    label: '模板管理',
    icon: 'FileText',
    shortcut: 'G T',
    description: '文档模板管理与生成',
  },
  {
    id: 'invoices',
    label: '发票管理',
    icon: 'Receipt',
    shortcut: 'G V',
    description: '收票与开票管理',
  },
  {
    id: 'costLedger',
    label: '成本台账',
    icon: 'ClipboardList',
    shortcut: 'G L',
    description: '真实项目成本追踪',
  },
  {
    id: 'expenses',
    label: '成本管理',
    icon: 'DollarSign',
    shortcut: 'G E',
    description: '项目成本与支出',
    showInSidebar: false,
  },
  
  // ─────────────────────────────────────────────────────────────────────────────
  // 资产模块
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'inventory',
    label: '仓库管理',
    icon: 'Package',
    shortcut: 'G I',
    description: '物料采购与库存管理',
  },
  {
    id: 'drawings',
    label: '图纸管理',
    icon: 'Ruler',
    shortcut: 'G G',
    description: '项目图纸上传与查看',
  },
  
  // ─────────────────────────────────────────────────────────────────────────────
  // 系统模块
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'users',
    label: '用户管理',
    icon: 'UserCircle',
    shortcut: 'G U',
    isSystem: false,
    description: '系统用户与权限管理',
    showInSidebar: false,
  },
  {
    id: 'settings',
    label: '系统设置',
    icon: 'Settings',
    shortcut: 'G S',
    isSystem: false,
    showInSidebar: false,
    description: '系统配置与数据管理',
  },
]

// ═══════════════════════════════════════════════════════════════════════════════
// 路由查询函数
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 根据 ID 获取路由配置
 */
export function getRouteById(id: PageId): RouteMeta | undefined {
  return routes.find(route => route.id === id)
}

/**
 * 获取侧边栏路由列表
 */
export function getSidebarRoutes(): RouteMeta[] {
  return routes.filter(route => route.showInSidebar !== false && !route.isSystem)
}

/**
 * 根据用户权限过滤侧边栏路由
 */
const SIDEBAR_RESOURCE_MAP: Record<string, string> = {
  dashboard: 'dashboard',
  projects: 'projects',
  contracts: 'contracts',
  partners: 'partners',
  members: 'members',
  wages: 'wages',
  settlement: 'settlement',
  templates: 'templates',
  inventory: 'inventory',
  invoices: 'invoices',
  expenses: 'expenses',
  costLedger: 'costLedger',
  drawings: 'drawings',
  settings: 'settings',
  users: 'users',
}

export function getFilteredSidebarRoutes(permissions: string[]): RouteMeta[] {
  return routes.filter(route => {
    if (route.isSystem) return false
    if (route.showInSidebar === false) return false
    const resource = SIDEBAR_RESOURCE_MAP[route.id]
    if (!resource) return true
    // 管理员始终看到全部
    if (permissions.includes('users:create')) return true
    return permissions.includes(`${resource}:read`)
  })
}

/**
 * 获取所有业务模块路由（不含系统设置）
 */
export function getBusinessRoutes(): RouteMeta[] {
  return routes.filter(route => !route.isSystem)
}

/**
 * 根据快捷键获取路由
 */
export function getRouteByShortcut(shortcut: string): RouteMeta | undefined {
  return routes.find(route => route.shortcut?.toUpperCase() === shortcut.toUpperCase())
}

/**
 * 路由 ID 集合（用于类型保护）
 */
export const PAGE_IDS: PageId[] = routes.map(r => r.id)

/**
 * 导航项（侧边栏显示）
 */
export const NAV_ITEMS: Omit<RouteMeta, 'description' | 'isSystem'>[] = routes
  .filter(r => r.showInSidebar !== false && !r.isSystem)
  .map(({ description, isSystem, ...rest }) => rest)

// ═══════════════════════════════════════════════════════════════════════════════
// 合同管理子视图配置
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 合同管理视图配置
 */
export interface ContractViewMeta {
  id: ContractView
  label: string
  icon: string
  description: string
}

export const contractViews: ContractViewMeta[] = [
  { id: 'dashboard', label: '合同看板', icon: 'LayoutDashboard', description: '合同统计概览' },
  { id: 'income', label: '收入合同', icon: 'TrendingUp', description: '收入合同台账' },
  { id: 'expense', label: '支出合同', icon: 'TrendingDown', description: '支出合同台账' },
]

/**
 * 根据视图 ID 获取视图配置
 */
export function getContractViewById(id: ContractView): ContractViewMeta | undefined {
  return contractViews.find(view => view.id === id)
}

// ═══════════════════════════════════════════════════════════════════════════════
// 导出类型
// ═══════════════════════════════════════════════════════════════════════════════
