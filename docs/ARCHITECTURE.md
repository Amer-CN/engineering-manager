# 架构决策与数据保障

> 本文档包含架构决策历史记录和数据保障机制详细说明，CLAUDE.md 只保留概要。
> 最后同步：2026-06-19（v0.77.0 release: DataTable.tsx 进一步拆分 358→209 行）

---

## 🛡️ 数据保障机制（Phase 1+2+3 — 2026-05-29，全部完成）

### 写入流程（已迁移到 C#）
- C# SQLite 直接写入（单线权威存储，不再需要 Electron 双写）
- 旧 Electron 架构曾使用 `dual-write.ts`（SQLite 先写→JSON 后写），已迁移到纯 SQLite 模式
- C# 写入失败时返回 HTTP 500 + 错误信息

### JSON 周期性导出（已迁移到 C#）
- C# 端实现全量 JSON 导出（替代旧 `exportJsonFromSqlite()`）
- 触发时机：通过 API 触发，不再需要 app 关闭时自动导出
- 数据备份走快照系统，JSON 导出作为手动数据迁移工具保留

### 快照系统
- C# 端实现快照：同时备份 `.db` + `.db-wal`
- `EngineeringManager.Api/Endpoints/SystemEndpoints.cs` 提供快照管理
- 最多保留 200 个快照
- `restoreSnapshot()` 还原 SQLite

### 数据完整性校验
- C# 端启动时 `PRAGMA integrity_check`
- 空数据保护：内存为空但磁盘 >10KB → 拒绝写入 + 紧急备份
- 行数骤降检测：>10 行骤降 >50% → 拒绝写入 + 紧急备份

### 启动时检查（已迁移到 C#）
- `PRAGMA integrity_check`：失败返回错误状态
- JSON/SQLite 一致性检查（作为兼容性保留）
- C# API 端点：`GET /api/sqlite/status` → `EngineeringManager.Api/Endpoints/SystemEndpoints.cs`

### 关键文件
| 文件 | 作用 |
|------|------|
| `EngineeringManager.Api/Program.cs` | 数据库初始化 + CORS + 端点注册 |
| `EngineeringManager.Api/Endpoints/SystemEndpoints.cs` | 快照管理 + SQLite 状态 + 审计日志 + 健康检查 |
| `EngineeringManager.Api/EntryPoint.cs` | 桌面入口（[STAThread] + WebView2 窗口） |
| `EngineeringManager.Api/MainWindow.cs` | WinForms 窗口（WebView2 + DWM 圆角 + 消息通信） |

> **历史说明**：旧 Electron 架构使用 `electron/dual-write.ts`（双写）、`electron/database.ts`（完整性校验）、`electron/ipc-handlers/sqlite-status.ts`（健康检查）。C# 迁移后这些功能已重新实现，文件不再存在。

---

## 📋 架构决策记录

### 数据模型变更
| 变更 | 日期 | 说明 |
|------|------|------|
| `db.projectMembers` 多对多关联表 | 2026-05-05 | 替代 `Member.projectId` 单一字段，支持一个管理人员归属多个项目 |
| `db.templates` 模板集合 | 2026-05-07 | 模板管理独立模块 |
| `db.wages` + `db.attendances` | 2026-05-04 | 工资计算引擎 + 考勤系统（dailyStatus 五种日状态） |
| `db.auditLogs` + `db.roles` | 2026-05-05 | 审计日志 + 角色权限编辑器 |
| `ensureDatabaseFields()` 27 集合防御 | 2026-05-06 | 覆盖全部 `db.*` 集合，旧数据库缺字段时不再崩溃 |
| `db.salaryHistory` 薪资历史表 | 2026-05-13 | memberId/effectiveDate/baseSalary/subsidy/subsidyNote/note，追踪薪资变动 |
| `db.departments` 部门表 | 2026-05-12 | 部门 CRUD（名称+负责人），member.departmentId + member.position |
| Phase 1 数据保障 | 2026-05-29 | 24 表完整性校验 + 行数骤降检测 + SQLite 快照备份 |
| Phase 2 SQLite 先写 | 2026-05-29 | 旧 Electron 架构：SQLite 先写→JSON 后写 |
| Phase 3 JSON 退出热路径 | 2026-05-29 | 旧 Electron 架构：`exportJsonFromSqlite` 周期性导出 |
| C# 迁移完成 | 2026-06-01 | 全部 197 个 API 端点迁移到 ASP.NET Core Minimal API |

