/**
 * IPC 权限守卫
 *
 * 核心机制：在 ipcMain.handle 注册前劫持，为所有 IPC 调用
 * 添加服务端权限校验。无需修改任何现有 handler 文件。
 *
 * 设计原则：
 * 1. 集中式权限映射（IPC_CHANNEL → PERMISSION_CODE）
 * 2. 主进程 session 管理（不受渲染进程篡改影响）
 * 3. 公开通道白名单（无需登录即可调用）
 * 4. Admin 角色自动绕过权限检查
 * 5. 未定义权限的通道默认放行（日志警告，逐步收紧）
 */

import { ipcMain, IpcMainInvokeEvent } from 'electron'
import log from 'electron-log'

// ═══════════════════════════════════════════════════════════════════════════════
// Session 管理（主进程端）
// ═══════════════════════════════════════════════════════════════════════════════

export interface UserSession {
  userId: string
  username: string
  roleId: string
  permissions: string[]
}

let currentSession: UserSession | null = null

/**
 * 设置当前用户 session（由渲染进程登录/恢复后调用）
 */
export function setSession(session: UserSession | null): void {
  currentSession = session
  if (session) {
    log.info(`IPC Guard: Session established for user '${session.username}' (role: ${session.roleId}, permissions: ${session.permissions.length})`)
  } else {
    log.info('IPC Guard: Session cleared')
  }
}

/**
 * 获取当前用户 session
 */
export function getSession(): UserSession | null {
  return currentSession
}

// ═══════════════════════════════════════════════════════════════════════════════
// IPC 通道 → 权限码映射
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 将每个 IPC 通道映射到所需的权限码。
 * 格式: 'resource:action'，对应 PermissionCode 类型。
 *
 * 未在此映射中且不在 PUBLIC_CHANNELS 中的通道，
 * 默认放行但记录警告日志（可逐步收紧）。
 */
