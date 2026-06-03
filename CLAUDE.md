# CLAUDE.md - 工程管家项目约定
> 项目状态：C# 后端迁移完成（v0.67.0）
> 最后同步：2026-06-02（Electron→C# 迁移，197 个 API 端点，WebView2 桌面窗口）
>
> 来源合并：`AGENTS.md`（架构铁律/红线/反模式/自检清单）和 `DESIGN.md`（UI 规范/排版系统/组件库/动画系统）的内容已合并到本文档，原始文件已删除。

## 🗣️ 输出语言
- **默认中文输出**：所有解释、描述、分析、提问、总结等文字内容使用中文
- **保持英文的部分**：代码（变量名/函数名/注释）、命令行、技术术语（如 IPC/hook/CRUD/SSR）、文件路径、git commit message、PR 描述
- **不要强行中文化**：代码标识符、API 名称、配置键名等保持英文原样

## 🌐 gstack 浏览器工具集
- **Web 浏览**：使用 gstack 的 `/browse` skill 进行所有网页浏览操作，**严禁使用 `mcp__claude-in-chrome__*` 工具**
- **可用 skills**：`/office-hours` `/plan-ceo-review` `/plan-eng-review` `/plan-design-review` `/design-consultation` `/design-shotgun` `/design-html` `/review` `/ship` `/land-and-deploy` `/canary` `/benchmark` `/browse` `/connect-chrome` `/qa` `/qa-only` `/design-review` `/setup-browser-cookies` `/setup-deploy` `/setup-gbrain` `/retro` `/investigate` `/document-release` `/codex` `/cso` `/autoplan` `/plan-devex-review` `/devex-review` `/careful` `/freeze` `/guard` `/unfreeze` `/gstack-upgrade` `/learn`

## 🛠️ 技术栈
- **C# (.NET 8) + ASP.NET Core Minimal API** — 后端 API 服务（localhost:5048）
- **Dapper + Microsoft.Data.Sqlite** — 数据库访问（轻量 ORM，手写 SQL）
- **WinForms + WebView2** — 桌面窗口（内嵌浏览器内核显示 React 前端）
- **React 18 + TypeScript 5** - 类型安全的 UI 开发
- **Vite 5** - 极速构建工具
- **TailwindCSS** - 实用优先的样式框架
- **SQLite** - 本地数据持久化（`engineering.db`）
- **lucide-react** - SVG 图标库（`iconMap.ts` 注册，`<Icon name="X" />` 统一入口）
- **recharts** - 数据可视化（PieChart/RadialBarChart）
- **SimpleBarChart** - 柱状图组件（纯 CSS div 实现，`ui/SimpleBarChart.tsx`，含 SimpleGroupedBarChart 双柱变体）
- **framer-motion** - 全站动画引擎
- **pdfjs-dist** - PDF 转图片（用于发票/银行回单 PDF 的 OCR 识别）

### 开发流程
```bash
# 启动（双击 工程管家.bat 或手动）：
cd EngineeringManager.Api && dotnet run   # C# API (localhost:5048)
cd .. && npm run dev                       # React 前端 (localhost:5173)
# 浏览器自动打开 http://localhost:5173

# 编译时间：C# ~1.2s，Vite ~10s
# 窗口：WinForms + WebView2，圆角无边框，React TitleBar 控制
# 窗口架构：FormBorderStyle.None + CreateParams 注入 WS_THICKFRAME（保留原生 resize + Aero Snap）
#   边缘/四角调整：前端 div 手柄 → postMessage startResize → C# SetCapture + WndProc 控制
#   标题栏拖动：React onMouseDown → postMessage startDrag → C# SendMessage(HTCAPTION)
#   双击最大化：C# 侧 500ms 间隔检测两次 startDrag，达到则 ToggleMaximize()
#   边缘光标：WndProc 拦截 WM_SETCURSOR，按边缘方向设 resize 光标
```

### 架构
```
React 前端 (localhost:5173)
    ↓ HTTP fetch (api-client.ts)
ASP.NET Core Minimal API (localhost:5048)
    ↓ Dapper
SQLite (engineering.db) ← 直接读取 Electron 版本的数据库，零迁移
```

