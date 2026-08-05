/**
 * API 桥接层
 *
 * 通过 HTTP 调用 C# 后端 API
 * 保持与 Electron/Tauri 版本兼容的接口
 */

import { apiClient, setToken } from './api-client';
import type {
  Project, Member, Worker, UserInfo, Department, Material,
  Partner, Region, Supervisor, IncomeContract, ExpenseContract, AgreementContract,
  ContractStats, DashboardStats, Settlement,
  Template, TemplateVariable, ContractTemplate,
  InventoryItem, InventoryTransaction,
  Invoice, InvoiceStatus,
  PaymentRecord,
  AttendanceRecord,
  WageRecord, WageStats, SalaryHistoryEntry,
  AuditLogEntry, SnapshotInfo,
  CostLedgerEntry, CostLedgerBatch, CostLedgerMatchRule, CostLedgerSummary, CostLedgerCategory,
  WorkerTeam, ProjectWorker, ProjectMember, Drawing,
  SqliteStatus,
  BankReceiptMatch,
  StoredAuth,
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
  login: async (username: string, password: string) => {
    const result = await apiClient.post<StoredAuth & { token: string }>('/api/auth/login', { username, password });
    if (result.success && result.data?.token) {
      setToken(result.data.token);
    }
    return result;
  },
  authLogin: (username: string, password: string) =>
    apiClient.post<StoredAuth & { token: string }>('/api/auth/login', { username, password }),
  // v0.83.0: 用户自助修改密码 (校验旧密码 + JWT uid, 任意角色可用)
  changeOwnPassword: (oldPassword: string, newPassword: string) =>
    apiClient.post<{ changed: boolean }>('/api/auth/change-password', { oldPassword, newPassword }),
  setSession: () => {},
  clearSession: () => {},

  // ────────── 用户管理 ──────────
  getAllUsers: () => apiClient.get<UserInfo[]>('/api/users'),
  authGetAllUsers: () => apiClient.get<UserInfo[]>('/api/users'),
  getUser: (id: string) => apiClient.get<UserInfo>(`/api/users/${id}`),
  authGetCurrentUser: (id: string) => apiClient.get<UserInfo>(`/api/users/${id}`),
  createUser: (user: { username: string; password: string; displayName: string; roleId: string }) => apiClient.post<{ id: string }>('/api/users', user),
  authCreateUser: (user: { username: string; password: string; displayName: string; roleId: string }) => apiClient.post<{ id: string }>('/api/users', user),
  updateUser: (user: { id: string; displayName?: string; roleId?: string; status?: string; password?: string }) => apiClient.put<void>('/api/users', user),
  authUpdateUser: (user: { id: string; displayName?: string; roleId?: string; status?: string; password?: string }) => apiClient.put<void>('/api/users', user),
  deleteUser: (id: string) => apiClient.del<void>(`/api/users/${id}`),
  authDeleteUser: (id: string) => apiClient.del<void>(`/api/users/${id}`),

  // ────────── 项目授权管理 (admin only, P0-4 闭环 UI) ──────────
  // 4 个端点: GET list / GET by-user / POST 授权 (幂等) / DELETE 撤销
  getProjectAuthorizations: () =>
    apiClient.get<{ projectId: number; userId: string; grantedAt: string }[]>('/api/admin/project-authorizations'),
  getProjectAuthorizationsByUser: (userId: string) =>
    apiClient.get<{ projectId: number; userId: string; grantedAt: string }[]>(`/api/admin/project-authorizations/by-user/${userId}`),
  grantProjectAuthorization: (projectId: number, userId: string) =>
    apiClient.post<{ granted: boolean }>('/api/admin/project-authorizations', { projectId, userId }),
  revokeProjectAuthorization: (projectId: number, userId: string) =>
    apiClient.del<void>(`/api/admin/project-authorizations/${projectId}/${userId}`),


  // ────────── 用户偏好 (v0.75.0 PII Mask toggle 多设备同步) ──────────
  getUserPreferences: () => apiClient.get<Record<string, string>>('/api/user-preferences'),
  getUserPreference: (key: string) =>
    apiClient.get<{ key: string; value: string }>(`/api/user-preferences/${key}`),
  putUserPreference: (key: string, value: string) =>
    apiClient.put<{ updated: number }>(`/api/user-preferences/${key}`, { value }),
  putUserPreferences: (prefs: Record<string, string>) =>
    apiClient.put<{ updated: number }>('/api/user-preferences', prefs),

  // ────────── 仪表盘 ──────────
  getDashboardStats: () => apiClient.get<DashboardStats>('/api/dashboard/stats'),

  // ────────── 项目 ──────────
  getProjects: () => apiClient.get<Project[]>('/api/projects'),
  getProject: (id: number) => apiClient.get<Project>(`/api/projects/${id}`),
  createProject: (project: Partial<Project>) => apiClient.post<{ id: number }>('/api/projects', project),
  updateProject: (project: Project) => apiClient.put<void>(`/api/projects/${project.id}`, project),
  deleteProject: (id: number) => apiClient.del<void>(`/api/projects/${id}`),

  // ────────── 成员 ──────────
  getMembers: () => apiClient.get<Member[]>('/api/members'),
  createMember: (member: Partial<Member>) => apiClient.post<{ id: number }>('/api/members', member),
  updateMember: (member: Member) => apiClient.put<void>('/api/members', member),
  deleteMember: (id: number) => apiClient.del<void>(`/api/members/${id}`),

  // ────────── 工人 ──────────
  getWorkers: () => apiClient.get<Worker[]>('/api/workers'),
  getWorkerStats: () => apiClient.get<{ projectCount: number; totalEarnings: number; projectBreakdown: { projectId: number; projectName: string; total: number }[] }>('/api/workers/stats'),
  getProjectWorkers: (projectId?: number) =>
    apiClient.get<ProjectWorker[]>('/api/project-workers', { projectId }),
  createWorker: (worker: Partial<Worker>) => apiClient.post<{ id: number }>('/api/workers', worker),
  updateWorker: (worker: Worker) => apiClient.put<Worker>('/api/workers', worker),
  deleteWorker: (id: number) => apiClient.del<void>(`/api/workers/${id}`),
  createProjectWorker: (pw: Partial<ProjectWorker>) => apiClient.post<{ id: number }>('/api/project-workers', pw),
  batchCreateProjectWorkers: (pws: Partial<ProjectWorker>[]) =>
    apiClient.post<{ ids: number[] }>('/api/project-workers/batch', pws),
  updateProjectWorker: (pw: ProjectWorker) => apiClient.put<ProjectWorker>('/api/project-workers', pw),
  deleteProjectWorker: (id: number) => apiClient.del<void>(`/api/project-workers/${id}`),

  // ────────── 合作伙伴 ──────────
  getPartners: (projectId?: number) =>
    apiClient.get<Partner[]>('/api/partners', { projectId }),
  createPartner: (partner: Partial<Partner>) => apiClient.post<{ id: number }>('/api/partners', partner),
  updatePartner: (partner: Partner) => apiClient.put<void>('/api/partners', partner),
  deletePartner: (id: number) => apiClient.del<void>(`/api/partners/${id}`),

  // ────────── 发票 ──────────
  getInvoices: (projectId?: number) =>
    apiClient.get<Invoice[]>('/api/invoices', { projectId }),
  createInvoice: (invoice: Partial<Invoice>) => apiClient.post<{ id: number }>('/api/invoices', invoice),
  updateInvoice: (invoice: Invoice) => apiClient.put<void>('/api/invoices', invoice),
  deleteInvoice: (id: number) => apiClient.del<void>(`/api/invoices/${id}`),
  updateInvoiceStatus: (id: number, status: InvoiceStatus) =>
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
    apiClient.post<{ id: number }>('/api/contracts/income', contract),
  createExpenseContract: (contract: Partial<ExpenseContract>) =>
    apiClient.post<{ id: number }>('/api/contracts/expense', contract),
  createAgreementContract: (contract: Partial<AgreementContract>) =>
    apiClient.post<{ id: number }>('/api/contracts/agreement', contract),
  createContract: (contract: Partial<IncomeContract>) =>
    apiClient.post<{ id: number }>('/api/contracts/income', contract),
  updateIncomeContract: (contract: IncomeContract) =>
    apiClient.put<void>('/api/contracts/income', contract),
  updateExpenseContract: (contract: ExpenseContract) =>
    apiClient.put<void>('/api/contracts/expense', contract),
  updateAgreementContract: (contract: AgreementContract) =>
    apiClient.put<void>('/api/contracts/agreement', contract),
  deleteIncomeContract: (id: number) =>
    apiClient.del<void>(`/api/contracts/income/${id}`),
  deleteExpenseContract: (id: number) =>
    apiClient.del<void>(`/api/contracts/expense/${id}`),
  deleteAgreementContract: (id: number) =>
    apiClient.del<void>(`/api/contracts/agreement/${id}`),
  deleteContract: (id: number) =>
    apiClient.del<void>(`/api/contracts/income/${id}`),
  getContractStats: () => apiClient.get<ContractStats>('/api/contracts/stats'),

  // ────────── 结算 ──────────
  getSettlements: (projectId?: number) =>
    apiClient.get<Settlement[]>('/api/settlements', { projectId }),
  createSettlement: (settlement: Partial<Settlement>) =>
    apiClient.post<{ id: number }>('/api/settlements', settlement),
  updateSettlement: (settlement: Settlement) =>
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
  createCostLedger: (entry: Omit<CostLedgerEntry, 'id' | 'createdAt' | 'updatedAt'>) =>
    apiClient.post<CostLedgerEntry>('/api/cost-ledger', entry),
  updateCostLedger: (entry: CostLedgerEntry) =>
    apiClient.put<void>('/api/cost-ledger', entry),
  deleteCostLedger: (id: number) =>
    apiClient.del<void>(`/api/cost-ledger/${id}`),
  getCostLedgerSummary: (projectId?: number) =>
    apiClient.get<CostLedgerSummary>('/api/cost-ledger/summary', { projectId }),
  getCostLedgerCategories: () =>
    apiClient.get<CostLedgerCategory[]>('/api/cost-ledger/categories'),
  createCostLedgerCategory: (category: { label: string; direction: string; color?: string; level1?: string }) =>
    apiClient.post<CostLedgerCategory>('/api/cost-ledger/categories', category),
  updateCostLedgerCategory: (category: CostLedgerCategory) =>
    apiClient.put<void>('/api/cost-ledger/categories', category),
  deleteCostLedgerCategory: (id: number) =>
    apiClient.del<void>(`/api/cost-ledger/categories/${id}`),
  resetCostLedgerCategories: () =>
    apiClient.post<void>('/api/cost-ledger/categories/reset'),
  batchCreateCostLedger: (entries: Omit<CostLedgerEntry, 'id' | 'createdAt' | 'updatedAt'>[]) =>
    apiClient.post<{ count: number }>('/api/cost-ledger/batch', entries),
  getCostLedgerBatches: (projectId: number) =>
    apiClient.get<CostLedgerBatch[]>(`/api/cost-ledger/batches`, { projectId }),
  createCostLedgerBatch: (batch: { projectId: number; name: string }) =>
    apiClient.post<CostLedgerBatch>('/api/cost-ledger/batches', batch),
  copyCostLedgerBatch: (batchId: number, newName: string) =>
    apiClient.post<CostLedgerBatch>(`/api/cost-ledger/batches/${batchId}/copy`, { newName }),
  renameCostLedgerBatch: (batchId: number, newName: string) =>
    apiClient.put<void>(`/api/cost-ledger/batches/${batchId}`, { newName }),
  deleteCostLedgerBatch: (batchId: number) =>
    apiClient.del<void>(`/api/cost-ledger/batches/${batchId}`),
  getCostLedgerMatchRules: () =>
    apiClient.get<CostLedgerMatchRule[]>('/api/cost-ledger/match-rules'),
  saveCostLedgerMatchRule: (rule: CostLedgerMatchRule) =>
    apiClient.post<{ count: number }>('/api/cost-ledger/match-rules', rule),

  // ────────── 考勤 ──────────
  getAttendances: (projectId?: number, yearMonth?: string) =>
    apiClient.get<AttendanceRecord[]>('/api/attendances', { projectId, yearMonth }),
  getAttendancesByMember: (memberId: number, yearMonth?: string) =>
    apiClient.get<AttendanceRecord[]>('/api/attendances', { memberId, yearMonth }),
  createAttendance: (record: Partial<AttendanceRecord>) =>
    apiClient.post<{ id: number }>('/api/attendances', record),
  updateAttendance: (record: AttendanceRecord) =>
    apiClient.put<void>('/api/attendances', record),
  deleteAttendance: (id: number) =>
    apiClient.del<void>(`/api/attendances/${id}`),
  batchDeleteAttendances: (ids: number[]) =>
    apiClient.post<{ deleted: number }>('/api/attendances/batch-delete', ids),
  batchCreateAttendances: (records: Partial<AttendanceRecord>[]) =>
    apiClient.post<{ created: number; updated: number }>('/api/attendances/batch-create', records),
  generateDefaultAttendances: (projectId: number, yearMonth: string, memberIds: number[]) =>
    apiClient.post<{ count: number }>('/api/attendances/generate', { projectId, yearMonth, memberIds }),
  generateDefaultAttendancesV2: (projectId: number, yearMonth: string, projectWorkerIds: number[]) =>
    apiClient.post<{ count: number }>('/api/attendances/generate-v2', { projectId, yearMonth, projectWorkerIds }),
  batchImportAttendances: (projectId: number, yearMonth: string, records: { projectWorkerId: number; workDays: number }[]) =>
    apiClient.post<{ created: number; updated: number }>('/api/attendances/batch-import', { projectId, yearMonth, records }),

  // ────────── 工资 ──────────
  getWages: (projectId?: number, yearMonth?: string) =>
    apiClient.get<WageRecord[]>('/api/wages', { projectId, yearMonth }),
  // generateProjectWages：前端两个调用点（useWageTable/useWageActions）都用此名；
  // 响应 data 为 WageRecord[]（electron.d.ts 契约），newCount/archivedSkipped 在信封同层
  generateProjectWages: (projectId: number, yearMonth: string) =>
    apiClient.post<WageRecord[]>('/api/wages/generate', { projectId, yearMonth }),
  createWage: (record: Partial<WageRecord>) => apiClient.post<{ id: number }>('/api/wages', record),
  updateWage: (record: WageRecord) => apiClient.put<void>('/api/wages', record),
  deleteWage: (id: number) => apiClient.del<void>(`/api/wages/${id}`),
  batchDeleteWages: (ids: number[]) =>
    apiClient.post<{ deleted: number }>('/api/wages/batch-delete', ids),
  batchClearPayments: (ids: number[]) =>
    apiClient.post<{ cleared: number }>('/api/wages/batch-clear-payments', ids),
  archiveWages: (ids: number[]) =>
    apiClient.post<{ archived: number }>('/api/wages/archive', ids),
  getWageStats: (projectId?: number, yearMonth?: string) =>
    apiClient.get<WageStats>('/api/wages/stats', { projectId, yearMonth }),
  matchBankReceiptItems: (projectId?: number, yearMonth?: string, items?: BankReceiptMatch[]) =>
    apiClient.post<{ matches: BankReceiptMatch[] }>('/api/wages/match-receipts', { projectId, yearMonth, items }),
  batchConfirmMatches: (matches: BankReceiptMatch[], yearMonth?: string) =>
    apiClient.post<{ updated: number }>('/api/wages/confirm-matches', { matches, yearMonth }),
  getWagePaymentRecords: (projectId?: number, yearMonth?: string) =>
    apiClient.get<WageRecord[]>('/api/wages/payment-records', { projectId, yearMonth }),
  getWageOverdueStats: (projectId?: number) =>
    apiClient.get<{ totalOverdueAmount: number; overdueWorkerCount: number; overdueProjectCount: number; maxOverdueDays: number }>('/api/wages/overdue-stats', { projectId }),
  getWageOverdueList: (projectId?: number) =>
    apiClient.get<{ id: number; projectId: number; memberId?: number; projectWorkerId?: number; yearMonth: string; actualWage: number; paidAmount?: number; workerName?: string; workerPhone?: string; projectName?: string; overdueDays: number; overdueAmount: number; paymentStatus: string; createdAt: string; updatedAt: string }[]>('/api/wages/overdue-list', { projectId }),
  batchArchiveWages: (ids: number[]) =>
    apiClient.post<{ archived: number }>('/api/wages/archive', ids),
  // D-10-2: 批量解锁（payment_locked 1→0），与 archive 对称；前端 UI 未接，仅 bridge 层
  batchUnarchiveWages: (ids: number[]) =>
    apiClient.post<{ unarchived: number }>('/api/wages/batch-unarchive', ids),
  // batchSaveWages：后端 D-6 起返回 { saved, skipped, skippedItems }（batch-save 实际响应），
  // 声明类型此前谎报 { updated } —— 纯类型修正，无运行时变化
  batchSaveWages: (records: WageRecord[]) =>
    apiClient.post<{ saved: number; skipped: number; skippedItems: { projectWorkerId: number; yearMonth: string }[] }>('/api/wages/batch-save', records),
  // D-9: 批量付款写入——按 id 定位，只写付款列（paidAmount 单位为元，后端 ToFen 存分）
  batchSavePayments: (records: { id: number; paidAmount: number; paidDate: string; bankReceiptPath?: string }[]) =>
    apiClient.post<{ saved: number; skipped: number; skippedItems: { id: number }[] }>('/api/wages/batch-payment', records),

  // ────────── 薪资历史 ──────────
  getWageHistory: (projectWorkerId: number) =>
    apiClient.get<{ id: number; projectWorkerId: number; yearMonth: string; dailyWage: number; note?: string; createdAt: string }[]>(`/api/wage-history/${projectWorkerId}`),
  getEffectiveWage: (projectWorkerId: number, yearMonth: string) =>
    apiClient.get<{ dailyWage: number; yearMonth: string }>(`/api/wage-history/${projectWorkerId}/effective`, { yearMonth }),
  getTeamWages: (projectId: number, teamId: number) =>
    apiClient.get<{ workerCount: number; teamTotal: number; details: { workerName: string; months: number; workDays: number; dailyWage: number; totalWage: number }[] }>('/api/team-wages', { projectId, teamId }),
  getSalaryHistory: (memberId: number) =>
    apiClient.get<SalaryHistoryEntry[]>(`/api/salary-history/${memberId}`),
  createSalaryHistory: (entry: Partial<SalaryHistoryEntry>) =>
    apiClient.post<SalaryHistoryEntry>('/api/salary-history', entry),
  deleteSalaryHistory: (id: number) =>
    apiClient.del<void>(`/api/salary-history/${id}`),
  getEffectiveSalary: (memberId: number, yearMonth: string) =>
    apiClient.get<{ baseSalary: number; subsidy: number; effectiveDate: string }>(`/api/salary-history/${memberId}/effective`, { yearMonth }),

  // ────────── 审计日志 ──────────
  auditLog: (entry: AuditLogEntry) => {
    const normalized = {
      ...entry,
      resourceId: entry.resourceId != null ? String(entry.resourceId) : undefined,
      details: typeof entry.details === 'object' ? JSON.stringify(entry.details) : entry.details,
    };
    return apiClient.post<void>('/api/audit/logs', normalized);
  },
  auditQuery: (query: { action?: string; level?: string; userId?: string; resource?: string; resourceId?: string; startDate?: string; endDate?: string; page?: number; pageSize?: number }) => apiClient.get<{ total: number; page: number; pageSize: number; data: AuditLogEntry[] }>('/api/audit/logs', query),
  queryAuditLogs: (query: { action?: string; level?: string; userId?: string; resource?: string; resourceId?: string; startDate?: string; endDate?: string; page?: number; pageSize?: number }) => apiClient.get<{ total: number; page: number; pageSize: number; data: AuditLogEntry[] }>('/api/audit/logs', query),
  auditStats: (days?: number) => apiClient.get<{ total: number; byAction: Record<string, number>; byLevel: Record<string, number>; byResource: Record<string, number> }>('/api/audit/stats', { days }),
  auditClear: (daysToKeep: number) =>
    apiClient.post<{ removedCount: number }>('/api/audit/clear', { daysToKeep }),

  // ────────── 角色权限 ──────────
  getRoles: () => apiClient.get<{ id: string; name: string; permissions: string[] }[]>('/api/roles'),
  updateRole: (roleId: string, permissions: string[]) =>
    apiClient.put<void>('/api/roles', { roleId, permissions }),
  resetRole: (roleId: string) =>
    apiClient.post<{ permissions: string[] }>(`/api/roles/${roleId}/reset`),

  // ────────── 部门 ──────────
  getDepartments: () => apiClient.get<Department[]>('/api/departments'),
  createDepartment: (department: { name: string; managerId?: number; positions?: string[] }) =>
    apiClient.post<{ id: number }>('/api/departments', department),
  updateDepartment: (id: number, updates: { name?: string; managerId?: number | null; positions?: string[] }) =>
    apiClient.put<void>('/api/departments', { id, ...updates }),
  deleteDepartment: (id: number) =>
    apiClient.del<void>(`/api/departments/${id}`),

  // ────────── 模板 ──────────
  getTemplates: () => apiClient.get<Template[]>('/api/templates'),
  getTemplateStats: () => apiClient.get<Record<string, number>>('/api/templates/stats'),
  createTemplate: (template: Partial<Template>) =>
    apiClient.post<{ id: number; variables?: TemplateVariable[] }>('/api/templates', template),
  updateTemplate: (template: Template) =>
    apiClient.put<void>('/api/templates', template),
  deleteTemplate: (id: number) =>
    apiClient.del<void>(`/api/templates/${id}`),

  // ────────── 合同模板 ──────────
  // 字段桥接：前端 description/variables[] ↔ 后端 content/variables(JSON 字符串)
  getContractTemplates: async () => {
    const res = await apiClient.get<any[]>('/api/contract-templates')
    if (!res.success || !res.data) return res as any
    const data = res.data.map(t => ({
      ...t,
      // 旧库存在遗留 description 空列，空串也需 fallback 到 content（故用 || 而非 ??）
      description: t.description || t.content || '',
      variables: typeof t.variables === 'string' ? (() => { try { return JSON.parse(t.variables) } catch { return [] } })() : (t.variables || []),
    })) as ContractTemplate[]
    return { ...res, data }
  },
  createContractTemplate: (template: Partial<ContractTemplate>) =>
    apiClient.post<{ id: number }>('/api/contract-templates', {
      name: template.name,
      type: template.type,
      content: template.description ?? '',
      variables: JSON.stringify(template.variables || []),
    }),
  updateContractTemplate: (template: Partial<ContractTemplate> & { id: number }) =>
    apiClient.put<void>('/api/contract-templates', {
      id: template.id,
      name: template.name,
      type: template.type,
      content: template.description ?? '',
      variables: JSON.stringify(template.variables || []),
    }),
  deleteContractTemplate: (id: number) =>
    apiClient.del<void>(`/api/contract-templates/${id}`),

  // ────────── 收付款记录 ──────────
  getPaymentRecords: (paymentType?: string, projectId?: number) =>
    apiClient.get<PaymentRecord[]>('/api/payment-records', { paymentType, projectId }),
  createPaymentRecord: (record: Partial<PaymentRecord>) =>
    apiClient.post<{ id: number }>('/api/payment-records', record),
  updatePaymentRecord: (id: number, updates: Partial<PaymentRecord>) =>
    apiClient.put<void>('/api/payment-records', { id, ...updates }),
  deletePaymentRecord: (id: number) =>
    apiClient.del<void>(`/api/payment-records/${id}`),

  // ────────── 快照 ──────────
  getSnapshots: () => apiClient.get<SnapshotInfo[]>('/api/snapshots'),
  getMaxSnapshots: () => apiClient.get<number>('/api/snapshots/max-count'),
  createSnapshot: () => apiClient.post<SnapshotInfo>('/api/snapshots'),
  restoreSnapshot: (id: string) => apiClient.post<void>(`/api/snapshots/${id}/restore`),
  deleteSnapshot: (id: string) => apiClient.del<void>(`/api/snapshots/${id}`),
  setMaxSnapshots: (count: number) => apiClient.put<void>('/api/snapshots/max-count', { count }),
  backupDatabase: () => apiClient.post<{ path: string; size: number }>('/api/backup'),
  restoreDatabase: () => apiClient.post<{ restored: boolean }>('/api/restore'),
  diagnoseDatabase: () => apiClient.post<{ status: string; tables: { name: string; count: number }[] }>('/api/diagnose'),

  // ────────── 区域 ──────────
  getRegions: () => apiClient.get<Region[]>('/api/regions'),
  createRegion: (region: Partial<Region>) => apiClient.post<{ id: number }>('/api/regions', region),
  deleteRegion: (id: number) => apiClient.del<void>(`/api/regions/${id}`),

  // ────────── 监管单位 ──────────
  getSupervisors: () => apiClient.get<Supervisor[]>('/api/supervisors'),
  createSupervisor: (supervisor: Partial<Supervisor>) =>
    apiClient.post<{ id: number }>('/api/supervisors', supervisor),
  updateSupervisor: (id: number, updates: Partial<Supervisor>) =>
    apiClient.put<void>('/api/supervisors', { id, ...updates }),
  deleteSupervisor: (id: number) =>
    apiClient.del<void>(`/api/supervisors/${id}`),

  // ────────── 项目成员 ──────────
  getProjectMembers: (projectId: number) =>
    apiClient.get<(ProjectMember & { member?: Member })[]>(`/api/project-members/${projectId}`),
  addProjectMember: (projectId: number, memberId: number, joinedAt?: string) =>
    apiClient.post<{ id: number }>('/api/project-members', { projectId, memberId, joinedAt }),
  removeProjectMember: (id: number) =>
    apiClient.del<void>(`/api/project-members/${id}`),
  updateProjectMember: (id: number, updates: { leftAt?: string; joinedAt?: string }) =>
    apiClient.put<void>('/api/project-members', { id, ...updates }),

  // ────────── 班组 ──────────
  getWorkerTeams: (projectId?: number) =>
    apiClient.get<WorkerTeam[]>('/api/worker-teams', { projectId }),
  createWorkerTeam: (team: Partial<WorkerTeam>) =>
    apiClient.post<{ id: number }>('/api/worker-teams', team),
  updateWorkerTeam: (id: number, updates: Partial<WorkerTeam>) =>
    apiClient.put<void>('/api/worker-teams', { id, ...updates }),
  deleteWorkerTeam: (id: number) =>
    apiClient.del<void>(`/api/worker-teams/${id}`),

  // ────────── 图纸 ──────────
  getDrawings: (projectId?: number) =>
    apiClient.get<Drawing[]>('/api/drawings', { projectId }),
  uploadDrawing: (drawing: { projectId: number; name: string; category: string; remarks: string; position?: string; fileName: string; fileData: string }) =>
    apiClient.post<{ id: number; filePath: string }>('/api/drawings', drawing),
  updateDrawing: (id: number, updates: Partial<Drawing>) =>
    apiClient.put<void>('/api/drawings', { id, ...updates }),
  deleteDrawing: (id: number) =>
    apiClient.del<void>(`/api/drawings/${id}`),

  // ────────── 库存 ──────────
  getInventoryItems: () => apiClient.get<InventoryItem[]>('/api/inventory'),
  createInventoryItem: (item: Partial<InventoryItem>) =>
    apiClient.post<{ id: number }>('/api/inventory', item),
  updateInventoryItem: (id: number, updates: Partial<InventoryItem>) =>
    apiClient.put<void>('/api/inventory', { id, ...updates }),
  deleteInventoryItem: (id: number) =>
    apiClient.del<void>(`/api/inventory/${id}`),
  getInventoryTransactions: (itemId?: number) =>
    apiClient.get<InventoryTransaction[]>('/api/inventory/transactions', { itemId }),
  createInventoryTransaction: (transaction: Partial<InventoryTransaction>) =>
    apiClient.post<{ id: number }>('/api/inventory/transactions', transaction),

  // ────────── 物料 ──────────
  getMaterials: (projectId?: number) =>
    apiClient.get<Material[]>('/api/materials', { projectId }),
  createMaterial: (material: Partial<Material>) =>
    apiClient.post<{ id: number }>('/api/materials', material),
  updateMaterial: (id: number, updates: Partial<Material>) =>
    apiClient.put<void>('/api/materials', { id, ...updates }),
  deleteMaterial: (id: number) =>
    apiClient.del<void>(`/api/materials/${id}`),

  // ────────── 配置 ──────────
  getConfig: () => apiClient.get<{ dataPath: string; defaultPath: string; edition: string; features: string[] }>('/api/config'),
  setDataPath: (path: string) => apiClient.put<void>('/api/config/data-path', { path }),
  getGpuAcceleration: () => apiClient.get<boolean>('/api/config/gpu-acceleration'),
  setGpuAcceleration: (enabled: boolean) =>
    apiClient.put<void>('/api/config/gpu-acceleration', { enabled }),

  // ────────── 个人资料 (M-EDITION1) ──────────
  getUserProfile: () => apiClient.get<{ display_name: string; company_name: string; position: string; specialty: string; business_description: string }>('/api/user-profile'),
  updateUserProfile: (profile: { companyName: string; position: string; specialty: string; businessDescription: string }) =>
    apiClient.put<void>('/api/user-profile', profile),

  // ────────── PII Key Rotation (v0.76.0 累计待办 #5) ──────────
  getPiiKeys: () => apiClient.get<{ keys: { id: number; createdAt: string; isActive: boolean }[]; activeKeyId: number; totalKeys: number }>('/api/admin/pii/keys'),
  rotatePiiKey: () => apiClient.post<{ newKeyId: number; message: string }>('/api/admin/pii/rotate', {}),

  // ────────── PII Re-encrypt Worker (v0.78.0) ──────────
  startPiiReencrypt: () => apiClient.post<{ status: 'idle' | 'running' | 'completed' | 'failed'; message: string }>('/api/admin/pii/reencrypt', {}),
  getPiiReencryptStatus: () => apiClient.get<{ status: 'idle' | 'running' | 'completed' | 'failed'; progress: number; total: number; errors: string[] }>('/api/admin/pii/reencrypt/status'),

  // ────────── 数据健康 ──────────
  dataConsistencyCheck: () => apiClient.get<{ consistent: boolean; discrepancies: { table: string; json: number; sqlite: number }[] }>('/api/health/consistency'),
  consistencyCheck: () => apiClient.get<{ consistent: boolean; discrepancies: { table: string; json: number; sqlite: number }[] }>('/api/health/consistency'),
  dataIntegrityCheck: () => apiClient.get<{ status: string; message: string }>('/api/health/integrity'),
  integrityCheck: () => apiClient.get<{ status: string; message: string }>('/api/health/integrity'),
  dataExportJson: () => apiClient.post<{ path: string }>('/api/health/export-json'),
  exportJson: () => apiClient.post<{ path: string }>('/api/health/export-json'),
  dataReconcile: () => apiClient.post<{ reconciled: boolean; details: string }>('/api/health/reconcile'),
  reconcile: () => apiClient.post<{ reconciled: boolean; details: string }>('/api/health/reconcile'),

  // ────────── SQLite 设置 ──────────
  sqliteStatus: () => apiClient.get<SqliteStatus>('/api/sqlite/status'),
  getSqliteStatus: () => apiClient.get<SqliteStatus>('/api/sqlite/status'),
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
  ocrBaiduIdCard: (imageBase64: string, config: { apiKey: string; secretKey: string }) =>
    apiClient.post<{ text?: string; idCard?: { number: string; name?: string; gender?: string; ethnicity?: string; birthDate?: string; address?: string; issueAuthority?: string; validDate?: string } }>('/api/ocr/id-card', { imageBase64, config }),
  ocrBaiduInvoice: (imageBase64: string, config: { apiKey: string; secretKey: string }) =>
    apiClient.post<{ text?: string; invoice?: { invoiceNum: string; invoiceCode: string; invoiceDate: string; invoiceType: string; totalAmount: number; amountWithoutTax: number; totalTax: number; taxRate: number; sellerName: string; purchaserName: string; checkCode: string; itemName: string; remarks: string } }>('/api/ocr/invoice', { imageBase64, config }),
  ocrBaiduBankCard: (imageBase64: string, config: { apiKey: string; secretKey: string }) =>
    apiClient.post<{ text?: string; bankCard?: { cardNumber: string; bankName: string; cardType: string; validDate: string } }>('/api/ocr/bank-card', { imageBase64, config }),
  ocrBaiduBusinessLicense: (imageBase64: string, config: { apiKey: string; secretKey: string }) =>
    apiClient.post<{ text?: string; businessLicense?: { creditCode: string; companyName: string; legalPerson: string; registeredCapital: string; address: string; businessScope: string; establishDate: string; expireDate: string } }>('/api/ocr/business-license', { imageBase64, config }),
  ocrBaiduBankReceipt: (imageBase64: string, config: { apiKey: string; secretKey: string }) =>
    apiClient.post<{ text?: string; bankReceipt?: { transactionDate: string; transactionTime: string; amount: number; payerName: string; payerAccount: string; payeeName: string; payeeAccount: string; transactionNo: string; bankName: string; remarks: string } }>('/api/ocr/bank-receipt', { imageBase64, config }),
  ocrBaiduPermit: (imageBase64: string, config: { apiKey: string; secretKey: string }) =>
    apiClient.post<{ text?: string; permit?: { companyCode: string; companyName: string; accountNumber: string; bankName: string; permitNumber: string } }>('/api/ocr/permit', { imageBase64, config }),
  ocrBaiduBankStatement: (imageBase64: string, config: { apiKey: string; secretKey: string }) =>
    apiClient.post<{ text?: string; bankStatement?: { transactions: Array<{ date: string; time: string; amount: number; balance: number; type: string; counterparty: string; remark: string }>; accountNumber: string; bankName: string } }>('/api/ocr/bank-statement', { imageBase64, config }),
  ocrBaiduGeneralReceipt: (imageBase64: string, config: { apiKey: string; secretKey: string }) =>
    apiClient.post<{ text?: string; generalReceipt?: { text: string; amount: number; date: string } }>('/api/ocr/general-receipt', { imageBase64, config }),
  ocrBaiduCompanyQuery: (companyName: string, config: { apiKey: string; secretKey: string }) =>
    apiClient.post<{ text?: string; businessLicense?: { creditCode: string; companyName: string; legalPerson: string; registeredCapital: string; address: string; businessScope: string; establishDate: string; expireDate: string } }>('/api/ocr/company-query', { companyName, config }),
  ocrCheckNetwork: () => apiClient.get<boolean>('/api/ocr/check-network'),
  ocrClearTokenCache: () => apiClient.post<boolean>('/api/ocr/clear-token-cache'),
  ocrGetStats: () => apiClient.get<{ idCard: number; invoice: number; bankCard: number; businessLicense: number; bankReceipt: number; permit: number; bankStatement: number; generalReceipt: number; companyQuery: number; lastReset: string }>('/api/ocr/stats'),

  // ────────── 文件操作 ──────────
  saveFile: (options: { category: string; subCategory: string; fileData: string; fileName: string; projectName?: string | null }) => apiClient.post<{ fileName: string }>('/api/files/save', options),
  readFile: (options: { category: string; subCategory: string; fileName: string; projectName?: string | null }) => apiClient.get<{ dataUrl: string; mimeType: string }>('/api/files/read', options),
  deleteFile: (options: { category: string; subCategory: string; fileName: string; projectName?: string | null }) => apiClient.post<void>('/api/files/delete', options),
  openFileExternal: (options: { category: string; subCategory: string; fileName: string; projectName?: string | null }) => apiClient.post<void>('/api/files/open-external', options),

  // ────────── 合同文件 ──────────
  readContractFile: (fileName: string, subCategory: string, projectName?: string | null) =>
    apiClient.get<{ dataUrl: string; mimeType: string }>('/api/contracts/read-file', { fileName, subCategory, projectName }),
  saveContractFile: (options: { fileData: string; fileName: string; subCategory?: string; projectName?: string | null }) =>
    apiClient.post<{ fileName: string }>('/api/contracts/save-file', options),
};

export default tauriAPI;
