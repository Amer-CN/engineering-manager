# 开发规范与 Checklist（完整版）

> 从根 AGENTS.md 下沉（2026-07-29）。主题：组件使用硬性规则、后端质量规则、新页面/新表 Checklist、架构规范。红线摘要保留在根 AGENTS.md，本文为完整细则真源。

## ⚠️ 红线

- 不得在组件中直接操作 localStorage，使用 `AuthContext`
- 不得绕过权限检查，所有敏感操作必须使用 `usePermission` hook
- 不得删除数据存储路径中的任何文件（`ApiConfig.ResolveDataPath()`）
- 不得在文件操作中硬编码 AppData 路径（必须使用 `ApiConfig.ResolveDataPath()`）

## 组件使用规则（硬性约束，违反会导致 build 检查失败）

| 场景 | 必须使用 | 禁止 |
|------|---------|------|
| 页面布局 | `<PageContainer>` | 手写 `p-6 max-w-[1400px] mx-auto` |
| 按钮 | `<Button variant="X" size="Y">`（src/components/ui/Button/） | `btn btn-*` CSS 类（已在 index.css 标记 @deprecated） |
| 卡片 | `<Card>` 或 `<StatCard>`（统计数值） | 手写 `bg-white rounded-xl shadow-sm` |
| Hero 横幅 | `<HeroBanner>` | 内联 `from-slate-800 via-slate-700` 渐变 |
| 色系 | slate-* / primary-* / success-* / warning-* / danger-* | gray-*（主题定义除外） |
| 字号 | text-caption（10px）/ text-micro（11px） | text-[10px] / text-[11px] 任意值 |

## 后端代码质量规则

- **SQL**：必须参数化（Dapper 匿名对象 @Param），严禁字符串拼接。表名必须用 `[]` 包裹
- **异常处理**：所有 catch 必须含 `Console.Error.WriteLine` 日志 + 正确的 HTTP 状态码返回
- **认证**：所有 `/api/*` 端点默认经 `GlobalAuthMiddleware` 强制鉴权（白名单：`/api/auth/login` `/api/health` `/api/ocr/setup/*`）。`/api/auth/login` 加 `login` 限流（5 次/分/IP），其他写端点加 `write` 限流（30 次/秒/IP）
- **审计日志**：写入失败必须返回实际错误，不得返回 `{ success: true }`
- **新建功能**：组件放 `src/components/features/<模块>/`，禁止在 `src/features/` 下建文件
- **禁止创建重复文件**：新建前确认无同名组件

## 新页面开发 Checklist（写页面时必须逐条确认）

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
6. [ ] **列名对齐真契约**：端点 INSERT/UPDATE 的列名必须与「前端类型(`src/types/electron.d.ts`) + 真实生产库」一致（二者是唯一真源，建表脚本/dev 库那套可能是从未匹配的死 schema）。改写端点后跑 `pwsh scripts/audit-column-drift.ps1 -DbPath <库>` 必须 `✅ 无列漂移`（详见 docs/SMOKE-TEST.md §0.5）

## 自动化检查的边界

- 有确定答案的一致性检查（列表比对、命名规范、差集）一律写脚本，不用 LLM
- 实测 LLM 在此类任务上可用率约 25%，且会虚构不存在的标识符
- 所有提取型脚本必须有哨兵：提取到 0 条要报错，不能当作「没有问题」
- 提取型脚本的判据必须限定在目标区域（如文件前 5 行的抬头区），否则正文里任何旧版本号/历史标记（如「v0.84.0 起」）都会被误当成待同步项
- **mock API 不得对后端未实现的端点返回 success**，否则开发期全绿、生产期崩溃（已发生：batchSaveWages 在 mock 返回成功，真后端 500）

## API 响应键名契约（v0.92.0 起）

- **键名转换只有一处：`src/services/api-client.ts` 的 `convertKeysToCamelCase`**（含 `_` 且非 `custom_` 前缀 → camelCase，递归作用于数组/嵌套对象）。`get/post/put/patch/del` 五个方法结尾全部经过它。
- 后端一律输出与 DB 列名一致的 snake_case（如 `daily_wage`、`worker_name`）——这是列名的原样投影，读代码能直接对上 PRAGMA。
- **不得**在 C# 侧再实现一份 camelCase 输出。否则同一条规则在两处各写一份，且规则必须永远保持一致（`custom_` 前缀这条例外尤其容易漏）——这正是本仓历史缺陷模式「同一事实两处各写一份」的又一例。
- 前端类型（如 `WageRecord`，`src/types/electron.d.ts`）永远按 camelCase 声明，与 api-client 转换后的形状一致。
- 为什么：曾有提案让后端 ToYuanRows 改输出 camelCase。被否——功能收益为零（前端拿到的一律 camelCase），却凭空制造第二份转换规则。

