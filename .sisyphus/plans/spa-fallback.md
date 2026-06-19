# 阶段一：SPA 路由回退 + API 健康检查（已完成）

## TL;DR

> **Quick Summary:** 为 C# API 添加静态文件托管和 SPA 路由回退，使 `dotnet publish` 生成的 exe 可以脱离 Vite 独立运行。同时修改启动入口，生产模式自动跳过 Vite 并等待 API 就绪。前端无需任何修改（相对路径 `./` 已兼容）。
>
> **Deliverables:**
> - `EngineeringManager.Api/Program.cs` — 静态文件托管 + SPA 回退
> - `EngineeringManager.Api/EntryPoint.cs` — 生产模式检测 + 跳过 Vite + 等待 API 就绪
> - `EngineeringManager.Api/Properties/launchSettings.json` — 保留开发配置不变
>
> **Estimated Effort:** Medium
> **Parallel Execution:** YES - 2 waves
> **Critical Path:** Task 1 → Task 4

## Context

### 目的
C# API (`EngineeringManager.Api`) 当前在桌面模式下会启动 Vite 开发服务器（`npm run dev`），导致生产环境中用户电脑必须安装 Node.js。需要改为：生产模式下 C# API 自己托管前端静态文件，WebView2 直接加载 `http://localhost:5048`。

### 访谈摘要
- **关键决策：** C# Kestrel 服务器直接托管 `dist/` 静态文件（UseStaticFiles + SPA 回退），无需额外的 Web 服务器
- **关键决策：** 生产/开发模式通过检测 `AppContext.BaseDirectory/dist/` 是否存在自动切换
- **关键决策：** 前端 api-client.ts 的 `API_BASE = 'http://localhost:5048'` 和 ocr.ts 的 `fetch('./ocr-config.json')` 相对路径天然兼容，**前端零修改**
- **关键决策：** OCR 配置文件 `public/ocr-config.json` 在 `vite build` 时自动复制到 `dist/`，通过静态文件服务即可访问
- **关键决策：** 开发模式完全不变（Vite dev server + CORS），保持开发体验

### 关键文件
- `EngineeringManager.Api/Program.cs` — ApiConfig 类，ConfigureServices + ConfigureApp，含 CORS 和数据库初始化
- `EngineeringManager.Api/EntryPoint.cs` — 桌面入口，[STAThread] Main，启动 Vite/API/WinForms 窗口
- `EngineeringManager.Api/MainWindow.cs` — WinForms 窗口，WebView2 初始化，导航到 http://localhost:5173
- `src/services/api-client.ts` — HTTP 客户端，API_BASE = 'http://localhost:5048'
- `src/services/ocr.ts` — OCR 服务，fetch('./ocr-config.json') 加载预置配置
- `public/ocr-config.json` — 百度 OCR 预置配置（apiKey + secretKey）
- `EngineeringManager.Api/Properties/launchSettings.json` — Kestrel 端口 5048 配置
- `package.json` — npm scripts: build:frontend (check-rules + tsc + vite build)
- `vite.config.ts` — Vite 构建配置，base: './'，outDir: 'dist'

## Work Objectives

### Core Objective
使 C# API 在生产模式下能够独立托管前端静态文件并正确处理 SPA 路由回退，无需 Vite 或 Node.js。

### Concrete Deliverables
- 修改后的 `Program.cs`：ConfigureApp 中添加静态文件托管和 SPA 回退
- 修改后的 `EntryPoint.cs`：生产模式自动跳过 Vite，WebView2 导航到 API URL，等待 API 就绪
- 开发模式行为完全不变

### Definition of Done
- [ ] `dotnet publish -c Release` 后 exe 所在目录创建 `dist/` 文件夹并放入前端构建产物
- [ ] 直接运行 exe 可看到完整的前端页面，无需 Node.js/Vite
- [ ] 刷新页面不报 404（SPA 回退生效）
- [ ] API 端点 `/api/*` 正常工作
- [ ] `ocr-config.json` 可通过 `http://localhost:5048/ocr-config.json` 访问
- [ ] 开发模式（`dotnet run` 无 dist/）行为不变

### Must Have
- 生产模式检测（dist/ 目录存在性判断）
- SPA 默认文件中间件（UseDefaultFiles → index.html）
- 静态文件中间件（UseStaticFiles → JS/CSS/图片/JSON）
- SPA 路由回退（非 /api 路由返回 index.html）
- 生产模式跳过 Vite 启动
- WebView2 导航 URL 从 5173 改为 5048（生产模式）
- API 就绪等待（轮询 /api/health 而非硬编码 Sleep）

