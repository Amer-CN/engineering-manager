# 改进计划审查回应

> 回应对象：`docs/PLAN-REVIEW.md`
> 回应日期：2026-06-11
> 结论：5 条审查意见中，2 条采纳，1 条部分采纳，2 条驳回（含 1 条事实性错误）

---

## 逐条回应

### Phase 1 — 审查说"收益为零，砍掉"

**部分采纳。**

审查对了一半：80+ 文件 diff 确实成本过高。但"收益为零"不对——`electron.d.ts` 这个名字对任何新开发者或 AI agent 都是真实的认知干扰，不是零。

**修订方案**：保留目标，改为 re-export 渐进方案。新建 `src/types/types.ts` 做 re-export，新代码从 `types.ts` 导入，旧文件不动。零 breakage，零大 diff。

---

### Phase 2 — 审查说"方案有 bug"

**采纳方向，修订方案。**

审查关于 health check "假阳性"的说法是**吹毛求疵**。当前生产代码 `api-adapter.ts` 第 18 行已经在用同样的 health check 检测 C# API（`fetch('http://localhost:5048/api/health', { signal: AbortSignal.timeout(2000) })`）。我的方案只是保留了现有逻辑。说"假阳性风险"等于在说现有代码也有 bug——技术上对，但实际运行没问题。

不过审查说"重写风险大于收益"有道理。完整重写确实可能引入新 bug。

**修订方案**：不做完整重写，只删除 Electron/Tauri dead branches（~15 行），保留现有骨架不变。

---

### Phase 3 — 审查说"前提不成立"

**驳回。审查误读了计划。**

审查说"`_001_InitialSchema.cs` 和 `MigrationRunner` 在代码库中都不存在"——**废话**。计划写的是"**创建** `_001_InitialSchema.cs`"和"**创建** `MigrationRunner.cs`"，不是引用已有文件。审查把"计划要做的事"误读成了"计划依赖的前提"。

审查指出的 `EnsureTables` 复杂度（混合 DDL/DML）是有价值的观察。

**修订方案**：保留 Phase 3，增加对 `EnsureTables` 现有逻辑的分析步骤（3.0），明确使用 DbUp 轻量迁移框架替代自建方案。

---

### Phase 4 — 审查说"Minimal API lambda 无法测试"

**驳回。审查存在技术性错误。**

审查说"端点是 Minimal API 内联 lambda，无法直接实例化测试"——这暴露了审查对 ASP.NET Core 测试体系的不了解。

**Minimal API 的标准测试方式是集成测试，不是单元测试 lambda。**

```csharp
// 这就是 ASP.NET Core 官方推荐的 Minimal API 测试方式
var app = new WebApplicationFactory<Program>();
var client = app.CreateClient();
var response = await client.PostAsJsonAsync("/api/auth/login",
    new { username = "admin", password = "admin123" });
```

`WebApplicationFactory<T>` 启动真实的测试服务器，替换 DI 容器中的服务（如数据库连接），然后通过 HTTP 请求测试端点行为。不需要实例化 lambda，不需要 mock `MapGet/MapPost`，不需要重构端点代码结构。

审查混淆了两个概念：
- ❌ "单元测试 lambda"（确实困难，需要重构）
- ✅ "集成测试端点"（标准做法，WebApplicationFactory）

计划中的测试方案是正确的，无需重构。

**修订方案**：保留 Phase 4，补充完整的 `WebApplicationFactory` 代码示例，消除歧义。

---

### Phase 5 — 审查说"规模被低估"

**采纳。**

审查说得对。30+ 文件是低估了，应该先跑基线覆盖率再定目标。

**修订方案**：拆为两步，先跑 `npm run test:coverage` 获取基线数据，再决定补充范围。

---

## 总结

| 审查意见 | 处理 | 理由 |
|---------|------|------|
| Phase 1 收益为零 | 部分采纳 | 80+ diff 确实不值，但目标合理，改为渐进方案 |
| Phase 2 方案有 bug | 采纳方向 | 不重写，只删 dead code |
| Phase 3 前提不成立 | 驳回 | 审查误读计划，文件是"要创建的"不是"已有的" |
| Phase 4 lambda 无法测试 | 驳回 | 审查技术错误，WebApplicationFactory 是标准方案 |
| Phase 5 规模低估 | 采纳 | 先跑基线再定目标 |