### 模块架构变更
| 变更 | 日期 | 说明 |
|------|------|------|
| 工人管理UX重构 v2.8.2 | 2026-05-15 | LaborManagement 重写为4-Tab容器（看板/工人库/班组管理/工资管理），琥珀色系(amber)，useConfirm替代原生confirm，3个Hook收敛状态管理 |
| 工资管理月份选择器内嵌 | 2026-05-15 | 从WageCycleDetail头部移除月份选择器，嵌入各Tab内部 |
| 工资管理纯工人化 v3.0 | 2026-05-14 | 代码级清理所有管理人员薪资逻辑，仅保留 projectWorkers |
| 模板管理独立顶级路由 | 2026-05-07 | 7 种分类 + 变量自动检测（mammoth 服务端）+ TemplateSelectorModal 业务集成 |
| 工资管理重构 | 2026-05-06 | 对标 Projects→ProjectDetail 模式，Dashboard+WageCycleDetail(3 Tab) |
| 结算办理重设计 | 2026-05-07 | 6 种细分类别 + 自动核验付款发票 + Excel 模板/灵活导入 |
| 合同看板重构 | 2026-05-07 | 看板首页+子页面模式，收支数据改用 paymentRecords |
| 项目管理重设计 | 2026-05-06 | 8 文件 Bento网格+健康环+投资组合横幅+告警区 |
| 全局工人信息库 | 2026-05-12 | db.workers + db.projectWorkers 双表分离 |
| 人事+工人管理部门化拆分 | 2026-05-12 | 员工管理拆为 HRManagement + LaborManagement 双模块 |
| 成本台账一二级分类重构 | 2026-05-11 | 支出 5 组 18 码 + 收入 4 组 7 码 |
| 成本台账筛选系统升级 | 2026-05-11 | 7 列统一搜索+勾选 Excel 风格，ColumnFilter CheckMeta 重构 |
| check-rules 清零 | 2026-05-11 | 7 硬违规→0：子组件提取 8 文件 + hook 提取 3 个 |
| 任务功能完整移除 | 2026-05-12 | 删除 Tasks 相关代码，Dashboard 替换为发票+结算摘要 |
| 健康度评分公式调整 | 2026-05-12 | 预算控制 40% + 合同执行 30% + 发票管理 30% |
| C# 迁移 | 2026-06-01 | Electron IPC handlers → ASP.NET Core Minimal API 端点 |
| C# 迁移补全 | 2026-06-04 | PartnerDto 新增 ProjectIds 字段，合作伙伴 POST/PUT SQL 补全 project_ids |
| P0-4 越权防护闭环 v0.73.0 | 2026-06-19 | 33 业务端点 + 4 管理端点 user-dim 隔离 + 6 migrations (009-014 + 020) + project_authorizations 表 (admin 手动授权) + CurrentUser helper 3 个 + smoke 测试 5 个 |
| PII Mask 基础设施 v0.73.0 | 2026-06-19 | MaskContext / MaskToggleButton / useMaskedFn hook / 8 组件响应式化 + vitest 单元测试 37 用例 |
| PII Mask 完整闭环 v0.74.0 | 2026-06-19 | 后端去硬 mask (18 处 Common.MaskXxx 调用简化) + 后端 ?unmask=true 查询参数 + apiClient 自动加 unmask=true 参数 (PII_PATHS 常量) + 4 个 GET 端点响应层 mask 支持 (含 GET /api/inventory / /api/materials) |
| PII Mask 多设备同步 v0.75.0 | 2026-06-19 | User Preferences API (migration 022 + 4 端点: GET/PUT /api/user-preferences + GET/PUT /api/user-preferences/{key}) + MaskContext 通过 PUT 后端同步 toggle + useUserIdSync hook (登录后拉后端真值覆盖 localStorage) |
| Partners tax_number schema 修复 v0.74.0 | 2026-06-19 | migration 021_AddPartnersTaxNumber.sql 修复 POST /api/partners 500 bug (v0.72.0 之前一直存在) |
| DataTable 拆分 v0.75.0 | 2026-06-19 | 453 → 358 行 (-21%) + 提取 useDataTableState + useDataTableFilters hook + 修复 alignMap UI bug (列对齐失效) |
| useUserIdSync 接入 v0.76.0 | 2026-06-19 | MaskContext 已暴露 useUserIdSync hook 但 App.tsx 没挂载 → L77 加 useUserIdSync(currentUser?.id) (登录后从后端拉 PII mask toggle 覆盖 localStorage) + L9 import 调整 |
| 仓库清理 v0.76.0 | 2026-06-19 | git rm 10 个一次性调试脚本 (count-btn/test-btn/test-regex/screenshot/rb.cjs + 4 个 generate-logos-*.py 旧版 + refactor-partnerform.ps1) + .gitignore 加 .mimo-runs/ 规则 |
| DataTable 进一步拆分 v0.77.0 | 2026-06-19 | DataTable.tsx 358→209 行 (-42%, 超 -35% 目标) + 新建 DataTable/types.ts (99 行, 4 interface) + DataTable/consts.ts (7 行, alignMap). 保持 import type { Column } from "../DataTable" 兼容, 子文件零改动 |

