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
/**
 * 模板管理 IPC 处理器（双写模式）
 */
import { ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import mammoth from 'mammoth';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { db, dbReady, saveDatabase } from '../database';
import { deleteFile, getCategoryDir } from '../file-service';
import { useSqliteRead, useSqliteWrite, shouldFallbackToJson, templateDrawingQueries } from '../sqlite/queries';
// Auto-detect {{变量}} from a .docx file on disk
function detectVariables(storedFileName) {
    return __awaiter(this, void 0, void 0, function () {
        var dir, filePath, result, seen, vars, regex, m, key, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    dir = getCategoryDir('templates', 'files', null);
                    filePath = path.join(dir, storedFileName);
                    if (!fs.existsSync(filePath))
                        return [2 /*return*/, []];
                    return [4 /*yield*/, mammoth.extractRawText({ path: filePath })];
                case 1:
                    result = _a.sent();
                    seen = new Set();
                    vars = [];
                    regex = /\{\{([^{}]+)\}\}/g;
                    m = void 0;
                    while ((m = regex.exec(result.value)) !== null) {
                        key = m[1].trim();
                        if (key && !seen.has(key)) {
                            seen.add(key);
                            vars.push({ key: key, label: key, type: 'text', defaultValue: '', required: false });
                        }
                    }
                    return [2 /*return*/, vars];
                case 2:
                    err_1 = _a.sent();
                    console.error('Variable detection failed:', err_1);
                    return [2 /*return*/, []];
                case 3: return [2 /*return*/];
            }
        });
    });
}
// 获取全部模板（可选 category 过滤）
ipcMain.handle('db:templates:getAll', function (_, category) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    // SQLite 优先
    if (useSqliteRead()) {
        var data = templateDrawingQueries.listTemplates(category);
        if (data)
            return { success: true, data: data };
    }
    // JSON 回退
    if (!shouldFallbackToJson())
        return { success: false, error: 'SQLite read failed (sqlite-primary mode)' };
    if (!db.templates)
        db.templates = [];
    var list = db.templates;
    if (category)
        list = list.filter(function (t) { return t.category === category; });
    return { success: true, data: list.sort(function (a, b) {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }) };
});
// 创建模板
ipcMain.handle('db:templates:create', function (_, template) { return __awaiter(void 0, void 0, void 0, function () {
    var variables, id, newTemplate, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!dbReady)
                    return [2 /*return*/, { success: false, error: 'Database not ready' }];
                if (!db.templates)
                    db.templates = [];
                _a.label = 1;
            case 1:
                _a.trys.push([1, 4, , 5]);
                variables = template.variables || [];
                if (!(template.fileType === 'docx' && template.storedFileName && variables.length === 0)) return [3 /*break*/, 3];
                return [4 /*yield*/, detectVariables(template.storedFileName)];
            case 2:
                variables = _a.sent();
                _a.label = 3;
            case 3:
                id = Date.now();
                newTemplate = __assign(__assign({}, template), { variables: variables, id: id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
                db.templates.push(newTemplate);
                saveDatabase();
                // SQLite 双写
                if (useSqliteWrite()) {
                    templateDrawingQueries.createTemplate(__assign(__assign({}, newTemplate), { variables: variables }));
                }
                return [2 /*return*/, { success: true, data: { id: id, variables: variables } }];
            case 4:
                error_1 = _a.sent();
                return [2 /*return*/, { success: false, error: error_1.message }];
            case 5: return [2 /*return*/];
        }
    });
}); });
// 更新模板
ipcMain.handle('db:templates:update', function (_, template) { return __awaiter(void 0, void 0, void 0, function () {
    var variables, index, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!dbReady)
                    return [2 /*return*/, { success: false, error: 'Database not ready' }];
                if (!db.templates)
                    db.templates = [];
                _a.label = 1;
            case 1:
                _a.trys.push([1, 4, , 5]);
                variables = template.variables || [];
                if (!(template.fileType === 'docx' && template.storedFileName && variables.length === 0)) return [3 /*break*/, 3];
                return [4 /*yield*/, detectVariables(template.storedFileName)];
            case 2:
                variables = _a.sent();
                _a.label = 3;
            case 3:
                index = db.templates.findIndex(function (t) { return t.id === template.id; });
                if (index !== -1) {
                    db.templates[index] = __assign(__assign(__assign({}, db.templates[index]), template), { variables: variables, updatedAt: new Date().toISOString() });
                    saveDatabase();
                    // SQLite 双写
                    if (useSqliteWrite()) {
                        templateDrawingQueries.updateTemplate(template.id, __assign(__assign({}, template), { variables: variables }));
                    }
                }
                return [2 /*return*/, { success: true }];
            case 4:
                error_2 = _a.sent();
                return [2 /*return*/, { success: false, error: error_2.message }];
            case 5: return [2 /*return*/];
        }
    });
}); });
// 删除模板（含关联文件）
ipcMain.handle('db:templates:delete', function (_, id) { return __awaiter(void 0, void 0, void 0, function () {
    var template, e_1, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!dbReady)
                    return [2 /*return*/, { success: false, error: 'Database not ready' }];
                if (!db.templates)
                    db.templates = [];
                _a.label = 1;
            case 1:
                _a.trys.push([1, 6, , 7]);
                template = db.templates.find(function (t) { return t.id === id; });
                if (!(template === null || template === void 0 ? void 0 : template.storedFileName)) return [3 /*break*/, 5];
                _a.label = 2;
            case 2:
                _a.trys.push([2, 4, , 5]);
                return [4 /*yield*/, deleteFile({ category: 'templates', subCategory: 'files', fileName: template.storedFileName, projectName: null })];
            case 3:
                _a.sent();
                return [3 /*break*/, 5];
            case 4:
                e_1 = _a.sent();
                return [3 /*break*/, 5];
            case 5:
                db.templates = db.templates.filter(function (t) { return t.id !== id; });
                saveDatabase();
                // SQLite 双写
                if (useSqliteWrite()) {
                    templateDrawingQueries.deleteTemplate(id);
                }
                return [2 /*return*/, { success: true }];
            case 6:
                error_3 = _a.sent();
                return [2 /*return*/, { success: false, error: error_3.message }];
            case 7: return [2 /*return*/];
        }
    });
}); });
// 按分类统计
ipcMain.handle('db:templates:getStats', function () {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    // SQLite 优先
    if (useSqliteRead()) {
        var data = templateDrawingQueries.getTemplateStats();
        if (data)
            return { success: true, data: data };
    }
    // JSON 回退
    if (!shouldFallbackToJson())
        return { success: false, error: 'SQLite read failed (sqlite-primary mode)' };
    if (!db.templates)
        db.templates = [];
    var stats = { total: db.templates.length };
    for (var _i = 0, _a = db.templates; _i < _a.length; _i++) {
        var t = _a[_i];
        stats[t.category] = (stats[t.category] || 0) + 1;
    }
    return { success: true, data: stats };
});
// 用 docxtemplater 填充 .docx 模板变量，保留全部 Word 格式（文件操作，不双写）
ipcMain.handle('templates:fill-docx', function (_, storedFileName, values) { return __awaiter(void 0, void 0, void 0, function () {
    var dir, filePath, buffer, zip, doc, output, base64, dataUrl;
    return __generator(this, function (_a) {
        try {
            dir = getCategoryDir('templates', 'files', null);
            filePath = path.join(dir, storedFileName);
            if (!fs.existsSync(filePath)) {
                return [2 /*return*/, { success: false, error: '模板文件不存在' }];
            }
            buffer = fs.readFileSync(filePath);
            zip = new PizZip(buffer);
            doc = new Docxtemplater(zip, {
                paragraphLoop: true,
                linebreaks: true,
                delimiters: { start: '{{', end: '}}' },
            });
            doc.render(values);
            output = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
            base64 = output.toString('base64');
            dataUrl = "data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,".concat(base64);
            return [2 /*return*/, { success: true, data: { dataUrl: dataUrl } }];
        }
        catch (error) {
            console.error('docxtemplater fill error:', error);
            return [2 /*return*/, { success: false, error: error.message || '模板填充失败' }];
        }
        return [2 /*return*/];
    });
}); });
