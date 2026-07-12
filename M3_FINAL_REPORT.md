# M3 最终报告：Agent 知识库检索工具（整改版）

> 版本：M3 整改提交
> 日期：2026-07-11
> 状态：等待复审
> Git HEAD: fba841feea973aea180b0a98c8a3d69db7d8b9b5
> 审查材料：`M3_source_bundle.md`（含全部改动文件完整源码 + SHA-256 + 测试输出）

---

## 一、改动文件清单

| # | 文件 | 改动类型 | 说明 |
|---|------|---------|------|
| 1 | `EngineeringManager.Api/Services/ILlmChatService.cs` | **新增** | LLM 聊天抽象接口（ChatAsync + ChatStreamAsync） |
| 2 | `EngineeringManager.Api/Services/LlmProviderService.cs` | 修改 | 实现 ILlmChatService 接口 |
| 3 | `EngineeringManager.Api/Endpoints/AgentEndpoints.cs` | 修改 | chat/stream 端点注入 ILlmChatService |
| 4 | `EngineeringManager.Api/Program.cs` | 修改 | DI 注册 ILlmChatService → LlmProviderService |
| 5 | `EngineeringManager.Api/Services/AgentToolService.cs` | 修改 | ExecuteSearchKnowledgeBase 参数错误改为抛异常（外层 Success=false） |
| 6 | `EngineeringManager.Api/Common.cs` | 修改 | knowledge:read 权限（admin + manager） |
| 7 | `EngineeringManager.Tests/Common/FakeLlmChatService.cs` | **新增** | 可控 LLM 测试替身 |
| 8 | `EngineeringManager.Tests/Common/AgentIntegrationTestBase.cs` | **新增** | Agent HTTP 集成测试基类 |
| 9 | `EngineeringManager.Tests/Common/ApiTestBase.cs` | 修改 | 添加 ConfigureExtraServices 虚方法 |
| 10 | `EngineeringManager.Tests/Endpoints/AgentKnowledgeToolTests.cs` | 重写 | 28 个测试（25 单元 + 3 真实 HTTP） |

---

## 二、本轮整改要点

### 2.1 C3/C4 使用实际项目 ID

- C3：`projectId = checked((int)projectBId)` — 使用实际创建的 projectBId
- C4：`projectId = checked((int)projectAId)` — 使用实际创建的 projectAId
- 断言未授权文档的标题、documentId 不出现在结果中

### 2.2 统一参数错误状态

- ExecuteSearchKnowledgeBase 参数错误（query 缺失/空白、projectId 非正数/溢出）改为 `throw new InvalidOperationException`
- 由 ExecuteToolAsync 现有 catch 捕获
- 返回 `ToolCallResult.Success = false, Result = null, Error = Common.Sanitize(...)`
- 消除双层 success 冲突

### 2.3 真实 /api/agent/chat 集成测试

- 提取 `ILlmChatService` 接口（仅 ChatAsync + ChatStreamAsync）
- `LlmProviderService` 实现该接口
- `AgentEndpoints` chat/stream 端点注入 `ILlmChatService`
- `FakeLlmChatService` 作为测试替身，记录每轮请求
- 通过真实 HTTP `POST /api/agent/chat` 完成完整 tool loop
- 不手工调用 ExecuteToolAsync，不手工保存消息

### 2.4 真实 SSE 回归测试

- 通过真实 HTTP `POST /api/agent/chat/stream` 请求
- 解析实际 SSE 事件流（conversation_id / tool / content / done）

---

## 三、测试清单（28 个）

