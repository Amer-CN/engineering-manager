# WINDOW-LEDGER.md — 并行窗口台账（M-FIX6 V4 重写）

> 本表核对时刻：2026-08-07 16:10 (UTC+8，精确到分)
> 规则：每轮必须更新「master 当前 tip」行；窗口至少列 D/E/H/I/M-FIX 线。

| 本表写入时 tip | `c6aa5e992e4e97bc3d62bf9fd6cad3a5b42ccf20`（PR #9 merge） |
| 本表核对时刻 | 2026-08-07 20:40 (UTC+8) |
| tip 归属窗口 | M 窗口（PR #9 由 owner 网页端合入） |
| tip 推送时刻 | 2026-08-07 10:37:37Z |

> 本字段写下即可能过期，任何判定以实时 git ls-remote 为准。

| 窗口名 | 归谁 | 当前分支 | 分叉基线 | 最后一笔 SHA+时间 | 是否还在跑 | 合并顺序 | 谁负责合 | 证据出处 |
|---|---|---|---|---|---|---|---|---|
| C 窗口 | 未知会话 | 已合入 master | 早期 | WRITE-AUTH-MATRIX（窗口 C 产出） | 已停 | 已合 | 已合 | .llm-matrix/findings/WRITE-AUTH-MATRIX.md:1 |
| D 窗口 | 未知会话 | 已合入 master | 早期 | STUB-ENDPOINTS「窗口 D 积压记档」 | 已停 | 已合 | 已合 | .llm-matrix/findings/STUB-ENDPOINTS.md:10 |
| E 窗口 | 未知会话 | 已合入 master | 早期 | E-1..E-4（考勤 STUB 转本体，713 通过） | 已停 | 已合 | 已合 | STUB-ENDPOINTS.md:10-16 |
| G2 窗口 | 未知会话 | 已合入 master | 早期 | FRONTEND-GATING-MATRIX（G2 端点前端门控） | 已停 | 已合 | 已合 | FRONTEND-GATING-MATRIX.md:1 |
| H 窗口 | 未知会话 | 已合入 master（f41ec6f） | d80020d 后 | f41ec6f 2026-08-07 | 已停 | 已合 | 已合 | M-AUDIT 提交史 |
| I 窗口 | 未知会话 | **已删 window-i-stub**；两笔 rebase 后推 master | f41ec6f | adfd29bc(I-1)/8e49d4b(I-2) 07:33:57Z | **已推完（推的 master CI 红，M-FIX6 修复中）** | 已合（rebase） | I 窗口推了，M-FIX6 接管修复 | ls-remote 历史 + commit message |
| J 窗口 | 未知会话 | 已合入 master | adfd29b | 75d79fc(J-1)/49a76f3(J-2)/fb51c42(J-3)/11a9c02(J-4) | 已合 | 已合 | 已合 | master git log（J-4 报门禁5=167 系**旧基线作废**，实测 171） |
| M 窗口 | 未知会话 | feat/knowledge-3d-carousel（PR #9） | 25b823e（M-FIX6） | 1f4e0440(09:20:11Z)+8fa86e7b(041) | 已合（PR #9 网页端合并 c6aa5e99 10:37:37Z） | 已合 | owner 网页端 | PR #9 diff |
| K 窗口 | 未知会话 | 已合入 master | 11a9c02（J-4） | 8fdcffa(K-1)/6c7890b(K-2)/ad4ce22(K-3)，**直推非 rebase** | 已合（master tip=ad4ce22） | 已合 | 直推 master | master git log |
| N 窗口 | 未知会话 | 已合入 master | ad4ce22（K-3） | 50ee395，**1 笔直推** | 已合（master tip=50ee395） | 已合 | 直推 master | master git log（N 窗口只修 API 侧 CS8619，**Tests 侧 CS8604 漏修 → master CI 仍红**，G67；PR #10 合并后 G67 闭环，届时回填合并后 master SHA） |
| M-FIX 线 | 审查方驱动 | fix/pr9-reconcile → master | 逐轮 | 25b823e(M-FIX6) | 在跑 | 逐轮推 master | 本会话 | 各轮报告 |

## K 窗口数字核实（M-FIX9 W2 订正 M-FIX8 错误结论）
- K-2 验收自报「dotnet test 859 过 / 3 跳过 / 862 总计、门禁5=171」。
- **859/3/862 是真值**（M-FIX8 曾误判「假绿」，W2 clean 实测推翻）：
  - ad4ce22 不带 -warnaserror（K/L 环境）clean 全量 = **862 总 / 859 过 / 3 跳过**
  - 167f03a（T1 已修 CS8619/CS8604）带 -warnaserror clean 全量 = **862 / 859 / 3**
  - 两环境同数 → 862 稳定真值。编译修复（T1）不改变用例总数 ✓
  - 跳过恒 3：M4ThirdRound.UploadAudio_CancelledMidStream（[Fact(Skip=)]）+ SttE2ETests
    E2E_MultiSpeaker/E2E_SingleSpeaker（[SttE2EFact] RUN_STT_E2E≠1）
