# 工程管家 — 渐进式改进计划

> 版本：v0.70.0 → 目标 v0.71.0
> 创建日期：2026-06-06
> 修订日期：2026-06-11（根据 PLAN-REVIEW.md 审查反馈修订）
> 状态：待执行（v2 修订版）
> 
> **核心原则：不重写，只改进。** 所有改动必须保证现有功能不退化，
> 每个 Phase 可独立执行、独立测试、独立提交。

---

## 总览

| Phase | 名称 | 风险 | 工作量 | 优先级 |
|-------|------|------|--------|--------|
| 1 | 类型系统清理（温和方案） | 低 | 小 | P2 |
| 2 | API 层精简（保守方案） | 低 | 小 | P1 |
| 3 | 数据库迁移机制 | 中 | 中 | P1 |
| 4 | 后端集成测试 | 低 | 大 | P1 |
| 5 | 前端测试现代化 | 低 | 大 | P2 |

每个 Phase 结束后必须通过 `npm run build:frontend` + `dotnet build` 双重验证。

---

## Phase 1：类型系统清理（温和方案）

> **v2 修订说明**：原方案要求全局替换 80+ 文件的 import 路径，diff 成本过高。
> 改为 re-export 渐进方案，新代码从 `types.ts` 导入，旧文件暂时不动。

### 目标
为新代码提供清晰的类型导入入口，旧代码渐进迁移。

### 1.1 创建 `types.ts` re-export 入口

**背景**：项目已从 Electron 迁移到 C# + WebView2，但核心类型文件仍叫
`electron.d.ts`（1215 行）。直接重命名会导致 80+ 文件 diff，
不值得。改为创建一个干净的入口文件。

**操作步骤**：

1. 创建 `src/types/types.ts`，内容为 re-export：
   ```typescript
   /**
    * 项目类型定义入口
    * 
    * 所有类型从这里导入。旧代码仍可从 './electron.d' 导入，
    * 新代码统一从 './types' 或 '@/types/types' 导入。
    */
   export * from './electron.d'
   ```
2. 在 `src/types/index.ts` 中增加一行 re-export（不删除原有导出）：
   ```typescript
   // 新入口（推荐）
   export * from './types'
   ```
3. **不改** `electron.d.ts` 文件名
4. **不改** 任何现有文件的 import 路径
5. 将 `ElectronAPI` 接口在 `types.ts` 中做类型别名：
   ```typescript
   export type { ElectronAPI as AppAPI } from './electron.d'
   ```

**效果**：新代码可以用 `import { Project } from '@/types/types'`，
旧代码 `import { Project } from '@/types/electron'` 继续工作，零 breakage。

**验证**：
```bash
npm run build:frontend
# 必须通过，无任何 TypeScript 错误
```

### 1.2 标记废弃方法

**操作步骤**：

1. 在 `src/types/electron.d.ts` 的 `ElectronAPI` 接口中，
   给以下方法加 `/** @deprecated C# 环境不使用 */` 注释：
   - `openExternalFile` — Electron 文件打开
   - `sqliteStatus` / `sqliteEnable` / `sqliteMigrate` /
     `sqliteGetReadMode` / `sqliteSetReadMode` — JSON→SQLite 迁移遗留
   - `dataConsistencyCheck` / `dataIntegrityCheck` / `dataExportJson` /
     `dataReconcile` — JSON 数据迁移遗留
2. 暂不删除方法（避免破坏现有调用），仅加注释

**验证**：`npm run build:frontend` 通过，无 TypeScript 错误。

---

## Phase 2：API 层精简（保守方案）

> **v2 修订说明**：原方案要求完整重写 `api-adapter.ts`，风险过高。
> 改为只删除已确认废弃的 dead code 分支，保留现有骨架不变。

### 目标
删除 Electron/Tauri 环境检测的 dead code，不做逻辑重写。

### 2.1 清理 `api-adapter.ts` 中的 dead branches

**背景**：当前 `api-adapter.ts`（266 行）包含 Electron/Tauri 检测分支，
实际运行时永远不会走到。这些 dead code 无害但增加认知负担。

**操作步骤**（保守方案，只删分支不改逻辑）：

1. 在 `getAPI()` 函数中，删除 `isElectron` 分支：
   ```typescript
   // 删除这段（第 42-44 行）
   if (isElectron) {
     return window.electronAPI;
   }
   ```
2. 删除 `isTauri` 分支（第 52-54 行）
3. 删除顶部的 `isElectron` / `isTauri` 变量声明（第 9-10 行）
4. 保留 `checkCSharpApi()` 和 `createMockAPI()` 不动
5. 保留 `environment` 导出，但简化为：
   ```typescript
   export const environment = {
     isBrowser: !cachedAPI,
   }
   ```

