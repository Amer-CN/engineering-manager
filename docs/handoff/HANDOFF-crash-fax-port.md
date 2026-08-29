# 交接文档：错误上报弹窗「反馈传真机 FX-01」像素级移植（pomme-ui → 工程管家）

> 交接对象：接手此任务的新 Agent（用户指定）
> 写作人：ZCode 会话（此前完成报错系统恢复、契约修复、联络函弹窗两轮迭代的执行者）
> 日期：2026-08-27
> 状态：**设计已全部定稿、简报已写好、尚未动工**。本文档自包含，读完即可开工。

---

## 〇、任务一句话

把用户在 `F:\AIXM\pomme-ui` 逆向复刻的 PommeToys「反馈传真机 FX-01」界面**像素级整体移植**进工程管家（`E:\测试`），替换现有错误弹窗的皮；上报功能的"里子"（契约、单号、复制等）全部保留。**阶段一：只做原样搬迁 + 功能接通，不做三主题适配。**

## 一、两边的仓库

### 源：F:\AIXM\pomme-ui（只读！绝不修改）
用户对 PommeToys（pommetoys.app，macOS 软件）前端的逆向复刻样本，纯静态零依赖（index.html 双击即用）。修复批次已完成（HEAD `2f5cdc7`），当前内容就是移植基准。规格可信度：CSS 注释里的尺寸/时序标着「4K 帧实测（比例尺 ×0.2947）」「二进制逆向」，是逐帧校准的，**照抄，不要自行调整任何数值**。

移植所需的四个部分（行号为 HEAD `2f5cdc7` 实测）：

| 部件 | 位置 | 规模 | 说明 |
|---|---|---|---|
| 传真机 DOM | index.html L532-653 | 122 行，53 个 fx- 元素 | `.fx-block` 整段 |
| 传真机样式 | assets/panel.css L1127-1689 | 约 560 行 `.fx-*` 规则 | 另需 `--pp-*` 纸张令牌（L71-76 亮色 / L138-144 暗色） |
| 传真机逻辑 | panel.js L1082-1555 | 约 470 行 | 9 相位状态机、走纸步进、音效编排 |
| 音效数据 | assets/sounds-data.js | 547KB base64，42 个音效 | 配套官方增益表在 panel.js L84 附近（`fax-send-key: 0.3770` 等，Mach-O 逆向值，移植时一并带上） |

i18n：界面固定中文，中文文案从 i18n.js 的 fx.* 词条取，LCD 英文行（READY / DIALING · POMME-TOYS 等）保留样本原样。

### 目标：E:\测试（工程管家）
- React 18 + TS 5 + Vite + Tailwind 前端；桌面壳 WinForms + WebView2；ASP.NET Core 后端（localhost:5048）
- master 走 PR + 6 项 CI 检查（Lint/TS/E2E/单测×2/后端构建），全绿才能合
- 前端改完 `npx vite build`，用户双击 `工程管家.bat`（dotnet run 起后端+壳）看效果——**无热更新**，改完必须重新构建
- 门禁：`node scripts/check-rules.cjs`（行数上限、玻璃/3D 白名单、hex 硬编码等）——本任务涉及白名单登记（见下）

### ⚠️ 工作区现状（重要）
E:\测试 工作区常有**多个并行 Agent 的未提交改动**（写作/知识库/mascot 等）。开工前先 `git status` 看清，**只提交你自己改的文件**；`npm run check` 的既有违规可能是别人半成品，与你无关，记录对比即可。建议像之前那样用 `git worktree` 从 origin/master 拉干净基底干活。

## 二、现状：被替换的对象长什么样

master 上现有 `src/lib/crash.ts`（约 1185 行，「工程联络函」版），结构：

- **"里子"（全部保留，迁移到新 index.ts，优先字节不动）**：
  - 4 层捕获：window error / unhandledrejection / console.error 拦截 / fetch 拦截（**fetch 仅 5xx 弹窗，4xx 只记面包屑**——commit 78ffa69 的正确改进，勿回退）
  - `composeWirePayload`：与线上 Worker 的 zod 契约对齐（kind 枚举映射 unhandled/promise/react/fetch→exception、console→feedback；device 字段不传；breadcrumbs ≤30 条、msg ≤240；各字段长度上限截断）——**这套契约是用真实 400/202 测出来的，勿改**
  - `computeReportNumber`：前端复刻 Worker 指纹算法（sha256 前缀 8 位 = 后台 groups 表主键前缀，用户报单号可溯源）
  - `buildCopyText` + 剪贴板（writeText + execCommand 兜底）
  - 5s 去重、reporting 防自递归、isOwnEndpoint、initCrashReporter 防重