| # | 测试名 | 类别 | 说明 |
|---|--------|------|------|
| A1 | A1_Admin_GetAvailableTools_Contains_SearchKnowledgeBase | 权限 | admin 工具列表包含 |
| A2 | A2_Manager_GetAvailableTools_Contains_SearchKnowledgeBase | 权限 | manager 包含 |
| A3 | A3_Accountant_GetAvailableTools_DoesNotContain | 权限 | accountant 不包含 |
| A4 | A4_Worker_GetAvailableTools_DoesNotContain | 权限 | worker 不包含 |
| A5 | A5_Worker_ForgeCall_Returns_PermissionDenied | 权限 | worker 伪造调用被拦截 |
| A6 | A6_Admin_TotalToolCount_Is_15 | 权限 | 工具总数 = 15 |
| A7 | A7_Schema_QueryIsRequired_TopK_ProjectIdOptional | 权限 | query required |
| B1 | B1_QueryMissing_OuterSuccessFalse | 参数 | query 缺失 → 外层 Success=false |
| B2 | B2_QueryBlank_OuterSuccessFalse | 参数 | query 空白 → 外层 Success=false |
| B3 | B3_TopK_Default_Is_5 | 参数 | topK 默认 5 |
| B4 | B4_TopK_Zero_ClampedTo_1 | 参数 | topK=0 clamp 1 |
| B5 | B5_TopK_Over10_ClampedTo_10 | 参数 | topK=100 clamp 10 |
| B6 | B6_ProjectId_Negative_OuterSuccessFalse | 参数 | projectId=-1 → 外层失败 |
| B7 | B7_ProjectId_Overflow_OuterSuccessFalse | 参数 | projectId 溢出 → 外层失败 |
| C1 | C1_User_CanOnlySeeOwnDocuments | 数据范围 | 用户隔离 |
| C2 | C2_User3_WithProjectAuth_OnlySeesAuthorizedProject | 数据范围 | 项目授权 |
| C3 | C3_User3_SpecifyUnauthorizedProject_Returns_0 | 数据范围 | **使用实际 projectBId** |
| C4 | C4_Admin_SpecifyProject_OnlyReturnsThatProject | 数据范围 | **使用实际 projectAId** |
| C5 | C5_Admin_SeesAllDocuments | 数据范围 | admin 全可见 |
| D1 | D1_SemanticHit_BudgetQuery_Hits_ThirtyThousand | 语义命中 | "预算"→"三十万" |
| E1 | E1_PromptInjection_ReturnedAsPlainText | 安全 | 恶意指令作为普通文本 |
| E2 | E2_SystemPrompt_ContainsKnowledgeSecurityWarning | 安全 | 系统提示含安全声明 |
| E3 | E3_SystemPrompt_ContainsSearchKnowledgeBaseGuidance | 安全 | 系统提示含工具指引 |
| F1 | F1_NoHits_StillReturnsSuccess | 边界 | 空结果 success=true |
| F2 | F2_ReturnStructure_DoesNotContainEmbeddingBlob | 边界 | 不含 embedding |
| G1 | G1_RealHttp_Chat_ToolLoop_SemanticHit | **真实 HTTP** | 完整 tool loop + 语义命中 + 来源引用 |
| G2 | G2_RealHttp_PromptInjection_NoExtraToolCall | **真实 HTTP** | prompt injection 不触发额外工具 |
| H1 | H1_RealHttp_SSE_Stream_ContainsAllEvents | **真实 SSE** | SSE 事件流完整 |

---

## 四、编译和测试结果

### 后端编译（dotnet clean → dotnet build）

```
已成功生成。14 个警告 0 个错误 已用时间 00:00:02.08
```

### 全套测试（dotnet test --no-build）

```
已通过! - 失败: 0，通过: 271，已跳过: 0，总计: 271，持续时间: 1 m
```

### 前端构建

```
✓ 3184 modules transformed.
✓ built in 6.81s
```

### TypeScript 类型检查

```
npx tsc --noEmit → 0 error
```

---

## 五、M3 复审验收线对照

| # | 验收标准 | 状态 | 证据 |
|---|---------|------|------|
| 1 | C3 使用 projectBId | ✅ | `projectId = checked((int)projectBId)` |
| 2 | C4 使用 projectAId | ✅ | `projectId = checked((int)projectAId)` |
| 3 | 参数错误外层 Success=false | ✅ | B1/B2/B6/B7 断言 `result.Success=false, result.Result=null` |
| 4 | /api/agent/chat 真正完成两轮 LLM + tool loop | ✅ | G1 通过真实 HTTP + FakeLlm 记录两轮请求 |
| 5 | "预算"语义命中"三十万" | ✅ | G1 中 FakeLlm 第二轮收到 tool result 含"三十万" |
| 6 | 最终 HTTP 回答包含正确金额和来源 | ✅ | G1 断言 content 含"三十万"和"[已脱敏]项目沟通录音" |
| 7 | prompt injection 未触发额外工具 | ✅ | G2 断言 toolNames 只含 searchKnowledgeBase |
| 8 | /api/agent/chat/stream 真实 SSE 回归通过 | ✅ | H1 解析实际 SSE 事件流 |
| 9 | 原有 14 个工具不受影响 | ✅ | A6 断言 15 个工具全在 |
| 10 | 编译 0 error | ✅ | dotnet clean → build → 0 error |
| 11 | 排除已知硬件 STT E2E 后全套测试通过 | ✅ | 271/271 通过 |

---

## 六、架构合规性确认

| 约束 | 遵守情况 |
|------|---------|
| searchKnowledgeBase 工具注册 | ✅ 保留 |
| knowledge:read 权限策略 | ✅ 保留 |
| admin/manager 允许，accountant/worker 禁止 | ✅ 保留 |
| AgentToolService 注入 IEmbeddingService | ✅ 保留 |
| 不缓存 IDbConnection | ✅ 保留 |
| 调用 KnowledgeBaseService.SearchAsync | ✅ 保留 |
| 不开放 knowledge 表给 runSafeQuery | ✅ 保留 |
| 结构化来源返回 | ✅ 保留 |
| BuildSystemPrompt 知识库指引和不可信数据提示 | ✅ 保留 |
| ILlmChatService 是最小接口（仅 2 方法） | ✅ 新增 |
| 不在测试中复制 AgentEndpoints tool loop | ✅ 使用真实 HTTP |
| 不启动 M4 | ✅ 无前端页面改动 |

---

**M3 整改完成，等待复审。不启动 M4。**