**不动的部分**：
- `checkCSharpApi()` — 现有 health check 逻辑，已验证可用
- `createMockAPI()` — 浏览器开发模式需要
- `getCachedAPI()` — 缓存逻辑

**影响范围**：
- `src/services/api-adapter.ts` — 主要改动（删 ~15 行）
- `src/hooks/useDataPath.ts` — 第 5 行有 `isTauri` 检测，需确认是否还用
- `src/components/TitleBar.tsx` — 第 36 行有
  `(window as any).electronAPI` 直接引用，改为 `getAPI()`

**验证**：
```bash
grep -r "isElectron\|isTauri\b" src/ --include="*.ts" --include="*.tsx" \
  --exclude-dir="__tests__"
# api-adapter.ts 中应无残留

npm run build:frontend
```

### 2.2 重命名 `tauri-bridge.ts` → `api-methods.ts`

**背景**：文件名 `tauri-bridge.ts` 暗示 Tauri 依赖，实际只是 HTTP API
调用集合。

**操作步骤**：

1. 重命名 `src/services/tauri-bridge.ts` → `src/services/api-methods.ts`
2. 更新 `api-adapter.ts` 中的 `import('./tauri-bridge')` →
   `import('./api-methods')`
3. 更新任何直接引用该文件的地方

**验证**：`npm run build:frontend` 通过。

### 2.3 更新 `package.json` 清理 Tauri 依赖

**操作步骤**：

1. 从 `dependencies` 中删除 `@tauri-apps/plugin-dialog`
2. 删除所有 `tauri` 相关 scripts（`build`, `tauri`, `tauri:dev`,
   `tauri:build`）
3. 保留 `build:frontend` 和 `dev` scripts

**验证**：`npm install` + `npm run build:frontend` 通过。

---

## Phase 3：数据库迁移机制

> **v2 修订说明**：明确所有文件为**新建**（非引用已有文件），
> 推荐使用 DbUp 轻量迁移框架，增加对 `EnsureTables` 现有逻辑的分析步骤。

### 目标
将 `EnsureTables` 中的建表 SQL 拆分为版本化迁移文件，
支持增量升级。

### 3.0 分析现有 `EnsureTables` 逻辑

**操作步骤**：

1. 阅读 `Program.cs` 第 228-268 行的 `EnsureTables` 方法
2. 记录当前包含的内容：
   - 30+ 张表的 `CREATE TABLE IF NOT EXISTS`（DDL）
   - 4 个角色的种子数据（`INSERT OR IGNORE`）（DML）
   - `schema_version` 表尚不存在（无版本追踪）
3. 确认没有 `ALTER TABLE` 迁移语句（当前全部用 `IF NOT EXISTS` 幂等建表）

### 3.1 创建迁移框架（使用 DbUp）

**选型理由**：DbUp 是轻量级 .NET 数据库迁移库，适合 SQLite，
支持嵌入式 SQL 脚本和 C# 代码迁移，社区成熟。

**操作步骤**：

1. 在 `EngineeringManager.Api.csproj` 中添加 NuGet 包：
   ```xml
   <PackageReference Include="dbup-core" Version="5.0.102" />
   <PackageReference Include="dbup-sqlite" Version="5.0.102" />
   ```
2. **新建** `EngineeringManager.Api/Migrations/` 目录
3. **新建** `EngineeringManager.Api/Migrations/MigrationRunner.cs`：
   ```csharp
   using DbUp;
   using System.Data;
   using Microsoft.Data.Sqlite;

   public static class MigrationRunner
   {
       public static void Run(string connectionString)
       {
           var upgrader = DeployChanges.To
               .SQLiteDatabase(connectionString)
               .WithScriptsEmbeddedInAssembly(
                   typeof(MigrationRunner).Assembly)
               .LogToConsole()
               .Build();

           var result = upgrader.PerformUpgrade();

           if (!result.Successful)
           {
               Console.Error.WriteLine($"[Migration] 失败: {result.Error}");
               throw result.Error;
           }
       }
   }
   ```
4. **新建** `EngineeringManager.Api/Migrations/Scripts/` 目录
5. **新建** 嵌入式 SQL 脚本 `001_InitialSchema.sql`：
   - 将 `EnsureTables` 中所有 `CREATE TABLE IF NOT EXISTS` 语句移入
   - 将角色种子数据（`INSERT OR IGNORE`）移入
   - 脚本必须是幂等的（`IF NOT EXISTS` / `INSERT OR IGNORE`）
6. 修改 `Program.cs` 的 `EnsureTables` 方法：
   - 保留方法签名（兼容性）
   - 内部改为调用 `MigrationRunner.Run(connectionString)`
   - 传入 SQLite 连接字符串而非 `IDbConnection`

**脚本嵌入配置**（在 `.csproj` 中）：
```xml
<ItemGroup>
  <EmbeddedResource Include="Migrations/Scripts/*.sql" />
</ItemGroup>
```

