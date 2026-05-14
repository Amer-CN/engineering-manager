export interface Project {
  id: number
  name: string
  description: string
  address: string
  startDate: string
  endDate: string
  status: 'planning' | 'in_progress' | 'completed' | 'archived'
  budget: number
  projectManagerId: number | null  // 项目负责人 ID
  createdAt: string
  updatedAt: string
  projectManagerName?: string     // 关联查询时附带负责人名称
}

// ============ 认证类型 ============
export interface StoredAuth {
  userId: string
  username: string
  displayName: string
  roleId: string
  roleName: string
  permissions: string[]
  mustChangePassword?: boolean
}

export interface UserInfo {
  id: string
  username: string
  displayName: string
  roleId: string
  status: 'active' | 'disabled'
  createdAt: string
  lastLoginAt: string | null
}

// ============ 人员类型 ============
export type MemberType = 'staff' | 'worker'  // staff=管理人员, worker=农民工

// ============ 工种分类 ============
export type WorkerType = 
  | 'bricklayer'      // 砌筑工
  | 'concreter'       // 混凝土工
  | 'steel'           // 钢筋工
  | 'formwork'        // 模板工
  | 'carpenter'       // 木工
  | 'painter'         // 油漆工
  | 'plumber'         // 水暖工
  | 'electrician'     // 电工
  | 'welder'          // 焊工
  | 'rigger'          // 起重工
  | 'driver'          // 驾驶员
  | 'mechanic'        // 机械工
  | 'other'           // 其他工种

// ============ 农民工班组 ============
export interface WorkerTeam {
  id: number
  name: string                    // 班组名称
  projectId: number               // 所属项目（必选）
  leaderId: number | null          // 班组长ID
  createdAt: string
  updatedAt: string
  // 关联查询时附带
  projectName?: string
  leaderName?: string
}

// ============ 农民工调动记录 ============
export interface WorkerTransferRecord {
  id: number
  workerId: number                // 工人ID
  fromTeamId: number              // 原班组ID
  toTeamId: number                // 新班组ID
  fromProjectId: number           // 原项目ID
  toProjectId: number             // 新项目ID
  transferDate: string            // 调动日期
  reason: string                  // 调动原因
  createdAt: string
}

// ============ 农民工状态枚举 ============
export type WorkerStatus = 'active' | 'left'  // 在职/离场

// ============ 全局工人信息库（纯身份） ============
export interface Worker {
  id: number
  name: string
  idCard: string                   // 身份证号（唯一）
  gender?: string                  // 男/女
  birthDate?: string               // YYYY-MM-DD
  ethnicity?: string               // 民族
  phone?: string
  address?: string
  bankAccount?: string             // 工资卡号
  bankName?: string                // 开户行
  bankLineNo?: string              // 联行号
  workerType?: string              // 默认工种
  dailyWage?: number               // 默认日工资
  createdAt: string
}

// ============ 项目用工关系（Worker ↔ Project many-to-many） ============
export interface ProjectWorker {
  id: number
  workerId: number
  projectId: number
  teamId?: number                  // 班组ID
  dailyWage: number                // 日工资（元/天）
  workerType: WorkerType | string  // 工种
  entryDate: string                // 进场日期
  status: WorkerStatus             // 'active' | 'left'
  remarks?: string
  createdAt: string
  // 关联查询附加
  workerName?: string
  workerIdCard?: string
  projectName?: string
  teamName?: string
}

// ============ 人员管理 ============
export interface Member {
  // 基础信息
  id: number
  name: string
  phone: string
  email: string
  memberType: MemberType           // 人员类型：管理人员/农民工
  role: string                      // 职位（管理人员）/ 工种（农民工）
  workerType?: WorkerType            // 工种类型（农民工专属）
  
  // 身份证
  idCard: string                    // 身份证号
  idCardFront: string               // 身份证人像面
  idCardBack: string                // 身份证国徽面
  // 身份证扩展信息（从OCR识别）
  gender?: string                   // 性别（男/女）
  ethnicity?: string                // 民族
  birthDate?: string                // 出生日期（YYYY-MM-DD）
  idCardAddress?: string            // 身份证住址
  
  // 劳动合同
  contractFile: string              // 劳动合同
  contractFileType: string          // 合同文件类型
  
  // 管理人员薪酬（管理人员专属）
  baseSalary?: number               // 基本工资（元/月）
  socialSecurityPersonal?: number   // 社保个人（元/月）
  socialSecurityCompany?: number    // 社保单位（元/月）
  housingFund?: number               // 公积金（元/月）
  housingFundPersonal?: number       // 公积金个人部分（元/月），仅当 companyCoversSocial=false 时扣除
  otherAllowances?: number          // 其他补贴（元/月）
  companyCoversSocial?: boolean      // 公司是否承担社保公积金个人部分（不扣工资）
  
  // 农民工专属字段
  teamId?: number                  // 所属班组ID
  dailyWage?: number                // 日工资/工价（元/天）
  entryDate?: string                // 进场日期
  expectedLeaveDate?: string        // 预计退场日期
  actualLeaveDate?: string          // 实际退场日期
  wageBankAccount?: string           // 工资卡号
  wageBankName?: string             // 工资开户行
  threeLevelEducation?: boolean     // 三级教育是否完成
  safetyTrainingFile?: string        // 安全培训记录
  healthReportFile?: string         // 健康报告
  specialCertificateFile?: string    // 特种作业证
  status?: WorkerStatus             // 在职/离场状态
  remarks?: string                  // 备注（如离场原因等）
  
