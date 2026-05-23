/**
 * 工程管家 - Electron 主进程入口
 *
 * 模块化架构：
 * - database.ts: 数据库初始化和操作
 * - ipc-handlers/: 按业务模块拆分的 IPC 处理器
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
import { app, BrowserWindow, globalShortcut, protocol, net } from 'electron';
import path from 'path';
import fs from 'fs';
import log from 'electron-log';
import { pathToFileURL } from 'url';
// 配置日志
log.transports.file.level = 'info';
log.transports.file.encoding = 'utf8';
log.transports.console.level = 'debug';
log.info('App starting...');
// ═══════════════════════════════════════════════════════════════════════════════
// 导入模块
// ═══════════════════════════════════════════════════════════════════════════════
import { initDatabase, saveDatabase, getUploadsPath, db, config, } from './database';
import { ensureUnclassifiedDirs } from './file-service';
// ═══════════════════════════════════════════════════════════════════════════════
// IPC 权限守卫（必须在导入 IPC handlers 之前安装）
// ═══════════════════════════════════════════════════════════════════════════════
import { installIpcGuard } from './ipc-guard';
installIpcGuard();
// SQLite 模块（可选，不影响 JSON 存储正常运行）
import { initSqliteDb, closeSqliteDb, loadPersistedReadMode } from './sqlite';
protocol.registerSchemesAsPrivileged([
    {
        scheme: 'contract-file',
        privileges: {
            bypassCSP: true,
            stream: true,
            supportFetchAPI: true
        }
    }
]);
// 导入 IPC 处理器（自动注册所有处理器）
import './ipc-handlers';
// ═══════════════════════════════════════════════════════════════════════════════
// 窗口管理
// ═══════════════════════════════════════════════════════════════════════════════
var mainWindow = null;
/**
 * 创建主窗口
 */
