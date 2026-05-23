/**
 * 数据库模块
 *
 * 处理数据库初始化、持久化和迁移
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
import { app } from 'electron';
import path from 'path';
import log from 'electron-log';
import fs from 'fs';
import crypto from 'crypto';
import { isDataUrl, guessExtFromDataUrl, saveFile } from './file-service';
function getSeedDataPath() {
    if (fs.existsSync(path.join(__dirname, '..', 'public', 'seed-data.json'))) {
        return path.join(__dirname, '..', 'public', 'seed-data.json');
    }
    return path.join(process.resourcesPath, 'seed-data.json');
}
// ═══════════════════════════════════════════════════════════════════════════════
// 导出变量
// ═══════════════════════════════════════════════════════════════════════════════
export var config;
export var db;
export var dbReady = false;
// ═══════════════════════════════════════════════════════════════════════════════
// 常量
// ═══════════════════════════════════════════════════════════════════════════════
export var defaultUserDataPath = app.getPath('userData');
// 打包后默认数据存储路径（安装时可让用户自定义）
export var defaultDataPath = app.isPackaged ? 'D:\\Company Database' : app.getPath('userData');
// ═══════════════════════════════════════════════════════════════════════════════
// 路径函数
// ═══════════════════════════════════════════════════════════════════════════════
export function getConfigPath() {
    return path.join(defaultUserDataPath, 'config.json');
}
export function getDbPath() {
    return path.join(config.dataPath, 'engineering.json');
}
export function getUploadsPath() {
    return path.join(config.dataPath, 'uploads');
}
export function getSnapshotsDir() {
    var dir = path.join(config.dataPath, 'db-snapshots');
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
}
export function getSnapshotIndexPath() {
    return path.join(getSnapshotsDir(), 'index.json');
}
var maxSnapshots = 200;
export function setMaxSnapshots(n) {
    maxSnapshots = Math.max(50, Math.min(1000, n));
}
export function getMaxSnapshots() {
    return maxSnapshots;
}
export function getSnapshotIndex() {
    try {
        var indexPath = getSnapshotIndexPath();
        if (fs.existsSync(indexPath)) {
            return JSON.parse(fs.readFileSync(indexPath, 'utf8'));
        }
    }
    catch (e) {
        log.warn('Failed to read snapshot index, starting fresh:', e);
    }
    return [];
}
export function saveSnapshotIndex(index) {
    fs.writeFileSync(getSnapshotIndexPath(), JSON.stringify(index, null, 2), 'utf8');
}
/**
 * 获取当前数据库中各表的数据量概况
 */
function getDbSummary() {
    var tables = [
        'projects', 'members', 'materials', 'expenses', 'costLedger',
        'drawings', 'partners', 'incomeContracts', 'expenseContracts',
        'workerTeams', 'settlements', 'templates', 'inventoryItems', 'invoices',
        'paymentRecords', 'workerTransferRecords', 'auditLogs'
    ];
    var summary = {};
    for (var _i = 0, tables_1 = tables; _i < tables_1.length; _i++) {
        var table = tables_1[_i];
        if (Array.isArray(db[table])) {
            summary[table] = db[table].length;
        }
    }
    return summary;
}
/**
 * 创建快照：在 saveDatabase 覆盖写入前调用
 */
export function createSnapshot(label) {
    try {
        var dbPath = getDbPath();
        if (!fs.existsSync(dbPath))
            return null;
        var timestamp = new Date().toISOString().replace(/[:]/g, '-');
        var snapshotDir = getSnapshotsDir();
        var snapshotFile = path.join(snapshotDir, "".concat(timestamp, ".json"));
        fs.copyFileSync(dbPath, snapshotFile);
        var info = {
            timestamp: timestamp,
            fileSize: fs.statSync(snapshotFile).size,
            dbSummary: getDbSummary(),
            label: label || undefined,
        };
        // 更新索引
        var index = getSnapshotIndex();
        index.push(info);
        saveSnapshotIndex(index);
        return info;
    }
    catch (error) {
        log.error('Failed to create snapshot:', error);
        return null;
    }
}
/**
 * 清理旧快照：保留最近 N 个
 */
export function cleanOldSnapshots() {
    try {
        var index = getSnapshotIndex();
        if (index.length <= maxSnapshots)
            return;
        var toRemove = index.slice(0, index.length - maxSnapshots);
        var keep = index.slice(index.length - maxSnapshots);
        var snapshotDir = getSnapshotsDir();
        for (var _i = 0, toRemove_1 = toRemove; _i < toRemove_1.length; _i++) {
            var snap = toRemove_1[_i];
            var filePath = path.join(snapshotDir, "".concat(snap.timestamp, ".json"));
            try {
                if (fs.existsSync(filePath))
                    fs.unlinkSync(filePath);
            }
            catch (e) {
                log.warn("Failed to delete old snapshot: ".concat(filePath), e);
            }
        }
        saveSnapshotIndex(keep);
        log.info("Cleaned ".concat(toRemove.length, " old snapshots, kept ").concat(keep.length));
    }
    catch (error) {
        log.error('Failed to clean old snapshots:', error);
    }
}
/**
 * 获取快照列表
 */
export function listSnapshots() {
    return getSnapshotIndex().reverse(); // 最新的在前
}
/**
 * 还原到指定时间点的快照
 */
