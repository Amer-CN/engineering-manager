# 交接文档：报错反馈系统的三个遗留任务（国内中转 / 云 Worker 源码检修 / 音效全局开关）

> 交接对象：新会话 Agent（无本会话上下文，本文档自包含）
> 写作人：ZCode 会话（报错系统恢复→契约修复→传真机移植→打磨→反馈入口的全程执行者）
> 日期：2026-08-28
> 状态：三个任务互相独立、均未开工。先读「〇」定优先级，再按任务分节执行。

---

## 〇、任务清单与开工前必读

| # | 任务 | 前置条件 | 建议顺序 |
|---|---|---|---|
| 1 | 上报地址国内中转 | **需要用户提供中转端点**（国内服务器或云函数，用户说"失效了再换"，接受临时方案） | 用户给端点即可开工 |
| 2 | 云 Worker 源码检修 | 无前置，随时可做 | 建议先做（本地源码当前是坏的，越晚修越容易被人误部署） |
| 3 | 音效全局开关 | **需要用户确认需求细节**（放哪个设置区块、要不要音量档） | 需求确认后开工 |

**工程管家项目速览**（E:\测试）：React 18 + TS 5 + Vite 前端 / ASP.NET Core .NET 8 API（localhost:5048）/ WinForms + WebView2 桌面壳。启动：双击 `工程管家.bat`（=dotnet run，无热更新，前端改完必须 `npx vite build`）。master 有分支保护：改动必须走 PR，CI 6-15 项检查全绿才能合。门禁：`node scripts/check-rules.cjs`（行数上限/玻璃白名单/hex 等硬规则）。

**协作模式（用户铁律）**：读 `C:\Users\Admin\.zcode\AGENTS.md`。每个任务：方案 → 写 `E:\测试\.work\current-task.md` 简报 → executor 子智能体执行 → code-reviewer 审查 → 裁决 → 提交推送汇报。实现类改动不许主智能体自己动手（≤2 文件的 D 类小修除外）。**主工作区常有多个并行 Agent 的未提交改动：开工前 git status 看清，只提交自己的文件；建议用 git worktree 从 origin/master 拉干净基底**（E:\测试-fax 这个 worktree 现成可用，node_modules 已装好，里面的旧功能分支已全部合并可清理）。

**报错系统现状**（三个任务的共同背景，均已上线 master）：
- 传真机 UI：`src/lib/crash/` 四件套（index.ts 上报链路 / fax-overlay.ts 传真机 DOM+9 相位状态机 / crash-fax.css 样式 / crash-fax-sfx.ts 42 音效 base64）。触发路径：报错自动弹 + 设置→关于与帮助「反馈专线」卡片手动弹
- 上报 endpoint：**硬编码**在 `src/lib/crash/index.ts` 的 `DEFAULT_ENDPOINT = 'https://engineering-manager-crash.bb531285650.workers.dev/v1/report'`
- 线上 Worker：正常服务中（202 实测），管理后台 `/stats` 需登录；契约权威依据 = 仓库内 `cloudflare-worker/index.js` 的 zod schema（搜 `var Report =`）
- 网络现实：本机直连 `.workers.dev` 有 DNS 污染（解析到非 Cloudflare 地址）+ 超时；走本机代理 `127.0.0.1:7897` 可通。**验证真实 202 时用这个代理（浏览器级，不改系统 hosts），或 mock**

---

## 一、任务 1：上报地址国内中转

**用户原话定调**：「加一层国内中转其实是最简单的事情。只是说，它有可能会有一天失效，失效的时候再重新加嘛。」

**做什么**：
1. 前端：上报 endpoint 从硬编码改为**可配置**（建议 localStorage 键 + 设置页可选输入框，默认值仍为官方 Worker 地址；用户填入中转地址后所有上报走中转）
2. 中转端点本身：**由用户提供**（国内 VPS + nginx 反代，或腾讯云/阿里云函数转发）。新会话开工前必须先问用户："你打算用什么当中转端点？给我地址。"
3. 中转服务收到 POST `/v1/report` 原样转发到 Worker 真实地址，响应原样返回。**不需要改 Worker**

