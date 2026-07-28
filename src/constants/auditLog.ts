import type { AuditAction, AuditLevel } from '../utils/audit'

/** 操作类型映射 (用于下拉框 / 显示) */
export const ACTION_LABELS: Record<AuditAction, string> = {
  create: '创建',
  read: '查看',
  update: '更新',
  delete: '删除',
  export: '导出',
  import: '导入',
  login: '登录',
  logout: '退出',
  approve: '审批',
  lock: '锁定',
  unlock: '解锁',
}

/** 审计级别映射 (badge 颜色) */
export const LEVEL_COLORS: Record<AuditLevel, string> = {
  info: 'text-[color:var(--fg-2)] bg-[color:var(--panel-2)]',
  warning: 'text-warning-600 bg-warning-50',
  error: 'text-danger-600 bg-danger-50',
}

/** 资源标签映射 */
export const RESOURCE_LABELS: Record<string, string> = {
  projects: '项目',
  partners: '合作单位',
  members: '员工',
  contracts: '合同',
  invoices: '发票',
  settlements: '结算',
  inventory: '库存',
  settings: '设置',
}
