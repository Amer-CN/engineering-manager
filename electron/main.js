/**
 * 工程管家 - Electron 主进程入口
 *
 * 模块化架构：
 * - database.ts: 数据库初始化和操作
 * - ipc-handlers/: 按业务模块拆分的 IPC 处理器
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
import { app, BrowserWindow, globalShortcut, session, protocol, net } from 'electron';
import path from 'path';
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
import { initDatabase, saveDatabase, getUploadsPath } from './database';
// 注册自定义协议（必须在 app ready 之前）
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
    // 配置允许跨域访问百度API
    session.defaultSession.webRequest.onHeadersReceived(function (details, callback) {
        callback({
            responseHeaders: __assign(__assign({}, details.responseHeaders), { 'Access-Control-Allow-Origin': ['*'], 'Access-Control-Allow-Methods': ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], 'Access-Control-Allow-Headers': ['*'] })
        });
    });
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 700,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            webSecurity: false // 关闭web安全策略，允许跨域请求（用于百度OCR）
        },
        title: '工程管家',
        show: false
    });
    // 开发模式下加载 localhost
    if (process.env.VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
        mainWindow.webContents.openDevTools();
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
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                log.info('App ready');
                // 注册 contract-file 协议处理器，用于 PDF 附件预览
                protocol.handle('contract-file', function (request) {
                    try {
                        var url = new URL(request.url);
                        // pathname 以 / 开头，去掉前导 /
                        var filePath = decodeURIComponent(url.pathname.replace(/^\//, ''));
                        var contractDir = path.resolve(getUploadsPath(), 'contracts');
                        var requestedPath = path.resolve(contractDir, filePath);
                        // 安全检查：确保路径在 contracts 目录内
                        if (!requestedPath.startsWith(contractDir)) {
                            log.warn("Contract file security check failed: ".concat(requestedPath));
                            return new Response('Forbidden', { status: 403 });
                        }
                        log.info("Serving contract file: ".concat(filePath));
                        return net.fetch(pathToFileURL(requestedPath).href);
                    }
                    catch (err) {
                        log.error('Contract file protocol error:', err);
                        return new Response('Not Found', { status: 404 });
                    }
                });
                return [4 /*yield*/, initDatabase()];
            case 1:
                _a.sent();
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
});