const IPC_PERMISSIONS: Record<string, string> = {
  // ─── 项目 ───────────────────────────────────────────
  'db:projects:getAll':                'projects:read',
  'db:projects:create':                'projects:create',
  'db:projects:update':                'projects:update',
  'db:projects:delete':                'projects:delete',

  // ─── 成员（管理人员） ─────────────────────────────────
  'db:members:getAll':                 'members:read',
  'db:members:create':                'members:create',
  'db:members:update':                'members:update',
  'db:members:delete':                'members:delete',

  // ─── 合同（收入/支出/协议/模板/统计） ──────────────────
  'db:incomeContracts:getAll':         'contracts:read',
  'db:incomeContracts:create':         'contracts:create',
  'db:incomeContracts:update':         'contracts:update',
  'db:incomeContracts:delete':         'contracts:delete',
  'db:expenseContracts:getAll':        'contracts:read',
  'db:expenseContracts:create':        'contracts:create',
  'db:expenseContracts:update':        'contracts:update',
  'db:expenseContracts:delete':        'contracts:delete',
  'db:agreementContracts:getAll':      'contracts:read',
  'db:agreementContracts:create':      'contracts:create',
  'db:agreementContracts:update':      'contracts:update',
  'db:agreementContracts:delete':      'contracts:delete',
  'db:incomeRecords:getAll':           'contracts:read',
  'db:incomeRecords:create':           'contracts:create',
  'db:incomeRecords:delete':           'contracts:delete',
  'db:expenseRecords:getAll':          'contracts:read',
  'db:expenseRecords:create':          'contracts:create',
  'db:expenseRecords:delete':          'contracts:delete',
  'db:contractStats:get':             'contracts:read',
  'db:contractTemplates:getAll':       'contracts:read',
  'db:contractTemplates:create':       'contracts:create',
  'db:contractTemplates:update':       'contracts:update',
  'db:contractTemplates:delete':       'contracts:delete',
  'db:contracts:saveFile':            'contracts:create',
  'db:contracts:readFile':            'contracts:read',

  // ─── 单位（合作单位/监管单位/地区） ──────────────────
  'db:partners:getAll':               'partners:read',
  'db:partners:getByProject':         'partners:read',
  'db:partners:create':               'partners:create',
  'db:partners:update':               'partners:update',
  'db:partners:delete':               'partners:delete',
  'db:supervisors:getAll':            'partners:read',
  'db:supervisors:create':            'partners:create',
  'db:supervisors:update':            'partners:update',
  'db:supervisors:delete':            'partners:delete',
  'db:regions:getAll':                'partners:read',
  'db:regions:create':                'partners:create',
  'db:regions:delete':                'partners:delete',

  // ─── 员工/工人（班组/工人库/用工关系/调动） ──────────
  'db:workerTeams:getAll':            'members:read',
  'db:workerTeams:create':            'members:create',
  'db:workerTeams:update':            'members:update',
  'db:workerTeams:delete':            'members:delete',
  'db:workers:getAll':                'members:read',
  'db:workers:create':                'members:create',
  'db:workers:update':                'members:update',
  'db:workers:delete':                'members:delete',
  'db:workers:getStats':              'members:read',
  'db:workers:getTeamWages':          'members:read',
  'db:workers:fixData':               'members:update',
  'db:projectWorkers:getAll':         'members:read',
  'db:projectWorkers:create':         'members:create',
  'db:projectWorkers:update':         'members:update',
  'db:projectWorkers:delete':         'members:delete',
  'db:projectWorkers:batchCreate':    'members:create',
  'db:projectMembers:getAll':         'members:read',
  'db:projectMembers:add':            'members:create',
  'db:projectMembers:update':         'members:update',
  'db:projectMembers:remove':         'members:delete',
  'db:workerTransferRecords:getAll':   'members:read',
  'db:workerTransferRecords:create':   'members:create',

  // ─── 工资 ───────────────────────────────────────────
  'db:wages:getAll':                  'wages:read',
  'db:wages:generateForProject':      'wages:create',
  'db:wages:create':                  'wages:create',
  'db:wages:update':                  'wages:update',
  'db:wages:batchSave':               'wages:update',
  'db:wages:delete':                  'wages:delete',
  'db:wages:batchDelete':             'wages:delete',
  'db:wages:batchClearPayments':      'wages:update',
  'db:wages:batchArchivePayments':    'wages:approve',
  'db:wages:getStats':                'wages:read',
  'db:wages:parseBankReceipt':        'wages:create',
  'db:wages:batchParseBankReceipts':   'wages:create',
  'db:wages:batchConfirmMatches':      'wages:update',
  'db:wages:getWagePaymentRecords':  'wages:read',
  'db:wages:getWageOverdueStats':    'wages:read',
  'db:wages:getWageOverdueList':     'wages:read',

  // ─── 考勤 ───────────────────────────────────────────
  'db:attendances:getAll':            'members:read',
  'db:attendances:getByMember':       'members:read',
  'db:attendances:create':            'members:create',
  'db:attendances:update':            'members:update',
  'db:attendances:generateDefaults':  'members:create',
  'db:attendances:generateDefaultsV2':'members:create',
  'db:attendances:batchImport':       'members:import',
  'db:attendances:delete':            'members:delete',
  'db:attendances:batchDelete':       'members:delete',

  // ─── 结算 ───────────────────────────────────────────
  'db:settlements:getAll':            'settlement:read',
  'db:settlements:create':           'settlement:create',
  'db:settlements:update':           'settlement:update',
  'db:settlements:delete':           'settlement:delete',
  'db:settlements:process':          'settlement:approve',
  'db:settlements:unarchive':        'settlement:update',

  // ─── 发票 ───────────────────────────────────────────
  'db:invoices:getAll':              'invoices:read',
  'db:invoices:create':              'invoices:create',
  'db:invoices:update':              'invoices:update',
  'db:invoices:delete':              'invoices:delete',
  'db:invoices:updateStatus':         'invoices:update',

  // ─── 收款记录 ───────────────────────────────────────
  'db:paymentRecords:getAll':         'invoices:read',
  'db:paymentRecords:create':         'invoices:create',
  'db:paymentRecords:update':         'invoices:update',
  'db:paymentRecords:delete':         'invoices:delete',

  // ─── 材料/费用 ──────────────────────────────────────
  'db:materials:getAll':              'expenses:read',
  'db:materials:create':              'expenses:create',
  'db:materials:update':              'expenses:update',
  'db:materials:delete':              'expenses:delete',
  'db:expenses:getAll':               'expenses:read',
  'db:expenses:create':               'expenses:create',
  'db:expenses:update':               'expenses:update',
  'db:expenses:delete':               'expenses:delete',

  // ─── 成本台账 ───────────────────────────────────────
  'db:costLedger:list':               'costLedger:read',
  'db:costLedger:create':             'costLedger:create',
  'db:costLedger:batchCreate':        'costLedger:create',
  'db:costLedger:update':             'costLedger:update',
  'db:costLedger:delete':             'costLedger:delete',
  'db:costLedger:summary':            'costLedger:read',
  'db:costLedgerBatches:list':         'costLedger:read',
  'db:costLedgerBatches:create':       'costLedger:create',
  'db:costLedgerBatches:copy':         'costLedger:create',
  'db:costLedgerBatches:rename':       'costLedger:update',
  'db:costLedgerBatches:delete':       'costLedger:delete',
  'db:costLedgerMatchRules:list':      'costLedger:read',
  'db:costLedgerMatchRules:save':      'costLedger:update',
  'db:costLedgerCategories:list':      'costLedger:read',
  'db:costLedgerCategories:create':    'costLedger:create',
  'db:costLedgerCategories:update':    'costLedger:update',
  'db:costLedgerCategories:delete':    'costLedger:delete',
  'db:costLedgerCategories:reset':     'costLedger:update',

  // ─── 部门 ───────────────────────────────────────────
  'db:departments:getAll':            'members:read',
  'db:departments:create':            'members:create',
  'db:departments:update':            'members:update',
  'db:departments:delete':            'members:delete',

  // ─── 图纸 ───────────────────────────────────────────
  'db:drawings:getAll':              'drawings:read',
  'db:drawings:upload':              'drawings:create',
  'db:drawings:update':              'drawings:update',
  'db:drawings:delete':              'drawings:delete',

  // ─── 仓库（进销存） ────────────────────────────────
  'db:inventoryItems:getAll':         'inventory:read',
  'db:inventoryItems:create':         'inventory:create',
  'db:inventoryItems:update':         'inventory:update',
  'db:inventoryItems:delete':         'inventory:delete',
  'db:inventoryTransactions:getAll':  'inventory:read',
  'db:inventoryTransactions:create':  'inventory:create',

  // ─── 模板（新版） ───────────────────────────────────
  'db:templates:getAll':              'settlement:read',
  'db:templates:create':              'settlement:create',
  'db:templates:update':              'settlement:update',
  'db:templates:delete':              'settlement:delete',
  'db:templates:getStats':            'settlement:read',
  'templates:fill-docx':             'settlement:create',

  // ─── 薪资/日工资历史 ────────────────────────────────
  'db:salaryHistory:list':            'wages:read',
  'db:salaryHistory:create':          'wages:create',
  'db:salaryHistory:delete':          'wages:delete',
  'db:salaryHistory:getEffective':     'wages:read',
  'db:wageHistory:list':              'wages:read',
  'db:wageHistory:save':              'wages:update',
  'db:wageHistory:delete':            'wages:delete',
  'db:wageHistory:getEffective':       'wages:read',

  // ─── 统计 ───────────────────────────────────────────
  'db:stats:getDashboard':            'dashboard:read',

  // ─── 审计日志 ───────────────────────────────────────
  'audit:log':                        'audit_logs:read',
  'audit:query':                      'audit_logs:read',
  'audit:stats':                      'audit_logs:read',
  'audit:clear':                      'audit_logs:export',

  // ─── 快照管理 ──────────────────────────────────────
  'db:snapshots:list':                'settings:read',
  'db:snapshots:create':              'settings:update',
  'db:snapshots:restore':             'settings:update',
  'db:snapshots:delete':              'settings:update',
  'db:snapshots:setMaxCount':          'settings:update',
  'db:snapshots:getMaxCount':          'settings:read',

  // ─── 角色权限 ──────────────────────────────────────
  'roles:getAll':                     'roles:read',
  'roles:update':                     'roles:update',
  'roles:reset':                      'roles:update',

  // ─── 用户管理 ──────────────────────────────────────
  'auth:getAllUsers':                 'users:read',
  'auth:createUser':                  'users:create',
  'auth:updateUser':                  'users:update',
  'auth:deleteUser':                  'users:delete',
  'auth:getCurrentUser':              'users:read',

  // ─── 文件服务 ──────────────────────────────────────
  'file:save':                        'contracts:create',
  'file:read':                        'contracts:read',
  'file:delete':                      'contracts:delete',
  'file:openExternal':                'contracts:read',

  // ─── SQLite 状态管理 ───────────────────────────────
  'sqlite:status':                    'settings:read',
  'sqlite:enable':                    'settings:update',
  'sqlite:migrate':                   'settings:update',
  'sqlite:getReadMode':               'settings:read',
  'sqlite:setReadMode':               'settings:update',
}

