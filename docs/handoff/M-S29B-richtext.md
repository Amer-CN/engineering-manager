# 里程碑说明：M-S29B 模板编辑器富文本（变量系统深化）

> Sprint 时间：2026-07-29 · 基线：`f2278f1`（v0.84.0）
> 状态：代码完成，验证全绿，浏览器 DOM 实证 + 实拍

## 改动主题

S29 设计稿工具条的富文本能力落地（v0.84.0 遗留项 2）。技术定案：**Markdown 子集标记**——零新依赖、数据模型向后兼容（仍是纯文本存储）、编辑/预览/打印三端共享一个转换器。

### 1. 转换器（TDD 先行）
- 新增 `src/utils/templateMarkup.ts`：
  - `escapeHtml`：HTML 转义（打印路径防注入）
  - `templateMarkupToPrintHtml`：正文 → 打印 HTML（`## ` 条款标题 / `**粗体**` / `*斜体*`，逐行转义后转换）
  - `tokenizeInline` / `parseMarkup`：token 流解析（预览渲染用，变量 > 粗体 > 斜体优先级，不支持嵌套）
- 测试先行：`templateMarkup.test.ts` 11 用例，含**恶意 HTML 注入**用例

### 2. 打印链路接入（顺带修注入面）
- `printContractTemplate.ts`：原 `content` 直拼 innerHTML（模板正文与变量值均可注入 HTML）→ 改走 `templateMarkupToPrintHtml`（变量替换在纯文本层完成后整体转义）

### 3. S29 编辑器工具条（设计稿 format_bold/format_italic 位）
- **B / I / H₂ 三按钮**：`wrapSelection`（包裹选区为 `**`/`*`，无选区插入占位文本并选中）+ `toggleHeading`（当前行切换 `## ` 前缀），预览态禁用
- 图标 Bold / Italic / Heading2 三处注册（iconMap 导入/导出 + 测试 mock）

### 4. 预览模式升级
- `renderPreview` 改走 `parseMarkup` token 流：`## `→条款标题 h2、粗体 strong、斜体 em、`{{变量}}`→accent 徽章；容器去掉 whitespace-pre-wrap（改为按行 p/h2 分段）

## 验收证据
- tsc 0 · **全量 vitest 165 files 全过** · vite build · check PASSED
- **dotnet build 0 错误 · dotnet test 644/644 全过（78s 裸跑）**——STT E2E 加 `RUN_STT_E2E=1` 环境变量闸门后，裸跑不再被 transcribe.exe 挂起拖死（此前两次 10 分钟+超时的根因）；重型 E2E 手动跑法见 SttE2ETests.cs 注释
- 浏览器 DOM 实证：填入 `## 一、合同价款` + `**伍佰万元整**` + `*按进度付款*` + `{{甲方名称}}` → 预览断言 `{strong:"伍佰万元整", em:"按进度付款", h2:"一、合同价款"}` 全对
- 实拍：`.design-qa/actual/s29b_richtext_preview.png`（预览模式：变量徽章+粗斜体+居中标题）+ `s29b_editor_toolbar.png`（编辑模式：工具条 B/I/H₂ + 插入变量 chip + 纸张 mono 编辑区 + 变量绑定面板全景）

### 5. 合同模板 CRUD 修复（孤儿功能从未真正可用，E2E 驱动连挖 3 bug）
| # | 缺陷 | 修复 |
|---|------|------|
| 9 | POST 创建 500：前端发 `description`/`variables[]`，后端 DTO 要 `content`/`Variables`(string)；bridge update 签名与类型声明互相矛盾 | tauri-bridge 双向字段映射（`\|\|` 防旧库遗留空 description 列陷阱），签名对齐类型声明 |
| 10 | PUT 必 500 + 越权洞：`dynamic dto` + SQL 参数只传 `Now`（Name/Id 全缺参），且无 created_by 校验 | 改强类型 ContractTemplateDto + 补全参数 + 对齐 DELETE 的 user-dim 保护 |
| — | 建表漂移：用户真实库的 contract_templates 为早期版本建表，缺 content 等 7 列 | Program.cs EnsureTables 自愈迁移（项目既有 ALTER+catch 模式）|
| 11 | 打印正文恒空：`handlePrint` 误传 `formData.description`（新建表单 state） | 改传 `selectedTemplate.description` |

**E2E 全链路实证**（真实数据库，用完即删）：创建（富文本+变量+`<script>` 注入探针）→ 列表渲染 → 生成合同填变量 → 打印捕获断言 `{hasStrong, headingLine, varReplaced, scriptEscaped}` 四项全真 → 删除清理归零；PUT 编辑另行实证（改名/改正文/改变量落库 + version 1→2 乐观锁递增 + 越权 PUT 返回 403）

### 6. 全库表结构漂移审计（排除系统性风险）
contract_templates 建表漂移曝光后，用 Microsoft.Data.Sqlite 只读审计真实库（F:\Company Database\engineering.db）全部 45+ 表的实际列 vs 代码期望：
- **仅 contract_templates 一例漂移**（旧 Rust 时代建表且孤儿无人用，已自愈修复并确认 7 列全部就位）
- 其余业务表 created_by / version / 云同步列（migration 014/024）、财务表 deleted_at 全部齐整——migration 体系对在用表工作正常
- 真库确证 contract_templates 存在遗留 `description`/`file_path`/`file_name` 空列——即 bridge 映射必须用 `||`（空串 fallback）而非 `??` 的实证依据

## 遗留项
1. 对齐（左/中/右）按钮未做：设计稿有 format_align_* 三按钮，但行级对齐标记会显著复杂化纯文本模型（如 `::center::` 语法），且合同正文以缩进段落为主、对齐需求弱——建议观察真实使用后再决策
2. 两套模板系统语义重叠（继承自 v0.84.0 handoff）：本批已做**分工明确化第一步**——两页副标题改为定位文案并互相指路（合同模板库=在线编辑文本变量型；模板管理=Word/Excel 文件填充型）。是否合并数据模型/统一入口仍属产品决策，留待规划
