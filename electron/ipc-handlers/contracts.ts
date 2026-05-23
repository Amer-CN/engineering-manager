/**
 * 合同 IPC 处理器
 * 双写：SQLite（income_contracts/records、expense_contracts/records、agreement_contracts 五张表）
 */

import { ipcMain } from 'electron'
import fs from 'fs'
import path from 'path'
import log from 'electron-log'
import { db, dbReady, saveDatabase, getUploadsPath } from '../database'
import { saveFile, readFile } from '../file-service'
import { useSqliteRead, shouldFallbackToJson, contractQueries } from '../sqlite/queries'

// ═══════════════════════════════════════════════════════════════════════════════
// 合同 CRUD 工厂 — 消除收入/支出合同 7 组重复 handler
// ═══════════════════════════════════════════════════════════════════════════════

function registerContractHandlers(type: 'income' | 'expense' | 'agreement') {
  const isAgreement = type === 'agreement'
  const cKey = isAgreement ? 'agreementContracts' : type === 'income' ? 'incomeContracts' : 'expenseContracts'
  const rKey = isAgreement ? '' : type === 'income' ? 'incomeRecords' : 'expenseRecords'
  const amountLabel = type === 'income' ? 'receivedAmount' : 'paidAmount'

  // getAll
  ipcMain.handle(`db:${cKey}:getAll`, (_, projectId?: number) => {
    if (!dbReady) return { success: false, error: 'Database not ready' }
    // SQLite 优先
    if (useSqliteRead()) {
      const data = contractQueries.listContracts(type, projectId)
      if (data !== null) return { success: true, data }
    }
    if (!shouldFallbackToJson()) return { success: false, error: 'SQLite read failed (sqlite-primary mode)' }
    // JSON 回退
    let contracts = (db as any)[cKey] as any[]
    if (projectId) contracts = contracts.filter((c: any) => c.projectId === projectId)
    const result = contracts.map((c: any) => {
      const project = db.projects.find((p: any) => p.id === c.projectId)
      const partner = db.partners.find((p: any) => p.id === c.partnerId)
      const enriched: any = { ...c, projectName: project?.name || '', partnerName: partner?.name || '' }
      if (!isAgreement) {
        const records = (db as any)[rKey].filter((r: any) => r.contractId === c.id)
        enriched[amountLabel] = records.reduce((sum: number, r: any) => sum + (r.amount || 0), 0)
      }
      return enriched
    })
    return { success: true, data: result.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) }
  })

  // create
  ipcMain.handle(`db:${cKey}:create`, (_, contract) => {
    if (!dbReady) return { success: false, error: 'Database not ready' }
    try {
      const id = Date.now()
      const newContract = { ...contract, id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      (db as any)[cKey].push(newContract)
      saveDatabase()
      // SQLite 双写
      contractQueries.createContract(type, newContract)
      return { success: true, data: { id } }
    } catch (error: any) { log.error(`Failed to create ${type} contract:`, error); return { success: false, error: error.message } }
  })

  // update
  ipcMain.handle(`db:${cKey}:update`, (_, contract) => {
    if (!dbReady) return { success: false, error: 'Database not ready' }
    try {
      const idx = (db as any)[cKey].findIndex((c: any) => c.id === contract.id)
      if (idx !== -1) {
        (db as any)[cKey][idx] = { ...(db as any)[cKey][idx], ...contract, updatedAt: new Date().toISOString() }
        saveDatabase()
        // SQLite 双写
        contractQueries.updateContract(type, (db as any)[cKey][idx])
      }
      return { success: true }
    } catch (error: any) { log.error(`Failed to update ${type} contract:`, error); return { success: false, error: error.message } }
  })

  // delete
  ipcMain.handle(`db:${cKey}:delete`, (_, id) => {
    if (!dbReady) return { success: false, error: 'Database not ready' }
    try {
      (db as any)[cKey] = (db as any)[cKey].filter((c: any) => c.id !== id)
      if (!isAgreement) {
        ;(db as any)[rKey] = (db as any)[rKey].filter((r: any) => r.contractId !== id)
      }
      saveDatabase()
      // SQLite 双写（含级联删除记录）
      contractQueries.deleteContract(type, id)
      return { success: true }
    } catch (error: any) { log.error(`Failed to delete ${type} contract:`, error); return { success: false, error: error.message } }
  })

  // Records handlers (income/expense only)
  if (!isAgreement) {
    ipcMain.handle(`db:${rKey}:getAll`, (_, contractId: number) => {
      if (!dbReady) return { success: false, error: 'Database not ready' }
      // SQLite 优先
      if (useSqliteRead()) {
        const data = contractQueries.listRecords(type as 'income' | 'expense', contractId)
        if (data !== null) return { success: true, data }
      }
      if (!shouldFallbackToJson()) return { success: false, error: 'SQLite read failed (sqlite-primary mode)' }
      // JSON 回退
      return { success: true, data: (db as any)[rKey].filter((r: any) => r.contractId === contractId) }
    })

    ipcMain.handle(`db:${rKey}:create`, (_, record) => {
      if (!dbReady) return { success: false, error: 'Database not ready' }
      try {
        const id = Date.now()
        const newRecord = { ...record, id, createdAt: new Date().toISOString() };
        (db as any)[rKey].push(newRecord)
        saveDatabase()
        // SQLite 双写
        contractQueries.createRecord(type as 'income' | 'expense', newRecord)
        return { success: true, data: { id } }
      } catch (error: any) { log.error(`Failed to create ${type} record:`, error); return { success: false, error: error.message } }
    })

    ipcMain.handle(`db:${rKey}:delete`, (_, id) => {
      if (!dbReady) return { success: false, error: 'Database not ready' }
      try {
        (db as any)[rKey] = (db as any)[rKey].filter((r: any) => r.id !== id)
        saveDatabase()
        // SQLite 双写
        contractQueries.deleteRecord(type as 'income' | 'expense', id)
        return { success: true }
      } catch (error: any) { log.error(`Failed to delete ${type} record:`, error); return { success: false, error: error.message } }
    })
  }
}

