# JWT 认证 + Common.Fail HTTP 状态码 补充执行手册

> 本手册基于对 MiMoCode 执行结果的审查生成，只包含**真正未完成**的部分。
> 工作目录：E:\测试
> 最后更新：2026-06-12

---

## 审查结论

### JWT 认证：✅ 已完成，不需要补做

MiMoCode 报告 JWT "完成"，经审查**确实已完成**：

| 组件 | 状态 | 证据 |
|------|------|------|
| 后端 JWT 配置 | ✅ | `Program.cs` 第25-45行：`AddAuthentication(JwtBearerDefaults.AuthenticationScheme)` + `AddJwtBearer(...)` |
| 后端授权策略 | ✅ | `Program.cs` 第39-45行：`DefaultPolicy = RequireAuthenticatedUser()` |
| 登录端点 token 生成 | ✅ | `AuthEndpoints.cs` 第18-36行：`GenerateJwtToken()` 方法，登录返回 `token` 字段 |
| 登录端点允许匿名 | ✅ | `AuthEndpoints.cs` 第46行：`[AllowAnonymous]` |
| 健康检查允许匿名 | ✅ | `HealthEndpoints.cs` 已配置 |
| 备份端点允许匿名 | ✅ | `BackupEndpoints.cs` 已配置 |
| 其他端点需授权 | ✅ | 各端点 `.RequireAuthorization()` |
| 前端 token 管理 | ✅ | `api-client.ts` 第10-23行：`setAuthToken`/`getAuthToken` |
| 前端请求头 | ✅ | `api-client.ts` 第56-60行：`Authorization: Bearer ${authToken}` |
| 前端登录接驳 | ✅ | `tauri-bridge.ts` 第56-58行：登录后 `setAuthToken(result.data.token)` |
| 前端登出清理 | ✅ | `AuthContext.tsx` 第118行：`logout()` 中 `setAuthToken(null)` |
| 编译验证 | ✅ | `dotnet build` 零错误，`npx vite build` 成功 |

**结论：JWT 认证已全部就绪，无需补做。**

---

### Common.Fail HTTP 状态码：❌ 需要补做

MiMoCode 报告 P3.2 "完成"，经审查**只改了 3 处**（AuditEndpoints/HealthEndpoints/ConfigEndpoints 各1处），仍有 **7 处** `Common.Fail()` 需要改为更语义化的错误返回。

#### 当前 Common.cs 已有方法

```csharp
public static IResult Fail(string error, int statusCode = 400) =>     // 业务错误 400
public static IResult NotFound(string error = "资源不存在") =>        // 404
public static IResult ServerError(string context, Exception ex) =>    // 500
```

#### 需要修复的 7 处

| # | 文件 | 行号 | 当前代码 | 修复为 | 原因 |
|---|------|------|---------|--------|------|
| 1 | `AuthEndpoints.cs` | 54 | `Common.Fail("用户名或密码错误")` | 保持不变 | 登录失败是业务错误，400 正确 |
| 2 | `BackupEndpoints.cs` | 36 | `Common.Fail("桌面上没有找到备份文件")` | `Common.NotFound("桌面上没有找到备份文件")` | 资源不存在，应返回 404 |
| 3 | `ConfigEndpoints.cs` | 97 | `Common.Fail("路径不能为空")` | 保持不变 | 参数校验，400 正确 |
| 4 | `FileEndpoints.cs` | 36 | `Common.Fail("非法路径")` | 保持不变 | 参数校验，400 正确 |
| 5 | `HealthEndpoints.cs` | 56 | `Common.Fail("无效的表名")` | 保持不变 | 参数校验，400 正确 |
| 6 | `ProjectEndpoints.cs` | 119 | `Common.Fail("该成员已在项目中")` | 保持不变 | 业务冲突，400 正确 |
| 7 | `SqliteAdminEndpoints.cs` | 145 | `Common.Fail("无效的读取模式")` | 保持不变 | 参数校验，400 正确 |

**实际只需修改 1 处**：`BackupEndpoints.cs` 第36行从 `Common.Fail` 改为 `Common.NotFound`。

**其余 6 处 `Common.Fail` 是正确的**——它们都是参数校验或业务逻辑错误，返回 HTTP 400 是合适的。

**结论：P3.2 实际只需改 1 处，不是 7 处。**

---

## 唯一需要修复的代码

### `EngineeringManager.Api/Endpoints/BackupEndpoints.cs` 第36行

**修复前：**
```csharp
if (backups.Length == 0) return Common.Fail("桌面上没有找到备份文件");
```

**修复后：**
```csharp
if (backups.Length == 0) return Common.NotFound("桌面上没有找到备份文件");
```

**原因：** 用户请求的资源（备份文件）不存在，应返回 HTTP 404 而非 400。

---

## 验证

```bash
cd EngineeringManager.Api && dotnet build
# 预期：零错误零警告
```

修复后所有 `Common.Fail` 调用都是合理的业务错误（400），`Common.NotFound` 用于资源不存在（404），`Common.ServerError` 用于异常（500）。