  createdAt: string
  
  // 关联查询时附带
  teamName?: string                // 班组名称（冗余存储便于显示）
  projectId?: number               // 当前所属项目ID
  projectName?: string             // 当前项目名称
  isTeamLeader?: boolean           // 是否为班组长

  // 部门与职位（管理人员专属，v2.6.0 新增）
  departmentId?: number            // 所属部门 ID → db.departments.id
  position?: string                // 职位名称（如"部门经理""工程师""会计"）
}

// ============ 部门管理 ============
export interface Department {
  id: number
  name: string                     // 部门名称
  managerId: number | null         // 部门负责人 member.id
  memberCount: number              // 部门人数（查询时计算，不持久化）
  positions: string[]              // 该部门可选的职位列表
  createdAt: string
}

export interface Material {
  id: number
  projectId: number
  name: string
  category: string
  unit: string
  quantity: number
  price: number
  createdAt: string
}

export interface Expense {
  id: number
  projectId: number
  amount: number
  category: string
  description: string
  date: string
  createdAt: string
}

// 成本台账
export interface CostLedgerEntry {
  id: number
  projectId: number
  voucherNo: number
  date: string
  direction: 'expense' | 'income'
  amount: number
  category: string
  summary: string
  counterparty: string
  channel: string
  linkedInvoiceId?: number
  linkedInvoiceStatus?: 'active' | 'deleted' | null
  notes?: string
  attachments: string[]
  createdAt: string
  updatedAt: string
}

export interface CostLedgerSummary {
  totalExpense: number
  totalIncome: number
  byCategory: Record<string, number>
}

export interface CostLedgerCategory {
  id: number
  code: string
  label: string
  direction: 'expense' | 'income'
  color: string
  isBuiltin: boolean
  isEnabled: boolean
  sortOrder: number
  /** 一级分类名（内置分类从 CATEGORY_HIERARCHY 派生，自定义分类创建时选定） */
  level1?: string
}

export interface Drawing {
  id: number
  projectId: number
  name: string
  category: string
  filePath: string
  remarks: string
  createdAt: string
}

// ============ 合作单位 ============
export type PartnerCategory =
  | 'owner'           // 建设单位（甲方）
  | 'general_contract' // 总承包单位
  | 'professional'    // 专业分包单位
  | 'labor'           // 劳务分包单位
  | 'material'        // 材料供应商
  | 'equipment'       // 设备租赁单位
  | 'design'          // 设计单位
  | 'supervisor'      // 监理单位
  | 'survey'          // 地勘单位
  | 'testing'         // 检测单位
  | 'other'           // 其他

export interface Partner {
  id: number
  name: string
  category: PartnerCategory
  contact: string
  phone: string
  email: string
  address: string
  bankAccount: string
  bankName: string    // 开户行
  taxNumber: string
  // 新增字段
  creditCode: string              // 统一社会信用代码
  registeredAddress: string       // 注册地址
  businessScope: string           // 经营范围
  taxType: string                // 纳税资质：general=一般纳税人，small=小规模纳税人
  licenseFile: string             // 营业执照（Base64）
  licenseFileType: string         // 营业执照文件类型
  otherFiles: string              // 其他附件（Base64，多个用逗号分隔）
  otherFilesType: string          // 其他附件文件类型
  projectIds: number[]  // 关联的项目ID列表
  remarks: string
  createdAt: string
  updatedAt: string
  projectNames?: string // 关联查询时附带项目名称
}

// ============ 地区 ============
export interface Region {
  id: number
  province: string
  city: string
  district: string
  createdAt: string
}

// ============ 监管单位 ============
export type SupervisorCategory =
  | 'quality'         // 质安站
  | 'housing'         // 住建局
  | 'environmental'   // 环保局
  | 'urban'          // 城管局
  | 'fire'           // 消防大队
  | 'water'          // 自来水公司
  | 'power'          // 供电局
  | 'gas'            // 燃气公司
  | 'planning'       // 规划局
  | 'civil_defense'  // 人防办
  | 'traffic'        // 交通局
  | 'health'         // 卫健委
  | 'other'          // 其他

export interface Supervisor {
  id: number
  regionId: number
  name: string
  category: SupervisorCategory
  contact: string
  phone: string
  address: string
  projectIds: number[]  // 关联的项目ID列表
  remarks: string
  createdAt: string
  updatedAt: string
  regionName?: string   // 关联查询时附带地区名称
  projectNames?: string // 关联查询时附带项目名称
}

// ============ 收入合同 ============
export type ContractStatus = 'draft' | 'pending' | 'active' | 'expired' | 'terminated' | 'archived'
export type PaymentMethod = 'one_time' | 'monthly' | 'by_progress' | 'by_stage'

export interface IncomeContract {
  id: number
  projectId: number
  partnerId: number
  contractNo: string
  name: string
  amount: number                 // 合同金额（不变）
  signedDate: string
  startDate: string
  endDate: string
  status: ContractStatus
  paymentMethod: PaymentMethod
  remarks: string
  createdAt: string
  updatedAt: string
  // 结算相关
  finalAmount?: number            // 最终结算金额（结算办理后填写）
  settlementId?: number           // 关联的结算单ID
  // 合同附件
  fileUrl?: string         // Base64 编码的文件
  fileType?: 'pdf' | 'image' | 'word' | 'excel'  // 文件类型
  // 关联查询时附带
  projectName?: string
  partnerName?: string
}

