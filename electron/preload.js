import { contextBridge, ipcRenderer } from 'electron';
// 暴露给渲染进程的 API
contextBridge.exposeInMainWorld('electronAPI', {
    // 系统
    openDevTools: function () { return ipcRenderer.invoke('app:openDevTools'); },
    // 配置
    getConfig: function () { return ipcRenderer.invoke('config:get'); },
    setDataPath: function (path) { return ipcRenderer.invoke('config:setDataPath', path); },
    getDataPath: function () { return ipcRenderer.invoke('app:getDataPath'); },
    // 认证
    login: function (username, password) { return ipcRenderer.invoke('auth:login', username, password); },
    getCurrentUser: function (userId) { return ipcRenderer.invoke('auth:getCurrentUser', userId); },
    getAllUsers: function () { return ipcRenderer.invoke('auth:getAllUsers'); },
    createUser: function (userData) { return ipcRenderer.invoke('auth:createUser', userData); },
    updateUser: function (userId, updates) { return ipcRenderer.invoke('auth:updateUser', userId, updates); },
    deleteUser: function (userId) { return ipcRenderer.invoke('auth:deleteUser', userId); },
    setSession: function (session) {
        return ipcRenderer.invoke('auth:setSession', session);
    },
    clearSession: function () { return ipcRenderer.invoke('auth:clearSession'); },
    // 项目
    getProjects: function () { return ipcRenderer.invoke('db:projects:getAll'); },
    createProject: function (project) { return ipcRenderer.invoke('db:projects:create', project); },
    updateProject: function (project) { return ipcRenderer.invoke('db:projects:update', project); },
    deleteProject: function (id) { return ipcRenderer.invoke('db:projects:delete', id); },
    // 成员
    getMembers: function () { return ipcRenderer.invoke('db:members:getAll'); },
    createMember: function (member) { return ipcRenderer.invoke('db:members:create', member); },
    updateMember: function (member) { return ipcRenderer.invoke('db:members:update', member); },
    deleteMember: function (id) { return ipcRenderer.invoke('db:members:delete', id); },
    // 项目成员关联（含时间维度）
    getProjectMembers: function (projectId) { return ipcRenderer.invoke('db:projectMembers:getAll', projectId); },
    addProjectMember: function (projectId, memberId, joinedAt) { return ipcRenderer.invoke('db:projectMembers:add', projectId, memberId, joinedAt); },
    updateProjectMember: function (id, updates) { return ipcRenderer.invoke('db:projectMembers:update', id, updates); },
    removeProjectMember: function (id) { return ipcRenderer.invoke('db:projectMembers:remove', id); },
    // 农民工班组
    getWorkerTeams: function () { return ipcRenderer.invoke('db:workerTeams:getAll'); },
    createWorkerTeam: function (team) { return ipcRenderer.invoke('db:workerTeams:create', team); },
    updateWorkerTeam: function (team) { return ipcRenderer.invoke('db:workerTeams:update', team); },
    deleteWorkerTeam: function (id) { return ipcRenderer.invoke('db:workerTeams:delete', id); },
    // 工人调动记录
    getWorkerTransferRecords: function (workerId) { return ipcRenderer.invoke('db:workerTransferRecords:getAll', workerId); },
    createWorkerTransfer: function (record) { return ipcRenderer.invoke('db:workerTransferRecords:create', record); },
    // 全局工人信息库
    getWorkers: function (search, workerType) { return ipcRenderer.invoke('db:workers:getAll', search, workerType); },
    createWorker: function (worker) { return ipcRenderer.invoke('db:workers:create', worker); },
    updateWorker: function (worker) { return ipcRenderer.invoke('db:workers:update', worker); },
    deleteWorker: function (id) { return ipcRenderer.invoke('db:workers:delete', id); },
    getWorkerStats: function (workerId) { return ipcRenderer.invoke('db:workers:getStats', workerId); },
    getTeamWages: function (projectId, teamId) { return ipcRenderer.invoke('db:workers:getTeamWages', projectId, teamId); },
    fixWorkerData: function () { return ipcRenderer.invoke('db:workers:fixData'); },
    // 项目用工关系
    getProjectWorkers: function (projectId) { return ipcRenderer.invoke('db:projectWorkers:getAll', projectId); },
    createProjectWorker: function (pw) { return ipcRenderer.invoke('db:projectWorkers:create', pw); },
    updateProjectWorker: function (pw) { return ipcRenderer.invoke('db:projectWorkers:update', pw); },
    deleteProjectWorker: function (id) { return ipcRenderer.invoke('db:projectWorkers:delete', id); },
    batchCreateProjectWorkers: function (entries) { return ipcRenderer.invoke('db:projectWorkers:batchCreate', entries); },
    // 材料
    getMaterials: function (projectId) { return ipcRenderer.invoke('db:materials:getAll', projectId); },
    createMaterial: function (material) { return ipcRenderer.invoke('db:materials:create', material); },
    updateMaterial: function (material) { return ipcRenderer.invoke('db:materials:update', material); },
    deleteMaterial: function (id) { return ipcRenderer.invoke('db:materials:delete', id); },
    // 费用
    getExpenses: function (projectId) { return ipcRenderer.invoke('db:expenses:getAll', projectId); },
    createExpense: function (expense) { return ipcRenderer.invoke('db:expenses:create', expense); },
    updateExpense: function (expense) { return ipcRenderer.invoke('db:expenses:update', expense); },
    deleteExpense: function (id) { return ipcRenderer.invoke('db:expenses:delete', id); },
    // 成本台账
    getCostLedger: function (projectId, batchId) { return ipcRenderer.invoke('db:costLedger:list', projectId, batchId); },
    createCostLedger: function (entry) { return ipcRenderer.invoke('db:costLedger:create', entry); },
    batchCreateCostLedger: function (projectId, entries, batchId) { return ipcRenderer.invoke('db:costLedger:batchCreate', projectId, entries, batchId); },
    updateCostLedger: function (id, changes) { return ipcRenderer.invoke('db:costLedger:update', id, changes); },
    deleteCostLedger: function (id) { return ipcRenderer.invoke('db:costLedger:delete', id); },
    getCostLedgerSummary: function (projectId, batchId) { return ipcRenderer.invoke('db:costLedger:summary', projectId, batchId); },
    getCostLedgerBatches: function (projectId) { return ipcRenderer.invoke('db:costLedgerBatches:list', projectId); },
    createCostLedgerBatch: function (projectId, name) { return ipcRenderer.invoke('db:costLedgerBatches:create', projectId, name); },
    copyCostLedgerBatch: function (projectId, sourceBatchId, name) { return ipcRenderer.invoke('db:costLedgerBatches:copy', projectId, sourceBatchId, name); },
    renameCostLedgerBatch: function (projectId, batchId, name) { return ipcRenderer.invoke('db:costLedgerBatches:rename', projectId, batchId, name); },
    deleteCostLedgerBatch: function (projectId, batchId) { return ipcRenderer.invoke('db:costLedgerBatches:delete', projectId, batchId); },
    getCostLedgerMatchRules: function () { return ipcRenderer.invoke('db:costLedgerMatchRules:list'); },
    saveCostLedgerMatchRules: function (rules) { return ipcRenderer.invoke('db:costLedgerMatchRules:save', rules); },
    getCostLedgerCategories: function (direction) { return ipcRenderer.invoke('db:costLedgerCategories:list', direction); },
    createCostLedgerCategory: function (data) { return ipcRenderer.invoke('db:costLedgerCategories:create', data); },
    updateCostLedgerCategory: function (id, changes) { return ipcRenderer.invoke('db:costLedgerCategories:update', id, changes); },
    deleteCostLedgerCategory: function (id) { return ipcRenderer.invoke('db:costLedgerCategories:delete', id); },
    resetCostLedgerCategories: function () { return ipcRenderer.invoke('db:costLedgerCategories:reset'); },
    // 部门
    getDepartments: function () { return ipcRenderer.invoke('db:departments:getAll'); },
    createDepartment: function (data) { return ipcRenderer.invoke('db:departments:create', data); },
    updateDepartment: function (data) { return ipcRenderer.invoke('db:departments:update', data); },
    deleteDepartment: function (id) { return ipcRenderer.invoke('db:departments:delete', id); },
    // 图纸
    getDrawings: function (projectId) { return ipcRenderer.invoke('db:drawings:getAll', projectId); },
    uploadDrawing: function (options) { return ipcRenderer.invoke('db:drawings:upload', options); },
    updateDrawing: function (drawing) { return ipcRenderer.invoke('db:drawings:update', drawing); },
    deleteDrawing: function (id) { return ipcRenderer.invoke('db:drawings:delete', id); },
    // 合作单位
    getPartners: function () { return ipcRenderer.invoke('db:partners:getAll'); },
    getProjectPartners: function (projectId) { return ipcRenderer.invoke('db:partners:getByProject', projectId); },
    createPartner: function (partner) { return ipcRenderer.invoke('db:partners:create', partner); },
    updatePartner: function (partner) { return ipcRenderer.invoke('db:partners:update', partner); },
    deletePartner: function (id) { return ipcRenderer.invoke('db:partners:delete', id); },
    // 地区
    getRegions: function () { return ipcRenderer.invoke('db:regions:getAll'); },
    createRegion: function (region) { return ipcRenderer.invoke('db:regions:create', region); },
    deleteRegion: function (id) { return ipcRenderer.invoke('db:regions:delete', id); },
    // 监管单位
    getSupervisors: function () { return ipcRenderer.invoke('db:supervisors:getAll'); },
    createSupervisor: function (supervisor) { return ipcRenderer.invoke('db:supervisors:create', supervisor); },
    updateSupervisor: function (supervisor) { return ipcRenderer.invoke('db:supervisors:update', supervisor); },
    deleteSupervisor: function (id) { return ipcRenderer.invoke('db:supervisors:delete', id); },
    // 收入合同
    getIncomeContracts: function (projectId) { return ipcRenderer.invoke('db:incomeContracts:getAll', projectId); },
    createIncomeContract: function (contract) { return ipcRenderer.invoke('db:incomeContracts:create', contract); },
    updateIncomeContract: function (contract) { return ipcRenderer.invoke('db:incomeContracts:update', contract); },
    deleteIncomeContract: function (id) { return ipcRenderer.invoke('db:incomeContracts:delete', id); },
    // 收入记录
    getIncomeRecords: function (contractId) { return ipcRenderer.invoke('db:incomeRecords:getAll', contractId); },
    createIncomeRecord: function (record) { return ipcRenderer.invoke('db:incomeRecords:create', record); },
    deleteIncomeRecord: function (id) { return ipcRenderer.invoke('db:incomeRecords:delete', id); },
    // 支出合同
    getExpenseContracts: function (projectId) { return ipcRenderer.invoke('db:expenseContracts:getAll', projectId); },
    createExpenseContract: function (contract) { return ipcRenderer.invoke('db:expenseContracts:create', contract); },
    updateExpenseContract: function (contract) { return ipcRenderer.invoke('db:expenseContracts:update', contract); },
    deleteExpenseContract: function (id) { return ipcRenderer.invoke('db:expenseContracts:delete', id); },
    // 支出记录
    getExpenseRecords: function (contractId) { return ipcRenderer.invoke('db:expenseRecords:getAll', contractId); },
    createExpenseRecord: function (record) { return ipcRenderer.invoke('db:expenseRecords:create', record); },
    deleteExpenseRecord: function (id) { return ipcRenderer.invoke('db:expenseRecords:delete', id); },
    // 其他协议
    getAgreementContracts: function (projectId) { return ipcRenderer.invoke('db:agreementContracts:getAll', projectId); },
    createAgreementContract: function (contract) { return ipcRenderer.invoke('db:agreementContracts:create', contract); },
    updateAgreementContract: function (contract) { return ipcRenderer.invoke('db:agreementContracts:update', contract); },
    deleteAgreementContract: function (id) { return ipcRenderer.invoke('db:agreementContracts:delete', id); },
    // 合同统计
    getContractStats: function () { return ipcRenderer.invoke('db:contractStats:get'); },
    // 统计
    getDashboardStats: function () { return ipcRenderer.invoke('db:stats:getDashboard'); },
    getUploadsPath: function () { return ipcRenderer.invoke('app:getUploadsPath'); },
    // 统一文件服务
    saveFile: function (options) {
        return ipcRenderer.invoke('file:save', options);
    },
    readFile: function (options) {
        return ipcRenderer.invoke('file:read', options);
    },
    deleteFile: function (options) {
        return ipcRenderer.invoke('file:delete', options);
    },
    openFileExternal: function (options) {
        return ipcRenderer.invoke('file:openExternal', options);
    },
    // 合同附件文件存储（向后兼容，新代码推荐使用统一文件服务）
    saveContractFile: function (options) { return ipcRenderer.invoke('db:contracts:saveFile', options); },
    readContractFile: function (fileName, subCategory, projectName) { return ipcRenderer.invoke('db:contracts:readFile', fileName, subCategory, projectName); },
    // ============ 结算办理 ============
    getSettlements: function (projectId) { return ipcRenderer.invoke('db:settlements:getAll', projectId); },
    createSettlement: function (settlement) { return ipcRenderer.invoke('db:settlements:create', settlement); },
    updateSettlement: function (settlement) { return ipcRenderer.invoke('db:settlements:update', settlement); },
    deleteSettlement: function (id) { return ipcRenderer.invoke('db:settlements:delete', id); },
    processSettlement: function (id) { return ipcRenderer.invoke('db:settlements:process', id); },
    unarchiveSettlement: function (id) { return ipcRenderer.invoke('db:settlements:unarchive', id); },
    // ============ 合同模板（旧版） ============
    getContractTemplates: function () { return ipcRenderer.invoke('db:contractTemplates:getAll'); },
    createContractTemplate: function (template) { return ipcRenderer.invoke('db:contractTemplates:create', template); },
    updateContractTemplate: function (template) { return ipcRenderer.invoke('db:contractTemplates:update', template); },
    deleteContractTemplate: function (id) { return ipcRenderer.invoke('db:contractTemplates:delete', id); },
    // ============ 模板管理（新版） ============
    getTemplates: function (category) { return ipcRenderer.invoke('db:templates:getAll', category); },
    createTemplate: function (template) { return ipcRenderer.invoke('db:templates:create', template); },
    updateTemplate: function (template) { return ipcRenderer.invoke('db:templates:update', template); },
    deleteTemplate: function (id) { return ipcRenderer.invoke('db:templates:delete', id); },
    getTemplateStats: function () { return ipcRenderer.invoke('db:templates:getStats'); },
    fillTemplateDocx: function (storedFileName, values) {
        return ipcRenderer.invoke('templates:fill-docx', storedFileName, values);
    },
    // ============ 进销存 ============
    getInventoryItems: function () { return ipcRenderer.invoke('db:inventoryItems:getAll'); },
    createInventoryItem: function (item) { return ipcRenderer.invoke('db:inventoryItems:create', item); },
    updateInventoryItem: function (item) { return ipcRenderer.invoke('db:inventoryItems:update', item); },
    deleteInventoryItem: function (id) { return ipcRenderer.invoke('db:inventoryItems:delete', id); },
    getInventoryTransactions: function (itemId) { return ipcRenderer.invoke('db:inventoryTransactions:getAll', itemId); },
    createInventoryTransaction: function (transaction) { return ipcRenderer.invoke('db:inventoryTransactions:create', transaction); },
    // ============ 发票管理 ============
    getInvoices: function (type) { return ipcRenderer.invoke('db:invoices:getAll', type); },
    createInvoice: function (invoice) { return ipcRenderer.invoke('db:invoices:create', invoice); },
    updateInvoice: function (invoice) { return ipcRenderer.invoke('db:invoices:update', invoice); },
    deleteInvoice: function (id) { return ipcRenderer.invoke('db:invoices:delete', id); },
    updateInvoiceStatus: function (id, status) { return ipcRenderer.invoke('db:invoices:updateStatus', id, status); },
    // ============ 收款记录 ============
    getPaymentRecords: function (type) { return ipcRenderer.invoke('db:paymentRecords:getAll', type); },
    createPaymentRecord: function (record) { return ipcRenderer.invoke('db:paymentRecords:create', record); },
    updatePaymentRecord: function (record) { return ipcRenderer.invoke('db:paymentRecords:update', record); },
    deletePaymentRecord: function (id) { return ipcRenderer.invoke('db:paymentRecords:delete', id); },
    // ============ 考勤管理 ============
    getAttendances: function (projectId, yearMonth) { return ipcRenderer.invoke('db:attendances:getAll', projectId, yearMonth); },
    getAttendancesByMember: function (memberId, yearMonth) { return ipcRenderer.invoke('db:attendances:getByMember', memberId, yearMonth); },
    createAttendance: function (record) { return ipcRenderer.invoke('db:attendances:create', record); },
    updateAttendance: function (record) { return ipcRenderer.invoke('db:attendances:update', record); },
    generateDefaultAttendances: function (projectId, yearMonth, memberIds) { return ipcRenderer.invoke('db:attendances:generateDefaults', projectId, yearMonth, memberIds); },
    generateDefaultAttendancesV2: function (projectId, yearMonth, projectWorkerIds) { return ipcRenderer.invoke('db:attendances:generateDefaultsV2', projectId, yearMonth, projectWorkerIds); },
    batchImportAttendances: function (projectId, yearMonth, records) { return ipcRenderer.invoke('db:attendances:batchImport', projectId, yearMonth, records); },
    deleteAttendance: function (id) { return ipcRenderer.invoke('db:attendances:delete', id); },
    batchDeleteAttendances: function (ids) { return ipcRenderer.invoke('db:attendances:batchDelete', ids); },
    // ============ 薪资历史 ============
    getSalaryHistory: function (memberId) { return ipcRenderer.invoke('db:salaryHistory:list', memberId); },
    createSalaryHistory: function (record) { return ipcRenderer.invoke('db:salaryHistory:create', record); },
    deleteSalaryHistory: function (id) { return ipcRenderer.invoke('db:salaryHistory:delete', id); },
    getEffectiveSalary: function (memberId, yearMonth) { return ipcRenderer.invoke('db:salaryHistory:getEffective', memberId, yearMonth); },
    // ============ 工人日工资历史 ============
    getWageHistory: function (projectWorkerId) { return ipcRenderer.invoke('db:wageHistory:list', projectWorkerId); },
    saveWageHistory: function (record) { return ipcRenderer.invoke('db:wageHistory:save', record); },
    deleteWageHistory: function (id) { return ipcRenderer.invoke('db:wageHistory:delete', id); },
    getEffectiveWage: function (projectWorkerId, yearMonth) { return ipcRenderer.invoke('db:wageHistory:getEffective', projectWorkerId, yearMonth); },
    // ============ 工资管理 ============
    getWages: function (projectId, yearMonth, memberId) { return ipcRenderer.invoke('db:wages:getAll', projectId, yearMonth, memberId); },
    generateProjectWages: function (projectId, yearMonth) { return ipcRenderer.invoke('db:wages:generateForProject', projectId, yearMonth); },
    createWage: function (record) { return ipcRenderer.invoke('db:wages:create', record); },
    updateWage: function (record) { return ipcRenderer.invoke('db:wages:update', record); },
    batchSaveWages: function (records) { return ipcRenderer.invoke('db:wages:batchSave', records); },
    deleteWage: function (id) { return ipcRenderer.invoke('db:wages:delete', id); },
    batchDeleteWages: function (ids) { return ipcRenderer.invoke('db:wages:batchDelete', ids); },
    batchClearPayments: function (ids) { return ipcRenderer.invoke('db:wages:batchClearPayments', ids); },
    batchArchivePayments: function (ids) { return ipcRenderer.invoke('db:wages:batchArchivePayments', ids); },
    getWageStats: function (yearMonth, projectId) { return ipcRenderer.invoke('db:wages:getStats', yearMonth, projectId); },
    parseBankReceipt: function (sourcePath, projectName, yearMonth) { return ipcRenderer.invoke('db:wages:parseBankReceipt', sourcePath, projectName, yearMonth); },
    // ============ 审计日志 ============
    auditLog: function (log) { return ipcRenderer.invoke('audit:log', log); },
    queryAuditLogs: function (query) { return ipcRenderer.invoke('audit:query', query); },
    getAuditStats: function (days) { return ipcRenderer.invoke('audit:stats', days); },
    clearAuditLogs: function (daysToKeep) { return ipcRenderer.invoke('audit:clear', daysToKeep); },
    // ============ 快照管理 ============
    getSnapshots: function () { return ipcRenderer.invoke('db:snapshots:list'); },
    createSnapshot: function (label) { return ipcRenderer.invoke('db:snapshots:create', label); },
    restoreSnapshot: function (timestamp) { return ipcRenderer.invoke('db:snapshots:restore', timestamp); },
    deleteSnapshot: function (timestamp) { return ipcRenderer.invoke('db:snapshots:delete', timestamp); },
    setMaxSnapshots: function (count) { return ipcRenderer.invoke('db:snapshots:setMaxCount', count); },
    getMaxSnapshots: function () { return ipcRenderer.invoke('db:snapshots:getMaxCount'); },
    // ============ 角色权限 ============
    getRoles: function () { return ipcRenderer.invoke('roles:getAll'); },
    updateRole: function (roleId, permissions) { return ipcRenderer.invoke('roles:update', roleId, permissions); },
    resetRole: function (roleId) { return ipcRenderer.invoke('roles:reset', roleId); },
    // ============ SQLite 状态管理 ============
    getSqliteStatus: function () { return ipcRenderer.invoke('sqlite:status'); },
    enableSqlite: function () { return ipcRenderer.invoke('sqlite:enable'); },
    migrateToSqlite: function (force) { return ipcRenderer.invoke('sqlite:migrate', force); },
    getSqliteReadMode: function () { return ipcRenderer.invoke('sqlite:getReadMode'); },
    setSqliteReadMode: function (mode) { return ipcRenderer.invoke('sqlite:setReadMode', mode); },
});
