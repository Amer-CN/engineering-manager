/**
 * API 适配器
 *
 * 根据运行环境自动选择 Electron 或 Tauri API。
 * 这样前端代码不需要修改，只需要使用这个适配器。
 */

// 检测运行环境
const isElectron = typeof window !== 'undefined' && window.electronAPI !== undefined;
const isTauri = typeof window !== 'undefined' && ((window as any).__TAURI__ !== undefined || (window as any).__TAURI_INTERNALS__ !== undefined);

// C# API 检测
let csharpApiAvailable: boolean | null = null;

async function checkCSharpApi(): Promise<boolean> {
  if (csharpApiAvailable !== null) return csharpApiAvailable;
  try {
    // 使用相对路径，dev 模式通过 Vite 代理转发到 C# 后端
    const resp = await fetch('/api/health', { signal: AbortSignal.timeout(2000) });
    csharpApiAvailable = resp.ok;
  } catch {
    csharpApiAvailable = false;
  }
  return csharpApiAvailable;
}

// 动态导入 API（延迟加载）
let cachedAPI: any = null;

async function getCachedAPI() {
  if (cachedAPI) return cachedAPI;
  const module = await import('./tauri-bridge');
  cachedAPI = module.tauriAPI;
  return cachedAPI;
}

/**
 * 获取当前环境的 API
 * 优先使用 Electron API（向后兼容），否则使用 Tauri API
 */
export async function getAPI() {
  // 优先使用 Electron API
  if (isElectron) {
    return window.electronAPI;
  }

  // 检测 C# API（HTTP 模式）
  if (await checkCSharpApi()) {
    return await getCachedAPI();
  }

  // Tauri 环境
  if (isTauri) {
    return await getCachedAPI();
  }

  // 开发环境 fallback（浏览器中运行）
  console.warn('[API] 未检测到后端 API，使用 mock API');
  return createMockAPI();
}

/**
 * Mock API 用于浏览器开发
 */
