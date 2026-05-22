// @ts-nocheck
/**
 * 测试用 Mock 数据工厂
 * 集中管理所有组件的 mock 数据，避免重复定义
 */
import type {
  Project, Partner, Member, Invoice,
  CostLedgerEntry, CostLedgerCategory, Worker, ProjectWorker, Department
} from '@/types/electron'

// ═══════════════════════════════════════════
// Project
// ═══════════════════════════════════════════

export function createMockProject(overrides?: Partial<Project>): Project {
  return {
    id: 1,
    name: '安岳县2025年高标准农田建设项目',
    description: '高标准农田建设',
    address: '四川省资阳市安岳县',
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    status: 'in_progress',
    budget: 1000000,
    projectManagerId: 1,
    projectManagerName: '张经理',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
  }
}

// ═══════════════════════════════════════════
// Partner
// ═══════════════════════════════════════════

export function createMockPartner(overrides?: Partial<Partner>): Partner {
  return {
    id: 1,
    name: '成都金图腾建筑劳务有限公司',
    category: 'labor',
    contact: '李工',
    phone: '13800138000',
    email: 'lijie@example.com',
    address: '四川省成都市',
    bankAccount: '6222021234567890123',
    bankName: '工商银行成都分行',
    taxNumber: '',
    creditCode: '91510100MA6C4XXXX',
    registeredAddress: '四川省成都市',
    businessScope: '建筑劳务分包',
    taxType: 'small',
    licenseFile: '',
    licenseFileType: '',
    otherFiles: '',
    otherFilesType: '',
    projectIds: [1],
    remarks: '',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    projectNames: '安岳县2025年高标准农田建设项目',
    ...overrides,
  }
}

// ═══════════════════════════════════════════
// Member
// ═══════════════════════════════════════════

export function createMockMember(overrides?: Partial<Member>): Member {
  return {
    id: 1,
    name: '张经理',
    phone: '13800138000',
    email: 'zhang@example.com',
    memberType: 'staff',
    role: '项目经理',
    idCard: '510923199001011234',
    idCardFront: '',
    idCardBack: '',
    gender: '男',
    ethnicity: '汉',
    birthDate: '1990-01-01',
    contractFile: '',
    contractFileType: '',
    baseSalary: 15000,
    socialSecurityPersonal: 400,
    socialSecurityCompany: 1200,
    housingFund: 800,
    housingFundPersonal: 400,
    otherAllowances: 500,
    companyCoversSocial: true,
    departmentId: 1,
    createdAt: '2025-01-01T00:00:00Z',
    ...overrides,
  }
}

// ═══════════════════════════════════════════
// Invoice
// ═══════════════════════════════════════════

export function createMockInvoice(overrides?: Partial<Invoice>): Invoice {
  return {
    id: 1,
    projectId: 1,
    type: 'output',
    number: 'SX20250001',
    date: '2025-03-01',
    amount: 100000,
    taxRate: 9,
    taxAmount: 9000,
    totalAmount: 109000,
    partnerId: 1,
    partnerName: '成都金图腾建筑劳务有限公司',
    status: 'issued',
    linkedPaymentId: null,
    remarks: '',
    createdAt: '2025-03-01T00:00:00Z',
    ...overrides,
  }
}

// ═══════════════════════════════════════════
// CostLedger
// ═══════════════════════════════════════════

export function createMockCostLedgerEntry(overrides?: Partial<CostLedgerEntry>): CostLedgerEntry {
  return {
    id: 1,
    projectId: 1,
    batchId: 1,
    voucherNo: '2025-03-001',
    date: '2025-03-15',
    direction: 'expense',
    amount: 50000,
    category: '人工费',
    summary: '3月农民工工资',
    counterparty: '成都金图腾建筑劳务有限公司',
    channel: '银行转账',
    linkedInvoiceId: null,
    linkedInvoiceStatus: null,
    notes: '',
    attachments: [],
    createdAt: '2025-03-15T00:00:00Z',
    updatedAt: '2025-03-15T00:00:00Z',
    ...overrides,
  }
}

export function createMockCostLedgerCategory(overrides?: Partial<CostLedgerCategory>): CostLedgerCategory {
  return {
    id: 1,
    code: '01',
    label: '人工费',
    direction: 'expense',
    color: '#3b82f6',
    isBuiltin: true,
    isEnabled: true,
    sortOrder: 1,
    level1: '成本',
    ...overrides,
  }
}

// ═══════════════════════════════════════════
// Worker
// ═══════════════════════════════════════════

export function createMockWorker(overrides?: Partial<Worker>): Worker {
  return {
    id: 1,
    name: '王小明',
    idCard: '510923198505051234',
    gender: '男',
    birthDate: '1985-05-05',
    ethnicity: '汉',
    phone: '13900139000',
    address: '四川省资阳市安岳县',
    bankAccount: '6222020987654321098',
    bankName: '农业银行',
    bankLineNo: '103100000012',
    workerType: 'bricklayer',
    dailyWage: 300,
    createdAt: '2025-01-10T00:00:00Z',
    ...overrides,
  }
}

export function createMockProjectWorker(overrides?: Partial<ProjectWorker>): ProjectWorker {
  return {
    id: 1,
    workerId: 1,
    projectId: 1,
    teamId: 1,
    dailyWage: 300,
    workerType: 'bricklayer',
    entryDate: '2025-02-01',
    status: 'active',
    remarks: '',
    createdAt: '2025-02-01T00:00:00Z',
    workerName: '王小明',
    workerIdCard: '510923198505051234',
    projectName: '安岳县2025年高标准农田建设项目',
    teamName: '泥工班组',
    ...overrides,
  }
}

// ═══════════════════════════════════════════
// Department
// ═══════════════════════════════════════════

export function createMockDepartment(overrides?: Partial<Department>): Department {
  return {
    id: 1,
    name: '工程部',
    managerId: 1,
    memberCount: 5,
    positions: ['项目经理', '工程师', '技术员'],
    createdAt: '2025-01-01T00:00:00Z',
    ...overrides,
  }
}

// ═══════════════════════════════════════════
// 常用 mock 数据集
// ═══════════════════════════════════════════

export const mockProjectList: Project[] = [
  createMockProject({ id: 1, name: '安岳县2025年高标准农田建设项目' }),
  createMockProject({ id: 2, name: '乐至县2024年高标准农田建设项目', status: 'completed' }),
]

export const mockPartnerList: Partner[] = [
  createMockPartner({ id: 1, name: '成都金图腾建筑劳务有限公司', category: 'labor' }),
  createMockPartner({ id: 2, name: '中建一局', category: 'general_contract' }),
  createMockPartner({ id: 3, name: '华强材料', category: 'material' }),
]

export const mockMemberList: Member[] = [
  createMockMember({ id: 1, name: '张经理', memberType: 'staff' }),
  createMockMember({ id: 2, name: '李工程师', memberType: 'staff' }),
]

export const mockWorkerList: Worker[] = [
  createMockWorker({ id: 1, name: '王小明' }),
  createMockWorker({ id: 2, name: '赵大伟' }),
]

export const mockProjectWorkerList: ProjectWorker[] = [
  createMockProjectWorker({ id: 1, workerId: 1, workerName: '王小明' }),
  createMockProjectWorker({ id: 2, workerId: 2, workerName: '赵大伟' }),
]