export interface IncomeRecord {
  id: number
  contractId: number
  amount: number
  recordDate: string
  payer: string
  remarks: string
  createdAt: string
}

// ============ 支出合同 ============
export interface ExpenseContract {
  id: number
  projectId: number
  partnerId: number
  contractNo: string
  name: string
  amount: number                 // 合同金额（不变）
  signedDate: string
  startDate: string
  endDate: string
  status: ContractStatus
  paymentMethod: PaymentMethod
  remarks: string
  createdAt: string
  updatedAt: string
  // 结算相关
  finalAmount?: number            // 最终结算金额（结算办理后填写）
  settlementId?: number           // 关联的结算单ID
  // 合同附件
  fileUrl?: string         // Base64 编码的文件
  fileType?: 'pdf' | 'image' | 'word' | 'excel'  // 文件类型
  // 关联查询时附带
  projectName?: string
  partnerName?: string
}

export interface ExpenseRecord {
  id: number
  contractId: number
  amount: number
  recordDate: string
  payee: string
  remarks: string
  createdAt: string
}

// ============ 其他协议 ============
export type AgreementSubType = 'cooperation' | 'framework' | 'settlement' | 'compensation' | 'personal' | 'other'

export interface AgreementContract {
  id: number
  projectId: number
  partnerId: number
  contractNo: string
  name: string
  agreementType: AgreementSubType   // 协议子类型
  amount?: number                   // 合同金额（可选，框架协议等可能无金额）
  signedDate: string
  startDate: string
  endDate: string
  status: ContractStatus
  remarks: string
  createdAt: string
  updatedAt: string
  // 结算相关
  finalAmount?: number
  settlementId?: number
  // 合同附件
  fileUrl?: string
  fileType?: 'pdf' | 'image' | 'word' | 'excel'
  // 关联查询时附带
  projectName?: string
  partnerName?: string
}

// ============ 合同看板统计 ============
export interface ContractStats {
  incomeCount: number
  incomeTotal: number
  incomeReceived: number
  expenseCount: number
  expenseTotal: number
  expensePaid: number
  agreementCount: number
  netIncome: number
  netReceived: number
  expiringSoon: ContractExpiringItem[]
}

export interface ContractExpiringItem {
  id: number
  type: 'income' | 'expense' | 'agreement'
  name: string
  contractNo: string
  amount: number
  endDate: string
  daysLeft: number
}

export interface DashboardStats {
  projectsCount: number
  membersCount: number
  materialsCount: number
  totalExpenses: number
  settlementsCount: number
  invoicesCount: number
  inventoryItemsCount: number
  inProgressProjects: number
  recentProjects: Project[]
  expenseByCategory?: Record<string, number>
}

// ============ 结算办理 ============
export type SettlementStatus = 'draft' | 'pending' | 'completed' | 'archived'
export type SettlementType = 'income' | 'expense'  // 收入结算/支出结算
export type SettlementSubType = 'material' | 'subcontract' | 'labor' | 'machinery' | 'service' | 'other'

export interface Settlement {
  id: number
  projectId: number | null  // 关联项目（可选）
  contractId: number | null
  partnerId: number | null  // 关联单位
  type: SettlementType
  subType?: SettlementSubType       // 结算细分类别
  status: SettlementStatus
  settlementNo: string          // 结算单号
  name: string                   // 结算名称
  amount: number                 // 结算金额
  settlementDate?: string       // 结算日期
  periodStart?: string           // 结算周期开始（废弃，保留兼容）
  periodEnd?: string             // 结算周期结束（废弃，保留兼容）
  submittedBy: string           // 提交人
  submittedAt: string          // 提交时间
  approvedBy: string            // 审核人
  approvedAt: string            // 审核时间
  paidAt: string               // 付款时间
  remarks: string
  items: SettlementItem[]       // 结算明细
  files?: { url: string; name: string; type: 'pdf' | 'image' | 'excel' }[]  // 结算凭证附件（多文件）
  fileUrl?: string              // 旧单文件字段（兼容）
  fileName?: string
  fileType?: 'pdf' | 'image' | 'excel'
  createdAt: string
  updatedAt: string
  projectName?: string
  partnerName?: string
  contractName?: string
}

export interface SettlementItem {
  id: number
  description: string
  quantity: number
  unit: string
  unitPrice: number
  amount: number
  remarks: string
}

// ============ 合同模板（旧版，保留兼容） ============
export type TemplateType = 'income' | 'expense' | 'labor' | 'material' | 'other'

export interface ContractTemplate {
  id: number
  name: string
  type: TemplateType
  description: string
  filePath: string
  fileName: string
  variables: TemplateVariable[]
  createdAt: string
  updatedAt: string
}

// ============ 模板管理（新版，通用模板系统） ============
export type TemplateCategory = 'contract' | 'settlement' | 'seal_application' | 'fund_application' | 'official_document' | 'letter' | 'other'

export interface Template {
  id: number
  name: string
  category: TemplateCategory
  description: string
  fileName: string
  storedFileName: string
  fileType: 'docx' | 'xlsx'
  variables: TemplateVariable[]
  createdAt: string
  updatedAt: string
}

export interface TemplateVariable {
  key: string                   // 变量名，如 {{partyA}}
  label: string                 // 显示标签
  type: 'text' | 'number' | 'date' | 'select'
  defaultValue: string
  options?: string[]            // select类型的选项
  required: boolean
}

