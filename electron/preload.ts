import { contextBridge, ipcRenderer } from 'electron'

// 暴露给渲染进程的 API
contextBridge.exposeInMainWorld('electronAPI', {
  // 系统
  openDevTools: () => ipcRenderer.invoke('app:openDevTools'),

  // 配置
  getConfig: () => ipcRenderer.invoke('config:get'),
  setDataPath: (path: string) => ipcRenderer.invoke('config:setDataPath', path),
  getDataPath: () => ipcRenderer.invoke('app:getDataPath'),

  // 认证
  login: (username: string, password: string) => ipcRenderer.invoke('auth:login', username, password),
  getCurrentUser: (userId: string) => ipcRenderer.invoke('auth:getCurrentUser', userId),
  getAllUsers: () => ipcRenderer.invoke('auth:getAllUsers'),
  createUser: (userData: any) => ipcRenderer.invoke('auth:createUser', userData),
  updateUser: (userId: string, updates: any) => ipcRenderer.invoke('auth:updateUser', userId, updates),
  deleteUser: (userId: string) => ipcRenderer.invoke('auth:deleteUser', userId),

  // 项目
  getProjects: () => ipcRenderer.invoke('db:projects:getAll'),
  createProject: (project: any) => ipcRenderer.invoke('db:projects:create', project),
  updateProject: (project: any) => ipcRenderer.invoke('db:projects:update', project),
  deleteProject: (id: number) => ipcRenderer.invoke('db:projects:delete', id),

  // 成员
  getMembers: () => ipcRenderer.invoke('db:members:getAll'),
  createMember: (member: any) => ipcRenderer.invoke('db:members:create', member),
  updateMember: (member: any) => ipcRenderer.invoke('db:members:update', member),
  deleteMember: (id: number) => ipcRenderer.invoke('db:members:delete', id),

  // 项目成员关联
  getProjectMembers: (projectId: number) => ipcRenderer.invoke('db:projectMembers:getAll', projectId),
  addProjectMember: (projectId: number, memberId: number) => ipcRenderer.invoke('db:projectMembers:add', projectId, memberId),
  removeProjectMember: (id: number) => ipcRenderer.invoke('db:projectMembers:remove', id),

  // 农民工班组
  getWorkerTeams: () => ipcRenderer.invoke('db:workerTeams:getAll'),
  createWorkerTeam: (team: any) => ipcRenderer.invoke('db:workerTeams:create', team),
  updateWorkerTeam: (team: any) => ipcRenderer.invoke('db:workerTeams:update', team),
  deleteWorkerTeam: (id: number) => ipcRenderer.invoke('db:workerTeams:delete', id),

  // 工人调动记录
  getWorkerTransferRecords: (workerId?: number) => ipcRenderer.invoke('db:workerTransferRecords:getAll', workerId),
  createWorkerTransfer: (record: any) => ipcRenderer.invoke('db:workerTransferRecords:create', record),

  // 全局工人信息库
  getWorkers: (search?: string, workerType?: string) => ipcRenderer.invoke('db:workers:getAll', search, workerType),
  createWorker: (worker: any) => ipcRenderer.invoke('db:workers:create', worker),
  updateWorker: (worker: any) => ipcRenderer.invoke('db:workers:update', worker),
  deleteWorker: (id: number) => ipcRenderer.invoke('db:workers:delete', id),
  getWorkerStats: (workerId: number) => ipcRenderer.invoke('db:workers:getStats', workerId),

  // 项目用工关系
  getProjectWorkers: (projectId: number) => ipcRenderer.invoke('db:projectWorkers:getAll', projectId),
  createProjectWorker: (pw: any) => ipcRenderer.invoke('db:projectWorkers:create', pw),
  updateProjectWorker: (pw: any) => ipcRenderer.invoke('db:projectWorkers:update', pw),
  deleteProjectWorker: (id: number) => ipcRenderer.invoke('db:projectWorkers:delete', id),
  batchCreateProjectWorkers: (entries: any[]) => ipcRenderer.invoke('db:projectWorkers:batchCreate', entries),

  // 材料
  getMaterials: (projectId?: number) => ipcRenderer.invoke('db:materials:getAll', projectId),
  createMaterial: (material: any) => ipcRenderer.invoke('db:materials:create', material),
  updateMaterial: (material: any) => ipcRenderer.invoke('db:materials:update', material),
  deleteMaterial: (id: number) => ipcRenderer.invoke('db:materials:delete', id),

  // 费用
  getExpenses: (projectId?: number) => ipcRenderer.invoke('db:expenses:getAll', projectId),
  createExpense: (expense: any) => ipcRenderer.invoke('db:expenses:create', expense),
  updateExpense: (expense: any) => ipcRenderer.invoke('db:expenses:update', expense),
  deleteExpense: (id: number) => ipcRenderer.invoke('db:expenses:delete', id),

  // 成本台账
  getCostLedger: (projectId: number) => ipcRenderer.invoke('db:costLedger:list', projectId),
  createCostLedger: (entry: any) => ipcRenderer.invoke('db:costLedger:create', entry),
  updateCostLedger: (id: number, changes: any) => ipcRenderer.invoke('db:costLedger:update', id, changes),
  deleteCostLedger: (id: number) => ipcRenderer.invoke('db:costLedger:delete', id),
  getCostLedgerSummary: (projectId: number) => ipcRenderer.invoke('db:costLedger:summary', projectId),
  getCostLedgerCategories: (direction?: string) => ipcRenderer.invoke('db:costLedgerCategories:list', direction),
  createCostLedgerCategory: (data: { label: string; direction: string; color?: string }) => ipcRenderer.invoke('db:costLedgerCategories:create', data),
  updateCostLedgerCategory: (id: number, changes: any) => ipcRenderer.invoke('db:costLedgerCategories:update', id, changes),
  deleteCostLedgerCategory: (id: number) => ipcRenderer.invoke('db:costLedgerCategories:delete', id),
  resetCostLedgerCategories: () => ipcRenderer.invoke('db:costLedgerCategories:reset'),

  // 部门
  getDepartments: () => ipcRenderer.invoke('db:departments:getAll'),
  createDepartment: (data: { name: string; managerId?: number; positions?: string[] }) => ipcRenderer.invoke('db:departments:create', data),
  updateDepartment: (data: { id: number; name?: string; managerId?: number | null; positions?: string[] }) => ipcRenderer.invoke('db:departments:update', data),
  deleteDepartment: (id: number) => ipcRenderer.invoke('db:departments:delete', id),

  // 图纸
  getDrawings: (projectId?: number) => ipcRenderer.invoke('db:drawings:getAll', projectId),
  uploadDrawing: (options: any) => ipcRenderer.invoke('db:drawings:upload', options),
  updateDrawing: (drawing: any) => ipcRenderer.invoke('db:drawings:update', drawing),
  deleteDrawing: (id: number) => ipcRenderer.invoke('db:drawings:delete', id),

  // 合作单位
  getPartners: () => ipcRenderer.invoke('db:partners:getAll'),
  getProjectPartners: (projectId: number) => ipcRenderer.invoke('db:partners:getByProject', projectId),
  createPartner: (partner: any) => ipcRenderer.invoke('db:partners:create', partner),
  updatePartner: (partner: any) => ipcRenderer.invoke('db:partners:update', partner),
  deletePartner: (id: number) => ipcRenderer.invoke('db:partners:delete', id),

  // 地区
  getRegions: () => ipcRenderer.invoke('db:regions:getAll'),
  createRegion: (region: any) => ipcRenderer.invoke('db:regions:create', region),
  deleteRegion: (id: number) => ipcRenderer.invoke('db:regions:delete', id),

  // 监管单位
  getSupervisors: () => ipcRenderer.invoke('db:supervisors:getAll'),
  createSupervisor: (supervisor: any) => ipcRenderer.invoke('db:supervisors:create', supervisor),
  updateSupervisor: (supervisor: any) => ipcRenderer.invoke('db:supervisors:update', supervisor),
  deleteSupervisor: (id: number) => ipcRenderer.invoke('db:supervisors:delete', id),

  // 收入合同
  getIncomeContracts: (projectId?: number) => ipcRenderer.invoke('db:incomeContracts:getAll', projectId),
  createIncomeContract: (contract: any) => ipcRenderer.invoke('db:incomeContracts:create', contract),
  updateIncomeContract: (contract: any) => ipcRenderer.invoke('db:incomeContracts:update', contract),
  deleteIncomeContract: (id: number) => ipcRenderer.invoke('db:incomeContracts:delete', id),

  // 收入记录
  getIncomeRecords: (contractId: number) => ipcRenderer.invoke('db:incomeRecords:getAll', contractId),
  createIncomeRecord: (record: any) => ipcRenderer.invoke('db:incomeRecords:create', record),
  deleteIncomeRecord: (id: number) => ipcRenderer.invoke('db:incomeRecords:delete', id),

  // 支出合同
  getExpenseContracts: (projectId?: number) => ipcRenderer.invoke('db:expenseContracts:getAll', projectId),
  createExpenseContract: (contract: any) => ipcRenderer.invoke('db:expenseContracts:create', contract),
  updateExpenseContract: (contract: any) => ipcRenderer.invoke('db:expenseContracts:update', contract),
  deleteExpenseContract: (id: number) => ipcRenderer.invoke('db:expenseContracts:delete', id),

  // 支出记录
  getExpenseRecords: (contractId: number) => ipcRenderer.invoke('db:expenseRecords:getAll', contractId),
  createExpenseRecord: (record: any) => ipcRenderer.invoke('db:expenseRecords:create', record),
  deleteExpenseRecord: (id: number) => ipcRenderer.invoke('db:expenseRecords:delete', id),

  // 其他协议
  getAgreementContracts: (projectId?: number) => ipcRenderer.invoke('db:agreementContracts:getAll', projectId),
  createAgreementContract: (contract: any) => ipcRenderer.invoke('db:agreementContracts:create', contract),
  updateAgreementContract: (contract: any) => ipcRenderer.invoke('db:agreementContracts:update', contract),
  deleteAgreementContract: (id: number) => ipcRenderer.invoke('db:agreementContracts:delete', id),

  // 合同统计
  getContractStats: () => ipcRenderer.invoke('db:contractStats:get'),

  // 统计
  getDashboardStats: () => ipcRenderer.invoke('db:stats:getDashboard'),
  getUploadsPath: () => ipcRenderer.invoke('app:getUploadsPath'),

  // 统一文件服务
  saveFile: (options: { category: string; subCategory: string; fileData: string; fileName: string; projectName?: string | null }) =>
    ipcRenderer.invoke('file:save', options),
  readFile: (options: { category: string; subCategory: string; fileName: string; projectName?: string | null }) =>
    ipcRenderer.invoke('file:read', options),
  deleteFile: (options: { category: string; subCategory: string; fileName: string; projectName?: string | null }) =>
    ipcRenderer.invoke('file:delete', options),
  openFileExternal: (options: { category: string; subCategory: string; fileName: string; projectName?: string | null }) =>
    ipcRenderer.invoke('file:openExternal', options),

  // 合同附件文件存储（向后兼容，新代码推荐使用统一文件服务）
  saveContractFile: (options: { fileData: string; fileName: string; subCategory?: string; projectName?: string | null }) => ipcRenderer.invoke('db:contracts:saveFile', options),
  readContractFile: (fileName: string, subCategory?: string, projectName?: string | null) => ipcRenderer.invoke('db:contracts:readFile', fileName, subCategory, projectName),

  // ============ 结算办理 ============
  getSettlements: (projectId?: number) => ipcRenderer.invoke('db:settlements:getAll', projectId),
  createSettlement: (settlement: any) => ipcRenderer.invoke('db:settlements:create', settlement),
  updateSettlement: (settlement: any) => ipcRenderer.invoke('db:settlements:update', settlement),
  deleteSettlement: (id: number) => ipcRenderer.invoke('db:settlements:delete', id),
  processSettlement: (id: number) => ipcRenderer.invoke('db:settlements:process', id),
  unarchiveSettlement: (id: number) => ipcRenderer.invoke('db:settlements:unarchive', id),

  // ============ 合同模板（旧版） ============
  getContractTemplates: () => ipcRenderer.invoke('db:contractTemplates:getAll'),
  createContractTemplate: (template: any) => ipcRenderer.invoke('db:contractTemplates:create', template),
  updateContractTemplate: (template: any) => ipcRenderer.invoke('db:contractTemplates:update', template),
  deleteContractTemplate: (id: number) => ipcRenderer.invoke('db:contractTemplates:delete', id),

  // ============ 模板管理（新版） ============
  getTemplates: (category?: string) => ipcRenderer.invoke('db:templates:getAll', category),
  createTemplate: (template: any) => ipcRenderer.invoke('db:templates:create', template),
  updateTemplate: (template: any) => ipcRenderer.invoke('db:templates:update', template),
  deleteTemplate: (id: number) => ipcRenderer.invoke('db:templates:delete', id),
  getTemplateStats: () => ipcRenderer.invoke('db:templates:getStats'),
  fillTemplateDocx: (storedFileName: string, values: Record<string, string>) =>
    ipcRenderer.invoke('templates:fill-docx', storedFileName, values),

  // ============ 进销存 ============
  getInventoryItems: () => ipcRenderer.invoke('db:inventoryItems:getAll'),
  createInventoryItem: (item: any) => ipcRenderer.invoke('db:inventoryItems:create', item),
  updateInventoryItem: (item: any) => ipcRenderer.invoke('db:inventoryItems:update', item),
  deleteInventoryItem: (id: number) => ipcRenderer.invoke('db:inventoryItems:delete', id),
  getInventoryTransactions: (itemId?: number) => ipcRenderer.invoke('db:inventoryTransactions:getAll', itemId),
  createInventoryTransaction: (transaction: any) => ipcRenderer.invoke('db:inventoryTransactions:create', transaction),

  // ============ 发票管理 ============
  getInvoices: (type?: string) => ipcRenderer.invoke('db:invoices:getAll', type),
  createInvoice: (invoice: any) => ipcRenderer.invoke('db:invoices:create', invoice),
  updateInvoice: (invoice: any) => ipcRenderer.invoke('db:invoices:update', invoice),
  deleteInvoice: (id: number) => ipcRenderer.invoke('db:invoices:delete', id),
  updateInvoiceStatus: (id: number, status: string) => ipcRenderer.invoke('db:invoices:updateStatus', id, status),

  // ============ 收款记录 ============
  getPaymentRecords: (type?: string) => ipcRenderer.invoke('db:paymentRecords:getAll', type),
  createPaymentRecord: (record: any) => ipcRenderer.invoke('db:paymentRecords:create', record),
  updatePaymentRecord: (record: any) => ipcRenderer.invoke('db:paymentRecords:update', record),
  deletePaymentRecord: (id: number) => ipcRenderer.invoke('db:paymentRecords:delete', id),

  // ============ 考勤管理 ============
  getAttendances: (projectId?: number, yearMonth?: string) => ipcRenderer.invoke('db:attendances:getAll', projectId, yearMonth),
  getAttendancesByMember: (memberId: number, yearMonth?: string) => ipcRenderer.invoke('db:attendances:getByMember', memberId, yearMonth),
  createAttendance: (record: any) => ipcRenderer.invoke('db:attendances:create', record),
  updateAttendance: (record: any) => ipcRenderer.invoke('db:attendances:update', record),
  generateDefaultAttendances: (projectId: number, yearMonth: string, memberIds: number[]) => ipcRenderer.invoke('db:attendances:generateDefaults', projectId, yearMonth, memberIds),
  generateDefaultAttendancesV2: (projectId: number, yearMonth: string, projectWorkerIds: number[]) => ipcRenderer.invoke('db:attendances:generateDefaultsV2', projectId, yearMonth, projectWorkerIds),
  batchImportAttendances: (projectId: number, yearMonth: string, records: { projectWorkerId: number; workDays: number }[]) => ipcRenderer.invoke('db:attendances:batchImport', projectId, yearMonth, records),
  deleteAttendance: (id: number) => ipcRenderer.invoke('db:attendances:delete', id),
  batchDeleteAttendances: (ids: number[]) => ipcRenderer.invoke('db:attendances:batchDelete', ids),

  // ============ 薪资历史 ============
  getSalaryHistory: (memberId: number) => ipcRenderer.invoke('db:salaryHistory:list', memberId),
  createSalaryHistory: (record: any) => ipcRenderer.invoke('db:salaryHistory:create', record),
  deleteSalaryHistory: (id: number) => ipcRenderer.invoke('db:salaryHistory:delete', id),
  getEffectiveSalary: (memberId: number, yearMonth: string) => ipcRenderer.invoke('db:salaryHistory:getEffective', memberId, yearMonth),

  // ============ 工资管理 ============
  getWages: (projectId?: number, yearMonth?: string, memberId?: number) => ipcRenderer.invoke('db:wages:getAll', projectId, yearMonth, memberId),
  generateProjectWages: (projectId: number, yearMonth: string) => ipcRenderer.invoke('db:wages:generateForProject', projectId, yearMonth),
  createWage: (record: any) => ipcRenderer.invoke('db:wages:create', record),
  updateWage: (record: any) => ipcRenderer.invoke('db:wages:update', record),
  batchSaveWages: (records: any[]) => ipcRenderer.invoke('db:wages:batchSave', records),
  deleteWage: (id: number) => ipcRenderer.invoke('db:wages:delete', id),
  batchDeleteWages: (ids: number[]) => ipcRenderer.invoke('db:wages:batchDelete', ids),
  batchClearPayments: (ids: number[]) => ipcRenderer.invoke('db:wages:batchClearPayments', ids),
  batchArchivePayments: (ids: number[]) => ipcRenderer.invoke('db:wages:batchArchivePayments', ids),
  getWageStats: (yearMonth?: string, projectId?: number) => ipcRenderer.invoke('db:wages:getStats', yearMonth, projectId),
  parseBankReceipt: (sourcePath: string, projectName?: string) => ipcRenderer.invoke('db:wages:parseBankReceipt', sourcePath, projectName),

  // ============ 审计日志 ============
  auditLog: (log: any) => ipcRenderer.invoke('audit:log', log),
  queryAuditLogs: (query: any) => ipcRenderer.invoke('audit:query', query),
  getAuditStats: (days?: number) => ipcRenderer.invoke('audit:stats', days),
  clearAuditLogs: (daysToKeep: number) => ipcRenderer.invoke('audit:clear', daysToKeep),

  // ============ 角色权限 ============
  getRoles: () => ipcRenderer.invoke('roles:getAll'),
  updateRole: (roleId: string, permissions: string[]) => ipcRenderer.invoke('roles:update', roleId, permissions),
  resetRole: (roleId: string) => ipcRenderer.invoke('roles:reset', roleId)
})
