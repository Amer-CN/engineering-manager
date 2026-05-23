/**
 * 发票 IPC 处理器
 * 双写：SQLite（invoices、payment_records 两张表）
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
import { ipcMain } from 'electron';
import log from 'electron-log';
import { db, dbReady, saveDatabase, recalculateInvoiceStatus } from '../database';
import { useSqliteRead, shouldFallbackToJson, invoiceQueries } from '../sqlite/queries';
// ═══════════════════════════════════════════════════════════════════════════════
// 发票 CRUD
// ═══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('db:invoices:getAll', function (_, type) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    // SQLite 优先
    if (useSqliteRead()) {
        var data = invoiceQueries.listInvoices(type);
        if (data !== null) {
            // SQLite 版发票状态由 payment_records 的 invoice_details 决定，
            // 但 getAll 的副作用（自动修正状态+saveDatabase）在 SQLite 模式下由读路径处理
            return { success: true, data: data };
        }
    }
    if (!shouldFallbackToJson())
        return { success: false, error: 'SQLite read failed (sqlite-primary mode)' };
    // JSON 回退
    var invoices = db.invoices;
    if (type) {
        invoices = invoices.filter(function (i) { return i.type === type; });
    }
    var statusChanged = false;
    // 计算每个发票的已收款金额，同时修正滞后状态
    var result = invoices.map(function (i) {
        var seller = db.partners.find(function (p) { return p.id === i.sellerId; });
        var buyer = db.partners.find(function (p) { return p.id === i.buyerId; });
        var project = db.projects.find(function (p) { return p.id === i.projectId; });
        var relatedPayments = db.paymentRecords.filter(function (r) {
            return r.invoiceDetails && r.invoiceDetails.some(function (d) { return d.invoiceId === i.id; });
        });
        var receivedAmount = relatedPayments.reduce(function (sum, r) {
            var detail = r.invoiceDetails.find(function (d) { return d.invoiceId === i.id; });
            return sum + ((detail === null || detail === void 0 ? void 0 : detail.paymentAmount) || 0);
        }, 0);
        var contractName = '';
        if (i.contractId) {
            var incomeContract = db.incomeContracts.find(function (c) { return c.id === i.contractId; });
            var expenseContract = db.expenseContracts.find(function (c) { return c.id === i.contractId; });
            var agreementContract = db.agreementContracts.find(function (c) { return c.id === i.contractId; });
            contractName = (incomeContract === null || incomeContract === void 0 ? void 0 : incomeContract.name) || (expenseContract === null || expenseContract === void 0 ? void 0 : expenseContract.name) || (agreementContract === null || agreementContract === void 0 ? void 0 : agreementContract.name) || '';
        }
        // 根据实际收款金额同步状态
        var syncedStatus = i.status;
        if (receivedAmount >= (i.amount || 0)) {
            syncedStatus = 'received';
        }
        else if (receivedAmount > 0) {
            syncedStatus = 'partially_paid';
        }
        else {
            syncedStatus = 'issued';
        }
        if (syncedStatus !== i.status) {
            i.status = syncedStatus;
            i.receivedAmount = receivedAmount;
            statusChanged = true;
        }
        return __assign(__assign({}, i), { receivedAmount: receivedAmount, status: syncedStatus, sellerName: (seller === null || seller === void 0 ? void 0 : seller.name) || '', buyerName: (buyer === null || buyer === void 0 ? void 0 : buyer.name) || '', projectName: (project === null || project === void 0 ? void 0 : project.name) || '', contractName: contractName });
    });
    if (statusChanged)
        saveDatabase();
    return { success: true, data: result.sort(function (a, b) {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }) };
});
ipcMain.handle('db:invoices:create', function (_, invoice) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    try {
        var id = Date.now();
        var newInvoice = __assign(__assign({}, invoice), { id: id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
        db.invoices.push(newInvoice);
        saveDatabase();
        // SQLite 双写
        invoiceQueries.createInvoice(newInvoice);
        return { success: true, data: { id: id } };
    }
    catch (error) {
        log.error('Failed to create invoice:', error);
        return { success: false, error: error.message };
    }
});
ipcMain.handle('db:invoices:update', function (_, invoice) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    try {
        var index = db.invoices.findIndex(function (i) { return i.id === invoice.id; });
        if (index !== -1) {
            db.invoices[index] = __assign(__assign(__assign({}, db.invoices[index]), invoice), { updatedAt: new Date().toISOString() });
            saveDatabase();
            // SQLite 双写
            invoiceQueries.updateInvoice(db.invoices[index]);
        }
        return { success: true };
    }
    catch (error) {
        log.error('Failed to update invoice:', error);
        return { success: false, error: error.message };
    }
});
ipcMain.handle('db:invoices:delete', function (_, id) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    try {
        db.invoices = db.invoices.filter(function (i) { return i.id !== id; });
        saveDatabase();
        // SQLite 双写
        invoiceQueries.deleteInvoice(id);
        return { success: true };
    }
    catch (error) {
        log.error('Failed to delete invoice:', error);
        return { success: false, error: error.message };
    }
});
ipcMain.handle('db:invoices:updateStatus', function (_, id, status) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    try {
        var index = db.invoices.findIndex(function (i) { return i.id === id; });
        if (index !== -1) {
            db.invoices[index].status = status;
            db.invoices[index].updatedAt = new Date().toISOString();
            saveDatabase();
            // SQLite 双写
            invoiceQueries.updateInvoiceStatus(id, status);
        }
        return { success: true };
    }
    catch (error) {
        log.error('Failed to update invoice status:', error);
        return { success: false, error: error.message };
    }
});
// ═══════════════════════════════════════════════════════════════════════════════
// 收款记录
// ═══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('db:paymentRecords:getAll', function (_, type) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    // SQLite 优先
    if (useSqliteRead()) {
        var data = invoiceQueries.listPaymentRecords(type);
        if (data !== null)
            return { success: true, data: data };
    }
    if (!shouldFallbackToJson())
        return { success: false, error: 'SQLite read failed (sqlite-primary mode)' };
    // JSON 回退
    var records = db.paymentRecords;
    if (type) {
        records = records.filter(function (r) { return r.type === type; });
    }
    var result = records.map(function (r) {
        var project = r.projectId ? db.projects.find(function (p) { return p.id === r.projectId; }) : null;
        var partner = r.partnerId ? db.partners.find(function (p) { return p.id === r.partnerId; }) : null;
        var contractName = '';
        if (r.contractId) {
            var incomeContract = db.incomeContracts.find(function (c) { return c.id === r.contractId; });
            var expenseContract = db.expenseContracts.find(function (c) { return c.id === r.contractId; });
            var agreementContract = db.agreementContracts.find(function (c) { return c.id === r.contractId; });
            contractName = (incomeContract === null || incomeContract === void 0 ? void 0 : incomeContract.name) || (expenseContract === null || expenseContract === void 0 ? void 0 : expenseContract.name) || (agreementContract === null || agreementContract === void 0 ? void 0 : agreementContract.name) || '';
        }
        // 获取关联发票信息
        var invoiceInfos = (r.invoiceDetails || []).map(function (d) {
            var invoice = db.invoices.find(function (i) { return i.id === d.invoiceId; });
            return {
                invoiceId: d.invoiceId,
                invoiceNo: (invoice === null || invoice === void 0 ? void 0 : invoice.invoiceNo) || '',
                invoiceName: (invoice === null || invoice === void 0 ? void 0 : invoice.name) || '',
                invoiceAmount: (invoice === null || invoice === void 0 ? void 0 : invoice.amount) || 0,
                paymentAmount: d.paymentAmount
            };
        });
        return __assign(__assign({}, r), { projectName: (project === null || project === void 0 ? void 0 : project.name) || '', partnerName: (partner === null || partner === void 0 ? void 0 : partner.name) || '', contractName: contractName, invoiceInfos: invoiceInfos });
    });
    return { success: true, data: result.sort(function (a, b) {
            return new Date(b.recordDate || b.createdAt).getTime() - new Date(a.recordDate || a.createdAt).getTime();
        }) };
});
ipcMain.handle('db:paymentRecords:create', function (_, record) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    try {
        var id = Date.now();
        // 计算每张发票应分摊的金额
        var totalPaymentAmount = record.amount || 0;
        var invoiceDetails = record.invoiceDetails || [];
        if (invoiceDetails.length > 0 && totalPaymentAmount > 0) {
            // 计算所有勾选发票的待收总额
            var totalRemaining = 0;
            var invoiceRemainingMap = {};
            var _loop_1 = function (detail) {
                var invoice = db.invoices.find(function (inv) { return inv.id === detail.invoiceId; });
                if (invoice) {
                    var remaining = invoice.amount - (invoice.receivedAmount || 0);
                    invoiceRemainingMap[detail.invoiceId] = remaining;
                    totalRemaining += remaining;
                }
            };
            for (var _i = 0, invoiceDetails_1 = invoiceDetails; _i < invoiceDetails_1.length; _i++) {
                var detail = invoiceDetails_1[_i];
                _loop_1(detail);
            }
            // 如果待收总额等于或小于用户输入的金额，按待收比例分配
            if (totalRemaining <= totalPaymentAmount) {
                // 每张发票分配其待收金额
                for (var _a = 0, invoiceDetails_2 = invoiceDetails; _a < invoiceDetails_2.length; _a++) {
                    var detail = invoiceDetails_2[_a];
                    detail.paymentAmount = invoiceRemainingMap[detail.invoiceId] || 0;
                }
            }
            else {
                // 待收总额大于用户输入金额，按比例分配
                for (var _b = 0, invoiceDetails_3 = invoiceDetails; _b < invoiceDetails_3.length; _b++) {
                    var detail = invoiceDetails_3[_b];
                    var remaining = invoiceRemainingMap[detail.invoiceId] || 0;
                    // 比例分配，保留2位小数
                    detail.paymentAmount = Math.round((remaining / totalRemaining) * totalPaymentAmount * 100) / 100;
                }
            }
        }
        var newRecord = __assign(__assign({}, record), { invoiceDetails: invoiceDetails, id: id, createdAt: new Date().toISOString() });
        db.paymentRecords.push(newRecord);
        var _loop_2 = function (detail) {
            var invoiceIndex = db.invoices.findIndex(function (inv) { return inv.id === detail.invoiceId; });
            if (invoiceIndex !== -1) {
                var invoice = db.invoices[invoiceIndex];
                var currentReceived = invoice.receivedAmount || 0;
                var newReceived = currentReceived + (detail.paymentAmount || 0);
                db.invoices[invoiceIndex].receivedAmount = newReceived;
                if (newReceived >= invoice.amount) {
                    db.invoices[invoiceIndex].status = 'received';
                }
                else if (newReceived > 0) {
                    db.invoices[invoiceIndex].status = 'partially_paid';
                }
            }
        };
        // 自动更新关联发票的状态
        for (var _c = 0, invoiceDetails_4 = invoiceDetails; _c < invoiceDetails_4.length; _c++) {
            var detail = invoiceDetails_4[_c];
            _loop_2(detail);
        }
        saveDatabase();
        // SQLite 双写：收款记录
        invoiceQueries.createPaymentRecord(newRecord);
        var _loop_3 = function (detail) {
            var inv = db.invoices.find(function (i) { return i.id === detail.invoiceId; });
            if (inv) {
                invoiceQueries.updateInvoiceReceived(inv.id, inv.receivedAmount, inv.status);
            }
        };
        // SQLite 双写：更新关联发票的 receivedAmount 和 status
        for (var _d = 0, invoiceDetails_5 = invoiceDetails; _d < invoiceDetails_5.length; _d++) {
            var detail = invoiceDetails_5[_d];
            _loop_3(detail);
        }
        return { success: true, data: { id: id } };
    }
    catch (error) {
        log.error('Failed to create payment record:', error);
        return { success: false, error: error.message };
    }
});
ipcMain.handle('db:paymentRecords:update', function (_, record) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    try {
        var index = db.paymentRecords.findIndex(function (r) { return r.id === record.id; });
        if (index !== -1) {
            var oldRecord = db.paymentRecords[index];
            db.paymentRecords[index] = __assign(__assign({}, db.paymentRecords[index]), record);
            // 重新计算所有关联发票的状态
            recalculateInvoiceStatus();
            saveDatabase();
            // SQLite 双写
            invoiceQueries.updatePaymentRecord(db.paymentRecords[index]);
            // 重算 SQLite 发票状态
            invoiceQueries.recalculateInvoiceStatusSqlite();
        }
        return { success: true };
    }
    catch (error) {
        log.error('Failed to update payment record:', error);
        return { success: false, error: error.message };
    }
});
ipcMain.handle('db:paymentRecords:delete', function (_, id) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    try {
        db.paymentRecords = db.paymentRecords.filter(function (r) { return r.id !== id; });
        // 删除后重新计算所有关联发票的状态
        recalculateInvoiceStatus();
        saveDatabase();
        // SQLite 双写
        invoiceQueries.deletePaymentRecord(id);
        invoiceQueries.recalculateInvoiceStatusSqlite();
        return { success: true };
    }
    catch (error) {
        log.error('Failed to delete payment record:', error);
        return { success: false, error: error.message };
    }
});