export function restoreSnapshot(timestamp) {
    try {
        var snapshotDir = getSnapshotsDir();
        var snapshotFile = path.join(snapshotDir, "".concat(timestamp, ".json"));
        if (!fs.existsSync(snapshotFile))
            return false;
        // 还原前先自动备份当前状态
        createSnapshot('pre-restore');
        // 原子还原：先写临时文件，再 rename 覆盖
        var dbPath = getDbPath();
        var tmpPath = dbPath + '.tmp';
        fs.copyFileSync(snapshotFile, tmpPath);
        fs.renameSync(tmpPath, dbPath);
        log.info("Database restored to snapshot: ".concat(timestamp));
        return true;
    }
    catch (error) {
        log.error('Failed to restore snapshot:', error);
        return false;
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// 配置管理
// ═══════════════════════════════════════════════════════════════════════════════
export function loadConfig() {
    var configPath = getConfigPath();
    if (fs.existsSync(configPath)) {
        try {
            var data = fs.readFileSync(configPath, 'utf8');
            var cfg = JSON.parse(data);
            log.info('Config loaded:', configPath);
            // 确保路径有效
            if (!cfg.dataPath || !fs.existsSync(cfg.dataPath)) {
                cfg.dataPath = defaultDataPath;
                saveConfig(cfg);
            }
            return cfg;
        }
        catch (e) {
            log.warn('Failed to load config, using default:', e);
        }
    }
    // 默认配置（首次启动）
    var defaultConfig = {
        dataPath: defaultDataPath
    };
    saveConfig(defaultConfig);
    return defaultConfig;
}
export function saveConfig(cfg) {
    try {
        fs.writeFileSync(getConfigPath(), JSON.stringify(cfg, null, 2), 'utf8');
        log.info('Config saved:', getConfigPath());
    }
    catch (error) {
        log.error('Failed to save config:', error);
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// 密码哈希函数
// ═══════════════════════════════════════════════════════════════════════════════
var DEFAULT_ADMIN_PASSWORD = 'admin123';
// 默认角色权限定义（与 auth.ts 中 SYSTEM_ROLE_DEFAULTS 保持一致）
var DEFAULT_ADMIN_PERMISSIONS = [
    'dashboard:read', 'dashboard:export',
    'projects:create', 'projects:read', 'projects:update', 'projects:delete', 'projects:export', 'projects:import',
    'contracts:create', 'contracts:read', 'contracts:update', 'contracts:delete', 'contracts:approve', 'contracts:export', 'contracts:import',
    'partners:create', 'partners:read', 'partners:update', 'partners:delete', 'partners:export', 'partners:import',
    'members:create', 'members:read', 'members:update', 'members:delete', 'members:export', 'members:import',
    'wages:create', 'wages:read', 'wages:update', 'wages:delete', 'wages:approve', 'wages:export',
    'settlement:create', 'settlement:read', 'settlement:update', 'settlement:delete', 'settlement:approve', 'settlement:export',
    'inventory:create', 'inventory:read', 'inventory:update', 'inventory:delete', 'inventory:export', 'inventory:import',
    'invoices:create', 'invoices:read', 'invoices:update', 'invoices:delete', 'invoices:export',
    'expenses:create', 'expenses:read', 'expenses:update', 'expenses:delete', 'expenses:export',
    'costLedger:create', 'costLedger:read', 'costLedger:update', 'costLedger:delete', 'costLedger:export',
    'drawings:create', 'drawings:read', 'drawings:update', 'drawings:delete', 'drawings:export', 'drawings:import',
    'settings:read', 'settings:update',
    'users:create', 'users:read', 'users:update', 'users:delete',
    'roles:read', 'roles:update',
    'audit_logs:read', 'audit_logs:export',
];
var DEFAULT_MANAGER_PERMISSIONS = [
    'dashboard:read', 'dashboard:export',
    'projects:create', 'projects:read', 'projects:update', 'projects:delete', 'projects:export', 'projects:import',
    'contracts:create', 'contracts:read', 'contracts:update', 'contracts:approve', 'contracts:export', 'contracts:import',
    'partners:create', 'partners:read', 'partners:update', 'partners:export',
    'members:create', 'members:read', 'members:update', 'members:export',
    'wages:read', 'wages:export',
    'settlement:create', 'settlement:read', 'settlement:update', 'settlement:export',
    'inventory:create', 'inventory:read', 'inventory:update', 'inventory:export', 'inventory:import',
    'invoices:read', 'invoices:export',
    'expenses:create', 'expenses:read', 'expenses:update', 'expenses:export',
    'costLedger:create', 'costLedger:read', 'costLedger:update', 'costLedger:export',
    'drawings:create', 'drawings:read', 'drawings:update', 'drawings:export', 'drawings:import',
];
var DEFAULT_ACCOUNTANT_PERMISSIONS = [
    'dashboard:read', 'dashboard:export',
    'projects:read', 'projects:export',
    'contracts:read', 'contracts:approve', 'contracts:export',
    'partners:read', 'partners:export',
    'members:read', 'members:export',
    'wages:create', 'wages:read', 'wages:update', 'wages:approve', 'wages:export',
    'settlement:create', 'settlement:read', 'settlement:update', 'settlement:approve', 'settlement:export',
    'inventory:read', 'inventory:export',
    'invoices:create', 'invoices:read', 'invoices:update', 'invoices:delete', 'invoices:export',
    'expenses:create', 'expenses:read', 'expenses:update', 'expenses:delete', 'expenses:export',
    'costLedger:create', 'costLedger:read', 'costLedger:update', 'costLedger:delete', 'costLedger:export',
    'audit_logs:read', 'audit_logs:export',
];
var DEFAULT_WORKER_PERMISSIONS = [
    'dashboard:read',
    'projects:read', 'projects:export',
    'contracts:read', 'contracts:export',
    'partners:read',
    'members:read',
    'inventory:read', 'inventory:export',
    'invoices:read',
    'expenses:read', 'expenses:export',
    'costLedger:read', 'costLedger:export',
    'drawings:read',
];
/**
 * 生成密码哈希
 */
export function hashPassword(password, salt, version) {
    if (version === void 0) { version = 2; }
    var generatedSalt = salt || crypto.randomBytes(16).toString('hex');
    var iterations = version >= 2 ? 210000 : 10000;
    var hash = crypto.pbkdf2Sync(password, generatedSalt, iterations, 64, 'sha512').toString('hex');
    return { hash: hash, salt: generatedSalt };
}
/**
 * 验证密码
 */
export function verifyPassword(password, hash, salt, version) {
    var v = version || 1;
    var computedHash = hashPassword(password, salt, v).hash;
    return computedHash === hash;
}
/**
 * 创建默认管理员账号
 */
function createDefaultAdmin() {
    var _a = hashPassword(DEFAULT_ADMIN_PASSWORD), hash = _a.hash, salt = _a.salt;
    // Write initial password to a file so admin can find it
    try {
        var pwFile = path.join(app.getPath('userData'), 'admin-initial-password.txt');
        fs.writeFileSync(pwFile, "\u5DE5\u7A0B\u7BA1\u5BB6\u521D\u59CB\u7BA1\u7406\u5458\u5BC6\u7801\n\u7528\u6237\u540D: admin\n\u5BC6\u7801: ".concat(DEFAULT_ADMIN_PASSWORD, "\n\u6B64\u6587\u4EF6\u53EF\u5B89\u5168\u5220\u9664\u3002\n"), 'utf-8');
        log.info('Initial admin password written to:', pwFile);
    }
    catch (e) {
        log.error('Failed to write initial password file:', e);
    }
    return {
        id: 'admin-' + Date.now(),
        username: 'admin',
        passwordHash: hash,
        passwordSalt: salt,
        passwordHashVersion: 2,
        roleId: 'admin',
        status: 'active',
        displayName: '系统管理员',
        createdAt: new Date().toISOString(),
        lastLoginAt: null,
        mustChangePassword: true // 强制首次登录修改密码
    };
}
/**
 * 初始化默认数据
 */
function initDefaultData() {
    // 如果用户表为空，创建默认管理员
    if (!db.users || db.users.length === 0) {
        var defaultAdmin = createDefaultAdmin();
        db.users = [defaultAdmin];
        log.info('Created default admin user: admin / admin123');
    }
    // 如果角色表为空，种子默认角色
    if (!db.roles || db.roles.length === 0) {
        db.roles = [
            { id: 'admin', name: '管理员', description: '系统管理员，拥有所有权限', isSystem: true, permissions: DEFAULT_ADMIN_PERMISSIONS },
            { id: 'manager', name: '项目经理', description: '项目管理人员，拥有项目相关所有权限', isSystem: true, permissions: DEFAULT_MANAGER_PERMISSIONS },
            { id: 'accountant', name: '财务人员', description: '财务管理人员，负责账务和发票', isSystem: true, permissions: DEFAULT_ACCOUNTANT_PERMISSIONS },
            { id: 'worker', name: '普通员工', description: '普通员工，只有查看权限', isSystem: true, permissions: DEFAULT_WORKER_PERMISSIONS },
        ];
        log.info('Seeded default roles');
    }
}
/**
 * 加载种子示例数据（首次启动时复制到用户数据目录）
 */
function loadSeedData() {
    try {
        var seedPath = getSeedDataPath();
        if (!fs.existsSync(seedPath)) {
            log.info('No seed data file found at:', seedPath);
            return;
        }
        var seedJson = fs.readFileSync(seedPath, 'utf8');
        var seed = JSON.parse(seedJson);
        // 将种子数据合并到空数据库中（只合并非空集合）
        var merged = 0;
        for (var _i = 0, _a = Object.entries(seed); _i < _a.length; _i++) {
            var _b = _a[_i], key = _b[0], value = _b[1];
            if (Array.isArray(value) && value.length > 0) {
                if (Array.isArray(db[key]) && db[key].length === 0) {
                    db[key] = value;
                    merged++;
                }
            }
        }
        log.info("Seed data loaded: ".concat(merged, " collections populated from ").concat(seedPath));
    }
    catch (e) {
        log.error('Failed to load seed data:', e);
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// 数据库操作
// ═══════════════════════════════════════════════════════════════════════════════
export function saveDatabase() {
    try {
        var dbPath = getDbPath();
        var dataToWrite = JSON.stringify(db, null, 2);
        var writeSize = dataToWrite.length;
        // ── 数据完整性防护 ─────────────────────────────────────────────
        // 如果 db 对象明显为空（所有关键数组都为空），
        // 但磁盘上的已有文件较大（含真实数据），拒绝写入并创建紧急备份
        var hasRealData = (db.projects && db.projects.length > 0) ||
            (db.members && db.members.length > 0) ||
            (db.costLedger && db.costLedger.length > 0) ||
            (db.workers && db.workers.length > 0) ||
            (db.wages && db.wages.length > 0);
        if (!hasRealData && fs.existsSync(dbPath)) {
            var existingStats = fs.statSync(dbPath);
            // 现有文件 > 10KB 说明里面有真实数据，但当前 db 对象为空——拒绝覆盖
            if (existingStats.size > 10240) {
                log.error('【数据保护】拒绝保存：当前内存数据为空，但磁盘文件有 ' +
                    existingStats.size + ' 字节真实数据。已创建紧急备份。');
                var emergencyBackup = dbPath + '.EMERGENCY-' + Date.now() + '.bak';
                try {
                    fs.copyFileSync(dbPath, emergencyBackup);
                    log.info('紧急备份已创建：', emergencyBackup);
                }
                catch (e) {
                    log.error('创建紧急备份失败：', e);
                }
                return false; // ← 关键：拒绝写入
            }
        }
        // ─────────────────────────────────────────────────────────────────
        // 1. 创建快照（在覆盖写入之前）
        createSnapshot();
        // 2. 原子写入：先写临时文件，再 rename 覆盖
        var tmpPath = dbPath + '.tmp';
        fs.writeFileSync(tmpPath, dataToWrite, 'utf8');
        fs.renameSync(tmpPath, dbPath);
        log.info('Database saved to:', dbPath);
        // 3. 清理旧快照
        cleanOldSnapshots();
        return true;
    }
    catch (error) {
        log.error('Failed to save database:', error);
        return false;
    }
}
export function initializeDatabase() {
    return {
        projects: [],
        members: [],
        tasks: [],
        materials: [],
        expenses: [],
        costLedger: [],
        costLedgerCategories: [],
        drawings: [],
        partners: [],
        regions: [],
        supervisors: [],
        incomeContracts: [],
        incomeRecords: [],
        expenseContracts: [],
        expenseRecords: [],
        agreementContracts: [],
        workerTeams: [],
        workerTransferRecords: [],
        settlements: [],
        contractTemplates: [],
        templates: [],
        inventoryItems: [],
        inventoryTransactions: [],
        invoices: [],
        paymentRecords: [],
        users: [],
        wages: [],
        attendances: [],
        projectMembers: [],
        auditLogs: [],
        roles: [],
        workers: [],
        projectWorkers: [],
        salaryHistory: [],
        wageHistory: [],
        departments: []
    };
}
// ═══════════════════════════════════════════════════════════════════════════════
// 数据库初始化
// ═══════════════════════════════════════════════════════════════════════════════
export function initDatabase() {
    return __awaiter(this, void 0, void 0, function () {
        var uploadsPath, dbPath, data, backupPath, snapshotDir, restored, snapshots, latest, snapData, snapHasData, hasData;
        var _a;
        return __generator(this, function (_b) {
            try {
                log.info('Initializing database...');
                // 加载配置
                config = loadConfig();
                log.info('Data path:', config.dataPath);
                // 确保数据目录存在
                if (!fs.existsSync(config.dataPath)) {
                    try {
                        fs.mkdirSync(config.dataPath, { recursive: true });
                    }
                    catch (e) {
                        log.warn('无法创建数据目录，回退到默认用户数据路径:', e);
                        config.dataPath = app.getPath('userData');
                        saveConfig(config);
                        if (!fs.existsSync(config.dataPath)) {
                            fs.mkdirSync(config.dataPath, { recursive: true });
                        }
                    }
                }
                uploadsPath = getUploadsPath();
                if (!fs.existsSync(uploadsPath)) {
                    fs.mkdirSync(uploadsPath, { recursive: true });
                }
                dbPath = getDbPath();
                if (fs.existsSync(dbPath)) {
                    try {
                        data = fs.readFileSync(dbPath, 'utf8');
                        db = JSON.parse(data);
                        // 确保新字段存在
                        ensureDatabaseFields();
                        initDefaultData();
                        migrateDatabase();
                        migrateSalaryHistoryBackfill();
                        // 文件存储迁移（将旧 base64 数据写出为磁盘文件）
                        migrateFileStorageV1();
                        saveDatabase();
                        log.info('Database loaded:', dbPath);
                    }
                    catch (e) {
                        log.error('Failed to load/migrate database:', e);
                        backupPath = dbPath + '.corrupted.' + Date.now() + '.bak';
                        try {
                            fs.copyFileSync(dbPath, backupPath);
                            log.info('Corrupted database backed up to:', backupPath);
                        }
                        catch (_) { }
                        snapshotDir = path.join(config.dataPath, 'db-snapshots');
                        restored = false;
                        if (fs.existsSync(snapshotDir)) {
                            try {
                                snapshots = fs.readdirSync(snapshotDir)
                                    .filter(function (f) { return f.endsWith('.json') && f !== 'index.json'; })
                                    .sort()
                                    .reverse();
                                if (snapshots.length > 0) {
                                    latest = path.join(snapshotDir, snapshots[0]);
                                    log.warn('检测到数据库异常，尝试从快照恢复:', snapshots[0]);
                                    snapData = JSON.parse(fs.readFileSync(latest, 'utf8'));
                                    snapHasData = (snapData.projects && snapData.projects.length > 0) ||
                                        (snapData.members && snapData.members.length > 0) ||
                                        (snapData.costLedger && snapData.costLedger.length > 0);
                                    if (snapHasData) {
                                        db = snapData;
                                        ensureDatabaseFields();
                                        if (!db._migrations)
                                            db._migrations = {};
                                        db._migrations.fileStorageV1 = true;
                                        db._migrations.salaryHistoryBackfillV1 = true;
                                        saveDatabase();
                                        log.info('从快照恢复成功，成员数:', (_a = db.members) === null || _a === void 0 ? void 0 : _a.length);
                                        restored = true;
                                    }
                                }
                            }
                            catch (snapErr) {
                                log.error('从快照恢复失败:', snapErr);
                            }
                        }
                        // 3. 快照恢复失败，才回退到空库
                        if (!restored) {
                            if (!db || !db.projects) {
                                log.warn('Database unreadable, starting fresh');
                                db = initializeDatabase();
                                initDefaultData();
                                saveDatabase();
                            }
                            else {
                                log.warn('Database loaded but migration had errors — keeping loaded data');
                                hasData = (db.projects && db.projects.length > 0) ||
                                    (db.members && db.members.length > 0);
                                if (hasData) {
                                    saveDatabase();
                                }
                                else {
                                    log.error('【数据保护】加载的数据为空，拒绝保存');
                                }
                            }
                        }
                    }
                }
                else {
                    log.info('Creating new database:', dbPath);
                    db = initializeDatabase();
                    initDefaultData();
                    loadSeedData();
                    saveDatabase();
                }
                dbReady = true;
                log.info('Database ready');
            }
            catch (error) {
                log.error('Database init failed:', error);
                dbReady = true;
            }
            return [2 /*return*/];
        });
    });
}
// 确保数据库字段存在
function ensureDatabaseFields() {
    var changed = false;
    if (!db.projects) {
        db.projects = [];
        changed = true;
    }
    if (!db.members) {
        db.members = [];
        changed = true;
    }
    if (!db.materials) {
        db.materials = [];
        changed = true;
    }
    if (!db.expenses) {
        db.expenses = [];
        changed = true;
    }
    if (!db.costLedger) {
        db.costLedger = [];
        changed = true;
    }
    if (!db.costLedgerCategories) {
        db.costLedgerCategories = [];
        changed = true;
    }
    if (!db.drawings) {
        db.drawings = [];
        changed = true;
    }
    if (!db.partners) {
        db.partners = [];
        changed = true;
    }
    if (!db.regions) {
        db.regions = [];
        changed = true;
    }
    if (!db.supervisors) {
        db.supervisors = [];
        changed = true;
    }
    if (!db.incomeContracts) {
        db.incomeContracts = [];
        changed = true;
    }
    if (!db.incomeRecords) {
        db.incomeRecords = [];
        changed = true;
    }
    if (!db.expenseContracts) {
        db.expenseContracts = [];
        changed = true;
    }
    if (!db.expenseRecords) {
        db.expenseRecords = [];
        changed = true;
    }
    if (!db.agreementContracts) {
        db.agreementContracts = [];
        changed = true;
    }
    if (!db.workerTeams) {
        db.workerTeams = [];
        changed = true;
    }
    if (!db.workerTransferRecords) {
        db.workerTransferRecords = [];
        changed = true;
    }
    if (!db.invoices) {
        db.invoices = [];
        changed = true;
    }
    if (!db.paymentRecords) {
        db.paymentRecords = [];
        changed = true;
    }
    if (!db.wages) {
        db.wages = [];
        changed = true;
    }
    if (!db.attendances) {
        db.attendances = [];
        changed = true;
    }
    if (!db.projectMembers) {
        db.projectMembers = [];
        changed = true;
    }
    if (!db.auditLogs) {
        db.auditLogs = [];
        changed = true;
    }
    if (!db.roles) {
        db.roles = [];
        changed = true;
    }
    if (!db.settlements) {
        db.settlements = [];
        changed = true;
    }
    if (!db.contractTemplates) {
        db.contractTemplates = [];
        changed = true;
    }
    if (!db.templates) {
        db.templates = [];
        changed = true;
    }
    if (!db.inventoryItems) {
        db.inventoryItems = [];
        changed = true;
    }
    if (!db.inventoryTransactions) {
        db.inventoryTransactions = [];
        changed = true;
    }
    if (!db.workers) {
        db.workers = [];
        changed = true;
    }
    if (!db.projectWorkers) {
        db.projectWorkers = [];
        changed = true;
    }
    if (!db.departments) {
        db.departments = [];
        changed = true;
    }
    if (!db.salaryHistory) {
        db.salaryHistory = [];
        changed = true;
    }
    if (!db.wageHistory) {
        db.wageHistory = [];
        changed = true;
    }
    if (!db.users) {
        db.users = [];
        initDefaultData();
        changed = true;
    }
    if (changed)
        saveDatabase();
}
// 旧发票票种 → 新票种映射（所有存量发票均为专票）
function mapLegacyInvoiceKind(kind) {
    if (kind === 'electronic')
        return 'electronic_special';
    if (kind === 'paper')
        return 'paper_special';
    // 已是新格式或未知，保持不变；无值默认纸专
    return kind || 'paper_special';
}
// 迁移数据库
function migrateDatabase() {
    var _a;
    // 迁移旧发票数据：添加新字段
    if (db.invoices && db.invoices.length > 0) {
        db.invoices = db.invoices.map(function (inv) { return (__assign(__assign({}, inv), { invoiceKind: mapLegacyInvoiceKind(inv.invoiceKind), sellerId: inv.sellerId || inv.partnerId || null, buyerId: inv.buyerId || null, contractId: inv.contractId || null, receivedAmount: inv.receivedAmount || 0 })); });
    }
    // 迁移旧收款记录数据：添加新字段
    if (db.paymentRecords && db.paymentRecords.length > 0) {
        db.paymentRecords = db.paymentRecords.map(function (r) { return (__assign(__assign({}, r), { projectId: r.projectId || null, partnerId: r.partnerId || null, contractId: r.contractId || null, invoiceDetails: r.invoiceDetails || [], createdAt: r.createdAt || (r.id ? new Date(r.id).toISOString() : new Date().toISOString()), recordDate: r.recordDate || r.date || (r.id ? new Date(r.id).toISOString().split('T')[0] : '') })); });
    }
    // 迁移旧图纸数据：添加新字段
    if (db.drawings && db.drawings.length > 0) {
        db.drawings = db.drawings.map(function (d) { return (__assign(__assign({}, d), { createdAt: d.createdAt || (d.id ? new Date(d.id).toISOString() : new Date().toISOString()), remarks: d.remarks || '' })); });
    }
    // 迁移旧费用数据：添加新字段
    if (db.expenses && db.expenses.length > 0) {
        db.expenses = db.expenses.map(function (e) { return (__assign(__assign({}, e), { createdAt: e.createdAt || (e.id ? new Date(e.id).toISOString() : new Date().toISOString()), date: e.date || (e.id ? new Date(e.id).toISOString().split('T')[0] : '') })); });
    }
    // 迁移全局工人库 — memberType='worker' → db.workers + db.projectWorkers
    if ((!db.workers || db.workers.length === 0) && db.members) {
        var workerMembers = db.members.filter(function (m) { return m.memberType === 'worker'; });
        if (workerMembers.length > 0) {
            console.log("[Migration] Migrating ".concat(workerMembers.length, " worker members to db.workers..."));
            if (!db.workers)
                db.workers = [];
            if (!db.projectWorkers)
                db.projectWorkers = [];
            // Step 1: 按身份证号分组去重，创建 Worker 记录
            var idCardMap = new Map();
            for (var _i = 0, workerMembers_1 = workerMembers; _i < workerMembers_1.length; _i++) {
                var m = workerMembers_1[_i];
                var idCard = (m.idCard || '').trim();
                if (!idCard)
                    continue;
                if (!idCardMap.has(idCard)) {
                    var worker = {
                        id: Date.now() + idCardMap.size,
                        name: m.name || '',
                        idCard: idCard,
                        gender: m.gender || undefined,
                        birthDate: m.birthDate || undefined,
                        ethnicity: m.ethnicity || undefined,
                        phone: m.phone || undefined,
                        address: m.idCardAddress || m.address || undefined,
                        bankAccount: m.wageBankAccount || undefined,
                        bankName: m.wageBankName || undefined,
                        createdAt: m.createdAt || new Date().toISOString()
                    };
                    db.workers.push(worker);
                    idCardMap.set(idCard, { worker: worker, members: [m] });
                }
                else {
                    idCardMap.get(idCard).members.push(m);
                }
            }
            // Step 2: 为每个旧 worker member 创建 ProjectWorker
            for (var _b = 0, idCardMap_1 = idCardMap; _b < idCardMap_1.length; _b++) {
                var _c = idCardMap_1[_b], entry = _c[1];
                var worker = entry.worker;
                var _loop_1 = function (m) {
                    var projectId = m.projectId;
                    if (!projectId && m.teamId && db.workerTeams) {
                        var team = db.workerTeams.find(function (t) { return t.id === m.teamId; });
                        projectId = team === null || team === void 0 ? void 0 : team.projectId;
                    }
                    if (!projectId)
                        return "continue";
                    var pw = {
                        id: Date.now() + db.projectWorkers.length,
                        workerId: worker.id,
                        projectId: projectId,
                        teamId: m.teamId || undefined,
                        dailyWage: m.dailyWage || 0,
                        workerType: m.workerType || 'other',
                        entryDate: m.entryDate || ((_a = m.createdAt) === null || _a === void 0 ? void 0 : _a.split('T')[0]) || new Date().toISOString().split('T')[0],
                        status: m.status || 'active',
                        remarks: m.remarks || undefined,
                        createdAt: new Date().toISOString()
                    };
                    db.projectWorkers.push(pw);
                };
                for (var _d = 0, _e = entry.members; _d < _e.length; _d++) {
                    var m = _e[_d];
                    _loop_1(m);
                }
            }
            // Step 3: 回填 db.wages 的 projectWorkerId
            if (db.wages) {
                var _loop_2 = function (w) {
                    if (!w.projectWorkerId && w.memberId) {
                        var member = db.members.find(function (m) { return m.id === w.memberId; });
                        if ((member === null || member === void 0 ? void 0 : member.memberType) === 'worker' && member.idCard) {
                            var entry_1 = idCardMap.get(member.idCard.trim());
                            if (entry_1) {
                                var pw = db.projectWorkers.find(function (p) { return p.workerId === entry_1.worker.id && p.projectId === w.projectId; });
                                if (pw)
                                    w.projectWorkerId = pw.id;
                            }
                        }
                    }
                };
                for (var _f = 0, _g = db.wages; _f < _g.length; _f++) {
                    var w = _g[_f];
                    _loop_2(w);
                }
            }
            // Step 3b: 回填 db.attendances 的 projectWorkerId
            if (db.attendances) {
                var _loop_3 = function (a) {
                    if (!a.projectWorkerId && a.memberId) {
                        var member = db.members.find(function (m) { return m.id === a.memberId; });
                        if ((member === null || member === void 0 ? void 0 : member.memberType) === 'worker' && member.idCard) {
                            var entry_2 = idCardMap.get(member.idCard.trim());
                            if (entry_2) {
                                var pw = db.projectWorkers.find(function (p) { return p.workerId === entry_2.worker.id && p.projectId === a.projectId; });
                                if (pw)
                                    a.projectWorkerId = pw.id;
                            }
                        }
                    }
                };
                for (var _h = 0, _j = db.attendances; _h < _j.length; _h++) {
                    var a = _j[_h];
                    _loop_3(a);
                }
            }
            // Step 4: 审计日志中追加 migratedToWorkerId 标记
            if (db.auditLogs) {
                var _loop_4 = function (log_1) {
                    if (log_1.memberId && !log_1.migratedToWorkerId) {
                        var member = db.members.find(function (m) { return m.id === log_1.memberId; });
                        if ((member === null || member === void 0 ? void 0 : member.memberType) === 'worker' && member.idCard) {
                            var entry = idCardMap.get(member.idCard.trim());
                            if (entry)
                                log_1.migratedToWorkerId = entry.worker.id;
                        }
                    }
                };
                for (var _k = 0, _l = db.auditLogs; _k < _l.length; _k++) {
                    var log_1 = _l[_k];
                    _loop_4(log_1);
                }
            }
            // Step 5: 从 db.members 移除已迁移的 worker 记录
            db.members = db.members.filter(function (m) { return m.memberType !== 'worker'; });
            console.log("[Migration] Worker migration complete. Workers: ".concat(db.workers.length, ", ProjectWorkers: ").concat(db.projectWorkers.length));
        }
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// 薪资历史回填迁移（为已有 staff 成员创建初始 salaryHistory）
// ═══════════════════════════════════════════════════════════════════════════════
function migrateSalaryHistoryBackfill() {
    var _a, _b;
    if ((_a = db._migrations) === null || _a === void 0 ? void 0 : _a.salaryHistoryBackfillV1)
        return;
    if (!db.salaryHistory)
        db.salaryHistory = [];
    if (!db.members)
        return;
    var backfilled = 0;
    var _loop_5 = function (member) {
        if (member.memberType !== 'staff')
            return "continue";
        if (!member.baseSalary || Number(member.baseSalary) <= 0)
            return "continue";
        var exists = db.salaryHistory.some(function (sh) { return sh.memberId === member.id; });
        if (exists)
            return "continue";
        db.salaryHistory.push({
            id: Date.now() + backfilled + 1,
            memberId: member.id,
            effectiveDate: member.entryDate || ((_b = member.createdAt) === null || _b === void 0 ? void 0 : _b.split('T')[0]) || new Date().toISOString().split('T')[0],
            baseSalary: Number(member.baseSalary),
            subsidy: 0,
            subsidyNote: '',
            note: '入职初始薪资',
            createdAt: new Date().toISOString()
        });
        backfilled++;
    };
    for (var _i = 0, _c = db.members; _i < _c.length; _i++) {
        var member = _c[_i];
        _loop_5(member);
    }
    if (backfilled > 0) {
        if (!db._migrations)
            db._migrations = {};
        db._migrations.salaryHistoryBackfillV1 = true;
        log.info("[Migration] Salary history backfill complete: ".concat(backfilled, " entries created"));
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// 文件存储迁移（将旧 base64 数据写出为磁盘文件）
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * 将 engineering.json 中的旧 base64 data URL 迁移为独立磁盘文件
 * 仅运行一次，运行后设置 _migrations.fileStorageV1 = true
 */
function migrateFileStorageV1() {
    var _a;
    if ((_a = db._migrations) === null || _a === void 0 ? void 0 : _a.fileStorageV1)
        return;
    log.info('Starting file storage migration (base64 → disk files)...');
    var migratedCount = 0;
    // 1. 迁移成员文件
    if (db.members) {
        for (var _i = 0, _b = db.members; _i < _b.length; _i++) {
            var member = _b[_i];
            var fields = [
                { field: 'idCardFront', category: 'members', subCategory: 'id-cards' },
                { field: 'idCardBack', category: 'members', subCategory: 'id-cards' },
                { field: 'contractFile', category: 'members', subCategory: 'contracts' },
                { field: 'safetyTrainingFile', category: 'members', subCategory: 'training' },
                { field: 'healthReportFile', category: 'members', subCategory: 'health' },
                { field: 'specialCertificateFile', category: 'members', subCategory: 'certificates' },
            ];
            for (var _c = 0, fields_1 = fields; _c < fields_1.length; _c++) {
                var _d = fields_1[_c], field = _d.field, category = _d.category, subCategory = _d.subCategory;
                var value = member[field];
                if (value && isDataUrl(value)) {
                    var ext = guessExtFromDataUrl(value);
                    var result = saveFile(category, subCategory, { fileData: value, fileName: "migrated".concat(ext) });
                    if (result.success) {
                        member[field] = result.data.fileName;
                        migratedCount++;
                    }
                }
            }
        }
    }
    // 2. 迁移发票文件
    if (db.invoices) {
        for (var _e = 0, _f = db.invoices; _e < _f.length; _e++) {
            var inv = _f[_e];
            if (inv.fileUrl && isDataUrl(inv.fileUrl)) {
                var ext = guessExtFromDataUrl(inv.fileUrl);
                var result = saveFile('invoices', 'files', { fileData: inv.fileUrl, fileName: "migrated".concat(ext) });
                if (result.success) {
                    inv.fileUrl = result.data.fileName;
                    migratedCount++;
                }
            }
        }
    }
    // 3. 迁移收付款凭证
    if (db.paymentRecords) {
        for (var _g = 0, _h = db.paymentRecords; _g < _h.length; _g++) {
            var record = _h[_g];
            if (record.fileUrl && isDataUrl(record.fileUrl)) {
                var ext = guessExtFromDataUrl(record.fileUrl);
                var result = saveFile('payments', 'vouchers', { fileData: record.fileUrl, fileName: "migrated".concat(ext) });
                if (result.success) {
                    record.fileUrl = result.data.fileName;
                    migratedCount++;
                }
            }
        }
    }
    // 4. 迁移合作单位文件
    if (db.partners) {
        for (var _j = 0, _k = db.partners; _j < _k.length; _j++) {
            var partner = _k[_j];
            // 执照文件
            if (partner.licenseFile && isDataUrl(partner.licenseFile)) {
                var ext = guessExtFromDataUrl(partner.licenseFile);
                var result = saveFile('partners', 'licenses', { fileData: partner.licenseFile, fileName: "migrated".concat(ext) });
                if (result.success) {
                    partner.licenseFile = result.data.fileName;
                    migratedCount++;
                }
            }
            // 其他附件（多个文件用 ||| 分隔）
            if (partner.otherFiles && typeof partner.otherFiles === 'string') {
                var parts = partner.otherFiles.split('|||');
                var newParts = [];
                for (var _l = 0, parts_1 = parts; _l < parts_1.length; _l++) {
                    var part = parts_1[_l];
                    if (part && isDataUrl(part)) {
                        var ext = guessExtFromDataUrl(part);
                        var result = saveFile('partners', 'attachments', { fileData: part, fileName: "migrated".concat(ext) });
                        if (result.success) {
                            newParts.push(result.data.fileName);
                            migratedCount++;
                        }
                        else {
                            newParts.push(part);
                        }
                    }
                    else {
                        newParts.push(part);
                    }
                }
                partner.otherFiles = newParts.join('|||');
            }
        }
    }
    // 5. 标记迁移完成（由 initDatabase() 统一调用 saveDatabase()，此处不再重复保存）
    if (!db._migrations)
        db._migrations = {};
    db._migrations.fileStorageV1 = true;
    // 不再调用 saveDatabase()，避免重复写入和潜在的数据覆盖风险
    // initDatabase() 在第 623 行会统一调用 saveDatabase()
    log.info("File storage migration complete. Migrated ".concat(migratedCount, " files."));
}
// ═══════════════════════════════════════════════════════════════════════════════
// 数据迁移
/**
 * 递归复制目录
 */
function copyDirRecursive(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    var entries = fs.readdirSync(src, { withFileTypes: true });
    for (var _i = 0, entries_1 = entries; _i < entries_1.length; _i++) {
        var entry = entries_1[_i];
        var srcPath = path.join(src, entry.name);
        var destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDirRecursive(srcPath, destPath);
        }
        else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}
export function migrateData(newPath) {
    return __awaiter(this, void 0, void 0, function () {
        var oldDbPath, newDbPath, oldUploadsPath, newUploadsPath, newDbContent;
        return __generator(this, function (_a) {
            try {
                log.info('Migrating data to:', newPath);
                // 创建新目录
                if (!fs.existsSync(newPath)) {
                    fs.mkdirSync(newPath, { recursive: true });
                }
                oldDbPath = getDbPath();
                newDbPath = path.join(newPath, 'engineering.json');
                oldUploadsPath = getUploadsPath();
                newUploadsPath = path.join(newPath, 'uploads');
                // 复制数据库文件
                if (fs.existsSync(oldDbPath)) {
                    fs.copyFileSync(oldDbPath, newDbPath);
                    log.info('Database file copied');
                }
                // 复制上传文件（递归复制所有子目录）
                if (fs.existsSync(oldUploadsPath)) {
                    copyDirRecursive(oldUploadsPath, newUploadsPath);
                    log.info('Upload files copied recursively');
                }
                // 更新配置
                config.dataPath = newPath;
                saveConfig(config);
                newDbContent = fs.readFileSync(newDbPath, 'utf8');
                db = JSON.parse(newDbContent);
                log.info('Migration complete!');
                return [2 /*return*/, { success: true, message: '数据已成功迁移到新路径' }];
            }
            catch (error) {
                log.error('Migration failed:', error);
                return [2 /*return*/, { success: false, message: 'Migration failed: ' + error.message }];
            }
            return [2 /*return*/];
        });
    });
}
// ═══════════════════════════════════════════════════════════════════════════════
// 发票状态重算
// ═══════════════════════════════════════════════════════════════════════════════
export function recalculateInvoiceStatus() {
    // 先清空所有发票的receivedAmount
    for (var i = 0; i < db.invoices.length; i++) {
        db.invoices[i].receivedAmount = 0;
    }
    // 再根据所有收款记录重新计算
    for (var i = 0; i < db.invoices.length; i++) {
        var invoice = db.invoices[i];
        // 计算该发票的所有收款记录总额
        var totalReceived = 0;
        for (var _i = 0, _a = db.paymentRecords; _i < _a.length; _i++) {
            var payment = _a[_i];
            if (payment.invoiceDetails) {
                for (var _b = 0, _c = payment.invoiceDetails; _b < _c.length; _b++) {
                    var detail = _c[_b];
                    if (detail.invoiceId === invoice.id) {
                        totalReceived += detail.paymentAmount || 0;
                    }
                }
            }
        }
        invoice.receivedAmount = totalReceived;
        // 更新状态
        if (totalReceived >= invoice.amount) {
            invoice.status = 'received';
        }
        else if (totalReceived > 0) {
            invoice.status = 'partially_paid';
        }
        else {
            invoice.status = 'issued';
        }
    }
}