### 关键文件
| 文件 | 作用 |
|------|------|
| `EngineeringManager.Api/Program.cs` | 所有 API 端点（197 个）+ CORS + SQLite 连接 |
| `EngineeringManager.Api/EntryPoint.cs` | 桌面入口（[STAThread] + WebView2 窗口） |
| `EngineeringManager.Api/MainWindow.cs` | WinForms 窗口（WebView2 + DWM 圆角 + 消息通信） |
| `src/services/api-client.ts` | HTTP 客户端（fetch 封装） |
| `src/services/tauri-bridge.ts` | API 桥接层（前端调用的统一接口，名称保留兼容） |
| `src/services/api-adapter.ts` | 环境检测 + API 选择 |

## 🤖 AI 智能识别（百度 OCR）

- **架构**：表单组件 → useXxxOCR hook → C# API → 百度 API
- **9 种识别**：身份证/增值税发票/银行卡/营业执照/银行回单/开户许可证/银行单据/通用票据/企业查询
- **关键文件**：`EngineeringManager.Api/Endpoints/OcrEndpoints.cs` / `src/services/ocr.ts` / `src/hooks/use*OCR.ts` / `src/components/SettingsOcrSection.tsx`
- **UI 模式**：识别中（蓝紫渐变+脉冲）→ 成功（emerald 卡片+滑入动画）
- **详细说明**：→ [docs/MODULES.md](docs/MODULES.md)

## 📁 核心模块架构

| 模块 | 路由 | 主文件 | C# 端点 | 说明 |
|------|------|--------|---------|------|
| 人事管理 | `/hr` | `HRManagement.tsx` | `WageEndpoints.cs` + `MemberEndpoints.cs` | 管理人员档案/考勤/月薪薪酬，indigo 色系 |
| 工人管理 | `/labor` | `LaborManagement.tsx` | `WageEndpoints.cs` | 农民工班组/档案/导入/工资，amber 色系 |
| 发票管理 | `/invoices` | `InvoicePage.tsx` | `InvoiceEndpoints.cs` | 收票→付款，开票→回款，4 种票种 |
| 合同管理 | `/contracts` | `ContractPage.tsx` | `ContractEndpoints.cs` | 收入/支出/其他协议，看板+子页面 |
| 项目管理 | `/projects` | `Projects.tsx` | `ProjectEndpoints.cs` | 投资组合概览+详情 6 Tab 指挥中心 |
| 结算办理 | `/settlements` | `Settlement.tsx` | `SystemEndpoints.cs` | 6 种类别+自动核验+Excel 导入 |
| 模板管理 | `/templates` | `Templates.tsx` | `SystemEndpoints.cs` | 7 种分类+变量系统+TemplateSelectorModal |
| 工资管理 | `/wages` | `WageManagement.tsx` | `WageEndpoints.cs` | 仅工人日薪，通过工人管理访问 |
| 成本台账 | `/cost-ledger` | `CostLedger.tsx` | `CostLedgerEndpoints.cs` | 真实资金流追踪，双入口角色分离 |
| 仓库管理 | `/inventory` | `Inventory.tsx` | `InventoryEndpoints.cs` | 物料库/出入库/项目材料 |
| 单位管理 | `/partners` | `Partners.tsx` | `PartnerEndpoints.cs` | 合作单位+监管单位 |

**详细说明**：→ [docs/MODULES.md](docs/MODULES.md)

## 📁 文件存储系统

- **架构**：前端 → fileService.ts → HTTP → `FileEndpoints.cs` → `<dataPath>/uploads/`
- **策略**：附件存磁盘，JSON 只存文件名；文件名格式 `备注_业务描述_金额.ext`；同名检测
- **文件夹**：`uploads/<项目名>/发票|收付款|合同|合作单位|.../` + `未分类/`
- **关键文件**：`EngineeringManager.Api/Endpoints/FileEndpoints.cs` / `src/services/fileService.ts`
- **详细说明**：→ [docs/MODULES.md](docs/MODULES.md)

## 🧰 工具函数与常量
- **常量** (`src/constants/`)：`member.ts`(工种/角色/性别)、`attendance.ts`(考勤状态/色标/摘要计算)、`regions.ts`(省市区)、`permissions.ts`(角色/权限标签)
- **工具** (`src/utils/`)：`date.ts`(日期)、`format.ts`(金额/ID)、`validate.ts`(手机/身份证/邮箱)、`audit.ts`(审计)、`export-import.ts`(导入导出)、`projectHealth.ts`(健康度评分)
- 使用规范：常量从 `src/constants/` 导入，工具从 `src/utils/` 导入