### 文件存储演进
| 变更 | 日期 | 说明 |
|------|------|------|
| base64→磁盘统一文件服务 | 2026-05-03 | engineering.json 18MB→1.4MB，中文目录归类 |
| 项目名第一层目录 | 2026-05-04 | 有项目归属→`<项目名>/`，无项目→`未分类/` |
| 项目名称参数修复 | 2026-05-05 | 4 文件间参数名张冠李戴修复 |
| 同名检测 + 去随机后缀 | 2026-05-05 | saveFile 同名返回错误；文件名不再附加随机后缀 |
| C# 迁移 | 2026-06-01 | 文件端点迁移到 `FileEndpoints.cs` |

### 权限与审计
| 变更 | 日期 | 说明 |
|------|------|------|
| 权限分配重设计 | 2026-05-05 | `db.roles` + 角色权限编辑器 + `getFilteredSidebarRoutes()` + 路由守卫 |
| 审计日志接通 | 2026-05-05 | 持久化 + localStorage 双写 + `setCurrentAuditUser()` + 详情可读化 |
| 用户管理去重 | 2026-05-05 | Settings.tsx 删除内嵌用户管理（~270行），统一到 Users.tsx |
| 审计日志 C# 迁移 | 2026-06-01 | `EngineeringManager.Api/Endpoints/SystemEndpoints.cs` 提供审计 API |

