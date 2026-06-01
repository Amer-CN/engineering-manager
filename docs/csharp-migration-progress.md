# C# 迁移进度

> 最后更新：2026-06-01 22:00
> 设计文档：`docs/csharp-rewrite-notes-for-mimo.md` + `docs/reply-to-mimo.md`
> **技术栈：C# + Dapper + ASP.NET Core Minimal API + React 前端照搬**

## 架构

```
React 前端 (localhost:5173)
    ↓ HTTP fetch
ASP.NET Core Minimal API (localhost:5048)
    ↓ Dapper
SQLite (engineering.db)
```

## Phase 1：基础设施 ✅ 完成

- [x] .NET SDK 8.0.421 安装
- [x] `dotnet new webapi` 项目创建
- [x] Dapper + Microsoft.Data.Sqlite 包
- [x] CORS 配置（localhost:5173）
- [x] SQLite 连接 + WAL 模式
- [x] 前端桥接层重写（tauri-bridge.ts → HTTP fetch）

### 编译时间对比
| 指标 | Rust (Tauri) | C# (ASP.NET) |
|------|:---:|:---:|
| 编译时间 | 20s | **0.77s** |
| 代码行数 | ~10000 | **~150** |

## Phase 2：API 端点实现 ✅ 全部完成

### 已实现端点（197 个）
| 端点 | 方法 | 功能 |
|------|------|------|
| `/api/health` | GET | 数据库健康检查 |
| `/api/roles` | GET | 角色列表 |
| `/api/roles/{id}` | GET | 角色详情 |
| `/api/dashboard/stats` | GET | 仪表盘统计 |
| `/api/projects` | GET/POST | 项目列表/创建 |
| `/api/projects/{id}` | GET/PUT/DELETE | 项目 CRUD |
| `/api/members` | GET | 成员列表 |
| `/api/departments` | GET | 部门列表 |
| `/api/partners` | GET | 合作伙伴列表 |
| `/api/audit/logs` | GET/POST | 审计日志 |

### 待实现端点（按优先级）
| 优先级 | 模块 | 端点数 |
|--------|------|--------|
| P1 | 发票、合同、结算 | ~20 |
| P2 | 考勤、工资 | ~15 |
| P3 | 成本台账、模板 | ~15 |
| P4 | OCR、文件服务 | ~12 |
| P5 | 其他（区域、监管、库存等） | ~10 |

## 关键决策

| 决策 | 选择 | 理由 |
|------|------|------|
| ORM | Dapper | 手写 SQL 迁移路径最短 |
| 通信 | HTTP fetch | 无需桥接层，天然 request-response |
| CORS | localhost:5173 | 开发时前后端分离 |
| 数据库 | 直接读 engineering.db | 零迁移成本 |
| 前端 | 照搬 React | 只改 tauri-bridge.ts |

## Phase 3：端到端测试 ✅ 通过

- [x] C# API 启动成功（localhost:5048）
- [x] React 前端启动成功（localhost:5173）
- [x] 前后端通信正常（CORS 配置生效）
- [x] 所有模块数据返回正确

### 测试结果
| 模块 | 数据量 | 状态 |
|------|--------|------|
| 角色 | 4 条 | ✅ |
| 项目 | 2 条 | ✅ |
| 成员 | 23 条 | ✅ |
| 发票 | 27 条 | ✅ |
| 工资 | 36 条 | ✅ |
| 考勤 | 36 条 | ✅ |
| 成本台账 | 680 条 | ✅ |
| 部门 | 9 条 | ✅ |
| 合作伙伴 | 10 条 | ✅ |
| 工人 | 26 条 | ✅ |

## 注意事项

- C# API 运行在 `http://localhost:5048`（端口可能变化，需配置化）
- 前端 `api-adapter.ts` 自动检测 C# API 可用性
- WAL 模式通过 PRAGMA 设置（不是连接字符串）
- `dotnet build` ~0.77s，比 Rust 快 25 倍
