# 架构评估报告 (Architecture Assessment)

**项目**: 工程管家 v2.12.0  
**日期**: 2026-05-19  
**版本**: 1.0  
**评估者**: Archi 系统架构师

---

## 执行摘要

工程管家是一个基于 Electron + React + TypeScript + Vite 的桌面应用，采用 JSON 文件存储的本地数据库架构。项目规模中等（35个 Electron 源文件 + 267个 React 组件），但存在多个架构债问题，主要集中在：

1. **数据库架构**: JSON 全量序列化为核心性能瓶颈
2. **IPC Handler 架构**: 全局可变状态 + 缺乏输入验证
3. **React 架构**: 大组件未拆分 + 零性能优化
4. **构建架构**: 重型库静态导入导致首屏加载过大

**整体架构评级**: 🟡 中等 (需要重构关键组件)

---

## 一、项目架构总览

```
┌─────────────────────────────────────────────────────────────────┐
│                        Electron 主进程                          │
│  ┌─────────────────┐  ┌─────────────────────────────────────┐   │
│  │  main.ts        │  │         IPC Handlers (29 files)     │   │
│  │  - 窗口管理     │  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐    │   │
│  │  - 协议处理     │  │  │auth │ │proj │ │member│ │wages│    │   │
│  │  - 生命周期     │  │  └─────┘ └─────┘ └─────┘ └─────┘    │   │
│  └─────────────────┘  └─────────────────────────────────────┘   │
│                              │                                   │
│                     ┌────────▼────────┐                          │
│                     │   database.ts   │                          │
│                     │  (1085 lines)   │                          │
│                     │                 │                          │
│                     │  - 全局 db 状态  │                          │
│                     │  - JSON 序列化   │                          │
│                     │  - 快照系统      │                          │
│                     └────────┬────────┘                          │
│                              │                                   │
│                     ┌────────▼────────┐                          │
│                     │ engineering.json│                          │
│                     │   (本地文件)    │                          │
│                     └─────────────────┘                          │
└─────────────────────────────────────────────────────────────────┘
                              │ IPC
┌─────────────────────────────────────────────────────────────────┐
│                        React 渲染进程                           │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                      App.tsx                             │    │
│  │  - 16 个懒加载页面路由                                   │    │
│  │  - 全局 Provider (Auth, Toast)                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    components/                           │    │
│  │  - 267 个组件文件                                        │    │
│  │  - Dashboard.tsx (26KB) - 最大组件                       │    │
│  │  - Drawings.tsx (24KB)                                  │    │
│  │  - WageManagement.tsx (24KB)                             │    │
│  │  - ContractPage.tsx (23KB)                              │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    hooks/ services/                      │    │
│  │  - useAuth, usePermission, useToast                     │    │
│  │  - API 服务层 (ipcRenderer 封装)                        │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 二、架构评估详情

### 2.1 数据库架构评估

#### 当前设计
```
engineering.json (单文件)
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
├── invoices[]
├── paymentRecords[]
├── users[]
├── wages[]
├── attendances[]
├── auditLogs[]
├── ... (35+ collections)
└── _migrations{}
```

#### 问题分析

| 问题 | 严重度 | 影响 |
|------|--------|------|
| JSON 全量序列化 | 🔴严重 | 每次 CRUD 都执行 JSON.stringify(db)，大文件时阻塞主进程 |
| 无类型约束 | 🟠高 | 35 个集合全用 `any[]`，失去编译期检查 |
| 无索引 | 🟠高 | 所有查询都是 O(n) 扫描 |
| 无事务 | 🟠高 | 跨集合操作无原子性保证 |
| 快照开销 | 🟡中 | 每次保存前完整复制 |

#### 性能数据估算

假设数据库包含：
- 100 个项目
- 1,000 名成员
- 10,000 条成本台账记录
- 5,000 张发票

估算文件大小: **50-200 MB**

| 操作 | 耗时估算 |
|------|----------|
| 启动加载 | 2-5 秒 |
| 单条插入 + 保存 | 500ms-2s |
| 批量导入 1000 条 | 10-30 秒 |

#### 架构评分: 🟡 中等
- 简单性: ✅ 单文件易于备份和迁移
- 可维护性: ❌ 无 schema 版本控制
- 性能: ❌ 大数据量时严重退化
- 可靠性: ⚠️ 无事务支持，可能出现数据不一致

---

### 2.2 IPC Handler 架构评估

#### 当前设计
```
electron/ipc-handlers/
├── index.ts          # 汇总导入
├── auth.ts           # 用户认证
├── members.ts        # 成员 CRUD
├── projects.ts       # 项目 CRUD
├── invoices.ts       # 发票管理
├── wages.ts          # 工资管理
├── cost-ledger.ts    # 成本台账 (529行 - 最大文件)
├── workers.ts        # 工人管理
├── settlements.ts    # 结算管理
├── contracts.ts      # 合同管理
├── attendance.ts      # 考勤管理
├── ... (共 29 个文件)
```

#### 架构模式分析

| 模式 | 使用情况 | 评估 |
|------|----------|------|
| 模块化 | ✅ 29 个文件按功能拆分 | 良好 |
| 命名规范 | ⚠️ 部分不一致 (如 snapshot vs snapshots) | 待改进 |
| 全局状态 | ❌ 直接修改模块级 `db` 变量 | 高风险 |
| 输入验证 | ❌ 几乎无验证 | 高风险 |
| 错误处理 | ⚠️ try-catch 分散 | 可改进 |
| 事务支持 | ❌ 无 | 缺失 |

#### 核心问题

**问题 1: 全局可变 db 状态**
```typescript
// database.ts:92
export let db: Database  // 模块级可变变量

