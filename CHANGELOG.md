# CHANGELOG

> **版本策略**: 本项目采用语义化版本 (SemVer). 规则:
> - `feat` (新功能): minor bump (0.X.0)
> - `fix` (bug 修复): patch bump (0.X.Y)
> - `refactor` (代码重构): **不 bump version**
> - `docs` / `chore` (文档/杂务): **不 bump version**
>
> **重要**: v0.74.0 → v0.75.3 期间曾过度打 tag (refactor-only sprint 也 bump). 已在 v0.75.3 重新整理 git 历史 (drop 7 个 spurious chore "bump version" commits), 重组成正确的 semver 历史.


## v0.87.0 (2026-07-28) — chore: 移除 expenses 遗留表，成本口径统一至 cost_ledger

> **范围**: 移除废弃的 expenses 半成品表与端点；成本数据统一由 cost_ledger 承载。

### 更新了什么（大白话）

#### 🔧 技术优化
- **移除废弃的“成本管理”遗留模块**：删除从未启用、无页面入口的 expenses 表及其 4 个后端端点（GET/POST/PUT/DELETE），项目成本数据统一由「成本台账」（cost_ledger）承载，消除两套数据可见性口径的分裂

#### 🐛 Bug 修复
- **成本台账快捷键失效**：修复「工人管理」与「成本台账」快捷键均为 G L 导致成本台账快捷键无法触发的问题（成本台账改为 G E）

## v0.83.0 (2026-07-24) — feat: 成本台账新表格(beta) + STT 语音知识库 + 设置页重构 + shadcn/ui 接入

> **SemVer**: minor bump (0.82.1 → 0.83.0), 多项新功能 + 大规模 UI 重构.

### 更新了什么（大白话）

#### 🚀 新功能
- **成本台账新表格（Beta）**：成本台账页新增基于 TanStack Table 的新版数据网格，支持列冻结、分组、行内编辑，通过 Beta 开关切换启用
- **语音转文字 + 知识库**：新增语音知识库模块，支持上传音频文件进行语音转写（STT），转写结果可编辑、可检索，转写文本自动入库供 AI 助手查询
- **命令面板**：新增全局命令面板（Cmd/Ctrl + K），可快速搜索和跳转功能页面
- **设置页全面重构**：设置页改为侧边栏导航布局，支持搜索快速定位设置项，分为账户、数据存储、偏好、AI 能力、关于等分区

#### ✨ 体验优化
- **shadcn/ui 组件库接入**：引入 shadcn/ui 组件体系（Dialog、Command、Textarea 等），UI 风格更统一
- **AI 助手界面优化**：AI 助手页新增 Markdown 渲染器、知识来源卡片、欢迎页，移除旧的 InsightPanel/StatOverview/CapabilityGrid
- **项目页 HeroBanner 重构**：项目列表页顶部横幅区域视觉优化

