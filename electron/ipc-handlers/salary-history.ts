/**
 * 薪资历史 IPC 处理器
 * 支持按生效日期追踪薪资变动，薪酬计算按月份查找对应薪资
 */
import { ipcMain } from 'electron'
import log from 'electron-log'
import { db, dbReady, saveDatabase } from '../database'

// 按成员获取薪资历史（按生效日期降序）
ipcMain.handle('db:salaryHistory:list', (_, memberId: number) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.salaryHistory) db.salaryHistory = []
  const records = db.salaryHistory
    .filter((s: any) => s.memberId === memberId)
    .sort((a: any, b: any) => b.effectiveDate.localeCompare(a.effectiveDate))
  return { success: true, data: records }
})

// 创建薪资历史记录
ipcMain.handle('db:salaryHistory:create', (_, record: any) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.salaryHistory) db.salaryHistory = []
  try {
    const exists = db.salaryHistory.some(
      (s: any) => s.memberId === record.memberId && s.effectiveDate === record.effectiveDate
    )
    if (exists) return { success: false, error: '该日期的薪资记录已存在' }
    const entry = { ...record, id: Date.now(), createdAt: new Date().toISOString() }
    db.salaryHistory.push(entry)
    saveDatabase()
    return { success: true, data: entry }
  } catch (error: any) {
    log.error('Failed to create salary history:', error)
    return { success: false, error: error.message }
  }
})

// 删除薪资历史记录
ipcMain.handle('db:salaryHistory:delete', (_, id: number) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.salaryHistory) db.salaryHistory = []
  try {
    db.salaryHistory = db.salaryHistory.filter((s: any) => s.id !== id)
    saveDatabase()
    return { success: true }
  } catch (error: any) {
    log.error('Failed to delete salary history:', error)
    return { success: false, error: error.message }
  }
})

// 获取某成员在某年月的有效薪资（最晚的、不晚于该月最后一天的记录）
ipcMain.handle('db:salaryHistory:getEffective', (_, memberId: number, yearMonth: string) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.salaryHistory) db.salaryHistory = []
  const [y, m] = yearMonth.split('-').map(Number)
  const monthEnd = `${yearMonth}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`
  const records = db.salaryHistory
    .filter((s: any) => s.memberId === memberId && s.effectiveDate <= monthEnd)
    .sort((a: any, b: any) => b.effectiveDate.localeCompare(a.effectiveDate))
  if (records.length > 0) return { success: true, data: records[0] }
  // 无历史记录时回退到 member.baseSalary
  const member = db.members.find((m: any) => m.id === memberId)
  return { success: true, data: { baseSalary: member?.baseSalary || 0, subsidy: member?.subsidy || 0, effectiveDate: '' } }
})