### 3.2 验证迁移

**验证**：
```bash
# 1. 全新数据库测试
# 删除 engineering.db，然后 dotnet run
# 确认 DbUp 创建 schema 表并记录 001 脚本已执行

# 2. 已有数据库升级测试
# 使用现有 engineering.db，dotnet run
# 确认 DbUp 检测到 001 已执行，跳过

# 3. 构建验证
dotnet build
```

**注意事项**：
- 第一次迁移前备份 engineering.db
- `EnsureTables` 中的 `CREATE TABLE IF NOT EXISTS` 幂等性在 SQL 脚本中保持
- DbUp 的 `schema_versions` 表自动管理版本追踪

---

## Phase 4：后端集成测试

> **v2 修订说明**：明确使用 `WebApplicationFactory` 集成测试模式。
> Minimal API 的 lambda 端点不需要单独实例化——通过启动测试服务器、
> 发 HTTP 请求来验证端点行为，这是 ASP.NET Core 官方推荐的测试方式。
> 无需重构端点代码结构。

### 目标
为 C# 后端添加集成测试，覆盖核心业务逻辑。

### 4.1 创建测试项目

**操作步骤**：

1. 在解决方案根目录创建测试项目：
   ```
   EngineeringManager.Tests/
     EngineeringManager.Tests.csproj
     Endpoints/
       AuthEndpointsTests.cs
       WageEndpointsTests.cs
       InvoiceEndpointsTests.cs
       ContractEndpointsTests.cs
     Common/
       CommonTests.cs
   ```
2. 项目文件配置：
   ```xml
   <Project Sdk="Microsoft.NET.Sdk.Web">
     <PropertyGroup>
       <TargetFramework>net8.0</TargetFramework>
       <IsPackable>false</IsPackable>
     </PropertyGroup>
     <ItemGroup>
       <PackageReference Include="Microsoft.NET.Test.Sdk" Version="17.*" />
       <PackageReference Include="xunit" Version="2.*" />
       <PackageReference Include="xunit.runner.visualstudio" Version="2.*" />
       <PackageReference Include="Microsoft.AspNetCore.Mvc.Testing" Version="8.*" />
       <PackageReference Include="Microsoft.Data.Sqlite" Version="10.*" />
     </ItemGroup>
     <ItemGroup>
       <ProjectReference Include="..\EngineeringManager.Api\EngineeringManager.Api.csproj" />
     </ItemGroup>
   </Project>
   ```

### 4.2 测试策略：WebApplicationFactory 集成测试

**核心思路**：不 mock lambda，不拆分端点。启动真实的测试服务器，
用内存 SQLite 替换生产数据库，发 HTTP 请求验证端点行为。

**测试基类**：

```csharp
public class ApiTestBase : IClassFixture<WebApplicationFactory<Program>>, IDisposable
{
    protected readonly HttpClient Client;
    protected readonly string DbPath;

    public ApiTestBase(WebApplicationFactory<Program> factory)
    {
        // 每个测试用独立的内存数据库
        DbPath = Path.Combine(Path.GetTempPath(), $"test-{Guid.NewGuid()}.db");

        Client = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                // 替换数据库连接为测试数据库
                services.AddScoped<IDbConnection>(_ =>
                {
                    var conn = new SqliteConnection($"Data Source={DbPath}");
                    conn.Open();
                    using var cmd = conn.CreateCommand();
                    cmd.CommandText = "PRAGMA journal_mode=WAL";
                    cmd.ExecuteNonQuery();
                    // 执行迁移初始化表结构
                    MigrationRunner.Run(conn); // Phase 3 完成后可用
                    return conn;
                });
            });
        }).CreateClient();
    }

    public void Dispose()
    {
        Client.Dispose();
        if (File.Exists(DbPath)) File.Delete(DbPath);
    }
}
```

**示例测试**：

```csharp
public class AuthEndpointsTests : ApiTestBase
{
    public AuthEndpointsTests(WebApplicationFactory<Program> factory) : base(factory) { }

    [Fact]
    public async Task Login_ValidCredentials_ReturnsToken()
    {
        var response = await Client.PostAsJsonAsync("/api/auth/login",
            new { username = "admin", password = "admin123" });

        response.EnsureSuccessStatusCode();
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.GetProperty("success").GetBoolean());
        Assert.True(json.GetProperty("data").GetProperty("token").GetString().Length > 0);
    }

    [Fact]
    public async Task Login_InvalidPassword_Returns400()
    {
        var response = await Client.PostAsJsonAsync("/api/auth/login",
            new { username = "admin", password = "wrong" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
```

### 4.3 优先测试的核心逻辑

