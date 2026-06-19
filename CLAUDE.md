# CLAUDE.md - 工程管家项目约定
> 项目状态：v0.75.0 — PII Mask 完整闭环 + User Preferences API + 后端去硬 mask（项目当前最新 release）
> 最后同步：2026-06-19（v0.75.0 release 同步）

## 🗣️ 输出语言
- **默认中文输出**：所有解释、描述、分析、提问、总结等文字内容使用中文
- **保持英文的部分**：代码（变量名/函数名/注释）、命令行、技术术语（如 IPC/hook/CRUD/SSR）、文件路径、git commit message、PR 描述
- **不要强行中文化**：代码标识符、API 名称、配置键名等保持英文原样

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
cd EngineeringManager.Api && dotnet run   # C# API + WebView2 窗口（localhost:5048）

# 编译时间：C# ~1.2s
# 窗口：WinForms + WebView2，圆角无边框，React TitleBar 控制
# 窗口架构：FormBorderStyle.None + CreateParams 注入 WS_THICKFRAME（保留原生 resize + Aero Snap）
#   边缘/四角调整：前端 div 手柄 → postMessage startResize → C# SetCapture + WndProc 控制
#   标题栏拖动：React onMouseDown → postMessage startDrag → C# SendMessage(HTCAPTION)
#   双击最大化：C# 侧 500ms 间隔检测两次 startDrag，达到则 ToggleMaximize()
#   边缘光标：WndProc 拦截 WM_SETCURSOR，按边缘方向设 resize 光标
```

### 架构
```
React 前端（C# 直接托管 dist/ 静态文件）
    ↓ HTTP fetch (tauri-bridge.ts → api-client.ts)
ASP.NET Core Minimal API (localhost:5048)
    ↓ Dapper