// ============ 进销存 ============
export type InventoryTransactionType = 'purchase' | 'sale' | 'adjustment' | 'return_in' | 'return_out'

export interface InventoryItem {
  id: number
  code: string                  // 物料编码
  name: string
  category: string
  unit: string                  // 单位
  specifications: string         // 规格型号
  purchasePrice: number         // 采购单价
  salePrice: number             // 销售单价
  currentStock: number          // 当前库存
  minStock: number              // 最低库存预警
  maxStock: number              // 最高库存
  supplierId: number | null     // 默认供应商
  remarks: string
  createdAt: string
  updatedAt: string
}

export interface InventoryTransaction {
  id: number
  itemId: number
  type: InventoryTransactionType
  quantity: number
  unitPrice: number
  totalAmount: number
  projectId: number | null      // 关联项目（可选）
  contractId: number | null     // 关联合同（可选）
  counterpartyId: number | null // 交易对方（供应商/客户）
  transactionDate: string
  documentNo: string            // 单据编号
  remarks: string
  createdAt: string
  itemName?: string
  projectName?: string
  counterpartyName?: string
}

// ============ 发票管理 ============
export type InvoiceType = 'invoice_in' | 'invoice_out'  // 收票/开票
// 发票状态：issued=已开具, partially_paid=部分收款, received=已收票/已回款, cancelled=已作废, red_flushed=已红冲
export type InvoiceStatus = 'issued' | 'partially_paid' | 'received' | 'cancelled' | 'red_flushed'
export type InvoiceTaxRate = 0 | 0.01 | 0.03 | 0.06 | 0.09 | 0.13
export type InvoiceKind = 'electronic_regular' | 'electronic_special' | 'paper_regular' | 'paper_special'  // 电子普票/电子专票/纸质普票/纸质专票

// 发票关联的收款明细
export interface InvoicePaymentDetail {
  invoiceId: number       // 关联的发票ID
  paymentAmount: number    // 本次关联金额
}

// 收款记录
export interface PaymentRecord {
  id: number
  type: InvoiceType        // 业务类型：invoice_in=收票→付款, invoice_out=开票→回款
  amount: number          // 金额
  recordDate: string       // 日期
  // 关联信息（可选）
  projectId: number | null // 关联项目
  partnerId: number | null // 关联单位（销售方/购买方）
  contractId: number | null // 关联合同
  // 关联发票
  invoiceDetails: InvoicePaymentDetail[]
  remarks: string
  createdAt: string
  // 关联查询时附带
  projectName?: string
  partnerName?: string
  contractName?: string
  // 收款凭证附件
  fileUrl?: string         // Base64 编码的文件
  fileType?: 'pdf' | 'image'  // 文件类型
}

export interface Invoice {
  id: number
  type: InvoiceType
  status: InvoiceStatus
  invoiceKind: InvoiceKind                        // 票种：电子发票/纸质发票
  invoiceNo: string              // 发票号码
  invoiceCode: string           // 发票代码
  name: string                   // 发票名称/摘要
  amount: number                 // 价税合计（含税金额）
  taxAmount: number             // 税额
  priceAmount: number           // 不含税金额
  taxRate: InvoiceTaxRate
  issueDate: string            // 开票日期
  sellerId: number | null        // 销售方（开票单位）
  buyerId: number | null         // 购买方（收票单位）
  settlementId: number | null   // 关联结算单
  projectId: number | null      // 关联项目
  contractId: number | null     // 关联合同（可选）
  receivedAmount: number        // 已收款金额
  fileUrl?: string              // 发票文件（Base64）
  fileType?: string             // 文件类型：image/pdf
  remarks: string
  createdAt: string
  updatedAt: string
  sellerName?: string            // 销售方名称
  buyerName?: string             // 购买方名称
  projectName?: string
  contractName?: string         // 关联合同名称
}

export interface InvoiceItem {
  id: number
  invoiceId: number
  description: string           // 商品/服务名称
  specifications: string         // 规格型号
  unit: string                  // 单位
  quantity: number
  unitPrice: number
  amount: number
  taxRate: InvoiceTaxRate
  taxAmount: number
}


// ============ 考勤管理 ============
export type DayStatus = 'work' | 'holiday' | 'sick_leave' | 'personal_leave' | 'absent'

export interface AttendanceRecord {
  id: number
  memberId: number
  projectId: number
  memberName?: string             // 冗余字段，方便显示
  yearMonth: string               // "YYYY-MM"
  workDays: number                // 实际出勤天数（由 dailyStatus 自动计算）
  daysOff: number                 // 休假天数（管理人员适用）
  isFullAttendance: boolean       // daysOff <= 4
  dailyStatus?: Record<number, DayStatus>  // 每日考勤状态，key=日(1-31)
  fileUrl?: string                // 考勤附件（照片/xlsx/PDF）- 存储文件名
  fileName?: string               // 考勤附件原始文件名（用于显示）
  createdAt: string
  updatedAt: string
}

// ============ 工资管理 ============
export interface SalaryHistoryEntry {
  id: number
  memberId: number
  effectiveDate: string            // "YYYY-MM-DD" 生效日期
  baseSalary: number
  subsidy: number                  // 补助金额
  subsidyNote: string              // 补助说明
  note: string                     // 变动备注
  createdAt: string
}