## 📦 打包与部署
- **平时只构建不打包**：修改代码 → `vite build`（约5-10秒）→ dev模式测试 → 用户通知才生成安装包
- 安装包：`release\工程管家-Setup-1.0.0.exe`，便携版：`release\win-unpacked\工程管家.exe`
- 打包脚本：`build.js`、`build-nsis.js`、`一键打包.bat`；signAndEditExecutable: false

## 🔢 版本管理
- **语义化版本**：patch(Bug修复) / minor(新功能模块) / major(架构级变更)
- **手动迭代**：由开发者在使用 neat-freak 整理后手动更新版本号和 CHANGELOG.md
- 版本号引用位置：`package.json` / `Sidebar.tsx` / `Login.tsx` / `Settings.tsx` / `SettingsChangelog.tsx` / `CLAUDE.md` / `CHANGELOG.md`
- 版本历史：`CHANGELOG.md`（1.0.0→2.3.0）+ Settings 更新日志浮窗

### 当前版本：v0.67.0

## 🎨 UI 规范

### 设计 Token
- **图标**：lucide-react `<Icon name="IconName" />`，`iconMap.ts` 注册
- **中性色**：slate 色系；语义色：primary(蓝)/success(绿)/warning(琥)/danger(红)/info(天蓝)
- **三主题系统**：White（白+蓝）/ Graphite（深灰+橙）/ Sandstone（暖灰+琥珀），`data-theme` 属性驱动，`useTheme()` 全局单例（useSyncExternalStore），CSS 变量覆盖 Tailwind 类名
- **CSS Token**：`src/index.css` 中 `:root` / `.dark` 定义

### 组件库（`src/components/ui/`）+ 统一基础设施
Button(variants/sizes/iconOnly) / Input(status+leftSection/rightSection) / Modal(AnimatePresence+centered) / Card(padding+glass+hover) / Badge(variants+dot脉冲) / Select(下拉动画+clearable) / Table(stickyHeader+sizes) / Pagination / DropdownMenu(Portal+AnimatePresence) / Tabs(layoutId弹簧指示器+badge) / Tooltip(延迟300ms+箭头) / ProgressBar(variants+animated width) / FormField(label/error/helpText) / Toast(Context管理+AnimatePresence堆叠+spring) / Loading(Spinner+Skeleton) / EmptyState / PageContainer(`max-w-[1400px] mx-auto p-6`, wide/narrow/full) / HoverScrollbar(悬浮滚动条，overflow:hidden+JS wheel，鼠标靠近自动变大) / StatusBar(Reasonix风格三栏：页面名+记录数 | 选中状态 | SQLite+主题弹出选择器+字号弹出选择器)

### 动画系统（framer-motion）
- **原则**：spring 物理优先（stiffness≤200）、大元素禁 scale、装饰动画走 CSS @keyframes（合成器线程）、GPU 加速
- **启动动画**：`SplashScreen.tsx` — 粒子背景+Logo脉冲+品牌逐字淡入（2.5秒），跟随主题色
- **锁屏界面**：`LockScreen.tsx` — 粒子背景+主题适配+交互反馈，密码用 CSS `-webkit-text-security` 模拟
- **加载动画**：`Spinner.tsx`（页面级）/ `ButtonLoader.tsx`（按钮内）— Logo 呼吸+脉冲点，替代旧 animate-spin
- **Sidebar**：入场 slide-in + layoutId 激活态弹簧滑动(spring 500/30) + nav stagger(0.03s) + whileHover 右移4px
- **Login**：无动画，纯 CSS 布局
- **Dashboard**：CountUp(useMotionValue+useSpring stiffness:100) + KPI stagger+whileHover + recharts animationDuration=1200；KPI 卡片 6 列（项目/待办结算/成员/支出/发票/库存）；发票状态饼图 + 最近发票列表
- **页面切换**：AnimatePresence mode="wait"、opacity 纯透明度（无 scale 防重绘）、duration 0.2s
- **全局交互**：Button whileHover(1.03)+whileTap(0.97) / Card y:-3+boxShadow / Badge dot 呼吸脉冲 / DropdownMenu CSS @keyframes 入场 / Toast spring 入场