| 模块 | 测试重点 | 文件 |
|------|---------|------|
| AuthEndpoints | 登录成功/失败、JWT 生成、密码版本兼容 | `AuthEndpointsTests.cs` |
| WageEndpoints | 工资计算、考勤 CRUD、批量操作 | `WageEndpointsTests.cs` |
| InvoiceEndpoints | 发票 CRUD、状态流转、关联查询 | `InvoiceEndpointsTests.cs` |
| ContractEndpoints | 合同 CRUD、三种合同类型 | `ContractEndpointsTests.cs` |
| Common | `HashPassword` 验证、`GetDefaultPermissions` 角色覆盖 | `CommonTests.cs` |

**验证**：
```bash
dotnet test EngineeringManager.Tests/
# 所有测试通过
```

---

## Phase 5：前端测试现代化

> **v2 修订说明**：拆为两步，先跑基线覆盖率再定目标。
> 测试文件实际数量可能超过 30+，需要先统计再评估工作量。

### 目标
更新前端测试基础设施，消除 Electron mock 残留。

### 5.0 跑基线覆盖率

**操作步骤**：

1. 运行 `npm run test:coverage` 获取当前覆盖率数据
2. 统计 `src/__tests__/` 下所有测试文件数量：
   ```bash
   find src/__tests__/ -name "*.test.*" -o -name "*.spec.*" | wc -l
   ```
3. 记录基线数据到本文件，作为后续对比依据

### 5.1 更新 `test-setup.ts`

**操作步骤**：

1. 将 `test-setup.ts` 中的 `window.electronAPI` mock 改为
   mock `getAPI()` 函数
2. 使用 `vi.mock('@/services/api-adapter')` 替代直接设置
   `window.electronAPI`
3. **分批更新**测试文件（不一次性全改）：
   - 第一批：`src/__tests__/hooks/` 下的文件（影响最小）
   - 第二批：`src/__tests__/components/` 下的文件
   - 第三批：`src/__tests__/store/` 和 `src/__tests__/utils/`

**示例改造**（Before → After）：

```typescript
// Before（当前写法）
beforeEach(() => {
  ;(window as any).electronAPI = {
    getProjects: vi.fn().mockResolvedValue({ success: true, data: [] }),
    // ...
  }
})

// After（推荐写法）
vi.mock('@/services/api-adapter', () => ({
  getAPI: vi.fn().mockResolvedValue({
    getProjects: vi.fn().mockResolvedValue({ success: true, data: [] }),
    // ...
  })
}))
```

**验证**：
```bash
npm run test
# 所有测试通过（每批改完后都跑一次）

grep -r "window.electronAPI" src/__tests__/ src/test-setup.ts
# 最终应返回 0 结果
```

### 5.2 补充缺失的 hook 测试（按基线决定范围）

**操作步骤**：

1. 先确认基线覆盖率（5.0 步骤）
2. 如果核心 hooks（`useCRUDBase` / `useForm` / `usePermission`）
   已有间接覆盖（通过组件测试），则不需要单独写测试
3. 如果覆盖率 < 50%，优先补充 `useCRUDBase` 测试（它是最核心的
   CRUD 抽象，所有数据操作都经过它）

**验证**：`npm run test:coverage`，对比基线数据。

---

## 执行顺序建议

```
Phase 3（数据库迁移）→ Phase 4（后端集成测试）
         ↓
Phase 2（API 精简）→ Phase 5（前端测试）
         ↓
Phase 1（类型清理）← 最低优先级
```

- Phase 3 是基础设施，Phase 4 依赖它的 `MigrationRunner`
- Phase 2 + 5 都是前端工作，可以并行
- Phase 1 最低优先级，纯美化改动

每个 Phase 完成后：
1. `npm run build:frontend` — 前端构建通过
2. `dotnet build` — 后端构建通过
3. `npm run test` — 前端测试通过
4. 更新 `CHANGELOG.md` 记录改动

---

## 风险控制

### 回滚策略
- 每个 Phase 在独立 git branch 上执行
- 完成后 squash merge 到 main
- 如发现问题，revert 整个 merge commit

### 不动的红线
- ❌ 不改业务逻辑（只改基础设施）
- ❌ 不改数据库 schema（Phase 3 只加迁移机制，不改表结构）
- ❌ 不改 API 端点路径（前端依赖这些路径）
- ❌ 不改权限系统（resource:action 格式保持不变）
- ❌ 不删 `window.electronAPI` 属性名（只改类型名）
- ❌ 不重写 `api-adapter.ts`（只删 dead code 分支）

### 验收标准
- `npm run build:frontend` 零错误
- `dotnet build` 零错误
- `npm run test` 全部通过
- `dotnet test` 全部通过（Phase 4 完成后）
- `npm run check` 通过（项目规则检查）
- 功能手动验证：登录 → 项目列表 → 发票管理 → 工资管理