export interface WageRecord {
  id: number
  projectId: number
  memberId?: number
  projectWorkerId?: number
  yearMonth: string               // "YYYY-MM"
  dailyWage: number
  workDays: number
  bonus: number
  deduction: number
  actualWage: number
  paidAmount?: number              // 实发金额（可能不同于应发）
  paidDate?: string                // 发放日期 "YYYY-MM-DD"
  bankReceiptPath?: string        // 银行回单凭证文件路径
  paymentLocked?: boolean          // 是否已归档（锁定实发金额/日期）
  memberName?: string
  memberType?: 'worker'
  projectName?: string
  teamName?: string
  bankAccount?: string             // 银行卡号，用于回单匹配
  createdAt: string
  updatedAt: string
}

export interface WageStats {
  totalWage: number
  count: number
  projectBreakdown: { projectId: number; projectName: string; total: number; percentage: number }[]
}

export interface BankReceiptItem {
  name: string
  amount: number
  status: string
  account?: string                 // 收款账号（银行卡号），用于精确匹配
}

export interface ParsedBankReceipt {
  date: string
  totalAmount: number
  successAmount: number
  failCount: number
  items: BankReceiptItem[]
  receiptPath: string
  rawTextSnippet?: string  // 提取文本前500字符（调试用）
}


// ============ 项目成员关联 ============
export interface ProjectMember {
  id: number
  projectId: number
  memberId: number
  joinedAt: string
}

export interface ElectronAPI {
  // 系统
  openDevTools: () => Promise<void>

  // 配置
  getConfig: () => Promise<{ success: boolean; data?: { dataPath: string; defaultPath: string }; error?: string }>
  setDataPath: (path: string) => Promise<{ success: boolean; message?: string; error?: string }>
  getDataPath: () => Promise<string>

  // 认证
  login: (username: string, password: string) => Promise<{ success: boolean; data?: StoredAuth; error?: string }>
  getCurrentUser: (userId: string) => Promise<{ success: boolean; data?: StoredAuth; error?: string }>
  getAllUsers: () => Promise<{ success: boolean; data?: UserInfo[]; error?: string }>
  createUser: (userData: { username: string; password: string; displayName: string; roleId: string }) => Promise<{ success: boolean; data?: { id: string }; error?: string }>
  updateUser: (userId: string, updates: { displayName?: string; roleId?: string; status?: string; password?: string }) => Promise<{ success: boolean; error?: string }>
  deleteUser: (userId: string) => Promise<{ success: boolean; error?: string }>

  // 项目
  getProjects: () => Promise<{ success: boolean; data?: Project[]; error?: string }>
  createProject: (project: Partial<Project>) => Promise<{ success: boolean; data?: { id: number }; error?: string }>
  updateProject: (project: Project) => Promise<{ success: boolean; error?: string }>
  deleteProject: (id: number) => Promise<{ success: boolean; error?: string }>

  // 成员
  getMembers: () => Promise<{ success: boolean; data?: Member[]; error?: string }>
  createMember: (member: Partial<Member>) => Promise<{ success: boolean; data?: { id: number }; error?: string }>
  updateMember: (member: Member) => Promise<{ success: boolean; error?: string }>
  deleteMember: (id: number) => Promise<{ success: boolean; error?: string }>

  // 项目成员关联
  getProjectMembers: (projectId: number) => Promise<{ success: boolean; data?: (ProjectMember & { member?: Member })[]; error?: string }>
  addProjectMember: (projectId: number, memberId: number) => Promise<{ success: boolean; data?: { id: number }; error?: string }>
  removeProjectMember: (id: number) => Promise<{ success: boolean; error?: string }>

  // 农民工班组
  getWorkerTeams: () => Promise<{ success: boolean; data?: WorkerTeam[]; error?: string }>
  createWorkerTeam: (team: Partial<WorkerTeam>) => Promise<{ success: boolean; data?: { id: number }; error?: string }>
  updateWorkerTeam: (team: WorkerTeam) => Promise<{ success: boolean; error?: string }>
  deleteWorkerTeam: (id: number) => Promise<{ success: boolean; error?: string }>

  // 工人调动记录
  getWorkerTransferRecords: (workerId: number) => Promise<{ success: boolean; data?: WorkerTransferRecord[]; error?: string }>
  createWorkerTransfer: (record: Partial<WorkerTransferRecord>) => Promise<{ success: boolean; data?: { id: number }; error?: string }>

  // 全局工人信息库
  getWorkers: (search?: string, workerType?: string) => Promise<{ success: boolean; data?: Worker[]; error?: string }>
  createWorker: (worker: Partial<Worker>) => Promise<{ success: boolean; data?: { id: number }; error?: string }>
  updateWorker: (worker: Worker) => Promise<{ success: boolean; data?: Worker; error?: string }>
  deleteWorker: (id: number) => Promise<{ success: boolean; error?: string }>
  getWorkerStats: (workerId: number) => Promise<{ success: boolean; data?: { projectCount: number; totalEarnings: number; projectBreakdown: { projectId: number; projectName: string; total: number }[] }; error?: string }>

  // 项目用工关系
  getProjectWorkers: (projectId: number) => Promise<{ success: boolean; data?: (ProjectWorker & { worker?: Worker })[]; error?: string }>
  createProjectWorker: (pw: Partial<ProjectWorker>) => Promise<{ success: boolean; data?: { id: number }; error?: string }>
  updateProjectWorker: (pw: ProjectWorker) => Promise<{ success: boolean; data?: ProjectWorker; error?: string }>
  deleteProjectWorker: (id: number) => Promise<{ success: boolean; error?: string }>
  batchCreateProjectWorkers: (entries: Partial<ProjectWorker>[]) => Promise<{ success: boolean; data?: { ids: number[] }; error?: string }>