registerContractHandlers('income')
registerContractHandlers('expense')
registerContractHandlers('agreement')

// ═══════════════════════════════════════════════════════════════════════════════
// 合同附件文件存储（文件系统操作，无需 SQLite 双写）
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:contracts:saveFile', async (_, options: { fileData: string; fileName: string; subCategory?: string; projectName?: string | null }) => {
  const sub = options.subCategory || 'income'
  const subCategory = sub === 'expense' ? 'expense' : sub === 'agreement' ? 'agreement' : 'income'
  return saveFile('contracts', subCategory, { fileData: options.fileData, fileName: options.fileName }, options.projectName)
})

const MIME_MAP: Record<string, string> = {
  '.pdf': 'application/pdf', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png', '.webp': 'image/webp',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}

ipcMain.handle('db:contracts:readFile', async (_, fileName: string, subCategory?: string, projectName?: string | null) => {
  if (!fileName) return { success: false, error: '文件名为空' }
  const subCats = subCategory ? [subCategory] : ['income', 'expense', 'agreement']
  for (const sub of subCats) {
    const result = readFile('contracts', sub, fileName, projectName)
    if (result.success) return result
  }
  // 旧路径兜底
  const legacyPath = path.join(getUploadsPath(), 'contracts', fileName)
  if (fs.existsSync(legacyPath)) {
    try {
      const buffer = fs.readFileSync(legacyPath)
      const ext = path.extname(fileName).toLowerCase()
      const mimeType = MIME_MAP[ext] || 'application/octet-stream'
      return { success: true, data: { dataUrl: `data:${mimeType};base64,${buffer.toString('base64')}`, mimeType } }
    } catch { /* ignore */ }
  }
  return { success: false, error: '文件不存在' }
})

// ═══════════════════════════════════════════════════════════════════════════════
// 合同统计
// ═══════════════════════════════════════════════════════════════════════════════

function pushExpiring(contracts: any[], type: string, now: Date, thirtyDaysLater: Date, out: any[]) {
  contracts.forEach((c: any) => {
    if (!c.endDate) return
    const endDate = new Date(c.endDate)
    if (endDate >= now && endDate <= thirtyDaysLater) {
      out.push({
        id: c.id, type, name: c.name, contractNo: c.contractNo,
        amount: (c.finalAmount ?? c.amount ?? 0), endDate: c.endDate,
        daysLeft: Math.ceil((endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
      })
    }
  })
}

ipcMain.handle('db:contractStats:get', () => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  // SQLite 优先
  if (useSqliteRead()) {
    const data = contractQueries.getContractStats()
    if (data !== null) return { success: true, data }
  }
  if (!shouldFallbackToJson()) return { success: false, error: 'SQLite read failed (sqlite-primary mode)' }
  // JSON 回退
  try {
    if (!db.paymentRecords) db.paymentRecords = []
    const incomeTotal = db.incomeContracts.reduce((sum: number, c: any) => sum + (c.finalAmount ?? c.amount ?? 0), 0)
    const expenseTotal = db.expenseContracts.reduce((sum: number, c: any) => sum + (c.finalAmount ?? c.amount ?? 0), 0)
    const incomeReceived = db.paymentRecords.filter((r: any) => r.type === 'invoice_out').reduce((sum: number, r: any) => sum + (r.amount || 0), 0)
    const expensePaid = db.paymentRecords.filter((r: any) => r.type === 'invoice_in').reduce((sum: number, r: any) => sum + (r.amount || 0), 0)

    const now = new Date()
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const expiringContracts: any[] = []
    pushExpiring(db.incomeContracts, 'income', now, thirtyDaysLater, expiringContracts)
    pushExpiring(db.expenseContracts, 'expense', now, thirtyDaysLater, expiringContracts)
    pushExpiring(db.agreementContracts, 'agreement', now, thirtyDaysLater, expiringContracts)
    expiringContracts.sort((a: any, b: any) => a.daysLeft - b.daysLeft)

    return { success: true, data: {
      incomeCount: db.incomeContracts.length, incomeTotal, incomeReceived,
      expenseCount: db.expenseContracts.length, expenseTotal, expensePaid,
      agreementCount: db.agreementContracts.length,
      netIncome: incomeTotal - expenseTotal, netReceived: incomeReceived - expensePaid,
      expiringSoon: expiringContracts,
    }}
  } catch (error: any) { log.error('Failed to get contract stats:', error); return { success: false, error: error.message } }
})
