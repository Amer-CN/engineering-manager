/**
 * 工程管家 - Electron 主进程入口
 * 
 * 模块化架构：
 * - database.ts: 数据库初始化和操作
 * - ipc-handlers/: 按业务模块拆分的 IPC 处理器
 */

import { app, BrowserWindow, globalShortcut, protocol, net } from 'electron'
import path from 'path'
import fs from 'fs'
import log from 'electron-log'
import { pathToFileURL } from 'url'

// 配置日志
log.transports.file.level = 'info'
log.transports.file.encoding = 'utf8'
log.transports.console.level = 'debug'
log.info('App starting...')

// ═══════════════════════════════════════════════════════════════════════════════
// 导入模块
// ═══════════════════════════════════════════════════════════════════════════════

import {
  initDatabase,
  saveDatabase,
  getUploadsPath,
  db,
  config,
} from './database'
import { ensureUnclassifiedDirs } from './file-service'

// ═══════════════════════════════════════════════════════════════════════════════
// IPC 权限守卫（必须在导入 IPC handlers 之前安装）
// ═══════════════════════════════════════════════════════════════════════════════
import { installIpcGuard } from './ipc-guard'
installIpcGuard()

// SQLite 模块（可选，不影响 JSON 存储正常运行）
import { initSqliteDb, closeSqliteDb, loadPersistedReadMode } from './sqlite'

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'contract-file',
    privileges: {
      bypassCSP: true,
      stream: true,
      supportFetchAPI: true
    }
  }
])

// 导入 IPC 处理器（自动注册所有处理器）
import './ipc-handlers'

// ═══════════════════════════════════════════════════════════════════════════════
// 窗口管理
// ═══════════════════════════════════════════════════════════════════════════════

let mainWindow: BrowserWindow | null = null

/**
 * 创建主窗口
 */