  // 材料
  getMaterials: (projectId?: number) => Promise<{ success: boolean; data?: Material[]; error?: string }>
  createMaterial: (material: Partial<Material>) => Promise<{ success: boolean; data?: { id: number }; error?: string }>
  updateMaterial: (material: Material) => Promise<{ success: boolean; error?: string }>
  deleteMaterial: (id: number) => Promise<{ success: boolean; error?: string }>

  // 费用
  getExpenses: (projectId?: number) => Promise<{ success: boolean; data?: Expense[]; error?: string }>
  createExpense: (expense: Partial<Expense>) => Promise<{ success: boolean; data?: { id: number }; error?: string }>
  updateExpense: (expense: Expense) => Promise<{ success: boolean; error?: string }>
  deleteExpense: (id: number) => Promise<{ success: boolean; error?: string }>

  // 成本台账
  getCostLedger: (projectId: number) => Promise<{ success: boolean; data?: CostLedgerEntry[]; error?: string }>
  createCostLedger: (entry: Omit<CostLedgerEntry, 'id' | 'createdAt' | 'updatedAt'>) => Promise<{ success: boolean; data?: CostLedgerEntry; error?: string }>
  updateCostLedger: (id: number, changes: Partial<CostLedgerEntry>) => Promise<{ success: boolean; data?: CostLedgerEntry; error?: string }>
  deleteCostLedger: (id: number) => Promise<{ success: boolean; error?: string }>
  getCostLedgerSummary: (projectId: number) => Promise<{ success: boolean; data?: CostLedgerSummary; error?: string }>
  getCostLedgerCategories: (direction?: string) => Promise<{ success: boolean; data?: CostLedgerCategory[]; error?: string }>
  createCostLedgerCategory: (data: { label: string; direction: string; color?: string }) => Promise<{ success: boolean; data?: CostLedgerCategory; error?: string }>
  updateCostLedgerCategory: (id: number, changes: Partial<CostLedgerCategory>) => Promise<{ success: boolean; data?: CostLedgerCategory; error?: string; warning?: string }>
  deleteCostLedgerCategory: (id: number) => Promise<{ success: boolean; error?: string; warning?: string }>
  resetCostLedgerCategories: () => Promise<{ success: boolean; data?: CostLedgerCategory[]; error?: string }>

  // 图纸
  // 部门管理
  getDepartments: () => Promise<{ success: boolean; data?: Department[]; error?: string }>
  createDepartment: (data: { name: string; managerId?: number; positions?: string[] }) => Promise<{ success: boolean; data?: { id: number }; error?: string }>
  updateDepartment: (data: { id: number; name?: string; managerId?: number | null; positions?: string[] }) => Promise<{ success: boolean; error?: string }>
  deleteDepartment: (id: number) => Promise<{ success: boolean; error?: string }>
  // 图纸管理
  getDrawings: (projectId?: number) => Promise<{ success: boolean; data?: Drawing[]; error?: string }>
  uploadDrawing: (options: {
    projectId: number
    name: string
    category: string
    remarks: string
    fileName: string
    fileData: string
  }) => Promise<{ success: boolean; data?: { id: number; filePath: string }; error?: string }>
  updateDrawing: (drawing: Drawing) => Promise<{ success: boolean; error?: string }>
  deleteDrawing: (id: number) => Promise<{ success: boolean; error?: string }>

  // 合作单位
  getPartners: () => Promise<{ success: boolean; data?: Partner[]; error?: string }>
  getProjectPartners: (projectId: number) => Promise<{ success: boolean; data?: Partner[]; error?: string }>
  createPartner: (partner: Partial<Partner>) => Promise<{ success: boolean; data?: { id: number }; error?: string }>
  updatePartner: (partner: Partner) => Promise<{ success: boolean; error?: string }>
  deletePartner: (id: number) => Promise<{ success: boolean; error?: string }>

  // 地区
  getRegions: () => Promise<{ success: boolean; data?: Region[]; error?: string }>
  createRegion: (region: Partial<Region>) => Promise<{ success: boolean; data?: { id: number }; error?: string }>
  deleteRegion: (id: number) => Promise<{ success: boolean; error?: string }>

  // 监管单位
  getSupervisors: () => Promise<{ success: boolean; data?: Supervisor[]; error?: string }>
  createSupervisor: (supervisor: Partial<Supervisor>) => Promise<{ success: boolean; data?: { id: number }; error?: string }>
  updateSupervisor: (supervisor: Supervisor) => Promise<{ success: boolean; error?: string }>
  deleteSupervisor: (id: number) => Promise<{ success: boolean; error?: string }>

  // 收入合同
  getIncomeContracts: (projectId?: number) => Promise<{ success: boolean; data?: IncomeContract[]; error?: string }>
  createIncomeContract: (contract: Partial<IncomeContract>) => Promise<{ success: boolean; data?: { id: number }; error?: string }>
  updateIncomeContract: (contract: IncomeContract) => Promise<{ success: boolean; error?: string }>
  deleteIncomeContract: (id: number) => Promise<{ success: boolean; error?: string }>

