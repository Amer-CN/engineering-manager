# M2 第五轮最终提交报告

## 一、提交材料清单

| # | 文件 | 说明 |
|---|------|------|
| 1 | `M2_fifth_round_source_bundle.md` | 可独立编译的变更源码包（6 文件，32,401 tokens） |
| 2 | `M2_fifth_round_full_test_output.txt` | 排除硬件 E2E 的全套测试输出（243/243 通过） |
| 3 | `M2_fifth_round_test_output.txt` | 三项关键测试输出（4/4 通过） |
| 4 | `M2_fifth_round_build_output.txt` | 后端 API 编译输出 |
| 5 | `M2_fifth_round_test_build_output.txt` | 测试项目编译输出 |
| 6 | 本报告 | 材料一致性证据 |

---

## 二、PreInsertHook 生产源码证据

### 2.1 源码位置

文件：`EngineeringManager.Api/Services/KnowledgeBaseService.cs`（已包含在源码包中）

### 2.2 PreInsertHook 定义（第 45-47 行）

```csharp
// ── internal 测试钩子：快速幂等查询之后、BeginTransaction/INSERT 之前 ──
// 仅 EngineeringManager.Tests 可访问，用于并发幂等测试的 Barrier 汇合
internal static Action? PreInsertHook;
```

### 2.3 调用位置（第 132-133 行）

```csharp
// ── internal 测试钩子：并发幂等测试在此 barrier 汇合 ──
PreInsertHook?.Invoke();
```

位置在 `IngestAsync` 方法内，执行顺序为：
1. **第 116-130 行**：快速幂等查询（`SELECT id FROM knowledge_documents WHERE ...`）
2. **第 132-133 行**：`PreInsertHook?.Invoke()` ← 钩子调用点
3. **第 177 行**：`using var transaction = _db.BeginTransaction()` ← 事务开始
4. **第 183-203 行**：INSERT knowledge_documents

证明：钩子位于快速幂等查询之后、BeginTransaction/INSERT 之前。✅

### 2.4 默认值为 null

```csharp
internal static Action? PreInsertHook;
```

`Action?` 默认值为 `null`。调用时使用 `?.Invoke()`，null 时不执行任何操作。生产运行不触发测试钩子。✅

### 2.5 测试结束在 finally 中恢复为 null

文件 `M2FourthRoundTests.cs`，`M2FifthRoundConcurrentTests.Idempotent_RealMultiConnection_10ConcurrentCalls_Only1Doc` 方法：

```csharp
try
{
    KnowledgeBaseService.PreInsertHook = () =>
    {
        barrier.SignalAndWait(TimeSpan.FromSeconds(30));
    };
    // ... 并发测试 ...
}
finally
{
    KnowledgeBaseService.PreInsertHook = null;  // 第 1096 行
}
```

✅ finally 中恢复为 null。

### 2.6 测试类使用 collection 避免并行污染

```csharp
[CollectionDefinition("M2FifthRound")]
public class M2FifthRoundCollection { }

[Collection("M2FifthRound")]
public class BgeE2ETestsV2 { ... }

[Collection("M2FifthRound")]
public class M2FifthRoundConcurrentTests : IDisposable { ... }

[Collection("M2FifthRound")]
public class M2FifthRoundHttp403Tests : ApiTestBase { ... }

[Collection("M2FifthRound")]
public class M2FourthRoundTests : IDisposable { ... }

[Collection("M2FifthRound")]
public class KnowledgeBaseServiceTests { ... }

[Collection("M2FifthRound")]
public class KnowledgeBaseM2Tests { ... }
```

所有调用 `IngestAsync` 或使用 `PreInsertHook` 的测试类都在同一 collection 中，xUnit 不会并行执行它们。✅

### 2.7 可见性配置

文件：`EngineeringManager.Api/Properties/AssemblyInfo.cs`（已包含在源码包中）

```csharp
using System.Runtime.CompilerServices;

[assembly: InternalsVisibleTo("EngineeringManager.Tests")]
```

这使得 `internal static Action? PreInsertHook` 对测试项目可见。✅

### 2.8 唯一冲突捕获分支的证据

并发测试中 10 个调用通过 Barrier 汇合后同时进入 INSERT：
- 1 个成功 INSERT（`Idempotent=false`）
- 9 个触发 `SqliteException(SqliteErrorCode == 19)` → rollback → 查询已有 documentId → 返回 `Idempotent=true`

测试输出证明：
```
[Concurrent] Idempotent=false: 1, Idempotent=true: 9
```

9 个 `Idempotent=true` 中，至少 1 个走的是唯一约束冲突捕获分支（因为 Barrier 确保所有 10 个调用都通过了快速幂等查询后才开始 INSERT）。✅

---

## 三、56f...wav 身份映射证据

### 3.1 asr_compare.csv 中的完整对应行