### UI 系统演进
| 变更 | 日期 | 说明 |
|------|------|------|
| lucide-react 图标系统 | 2026-05-06 | emoji 全部替换，iconMap.ts + Icon 统一入口 |
| framer-motion 全站动画 | 2026-05-06 | CountUp+stagger+spring 物理+全局交互反馈 |
| slate 色系统一 | 2026-05-06 | 27 文件 682 处 gray→slate；15 文件 103 处 dark 清理 |
| 全站表头 sticky | 2026-05-06 | 4 个列表 border-separate+sticky thead |
| Toast 全局 Context | 2026-05-05 | 11 页面统一 useToastContext() |
| 发票票种细化 | 2026-05-06 | InvoiceKind 4 种：纸/电 × 普/专 |
| 窗口 resize + Aero Snap 修复 | 2026-06-03 | FormBorderStyle.None + CreateParams WS_THICKFRAME；前端 div 手柄→postMessage→C# SetCapture 手动 resize；标题栏 drag 走 postMessage startDrag，双击最大化由 C# 侧 500ms 间隔检测
| 金额 formatMoney 全局化 | 2026-05-06 | 53 处 toLocaleString→formatMoney，14 文件补 import |
| HoverScrollbar 统一化 | 2026-05-30 | App.tsx + 弹窗统一使用 HoverScrollbar |
| Modal Graphite 主题适配 | 2026-05-30 | Modal 使用 CSS 变量 var(--card) 适配深色主题 |
| 确认弹窗统一化 | 2026-05-30 | 单位管理删除确认改用 useConfirm hook |
| EmptyState 组件 | 2026-05-11 | 接入 ContractPage/Drawings/ContractTemplates/InvoiceList |
| Hero 横幅装饰光点统一 | 2026-05-11 | 6 页 hero banner 统一呼吸光点动画 |
| Dashboard CountUp 弹簧加速 | 2026-05-11 | stiffness 40→100，damping 25→20 |
| 启动动画系统 | 2026-06-02 | SplashScreen 粒子背景+Logo 脉冲+品牌逐字淡入 |
| 锁屏粒子背景 | 2026-06-02 | LockScreen 加入 ParticleBackground+主题适配 |
| 加载动画统一 | 2026-06-02 | Spinner/ButtonLoader 组件替代 12 个文件的 animate-spin |
| 数据路径 API | 2026-06-02 | C# 实现 getConfig/setDataPath/sqliteStatus 端点+STA 线程对话框 |
| **列表样式全局统一** | **2026-06-04** | TABLE 常量修复（headerRow 补 border-b），DataTable 重写（skeleton/headerRender/align），删除未使用的 ui/Table 组件，44 个文件迁移到统一 DataTable |
| **列头排序+筛选** | **2026-06-04** | sortable + filterable（createPortal+搜索+checkbox 多选），30+ 个列表补充排序/筛选 |
| **月份选择器** | **2026-06-04** | MonthPicker 组件（年份快速切换+3×4 月份网格+createPortal），替换原生 input[type=month] |
| **AI 识别反馈动画** | **2026-06-04** | OCRRecognitionFeedback 浮动通知（扫描线/spring 弹出/自动消失） |

### 工具链
| 变更 | 日期 | 说明 |
|------|------|------|
| check-rules.js 代码规则 | 2026-05-06 | 文件行数上限/禁止复制/useState限制/类型安全/代码分割强制检查 |
| DB 安全加固 | 2026-05-06 | 解析失败先备份再建新库，防止数据丢失 |
| /benchmark 基线 | 2026-05-11 | 构建产物性能基线：2.4MB dist / 33 chunks / 9.1s build / Grade A |
| Superpowers skill 体系修复 | 2026-05-11 | 15 个 sub-skill 嵌套提取到 ~/.claude/skills/ 根级 |

---

## 🕸️ Graphify 知识图谱

`graphify-out/graph.json` 是项目的代码知识图谱（2754节点，4653边，222社区），AI 自动用于：
- **社区定位**：按聚类锁定相关文件范围，避免全文扫描
- **依赖查询**：通过边找调用链/依赖链
- **中心节点**：快速识别核心模块（Icon()、CostLedger、Contracts 等）

### 更新方式
- **轻量更新（无需 API）**：`graphify update .`（AST + 依赖关系）
- **完整重建（需 API Key）**：`graphify extract . --backend <key>`（含语义分析）
- **检查更新**：`graphify check-update .`
- 安装：`graphify 0.8.14`（全局 CLI）
