# AGENTS.md - 工程管家项目约定
> 项目状态：v1.0.0 — 架构重构 + 数据治理 + Repository 层 + React Query
> 最后同步：2026-06-12（CHANGELOG v1.0.0 发布，与 CLAUDE.md 同步）

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
- **认证**：新端点默认加 `RequireAuthorization()`，健康检查 `/api/health` 和登录 `/api/auth/login` 除外
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

## 🏗️ 架构规范（v1.0 新增）

### Repository 层规范
- **位置**：`EngineeringManager.Api/Repositories/`
- **命名**：`XxxRepository.cs`（如 ProjectRepository.cs）
- **依赖**：注入 `IDbConnection`
- **软删除**：使用 `DapperHelpers.SoftDeleteAsync()`
- **时间戳**：使用 `Common.NowString()`
- **示例**：
```csharp
public class ProjectRepository
{
    private readonly IDbConnection _db;
    public ProjectRepository(IDbConnection db) => _db = db;
    
    public async Task<IEnumerable<dynamic>> GetAll() =>
        await _db.QueryAsync("SELECT * FROM [projects] ORDER BY created_at DESC");
    
    public async Task<bool> SoftDelete(long id) =>
        await _db.SoftDeleteAsync("projects", id);
}
```

### React Query 数据层规范
- **位置**：`src/hooks/data/`
- **命名**：`useXxx.ts`（如 useProjects.ts）
- **queryKey**：`['xxx']` 或 `['xxx', param]`
- **staleTime**：30秒（`30_000`）
- **示例**：
```typescript
export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const api = await getAPI()
      const res = await api.getProjects()
      if (!res.success) throw new Error(res.error)
      return res.data
    },
    staleTime: 30_000,
  })
}
```

### 迁移文件命名规范
- **位置**：`EngineeringManager.Api/Migrations/Scripts/`
- **格式**：`NNN_Description.sql`（如 003_MoneyRealToInteger.sql）
- **执行**：MigrationRunner 自动执行未执行的迁移
- **记录**：`schema_versions` 表记录已执行的迁移

### 新增表/字段 Checklist
1. [ ] 金额字段使用 `INTEGER`（分）
2. [ ] 审计字段：`created_at TEXT` / `updated_at TEXT`
3. [ ] 软删除字段：`deleted_at TEXT`（财务表必需）
4. [ ] 索引：高频查询字段添加索引
5. [ ] 迁移脚本：创建 `NNN_Description.sql`

---

## 🔢 版本管理
- **语义化版本**：patch(Bug修复) / minor(新功能模块) / major(架构级变更)
- 版本号引用位置：`package.json` / `Sidebar.tsx` / `Login.tsx` / `installer/src/App.tsx` / `CHANGELOG.md`

### 当前版本：v1.0.0

*本文档与 `CHANGELOG.md`、`docs/` 保持同步。*

---

## 🩺 安全审计结果（2026-06-16 v1.0.0 状态）

> **审计者**：darwin-skill 9 维 rubric 参照 + vibe-coding-guide 19 条 + 4 个 explore 子代理 file:line 实证
> **回滚锚点**：git reset --hard v1.0.0-pre-vibe（commit fcdffea3fed06f878789db7f08d98303ffdf077f）
> **完整修复计划**：[P0-FIX-PLAN.md](P0-FIX-PLAN.md)
> **vibe-coding-guide 评估**：[ibe-coding-guide-eval-2026-06-16.md](vibe-coding-guide-eval-2026-06-16.md)

### 4 个 🔴 P0 缺口（**当前版本未修，发布前必读**）

| # | 缺口 | 现状 | 严重度 |
|---|------|------|------|
| P0-1 | **OCR API key 公开在安装包** | public/ocr-config.json:5-6 明文 key 已被打进 dist + 装到所有用户机器。OcrEndpoints.cs:531-558 + src/services/ocr.ts:158-194 直接读明文 | 🔴 **最高优先级** |
| P0-2 | **全 API 无鉴权中间件** | Program.cs 全文 grep "UseAuthentication|AddAuthentication|AddAuthorization" **0 命中**。所有 endpoint 任何人都能访问（含 /api/users /api/audit/logs /api/sqlite/migrate） | 🔴 |
| P0-3 | **PII 零加密零脱敏** | members/workers/partners 表的 id_card/phone/ank_account 全部 TEXT 明文。所有列表 API 返回全表，前端组件直接渲染 w.idCard w.bankAccount m.phone | 🔴 |
| P0-4 | **越权读 + 无限流** | grep "WHERE\s+(user_id|created_by)\s*=" **0 命中**。0 限流中间件。任意用户能看任意数据 | 🔴 |

### 5 个 🟡 P1 缺口

| # | 缺口 | 现状 |
|---|------|------|
| P1-1 | **静默吞错** | 5 处 catch { } 真静默 + 40 处单边（只 log 不返错 / 只返错不 log）+ 8 处 OCR Results.Ok(new { success=false }) 假成功（OcrEndpoints.cs:64,122,159,200,247,285,339,380） |
| P1-2 | **admin/admin123 多处公开** | Rust 端 init.rs:711 硬编码 + 启动日志 :732 打印明文 + AGENTS.md/README.md/CLAUDE.md 多处明文 |
| P1-3 | **OCR 8 处把 ex.Message 直回前端** | 信息泄露风险（OcrEndpoints.cs:8 处） |
| P1-4 | **审计 user_id 来自 DTO 字段** | AuditEndpoints.cs:35 + SystemEndpoints.cs:73 客户端可伪造身份 |
| P1-5 | **密码比较用 string ==** | AuthEndpoints.cs:34 应改 CryptographicOperations.FixedTimeEquals |

### 6 个 ✅ 真正合规项（之前 AGENTS.md 没明确写但代码做到了）

| # | 实际合规项 | 证据 |
|---|------|------|
| 1 | **密码哈希** | Common.cs:32-40 PBKDF2-HMAC-SHA512 210k iterations（OWASP 合规，**比 bcrypt 还好**） |
| 2 | **SQL 参数化** | ~200 个 Dapper 调用 **0 拼接**（仅 {w} 条件分支 + [{tableName}] 标识符插值，受控） |
| 3 | **金额非浮点** | migration  03_MoneyRealToInteger.sql + INTEGER(分) 字段 |
| 4 | **数据存储路径独立** | ApiConfig.ResolveDataPath() 22 处调用，0 处 AppData |
| 5 | **软删除 + 审计** | DapperHelpers.SoftDeleteAsync() + deleted_at + udit_logs 表 |
| 6 | **迁移文件唯一来源** | Migrations/Scripts/001-008 + MigrationRunner + schema_versions 表 |

### 行动指引

**任何接手工程管家的开发者**：
1. **v1.0.0 发布前**：P0-1 必须修（OCR key rotate），其他 3 个 P0 在 v1.0.x 立即跟进
2. **新功能开发前**：先读 [P0-FIX-PLAN.md](P0-FIX-PLAN.md) 决定当前 sprint 是否带 1-2 个 P0 修复
3. **不要在 P0 修完前**新增涉及 PII 的新功能（先把 P0-2/P0-3 修了再考虑）
4. **vibe-coding-guide 兼容度**：v2 实证 9/19 完美 + 5/19 缺口 + 5/19 部分合规（详见 v2 报告）

**AGENTS.md 之前声称"RequireAuthorization() 强制"是文档与代码 gap**——以本审计为准，**代码实际未做鉴权**。

*本节与 CHANGELOG.md、P0-FIX-PLAN.md 保持同步。*