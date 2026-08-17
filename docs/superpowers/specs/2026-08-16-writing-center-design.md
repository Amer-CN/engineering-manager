# 写作中心（Writing Center）设计 — v0.92.0

> 设计日期：2026-08-16 · 状态：已确认（方案 A：tiptap 自建编辑器）
> 前置调研：写作能力现状盘点 + super-official-writer skill 评估（会话记录）
> 里程碑：W1 地基 → W2 编辑器 → W3 生成与打通（每个 push 后停下等审）

## 0. 背景与目标

工程管家目前没有写作能力：无 WYSIWYG 富文本编辑器（仅 templateMarkup.ts 轻量
Markdown 子集工具条，服务合同模板），无公文起草/会议纪要/工作日志等 AI 写作功能，
产品内不存在 skill/prompt 模板概念（所有 prompt 硬编码）。已有资产：STT 转写校对
入库链路、AI 日/周/月报（单一风格）、模板管理的公文/函件 docx 填充体系。

目标：内置 super-official-writer skill（GitHub Amer-CN/super-official-writer，
基于《笔杆子是怎样炼成的》五步法 + 《公文写作算法》六层矩阵的公文写作方法论），
新建独立「写作中心」模块，提供 Notion 式现代文档编辑体验（档次 1：
所见即所得 + `/` 斜杠菜单 + 行内 AI，不做通用笔记空间/完整 Notion 形态）。

明确不做（v1）：文档文件夹、版本历史、完整红头国标版式、风格轮换记忆、
编辑器内 Protected Spans 高亮、四维风格参数（只留 S1-S6 + 详略度）。
知识库重设计是独立后续课题，v1 仅留「存入知识库」单向通道。

## 1. 总体架构

独立模块 `writing`，侧边栏「资产」组（知识库与语音转文字之间），路由 `writing`，
快捷键 `G X`，权限资源 `writing:read/create/update/delete`（照 knowledge 先例：
前端权限标签 + 后端资源映射 + 037/041 式权限追加迁移 + check-permission-matrix 通过）。

| 层 | 新增 |
|----|------|
| 前端页面 | `src/components/features/writing/`：WritingIndex（列表，W1）、WritingEditor（W2） |
| 前端服务 | `src/services/writing-client.ts` |
| 后端端点 | `EngineeringManager.Api/Endpoints/WritingEndpoints.cs` |
| 后端服务 | `EngineeringManager.Api/Services/WritingSkillService.cs`（skill 加载 + prompt 组装） |
| 迁移 | `Migrations/Scripts/042_AddWritingCenter.sql` |
| skill 资源 | `EngineeringManager.Api/Resources/WritingSkill/`：SKILL.md + templates.md + phrase-library.md（EmbeddedResource） |

LLM 调用复用 `ILlmChatService`（三级配置兜底继承：用户配置 → 环境变量 → 内置免费 API）。

## 2. 页面与交互

**WritingIndex（写作中心列表页）**：文档平铺列表（标题/文体/关联项目/更新时间），
文体筛选 + 新建入口 + 删除确认（W1）。生成面板与编辑器在 W2/W3 接入。

**WritingEditor（编辑器页，W2）**，两阶段：
- 生成阶段：左侧生成面板——文体选择（18 类展开子类约 30 项分组下拉）、素材输入框
  （提示 `[[双括号]]` 标记保护数据）、风格选择（S1-S6 + 详略度 1-5）、可选关联项目。
  生成 → 流式逐字填充编辑器；
- 编辑阶段：tiptap 全宽，顶部细条（标题 + 保存状态 + 导出 + 存入知识库）。
  Ctrl+S 手动保存 + 2s debounce 自动保存。

## 3. 数据模型（042_AddWritingCenter.sql）