- **"皮"（全部替换）**：现有四区/联络函 overlay 的 DOM 生成与样式
- 对外接口：`src/main.tsx` 调 `initCrashReporter({ version: APP_VERSION })`（from './lib/crash'）、`ErrorBoundary.tsx` 调 `reportCrash(payload)`（from '../lib/crash'）——**这两个文件的 import 路径目录化后依然要解析通，目标零改动**

## 三、目标结构（已定稿，照此落位）

```
src/lib/crash.ts          → 删除（内容迁入目录）
src/lib/crash/
  index.ts                ← "里子"：捕获/契约/单号/复制/init，原样迁移
  fax-overlay.ts          ← "皮"：传真机 DOM 生成（原生 DOM！）+ 9 相位状态机 + 音效编排，
                             从样本 panel.js L1082-1555 翻译为 TS（var→const，逻辑与数值逐拍一致）
  crash-fax.css           ← 样本 panel.css 的 .fx-* 段 + --pp-* 令牌（亮/暗两套）
  crash-fax-sfx.ts        ← 样本 sounds-data.js 转为 TS export（用脚本转换，勿手抄 547KB）+ 增益表
```

`scripts/check-rules.cjs`：玻璃/3D 白名单里把旧路径 `src/lib/crash.ts` 更新为新路径（crash-fax.css 若含 backdrop-filter 需登记；理由注释写「Modal 类浮层，样本原样」）。

**红线（违反即返工）**：
1. overlay 必须原生 DOM（document.createElement）——React 崩了弹窗也要能弹；
2. 用户点击 TRANSMIT 才发送，不静默自动上报；
3. DEFAULT_ENDPOINT 不变：`https://engineering-manager-crash.bb531285650.workers.dev/v1/report`；
4. 样本数值（107ms 步进/420ms 撕断/1300ms 回执/2000ms 新纸等）原值保留，禁止"优化"；
5. `F:\AIXM\pomme-ui` 只读。

## 四、功能映射（传真机交互 ↔ 上报能力，全部已定稿）

| 传真机元素 | 映射 |
|---|---|
| 模式键 BUG REPORT / SUGGESTION | kind：bug→exception、sug→feedback（默认 bug） |
| 正文 textarea（2000 字） | 用户备注。上报为 note 片段 breadcrumb：240 字/条 × 最多 8 条；复制文本含全文 |
| （样本没有的）错误信息展示 | 在「随附机器信息」区**之前**插入只读错误摘要区：等宽小字、细虚线框、纸墨色，视觉如"已打印在纸上的故障记录"——message 前 500 字 + 折叠完整堆栈/组件堆栈/redact 后 URL，无值不渲染 |
| 发件邮箱 input | breadcrumb {cat:'contact', msg:email}（截 240） |
| 随附机器信息 I/O 拨杆 | off 时 version/os/arch/language 仍发（契约必填）但不附 machine breadcrumb，纸上信息区视觉空白（与样本 off 态一致） |
| 回执「单号」R-XXXXXXXX | `computeReportNumber` 真实单号；**发送失败也显示**（busy 相位复用为失败态 + fax-error 音效 + 可重发） |
| （样本没有的）复制按钮 | 底控台 CLEAR 与 TRANSMIT 之间加一枚同款样式「复制 COPY」按钮，逻辑用现有 buildCopyText |
| TRANSMIT | 真实 POST（保留 reporting 防递归）。时序按样本：拨号音效+LCD 推进与网络请求并行，网络先回则等编排到位再切 sent |
| 撕纸/换纸/NO.自增 | 样本原样；函号 localStorage 键沿用 `crash-letter-no` |
| Esc | 保留：非 busy 相位才关，busy 中忽略 |
| prefers-reduced-motion | 样本 REDUCED 分支原样 |
| 音效 | 42 个全量（用户定：以后全软件可能都用）。AudioContext 惰性创建（首次手势后）；音量/全局开关**本次不做**（后续大工程） |

