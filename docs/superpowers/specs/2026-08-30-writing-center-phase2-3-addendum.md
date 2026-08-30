# 写作中心 二期/三期/富文本三底线 — 增量纪要（2026-08-22 ~ 2026-08-30）

> 本文接续 `2026-08-16-writing-center-design.md`（v1 设计，方案 A：tiptap 自建编辑器）。
> v1 明确不做的五项（文件夹/版本历史/红头版式/风格轮换/Protected Spans 高亮）在二期全部落地。
> 记录格式：编年 + 决策理由，供后续会话快速理解现状与演化路径。共 31 个 PR。

## 二期（R1-R4）

- **R1 红头文件导出**（#56）：GB/T 9704 版头（红色机关标志/发文字号/红色分隔线/落款/版记）。技术路线：docx 库一次性生成模板入库 + docxtemplater 只填标量字段 + **正文 XML 注入**（`__WRITING_BODY_PARAGRAPHS__` 标记段替换为自生成段落 XML）。教训：docxtemplater 条件骨架段会渲染空段残留（一审驳回），多段落样式不适合模板条件段。
- **R2 Protected Spans 高亮**（#57）：tiptap Mark + markdown 三件套（tokenizer/parse/render，照官方 Highlight 模式）实现 `[[...]]` 黄色高亮 + markdown 无损往返。**附带修了 v1 既有缺陷**：setContent 不传 `contentType:"markdown"` 导致存量文档按 HTML 解析。
- **R3 文档文件夹**（#58）：043 迁移 writing_folders + folder_id；文件夹全员共享（列表可见/全员可建改名），**删除仅创建者**（#66 收紧：删夹会移出他人文档，属跨用户影响）。
- **R4 风格轮换**（#59）：不加表不加列——`GET /api/writing/next-style` 从「本人+同文体+最新一篇」推导上次风格，S1→S6 回绕；周报类向导默认「自动轮换」档；生成后正文首行插「> 本周风格：S# 名称」。

## 验收驱动修复（R5-R11）

- **R5** AI 行内改写陈旧位置竞态（#61）：await 期间打字 → 插入前校验选区文本未变。
- **R6** 交稿体检 + 导出清洗 + A4 缩放（#62）：runWritingCheck 纯函数四项（[[残留]]/层级跳号/字数/套话）；导出剥 [[标记]]。
- **R7** 斜杠菜单重构（#63）：跟光标定位、焦点不离开编辑器（query 从文档提取）、↑↓Enter 键盘导航。
- **R8 起草安全止血**（#64）：LLM error 块抛异常（原：静默丢弃 → 空 done → **清空用户文档**）；关闭面板 AbortController 中止流；空产出不发 done；SSE linked-CTS。这是全面复查（前后端 21 项发现）的产物。
- **R9** 体验清扫（#65）：标题保存风暴（saveDocRef 空依赖卸载 effect）/缩放范围/IME/导出防连点/SSE 错误透传/后端归一化（docType/styleId 标准化入库——大小写变体曾致轮换记忆漏计）。
- **双层 toast 静默根因**（#69/#70）：写作 5 组件误用本地 useToast（无渲染者）→ 全局 useToastContext；更深一层：**ToastProvider 从未挂载，全应用 store 版 toast 从上线起就无声消失**（main.tsx 根部挂载，一次修全应用）。「AI 起草点了没反应」的真相：空素材校验的 toast 被吞。
- **图标 8 个缺失**（#71）：向导文体卡/报告中心问号占位——iconMap 注册缺失（复查盲区：只查逻辑不查视觉）。沉淀全库图标 diff 脚本（.work/icon-check-all.cjs），建议接 CI。
- **R11/R12 编辑器形态三轮**：假页缝（repeating-gradient，撤——缝横穿文字行）→ 连续单页（用户否）→ R14 块级分页引擎（ProseMirror 装饰测量插缝，#88）。最终均被 **R15 Notion 化**（#90）替代：用户拍板编辑态=无限画布。
- **真根因**（#94）：flex `align-items:stretch` 把内容盒钉死在视口高——「第二页消失」自 A4 纸时代起的实际根因，一行 items-start 终结。R16 卡片化（#93，边界感）+ A4 比例默认高度（#95）。

## 三期（T1-T3）

- **T1 起草联动知识库**（#97）：KnowledgeDraftAugmenter（检索委托注入，可单测）——素材自动检索公司知识库（FTS+语义 RRF，top-3，3 秒预算）注入 prompt 低可信参考区；静默降级保持 prompt 逐字节一致；用户数据权限范围检索。reviewer 抓出 DI scope 泄漏（async using 修复）。
- **T2 版本历史**（#98）：046 迁移；保存自动快照旧内容（同事务、5min 节流、上限 50）；restore 强制留档被覆盖内容；归属隔离。
- **T3 自动体检**（#99）：初稿生成完自动跑 runWritingCheck，有警告 toast+自动开面板。

## 富文本三底线（P1-P3）

- **P1 粘贴保真**（#101）：sanitizePastedHtml 白名单重建（transformPastedHTML 钩子）——结构语义保留、class/style/mso-* 全剥、容器递归上提、URL 协议白名单（javascript:/SVG data-URI 拒绝）。fixture 用真实施工组织设计 docx 生成。14 测试。
- **P2 性能基准**（#102）：6 万字施组量级 jsdom 基准——打开 162ms/序列化 8ms/单次编辑 5ms，**数据层非瓶颈**；渲染层留待真实浏览器实测。3 条基准防退化。
- **P3 批量删除**（#103）：复选框/全选/批量删除（allSettled）+ 翻页筛选清空选中；行渲染抽 WritingDocRow。

## 关键决策记录

| 决策 | 结论 | 依据 |
|---|---|---|
| 编辑器选型 | tiptap（最成熟轮子，周下载 1800 万） | Univer 文档模块调研（存档 .work）：不支持 Markdown/不能导 docx/生态 1/50 |
| 分页归属 | 编辑态无页；分页属预览（浏览器打印引擎）/交付（docx 模板）态 | 用户三轮否决编辑器分页；「飞书/Notion 模型 + Word 交付结果」拍板 |
| 导出架构 | docxtemplater 模板填充（红头）+ docx 库直排（普通）+ 打印预览 HTML（PDF） | 版式交给 Word/浏览器引擎，不在流式编辑器上自研版式 |
| AI 素材增强 | 服务端检索注入（非前端） | 权限天然、前端零改动、降级透明 |

## 未竟事项（低优先级）

- SSE 接口层完整取消贯通（ILlmChatService 加 CancellationToken）——被并行会话的 LLM 接口重构阻塞，端点级兜底已上线
- 图标 diff 脚本接入 CI 门禁
- T1 检索命中数前端展示（「本次参考了 N 条公司资料」）——等知识库有真实数据后按使用反馈决定
- 悬挂遗留：WritingEndpoints POST create 审计仍为手工拼接 JSON（R9 只修了 FolderEndpoints；docType 归一化后无引号可能，风险低）