### 页面布局
- **侧边栏**：固定 w-64、深色渐变Logo区、圆角药丸导航+左侧激活指示条；底部头像弹出菜单（DropdownMenu，类 Windows 开始菜单），收纳用户管理/系统设置/锁定屏幕/退出登录
- **启动流程**：HTML 占位（极简 Logo+脉冲点）→ React SplashScreen（粒子+品牌淡入 2.5s）→ 登录页
- **登录页**：紧凑单列布局（300×400 frameless 窗口），记住密码+自动登录，登录后窗口放大到 1400×900
- **内容页**：统一 `PageContainer`，仪表板1600px/其他1400px/设置双列网格
- **图纸管理**：支持 JPG/PNG/PDF/DWG/DXF 格式
- **CARD 常量**：`bg-white border border-slate-200 rounded-xl shadow-sm` + `hover:shadow-md transition-all duration-200`
- **TABLE 常量**（`src/constants/table.ts`）：`container`/`headerRow`/`headerCell`/`bodyRow`/`bodyCell`/`stickyHeader`，所有列表页统一使用
- **StatusBadge**（`src/constants/status.tsx`）：`PROJECT_STATUS`/`SETTLEMENT_STATUS`/`INVOICE_STATUS`/`MEMBER_STATUS` 等配置 + `<StatusBadge>` 通用组件
- **动画常量**（`src/constants/animations.ts`）：`staggerContainer`/`sectionVariant`/`pageTransition`，Dashboard 类页面统一使用
- **PageHeader**（`ui/PageHeader.tsx`）：统一页面头部（title+subtitle+onBack+actions）
- **FilterBar**（`ui/FilterBar.tsx`）：统一筛选器容器（白底圆角+flex布局）
- **PayrollPage**（`features/payroll/PayrollPage.tsx`）：考勤薪酬统一页面（staff/worker 双模式，进行中）

## 🔐 权限系统
- **角色存储**：`db.roles` 集合，`getRolePermissions()` 优先读 db 回退硬编码；系统角色：admin/manager/accountant/worker
- **权限格式**：`resource:action`（15 种资源×7 种操作）
- **权限检查**：`usePermission()` hook → `can(code)` / `canAll(codes)` / `canAny(codes)` / `isAdmin()` / `hasRole(roleId)`
- **权限组件**：`<RequirePermission />` / `<RequireAdmin />` — App.tsx 路由级守卫
- **角色编辑**：Users.tsx→角色权限 Tab→checkbox 矩阵编辑器（C# 端点处理）
- **侧边栏过滤**：`getFilteredSidebarRoutes(permissions)` 按权限过滤，管理员看到全部
- **屏幕锁定**：`AuthContext.lock()` / `AuthContext.unlock(username, password)`，`LockScreen.tsx` 全屏毛玻璃遮罩，密码验证走 `window.electronAPI.login`
- 默认管理员：`admin` / `admin123`

## 📝 审计日志
- **后端**：`db.auditLogs` 集合，上限 3000 条，C# 端点 `SystemEndpoints.cs`（GET/POST /api/audit/*）、前端 `src/utils/audit.ts`
- **存储**：localStorage 双写；登录时 `AuthContext.login()` 调用 `setCurrentAuditUser()`
- **覆盖模块**：Members, Partners, Invoices, Projects, Contracts, Settlement, Inventory（8 个模块）
- **查看入口**：Users 页"操作日志"Tab（AuditLogsContent 嵌入式：筛选/分页/统计/详情/导出）
- **详情可读化**：三列对比表格（字段中文名/修改前/修改后），金额格式化，状态翻译
- **兼容性**：`actionConfig` 未知操作类型兜底（可选链+默认样式），防止新审计操作导致列表/详情白屏

## 🚀 快速开发指南
1. `npm run dev` 启动开发服务器
2. 修改代码后 `vite build` 快速构建测试
3. 所有组件已拆分至 600 行以内，保持模块化
4. 新增功能时参考 `docs/` 目录下的设计规范

## 🛡️ 数据保障机制

