# Phase 7: 数据库架构评估与 SQLite 迁移规划

> 评估时间：2026-05-20
> 评估范围：`electron/database.ts` + 29 个 IPC Handler

---

## 一、现状分析

### 1.1 当前架构

```
用户数据目录 (defaultDataPath)
└── engineering.json          ← 单个 JSON 文件，包含所有数据
├── projects[]
├── members[]
├── tasks[]
├── materials[]
├── expenses[]
├── costLedger[]
├── drawings[]
├── partners[]
├── incomeContracts[]
├── expenseContracts[]
├── agreementContracts[]
├── workerTeams[]
├── settlements[]
├── templates[]
├── inventoryItems[]
├── invoices[]
├── paymentRecords[]
├── workers[]
├── projectWorkers[]
├── auditLogs[]
├── wages[]
├── attendances[]
└── departments[]
```

**存储路径**：
- 开发环境：`app.getPath('userData')` → `%APPDATA%/engineering管家/`
- 打包环境：`D:\Company Database\`（可配置）

### 1.2 当前操作模式

| 操作 | 当前实现 | 问题 |
|------|---------|------|
| **读取** | `JSON.parse(fs.readFileSync())` | 全量加载，O(n) 查找 |
| **写入** | `JSON.stringify` → `fs.writeFileSync` | 无 WAL，并发写入风险 |
| **备份** | 快照系统（最多200个 `.json` 副本） | 占用空间大（每份 = 全量数据） |
| **原子性** | `rename` 覆盖写入 | ✅ 已有 |
| **并发** | 无锁机制 | ❌ 存在竞态风险 |

### 1.3 关键代码片段

```typescript
// electron/database.ts — 写入操作
export function saveDatabase() {
  const dbPath = getDbPath()
  const tmpPath = dbPath + '.tmp'
  fs.writeFileSync(tmpPath, JSON.stringify(db, null, 2), 'utf8')
  fs.renameSync(tmpPath, dbPath)  // 原子覆盖
}
```

```typescript
// electron/database.ts — 快照系统
export function createSnapshot(label?: string): SnapshotInfo {
  fs.copyFileSync(dbPath, snapshotFile)
  // ...更新索引
}
```

### 1.4 数据规模估算

根据 `getDbSummary()` 监控的表：

| 表名 | 规模 | 查询场景 |
|------|------|---------|
| `projects` | 10-100 | 低频 |
| `members` / `workers` | 100-1000 | 中频 |
| `costLedger` | 1000-10000 | **高频**（成本分析） |
| `invoices` | 100-1000 | 中频 |
| `auditLogs` | 5000-50000 | 中频 |
| `wages` / `attendances` | 1000-10000 | 高频（月度工资） |

---

## 二、痛点评估

### 2.1 JSON 存储的核心问题

| 痛点 | 严重程度 | 影响 |
|------|---------|------|
| **全量加载** | 🔴 高 | 启动时读取整个 `engineering.json`，数据越大越慢 |
| **O(n) 查询** | 🔴 高 | `Array.find()` / `Array.filter()`，万条数据时卡顿 |
| **无索引** | 🔴 高 | 按 `projectId` 查询成本台账，需扫描全表 |
| **快照体积大** | 🟠 中 | 200 份快照 = 200 × engineering.json ≈ GB 级 |
| **并发写入** | 🟠 中 | Electron 多窗口 / 多个 IPC 并发写入可能损坏 |
| **类型安全** | 🟡 低 | JSON 无 Schema，运行时才发现类型错误 |
| **事务缺失** | 🟡 低 | 多表更新（如：新建合同+关联付款记录）非原子 |

### 2.2 用户实际体验

根据 MEMORY.md 中记录的工作场景：

> **安岳县 2025 年高标准农田项目** — 涉及大量工人考勤、工资发放、银行回单解析

- 每月工资核算需频繁查询 `costLedger`（数千条记录）
- 考勤导入时批量写入（100+ 工人 × 多天）
- 银行回单 PDF 解析后匹配工资记录

**这些场景在 JSON 架构下都面临性能瓶颈。**

---

## 三、SQLite vs JSON 方案对比

### 3.1 方案 A：保持 JSON（现状）

| 维度 | 评分 | 说明 |
|------|------|------|
| 开发成本 | ⭐⭐⭐⭐⭐ | 零迁移成本 |
| 简单性 | ⭐⭐⭐⭐⭐ | 人类可读，易调试 |
| 备份/同步 | ⭐⭐⭐⭐ | 快照系统 + 文件复制 |
| 查询性能 | ⭐⭐ | 全量加载，O(n) |
| 并发安全 | ⭐ | 无锁，有损坏风险 |
| 事务支持 | ⭐ | 无 |
| 扩展性 | ⭐⭐ | 大数据量后无法优化 |

### 3.2 方案 B：迁移到 SQLite

| 维度 | 评分 | 说明 |
|------|------|------|
| 开发成本 | ⭐⭐ | 需重写所有 IPC Handler |
| 简单性 | ⭐⭐⭐ | 有桌面工具（DB Browser for SQLite） |
| 备份/同步 | ⭐⭐⭐ | SQLite 文件直接复制，或 `.backup` 命令 |
| 查询性能 | ⭐⭐⭐⭐⭐ | 索引 + B-Tree，百万级数据轻松 |
| 并发安全 | ⭐⭐⭐⭐ | WAL 模式，写锁细粒度 |
| 事务支持 | ⭐⭐⭐⭐⭐ | 完整 ACID |
| 扩展性 | ⭐⭐⭐⭐⭐ | 表结构可扩展，字段增删灵活 |

### 3.3 方案 C：JSON + SQLite 混合（过渡方案）

| 维度 | 评分 | 说明 |
|------|------|------|
| 开发成本 | ⭐⭐⭐ | 部分迁移，逐步推进 |
| 查询性能 | ⭐⭐⭐⭐ | 高频查询走 SQLite，低频走 JSON |
| 风险 | ⭐⭐⭐ | 两套系统需维护一致性 |

---

## 四、推荐方案：渐进式 SQLite 迁移

**推荐方案 B（纯 SQLite）配合 C（渐进实施）**。

**理由**：
1. `better-sqlite3` 已在 `vite.config.ts` 的 external 中预留
2. 项目已稳定，不太可能在短期内再次重构存储
3. SQLite 的 WAL 模式支持并发读取（多个渲染进程 IPC 查询）
4. 建表后可随时 `CREATE INDEX`，性能提升显著

---

## 五、SQLite 迁移路线图

### Phase 7.1：基础设施搭建（1-2 天）

**目标**：搭建 SQLite 基础设施，不影响现有功能

#### 5.1.1 安装依赖

```bash
npm install better-sqlite3
npm install -D @types/better-sqlite3
```

#### 5.1.2 创建数据库初始化模块

```typescript
// electron/sqlite/db-init.ts
import Database from 'better-sqlite3'
import path from 'path'
import log from 'electron-log'

