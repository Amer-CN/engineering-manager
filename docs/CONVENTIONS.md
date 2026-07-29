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