### Must NOT Have（Guardrails）
- 不修改前端任何代码
- 不修改 api-client.ts 的 API_BASE
- 不修改 CORS 配置（保留 localhost:5173 和 localhost:3000）
- 不修改数据库相关逻辑
- 不修改 MainWindow.cs（窗口逻辑不变）
- 不改变开发模式的任何行为
- 不引入新的 NuGet 包
- 不修改 launchSettings.json

## Verification Strategy

### Test Decision
- **Infrastructure exists:** YES (vitest 已配置)
- **Automated tests:** None（本次是基础设施变更，无业务逻辑变更）
- **Framework:** 无

### QA Policy
- 使用 Agent-Executed QA（playwright 可用）验证生产模式和开发模式

## Execution Strategy

### Parallel Execution Waves

```
Wave 1（可并行，无依赖）:
├── Task 1: 修改 Program.cs — 添加静态文件托管 + SPA 回退 [quick]
└── Task 2: 修改 EntryPoint.cs — 生产模式检测 + 跳过 Vite [quick]

Wave 2（依赖 Wave 1 的所有任务）:
└── Task 3: 编译验证 + 开发模式回归测试 [quick]

Wave 3（依赖 Wave 2）:
└── Task 4: 生产模式集成测试（QA） [quick]
```

### Dependency Matrix

| Task | Depends On | Blocks |
|------|-----------|--------|
| Task 1 | — | Task 3, Task 4 |
| Task 2 | — | Task 3, Task 4 |
| Task 3 | Task 1, Task 2 | Task 4 |
| Task 4 | Task 3 | — |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| Wave 1 | 2 | `quick` × 2（并行，无文件冲突） |
| Wave 2 | 1 | `quick` × 1 |
| Wave 3 | 1 | `quick` × 1 |

## TODOs

