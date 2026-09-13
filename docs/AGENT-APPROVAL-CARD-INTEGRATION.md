# Agent 确认执行前端接口文档（Approval Card 后端对接指南）

> 状态：**后端已对接（2026-09-06）**——循环拦截 + resolve 端点已落地；首个写工具 markInvoicesReceived。
> 用途：实现「AI 执行动作前需用户确认」功能的对接说明书。读完即可开工，不需要读组件源码。

## 1. 产品背景与交互形态

Agent 从只读顾问升级为可执行助手。安全原则：**查询/审查可自动执行；修改数据的动作必须先弹确认卡，用户点选后才能执行**。

交互流：

```
后端在 assistant 消息上携带 approval 数据
        ↓
前端在消息流里渲染确认卡（标题/正文/置信度表/主按钮/其他选项抽屉）
        ↓
用户点选一个选项
        ↓
前端回调 handleApprovalResolve（当前仅 console.info —— 后端对接的唯一改造点）
        ↓
后端收到用户选择 → 执行对应动作 → 回填已决信息 → 前端显示已决态（绿✓）
```

## 2. 数据契约（真源：src/types/agent.ts）

后端返回的 assistant 消息对象上追加可选字段 `approval`。相关类型定义（TS，后端按此对齐字段名与语义）：

```ts
/** 确认卡选项 — option.key 是后端执行动作的锚点 */
interface ApprovalOption {
  key: string                // 选项标识（后端执行动作的锚点，如 'confirm' / 'alternate' / 'cancel'）
  label: string              // 显示名（主选项兼作主按钮文案，如「确认执行」）
  short?: string             // 抽屉里的一行描述（如「改用批量方式」）
  signal?: 0 | 1 | 2 | 3     // 置信度档位（渲染 3 格竖条 meter；0=无信号，3=满格）
  signalLabel?: string       // 置信度文案（如「高置信」「需复核」）
  tone?: 'success' | 'warning' | 'danger' | 'info' | null  // 置信度语义色
  primary?: boolean          // 主选项（footer 实底主按钮）；缺省时第一个选项为主
}

/** 确认请求 — AgentMessage.approval 的序列化形态 */
interface ApprovalRequest {
  requestId: string          // 本轮确认请求的唯一 ID（后端协议对账用）
  title: string              // 标题（如「是否将这 3 张发票标记为已收齐？」）
  body?: string               // 行动详情正文（Markdown；前端经 MarkdownRenderer 渲染）
  options: ApprovalOption[]  // 选项（≥1）
  resolution?: ApprovalResolution  // 已决信息（历史回放用；后端回填后前端显示已决态）
}

/** 用户点选后的回传结构 */
interface ApprovalResolution {
  requestId: string
  optionKey: string
  resolvedAt: string         // ISO 字符串
}

// AgentMessage 上的挂载点（追加的可选字段，不影响既有消息）：
interface AgentMessage {
  // ...既有字段...
  approval?: ApprovalRequest
}
```

## 3. 后端要做的事（按序）

1. **SSE/REST 协议**：agent 回复里需要用户确认时（如 LLM 决定执行修改动作），在 assistant 消息 JSON 上加 `approval` 字段（形状见上）。`requestId` 用 `approval_{conversationId}_{guid}` 全局唯一值。【已落地：非流式响应 `message.approval`；SSE 在 `done` 载荷捎带 `approval`，前端挂到最终 assistant 消息。后端内部扩展字段：`approval` JSON 额外携带 `action: { tool, args }`（建卡时绑定的待执行工具与原样参数，resolve 时以此对账执行）；该字段后端内部使用，前端 TS 类型未声明、反序列化自然忽略，第 2 节契约不变】
2. **前端回传接收**：前端点选后经 `src/services/agent-client.ts` 的 `resolveAgentApproval`（MessageBubble 的 handleApprovalResolve 调用，conversationId 由消息携带）回传 `POST /api/agent/conversations/{id}/approval/resolve`，body = ApprovalResolution。【已落地】
3. **执行与回填**：后端按 `requestId` 找到待确认请求、校验 `optionKey`、执行对应动作（**只执行用户确认过的 option.key，绝不默认执行**），然后把结果写回消息（更新 `approval.resolution` 或追加执行结果消息），下次拉取历史时前端自动显示已决态。【已落地：confirm 执行后回填 resolution 并追加静态执行结果 assistant 消息；cancel 仅回填】
4. **历史持久化**：`approval` 随消息存 `agent_messages` 表（新列 `approval` TEXT，迁移 051），`GetConversationDetailAsync` 装配时带上该字段。【已落地】
5. **防重放**：同一 `requestId` 的 resolve 只应生效一次（幂等），重复点选/重放请求拒绝或幂等返回。【已落地：重复 resolve 返回 alreadyResolved=true，不重复执行】

## 4. 前端行为说明（对接前必读）

- **渲染位置**：`MessageBubble.tsx` —— assistant 消息、`message.approval` 存在时，渲染于正文之后、工具结果卡之前。
- **已决态**：`approval.resolution` 非空 → 卡片收起交互（按钮不渲染），显示「已选择：{label}」+ 绿 ✓。
- **未决 + 历史回放**：消息带 approval 但无 resolution → 保持可交互（用户可以对历史会话里的未决卡点选——后端自行决定是否接受老请求的确认，建议拒绝超过一定时间的）。
- **本地态**：点选后前端立刻显示已决（不等后端），靠 `localResolution` 消息级 state；后端 resolve 失败时回滚本地已决态并走既有 toast 错误提示（已对接）。
- **样式**：组件 `src/components/features/agent/ApprovalCard.tsx`（受控 props `ApprovalCardProps`，注释即接口文档）；置信度色走语义变量 `--success/--warning/--danger`，不新增 CSS 变量。

## 5. 现成的验证方式

- 单测：`src/components/features/agent/__tests__/approval-card.test.tsx`（7 用例：渲染/主按钮/抽屉展开与点选/已决态/图标零问号/MessageBubble 挂点）——改契约后跑它防回归。
- 手工模拟：在任意会话的 assistant 消息上手写 `approval` 字段（devtools 或临时 mock），即可看到卡片全交互。

## 6. 安全注意事项（对接时必须遵守）

- **确认卡只放行明确列出的 option**：后端执行时以收到的 `optionKey` 为准，忽略其余；不执行未列出的动作。
- **服务端再鉴权**：resolve 请求必须校验当前用户对该会话/该数据的权限（确认卡不是权限边界，只是交互层）。
- **审计**：确认执行的动作建议写 audit_logs（谁、何时、确认了什么、执行了什么）。
- **PII/金额字段**：approval body 里若含金额，遵守项目铁律（INTEGER 分存储、展示 ¥ 格式化）。

---
*本文档由确认卡前端任务（提交 e4ab1fae）产出。前端契约如有变更，以 `src/types/agent.ts` 与 `ApprovalCard.tsx` 的注释为最终真源，并回写本文档。*
