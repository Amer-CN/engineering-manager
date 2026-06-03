/**
 * API 桥接层
 *
 * 通过 HTTP 调用 C# 后端 API
 * 保持与 Electron/Tauri 版本兼容的接口
 */

import { apiClient } from './api-client';

// ============ 导出的 API ============

export const tauriAPI = {
  // ────────── 系统 ──────────
  getAppVersion: () => '0.67.0',
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
  getAllUsers: () => apiClient.get<any[]>('/api/users'),
  authGetAllUsers: () => apiClient.get<any[]>('/api/users'),
  getUser: (id: string) => apiClient.get<any>(`/api/users/${id}`),
  authGetCurrentUser: (id: string) => apiClient.get<any>(`/api/users/${id}`),
  createUser: (user: any) => apiClient.post<any>('/api/users', user),
  authCreateUser: (user: any) => apiClient.post<any>('/api/users', user),
  updateUser: (user: any) => apiClient.put<void>('/api/users', user),
  authUpdateUser: (user: any) => apiClient.put<void>('/api/users', user),
  deleteUser: (id: string) => apiClient.del<void>(`/api/users/${id}`),
  authDeleteUser: (id: string) => apiClient.del<void>(`/api/users/${id}`),

  // ────────── 仪表盘 ──────────
  getDashboardStats: () => apiClient.get<any>('/api/dashboard/stats'),

  // ────────── 项目 ──────────
  getProjects: () => apiClient.get<any[]>('/api/projects'),
  getProject: (id: number) => apiClient.get<any>(`/api/projects/${id}`),
  createProject: (project: any) => apiClient.post<any>('/api/projects', project),
  updateProject: (project: any) => apiClient.put<void>(`/api/projects/${project.id}`, project),
  deleteProject: (id: number) => apiClient.del<void>(`/api/projects/${id}`),

  // ────────── 成员 ──────────
  getMembers: () => apiClient.get<any[]>('/api/members'),
  createMember: (member: any) => apiClient.post<any>('/api/members', member),
  updateMember: (member: any) => apiClient.put<void>('/api/members', member),
  deleteMember: (id: number) => apiClient.del<void>(`/api/members/${id}`),

  // ────────── 工人 ──────────
  getWorkers: () => apiClient.get<any[]>('/api/workers'),
  getWorkerStats: () => apiClient.get<any>('/api/workers/stats'),
  getProjectWorkers: (projectId?: number) =>
    apiClient.get<any[]>('/api/project-workers', { projectId }),
  createWorker: (worker: any) => apiClient.post<any>('/api/workers', worker),
  updateWorker: (worker: any) => apiClient.put<void>('/api/workers', worker),
  deleteWorker: (id: number) => apiClient.del<void>(`/api/workers/${id}`),
  createProjectWorker: (pw: any) => apiClient.post<any>('/api/project-workers', pw),
  batchCreateProjectWorkers: (pws: any[]) =>
    apiClient.post<any>('/api/project-workers/batch', pws),
  updateProjectWorker: (pw: any) => apiClient.put<void>('/api/project-workers', pw),
  deleteProjectWorker: (id: number) => apiClient.del<void>(`/api/project-workers/${id}`),

  // ────────── 合作伙伴 ──────────
  getPartners: (projectId?: number) =>
    apiClient.get<any[]>('/api/partners', { projectId }),
  createPartner: (partner: any) => apiClient.post<any>('/api/partners', partner),
  updatePartner: (partner: any) => apiClient.put<void>('/api/partners', partner),
  deletePartner: (id: number) => apiClient.del<void>(`/api/partners/${id}`),

  // ────────── 发票 ──────────
  getInvoices: (projectId?: number) =>
    apiClient.get<any[]>('/api/invoices', { projectId }),
  createInvoice: (invoice: any) => apiClient.post<any>('/api/invoices', invoice),
  updateInvoice: (invoice: any) => apiClient.put<void>('/api/invoices', invoice),
  deleteInvoice: (id: number) => apiClient.del<void>(`/api/invoices/${id}`),
  updateInvoiceStatus: (id: number, status: string) =>
    apiClient.put<void>(`/api/invoices/${id}/status`, { status }),

  // ────────── 合同 ──────────
  getIncomeContracts: (projectId?: number) =>
    apiClient.get<any[]>('/api/contracts/income', { projectId }),
  getExpenseContracts: (projectId?: number) =>
    apiClient.get<any[]>('/api/contracts/expense', { projectId }),
  getAgreementContracts: (projectId?: number) =>
    apiClient.get<any[]>('/api/contracts/agreement', { projectId }),
  getContracts: (projectId?: number) =>
    apiClient.get<any[]>('/api/contracts/income', { projectId }),
  createIncomeContract: (contract: any) =>
    apiClient.post<any>('/api/contracts/income', contract),
  createExpenseContract: (contract: any) =>
    apiClient.post<any>('/api/contracts/expense', contract),
  createContract: (contract: any) =>
    apiClient.post<any>('/api/contracts/income', contract),
  updateIncomeContract: (contract: any) =>
    apiClient.put<void>('/api/contracts/income', contract),
  updateExpenseContract: (contract: any) =>
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
    apiClient.get<any[]>('/api/settlements', { projectId }),
  createSettlement: (settlement: any) =>
    apiClient.post<any>('/api/settlements', settlement),
  updateSettlement: (settlement: any) =>
    apiClient.put<void>('/api/settlements', settlement),
  deleteSettlement: (id: number) =>
    apiClient.del<void>(`/api/settlements/${id}`),
  processSettlement: (id: number) =>
    apiClient.put<void>(`/api/settlements/${id}/process`),
  unarchiveSettlement: (id: number) =>
    apiClient.put<void>(`/api/settlements/${id}/unarchive`),

  // ────────── 成本台账 ──────────
  getCostLedger: (projectId?: number) =>
    apiClient.get<any[]>('/api/cost-ledger', { projectId }),
  createCostLedger: (entry: any) =>
    apiClient.post<any>('/api/cost-ledger', entry),
  updateCostLedger: (entry: any) =>
    apiClient.put<void>('/api/cost-ledger', entry),
  deleteCostLedger: (id: number) =>
    apiClient.del<void>(`/api/cost-ledger/${id}`),
  getCostLedgerSummary: (projectId?: number) =>
    apiClient.get<any>('/api/cost-ledger/summary', { projectId }),
  getCostLedgerCategories: () =>
    apiClient.get<any[]>('/api/cost-ledger/categories'),
  createCostLedgerCategory: (category: any) =>
    apiClient.post<any>('/api/cost-ledger/categories', category),
  updateCostLedgerCategory: (category: any) =>
    apiClient.put<void>('/api/cost-ledger/categories', category),
  deleteCostLedgerCategory: (id: number) =>
    apiClient.del<void>(`/api/cost-ledger/categories/${id}`),
  resetCostLedgerCategories: () =>
    apiClient.post<void>('/api/cost-ledger/categories/reset'),
  batchCreateCostLedger: (entries: any[]) =>
    apiClient.post<any>('/api/cost-ledger/batch', entries),
  getCostLedgerBatches: (projectId: number) =>
    apiClient.get<any[]>(`/api/cost-ledger/batches`, { projectId }),
  createCostLedgerBatch: (batch: any) =>
    apiClient.post<any>('/api/cost-ledger/batches', batch),
  copyCostLedgerBatch: (batchId: number, newName: string) =>
    apiClient.post<any>(`/api/cost-ledger/batches/${batchId}/copy`, { newName }),
  renameCostLedgerBatch: (batchId: number, newName: string) =>
    apiClient.put<void>(`/api/cost-ledger/batches/${batchId}`, { newName }),
  deleteCostLedgerBatch: (batchId: number) =>
    apiClient.del<void>(`/api/cost-ledger/batches/${batchId}`),
  getCostLedgerMatchRules: () =>
    apiClient.get<any[]>('/api/cost-ledger/match-rules'),
  saveCostLedgerMatchRule: (rule: any) =>
    apiClient.post<any>('/api/cost-ledger/match-rules', rule),

  // ────────── 考勤 ──────────
  getAttendances: (projectId?: number, yearMonth?: string) =>
    apiClient.get<any[]>('/api/attendances', { projectId, yearMonth }),
  getAttendancesByMember: (memberId: number, yearMonth?: string) =>
    apiClient.get<any[]>(`/api/attendances/member/${memberId}`, { yearMonth }),
  createAttendance: (record: any) =>
    apiClient.post<any>('/api/attendances', record),
  updateAttendance: (record: any) =>
    apiClient.put<void>('/api/attendances', record),
  deleteAttendance: (id: number) =>
    apiClient.del<void>(`/api/attendances/${id}`),
  batchDeleteAttendances: (ids: number[]) =>
    apiClient.post<any>('/api/attendances/batch-delete', ids),
  batchCreateAttendances: (records: any[]) =>
    apiClient.post<any>('/api/attendances/batch-create', records),
  generateDefaultAttendances: (projectId: number, yearMonth: string, memberIds: number[]) =>
    apiClient.post<any>('/api/attendances/generate', { projectId, yearMonth, memberIds }),
  generateDefaultAttendancesV2: (projectId: number, yearMonth: string, projectWorkerIds: number[]) =>
    apiClient.post<any>('/api/attendances/generate-v2', { projectId, yearMonth, projectWorkerIds }),
  batchImportAttendances: (projectId: number, yearMonth: string, records: any[]) =>
    apiClient.post<any>('/api/attendances/batch-import', { projectId, yearMonth, records }),

  // ────────── 工资 ──────────
  getWages: (projectId?: number, yearMonth?: string) =>
    apiClient.get<any[]>('/api/wages', { projectId, yearMonth }),
  generateForProject: (projectId: number, yearMonth: string) =>
    apiClient.post<any>('/api/wages/generate', { projectId, yearMonth }),
  createWage: (record: any) => apiClient.post<any>('/api/wages', record),
  updateWage: (record: any) => apiClient.put<void>('/api/wages', record),
  deleteWage: (id: number) => apiClient.del<void>(`/api/wages/${id}`),
  batchDeleteWages: (ids: number[]) =>
    apiClient.post<any>('/api/wages/batch-delete', ids),
  batchClearPayments: (ids: number[]) =>
    apiClient.post<any>('/api/wages/batch-clear-payments', ids),
  archiveWages: (ids: number[]) =>
    apiClient.post<any>('/api/wages/archive', ids),
  getWageStats: (projectId?: number, yearMonth?: string) =>
    apiClient.get<any>('/api/wages/stats', { projectId, yearMonth }),
  matchBankReceiptItems: (projectId?: number, yearMonth?: string, items?: any[]) =>
    apiClient.post<any>('/api/wages/match-receipts', { projectId, yearMonth, items }),
  batchConfirmMatches: (matches: any[], yearMonth?: string) =>
    apiClient.post<any>('/api/wages/confirm-matches', { matches, yearMonth }),
  getWagePaymentRecords: (projectId?: number, yearMonth?: string) =>
    apiClient.get<any[]>('/api/wages/payment-records', { projectId, yearMonth }),
  getWageOverdueStats: (projectId?: number) =>
    apiClient.get<any>('/api/wages/overdue-stats', { projectId }),
  getWageOverdueList: (projectId?: number) =>
    apiClient.get<any[]>('/api/wages/overdue-list', { projectId }),
  batchArchiveWages: (ids: number[]) =>
    apiClient.post<any>('/api/wages/archive', ids),
  batchSaveWages: (records: any[]) =>
    apiClient.post<any>('/api/wages/batch-save', records),

  // ────────── 薪资历史 ──────────
  getWageHistory: (projectWorkerId: number) =>
    apiClient.get<any[]>(`/api/wage-history/${projectWorkerId}`),
  getEffectiveWage: (projectWorkerId: number, yearMonth: string) =>
    apiClient.get<any>(`/api/wage-history/${projectWorkerId}/effective`, { yearMonth }),
  getTeamWages: (projectId: number, yearMonth: string) =>
    apiClient.get<any[]>('/api/wages', { projectId, yearMonth }),
  getSalaryHistory: (memberId: number) =>
    apiClient.get<any[]>(`/api/salary-history/${memberId}`),
  createSalaryHistory: (entry: any) =>
    apiClient.post<any>('/api/salary-history', entry),
  deleteSalaryHistory: (id: number) =>
    apiClient.del<void>(`/api/salary-history/${id}`),
  getEffectiveSalary: (memberId: number, yearMonth: string) =>
    apiClient.get<any>(`/api/salary-history/${memberId}/effective`, { yearMonth }),

  // ────────── 审计日志 ──────────
  auditLog: (entry: any) => {
    const normalized = {
      ...entry,
      resourceId: entry.resourceId != null ? String(entry.resourceId) : undefined,
      details: typeof entry.details === 'object' ? JSON.stringify(entry.details) : entry.details,
    };
    return apiClient.post<void>('/api/audit/logs', normalized);
  },
  auditQuery: (query: any) => apiClient.get<any>('/api/audit/logs', query),
  queryAuditLogs: (query: any) => apiClient.get<any>('/api/audit/logs', query),
  auditStats: (days?: number) => apiClient.get<any>('/api/audit/stats', { days }),
  auditClear: (daysToKeep: number) =>
    apiClient.post<any>('/api/audit/clear', { daysToKeep }),

  // ────────── 角色权限 ──────────
  getRoles: () => apiClient.get<any[]>('/api/roles'),
  updateRole: (roleId: string, permissions: string[]) =>
    apiClient.put<void>('/api/roles', { roleId, permissions }),
  resetRole: (roleId: string) =>
    apiClient.post<any>(`/api/roles/${roleId}/reset`),

  // ────────── 部门 ──────────
  getDepartments: () => apiClient.get<any[]>('/api/departments'),
  createDepartment: (department: any) =>
    apiClient.post<any>('/api/departments', department),
  updateDepartment: (id: number, updates: any) =>
    apiClient.put<void>('/api/departments', { id, ...updates }),
  deleteDepartment: (id: number) =>
    apiClient.del<void>(`/api/departments/${id}`),

  // ────────── 模板 ──────────
  getTemplates: () => apiClient.get<any[]>('/api/templates'),
  getTemplateStats: () => apiClient.get<any>('/api/templates/stats'),
  createTemplate: (template: any) =>
    apiClient.post<any>('/api/templates', template),
  updateTemplate: (template: any) =>
    apiClient.put<void>('/api/templates', template),
  deleteTemplate: (id: number) =>
    apiClient.del<void>(`/api/templates/${id}`),

  // ────────── 合同模板 ──────────
  getContractTemplates: () => apiClient.get<any[]>('/api/contract-templates'),
  createContractTemplate: (template: any) =>
    apiClient.post<any>('/api/contract-templates', template),
  updateContractTemplate: (id: number, updates: any) =>
    apiClient.put<void>('/api/contract-templates', { id, ...updates }),
  deleteContractTemplate: (id: number) =>
    apiClient.del<void>(`/api/contract-templates/${id}`),

  // ────────── 收付款记录 ──────────
  getPaymentRecords: (paymentType?: string, projectId?: number) =>
    apiClient.get<any[]>('/api/payment-records', { paymentType, projectId }),
  createPaymentRecord: (record: any) =>
    apiClient.post<any>('/api/payment-records', record),
  updatePaymentRecord: (id: number, updates: any) =>
    apiClient.put<void>('/api/payment-records', { id, ...updates }),
  deletePaymentRecord: (id: number) =>
    apiClient.del<void>(`/api/payment-records/${id}`),

  // ────────── 快照 ──────────
  getSnapshots: () => apiClient.get<any[]>('/api/snapshots'),
  getMaxSnapshots: () => apiClient.get<number>('/api/snapshots/max-count'),
  createSnapshot: () => apiClient.post<any>('/api/snapshots'),
  restoreSnapshot: (id: string) => apiClient.post<void>(`/api/snapshots/${id}/restore`),
  deleteSnapshot: (id: string) => apiClient.del<void>(`/api/snapshots/${id}`),
  setMaxSnapshots: (count: number) => apiClient.put<void>('/api/snapshots/max-count', { count }),

  // ────────── 区域 ──────────
  getRegions: () => apiClient.get<any[]>('/api/regions'),
  createRegion: (region: any) => apiClient.post<any>('/api/regions', region),
  deleteRegion: (id: number) => apiClient.del<void>(`/api/regions/${id}`),

  // ────────── 监管单位 ──────────
  getSupervisors: () => apiClient.get<any[]>('/api/supervisors'),
  createSupervisor: (supervisor: any) =>
    apiClient.post<any>('/api/supervisors', supervisor),
  updateSupervisor: (id: number, updates: any) =>
    apiClient.put<void>('/api/supervisors', { id, ...updates }),
  deleteSupervisor: (id: number) =>
    apiClient.del<void>(`/api/supervisors/${id}`),

  // ────────── 项目成员 ──────────
  getProjectMembers: (projectId: number) =>
    apiClient.get<any[]>(`/api/project-members/${projectId}`),
  addProjectMember: (projectId: number, memberId: number, joinedAt?: string) =>
    apiClient.post<any>('/api/project-members', { projectId, memberId, joinedAt }),
  removeProjectMember: (id: number) =>
    apiClient.del<void>(`/api/project-members/${id}`),
  updateProjectMember: (id: number, updates: any) =>
    apiClient.put<void>('/api/project-members', { id, ...updates }),

  // ────────── 班组 ──────────
  getWorkerTeams: (projectId?: number) =>
    apiClient.get<any[]>('/api/worker-teams', { projectId }),
  createWorkerTeam: (team: any) =>
    apiClient.post<any>('/api/worker-teams', team),
  updateWorkerTeam: (id: number, updates: any) =>
    apiClient.put<void>('/api/worker-teams', { id, ...updates }),
  deleteWorkerTeam: (id: number) =>
    apiClient.del<void>(`/api/worker-teams/${id}`),

  // ────────── 图纸 ──────────
  getDrawings: (projectId?: number) =>
    apiClient.get<any[]>('/api/drawings', { projectId }),
  uploadDrawing: (drawing: any) =>
    apiClient.post<any>('/api/drawings', drawing),
  updateDrawing: (id: number, updates: any) =>
    apiClient.put<void>('/api/drawings', { id, ...updates }),
  deleteDrawing: (id: number) =>
    apiClient.del<void>(`/api/drawings/${id}`),

  // ────────── 费用 ──────────
  getExpenses: (projectId?: number) =>
    apiClient.get<any[]>('/api/expenses', { projectId }),
  createExpense: (expense: any) =>
    apiClient.post<any>('/api/expenses', expense),
  updateExpense: (id: number, updates: any) =>
    apiClient.put<void>('/api/expenses', { id, ...updates }),
  deleteExpense: (id: number) =>
    apiClient.del<void>(`/api/expenses/${id}`),

  // ────────── 库存 ──────────
  getInventoryItems: () => apiClient.get<any[]>('/api/inventory'),
  createInventoryItem: (item: any) =>
    apiClient.post<any>('/api/inventory', item),
  updateInventoryItem: (id: number, updates: any) =>
    apiClient.put<void>('/api/inventory', { id, ...updates }),
  deleteInventoryItem: (id: number) =>
    apiClient.del<void>(`/api/inventory/${id}`),
  getInventoryTransactions: (itemId?: number) =>
    apiClient.get<any[]>('/api/inventory/transactions', { itemId }),
  createInventoryTransaction: (transaction: any) =>
    apiClient.post<any>('/api/inventory/transactions', transaction),

  // ────────── 物料 ──────────
  getMaterials: (projectId?: number) =>
    apiClient.get<any[]>('/api/materials', { projectId }),
  createMaterial: (material: any) =>
    apiClient.post<any>('/api/materials', material),
  updateMaterial: (id: number, updates: any) =>
    apiClient.put<void>('/api/materials', { id, ...updates }),
  deleteMaterial: (id: number) =>
    apiClient.del<void>(`/api/materials/${id}`),

  // ────────── 配置 ──────────
  getConfig: () => apiClient.get<any>('/api/config'),
  setDataPath: (path: string) => apiClient.put<void>('/api/config/data-path', { path }),
  getGpuAcceleration: () => apiClient.get<boolean>('/api/config/gpu-acceleration'),
  setGpuAcceleration: (enabled: boolean) =>
    apiClient.put<void>('/api/config/gpu-acceleration', { enabled }),

  // ────────── 数据健康 ──────────
  dataConsistencyCheck: () => apiClient.get<any>('/api/health/consistency'),
  consistencyCheck: () => apiClient.get<any>('/api/health/consistency'),
  dataIntegrityCheck: () => apiClient.get<any>('/api/health/integrity'),
  integrityCheck: () => apiClient.get<any>('/api/health/integrity'),
  dataExportJson: () => apiClient.post<any>('/api/health/export-json'),
  exportJson: () => apiClient.post<any>('/api/health/export-json'),
  dataReconcile: () => apiClient.post<any>('/api/health/reconcile'),
  reconcile: () => apiClient.post<any>('/api/health/reconcile'),

  // ────────── SQLite 设置 ──────────
  sqliteStatus: () => apiClient.get<any>('/api/sqlite/status'),
  getSqliteStatus: () => apiClient.get<any>('/api/sqlite/status'),
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
  ocrBaiduIdCard: (imageBase64: string, config: any) =>
    apiClient.post<any>('/api/ocr/id-card', { imageBase64, config }),
  ocrBaiduInvoice: (imageBase64: string, config: any) =>
    apiClient.post<any>('/api/ocr/invoice', { imageBase64, config }),
  ocrBaiduBankCard: (imageBase64: string, config: any) =>
    apiClient.post<any>('/api/ocr/bank-card', { imageBase64, config }),
  ocrBaiduBusinessLicense: (imageBase64: string, config: any) =>
    apiClient.post<any>('/api/ocr/business-license', { imageBase64, config }),
  ocrBaiduBankReceipt: (imageBase64: string, config: any) =>
    apiClient.post<any>('/api/ocr/bank-receipt', { imageBase64, config }),
  ocrBaiduPermit: (imageBase64: string, config: any) =>
    apiClient.post<any>('/api/ocr/permit', { imageBase64, config }),
  ocrBaiduBankStatement: (imageBase64: string, config: any) =>
    apiClient.post<any>('/api/ocr/bank-statement', { imageBase64, config }),
  ocrBaiduGeneralReceipt: (imageBase64: string, config: any) =>
    apiClient.post<any>('/api/ocr/general-receipt', { imageBase64, config }),
  ocrBaiduCompanyQuery: (companyName: string, config: any) =>
    apiClient.post<any>('/api/ocr/company-query', { companyName, config }),
  ocrCheckNetwork: () => apiClient.get<boolean>('/api/ocr/check-network'),
  ocrClearTokenCache: () => apiClient.post<boolean>('/api/ocr/clear-token-cache'),
  ocrGetStats: () => apiClient.get<any>('/api/ocr/stats'),

  // ────────── 文件操作 ──────────
  saveFile: (options: any) => apiClient.post<any>('/api/files/save', options),
  readFile: (options: any) => apiClient.get<any>('/api/files/read', options),
  deleteFile: (options: any) => apiClient.post<void>('/api/files/delete', options),
  openFileExternal: (options: any) => apiClient.post<void>('/api/files/open-external', options),

  // ────────── 合同文件 ──────────
  readContractFile: (fileName: string, subCategory: string, projectName?: string | null) =>
    apiClient.get<any>('/api/contracts/read-file', { fileName, subCategory, projectName }),
  saveContractFile: (options: any) =>
    apiClient.post<any>('/api/contracts/save-file', options),
};

export default tauriAPI;
