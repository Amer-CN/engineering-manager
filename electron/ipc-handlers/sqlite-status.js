/**
 * SQLite 状态管理 IPC Handler
 *
 * 提供：
 * - sqlite:status — 查询 SQLite 是否已就绪、迁移状态
 * - sqlite:enable — 启用 SQLite（初始化数据库）
 * - sqlite:migrate — 从 JSON 迁移数据到 SQLite
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
import log from 'electron-log';
import * as fs from 'fs';
import { initSqliteDb, isSqliteReady, getSqliteDbPath, getSqliteSummary, migrateFromJson, isSqliteMigrated, markMigrationComplete, getReadMode, setReadMode, loadPersistedReadMode, } from '../sqlite';
import { db as jsonDb, config, getDbPath } from '../database';
// ═══════════════════════════════════════════════════════════════════════════════
// sqlite:status — 获取 SQLite 状态
// ═══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('sqlite:status', function () { return __awaiter(void 0, void 0, void 0, function () {
    var ready, migrated, dbPath, summary;
    return __generator(this, function (_a) {
        try {
            ready = isSqliteReady();
            migrated = ready ? isSqliteMigrated() : false;
            dbPath = getSqliteDbPath();
            summary = ready ? getSqliteSummary() : null;
            return [2 /*return*/, {
                    success: true,
                    ready: ready,
                    migrated: migrated,
                    dbPath: dbPath,
                    summary: summary,
                    readMode: getReadMode(),
                }];
        }
        catch (err) {
            log.error('sqlite:status error:', err);
            return [2 /*return*/, {
                    success: false,
                    ready: false,
                    migrated: false,
                    dbPath: null,
                    summary: null,
                    error: String(err),
                }];
        }
        return [2 /*return*/];
    });
}); });
// ═══════════════════════════════════════════════════════════════════════════════
// sqlite:enable — 初始化 SQLite 数据库
// ═══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('sqlite:enable', function () { return __awaiter(void 0, void 0, void 0, function () {
    var dataPath, jsonDbPath, backupSuffix, backupPath;
    return __generator(this, function (_a) {
        try {
            if (isSqliteReady()) {
                return [2 /*return*/, { success: true, message: 'SQLite 已经初始化' }];
            }
            dataPath = config === null || config === void 0 ? void 0 : config.dataPath;
            if (!dataPath) {
                return [2 /*return*/, { success: false, message: '数据路径未配置，请先完成应用初始化' }];
            }
            jsonDbPath = getDbPath();
            if (fs.existsSync(jsonDbPath)) {
                backupSuffix = '.before-sqlite-enable-' + Date.now() + '.bak';
                backupPath = jsonDbPath + backupSuffix;
                try {
                    fs.copyFileSync(jsonDbPath, backupPath);
                    log.info('sqlite:enable — 已备份 engineering.json 到:', backupPath);
                }
                catch (backupErr) {
                    log.error('sqlite:enable — 备份失败，中止启用:', backupErr);
                    return [2 /*return*/, { success: false, message: '备份数据失败，为避免数据丢失已中止操作：' + String(backupErr) }];
                }
            }
            initSqliteDb(dataPath);
            loadPersistedReadMode(); // 从配置表恢复上次的读取模式
            log.info('sqlite:enable — SQLite 初始化成功');
            return [2 /*return*/, { success: true, message: 'SQLite 初始化成功' }];
        }
        catch (err) {
            log.error('sqlite:enable error:', err);
            return [2 /*return*/, { success: false, message: String(err) }];
        }
        return [2 /*return*/];
    });
}); });
// ═══════════════════════════════════════════════════════════════════════════════
// sqlite:migrate — 将 JSON 数据迁移到 SQLite
// ═══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('sqlite:migrate', function (_event_1) {
    var args_1 = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args_1[_i - 1] = arguments[_i];
    }
    return __awaiter(void 0, __spreadArray([_event_1], args_1, true), void 0, function (_event, force) {
        var sqliteDbPath, backupSuffix, backupPath, jsonDbPath, result;
        if (force === void 0) { force = false; }
        return __generator(this, function (_a) {
            try {
                if (!isSqliteReady()) {
                    return [2 /*return*/, {
                            success: false,
                            message: 'SQLite 未初始化，请先启用 SQLite',
                            migratedTables: 0,
                            totalRows: 0,
                            verificationPassed: false,
                            errors: ['SQLite not initialized'],
                            warnings: [],
                            duration: 0,
                        }];
                }
                // 非强制模式下，若已迁移则跳过
                if (!force && isSqliteMigrated()) {
                    return [2 /*return*/, {
                            success: true,
                            message: '数据已迁移过（跳过重复迁移）',
                            migratedTables: 0,
                            totalRows: 0,
                            verificationPassed: true,
                            errors: [],
                            warnings: [],
                            duration: 0,
                        }];
                }
                sqliteDbPath = getSqliteDbPath();
                if (sqliteDbPath && fs.existsSync(sqliteDbPath)) {
                    backupSuffix = '.before-migrate-' + Date.now() + '.bak';
                    backupPath = sqliteDbPath + backupSuffix;
                    try {
                        fs.copyFileSync(sqliteDbPath, backupPath);
                        log.info('sqlite:migrate — 已备份 SQLite 数据库到:', backupPath);
                    }
                    catch (backupErr) {
                        log.error('sqlite:migrate — 备份失败，中止迁移:', backupErr);
                        return [2 /*return*/, {
                                success: false,
                                message: '备份 SQLite 数据库失败，为避免数据丢失已中止迁移：' + String(backupErr),
                                migratedTables: 0,
                                totalRows: 0,
                                verificationPassed: false,
                                errors: [String(backupErr)],
                                warnings: [],
                                duration: 0,
                            }];
                    }
                }
                log.info('sqlite:migrate — 开始迁移...');
                jsonDbPath = getDbPath();
                result = migrateFromJson(jsonDb, jsonDbPath);
                if (result.success) {
                    markMigrationComplete(); // 标记迁移已完成
                    log.info('sqlite:migrate — 已标记迁移完成');
                }
                loadPersistedReadMode(); // 迁移完成后加载持久化配置
                log.info("sqlite:migrate \u2014 \u5B8C\u6210\uFF1A".concat(result.migratedTables, " \u8868\uFF0C").concat(result.totalRows, " \u884C\uFF0C").concat(result.errors.length, " \u9519\u8BEF\uFF0CverificationPassed=").concat(result.verificationPassed));
                return [2 /*return*/, result];
            }
            catch (err) {
                log.error('sqlite:migrate error:', err);
                return [2 /*return*/, {
                        success: false,
                        message: String(err),
                        migratedTables: 0,
                        totalRows: 0,
                        verificationPassed: false,
                        errors: [String(err)],
                        warnings: [],
                        duration: 0,
                    }];
            }
            return [2 /*return*/];
        });
    });
});
// ═══════════════════════════════════════════════════════════════════════════════
// sqlite:getReadMode — 获取当前读取模式
// ═══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('sqlite:getReadMode', function () {
    return { success: true, readMode: getReadMode() };
});
// ═══════════════════════════════════════════════════════════════════════════════
// sqlite:setReadMode — 设置读取模式
// ═══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('sqlite:setReadMode', function (_, mode) {
    var validModes = ['dual', 'sqlite-primary', 'json-only'];
    if (!validModes.includes(mode)) {
        return { success: false, error: "\u65E0\u6548\u7684\u8BFB\u53D6\u6A21\u5F0F: ".concat(mode, "\uFF0C\u53EF\u9009\u503C: ").concat(validModes.join(', ')) };
    }
    setReadMode(mode);
    return { success: true, readMode: getReadMode() };
});
