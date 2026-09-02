# 去掉启动黑窗（工程管家.vbs）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增 `工程管家.vbs` 作为日常双击入口——零黑窗、1-2 秒启动编译好的 exe；`工程管家.bat` 一字不动留作报错后门。

**Architecture:** vbs 依次做：隐形 taskkill 残留进程 → sleep 1s → 工作目录设为 Api 项目目录（对齐原 bat 的 cd）→ 校验 exe+dist 存在后启动 `bin\Debug\net8.0-windows\EngineeringManager.Api.exe`，缺任一弹 30 秒自动消失的 Popup。设计依据 `docs/superpowers/specs/2026-09-01-hide-boot-console-design.md`。

**Tech Stack:** VBScript (WScript.Shell / FileSystemObject) + PowerShell（进程/端口取证）+ cscript（无头运行验证）。无 C#/前端代码改动 → **不触发红绿灯**。

**注意：** 本计划是启动器脚本，无测试框架，"测试"= 每个任务内嵌的行为取证（进程/端口/耗时/字节级编码检查）。验证会重启运行中的程序——这是该功能的正常行为；**收尾状态必须是程序正在运行**。

---

### Task 1: 创建 vbs（UTF-16 LE）+ 正常启动验证

**Files:**
- Create: `E:\测试\工程管家.vbs`

- [ ] **Step 1: 写入 vbs 源文件（Write 工具，暂为 UTF-8）**

完整内容（无省略）：

```vbs
Option Explicit

Dim sh, fso, root, apiDir, outDir, exePath, distPath

Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

root = fso.GetParentFolderName(WScript.ScriptFullName)
apiDir = root & "\EngineeringManager.Api"
outDir = apiDir & "\bin\Debug\net8.0-windows"
exePath = outDir & "\EngineeringManager.Api.exe"
distPath = outDir & "\dist"

' 1. 隐形杀掉残留进程（应用无单实例锁，防 5048 被占；等效原 bat 的 taskkill）
sh.Run "taskkill /F /IM EngineeringManager.Api.exe", 0, False

' 2. 等 1 秒（等效原 bat 的 timeout /t 1）
WScript.Sleep 1000

' 3. 工作目录与原 bat 的 cd /d 一致（OCR 配置有一处按当前目录探测 public/ocr-config.json）
sh.CurrentDirectory = apiDir

' 4. exe 与 dist 都在才启动；dist 缺失会让程序误入 dev 模式（自动拉 vite），一并拦下
If fso.FileExists(exePath) And fso.FolderExists(distPath) Then
    sh.Run """" & exePath & """", 1, False
Else
    sh.Popup "工程管家启动失败：编译产物缺失。" & vbCrLf & _
             "缺少 " & exePath & " 或 dist 目录。" & vbCrLf & _
             "请先运行一次编译，或联系开发处理。", 30, "工程管家", 48
End If
```

- [ ] **Step 2: 转码为 UTF-16 LE + CRLF + BOM（WScript 不认 UTF-8，spec §6）**

Run（在 `E:\测试` 下）：

```bash
node -e "const fs=require('fs');const f=fs.readdirSync('.').filter(x=>x.endsWith('.vbs'));if(f.length!==1)throw new Error('expect exactly 1 vbs, got '+f.length);const s=fs.readFileSync(f[0],'utf8').replace(/\r?\n/g,'\r\n');fs.writeFileSync(f[0],'\ufeff'+s,'utf16le');const b=fs.readFileSync(f[0]);console.log('BOM bytes:',b[0],b[1]);"
```

Expected: `BOM bytes: 255 254`（即 FF FE）。

- [ ] **Step 3: cscript 正常启动（spec §7.1）**

Run: `cscript //nologo 工程管家.vbs; echo exit=$?`
Expected: `exit=0`，脚本约 1 秒返回（sleep），无报错。应用 1-2 秒后出窗。

- [ ] **Step 4: 进程与端口取证**

```bash
powershell -Command "Get-Process EngineeringManager.Api -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id"
powershell -Command "Get-NetTCPConnection -LocalPort 5048 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess"
curl -s -o /dev/null -w '%{http_code}' http://localhost:5048/api/health
```

Expected: 恰好 1 个 PID；端口监听进程 = 同一 PID；health 返回 `200`。
说明：「黑窗消失」本身无法进程级事后取证（窗口已按样式 0 隐藏运行），最终由 Task 4 用户目视确认（spec §7.4）。

