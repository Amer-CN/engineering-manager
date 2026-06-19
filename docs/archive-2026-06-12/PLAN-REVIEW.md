# 改进计划审查报告

> 审查对象：`docs/IMPROVEMENT-PLAN.md`（v0.70.0 → v0.71.0）
> 审查日期：2026-06-11
> 审查依据：代码图谱索引（590 文件 / 5147 节点 / 8610 边）+ 源码深度阅读
> 审查结论：5 个 Phase 中有 3 个存在**事实性错误**或**方案不可行**问题

---

## 执行摘要

| Phase | 计划状态 | 审查结论 | 核心问题 |
|-------|---------|---------|---------|
| 1 | 类型系统清理 | ❌ 不建议执行 | 命名遗留收益为零，80+ 文件 diff 不值得 |
| 2 | API 层精简 | ⚠️ 降级执行 | 方案有 bug，重写风险大于收益 |
| 3 | 数据库迁移机制 | ❌ 前提不成立 | 关键文件在代码库中不存在 |
| 4 | 后端单元测试 | ❌ 方案不可行 | Minimal API lambda 结构无法有效测试 |
| 5 | 前端测试现代化 | ✅ 方向正确 | 规模被低估，建议分步执行 |

---

## Phase 1：类型系统清理 — ❌ 不建议执行

### 1.1 重命名 `electron.d.ts` → `types.ts`

**计划声称**：约 80 个文件需要替换导入路径。

**实际情况**：

- 文件名 `electron.d.ts` 不影响编译、不影响运行、不影响功能，纯粹是认知层面的历史遗留
- 替换 80+ 个文件的导入路径会产生巨大的 git diff，review 成本极高
- 计划后半段说要保留 `window.electronAPI` 属性名不变，仅改接口名 `ElectronAPI` → `AppAPI` — 这**完全没有消除任何认知负担**，开发者代码里看到的还是 `electronAPI`
- 1.1 和 1.2 强耦合（1.2 依赖 1.1 的重命名结果），拆分执行反而增加了协调复杂度

**结论**：收益 ≈ 0，成本 ≈ 80 个文件的 diff + review 时间。建议直接砍掉。

### 1.2 标记废弃方法

**实际情况**：

- ✅ 方向正确，加 `@deprecated` 注释是低风险操作
- 但标注"约 200 行 mock API" — 实际 `createMockAPI()` 返回的是裸对象字面量，没有显式的类型接口，标记 deprecated 只需要在方法注释上改，工作量极小
- 当前 `api-adapter.ts` 中生产环境只走 C# API 路径，其他分支（Electron / Tauri）是**无害的 dead code**

---

## Phase 2：API 层精简 — ⚠️ 方案有 bug

### 2.1 重写 `api-adapter.ts`

计划给出的简化代码存在逻辑缺陷：

```typescript
// 计划中的写法
if (await checkCSharpApi()) {
    const module = await import('./tauri-bridge')
    cachedAPI = module.tauriAPI as AppAPI
    return cachedAPI
}
```

**具体问题**：

1. `checkCSharpApi()` 只检测 `/api/health` 返回 HTTP 200，健康检查通过不代表认证、数据库连接等可用。这是一个**假阳性**风险 — API 可能"健康"但无法处理业务请求
2. `tauri-bridge.ts` 实际导出的是 `export const tauriAPI: AppAPI = { ... }`，计划假设正确但没有验证
3. 删除 `isElectron` / `isTauri` 检测会影响测试文件的 mock 逻辑（测试依赖这些环境变量判断）
4. 当前代码虽然 266 行长，但逻辑正确：Electron → C# → Tauri → Mock，dead code 但无害

**结论**：精简 dead code 的动机合理，但重写方案的 bug 风险大于收益。建议只做 `@deprecated` 标注，不动逻辑。

---

## Phase 3：数据库迁移机制 — ❌ 前提不成立

### 3.1 创建迁移机制

**计划提到**：`_001_InitialSchema.cs` 和 `MigrationRunner`。

**实际情况**：这两个文件/类在代码库中**都不存在**。

当前数据库初始化逻辑全部内联在 `Program.cs` 的 `EnsureTables` 方法中（第 228 行起），是一个约 100+ 行的巨型方法，包含：
- `CREATE TABLE IF NOT EXISTS` 用于每张业务表
- 索引创建
- 列迁移（`ALTER TABLE ADD COLUMN IF NOT EXISTS`）
- 角色/用户种子数据