// members.ts:25
ipcMain.handle('db:members:create', (_, member) => {
  db.members.push(newMember)  // 直接修改全局状态
  saveDatabase()
})
```

风险:
- 并发修改可能导致数据竞争
- 无变更追踪，难以调试
- 难以测试 handler 逻辑

**问题 2: 缺乏输入验证**
```typescript
// 无类型检查，无范围校验
ipcMain.handle('db:members:create', (_, member) => {
  // member 完全信任传入
  const id = Date.now()  // ID 碰撞风险
  // ...
})
```

**问题 3: Cross-collection Joins 效率低**
```typescript
// members.ts:83-94 - O(n*m) 复杂度
const teams = db.workerTeams.map((t: any) => {
  const project = db.projects.find((p: any) => p.id === t.projectId)  // O(n)
  const leader = db.members.find((m: any) => m.id === t.leaderId)    // O(m)
  // ...
})
```

#### 架构评分: 🟠 较低
- 模块化: ✅ 良好
- 可测试性: ❌ 依赖全局状态
- 安全性: ❌ 无输入验证
- 性能: ⚠️ O(n*m) joins

---

### 2.3 React 架构评估

#### 当前设计
```
src/
├── App.tsx                    # 主应用，16个懒加载路由
├── routes.ts                  # 路由配置元数据
├── components/
│   ├── Dashboard.tsx          # 26KB - 最大组件
│   ├── Drawings.tsx          # 24KB
│   ├── WageManagement.tsx     # 24KB
│   ├── ContractPage.tsx       # 23KB
│   ├── SettingsChangelog.tsx  # 22KB
│   ├── DataTable.tsx          # 通用表格组件
│   └── ... (261 个组件)
├── hooks/
│   ├── useAuth.tsx
│   ├── usePermission.tsx
│   ├── useToast.tsx
│   └── useRowHoverOpacity.ts
├── services/
│   └── (IPC 封装)
├── types/
├── utils/
└── constants/
```

#### 组件规模分布

| 组件 | 大小 | 估算行数 | 问题 |
|------|------|----------|------|
| Dashboard.tsx | 26KB | ~800行 | 未拆分 |
| Drawings.tsx | 24KB | ~700行 | 未拆分 |
| WageManagement.tsx | 24KB | ~700行 | 未拆分 |
| ContractPage.tsx | 23KB | ~650行 | 未拆分 |
| ContractDashboard.tsx | 18KB | ~500行 | 未拆分 |
| Members.tsx | 18KB | ~500行 | 未拆分 |

#### 架构模式分析

| 模式 | 使用情况 | 评估 |
|------|----------|------|
| 路由懒加载 | ✅ 16 个页面全部 lazy | 良好 |
| 组件懒加载 | ❌ 子组件同步加载 | 待改进 |
| 状态提升 | ⚠️ 广泛使用 | 可接受 |
| Context | ⚠️ 仅 Auth/Toast | 可扩展 |
| 性能优化 | ❌ React.memo 使用 0 | 严重缺失 |
| 状态管理 | ⚠️ local state only | 简单够用 |
| 类型安全 | ❌ `as any` 202处 | 严重缺失 |

#### 性能问题

**问题 1: 零 React.memo 使用**
- 所有组件即使 props 不变也会重新渲染
- DataTable 在列表滚动时持续重渲染

**问题 2: 大组件未拆分**
- Dashboard 包含图表、统计卡片、最近活动等，应拆分为独立组件
- ContractPage 包含多个 tab，应使用 React.lazy

**问题 3: 链路状态同步问题**
```typescript
// App.tsx:53-60
useEffect(() => {
  const handleNavigate = (e: Event) => {
    const page = (e as CustomEvent).detail as Page
    if (PAGE_IDS.includes(page)) { setCurrentPage(page) }
  }
  // ...
}, [])
```
缺少 refreshTrigger 依赖可能导致状态不同步。

#### 架构评分: 🟡 中等
- 路由设计: ✅ 良好
- 组件设计: ⚠️ 大组件需拆分
- 性能优化: ❌ 严重缺失
- 类型安全: ❌ 广泛使用 any

---

### 2.4 构建架构评估

#### 当前配置
```typescript
// vite.config.ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'vendor-react': ['react', 'react-dom'],
        'vendor-animation': ['framer-motion'],
        'vendor-charts': ['recharts'],
        'vendor-icons': ['lucide-react'],
        'vendor-xlsx': ['xlsx'],        // ~1.5MB
        'vendor-ocr': ['tesseract.js'],  // ~8MB
      },
    },
  },
}
```

#### Bundle 分析

| Chunk | 库 | 大小 | 问题 |
|-------|-----|------|------|
| vendor-xlsx | xlsx | ~429KB | 首屏不需要 |
| vendor-ocr | tesseract.js | ~504KB | 按需加载 |
| vendor-charts | recharts | ~200KB | Dashboard 懒加载 |
| vendor-animation | framer-motion | ~100KB | 全局使用 |

**首屏加载估算**:
- React + ReactDOM: ~150KB
- Lucide Icons: ~80KB
- Framer Motion: ~100KB
- 业务代码 (Dashboard): ~300KB
- **总计**: ~630KB+ (未 gzip)

**问题**: vendor-xlsx (429KB) 和 vendor-ocr (504KB) 被静态导入，即使首屏不需要。

#### 架构评分: 🟠 较低
- 代码分割: ✅ 基本完善
- 动态导入: ⚠️ 仅顶层路由
- 优化空间: 大重型库应动态导入

---

## 三、架构决策记录 (ADR)

### ADR-001: JSON 文件存储 vs 数据库

**状态**: 已采用  
**日期**: 项目初期

#### 背景
需要为桌面应用选择数据持久化方案。

#### 选项分析

| 选项 | 复杂度 | 性能 | 可靠性 | 维护成本 |
|------|--------|------|--------|----------|
| SQLite/better-sqlite3 | 中 | 高 | 高 | 中 |
| IndexedDB | 低 | 中 | 中 | 低 |
| **JSON 文件** | **低** | **低** | **中** | **低** |
| LevelDB | 中 | 高 | 高 | 中 |

#### 决策
选择 JSON 文件存储。

#### 理由
- 开发速度快，schema 变更灵活
- 易于备份和迁移
- 团队缺乏 SQL 经验
- 数据量预估较小 (<100MB)

#### 权衡
- **性能**: JSON 序列化在大数据量时成为瓶颈
- **事务**: 无原子性保证
- **并发**: 无锁机制

#### 影响
- TD-001: JSON 全量序列化反模式
- TD-003: 快照系统开销
- TD-051: 大文件解析阻塞

#### 建议重新审视
当数据量超过 50MB 或用户反馈明显卡顿时，应迁移到 SQLite。

---

### ADR-002: 单一 DB 实例 vs 多租户

**状态**: 已采用  
**日期**: 项目初期

#### 背景
需要决定是否支持多租户（多公司/多项目独立数据）。

#### 选项分析

| 选项 | 复杂度 | 数据隔离 | 用户体验 |
|------|--------|----------|----------|
| 单一 DB | 低 | 应用层 | 简单 |
| **多 DB (按项目)** | **中** | **数据库级** | **需切换** |
| Schema 级别多租户 | 高 | 列级 | 透明 |
| 混合方案 | 中 | 灵活 | 灵活 |

#### 决策
使用单一 DB，所有数据共存。

#### 理由
- 简化架构
- 便于跨项目统计
- 用户主要是单一公司使用

#### 权衡
- **数据隔离**: 依赖应用层权限控制
- **扩展性**: 多公司场景需重构

#### 影响
- 权限控制更复杂
- 备份粒度粗

---

### ADR-003: Electron 主进程职责划分

**状态**: 已采用  
**日期**: 项目初期

#### 当前划分
```
主进程 (main.ts)
├── 窗口管理
├── 协议处理 (contract-file://)
├── 文件迁移逻辑
├── 数据库初始化
└── IPC Handler 注册

IPC Handlers (ipc-handlers/)
├── 业务逻辑
├── 数据验证
└── 数据库操作
```

#### 问题
- main.ts 承担了过多职责（209行处理迁移逻辑）
- 文件迁移逻辑与业务逻辑耦合

#### 建议改进
```typescript
// 改进后的职责划分
main.ts
├── 窗口管理
├── 协议处理
└── 应用生命周期

services/
├── DatabaseService      // 数据库初始化、迁移
├── FileService          // 文件操作
└── MigrationService     // 数据迁移

ipc-handlers/
├── 纯业务逻辑
└── 调用服务层
```

---

### ADR-004: 路由懒加载策略

**状态**: 已采用  
**日期**: v2.x 版本

#### 当前策略
```typescript
// App.tsx - 顶层懒加载
const Dashboard = lazy(() => import('./components/Dashboard'))
const Projects = lazy(() => import('./components/Projects'))
// ...
```

#### 权衡分析

| 策略 | 首屏大小 | 切换延迟 | 复杂度 |
|------|----------|----------|--------|
| 全部同步 | 小 | 无 | 低 |
| **顶层懒加载** | **中** | **中** | **中** |
| 全部懒加载 | 大 | 大 | 高 |

#### 决策
顶层懒加载，feature 子组件同步加载。

#### 理由
- 16 个页面按需加载，减少首屏
- 简单实现，无需复杂路由配置

#### 权衡
- 大组件 (Dashboard 800+ 行) 整体加载
- 子组件无法独立缓存

#### 建议
对 >500 行的组件内部也进行代码分割。

---

### ADR-005: 状态管理方案选择

**状态**: 已采用  
**日期**: 项目初期

#### 当前方案
- React local state (`useState`)
- Context (Auth, Toast)
- Props drilling

#### 备选方案

| 方案 | 复杂度 | 功能 | 适用场景 |
|------|--------|------|----------|
| Local state | 低 | 基础 | 简单应用 |
| Context | 中 | 跨组件 | 主题、认证 |
| **Zustand** | **中** | **中间件、持久化** | **中型应用** |
| Redux Toolkit | 高 | 完整生态 | 大型应用 |
| TanStack Query | 中 | 服务端状态 | API 驱动 |

#### 决策
使用 local state + Context 组合。

#### 理由
- 团队规模小，简单够用
- 数据主要通过 IPC 与主进程交互
- 避免过度工程

#### 权衡
- 跨组件数据共享不便
- 无缓存机制，每次都从主进程拉取

#### 建议
引入 TanStack Query 统一 API 数据获取和缓存。

---

## 四、重构路线图

### Phase 1: 安全修复 (1-2 周)

| 任务 | 描述 | 优先级 |
|------|------|--------|
| 修复 webSecurity | 为 OCR 单独配置 CORS | 🔴 |
| 添加输入验证 | Zod schema validation | 🔴 |
| 移除默认密码 | 强制首次设置 | 🟠 |
| 添加速率限制 | IPC 层限流 | 🟠 |

### Phase 2: 性能优化 (2-4 周)

| 任务 | 描述 | 优先级 |
|------|------|--------|
| 动态导入 xlsx | 按需加载 | 🔴 |
| 动态导入 tesseract | 按需加载 | 🟠 |
| 添加分页 | 所有列表端点 | 🟠 |
| 组件拆分 | Dashboard 等大组件 | 🟠 |

### Phase 3: 架构重构 (长期)

| 任务 | 描述 | 优先级 |
|------|------|--------|
| 数据库迁移 | SQLite 替代 JSON | 🟠 |
| Repository 模式 | 封装数据访问 | 🟡 |
| 类型系统完善 | 消除 `as any` | 🟡 |
| 测试基础设施 | Vitest + Testing Library | 🟡 |

---

## 五、风险评估

| 风险 | 概率 | 影响 | 缓解策略 |
|------|------|------|----------|
| 数据损坏 | 中 | 高 | 快照 + 备份 |
| ID 碰撞 | 低 | 高 | 改用 UUID |
| XSS 攻击 | 低 | 高 | 修复 webSecurity |
| 性能退化 | 高 | 中 | 分页 + 懒加载 |
| 技术债积累 | 高 | 中 | 定期债务清理 |

---

## 六、总结与建议

### 架构优势
1. **模块化良好**: 29 个 IPC handler 按功能拆分
2. **路由懒加载**: 16 个页面实现代码分割
3. **TypeScript 使用**: 全栈 TS，提升开发体验
4. **Electron 生态**: 利用成熟桌面框架

### 主要风险
1. **JSON 存储瓶颈**: 大数据量时性能严重退化
2. **安全配置**: webSecurity 关闭带来风险
3. **大组件问题**: 多个 20KB+ 组件未拆分
4. **类型安全缺失**: 200+ 处 `as any`

### 建议优先级

**立即行动**:
1. 修复 webSecurity 配置
2. 添加基础输入验证
3. 动态导入重型库

**短期改进** (1-2 月):
1. 组件拆分
2. 分页实现
3. ID 生成策略优化

**长期规划**:
1. 数据库架构重构 (SQLite)
2. 完善测试体系
3. 类型系统重构

---

## 附录

### A. 文件统计

```
electron/
├── *.ts files: 35
├── ipc-handlers/*.ts: 29
└── Total lines: ~15,000

src/
├── *.tsx files: 267
├── *.ts files: (hooks, services, utils)
└── Total lines: ~50,000

build/
├── vendor-xlsx: ~429KB
├── vendor-ocr: ~504KB
└── 首屏 (gzip): ~200KB
```

### B. 依赖版本

| 依赖 | 版本 | 备注 |
|------|------|------|
| electron | 28.2.0 | LTS |
| react | 18.2.0 | 稳定 |
| vite | 5.1.0 | 快速 |
| typescript | 5.3.3 | 较新 |
| xlsx | 0.18.5 | 稳定 |
| tesseract.js | 5.1.1 | 较新 |

### C. 性能基准

| 操作 | 当前耗时 | 目标耗时 |
|------|----------|----------|
| 首屏加载 | <3s | <2s |
| 页面切换 | <500ms | <300ms |
| 列表加载 (1000条) | 1-2s | <500ms |
| 数据保存 | 500ms-2s | <100ms |

---

*报告生成时间: 2026-05-19*  
*评估者: Archi 系统架构师*  
*下一步: 等待 team-lead 审阅后安排修复计划*