  // 收入记录
  getIncomeRecords: (contractId: number) => Promise<{ success: boolean; data?: IncomeRecord[]; error?: string }>
  createIncomeRecord: (record: Partial<IncomeRecord>) => Promise<{ success: boolean; data?: { id: number }; error?: string }>
  deleteIncomeRecord: (id: number) => Promise<{ success: boolean; error?: string }>

  // 支出合同
  getExpenseContracts: (projectId?: number) => Promise<{ success: boolean; data?: ExpenseContract[]; error?: string }>
  createExpenseContract: (contract: Partial<ExpenseContract>) => Promise<{ success: boolean; data?: { id: number }; error?: string }>
  updateExpenseContract: (contract: ExpenseContract) => Promise<{ success: boolean; error?: string }>
  deleteExpenseContract: (id: number) => Promise<{ success: boolean; error?: string }>

  // 支出记录
  getExpenseRecords: (contractId: number) => Promise<{ success: boolean; data?: ExpenseRecord[]; error?: string }>
  createExpenseRecord: (record: Partial<ExpenseRecord>) => Promise<{ success: boolean; data?: { id: number }; error?: string }>
  deleteExpenseRecord: (id: number) => Promise<{ success: boolean; error?: string }>

  // 其他协议
  getAgreementContracts: (projectId?: number) => Promise<{ success: boolean; data?: AgreementContract[]; error?: string }>
  createAgreementContract: (contract: Partial<AgreementContract>) => Promise<{ success: boolean; data?: { id: number }; error?: string }>
  updateAgreementContract: (contract: AgreementContract) => Promise<{ success: boolean; error?: string }>
  deleteAgreementContract: (id: number) => Promise<{ success: boolean; error?: string }>

  // 合同统计
  getContractStats: () => Promise<{ success: boolean; data?: ContractStats; error?: string }>

  // 统计
  getDashboardStats: () => Promise<{ success: boolean; data?: DashboardStats; error?: string }>
  getUploadsPath: () => Promise<string>

  // 统一文件服务
  saveFile: (options: { category: string; subCategory: string; fileData: string; fileName: string; projectName?: string | null }) =>
    Promise<{ success: boolean; data?: { fileName: string }; error?: string }>
  readFile: (options: { category: string; subCategory: string; fileName: string; projectName?: string | null }) =>
    Promise<{ success: boolean; data?: { dataUrl: string; mimeType: string }; error?: string }>
  deleteFile: (options: { category: string; subCategory: string; fileName: string; projectName?: string | null }) =>
    Promise<{ success: boolean; error?: string }>
  openFileExternal: (options: { category: string; subCategory: string; fileName: string; projectName?: string | null }) =>
    Promise<{ success: boolean; error?: string }>

  // 合同附件文件存储
  saveContractFile: (options: { fileData: string; fileName: string; subCategory?: string; projectName?: string | null }) => Promise<{ success: boolean; data?: { fileName: string }; error?: string }>
  readContractFile: (fileName: string, subCategory?: string, projectName?: string | null) => Promise<{ success: boolean; data?: { dataUrl: string; mimeType: string }; error?: string }>

  // ============ 结算办理 ============
  getSettlements: (projectId?: number) => Promise<{ success: boolean; data?: Settlement[]; error?: string }>
  createSettlement: (settlement: Partial<Settlement>) => Promise<{ success: boolean; data?: { id: number }; error?: string }>
  updateSettlement: (settlement: Settlement) => Promise<{ success: boolean; error?: string }>
  deleteSettlement: (id: number) => Promise<{ success: boolean; error?: string }>
  processSettlement: (id: number) => Promise<{ success: boolean; data?: { warnings?: string[] }; error?: string }>
  unarchiveSettlement: (id: number) => Promise<{ success: boolean; error?: string }>

  // ============ 合同模板（旧版） ============
  getContractTemplates: () => Promise<{ success: boolean; data?: ContractTemplate[]; error?: string }>
  createContractTemplate: (template: Partial<ContractTemplate>) => Promise<{ success: boolean; data?: { id: number }; error?: string }>
  updateContractTemplate: (template: ContractTemplate) => Promise<{ success: boolean; error?: string }>
  deleteContractTemplate: (id: number) => Promise<{ success: boolean; error?: string }>
  generateContractFromTemplate: (templateId: number, variables: Record<string, string>) => Promise<{ success: boolean; data?: { html: string }; error?: string }>

  // ============ 模板管理（新版） ============
  getTemplates: (category?: TemplateCategory) => Promise<{ success: boolean; data?: Template[]; error?: string }>
  createTemplate: (template: Partial<Template>) => Promise<{ success: boolean; data?: { id: number; variables?: TemplateVariable[] }; error?: string }>
  updateTemplate: (template: Template) => Promise<{ success: boolean; error?: string }>
  deleteTemplate: (id: number) => Promise<{ success: boolean; error?: string }>
  getTemplateStats: () => Promise<{ success: boolean; data?: Record<string, number>; error?: string }>
  fillTemplateDocx: (storedFileName: string, values: Record<string, string>) => Promise<{ success: boolean; data?: { dataUrl: string }; error?: string }>

  // ============ 进销存 ============
  getInventoryItems: () => Promise<{ success: boolean; data?: InventoryItem[]; error?: string }>
  createInventoryItem: (item: Partial<InventoryItem>) => Promise<{ success: boolean; data?: { id: number }; error?: string }>
  updateInventoryItem: (item: InventoryItem) => Promise<{ success: boolean; error?: string }>
  deleteInventoryItem: (id: number) => Promise<{ success: boolean; error?: string }>
  getInventoryTransactions: (itemId?: number) => Promise<{ success: boolean; data?: InventoryTransaction[]; error?: string }>
  createInventoryTransaction: (transaction: Partial<InventoryTransaction>) => Promise<{ success: boolean; data?: { id: number }; error?: string }>

