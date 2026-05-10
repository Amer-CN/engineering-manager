/**
 * 结算 IPC 处理器
 */

import { ipcMain } from 'electron'
import log from 'electron-log'
import { db, dbReady, saveDatabase } from '../database'

// ═══════════════════════════════════════════════════════════════════════════════
// 结算办理
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:settlements:getAll', (_, projectId?: number) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.settlements) db.settlements = []
  let settlements = db.settlements
  if (projectId) {
    settlements = settlements.filter((s: any) => s.projectId === projectId)
  }
  const result = settlements.map((s: any) => {
    const project = db.projects.find((p: any) => p.id === s.projectId)
    const partner = db.partners.find((p: any) => p.id === s.partnerId)
    // 旧状态迁移：draft/approved/paid → 新状态
    let status = s.status
    if (status === 'draft' || status === 'approved' || status === 'paid' || !status) status = 'pending'
    return {
      ...s,
      status,
      projectName: project?.name || '',
      partnerName: partner?.name || ''
    }
  })
  return { success: true, data: result.sort((a: any, b: any) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )}
})

ipcMain.handle('db:settlements:create', (_, settlement) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.settlements) db.settlements = []
  try {
    const id = Date.now()
    const newSettlement = {
      ...settlement,
      id,
      status: settlement.status || 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    db.settlements.push(newSettlement)
    saveDatabase()
    return { success: true, data: { id } }
  } catch (error: any) {
    log.error('Failed to create settlement:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:settlements:update', (_, settlement) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.settlements) db.settlements = []
  try {
    const index = db.settlements.findIndex((s: any) => s.id === settlement.id)
    if (index !== -1) {
      db.settlements[index] = { ...db.settlements[index], ...settlement, updatedAt: new Date().toISOString() }
      saveDatabase()
    }
    return { success: true }
  } catch (error: any) {
    log.error('Failed to update settlement:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:settlements:delete', (_, id) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.settlements) db.settlements = []
  try {
    db.settlements = db.settlements.filter((s: any) => s.id !== id)
    saveDatabase()
    return { success: true }
  } catch (error: any) {
    log.error('Failed to delete settlement:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:settlements:process', (_, id) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.settlements) db.settlements = []
  if (!db.invoices) db.invoices = []
  if (!db.paymentRecords) db.paymentRecords = []
  try {
    const index = db.settlements.findIndex((s: any) => s.id === id)
    if (index === -1) return { success: false, error: '结算单不存在' }

    const settlement = db.settlements[index]
    const settlementAmount = settlement.amount || 0
    const partnerId = settlement.partnerId

    // 根据结算类型确定发票方向
    // 收入结算 → 我们开票给对方(invoice_out) → 对方回款(payment type=invoice_out)
    // 支出结算 → 对方开票给我们(invoice_in) → 我们付款(payment type=invoice_in)
    const invoiceType = settlement.type === 'income' ? 'invoice_out' : 'invoice_in'

    // 收入结算 → 开票给对方(buyerId=partnerId) → 对方回款
    // 支出结算 → 对方开票给我们(sellerId=partnerId) → 我们付款
    const linkedInvoices = db.invoices.filter((inv: any) => {
      if (inv.type !== invoiceType) return false
      if (settlement.type === 'income') return inv.buyerId === partnerId
      return inv.sellerId === partnerId
    })
    const invoiceTotal = linkedInvoices.reduce((sum: number, inv: any) => sum + (inv.amount || 0), 0)

    // 按关联发票的付款记录汇总（paymentRecords 通过 invoiceDetails 关联发票）
    const linkedInvoiceIds = new Set(linkedInvoices.map((inv: any) => inv.id))
    let paidTotal = 0
    for (const r of db.paymentRecords) {
      if (r.invoiceDetails && Array.isArray(r.invoiceDetails)) {
        for (const d of r.invoiceDetails) {
          if (linkedInvoiceIds.has(d.invoiceId)) {
            paidTotal += d.paymentAmount || 0
          }
        }
      }
    }

    const fmt = (n: number) => n >= 10000 ? (n / 10000).toFixed(1) + '万' : n.toLocaleString()
    const warnings: string[] = []

    if (!partnerId) {
      warnings.push('未关联结算单位')
    } else {
      const diffPaid = settlementAmount - paidTotal
      const diffInvoice = settlementAmount - invoiceTotal
      if (Math.abs(diffPaid) > 0.01) {
        if (diffPaid > 0) {
          warnings.push(`付款不足，差¥${fmt(diffPaid)}`)
        } else {
          warnings.push(`付款超出¥${fmt(-diffPaid)}`)
        }
      }
      if (Math.abs(diffInvoice) > 0.01) {
        if (diffInvoice > 0) {
          warnings.push(`发票不足，缺¥${fmt(diffInvoice)}`)
        } else {
          warnings.push(`发票超出¥${fmt(-diffInvoice)}`)
        }
      }
    }

    if (warnings.length > 0) {
      db.settlements[index].status = 'completed'
      db.settlements[index].warnings = warnings
      db.settlements[index].completedAt = new Date().toISOString()
    } else {
      db.settlements[index].status = 'archived'
      db.settlements[index].warnings = undefined
      db.settlements[index].archivedAt = new Date().toISOString()
    }
    saveDatabase()
    return { success: true, warnings: warnings.length > 0 ? warnings : undefined }
  } catch (error: any) {
    log.error('Failed to process settlement:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:settlements:unarchive', (_, id) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.settlements) db.settlements = []
  try {
    const index = db.settlements.findIndex((s: any) => s.id === id)
    if (index !== -1) {
      db.settlements[index].status = 'completed'
      db.settlements[index].warnings = undefined
      saveDatabase()
    }
    return { success: true }
  } catch (error: any) {
    log.error('Failed to unarchive settlement:', error)
    return { success: false, error: error.message }
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// 合同模板
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:contractTemplates:getAll', () => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.contractTemplates) db.contractTemplates = []
  return { success: true, data: db.contractTemplates.sort((a: any, b: any) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )}
})

ipcMain.handle('db:contractTemplates:create', (_, template) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.contractTemplates) db.contractTemplates = []
  try {
    const id = Date.now()
    const newTemplate = {
      ...template,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    db.contractTemplates.push(newTemplate)
    saveDatabase()
    return { success: true, data: { id } }
  } catch (error: any) {
    log.error('Failed to create template:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:contractTemplates:update', (_, template) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.contractTemplates) db.contractTemplates = []
  try {
    const index = db.contractTemplates.findIndex((t: any) => t.id === template.id)
    if (index !== -1) {
      db.contractTemplates[index] = { ...db.contractTemplates[index], ...template, updatedAt: new Date().toISOString() }
      saveDatabase()
    }
    return { success: true }
  } catch (error: any) {
    log.error('Failed to update template:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:contractTemplates:delete', (_, id) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.contractTemplates) db.contractTemplates = []
  try {
    db.contractTemplates = db.contractTemplates.filter((t: any) => t.id !== id)
    saveDatabase()
    return { success: true }
  } catch (error: any) {
    log.error('Failed to delete template:', error)
    return { success: false, error: error.message }
  }
})