function createWindow() {
    // 防止重复创建窗口
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.focus();
        return;
    }
    log.info('Creating main window...');
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 700,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            webSecurity: true // 保持安全策略开启（OCR 已移至主进程 IPC）
        },
        title: '工程管家',
        show: false
    });
    // 开发模式下加载 localhost
    if (process.env.VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
        // DevTools 可通过 Ctrl+Shift+I 手动打开，不自动弹出
    }
    else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
    mainWindow.once('ready-to-show', function () {
        mainWindow === null || mainWindow === void 0 ? void 0 : mainWindow.show();
        log.info('Window ready');
    });
    // 注册全局快捷键：Ctrl+Shift+I 打开开发者工具
    globalShortcut.register('CommandOrControl+Shift+I', function () {
        if (mainWindow) {
            mainWindow.webContents.toggleDevTools();
            log.info('DevTools opened');
        }
    });
    // 窗口关闭时保存数据库
    mainWindow.on('close', function () {
        saveDatabase();
    });
}
// ═══════════════════════════════════════════════════════════════════════════════
// 应用生命周期
// ═══════════════════════════════════════════════════════════════════════════════
app.whenReady().then(function () { return __awaiter(void 0, void 0, void 0, function () {
    function saveB64(v, cat, sub) {
        if (!v || !v.startsWith("data:"))
            return v;
        var m = (v.match(/^data:([^;]+);/) || [])[1] || "";
        var e = ".bin";
        if (m.includes("jpeg"))
            e = ".jpg";
        else if (m.includes("png"))
            e = ".png";
        else if (m.includes("webp"))
            e = ".webp";
        else if (m.includes("gif"))
            e = ".gif";
        else if (m.includes("pdf"))
            e = ".pdf";
        else if (m.includes("word"))
            e = ".docx";
        else if (m.includes("sheet"))
            e = ".xlsx";
        var raw = v.split(",")[1];
        var buf = Buffer.from(raw, "base64");
        var name = Date.now() + "_" + Math.random().toString(36).substring(2, 8) + e;
        var d = path.join(uploadsBase, cat, sub);
        if (!fs.existsSync(d))
            fs.mkdirSync(d, { recursive: true });
        fs.writeFileSync(path.join(d, name), buf);
        migratedCount_1++;
        return name;
    }
    var uploadsBase, unclassifiedBase, renameMap, _i, _a, _b, eng, chn, engP, chnP, engExists, chnExists, contents, oldFlatChineseDirs, _c, oldFlatChineseDirs_1, dir, p, oldFlatEngDirs, _d, oldFlatEngDirs_1, dir, p, migratedCount_1, _e, _f, m, _g, _h, inv, _j, _k, r, _l, _m, p, parts, np, _o, _p, d, oldP, newP;
    var _q;
    return __generator(this, function (_r) {
        switch (_r.label) {
            case 0:
                log.info('App ready');
                // 注册 contract-file 协议处理器，用于合同附件 PDF 预览
                protocol.handle('contract-file', function (request) {
                    try {
                        var url = new URL(request.url);
                        var rawPath = decodeURIComponent(url.pathname.replace(/^\//, ''));
                        var uploadsPath = getUploadsPath();
                        // 解析路径：支持多种格式
                        //   "项目名/income/filename.pdf"  (project + subCategory)
                        //   "income/filename.pdf"         (subCategory only)
                        //   "filename.pdf"                (filename only)
                        var parts = rawPath.split('/');
                        var projectName = void 0;
                        var subCategory = void 0;
                        var fileName = void 0;
                        var idx = 0;
                        if (parts.length >= 2 && parts[0] !== 'income' && parts[0] !== 'expense' && !/^\d+$/.test(parts[0])) {
                            projectName = parts[0];
                            idx = 1;
                        }
                        else if (parts.length >= 2 && /^\d+$/.test(parts[0]) && (parts[1] === 'income' || parts[1] === 'expense')) {
                            idx = 1; // 跳过旧的数字 projectId
                        }
                        if (idx < parts.length && (parts[idx] === 'income' || parts[idx] === 'expense')) {
                            subCategory = parts[idx];
                            fileName = parts.slice(idx + 1).join('/');
                        }
                        else if (idx === 0) {
                            fileName = rawPath;
                        }
                        else {
                            fileName = parts.slice(idx).join('/');
                        }
                        // 中文目录名映射
                        var cnName = { income: '合同/收入', expense: '合同/支出' };
                        var subCats = subCategory ? [subCategory] : ['income', 'expense'];
                        var prefixes = [];
                        if (projectName !== undefined && projectName !== null && projectName !== '') {
                            prefixes.push(projectName);
                            prefixes.push('未分类');
                        }
                        else {
                            prefixes.push('未分类');
                        }
                        prefixes.push('_common'); // 兼容旧 _common 目录
                        prefixes.push(undefined);
                        var pathsToTry = [];
                        for (var _i = 0, prefixes_1 = prefixes; _i < prefixes_1.length; _i++) {
                            var prefix = prefixes_1[_i];
                            for (var _a = 0, subCats_1 = subCats; _a < subCats_1.length; _a++) {
                                var sub = subCats_1[_a];
                                if (prefix !== undefined) {
                                    pathsToTry.push(path.resolve(uploadsPath, prefix, cnName[sub], fileName));
                                    pathsToTry.push(path.resolve(uploadsPath, prefix, 'contracts', sub, fileName));
                                }
                                else {
                                    // 无前缀：中文 + 英文旧路径
                                    pathsToTry.push(path.resolve(uploadsPath, cnName[sub], fileName));
                                    pathsToTry.push(path.resolve(uploadsPath, 'contracts', sub, fileName));
                                }
                            }
                        }
                        // 旧路径兜底（contracts/ 根目录）
                        pathsToTry.push(path.resolve(uploadsPath, 'contracts', fileName));
                        for (var _b = 0, pathsToTry_1 = pathsToTry; _b < pathsToTry_1.length; _b++) {
                            var requestedPath = pathsToTry_1[_b];
                            if (!requestedPath.startsWith(uploadsPath)) {
                                continue;
                            }
                            if (fs.existsSync(requestedPath)) {
                                log.info("Serving contract file: ".concat(fileName));
                                return net.fetch(pathToFileURL(requestedPath).href);
                            }
                        }
                        log.warn("Contract file not found: ".concat(rawPath));
                        return new Response('Not Found', { status: 404 });
                    }
                    catch (err) {
                        log.error('Contract file protocol error:', err);
                        return new Response('Not Found', { status: 404 });
                    }
                });
                return [4 /*yield*/, initDatabase()
                    // ── 可选：初始化 SQLite 数据库 ────────────────────────────────────────────
                    // SQLite 与 JSON 并行运行，不强制迁移，仅作为渐进式替代的基础设施准备
                    // Phase 7.2：自动初始化，失败不影响应用正常启动
                ];
            case 1:
                _r.sent();
                // ── 可选：初始化 SQLite 数据库 ────────────────────────────────────────────
                // SQLite 与 JSON 并行运行，不强制迁移，仅作为渐进式替代的基础设施准备
                // Phase 7.2：自动初始化，失败不影响应用正常启动
                try {
                    if (config === null || config === void 0 ? void 0 : config.dataPath) {
                        initSqliteDb(config.dataPath);
                        loadPersistedReadMode(); // 从配置表恢复上次的读取模式
                        log.info('[SQLite] 初始化成功，路径:', config.dataPath);
                    }
                    else {
                        log.warn('[SQLite] 跳过初始化：dataPath 未就绪');
                    }
                }
                catch (err) {
                    log.warn('[SQLite] 初始化失败（不影响应用运行）:', err);
                }
                uploadsBase = getUploadsPath();
                unclassifiedBase = path.join(uploadsBase, '未分类');
                renameMap = {
                    "members/id-cards": "未分类/成员/身份证",
                    "members/contracts": "未分类/成员/劳动合同",
                    "members/training": "未分类/成员/安全培训",
                    "members/health": "未分类/成员/健康报告",
                    "members/certificates": "未分类/成员/特种证书",
                    "invoices/files": "未分类/发票/收票",
                    "payments/vouchers": "未分类/收付款/回款",
                    "partners/licenses": "未分类/合作单位/营业执照",
                    "partners/attachments": "未分类/合作单位/附件",
                    "contracts/income": "未分类/合同/收入",
                    "contracts/expense": "未分类/合同/支出",
                    "drawings/files": "未分类/图纸/文件",
                    "invoices/invoice_out": "未分类/发票/开票",
                    "payments/payment_out": "未分类/收付款/付款",
                };
                for (_i = 0, _a = Object.entries(renameMap); _i < _a.length; _i++) {
                    _b = _a[_i], eng = _b[0], chn = _b[1];
                    engP = path.join(uploadsBase, eng);
                    chnP = path.join(uploadsBase, chn);
                    engExists = fs.existsSync(engP);
                    chnExists = fs.existsSync(chnP);
                    if (engExists) {
                        if (chnExists) {
                            try {
                                contents = fs.readdirSync(chnP);
                                if (contents.length === 0) {
                                    fs.rmdirSync(chnP);
                                    fs.mkdirSync(path.dirname(chnP), { recursive: true });
                                    fs.renameSync(engP, chnP);
                                    log.info("Renamed (overwrote empty): " + eng + " → " + chn);
                                }
                            }
                            catch (e) {
                                log.warn("Error handling " + eng + ": " + e.message);
                            }
                        }
                        else {
                            try {
                                fs.mkdirSync(path.dirname(chnP), { recursive: true });
                                fs.renameSync(engP, chnP);
                                log.info("Renamed: " + eng + " → " + chn);
                            }
                            catch (e) {
                                log.warn("Failed to rename " + eng + ": " + e.message);
                            }
                        }
                    }
                }
                oldFlatChineseDirs = ['发票', '收付款', '合同', '合作单位', '成员', '图纸'];
                for (_c = 0, oldFlatChineseDirs_1 = oldFlatChineseDirs; _c < oldFlatChineseDirs_1.length; _c++) {
                    dir = oldFlatChineseDirs_1[_c];
                    p = path.join(uploadsBase, dir);
                    try {
                        if (fs.existsSync(p) && fs.readdirSync(p).length === 0) {
                            fs.rmdirSync(p, { recursive: true });
                            log.info("Removed empty flat dir: " + dir);
                        }
                    }
                    catch (e) { /* ignore */ }
                }
                oldFlatEngDirs = ['members', 'invoices', 'payments', 'partners', 'contracts', 'drawings'];
                for (_d = 0, oldFlatEngDirs_1 = oldFlatEngDirs; _d < oldFlatEngDirs_1.length; _d++) {
                    dir = oldFlatEngDirs_1[_d];
                    p = path.join(uploadsBase, dir);
                    try {
                        if (fs.existsSync(p) && fs.readdirSync(p).length === 0) {
                            fs.rmdirSync(p, { recursive: true });
                            log.info("Removed empty flat dir: " + dir);
                        }
                    }
                    catch (e) { /* ignore */ }
                }
                ensureUnclassifiedDirs();
                log.info("Unclassified directories ensured");
                // migrate base64 to disk files (one-time)
                if (!((_q = db._migrations) === null || _q === void 0 ? void 0 : _q.fileStorageV1)) {
                    log.info("Running file storage migration...");
                    migratedCount_1 = 0;
                    if (db.members)
                        for (_e = 0, _f = db.members; _e < _f.length; _e++) {
                            m = _f[_e];
                            m.idCardFront = saveB64(m.idCardFront, "成员", "身份证");
                            m.idCardBack = saveB64(m.idCardBack, "成员", "身份证");
                            m.contractFile = saveB64(m.contractFile, "成员", "劳动合同");
                            m.safetyTrainingFile = saveB64(m.safetyTrainingFile, "成员", "安全培训");
                            m.healthReportFile = saveB64(m.healthReportFile, "成员", "健康报告");
                            m.specialCertificateFile = saveB64(m.specialCertificateFile, "成员", "特种证书");
                        }
                    if (db.invoices)
                        for (_g = 0, _h = db.invoices; _g < _h.length; _g++) {
                            inv = _h[_g];
                            inv.fileUrl = saveB64(inv.fileUrl, "发票", inv.type === "invoice_out" ? "开票" : "收票");
                        }
                    if (db.paymentRecords)
                        for (_j = 0, _k = db.paymentRecords; _j < _k.length; _j++) {
                            r = _k[_j];
                            r.fileUrl = saveB64(r.fileUrl, "收付款", r.type === "invoice_out" ? "回款" : "付款");
                        }
                    if (db.partners)
                        for (_l = 0, _m = db.partners; _l < _m.length; _l++) {
                            p = _m[_l];
                            p.licenseFile = saveB64(p.licenseFile, "合作单位", "营业执照");
                            if (p.otherFiles && typeof p.otherFiles === "string") {
                                parts = p.otherFiles.split("|||");
                                np = parts.map(function (part) { return part.startsWith("data:") ? saveB64(part, "合作单位", "附件") : part; });
                                p.otherFiles = np.join("|||");
                            }
                        }
                    if (db.drawings)
                        for (_o = 0, _p = db.drawings; _o < _p.length; _o++) {
                            d = _p[_o];
                            if (d.filePath) {
                                oldP = path.join(uploadsBase, d.filePath);
                                newP = path.join(uploadsBase, "图纸/文件", d.filePath);
                                if (fs.existsSync(oldP) && !fs.existsSync(newP)) {
                                    try {
                                        fs.renameSync(oldP, newP);
                                    }
                                    catch (_s) {
                                        fs.copyFileSync(oldP, newP);
                                        fs.unlinkSync(oldP);
                                    }
                                }
                            }
                        }
                    if (!db._migrations)
                        db._migrations = {};
                    db._migrations.fileStorageV1 = true;
                    saveDatabase();
                    log.info("File storage migration complete. Migrated " + migratedCount_1 + " files.");
                }
                createWindow();
                return [2 /*return*/];
        }
    });
}); });
app.on('window-all-closed', function () {
    log.info('All windows closed');
    saveDatabase();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
app.on('before-quit', function () {
    log.info('App quitting');
    saveDatabase();
    // 关闭 SQLite（WAL checkpoint + 连接释放）
    try {
        closeSqliteDb();
    }
    catch (err) {
        log.warn('[SQLite] 关闭时异常（忽略）:', err);
    }
});
