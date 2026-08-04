# 修复方案 — getAttendancesByMember 404

状态: 已确认线上 bug
调用链: `src/components/features/members/MemberDetail.tsx:58` → `getAPI().getAttendancesByMember(member.id)` → `GET /api/attendances/member/{memberId}` → 后端无此路由 → 404

## 根因

后端 `GET /api/attendances`（WageEndpoints.cs:20）签名只支持 `long? projectId, string? yearMonth`，不支持 memberId，也无 `/api/attendances/member/{id}` 子路由。仅改前端路径无效。

## 后端改动（WageEndpoints.cs:20-40）

1. 形参加 `long? memberId`：
   ```csharp
   app.MapGet("/api/attendances", (HttpContext ctx, IDbConnection db, long? projectId, string? yearMonth, long? memberId) =>
   ```
2. 条件加一行：
   ```csharp
   if (memberId.HasValue) conditions.Add("a.member_id=@MemberId");
   ```
3. 参数对象补 `MemberId = memberId`：
   ```csharp
   return Common.Ok(db.Query(sql, new { ProjectId = projectId, YearMonth = yearMonth, MemberId = memberId, Uid = uid, IsAdmin = isAdmin }));
   ```
4. 现有 `CurrentUser.UserFilterWithAuthorizedProjects(scope, "a.project_id", "a.created_by")` 过滤保持不动 → 数据范围/权限不绕过

## 前端改动（src/services/tauri-bridge.ts:255）

```typescript
// 改前
getAttendancesByMember: (memberId: number) => apiClient.get<AttendanceRecord[]>(`/api/attendances/member/${memberId}`, { yearMonth }),
// 改后
getAttendancesByMember: (memberId: number, yearMonth?: string) => apiClient.get<AttendanceRecord[]>('/api/attendances', { memberId, yearMonth }),
```

## 关联

- `src/types/electron.d.ts:1138` 签名同步（若 Electron 侧也有该接口）
- 前端调用点 `MemberDetail.tsx:58` 传参无需改（memberId 已在第一个参数）
- 测试建议：`EngineeringManager.Tests` 加一个 `GET /api/attendances?memberId=` 冒烟（参照 `UserDimPhase2Tests.Wages_Get_Smoke_Structure` 写法）

---

# 待办：batch-save 响应新增 skipped，前端需提示

状态: 待前端实现（后端已完成，v0.92.0）

- 背景: `POST /api/wages/batch-save` 改为显式 upsert 后，已发款行
  （paid_amount != 0）会被跳过不更新。响应从 `{ saved }` 扩展为
  `{ saved, skipped, skippedItems: [{ projectWorkerId, yearMonth }] }`。
- 后端已返回多出的字段，不影响现有调用；前端（useWageActions.ts
  handleSaveWages / handleSavePayments）目前只读 `r.success`。
- 待办: 前端读取 `skipped`/`skippedItems`，在 saved > 0 且 skipped > 0 时
  提示「N 条已发款记录未更新」，并用 skippedItems 指出是哪几条
  （按 projectWorkerId + yearMonth 定位）。
