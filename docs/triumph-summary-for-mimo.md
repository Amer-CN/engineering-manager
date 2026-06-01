# 给 Mimo：搞定启动问题的最终方案

代码扔给你了，说几个关键点：

## 1. 启动模式

改成 `OutputType = Exe`（控制台应用）而不是 `WinExe`。WinExe 会让 C# 没有控制台，子进程 Vite 就没法共享同一个终端窗口。改成 Exe 后，`CreateNoWindow = false` 的 Vite 子进程自动继承控制台，CMD / Vite / C# 日志全在同一个 Windows Terminal 里。

## 2. Windows Terminal 分发

`工程管家.bat` 复用之前的 WT 分发逻辑（跟 Electron/Rust 版一样）：

```bat
if "%WT_SESSION%"=="" (
    wt.exe -w -1 cmd /c "%~f0"
    exit /b
)
```

## 3. 退出时关掉 WT 窗口

卡最久的是 WT 关不掉。退出码 0、`closeOnExit: "always"` 都配了，WT 就是不关。最后发现原因是：

- C# `viteProcess.Kill()` 只杀了 `cmd.exe`，杀不掉它的孙子进程 `node.exe`
- 残留的 node 进程让 cmd 以为还有子进程在跑，WT 就不关窗

**解决方案**：C# 启动时记录所有已有 node PID，退出时只杀新出现的（Vite 的 node），不碰老的（AI 内核的 node）：

```csharp
// 启动时记录
var existingNodePids = new HashSet<int>();
foreach (var p in Process.GetProcessesByName("node"))
    existingNodePids.Add(p.Id);

// 退出时只杀新的
foreach (var p in Process.GetProcessesByName("node"))
    if (!existingNodePids.Contains(p.Id))
        p.Kill();
```

## 4. MainWindow 改用 `Chsarp` 的丑陋命名

MainWindow.cs 登录窗口大小 300x400，无边框圆角，通过 WebMessage 传 `resize` / `minimize` / `maximize` / `close` 指令。

## 5. 附记

之前的 Rust 版本 42 个文件 8000 行，修了 20 个 bug。C# 版本 4 个核心文件 ~1800 行，最难的 bug 是「关不掉 WT 窗口」。
