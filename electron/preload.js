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
    // 农民工班组
    getWorkerTeams: function () { return ipcRenderer.invoke('db:workerTeams:getAll'); },
    createWorkerTeam: function (team) { return ipcRenderer.invoke('db:workerTeams:create', team); },
    updateWorkerTeam: function (team) { return ipcRenderer.invoke('db:workerTeams:update', team); },
    deleteWorkerTeam: function (id) { return ipcRenderer.invoke('db:workerTeams:delete', id); },
    // 工人调动记录
    getWorkerTransferRecords: function (workerId) { return ipcRenderer.invoke('db:workerTransferRecords:getAll', workerId); },
    createWorkerTransfer: function (record) { return ipcRenderer.invoke('db:workerTransferRecords:create', record); },
    // 任务
    getTasks: function (projectId) { return ipcRenderer.invoke('db:tasks:getAll', projectId); },
    createTask: function (task) { return ipcRenderer.invoke('db:tasks:create', task); },
    updateTask: function (task) { return ipcRenderer.invoke('db:tasks:update', task); },
    deleteTask: function (id) { return ipcRenderer.invoke('db:tasks:delete', id); },
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
    // 图纸
    getDrawings: function (projectId) { return ipcRenderer.invoke('db:drawings:getAll', projectId); },
    uploadDrawing: function (options) { return ipcRenderer.invoke('db:drawings:upload', options); },
    updateDrawing: function (drawing) { return ipcRenderer.invoke('db:drawings:update', drawing); },
    deleteDrawing: function (id) { return ipcRenderer.invoke('db:drawings:delete', id); },
    // 合作单位
    getPartners: function () { return ipcRenderer.invoke('db:partners:getAll'); },
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
    // 合同统计
    getContractStats: function () { return ipcRenderer.invoke('db:contractStats:get'); },
    // 统计
    getDashboardStats: function () { return ipcRenderer.invoke('db:stats:getDashboard'); },
    getUploadsPath: function () { return ipcRenderer.invoke('app:getUploadsPath'); },
    // 合同附件文件存储
    saveContractFile: function (options) { return ipcRenderer.invoke('db:contracts:saveFile', options); },
    readContractFile: function (fileName) { return ipcRenderer.invoke('db:contracts:readFile', fileName); },
    // ============ 结算办理 ============
    getSettlements: function (projectId) { return ipcRenderer.invoke('db:settlements:getAll', projectId); },
    createSettlement: function (settlement) { return ipcRenderer.invoke('db:settlements:create', settlement); },
    updateSettlement: function (settlement) { return ipcRenderer.invoke('db:settlements:update', settlement); },
    deleteSettlement: function (id) { return ipcRenderer.invoke('db:settlements:delete', id); },
    approveSettlement: function (id) { return ipcRenderer.invoke('db:settlements:approve', id); },
    paySettlement: function (id) { return ipcRenderer.invoke('db:settlements:pay', id); },
    // ============ 合同模板 ============
    getContractTemplates: function () { return ipcRenderer.invoke('db:contractTemplates:getAll'); },
    createContractTemplate: function (template) { return ipcRenderer.invoke('db:contractTemplates:create', template); },
    updateContractTemplate: function (template) { return ipcRenderer.invoke('db:contractTemplates:update', template); },
    deleteContractTemplate: function (id) { return ipcRenderer.invoke('db:contractTemplates:delete', id); },
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
    deletePaymentRecord: function (id) { return ipcRenderer.invoke('db:paymentRecords:delete', id); }
});