- **M-FIX8 报的 848/1/849 是带 --filter 的口径数，与无 filter 全量 862 的差额 = 13 是 CI filter 口径常数**：
  全量（862）含 4 类被 CI 的 --filter 排除的用例（SttE2ETests / BgeE2ETestsV2 / M2FourthRoundTests.Model_ /
  RealHttp），自 M-FIX4 起每轮恒为 13（M-FIX4: 833 vs 820 即同一口径），跳过 3→1 是因为
  4 类被排除的用例里有 2 个 SttE2E 本身是跳过项（不算进 filter 后的跳过数）。**不是错误测量，
  是两个口径不许混着比**。fix/mfix9 tip 无 filter 全量 = **868 / 865 / 3**（+6 = M-FIX8 T2 四例 + T4(e) 两例）；
  带 CI 同款 --filter 的口径 = **855 总 / 854 过 / 1 跳过**（推算值；M-FIX11 U2 已实测回填，见下）。
- **M-FIX11 U1/U2 实测钉死「13」常数**（fix11 树，M2=50ee395 编译失败无法测，用 fix11 等价验证）：
  - U1(c) 4 类排除项计数：SttE2ETests 2（NotExecuted 2）+ BgeE2ETestsV2 1 + M2FourthRoundTests.Model_ 7 + RealHttp 3 = **13**，其中 NotExecuted **2**。
  - U2 两口径：全量 **869 / 866 / 3**，CI filter **856 / 855 / 1**。
  - 三项闭合：总数 869−13=856 ✓；通过 866−11=855 ✓；跳过 3−2=1 ✓。
  - **M-FIX8 的 848/1/849 与 852/1/853 均为 filter 口径真值**，分别对应全量 862 与 866：
    862−13=849 / 859−11=848 / 3−2=1；866−13=853 / 863−11=852 / 3−2=1。
    审查方 M-FIX8/M-FIX9 判其「作废」系误判，已于 M-FIX11 撤回（审查方第 29 次撤回记录）。
- 门禁5=171 正确（137 合规 / 34 豁免），K 三笔「后端端点零改动」成立（K-1/K-2 纯前端）。171 相对 I 窗口末 170 的 +1：PR#9 知识库端点（POST/PUT/DELETE folders + PUT documents = +4）净增，J-4 删 3 个 501 端点（MapPost STUB）−3，170+4−3=171。**J-4 报 167 是错误基线（漏算 PR#9 已合入的 +4，只算了 −3），作废**。

## M 窗口占用（U5 记录）
- 占用迁移号 039/040/041（AddKnowledgeFolders/AddKnowledgeDocumentsSoftDelete/AppendKnowledgeVoiceCodes）→ R9 roles 迁移改 042。
- 自验仅「dotnet build + tsc + knowledge/voice 116 用例全绿」——没跑全量/vitest/check:backend（master CI 31170831393 实测红：KnowledgeFolderEndpoints.cs:41 CS8619）。
- 删除两个前端测试文件（FolderStack3D.test.tsx −296、drawingStackView.test.tsx −89）。

## 窗口发现方法（U5(c)）
不得按字母 A..I 枚举——必须 list_branches 全量 + PR 列表全量。
**M 窗口就是漏在按字母枚举上**（不带字母）。

## 推送秩序（U5(d)，已决）
master 走 PR + required status checks + 禁止绕过（仓库 owner 已被要求开启分支保护）。
若开启后直推被拒：推分支 → 生成 compare 链接 → owner 网页合并。
compare 模板：https://github.com/Amer-CN/engineering-manager/compare/master...<分支名>?expand=1

## 已知未纳管风险
- **任何窗口都能直接 push master，无分支保护**：I 窗口未经评审 rebase 推 master（CI 红），H/D/E 窗口也曾直接推。master 无 PR 门禁、无「必须绿 CI 才可推」机制。
- 多套台账并行（.llm-matrix/ vs docs/findings vs docs/audit），真源不明。

## 推送秩序建议（V4(d) 一句话）
**master 只能由单一受控通道推送（审查方驱动的 M-FIX 线），其他窗口一律先推独立分支 + 评审后由该通道合并——因为无分支保护时任何窗口直接推都会产生「CI 红上 master」事故（I 窗口已验证）。**
