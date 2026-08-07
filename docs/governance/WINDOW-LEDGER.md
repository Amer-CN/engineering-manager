# WINDOW-LEDGER.md — 并行窗口台账（M-FIX5 W3 建立）

> 目的：多窗口并行开发时，谁在跑、谁没跑、合并顺序必须有一张表可查。
> 基准：本表以 2026-08-07 M-FIX5 实测 ls-remote 为准。

| 窗口名 | 归谁 | 当前分支 | 分叉基线 | 最后一笔 SHA+时间 | 是否还在跑 | 合并顺序 | 谁负责合 |
|---|---|---|---|---|---|---|---|
| H 窗口（H-1..H-4c） | 未知会话 | 已合入 master（f41ec6f） | d80020d 之后 | f41ec6f 2026-08-07 | **已停**（master 后续由 M-FIX 线推） | 已合 | 已合 |
| I 窗口（I-1/I-2） | 未知会话 | window-i-stub = fc441a1 | f41ec6f | fc441a1 2026-08-07 06:26Z | **待定**（本轮只对账不合并） | 未定 | 未定（建议 M-FIX 线评估后合） |
| M-FIX 线（本会话） | 审查方驱动 | fix/direction-vocab → master | 逐轮 | 1b66a2b 2026-08-07 | 在跑 | 逐轮推 master | 本会话 |

## 关键事实（W3(a) 实测）
- I 窗口 2 笔：I-1 `1313a75` snapshots max-count（06:02Z）、I-2 `fc441a1` wages 回单匹配（06:26Z），均从 f41ec6f 分叉。
- master 当前 = 1b66a2b（H 窗口 + M-FIX4 已合）；master 领先 I 窗口分叉点 6 笔（H 窗口）。

## I 窗口合并建议（W3(d)）
- **是否进 master**：建议进（I-1/I-2 是「STUB 转本体」的正向功能，且门禁5 豁免已 −2/−1）。
- **谁来合/何时**：M-FIX 线下一轮评估（本轮只对账不 merge），需先解决门禁5 豁免与 master 的 4 条排除 filter 的计数差异。
- **预判冲突**：WageEndpoints.cs（I-2 +133/−7 vs master H-2 wages 改动）、scripts/check-write-permission.cjs（I 窗口 −2 豁免 vs master 门禁5 计数）、测试计数基线（I 窗口 +368 ReceiptMatchTests vs master 833）。

## 治理结论（W3(b)）
- 门禁5（check-write-permission.cjs）与 check-backend-rules.cjs **并行独立**，无重复但需协调（都是扫 Endpoints）。
- .llm-matrix/ 与 docs/findings、docs/audit **多套台账并行，真源不明**——建议 R9 统一真源（FRONTEND-GATING-MATRIX 自称真源 vs docs/findings 冲突）。
- 门禁5 豁免机制 **不满足纪律 14**（无基线文件/无 count.json/无 md5/无只减不增棘轮）——R9 需补齐。
