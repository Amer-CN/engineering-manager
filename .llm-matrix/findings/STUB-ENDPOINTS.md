# STUB 端点清单

生成时间: 2026-08-03T15:40:27.652Z
总数: 6 条（前端有调用 4 条）

> STUB = 端点已注册但方法体无 db 调用，或只返回硬编码零值。前端有调用的 STUB 意味着用户在用假功能，返回 HTTP 200 + 成功结构，无人察觉。

| 路由 | 方法 | file:line | 前端调用 |
|------|------|----------|---------|
| `/api/health/export-json` | POST | `SystemEndpoints.cs:498` | E:\测试\src\components\features\settings\SqliteHealthCheck.tsx:21 |
| `/api/attendances/generate-v2` | POST | `WageEndpoints.cs:109` | E:\测试\src\components\features\wages\useWageActions.ts:53<br>E:\测试\src\hooks\useWageAttendance.ts:34 |
| `/api/attendances/batch-import` | POST | `WageEndpoints.cs:116` | E:\测试\src\components\features\wages\useWageActions.ts:83<br>E:\测试\src\components\WageManagement.tsx:82 |
| `/api/wages/confirm-matches` | POST | `WageEndpoints.cs:288` | E:\测试\src\hooks\useBankReceiptBatch.ts:49 |
| `/api/attendances/generate` | POST | `WageEndpoints.cs:102` | 无 |
| `/api/wages/match-receipts` | POST | `WageEndpoints.cs:281` | 无 |

## 前端有调用的 STUB（用户在用假功能）

### /api/health/export-json

- 调用点: `E:\测试\src\components\features\settings\SqliteHealthCheck.tsx:21`

### /api/attendances/generate-v2

- 调用点: `E:\测试\src\components\features\wages\useWageActions.ts:53`
- 调用点: `E:\测试\src\hooks\useWageAttendance.ts:34`

### /api/attendances/batch-import

- 调用点: `E:\测试\src\components\features\wages\useWageActions.ts:83`
- 调用点: `E:\测试\src\components\WageManagement.tsx:82`

### /api/wages/confirm-matches

- 调用点: `E:\测试\src\hooks\useBankReceiptBatch.ts:49`

## 其余 STUB（未接线）

- `/api/attendances/generate` (WageEndpoints.cs:102)
- `/api/wages/match-receipts` (WageEndpoints.cs:281)
