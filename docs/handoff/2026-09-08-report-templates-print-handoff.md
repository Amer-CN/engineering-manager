# 交接文档 — 报告模板体系与打印/预览一致性（2026-09-08）

> **状态**: 全量体检完成，11+ 提交在 `feat/ai-settings-autosave` 分支，**未合并回 master**
> **触发源**: 用户对图表模板"预览≠打印"的多轮反馈 + LLM 通道排障
> **接手须知**: 用户反馈"还是发现了一些问题"但**尚未给出具体截图/描述**——新会话第一步是拿到那些问题的截图，按本档"核验方法论"自行复现与定位，不要让用户当测试员

---

## 一、故事背景（为什么会有这套东西）

1. 用户引入 lieflat-charts skill（`vendor/lieflat-charts/`，PolyForm Noncommercial）的设计语言，干净室重写了编辑风报告模板，目标是"软件图表焕然一新"。
2. 报告中心按「报告用途」重构：用途（+主题）决定模板，AI 生成结构化 markdown → 前端双渲染器（React 预览 + 静态 HTML 打印）。
3. 用户对打印一致性的要求逐步明确，最终契约是：**"预览什么样，打印就什么样 + A4 纸适配（上下 10mm 纸边防贴顶、左右满版出血）"**。

## 二、模板体系架构（改前必读）

### 用途/主题 → 模板映射（`src/utils/reportTemplates/types.ts` getTemplateId）

| 用途 | 主题 | 模板 | 长相 |
|------|------|------|------|
| 经营复盘 review | 综合经营 general | **r04** | 左书脊 72px + 图表流（buildChartReportPrintHtml，在 `utils/reportPrintHtml.ts`） |
| 经营复盘 review | **工资专项 wage** | **r12** | PALM 棕绿海报：双数卡 + 点阵/粗柱双图卡（曾因主题被忽略错走 r04，已修 dbac1cb1） |
| 对外举证 evidence | — | **r01** | 右蓝栏 52mm fixed 逐页 + 衬线大标题 + 证据带 |
| 工作汇报 work | — | **r05** | MONO 墨阶叙事单栏 |
| 周报速览 weekly | — | **r12** | 同 r12 |

### 双渲染器与数据流

```
AI markdown → parseChartReport (chartReport.ts，数据层唯一咽喉)
  → 预览: R01EvidenceView / R05WorkView / R12WeeklyView / ChartReportView (tpl/ 目录 React 组件)
  → 打印: r01Print.ts / r05Print.ts / r12Print.ts（静态 SVG 内联、零脚本）/ buildChartReportPrintHtml
```
- 分发入口 `ReportResultPanel.tsx`（format=chart + templateId 快照）；模板选择在 `ReportGeneratorModal.tsx`。
- **数据层纪律**：`**` 加粗剥离、`chart:bars` 冒号容错、`chart-*` 白名单（未知 kind 原文降级）都在 parseChartReport——模板层不做这些。
- **打印页物理限制（用户已知悉）**：@page 页边距区域铺不了底色 → 上下纸边只能是白色；满版贴边则中间页文字贴顶。当前契约：上下 10mm 白边 + 左右满版。流式长文只能在中性位置断页，无法像海报版逐页构图。

## 三、本会话提交清单（全部在 feat/ai-settings-autosave）

| 提交 | 内容 |
|------|------|
| 8a61fa92 | fix(llm): responses 协议不再混发 max_tokens（Zen 上游 400 拒的根因） |
| 8273b1b1 | feat(ui): 报告弹窗/文秘起草面板显示当前生效模型 + 气泡按钮悬停提示 |
| 82852516 | feat(settings): 服务商子页「获取模型列表」按钮（新端点 /api/agent/setup/provider-models + 门禁豁免行） |
| 0a2ffed4 | fix(reports): 三模板打印安全版式第一轮（单栏过渡方案） |
| 502bf18b | fix(llm): opencode.ai 出站带稳定 x-opencode-session 头（文档化契约，缺头 400 MissingSessionID） |
| 9d5abddd | fix(reports): 报告生成超时 30s→180s，ChatAsync HTTP 预算 120s→300s |
| 927c948b | fix(reports): 生成中禁点遮罩/X（防误触丢弃） |
| 5ead9462 | fix(reports): chart:bars 冒号格式归一化容错 |
| d368948e→678b6bcf | fix(reports): 打印版式四轮迭代（满版出血/双栏恢复/字号对齐/R01 预览 zoom） |
| dbac1cb1 | fix(reports): 主题感知映射（review+wage→r12） |
| bff5041e/32bf93ed | fix(reports): r12 双图卡并排 + 标题行 flex + 图区自然高 |
| 173b843f | fix(reports): 数据层剥离 ** 加粗标记 |
| **796b76b0** | **test(reports): 打印 HTML 一致性守卫测试（常驻，5 用例）** |
| **678b6bcf** | fix(reports): R01 预览 zoom 补 width:1080 + R12 点阵 PALM 色序 |