function createWindow() {
  // 防止重复创建窗口
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.focus()
    return
  }

  log.info('Creating main window...')

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true   // 保持安全策略开启（OCR 已移至主进程 IPC）
    },
    title: '工程管家',
    show: false
  })

  // 开发模式下加载 localhost
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    // DevTools 可通过 Ctrl+Shift+I 手动打开，不自动弹出
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
    log.info('Window ready')
  })
  
  // 注册全局快捷键：Ctrl+Shift+I 打开开发者工具
  globalShortcut.register('CommandOrControl+Shift+I', () => {
    if (mainWindow) {
      mainWindow.webContents.toggleDevTools()
      log.info('DevTools opened')
    }
  })
  
  // 窗口关闭时保存数据库
  mainWindow.on('close', () => {
    saveDatabase()
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// 应用生命周期
// ═══════════════════════════════════════════════════════════════════════════════

app.whenReady().then(async () => {
  log.info('App ready')

  // 注册 contract-file 协议处理器，用于合同附件 PDF 预览
  protocol.handle('contract-file', (request) => {
    try {
      const url = new URL(request.url)
      const rawPath = decodeURIComponent(url.pathname.replace(/^\//, ''))
      const uploadsPath = getUploadsPath()

      // 解析路径：支持多种格式
      //   "项目名/income/filename.pdf"  (project + subCategory)
      //   "income/filename.pdf"         (subCategory only)
      //   "filename.pdf"                (filename only)
      const parts = rawPath.split('/')
      let projectName: string | null | undefined
      let subCategory: string | undefined
      let fileName: string
      let idx = 0

      if (parts.length >= 2 && parts[0] !== 'income' && parts[0] !== 'expense' && !/^\d+$/.test(parts[0])) {
        projectName = parts[0]
        idx = 1
      } else if (parts.length >= 2 && /^\d+$/.test(parts[0]) && (parts[1] === 'income' || parts[1] === 'expense')) {
        idx = 1  // 跳过旧的数字 projectId
      }
      if (idx < parts.length && (parts[idx] === 'income' || parts[idx] === 'expense')) {
        subCategory = parts[idx]
        fileName = parts.slice(idx + 1).join('/')
      } else if (idx === 0) {
        fileName = rawPath
      } else {
        fileName = parts.slice(idx).join('/')
      }

      // 中文目录名映射
      const cnName: Record<string, string> = { income: '合同/收入', expense: '合同/支出' }
      const subCats = subCategory ? [subCategory] : ['income', 'expense']
      const prefixes: (string | undefined)[] = []

      if (projectName !== undefined && projectName !== null && projectName !== '') {
        prefixes.push(projectName)
        prefixes.push('未分类')
      } else {
        prefixes.push('未分类')
      }
      prefixes.push('_common')  // 兼容旧 _common 目录
      prefixes.push(undefined)

      const pathsToTry: string[] = []
      for (const prefix of prefixes) {
        for (const sub of subCats) {
          if (prefix !== undefined) {
            pathsToTry.push(path.resolve(uploadsPath, prefix, cnName[sub], fileName))
            pathsToTry.push(path.resolve(uploadsPath, prefix, 'contracts', sub, fileName))
          } else {
            // 无前缀：中文 + 英文旧路径
            pathsToTry.push(path.resolve(uploadsPath, cnName[sub], fileName))
            pathsToTry.push(path.resolve(uploadsPath, 'contracts', sub, fileName))
          }
        }
      }
      // 旧路径兜底（contracts/ 根目录）
      pathsToTry.push(path.resolve(uploadsPath, 'contracts', fileName))

      for (const requestedPath of pathsToTry) {
        if (!requestedPath.startsWith(uploadsPath)) {
          continue
        }
        if (fs.existsSync(requestedPath)) {
          log.info(`Serving contract file: ${fileName}`)
          return net.fetch(pathToFileURL(requestedPath).href)
        }
      }

      log.warn(`Contract file not found: ${rawPath}`)
      return new Response('Not Found', { status: 404 })
    } catch (err) {
      log.error('Contract file protocol error:', err)
      return new Response('Not Found', { status: 404 })
    }
  })

  await initDatabase()

  // ── 可选：初始化 SQLite 数据库 ────────────────────────────────────────────
  // SQLite 与 JSON 并行运行，不强制迁移，仅作为渐进式替代的基础设施准备
  // Phase 7.2：自动初始化，失败不影响应用正常启动
  try {
    if (config?.dataPath) {
      initSqliteDb(config.dataPath)
      loadPersistedReadMode() // 从配置表恢复上次的读取模式
      log.info('[SQLite] 初始化成功，路径:', config.dataPath)
    } else {
      log.warn('[SQLite] 跳过初始化：dataPath 未就绪')
    }
  } catch (err) {
    log.warn('[SQLite] 初始化失败（不影响应用运行）:', err)
  }
  // ────────────────────────────────────────────────────────────────────────────

  // rename old English folders to Chinese under 未分类/ if they still exist
  const uploadsBase = getUploadsPath()
  const unclassifiedBase = path.join(uploadsBase, '未分类')
  // rename old English flat folders to Chinese under 未分类/
  const renameMap = {
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
  }
  for (const [eng, chn] of Object.entries(renameMap)) {
    const engP = path.join(uploadsBase, eng)
    const chnP = path.join(uploadsBase, chn)
    const engExists = fs.existsSync(engP)
    const chnExists = fs.existsSync(chnP)
    if (engExists) {
      if (chnExists) {
        try {
          const contents = fs.readdirSync(chnP)
          if (contents.length === 0) {
            fs.rmdirSync(chnP)
            fs.mkdirSync(path.dirname(chnP), { recursive: true })
            fs.renameSync(engP, chnP)
            log.info("Renamed (overwrote empty): " + eng + " → " + chn)
          }
        } catch(e) {
          log.warn("Error handling " + eng + ": " + e.message)
        }
      } else {
        try {
          fs.mkdirSync(path.dirname(chnP), { recursive: true })
          fs.renameSync(engP, chnP)
          log.info("Renamed: " + eng + " → " + chn)
        } catch(e) {
          log.warn("Failed to rename " + eng + ": " + e.message)
        }
      }
    }
  }
  // Clean up any empty root-level Chinese flat directories left from old rename logic
  const oldFlatChineseDirs = ['发票', '收付款', '合同', '合作单位', '成员', '图纸']
  for (const dir of oldFlatChineseDirs) {
    const p = path.join(uploadsBase, dir)
    try {
      if (fs.existsSync(p) && fs.readdirSync(p).length === 0) {
        fs.rmdirSync(p, { recursive: true })
        log.info("Removed empty flat dir: " + dir)
      }
    } catch(e) { /* ignore */ }
  }
  // Clean up any empty root-level English flat directories
  const oldFlatEngDirs = ['members', 'invoices', 'payments', 'partners', 'contracts', 'drawings']
  for (const dir of oldFlatEngDirs) {
    const p = path.join(uploadsBase, dir)
    try {
      if (fs.existsSync(p) && fs.readdirSync(p).length === 0) {
        fs.rmdirSync(p, { recursive: true })
        log.info("Removed empty flat dir: " + dir)
      }
    } catch(e) { /* ignore */ }
  }
  ensureUnclassifiedDirs()
  log.info("Unclassified directories ensured")

  // migrate base64 to disk files (one-time)
  if (!db._migrations?.fileStorageV1) {
    log.info("Running file storage migration...")
    let migratedCount = 0
    function saveB64(v, cat, sub) {
      if (!v || !v.startsWith("data:")) return v
      const m = (v.match(/^data:([^;]+);/)||[])[1]||""
      let e = ".bin"
      if (m.includes("jpeg")) e = ".jpg"
      else if (m.includes("png")) e = ".png"
      else if (m.includes("webp")) e = ".webp"
      else if (m.includes("gif")) e = ".gif"
      else if (m.includes("pdf")) e = ".pdf"
      else if (m.includes("word")) e = ".docx"
      else if (m.includes("sheet")) e = ".xlsx"
      const raw = v.split(",")[1]
      const buf = Buffer.from(raw, "base64")
      const name = Date.now()+"_"+Math.random().toString(36).substring(2,8)+e
      const d = path.join(uploadsBase, cat, sub)
      if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true })
      fs.writeFileSync(path.join(d, name), buf)
      migratedCount++
      return name
    }
    if (db.members) for (const m of db.members) {
      m.idCardFront = saveB64(m.idCardFront, "成员", "身份证")
      m.idCardBack = saveB64(m.idCardBack, "成员", "身份证")
      m.contractFile = saveB64(m.contractFile, "成员", "劳动合同")
      m.safetyTrainingFile = saveB64(m.safetyTrainingFile, "成员", "安全培训")
      m.healthReportFile = saveB64(m.healthReportFile, "成员", "健康报告")
      m.specialCertificateFile = saveB64(m.specialCertificateFile, "成员", "特种证书")
    }
    if (db.invoices) for (const inv of db.invoices) {
      inv.fileUrl = saveB64(inv.fileUrl, "发票", inv.type === "invoice_out" ? "开票" : "收票")
    }
    if (db.paymentRecords) for (const r of db.paymentRecords) {
      r.fileUrl = saveB64(r.fileUrl, "收付款", r.type === "invoice_out" ? "回款" : "付款")
    }
    if (db.partners) for (const p of db.partners) {
      p.licenseFile = saveB64(p.licenseFile, "合作单位", "营业执照")
      if (p.otherFiles && typeof p.otherFiles === "string") {
        const parts = p.otherFiles.split("|||")
        const np = parts.map(part => part.startsWith("data:") ? saveB64(part, "合作单位", "附件") : part)
        p.otherFiles = np.join("|||")
      }
    }
    if (db.drawings) for (const d of db.drawings) {
      if (d.filePath) {
        const oldP = path.join(uploadsBase, d.filePath)
        const newP = path.join(uploadsBase, "图纸/文件", d.filePath)
        if (fs.existsSync(oldP) && !fs.existsSync(newP)) {
          try { fs.renameSync(oldP, newP) } catch { fs.copyFileSync(oldP, newP); fs.unlinkSync(oldP) }
        }
      }
    }
    if (!db._migrations) db._migrations = {}
    db._migrations.fileStorageV1 = true
    saveDatabase()
    log.info("File storage migration complete. Migrated " + migratedCount + " files.")
  }

  createWindow()
})

app.on('window-all-closed', () => {
  log.info('All windows closed')
  saveDatabase()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.on('before-quit', () => {
  log.info('App quitting')
  saveDatabase()
  // 关闭 SQLite（WAL checkpoint + 连接释放）
  try {
    closeSqliteDb()
  } catch (err) {
    log.warn('[SQLite] 关闭时异常（忽略）:', err)
  }
})