  // ============ 发票管理 ============
  getInvoices: (type?: InvoiceType) => Promise<{ success: boolean; data?: Invoice[]; error?: string }>
  createInvoice: (invoice: Partial<Invoice>) => Promise<{ success: boolean; data?: { id: number }; error?: string }>
  updateInvoice: (invoice: Invoice) => Promise<{ success: boolean; error?: string }>
  deleteInvoice: (id: number) => Promise<{ success: boolean; error?: string }>
  updateInvoiceStatus: (id: number, status: InvoiceStatus) => Promise<{ success: boolean; error?: string }>

  // ============ 收款记录 ============
  getPaymentRecords: (type?: InvoiceType) => Promise<{ success: boolean; data?: PaymentRecord[]; error?: string }>
  createPaymentRecord: (record: Partial<PaymentRecord>) => Promise<{ success: boolean; data?: { id: number }; error?: string }>
  updatePaymentRecord: (record: PaymentRecord) => Promise<{ success: boolean; error?: string }>
  deletePaymentRecord: (id: number) => Promise<{ success: boolean; error?: string }>

  // ============ 考勤管理 ============
  getAttendances: (projectId?: number, yearMonth?: string) => Promise<{ success: boolean; data?: AttendanceRecord[]; error?: string }>
  getAttendancesByMember: (memberId: number, yearMonth?: string) => Promise<{ success: boolean; data?: AttendanceRecord[]; error?: string }>
  createAttendance: (record: Partial<AttendanceRecord>) => Promise<{ success: boolean; data?: { id: number }; error?: string }>
  updateAttendance: (record: AttendanceRecord) => Promise<{ success: boolean; error?: string }>
  generateDefaultAttendances: (projectId: number, yearMonth: string, memberIds: number[]) => Promise<{ success: boolean; data?: { count: number }; error?: string }>
  generateDefaultAttendancesV2: (projectId: number, yearMonth: string, projectWorkerIds: number[]) => Promise<{ success: boolean; data?: { count: number }; error?: string }>
  batchImportAttendances: (projectId: number, yearMonth: string, records: { projectWorkerId: number; workDays: number }[]) => Promise<{ success: boolean; data?: { created: number; updated: number }; error?: string }>
  deleteAttendance: (id: number) => Promise<{ success: boolean; error?: string }>
  batchDeleteAttendances: (ids: number[]) => Promise<{ success: boolean; data?: { deleted: number }; error?: string }>

  // ============ 薪资历史 ============
  getSalaryHistory: (memberId: number) => Promise<{ success: boolean; data?: SalaryHistoryEntry[]; error?: string }>
  createSalaryHistory: (record: Partial<SalaryHistoryEntry>) => Promise<{ success: boolean; data?: SalaryHistoryEntry; error?: string }>
  deleteSalaryHistory: (id: number) => Promise<{ success: boolean; error?: string }>
  getEffectiveSalary: (memberId: number, yearMonth: string) => Promise<{ success: boolean; data?: { baseSalary: number; subsidy: number; effectiveDate: string }; error?: string }>

  // ============ 工资管理 ============
  getWages: (projectId?: number, yearMonth?: string, memberId?: number) => Promise<{ success: boolean; data?: WageRecord[]; error?: string }>
  generateProjectWages: (projectId: number, yearMonth: string) => Promise<{ success: boolean; data?: WageRecord[]; error?: string }>
  createWage: (record: Partial<WageRecord>) => Promise<{ success: boolean; data?: { id: number }; error?: string }>
  updateWage: (record: WageRecord) => Promise<{ success: boolean; error?: string }>
  batchSaveWages: (records: WageRecord[]) => Promise<{ success: boolean; error?: string }>
  deleteWage: (id: number) => Promise<{ success: boolean; error?: string }>
  batchDeleteWages: (ids: number[]) => Promise<{ success: boolean; data?: { deleted: number }; error?: string }>
  batchClearPayments: (ids: number[]) => Promise<{ success: boolean; data?: { cleared: number }; error?: string }>
  batchArchivePayments: (ids: number[]) => Promise<{ success: boolean; data?: { archived: number }; error?: string }>
  getWageStats: (yearMonth?: string, projectId?: number) => Promise<{ success: boolean; data?: WageStats; error?: string }>
  parseBankReceipt: (sourcePath: string, projectName?: string) => Promise<{ success: boolean; data?: ParsedBankReceipt; error?: string }>

  // ============ 审计日志 ============
  auditLog: (log: any) => Promise<{ success: boolean; error?: string }>
  queryAuditLogs: (query: any) => Promise<{ success: boolean; data?: any; error?: string }>
  getAuditStats: (days?: number) => Promise<{ success: boolean; data?: any; error?: string }>
  clearAuditLogs: (daysToKeep: number) => Promise<{ success: boolean; data?: { removedCount: number }; error?: string }>

  // ============ 角色权限 ============
  getRoles: () => Promise<{ success: boolean; data?: any[]; error?: string }>
  updateRole: (roleId: string, permissions: string[]) => Promise<{ success: boolean; error?: string }>
  resetRole: (roleId: string) => Promise<{ success: boolean; error?: string }>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
