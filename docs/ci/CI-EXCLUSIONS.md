# CI 测试排除登记表（纪律 14）

> 目的：CI filter 里每一条排除都必须可审计——被排除的测试是谁、为什么排、依赖什么、
> 什么条件下恢复。防止「靠前缀误伤」「靠没执行推断通过」这类问题再犯。

| 排除项 | 测试数 | 排除理由 | 依赖什么外部资源 | 恢复条件 | 登记日期 |
|---|---|---|---|---|---|
| `!~SttE2ETests` | — | GB 级 ASR 模型 + 真实转写子进程，CI 无法供给 | 真实 ASR GGUF 模型（asr-engine/qwen_asr_gguf） | CI 提供模型缓存层 | 2026-08-07 |
| `!~BgeE2ETests`（前缀连带 BgeE2ETestsV2） | — | 真实 BGE 嵌入模型，未纳入版本库 | asr-engine/embedding/bge-small-zh-v1.5.onnx | CI 提供模型缓存层 | 2026-08-07 |
| `!~M2FourthRoundTests.Model_` | 7 | **M-FIX3 Y2 实测**：改名 asr-engine/embedding 后 5/7 红（ConcurrentEnsure/CorruptModelFile/CorruptVocab/ResidualTmpFile/ResetAfterHeal 依赖本机真实模型）；2/7 绿（MissingModel/DownloadInterrupted 测缺失路径不需真模型） | asr-engine/embedding/bge-small-zh-v1.5.onnx（5 个测试） | CI 提供模型缓存层；或拆分出 2 个不依赖模型的测试 | 2026-08-07 |
| `!~RealHttp` | — | Agent 真实 LLM HTTP 调用，需 API key / 网络 | 外部 LLM API | 提供 CI 测试 key | 2026-08-07 |

## 13 常数分解（M-FIX11 U1(c) trx 实测，M-FIX12 W5 登记）

CI filter 排除的 4 类共 **13 个用例**，其中 **2 个本身是跳过项**（`outcome="NotExecuted"`），
所以全量→filter 的换算恒为 **总数−13 / 通过−11 / 跳过−2**（M-FIX4 起每轮如此）：

| 排除类 | 用例数 | 其中 NotExecuted | trx 实测依据（full.trx grep testName） |
|---|---|---|---|
| `!~SttE2ETests` | 2 | **2** | SttE2ETests.E2E_MultiSpeaker / E2E_SingleSpeaker（[SttE2EFact] RUN_STT_E2E≠1） |
| `!~BgeE2ETests`（命中 BgeE2ETestsV2） | 1 | 0 | BgeE2ETestsV2.E2E_RealBge_SemanticSearch_HitsTargetChunk |
| `!~M2FourthRoundTests.Model_` | 7 | 0 | Model_ConcurrentEnsure / CorruptModelFile / MissingModel / CorruptVocab / ResidualTmpFile / DownloadInterrupted / ResetAfterHeal |
| `!~RealHttp` | 3 | 0 | AgentChatIntegrationTests.G1/G2_RealHttp_* + AgentSseIntegrationTests.H1_RealHttp_* |
| **合计** | **13** | **2** | — |

**子串命中风险（登记）**：CI filter 写的是 `BgeE2ETests`，真实类名是 **BgeE2ETestsV2**——靠子串命中；
`M2FourthRoundTests.Model_` 同样依赖**方法名前缀**（Model_*）。一旦有人改类名/方法名前缀（如
BgeE2ETestsV2 改名 BgeEmbeddingE2ETests、Model_* 方法去前缀），filter 会静默失效：
被排除的测试重新进入 CI 跑真实模型 → 必红，且四数口径立即变（13 常数破坏）。**改动任何 E2E 类名/
方法名前缀前，必须同步改 test.yml 的 --filter 与 CI-EXCLUSIONS.md，并重测两口径四数**（纪律，见 CONVENTIONS）。

## 历史更正记录

- **2026-08-07 M-FIX2 X4 错误**：曾推断「run 31096559390 Model_* 0 失败 = 全绿」→ 实际该 run backend job 在静态检查步骤即失败、dotnet test 未执行 →「0 失败」=「未执行」。M-FIX3 Y2 用本机破坏性实测（改名模型目录→5 红）纠正，Model_* 重新排除。
