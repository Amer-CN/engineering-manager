# 里程碑说明：M-S13 合同看板 + M-S15 Drawer 统一 + 巡检修复

> Sprint 时间：2026-07-27 ~ 2026-07-28 · 基线：`db164ff`（Bedrock sprint）
> 状态：代码完成，红绿灯前端四项全绿（tsc 0 / 全量 vitest 162 files / build / check）；S29 像素截图待补

## 改动主题

### 1. M-S13 合同 Kanban（S13 屏）
- 新增 `src/components/features/contracts/ContractKanban.tsx`：三列拖拽板（签署中 draft/pending → 执行中 active → 近期完成 expired/terminated/archived），HTML5 原生拖拽零新依赖
- `ContractPage.tsx`：列表/看板视图切换 segmented；拖拽换列复用 `updateContract` API（权限码 `contracts:update`），后端零改动
- 三类合同（income/expense/agreement）共用页面，Kanban 自动全覆盖

### 2. M-S15 Drawer 统一战役（S17 屏 → 全站推广）
- 新增 `src/components/ui/Drawer.tsx`：S17 规格右侧滑出抽屉（480px 默认 / 92vw 上限，spring damping 28 stiffness 260，Esc 关闭，header icon+标题+X / 滚动内容区 / footer 插槽）
- **20 个写操作表单全部迁入 Drawer，写表单 Modal 归零**：
  发票智能录入、回款/付款登记、合同表单（×3 类共用）、生成合同、合同模板、文档模板、台账记账、图纸上传、成员档案（×2 类共用壳）、工人库、工人离场、班组、工人调组、物料、出入库、项目材料、合作单位、监管单位、用户、项目授权
- **交互契约**：右滑抽屉=写入提交；居中弹窗=浏览/统计/预览/确认/选择器（撤销授权、工资统计、文件预览、模板预览、AuditDetail、ConfirmDialog 等经语义甄别保留）
- 清除 2 处手写 `fixed inset-0 + modal-content` 容器（Partners）
- 双 padding 巡检：6 处 Drawer 包裹层 px-6 去除（Form 自带 p-6）

### 3. 屏级细节
- S25 仓库：物料名称列图标容器（24px Package + 发丝边）+ 低库存红色圆点（title 悬浮"当前 X / 安全线 Y"），替代旧"⚠库存不足"换行文字
- **S29 全屏模板编辑器**（ContractTemplateFormModal 重写，props 接口不变）：Context Header（面包屑+名称/类型）+ 左 70% 纸张画布（插入变量 chips 工具条 + 无边框 mono textarea + 预览模式渲染 `{{变量}}` 为 accent 徽章）+ 右 30% 变量绑定面板（搜索过滤 + S29 变量卡）+ 底部动作条；预览模式下 required 绕过已兜底（切回编辑 + reportValidity）
- **孤儿功能复活**：审计发现 `ContractTemplates.tsx`（合同模板库，含完整 CRUD + `/api/contract-templates` 后端）全库无调用方——功能完整但不可达。已接入 `Contracts.tsx`（view='templates'）+ `ContractDashboard` 快捷创建区新增"合同模板库"入口；顺手修复该页 2 处 map 缺 key
- 全站金额 mono 巡检：28 处补 `font-mono tabular-nums`（codemod 批量后即删脚本）；SettlementPrintTemplate 为纸质打印模板整体豁免（codemod 曾误伤 2 处，diff 自检时已回滚）
- **Drawer 组件加固**：补背景滚动锁定（对齐旧 Modal 行为，20 处迁移的体验回归）+ 新增专属单测 `Drawer.test.tsx` 6 用例（渲染/关闭/Esc/footer/滚动锁定）

