/**
 * 测试数据库辅助工具
 * 
 * 提供测试所需的数据库 setup/cleanup 功能
 */

import { db, saveDatabase } from '../../electron/database'

/**
 * 设置测试数据库
 * 初始化空的测试数据
 */
export function setupTestDB(): void {
  // 初始化所有数据集合
  db.projects = []
  db.members = []
  db.workers = []
  db.projectWorkers = []
  db.incomeContracts = []
  db.expenseContracts = []
  db.agreementContracts = []
  db.invoices = []
  db.costLedger = []
  db.attendances = []
  db.wages = []
  db.settlements = []
  db.departments = []
  db.roles = []
  db.auditLogs = []
  
  // 标记数据库就绪
  // 注意：实际测试中可能需要 mock dbReady
}

/**
 * 清理测试数据库
 * 清空所有测试数据
 */
export function cleanupTestDB(): void {
  // 清空所有数据集合
  db.projects = []
  db.members = []
  db.workers = []
  db.projectWorkers = []
  db.incomeContracts = []
  db.expenseContracts = []
  db.agreementContracts = []
  db.invoices = []
  db.costLedger = []
  db.attendances = []
  db.wages = []
  db.settlements = []
  db.departments = []
  db.roles = []
  db.auditLogs = []
}

/**
 * 获取测试数据库引用
 * 用于直接操作测试数据
 */
export function getTestDB(): typeof db {
  return db
}

/**
 * 创建测试项目
 */
export function createTestProject(id: number, name: string): void {
  if (!db.projects) db.projects = []
  db.projects.push({
    id,
    name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })
  saveDatabase()
}

/**
 * 创建测试工人
 */
export function createTestWorker(id: string, name: string, dailyWage: number): void {
  if (!db.workers) db.workers = []
  db.workers.push({
    id,
    name,
    dailyWage,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })
  saveDatabase()
}

/**
 * 创建测试项目工人关联
 */
export function createTestProjectWorker(workerId: string, projectId: number, dailyWage: number): void {
  if (!db.projectWorkers) db.projectWorkers = []
  db.projectWorkers.push({
    id: `pw-${Date.now()}`,
    workerId,
    projectId,
    dailyWage,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })
  saveDatabase()
}

/**
 * Mock IPC Handler 获取工具
 * 从 ipcMain 获取已注册的 handler
 */
export function getTestHandler(channel: string): Function {
  // 这是一个简化实现
  // 实际测试中可能需要使用 electron 的 ipcMain 实例
  return (...args: any[]) => {
    console.warn(`Mock handler for ${channel} called with`, args)
    return { success: false, error: 'Not implemented' }
  }
}
