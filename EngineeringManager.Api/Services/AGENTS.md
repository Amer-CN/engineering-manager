# EngineeringManager.Api/Services/ - C# 服务层（AI / STT / 知识库）

> 本目录职责：端点之外的后端服务实现——AI 助手会话与工具（AgentConversationService / AgentToolService）、LLM 供应商与模型路由（LlmProviderService / ModelRoutingService / LlmConfigResolver / IModelRouter / ILlmChatService）、向量与知识库（BgeEmbeddingService / IEmbeddingService / KnowledgeBaseService）、语音转写子系统（`Stt/` 全套：引擎选择/预处理/说话人分离/监控/互斥/安全检查）、应用更新（UpdateService）、查询安全校验（SafeQueryValidator）。

## 边界

- 服务通过 DI 注入给 Endpoints 使用；HTTP 参数校验与响应组装留在 `../Endpoints/`（见 [../Endpoints/AGENTS.md](../Endpoints/AGENTS.md)），服务层只做业务逻辑
- 接口（`IXxx.cs`）与实现分离：新增可替换能力（引擎/供应商/嵌入模型）先定义接口，再挂实现
- `Stt/` 是独立子系统：引擎经 `ISttEngine` + `SttEngineSelector` 选择，进程级互斥靠 `SttMutexGuard`，运行安全靠 `SttSafetyChecker`；改动任何一环先读同目录其余文件的协作关系

## 风险红线

- AI Agent 触达数据库的查询必须过 `SafeQueryValidator`，不得绕开它直接拼 SQL 给模型执行
- SQL 一律参数化 + 表名 `[]` 包裹（同全局后端规则）
- 文件/模型/日志路径一律走 `ApiConfig.ResolveDataPath()`，禁止硬编码 AppData；不得删除数据存储路径内文件
- 所有 catch 必须 `Console.Error.WriteLine` + 正确状态码；对外错误信息用 `ex.SanitizedMessage()`
- LLM/嵌入等外部服务的 key 走加密配置（DPAPI 模式，参照 OCR key 处理），禁止明文进源码或安装包

## 就近命令

```bash
cd EngineeringManager.Api && dotnet build     # 编译（0 错误 0 警告）
cd EngineeringManager.Api && dotnet run      # 启动（localhost:5048）
cd EngineeringManager.Tests && dotnet test   # 后端测试全绿
```

## 深链

- 后端质量规则 / Repository 与迁移规范 → [docs/CONVENTIONS.md](../../docs/CONVENTIONS.md)
- 数据铁律（ResolveDataPath）/ 鉴权与限流 → [docs/STACK-AND-ARCHITECTURE.md](../../docs/STACK-AND-ARCHITECTURE.md)
- 安全修复史（勿回退项）→ [docs/SECURITY-AUDIT.md](../../docs/SECURITY-AUDIT.md)
