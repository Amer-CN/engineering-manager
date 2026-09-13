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
  // runSafeQuery 动态列常见字段（下划线原样，驼峰拼法由 fieldLabel 双拼写互查覆盖）
  created_by: '创建人', created_at: '创建时间', updated_by: '更新人', updated_at: '更新时间',
  invoice_kind: '发票类型', invoice_code: '发票代码', received_amount: '已收金额',
  // ── 审计缺口 A/B 字段补齐（工具结果真实列名；驼峰拼法由 fieldLabel 双拼写互查覆盖）──
  description: '项目描述', project_manager_id: '项目经理ID',
  email: '邮箱', gender: '性别', ethnicity: '民族', birth_date: '出生日期',
  base_salary: '底薪', entry_date: '入职日期', department_id: '部门ID', position: '岗位',
  seller_id: '销方ID', buyer_id: '购方ID', contract_id: '合同ID', settlement_id: '结算ID',
  price_amount: '不含税金额', tax_rate: '税率', tax_amount: '税额', remarks: '备注',
  partner_id: '合作方ID', settlement_date: '结算日期',
  batch_id: '批次ID', voucher_no: '凭证号', channel: '收付渠道', summary: '摘要', notes: '备注',
  code: '编码', specifications: '规格', purchase_price: '采购价', sale_price: '售价',
  current_stock: '当前库存', min_stock: '最低库存', max_stock: '最高库存', supplier_id: '供应商ID',
  tax_number: '税号', credit_code: '统一社会信用代码',
}

export function fieldLabel(key: string): string {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key]
  // 驼峰↔下划线双拼写互查：后端 JSON 序列化为驼峰（invoiceNo），runSafeQuery
  // 返回数据库原始列名（invoice_no），两边的多单词字段都要能命中同一标签
  const alt = key.includes('_')
    ? key.toLowerCase().replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
    : key.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase())
  return FIELD_LABELS[alt] || key
}

/** 状态/枚举值 → 中文（找不到原样返回） */
const STATUS_LABELS: Record<string, string> = {
  active: '进行中', completed: '已完成', pending: '待处理',
  received: '已收齐', sent: '已开', left: '离职',
  income: '收入', expense: '支出', staff: '管理人员', worker: '工人',
  labor: '劳务分包', material: '材料供应', equipment: '设备租赁',
  // 发票状态（真源 invoiceConfig.ts statusConfigMap）
  issued: '已开具', partially_paid: '部分收款', cancelled: '已作废', red_flushed: '已红冲',
  // 发票方向/种类（真源 invoiceConfig.ts labelIn/labelOut 与 kindConfig）
  invoice_in: '进项发票', invoice_out: '销项发票',
  electronic_special: '电专', paper_special: '纸专',
  // 成本台账分类（真源 costLedgerColors.ts CATEGORY_CONFIG 全量；
  // custom_* 用户自建分类不在此映射，原样显示；
  // labor/material/equipment 与合作方分类共用键，保留原合作方标签）
  public_relations: '公关招待费', intermediary_fee: '居间中介费', other_business: '其他业务费',
  subcontract: '专业分包款', temp_facility: '临建及办公费', manager_salary: '管理人员薪酬',
  travel_misc: '差旅及杂项', bid_guarantee: '投标及保函费', consult_testing: '咨询检测费',
  doc_agency: '资料代理费', other_public: '其他对公服务费', capital_cost: '资金成本',
  guarantee_fee: '保函及规费', irregular_invoice: '非常规发票成本', fine_other: '罚款及其他',
  shareholder_investment: '股东投资', financing: '融资款', income_invest_ph: '投资款-占位',
  advance_recovery: '垫资回收', income_return_ph: '项目回款-占位',
  income_refund_ph: '退款-占位', income_other_ph: '其他收入-占位',
  // 合作方分类（真源 PartnerCategory 类型定义注释）
  owner: '建设单位', general_contract: '总承包', professional: '专业分包',
  design: '设计单位', supervisor: '监理单位', survey: '地勘单位',
  // 项目状态
  planning: '规划中', in_progress: '进行中', archived: '已归档',
  // 结算状态
  draft: '草稿', processed: '已处理',
}

/**
 * 状态值 → 色调（Beautiful UI A1：表格状态彩色小标签用）。
 * 成功类→success；风险类→danger/warning；进行类→info；未知→null（不着色）。
 */
export function statusTone(
  value: unknown,
): 'success' | 'warning' | 'danger' | 'info' | null {
  const s = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!s) return null
  if (s === 'completed' || s === 'received' || s === 'issued') return 'success'
  if (s === 'cancelled' || s === 'red_flushed') return 'danger'
  if (s === 'pending' || s === 'partially_paid') return 'warning'
  if (
    s === 'active' || s === 'in_progress' || s === 'planning' ||
    s === 'sent' || s === 'draft' || s === 'processed' || s === 'archived'
  ) return 'info'
  return null
}

/** 金额型字段（加 ¥ 与千分位；导出供 DataTable 表尾求和判断） */
export const MONEY_KEYS = /(amount|total|totalincome|totalexpense|nettotal|budget|wage|salary|price)/i

/** 格式化标量值 */
export function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? '是' : '否'
  if (typeof value === 'number') {
    // 比率型字段（tax_rate）：0-1 小数按百分比显示（0.09 → 9%）
    if (/rate/i.test(key) && value >= 0 && value <= 1) {
      return (value * 100).toFixed(0) + '%'
    }
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
      key === 'category' || key === 'member_type' || key === 'worker_type' ||
      key === 'invoice_kind') &&
    STATUS_LABELS[s]
  ) {
    return STATUS_LABELS[s]
  }
  // ISO 时间戳截取日期部分（'2026-05-14T17:32' / '2026-07-29 20:57:04' → '2026-05-14'）
  if (/^\d{4}-\d{2}-\d{2}(T| )/.test(s)) return s.slice(0, 10)
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
