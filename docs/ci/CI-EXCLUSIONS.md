# CI 测试排除登记表（纪律 14）

> 目的：CI filter 里每一条排除都必须可审计——被排除的测试是谁、为什么排、依赖什么、
> 什么条件下恢复。防止「靠前缀误伤」「靠没执行推断通过」这类问题再犯。

| 排除项 | 测试数 | 排除理由 | 依赖什么外部资源 | 恢复条件 | 登记日期 |
|---|---|---|---|---|---|
| `!~SttE2ETests` | — | GB 级 ASR 模型 + 真实转写子进程，CI 无法供给 | 真实 ASR GGUF 模型（asr-engine/qwen_asr_gguf） | CI 提供模型缓存层 | 2026-08-07 |
| `!~BgeE2ETests`（前缀连带 BgeE2ETestsV2） | — | 真实 BGE 嵌入模型，未纳入版本库 | asr-engine/embedding/bge-small-zh-v1.5.onnx | CI 提供模型缓存层 | 2026-08-07 |
| `!~M2FourthRoundTests.Model_` | 7 | **M-FIX3 Y2 实测**：改名 asr-engine/embedding 后 5/7 红（ConcurrentEnsure/CorruptModelFile/CorruptVocab/ResidualTmpFile/ResetAfterHeal 依赖本机真实模型）；2/7 绿（MissingModel/DownloadInterrupted 测缺失路径不需真模型） | asr-engine/embedding/bge-small-zh-v1.5.onnx（5 个测试） | CI 提供模型缓存层；或拆分出 2 个不依赖模型的测试 | 2026-08-07 |
| `!~RealHttp` | — | Agent 真实 LLM HTTP 调用，需 API key / 网络 | 外部 LLM API | 提供 CI 测试 key | 2026-08-07 |

## 历史更正记录

- **2026-08-07 M-FIX2 X4 错误**：曾推断「run 31096559390 Model_* 0 失败 = 全绿」→ 实际该 run backend job 在静态检查步骤即失败、dotnet test 未执行 →「0 失败」=「未执行」。M-FIX3 Y2 用本机破坏性实测（改名模型目录→5 红）纠正，Model_* 重新排除。