function createMockAPI() {
  return {
    getProjects: async () => ({ success: true, data: [] }),
    createProject: async () => ({ success: true, data: { id: 1 } }),
    updateProject: async () => ({ success: true }),
    deleteProject: async () => ({ success: true }),
    getProject: async () => ({ success: true, data: null }),
    // 成员
    getMembers: async () => ({ success: true, data: [] }),
    createMember: async () => ({ success: true, data: { id: 1 } }),
    updateMember: async () => ({ success: true }),
    deleteMember: async () => ({ success: true }),
    // 工人
    getWorkers: async () => ({ success: true, data: [] }),
    getWorkerStats: async () => ({ success: true, data: {} }),
    getProjectWorkers: async () => ({ success: true, data: [] }),
    createWorker: async () => ({ success: true, data: { id: 1 } }),
    updateWorker: async () => ({ success: true }),
    deleteWorker: async () => ({ success: true }),
    createProjectWorker: async () => ({ success: true, data: { id: 1 } }),
    batchCreateProjectWorkers: async () => ({ success: true, data: { count: 0 } }),
    updateProjectWorker: async () => ({ success: true }),
    deleteProjectWorker: async () => ({ success: true }),
    // 发票
    getInvoices: async () => ({ success: true, data: [] }),
    createInvoice: async () => ({ success: true, data: { id: 1 } }),
    updateInvoice: async () => ({ success: true }),
    deleteInvoice: async () => ({ success: true }),
    updateInvoiceStatus: async () => ({ success: true }),
    // 合同
    getIncomeContracts: async () => ({ success: true, data: [] }),
    getExpenseContracts: async () => ({ success: true, data: [] }),
    getAgreementContracts: async () => ({ success: true, data: [] }),
    getContracts: async () => ({ success: true, data: [] }),
    createIncomeContract: async () => ({ success: true, data: { id: 1 } }),
    createExpenseContract: async () => ({ success: true, data: { id: 1 } }),
    createContract: async () => ({ success: true, data: { id: 1 } }),
    updateIncomeContract: async () => ({ success: true }),
    updateExpenseContract: async () => ({ success: true }),
    deleteIncomeContract: async () => ({ success: true }),
    deleteExpenseContract: async () => ({ success: true }),
    deleteContract: async () => ({ success: true }),
    getContractStats: async () => ({ success: true, data: {} }),
    // 工资历史
    getWageHistory: async () => ({ success: true, data: [] }),
    getEffectiveWage: async () => ({ success: true, data: null }),
    getTeamWages: async () => ({ success: true, data: [] }),
    getDashboardStats: async () => ({
      success: true,
      data: {
        projectsCount: 0,
        membersCount: 0,
        materialsCount: 0,
        totalExpenses: 0,
        settlementsCount: 0,
        invoicesCount: 0,
        inventoryItemsCount: 0,
        inProgressProjects: 0,
      },
    }),
    saveFile: async () => ({ success: true, data: { fileName: '' } }),
    readFile: async () => ({ success: true, data: { dataUrl: '', mimeType: '' } }),
    deleteFile: async () => ({ success: true }),
    openFileExternal: async () => ({ success: true }),
    // 考勤
    getAttendances: async () => ({ success: true, data: [] }),
    getAttendancesByMember: async () => ({ success: true, data: [] }),
    createAttendance: async () => ({ success: true, data: { id: 1 } }),
    updateAttendance: async () => ({ success: true }),
    deleteAttendance: async () => ({ success: true }),
    batchDeleteAttendances: async () => ({ success: true, data: { deleted: 0 } }),
    batchCreateAttendances: async () => ({ success: true, data: { count: 0 } }),
    generateDefaultAttendances: async () => ({ success: true, data: { count: 0 } }),
    generateDefaultAttendancesV2: async () => ({ success: true, data: { count: 0 } }),
    batchImportAttendances: async () => ({ success: true, data: { created: 0, updated: 0 } }),
    // 工资
    getWages: async () => ({ success: true, data: [] }),
    generateForProject: async () => ({ success: true, data: { newCount: 0, archivedSkipped: 0 } }),
    createWage: async () => ({ success: true, data: { id: 1 } }),
    updateWage: async () => ({ success: true }),
    deleteWage: async () => ({ success: true }),
    batchDeleteWages: async () => ({ success: true, data: { deleted: 0 } }),
    batchClearPayments: async () => ({ success: true, data: { cleared: 0 } }),
    archiveWages: async () => ({ success: true, data: { archived: 0 } }),
    getWageStats: async () => ({ success: true, data: { totalWage: 0, count: 0, projectBreakdown: [] } }),
    matchBankReceiptItems: async () => ({ success: true, data: [] }),
    batchConfirmMatches: async () => ({ success: true, data: { updated: 0 } }),
    // 审计日志
    auditLog: async () => ({ success: true }),
    auditQuery: async () => ({ success: true, data: { items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 } }),
    auditStats: async () => ({ success: true, data: { totalCount: 0, todayCount: 0, actionCounts: {}, resourceCounts: {}, topUsers: [] } }),
    auditClear: async () => ({ success: true, data: { removedCount: 0 } }),
    // 角色权限
    getRoles: async () => ({ success: true, data: [] }),
    updateRole: async () => ({ success: true }),
    resetRole: async () => ({ success: true, data: { permissions: [] } }),
    // OCR
    ocrBaiduIdCard: async () => ({ success: false, error: 'Mock 环境不支持 OCR' }),
    ocrBaiduInvoice: async () => ({ success: false, error: 'Mock 环境不支持 OCR' }),
    ocrBaiduBankCard: async () => ({ success: false, error: 'Mock 环境不支持 OCR' }),
    ocrBaiduBusinessLicense: async () => ({ success: false, error: 'Mock 环境不支持 OCR' }),
    ocrBaiduBankReceipt: async () => ({ success: false, error: 'Mock 环境不支持 OCR' }),
    ocrBaiduPermit: async () => ({ success: false, error: 'Mock 环境不支持 OCR' }),
    ocrBaiduBankStatement: async () => ({ success: false, error: 'Mock 环境不支持 OCR' }),
    ocrBaiduGeneralReceipt: async () => ({ success: false, error: 'Mock 环境不支持 OCR' }),
    ocrBaiduCompanyQuery: async () => ({ success: false, error: 'Mock 环境不支持 OCR' }),
    ocrCheckNetwork: async () => ({ success: true, data: false }),
    ocrClearTokenCache: async () => ({ success: true, data: true }),
    ocrGetStats: async () => ({ success: true, data: { idCard: 0, invoice: 0, bankCard: 0, businessLicense: 0, bankReceipt: 0, permit: 0, bankStatement: 0, generalReceipt: 0, companyQuery: 0, lastReset: '' } }),
    // 认证
    authLogin: async () => ({ success: true, data: { id: '1', username: 'admin', role_id: 'admin' } }),
    authGetAllUsers: async () => ({ success: true, data: [] }),
    authGetCurrentUser: async () => ({ success: true, data: null }),
    authCreateUser: async () => ({ success: true, data: { id: '1' } }),
    authUpdateUser: async () => ({ success: true }),
    authDeleteUser: async () => ({ success: true }),
    // 配置
    getConfig: async () => ({ success: true, data: { dataPath: '', defaultPath: '', gpuAcceleration: true } }),
    getDataPath: async () => ({ success: true, data: '' }),
    setDataPath: async () => ({ success: true }),
    getGpuAcceleration: async () => ({ success: true, data: true }),
    setGpuAcceleration: async () => ({ success: true }),
    // 数据健康
    dataConsistencyCheck: async () => ({ success: true, data: { tables: [], consistent: true } }),
    dataIntegrityCheck: async () => ({ success: true, data: { ok: true } }),
    dataExportJson: async () => ({ success: true, data: { exported: 0 } }),
    dataReconcile: async () => ({ success: true, data: { reconciled: true } }),
    // SQLite
    sqliteStatus: async () => ({ success: true, data: { ready: true, mode: 'sqlite' } }),
    sqliteEnable: async () => ({ success: true }),
    sqliteMigrate: async () => ({ success: true }),
    sqliteGetReadMode: async () => ({ success: true, data: 'sqlite' }),
    sqliteSetReadMode: async () => ({ success: true }),
    // 图纸
    getDrawings: async () => ({ success: true, data: [] }),
    uploadDrawing: async () => ({ success: true, data: { id: 1 } }),
    updateDrawing: async () => ({ success: true }),
    deleteDrawing: async () => ({ success: true }),
    // 费用
    getExpenses: async () => ({ success: true, data: [] }),
    createExpense: async () => ({ success: true, data: { id: 1 } }),
    updateExpense: async () => ({ success: true }),
    deleteExpense: async () => ({ success: true }),
    // 库存
    getInventoryItems: async () => ({ success: true, data: [] }),
    createInventoryItem: async () => ({ success: true, data: { id: 1 } }),
    updateInventoryItem: async () => ({ success: true }),
    deleteInventoryItem: async () => ({ success: true }),
    getInventoryTransactions: async () => ({ success: true, data: [] }),
    createInventoryTransaction: async () => ({ success: true, data: { id: 1 } }),
    // 物料
    getMaterials: async () => ({ success: true, data: [] }),
    createMaterial: async () => ({ success: true, data: { id: 1 } }),
    updateMaterial: async () => ({ success: true }),
    deleteMaterial: async () => ({ success: true }),
    // 区域
    getRegions: async () => ({ success: true, data: [] }),
    createRegion: async () => ({ success: true, data: { id: 1 } }),
    deleteRegion: async () => ({ success: true }),
    // 监管单位
    getSupervisors: async () => ({ success: true, data: [] }),
    createSupervisor: async () => ({ success: true, data: { id: 1 } }),
    updateSupervisor: async () => ({ success: true }),
    deleteSupervisor: async () => ({ success: true }),
    // 项目成员
    getProjectMembers: async () => ({ success: true, data: [] }),
    addProjectMember: async () => ({ success: true, data: { id: 1 } }),
    removeProjectMember: async () => ({ success: true }),
    updateProjectMember: async () => ({ success: true }),
    // 班组
    getWorkerTeams: async () => ({ success: true, data: [] }),
    createWorkerTeam: async () => ({ success: true, data: { id: 1 } }),
    updateWorkerTeam: async () => ({ success: true }),
    deleteWorkerTeam: async () => ({ success: true }),
    // 收付款记录
    getPaymentRecords: async () => ({ success: true, data: [] }),
    createPaymentRecord: async () => ({ success: true, data: { id: 1 } }),
    updatePaymentRecord: async () => ({ success: true }),
    deletePaymentRecord: async () => ({ success: true }),
    // 合同模板
    getContractTemplates: async () => ({ success: true, data: [] }),
    createContractTemplate: async () => ({ success: true, data: { id: 1 } }),
    updateContractTemplate: async () => ({ success: true }),
    deleteContractTemplate: async () => ({ success: true }),
    // 工资扩展
    getWagePaymentRecords: async () => ({ success: true, data: [] }),
    getWageOverdueStats: async () => ({ success: true, data: { count: 0, amount: 0 } }),
    getWageOverdueList: async () => ({ success: true, data: [] }),
    batchArchiveWages: async () => ({ success: true, data: { archived: 0 } }),
    batchSaveWages: async () => ({ success: true, data: { saved: 0 } }),
    // 成本台账匹配规则
    getCostLedgerMatchRules: async () => ({ success: true, data: [] }),
    saveCostLedgerMatchRule: async () => ({ success: true, data: { id: 1 } }),
  };
}

/**
 * 导出环境检测结果
 */
export const environment = {
  isElectron,
  isTauri,
  isBrowser: !isElectron && !isTauri,
};
