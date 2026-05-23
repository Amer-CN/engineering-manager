/**
 * 发票 IPC 处理器
 * 双写：SQLite（invoices、payment_records 两张表）
 */

import { ipcMain } from 'electron'
import log from 'electron-log'
import { db, dbReady, saveDatabase, recalculateInvoiceStatus } from '../database'
import { useSqliteRead, shouldFallbackToJson, invoiceQueries } from '../sqlite/queries'

// ═══════════════════════════════════════════════════════════════════════════════
// 发票 CRUD
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:invoices:getAll', (_, type?: string) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  // SQLite 优先
  if (useSqliteRead()) {
    const data = invoiceQueries.listInvoices(type)
    if (data !== null) {
      // SQLite 版发票状态由 payment_records 的 invoice_details 决定，
      // 但 getAll 的副作用（自动修正状态+saveDatabase）在 SQLite 模式下由读路径处理
      return { success: true, data }
    }
  }
  if (!shouldFallbackToJson()) return { success: false, error: 'SQLite read failed (sqlite-primary mode)' }
  // JSON 回退
  let invoices = db.invoices
  if (type) {
    invoices = invoices.filter((i: any) => i.type === type)
  }
  let statusChanged = false
  // 计算每个发票的已收款金额，同时修正滞后状态
  const result = invoices.map((i: any) => {
    const seller = db.partners.find((p: any) => p.id === i.sellerId)
    const buyer = db.partners.find((p: any) => p.id === i.buyerId)
    const project = db.projects.find((p: any) => p.id === i.projectId)
    const relatedPayments = db.paymentRecords.filter((r: any) =>
      r.invoiceDetails && r.invoiceDetails.some((d: any) => d.invoiceId === i.id)
    )
    const receivedAmount = relatedPayments.reduce((sum: number, r: any) => {
      const detail = r.invoiceDetails.find((d: any) => d.invoiceId === i.id)
      return sum + (detail?.paymentAmount || 0)
    }, 0)
    let contractName = ''
    if (i.contractId) {
      const incomeContract = db.incomeContracts.find((c: any) => c.id === i.contractId)
      const expenseContract = db.expenseContracts.find((c: any) => c.id === i.contractId)
      const agreementContract = db.agreementContracts.find((c: any) => c.id === i.contractId)
      contractName = incomeContract?.name || expenseContract?.name || agreementContract?.name || ''
    }
    // 根据实际收款金额同步状态
    let syncedStatus = i.status
    if (receivedAmount >= (i.amount || 0)) {
      syncedStatus = 'received'
    } else if (receivedAmount > 0) {
      syncedStatus = 'partially_paid'
    } else {
      syncedStatus = 'issued'
    }
    if (syncedStatus !== i.status) {
      i.status = syncedStatus
      i.receivedAmount = receivedAmount
      statusChanged = true
    }
    return {
      ...i,
      receivedAmount,
      status: syncedStatus,
      sellerName: seller?.name || '',
      buyerName: buyer?.name || '',
      projectName: project?.name || '',
      contractName
    }
  })
  if (statusChanged) saveDatabase()

  return { success: true, data: result.sort((a: any, b: any) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )}
})