## 排查前后端字段映射的判据（v0.92.0 起）

- 判断「某个字段前端拿不拿得到、键名是什么」时，必须看**整条链路上所有映射层**，不能只看最靠近调用点的那一层。
- 本仓 HTTP 路径：`组件 → hook → api-adapter → tauri-bridge（纯直通） → api-client（有转换） → 后端`。转换发生在**倒数第二层**（api-client），bridge 是直通的。
- 为什么：D-8 查证曾只读到 tauri-bridge 就下结论「键名无转换」，漏了 bridge 下面还有一层 api-client——同一结论两人先后各栽一次。判据错误会导致基于错误前提的重构方向（当时险些在后端再造一份 camelCase 输出）。

## 已踩坑清单（写入文档，勿再犯）

- **【2026-09 分制贯彻：历史单位撕裂已终结】**全库金额列=分（整数值）、API=元，换算只允许 `MoneyUnit.ToFen/ToYuan` 单点（`Services/MoneyUnit.cs`）；历史元数据由迁移 053 一次性 ×100（原编 051，让位给并行线 AgentApproval 迁移防撞号）（`ROUND` 防丢分——003 的 CAST 截断教训；wages 带日薪 >5000 量级守卫，保护 v0.93+ ToFen 时代行不被二次转换；执行时序=启动早期、端点监听前，故不存在"新分制行被再 ×100"窗口）。**例外**：wage_history 保持元值（生产库旧 schema 与 014 产物列不相交，无法安全迁移，休眠读端点直读直出）；JSON 块（payment_records.invoice_details / settlements.items / files）为前端直读块，豁免分制恒为元；税率/天数/数量列豁免。此前「规范声明分、22/23 模块元直通、仅 wages 走 ToFen」的双轨是报表 KPI 100 倍虚高与 team-wages 日薪 100 倍（下条）的共同根因。
- **单位换算的边界是「写入路径的集合」，不是「表或列的集合」**。判据：该列的所有写入路径是否已统一走换算（如 `project_workers.daily_wage` 写入侧仍元直通，则读出侧不得 ÷100；`wages` 写入侧已走 ToFen，读出侧才 ToYuan）。**2026-09 起：所有金额列写入路径已统一走 MoneyUnit.ToFen，读出侧统一 ToYuan——此判据成为"新增端点必须走 MoneyUnit"的硬约束。**
- **唯一没有测试覆盖的分支，就是唯一错的分支**。team-wages 的 `pw.daily_wage` 曾因「003 声明该列为分」而反向 ÷100（日薪 200 显示成 2），而 D-4/D-5 的测试恰好都没覆盖它。（2026-09 起双表同为分制，此矛盾消解。）
- **校验必须直接 `return Results.BadRequest(...)`，不能抛异常**。`Program.cs:330` 的全局 `UseExceptionHandler` 会把一切未处理异常包成 500 + 通用消息「服务器内部错误」，异常里的 400 状态码与字段名全部丢失。
- **`schema_versions` 表存的是嵌入资源全名**（如 `EngineeringManager.Api.Migrations.Scripts.003_MoneyRealToInteger.sql`），不是文件名；查迁移应用状态时按此匹配。
- **Dapper dynamic + LEFT JOIN 未命中 = DBNull，不是 null，`?? 0` 兜不住**。`Convert.ToDouble(row.col)` 对 DBNull 抛 InvalidCastException → 500；`?? 0` 只在值是 null 时兜底。兜底必须在 SQL 侧 `COALESCE(col, 0)`（窗口 D generate 端点实测复现）。
- **DapperRow 对「未 SELECT 的列」返回 null 而非报错**（TryGetValue 静默兜底），`(long)null` 抛 RuntimeBinderException → 500。用 dynamic 行时，**SELECT 列表就是契约**：要读的列必须显式 SELECT 出来（窗口 D generate 端点既有行查询漏 SELECT id 实测复现）。
- **Dapper 匿名参数对象缺参/列名拼错，编译器完全静默，运行时必 500**——G2 一轮暴露 6 处：PUT members/workers 缺 Now、project-members 缺 Now、batches/copy 缺 CreatedBy、audit 列名 resource_type（7 处引用）。判据：新写/改写 Dapper 调用后，**参数对象键名必须与 SQL 占位符逐一对账**；唯一没测试覆盖的分支就是唯一错的分支。
- **共享工作区并行会话必须 worktree 隔离；任务书的 push 指令必须显式写目标分支**——窗口 K 前置协议：同一仓库多窗口并行时，非 master 或工作区有他人改动即 `git worktree add` 到独立目录，push 前再 fetch（被推进就 rebase + 重跑验收），且 push 指令显式写 `git push origin HEAD:master` 避免推错分支；不隔离会互相踩工作区，指令不显式会推错分支。
- **本地 build 必须与 CI 编译参数一致（M-FIX8 T5(d) 纪律）**——CI 的 test.yml 对 Api/Tests 两项目带 `-warnaserror`（任何编译警告升 error），本地若裸跑 `dotnet build`（不带 flag），警告不算错误 → 「build 0 错」是假绿。M 窗口（PR #9）与 K 窗口都曾因此把「CS8619/CS8604 在树上」自验成「全绿」——编译层确实能过（不带 flag 警告不升 error，K 的 862 测试数是真值），但 **CI 层必然红**（带 -warnaserror）。已落地：`EngineeringManager.Api/EngineeringManager.Api.csproj` 与 `EngineeringManager.Tests/EngineeringManager.Tests.csproj` 各加 `<TreatWarningsAsErrors>true</TreatWarningsAsErrors>`，本地不带 flag 的 build 与 CI 同等拦截。判据：**任何「编译通过」结论必须用带 -warnaserror 的 build（或等价 csproj 配置）复验**；无 `0 警告` 输出的「成功」不可信。且**必须 dotnet clean 后首次编译取得**——同一棵树第二条起的 dotnet 命令不会重放编译错误，会把红的自验成绿的（M-FIX13 X2 实测：50ee395 上 clean 后先跑 full EXIT=1 报 CS8604、再跑 filter EXIT=0 静默，颠倒 W1 顺序结论互换）。
- **报 dotnet test 四数必须写明带不带 --filter（M-FIX10 V4(c) 纪律，M-FIX11 U3 补公式）**——全量（无 filter）与 CI 同款 `--filter "FullyQualifiedName!~SttE2ETests&FullyQualifiedName!~BgeE2ETests&...!~RealHttp"` 是**两个口径**，差额恒为 13（M-FIX4 起每轮如此：全量 862 vs filter 后 849；833 vs 820），且跳过数 3→1 是因为被 filter 排除的 2 个 SttE2E 本身就是跳过项。**两个口径不许混着比**：报数时必须标注「全量」或「带 CI filter」，跨轮对比只允许同口径。把「差额 13」当「错误测量」是错判（M-FIX8 曾犯）。**换算公式 = 总数−13 / 通过−11 / 跳过−2**（4 类排除项里 2 个本身是跳过项）：全量 869→filter 856 / 866→855 / 3→1。任何跨轮对比只允许同口径。
- **判定命令成败禁止用管道（纪律 18，M-FIX12）**——`cmd | tail` 会把 `$?` 变成管道最后一个命令（tail/grep）的退出码，丢失原命令的成败信号（前三轮丢失退出码的根因）。一律写成：
  `<命令> > out.txt 2>&1 ; echo "EXIT=$?"` 先取 EXIT，再 `tail -20 out.txt` 读文件。任何「编译通过」「测试全绿」的结论必须以这种无管道方式取到的 EXIT 为准。
