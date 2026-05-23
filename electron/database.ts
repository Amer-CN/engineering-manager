/**
 * 数据库模块
 * 
 * 处理数据库初始化、持久化和迁移
 */

import { app } from 'electron'
import path from 'path'
import log from 'electron-log'
import fs from 'fs'
import crypto from 'crypto'
import { isDataUrl, guessExtFromDataUrl, saveFile } from './file-service'

function getSeedDataPath(): string {
  if (fs.existsSync(path.join(__dirname, '..', 'public', 'seed-data.json'))) {
    return path.join(__dirname, '..', 'public', 'seed-data.json')
  }
  return path.join(process.resourcesPath, 'seed-data.json')
}

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface AppConfig {
  dataPath: string
}

export interface User {
  id: string
  username: string
  passwordHash: string
  passwordSalt: string
  passwordHashVersion?: number
  roleId: 'admin' | 'manager' | 'accountant' | 'worker'
  status: 'active' | 'disabled'
  displayName: string
  createdAt: string
  lastLoginAt: string | null
  mustChangePassword?: boolean
  failedLoginAttempts?: number
  lockedUntil?: string | null
}

export interface Database {
  projects: any[]
  members: any[]
  tasks: any[]
  materials: any[]
  expenses: any[]
  costLedger: any[]
  drawings: any[]
  partners: any[]
  regions: any[]
  supervisors: any[]
  incomeContracts: any[]
  incomeRecords: any[]
  expenseContracts: any[]
  expenseRecords: any[]
  agreementContracts: any[]
  workerTeams: any[]
  workerTransferRecords: any[]
  settlements: any[]
  contractTemplates: any[]
  templates: any[]
  inventoryItems: any[]
  inventoryTransactions: any[]
  invoices: any[]
  paymentRecords: any[]
  users: User[]
  wages: any[]
  attendances: any[]
  projectMembers: any[]
  auditLogs: any[]
  roles: any[]
  workers: any[]
  projectWorkers: any[]
  costLedgerCategories: any[]
  departments: any[]
  salaryHistory: any[]
  wageHistory: any[]
  _migrations?: {
    fileStorageV1?: boolean
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 导出变量
// ═══════════════════════════════════════════════════════════════════════════════

export let config: AppConfig
export let db: Database
export let dbReady = false

// ═══════════════════════════════════════════════════════════════════════════════
// 常量
// ═══════════════════════════════════════════════════════════════════════════════

export const defaultUserDataPath = app.getPath('userData')

// 打包后默认数据存储路径（安装时可让用户自定义）
export const defaultDataPath = app.isPackaged ? 'D:\\Company Database' : app.getPath('userData')

// ═══════════════════════════════════════════════════════════════════════════════
// 路径函数
// ═══════════════════════════════════════════════════════════════════════════════

export function getConfigPath(): string {
  return path.join(defaultUserDataPath, 'config.json')
}

export function getDbPath(): string {
  return path.join(config.dataPath, 'engineering.json')
}

export function getUploadsPath(): string {
  return path.join(config.dataPath, 'uploads')
}

export function getSnapshotsDir(): string {
  const dir = path.join(config.dataPath, 'db-snapshots')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

export interface SnapshotInfo {
  timestamp: string
  fileSize: number
  dbSummary: Record<string, number>
  label?: string
}

export function getSnapshotIndexPath(): string {
  return path.join(getSnapshotsDir(), 'index.json')
}

let maxSnapshots = 200

export function setMaxSnapshots(n: number) {
  maxSnapshots = Math.max(50, Math.min(1000, n))
}

export function getMaxSnapshots(): number {
  return maxSnapshots
}

export function getSnapshotIndex(): SnapshotInfo[] {
  try {
    const indexPath = getSnapshotIndexPath()
    if (fs.existsSync(indexPath)) {
      return JSON.parse(fs.readFileSync(indexPath, 'utf8'))
    }
  } catch (e) {
    log.warn('Failed to read snapshot index, starting fresh:', e)
  }
  return []
}

export function saveSnapshotIndex(index: SnapshotInfo[]) {
  fs.writeFileSync(getSnapshotIndexPath(), JSON.stringify(index, null, 2), 'utf8')
}

/**
 * 获取当前数据库中各表的数据量概况
 */
function getDbSummary(): Record<string, number> {
  const tables = [
    'projects', 'members', 'materials', 'expenses', 'costLedger',
    'drawings', 'partners', 'incomeContracts', 'expenseContracts',
    'workerTeams', 'settlements', 'templates', 'inventoryItems', 'invoices',
    'paymentRecords', 'workerTransferRecords', 'auditLogs'
  ]
  const summary: Record<string, number> = {}
  for (const table of tables) {
    if (Array.isArray((db as any)[table])) {
      summary[table] = (db as any)[table].length
    }
  }
  return summary
}

/**
 * 创建快照：在 saveDatabase 覆盖写入前调用
 */
export function createSnapshot(label?: string): SnapshotInfo | null {
  try {
    const dbPath = getDbPath()
    if (!fs.existsSync(dbPath)) return null

    const timestamp = new Date().toISOString().replace(/[:]/g, '-')
    const snapshotDir = getSnapshotsDir()
    const snapshotFile = path.join(snapshotDir, `${timestamp}.json`)

    fs.copyFileSync(dbPath, snapshotFile)

    const info: SnapshotInfo = {
      timestamp,
      fileSize: fs.statSync(snapshotFile).size,
      dbSummary: getDbSummary(),
      label: label || undefined,
    }

    // 更新索引
    const index = getSnapshotIndex()
    index.push(info)
    saveSnapshotIndex(index)

    return info
  } catch (error) {
    log.error('Failed to create snapshot:', error)
    return null
  }
}

/**
 * 清理旧快照：保留最近 N 个
 */
export function cleanOldSnapshots() {
  try {
    const index = getSnapshotIndex()
    if (index.length <= maxSnapshots) return

    const toRemove = index.slice(0, index.length - maxSnapshots)
    const keep = index.slice(index.length - maxSnapshots)

    const snapshotDir = getSnapshotsDir()
    for (const snap of toRemove) {
      const filePath = path.join(snapshotDir, `${snap.timestamp}.json`)
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
      } catch (e) {
        log.warn(`Failed to delete old snapshot: ${filePath}`, e)
      }
    }

    saveSnapshotIndex(keep)
    log.info(`Cleaned ${toRemove.length} old snapshots, kept ${keep.length}`)
  } catch (error) {
    log.error('Failed to clean old snapshots:', error)
  }
}

/**
 * 获取快照列表
 */
export function listSnapshots(): SnapshotInfo[] {
  return getSnapshotIndex().reverse() // 最新的在前
}

/**
 * 还原到指定时间点的快照
 */
export function restoreSnapshot(timestamp: string): boolean {
  try {
    const snapshotDir = getSnapshotsDir()
    const snapshotFile = path.join(snapshotDir, `${timestamp}.json`)
    if (!fs.existsSync(snapshotFile)) return false

    // 还原前先自动备份当前状态
    createSnapshot('pre-restore')

    // 原子还原：先写临时文件，再 rename 覆盖
    const dbPath = getDbPath()
    const tmpPath = dbPath + '.tmp'
    fs.copyFileSync(snapshotFile, tmpPath)
    fs.renameSync(tmpPath, dbPath)

    log.info(`Database restored to snapshot: ${timestamp}`)
    return true
  } catch (error) {
    log.error('Failed to restore snapshot:', error)
    return false
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 配置管理
// ═══════════════════════════════════════════════════════════════════════════════

export function loadConfig(): AppConfig {
  const configPath = getConfigPath()
  if (fs.existsSync(configPath)) {
    try {
      const data = fs.readFileSync(configPath, 'utf8')
      const cfg = JSON.parse(data)
      log.info('Config loaded:', configPath)
      // 确保路径有效
      if (!cfg.dataPath || !fs.existsSync(cfg.dataPath)) {
        cfg.dataPath = defaultDataPath
        saveConfig(cfg)
      }
      return cfg
    } catch (e) {
      log.warn('Failed to load config, using default:', e)
    }
  }
  // 默认配置（首次启动）
  const defaultConfig: AppConfig = {
    dataPath: defaultDataPath
  }
  saveConfig(defaultConfig)
  return defaultConfig
}

export function saveConfig(cfg: AppConfig) {
  try {
    fs.writeFileSync(getConfigPath(), JSON.stringify(cfg, null, 2), 'utf8')
    log.info('Config saved:', getConfigPath())
  } catch (error) {
    log.error('Failed to save config:', error)
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 密码哈希函数
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_ADMIN_PASSWORD = 'admin123'

// 默认角色权限定义（与 auth.ts 中 SYSTEM_ROLE_DEFAULTS 保持一致）
const DEFAULT_ADMIN_PERMISSIONS = [
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
]
const DEFAULT_MANAGER_PERMISSIONS = [
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
]
const DEFAULT_ACCOUNTANT_PERMISSIONS = [
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
]
const DEFAULT_WORKER_PERMISSIONS = [
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
]

/**
 * 生成密码哈希
 */
export function hashPassword(password: string, salt?: string, version: number = 2): { hash: string; salt: string } {
  const generatedSalt = salt || crypto.randomBytes(16).toString('hex')
  const iterations = version >= 2 ? 210000 : 10000
  const hash = crypto.pbkdf2Sync(password, generatedSalt, iterations, 64, 'sha512').toString('hex')
  return { hash, salt: generatedSalt }
}

/**
 * 验证密码
 */
export function verifyPassword(password: string, hash: string, salt: string, version?: number): boolean {
  const v = version || 1
  const { hash: computedHash } = hashPassword(password, salt, v)
  return computedHash === hash
}

/**
 * 创建默认管理员账号
 */
function createDefaultAdmin(): User {
  const { hash, salt } = hashPassword(DEFAULT_ADMIN_PASSWORD)
  // Write initial password to a file so admin can find it
  try {
    const pwFile = path.join(app.getPath('userData'), 'admin-initial-password.txt')
    fs.writeFileSync(pwFile, `工程管家初始管理员密码\n用户名: admin\n密码: ${DEFAULT_ADMIN_PASSWORD}\n此文件可安全删除。\n`, 'utf-8')
    log.info('Initial admin password written to:', pwFile)
  } catch (e) {
    log.error('Failed to write initial password file:', e)
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
    mustChangePassword: true  // 强制首次登录修改密码
  }
}

/**
 * 初始化默认数据
 */
function initDefaultData() {
  // 如果用户表为空，创建默认管理员
  if (!db.users || db.users.length === 0) {
    const defaultAdmin = createDefaultAdmin()
    db.users = [defaultAdmin]
    log.info('Created default admin user: admin / admin123')
  }
  // 如果角色表为空，种子默认角色
  if (!db.roles || db.roles.length === 0) {
    db.roles = [
      { id: 'admin', name: '管理员', description: '系统管理员，拥有所有权限', isSystem: true, permissions: DEFAULT_ADMIN_PERMISSIONS },
      { id: 'manager', name: '项目经理', description: '项目管理人员，拥有项目相关所有权限', isSystem: true, permissions: DEFAULT_MANAGER_PERMISSIONS },
      { id: 'accountant', name: '财务人员', description: '财务管理人员，负责账务和发票', isSystem: true, permissions: DEFAULT_ACCOUNTANT_PERMISSIONS },
      { id: 'worker', name: '普通员工', description: '普通员工，只有查看权限', isSystem: true, permissions: DEFAULT_WORKER_PERMISSIONS },
    ]
    log.info('Seeded default roles')
  }
}

/**
 * 加载种子示例数据（首次启动时复制到用户数据目录）
 */
function loadSeedData() {
  try {
    const seedPath = getSeedDataPath()
    if (!fs.existsSync(seedPath)) {
      log.info('No seed data file found at:', seedPath)
      return
    }
    const seedJson = fs.readFileSync(seedPath, 'utf8')
    const seed = JSON.parse(seedJson)
    // 将种子数据合并到空数据库中（只合并非空集合）
    let merged = 0
    for (const [key, value] of Object.entries(seed)) {
      if (Array.isArray(value) && value.length > 0) {
        if (Array.isArray((db as any)[key]) && (db as any)[key].length === 0) {
          (db as any)[key] = value
          merged++
        }
      }
    }
    log.info(`Seed data loaded: ${merged} collections populated from ${seedPath}`)
  } catch (e) {
    log.error('Failed to load seed data:', e)
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 数据库操作
// ═══════════════════════════════════════════════════════════════════════════════

export function saveDatabase(): boolean {
  try {
    const dbPath = getDbPath()
    const dataToWrite = JSON.stringify(db, null, 2)
    const writeSize = dataToWrite.length

    // ── 数据完整性防护 ─────────────────────────────────────────────
    // 如果 db 对象明显为空（所有关键数组都为空），
    // 但磁盘上的已有文件较大（含真实数据），拒绝写入并创建紧急备份
    const hasRealData =
      (db.projects && db.projects.length > 0) ||
      (db.members && db.members.length > 0) ||
      (db.costLedger && db.costLedger.length > 0) ||
      (db.workers && db.workers.length > 0) ||
      (db.wages && db.wages.length > 0)

    if (!hasRealData && fs.existsSync(dbPath)) {
      const existingStats = fs.statSync(dbPath)
      // 现有文件 > 10KB 说明里面有真实数据，但当前 db 对象为空——拒绝覆盖
      if (existingStats.size > 10240) {
        log.error(
          '【数据保护】拒绝保存：当前内存数据为空，但磁盘文件有 ' +
          existingStats.size + ' 字节真实数据。已创建紧急备份。'
        )
        const emergencyBackup = dbPath + '.EMERGENCY-' + Date.now() + '.bak'
        try {
          fs.copyFileSync(dbPath, emergencyBackup)
          log.info('紧急备份已创建：', emergencyBackup)
        } catch (e) {
          log.error('创建紧急备份失败：', e)
        }
        return false  // ← 关键：拒绝写入
      }
    }
    // ─────────────────────────────────────────────────────────────────

    // 1. 创建快照（在覆盖写入之前）
    createSnapshot()

    // 2. 原子写入：先写临时文件，再 rename 覆盖
    const tmpPath = dbPath + '.tmp'
    fs.writeFileSync(tmpPath, dataToWrite, 'utf8')
    fs.renameSync(tmpPath, dbPath)
    log.info('Database saved to:', dbPath)

    // 3. 清理旧快照
    cleanOldSnapshots()
    return true
  } catch (error) {
    log.error('Failed to save database:', error)
    return false
  }
}

export function initializeDatabase(): Database {
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
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 数据库初始化
// ═══════════════════════════════════════════════════════════════════════════════

export async function initDatabase(): Promise<void> {
  try {
    log.info('Initializing database...')
    
    // 加载配置
    config = loadConfig()
    log.info('Data path:', config.dataPath)
    
    // 确保数据目录存在
    if (!fs.existsSync(config.dataPath)) {
      try {
        fs.mkdirSync(config.dataPath, { recursive: true })
      } catch (e) {
        log.warn('无法创建数据目录，回退到默认用户数据路径:', e)
        config.dataPath = app.getPath('userData')
        saveConfig(config)
        if (!fs.existsSync(config.dataPath)) {
          fs.mkdirSync(config.dataPath, { recursive: true })
        }
      }
    }
    
    // 确保上传目录存在
    const uploadsPath = getUploadsPath()
    if (!fs.existsSync(uploadsPath)) {
      fs.mkdirSync(uploadsPath, { recursive: true })
    }
    // 子目录由 file-service.ts 的 saveFile 按需创建，不再预先创建扁平目录

    const dbPath = getDbPath()
    if (fs.existsSync(dbPath)) {
      try {
        const data = fs.readFileSync(dbPath, 'utf8')
        db = JSON.parse(data)
        // 确保新字段存在
        ensureDatabaseFields()
        initDefaultData()
        migrateDatabase()
        migrateSalaryHistoryBackfill()
        // 文件存储迁移（将旧 base64 数据写出为磁盘文件）
        migrateFileStorageV1()
        saveDatabase()
        log.info('Database loaded:', dbPath)
      } catch (e) {
        log.error('Failed to load/migrate database:', e)

        // 1. 备份当前文件
        const backupPath = dbPath + '.corrupted.' + Date.now() + '.bak'
        try {
          fs.copyFileSync(dbPath, backupPath)
          log.info('Corrupted database backed up to:', backupPath)
        } catch (_) {}

        // 2. 【数据保护】尝试从最新快照恢复，而不是直接回退到空库
        const snapshotDir = path.join(config.dataPath, 'db-snapshots')
        let restored = false
        if (fs.existsSync(snapshotDir)) {
          try {
            const snapshots = fs.readdirSync(snapshotDir)
              .filter((f: string) => f.endsWith('.json') && f !== 'index.json')
              .sort()
              .reverse()
            if (snapshots.length > 0) {
              const latest = path.join(snapshotDir, snapshots[0])
              log.warn('检测到数据库异常，尝试从快照恢复:', snapshots[0])
              const snapData = JSON.parse(fs.readFileSync(latest, 'utf8'))
              const snapHasData =
                (snapData.projects && snapData.projects.length > 0) ||
                (snapData.members && snapData.members.length > 0) ||
                (snapData.costLedger && snapData.costLedger.length > 0)
              if (snapHasData) {
                db = snapData
                ensureDatabaseFields()
                if (!db._migrations) db._migrations = {}
                db._migrations.fileStorageV1 = true
                db._migrations.salaryHistoryBackfillV1 = true
                saveDatabase()
                log.info('从快照恢复成功，成员数:', db.members?.length)
                restored = true
              }
            }
          } catch (snapErr) {
            log.error('从快照恢复失败:', snapErr)
          }
        }

        // 3. 快照恢复失败，才回退到空库
        if (!restored) {
          if (!db || !db.projects) {
            log.warn('Database unreadable, starting fresh')
            db = initializeDatabase()
            initDefaultData()
            saveDatabase()
          } else {
            log.warn('Database loaded but migration had errors — keeping loaded data')
            // 检查数据是否有效再保存
            const hasData =
              (db.projects && db.projects.length > 0) ||
              (db.members && db.members.length > 0)
            if (hasData) {
              saveDatabase()
            } else {
              log.error('【数据保护】加载的数据为空，拒绝保存')
            }
          }
        }
      }
    } else {
      log.info('Creating new database:', dbPath)
      db = initializeDatabase()
      initDefaultData()
      loadSeedData()
      saveDatabase()
    }
    
    dbReady = true
    log.info('Database ready')
  } catch (error) {
    log.error('Database init failed:', error)
    dbReady = true
  }
}

// 确保数据库字段存在
function ensureDatabaseFields() {
  let changed = false
  if (!db.projects) { db.projects = []; changed = true }
  if (!db.members) { db.members = []; changed = true }
  if (!db.materials) { db.materials = []; changed = true }
  if (!db.expenses) { db.expenses = []; changed = true }
  if (!db.costLedger) { db.costLedger = []; changed = true }
  if (!db.costLedgerCategories) { db.costLedgerCategories = []; changed = true }
  if (!db.drawings) { db.drawings = []; changed = true }
  if (!db.partners) { db.partners = []; changed = true }
  if (!db.regions) { db.regions = []; changed = true }
  if (!db.supervisors) { db.supervisors = []; changed = true }
  if (!db.incomeContracts) { db.incomeContracts = []; changed = true }
  if (!db.incomeRecords) { db.incomeRecords = []; changed = true }
  if (!db.expenseContracts) { db.expenseContracts = []; changed = true }
  if (!db.expenseRecords) { db.expenseRecords = []; changed = true }
  if (!db.agreementContracts) { db.agreementContracts = []; changed = true }
  if (!db.workerTeams) { db.workerTeams = []; changed = true }
  if (!db.workerTransferRecords) { db.workerTransferRecords = []; changed = true }
  if (!db.invoices) { db.invoices = []; changed = true }
  if (!db.paymentRecords) { db.paymentRecords = []; changed = true }
  if (!db.wages) { db.wages = []; changed = true }
  if (!db.attendances) { db.attendances = []; changed = true }
  if (!db.projectMembers) { db.projectMembers = []; changed = true }
  if (!db.auditLogs) { db.auditLogs = []; changed = true }
  if (!db.roles) { db.roles = []; changed = true }
  if (!db.settlements) { db.settlements = []; changed = true }
  if (!db.contractTemplates) { db.contractTemplates = []; changed = true }
  if (!db.templates) { db.templates = []; changed = true }
  if (!db.inventoryItems) { db.inventoryItems = []; changed = true }
  if (!db.inventoryTransactions) { db.inventoryTransactions = []; changed = true }
  if (!db.workers) { db.workers = []; changed = true }
  if (!db.projectWorkers) { db.projectWorkers = []; changed = true }
  if (!db.departments) { db.departments = []; changed = true }
  if (!db.salaryHistory) { db.salaryHistory = []; changed = true }
  if (!db.wageHistory) { db.wageHistory = []; changed = true }
  if (!db.users) {
    db.users = []
    initDefaultData()
    changed = true
  }
  if (changed) saveDatabase()
}

// 旧发票票种 → 新票种映射（所有存量发票均为专票）
function mapLegacyInvoiceKind(kind: string | undefined): string {
  if (kind === 'electronic') return 'electronic_special'
  if (kind === 'paper') return 'paper_special'
  // 已是新格式或未知，保持不变；无值默认纸专
  return kind || 'paper_special'
}

// 迁移数据库
function migrateDatabase() {
  // 迁移旧发票数据：添加新字段
  if (db.invoices && db.invoices.length > 0) {
    db.invoices = db.invoices.map((inv: any) => ({
      ...inv,
      invoiceKind: mapLegacyInvoiceKind(inv.invoiceKind),
      sellerId: inv.sellerId || inv.partnerId || null,
      buyerId: inv.buyerId || null,
      contractId: inv.contractId || null,
      receivedAmount: inv.receivedAmount || 0
    }))
  }
  // 迁移旧收款记录数据：添加新字段
  if (db.paymentRecords && db.paymentRecords.length > 0) {
    db.paymentRecords = db.paymentRecords.map((r: any) => ({
      ...r,
      projectId: r.projectId || null,
      partnerId: r.partnerId || null,
      contractId: r.contractId || null,
      invoiceDetails: r.invoiceDetails || [],
      createdAt: r.createdAt || (r.id ? new Date(r.id).toISOString() : new Date().toISOString()),
      recordDate: r.recordDate || r.date || (r.id ? new Date(r.id).toISOString().split('T')[0] : '')
    }))
  }
  // 迁移旧图纸数据：添加新字段
  if (db.drawings && db.drawings.length > 0) {
    db.drawings = db.drawings.map((d: any) => ({
      ...d,
      createdAt: d.createdAt || (d.id ? new Date(d.id).toISOString() : new Date().toISOString()),
      remarks: d.remarks || ''
    }))
  }
  // 迁移旧费用数据：添加新字段
  if (db.expenses && db.expenses.length > 0) {
    db.expenses = db.expenses.map((e: any) => ({
      ...e,
      createdAt: e.createdAt || (e.id ? new Date(e.id).toISOString() : new Date().toISOString()),
      date: e.date || (e.id ? new Date(e.id).toISOString().split('T')[0] : '')
    }))
  }

  // 迁移全局工人库 — memberType='worker' → db.workers + db.projectWorkers
  if ((!db.workers || db.workers.length === 0) && db.members) {
    const workerMembers = db.members.filter((m: any) => m.memberType === 'worker')
    if (workerMembers.length > 0) {
      console.log(`[Migration] Migrating ${workerMembers.length} worker members to db.workers...`)
      if (!db.workers) db.workers = []
      if (!db.projectWorkers) db.projectWorkers = []

      // Step 1: 按身份证号分组去重，创建 Worker 记录
      const idCardMap = new Map<string, any>()
      for (const m of workerMembers) {
        const idCard = (m.idCard || '').trim()
        if (!idCard) continue
        if (!idCardMap.has(idCard)) {
          const worker: any = {
            id: Date.now() + idCardMap.size,
            name: m.name || '',
            idCard,
            gender: m.gender || undefined,
            birthDate: m.birthDate || undefined,
            ethnicity: m.ethnicity || undefined,
            phone: m.phone || undefined,
            address: m.idCardAddress || m.address || undefined,
            bankAccount: m.wageBankAccount || undefined,
            bankName: m.wageBankName || undefined,
            createdAt: m.createdAt || new Date().toISOString()
          }
          db.workers!.push(worker)
          idCardMap.set(idCard, { worker, members: [m] })
        } else {
          idCardMap.get(idCard)!.members.push(m)
        }
      }

      // Step 2: 为每个旧 worker member 创建 ProjectWorker
      for (const [, entry] of idCardMap) {
        const worker = entry.worker
        for (const m of entry.members) {
          let projectId = m.projectId
          if (!projectId && m.teamId && db.workerTeams) {
            const team = db.workerTeams.find((t: any) => t.id === m.teamId)
            projectId = team?.projectId
          }
          if (!projectId) continue

          const pw: any = {
            id: Date.now() + db.projectWorkers!.length,
            workerId: worker.id,
            projectId,
            teamId: m.teamId || undefined,
            dailyWage: m.dailyWage || 0,
            workerType: m.workerType || 'other',
            entryDate: m.entryDate || m.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
            status: m.status || 'active',
            remarks: m.remarks || undefined,
            createdAt: new Date().toISOString()
          }
          db.projectWorkers!.push(pw)
        }
      }

      // Step 3: 回填 db.wages 的 projectWorkerId
      if (db.wages) {
        for (const w of db.wages) {
          if (!w.projectWorkerId && w.memberId) {
            const member = db.members.find((m: any) => m.id === w.memberId)
            if (member?.memberType === 'worker' && member.idCard) {
              const entry = idCardMap.get(member.idCard.trim())
              if (entry) {
                const pw = db.projectWorkers!.find(
                  (p: any) => p.workerId === entry.worker.id && p.projectId === w.projectId
                )
                if (pw) w.projectWorkerId = pw.id
              }
            }
          }
        }
      }

      // Step 3b: 回填 db.attendances 的 projectWorkerId
      if (db.attendances) {
        for (const a of db.attendances) {
          if (!a.projectWorkerId && a.memberId) {
            const member = db.members.find((m: any) => m.id === a.memberId)
            if (member?.memberType === 'worker' && member.idCard) {
              const entry = idCardMap.get(member.idCard.trim())
              if (entry) {
                const pw = db.projectWorkers!.find(
                  (p: any) => p.workerId === entry.worker.id && p.projectId === a.projectId
                )
                if (pw) a.projectWorkerId = pw.id
              }
            }
          }
        }
      }

      // Step 4: 审计日志中追加 migratedToWorkerId 标记
      if (db.auditLogs) {
        for (const log of db.auditLogs) {
          if (log.memberId && !log.migratedToWorkerId) {
            const member = db.members.find((m: any) => m.id === log.memberId)
            if (member?.memberType === 'worker' && member.idCard) {
              const entry = idCardMap.get(member.idCard.trim())
              if (entry) log.migratedToWorkerId = entry.worker.id
            }
          }
        }
      }

      // Step 5: 从 db.members 移除已迁移的 worker 记录
      db.members = db.members.filter((m: any) => m.memberType !== 'worker')

      console.log(`[Migration] Worker migration complete. Workers: ${db.workers!.length}, ProjectWorkers: ${db.projectWorkers!.length}`)
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 薪资历史回填迁移（为已有 staff 成员创建初始 salaryHistory）
// ═══════════════════════════════════════════════════════════════════════════════

function migrateSalaryHistoryBackfill() {
  if (db._migrations?.salaryHistoryBackfillV1) return
  if (!db.salaryHistory) db.salaryHistory = []
  if (!db.members) return

  let backfilled = 0
  for (const member of db.members) {
    if (member.memberType !== 'staff') continue
    if (!member.baseSalary || Number(member.baseSalary) <= 0) continue

    const exists = db.salaryHistory.some((sh: any) => sh.memberId === member.id)
    if (exists) continue

    db.salaryHistory.push({
      id: Date.now() + backfilled + 1,
      memberId: member.id,
      effectiveDate: member.entryDate || member.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
      baseSalary: Number(member.baseSalary),
      subsidy: 0,
      subsidyNote: '',
      note: '入职初始薪资',
      createdAt: new Date().toISOString()
    })
    backfilled++
  }

  if (backfilled > 0) {
    if (!db._migrations) db._migrations = {}
    db._migrations.salaryHistoryBackfillV1 = true
    log.info(`[Migration] Salary history backfill complete: ${backfilled} entries created`)
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
  if (db._migrations?.fileStorageV1) return

  log.info('Starting file storage migration (base64 → disk files)...')
  let migratedCount = 0

  // 1. 迁移成员文件
  if (db.members) {
    for (const member of db.members) {
      const fields: { field: string; category: string; subCategory: string }[] = [
        { field: 'idCardFront', category: 'members', subCategory: 'id-cards' },
        { field: 'idCardBack', category: 'members', subCategory: 'id-cards' },
        { field: 'contractFile', category: 'members', subCategory: 'contracts' },
        { field: 'safetyTrainingFile', category: 'members', subCategory: 'training' },
        { field: 'healthReportFile', category: 'members', subCategory: 'health' },
        { field: 'specialCertificateFile', category: 'members', subCategory: 'certificates' },
      ]
      for (const { field, category, subCategory } of fields) {
        const value = member[field]
        if (value && isDataUrl(value)) {
          const ext = guessExtFromDataUrl(value)
          const result = saveFile(category, subCategory, { fileData: value, fileName: `migrated${ext}` })
          if (result.success) {
            member[field] = result.data!.fileName
            migratedCount++
          }
        }
      }
    }
  }

  // 2. 迁移发票文件
  if (db.invoices) {
    for (const inv of db.invoices) {
      if (inv.fileUrl && isDataUrl(inv.fileUrl)) {
        const ext = guessExtFromDataUrl(inv.fileUrl)
        const result = saveFile('invoices', 'files', { fileData: inv.fileUrl, fileName: `migrated${ext}` })
        if (result.success) {
          inv.fileUrl = result.data!.fileName
          migratedCount++
        }
      }
    }
  }

  // 3. 迁移收付款凭证
  if (db.paymentRecords) {
    for (const record of db.paymentRecords) {
      if (record.fileUrl && isDataUrl(record.fileUrl)) {
        const ext = guessExtFromDataUrl(record.fileUrl)
        const result = saveFile('payments', 'vouchers', { fileData: record.fileUrl, fileName: `migrated${ext}` })
        if (result.success) {
          record.fileUrl = result.data!.fileName
          migratedCount++
        }
      }
    }
  }

  // 4. 迁移合作单位文件
  if (db.partners) {
    for (const partner of db.partners) {
      // 执照文件
      if (partner.licenseFile && isDataUrl(partner.licenseFile)) {
        const ext = guessExtFromDataUrl(partner.licenseFile)
        const result = saveFile('partners', 'licenses', { fileData: partner.licenseFile, fileName: `migrated${ext}` })
        if (result.success) {
          partner.licenseFile = result.data!.fileName
          migratedCount++
        }
      }
      // 其他附件（多个文件用 ||| 分隔）
      if (partner.otherFiles && typeof partner.otherFiles === 'string') {
        const parts = partner.otherFiles.split('|||')
        const newParts: string[] = []
        for (const part of parts) {
          if (part && isDataUrl(part)) {
            const ext = guessExtFromDataUrl(part)
            const result = saveFile('partners', 'attachments', { fileData: part, fileName: `migrated${ext}` })
            if (result.success) {
              newParts.push(result.data!.fileName)
              migratedCount++
            } else {
              newParts.push(part)
            }
          } else {
            newParts.push(part)
          }
        }
        partner.otherFiles = newParts.join('|||')
      }
    }
  }

  // 5. 标记迁移完成（由 initDatabase() 统一调用 saveDatabase()，此处不再重复保存）
  if (!db._migrations) db._migrations = {}
  db._migrations.fileStorageV1 = true
  // 不再调用 saveDatabase()，避免重复写入和潜在的数据覆盖风险
  // initDatabase() 在第 623 行会统一调用 saveDatabase()

  log.info(`File storage migration complete. Migrated ${migratedCount} files.`)
}

// ═══════════════════════════════════════════════════════════════════════════════
// 数据迁移

/**
 * 递归复制目录
 */
function copyDirRecursive(src: string, dest: string) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true })
  }
  const entries = fs.readdirSync(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

export async function migrateData(newPath: string): Promise<{ success: boolean; message: string }> {
  try {
    log.info('Migrating data to:', newPath)
    
    // 创建新目录
    if (!fs.existsSync(newPath)) {
      fs.mkdirSync(newPath, { recursive: true })
    }
    
    const oldDbPath = getDbPath()
    const newDbPath = path.join(newPath, 'engineering.json')
    const oldUploadsPath = getUploadsPath()
    const newUploadsPath = path.join(newPath, 'uploads')
    
    // 复制数据库文件
    if (fs.existsSync(oldDbPath)) {
      fs.copyFileSync(oldDbPath, newDbPath)
      log.info('Database file copied')
    }
    
    // 复制上传文件（递归复制所有子目录）
    if (fs.existsSync(oldUploadsPath)) {
      copyDirRecursive(oldUploadsPath, newUploadsPath)
      log.info('Upload files copied recursively')
    }
    
    // 更新配置
    config.dataPath = newPath
    saveConfig(config)
    
    // 更新内存中的数据
    const newDbContent = fs.readFileSync(newDbPath, 'utf8')
    db = JSON.parse(newDbContent)
    
    log.info('Migration complete!')
    return { success: true, message: '数据已成功迁移到新路径' }
  } catch (error: any) {
    log.error('Migration failed:', error)
    return { success: false, message: 'Migration failed: ' + error.message }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 发票状态重算
// ═══════════════════════════════════════════════════════════════════════════════

export function recalculateInvoiceStatus() {
  // 先清空所有发票的receivedAmount
  for (let i = 0; i < db.invoices.length; i++) {
    db.invoices[i].receivedAmount = 0
  }
  
  // 再根据所有收款记录重新计算
  for (let i = 0; i < db.invoices.length; i++) {
    const invoice = db.invoices[i]
    // 计算该发票的所有收款记录总额
    let totalReceived = 0
    for (const payment of db.paymentRecords) {
      if (payment.invoiceDetails) {
        for (const detail of payment.invoiceDetails) {
          if (detail.invoiceId === invoice.id) {
            totalReceived += detail.paymentAmount || 0
          }
        }
      }
    }
    invoice.receivedAmount = totalReceived

    // 更新状态
    if (totalReceived >= invoice.amount) {
      invoice.status = 'received'
    } else if (totalReceived > 0) {
      invoice.status = 'partially_paid'
    } else {
      invoice.status = 'issued'
    }
  }
}