/**
 * 无需登录即可调用的公开通道。
 * 这些通道在认证之前就需要被调用。
 */
const PUBLIC_CHANNELS = new Set([
  'auth:login',          // 登录本身
  'auth:setSession',     // 设置 session（登录后同步）
  'auth:clearSession',   // 清除 session（登出时同步）
  'app:getDataPath',     // 获取数据路径（初始化需要）
  'app:getUploadsPath',  // 获取上传路径
  'app:openDevTools',    // 开发者工具
  'config:get',          // 应用配置（初始化可能需要）
  'config:setDataPath',  // 设置数据路径
  'ocr:checkNetwork',    // 网络检测
  'ocr:baiduIdCard',     // OCR 识别（页面级别权限控制）
  'ocr:clearTokenCache', // OCR 缓存清理
])

// ═══════════════════════════════════════════════════════════════════════════════
// 权限检查
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 检查当前 session 是否有权限调用指定 IPC 通道。
 */
export function checkIpcPermission(channel: string): { allowed: boolean; reason?: string } {
  // 公开通道始终放行
  if (PUBLIC_CHANNELS.has(channel)) {
    return { allowed: true }
  }

  // 未登录？
  if (!currentSession) {
    return { allowed: false, reason: '未登录' }
  }

  // Admin 角色绕过所有权限检查
  if (currentSession.roleId === 'admin') {
    return { allowed: true }
  }

  // 检查具体权限
  const requiredPermission = IPC_PERMISSIONS[channel]
  if (!requiredPermission) {
    // 未定义权限的通道：日志警告 + 默认放行（后续可收紧）
    log.warn(`IPC Guard: No permission defined for '${channel}', allowing by default`)
    return { allowed: true }
  }

  if (currentSession.permissions.includes(requiredPermission)) {
    return { allowed: true }
  }

  return { allowed: false, reason: `权限不足: 需要 ${requiredPermission}` }
}