- [ ] **Step 5: 数据路径取证（等效实现，因 /api/config/data-path 需登录态）**

```bash
cat "$APPDATA/工程管家/config.json"
```

Expected: `"dataPath": "F:\\Company Database"`（存储路径红线原位）。运行时证据 = 程序能起到登录页（`InitializeDatabaseOrExit` 在数据路径损坏时会直接退出）；工作目录无关性已在 spec §5 代码级证明。

- [ ] **Step 6: Commit**

```bash
git add 工程管家.vbs
git commit -m "chore(build): 新增工程管家.vbs 无黑窗启动入口——双击秒开编译版 exe"
```

---

### Task 2: 二连开验证（spec §7.2）

- [ ] **Step 1: 记录当前 PID → 再跑一次 vbs → 对比**

```bash
P1=$(powershell -Command "Get-Process EngineeringManager.Api -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id")
cscript //nologo 工程管家.vbs
sleep 3
P2=$(powershell -Command "Get-Process EngineeringManager.Api -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id")
echo "before=$P1 after=$P2"
```

Expected: `P1 ≠ P2`（旧进程被杀、新进程顶上），且 P2 为唯一 PID（上一步的 Get-Process 天然只返回存活的）。

- [ ] **Step 2: 端口仍健康**

Run: `curl -s -o /dev/null -w '%{http_code}' http://localhost:5048/api/health`
Expected: `200`

---

### Task 3: 缺失分支验证（spec §7.3）

**Files:**
- Create: `E:\测试\工程管家-bootshot-test.vbs`（临时，测完即删）

- [ ] **Step 1: 写临时副本（纯 ASCII，免去转码；exePath 指向不存在目录；taskkill 注释掉防误杀真进程；Popup 缩短为 3 秒）**

完整内容：

```vbs
Option Explicit
Dim sh, fso, root, apiDir, outDir, exePath, distPath
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
root = fso.GetParentFolderName(WScript.ScriptFullName)
apiDir = root & "\EngineeringManager.Api"
outDir = apiDir & "\bin\Debug\net8.0-windows"
exePath = outDir & "\missing-build\EngineeringManager.Api.exe"
distPath = outDir & "\dist"
' taskkill disabled in this test copy
WScript.Sleep 100
sh.CurrentDirectory = apiDir
If fso.FileExists(exePath) And fso.FolderExists(distPath) Then
    sh.Run """" & exePath & """", 1, False
Else
    sh.Popup "TEST: build output missing. This dialog auto-closes in 3 seconds.", 3, "bootshot-test", 48
End If
```

- [ ] **Step 2: 运行并量耗时**

```bash
t0=$(date +%s%N); cscript //nologo 工程管家-bootshot-test.vbs >/dev/null 2>&1; t1=$(date +%s%N); echo "elapsed_ms=$(( (t1-t0)/1000000 ))"
```

Expected: `elapsed_ms` ≥ 2500（Popup 阻塞 ~3 秒后自动消失；若无弹窗会瞬退 <500ms）。取证口径：脚本看不到 GUI，耗时差 + exit 0 是弹窗路径被执行且会自动超时的证据。

- [ ] **Step 3: 删除临时副本并确认**

```bash
rm 工程管家-bootshot-test.vbs && ls *.vbs
```

Expected: 只剩 `工程管家.vbs`。

---

### Task 4: 收尾——用户双击目视确认（spec §7.4）

- [ ] **Step 1: 交给用户验证**

告知用户：双击 `工程管家.vbs`，预期全程无黑窗、1-2 秒出启动画面到登录页。`工程管家.bat` 保留：想亲眼看编译/报错时用它。若有桌面快捷方式，报位置即可，改指 vbs 并沿用程序图标。

- [ ] **Step 2: 确认收尾状态**

应用处于运行中、登录页可见（恢复到能用），验证记录汇总给用户。

---

## Self-Review 记录

- Spec 覆盖：§3 交付物→Task 1；§6 编码/Popup/路径约束→Task 1 Step 1-2；§7.1→Task 1；§7.2→Task 2；§7.3→Task 3；§7.4→Task 4。§4 依赖链是 Qoder 流程规则（vite build 后收尾 dotnet build），无代码任务，已在本头部声明"不触发红绿灯"。
- 占位符扫描：无 TBD/TODO；两段 vbs 均为完整可运行内容。
- 命名一致性：exePath/distPath/outDir/apiDir 在三个任务中拼写一致。