SQLite (engineering.db) ← 数据存储路径由用户配置
```

### 关键文件
| 文件 | 作用 |
|------|------|
| `EngineeringManager.Api/Program.cs` | 数据库初始化 + 角色/用户种子 + EnsureTables |
| `EngineeringManager.Api/EntryPoint.cs` | 桌面入口（[STAThread] + WebView2 窗口） |
| `EngineeringManager.Api/MainWindow.cs` | WinForms 窗口（WebView2 + DWM 圆角 + 消息通信） |
| `src/services/tauri-bridge.ts` | API 桥接层（前端调用的统一接口） |
| `src/services/api-adapter.ts` | 环境检测 + API 选择 |
| `EngineeringManager.Installer/` | 安装器（WinForms + WebView2 + React 前端） |
| `EngineeringManager.Uninstaller/` | 卸载器（WinForms + WebView2 + React 前端） |

## 📦 打包与部署
- **平时只构建不打包**：修改代码 → `vite build`（约5-10秒）→ dev模式测试 → 用户通知才生成安装包
- 安装包：`release\工程管家-Setup.exe`
- 打包脚本：`build-installer.bat`（构建前端 + C# 发布 + payload.zip 打包 + 安装器/卸载器）
- 优化后安装包大小：~198MB（去除了 WPF 运行时、重复字体、未使用依赖）

## 📐 数据架构铁律

**核心原则：所有数据都存放在用户设置的数据存储路径，该路径任何形式都不允许被删除。**

| 存储位置 | 内容 | 卸载时行为 |
|----------|------|-----------|
| 程序安装路径 | exe、DLL、前端 dist | 全部删除 |
| **数据存储路径**（如 `F:\Company Database`） | engineering.db、uploads/、db-snapshots/、ocr-config.json | **永远不删** |
| %APPDATA%\工程管家 | config.json（指向数据路径） | 可删除 |

- 所有数据操作使用 `ApiConfig.ResolveDataPath()`，22 处调用，0 处使用 AppData
- 卸载器绝不碰数据存储路径，不提供"删除数据"选项
- 文件操作（上传/读取/删除）均有 `IsPathSafe` 路径遍历防护
- 快照恢复前自动备份当前数据库（`db.pre-restore-时间戳`）
- config.json 写入采用合并策略，不覆盖已有配置

## 🔐 权限系统
- **角色种子**：admin/manager/accountant/worker 四个角色在 EnsureTables 中自动创建
- **权限格式**：`resource:action`（15 种资源×7 种操作）
- **权限检查**：`usePermission()` hook → `can(code)` / `canAll(codes)` / `canAny(codes)` / `isAdmin()` / `hasRole(roleId)`
- **权限组件**：`<RequirePermission />` / `<RequireAdmin />` — App.tsx 路由级守卫
- **侧边栏过滤**：`getFilteredSidebarRoutes(permissions)` 按权限过滤，管理员看到全部
- **前端兼容**：`permissions` 可能是字符串或数组，统一 JSON.parse 处理
- 默认管理员：`admin`（首次登录时**强制修改密码**）

## 🤖 AI 智能识别（百度 OCR）
- **架构**：表单组件 → useXxxOCR hook → C# API → 百度 API
- **9 种识别**：身份证/增值税发票/银行卡/营业执照/银行回单/开户许可证/银行单据/通用票据/企业工商查询
- **关键文件**：`EngineeringManager.Api/Endpoints/OcrEndpoints.cs` / `src/services/ocr.ts`
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

## 📁 文件存储系统
- **架构**：前端 → fileService.ts → HTTP → `FileEndpoints.cs` → `<dataPath>/uploads/`
- **策略**：附件存磁盘，JSON 只存文件名；文件名格式 `备注_业务描述_金额.ext`；同名检测
- **安全**：所有文件操作通过 `IsPathSafe` 防路径遍历攻击
- **文件夹**：`uploads/<项目名>/发票|收付款|合同|合作单位|.../` + `未分类/`

## 🧰 工具函数与常量
- **常量** (`src/constants/`)：`member.ts`(工种/角色/性别)、`attendance.ts`(考勤状态/色标/摘要计算)、`regions.ts`(省市区)、`permissions.ts`(角色/权限标签)
- **工具** (`src/utils/`)：`date.ts`(日期)、`format.ts`(金额/ID)、`validate.ts`(手机/身份证/邮箱)、`audit.ts`(审计)、`export-import.ts`(导入导出)、`projectHealth.ts`(健康度评分)

## 🎨 UI 规范

### 设计 Token
- **图标**：lucide-react `<Icon name="IconName" />`，`iconMap.ts` 注册
- **中性色**：slate 色系；语义色：primary(蓝)/success(绿)/warning(琥)/danger(红)/info(天蓝)
- **三主题系统**：White（白+蓝）/ Graphite（深灰+橙）/ Sandstone（暖灰+琥珀）

### 组件库（`src/components/ui/`）
Button / Input / Modal / Card / Badge / Select / Pagination / DropdownMenu / Tabs / Tooltip / ProgressBar / FormField / Toast / Loading / EmptyState / PageContainer / HoverScrollbar / StatusBar / MonthPicker / OCRRecognitionFeedback / DataTable

### 列表统一规范
- **DataTable 组件**（`src/components/DataTable.tsx`）：`TABLE` 常量为唯一样式来源
- **金标准模式**：`<FilterBar className="mb-6">` + `<DataTable useHoverScrollbar={true}>`

### 动画系统（framer-motion）
- **原则**：spring 物理优先（stiffness≤200）、大元素禁 scale、装饰动画走 CSS @keyframes
- **启动动画**：`SplashScreen.tsx` — 粒子背景+Logo脉冲+品牌逐字淡入
- **页面切换**：AnimatePresence mode="wait"、opacity 纯透明度

### 页面布局
- **侧边栏**：固定 w-64、圆角药丸导航+左侧激活指示条
- **启动流程**：SplashScreen（2.5s）→ 登录页 → 主界面
- **登录页**：300×400 frameless 窗口，支持设置页面切换

## 📝 审计日志
- **后端**：`audit_logs` 表，C# 端点 `SystemEndpoints.cs`（GET/POST /api/audit/*）
- **前端**：`src/utils/audit.ts`
- **查看入口**：Users 页"操作日志"Tab

## ⚠️ 红线
- 不得在组件中直接操作 localStorage，使用 `AuthContext`
- 不得绕过权限检查，所有敏感操作必须使用 `usePermission` hook
- 不得删除数据存储路径中的任何文件（`ApiConfig.ResolveDataPath()`）
- 不得在文件操作中硬编码 AppData 路径（必须使用 `ApiConfig.ResolveDataPath()`）

### 组件使用规则（硬性约束，违反会导致 build 检查失败）

| 场景 | 必须使用 | 禁止 |
|------|---------|------|
| 页面布局 | `<PageContainer>` | 手写 `p-6 max-w-[1400px] mx-auto` |
| 按钮 | `<Button variant="X" size="Y">`（src/components/ui/Button/） | `btn btn-*` CSS 类（已在 index.css 标记 @deprecated） |
| 卡片 | `<Card>` 或 `<StatCard>`（统计数值） | 手写 `bg-white rounded-xl shadow-sm` |
| Hero 横幅 | `<HeroBanner>` | 内联 `from-slate-800 via-slate-700` 渐变 |
| 色系 | slate-* / primary-* / success-* / warning-* / danger-* | gray-*（主题定义除外） |
| 字号 | text-caption（10px）/ text-micro（11px） | text-[10px] / text-[11px] 任意值 |

### 后端代码质量规则
- **SQL**：必须参数化（Dapper 匿名对象 @Param），严禁字符串拼接。表名必须用 `[]` 包裹
- **异常处理**：所有 catch 必须含 `Console.Error.WriteLine` 日志 + 正确的 HTTP 状态码返回
- **认证**：新端点默认走 `GlobalAuthMiddleware`（中间件层强制 JWT 鉴权），白名单 `/api/auth/login` `/api/health` `/api/ocr/setup/*` 除外
- **审计日志**：写入失败必须返回实际错误，不得返回 `{ success: true }`
- **新建功能**：组件放 `src/components/features/<模块>/`，禁止在 `src/features/` 下建文件
- **禁止创建重复文件**：新建前确认无同名组件

### 新页面开发 Checklist（写页面时必须逐条确认）
1. 用 `<PageContainer>` 包裹了吗？
2. 按钮用 `<Button variant="X" size="Y">` 了吗？
3. 卡片用 `<Card>` / `<StatCard>` 了吗？
4. 颜色用 slate-*（不是 gray-*）了吗？
5. 字号用 text-caption/micro 了吗？
6. 新建文件在 src/components/features/<模块>/ 下吗？
7. API 端点加了 RequireAuthorization 吗？
8. SQL 是参数化的吗？

---

## 🔢 版本管理
- **语义化版本**：patch(Bug修复) / minor(新功能模块) / major(架构级变更)
- 版本号引用位置：`package.json` / `Sidebar.tsx` / `Login.tsx` / `installer/src/App.tsx` / `CHANGELOG.md`

### 当前版本：v0.75.0 (已打 tag)

*本文档与 `CHANGELOG.md`、`docs/` 保持同步。*
