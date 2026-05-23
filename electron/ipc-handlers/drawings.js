/**
 * 图纸 IPC 处理器（双写模式）
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import { ipcMain } from 'electron';
import path from 'path';
import log from 'electron-log';
import fs from 'fs';
import { db, dbReady, saveDatabase, getUploadsPath } from '../database';
import { saveFile, deleteFile, getCategoryDir } from '../file-service';
import { useSqliteRead, useSqliteWrite, shouldFallbackToJson, templateDrawingQueries } from '../sqlite/queries';
// ═══════════════════════════════════════════════════════════════════════════════
// 图纸 CRUD
// ═══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('db:drawings:getAll', function (_, projectId) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    // SQLite 优先
    if (useSqliteRead()) {
        var data = templateDrawingQueries.listDrawings(projectId);
        if (data)
            return { success: true, data: data };
    }
    // JSON 回退
    if (!shouldFallbackToJson())
        return { success: false, error: 'SQLite read failed (sqlite-primary mode)' };
    var drawings = db.drawings;
    if (projectId) {
        drawings = drawings.filter(function (d) { return d.projectId === projectId; });
    }
    return { success: true, data: __spreadArray([], drawings, true).sort(function (a, b) {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }) };
});
ipcMain.handle('db:drawings:upload', function (_, options) { return __awaiter(void 0, void 0, void 0, function () {
    var project, category, position, subDir, result, storedName, id, filePath, newDrawing;
    return __generator(this, function (_a) {
        if (!dbReady)
            return [2 /*return*/, { success: false, error: 'Database not ready' }];
        try {
            project = db.projects.find(function (p) { return p.id === options.projectId; });
            category = options.category || '其他';
            position = options.position || '未分类';
            subDir = "".concat(position, "/").concat(category);
            result = saveFile('drawings', 'files', {
                fileData: options.fileData,
                fileName: options.fileName,
                subDir: subDir,
            }, project === null || project === void 0 ? void 0 : project.name);
            if (!result.success) {
                return [2 /*return*/, result];
            }
            storedName = result.data.fileName;
            id = Date.now();
            filePath = "".concat(position, "/").concat(category, "/").concat(storedName);
            newDrawing = {
                projectId: options.projectId,
                name: options.name,
                category: options.category,
                filePath: filePath,
                remarks: options.remarks,
                position: options.position || '',
                id: id,
                createdAt: new Date().toISOString()
            };
            db.drawings.push(newDrawing);
            saveDatabase();
            // SQLite 双写
            if (useSqliteWrite()) {
                templateDrawingQueries.createDrawing(newDrawing);
            }
            return [2 /*return*/, { success: true, data: { id: id, filePath: filePath } }];
        }
        catch (error) {
            log.error('上传图纸失败:', error);
            return [2 /*return*/, { success: false, error: error.message }];
        }
        return [2 /*return*/];
    });
}); });
ipcMain.handle('db:drawings:update', function (_, drawing) { return __awaiter(void 0, void 0, void 0, function () {
    var index, oldDrawing_1, newCategory, oldCategory, newPosition, oldPosition, project, projectName, baseDir, oldFilePath, storedName, newSubDir, newRelativePath, newFilePath, newDir;
    return __generator(this, function (_a) {
        if (!dbReady)
            return [2 /*return*/, { success: false, error: 'Database not ready' }];
        try {
            index = db.drawings.findIndex(function (d) { return d.id === drawing.id; });
            if (index === -1)
                return [2 /*return*/, { success: true }];
            oldDrawing_1 = db.drawings[index];
            newCategory = drawing.category || '其他';
            oldCategory = oldDrawing_1.category || '其他';
            newPosition = drawing.position || '未分类';
            oldPosition = oldDrawing_1.position || '未分类';
            // If category or position changed, move the file and update filePath
            if ((newCategory !== oldCategory || newPosition !== oldPosition) && oldDrawing_1.filePath) {
                project = db.projects.find(function (p) { return p.id === oldDrawing_1.projectId; });
                projectName = project === null || project === void 0 ? void 0 : project.name;
                baseDir = getCategoryDir('drawings', 'files', projectName);
                oldFilePath = path.join(baseDir, oldDrawing_1.filePath);
                storedName = path.basename(oldDrawing_1.filePath);
                newSubDir = "".concat(newPosition, "/").concat(newCategory);
                newRelativePath = "".concat(newSubDir, "/").concat(storedName);
                newFilePath = path.join(baseDir, newRelativePath);
                if (fs.existsSync(oldFilePath)) {
                    newDir = path.dirname(newFilePath);
                    if (!fs.existsSync(newDir)) {
                        fs.mkdirSync(newDir, { recursive: true });
                    }
                    fs.renameSync(oldFilePath, newFilePath);
                    log.info("Drawing file moved: ".concat(oldFilePath, " \u2192 ").concat(newFilePath));
                }
                drawing.filePath = newRelativePath;
            }
            db.drawings[index] = __assign(__assign({}, oldDrawing_1), drawing);
            saveDatabase();
            // SQLite 双写
            if (useSqliteWrite()) {
                templateDrawingQueries.updateDrawing(drawing.id, __assign({}, drawing));
            }
            return [2 /*return*/, { success: true }];
        }
        catch (error) {
            log.error('Failed to update drawing:', error);
            return [2 /*return*/, { success: false, error: error.message }];
        }
        return [2 /*return*/];
    });
}); });
ipcMain.handle('db:drawings:delete', function (_, id) { return __awaiter(void 0, void 0, void 0, function () {
    var drawing_1, project, result, oldFullPath;
    return __generator(this, function (_a) {
        if (!dbReady)
            return [2 /*return*/, { success: false, error: 'Database not ready' }];
        try {
            drawing_1 = db.drawings.find(function (d) { return d.id === id; });
            if (drawing_1 && drawing_1.filePath) {
                project = db.projects.find(function (p) { return p.id === drawing_1.projectId; });
                result = deleteFile('drawings', 'files', drawing_1.filePath, project === null || project === void 0 ? void 0 : project.name);
                if (!result.success && (project === null || project === void 0 ? void 0 : project.name)) {
                    oldFullPath = path.join(getUploadsPath(), project.name, '图纸/文件', drawing_1.filePath);
                    if (fs.existsSync(oldFullPath)) {
                        fs.unlinkSync(oldFullPath);
                        log.info("Drawing file deleted (old path): ".concat(oldFullPath));
                    }
                }
            }
            db.drawings = db.drawings.filter(function (d) { return d.id !== id; });
            saveDatabase();
            // SQLite 双写
            if (useSqliteWrite()) {
                templateDrawingQueries.deleteDrawing(id);
            }
            return [2 /*return*/, { success: true }];
        }
        catch (error) {
            log.error('Failed to delete drawing:', error);
            return [2 /*return*/, { success: false, error: error.message }];
        }
        return [2 /*return*/];
    });
}); });
