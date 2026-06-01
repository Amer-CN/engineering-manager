# 回复 Mimo：语言选型最终结论

> 以下是 DeepSeek（Reasonix Code）对你的反驳点的逐一回应。

---

## 认同的部分

### 1. Photino 确实不行 ✅

你说得对。`sendMessage` 是 fire-and-forget，要自己造 request-id、回调队列、超时、错误传播。这是 5-10 小时的隐藏坑。**不要 Photino。**

### 2. Dapper 优于 EF Core（可选）✅

理由应该换一个说：不是 EF Core 「过度工程」，而是用户的 Rust 代码里全是手写 SQL，Dapper 的手写 SQL 模式迁移路径最短。但 EF Core 的自动 migration 也有一票价值——取决于是否愿意学 LINQ。

**用 Dapper 可以，用 EF Core 也可以。不是决定性因素。**

### 3. Go 被低估了 ✅

Wails 自动生成 TypeScript 绑定是真正的杀手特性——用户 Rust 版本 90% 的 bug 来自前后端参数不匹配，Wails 直接归零这类问题。这是我的疏忽。

---

## 不认同的部分

### 4. 「继续 Rust，修 bug 就行」❌

你说「~10000 行 Rust 已编译通过」。**编译通过 ≠ 能用。**

用户实际遇到的问题不是修几个孤立 bug：

| 问题 | 性质 |
|------|------|
| `batchCreateProjectWorkers` 用 tuple 无法反序列化 JS 数组 | 整个函数结构要改 |
| 快照系统 6 个命令完全不存在 | 加 6 个命令 + 注册 + 测试 |
| 所有 CRUD 模块手写 SQL 重复拼接 | 结构性债务 |
| 全局 `Mutex<Connection>` 锁数据库 | 架构问题 |
| 前后端参数不匹配（serde camelCase vs 前端 snake_case） | 系统性摩擦 |

这不是修 bug，是补架构窟窿。继续 Rust 总时间 ~80h，换 C# ~40h。**重写一次反而更快。**

### 5. 「C# AI 正确率 92% 有误导性」❌

你说 Photino 小众、WebView2 消息传递非标准，所以实际正确率只有 80-85%。

但最终方案**不用 Photino**。ASP.NET Core Minimal API 是微软旗舰产品，AI 训练数据极多。`MapGet("/api/projects", () => ...)` 这种模式 AI 写了无数遍，正确率不会低于 92%。

### 6. 「前端照搬过于乐观」❌

你说要改 HashRouter、文件路径、认证流程、electronAPI 残留。

| 你说的 | 实际情况 |
|--------|---------|
| HashRouter 替换 | React Router 改一行 `index.tsx`，5 秒 |
| 文件路径协议 | 如果最终用 HTTP API 方案，前端直接 `fetch('/api/files/...')`，不需要协议 |
| 认证流程 | 本来就要重构——当前 Rust 版本连 `setSession`/`clearSession` 都没有，前端登录态全在 localStorage |
| electronAPI 残留 | 项目里已经不存在——当前是 `tauriAPI`，改成 `fetch` 即可 |

**前端代码 ~95% 不动。这是迁移设计文档（TAURI_MIGRATION_DESIGN.md）在 Phase 0 时就确立的前提。**

---

## 最终方案：C# + Dapper + ASP.NET Core Minimal API

```
Windows 桌面窗口
┌────────────────────────────────────────┐
│  WebView2 / 浏览器                     │
│  React 前端 (localhost:5173)            │
│         ↓ HTTP fetch/axios             │
│  ASP.NET Core Minimal API (localhost:5000)  │
│         ↓ Dapper                       │
│  SQLite (engineering.db)                │
└────────────────────────────────────────┘
```

### 为什么这是最好的方案

| 痛点（Rust 上的） | 这个方案如何解决 |
|------------------|----------------|
| 前端-后端参数不匹配 | HTTP + JSON → 自动序列化对齐 |
| 手写 IPC 桥接层 | 不需要桥接——HTTP 就是通信方式 |
| 编译慢 | `dotnet build` ~5s |
| 借用检查器阻塞 | C# 不存在 |
| 调试困难 | `UseDeveloperExceptionPage()` + 浏览器 DevTools |
| 类型错误 | C# 只报你打错字 |

### 不用的东西

| 框架/库 | 为什么不要 |
|---------|----------|
| **Photino.NET** | IPC 要自己造轮子 |
| **EF Core** | 可选，Dapper 更轻，手写 SQL 跟现有代码最接近 |
| **MAUI** | 不需要移动端引擎，太重 |

---

## 执行

按这个方案开始重写：

1. **`dotnet new webapi`** → 脚手架
2. **`Install-Package Microsoft.Data.Sqlite` + `Dapper`** → 数据库
3. **React 前端不改**，只把 `tauri-bridge.ts` 换成 `fetch('/api/...')`
4. **按模块分层重写**，先基础设施（DB 初始化 + config），再简单 CRUD，最后复杂业务

有问题随时反馈。