计划没有说明如何从 `EnsureTables` 中提取表结构，也没有选择迁移框架（FluentMigrator / DbUp / 自建）。手动拆分 100+ 行混合了 DDL、DML、迁移逻辑的代码，极易出错。

### 3.2 种子数据分离

**问题**：
- 计划说"移到 `_001_InitialSchema.cs` 的 Up 方法" — 但 `_001_InitialSchema.cs` 不存在
- 当前种子数据已经用 `INSERT OR IGNORE` 保证了幂等性
- 这个子任务本身没问题，但作为 Phase 3 的一部分，前提不成立

**结论**：Phase 3 建立在不存在的基础之上。建议降级为长期 TODO，或者重新设计一个完整的迁移方案（选框架 → 评估工作量 → 再排期）。

---

## Phase 4：后端单元测试 — ⚠️ 方案不可行

### 4.1 测试项目结构

计划假设可以用 xunit + `Microsoft.AspNetCore.Mvc.Testing` 测试端点，但实际遇到了结构性障碍：

1. **端点是 Minimal API 内联 lambda**，不是独立的 controller/action 类。例如：
   ```csharp
   app.MapGet("/api/users", (IDbConnection db) =>
       Common.Ok(db.Query("SELECT ...")));
   ```
   每个端点都是一个匿名委托，无法直接实例化测试

2. 所有路由注册在 `RegisterEndpoints(WebApplication app)` 方法中，测试需要 mock `app.MapPost/MapGet/MapPut` 等 — 这些方法返回 `IEndpointConventionBuilder`，mock 极其繁琐

3. `IDbConnection` 通过 DI 注入，但连接字符串硬编码在 `ConfigureServices` 的 `AddScoped` lambda 中，测试时需要替换整个 DI 容器配置

4. 计划中的 `MigrationRunnerTests.cs` — 同样，`MigrationRunner` 不存在

**结论**：不重构端点代码结构（改成独立的 handler class），单元测试几乎写不动。这实际上要求 Phase 4 变成一个**重构项目**，违背了"不改业务逻辑"的红线。建议降级为低优先级，或先做端点重构。

---

## Phase 5：前端测试现代化 — ✅ 方向正确

### 5.1 更新 test-setup.ts

- ✅ 将 `window.electronAPI` mock 改为 `vi.mock('@/services/api-adapter')` 是正确方向
- ⚠️ 计划说"约 30+ 个测试文件" — 实际 `src/__tests__/` 下有 9 个子目录（components、critical、electron、fixtures、hooks、sqlite、store、types、utils），文件数量可能更多
- 每个文件都要改，这本身就是一个大重构

### 5.2 补充 hook 测试

- 计划说 `useCRUDBase` / `useForm` / `usePermission` / `useFilters` "无测试" — 需要确认实际测试覆盖情况
- "覆盖率 > 70%" 的目标缺乏基线数据，建议先跑一次 `npm run test:coverage` 看当前基线

**结论**：方向正确，但建议分两步：先改 `test-setup.ts` 和 `vi.mock` 模式，观察效果后再决定是否大规模推进。

---

## 总结：取舍建议

| Phase | 建议 | 理由 |
|-------|------|------|
| Phase 1 | ❌ 砍掉 | 命名清理收益为零，80+ 文件 diff 不值得 |
| Phase 2 | ⚠️ 降级 | 只做 `@deprecated` 标注，不动逻辑重写 |
| Phase 3 | ❌ 降级为 TODO | 前提不成立（文件不存在），需重新设计方案 |
| Phase 4 | ❌ 降级为 TODO | Minimal API 内联 lambda 无法有效测试，需先重构端点 |
| Phase 5 | ✅ 保留但缩小范围 | 只改 test-setup.ts + vi.mock 模式，不强制全覆盖 |

**真正值得做的只有两件事：**

1. **Phase 2 的 `@deprecated` 标注**（低风险 dead code 清理）
2. **Phase 5 的 `test-setup.ts` 改造**（改善测试基础设施）

其余三个 Phase 要么方案有 bug，要么前提不成立，要么在当前代码结构下不可行。建议重新规划。