### 4. Bug 修复（8 项，构成注记：6 项存量缺陷 + #4 测试设施问题 + #5 本批迁移引入的回归）
| # | 缺陷 | 修复 |
|---|------|------|
| 1 | PaymentForm 新建误判为编辑（`isEditing=!!recordDate` 而 recordDate 默认今天恒真）| 改显式 `isEditing` prop，Invoices.tsx 传 `!!h.editingPayment` |
| 2 | dev 下 `new URL(''+path)` 无 base 抛 Invalid URL（知识库搜索/文档、STT 列表、api-client 带参 GET 全炸）| 4 处补 `window.location.origin` base（绝对 URL 时被忽略，生产不变）|
| 3 | 4 个 client `VITE_API_BASE \|\|` 吞空串 → dev 直连 5048 被 CORS 拦 | agent/knowledge/stt/update-client 统一改 `??` |
| 4 | framer-motion 测试 mock 缺 `motion.aside` → Drawer 渲染即 "Element type is invalid"（20 测试失败）| mock 补 `aside`；iconMap 注册 GripVertical/List/Braces 三处同步 |
| 5 | Drawer 缺背景滚动锁定（旧 Modal 有）→ 抽屉打开背景仍可滚动 | 补 body overflow 锁定/恢复 + 单测覆盖 |
| 6 | 合同模板库整页不可达（孤儿组件，功能+后端 API 齐全但无入口）| 接入 Contracts 路由 + Dashboard 入口按钮，浏览器实证可达 |
| 7 | AI 设置页添加自定义模型卡死（长期已知缺陷）：`useToastStore()` 全 store 订阅 → toast 变化重建 loadConfig → useEffect 无限重跑 | 改 selector 订阅 `useToastStore(s => s.showToast)`，新增回归测试 3 用例（含防复发断言）|
| 8 | 主窗口无最小尺寸约束，拖得过窄时侧栏/主区文字竖排挤压（视觉走查 479px 实测发现）| MainWindow.cs `resize` 消息处按场景设 MinimumSize：主窗（≥900宽）960×640，登录小窗（300×400）不限；唯一后端改动，build 0 警告 0 错误 |

## 验收证据
- tsc `--noEmit`：0 error（每批改动后均复验）
- 全量 vitest：**162 files 全过**（Drawer 加固批次后完整跑通，`--maxWorkers=2`）
- vite build：多次 6-9s 成功（S29 全屏编辑器 + 孤儿复活 + 校验兜底批次均复验）
- npm run check：BUILD PASSED（0 HARD FAIL）
- 浏览器实证（.design-qa/actual/）：
  - `s13_kanban_view.png` — M-S13 Kanban 三列实拍（签署中/执行中/近期完成 + 卡片 + 空列虚线）
  - `s17_contract_drawer.png` — 合同抽屉实拍（560px 右滑 + 从模板生成 + 双列表单）
  - `s29_editor_edit.png` / `s29_editor_preview.png` — S29 全屏编辑器实拍（面包屑+插入变量 chips+纸张画布+变量绑定面板；预览模式变量徽章+居中标题）
  - `ai_custom_model_fixed.png` — AI 卡死修复运行时实证（切自定义模型后字段展开、页面存活、fps 正常 241帧/2s、零 toast 风暴）
  - 发票录入抽屉 + 付款抽屉截图（更早批次，Bedrock 三主题下）
  - `new URL` 修复后 console Invalid URL 报错 6 → 0
- 已知环境注意：本机全量 vitest 需 `--maxWorkers=2`（默认并行度会 worker OOM）

## 遗留项
1. **S29 编辑器后续深化**（可选）：设计稿中的富文本工具条（加粗/斜体/对齐）当前未实现——现有数据模型为纯文本 + 变量占位符，富文本需先升级数据模型，建议独立评估
3. **两套模板系统语义重叠（产品决策项）**：合同模板库（`contract_templates` 表 + S29 编辑器）与文档模板（`templates` 表，docx/xlsx 上传型，模板管理页）并存；合同表单"从模板生成"（TemplateSelectorModal）走的是**文档模板**而非合同模板库。两者定位重叠（都能生成合同），建议规划期决策：合并、分工（文本变量型 vs 文件填充型），或明确各自入口文案
4. **提交前**：最后跑一次红绿灯（后端 dotnet build/test + 前端四项）
