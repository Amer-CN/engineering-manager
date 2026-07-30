/**
 * RichToolResult 辅助 — 工具名/字段名标签映射与值格式化
 * 从组件抽出以控制文件行数
 */

/** 工具名 → 中文标签 */
export const TOOL_LABELS: Record<string, string> = {
  getDashboardStats: '仪表盘统计',
  getProjects: '项目列表',
  getProjectDetail: '项目详情',
  getInvoices: '发票列表',
  getPendingInvoices: '待处理发票',
  getSettlements: '结算记录',
  getPendingSettlements: '待处理结算',
  getMembers: '成员列表',
  getWorkers: '工人列表',
  getContracts: '合同列表',
  getInventory: '库存物料',
  getCostSummary: '成本汇总',
  getPartners: '合作伙伴',
  runSafeQuery: '自定义查询',
  searchKnowledgeBase: '知识库检索',
  llm: 'AI',
}

export function toolLabel(name: string): string {
  return TOOL_LABELS[name] || name
}

/** 工具名 → 可跳转的模块（S9：富结果卡底部“打开 XX 模块 →”链接） */
export interface ToolNav { page: string; label: string }
const TOOL_NAV: Record<string, ToolNav> = {
  getInvoices: { page: 'invoices', label: '发票管理' },
  getPendingInvoices: { page: 'invoices', label: '发票管理' },
  getSettlements: { page: 'settlement', label: '结算办理' },
  getPendingSettlements: { page: 'settlement', label: '结算办理' },
  getProjects: { page: 'projects', label: '项目管理' },
  getProjectDetail: { page: 'projects', label: '项目管理' },
  getMembers: { page: 'hr', label: '人事管理' },
  getWorkers: { page: 'labor', label: '工人管理' },
  getContracts: { page: 'contracts', label: '合同管理' },
  getInventory: { page: 'inventory', label: '仓库管理' },
  getCostSummary: { page: 'costLedger', label: '成本台账' },
  getPartners: { page: 'partners', label: '单位管理' },
  getDashboardStats: { page: 'dashboard', label: '首页' },
  searchKnowledgeBase: { page: 'knowledge', label: '语音知识库' },
}

export function toolNav(name: string): ToolNav | null {
  return TOOL_NAV[name] || null
}

/** 字段名 → 中文标签 */
export const FIELD_LABELS: Record<string, string> = {
  id: 'ID', name: '名称', status: '状态', type: '类型', amount: '金额',
  budget: '预算', category: '分类', quantity: '数量', unit: '单位',
  location: '位置', phone: '电话', role: '角色', address: '地址',
  contact: '联系人', counterparty: '对方单位', project_name: '所属项目',
  project_id: '项目ID', projectId: '项目ID', projectManager: '项目经理',
  project_manager_name: '项目经理', invoice_no: '发票号', issue_date: '开票日期',
  sign_date: '签订日期', start_date: '开始日期', end_date: '结束日期', date: '日期',
  member_type: '成员类型', worker_type: '工种', daily_wage: '日薪',
  id_card: '身份证', bank_account: '银行账号', min_quantity: '最低库存',
  total: '合计', totalIncome: '总收入', totalExpense: '总支出', netTotal: '净额',
  projectsCount: '项目数', membersCount: '成员数', workersCount: '工人数',
  invoicesCount: '发票数', settlementsCount: '结算数', inProgressProjects: '进行中项目',
  recentProjects: '最近项目', byCategory: '分类统计',
  incomeContracts: '收入合同', expenseContracts: '支出合同',
  success: '成功', data: '数据', rowCount: '行数', rewrittenSql: '实际执行 SQL',
  error: '错误',
}

export function fieldLabel(key: string): string {
  return FIELD_LABELS[key] || key
}

/** 状态/枚举值 → 中文（找不到原样返回） */
const STATUS_LABELS: Record<string, string> = {
  active: '进行中', completed: '已完成', pending: '待处理',
  received: '已收', sent: '已开', left: '离职',
  income: '收入', expense: '支出', staff: '管理人员', worker: '工人',
  labor: '劳务分包', material: '材料供应', equipment: '设备租赁',
}

/** 金额型字段（加 ¥ 与千分位） */
const MONEY_KEYS = /(amount|total|totalincome|totalexpense|nettotal|budget|wage)/i

/** 格式化标量值 */
export function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? '是' : '否'
  if (typeof value === 'number') {
    if (MONEY_KEYS.test(key)) {
      return '¥' + value.toLocaleString('zh-CN', {
        minimumFractionDigits: 2, maximumFractionDigits: 2,
      })
    }
    return String(value)
  }
  const s = String(value)
  if (
    (key === 'status' || key === 'type' || key === 'direction' ||
      key === 'category' || key === 'member_type' || key === 'worker_type') &&
    STATUS_LABELS[s]
  ) {
    return STATUS_LABELS[s]
  }
  return s
}

/** 是否为「对象数组」（可渲染成表格） */
export function isObjectArray(v: unknown): v is Record<string, unknown>[] {
  return (
    Array.isArray(v) && v.length > 0 &&
    v.every((x) => x !== null && typeof x === 'object' && !Array.isArray(x))
  )
}

/** 是否为纯标量 */
export function isScalar(v: unknown): boolean {
  return (
    v === null || v === undefined ||
    typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'
  )
}
