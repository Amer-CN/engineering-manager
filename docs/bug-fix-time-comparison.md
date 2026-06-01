# 同一个 Bug 在不同语言的修复时间

> Bug：角色权限页面报错 `roles` 表缺少 `created_at` 列

---

## C# + Entity Framework：2-3 分钟，且大概率不会发生

```
这个 bug 在 C# 里根本不会出现，因为 Entity Framework 自动管理 schema 迁移。

假设你加入了 CreatedAt 字段：
1. 在 Role 模型类上加一行：public DateTime CreatedAt { get; set; }                 20秒
2. dotnet ef migrations add AddCreatedAtToRoles（自动生成 ALTER TABLE SQL）        30秒
3. 启动项目（EF 自动执行迁移）                                                     10秒
4. 验证                                                                           30秒

即使你说"不，我要模拟它真的出 bug 了"：
1. 控制台看到红色报错（EF 的报错非常清晰）                                        10秒
2. 运行 dotnet ef database update（EF 检测到未应用的 migration 并执行）             20秒
3. 刷新                                                                           10秒

总耗时：2-3 分钟。一大半时间在等命令执行。
```

---

## Go + Wails：10-15 分钟

```
1. 控制台看到报错："no such column: created_at"                                    30秒
2. 打开 init.go 或 migration.go，加一行：
   db.Exec("ALTER TABLE roles ADD COLUMN created_at TEXT DEFAULT (datetime('now'))")  2分钟
3. go build（10 秒，Go 的增量编译极快）                                            10秒
4. 重启 Wails 应用                                                                 30秒
5. 刷新页面验证                                                                    30秒
6. 可能出现：前后端参数 snake_case/camelCase 不一致（Go struct → JSON → TS）        5分钟
   但 Wails 自动生成 TS 类型绑定，这比 Rust 手写映射好很多。

总耗时：10-15 分钟。瓶颈在前后端参数对齐（手写映射都会有）。
```

---

## Rust + Tauri：60+ 分钟（真实记录）

```
1. 控制台红色报错                                                                   30秒
2. 查 Rust 源码，定位 get_roles                                                     2分钟
3. 发现 schema 不一致（init.rs 有 created_at，旧数据库没有）                          5分钟
4. 发现 CREATE TABLE IF NOT EXISTS 不修改已存在的表                                  2分钟
5. 加 ALTER TABLE 迁移                                                              3分钟
6. 编译验证                                                                         1分钟
7. 发现 npm run dev 只启前端                                                       5分钟
8. 改 bat 文件、停进程                                                              5分钟
9. 端口 5173 冲突，反复杀进程                                                       10分钟
10. 发现 cargo build 和 tauri:dev 用不同 feature 标志                                5分钟
11. 研究 init_database 调用链                                                       10分钟
12. 来回沟通等待                                                                   15分钟

总耗时：~60 分钟。只有 5 分钟花在「写代码」，55 分钟花在语言/工具链摩擦。
```

---

## TypeScript + Electron：5 分钟

```
1. 控制台看到错误                                                                   30秒
2. 在 database.ts 或 migration 函数里加一行 SQL                                      1分钟
3. 保存文件（Vite HMR，无需重启，无需编译）                                          2秒
4. 刷新页面                                                                         30秒
5. 实际花在理解问题的时间                                                           3分钟

总耗时：5 分钟。前后端同语言，无编译，无进程管理，无参数映射。
```

---

## 汇总

| 语言 | 时间 | 主要瓶颈 |
|------|:---:|---------|
| **C#** | 2-3 min | 等命令执行（EF 自动迁移） |
| **TypeScript** | 5 min | 理解问题 |
| **Go** | 10-15 min | 前后端参数对齐（手动） |
| **Rust** | 60+ min | 编译、双进程、类型系统、借用、serde |

---

## 关键洞察

C# 用 2 分钟，不是因为「C# 修 bug 快」，而是因为 **Entity Framework 让你根本不用手动写 schema 迁移**——这个 bug 在 C# 世界里几乎不会存在。

Go 比 TypeScript 慢 2-3 倍，主要是因为前后端分离带来的参数映射成本。但 Wails 自动生成 TypeScript 类型绑定，这个成本远低于 Tauri 的手写映射。

Rust 最慢的根本原因不是「语言太难」，而是 **摩擦点太多**：编译 → 双进程 → feature flags → 类型系统 → 借用检查 → serde。每一步单独看都不大，串在一起就是 10 倍的差距。