- [ ] 1. 修改 Program.cs — 添加静态文件托管 + SPA 回退

  **What to do:**
  在 `ApiConfig` 类中：
  1. 在类顶部添加静态属性 `IsProduction`，在 `ConfigureApp` 中根据 `dist/` 目录是否存在设置
  2. 在 `ConfigureApp` 方法中，`app.UseCors()` 之前：
     - 检测 `Path.Combine(AppContext.BaseDirectory, "dist")` 是否存在
     - 如果存在，依次调用：
       - `app.UseDefaultFiles(new DefaultFilesOptions { FileProvider = new PhysicalFileProvider(distPath) })` — 处理根路径 `/` → `index.html`
       - `app.UseStaticFiles(new StaticFileOptions { FileProvider = new PhysicalFileProvider(distPath) })` — 托管 JS/CSS/图片/ocr-config.json
  3. 在 `RegisterEndpoints(app)` 之后，添加 SPA 路由回退：
     - `app.MapWhen(ctx => !ctx.Request.Path.StartsWithSegments("/api"), spa => { spa.Use(...) })`
     - 回退逻辑：读取 `dist/index.html` 返回给客户端，Content-Type 为 `text/html; charset=utf-8`
  4. 添加必要的 using：`using Microsoft.Extensions.FileProviders;`
  5. 在 `ConfigureServices` 的 CORS 中添加 `http://localhost:5048` 到 allowed origins（生产模式同源需要）
  6. 在 `RegisterEndpoints` 中添加：`app.MapGet("/api/health", () => Results.Ok(new { status = "ok" }));` — 健康检查端点供启动等待使用

  **Must NOT do:**
  - 不修改 EnsureTables 建表逻辑
  - 不修改 ResolveDataPath 逻辑
  - 不修改 CORS 策略中的现有 origin（只追加 5048）
  - 不引入新的 NuGet 包（Microsoft.Extensions.FileProviders 是 ASP.NET Core 内置）

  **Recommended Agent Profile:**
  - **Agent:** `quick`
  - **Skills:** []

  **Parallelization:**
  - **Can Run In Parallel:** YES
  - **Parallel Group:** Wave 1（with Task 2）
  - **Blocks:** Task 3, Task 4
  - **Blocked By:** None

  **References:**
  - `EngineeringManager.Api/Program.cs:40-44` — `ConfigureApp` 方法，需要在其内部 `app.UseCors()` 之前和 `RegisterEndpoints` 之后添加中间件
  - `EngineeringManager.Api/Program.cs:8-9` — `ApiConfig` 类定义，需要添加 `IsProduction` 属性
  - `EngineeringManager.Api/Program.cs:11-15` — CORS 配置，需要追加 `http://localhost:5048`
  - `EngineeringManager.Api/Program.cs:46-83` — `RegisterEndpoints` 方法，需要在其中追加健康检查端点
  - `public/ocr-config.json:1-9` — OCR 配置文件结构，vite build 会复制到 dist/ocr-config.json
  - `src/services/ocr.ts:161` — `fetch('./ocr-config.json')` 前端通过相对路径加载，静态文件服务自动处理
  - `src/services/api-client.ts:8` — `API_BASE = 'http://localhost:5048'` 前端已使用 5048 端口
  - `vite.config.ts:48` — `base: './'` 使用相对路径，兼容任意 origin

  **Acceptance Criteria:**
  - [ ] 编译通过：`dotnet build` 无错误
  - [ ] IsProduction 属性在 ConfigureApp 中被设置
  - [ ] UseDefaultFiles 和 UseStaticFiles 在 dist/ 存在时被调用
  - [ ] SPA 回退在非 /api 路由时返回 index.html
  - [ ] /api/health 端点返回 `{"status":"ok"}`
  - [ ] CORS 允许 localhost:5048

  **QA Scenarios:**

  ```
  Scenario: 编译验证
    Tool: Bash
    Preconditions: 无
    Steps:
      1. 执行 `cd EngineeringManager.Api && dotnet build 2>&1`
      2. 检查输出中无 error
      3. 确认 BUILD SUCCESSFUL
    Expected Result: 编译成功，无 error
    Evidence: .sisyphus/evidence/task-1-build.txt

  Scenario: 开发模式回归（dist/ 不存在时 API 正常启动）
    Tool: Bash
    Preconditions: 确保 dist/ 目录不存在
    Steps:
      1. 执行 `cd EngineeringManager.Api && dotnet build -c Release 2>&1`
      2. 执行 `dotnet run --no-build -c Release &`（后台启动）
      3. 等待 3 秒
      4. 执行 `curl -s http://localhost:5048/api/health`
      5. 检查返回包含 "status":"ok"
      6. 执行 `curl -s -o /dev/null -w "%{http_code}" http://localhost:5048/`
      7. 检查返回 404（无 dist/ 时不托管静态文件）
      8. 关闭后台进程
    Expected Result: /api/health 返回 200，根路径返回 404（无静态文件服务）
    Evidence: .sisyphus/evidence/task-1-dev-mode.txt

  Scenario: 生产模式静态文件服务（模拟 dist/ 存在）
    Tool: Bash
    Preconditions: 编译完成
    Steps:
      1. 创建临时 dist 目录：`mkdir -p EngineeringManager.Api/bin/Release/net8.0-windows/dist && echo '<html>test</html>' > EngineeringManager.Api/bin/Release/net8.0-windows/dist/index.html && echo '{"provider":"baidu"}' > EngineeringManager.Api/bin/Release/net8.0-windows/dist/ocr-config.json`
      2. 执行 `cd EngineeringManager.Api && dotnet run --no-build -c Release &`
      3. 等待 3 秒
      4. 执行 `curl -s http://localhost:5048/` 检查返回 `<html>test</html>`
      5. 执行 `curl -s http://localhost:5048/ocr-config.json` 检查返回 JSON
      6. 执行 `curl -s http://localhost:5048/api/health` 检查返回 health JSON
      7. 关闭后台进程，清理临时 dist
    Expected Result: 根路径返回 index.html 内容，ocr-config.json 可访问，API 端点正常
    Evidence: .sisyphus/evidence/task-1-prod-mode.txt
  ```

  **Commit:** YES
  - Message: `feat: add static file hosting and SPA fallback for production mode`
  - Files: `EngineeringManager.Api/Program.cs`
  - Pre-commit: `dotnet build EngineeringManager.Api`

---

- [ ] 2. 修改 EntryPoint.cs — 生产模式检测 + 跳过 Vite + 等待 API 就绪

  **What to do:**
  修改 `EntryPoint.Main` 方法：
  1. 在启动 Vite 之前，检测 `Path.Combine(AppContext.BaseDirectory, "dist")` 是否存在
  2. 如果 `dist/` 存在（生产模式）：
     - **跳过 Vite 启动**（整个 `try { var projectDir = ... viteProcess = ... }` 块）
     - **等待 API 就绪**：轮询 `http://localhost:5048/api/health`（最多 30 秒，每 500ms 一次），使用 `HttpClient` + `CancellationTokenSource`
     - 轮询成功后打印 `[App] API is ready`，继续启动 MainWindow
  3. 如果 `dist/` 不存在（开发模式）：保持现有行为不变（启动 Vite + 硬编码 Sleep(5000)）
  4. MainWindow 导航 URL 的修改不在本文件——MainWindow.cs 中 `webView.CoreWebView2.Navigate("http://localhost:5173")` 需要改为根据环境决定 URL
     - 方案：在 `MainWindow` 构造函数或 `OnLoad` 中检测 `dist/` 是否存在，决定导航到 `localhost:5048` 还是 `localhost:5173`

  **Must NOT do:**
  - 不修改 `--api-only` 分支逻辑
  - 不修改 MainWindow 的窗口/WebView2 初始化逻辑（只改 URL）
  - 不修改 node 进程清理逻辑
  - 不修改退出清理逻辑

  **Recommended Agent Profile:**
  - **Agent:** `quick`
  - **Skills:** []

  **Parallelization:**
  - **Can Run In Parallel:** YES
  - **Parallel Group:** Wave 1（with Task 1）
  - **Blocks:** Task 3, Task 4
  - **Blocked By:** None

  **References:**
  - `EngineeringManager.Api/EntryPoint.cs:8-109` — 完整的 Main 方法，需要修改 Vite 启动和等待逻辑
  - `EngineeringManager.Api/EntryPoint.cs:38-58` — Vite 启动代码块，生产模式下需要跳过
  - `EngineeringManager.Api/EntryPoint.cs:64-78` — API 后台线程启动 + Thread.Sleep(5000) 等待
  - `EngineeringManager.Api/MainWindow.cs:191` — `webView.CoreWebView2.Navigate("http://localhost:5173")` 需要根据环境切换 URL
  - `EngineeringManager.Api/MainWindow.cs:25-31` — MainWindow 构造函数，可以在这里设置一个静态字段

  **Acceptance Criteria:**
  - [ ] 编译通过：`dotnet build` 无错误
  - [ ] dist/ 存在时跳过 Vite 启动
  - [ ] dist/ 存在时轮询 /api/health 等待 API 就绪（而非硬编码 Sleep）
  - [ ] dist/ 存在时 WebView2 导航到 http://localhost:5048
  - [ ] dist/ 不存在时保持原有行为
  - [ ] MainWindow 中 Navigate URL 在生产模式为 5048，开发模式为 5173

  **QA Scenarios:**

  ```
  Scenario: 编译验证
    Tool: Bash
    Preconditions: Task 1 已完成
    Steps:
      1. 执行 `cd EngineeringManager.Api && dotnet build 2>&1`
      2. 检查输出中无 error
    Expected Result: 编译成功
    Evidence: .sisyphus/evidence/task-2-build.txt

  Scenario: 开发模式回归（无 dist/ 时行为不变）
    Tool: Bash
    Preconditions: dist/ 不存在
    Steps:
      1. 执行 `cd EngineeringManager.Api && dotnet build -c Release 2>&1`
      2. 执行 `dotnet run --no-build -c Release &`
      3. 等待 8 秒（Vite 启动 + API 启动 + Sleep）
      4. 检查进程列表中有 node 进程（Vite 已启动）
      5. 检查 `curl -s http://localhost:5048/api/health` 返回 200
      6. 关闭后台进程，清理残留 node 进程
    Expected Result: Vite 和 API 都正常启动，行为与修改前一致
    Evidence: .sisyphus/evidence/task-2-dev-mode.txt
  ```

  **Commit:** YES（与 Task 1 合并提交）
  - Message: `feat: add static file hosting and SPA fallback for production mode`
  - Files: `EngineeringManager.Api/Program.cs`, `EngineeringManager.Api/EntryPoint.cs`, `EngineeringManager.Api/MainWindow.cs`
  - Pre-commit: `dotnet build EngineeringManager.Api`

---

- [ ] 3. 编译验证 + 开发模式回归测试

  **What to do:**
  1. 执行 `dotnet build EngineeringManager.Api` 确认编译通过
  2. 执行 `cd .. && npm run build:frontend` 确认前端构建通过
  3. 将前端构建产物复制到 `EngineeringManager.Api/bin/Release/net8.0-windows/dist/`
  4. 发布项目：`dotnet publish EngineeringManager.Api -c Release -o .sisyphus/prod-test/`
  5. 将 dist/ 复制到发布目录
  6. 启动发布后的 exe，验证：
     - API 启动成功
     - WebView2 显示完整前端页面
     - 刷新页面不报 404
     - /api/health 返回 200
     - /ocr-config.json 可访问

  **Must NOT do:**
  - 不修改任何代码
  - 不修改前端构建配置

  **Recommended Agent Profile:**
  - **Agent:** `quick`
  - **Skills:** []

  **Parallelization:**
  - **Can Run In Parallel:** NO
  - **Parallel Group:** Sequential（Wave 2）
  - **Blocks:** Task 4
  - **Blocked By:** Task 1, Task 2

  **References:**
  - `package.json:9` — `"build:frontend": "node scripts/check-rules.cjs && tsc && vite build"`
  - `EngineeringManager.Api/EngineeringManager.Api.csproj` — .NET 8 项目文件

  **Acceptance Criteria:**
  - [ ] `dotnet build` 成功
  - [ ] `npm run build:frontend` 成功
  - [ ] `dotnet publish` 成功
  - [ ] 发布目录包含 exe + dist/ + ocr-config.json
  - [ ] 运行发布 exe 可看到完整前端页面
  - [ ] 刷新页面不 404

  **QA Scenarios:**

  ```
  Scenario: 端到端构建 + 运行验证
    Tool: Bash
    Preconditions: Task 1, Task 2 已完成
    Steps:
      1. 执行 `cd EngineeringManager.Api && dotnet build -c Release 2>&1`
      2. 执行 `cd .. && npm run build:frontend 2>&1`
      3. 创建发布目录并发布：`dotnet publish EngineeringManager.Api -c Release -r win-x64 --self-contained -o .sisyphus/prod-test 2>&1`
      4. 复制 dist 到发布目录：`cp -r dist .sisyphus/prod-test/dist`
      5. 验证文件结构：检查发布目录有 exe、dist/、dist/ocr-config.json
    Expected Result: 所有构建步骤成功，文件结构正确
    Evidence: .sisyphus/evidence/task-3-build.txt

  Scenario: 发布模式运行验证
    Tool: Bash
    Preconditions: 构建完成
    Steps:
      1. 执行 `.sisyphus/prod-test/EngineeringManager.Api.exe &`
      2. 等待 5 秒
      3. 执行 `curl -s http://localhost:5048/api/health` 检查返回 200
      4. 执行 `curl -s http://localhost:5048/` 检查返回 HTML（非 404）
      5. 执行 `curl -s http://localhost:5048/ocr-config.json` 检查返回 JSON
      6. 关闭后台进程
    Expected Result: 所有端点正常，SPA 回退生效，OCR 配置可访问
    Evidence: .sisyphus/evidence/task-3-prod-run.txt
  ```

  **Commit:** NO

---

- [ ] 4. 生产模式集成测试（QA）

  **What to do:**
  使用 Agent-Executed QA 验证完整的生产模式体验：

  **Must NOT do:**
  - 不修改任何代码
  - 只执行验证操作

  **Recommended Agent Profile:**
  - **Agent:** `quick`
  - **Skills:** []

  **Parallelization:**
  - **Can Run In Parallel:** NO
  - **Parallel Group:** Sequential（Wave 3，最后一个）
  - **Blocks:** 无
  - **Blocked By:** Task 3

  **References:**
  - `EngineeringManager.Api/Program.cs` — 静态文件托管和 SPA 回退实现
  - `EngineeringManager.Api/EntryPoint.cs` — 生产模式启动逻辑
  - `EngineeringManager.Api/MainWindow.cs` — WebView2 导航逻辑
  - `src/services/ocr.ts:161` — `fetch('./ocr-config.json')` OCR 配置加载

  **Acceptance Criteria:**
  - [ ] 生产模式 exe 可独立运行（无 Node.js 依赖）
  - [ ] WebView2 显示完整前端页面（SPA 路由正常）
  - [ ] 刷新页面不报 404（SPA 回退）
  - [ ] API 端点正常（/api/health 返回 200）
  - [ ] OCR 配置可访问（/ocr-config.json 返回 JSON）
  - [ ] 开发模式行为不变

  **QA Scenarios:**

  ```
  Scenario: 生产模式完整体验验证
    Tool: Playwright (headless: false)
    Preconditions: Task 3 已完成，发布 exe 可用
    Steps:
      1. 启动发布目录中的 exe
      2. 等待 WebView2 加载完成（最多 10 秒）
      3. 验证页面标题包含 "工程管家"
      4. 验证页面有登录界面元素（用户名输入框、密码输入框、登录按钮）
      5. 使用默认账号 admin/admin123 登录
      6. 验证登录成功后显示主界面（侧边栏、仪表板等）
      7. 导航到不同页面（项目管理、成员管理等），验证 SPA 路由正常
      8. 验证 API 调用正常（页面数据加载成功）
      9. 关闭应用
    Expected Result: 完整的用户流程在生产模式下正常工作
    Evidence: .sisyphus/evidence/task-4-qa.txt

  Scenario: SPA 路由回退验证
    Tool: Bash
    Preconditions: 发布 exe 正在运行
    Steps:
      1. 执行 `curl -s -o /dev/null -w "%{http_code}" http://localhost:5048/projects` 检查返回 200
      2. 执行 `curl -s -o /dev/null -w "%{http_code}" http://localhost:5048/hr` 检查返回 200
      3. 执行 `curl -s -o /dev/null -w "%{http_code}" http://localhost:5048/settings` 检查返回 200
      4. 执行 `curl -s http://localhost:5048/projects` 检查返回 HTML 内容（index.html）
      5. 执行 `curl -s -o /dev/null -w "%{http_code}" http://localhost:5048/nonexistent` 检查返回 200（SPA 回退）
    Expected Result: 所有非 API 路由返回 index.html
    Evidence: .sisyphus/evidence/task-4-spa-fallback.txt

  Scenario: OCR 配置可达性验证
    Tool: Bash
    Preconditions: 发布 exe 正在运行
    Steps:
      1. 执行 `curl -s http://localhost:5048/ocr-config.json` 检查返回 JSON
      2. 验证 JSON 包含 provider, baidu, apiKey, secretKey 字段
    Expected Result: OCR 配置文件可通过 HTTP 访问
    Evidence: .sisyphus/evidence/task-4-ocr-config.txt

  Scenario: 开发模式回归验证
    Tool: Bash
    Preconditions: dist/ 目录不存在
    Steps:
      1. 关闭生产模式 exe
      2. 确保 dist/ 不存在
      3. 执行 `cd EngineeringManager.Api && dotnet run`
      4. 等待 8 秒
      5. 验证 Vite 进程存在
      6. 验证 http://localhost:5173 可访问
      7. 验证 http://localhost:5048/api/health 返回 200
      8. 关闭所有进程
    Expected Result: 开发模式行为与修改前完全一致
    Evidence: .sisyphus/evidence/task-4-dev-regression.txt
  ```

  **Commit:** NO

## Final Verification Wave

- [ ] F1. **完整性审计** — `quick`
  验证所有修改的文件一致性：
  - `EngineeringManager.Api/Program.cs` — static file hosting + SPA fallback + health endpoint
  - `EngineeringManager.Api/EntryPoint.cs` — production mode detection + skip Vite + API ready wait
  - `EngineeringManager.Api/MainWindow.cs` — WebView2 URL switch (5173 vs 5048)
  - 前端零修改确认

- [ ] F2. **安全审计** — `quick`
  检查安全性：
  - 静态文件服务不会泄露敏感文件（只服务 dist/ 目录）
  - ocr-config.json 中的 API Key 不会通过其他路径泄露
  - CORS 配置正确（开发模式 5173，生产模式同源）

## Commit Strategy

- **Task 1+2:** `feat: add static file hosting and SPA fallback for production mode` — Program.cs, EntryPoint.cs, MainWindow.cs
- **Task 3+4:** 无需提交（纯验证）

## Success Criteria

### Verification Commands
```bash
# 编译验证
cd EngineeringManager.Api && dotnet build  # Expected: BUILD SUCCESSFUL

# 前端构建验证
cd .. && npm run build:frontend  # Expected: dist/ 目录生成

# 生产模式运行验证
cd EngineeringManager.Api/bin/Release/net8.0-windows
cp -r ../../../../dist .  # 复制前端到 exe 同目录
./EngineeringManager.Api.exe  # 预期：WebView2 显示前端页面

# API 健康检查
curl http://localhost:5048/api/health  # Expected: {"status":"ok"}

# SPA 回退验证
curl http://localhost:5048/projects  # Expected: 返回 index.html 内容

# OCR 配置验证
curl http://localhost:5048/ocr-config.json  # Expected: 返回 OCR 配置 JSON
```

### Final Checklist
- [ ] 所有 "Must Have" 已实现
- [ ] 所有 "Must NOT Have" 未违反
- [ ] 开发模式行为不变
- [ ] 生产模式可独立运行（无 Node.js）
- [ ] SPA 路由回退正常
- [ ] OCR 配置可访问
