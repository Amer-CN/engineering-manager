# 给 reasonix 的工作指令：并行承接两个隔离任务（驱动 mimo code 执行）

## 你的职责范围（只做这两件，不要扩展）
A. 在系统提示中注入「语义层 + 指令式约束」
B. 把模型选择/路由抽象成独立一层（配置驱动换模型）

这两项与另一条线（`SafeQueryValidator`/权限改造）文件完全不相交，可安全并行。

## 硬性文件边界（最重要，务必传达给 mimo）
- ✅ **只允许修改**：
  - `EngineeringManager.Api/Endpoints/AgentEndpoints.cs`（仅 `BuildSystemPrompt()` 相关）
  - `EngineeringManager.Api/Services/LlmProviderService.cs` 及为任务 B 新建的路由层文件
- 🚫 **严禁触碰**（另一条线正在改，改了必冲突 / 可能引入安全漏洞）：
  - `EngineeringManager.Api/Services/SafeQueryValidator.cs`
  - `EngineeringManager.Api/Security/CurrentUser.cs`
  - `EngineeringManager.Api/Services/AgentToolService.cs`
  - `EngineeringManager.Api/Common.cs`
- 在**独立分支**上工作（如 `feat/prompt-and-model-routing`），完成后提 PR / 给出 diff，不要直接合并到主分支。

---

## 任务 A：系统提示注入语义层 + 指令式约束

### 目标
提升「选对工具 + 填对参数」准确率，把业务约束前移到生成阶段，减少答非所问。

### 涉及文件
`AgentEndpoints.cs` → `BuildSystemPrompt()`（当前只列了 13 个工具名 + 回答规范）。

### 改动步骤（纯增量，不动任何业务逻辑）
1. **术语映射**：结算=settlement、发票=invoice、成本台账=cost_ledger、合作方=partner、库存=inventory_items 等。
2. **枚举字典**：`cost_ledger.direction` 取 `income/expense`、`status` 取值、角色中英映射（管理员=admin、经理=manager、财务=accountant、工人=worker）。
3. **工具选择指引**：何时用 `getCostSummary` vs `getInvoices`；按项目筛选须先 `getProjects` 拿 `projectId` 再调详情类工具。
4. **指令式约束（借鉴 WrenAI Instructions）**：分「全局指令」（命名规范、过滤口径）与「问题匹配指令」，用业务规则引导生成。

### 验收标准
- 对「上个月支出多少」「X 项目的待付结算」「按月统计今年各项目开票额」等问题，模型能稳定选对工具、带对参数。
- 术语/枚举必须与 `Migrations/` 建表脚本实际值一致（以 DB 为准，不能臆造）。

### 风险
提示过长增加 token 成本；枚举若与 DB 不符会误导模型——务必对照 `Migrations/` 校准。

---

## 任务 B：模型选择/路由抽象成独立一层（配置驱动换模型）

### 目标
把「用哪个模型、走哪个端点」从调用点剥离成独立路由层，实现「后端换模型、用户无感」。借鉴 DB-GPT SMMF。

### 涉及文件
`LlmProviderService.cs`（现有三级配置：DPAPI → 环境变量 → 内置 Agnes key）+ 新建路由层文件。

### 改动步骤
1. 抽出一个 `IModelRouter` / `ModelRoutingService`：输入「场景/用途」，输出「应使用的模型名 + BaseUrl + key 来源」。
2. 路由策略**配置驱动**（配置项或环境变量），切换模型不改调用点、不重新发版。
3. `LlmProviderService` 的 `ChatAsync` / `ChatStreamAsync` 改为向路由层要模型，而非写死。
4. 保留现有三级 key 兜底逻辑不变，只是把「选模型」与「拿 key」职责分清。

### 验收标准
- 改一处配置即可切换默认模型，所有调用点无需改动、用户无感。
- 现有对话功能（含流式）回归正常；三级 key 兜底行为不变。

### 风险
不要改动 key 的加解密与兜底顺序（那是安全相关）；只重构「选模型」这层职责。

---

## 交付方式
两项各自独立提交，完成后把 diff / PR 链接给出来等待审查。**不要碰禁止清单里的文件，不要合并主分支。**