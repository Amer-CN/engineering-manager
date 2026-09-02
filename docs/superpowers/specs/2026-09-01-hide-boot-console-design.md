# 设计：去掉启动时的黑色控制台窗口

- 日期：2026-09-01
- 状态：已批准（入口选 .vbs；启动策略选「秒开」）
- 范围：仅开发机启动入口。不碰应用代码、不碰安装器、不碰发布流程。

## 1. 问题与诊断

双击 `工程管家.bat` 启动时先弹出一个黑色 cmd 窗口，直到登录页出现才消失。

诊断（已逐一验证）：

- 黑窗不是程序本身——`EngineeringManager.Api.csproj` 是 `OutputType=WinExe`，编译出的 exe 无控制台。
- 黑窗 = bat 以 cmd 为宿主运行 `dotnet run` 的窗口。
- `dotnet run` 每次启动都完整编译一次（约占启动总时长 10-20 秒的大头）。

## 2. 决策

三个方案（隐藏属性改造 / 计划任务 / .vbs 入口）中用户选定 **.vbs 入口**；
「vbs 直接启动」vs「启动前先偷偷编译一次」中用户选定**直接启动（秒开）**。

含义与代价（已向用户交底并接受）：

- 编译职责从「每次重启」移到「只在我改代码之后」，由 Qoder 的红绿灯流程承担（红绿灯以编译收尾，见 §4）。
- 用户侧动作不变（双击），每次启动省下 ~10-20 秒。
- 明确接受的坏情况：若某次改动编译未跑成，vbs 会静默起旧版本、无提示。要亲眼看报错时用 bat 后门。
- 明确拒绝的方向：恢复 vite 热更新/开发服务器模式（加复杂度）；A+ 每次启动前隐藏编译（每次回到 ~10 秒）。

## 3. 交付物：`工程管家.vbs`（新增，仓库根，与 bat 并排）

`工程管家.bat` **一字不动**，作为「看得见报错」的后门入口。

vbs 行为（顺序固定）：

1. 隐形运行 `taskkill /F /IM EngineeringManager.Api.exe`（窗口样式 0）。应用无单实例互斥锁，此步防 5048 被僵尸进程占用——与今天 bat 同款逻辑，只是不再显示窗口。
2. `WScript.Sleep 1000`（与今天 bat 的 `timeout /t 1` 一致）。
3. `WshShell.CurrentDirectory = <仓库根>\EngineeringManager.Api`。与 bat 的 `cd /d` 完全对齐——OCR 配置有一处按当前目录探测 `public/ocr-config.json`（OcrEndpoints.cs:601），保持一致零意外。数据路径解析不依赖工作目录（Program.cs:486-512，只认环境变量与 `%AppData%\工程管家\config.json`）。
4. 检查 **exe 与 dist 目录都存在**后，启动 `bin\Debug\net8.0-windows\EngineeringManager.Api.exe`（WinExe，无控制台，1-2 秒出窗）。

缺任一项 → 弹一个 30 秒自动消失的提示框（`WshShell.Popup`），文案说明「程序未编译或文件缺失」，不静默、不永久阻塞。

**为什么必须检查 dist**：`isProduction` 只看 exe 旁有无 `dist/`（EntryPoint.cs:38-39）。若 dist 缺失而 exe 在，程序会误入开发模式并自动拉起 vite dev server（EntryPoint.cs:44-64）——对用户是莫名其妙的故障面，用一行 `FolderExists` 检查关死。

## 4. 依赖链（本设计的运转前提）

- 程序运行时前端从 `AppContext.BaseDirectory\dist` 读取（Program.cs:271）。
- dist → bin 的同步**只发生在 `dotnet build`**（csproj 的 SyncFrontendDist 目标，`AfterTargets="Build"`，robocopy /MIR）。
- 因此 Qoder 交付前端改动的收尾顺序必须是：`npx vite build` → `dotnet build`（增量仅 1-2 秒，仅触发同步）。顺序颠倒会让 vbs 启动到旧前端。

## 5. 直启 exe 与 `dotnet run` 的等价性（已验证）

| 关注点 | 结论 | 证据 |
|---|---|---|
| 端口 | 两条路径都是 5048 | Program.cs:121 硬编码；testMode 需要测试专用环境变量（ASPNETCORE_ENVIRONMENT=Development 且 DISABLE_RATELIMIT=1），两个启动器都不设 |
| launchSettings.json | 不存在，无隐藏注入 | Glob 无结果 |
| 生产/开发模式 | 都走生产 | isProduction 只看 bin 下 dist 存在（EntryPoint.cs:38），已确认在位 |
| 工作目录 | 相同 | vbs 显式设为 Api 项目目录 = bat 的 `cd /d` |
| 数据路径 | 相同 | 只认环境变量与 config.json（Program.cs:486-512），与启动器无关 |

## 6. 实现约束

- vbs 文件必须存为 **UTF-16 LE** 编码（含中文弹窗文案；WScript 不认 UTF-8，与 .ps1 的编码坑同族）。
- vbs 用 `WScript.ScriptFullName` 反推仓库根，不硬编码盘符路径。
- 弹窗用 `WshShell.Popup`（30 秒自动消失），不用 `MsgBox`（会永久阻塞）。
- 双击 vbs 本体显示 WScript 默认灰图标；如需桌面快捷方式，图标沿用程序 ico（用户报位置后单独处理，不在本设计内）。

## 7. 验证计划

1. **正常启动**：进程存在、5048 在听、数据路径接口返回 F 盘原位、无 cmd 子进程（窗口露出由用户目视确认）。
2. **二连开**：旧进程被杀，5048 只剩一个进程。
3. **缺失分支**：用临时改路径的副本验证弹窗出现并 30 秒自动消失。
4. **黑窗消失**：进程层面证伪 + 用户双击目视确认。

## 8. 明确不做

- 不改 `工程管家.bat`（后门）。
- 不动安装器/发布流程（发布版 exe 自带无窗口启动）。
- 不恢复 vite 热更新、不加启动前隐藏编译（§2 已拒）。
- 不建桌面快捷方式（需要时报位置另行处理）。