- **写入流程**：C# SQLite 直接写入（已迁移，不再需要 Electron 双写）
- **快照系统**：最多 200 个快照，`SystemEndpoints.cs` 管理
- **完整性校验**：24 表检查 + 行数骤降检测 + 启动 `PRAGMA integrity_check`
- **关键文件**：`EngineeringManager.Api/Program.cs`（数据库初始化）/ `EngineeringManager.Api/Endpoints/SystemEndpoints.cs`（快照+状态/健康检查）
- **详细说明**：→ [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## 📋 架构决策记录

→ [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## ⚠️ 红线
- 不得直接修改 `EngineeringManager.Api/Program.cs` 中的端点定义（已按模块组织）
- 不得使用 `any` 类型，必须使用严格类型
- 不得在组件中直接操作 localStorage，使用 `AuthContext`
- 不得绕过权限检查，所有敏感操作必须使用 `usePermission` hook

---

# 架构铁律（由 `scripts/check-rules.js` 自动检查，违反硬上限 → 构建失败）

## 铁律一：文件行数上限
| 文件类型 | 硬上限 | 软上限 |
|---------|--------|--------|
| 页面组件 (`src/components/*.tsx`) | 500 行 | 350 行 |
| 功能组件 (`src/components/features/`) | 400 行 | 250 行 |
| Hook (`src/hooks/`) | 250 行 | 150 行 |

## 铁律二：禁止复制粘贴
- 两个文件相似度 > 60% → 提取共用逻辑
- 同一文件内同一模式重复 ≥ 3 次 → 提取函数或 hook
- `if (!db.xxx) db.xxx = []` 已由 `ensureDatabaseFields()` 统一处理，新代码禁止再加

## 铁律三：数据流单向规则
- 页面组件禁止直接调用 `window.electronAPI` → 必须通过 hook 层
- 基础数据（projects/partners/members）由全局 `DataProvider` 提供，页面只消费不重复加载
- 新 CRUD 页面必须使用 `useCRUDBase` hook，不要手写 `loadData`/`setLoading`/`setError`

## 铁律四：useState 数量限制
- 单个组件 ≤ 8 个 useState（硬上限）；超过 5 个（软上限）→ 拆分子组件或 useReducer

## 铁律五：类型安全底线
- `preload.ts` 所有 IPC 方法必须有明确类型签名，禁止 `any`
- 新增类型必须在 `src/types/electron.d.ts` 声明，并注册到 `src/types/index.ts`

## 铁律六：代码分割强制
- 每个路由页面必须使用 `React.lazy()` + `Suspense` 动态导入
- 主 bundle 目标：< 500KB (gzip < 150KB)
- 大库（recharts/tesseract/xlsx）仅在对应页面加载

## 反模式黑名单
| 模式 | 替代方案 |
|------|---------|
| `key={refreshKey}` 强制重挂 | 组件接收 `refresh` 回调，内部 `useEffect` 重新 `loadData()` |
| 两个文件仅类型名不同 | 泛型组件接收 `type` prop |
| `Promise.all([getProjects, getMembers, ...])` 写在每个页面 | 全局 DataProvider + useData() hook |
| 表单 onChange 逐字段展开 `...prev` | 通用 `useForm` hook 批量处理 |
| `catch (error: any)` 然后 `showToast(error?.message)` | `handleError(err).getUserMessage()` |
| 页面组件在 App.tsx 顶层 `import` | `React.lazy(() => import('./components/XPage'))` |
| `Promise.all([api1(), api2(), ...])` 多 API 并行 | `Promise.allSettled` + 逐个检查，一个失败不影响其他 |

## 🕸️ Graphify 知识图谱

→ [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## AI 辅助开发自检清单
- [ ] 新增文件是否超过行数上限？
- [ ] 是否复制了已有文件的逻辑？能不能抽共用？
- [ ] 是否直接调了 `window.electronAPI`？（应走 hook）
- [ ] 单个组件 useState 是否 > 5？
- [ ] 新 IPC 方法是否在 `electron.d.ts` 中加了类型？
- [ ] 新页面是否用了 `React.lazy` 动态导入？
- [ ] `npm run build` 是否通过？（含 `check-rules.js`）


## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore

---
*本文档与 `CHANGELOG.md`、`MEMORY.md` 和 `docs/` 保持同步，定期更新。*