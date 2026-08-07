# STUB 端点清单

生成时间: 2026-08-03T15:40:27.652Z
总数: 6 条（前端有调用 4 条）

> STUB = 端点已注册但方法体无 db 调用，或只返回硬编码零值。前端有调用的 STUB 意味着用户在用假功能，返回 HTTP 200 + 成功结构，无人察觉。

## 0. 执行状态（2026-08-05 · 窗口 E 批处理后更新）

- **E-1 已完成（考勤生成/导入本体，3 条）**：`/api/attendances/generate`（staff/memberIds）、`/api/attendances/generate-v2`（worker/projectWorkerIds）、`/api/attendances/batch-import`（按出勤天数 upsert）从假 `count=0` 改为真实写库。语义：generate 为 (projectId, yearMonth) 下无考勤行的 id 补「默认全勤」行（work_days=当月天数 + daily_status 全 work JSON，与人事模块「生成默认考勤→全勤→编辑调整」一致，天然幂等）；batch-import 按 (projectId, yearMonth, projectWorkerId) 定位，存在只刷新 work_days，不存在新建。窗口 D 积压记档中的「考勤侧有洞」已收口（工资生成前置链路接通）
- **E-2 已完成（其余 STUB 显式错误化，7 个端点）**：`/api/wages/match-receipts`、`/api/wages/confirm-matches`、`/api/health/export-json`、`/api/health/reconcile`、`/api/sqlite/enable`、`/api/snapshots/max-count`（GET+PUT）一律 `Common.Fail(..., 501)` + 明确「未实现（STUB）」信息——不再返回 HTTP 200 假成功结构（此前 confirm-matches 弹「成功确认 0 条」、max-count 弹「上限已设为 N」实际未落库，用户无感知丢操作）
- **I-1 已完成（快照上限本体）**：`/api/snapshots/max-count`（GET+PUT）接通 —— 存储 config.json 的 `snapshotMaxCount` 键（ResolveDataPath 下合并写，不覆盖已有键）；GET 任何登录用户可读、缺省默认 10；PUT `settings:update` 守卫、域 1..100、越界/非数 400；POST /api/snapshots 创建后按上限修剪最旧快照（失败只记日志不影响创建）；门禁5 删 max-count 豁免；前端 SnapshotsTab 域对齐 1..100、默认 10
- **E-3 已完成（mock 诚实化）**：`api-adapter.ts` 中与上述端点对应的 mock（generate/generate-v2/batch-import/match/confirm/export-json/reconcile/sqlite-enable）从假成功改为 `{ success: false, error: 'Mock 环境不支持 X（需连接后端 API）' }`（与 OCR mock 同型）
- **E-4 已完成（门禁5 豁免同步）**：3 个考勤端点从「STUB 不写库」豁免移入 G2 暂缓（wages:create，与 /api/wages/generate 同批同待遇）；其余 STUB 豁免理由更新为「显式 501 未实现」。门禁5 复跑 170 端点 0 违反
- **测试**：WageAttendanceGenerateTests +14（生成幂等/跳过/400、导入 upsert/400/空、7 个 STUB 端点 501），全量 713 通过 / 2 跳过 / 0 失败；npm run check 门禁1/2/5 全绿；check:version ✓；tsc --noEmit 0 错误；vite build ✓
- **遗留（不属本窗口）**：`batch-create` 仍无前端调用方；confirm-matches 前端批量确认流程（useBankReceiptBatch）现会收到 501 显式报错——这是预期行为（此前是假成功），待批量确认本体落地后再接通

## 1. 原清单（窗口 E 前状态，保留供追溯）

| 路由 | 方法 | file:line | 前端调用 | 窗口 E 处置 |
|------|------|----------|---------|------------|
| `/api/health/export-json` | POST | `SystemEndpoints.cs:498` | 无（清单生成时引用已过期） | 显式 501 |
| `/api/attendances/generate-v2` | POST | `WageEndpoints.cs:109` | `useWageActions.ts:53`<br>`useWageAttendance.ts:34` | 已实现本体 |
| `/api/attendances/batch-import` | POST | `WageEndpoints.cs:116` | `useWageActions.ts:83`<br>`WageManagement.tsx:82` | 已实现本体 |
| `/api/wages/confirm-matches` | POST | `WageEndpoints.cs:288` | `useBankReceiptBatch.ts:49` | 显式 501 |
| `/api/attendances/generate` | POST | `WageEndpoints.cs:102` | 无 | 已实现本体 |
| `/api/wages/match-receipts` | POST | `WageEndpoints.cs:281` | 无 | 显式 501 |