- **门禁/守卫类改动任务书必须含「既有测试影响面扫描」（纪律，R9-4 W2 登记）**——新增/收紧安全门（权限门、项目级写入门、行级守卫等）会遮蔽或改变既有测试的场景：非 admin 调用方若未配项目/授权种子，会被新门提前 403 拦下，导致既有「行级守卫 skipped/saved」类用例变红（红在门而非守卫）。任务书必做两件事：① grep 受影响端点的既有测试调用点、枚举非 admin 调用方；② 验收靶子必须列出受影响既有测试的处置（补种子适配或改断言，二选一）。出处：R9-3 Y1b / R9-4 WritePermissionB2Tests 两次纪律 17 停手，均为任务书规格缺口。
- **测试项目 NuGet 包禁止对运行时敏感依赖使用浮动版本（如 10.\*）**——必须与被测项目钉死同一精确版本。出处：R9-10 Z0，Tests 的 `Microsoft.Data.Sqlite 10.*` 在新 worktree 拉到 10.4，暴露 012 迁移双引号字符串被解析为列名，全量测试 1ms 全挂；同提交旧 worktree（仍 resolve 到 10.0.8）全绿。CI 全新 restore 同风险。
- **改动 E2E 测试类名/方法名前缀必须同步 CI filter（M-FIX12 W5(c) 纪律）**——CI filter 靠子串命中排除类（`BgeE2ETests` 命中 `BgeE2ETestsV2`、`M2FourthRoundTests.Model_` 命中方法名前缀），改名即 filter 静默失效 → 被排除测试重进 CI 跑真实模型必红 + 13 常数口径破坏。改任何 E2E 类名/方法名前缀前：同步改 test.yml 的 `--filter` 与 docs/ci/CI-EXCLUSIONS.md，并重测两口径四数（全量 vs filter，差额必须仍为 13）。