ipcMain.handle('db:invoices:create', (_, invoice) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    const id = Date.now()
    const newInvoice = {
      ...invoice,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    db.invoices.push(newInvoice)
    saveDatabase()
    // SQLite 双写
    invoiceQueries.createInvoice(newInvoice)
    return { success: true, data: { id } }
  } catch (error: any) {
    log.error('Failed to create invoice:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:invoices:update', (_, invoice) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    const index = db.invoices.findIndex((i: any) => i.id === invoice.id)
    if (index !== -1) {
      db.invoices[index] = { ...db.invoices[index], ...invoice, updatedAt: new Date().toISOString() }
      saveDatabase()
      // SQLite 双写
      invoiceQueries.updateInvoice(db.invoices[index])
    }
    return { success: true }
  } catch (error: any) {
    log.error('Failed to update invoice:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:invoices:delete', (_, id) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    db.invoices = db.invoices.filter((i: any) => i.id !== id)
    saveDatabase()
    // SQLite 双写
    invoiceQueries.deleteInvoice(id)
    return { success: true }
  } catch (error: any) {
    log.error('Failed to delete invoice:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:invoices:updateStatus', (_, id, status) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    const index = db.invoices.findIndex((i: any) => i.id === id)
    if (index !== -1) {
      db.invoices[index].status = status
      db.invoices[index].updatedAt = new Date().toISOString()
      saveDatabase()
      // SQLite 双写
      invoiceQueries.updateInvoiceStatus(id, status)
    }
    return { success: true }
  } catch (error: any) {
    log.error('Failed to update invoice status:', error)
    return { success: false, error: error.message }
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// 收款记录
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:paymentRecords:getAll', (_, type?: string) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  // SQLite 优先
  if (useSqliteRead()) {
    const data = invoiceQueries.listPaymentRecords(type)
    if (data !== null) return { success: true, data }
  }
  if (!shouldFallbackToJson()) return { success: false, error: 'SQLite read failed (sqlite-primary mode)' }
  // JSON 回退
  let records = db.paymentRecords
  if (type) {
    records = records.filter((r: any) => r.type === type)
  }
  const result = records.map((r: any) => {
    const project = r.projectId ? db.projects.find((p: any) => p.id === r.projectId) : null
    const partner = r.partnerId ? db.partners.find((p: any) => p.id === r.partnerId) : null
    let contractName = ''
    if (r.contractId) {
      const incomeContract = db.incomeContracts.find((c: any) => c.id === r.contractId)
      const expenseContract = db.expenseContracts.find((c: any) => c.id === r.contractId)
      const agreementContract = db.agreementContracts.find((c: any) => c.id === r.contractId)
      contractName = incomeContract?.name || expenseContract?.name || agreementContract?.name || ''
    }
    // 获取关联发票信息
    const invoiceInfos = (r.invoiceDetails || []).map((d: any) => {
      const invoice = db.invoices.find((i: any) => i.id === d.invoiceId)
      return {
        invoiceId: d.invoiceId,
        invoiceNo: invoice?.invoiceNo || '',
        invoiceName: invoice?.name || '',
        invoiceAmount: invoice?.amount || 0,
        paymentAmount: d.paymentAmount
      }
    })
    return {
      ...r,
      projectName: project?.name || '',
      partnerName: partner?.name || '',
      contractName: contractName,
      invoiceInfos: invoiceInfos
    }
  })
  return { success: true, data: result.sort((a: any, b: any) =>
    new Date(b.recordDate || b.createdAt).getTime() - new Date(a.recordDate || a.createdAt).getTime()
  )}
})

ipcMain.handle('db:paymentRecords:create', (_, record) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    const id = Date.now()

    // 计算每张发票应分摊的金额
    const totalPaymentAmount = record.amount || 0
    let invoiceDetails = record.invoiceDetails || []

    if (invoiceDetails.length > 0 && totalPaymentAmount > 0) {
      // 计算所有勾选发票的待收总额
      let totalRemaining = 0
      const invoiceRemainingMap: Record<number, number> = {}
      
      for (const detail of invoiceDetails) {
        const invoice = db.invoices.find((inv: any) => inv.id === detail.invoiceId)
        if (invoice) {
          const remaining = invoice.amount - (invoice.receivedAmount || 0)
          invoiceRemainingMap[detail.invoiceId] = remaining
          totalRemaining += remaining
        }
      }

      // 如果待收总额等于或小于用户输入的金额，按待收比例分配
      if (totalRemaining <= totalPaymentAmount) {
        // 每张发票分配其待收金额
        for (const detail of invoiceDetails) {
          detail.paymentAmount = invoiceRemainingMap[detail.invoiceId] || 0
        }
      } else {
        // 待收总额大于用户输入金额，按比例分配
        for (const detail of invoiceDetails) {
          const remaining = invoiceRemainingMap[detail.invoiceId] || 0
          // 比例分配，保留2位小数
          detail.paymentAmount = Math.round((remaining / totalRemaining) * totalPaymentAmount * 100) / 100
        }
      }
    }

    const newRecord = {
      ...record,
      invoiceDetails,
      id,
      createdAt: new Date().toISOString()
    }
    db.paymentRecords.push(newRecord)

    // 自动更新关联发票的状态
    for (const detail of invoiceDetails) {
      const invoiceIndex = db.invoices.findIndex((inv: any) => inv.id === detail.invoiceId)
      if (invoiceIndex !== -1) {
        const invoice = db.invoices[invoiceIndex]
        const currentReceived = invoice.receivedAmount || 0
        const newReceived = currentReceived + (detail.paymentAmount || 0)

        db.invoices[invoiceIndex].receivedAmount = newReceived

        if (newReceived >= invoice.amount) {
          db.invoices[invoiceIndex].status = 'received'
        } else if (newReceived > 0) {
          db.invoices[invoiceIndex].status = 'partially_paid'
        }
      }
    }

    saveDatabase()

    // SQLite 双写：收款记录
    invoiceQueries.createPaymentRecord(newRecord)
    // SQLite 双写：更新关联发票的 receivedAmount 和 status
    for (const detail of invoiceDetails) {
      const inv = db.invoices.find((i: any) => i.id === detail.invoiceId)
      if (inv) {
        invoiceQueries.updateInvoiceReceived(inv.id, inv.receivedAmount, inv.status)
      }
    }

    return { success: true, data: { id } }
  } catch (error: any) {
    log.error('Failed to create payment record:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:paymentRecords:update', (_, record) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    const index = db.paymentRecords.findIndex((r: any) => r.id === record.id)
    if (index !== -1) {
      const oldRecord = db.paymentRecords[index]
      db.paymentRecords[index] = { ...db.paymentRecords[index], ...record }

      // 重新计算所有关联发票的状态
      recalculateInvoiceStatus()
      saveDatabase()

      // SQLite 双写
      invoiceQueries.updatePaymentRecord(db.paymentRecords[index])
      // 重算 SQLite 发票状态
      invoiceQueries.recalculateInvoiceStatusSqlite()
    }
    return { success: true }
  } catch (error: any) {
    log.error('Failed to update payment record:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:paymentRecords:delete', (_, id) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    db.paymentRecords = db.paymentRecords.filter((r: any) => r.id !== id)
    // 删除后重新计算所有关联发票的状态
    recalculateInvoiceStatus()
    saveDatabase()
    // SQLite 双写
    invoiceQueries.deletePaymentRecord(id)
    invoiceQueries.recalculateInvoiceStatusSqlite()
    return { success: true }
  } catch (error: any) {
    log.error('Failed to delete payment record:', error)
    return { success: false, error: error.message }
  }
})