#### 🔧 技术优化
- **仓库清理**：移除误入库的大文件（ASR 模型 *.gguf/*.onnx、音频文件、E2E 构建产物），更新 .gitignore 防止再次入库
- **设计原型文档**：新增 STITCH-SCREENS.md 设计屏规格文档，涵盖画布约束、三主题锚点屏、组合屏拆分等

### 改动（开发者视角）

#### feat: 成本台账新表格（Beta）
- **`feat(cost-ledger)`** 1bd2957: TanStack Table grid 骨架
  - `CostLedgerGrid.tsx`: 新增网格组件（冻结列 + 分组 + 行内编辑）
  - `EditableCell.tsx`: 可编辑单元格组件
  - `gridColumns.ts`: 列定义
- **`feat(costledger)`** de0badb: Beta 开关
  - `CostLedgerProjectDetail.tsx`: 加 Beta 开关切换新旧表格
  - `GridStates.tsx`: 网格状态组件（空/加载/错误）
- **`fix(costledger)`** 3a64e9d: Beta 模式优先级 + 汇总失败处理对齐

#### feat: STT 语音转文字 + 知识库（M4）
- **后端** (a6b0b74 合并):
  - `SttEndpoints.cs`: STT 上传/转写/状态查询端点
  - `KnowledgeEndpoints.cs`: 知识库文档管理端点
  - `BgeEmbeddingService.cs`: BGE 向量嵌入服务
  - `KnowledgeBaseService.cs`: 知识库服务（文档分块 + 向量检索 + RAG）
  - `Stt/` 目录: STT 引擎选择器、GGUF 引擎、GPU 日志解析、安全检查、说话人分离、音频预处理等
  - migration 028-030: STT 任务表 + 知识库表 + 唯一索引
- **前端**:
  - `SpeechKnowledgePage.tsx`: 语音知识库主页面
  - `TranscriptionWorkspace.tsx`: 转写工作台
  - `TranscriptEditor.tsx`: 转写结果编辑器
  - `KnowledgeLibrary.tsx`: 知识库文档列表
  - `AudioInputCard.tsx` / `AudioRecorder.tsx`: 音频输入/录音
  - `SttJobList.tsx`: 转写任务列表
  - `knowledge-client.ts` / `stt-client.ts`: 前端 API 客户端

#### feat: 设置页重构 + shadcn/ui
- **设置页拆分**: `Settings.tsx` → 侧边栏导航 + 分区组件（AccountSection / DataStorageSection / PreferencesSection / AiCapabilitySection / AboutHelpSection）
- **SettingsSearch / SettingsNav / ShortcutsReference**: 设置搜索 + 导航 + 快捷键参考
- **shadcn/ui 组件**: `dialog.tsx` / `command.tsx` / `Textarea/` 新增
- **CommandPalette.tsx**: 全局命令面板
- **index.css**: 大幅样式更新（+370 行）

#### chore: 仓库清理
- **`chore`** a6b0b74: 24 个本地提交合并推送，清理误入库大文件
  - 移除: asr-engine 模型(*.gguf/*.onnx)、asr-test 音频、E2E bin/obj
  - 更新 .gitignore + .gitattributes 防再次入库
  - 源码完整保留，原历史存于本地标签 `backup-before-cleanup`

#### docs: 设计原型
- **`docs(stitch)`** 5a763ec, 409f83e: STITCH-SCREENS.md 设计屏规格（圆角语义分级、三主题锚点屏、组合屏拆分、1440x900 画布约束）

---

## v0.82.1 (2026-07-05) — perf: 启动提速（Splash 去死等 + 后端并行化）

> **SemVer**: patch bump (0.82.0 → 0.82.1).

### 更新了什么（大白话）

#### ✨ 体验优化
- **启动速度大幅提升**：去掉了启动动画的固定等待时间（从 2.8 秒缩短到 0.8 秒），动画还在、只是快多了
- **窗口打开更快**：以前双击后要先等后端启动完才弹窗口，现在窗口和后端同时启动，省掉了一段干等时间
- **启动中不再白屏**：后端启动慢时窗口会显示"正在启动…"带 Logo 动画的占位页，不再是空白窗口

### 改动（开发者视角）

- **`perf(splash)`** c2eae25: 前端 Splash 去死等
  - `SplashParticles.tsx`: `fadeTimer` 2200→500ms, `completeTimer` 2800→800ms
  - `App.tsx`: `SplashScreen` 从 `lazy()` 改为静态 `import`，去掉 `<Suspense>` 包裹

- **`perf(startup)`** ac85b53: 后端启动并行化
  - `EntryPoint.cs`: 删除 `for (int i = 0; i < 60; i++)` 同步死等 API 轮询段（500ms × 60 = 30s 兜底），窗口立刻打开
  - `MainWindow.cs` `OnLoad`: `EnsureCoreWebView2Async` 后先 `NavigateToString(WarmingHtml)` 显示品牌化"正在启动…"占位页，再 100ms 粒度轮询 `/api/health`（15s 兜底），就绪后 `Navigate(frontendUrl)` 切真实页面

### 红绿灯

- dotnet build: 0 错误
- dotnet test: 174/174 通过
- npm check: BUILD PASSED
- tsc: 0 error
- vite build: 8.08s

---

## v0.82.0 (2026-07-04) — feat: 卸载器合并 + 安装包体积优化

> **SemVer**: minor bump (0.81.7 → 0.82.0).

### 更新了什么（大白话）

#### 🚀 新功能
- **支持从 Windows「程序和功能」卸载**：现在工程管家会像正常软件一样出现在「控制面板 → 程序和功能」列表里，可以从那里一键卸载
#### ✨ 体验优化
- **卸载更干净彻底**：点卸载后程序会先把自己复制到临时目录再运行删除，避免"程序删不掉自己"的问题；数据存放文件夹永远不会被删
- **安装包体积优化**：合并卸载器到主程序，安装包从 ~198MB 降至 ~160MB

---

## v0.81.7 (2026-07-02) — fix: 设置页下载更新共享全局状态,显示进度条

> **SemVer**: patch bump (0.81.6 → 0.81.7).

### 更新了什么（大白话）

#### 🐛 Bug 修复
- **设置页下载更新无进度条**：根因是设置页和顶部通知条各自独立管理更新状态，互不共享。现已改为全局共享状态，在设置页下载更新时也能看到进度条和暂停/取消按钮

### 改动（开发者视角）

- **`fix(updater)`** 9aa53b0: 根因 AboutSection 与 UpdateBanner 各自独立调用 `useUpdater()`，状态不共享 → 改为 Context Provider 单例模式，`App.tsx` 包裹 `UpdaterProvider`；`AboutSection` 增加完整进度条 + 暂停/取消按钮

---

## v0.81.6 (2026-07-02) — feat: 下载更新支持暂停/继续

> **SemVer**: patch bump (0.81.5 → 0.81.6).

### 更新了什么（大白话）

#### ✨ 体验优化
- **下载更新支持暂停/继续**：下载进度条现在有暂停和取消两个按钮（之前两个都是取消，重复了），暂停后可以继续下载，利用断点续传不丢进度

### 改动（开发者视角）

- **`feat(updater)`** 2e31667: 进度条原来两个按钮都是取消（重复）→ 改为「暂停按钮(保留 .part 文件) + 取消按钮」，暂停后走 HTTP Range 断点续传继续下载

---

## v0.81.5 (2026-07-02) — fix: 三管齐下修复更新后版本号不刷新

> **SemVer**: patch bump (0.81.4 → 0.81.5).

### 更新了什么（大白话）

#### 🐛 Bug 修复
- **更新后版本号仍显示旧版**：三个根因一次性修复：①安装器更新时自动杀旧进程确保 C# 程序文件被正确覆盖；②版本号同步提前到编译之前解决 exe 版本滞后问题；③WebView2 改用版本化缓存目录，每个版本独立缓存，从根源杜绝旧前端残留

### 改动（开发者视角）

- **`fix(installer)`** 148caf2: 三管齐下
  1. `build-installer.bat`: `sync-version` 提前到 `dotnet publish` 之前（修 exe 版本滞后）
  2. `MainWindow`: 版本化缓存目录 `engineering-manager-webview2-v{version}`（从 `dist/index.html` 读版本）
  3. `InstallerService`: 更新模式先杀旧进程再复制文件（修 exe 被锁无法覆盖）

---

## v0.81.4 (2026-07-02) — fix: 启动时按版本变化清理 WebView2 缓存

> **SemVer**: patch bump (0.81.3 → 0.81.4).

### 更新了什么（大白话）

#### 🐛 Bug 修复
- **更新后前端版本号和日志仍显示旧版**：根因是 WebView2 浏览器内核缓存了旧前端文件，现在软件启动时检测版本变化会自动清理缓存，确保加载最新界面

### 改动（开发者视角）

- **`fix(webview2)`** 144d849: 根因 WebView2 HTTP 缓存目录 `%TEMP%\engineering-manager-webview2` 装新版后仍留旧前端 → `MainWindow.OnLoad` 比对程序集版本 vs 缓存目录里的 `.app-version` 标记，不同则整个删除重建

---

## v0.81.3 (2026-07-02) — fix: 更新后前端版本号/日志不刷新

> **SemVer**: patch bump (0.81.2 → 0.81.3).

### 更新了什么（大白话）

#### 🐛 Bug 修复
- **更新后版本号和更新日志不刷新**：安装更新后打开软件发现版本号还是旧的、更新日志也没变？这是浏览器缓存了旧页面导致的，现在装更新时会自动清理旧文件，服务器也加了禁止缓存

### 改动（开发者视角）

- **`fix(update)`** f21ad82:
  - `Program.cs`: `index.html` 加 no-cache 头防 WebView2 缓存
  - `InstallerService.cs`: 更新模式先清理旧 `dist/` 目录
  - GitHub Release notes v0.81.1 / v0.81.2 格式修正为分组格式

---

## v0.81.2 (2026-07-02) — fix: P0/P1 自动更新链路全面加固

> **SemVer**: patch bump (0.81.1 → 0.81.2)，自动更新链路多项 bug 修复 + 加固。

### 更新了什么（大白话）

#### 🐛 Bug 修复
- **下载完成后文件被占用导致崩溃**：杀毒软件短暂锁住文件时，下载收尾的改名操作会失败崩溃，现在会自动重试几次
- **快速连点更新按钮启动多个下载**：现在同一个下载只会跑一个，重复点击不会冲突
- **代理服务器只连不回时下载永久卡死**：加了 10 秒连接超时，超时自动切到下一个下载源
- **健康检查接口版本号不同步**：改成自动读程序集版本，不再手动维护

#### ✨ 体验优化
- **下载可以取消了**：下载过程中可以随时点取消，不用干等

#### 🔧 技术优化
- **防止下载多写垃圾数据**：源服务器多吐的尾部数据会被裁掉，保证文件大小精确

### 改动（开发者视角）

- **`fix(update)`** 447b366:
  - P0-1: 并发闸 + `FinalizeWithRetry`（`.part→.exe` 改名重试）+ `flushToDisk`
  - P0-2: `SendAsync` 响应头 10s 超时
  - P0-3: `/api/health` 版本号读程序集
  - P1-1: 防 overshoot 裁剪写入
  - P1-2: 可取消下载（后端 + 前端）
  - P1-3: 新增 6 个测试

### 红绿灯

- dotnet test: 174/174 通过

---

## v0.81.1 (2026-07-02) — fix: 死链代理 + proxies 前缀自动化

> **SemVer**: patch bump (0.81.0 → 0.81.1)。

### 更新了什么（大白话）

#### 🐛 Bug 修复
- **自动更新下载链接失效**：之前用的两个下载加速链接挂了，现在去掉了，换成了新的加速源

#### 🔧 技术优化
- **下载加速源改为自动管理**：以前每个版本的下载链接都要手写一遍，现在只需要维护加速地址前缀，版本号自动拼接，发版更省事了

### 改动（开发者视角）

- **`fix(update)`** e6553af:
  - 去掉 `ghproxy.homeboyc.cn` / `github.akams.cn` 两个失效代理
  - `urls`(完整 URL 数组) 改为 `proxies`(前缀数组)，客户端运行时拼接
  - manifest 生成器自动写入 `proxies`，版本号只出现在 `url` 一处
  - `UpdateBanner` `gray-*` 修复为 `slate-*`
  - `build-installer.bat` 版本读取修复（`node -p` 替代 `findstr`）

### 红绿灯

- dotnet test: 168 通过

---

## v0.81.0 (2026-07-02) — fix: 数据存储路径 + 默认密码提示 + 安装器修复

> **SemVer**: minor bump (0.80.0 → 0.81.0), 多项 bug 修复 + 体验改善.

### 更新了什么（大白话）

#### 🐛 修了一堆跟「数据存储路径」相关的 bug
- **安装器选了 D 盘，装完还是 C 盘**：安装器界面选数据存储路径时，默认路径不显示（空白）；手动改了路径（比如 D:\工程管家数据），安装完打开软件发现还是默认的 C 盘路径 —— 这个 bug 修了
- **根因**：安装器前端代码在点击「开始安装」时把 C# 传过来的默认路径覆盖成了空字符串；后端读 config.json 时用了错误的类型转换（`JsonElement` 当 `string` 判断），导致永远读不到用户设的路径
- **登录界面设置里改数据路径也没用**：改完点保存没反应，因为后端鉴权拦截了未登录请求 + 前端没检查返回值就关了弹窗 —— 都修了

#### 🔐 默认密码提示改密后终于会消失了
- **改完密码提示还在**：admin 用默认密码登录后会出现「正在使用默认密码」的提示，但改完密码重新登录提示还在 —— 因为数据库里的 `is_default_password` 标记在改密时没清零，现在修了
- **提示不再挤位置**：默认密码提示从内嵌横幅改成悬浮在顶部居中的浮动通知条，不再挤压软件界面布局

#### 🔧 其他修复
- **安装器加了诊断日志**：安装过程会写日志到 `%TEMP%\工程管家-installer-debug.log`，方便排查问题
- **健康检查版本号对齐**：`/api/health` 接口里写死的 `0.72.0` 终于对齐到实际版本了
- **config.json 合并写入修复**：GPU 加速、读取模式等配置写入时不再丢失已有键

### 改动（开发者视角）

#### 🐛 Bug 修复
- **SystemEndpoints GET /api/config**: `JsonSerializer.Deserialize<Dictionary<string, object>>` 返回 `JsonElement` 而非 `string`，`dp is string` 恒 `false` → 改用 `JsonDocument.Parse` + `dp.GetString()`
- **SystemEndpoints 4 处合并写入**: `PUT /api/config/data-path` / `PUT /api/config/gpu-acceleration` / `PUT /api/sqlite/read-mode` 同步修复，合并写入改用 `JsonDocument.EnumerateObject()` + `Clone()`
- **GlobalAuthMiddleware**: 白名单放行 `PUT /api/config/data-path`（登录前可配置数据路径）
- **SystemEndpoints PUT /api/config/data-path**: 鉴权条件化（未登录允许，已登录需 admin）
- **LoginSettingsModal**: 增加返回值检查 + 错误/成功反馈消息 + 重启提示
- **installer App.tsx**: `handleBegin` 不再覆盖 C# init 下发的 `defaultDataPath`；删除无用的 `getDefaultDataPath()` 函数
- **AuthEndpoints**: `POST /api/auth/reset-password` 和 `PUT /api/users`（带 password 分支）追加 `is_default_password=0`；加不变量注释
- **App.tsx**: 默认密码提示从内嵌横幅改为 `fixed` 悬浮浮动条，`flex justify-center` 居中
- **ApiTestBase**: 测试环境补 `is_default_password` 列（EnsureTables 在测试不跑，预存 bug）

#### 📝 约定
- **不变量**: 任何写入 `password_hash` 的 UPDATE 必须同时 `is_default_password=0`（AuthEndpoints.cs 两处注释标注）

### 红绿灯

- dotnet build: 0 错误
- dotnet test: 158/158 通过
- tsc: 0 错误
- vite build: 成功

---

## v0.80.0 (2026-06-30) — feat: 应用内自动更新 + 安全加固

> **SemVer**: minor bump (0.79.0 → 0.80.0), 新增功能（应用内自动更新）+ 安全重构.

### 更新了什么（用户视角）

#### 🚀 应用内自动更新
- **发现新版本自动提示**：登录后顶栏显示「发现新版本」提示条，点击「立即更新」即可升级
- **下载有进度条**：实时显示下载百分比、已下载大小、下载速度
- **下载完自动装包**：下载完成 → SHA256 校验 → 自动启动安装器 → 覆盖安装 → 自动重启，全程无需手动操作
- **强制更新**：关键安全更新时会全屏遮罩，无法跳过，确保所有人都及时升级
- **多源下载**：优先从国内 CDN 下载，CDN 不可达时自动回退到 GitHub，国内用户也能快速下载

#### 🔒 安全加固
- **个人信息脱敏更精细**：工人的地址字段现在也会脱敏（之前有漏洞），不同角色看到的信息范围更精确
- **权限查询更安全**：数据库查询权限过滤从硬编码改为结构化枚举，减少越权风险
- **查询安全增强**：AI 助手的数据库查询引擎修复了 3 个安全问题（函数误杀、LIMIT 截断错位、子查询提示不准）

#### 🛠️ 其他改进
- **版本号全局统一**：所有地方显示的版本号现在都从同一个来源读取，不会再出现版本号不一致的情况
- **安装包文件名改为英文**：避免中文文件名在 URL 中编码导致的下载问题

### 改动（开发者视角）

#### 🚀 版本自动更新系统（核心新功能）
- **三环交付**: 检查更新端点 + 前端 UpdateBanner + 下载/SHA256 校验/装包重启完整闭环
- **版本单源**: `scripts/sync-version.mjs` 从 `package.json.version` 同步到 `.csproj`/`version.ts`/`installer.iss`
- **多源 manifest fallback**: `UpdateService` 支持 `ManifestUrls[]` 按序尝试（GitHub Release + CDN）
- **增量 SHA256**: `IncrementalHash` 边下边算，下完即校验，不留 `.part` 半成品
- **实时进度反馈**: SSE 推送下载进度（百分比+MB+速度），进度条 UI
- **强制更新遮罩**: `minForced > current` 时全屏不可关 modal
- **manifest 自动化**: `scripts/make-manifest.mjs` 发版时自动计算 SHA256+size，支持 GitHub Release URL 模板
- **启动防呆**: `ManifestUrls` 含 `example.cn` 时 Console.Error 警告

#### 🔒 安全重构
- **D-2 PII 字段权限分级**: `CanReadPii(bool)` → `PiiAccess` 结构体（per-field 控制），修复 `workers.address` 未脱敏漏洞
- **D-1 DataScope 枚举化**: `@IsAdmin` 布尔字面量 → `DataScope` 三档枚举（All/AuthorizedProjects/SelfOnly），SQL 不再出现 `@IsAdmin`
- **L-1/L-2/L-3 SafeQueryValidator**: REPLACE 标量函数放行 + EnsureLimit 修复 + 子查询提示语更新
- **REST 端点 PII 对齐**: `/api/workers`/`/api/project-workers` 的 PII 字段走 `MaskPiiField(piiAccess)`
- **退役 `CanReadPii`**: 已无调用点，删除死代码

#### 🛠️ 技术改进
- **版本号同步**: `src/version.ts`/`installer/package.json`/`Login.tsx` fallback 全部对齐到 `package.json.version`
- **安装包 ASCII 名**: `installer.iss` OutputBaseFilename 改为 `EngineeringManager-Setup-{VERSION}`
- **Inno Setup 自动版本**: `#include "installer\version.iss"` + `CloseApplications=yes`

### 红绿灯

- dotnet build: 0 错误
- dotnet test: 158/158 通过
- tsc: 0 错误
- vite build: 成功

---

## v0.79.0 (2026-06-29) — feat: AI 助手安全增强 + runSafeQuery + AST 引擎 + 模型路由

> **SemVer**: minor bump (0.78.3 → 0.79.0), 新增功能（SSE 流式 / runSafeQuery / AST 引擎 / 模型路由）+ 安全修复.

### 改动

#### 🔒 安全修复（P0）
- **getWorkers/getInventory 权限串失效**: 补 labor:read / inventory:read 权限，工具不再对所有角色不可用
- **getDashboardStats 跨公司越权**: 注入行级过滤，非 admin 只看到自己的数据
- **getCostSummary SQL 拼接 + 越权**: 换用参数化查询 + 行级过滤
- **getInventory 无行级隔离**: 追加 uid/isAdmin 参数和 WHERE 过滤

#### 🤖 AI 助手增强（P1-P2）
- **SSE 流式输出**: POST /api/agent/chat/stream，工具执行进度 + 逐字回复
- **runSafeQuery 受限查询**: 10 项安全护栏（AST 解析 + 列白名单 + 用户过滤 + LIMIT + dry-run + 审计）
- **语义层注入**: 系统提示补术语映射/字段说明/工具指引
- **模型路由层**: IModelRouter 接口 + 配置驱动换模型

#### 🛠️ 技术重构
- **SafeQueryValidator AST 升级**: 从正则改为 SqlParserCS AST 解析，支持 JOIN/子查询
- **LlmConfigResolver**: 打破循环依赖，依赖方向单向无环
- **修复安装器路径选择**: window.chrome.webview.addEventListener 代替 window.addEventListener

#### 🐛 Bug 修复
- 新建部门失败（DepartmentDto Positions 数组类型不匹配）
- 编辑部门缺 PUT 接口
- ORDER BY/HAVING 别名误杀（投影别名放行）
- TemplateCard variables 非数组崩溃
- LaborTeamManager 缺 key prop

### 红绿灯

- dotnet build: 0 错误
- tsc: 通过
- vite build: 通过

---

## v0.78.3 (2026-06-26) — feat: Agent AI 助手初版 + R9-R16 安全/质量 Sprint

> **SemVer**: patch bump (0.78.2 → 0.78.3), 新功能（AI 助手）+ 大量重构(不 bump).

### 改动

- **Agent AI 助手**: 13 个只读查询工具 + 对话管理 + LLM 三级兜底(DPAPI→环境变量→内置 Agnes)
- **5 个安全修复**: 登录友好提示、数据回滚/审计日志/审计明细页面崩溃修复
- **代码重构 R9-R16**: 300+ 处 as any 清理、hooks 拆分、Button 样式统一、颜色 hex→Tailwind 常量
- **新登录页**: Tempest 风格粒子动画 + 三种主题

---

## v0.78.2 (2026-06-24) — refactor: R8 Sprint — 样式统一 + 颜色常量 + 文件拆分

> **SemVer**: patch bump (0.78.1 → 0.78.2), 重构不 bump 但跨 Sprint 需要区分基线.

### 改动

- **98 个文件 btn 样式统一**: 手写 bg-white rounded-xl shadow-sm → <Card> 组件 (R8-49)
- **颜色常量提取**: 20 个分析器中的 inline hex → 命名的 COLORS 常量 (R6+R4)
- **文件拆分**: 49 个超 250 行的大文件拆成 types/loaders/actions 子模块 (R3+R5)
- **清理**: 1942 行历史 prototype HTML 设计稿 + 调试日志 batch 清理
- **vite build 通过**: 11.27s

---

## v0.78.1 (2026-06-21) — fix: PII re-encrypt chunked + batch UPDATE

> **SemVer**: patch bump (0.78.0 → 0.78.1), 性能优化, 不破坏 API.

### 改动

- **PiiReencryptWorker.cs**: chunked SELECT (每批 500 行, WHERE id > lastId LIMIT 500) + batch UPDATE (每 50 行事务提交, 减少 WAL 写入)
- 进度更新粒度: 每 50 行 (前端 3s 轮询可见变化)

### 红绿灯

- dotnet build: 0 错误 0 警告
- dotnet test: 122/122 通过
- npm check: BUILD PASSED
- tsc: 0 error
- vite build: 12.38s

---

## v0.78.0 (2026-06-21) — feat: PII 后台 re-encrypt worker

> **核心范围**: v0.76.0 PII 多 key 轮换的续作 — admin rotate key 后, 可一键用新 active key 重新加密所有 13 个 _enc 列.
> **SemVer**: minor bump (0.77.2 → 0.78.0), 新功能 (后台 worker + 2 endpoint + 前端 UI).

### 改动 (1 feat, 共 6 项)

- **migration 026**: `pii_reencrypt_status` 单行表 (进度持久化, 支持重启继续)
- **PiiReencryptWorker.cs**: 后台异步 worker, 13 列顺序 Decrypt→Encrypt→UPDATE, 单行失败不中断, 每 50 行更新进度, idempotent (同 key 跳过)
- **PiiKeyEndpoints.cs**: `POST /api/admin/pii/reencrypt` (启动 worker) + `GET /api/admin/pii/reencrypt/status` (进度轮询), admin-only + audit log
- **Program.cs**: `AddSingleton<PiiReencryptWorker>()` DI 注册
- **SettingsPiiKeySection.tsx**: "立即 re-encrypt PII" 按钮 + 进度条 + 3s 轮询
- **PiiReencryptWorkerTests.cs**: 5 个 unit tests (基本流程 / idempotent / 失败继续 / GetStatus / 并发保护)

### 红绿灯

- dotnet build: 0 错误 0 警告
- dotnet test: 122/122 通过 (含 5 新 reencrypt tests)
- npm check: BUILD PASSED (67 软警告)
- tsc: 0 error
- vite build: 11.91s

---

---

## v0.77.2 (2026-06-21) — fix: P1-3 ex.Message 泄露修复 (18 处) + enterprise query 假成功 (2 处)

> **核心修复**: v0.77.1 OCR 假成功后, P1-3 ex.Message 泄露残留还在 4 文件 18 处. 同时 enterprise query (OcrEndpoints L413/L437) 还有 2 处假成功.
> **SemVer**: patch bump (0.77.1 → 0.77.2).

### 改动 (1 fix + 1 test)

- **`fix(P1-3 ex.Message 泄露)`**: 4 文件 18 处用 `Common.Sanitize(ex.Message)` 替换直接 `ex.Message`
  - `AuthEndpoints.cs` (5 处): 3 Common.Fail + 2 errors.Add (backfill-pii admin tool)
  - `UserPreferencesEndpoints.cs` (2 处): 2 Common.Fail
  - `SystemEndpoints.cs` (11 处): 3 Common.Fail + 1 `error=ex.Message` (db-status admin) + 7 errors.Add (PII stats + migration)
  - **`OcrEndpoints.cs` L437 catch** → `CatchOcrError("ocr-company-query", ex)` (真 500 + 脱敏)
- **`fix(OcrEndpoints enterprise query)`**:
  - **L413** validation: `Results.Ok(new {success=false, ...})` → `Common.Fail("请输入企业名称", 400)` (真 400)
  - **L437** catch: `Results.Ok(new {success=false, error=$"...{ex.Message}"})` → `CatchOcrError` (真 500 + 脱敏)

### P1-3 修复模式

**修复前**:
```csharp
catch (Exception ex) {
    return Common.Fail($"参数解析失败: {ex.Message}");  // 直接泄露内部堆栈/路径
}
```

**修复后**:
```csharp
catch (Exception ex) {
    return Common.Fail($"参数解析失败: {Common.Sanitize(ex.Message)}");  // 脱敏: 移除路径, 截断 200 字符
}
```

`Common.Sanitize()` (v0.76.0 P1-3 引入) 移除 Windows 绝对路径, 截断到 200 字符, 防泄露内部实现细节.

### 测试 (PiiLeakTests.cs 9 个新 tests)

- `EndpointFile_AllRawExMessageAreInServerSideLogs[3 files]` (Theory × 3 = 3): 验证 response body 不再 raw `{ex.Message}`, 只允许 server-side `Console.Error.WriteLine` 用 raw
- `EndpointFile_HasCommonSanitizeAroundExMessage[3 files]` (Theory × 3 = 3): 验证每个文件至少 1 处 `Common.Sanitize(ex.Message)`
- `OcrEndpoints_CompanyQuery_ValidationReturns400` (Fact): L413 真 400
- `OcrEndpoints_CompanyQuery_CatchReturns500` (Fact): L437 真 500
- `OcrEndpoints_File_NoLongerContainsEnterpriseQueryFakeSuccess` (Fact): 老假成功模式不存在

### 测试结果

- 后端 build: 0 错误
- 后端 tests: **117/117 通过** (108 旧 + 9 PiiLeakTests)
- 前端 check: BUILD PASSED (66 历史软警告)
- tsc: 0 errors
- vite build: 14.77s

### P1 闭环进度

| P1 项 | 状态 |
|---|---|
| P1-1 静默吞错 (8 OCR 假成功) | ✅ v0.77.1 |
| P1-1 静默吞错 (2 enterprise query 假成功) | ✅ v0.77.2 |
| P1-3 ex.Message 泄露 (v0.77.1 范围 OCR 8 处) | ✅ v0.77.1 |
| P1-3 ex.Message 泄露 (其他 18 处) | ✅ v0.77.2 |

**P1 全部闭环** ✅

### v0.78.0 入口

按 cloud-sync-design.md §阶段 2:
1. CloudSyncHelper 统一入口
2. JWT refresh token + device 注册 API
3. sync worker 推/拉
4. 冲突检测 UI
5. PII 跨设备兼容
6. 限流 + 审计 + 监控

---
## v0.77.1 (2026-06-21) — fix: OCR 8 处假成功 → 真 500 (P1-1 闭环)

> **核心修复**: 累计待办 #5 OCR 8 处假成功 → P1-1 安全闭环 (v0.76.0 累计待办列表 "下次 sprint 候选" 里记的 OCR 8 处).
> **SemVer**: patch bump (0.77.0 → 0.77.1), 因为是 bug 修复.

### 改动 (1 fix + 1 test)

- **`fix(OCR 假成功)`**: OcrEndpoints.cs 8 处 catch 块从 HTTP 200 + success=false 改成 HTTP 500
  - 新增 `CatchOcrError(endpointName, ex)` private static helper
    - 服务端: `Console.Error.WriteLine` log 完整 ex.Message (调试用)
    - 客户端: 友好提示 ("百度OCR请求超时" / "百度OCR识别失败，请稍后重试或检查图片质量")
    - HTTP 状态码: 500 (不再是假成功 200)
  - 8 个 OCR 端点 catch 块替换:
    - `/api/ocr/id-card` (L28-69)
    - `/api/ocr/invoice` (L74-127)
    - `/api/ocr/bank-card` (L132-164)
    - `/api/ocr/business-license` (L169-205)
    - `/api/ocr/bank-receipt` (L210-252)
    - `/api/ocr/permit` (L257-290)
    - `/api/ocr/bank-statement` (L295-344)
    - `/api/ocr/general-receipt` (L349-385)
  - **未修** (留后续 sprint): L399 enterprise query validation (400 应取代 200), L423 enterprise query catch (500 应取代 200)
- **`test(OCR 修复验证)`**: OcrEndpointsTests.cs 5 个新 tests
  - `CatchOcrError_HelperMethodExists` (反射验证 helper 存在)
  - `CatchOcrError_Returns500_OnNetworkTimeout` (超时异常 → 500)
  - `CatchOcrError_Returns500_OnGenericException` (通用异常 → 500)
  - `OcrEndpoints_File_NoLongerContainsFakeSuccessInCatchBlocks` (静态分析: 文件中 `Results.Ok(new { success = false` <= 2)
  - `OcrEndpoints_File_AllEightCatchBlocksReplaced` (静态分析: 8 个 `CatchOcrError("ocr-X", ex)` 都在)

### 测试结果

- 后端 build: 0 错误
- 后端 tests: 108/108 通过 (103 旧 + 5 新 OCR)
- 前端 check: BUILD PASSED (66 历史软警告)
- tsc: 0 errors
- vite build: 18.50s

### 修复前后对比

**修复前 (假成功, P1-1 安全问题)**:
\`\`\`
catch (Exception ex)
{
    return Results.Ok(new { success = false, error = ex.Message.Contains("超时") ? "..." : "百度OCR请求失败: {ex.Message}" });
}
\`\`\`
- HTTP 状态码: 200 (前端误以为是成功)
- 错误信息: 直接泄露 ex.Message (P1-3 信息泄露)

**修复后 (真 500)**:
\`\`\`
catch (Exception ex)
{
    return CatchOcrError("ocr-id-card", ex);
}
\`\`\`
- HTTP 状态码: 500 (前端正确处理错误)
- 错误信息: 脱敏后友好提示, 不泄露内部细节

### v0.78.0 入口

按 cloud-sync-design.md §阶段 2 范围:
- CloudSyncHelper (统一 version 自增 + sync_queue 写)
- JWT refresh token + device 注册 API
- sync worker 推/拉
- 冲突检测 UI
- PII 跨设备兼容
- 限流 + 审计 + 监控

### 不在本 sprint 范围 (后续候选)

- enterprise query L399/L423 修复 (同上模式, 留 v0.77.x patch)
- PII 后台 re-encrypt worker (v0.76.0 #5 续)
- react-query 渐进迁移 (v0.76.0 #3 续)
- SettingsChangelog 拆分

---

## v0.77.0 (2026-06-21) — feat: cloud sync schema 准备 (阶段 1)

> **核心范围**: cloud sync 调研 (累计待办 #4) 的 v0.77.0 阶段 1 实施 — 只做 schema 准备, 不实现 sync 推/拉/冲突逻辑.
> **完整方案**: `docs/design/cloud-sync-design.md` (245 行, 4 方案对比 + 推荐 E=B+D 混合, 3 阶段路线).
> **SemVer**: minor bump (0.76.0 → 0.77.0), 因为加 5 列 + 2 新表 = 新功能, 但不破坏现有 API (DEFAULT 值保证兼容).

### 改动 (1 feat + 2 migration, 共 3 项)

- **`feat(cloud sync schema)`**: 27 业务表加 5 列 + 2 新基础设施表
  - migration 024_AddCloudSyncColumns.sql (233 行):
    - 27 业务表 (按 user-dim P0-4 闭环清单): projects / project_members / project_workers / income_contracts / expense_contracts / agreement_contracts / wages / attendances / members / workers / partners / supervisors / inventory_items / inventory_transactions / materials / expenses / drawings / invoices / payment_records / cost_ledger / settlements / cost_ledger_batches / worker_teams / departments / contract_templates / salary_history / wage_history
    - 每表加 5 列: `version` (INTEGER NOT NULL DEFAULT 1, 乐观锁 CAS) / `last_modified_by_device` (TEXT, 多设备追踪) / `last_modified_at` (TEXT, sync 面时间戳) / `sync_status` (TEXT NOT NULL DEFAULT 'synced', 程序层约束 'synced'/'pending'/'conflict') / `conflict_marker` (TEXT, 阶段 2 冲突检测用)
    - 每表加 idx_<table>_version 索引 (高频 CAS 查询)
  - migration 025_AddSyncQueueAndDevices.sql (58 行):
    - `sync_queue` 表 (本地待同步写操作队列): id / table_name / row_id / operation / payload (JSON) / device_id / user_id / version / enqueued_at / attempt_count / last_error / last_attempt_at + 3 索引
    - `device_registrations` 表 (多设备注册): device_id (主键) / user_id / device_name / device_type / os_info / app_version / registered_at / last_seen_at / refresh_token_hash / refresh_token_expires_at / is_active + 2 索引
  - 60 个新 unit tests (CloudSyncSchemaTests.cs):
    - 4 Facts (sync_queue / device_registrations 表 + 索引存在性)
    - 27 × 2 = 54 Theory (每张业务表都有 5 列 + version 索引)
    - 2 Facts (INSERT 默认 version=1 sync_status='synced' / sync_queue 可写可查)

### 测试结果

- 后端 build: 0 错误
- 后端 tests: 100/100 通过 (40 旧 + 60 新 CloudSyncSchemaTests)
- 前端 check: BUILD PASSED (66 历史软警告)
- tsc: 0 errors
- vite build: built in 18.67s

### 设计决策

- **不做的事** (留到 v0.78.0 阶段 2):
  - 33 业务端点的 INSERT/UPDATE 加 version 自增 (设计文档列在阶段 1 但本 sprint 范围收窄, 留到阶段 2 改 endpoint 时一起做)
  - JWT refresh token (阶段 2 设备注册后才有意义)
  - sync worker 推/拉 (阶段 2)
  - 冲突检测 UI (阶段 2)
- **DEFAULT 值策略**: version=1, sync_status='synced', last_modified_at=NULL 让现有代码完全无感 — INSERT 不写这些列也能 work, 老数据迁移零成本
- **程序层约束**: sync_status 不加 SQLite CHECK 约束 (避免老版本 SQLite ALTER ADD COLUMN 失败), 由 C# CloudSyncHelper 强制取值 (阶段 2)
- **索引策略**: 只加 version 单列索引 (CAS 高频), 暂不加 sync_status / last_modified_at 索引 (阶段 2 有 sync worker 后再加)

### 升级路径 (v0.76.0 → v0.77.0)

1. 重启 C# 服务, 自动跑 migration 024 + 025
2. 27 张业务表加 5 列 (DEFAULT 1 / NULL, 不破坏现有数据)
3. 新表 `sync_queue` + `device_registrations` 建好, 暂时为空 (阶段 2 才写)
4. 前端无需改动 (GET 端点自动返新列, 但前端暂未展示 version / sync_status)

### 已知风险 + 缓解

| 风险 | 严重度 | 缓解 |
|---|---|---|
| 27 表 × 5 列 ALTER TABLE 在大库上慢 | 🟢 低 | ALTER TABLE 不锁表, SQLite 单文件 ALTER ADD COLUMN 微秒级 |
| DEFAULT 1 让所有现有行 version=1 | 🟢 低 | 这是预期行为, 阶段 2 sync 不会误判冲突 (本地 vs 云端都是 1) |
| sync_status='synced' 默认 | 🟢 低 | 阶段 2 sync worker 才会把 pending 行推完后改回 synced |

### v0.78.0 阶段 2 入口

- 33 业务端点 INSERT/UPDATE 改用 CloudSyncHelper (version 自增 + last_modified_at 注入)
- CloudSyncHelper.WriteAsync(db, table, op, rowId, dto) 统一入口
- sync worker: 定时 SELECT sync_queue WHERE attempt_count < 3 → POST 云端 → DELETE 成功行
- 设备注册 API: POST /api/devices/register → 生成 device_id (32 hex) + refresh_token
- 冲突检测: 拉云端时 version 比本地旧 → 弹窗让用户选 (本地 / 云端 / 字段合并)

### 阶段 1 收尾 (commit b662814): 33 业务端点 INSERT/UPDATE 加 version 自增

- **`feat(endpoint version 自增)`** b662814: 12 端点文件 × 80 SQL 修改
  - UPDATE 端点 (40 处): SET 末尾 WHERE 前加 `, version=version+1, last_modified_at=@Now`
  - INSERT 端点 (40 处): columns 末尾加 `last_modified_at`, VALUES 末尾加 `@Now`
  - 现有客户端调用零改动 (version DEFAULT 1, sync_status DEFAULT 'synced')
  - 端点文件: AuthEndpoints / ContractEndpoints / CostLedgerEndpoints / ExpenseEndpoints / FileEndpoints / InventoryEndpoints / InvoiceEndpoints / MemberEndpoints / PartnerEndpoints / ProjectEndpoints / ProjectWorkerMiscEndpoints / WageEndpoints
- **`test(endpoint e2e)`** 3 个新 unit tests (CloudSyncEndpointTests.cs):
  - Projects_InsertAndUpdate_IncrementsVersionAndSetsLastModifiedAt (POST → GET v=1 → PUT → GET v=2 → PUT → GET v=3)
  - Contracts_Update_IncrementsVersion (raw SQL v=1 → 2)
  - Members_Insert_SetsLastModifiedAtToCurrentTime (INSERT 时 last_modified_at 被注入)
- **测试**: 100/100 → 103/103 通过
- **不做** (留 v0.78.0 阶段 2):
  - UPDATE 加 CAS WHERE version=@OldVersion (客户端暂不传 oldVersion)
  - last_modified_by_device 注入 (阶段 2 设备注册后才有 device_id)
  - JWT refresh token (阶段 2 sync worker 推送时才有意义)



---


## v0.76.0 (2026-06-20) — 7 项累计待办集中 release: PII 防护强化 + react-query 接入 + PII 密钥轮换

> **核心原则**: 本次 release 是 v0.75.3 era 之后 7 个跨 sprint 累计待办的集中收尾, 每项单独 commit, 一起 bump 到 v0.76.0 (minor, 因为含 5 个 feat).

### 改动 (5 feat + 1 docs + 1 refactor, 共 7 commits)

- **`feat(PII 解密 ACL)`** 9c9248a: PII 字段级访问控制 (累计待办 #1)
  - `CurrentUser.CanReadPii`: 检查角色, admin/manager/accountant 可读 PII
  - `Common.MaskPiiField`: 统一脱敏入口 (idCard/phone/bankAccount 按字段类型)
  - 改 GET /api/members, /api/members/{id}, /api/workers 加 PII ACL
  - 3 个新 unit tests (29/29 总通过 → 32/32)

- **`feat(MaskContext 离线优先)`** bb3b1ab: useState 改 lazy 同步读 localStorage (累计待办 #2)
  - 避免首屏 mask 闪一下
  - useEffect 只剩 setIsHydrated(true)

- **`feat(react-query 完整接入)`** 4f9be29: 全局 QueryClient + useMutation 模板 (累计待办 #3)
  - App.tsx 包 QueryClientProvider (staleTime=30s, refetchOnWindowFocus=false, retry=1)
  - useMembers.ts 加 useCreateMember / useUpdateMember / useDeleteMember 模板
  - 现有 10 个 data hooks (useContracts/useCostLedger/useDepartments/useInvoices/usePartners/useProjects/useSettlements/useTemplates/useWorkers) 保持不变, 后续 sprint 渐进迁移

- **`docs(cloud sync design)`** fa62456: 多设备/多用户 cloud sync 调研 + 决策 (累计待办 #4)
  - `docs/design/cloud-sync-design.md` (245 行, 4 方案对比 + 决策 = 推迟到 v0.77.0+ 独立 sprint)
  - 范围太大需 major bump, 推后到 v0.77.0 阶段 1 (2-3 周准备) + 阶段 2 (4-6 周实施) + 阶段 3 (4 周离线增强 + 移动端)
  - 推荐方案 E (B 中央数据库 + D 增量同步) 混合

- **`feat(PII 列级 key rotation)`** ef79f0c: 多 key 加密 + admin 轮换 API (累计待办 #5)
  - migration 023: `pii_keys` 表 (key_id, encrypted_key, is_active, created_at, retired_at, created_by)
  - PiiProtector 升级: 多 key 内存缓存 + 密文加 1 字节 version 头 (key_id)
  - 旧 v1.2.0 密文兼容: 无 version 字节 → fallback 到 key_id=1 (legacy, 从 %APPDATA%\pp.key 迁移)
  - PiiKeyEndpoints: GET /api/admin/pii/keys (列) + POST /api/admin/pii/rotate (admin-only, 写 audit)
  - UI: Settings 页新 `SettingsPiiKeySection` 卡片 (active key / 总数 / 上次轮换 / 立即轮换)
  - 11 个 PiiProtectorTests (40/40 总通过)

- **`feat(版本号 build-time 注入)`** c30edd4: index.html 改用 vite 插件读 package.json (累计待办 #6)
  - vite.config.ts 加 `injectVersionPlugin` (transformIndexHtml hook)
  - 源文件 `<APP_VERSION>` 占位符, dist 输出实际版本
  - 未来 bump package.json → 自动同步, 无需手改 index.html

- **`refactor(Settings 拆分)`** 9efebbe: Settings.tsx 280 → 90 行 (累计待办 #7)
  - 新增 4 个子组件: DataPathSection / DevToolsSection / AppearanceSection / AboutSection (在 features/settings/)
  - Settings.tsx 只剩组合 + loading 状态
  - refactor 不 bump (本应在 v0.75.3 era, 一起并到 v0.76.0)

### mimo scoreboard (本 release 累计 n=0)
- 0 个 mimo 任务 (本期 7 项都是手写, 因为涉及 schema 决策 / 跨文件协调 / 端点设计, mimo 1-file-patch 不适合)
- 上次 n=33 (v0.75.3 part 4 闭环) 仍然有效

### 升级路径 (v0.75.3 → v0.76.0)
1. `git pull`
2. 重启 C# 服务 (自动跑 migration 023 加 pii_keys 表)
3. 首次启动: PiiProtector 自动从 %APPDATA%\工程管家\pp.key 导入到 pii_keys (key_id=1, is_active=1)
4. 现有 PII 密文继续可读 (旧格式无 version, 自动 fallback 到 key_id=1)
5. (可选) admin 在 Settings → PII 加密密钥 立即轮换


---

## v0.75.3 (2026-06-20) — fix: TemplateCard Tooltip + 18 个 refactor (refactor 不 bump, 与 v0.75.3 同版本)

### 改动

- **`fix(TemplateCard Tooltip)`** ac643ef: TemplateCard 加 Tooltip + TemplatePreview 测试改 getByRole
  - 模板卡片悬停 Tooltip 显示完整内容 (之前被截断)
  - TemplatePreview 测试改用 getByRole 提升可访问性

- **`refactor(后续 14 个 file splits)`** 在 v0.75.2 → v0.75.3 期间完成, 全是内部结构调整, 无行为变化:
  - v0.80.0 阶段: PartnerForm (→ PartnerFormFields) + StaffAttendance
  - v0.81.0: Drawings + ContractPage
  - v0.82.0: WageManagement bank receipt hook + Members WorkerSection + Dashboard
  - v0.83.0: Partners CRUD hook + Users columns + ProjectDetailTabs MembersTab
  - v0.84.0: SettingsSqliteSection 4 文件拆 + ContractTemplates print utility
  - v0.85.0: ContractDashboard formatCurrency + AuditLogViewer constants + Projects HeroBanner + Settings GpuToggle

### mimo scoreboard (累计 n=21)
- 一次过 20/21 (95.2%), 含 8 次小自修复
- 平均耗时 159s

---

## v0.75.2 (2026-06-19) — fix: clear 84 tsc errors + add tsc to red-light-green-light

### 改动
- **`fix(tsc 84 errors)`** 35d1431: 清空 84 个 tsc 错误 (unused imports + unused vars)
  - 红绿灯新增第 5 项: `npx tsc --noEmit --pretty false` (v0.79.0 起, 防 unused import / 类型错乱回归)
- **`docs(AGENTS.md red-light adds tsc)`** 3b359db: AGENTS.md 红绿灯文档同步

---

## v0.75.1 (2026-06-19) — fix: DataTable 3 critical runtime bug + Tooltip native title fallback

### 改动
- **`fix(DataTable critical)`** 2b47756: 修 DataTable 3 个 critical runtime bug
  - useDataTableState 漏 import
  - getRowKey 类型不匹配
  - Tooltip native title fallback

---

## v0.75.0 (2026-06-19) — feat: useUserIdSync 接入 App.tsx

### 改动
- **`feat(useUserIdSync)`** 8cccaa8: useUserIdSync hook 接入 App.tsx
  - 用于同步当前用户 ID 到全局 context

### 前置 refactors (在 v0.75.0 之前完成, 不影响版本号)
- **`refactor(DataTable 453→358)`** fbbcaa2: 拆 DataTable.tsx 453 → 358 行 (-21%)
- **`refactor(DataTable 358→209)`** 7f9da39: DataTable.tsx 进一步拆分 358 → 209 行 (-42%)
- **`docs(同步知识库)`** 9428874, a8af087, b23b9f2, d6ef9c7: AGENTS.md / CHANGELOG / docs/ 同步

---

## v0.74.0 (2026-06-19, 之前) — pre-semver-rebase base

`v0.74.0 WIP` (ce8cf23) 是本次重构系列之前的"基线状态". 历史中 v0.69.0 之前的 commit 因 `git reset --hard v0.69.0` 已丢失, 详见 v0.69.0 之前的审计报告 (P0-FIX-PLAN.md).