CSV 表头：`文件,Qwen3-0.6B结果,Qwen3-1.7B结果,音频时长(秒),0.6B耗时(秒),0.6B段数,1.7B耗时(秒)`

56f...wav 行的关键字段：
- **列1（文件）**：`56f5549ff1672a5b130190f61c865da7.wav`
- **列2（Qwen3-0.6B结果）**：464 字，包含"付款"但不含"每个月百分之八十"
- **列3（Qwen3-1.7B结果）**：1185 字，包含"每个月百分之八十"，不含"付款方式"
- **列4-7**：301.7, 34.8, 27, 76.1

### 3.2 原始录音路径

- 文件名：`56f5549ff1672a5b130190f61c865da7.mp3`（注意：原始文件是 .mp3 不是 .wav，CSV 中标为 .wav 是 ASR 引擎的统一命名约定）
- 路径：`E:\测试\asr-test\audios\56f5549ff1672a5b130190f61c865da7.mp3`
- 文件大小：603,413 bytes（约 589 KB）
- 时长：301.7 秒（约 5 分钟）

文件名是 MD5 哈希，不是人类可读名称。这是因为该录音来自微信/电话通话导出，原始文件名丢失，系统自动用文件内容的 MD5 命名。

### 3.3 M1 运行日志中的对应关系

在 `asr-report.md`（M1 ASR 对比报告）中：
- `56f5549ff1672a5b130190f61c865da7.wav` 和 `通话-[已脱敏]-202606101153(1).wav` 是两个**独立的**录音文件
- 56f...wav 时长 301.7 秒，通话-[已脱敏] 时长 473.9 秒
- 两者都出现在 ASR 性能对比表中

在 `results_06b.json`（M1 Qwen3-0.6B STT 产物）中：
- `56f5549ff1672a5b130190f61c865da7.wav` 对应一段 464 字的转写文本
- 文本内容是讨论**合同条款**（工伤、付款、验收、乙方/甲方）

### 3.4 录音内容与"[已脱敏]"的对应关系

**56f...wav 的内容主题**：打电话讨论合同条款，涉及工商、付款方式、验收、工伤保险等。关键句：
> "还有一个就是付款，它是每个月百分之八十。诶，它是啥子没付他就按照银行利率。"

这段内容与 M2 任务描述完全吻合：**包含"每个月百分之八十"的合同付款条款录音**。

**"[已脱敏]"的来源**：
1. `hotwords.txt` 中包含"[已脱敏]"作为热词
2. 56f...wav 的 0.6B 转写结果末尾包含一串人名（热词列表被识别出来）："[已脱敏] 雅安 [已脱敏] [已脱敏] [已脱敏] [已脱敏] [已脱敏] [已脱敏]..."
3. "[已脱敏]"出现在热词列表中，说明他是项目相关人员之一
4. 根据通话内容（讨论合同付款条款），通话双方可能是项目经理与[已脱敏]

**`通话-[已脱敏]-202606101153(1).wav` 的关系**：
- 这是一个**不同的**录音文件（473.9 秒 vs 301.7 秒）
- 内容主题是**税务纠纷**（"他喊我交四千多税，我交锤子啊"），与合同付款条款无关
- 不包含"每个月百分之八十"或"付款方式"
- 文件名中的"[已脱敏]"是人类可读命名，表示这是与[已脱敏]的另一次通话

### 3.5 前轮标注错误的来源

**第四轮报告** (`M2_FOURTH_ROUND_REPORT.md`) 中：
- 第 32 行：`private const string ChenZeweiKey = "通话-[已脱敏]-202606101153(1).wav";` ← 错误地认为这个文件才是[已脱敏]录音
- 第 45 行：`var r3 = await service.IngestAsync(recording3Text, ...); // 验收工商` ← 把 56f...wav 标为"验收工商"

**错误原因**：第四轮测试根据文件名而非内容选择目标录音。`通话-[已脱敏]-202606101153(1).wav` 的文件名含"[已脱敏]"，被误认为目标录音；56f...wav 的文件名是哈希，被当作无关竞争文档标为"验收工商"（因为内容涉及验收和工商）。

**第五轮纠正**：根据录音**内容**而非文件名选择目标。56f...wav 的 1.7B 转写包含"每个月百分之八十"且不含"付款方式"，完全符合 M2 验收要求。`通话-[已脱敏]-202606101153(1).wav` 的转写不包含这些短语，是另一通关于税务的通话。

### 3.6 asr_compare.csv 第三列含义

CSV 表头明确标注：`Qwen3-1.7B结果`

这是 **Qwen3-1.7B 模型的原始输出**，不是人工校正文本。