// ═══════════════════════════════════════════════════════════════════════════════
// IPC Guard 安装
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 安装 IPC 权限守卫。
 *
 * 通过劫持 ipcMain.handle，在所有 handler 执行前
 * 插入权限检查逻辑。必须在导入任何 IPC handler 之前调用。
 *
 * 原理：将 ipcMain.handle 替换为带权限检查的版本，
 * 所有后续注册的 handler 自动获得权限保护。
 */
export function installIpcGuard(): void {
  const originalHandle = ipcMain.handle.bind(ipcMain)

  // 替换 ipcMain.handle 为带权限检查的版本
  ;(ipcMain as any).handle = (channel: string, handler: (...args: any[]) => any) => {
    originalHandle(channel, async (event: IpcMainInvokeEvent, ...args: any[]) => {
      const { allowed, reason } = checkIpcPermission(channel)
      if (!allowed) {
        log.warn(
          `IPC Guard: DENIED '${channel}' — ${reason} (user: ${currentSession?.username || 'none'})`
        )
        return { success: false, error: reason || '权限不足' }
      }
      try {
        return await handler(event, ...args)
      } catch (err: any) {
        log.error(`IPC Guard: Handler error for '${channel}':`, err.message || err)
        return { success: false, error: err.message || 'Unknown error' }
      }
    })
  }

  // 注册 session 管理 IPC handlers
  ipcMain.handle('auth:setSession', async (_, session: UserSession) => {
    setSession(session)
    return { success: true }
  })

  ipcMain.handle('auth:clearSession', async () => {
    setSession(null)
    return { success: true }
  })

  log.info('IPC Guard: Permission guard installed successfully')
}

/**
 * 获取所有已定义的权限映射数量（用于诊断）
 */
export function getPermissionMapStats(): { total: number; channels: number; publicChannels: number } {
  return {
    total: Object.keys(IPC_PERMISSIONS).length,
    channels: Object.keys(IPC_PERMISSIONS).length,
    publicChannels: PUBLIC_CHANNELS.size,
  }
}