## 四、核验方法论（新会话自检的工具箱，**先跑这个再让用户看**）

全部产物与脚本在 `.work/audit/`（gitignore，gen.ts 若被清理可按 git 历史 9df0b391 前后找回或照本档重写）：

1. **结构体检**：`npx tsx .work/audit/gen.ts` —— 四模板 × 三场景（完整/空/注入攻击）真实生成打印 HTML，断言：零 `<script>`、无 `${`/undefined/NaN 泄漏、div 配平、SVG 数量、@page 规范、注入转义。
2. **打印分页核验（关键！截图模式看不出分页）**：
   ```bash
   # 复制 html 到纯英文路径（CJK 路径 print-to-pdf 会静默失败）
   cp .work/audit/r01-full.html /e/Temp/ra/r01.html
   "/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless=new \
     --no-pdf-header-footer --print-to-pdf="E:/Temp/ra/r01.pdf" "file:///E:/Temp/ra/r01.html"
   python -c "import fitz,os; d=fitz.open('E:/Temp/ra/r01.pdf'); [print(f'{i+1}.png', d[i].get_pixmap(matrix=fitz.Matrix(1.6,1.6)).save(f'E:/Temp/ra/r01-{i+1}.png')) for i in range(len(d))]"
   ```
   然后**逐页 Read 图片肉眼验收**。
3. **预览核验**：ReactDOMServer.renderToStaticMarkup 渲染预览组件（临时 vitest 用例，跑完即删；组件 import 走相对路径，别名 '@/…' 在 vitest 下可解析），容器宽度用**弹窗真实宽度 620px** + 1080px 两档，HTML 链接 `dist/assets/index-*.css` 提供样式，无头截图验收。
4. **常驻守卫**：`src/__tests__/utils/reportTemplates.conformance.test.ts`（796b76b0）——新增模板/改版式先加用例再动手。

## 五、已知限制（设计定案，非 bug，用户已知情）

- R04 数据模型"每节一个图槽"：同节两个 chart 块后者覆盖前者（AI 按节分布图块，基本不触发）。
- R01 预览 zoom 缩放后文字变小——"完整看到设计稿"的代价；阅读版是打印 A4。
- 流式长文（r01/r05）跨页断点只能中性断，不能海报式逐页构图。
- 打印页眉页脚的 `about:blank` 是浏览器打印对话框"页眉和页脚"选项渲染的，代码不可控，用户取消勾选即可。
- R12 预览上下棕宽带是弹窗容器装饰，打印以纸面文档为准（无色带）。

## 六、未决问题（新会话第一优先）

1. **用户在本会话结束前说"我还是发现了一些问题"但未说明是什么**——先要截图，用第四节工具箱复现定位。按体检结论，四模板×三场景结构与分页均已验过，用户看到的可能是：特定窗口宽度、特定数据形态、或真实 App 里与静态渲染环境的差异。
2. **EditorToolbar.tsx 412 行超 400 上限**（并行会话提交 ffea42e3 引入，`npm run check` 唯一 HARD FAIL）——归属并行会话工作流，未经用户点头不要动。
3. **并行会话在途**：Agent 审批卡功能十几个 M/?? 文件（含 agent-client.ts、AgentEndpoints.cs、agent_approval 相关）。**提交时永远只选择性 add 自己任务的文件**；执行 git reset/checkout/stash 前必须先 git status 核实（AGENTS.md 并行会话纪律）。
4. `LlmProviderService.cs` 文件尾部有孤立 `/// <summary>` 残片（并行事故遗留，仅外观，编译无害），清理需用户点头。
5. LLM 通道现状：Zen 免费池间歇限流（会话头已修，429=重试即可）、MiniMax GMI 余额耗尽（402，需用户充值）、内置 Agnes 可用兜底。错误透传（429/402 被吞成"LLM 未返回有效内容"）仍未修，用户未拍板。

## 七、协作规约提醒（本仓库硬规矩）

- 多文件任务走 B 类四步：出方案 3 行 → `.work/task-<关键词>.md` 简报 → executor → code-reviewer（并行会话在场时简报必须带任务关键词命名）。
- 单文件/双文件小修可直接做（D 类），但**不得拆分多文件任务规避流程**。
- 提交前 `git branch --show-current` 确认分支；本会话全程在 feat/ai-settings-autosave。
- 改动自检：每次改完文件数累计 ≥3 必须已写简报。
