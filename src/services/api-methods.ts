/**
 * API 桥接层
 *
 * 通过 HTTP 调用 C# 后端 API
 * 保持与 Electron/Tauri 版本兼容的接口
 */

import { apiClient } from './api-client';
import type {
  Project, Member, Worker, ProjectWorker, Partner, Invoice,
  IncomeContract, ExpenseContract, AgreementContract, Settlement,
  CostLedgerEntry, CostLedgerBatch, CostLedgerCategory, CostLedgerMatchRule,
  AttendanceRecord, WageRecord, Department, Template, ContractTemplate,
  PaymentRecord, Region, Supervisor, WorkerTeam, SalaryHistoryEntry,
  UserInfo, InventoryItem, InventoryTransaction, Material, Expense,
  Drawing, AuditLogEntry, SnapshotInfo
} from '../types/electron';

// ============ 导出的 API ============

export const tauriAPI = {
  // ────────── 系统 ──────────
  getAppVersion: () => '1.0.0',
  getDataPath: () => apiClient.get<string>('/api/config/data-path'),
  getUploadsPath: () => apiClient.get<string>('/api/config/uploads-path'),
  openDevTools: () => {
    if ((window as any).chrome?.webview)
      (window as any).chrome.webview.postMessage(JSON.stringify({ action: 'devtools' }));
  },

  // ────────── 窗口控制（通过 WebView2 消息） ──────────
  minimizeWindow: () => {
    if ((window as any).chrome?.webview)
      (window as any).chrome.webview.postMessage(JSON.stringify({ action: 'minimize' }));
  },
  toggleMaximize: () => {
    if ((window as any).chrome?.webview)
      (window as any).chrome.webview.postMessage(JSON.stringify({ action: 'maximize' }));
  },
  closeWindow: () => {
    if ((window as any).chrome?.webview)
      (window as any).chrome.webview.postMessage(JSON.stringify({ action: 'close' }));
  },
  isMaximized: () => Promise.resolve({ success: true, data: false }),
  setFullScreen: () => {
    if ((window as any).chrome?.webview)
      (window as any).chrome.webview.postMessage(JSON.stringify({ action: 'fullscreen' }));
  },
  isFullScreen: () => Promise.resolve({ success: true, data: false }),
  resizeForLogin: () => {
    if ((window as any).chrome?.webview)
      (window as any).chrome.webview.postMessage(JSON.stringify({ action: 'resize', width: 300, height: 400 }));
  },
  resizeForApp: () => {
    if ((window as any).chrome?.webview)
      (window as any).chrome.webview.postMessage(JSON.stringify({ action: 'resize', width: 1400, height: 900 }));
  },
  startDrag: () => {
    if ((window as any).chrome?.webview)
      (window as any).chrome.webview.postMessage(JSON.stringify({ action: 'startDrag' }));
  },

  // ────────── 认证 ──────────
  login: (username: string, password: string) =>
    apiClient.post<any>('/api/auth/login', { username, password }),
  authLogin: (username: string, password: string) =>
    apiClient.post<any>('/api/auth/login', { username, password }),
  setSession: () => {},
  clearSession: () => {},

  // ────────── 用户管理 ──────────
  getAllUsers: () => apiClient.get<UserInfo[]>('/api/users'),
  authGetAllUsers: () => apiClient.get<UserInfo[]>('/api/users'),
  getUser: (id: string) => apiClient.get<UserInfo>(`/api/users/${id}`),
  authGetCurrentUser: (id: string) => apiClient.get<UserInfo>(`/api/users/${id}`),
  createUser: (user: Partial<UserInfo>) => apiClient.post<UserInfo>('/api/users', user),
  authCreateUser: (user: Partial<UserInfo>) => apiClient.post<UserInfo>('/api/users', user),
  updateUser: (user: Partial<UserInfo>) => apiClient.put<void>('/api/users', user),
  authUpdateUser: (user: Partial<UserInfo>) => apiClient.put<void>('/api/users', user),
  deleteUser: (id: string) => apiClient.del<void>(`/api/users/${id}`),
  authDeleteUser: (id: string) => apiClient.del<void>(`/api/users/${id}`),


  // ────────── 用户偏好 (v0.75.0 PII Mask toggle 多设备同步) ──────────
  getUserPreferences: () => apiClient.get<Record<string, string>>('/api/user-preferences'),
  getUserPreference: (key: string) =>
    apiClient.get<{ key: string; value: string }>(`/api/user-preferences/${key}`),
  putUserPreference: (key: string, value: string) =>
    apiClient.put<any>(`/api/user-preferences/${key}`, { value }),
  putUserPreferences: (prefs: Record<string, string>) =>
    apiClient.put<{ updated: number }>('/api/user-preferences', prefs),

  // ────────── 仪表盘 ──────────
  getDashboardStats: () => apiClient.get<any>('/api/dashboard/stats'),

  // ────────── 项目 ──────────
  getProjects: () => apiClient.get<Project[]>('/api/projects'),
  getProject: (id: number) => apiClient.get<Project>(`/api/projects/${id}`),
  createProject: (project: Partial<Project>) => apiClient.post<Project>('/api/projects', project),
  updateProject: (project: Partial<Project>) => apiClient.put<void>(`/api/projects/${project.id}`, project),
  deleteProject: (id: number) => apiClient.del<void>(`/api/projects/${id}`),

  // ────────── 成员 ──────────
  getMembers: () => apiClient.get<Member[]>('/api/members'),
  createMember: (member: Partial<Member>) => apiClient.post<Member>('/api/members', member),
  updateMember: (member: Partial<Member>) => apiClient.put<void>('/api/members', member),
  deleteMember: (id: number) => apiClient.del<void>(`/api/members/${id}`),

  // ────────── 工人 ──────────
  getWorkers: () => apiClient.get<Worker[]>('/api/workers'),
  getWorkerStats: () => apiClient.get<{ total: number; active: number }>('/api/workers/stats'),
  getProjectWorkers: (projectId?: number) =>
    apiClient.get<ProjectWorker[]>('/api/project-workers', { projectId }),
  createWorker: (worker: Partial<Worker>) => apiClient.post<Worker>('/api/workers', worker),
  updateWorker: (worker: Partial<Worker>) => apiClient.put<void>('/api/workers', worker),
  deleteWorker: (id: number) => apiClient.del<void>(`/api/workers/${id}`),
  createProjectWorker: (pw: Partial<ProjectWorker>) => apiClient.post<ProjectWorker>('/api/project-workers', pw),
  batchCreateProjectWorkers: (pws: Partial<ProjectWorker>[]) =>
    apiClient.post<{ count: number }>('/api/project-workers/batch', pws),
  updateProjectWorker: (pw: Partial<ProjectWorker>) => apiClient.put<void>('/api/project-workers', pw),
  deleteProjectWorker: (id: number) => apiClient.del<void>(`/api/project-workers/${id}`),

  // ────────── 合作伙伴 ──────────
  getPartners: (projectId?: number) =>
    apiClient.get<Partner[]>('/api/partners', { projectId }),
  createPartner: (partner: Partial<Partner>) => apiClient.post<Partner>('/api/partners', partner),
  updatePartner: (partner: Partial<Partner>) => apiClient.put<void>('/api/partners', partner),
  deletePartner: (id: number) => apiClient.del<void>(`/api/partners/${id}`),

  // ────────── 发票 ──────────
  getInvoices: (projectId?: number) =>
    apiClient.get<Invoice[]>('/api/invoices', { projectId }),
  createInvoice: (invoice: Partial<Invoice>) => apiClient.post<Invoice>('/api/invoices', invoice),
  updateInvoice: (invoice: Partial<Invoice>) => apiClient.put<void>('/api/invoices', invoice),
  deleteInvoice: (id: number) => apiClient.del<void>(`/api/invoices/${id}`),
  updateInvoiceStatus: (id: number, status: string) =>
    apiClient.put<void>(`/api/invoices/${id}/status`, { status }),

  // ────────── 合同 ──────────
  getIncomeContracts: (projectId?: number) =>
    apiClient.get<IncomeContract[]>('/api/contracts/income', { projectId }),
  getExpenseContracts: (projectId?: number) =>
    apiClient.get<ExpenseContract[]>('/api/contracts/expense', { projectId }),
  getAgreementContracts: (projectId?: number) =>
    apiClient.get<AgreementContract[]>('/api/contracts/agreement', { projectId }),
  getContracts: (projectId?: number) =>
    apiClient.get<IncomeContract[]>('/api/contracts/income', { projectId }),
  createIncomeContract: (contract: Partial<IncomeContract>) =>
    apiClient.post<IncomeContract>('/api/contracts/income', contract),
  createExpenseContract: (contract: Partial<ExpenseContract>) =>
    apiClient.post<ExpenseContract>('/api/contracts/expense', contract),
  createContract: (contract: Partial<AgreementContract>) =>
    apiClient.post<AgreementContract>('/api/contracts/income', contract),
  updateIncomeContract: (contract: Partial<IncomeContract>) =>
    apiClient.put<void>('/api/contracts/income', contract),
  updateExpenseContract: (contract: Partial<ExpenseContract>) =>
    apiClient.put<void>('/api/contracts/expense', contract),
  deleteIncomeContract: (id: number) =>
    apiClient.del<void>(`/api/contracts/income/${id}`),
  deleteExpenseContract: (id: number) =>
    apiClient.del<void>(`/api/contracts/expense/${id}`),
  deleteContract: (id: number) =>
    apiClient.del<void>(`/api/contracts/income/${id}`),
  getContractStats: () => apiClient.get<any>('/api/contracts/stats'),

  // ────────── 结算 ──────────
  getSettlements: (projectId?: number) =>
    apiClient.get<Settlement[]>('/api/settlements', { projectId }),
  createSettlement: (settlement: Partial<Settlement>) =>
    apiClient.post<Settlement>('/api/settlements', settlement),
  updateSettlement: (settlement: Partial<Settlement>) =>
    apiClient.put<void>('/api/settlements', settlement),
  deleteSettlement: (id: number) =>
    apiClient.del<void>(`/api/settlements/${id}`),
  processSettlement: (id: number) =>
    apiClient.put<void>(`/api/settlements/${id}/process`),
  unarchiveSettlement: (id: number) =>
    apiClient.put<void>(`/api/settlements/${id}/unarchive`),

  // ────────── 成本台账 ──────────
  getCostLedger: (projectId?: number) =>
    apiClient.get<CostLedgerEntry[]>('/api/cost-ledger', { projectId }),
  createCostLedger: (entry: Partial<CostLedgerEntry>) =>
    apiClient.post<CostLedgerEntry>('/api/cost-ledger', entry),
  updateCostLedger: (entry: Partial<CostLedgerEntry>) =>
    apiClient.put<void>('/api/cost-ledger', entry),
  deleteCostLedger: (id: number) =>
    apiClient.del<void>(`/api/cost-ledger/${id}`),
  getCostLedgerSummary: (projectId?: number) =>
    apiClient.get<any>('/api/cost-ledger/summary', { projectId }),
  getCostLedgerCategories: () =>
    apiClient.get<CostLedgerCategory[]>('/api/cost-ledger/categories'),
  createCostLedgerCategory: (category: Partial<CostLedgerCategory>) =>
    apiClient.post<CostLedgerCategory>('/api/cost-ledger/categories', category),
  updateCostLedgerCategory: (category: Partial<CostLedgerCategory>) =>
    apiClient.put<void>('/api/cost-ledger/categories', category),
  deleteCostLedgerCategory: (id: number) =>
    apiClient.del<void>(`/api/cost-ledger/categories/${id}`),
  resetCostLedgerCategories: () =>
    apiClient.post<void>('/api/cost-ledger/categories/reset'),
  batchCreateCostLedger: (entries: Partial<CostLedgerEntry>[]) =>
    apiClient.post<{ count: number }>('/api/cost-ledger/batch', entries),
  getCostLedgerBatches: (projectId: number) =>
    apiClient.get<CostLedgerBatch[]>(`/api/cost-ledger/batches`, { projectId }),
  createCostLedgerBatch: (batch: Partial<CostLedgerBatch>) =>
    apiClient.post<CostLedgerBatch>('/api/cost-ledger/batches', batch),
  copyCostLedgerBatch: (batchId: number, newName: string) =>
    apiClient.post<CostLedgerBatch>(`/api/cost-ledger/batches/${batchId}/copy`, { newName }),
  renameCostLedgerBatch: (batchId: number, newName: string) =>
    apiClient.put<void>(`/api/cost-ledger/batches/${batchId}`, { newName }),
  deleteCostLedgerBatch: (batchId: number) =>
    apiClient.del<void>(`/api/cost-ledger/batches/${batchId}`),
  getCostLedgerMatchRules: () =>
    apiClient.get<CostLedgerMatchRule[]>('/api/cost-ledger/match-rules'),
  saveCostLedgerMatchRule: (rule: Partial<CostLedgerMatchRule>) =>
    apiClient.post<CostLedgerMatchRule>('/api/cost-ledger/match-rules', rule),

  // ────────── 考勤 ──────────
  getAttendances: (projectId?: number, yearMonth?: string) =>
    apiClient.get<AttendanceRecord[]>('/api/attendances', { projectId, yearMonth }),
  getAttendancesByMember: (memberId: number, yearMonth?: string) =>
    apiClient.get<AttendanceRecord[]>(`/api/attendances/member/${memberId}`, { yearMonth }),
  createAttendance: (record: Partial<AttendanceRecord>) =>
    apiClient.post<AttendanceRecord>('/api/attendances', record),
  updateAttendance: (record: Partial<AttendanceRecord>) =>
    apiClient.put<void>('/api/attendances', record),
  deleteAttendance: (id: number) =>
    apiClient.del<void>(`/api/attendances/${id}`),
  batchDeleteAttendances: (ids: number[]) =>
    apiClient.post<{ deleted: number }>('/api/attendances/batch-delete', ids),
  batchCreateAttendances: (records: Partial<AttendanceRecord>[]) =>
    apiClient.post<{ count: number }>('/api/attendances/batch-create', records),
  generateDefaultAttendances: (projectId: number, yearMonth: string, memberIds: number[]) =>
    apiClient.post<{ count: number }>('/api/attendances/generate', { projectId, yearMonth, memberIds }),
  generateDefaultAttendancesV2: (projectId: number, yearMonth: string, projectWorkerIds: number[]) =>
    apiClient.post<{ count: number }>('/api/attendances/generate-v2', { projectId, yearMonth, projectWorkerIds }),
  batchImportAttendances: (projectId: number, yearMonth: string, records: Partial<AttendanceRecord>[]) =>
    apiClient.post<{ created: number; updated: number }>('/api/attendances/batch-import', { projectId, yearMonth, records }),

  // ────────── 工资 ──────────
  getWages: (projectId?: number, yearMonth?: string) =>
    apiClient.get<WageRecord[]>('/api/wages', { projectId, yearMonth }),
  generateForProject: (projectId: number, yearMonth: string) =>
    apiClient.post<{ newCount: number; archivedSkipped: number }>('/api/wages/generate', { projectId, yearMonth }),
  createWage: (record: Partial<WageRecord>) => apiClient.post<WageRecord>('/api/wages', record),
  updateWage: (record: Partial<WageRecord>) => apiClient.put<void>('/api/wages', record),
  deleteWage: (id: number) => apiClient.del<void>(`/api/wages/${id}`),
  batchDeleteWages: (ids: number[]) =>
    apiClient.post<{ deleted: number }>('/api/wages/batch-delete', ids),
  batchClearPayments: (ids: number[]) =>
    apiClient.post<{ cleared: number }>('/api/wages/batch-clear-payments', ids),
  archiveWages: (ids: number[]) =>
    apiClient.post<{ archived: number }>('/api/wages/archive', ids),
  getWageStats: (projectId?: number, yearMonth?: string) =>
    apiClient.get<{ totalWage: number; count: number }>('/api/wages/stats', { projectId, yearMonth }),
  matchBankReceiptItems: (projectId?: number, yearMonth?: string, items?: any[]) =>
    apiClient.post<any[]>('/api/wages/match-receipts', { projectId, yearMonth, items }),
  batchConfirmMatches: (matches: any[], yearMonth?: string) =>
    apiClient.post<{ updated: number }>('/api/wages/confirm-matches', { matches, yearMonth }),
  getWagePaymentRecords: (projectId?: number, yearMonth?: string) =>
    apiClient.get<PaymentRecord[]>('/api/wages/payment-records', { projectId, yearMonth }),
  getWageOverdueStats: (projectId?: number) =>
    apiClient.get<{ count: number; amount: number }>('/api/wages/overdue-stats', { projectId }),
  getWageOverdueList: (projectId?: number) =>
    apiClient.get<any[]>('/api/wages/overdue-list', { projectId }),
  batchArchiveWages: (ids: number[]) =>
    apiClient.post<{ archived: number }>('/api/wages/archive', ids),
  batchSaveWages: (records: Partial<WageRecord>[]) =>
    apiClient.post<{ saved: number }>('/api/wages/batch-save', records),

  // ────────── 薪资历史 ──────────
  getWageHistory: (projectWorkerId: number) =>
    apiClient.get<WageRecord[]>(`/api/wage-history/${projectWorkerId}`),
  getEffectiveWage: (projectWorkerId: number, yearMonth: string) =>
    apiClient.get<WageRecord | null>(`/api/wage-history/${projectWorkerId}/effective`, { yearMonth }),
  getTeamWages: (projectId: number, teamId: number) =>
    apiClient.get<{ workerCount: number; teamTotal: number; details: any[] }>('/api/team-wages', { projectId, teamId }),
  getSalaryHistory: (memberId: number) =>
    apiClient.get<SalaryHistoryEntry[]>(`/api/salary-history/${memberId}`),
  createSalaryHistory: (entry: Partial<SalaryHistoryEntry>) =>
    apiClient.post<SalaryHistoryEntry>('/api/salary-history', entry),
  deleteSalaryHistory: (id: number) =>
    apiClient.del<void>(`/api/salary-history/${id}`),
  getEffectiveSalary: (memberId: number, yearMonth: string) =>
    apiClient.get<any>(`/api/salary-history/${memberId}/effective`, { yearMonth }),

  // ────────── 审计日志 ──────────
  auditLog: (entry: Partial<AuditLogEntry>) => {
    const normalized = {
      ...entry,
      resourceId: entry.resourceId != null ? String(entry.resourceId) : undefined,
      details: typeof entry.details === 'object' ? JSON.stringify(entry.details) : entry.details,
    };
    return apiClient.post<void>('/api/audit/logs', normalized);
  },
  auditQuery: (query: any) => apiClient.get<{ items: AuditLogEntry[]; total: number }>('/api/audit/logs', query),
  queryAuditLogs: (query: any) => apiClient.get<{ items: AuditLogEntry[]; total: number }>('/api/audit/logs', query),
  auditStats: (days?: number) => apiClient.get<{ totalCount: number; todayCount: number }>('/api/audit/stats', { days }),
  auditClear: (daysToKeep: number) =>
    apiClient.post<{ removedCount: number }>('/api/audit/clear', { daysToKeep }),

  // ────────── 角色权限 ──────────
  getRoles: () => apiClient.get<{ id: string; name: string; permissions: string }[]>('/api/roles'),
  updateRole: (roleId: string, permissions: string[]) =>
    apiClient.put<void>('/api/roles', { roleId, permissions }),
  resetRole: (roleId: string) =>
    apiClient.post<{ permissions: string[] }>(`/api/roles/${roleId}/reset`),

  // ────────── 部门 ──────────
  getDepartments: () => apiClient.get<Department[]>('/api/departments'),
  createDepartment: (department: Partial<Department>) =>
    apiClient.post<Department>('/api/departments', department),
  updateDepartment: (id: number, updates: Partial<Department>) =>
    apiClient.put<void>('/api/departments', { id, ...updates }),
  deleteDepartment: (id: number) =>
    apiClient.del<void>(`/api/departments/${id}`),

  // ────────── 模板 ──────────
  getTemplates: () => apiClient.get<Template[]>('/api/templates'),
  getTemplateStats: () => apiClient.get<{ total: number; byCategory: any[] }>('/api/templates/stats'),
  createTemplate: (template: Partial<Template>) =>
    apiClient.post<Template>('/api/templates', template),
  updateTemplate: (template: Partial<Template>) =>
    apiClient.put<void>('/api/templates', template),

  // ────────── 合同模板 ──────────
  getContractTemplates: () => apiClient.get<ContractTemplate[]>('/api/contract-templates'),
  createContractTemplate: (template: Partial<ContractTemplate>) =>
    apiClient.post<ContractTemplate>('/api/contract-templates', template),
  updateContractTemplate: (id: number, updates: Partial<ContractTemplate>) =>
    apiClient.put<void>('/api/contract-templates', { id, ...updates }),

  // ────────── 收付款记录 ──────────
  getPaymentRecords: (paymentType?: string, projectId?: number) =>
    apiClient.get<PaymentRecord[]>('/api/payment-records', { paymentType, projectId }),
  createPaymentRecord: (record: Partial<PaymentRecord>) =>
    apiClient.post<PaymentRecord>('/api/payment-records', record),
  updatePaymentRecord: (id: number, updates: Partial<PaymentRecord>) =>
    apiClient.put<void>('/api/payment-records', { id, ...updates }),
  deletePaymentRecord: (id: number) =>
    apiClient.del<void>(`/api/payment-records/${id}`),

  // ────────── 快照 ──────────
  getSnapshots: () => apiClient.get<SnapshotInfo[]>('/api/snapshots'),
  getMaxSnapshots: () => apiClient.get<number>('/api/snapshots/max-count'),
  createSnapshot: () => apiClient.post<{ id: string; name: string }>('/api/snapshots'),
  restoreSnapshot: (id: string) => apiClient.post<void>(`/api/snapshots/${id}/restore`),
  deleteSnapshot: (id: string) => apiClient.del<void>(`/api/snapshots/${id}`),
  setMaxSnapshots: (count: number) => apiClient.put<void>('/api/snapshots/max-count', { count }),
  backupDatabase: () => apiClient.post<{ path: string }>('/api/backup'),
  restoreDatabase: () => apiClient.post<void>('/api/restore'),
  diagnoseDatabase: () => apiClient.post<{ result: string; tables: string[] }>('/api/diagnose'),

  // ────────── 区域 ──────────
  getRegions: () => apiClient.get<Region[]>('/api/regions'),
  createRegion: (region: Partial<Region>) => apiClient.post<Region>('/api/regions', region),

  // ────────── 监管单位 ──────────
  getSupervisors: () => apiClient.get<Supervisor[]>('/api/supervisors'),
  createSupervisor: (supervisor: Partial<Supervisor>) =>
    apiClient.post<Supervisor>('/api/supervisors', supervisor),
  updateSupervisor: (id: number, updates: Partial<Supervisor>) =>
    apiClient.put<void>('/api/supervisors', { id, ...updates }),

  // ────────── 项目成员 ──────────
  getProjectMembers: (projectId: number) =>
    apiClient.get<Member[]>(`/api/project-members/${projectId}`),
  addProjectMember: (projectId: number, memberId: number, joinedAt?: string) =>
    apiClient.post<{ id: number }>('/api/project-members', { projectId, memberId, joinedAt }),
  removeProjectMember: (id: number) =>
    apiClient.del<void>(`/api/project-members/${id}`),
  updateProjectMember: (id: number, updates: any) =>
    apiClient.put<void>('/api/project-members', { id, ...updates }),

  // ────────── 班组 ──────────
  getWorkerTeams: (projectId?: number) =>
    apiClient.get<WorkerTeam[]>('/api/worker-teams', { projectId }),
  createWorkerTeam: (team: Partial<WorkerTeam>) =>
    apiClient.post<WorkerTeam>('/api/worker-teams', team),
  updateWorkerTeam: (id: number, updates: Partial<WorkerTeam>) =>
    apiClient.put<void>('/api/worker-teams', { id, ...updates }),

  // ────────── 图纸 ──────────
  getDrawings: (projectId?: number) =>
    apiClient.get<Drawing[]>('/api/drawings', { projectId }),
  uploadDrawing: (drawing: Partial<Drawing>) =>
    apiClient.post<Drawing>('/api/drawings', drawing),
  updateDrawing: (id: number, updates: Partial<Drawing>) =>
    apiClient.put<void>('/api/drawings', { id, ...updates }),

  // ────────── 费用 ──────────
  getExpenses: (projectId?: number) =>
    apiClient.get<Expense[]>('/api/expenses', { projectId }),
  createExpense: (expense: Partial<Expense>) =>
    apiClient.post<Expense>('/api/expenses', expense),
  updateExpense: (id: number, updates: Partial<Expense>) =>
    apiClient.put<void>('/api/expenses', { id, ...updates }),

  // ────────── 库存 ──────────
  getInventoryItems: () => apiClient.get<InventoryItem[]>('/api/inventory'),
  createInventoryItem: (item: Partial<InventoryItem>) =>
    apiClient.post<InventoryItem>('/api/inventory', item),
  updateInventoryItem: (id: number, updates: Partial<InventoryItem>) =>
    apiClient.put<void>('/api/inventory', { id, ...updates }),
  getInventoryTransactions: (itemId?: number) =>
    apiClient.get<InventoryTransaction[]>('/api/inventory/transactions', { itemId }),
  createInventoryTransaction: (transaction: Partial<InventoryTransaction>) =>
    apiClient.post<InventoryTransaction>('/api/inventory/transactions', transaction),

  // ────────── 物料 ──────────
  getMaterials: (projectId?: number) =>
    apiClient.get<Material[]>('/api/materials', { projectId }),
  createMaterial: (material: Partial<Material>) =>
    apiClient.post<Material>('/api/materials', material),
  updateMaterial: (id: number, updates: Partial<Material>) =>
    apiClient.put<void>('/api/materials', { id, ...updates }),
  deleteMaterial: (id: number) =>
    apiClient.del<void>(`/api/materials/${id}`),

  // ────────── 配置 ──────────
  getConfig: () => apiClient.get<{ dataPath: string; defaultPath: string; gpuAcceleration?: boolean }>('/api/config'),
  setDataPath: (path: string) => apiClient.put<void>('/api/config/data-path', { path }),
  getGpuAcceleration: () => apiClient.get<boolean>('/api/config/gpu-acceleration'),
  setGpuAcceleration: (enabled: boolean) =>
    apiClient.put<void>('/api/config/gpu-acceleration', { enabled }),

  // ────────── PII Key Rotation (v0.76.0 累计待办 #5) ──────────
  getPiiKeys: () => apiClient.get<{ keys: any[]; activeKeyId: number; totalKeys: number }>('/api/admin/pii/keys'),
  rotatePiiKey: () => apiClient.post<{ newKeyId: number; message: string }>('/api/admin/pii/rotate', {}),

  // ────────── 数据健康 ──────────
  dataConsistencyCheck: () => apiClient.get<{ tables: { table: string; count: number }[]; consistent: boolean }>('/api/health/consistency'),
  consistencyCheck: () => apiClient.get<{ tables: { table: string; count: number }[]; consistent: boolean }>('/api/health/consistency'),
  dataIntegrityCheck: () => apiClient.get<{ ok: boolean; result: string }>('/api/health/integrity'),
  integrityCheck: () => apiClient.get<{ ok: boolean; result: string }>('/api/health/integrity'),
  dataExportJson: () => apiClient.post<{ exported: number }>('/api/health/export-json'),
  exportJson: () => apiClient.post<{ exported: number }>('/api/health/export-json'),
  dataReconcile: () => apiClient.post<{ reconciled: boolean }>('/api/health/reconcile'),
  reconcile: () => apiClient.post<{ reconciled: boolean }>('/api/health/reconcile'),

  // ────────── SQLite 设置 ──────────
  sqliteStatus: () => apiClient.get<{ ready: boolean; mode: string; dbPath?: string; dbSize?: number; summary?: Record<string, number> }>('/api/sqlite/status'),
  getSqliteStatus: () => apiClient.get<{ ready: boolean; mode: string; dbPath?: string; dbSize?: number; summary?: Record<string, number> }>('/api/sqlite/status'),
  sqliteEnable: () => apiClient.post<void>('/api/sqlite/enable'),
  enableSqlite: () => apiClient.post<void>('/api/sqlite/enable'),
  sqliteMigrate: () => apiClient.post<void>('/api/sqlite/migrate'),
  migrateToSqlite: () => apiClient.post<void>('/api/sqlite/migrate'),
  sqliteGetReadMode: () => apiClient.get<string>('/api/sqlite/read-mode'),
  getSqliteReadMode: () => apiClient.get<string>('/api/sqlite/read-mode'),
  sqliteSetReadMode: (mode: string) =>
    apiClient.put<void>('/api/sqlite/read-mode', { mode }),
  setSqliteReadMode: (mode: string) =>
    apiClient.put<void>('/api/sqlite/read-mode', { mode }),

  // ────────── OCR ──────────
  ocrBaiduIdCard: (imageBase64: string, config: { apiKey?: string; secretKey?: string }) =>
    apiClient.post<{ success: boolean; data?: any; error?: string }>('/api/ocr/id-card', { imageBase64, config }),
  ocrBaiduInvoice: (imageBase64: string, config: { apiKey?: string; secretKey?: string }) =>
    apiClient.post<{ success: boolean; data?: any; error?: string }>('/api/ocr/invoice', { imageBase64, config }),
  ocrBaiduBankCard: (imageBase64: string, config: { apiKey?: string; secretKey?: string }) =>
    apiClient.post<{ success: boolean; data?: any; error?: string }>('/api/ocr/bank-card', { imageBase64, config }),
  ocrBaiduBusinessLicense: (imageBase64: string, config: { apiKey?: string; secretKey?: string }) =>
    apiClient.post<{ success: boolean; data?: any; error?: string }>('/api/ocr/business-license', { imageBase64, config }),
  ocrBaiduBankReceipt: (imageBase64: string, config: { apiKey?: string; secretKey?: string }) =>
    apiClient.post<{ success: boolean; data?: any; error?: string }>('/api/ocr/bank-receipt', { imageBase64, config }),
  ocrBaiduPermit: (imageBase64: string, config: { apiKey?: string; secretKey?: string }) =>
    apiClient.post<{ success: boolean; data?: any; error?: string }>('/api/ocr/permit', { imageBase64, config }),
  ocrBaiduBankStatement: (imageBase64: string, config: { apiKey?: string; secretKey?: string }) =>
    apiClient.post<{ success: boolean; data?: any; error?: string }>('/api/ocr/bank-statement', { imageBase64, config }),
  ocrBaiduGeneralReceipt: (imageBase64: string, config: { apiKey?: string; secretKey?: string }) =>
    apiClient.post<{ success: boolean; data?: any; error?: string }>('/api/ocr/general-receipt', { imageBase64, config }),
  ocrBaiduCompanyQuery: (companyName: string, config: { apiKey?: string; secretKey?: string }) =>
    apiClient.post<{ success: boolean; data?: any; error?: string }>('/api/ocr/company-query', { companyName, config }),
  ocrCheckNetwork: () => apiClient.get<boolean>('/api/ocr/check-network'),
  ocrClearTokenCache: () => apiClient.post<boolean>('/api/ocr/clear-token-cache'),
  ocrGetStats: () => apiClient.get<{ idCard: number; invoice: number; bankCard: number; businessLicense: number; bankReceipt: number; permit: number; bankStatement: number; generalReceipt: number; companyQuery: number; lastReset: string }>('/api/ocr/stats'),

  // ────────── 文件操作 ──────────
  saveFile: (options: { category?: string; subCategory?: string; fileName?: string; fileData?: string; projectName?: string }) =>
    apiClient.post<{ fileName: string }>('/api/files/save', options),
  readFile: (options: { category: string; fileName: string; projectName?: string }) =>
    apiClient.get<{ dataUrl: string; mimeType: string }>('/api/files/read', options),
  deleteFile: (options: { category?: string; fileName?: string }) =>
    apiClient.post<void>('/api/files/delete', options),
  openFileExternal: (options: { category?: string; fileName?: string }) =>
    apiClient.post<void>('/api/files/open-external', options),

  // ────────── 合同文件 ──────────
  readContractFile: (fileName: string, subCategory: string, projectName?: string | null) =>
    apiClient.get<{ dataUrl: string; mimeType: string }>('/api/contracts/read-file', { fileName, subCategory, projectName }),
  saveContractFile: (options: { subCategory?: string; projectName?: string; fileName?: string; fileData?: string }) =>
    apiClient.post<{ fileName: string }>('/api/contracts/save-file', options),
};

export default tauriAPI;
