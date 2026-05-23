/**
 * 快照 IPC 处理器
 * 数据库快照的创建、列表、还原、删除、设置
 */
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
import log from 'electron-log';
import path from 'path';
import fs from 'fs';
import { listSnapshots, createSnapshot, restoreSnapshot, getSnapshotsDir, setMaxSnapshots, getMaxSnapshots, getSnapshotIndex, saveSnapshotIndex } from '../database';
// ═══════════════════════════════════════════════════════════════════════════════
// 快照管理
// ═══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('db:snapshots:list', function () {
    try {
        var snapshots = listSnapshots();
        return { success: true, data: snapshots };
    }
    catch (error) {
        log.error('db:snapshots:list error:', error);
        return { success: false, error: error.message };
    }
});
ipcMain.handle('db:snapshots:create', function (_event, label) {
    try {
        var info = createSnapshot(label);
        if (!info) {
            return { success: false, error: '快照创建失败，数据库文件不存在' };
        }
        return { success: true, data: info };
    }
    catch (error) {
        log.error('db:snapshots:create error:', error);
        return { success: false, error: error.message };
    }
});
ipcMain.handle('db:snapshots:restore', function (_event, timestamp) { return __awaiter(void 0, void 0, void 0, function () {
    var ok;
    return __generator(this, function (_a) {
        try {
            ok = restoreSnapshot(timestamp);
            if (!ok) {
                return [2 /*return*/, { success: false, error: '快照文件不存在' }];
            }
            return [2 /*return*/, { success: true }];
        }
        catch (error) {
            log.error('db:snapshots:restore error:', error);
            return [2 /*return*/, { success: false, error: error.message }];
        }
        return [2 /*return*/];
    });
}); });
ipcMain.handle('db:snapshots:delete', function (_event, timestamp) {
    try {
        var snapshotDir = getSnapshotsDir();
        var filePath = path.join(snapshotDir, "".concat(timestamp, ".json"));
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        // Also remove from index
        var index = getSnapshotIndex();
        saveSnapshotIndex(index.filter(function (s) { return s.timestamp !== timestamp; }));
        return { success: true };
    }
    catch (error) {
        log.error('db:snapshots:delete error:', error);
        return { success: false, error: error.message };
    }
});
ipcMain.handle('db:snapshots:setMaxCount', function (_event, count) {
    try {
        setMaxSnapshots(count);
        return { success: true, data: { maxCount: getMaxSnapshots() } };
    }
    catch (error) {
        log.error('db:snapshots:setMaxCount error:', error);
        return { success: false, error: error.message };
    }
});
ipcMain.handle('db:snapshots:getMaxCount', function () {
    try {
        return { success: true, data: { maxCount: getMaxSnapshots() } };
    }
    catch (error) {
        log.error('db:snapshots:getMaxCount error:', error);
        return { success: false, error: error.message };
    }
});
