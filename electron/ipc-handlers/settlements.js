/**
 * 结算 IPC 处理器（双写模式）
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
import { db, dbReady, saveDatabase } from '../database';
import { useSqliteRead, useSqliteWrite, shouldFallbackToJson, settlementQueries } from '../sqlite/queries';
// ═══════════════════════════════════════════════════════════════════════════════
// 结算办理
// ═══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('db:settlements:getAll', function (_, projectId) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    // SQLite 优先
    if (useSqliteRead()) {
        var data = settlementQueries.listSettlements(projectId);
        if (data)
            return { success: true, data: data };
    }
    // JSON 回退
    if (!shouldFallbackToJson())
        return { success: false, error: 'SQLite read failed (sqlite-primary mode)' };
    if (!db.settlements)
        db.settlements = [];
    var settlements = db.settlements;
    if (projectId) {
        settlements = settlements.filter(function (s) { return s.projectId === projectId; });
    }
    var result = settlements.map(function (s) {
        var project = db.projects.find(function (p) { return p.id === s.projectId; });
        var partner = db.partners.find(function (p) { return p.id === s.partnerId; });
        var status = s.status;
        if (status === 'draft' || status === 'approved' || status === 'paid' || !status)
            status = 'pending';
        return __assign(__assign({}, s), { status: status, projectName: (project === null || project === void 0 ? void 0 : project.name) || '', partnerName: (partner === null || partner === void 0 ? void 0 : partner.name) || '' });
    });
    return { success: true, data: result.sort(function (a, b) {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }) };
});
ipcMain.handle('db:settlements:create', function (_, settlement) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    if (!db.settlements)
        db.settlements = [];
    try {
        var id = Date.now();
        var newSettlement = __assign(__assign({}, settlement), { id: id, status: settlement.status || 'pending', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
        db.settlements.push(newSettlement);
        saveDatabase();
        // SQLite 双写
        if (useSqliteWrite()) {
            settlementQueries.createSettlement(newSettlement);
        }
        return { success: true, data: { id: id } };
    }
    catch (error) {
        log.error('Failed to create settlement:', error);
        return { success: false, error: error.message };
    }
});
ipcMain.handle('db:settlements:update', function (_, settlement) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    if (!db.settlements)
        db.settlements = [];
    try {
        var index = db.settlements.findIndex(function (s) { return s.id === settlement.id; });
        if (index !== -1) {
            db.settlements[index] = __assign(__assign(__assign({}, db.settlements[index]), settlement), { updatedAt: new Date().toISOString() });
            saveDatabase();
            // SQLite 双写
            if (useSqliteWrite()) {
                settlementQueries.updateSettlement(settlement.id, settlement);
            }
        }
        return { success: true };
    }
    catch (error) {
        log.error('Failed to update settlement:', error);
        return { success: false, error: error.message };
    }
});
ipcMain.handle('db:settlements:delete', function (_, id) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    if (!db.settlements)
        db.settlements = [];
    try {
        db.settlements = db.settlements.filter(function (s) { return s.id !== id; });
        saveDatabase();
        // SQLite 双写
        if (useSqliteWrite()) {
            settlementQueries.deleteSettlement(id);
        }
        return { success: true };
    }
    catch (error) {
        log.error('Failed to delete settlement:', error);
        return { success: false, error: error.message };
    }
});
ipcMain.handle('db:settlements:process', function (_, id) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    if (!db.settlements)
        db.settlements = [];
    if (!db.invoices)
        db.invoices = [];
    if (!db.paymentRecords)
        db.paymentRecords = [];
    try {
        var index = db.settlements.findIndex(function (s) { return s.id === id; });
        if (index === -1)
            return { success: false, error: '结算单不存在' };
        var settlement_1 = db.settlements[index];
        var settlementAmount = settlement_1.amount || 0;
        var partnerId_1 = settlement_1.partnerId;
        var invoiceType_1 = settlement_1.type === 'income' ? 'invoice_out' : 'invoice_in';
        var linkedInvoices = db.invoices.filter(function (inv) {
            if (inv.type !== invoiceType_1)
                return false;
            if (settlement_1.type === 'income')
                return inv.buyerId === partnerId_1;
            return inv.sellerId === partnerId_1;
        });
        var invoiceTotal = linkedInvoices.reduce(function (sum, inv) { return sum + (inv.amount || 0); }, 0);
        var linkedInvoiceIds = new Set(linkedInvoices.map(function (inv) { return inv.id; }));
        var paidTotal = 0;
        for (var _i = 0, _a = db.paymentRecords; _i < _a.length; _i++) {
            var r = _a[_i];
            if (r.invoiceDetails && Array.isArray(r.invoiceDetails)) {
                for (var _b = 0, _c = r.invoiceDetails; _b < _c.length; _b++) {
                    var d = _c[_b];
                    if (linkedInvoiceIds.has(d.invoiceId)) {
                        paidTotal += d.paymentAmount || 0;
                    }
                }
            }
        }
        var fmt = function (n) { return n >= 10000 ? (n / 10000).toFixed(1) + '万' : n.toLocaleString(); };
        var warnings = [];
        if (!partnerId_1) {
            warnings.push('未关联结算单位');
        }
        else {
            var diffPaid = settlementAmount - paidTotal;
            var diffInvoice = settlementAmount - invoiceTotal;
            if (Math.abs(diffPaid) > 0.01) {
                if (diffPaid > 0)
                    warnings.push("\u4ED8\u6B3E\u4E0D\u8DB3\uFF0C\u5DEE\u00A5".concat(fmt(diffPaid)));
                else
                    warnings.push("\u4ED8\u6B3E\u8D85\u51FA\u00A5".concat(fmt(-diffPaid)));
            }
            if (Math.abs(diffInvoice) > 0.01) {
                if (diffInvoice > 0)
                    warnings.push("\u53D1\u7968\u4E0D\u8DB3\uFF0C\u7F3A\u00A5".concat(fmt(diffInvoice)));
                else
                    warnings.push("\u53D1\u7968\u8D85\u51FA\u00A5".concat(fmt(-diffInvoice)));
            }
        }
        var now = new Date().toISOString();
        var changes = {};
        if (warnings.length > 0) {
            db.settlements[index].status = 'completed';
            db.settlements[index].warnings = warnings;
            db.settlements[index].completedAt = now;
            changes.status = 'completed';
            changes.warnings = warnings;
            changes.completedAt = now;
        }
        else {
            db.settlements[index].status = 'archived';
            db.settlements[index].warnings = undefined;
            db.settlements[index].archivedAt = now;
            changes.status = 'archived';
            changes.warnings = undefined;
            changes.archivedAt = now;
        }
        saveDatabase();
        // SQLite 双写
        if (useSqliteWrite()) {
            settlementQueries.updateSettlement(id, changes);
        }
        return { success: true, warnings: warnings.length > 0 ? warnings : undefined };
    }
    catch (error) {
        log.error('Failed to process settlement:', error);
        return { success: false, error: error.message };
    }
});
ipcMain.handle('db:settlements:unarchive', function (_, id) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    if (!db.settlements)
        db.settlements = [];
    try {
        var index = db.settlements.findIndex(function (s) { return s.id === id; });
        if (index !== -1) {
            db.settlements[index].status = 'completed';
            db.settlements[index].warnings = undefined;
            saveDatabase();
            // SQLite 双写
            if (useSqliteWrite()) {
                settlementQueries.updateSettlement(id, { status: 'completed', warnings: undefined });
            }
        }
        return { success: true };
    }
    catch (error) {
        log.error('Failed to unarchive settlement:', error);
        return { success: false, error: error.message };
    }
});
// ═══════════════════════════════════════════════════════════════════════════════
// 合同模板
// ═══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('db:contractTemplates:getAll', function () {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    // SQLite 优先
    if (useSqliteRead()) {
        var data = settlementQueries.listContractTemplates();
        if (data)
            return { success: true, data: data };
    }
    // JSON 回退
    if (!shouldFallbackToJson())
        return { success: false, error: 'SQLite read failed (sqlite-primary mode)' };
    if (!db.contractTemplates)
        db.contractTemplates = [];
    return { success: true, data: db.contractTemplates.sort(function (a, b) {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }) };
});
ipcMain.handle('db:contractTemplates:create', function (_, template) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    if (!db.contractTemplates)
        db.contractTemplates = [];
    try {
        var id = Date.now();
        var newTemplate = __assign(__assign({}, template), { id: id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
        db.contractTemplates.push(newTemplate);
        saveDatabase();
        // SQLite 双写
        if (useSqliteWrite()) {
            settlementQueries.createContractTemplate(newTemplate);
        }
        return { success: true, data: { id: id } };
    }
    catch (error) {
        log.error('Failed to create template:', error);
        return { success: false, error: error.message };
    }
});
ipcMain.handle('db:contractTemplates:update', function (_, template) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    if (!db.contractTemplates)
        db.contractTemplates = [];
    try {
        var index = db.contractTemplates.findIndex(function (t) { return t.id === template.id; });
        if (index !== -1) {
            db.contractTemplates[index] = __assign(__assign(__assign({}, db.contractTemplates[index]), template), { updatedAt: new Date().toISOString() });
            saveDatabase();
            // SQLite 双写
            if (useSqliteWrite()) {
                settlementQueries.updateContractTemplate(template.id, template);
            }
        }
        return { success: true };
    }
    catch (error) {
        log.error('Failed to update template:', error);
        return { success: false, error: error.message };
    }
});
ipcMain.handle('db:contractTemplates:delete', function (_, id) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    if (!db.contractTemplates)
        db.contractTemplates = [];
    try {
        db.contractTemplates = db.contractTemplates.filter(function (t) { return t.id !== id; });
        saveDatabase();
        // SQLite 双写
        if (useSqliteWrite()) {
            settlementQueries.deleteContractTemplate(id);
        }
        return { success: true };
    }
    catch (error) {
        log.error('Failed to delete template:', error);
        return { success: false, error: error.message };
    }
});