## 五、阶段一边界（用户明确定稿）

- ✅ 做：原样搬迁、功能接通、明暗两套 --pp-*（跟随系统 prefers-color-scheme，容器级 class 实现，不用样本的 html[data-theme] 全局机制）
- ❌ 不做：三主题（Bedrock token）适配——用户明确"先保真后适配，避免适配引入意外问题"；音效设置开关；其他面板（.pt-* 主面板）的移植
- 视觉验收基准：软件白/净白/石墨三主题下弹出传真机，均为样本自身配色（不透底、不错色）即可

## 六、验收标准（6 条，可直接执行）

1. `npx tsc --noEmit` 退出码 0
2. `node scripts/check-rules.cjs` crash 相关 0 违规（既有他人违规记录对比即可）
3. `npx vite build` 退出码 0，dist 体积增量 < 700KB
4. Playwright 无头实测：`console.error('...')` 触发 → 传真机弹出（三灯/LCD/模式键/传真单/回执/底控 DOM 断言全过）；填正文 → LCD 计数变化；TRANSMIT（mock 202）→ 9 相位依次推进 → 回执撕出（R-8 位单号）→ 撕纸 → 换纸 NO. 自增回待命；COPY → 剪贴板含格式化文本；mock 500 → busy 失败态 + 单号显示 + 重发成功
5. 契约回归：wire payload 断言全过（kind 按模式键 / note 片段 / contact / 无 device / 字段上限）+ 线上真实 POST 一条（message 带 `e2e-verify-fax-port-<日期>` 标记）返回 202
6. 三主题下截图核对传真机均为样本配色，截图存 `.work/fax-*.png`

## 七、验证环境备忘

- 线上 Worker 在线且勿动（不部署、不改）；后台 `/stats` 需登录（邮箱密码用户自己掌握）
- Worker 契约权威依据 = 仓库内 `cloudflare-worker/index.js`（与线上同一份），zod schema 搜 `var Report =`
- 用户真机冒烟路径：双击 `工程管家.bat` → F12 控制台 `console.error('test')`。注意 404/401 不弹窗是**正确行为**（5xx-only）
- 建议在干净 worktree 里干（`git worktree add ../测试-fax -b feat/crash-fax-port origin/master`），别在主工作区（并行 Agent 太多）；完成后 PR + 等 CI 6 项全绿 + 让用户合并
- commit message：`feat(crash): pixel-faithful fax overlay ported from pomme-ui sample — 9-phase state machine, 42 sfx, full report pipeline preserved`

## 八、背景脉络（为什么是这个任务）

1. 用户的报错系统曾因"从未进 git"整体丢失，已恢复（PR #34）；
2. 恢复包文档的接口契约是错的，导致所有报告被线上 Worker 400 静默拒收——已按 Worker 真实源码修复契约（PR #44，含四区弹窗 v1）；
3. 用户给到 PommeToys 传真机参考（19 张录屏截图 + 官网），先做了"学思想"的联络函版（PR #47，已合并，即当前 master 状态）；
4. 用户随后完成 pomme-ui 逆向样本（99% 相似度）并明确要求**像素级复刻传真机本体**，策略为"先原样搬迁、后主题适配"；
5. 样本修复批次完成后任务挂起至今，本文档即交接。

## 九、协作模式要求（项目铁律，务必遵守）

用户有严格的协作模式（见 `C:\Users\Admin\.zcode\AGENTS.md`）：出方案→写 `.work/current-task.md` 简报→executor 执行→code-reviewer 审查→裁决。**本任务的简报已写好**（`E:\测试\.work\current-task.md`，内容与本文档一致），接手者按流程走即可。范围铁律：只做用户明确要求的改动，同文件顺手删改未提及内容 = 越界。每轮汇报须含：改动文件数、调用了哪些子智能体、验收过几条、剩什么没做。

---

*附：`.work/current-task.md` 是执行简报（同内容）；`.work/crash-*.png` / `.work/fax-*.png` 是历史截图留档；`crash-ui-ref/`（19 张参考图）与 `crash-report-restore/`（恢复包，内含明文 API Token，勿提交勿外传）在 E:\测试 下。*
