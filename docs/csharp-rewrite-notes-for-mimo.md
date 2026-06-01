# C# 重写注意事项（给 Mimo）

> 从 Rust (Tauri) 迁移到 C# (Photino.NET)，目标：保留 React 前端不变，重写后端

## 框架：Photino.NET

- **不是 Tauri、不是 Wails、不是 MAUI**。用 Photino.NET（MIT 协议，~5MB）。
- 架构：C# 后端 + 内嵌 WebView2 + React 前端。跟当前 Tauri 同构。
- 前端-后端通信用 `window.external.sendMessage()` / `WebMessageReceived` 事件，比 Tauri 的 `invoke` 更简单。
- 项目结构：
  ```
  工程管家.Photino/
  ├── Program.cs              # 入口，创建 PhotinoWindow
  ├── Services/               # C# 业务逻辑
  │   ├── DatabaseService.cs  # SQLite 初始化 + 迁移
  │   ├── ProjectService.cs   # 项目管理
  │   ├── ...                 # 其他模块
  ├── Models/                 # 数据模型
  └── wwwroot/                # React 编译产物
  ```

## 数据库：Microsoft.Data.Sqlite + EF Core

- **必装 EF Core**：`Install-Package Microsoft.EntityFrameworkCore.Sqlite`
- EF Core 的自动迁移是迁移到 C# 的最强理由——表结构变更只要改 Model 类，运行 `dotnet ef migrations add`，启动时自动执行。
- 你当前 Rust 里写的所有手动 SQL，在 C# 里全都应该用 EF Core + LINQ 替代。
- **数据兼容性**：直接用现有的 `engineering.db`，EF Core 的 Sqlite 提供者完全兼容 rusqlite 的数据库文件。不需要任何数据转换。
- **迁移策略**：首次启动时用 `context.Database.Migrate()` 自动补上缺失的列（比如你那个 `roles.created_at` 问题，在 EF Core 里就是一行 `public DateTime? CreatedAt { get; set; }` 然后跑个 migration 的事）。

## 前端 React 代码：照搬

- `src/` 下的所有 React 组件、Tailwind、framer-motion、recharts **全部保留**。
- **唯一要改的**：`src/services/tauri-bridge.ts` → 改成 Photino 的消息传递机制。
- Photino 的通信模式：
  ```ts
  // 前端调用后端
  window.external.sendMessage(JSON.stringify({ cmd: 'get_roles', args: {} }));

  // 后端返回
  window.addEventListener('message', (e) => {
    const response = JSON.parse(e.data);
    // 处理 response
  });
  ```
- 后端用 `window.RegisterWebMessageReceivedHandler()` 接收前端消息。
- 这个机制比你当前的 `invoke` + serde 映射省多少时间？你懂的。

## 哪些 Rust 的坑在 C# 里不存在

| Rust 折磨你的东西 | C# 怎么做 |
|---|---|
| `Option<i64>` 不实现 Display | C# 的 `int?` 直接能打印 |
| `serde(rename_all = "camelCase")` 前后端参数错位 | 同是 C#，前后端类型直接共享（或 JSON 序列化自动 camelCase） |
| Mutex 锁数据库 | 用 `IServiceScopeFactory` 创建 scoped DbContext，无需手动锁 |
| `cargo build` 20 秒 | `dotnet build` 5 秒，改代码后 Photino 热重启 3 秒 |
| `rusqlite::params![]` 手写 SQL | LINQ：`db.Roles.Where(r => r.Id == id).FirstAsync()` |
| 编译不过是因为生命周期/借用 | C# 没有这些概念，编译不过只意味着你打错了字 |
| 双进程（Vite + Tauri）端口冲突 | Photino 内嵌 WebView2，开发时只需 `dotnet run` |
| feature flags | 不存在 |

## 当前已知 Bug 的处理

以下是 Rust 代码审查中发现的 20 个问题。在 C# 重写时，以下问题会自然消失或大幅简化：

| # | Rust 问题 | C# 下处理方式 |
|---|----------|--------------|
| 1 | 快照系统 6 命令缺失 | C# 直接写 6 个方法，注册到消息路由 |
| 2 | `createProjectWorker` 参数嵌套不匹配 | C# 和前端同对象结构，`JsonSerializer.Deserialize<T>(msg)` 自动对齐 |
| 3 | `batchCreateProjectWorkers` tuple 无法反序列化 | C# 用 `List<ProjectWorkerDto>`，无此问题 |
| 4 | `getWorkerStats` 缺后端端点 | 同上，写一个方法并注册 |
| 5 | `contracts.rs` `Option<i64>` 格式化编译错误 | C# 有 `$"合同 {contract.Id} 不存在"` — 直接能用 |
| 6 | `SupervisorUpdate` 多余 id 字段 | C# DTO 按需定义，无混淆 |
| 7 | SQL 重复拼接 | LINQ 替代所有手写 SQL |
| 8 | schema 迁移缺失（roles.created_at 等） | EF Core 自动迁移 |
| 9-20 | （其他重复代码、SQL 硬编码、类型不匹配） | LINQ + EF Core 下基本不出现 |

## 模块迁移顺序建议

按依赖关系和复杂度从低到高：

1. **基础设施**：`Program.cs`、消息路由、数据库初始化、EF Core context
2. **简单 CRUD**：系统配置、角色权限、模板
3. **核心 CRUD**：项目、合同、发票、结算、合作伙伴
4. **复杂业务**：工人/成员管理、考勤、工资计算
5. **高级功能**：OCR、成本台账、批量导入导出

每完成一层就编译验证一次，不要一次性全写了再编译。

## 需要提醒的几个坑

1. **`Npgsql` 不要装**——那是给 PostgreSQL 的。只用 `Microsoft.Data.Sqlite`。
2. **EF Core 的 DbContext 生命周期**——用 `AddDbContext<AppDbContext>(options => options.UseSqlite(...), ServiceLifetime.Scoped)`，每个请求 new 一个 context，不要全局单例。
3. **前端路由**——Photino 用 `file://` 协议，React Router 的 BrowserRouter 会失效，必须用 **HashRouter**（这个改动只要改一行 `index.tsx`）。
4. **百度 OCR 的 HTTP 调用**——用 `HttpClient` + `IHttpClientFactory`，别自己 new `HttpClient`（有 socket 耗尽问题）。
5. **WAL 模式**——SQLite 连接字符串加 `Journal Mode=WAL`，跟现有数据库兼容。
6. **文件服务**——`System.IO` 的 API 跟你现在的 Rust `std::fs` 几乎一一对应，迁移成本最低的部分。
7. **不要用 MAUI**——你不需要移动端渲染引擎，Photino 就够了，更轻、更快、迭代成本更低。