let db: Database.Database | null = null

export function initDatabase(dataPath: string): Database.Database {
  const dbPath = path.join(dataPath, 'engineering.db')
  db = new Database(dbPath)
  
  // 启用 WAL 模式：支持并发读取，写入不阻塞读
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  
  // 创建所有表
  createTables(db)
  
  log.info('SQLite database initialized:', dbPath)
  return db
}

function createTables(db: Database.Database) {
  db.exec(`
    -- 基础项目表
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    
    -- 成员表（农民工 + 管理人员）
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      member_type TEXT NOT NULL,  -- 'staff' | 'worker'
      project_id INTEGER REFERENCES projects(id),
      team_id INTEGER,
      phone TEXT,
      id_card TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now'))
    );
    
    -- 更多表...
  `)
  
  // 创建关键索引
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_members_project ON members(project_id);
    CREATE INDEX IF NOT EXISTS idx_members_team ON members(team_id);
    CREATE INDEX IF NOT EXISTS idx_cost_ledger_project ON cost_ledger(project_id);
    CREATE INDEX IF NOT EXISTS idx_cost_ledger_date ON cost_ledger(date);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
  `)
}

export function getDb(): Database.Database {
  if (!db) throw new Error('Database not initialized')
  return db
}
```

### Phase 7.2：数据迁移脚本（2-3 天）

**目标**：一次性将现有 JSON 数据迁移到 SQLite

#### 5.2.1 迁移脚本设计

```typescript
// electron/sqlite/migrate.ts
import { db as jsonDb } from '../database'
import { getDb } from './db-init'
import log from 'electron-log'

export function migrateFromJSON(): { success: boolean; error?: string } {
  const sqlite = getDb()
  const transaction = sqlite.transaction(() => {
    
    // 1. 迁移项目
    const insertProject = sqlite.prepare(`
      INSERT INTO projects (id, name, code, status, created_at)
      VALUES (?, ?, ?, ?, ?)
    `)
    for (const p of jsonDb.projects || []) {
      insertProject.run(p.id, p.name, p.code, p.status, p.createdAt)
    }
    
    // 2. 迁移成员
    const insertMember = sqlite.prepare(`
      INSERT INTO members (id, name, member_type, project_id, team_id, phone, id_card, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    for (const m of jsonDb.members || []) {
      insertMember.run(m.id, m.name, m.memberType, m.projectId, m.teamId, m.phone, m.idCard, m.status)
    }
    
    // ... 更多表
  })
  
  try {
    transaction()
    log.info('Migration completed successfully')
    return { success: true }
  } catch (e) {
    log.error('Migration failed:', e)
    return { success: false, error: String(e) }
  }
}
```

#### 5.2.2 迁移策略

| 阶段 | 操作 | 风险 |
|------|------|------|
| **备份** | 复制 `engineering.json` 到 `engineering.json.backup` | 低 |
| **验证** | 对比 JSON 和 SQLite 数据行数 | 低 |
| **切换** | 新增 `SQLITE_ENABLED` 配置项，默认 false | 低 |
| **灰度** | 用户手动开启 SQLite（设置页面） | 低 |
| **全量** | 验证稳定后，默认启用 SQLite | 中 |

### Phase 7.3：IPC Handler 重构（5-10 天）

**目标**：逐个将 JSON 操作改为 SQLite

#### 5.3.1 重构模式

每个 IPC Handler 需要修改：

```typescript
// 修改前（JSON）
ipcMain.handle('members:list', async () => {
  return db.members.filter(m => m.status === 'active')
})

