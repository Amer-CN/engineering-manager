# WINDOW-LEDGER.md — 并行窗口台账（M-FIX6 V4 重写）

> 本表核对时刻：2026-08-07 16:10 (UTC+8，精确到分)
> 规则：每轮必须更新「master 当前 tip」行；窗口至少列 D/E/H/I/M-FIX 线。

| 本表核对时刻 | 2026-08-07 16:10 (UTC+8) |
|---|---|
| **master 当前 tip** | `8e49d4b2816650ed5a30b09716b72157f02e61b5` |
| tip 归属窗口 | I 窗口（I-2，rebase 到 746aa99 之上） |
| tip 推送时刻 | 2026-08-07 07:33:57Z（committer 时间） |

| 窗口名 | 归谁 | 当前分支 | 分叉基线 | 最后一笔 SHA+时间 | 是否还在跑 | 合并顺序 | 谁负责合 | 证据出处 |
|---|---|---|---|---|---|---|---|---|
| C 窗口 | 未知会话 | 已合入 master | 早期 | WRITE-AUTH-MATRIX（窗口 C 产出） | 已停 | 已合 | 已合 | .llm-matrix/findings/WRITE-AUTH-MATRIX.md:1 |
| D 窗口 | 未知会话 | 已合入 master | 早期 | STUB-ENDPOINTS「窗口 D 积压记档」 | 已停 | 已合 | 已合 | .llm-matrix/findings/STUB-ENDPOINTS.md:10 |
| E 窗口 | 未知会话 | 已合入 master | 早期 | E-1..E-4（考勤 STUB 转本体，713 通过） | 已停 | 已合 | 已合 | STUB-ENDPOINTS.md:10-16 |
| G2 窗口 | 未知会话 | 已合入 master | 早期 | FRONTEND-GATING-MATRIX（G2 端点前端门控） | 已停 | 已合 | 已合 | FRONTEND-GATING-MATRIX.md:1 |
| H 窗口 | 未知会话 | 已合入 master（f41ec6f） | d80020d 后 | f41ec6f 2026-08-07 | 已停 | 已合 | 已合 | M-AUDIT 提交史 |
| I 窗口 | 未知会话 | **已删 window-i-stub**；两笔 rebase 后推 master | f41ec6f | adfd29bc(I-1)/8e49d4b(I-2) 07:33:57Z | **已推完（推的 master CI 红，M-FIX6 修复中）** | 已合（rebase） | I 窗口推了，M-FIX6 接管修复 | ls-remote 历史 + commit message |
| M-FIX 线 | 审查方驱动 | fix/window-reconcile → master | 逐轮 | 1b66a2b(W3/W4) | 在跑 | 逐轮推 master | 本会话 | 各轮报告 |

## 已知未纳管风险
- **任何窗口都能直接 push master，无分支保护**：I 窗口未经评审 rebase 推 master（CI 红），H/D/E 窗口也曾直接推。master 无 PR 门禁、无「必须绿 CI 才可推」机制。
- 多套台账并行（.llm-matrix/ vs docs/findings vs docs/audit），真源不明。

## 推送秩序建议（V4(d) 一句话）
**master 只能由单一受控通道推送（审查方驱动的 M-FIX 线），其他窗口一律先推独立分支 + 评审后由该通道合并——因为无分支保护时任何窗口直接推都会产生「CI 红上 master」事故（I 窗口已验证）。**
