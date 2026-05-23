/**
 * 合同 IPC 处理器
 * 双写：SQLite（income_contracts/records、expense_contracts/records、agreement_contracts 五张表）
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
import { ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';
import log from 'electron-log';
import { db, dbReady, saveDatabase, getUploadsPath } from '../database';
import { saveFile, readFile } from '../file-service';
import { useSqliteRead, shouldFallbackToJson, contractQueries } from '../sqlite/queries';
// ═══════════════════════════════════════════════════════════════════════════════
// 合同 CRUD 工厂 — 消除收入/支出合同 7 组重复 handler
// ═══════════════════════════════════════════════════════════════════════════════
function registerContractHandlers(type) {
    var isAgreement = type === 'agreement';
    var cKey = isAgreement ? 'agreementContracts' : type === 'income' ? 'incomeContracts' : 'expenseContracts';
    var rKey = isAgreement ? '' : type === 'income' ? 'incomeRecords' : 'expenseRecords';
    var amountLabel = type === 'income' ? 'receivedAmount' : 'paidAmount';
    // getAll
    ipcMain.handle("db:".concat(cKey, ":getAll"), function (_, projectId) {
        if (!dbReady)
            return { success: false, error: 'Database not ready' };
        // SQLite 优先
        if (useSqliteRead()) {
            var data = contractQueries.listContracts(type, projectId);
            if (data !== null)
                return { success: true, data: data };
        }
        if (!shouldFallbackToJson())
            return { success: false, error: 'SQLite read failed (sqlite-primary mode)' };
        // JSON 回退
        var contracts = db[cKey];
        if (projectId)
            contracts = contracts.filter(function (c) { return c.projectId === projectId; });
        var result = contracts.map(function (c) {
            var project = db.projects.find(function (p) { return p.id === c.projectId; });
            var partner = db.partners.find(function (p) { return p.id === c.partnerId; });
            var enriched = __assign(__assign({}, c), { projectName: (project === null || project === void 0 ? void 0 : project.name) || '', partnerName: (partner === null || partner === void 0 ? void 0 : partner.name) || '' });
            if (!isAgreement) {
                var records = db[rKey].filter(function (r) { return r.contractId === c.id; });
                enriched[amountLabel] = records.reduce(function (sum, r) { return sum + (r.amount || 0); }, 0);
            }
            return enriched;
        });
        return { success: true, data: result.sort(function (a, b) { return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); }) };
    });
    // create
    ipcMain.handle("db:".concat(cKey, ":create"), function (_, contract) {
        if (!dbReady)
            return { success: false, error: 'Database not ready' };
        try {
            var id = Date.now();
            var newContract = __assign(__assign({}, contract), { id: id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
            db[cKey].push(newContract);
            saveDatabase();
            // SQLite 双写
            contractQueries.createContract(type, newContract);
            return { success: true, data: { id: id } };
        }
        catch (error) {
            log.error("Failed to create ".concat(type, " contract:"), error);
            return { success: false, error: error.message };
        }
    });
    // update
    ipcMain.handle("db:".concat(cKey, ":update"), function (_, contract) {
        if (!dbReady)
            return { success: false, error: 'Database not ready' };
        try {
            var idx = db[cKey].findIndex(function (c) { return c.id === contract.id; });
            if (idx !== -1) {
                db[cKey][idx] = __assign(__assign(__assign({}, db[cKey][idx]), contract), { updatedAt: new Date().toISOString() });
                saveDatabase();
                // SQLite 双写
                contractQueries.updateContract(type, db[cKey][idx]);
            }
            return { success: true };
        }
        catch (error) {
            log.error("Failed to update ".concat(type, " contract:"), error);
            return { success: false, error: error.message };
        }
    });
    // delete
    ipcMain.handle("db:".concat(cKey, ":delete"), function (_, id) {
        if (!dbReady)
            return { success: false, error: 'Database not ready' };
        try {
            db[cKey] = db[cKey].filter(function (c) { return c.id !== id; });
            if (!isAgreement) {
                ;
                db[rKey] = db[rKey].filter(function (r) { return r.contractId !== id; });
            }
            saveDatabase();
            // SQLite 双写（含级联删除记录）
            contractQueries.deleteContract(type, id);
            return { success: true };
        }
        catch (error) {
            log.error("Failed to delete ".concat(type, " contract:"), error);
            return { success: false, error: error.message };
        }
    });
    // Records handlers (income/expense only)
    if (!isAgreement) {
        ipcMain.handle("db:".concat(rKey, ":getAll"), function (_, contractId) {
            if (!dbReady)
                return { success: false, error: 'Database not ready' };
            // SQLite 优先
            if (useSqliteRead()) {
                var data = contractQueries.listRecords(type, contractId);
                if (data !== null)
                    return { success: true, data: data };
            }
            if (!shouldFallbackToJson())
                return { success: false, error: 'SQLite read failed (sqlite-primary mode)' };
            // JSON 回退
            return { success: true, data: db[rKey].filter(function (r) { return r.contractId === contractId; }) };
        });
        ipcMain.handle("db:".concat(rKey, ":create"), function (_, record) {
            if (!dbReady)
                return { success: false, error: 'Database not ready' };
            try {
                var id = Date.now();
                var newRecord = __assign(__assign({}, record), { id: id, createdAt: new Date().toISOString() });
                db[rKey].push(newRecord);
                saveDatabase();
                // SQLite 双写
                contractQueries.createRecord(type, newRecord);
                return { success: true, data: { id: id } };
            }
            catch (error) {
                log.error("Failed to create ".concat(type, " record:"), error);
                return { success: false, error: error.message };
            }
        });
        ipcMain.handle("db:".concat(rKey, ":delete"), function (_, id) {
            if (!dbReady)
                return { success: false, error: 'Database not ready' };
            try {
                db[rKey] = db[rKey].filter(function (r) { return r.id !== id; });
                saveDatabase();
                // SQLite 双写
                contractQueries.deleteRecord(type, id);
                return { success: true };
            }
            catch (error) {
                log.error("Failed to delete ".concat(type, " record:"), error);
                return { success: false, error: error.message };
            }
        });
    }
}
registerContractHandlers('income');
registerContractHandlers('expense');
registerContractHandlers('agreement');
// ═══════════════════════════════════════════════════════════════════════════════
// 合同附件文件存储（文件系统操作，无需 SQLite 双写）
// ═══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('db:contracts:saveFile', function (_, options) { return __awaiter(void 0, void 0, void 0, function () {
    var sub, subCategory;
    return __generator(this, function (_a) {
        sub = options.subCategory || 'income';
        subCategory = sub === 'expense' ? 'expense' : sub === 'agreement' ? 'agreement' : 'income';
        return [2 /*return*/, saveFile('contracts', subCategory, { fileData: options.fileData, fileName: options.fileName }, options.projectName)];
    });
}); });
var MIME_MAP = {
    '.pdf': 'application/pdf', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.png': 'image/png', '.webp': 'image/webp',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};
ipcMain.handle('db:contracts:readFile', function (_, fileName, subCategory, projectName) { return __awaiter(void 0, void 0, void 0, function () {
    var subCats, _i, subCats_1, sub, result, legacyPath, buffer, ext, mimeType;
    return __generator(this, function (_a) {
        if (!fileName)
            return [2 /*return*/, { success: false, error: '文件名为空' }];
        subCats = subCategory ? [subCategory] : ['income', 'expense', 'agreement'];
        for (_i = 0, subCats_1 = subCats; _i < subCats_1.length; _i++) {
            sub = subCats_1[_i];
            result = readFile('contracts', sub, fileName, projectName);
            if (result.success)
                return [2 /*return*/, result];
        }
        legacyPath = path.join(getUploadsPath(), 'contracts', fileName);
        if (fs.existsSync(legacyPath)) {
            try {
                buffer = fs.readFileSync(legacyPath);
                ext = path.extname(fileName).toLowerCase();
                mimeType = MIME_MAP[ext] || 'application/octet-stream';
                return [2 /*return*/, { success: true, data: { dataUrl: "data:".concat(mimeType, ";base64,").concat(buffer.toString('base64')), mimeType: mimeType } }];
            }
            catch ( /* ignore */_b) { /* ignore */ }
        }
        return [2 /*return*/, { success: false, error: '文件不存在' }];
    });
}); });
// ═══════════════════════════════════════════════════════════════════════════════
// 合同统计
// ═══════════════════════════════════════════════════════════════════════════════
function pushExpiring(contracts, type, now, thirtyDaysLater, out) {
    contracts.forEach(function (c) {
        var _a, _b;
        if (!c.endDate)
            return;
        var endDate = new Date(c.endDate);
        if (endDate >= now && endDate <= thirtyDaysLater) {
            out.push({
                id: c.id,
                type: type,
                name: c.name, contractNo: c.contractNo,
                amount: ((_b = (_a = c.finalAmount) !== null && _a !== void 0 ? _a : c.amount) !== null && _b !== void 0 ? _b : 0), endDate: c.endDate,
                daysLeft: Math.ceil((endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
            });
        }
    });
}
ipcMain.handle('db:contractStats:get', function () {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    // SQLite 优先
    if (useSqliteRead()) {
        var data = contractQueries.getContractStats();
        if (data !== null)
            return { success: true, data: data };
    }
    if (!shouldFallbackToJson())
        return { success: false, error: 'SQLite read failed (sqlite-primary mode)' };
    // JSON 回退
    try {
        if (!db.paymentRecords)
            db.paymentRecords = [];
        var incomeTotal = db.incomeContracts.reduce(function (sum, c) { var _a, _b; return sum + ((_b = (_a = c.finalAmount) !== null && _a !== void 0 ? _a : c.amount) !== null && _b !== void 0 ? _b : 0); }, 0);
        var expenseTotal = db.expenseContracts.reduce(function (sum, c) { var _a, _b; return sum + ((_b = (_a = c.finalAmount) !== null && _a !== void 0 ? _a : c.amount) !== null && _b !== void 0 ? _b : 0); }, 0);
        var incomeReceived = db.paymentRecords.filter(function (r) { return r.type === 'invoice_out'; }).reduce(function (sum, r) { return sum + (r.amount || 0); }, 0);
        var expensePaid = db.paymentRecords.filter(function (r) { return r.type === 'invoice_in'; }).reduce(function (sum, r) { return sum + (r.amount || 0); }, 0);
        var now = new Date();
        var thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        var expiringContracts = [];
        pushExpiring(db.incomeContracts, 'income', now, thirtyDaysLater, expiringContracts);
        pushExpiring(db.expenseContracts, 'expense', now, thirtyDaysLater, expiringContracts);
        pushExpiring(db.agreementContracts, 'agreement', now, thirtyDaysLater, expiringContracts);
        expiringContracts.sort(function (a, b) { return a.daysLeft - b.daysLeft; });
        return { success: true, data: {
                incomeCount: db.incomeContracts.length,
                incomeTotal: incomeTotal,
                incomeReceived: incomeReceived,
                expenseCount: db.expenseContracts.length,
                expenseTotal: expenseTotal,
                expensePaid: expensePaid,
                agreementCount: db.agreementContracts.length,
                netIncome: incomeTotal - expenseTotal, netReceived: incomeReceived - expensePaid,
                expiringSoon: expiringContracts,
            } };
    }
    catch (error) {
        log.error('Failed to get contract stats:', error);
        return { success: false, error: error.message };
    }
});