**验收**：
- 设置里可填/可清空中转地址；填了之后传真机发送走中转地址（网络断言）
- 中转地址填回官方地址时行为与现在完全一致
- 通过中转的真实 POST 拿到 202（若中转端点已就绪）

**红线**：契约（composeWirePayload）、单号、复制功能、传真机 UI 一律不动——只动 endpoint 的解析层。

## 二、任务 2：云 Worker 源码检修（建议最先做）

**问题**：仓库内 `cloudflare-worker/index.js` 是**压缩成单行**的 bundle，首个 `//` 文件标记注释（如 `// node_modules/zod/v3/external.js`）之后的所有内容都被 JS 解析器当成注释——Node 加载它得到 **0 个导出**，`npx wrangler deploy` 会部署一个没有 handler 的坏 Worker。线上正在运行的那份是好的（202 实测），但本地这份"源码备份"形同虚设，且是**部署地雷**。

**来源脉络**：这个文件当初是从 Cloudflare API `content/v2` 拉回后"去掉 multipart 壳"生成的（见 `crash-report-restore/03-WORKER.md`），换行大概率在去壳时被破坏。

**修复方向（executor 按此探查后自定）**：
1. **首选**：用 Cloudflare API 重新拉取线上源码并**正确还原换行**（API Token 与 Account ID 在 `crash-report-restore/04-CREDENTIALS.md`，用户已确认可继续用；curl 命令该文档第 2 节有现成的）。重点：多部分表单解析时按 JS 语法重新断行——每个 `// path/to/file.js` 标记前应插换行，字符串/模板字面量内的 `//` 不能动（需语法感知，建议用 esbuild/acorn 解析验证）
2. 或按标记断行后用 `node --check` / `acorn-parse` 验证语法合法 + `import()` 加载断言 export 数量 > 0
3. `wrangler.toml` / `worker-settings.json` 保持不变

**验收**：
- `node -e "import('./index.js').then(m=>console.log(Object.keys(m)))"` 输出非空（default/exported fetch handler）
- `npx wrangler deploy --dry-run` 通过
- 源码 diff 与线上行为一致性：抽 `handleReport`/`Report` schema 等关键函数与检修前单行版的对应片段逐字一致（只是恢复了换行，不改任何逻辑）

**红线**：**未经用户明确点头，不得真实执行 `wrangler deploy`**（线上正在服务，03-WORKER.md 明示"不确定就不要重部署"）。检修以"本地源码可部署"为交付。

## 三、任务 3：音效全局开关

**用户原话定调**：「我感觉它的音效挺不错的，或许整个软件以后都能用得上这一套。我们可以在设置里面增加一个音效的开关按钮去开启或关闭就好了。不过这是一个大工程，后面再来改。」——本任务只做**第一步**（开关），全局音效体系是后续大工程。

**现状**：42 个音效（base64）在 `src/lib/crash/crash-fax-sfx.ts`，WebAudio 播放编排在 `src/lib/crash/fax-overlay.ts`（AudioContext 惰性创建）；设置页结构见 `src/components/features/settings/`（AppearanceSection 是外观区，可参考挂载位置）。

**做什么**：
1. 设置页新增「界面音效」开关（建议放外观区；默认开还是关——**开工前问用户**）
2. 开关状态持久化（localStorage，键名如 `ui-sfx-enabled`）
3. crash 传真机音效遵循开关：关=完全静音（动画保留）
4. 预留：音效播放收敛为一个可全局查询的小模块（为后续"全软件音效"铺路，但不实现全局音效）

**验收**：
- 开关关闭后传真机全流程（拨号/走纸/撕纸/打印）无任何声音，动画正常
- 开关状态跨会话持久
- tsc / check-rules / vite build 全绿 + Playwright 断言（关→AudioContext 不创建或 play 被门控）

---

## 四、收尾提醒

- 每个任务独立分支独立 PR（参考惯例：`feat/crash-xxx`），commit 用 conventional commits
- 完成后构建 `npx vite build` 并提醒用户重启软件验收（无热更新）
- `E:\测试-fax` worktree 的三个旧分支（feat/crash-fax-port / polish / feedback-entry）均已合并，可清理；worktree 本身可留用（node_modules 现成）
- 有疑问先问用户再动手——用户反感自作主张，但也反感该决不断（拿捏：技术方案自己定，产品/资源决策问用户）
