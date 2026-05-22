// @ts-nocheck
/**
 * Vitest 全局 setup 文件
 * - 扩展 expect 匹配器（@testing-library/jest-dom）
 * - 模拟 Electron API（渲染进程测试依赖）
 */
import '@testing-library/jest-dom/vitest'

// 模拟 window.electronAPI（渲染进程测试需要）
const mockElectronAPI = {
  // 数据库 CRUD
  db: {
    projects: { getAll: vi.fn(), getById: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    members: { getAll: vi.fn(), getById: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    contracts: { getAll: vi.fn(), getById: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    invoices: { getAll: vi.fn(), getById: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    wages: { getAll: vi.fn(), getById: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    settlements: { getAll: vi.fn(), getById: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    inventory: { getAll: vi.fn(), getById: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    costLedger: { getAll: vi.fn(), getById: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    partners: { getAll: vi.fn(), getById: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    roles: { getAll: vi.fn(), getById: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    users: { getAll: vi.fn(), getById: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    attendance: { getAll: vi.fn(), getById: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  },
  // 认证
  login: vi.fn(),
  setSession: vi.fn().mockResolvedValue({ success: true }),
  clearSession: vi.fn().mockResolvedValue({ success: true }),
  // 文件操作
  saveContractFile: vi.fn(),
  deleteContractFile: vi.fn(),
  resolvePreviewFileUrl: vi.fn(),
  // OCR
  ocrIdCard: vi.fn(),
  getOcrConfig: vi.fn(),
  // 审计
  audit: {
    log: vi.fn(),
    getLogs: vi.fn(),
  },
  // 导入导出
  exportData: vi.fn(),
  importData: vi.fn(),
  // 配置
  getConfig: vi.fn(),
  setConfig: vi.fn(),
  // 数据路径
  setDataPath: vi.fn(),
  getDataPath: vi.fn(),
  // 窗口控制
  minimizeWindow: vi.fn(),
  maximizeWindow: vi.fn(),
  closeWindow: vi.fn(),
  // 工资统计
  getWageStats: vi.fn(),
  getWageOverdueStats: vi.fn(),
  listSnapshots: vi.fn(),
  restoreSnapshot: vi.fn(),
  deleteSnapshot: vi.fn(),
} as unknown as import('./types/electron').ElectronAPI

// 仅添加 electronAPI 属性，不覆盖整个 window 对象
// 覆盖 window 会破坏 jsdom 原型链，导致 React 的 instanceof Element 检查失败
;(globalThis.window as Record<string, unknown>).electronAPI = mockElectronAPI

// localStorage 模拟（jsdom 自带，但确保清空状态）
beforeEach(() => {
  localStorage.clear()
})