```sql
CREATE TABLE IF NOT EXISTS writing_documents (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT NOT NULL,
    doc_type    TEXT NOT NULL,     -- 白名单枚举，见 WritingSkillService.DocTypes
    style_id    TEXT,              -- S1..S6，记录生成时风格
    content_md  TEXT NOT NULL DEFAULT '',
    project_id  INTEGER,           -- 可选关联项目
    source_type TEXT NOT NULL DEFAULT 'manual', -- manual / stt
    source_ref  TEXT,              -- 如 stt_job.id
    created_by  TEXT NOT NULL,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    deleted_at  TEXT               -- 软删，照 knowledge_folders 先例
);
```

新增表 Checklist（docs/CONVENTIONS.md 5 条）逐条过：无金额字段；created_at/updated_at
TEXT；deleted_at 软删；doc_type/updated_at 索引；NNN_Description.sql。

## 4. 后端端点（WritingEndpoints.cs）

全部经 GlobalAuthMiddleware 强制鉴权 + CurrentUser.HasPermission，Dapper 参数化，写操作审计。

| 端点 | 权限 | 作用 |
|------|------|------|
| `GET  /api/writing/doc-types` | writing:read | 文体/风格可选项（单源真值，来自 WritingSkillService） |
| `GET  /api/writing/documents` | writing:read | 列表（软删过滤，可按 doc_type 筛，分页） |
| `POST /api/writing/documents` | writing:create | 新建文档 |
| `GET  /api/writing/documents/{id}` | writing:read | 详情 |
| `PUT  /api/writing/documents/{id}` | writing:update | 保存编辑 |
| `DELETE /api/writing/documents/{id}` | writing:delete | 软删 |
| `POST /api/writing/draft` | writing:create | 整篇起草，SSE 流式优先非流式兜底 |
| `POST /api/writing/assist` | writing:create | 行内改写，同步返回 |

**WritingSkillService**（Singleton）：启动时从 EmbeddedResource 载入三份 md 并缓存内存；
按文体组装 system prompt = SKILL.md 核心规则（角色/六层矩阵/风格/Protected Spans/输出规范）
+ 对应文体 T 模板全文 + 素材库。draft 返回后剥离 `[[ ]]` 保留实体。

## 5. 编辑器（W2，tiptap）

- 依赖：tiptap core + starter-kit + table + suggestion（斜杠菜单）+ bubble-menu；
- 斜杠菜单：标题一/二/三、有序/无序列表、表格、引用、分割线 + AI 续写此处（调 assist）；
- 行内 AI（BubbleMenu）：改写/润色/扩写/缩写四个动作，选中替换，Ctrl+Z 可撤销；
- Markdown 进出：加载 MD→ProseMirror，保存 ProseMirror→MD，存储恒为 Markdown 字符串；
- 样式全部用现有 token（slate-*、规范字号），过 build 强检与组件硬约束。

## 6. 打通点（W3）

1. **STT→会议纪要**：转写校对页「生成会议纪要」按钮 → zustand pendingDraft → 跳写作中心，
   转写文本预填素材、文体预选会议纪要、source_ref 记 stt_job.id；
2. **存入知识库**：编辑器一键调 `POST /api/knowledge/documents`（source_type=manual）；
3. **docx 导出**（前端 `docx` 包，照 docxtemplater 前端生成先例）：公文样式映射
   （标题黑体、正文仿宋、一/（一）/1. 层级、粗体列表表格保留）；另有复制 Markdown/纯文本。

## 7. 验收标准（5 条）

1. 侧边栏出现「写作中心」，无 writing:read 权限用户不可见；
2. 选文体 + 贴素材（含 [[标记]]）+ 选风格 → 流式生成 → 保存 → 重开内容一致，括号已剥离；
3. 编辑器 `/` 弹菜单可插标题/列表/表格；选中文字浮出 AI 菜单，改写可 Ctrl+Z；
4. 语音转文字页点「生成会议纪要」→ 跳写作中心且素材已预填；
5. 导出 .docx 无乱码，标题/粗体/列表/表格保留；红绿灯全绿（dotnet build/test、npm run check、
   check:version、tsc --noEmit、vite build）。

## 8. 来源与许可

super-official-writer（架构：Amer-CN/Tabbit，2026-08-14）基于两部公开出版物方法论整理，
随仓库 vendor 入库，出处在其 SKILL.md 第十节注明。