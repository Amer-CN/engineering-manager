# src/services/ - 前端 API 桥接与外设服务域

> 本目录职责：前端与后端/外部能力的全部通信层——`tauri-bridge.ts`(统一 API 接口，组件唯一入口) / `api-adapter.ts`(环境检测+API 选择) / `api-client.ts`(HTTP 实现，含 PII ?unmask=true 自动追加) / `fileService.ts`(文件上传下载) / `ocr/`(9 种 OCR 识别客户端) / `agent-client.ts` `knowledge-client.ts` `stt-client.ts` `update-client.ts`(AI 助手/知识库/语音/更新)。

## 边界

- 调用链固定：组件/hooks → `getAPI()`（tauri-bridge）→ api-adapter → api-client → C# 端点。**组件禁止直接 fetch 或直接 import api-client**
- 服务端数据的缓存/状态管理不在这里做：交给 `src/hooks/data/` 的 React Query（见 [src/hooks/AGENTS.md](../hooks/AGENTS.md)）
- `ocr/` 每种票据一个文件（idCard/invoice/bankCard/...），共享 `types.ts` + `utils.ts` + `config.ts`；新增识别类型照此拆分
- 文件操作走 `fileService.ts` → C# `FileEndpoints.cs` → `<dataPath>/uploads/`，前端不自行拼存储路径

## 风险红线

- api-client 的 PII 端点 GET 会按 mask toggle 自动追加 `?unmask=true`——新增 PII 端点时必须纳入该检测清单，否则脱敏开关对它失效
- 认证 token 的存取归 `AuthContext`，服务层不得私自读写 localStorage 绕过
- 流式接口（agent/stt）注意中断与超时处理，参考 `__tests__/agent-client.stream.test.ts` 的既有行为契约
- OCR key 等敏感配置由后端管理（DPAPI），前端 `ocr/config.ts` 只做非敏感参数

## 就近命令

```bash
npx tsc --noEmit --pretty false    # 类型检查（0 error）
npx vitest run                     # 测试（api-client / agent-client 套件必须全绿）
npx vite build                     # 构建验证
```

## 深链

- 架构调用链与关键文件 → [docs/STACK-AND-ARCHITECTURE.md](../../docs/STACK-AND-ARCHITECTURE.md)「架构 / 关键文件」
- OCR 9 种识别与文件存储系统 → [docs/STACK-AND-ARCHITECTURE.md](../../docs/STACK-AND-ARCHITECTURE.md) + [docs/MODULES.md](../../docs/MODULES.md)
- PII Mask 演进与 ?unmask=true 约定 → [docs/SECURITY-AUDIT.md](../../docs/SECURITY-AUDIT.md)
- 对端 C# 端点规则 → [EngineeringManager.Api/Endpoints/AGENTS.md](../../EngineeringManager.Api/Endpoints/AGENTS.md)