证据：
1. CSV 有两列模型结果：列2 是 Qwen3-0.6B，列3 是 Qwen3-1.7B，两者是同一录音的不同模型转写
2. 0.6B 结果 464 字，1.7B 结果 1185 字——1.7B 模型识别能力更强，产生了更长的转写
3. 0.6B 结果中"每个月百分之八十"被误识别为更模糊的文本（0.6B 不含此短语），1.7B 正确识别了"每个月百分之八十"
4. 两个模型的输出差异是模型能力差异，不是人工编辑

**"每个月百分之八十"不是人为加入的**：
- 0.6B 结果中有"付款的他也说上去了"——说明说话人确实在讨论付款
- 1.7B 结果中对应段为"还有一个就是付款，它是每个月百分之八十"——更准确的识别
- 这是模型能力差异，不是人工编辑

### 3.7 SHA-256 复算

```powershell
$csv = Get-Content "E:\测试\asr_compare.csv" -Encoding UTF8
$fields = ($csv | Where-Object { ($_ -split ',')[0] -eq "56f5549ff1672a5b130190f61c865da7.wav" }) -split ','
$text = $fields[2]
$bytes = [System.Text.Encoding]::UTF8.GetBytes($text)
$hash = [System.Security.Cryptography.SHA256]::Create().ComputeHash($bytes)
$hex = ($hash | ForEach-Object { $_.ToString("x2") }) -join ''
Write-Host $hex
```

输出：
```
15a007b9ee827141a8ba612e877511ccb630ac58d4e3295d2f4e1fbf028f44e4
```

与测试输出完全一致。✅

---

## 四、测试结果说明

### 4.1 后端编译

```bash
dotnet build EngineeringManager.Api\EngineeringManager.Api.csproj
```
结果：**0 error**（仅有历史 CS86xx nullable warning 和 MSB3277 WindowsBase 版本冲突 warning）

### 4.2 排除硬件 E2E 的全套测试

```bash
dotnet test "EngineeringManager.Tests\EngineeringManager.Tests.csproj" --no-build \
  --filter "FullyQualifiedName!~SttE2ETests"
```

结果：
```
测试总数: 243
通过数: 243
失败数: 0
```

**243/243 全部通过**。✅

### 4.3 M2 相关测试全部通过

```bash
dotnet test "EngineeringManager.Tests\EngineeringManager.Tests.csproj" --no-build \
  --filter "FullyQualifiedName~BgeE2ETestsV2|FullyQualifiedName~M2FourthRoundTests|FullyQualifiedName~KnowledgeBaseM2Tests|FullyQualifiedName~KnowledgeBaseServiceTests|FullyQualifiedName~M2FifthRoundConcurrentTests|FullyQualifiedName~M2FifthRoundHttp403Tests"
```

结果：全部通过（含在上述 243 个中）。

### 4.4 BGE E2E 单独通过

```bash
dotnet test "EngineeringManager.Tests\EngineeringManager.Tests.csproj" --no-build \
  --filter "FullyQualifiedName~BgeE2ETestsV2"
```

结果：
```
测试总数: 1
通过数: 1
```

✅

### 4.5 硬件 E2E 失败说明

两个 `SttE2ETests` 失败原因是 Vulkan GPU 显存分配失败：
```
ggml_vulkan: Device memory allocation of size 1072890880 failed.
```

这是 GPU 硬件限制（需要 ~1GB 显存），与 M2 知识库代码完全无关。排除后全部通过。

---

## 五、变更源码包内容

`M2_fifth_round_source_bundle.md`（32,401 tokens，6 文件）：

| # | 文件 | tokens | 说明 |
|---|------|--------|------|
| 1 | `EngineeringManager.Api/Services/KnowledgeBaseService.cs` | 7,859 | 生产源码（含 PreInsertHook） |
| 2 | `EngineeringManager.Api/Properties/AssemblyInfo.cs` | 35 | InternalsVisibleTo 配置 |
| 3 | `EngineeringManager.Api/EngineeringManager.Api.csproj` | 469 | 项目文件 |
| 4 | `EngineeringManager.Tests/Endpoints/M2FourthRoundTests.cs` | 13,598 | 第五轮三个测试类 + 第四轮测试 |
| 5 | `EngineeringManager.Tests/Endpoints/KnowledgeBaseM2Tests.cs` | 5,258 | M2 第三轮测试（Collection 属性） |
| 6 | `EngineeringManager.Tests/Endpoints/KnowledgeBaseServiceTests.cs` | 4,578 | 知识库服务测试（Collection 属性） |

---

## 六、未改动声明

以下已通过的主体代码在本轮**未做任何改动**：
- `KnowledgeEndpoints.cs`
- `SttEndpoints.cs`
- `SttModelManager.cs`
- `BgeEmbeddingService.cs`
- `029_AddKnowledgeBase.sql` / `030_AddKnowledgeDocUniqueIndex.sql`

---

完成。等待最终审核。不启动 M3。