// 修改后（SQLite）
ipcMain.handle('members:list', async () => {
  const stmt = getDb().prepare('SELECT * FROM members WHERE status = ?')
  return stmt.all('active')
})
```

#### 5.3.2 优先级排序

| 优先级 | 模块 | 理由 |
|--------|------|------|
| 🔴 P0 | `costLedger` | 高频查询 + 大量数据 |
| 🔴 P0 | `auditLogs` | 数据量大，查询频繁 |
| 🟠 P1 | `members` / `workers` | 核心业务，频繁增删改 |
| 🟠 P1 | `wages` / `attendances` | 月度工资，高峰期写入 |
| 🟡 P2 | `projects` | 低频，数量少 |
| 🟡 P2 | `contracts` | 低频，金额敏感 |
| 🟡 P2 | `invoices` | 中频 |

### Phase 7.4：功能验证（2-3 天）

- [ ] 所有 IPC Handler 行为一致
- [ ] 数据迁移完整性（行数 + 关键字段校验）
- [ ] 快照系统兼容（从 SQLite 导出 JSON 快照）
- [ ] 并发测试（多窗口同时操作）
- [ ] 性能测试（千/万条数据查询时间）

---

## 六、风险与缓解

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| 迁移过程中数据损坏 | 低 | 高 | 迁移前强制备份；事务包裹 |
| SQLite 首次启动慢 | 低 | 低 | WAL 预写日志已开启 |
| 多进程并发写锁 | 中 | 中 | 使用 `IMMEDIATE` 事务 |
| 用户数据丢失 | 极低 | 极高 | 保留 JSON 回退；快照系统 |
| 查询语法错误 | 中 | 中 | 为每条查询写单元测试 |

---

## 七、决策建议

### 立即行动（推荐）

**现在就开始 Phase 7.1（基础设施）**，原因：

1. **影响最小**：只添加代码，不修改现有逻辑
2. **收益可见**：`better-sqlite3` 安装后即可体验查询速度
3. **为后续奠基**：表结构设计 + 索引规划越早越好

### 不推荐现在迁移的理由

- 现有 JSON 系统运行稳定
- 用户正在处理安岳县项目，不宜冒险
- 迁移需要完整的端到端测试

### 最终建议

> **Phase 7.1（基础设施）立即开始**，后续 phases 在稳定期推进。
>
> 预计时间：Phase 7.1 = 1-2 天；全部迁移 = 2-4 周。

---

## 八、下一步行动

- [ ] 安装 `better-sqlite3` 和类型定义
- [ ] 创建 `electron/sqlite/` 目录结构
- [ ] 实现 `db-init.ts`（表结构 + 索引）
- [ ] 设计完整的 SQLite Schema（参考 `electron/database.ts` 的 Database 接口）
- [ ] 创建迁移脚本骨架
- [ ] 为 `costLedger` 创建 SQLite 版本 IPC Handler（P0）

---

*文档版本：v1.0 | 评估日期：2026-05-20*
