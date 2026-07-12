This file is a merged representation of a subset of the codebase, containing specifically included files, combined into a single document by Repomix.

================================================================
File Summary
================================================================

Purpose:
--------
This file contains a packed representation of a subset of the repository's contents that is considered the most important context.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

File Format:
------------
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A separator line (================)
  b. The file path (File: path/to/file)
  c. Another separator line
  d. The full contents of the file
  e. A blank line

Usage Guidelines:
-----------------
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

Notes:
------
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Only files matching these patterns are included: installer/**, uninstaller/**, EngineeringManager.Installer/**, EngineeringManager.Uninstaller/**
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)


================================================================
Directory Structure
================================================================
EngineeringManager.Installer/.gitignore
EngineeringManager.Installer/app.ico
EngineeringManager.Installer/EngineeringManager.Installer.csproj
EngineeringManager.Installer/InstallerService.cs
EngineeringManager.Installer/InstallerWindow.cs
EngineeringManager.Installer/Program.cs
EngineeringManager.Uninstaller/app.ico
EngineeringManager.Uninstaller/EngineeringManager.Uninstaller.csproj
EngineeringManager.Uninstaller/Program.cs
EngineeringManager.Uninstaller/UninstallerService.cs
EngineeringManager.Uninstaller/UninstallerWindow.cs
installer/.gitignore
installer/index.html
installer/package.json
installer/src/App.tsx
installer/src/components/CompleteStep.tsx
installer/src/components/DataPathStep.tsx
installer/src/components/InstallingStep.tsx
installer/src/components/Logo.tsx
installer/src/components/ParticleSystem.tsx
installer/src/components/PathStep.tsx
installer/src/components/SettingsModal.tsx
installer/src/components/ThemeSwitcher.tsx
installer/src/components/WelcomeStep.tsx
installer/src/hooks/useTheme.ts
installer/src/installer.css
installer/src/main.tsx
installer/tsconfig.json
installer/vite.config.ts
uninstaller/.gitignore
uninstaller/index.html
uninstaller/package.json
uninstaller/src/App.tsx
uninstaller/src/components/CompleteStep.tsx
uninstaller/src/components/ConfirmStep.tsx
uninstaller/src/components/Logo.tsx
uninstaller/src/components/ParticleSystem.tsx
uninstaller/src/components/ThemeSwitcher.tsx
uninstaller/src/components/UninstallingStep.tsx
uninstaller/src/hooks/useTheme.ts
uninstaller/src/installer.css
uninstaller/src/main.tsx
uninstaller/tsconfig.json
uninstaller/vite.config.ts

================================================================
Files
================================================================

================
File: EngineeringManager.Installer/.gitignore
================
node_modules/
dist/
bin/
obj/
app-files/

================
File: EngineeringManager.Uninstaller/EngineeringManager.Uninstaller.csproj
================
<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <TargetFramework>net8.0-windows</TargetFramework>
    <UseWindowsForms>true</UseWindowsForms>
    <OutputType>WinExe</OutputType>
    <ApplicationIcon>app.ico</ApplicationIcon>
    <NoWarn>MSB3277</NoWarn>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <PublishSingleFile>true</PublishSingleFile>
    <SelfContained>true</SelfContained>
    <RuntimeIdentifier>win-x64</RuntimeIdentifier>
    <EnableCompressionInSingleFile>true</EnableCompressionInSingleFile>
    <IncludeNativeLibrariesForSelfExtract>true</IncludeNativeLibrariesForSelfExtract>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.Web.WebView2" Version="1.0.3967.48" />
  </ItemGroup>

  <ItemGroup>
    <Content Include="app.ico">
      <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
    </Content>
    <EmbeddedResource Include="app.ico" LogicalName="EngineeringManager.Uninstaller.app.ico" />
  </ItemGroup>

</Project>

================
File: EngineeringManager.Uninstaller/UninstallerService.cs
================
using System.Diagnostics;

namespace EngineeringManager.Uninstaller;

public class UninstallerService
{
    private static readonly string LogFile = Path.Combine(Path.GetTempPath(), "uninstaller-log.txt");

    private static void Log(string msg)
    {
        try { File.AppendAllText(LogFile, $"[{DateTime.Now:HH:mm:ss.fff}] {msg}\n"); } catch { }
        Debug.WriteLine(msg);
    }

    /// <summary>
    /// 从 uninstaller.json 读取安装路径
    /// </summary>
    public static string GetInstallPath()
    {
        // 从同目录的 uninstaller.json 读取
        var jsonPath = Path.Combine(AppContext.BaseDirectory, "uninstaller.json");
        if (File.Exists(jsonPath))
        {
            var path = File.ReadAllText(jsonPath).Trim();
            if (!string.IsNullOrEmpty(path) && Directory.Exists(path))
            {
                Log($"[Service] 从 uninstaller.json 读取安装路径: {path}");
                return path;
            }
        }

        // fallback: 从桌面快捷方式查找
        var desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
        var lnkPath = Path.Combine(desktopPath, "工程管家.lnk");
        if (File.Exists(lnkPath))
        {
            try
            {
                var shell = (dynamic)Activator.CreateInstance(Type.GetTypeFromProgID("WScript.Shell")!)!;
                var shortcut = shell.CreateShortcut(lnkPath);
                var exePath = shortcut.TargetPath as string;
                if (!string.IsNullOrEmpty(exePath) && File.Exists(exePath))
                {
                    var installDir = Path.GetDirectoryName(exePath);
                    Log($"[Service] 从桌面快捷方式推断安装路径: {installDir}");
                    return installDir!;
                }
            }
            catch { }
        }

        // fallback: 默认路径
        var defaultPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "工程管家");
        if (Directory.Exists(defaultPath))
        {
            Log($"[Service] 使用默认安装路径: {defaultPath}");
            return defaultPath;
        }

        throw new FileNotFoundException("无法确定安装路径，工程管家可能已被手动卸载");
    }

    /// <summary>
    /// 执行卸载
    /// </summary>
    public async Task Uninstall(string installPath, Action<int, string> onProgress)
    {
        Log($"[Service] 开始卸载: {installPath}");

        onProgress(0, "正在删除程序文件...");

        // 停止正在运行的进程
        try
        {
            foreach (var p in Process.GetProcessesByName("EngineeringManager.Api"))
            {
                try { p.Kill(); p.WaitForExit(3000); } catch { }
            }
        }
        catch { }

        // 删除安装目录
        if (Directory.Exists(installPath))
        {
            var totalFiles = Directory.GetFiles(installPath, "*", SearchOption.AllDirectories).Length;
            var deleted = 0;

            // 先删除子目录和文件
            foreach (var dir in Directory.GetDirectories(installPath, "*", SearchOption.AllDirectories))
            {
                try
                {
                    Directory.Delete(dir, true);
                    deleted += Directory.GetFiles(dir, "*", SearchOption.AllDirectories).Length;
                }
                catch (Exception ex)
                {
                    Log($"[Service] 删除目录失败 {dir}: {ex.Message}");
                }
            }

            foreach (var file in Directory.GetFiles(installPath))
            {
                try
                {
                    File.Delete(file);
                    deleted++;
                }
                catch (Exception ex)
                {
                    Log($"[Service] 删除文件失败 {file}: {ex.Message}");
                }
            }

            // 进度模拟（基于删除的文件数）
            for (int i = 0; i <= 25; i += 5)
            {
                onProgress(i, "正在删除程序文件...");
                await Task.Delay(100);
            }
        }

        onProgress(50, "正在清理配置文件...");
        await Task.Delay(150);

        // 清理 AppData 配置目录（config.json、快照等，不影响用户数据）
        var appDataDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "工程管家");
        if (Directory.Exists(appDataDir))
        {
            try { Directory.Delete(appDataDir, true); Log($"[Service] 已清理配置目录: {appDataDir}"); }
            catch (Exception ex) { Log($"[Service] 清理配置目录失败: {ex.Message}"); }
        }

        // 绝不删除用户数据存储路径（如 F:\Company Database），无论 deleteData 为何值

        onProgress(75, "正在删除快捷方式...");
        await Task.Delay(150);

        // 删除桌面快捷方式
        try
        {
            var desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
            var lnkPath = Path.Combine(desktopPath, "工程管家.lnk");
            if (File.Exists(lnkPath)) File.Delete(lnkPath);
            var uninstallLnk = Path.Combine(desktopPath, "卸载工程管家.lnk");
            if (File.Exists(uninstallLnk)) File.Delete(uninstallLnk);
        }
        catch (Exception ex) { Log($"[Service] 删除快捷方式失败: {ex.Message}"); }

        // 删除开始菜单快捷方式
        try
        {
            var startMenuPath = Environment.GetFolderPath(Environment.SpecialFolder.StartMenu);
            var startLnk = Path.Combine(startMenuPath, "工程管家.lnk");
            if (File.Exists(startLnk)) File.Delete(startLnk);
        }
        catch (Exception ex) { Log($"[Service] 删除开始菜单快捷方式失败: {ex.Message}"); }

        onProgress(90, "正在清理注册表...");
        await Task.Delay(150);

        // 清理注册表
        try
        {
            // 删除 "程序和功能" 中的卸载信息
            try
            {
                Microsoft.Win32.Registry.CurrentUser.OpenSubKey(@"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall", true)?
                    .DeleteSubKeyTree("工程管家", false);
                Log("[Service] 已清理 Uninstall 注册表");
            }
            catch (Exception ex) { Log($"[Service] 清理 Uninstall 注册表失败: {ex.Message}"); }

            // 删除应用自身注册表
            try
            {
                Microsoft.Win32.Registry.CurrentUser.OpenSubKey("Software", true)?
                    .DeleteSubKeyTree("工程管家", false);
                Log("[Service] 已清理应用注册表");
            }
            catch (Exception ex) { Log($"[Service] 清理应用注册表失败: {ex.Message}"); }
        }
        catch (Exception ex) { Log($"[Service] 清理注册表失败: {ex.Message}"); }

        // 最后删除安装目录本身
        try
        {
            if (Directory.Exists(installPath))
            {
                Directory.Delete(installPath, true);
            }
        }
        catch (Exception ex)
        {
            Log($"[Service] 删除安装目录失败: {ex.Message}");
        }

        // 删除卸载器自身
        try
        {
            var selfPath = AppContext.BaseDirectory;
            // 等窗口关闭后再清理
            Log($"[Service] 卸载器目录: {selfPath}（将在退出后清理）");
        }
        catch { }

        onProgress(100, "卸载完成！");
        Log("[Service] 卸载完成");
    }
}

================
File: installer/.gitignore
================
node_modules/
dist/

================
File: installer/index.html
================
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>工程管家 - 安装程序</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { overflow: hidden; background: #f8fafc; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>

================
File: installer/src/components/CompleteStep.tsx
================
import { motion } from 'framer-motion'
import Logo from './Logo'

interface Props {
  installPath: string
  onLaunch: () => void
  onClose: () => void
}

export default function CompleteStep({ installPath, onLaunch, onClose }: Props) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      position: 'relative',
      zIndex: 1,
    }}>
      {/* 大号 ✓ + 发光环 */}
      <div style={{ position: 'relative', marginBottom: 28 }}>
        {/* 发光扩散环 */}
        <motion.div
          initial={{ scale: 0, opacity: 0.8 }}
          animate={{ scale: 2.5, opacity: 0 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          style={{
            position: 'absolute', top: '50%', left: '50%',
            width: 80, height: 80,
            transform: 'translate(-50%, -50%)',
            borderRadius: '50%',
            border: '2px solid var(--success)',
          }}
        />
        <motion.div
          initial={{ scale: 0, opacity: 0.5 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{ duration: 1, delay: 0.2, ease: 'easeOut' }}
          style={{
            position: 'absolute', top: '50%', left: '50%',
            width: 80, height: 80,
            transform: 'translate(-50%, -50%)',
            borderRadius: '50%',
            background: 'var(--success-soft)',
          }}
        />
        {/* ✓ 图标 */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
        >
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'var(--success)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 30px var(--success-soft)',
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none"
              stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <motion.path
                d="M5 13l4 4L19 7"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              />
            </svg>
          </div>
        </motion.div>
      </div>

      {/* 文字 */}
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg)', marginBottom: 8 }}
      >
        安装完成
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4, textAlign: 'center' }}
      >
        已安装到
      </motion.p>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        style={{
          fontSize: 12, color: 'var(--fg-2)',
          fontFamily: 'monospace',
          background: 'var(--bg-2)',
          padding: '6px 14px',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          marginBottom: 40,
          maxWidth: 360,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {installPath}
      </motion.p>

      {/* 按钮 */}
      <div style={{ display: 'flex', gap: 12 }}>
        <motion.button
          className="btn btn-ghost"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, type: 'spring', stiffness: 200, damping: 20 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onClose}
        >
          完成
        </motion.button>
        <motion.button
          className="btn btn-primary"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, type: 'spring', stiffness: 200, damping: 20 }}
          whileHover={{ scale: 1.03, boxShadow: '0 0 24px var(--accent-soft)' }}
          whileTap={{ scale: 0.97 }}
          onClick={onLaunch}
        >
          立即启动
        </motion.button>
      </div>
    </div>
  )
}

================
File: installer/src/components/InstallingStep.tsx
================
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Logo from './Logo'

const STEPS = [
  '正在解压程序文件...',
  '正在配置运行环境...',
  '正在初始化数据库...',
  '正在创建快捷方式...',
  '安装完成！',
]

interface Props {
  onComplete: () => void
}

export default function InstallingStep({ onComplete }: Props) {
  const [percent, setPercent] = useState(0)
  const [currentStep, setCurrentStep] = useState('')
  const [doneSteps, setDoneSteps] = useState<number[]>([])

  useEffect(() => {
    // @ts-ignore
    const wv = window.chrome?.webview
    if (!wv) return
    const handler = (e: any) => {
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data
        if (data?.type === 'progress') {
          setPercent(data.percent)
          setCurrentStep(data.step)
        }
        if (data?.type === 'installComplete') {
          setPercent(100)
          setCurrentStep('安装完成！')
          setDoneSteps([0, 1, 2, 3, 4])
          setTimeout(onComplete, 800)
        }
      } catch {}
    }
    wv.addEventListener('message', handler)
    return () => wv.removeEventListener('message', handler)
  }, [onComplete])

  // 跟踪哪些步骤已完成
  useEffect(() => {
    if (percent >= 30) setDoneSteps(prev => [...new Set([...prev, 0])])
    if (percent >= 60) setDoneSteps(prev => [...new Set([...prev, 1])])
    if (percent >= 80) setDoneSteps(prev => [...new Set([...prev, 2])])
    if (percent >= 95) setDoneSteps(prev => [...new Set([...prev, 3])])
    if (percent >= 100) setDoneSteps(prev => [...new Set([...prev, 4])])
  }, [percent])

  // 环形进度条参数
  const radius = 56
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percent / 100) * circumference

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      position: 'relative',
      zIndex: 1,
    }}>
      {/* 环形进度 + Logo */}
      <div style={{ position: 'relative', marginBottom: 32 }}>
        <svg width="140" height="140" viewBox="0 0 140 140">
          {/* 背景环 */}
          <circle cx="70" cy="70" r={radius} fill="none"
            stroke="var(--border)" strokeWidth="4" opacity="0.3" />
          {/* 进度环 */}
          <motion.circle
            cx="70" cy="70" r={radius} fill="none"
            stroke="var(--accent)" strokeWidth="4" strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{ transformOrigin: 'center', transform: 'rotate(-90deg)' }}
          />
        </svg>
        {/* 中心 Logo */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
        }}>
          <Logo size={48} spin={percent < 100} glow={percent < 100} />
        </div>
      </div>

      {/* 百分比 */}
      <motion.div
        key={percent}
        initial={{ scale: 1.1 }}
        animate={{ scale: 1 }}
        style={{
          fontSize: 36, fontWeight: 700, color: 'var(--accent)',
          marginBottom: 8,
        }}
      >
        {percent}%
      </motion.div>

      {/* 当前步骤 */}
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ fontSize: 14, color: 'var(--fg-2)', marginBottom: 32 }}
      >
        {currentStep}
      </motion.div>

      {/* 步骤列表 */}
      <div style={{ width: 280 }}>
        {STEPS.map((step, i) => {
          const isDone = doneSteps.includes(i)
          const isCurrent = currentStep === step && !isDone
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * i }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '6px 0',
                opacity: isDone ? 1 : isCurrent ? 0.8 : 0.35,
              }}
            >
              {/* 状态图标 */}
              <motion.div
                initial={false}
                animate={isDone ? { scale: [1, 1.3, 1] } : {}}
                transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                style={{
                  width: 18, height: 18, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700,
                  background: isDone ? 'var(--success)' : isCurrent ? 'var(--accent-soft)' : 'transparent',
                  color: isDone ? 'white' : isCurrent ? 'var(--accent)' : 'var(--muted)',
                  border: isDone ? 'none' : `1.5px solid ${isCurrent ? 'var(--accent)' : 'var(--border)'}`,
                }}
              >
                {isDone ? '✓' : i + 1}
              </motion.div>
              <span style={{
                fontSize: 13,
                color: isDone ? 'var(--success)' : isCurrent ? 'var(--fg)' : 'var(--muted)',
                fontWeight: isCurrent ? 500 : 400,
              }}>
                {step}
              </span>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

================
File: installer/src/components/ParticleSystem.tsx
================
import { useRef, useEffect } from 'react'

interface Particle {
  x: number; y: number
  vx: number; vy: number
  size: number; opacity: number; targetOpacity: number
}

const THEME_PARTICLES: Record<string, { color: string; line: string; count: number }> = {
  white:    { color: 'rgba(37, 99, 235, 0.25)',  line: 'rgba(37, 99, 235, 0.06)',  count: 30 },
  graphite: { color: 'rgba(255, 140, 50, 0.3)',   line: 'rgba(255, 140, 50, 0.08)',  count: 40 },
  sandstone:{ color: 'rgba(217, 119, 6, 0.25)',   line: 'rgba(217, 119, 6, 0.06)',   count: 30 },
}

interface Props {
  accelerate?: boolean
}

export default function ParticleSystem({ accelerate = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const frameRef = useRef<number>(0)
  const accelerateRef = useRef(accelerate)

  accelerateRef.current = accelerate

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // 初始化粒子
    const theme = document.documentElement.getAttribute('data-theme') || 'white'
    const config = THEME_PARTICLES[theme] || THEME_PARTICLES.white

    particlesRef.current = Array.from({ length: config.count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.8,
      vy: (Math.random() - 0.5) * 0.8,
      size: Math.random() * 2.5 + 1,
      opacity: 0,
      targetOpacity: Math.random() * 0.6 + 0.3,
    }))

    const lineDist = 100

    const animate = () => {
      if (!ctx || !canvas) return
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'white'
      const cfg = THEME_PARTICLES[currentTheme] || THEME_PARTICLES.white

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const particles = particlesRef.current
      const speed = accelerateRef.current ? 2.5 : 1

      // 连线
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < lineDist) {
            const alpha = (1 - dist / lineDist) * 0.5
            ctx.strokeStyle = cfg.line.replace(/[\d.]+\)$/, `${alpha})`)
            ctx.lineWidth = 0.5
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.stroke()
          }
        }
      }

      // 粒子
      for (const p of particles) {
        p.x += p.vx * speed
        p.y += p.vy * speed
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1
        p.opacity += (p.targetOpacity - p.opacity) * 0.05

        ctx.fillStyle = cfg.color.replace(/[\d.]+\)$/, `${p.opacity})`)
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      }

      frameRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      cancelAnimationFrame(frameRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    />
  )
}

================
File: installer/src/components/SettingsModal.tsx
================
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type Tab = 'about' | 'log'

interface Props {
  onClose: () => void
}

export default function SettingsModal({ onClose }: Props) {
  const [tab, setTab] = useState<Tab>('about')
  const [logContent, setLogContent] = useState('')
  const [copied, setCopied] = useState(false)
  const logRef = useRef<HTMLPreElement>(null)

  useEffect(() => {
    ;(window as any).__setLogContent = (content: string) => {
      setLogContent(content)
    }
    return () => { delete (window as any).__setLogContent }
  }, [])

  // 切换到日志 Tab 时请求 C# 发送日志内容
  useEffect(() => {
    if (tab === 'log') {
      ;(window as any).chrome?.webview?.postMessage(JSON.stringify({ action: 'getLog' }))
    }
  }, [tab])

  // 自动滚动到底部
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [logContent])

  const handleCopy = () => {
    navigator.clipboard.writeText(logContent).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 500,
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 400, height: 420,
          background: 'var(--panel)',
          borderRadius: 12,
          border: '1px solid var(--border)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header + Tabs */}
        <div style={{ borderBottom: '1px solid var(--border)', padding: '12px 16px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)' }}>设置</span>
            <button
              onClick={onClose}
              style={{
                width: 24, height: 24, borderRadius: '50%',
                border: '1px solid var(--border)', background: 'transparent',
                color: 'var(--muted)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12,
              }}
            >✕</button>
          </div>

          {/* Tab 栏 */}
          <div style={{ display: 'flex', gap: 0 }}>
            {([
              { id: 'about' as Tab, label: '关于' },
              { id: 'log' as Tab, label: '安装日志' },
            ]).map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: '8px 16px',
                  fontSize: 13, fontWeight: tab === t.id ? 600 : 400,
                  color: tab === t.id ? 'var(--accent)' : 'var(--muted)',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: 16, minHeight: 320 }}>
          <AnimatePresence mode="wait">
            {tab === 'about' && (
              <motion.div
                key="about"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}
              >
                {/* Logo */}
                <svg width="48" height="48" viewBox="0 0 18 18" fill="none">
                  <defs>
                    <linearGradient id="settings-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="var(--accent)" />
                      <stop offset="100%" stopColor="var(--accent-strong)" />
                    </linearGradient>
                    <mask id="settings-mask">
                      <rect width="18" height="18" fill="white" />
                      <path d="M5 14 L9 6 L13 14 Z" fill="black" />
                    </mask>
                  </defs>
                  <path d="M2 15.5 L9 2.5 L16 15.5 Z" fill="url(#settings-grad)" mask="url(#settings-mask)" />
                </svg>

                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg)' }}>工程管家</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Engineering Manager</div>
                </div>

                <div style={{
                  padding: '4px 12px', borderRadius: 12,
                  background: 'var(--accent-soft)', color: 'var(--accent)',
                  fontSize: 12, fontWeight: 600,
                }}>
                  v1.0.0
                </div>

                {/* 技术栈 */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 4 }}>
                  {['.NET 8', 'React 18', 'SQLite', 'WebView2', 'TypeScript', 'TailwindCSS'].map((tag) => (
                    <span key={tag} style={{
                      padding: '3px 8px', borderRadius: 6,
                      background: 'var(--bg-2)', color: 'var(--fg-2)',
                      fontSize: 11, border: '1px solid var(--border)',
                    }}>
                      {tag}
                    </span>
                  ))}
                </div>

                {/* 说明 */}
                <div style={{
                  fontSize: 12, color: 'var(--muted)', textAlign: 'center',
                  lineHeight: 1.6, marginTop: 8,
                }}>
                  一站式工程项目管理解决方案<br />
                  管理人员档案 · 发票 · 合同 · 结算 · 成本
                </div>
              </motion.div>
            )}

            {tab === 'log' && (
              <motion.div
                key="log"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%' }}
              >
                {/* 操作栏 */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button
                    onClick={() => {
                      ;(window as any).chrome?.webview?.postMessage(JSON.stringify({ action: 'getLog' }))
                    }}
                    style={{
                      padding: '4px 10px', fontSize: 11, borderRadius: 6,
                      border: '1px solid var(--border)', background: 'transparent',
                      color: 'var(--fg-2)', cursor: 'pointer',
                    }}
                  >
                    刷新
                  </button>
                  <button
                    onClick={handleCopy}
                    style={{
                      padding: '4px 10px', fontSize: 11, borderRadius: 6,
                      border: '1px solid var(--border)', background: 'transparent',
                      color: copied ? 'var(--success)' : 'var(--fg-2)',
                      cursor: 'pointer',
                    }}
                  >
                    {copied ? '✓ 已复制' : '复制'}
                  </button>
                </div>

                {/* 日志内容 */}
                <pre
                  ref={logRef}
                  style={{
                    flex: 1, maxHeight: 340,
                    padding: 10, borderRadius: 8,
                    background: 'var(--bg-2)',
                    border: '1px solid var(--border)',
                    fontSize: 11, lineHeight: 1.6,
                    fontFamily: "'Cascadia Code', 'Fira Code', monospace",
                    color: 'var(--fg-2)',
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    margin: 0,
                  }}
                >
                  {logContent || '暂无日志'}
                </pre>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  )
}

================
File: installer/src/components/WelcomeStep.tsx
================
import { motion } from 'framer-motion'
import Logo from './Logo'

const brandChars = '工程管家'.split('')

const charVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.8 + i * 0.1, duration: 0.3 },
  }),
}

const dotVariants = {
  pulse: (i: number) => ({
    scale: [1, 1.4, 1],
    opacity: [0.4, 1, 0.4],
    transition: { duration: 1.2, repeat: Infinity, delay: i * 0.2 },
  }),
}

interface Props {
  onBegin: () => void
  version: string
}

export default function WelcomeStep({ onBegin, version }: Props) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      position: 'relative',
      zIndex: 1,
    }}>
      {/* Logo */}
      <div style={{ marginBottom: 24 }}>
        <Logo size={72} glow />
      </div>

      {/* 品牌名 */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        {brandChars.map((char, i) => (
          <motion.span
            key={i}
            custom={i}
            variants={charVariants}
            initial="hidden"
            animate="visible"
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: 'var(--accent)',
              letterSpacing: '0.08em',
            }}
          >
            {char}
          </motion.span>
        ))}
      </div>

      {/* 副标题 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.5 }}
        style={{
          fontSize: 13,
          color: 'var(--muted)',
          letterSpacing: '0.15em',
          marginBottom: 12,
        }}
      >
        Engineering Manager
      </motion.div>

      {/* 版本号 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ delay: 1.4 }}
        style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 40 }}
      >
        v{version}
      </motion.div>

      {/* 脉冲点 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        style={{ display: 'flex', gap: 8, marginBottom: 48 }}
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            custom={i}
            animate="pulse"
            variants={dotVariants}
            style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--accent)',
            }}
          />
        ))}
      </motion.div>

      {/* 开始安装按钮 */}
      <motion.button
        className="btn btn-primary"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.8, type: 'spring', stiffness: 200, damping: 20 }}
        whileHover={{ scale: 1.03, boxShadow: '0 0 24px var(--accent-soft)' }}
        whileTap={{ scale: 0.97 }}
        onClick={onBegin}
        style={{ padding: '12px 48px', fontSize: 15 }}
      >
        开始安装
      </motion.button>
    </div>
  )
}

================
File: installer/src/hooks/useTheme.ts
================
import { useState, useCallback } from 'react'

type Theme = 'white' | 'graphite' | 'sandstone'

const DEFAULT_INSTALL_PATHS: Record<string, string> = {
  white: 'C:\\Program Files\\工程管家',
  graphite: 'C:\\Program Files\\工程管家',
  sandstone: 'C:\\Program Files\\工程管家',
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('white')

  const applyTheme = useCallback((t: Theme) => {
    document.documentElement.setAttribute('data-theme', t)
    setTheme(t)
  }, [])

  const getDefaultPath = useCallback(() => {
    return DEFAULT_INSTALL_PATHS[theme] || DEFAULT_INSTALL_PATHS.white
  }, [theme])

  return { theme, setTheme: applyTheme, getDefaultPath }
}

================
File: installer/src/installer.css
================
/* ═══════════════════════════════════════════════════════════════
   安装器设计系统 — 复用主程序三主题 CSS 变量
   ═══════════════════════════════════════════════════════════════ */

@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;600;700&display=swap');

:root,
[data-theme="white"] {
  --bg: #f8fafc;
  --bg-2: #f1f5f9;
  --panel: #ffffff;
  --border: #e2e8f0;
  --fg: #0f172a;
  --fg-2: #475569;
  --muted: #94a3b8;
  --accent: #2563eb;
  --accent-soft: rgba(37, 99, 235, 0.12);
  --accent-strong: #1d4ed8;
  --success: #16a34a;
  --success-soft: rgba(22, 163, 74, 0.12);
  --danger: #dc2626;
  --radius: 8px;
  --radius-lg: 12px;
  --shadow-sm: 0 1px 0 rgba(0,0,0,0.04);
  --shadow-md: 0 8px 24px -10px rgba(0,0,0,0.1);
  --shadow-lg: 0 24px 60px -20px rgba(0,0,0,0.18);
  --particle: rgba(37, 99, 235, 0.25);
  --particle-line: rgba(37, 99, 235, 0.06);
}

[data-theme="graphite"] {
  --bg: oklch(17% 0.005 280);
  --bg-2: oklch(20% 0.006 275);
  --panel: oklch(21.5% 0.007 275);
  --border: oklch(30% 0.008 275);
  --fg: oklch(96% 0.004 280);
  --fg-2: oklch(81% 0.005 280);
  --muted: oklch(63% 0.006 280);
  --accent: oklch(68% 0.16 38);
  --accent-soft: oklch(68% 0.16 38 / 0.15);
  --accent-strong: oklch(72% 0.18 36);
  --success: oklch(65% 0.19 155);
  --success-soft: oklch(65% 0.19 155 / 0.15);
  --danger: oklch(65% 0.2 25);
  --particle: rgba(255, 140, 50, 0.3);
  --particle-line: rgba(255, 140, 50, 0.08);
}

[data-theme="sandstone"] {
  --bg: oklch(97.5% 0.008 80);
  --bg-2: oklch(95.5% 0.011 78);
  --panel: oklch(98.5% 0.005 80);
  --border: oklch(88% 0.016 76);
  --fg: oklch(22% 0.014 55);
  --fg-2: oklch(36% 0.013 55);
  --muted: oklch(53% 0.011 60);
  --accent: oklch(60% 0.19 38);
  --accent-soft: oklch(60% 0.19 38 / 0.1);
  --accent-strong: oklch(54% 0.21 36);
  --success: oklch(55% 0.18 150);
  --success-soft: oklch(55% 0.18 150 / 0.1);
  --danger: oklch(58% 0.2 25);
  --particle: rgba(217, 119, 6, 0.25);
  --particle-line: rgba(217, 119, 6, 0.06);
}

/* ── 全局基础 ── */
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Noto Sans SC', 'Source Han Sans SC', 'Microsoft YaHei', sans-serif;
  background: var(--bg);
  color: var(--fg);
  overflow: hidden;
  user-select: none;
  transition: background 0.4s ease, color 0.4s ease;
}

/* ── 标题栏拖动区 ── */
.titlebar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 36px;
  z-index: 100;
  -webkit-app-region: drag;
}

/* ── 按钮基础 ── */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 24px;
  border-radius: var(--radius);
  border: none;
  font-size: 14px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
  -webkit-app-region: no-drag;
}

.btn-primary {
  background: var(--accent);
  color: white;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.btn-primary:hover {
  background: var(--accent-strong);
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  transform: translateY(-1px);
}

.btn-primary:active {
  transform: translateY(0) scale(0.98);
}

.btn-ghost {
  background: transparent;
  color: var(--fg-2);
  border: 1px solid var(--border);
}

.btn-ghost:hover {
  background: var(--bg-2);
  border-color: var(--accent);
  color: var(--accent);
}

/* ── 输入框 ── */
.input {
  width: 100%;
  padding: 10px 14px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: var(--panel);
  color: var(--fg);
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: all 0.2s ease;
}

.input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

/* ── 卡片 ── */
.card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 20px;
  transition: all 0.3s ease;
}

/* ── 进度条 ── */
.progress-track {
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: var(--border);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 2px;
  background: linear-gradient(90deg, var(--accent), var(--accent-strong));
  transition: width 0.3s ease;
}

/* ── 主题切换按钮 ── */
.theme-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid var(--border);
  cursor: pointer;
  transition: all 0.2s ease;
  -webkit-app-region: no-drag;
}

.theme-btn:hover {
  transform: scale(1.15);
  border-color: var(--accent);
}

.theme-btn.active {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--accent-soft);
}

================
File: installer/src/main.tsx
================
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
)

================
File: installer/tsconfig.json
================
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist"
  },
  "include": ["src"]
}

================
File: installer/vite.config.ts
================
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})

================
File: uninstaller/.gitignore
================
node_modules/
dist/

================
File: uninstaller/index.html
================
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>工程管家 - 卸载程序</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { overflow: hidden; background: #f8fafc; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>

================
File: uninstaller/package.json
================
{
  "name": "installer",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "type": "commonjs",
  "dependencies": {
    "framer-motion": "^12.40.0",
    "react": "^19.2.7",
    "react-dom": "^19.2.7"
  },
  "devDependencies": {
    "@types/react": "^19.2.16",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.2",
    "typescript": "^6.0.3",
    "vite": "^8.0.16"
  }
}

================
File: uninstaller/src/App.tsx
================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ParticleSystem from './components/ParticleSystem'
import ThemeSwitcher from './components/ThemeSwitcher'
import ConfirmStep from './components/ConfirmStep'
import UninstallingStep from './components/UninstallingStep'
import CompleteStep from './components/CompleteStep'
import { useTheme } from './hooks/useTheme'
import './installer.css'

type Step = 'confirm' | 'uninstalling' | 'complete'

function postToHost(action: string, data?: Record<string, unknown>) {
  const msg: Record<string, unknown> = { action }
  if (data) Object.assign(msg, data)
  // @ts-ignore
  window.chrome?.webview?.postMessage(JSON.stringify(msg))
}

export default function App() {
  const { theme, setTheme } = useTheme()
  const [step, setStep] = useState<Step>('confirm')
  const [installPath, setInstallPath] = useState('')
  const [accelerate, setAccelerate] = useState(false)

  const handleUninstall = (path: string) => {
    setInstallPath(path)
    setAccelerate(true)
    setStep('uninstalling')
    postToHost('uninstall', { path })
  }

  const handleComplete = () => {
    setAccelerate(false)
    setStep('complete')
  }

  const handleClose = () => postToHost('close')

  const pageVariants = {
    initial: { opacity: 0, x: 30 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -30 },
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <ParticleSystem accelerate={accelerate} />

      {/* 标题栏拖动区 */}
      <div className="titlebar" onMouseDown={() => postToHost('startDrag')} />

      {/* 顶部工具栏：左右分布 */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        zIndex: 200,
        pointerEvents: 'none',
      }}>
        {/* 左侧：主题切换 */}
        <div style={{ pointerEvents: 'auto' }}>
          <ThemeSwitcher current={theme} onChange={setTheme} />
        </div>

        {/* 右侧：最小化 + 关闭 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, pointerEvents: 'auto' }}>
          <button
            className="titlebar-btn"
            title="最小化"
            onClick={(e) => { e.stopPropagation(); postToHost('minimize') }}
          >
            <svg width="14" height="14" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
              <line x1="1.5" y1="5.5" x2="9.5" y2="5.5" />
            </svg>
          </button>
          <button
            className="titlebar-btn close-hover"
            title="关闭"
            onClick={(e) => { e.stopPropagation(); handleClose() }}
          >
            <svg width="14" height="14" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
              <line x1="1.5" y1="1.5" x2="9.5" y2="9.5" />
              <line x1="9.5" y1="1.5" x2="1.5" y2="9.5" />
            </svg>
          </button>
        </div>
      </div>

      {/* 步骤页面 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.3, ease: 'easeOut' }}
          style={{ position: 'absolute', inset: 0 }}
        >
          {step === 'confirm' && <ConfirmStep onUninstall={handleUninstall} />}
          {step === 'uninstalling' && <UninstallingStep onComplete={handleComplete} />}
          {step === 'complete' && <CompleteStep onClose={handleClose} />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

================
File: uninstaller/src/components/CompleteStep.tsx
================
import { motion } from 'framer-motion'

interface Props {
  onClose: () => void
}

export default function CompleteStep({ onClose }: Props) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      position: 'relative',
      zIndex: 1,
    }}>
      <div style={{ position: 'relative', marginBottom: 28 }}>
        <motion.div
          initial={{ scale: 0, opacity: 0.8 }}
          animate={{ scale: 2.5, opacity: 0 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          style={{
            position: 'absolute', top: '50%', left: '50%',
            width: 80, height: 80, transform: 'translate(-50%, -50%)',
            borderRadius: '50%', border: '2px solid #dc2626',
          }}
        />
        <motion.div
          initial={{ scale: 0, opacity: 0.5 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{ duration: 1, delay: 0.2, ease: 'easeOut' }}
          style={{
            position: 'absolute', top: '50%', left: '50%',
            width: 80, height: 80, transform: 'translate(-50%, -50%)',
            borderRadius: '50%', background: 'rgba(220,38,38,0.12)',
          }}
        />
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
        >
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: '#dc2626',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 30px rgba(220,38,38,0.2)',
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <motion.path
                d="M5 13l4 4L19 7"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              />
            </svg>
          </div>
        </motion.div>
      </div>

      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg)', marginBottom: 8 }}
      >
        卸载完成
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 40, textAlign: 'center' }}
      >
        工程管家已成功从您的电脑中移除
      </motion.p>

      <motion.button
        className="btn btn-ghost"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, type: 'spring', stiffness: 200, damping: 20 }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={onClose}
      >
        关闭
      </motion.button>
    </div>
  )
}

================
File: uninstaller/src/components/ConfirmStep.tsx
================
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Logo from './Logo'

interface Props {
  onUninstall: (path: string) => void
}

export default function ConfirmStep({ onUninstall }: Props) {
  const [installPath, setInstallPath] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    ;(window as any).__setInstallPath = (p: string) => {
      setInstallPath(p)
    }
    return () => { delete (window as any).__setInstallPath }
  }, [])

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      position: 'relative',
      zIndex: 1,
      padding: '48px 36px',
    }}>
      <motion.div
        initial={{ scale: 0.3, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        style={{ marginBottom: 24 }}
      >
        <Logo size={56} />
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{ fontSize: 20, fontWeight: 600, color: 'var(--fg)', marginBottom: 8 }}
      >
        卸载工程管家
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24, textAlign: 'center', lineHeight: 1.6 }}
      >
        卸载将移除程序文件和快捷方式<br />
        您的数据将完整保留在原位置
      </motion.p>

      {installPath && (
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{ width: '100%', maxWidth: 360, marginBottom: 16 }}
        >
          <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
            安装路径
          </label>
          <div style={{ fontSize: 12, color: 'var(--fg-2)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
            {installPath}
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 14px', borderRadius: 8,
          background: 'rgba(22, 163, 74, 0.06)',
          border: '1px solid rgba(22, 163, 74, 0.2)',
          marginBottom: 24, width: '100%', maxWidth: 360,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
          <path d="M9 12l2 2 4-4"/>
        </svg>
        <span style={{ fontSize: 12, color: '#16a34a' }}>
          用户数据不受影响，可随时重新安装使用
        </span>
      </motion.div>

      {showConfirm && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'rgba(220, 38, 38, 0.08)',
            border: '1px solid rgba(220, 38, 38, 0.3)',
            borderRadius: 8,
            padding: '12px 20px',
            marginBottom: 24,
            width: '100%',
            maxWidth: 360,
            textAlign: 'center',
          }}
        >
          <span style={{ fontSize: 13, color: '#dc2626', fontWeight: 500 }}>
            ⚠️ 确定要卸载工程管家吗？
          </span>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        style={{ display: 'flex', gap: 12, marginTop: 16 }}
      >
        {!showConfirm ? (
          <motion.button
            className="btn btn-danger"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowConfirm(true)}
            style={{ padding: '10px 32px' }}
          >
            卸载
          </motion.button>
        ) : (
          <>
            <motion.button
              className="btn btn-ghost"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowConfirm(false)}
            >
              取消
            </motion.button>
            <motion.button
              className="btn btn-danger"
              whileHover={{ scale: 1.03, boxShadow: '0 0 20px rgba(220,38,38,0.3)' }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onUninstall(installPath)}
              style={{ padding: '10px 32px' }}
            >
              确认卸载
            </motion.button>
          </>
        )}
      </motion.div>
    </div>
  )
}

================
File: uninstaller/src/components/Logo.tsx
================
import { motion } from 'framer-motion'

interface Props {
  size?: number
  glow?: boolean
  spin?: boolean
}

export default function Logo({ size = 64, glow = false, spin = false }: Props) {
  return (
    <motion.div
      initial={{ scale: 0.3, opacity: 0 }}
      animate={{
        scale: 1,
        opacity: 1,
        rotate: spin ? 360 : 0,
      }}
      transition={
        spin
          ? { rotate: { duration: 20, repeat: Infinity, ease: 'linear' }, scale: { type: 'spring', stiffness: 200, damping: 20 } }
          : { type: 'spring', stiffness: 200, damping: 20, delay: 0.2 }
      }
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 18 18"
        fill="none"
        style={{
          filter: glow
            ? 'drop-shadow(0 0 12px var(--accent)) drop-shadow(0 0 24px var(--accent-soft))'
            : undefined,
        }}
      >
        <defs>
          <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="var(--accent-strong)" />
          </linearGradient>
          {/* mask: 白色=可见，黑色=透明 */}
          <mask id="logo-mask">
            <rect width="18" height="18" fill="white" />
            <path d="M5 14 L9 6 L13 14 Z" fill="black" />
          </mask>
        </defs>
        {/* 外三角 + mask 挖掉内三角 = 真正镂空 */}
        <path d="M2 15.5 L9 2.5 L16 15.5 Z" fill="url(#logo-grad)" strokeLinejoin="round" mask="url(#logo-mask)" />
      </svg>
    </motion.div>
  )
}

================
File: uninstaller/src/components/ParticleSystem.tsx
================
import { useRef, useEffect } from 'react'

interface Particle {
  x: number; y: number
  vx: number; vy: number
  size: number; opacity: number; targetOpacity: number
}

const THEME_PARTICLES: Record<string, { color: string; line: string; count: number }> = {
  white:    { color: 'rgba(37, 99, 235, 0.25)',  line: 'rgba(37, 99, 235, 0.06)',  count: 30 },
  graphite: { color: 'rgba(255, 140, 50, 0.3)',   line: 'rgba(255, 140, 50, 0.08)',  count: 40 },
  sandstone:{ color: 'rgba(217, 119, 6, 0.25)',   line: 'rgba(217, 119, 6, 0.06)',   count: 30 },
}

interface Props {
  accelerate?: boolean
}

export default function ParticleSystem({ accelerate = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const frameRef = useRef<number>(0)
  const accelerateRef = useRef(accelerate)

  accelerateRef.current = accelerate

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // 初始化粒子
    const theme = document.documentElement.getAttribute('data-theme') || 'white'
    const config = THEME_PARTICLES[theme] || THEME_PARTICLES.white

    particlesRef.current = Array.from({ length: config.count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.8,
      vy: (Math.random() - 0.5) * 0.8,
      size: Math.random() * 2.5 + 1,
      opacity: 0,
      targetOpacity: Math.random() * 0.6 + 0.3,
    }))

    const lineDist = 100

    const animate = () => {
      if (!ctx || !canvas) return
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'white'
      const cfg = THEME_PARTICLES[currentTheme] || THEME_PARTICLES.white

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const particles = particlesRef.current
      const speed = accelerateRef.current ? 2.5 : 1

      // 连线
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < lineDist) {
            const alpha = (1 - dist / lineDist) * 0.5
            ctx.strokeStyle = cfg.line.replace(/[\d.]+\)$/, `${alpha})`)
            ctx.lineWidth = 0.5
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.stroke()
          }
        }
      }

      // 粒子
      for (const p of particles) {
        p.x += p.vx * speed
        p.y += p.vy * speed
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1
        p.opacity += (p.targetOpacity - p.opacity) * 0.05

        ctx.fillStyle = cfg.color.replace(/[\d.]+\)$/, `${p.opacity})`)
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      }

      frameRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      cancelAnimationFrame(frameRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    />
  )
}

================
File: uninstaller/src/components/ThemeSwitcher.tsx
================
import { motion } from 'framer-motion'

type Theme = 'white' | 'graphite' | 'sandstone'

const THEMES: { id: Theme; color: string; label: string }[] = [
  { id: 'white',     color: '#2563eb', label: 'White' },
  { id: 'graphite',  color: '#ff8c32', label: 'Graphite' },
  { id: 'sandstone', color: '#d97706', label: 'Sandstone' },
]

interface Props {
  current: Theme
  onChange: (theme: Theme) => void
}

export default function ThemeSwitcher({ current, onChange }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        padding: '4px 6px',
        borderRadius: '20px',
        background: 'var(--panel)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
        transition: 'all 0.3s ease',
      }}
    >
      {THEMES.map((t) => (
        <motion.button
          key={t.id}
          className={`theme-btn ${current === t.id ? 'active' : ''}`}
          style={{
            background: t.color,
            borderColor: current === t.id ? t.color : 'var(--border)',
          }}
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => onChange(t.id)}
          title={t.label}
        />
      ))}
    </div>
  )
}

================
File: uninstaller/src/components/UninstallingStep.tsx
================
import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import Logo from './Logo'

const STEPS = [
  '正在删除程序文件...',
  '正在清理配置文件...',
  '正在删除快捷方式...',
  '正在清理注册表...',
  '卸载完成！',
]

interface Props {
  onComplete: () => void
}

export default function UninstallingStep({ onComplete }: Props) {
  const [percent, setPercent] = useState(0)
  const [currentStep, setCurrentStep] = useState('')
  const [doneSteps, setDoneSteps] = useState<number[]>([])
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    ;(window as any).__updateProgress = (p: number, s: string) => {
      setPercent(p)
      setCurrentStep(s)
    }
    ;(window as any).__installComplete = () => {
      setPercent(100)
      setCurrentStep('卸载完成！')
      setDoneSteps([0, 1, 2, 3, 4])
      setTimeout(() => onCompleteRef.current(), 800)
    }
    ;(window as any).__installError = (msg: string) => {
      setCurrentStep(`卸载失败：${msg || '未知错误'}`)
    }

    return () => {
      delete (window as any).__updateProgress
      delete (window as any).__installComplete
      delete (window as any).__installError
    }
  }, [])

  useEffect(() => {
    if (percent >= 25) setDoneSteps(prev => [...new Set([...prev, 0])])
    if (percent >= 50) setDoneSteps(prev => [...new Set([...prev, 1])])
    if (percent >= 75) setDoneSteps(prev => [...new Set([...prev, 2])])
    if (percent >= 90) setDoneSteps(prev => [...new Set([...prev, 3])])
    if (percent >= 100) setDoneSteps(prev => [...new Set([...prev, 4])])
  }, [percent])

  const radius = 56
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percent / 100) * circumference

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      position: 'relative',
      zIndex: 1,
    }}>
      <div style={{ position: 'relative', marginBottom: 32 }}>
        <svg width="140" height="140" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r={radius} fill="none"
            stroke="var(--border)" strokeWidth="4" opacity="0.3" />
          <motion.circle
            cx="70" cy="70" r={radius} fill="none"
            stroke="#dc2626" strokeWidth="4" strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{ transformOrigin: 'center', transform: 'rotate(-90deg)' }}
          />
        </svg>
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
        }}>
          <Logo size={48} spin={percent < 100} glow={percent < 100} />
        </div>
      </div>

      <motion.div
        key={percent}
        initial={{ scale: 1.1 }}
        animate={{ scale: 1 }}
        style={{
          fontSize: 36, fontWeight: 700, color: '#dc2626',
          marginBottom: 8,
        }}
      >
        {percent}%
      </motion.div>

      <motion.div
        key={currentStep}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ fontSize: 14, color: 'var(--fg-2)', marginBottom: 32 }}
      >
        {currentStep}
      </motion.div>

      <div style={{ width: 280 }}>
        {STEPS.map((step, i) => {
          const isDone = doneSteps.includes(i)
          const isCurrent = currentStep === step && !isDone
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * i }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '6px 0',
                opacity: isDone ? 1 : isCurrent ? 0.8 : 0.35,
              }}
            >
              <motion.div
                initial={false}
                animate={isDone ? { scale: [1, 1.3, 1] } : {}}
                transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                style={{
                  width: 18, height: 18, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700,
                  background: isDone ? '#dc2626' : isCurrent ? 'rgba(220,38,38,0.12)' : 'transparent',
                  color: isDone ? 'white' : isCurrent ? '#dc2626' : 'var(--muted)',
                  border: isDone ? 'none' : `1.5px solid ${isCurrent ? '#dc2626' : 'var(--border)'}`,
                }}
              >
                {isDone ? '✓' : i + 1}
              </motion.div>
              <span style={{
                fontSize: 13,
                color: isDone ? '#dc2626' : isCurrent ? 'var(--fg)' : 'var(--muted)',
                fontWeight: isCurrent ? 500 : 400,
              }}>
                {step}
              </span>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

================
File: uninstaller/src/hooks/useTheme.ts
================
import { useState, useCallback } from 'react'

type Theme = 'white' | 'graphite' | 'sandstone'

const DEFAULT_INSTALL_PATHS: Record<string, string> = {
  white: 'C:\\Program Files\\工程管家',
  graphite: 'C:\\Program Files\\工程管家',
  sandstone: 'C:\\Program Files\\工程管家',
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('white')

  const applyTheme = useCallback((t: Theme) => {
    document.documentElement.setAttribute('data-theme', t)
    setTheme(t)
  }, [])

  const getDefaultPath = useCallback(() => {
    return DEFAULT_INSTALL_PATHS[theme] || DEFAULT_INSTALL_PATHS.white
  }, [theme])

  return { theme, setTheme: applyTheme, getDefaultPath }
}

================
File: uninstaller/src/installer.css
================
/* ═══════════════════════════════════════════════════════════════
   安装器设计系统 — 复用主程序三主题 CSS 变量
   ═══════════════════════════════════════════════════════════════ */

/* 思源黑体 */
@font-face {
  font-family: 'Noto Sans SC';
  src: url('../fonts/SourceHanSansSC-Regular.otf') format('opentype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

:root,
[data-theme="white"] {
  --bg: #f8fafc;
  --bg-2: #f1f5f9;
  --panel: #ffffff;
  --border: #e2e8f0;
  --fg: #0f172a;
  --fg-2: #475569;
  --muted: #94a3b8;
  --accent: #2563eb;
  --accent-soft: rgba(37, 99, 235, 0.12);
  --accent-strong: #1d4ed8;
  --success: #16a34a;
  --success-soft: rgba(22, 163, 74, 0.12);
  --danger: #dc2626;
  --radius: 8px;
  --radius-lg: 12px;
  --shadow-sm: 0 1px 0 rgba(0,0,0,0.04);
  --shadow-md: 0 8px 24px -10px rgba(0,0,0,0.1);
  --shadow-lg: 0 24px 60px -20px rgba(0,0,0,0.18);
  --particle: rgba(37, 99, 235, 0.25);
  --particle-line: rgba(37, 99, 235, 0.06);
}

[data-theme="graphite"] {
  --bg: oklch(17% 0.005 280);
  --bg-2: oklch(20% 0.006 275);
  --panel: oklch(21.5% 0.007 275);
  --border: oklch(30% 0.008 275);
  --fg: oklch(96% 0.004 280);
  --fg-2: oklch(81% 0.005 280);
  --muted: oklch(63% 0.006 280);
  --accent: oklch(68% 0.16 38);
  --accent-soft: oklch(68% 0.16 38 / 0.15);
  --accent-strong: oklch(72% 0.18 36);
  --success: oklch(65% 0.19 155);
  --success-soft: oklch(65% 0.19 155 / 0.15);
  --danger: oklch(65% 0.2 25);
  --particle: rgba(255, 140, 50, 0.3);
  --particle-line: rgba(255, 140, 50, 0.08);
}

[data-theme="sandstone"] {
  --bg: oklch(97.5% 0.008 80);
  --bg-2: oklch(95.5% 0.011 78);
  --panel: oklch(98.5% 0.005 80);
  --border: oklch(88% 0.016 76);
  --fg: oklch(22% 0.014 55);
  --fg-2: oklch(36% 0.013 55);
  --muted: oklch(53% 0.011 60);
  --accent: oklch(60% 0.19 38);
  --accent-soft: oklch(60% 0.19 38 / 0.1);
  --accent-strong: oklch(54% 0.21 36);
  --success: oklch(55% 0.18 150);
  --success-soft: oklch(55% 0.18 150 / 0.1);
  --danger: oklch(58% 0.2 25);
  --particle: rgba(217, 119, 6, 0.25);
  --particle-line: rgba(217, 119, 6, 0.06);
}

/* ── 全局基础 ── */
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Noto Sans SC', 'Source Han Sans SC', 'Microsoft YaHei', sans-serif;
  background: var(--bg);
  color: var(--fg);
  overflow: hidden;
  user-select: none;
  transition: background 0.4s ease, color 0.4s ease;
}

/* ── 标题栏拖动区 ── */
.titlebar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 36px;
  z-index: 100;
  -webkit-app-region: drag;
}

/* ── 按钮基础 ── */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 24px;
  border-radius: var(--radius);
  border: none;
  font-size: 14px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
  -webkit-app-region: no-drag;
}

.btn-primary {
  background: var(--accent);
  color: white;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.btn-primary:hover {
  background: var(--accent-strong);
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  transform: translateY(-1px);
}

.btn-primary:active {
  transform: translateY(0) scale(0.98);
}

.btn-ghost {
  background: transparent;
  color: var(--fg-2);
  border: 1px solid var(--border);
}

.btn-ghost:hover {
  background: var(--bg-2);
  border-color: var(--accent);
  color: var(--accent);
}

.btn-danger {
  background: #dc2626;
  color: white;
  box-shadow: 0 2px 8px rgba(220,38,38,0.15);
}

.btn-danger:hover {
  background: #b91c1c;
  box-shadow: 0 4px 16px rgba(220,38,38,0.25);
  transform: translateY(-1px);
}

.btn-danger:active {
  transform: translateY(0) scale(0.98);
}

/* ── 输入框 ── */
.input {
  width: 100%;
  padding: 10px 14px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: var(--panel);
  color: var(--fg);
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: all 0.2s ease;
}

.input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

/* ── 卡片 ── */
.card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 20px;
  transition: all 0.3s ease;
}

/* ── 进度条 ── */
.progress-track {
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: var(--border);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 2px;
  background: linear-gradient(90deg, var(--accent), var(--accent-strong));
  transition: width 0.3s ease;
}

/* ── 主题切换按钮 ── */
.theme-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid var(--border);
  cursor: pointer;
  transition: all 0.2s ease;
  -webkit-app-region: no-drag;
}

.theme-btn:hover {
  transform: scale(1.15);
  border-color: var(--accent);
}

.theme-btn.active {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--accent-soft);
}

/* ── 标题栏按钮 ── */
.titlebar-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--panel);
  color: var(--muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  -webkit-app-region: no-drag;
}

.titlebar-btn:hover {
  background: var(--bg-2);
  border-color: var(--accent);
  color: var(--accent);
}

/* 关闭按钮悬停特殊样式 */
.titlebar-btn.close-hover:hover {
  background: var(--danger);
  border-color: var(--danger);
  color: white;
}

/* ── 标题栏按钮 ── */
.titlebar-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--panel);
  color: var(--muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  -webkit-app-region: no-drag;
}

.titlebar-btn:hover {
  background: var(--bg-2);
  border-color: var(--accent);
  color: var(--accent);
}

.titlebar-btn.close-hover:hover {
  background: var(--danger);
  border-color: var(--danger);
  color: white;
}

/* ── 关闭按钮（已废弃，使用 titlebar-btn 替代） ── */

================
File: uninstaller/src/main.tsx
================
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
)

================
File: uninstaller/tsconfig.json
================
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist"
  },
  "include": ["src"]
}

================
File: uninstaller/vite.config.ts
================
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})

================
File: EngineeringManager.Installer/Program.cs
================
using System.Diagnostics;

namespace EngineeringManager.Installer;

public class UpdateOptions
{
    public bool IsUpdate { get; set; }
    public string? TargetPath { get; set; }
    public string? DataPath { get; set; }
    public int WaitPid { get; set; }
}

public static class Program
{
    [STAThread]
    static void Main(string[] args)
    {
        Application.SetHighDpiMode(HighDpiMode.SystemAware);
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);

        var opts = ParseArgs(args);
        Application.Run(new InstallerWindow(opts));
    }

    private static UpdateOptions ParseArgs(string[] args)
    {
        var opts = new UpdateOptions();
        for (int i = 0; i < args.Length; i++)
        {
            switch (args[i])
            {
                case "--update":
                    opts.IsUpdate = true;
                    break;
                case "--target" when i + 1 < args.Length:
                    opts.TargetPath = args[++i];
                    break;
                case "--data-path" when i + 1 < args.Length:
                    opts.DataPath = args[++i];
                    break;
                case "--wait-pid" when i + 1 < args.Length:
                    if (int.TryParse(args[++i], out var pid))
                        opts.WaitPid = pid;
                    break;
            }
        }
        return opts;
    }
}

================
File: EngineeringManager.Uninstaller/Program.cs
================
using System.Diagnostics;

namespace EngineeringManager.Uninstaller;

public static class Program
{
    private const string RelaunchedFlag = "--relaunched-from-temp";

    [STAThread]
    static void Main(string[] args)
    {
        Application.SetHighDpiMode(HighDpiMode.SystemAware);
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);

        // 卸载器随程序安装在 <安装目录>\uninstall\。若直接在此运行并删除安装目录,
        // 自身 exe 会被文件锁,导致安装目录删不干净。故先把整个卸载目录复制到 %TEMP%
        // 并重启副本,由副本删除安装目录;副本退出后再自清理临时目录。
        if (RelaunchFromTempIfNeeded(args))
            return;

        Application.Run(new UninstallerWindow());

        // 当前进程若为 %TEMP% 副本,窗口关闭后调度延时自删除临时目录。
        ScheduleTempSelfCleanupIfNeeded();
    }

    /// <summary>
    /// 未带 relaunch 标记且当前不在 %TEMP% 下运行时:把卸载器所在目录整体复制到
    /// %TEMP%\em-uninstall-{guid},启动该副本(带 relaunch 标记),返回 true 表示当前进程应退出。
    /// 任何异常返回 false,回退为原地运行(尽力而为,绝不因此阻断卸载)。
    /// </summary>
    private static bool RelaunchFromTempIfNeeded(string[] args)
    {
        try
        {
            if (args.Contains(RelaunchedFlag))
                return false;

            var baseDir = AppContext.BaseDirectory.TrimEnd('\\');
            var tempRoot = Path.GetFullPath(Path.GetTempPath()).TrimEnd('\\');

            // 已在 %TEMP% 下运行则不再重启(防御,避免递归)
            if (baseDir.StartsWith(tempRoot, StringComparison.OrdinalIgnoreCase))
                return false;

            var tempDir = Path.Combine(Path.GetTempPath(), "em-uninstall-" + Guid.NewGuid().ToString("N"));
            CopyDirectory(baseDir, tempDir);

            var tempExe = Path.Combine(tempDir, "工程管家卸载.exe");
            if (!File.Exists(tempExe))
                return false; // 复制不完整,回退原地运行

            Process.Start(new ProcessStartInfo(tempExe, RelaunchedFlag) { UseShellExecute = true });
            return true;
        }
        catch
        {
            return false;
        }
    }

    /// <summary>窗口关闭后,若当前运行于 %TEMP% 副本,调度一个延时命令删除该临时目录。</summary>
    private static void ScheduleTempSelfCleanupIfNeeded()
    {
        try
        {
            var baseDir = AppContext.BaseDirectory.TrimEnd('\\');
            var tempRoot = Path.GetFullPath(Path.GetTempPath()).TrimEnd('\\');
            if (!baseDir.StartsWith(tempRoot, StringComparison.OrdinalIgnoreCase))
                return;

            Process.Start(new ProcessStartInfo("cmd.exe",
                $"/c timeout /t 3 /nobreak >nul & rmdir /s /q \"{baseDir}\"")
            {
                UseShellExecute = false,
                CreateNoWindow = true
            });
        }
        catch { }
    }

    private static void CopyDirectory(string sourceDir, string destDir)
    {
        Directory.CreateDirectory(destDir);
        foreach (var file in Directory.GetFiles(sourceDir))
            File.Copy(file, Path.Combine(destDir, Path.GetFileName(file)), true);
        foreach (var dir in Directory.GetDirectories(sourceDir))
            CopyDirectory(dir, Path.Combine(destDir, Path.GetFileName(dir)));
    }
}

================
File: EngineeringManager.Uninstaller/UninstallerWindow.cs
================
using Microsoft.Web.WebView2.WinForms;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text.Json;

namespace EngineeringManager.Uninstaller;

public class UninstallerWindow : Form
{
    private WebView2? webView;
    private readonly string _appDir;      // 前端资源目录(exe 同级的 uninstaller\)
    private readonly string _installPath; // 真实安装目录(从 uninstaller.json 解析)

    // ── resize 相关 ──
    private bool _isResizing;
    private int _resizeEdge;
    private Point _resizeStartMouse;
    private Rectangle _resizeStartBounds;

    // ── 双击检测 ──
    private DateTime _lastClickTime = DateTime.MinValue;

    private static readonly string LogFile = Path.Combine(Path.GetTempPath(), "uninstaller-log.txt");

    private static void Log(string msg)
    {
        try { File.AppendAllText(LogFile, $"[{DateTime.Now:HH:mm:ss.fff}] {msg}\n"); } catch { }
        Debug.WriteLine(msg);
    }

    public UninstallerWindow()
    {
        try { File.WriteAllText(LogFile, $"=== 卸载器启动 {DateTime.Now:yyyy-MM-dd HH:mm:ss} ===\n"); } catch { }

        FormBorderStyle = FormBorderStyle.None;

        try
        {
            var iconStream = typeof(UninstallerWindow).Assembly
                .GetManifestResourceStream("EngineeringManager.Uninstaller.app.ico");
            if (iconStream != null) Icon = new Icon(iconStream);
        }
        catch { }

        Size = new Size(520, 580);
        StartPosition = FormStartPosition.CenterScreen;
        ApplyNativeRoundedCorners();

        // 前端资源目录 = 本程序所在目录(exe 同级的 uninstaller\)
        _appDir = AppContext.BaseDirectory;
        Log($"[Uninstaller] appDir: {_appDir}");

        // 真实安装目录:从同目录 uninstaller.json 解析。卸载器位于 <安装目录>\uninstall\,
        // 或已被复制到 %TEMP% 运行,两种情况都不能用 BaseDirectory 当安装目录。
        try
        {
            _installPath = UninstallerService.GetInstallPath();
        }
        catch (Exception ex)
        {
            _installPath = "";
            Log($"[Uninstaller] 解析安装目录失败: {ex.Message}");
        }
        Log($"[Uninstaller] installPath: {_installPath}");
    }

    protected override CreateParams CreateParams
    {
        get
        {
            var cp = base.CreateParams;
            cp.Style |= WS_THICKFRAME | WS_MINIMIZEBOX | WS_MAXIMIZEBOX;
            return cp;
        }
    }

    private void ApplyNativeRoundedCorners()
    {
        try { int p = 2; DwmSetWindowAttribute(Handle, 33, ref p, sizeof(int)); } catch { }
    }

    // ═══ P/Invoke ═══
    [DllImport("dwmapi.dll")] private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attr, ref int attrValue, int attrSize);
    [DllImport("user32.dll")] private static extern void ReleaseCapture();
    [DllImport("user32.dll")] private static extern void SendMessage(IntPtr hWnd, int msg, int wParam, int lParam);
    [DllImport("user32.dll")] private static extern bool SetCapture(IntPtr hWnd);
    [DllImport("user32.dll")] private static extern IntPtr LoadCursor(IntPtr h, IntPtr id);
    [DllImport("user32.dll")] private static extern IntPtr SetCursor(IntPtr h);

    private const int WS_THICKFRAME  = 0x00040000;
    private const int WS_MINIMIZEBOX = 0x00020000;
    private const int WS_MAXIMIZEBOX = 0x00010000;
    private const int HTLEFT = 10, HTRIGHT = 11, HTTOP = 12, HTTOPLEFT = 13;
    private const int HTTOPRIGHT = 14, HTBOTTOM = 15, HTBOTTOMLEFT = 16, HTBOTTOMRIGHT = 17;
    private const int BORDER_SIZE = 6;

    protected override void WndProc(ref Message m)
    {
        if (_isResizing)
        {
            switch (m.Msg)
            {
                case 0x0200: DoResize(Cursor.Position); m.Result = IntPtr.Zero; return;
                case 0x0202: _isResizing = false; ReleaseCapture(); m.Result = IntPtr.Zero; return;
            }
        }
        switch (m.Msg)
        {
            case 0x0083:
                if (m.WParam != IntPtr.Zero) { m.Result = IntPtr.Zero; return; }
                break;
            case 0x0020:
                if (!DesignMode && !_isResizing)
                {
                    int ht = HitTestEdge(Cursor.Position, Bounds);
                    if (ht != 0)
                    {
                        int id = ht switch
                        {
                            HTLEFT or HTRIGHT => 32644,
                            HTTOP or HTBOTTOM => 32645,
                            HTTOPLEFT or HTBOTTOMRIGHT => 32642,
                            _ => 32643
                        };
                        SetCursor(LoadCursor(IntPtr.Zero, (IntPtr)id));
                        m.Result = IntPtr.Zero;
                        return;
                    }
                }
                break;
        }
        base.WndProc(ref m);
    }

    private void DoResize(Point mouse)
    {
        int dx = mouse.X - _resizeStartMouse.X;
        int dy = mouse.Y - _resizeStartMouse.Y;
        var b = _resizeStartBounds;
        int nl = b.Left, nt = b.Top, nw = b.Width, nh = b.Height;
        bool isL = _resizeEdge == HTLEFT || _resizeEdge == HTTOPLEFT || _resizeEdge == HTBOTTOMLEFT;
        bool isR = _resizeEdge == HTRIGHT || _resizeEdge == HTTOPRIGHT || _resizeEdge == HTBOTTOMRIGHT;
        bool isT = _resizeEdge == HTTOP || _resizeEdge == HTTOPLEFT || _resizeEdge == HTTOPRIGHT;
        bool isB = _resizeEdge == HTBOTTOM || _resizeEdge == HTBOTTOMLEFT || _resizeEdge == HTBOTTOMRIGHT;
        if (isL) { nl = b.Left + dx; nw = b.Width - dx; }
        if (isR) nw = b.Width + dx;
        if (isT) { nt = b.Top + dy; nh = b.Height - dy; }
        if (isB) nh = b.Height + dy;
        if (nw < 200) { nw = 200; if (isL) nl = b.Right - 200; }
        if (nh < 200) { nh = 200; if (isT) nt = b.Bottom - 200; }
        SetBounds(nl, nt, nw, nh);
    }

    private static int HitTestEdge(Point cursor, Rectangle rect)
    {
        bool l = cursor.X <= rect.Left + BORDER_SIZE;
        bool r = cursor.X >= rect.Right - BORDER_SIZE;
        bool t = cursor.Y <= rect.Top + BORDER_SIZE;
        bool b = cursor.Y >= rect.Bottom - BORDER_SIZE;
        if (t && l) return HTTOPLEFT;
        if (t && r) return HTTOPRIGHT;
        if (b && l) return HTBOTTOMLEFT;
        if (b && r) return HTBOTTOMRIGHT;
        if (l) return HTLEFT;
        if (r) return HTRIGHT;
        if (t) return HTTOP;
        if (b) return HTBOTTOM;
        return 0;
    }

    // ═══ WebView2 ═══
    protected override async void OnLoad(EventArgs e)
    {
        base.OnLoad(e);
        try
        {
            webView = new WebView2 { Dock = DockStyle.Fill };
            Controls.Add(webView);

            var webView2CacheDir = Path.Combine(Path.GetTempPath(), "uninstaller-webview2");
            try { if (Directory.Exists(webView2CacheDir)) Directory.Delete(webView2CacheDir, true); } catch { }

            var env = await Microsoft.Web.WebView2.Core.CoreWebView2Environment.CreateAsync(
                null, webView2CacheDir,
                new Microsoft.Web.WebView2.Core.CoreWebView2EnvironmentOptions("--allow-file-access-from-files"));
            await webView.EnsureCoreWebView2Async(env);

            webView.CoreWebView2.Settings.IsStatusBarEnabled = false;
            webView.CoreWebView2.Settings.AreDevToolsEnabled = true;
            webView.CoreWebView2.Settings.IsWebMessageEnabled = true;
            webView.CoreWebView2.WebMessageReceived += OnWebMessage;

            var indexPath = Path.Combine(_appDir, "uninstaller", "index.html");
            Log($"[Uninstaller] indexPath: {indexPath}");

            if (File.Exists(indexPath))
            {
                webView.CoreWebView2.Navigate("file:///" + indexPath.Replace('\\', '/'));
                webView.CoreWebView2.NavigationCompleted += (s, args) =>
                {
                    EvalJS($"window.__setInstallPath?.('{EscapeJS(_installPath)}')");
                };
            }
            else
            {
                webView.CoreWebView2.NavigateToString(@"
                    <html><body style='display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background:#f8fafc;color:#0f172a'>
                    <div style='text-align:center'><h2>卸载器资源缺失</h2><p>无法找到卸载器前端文件</p></div></body></html>");
            }
        }
        catch (Exception ex)
        {
            Log($"[Uninstaller] OnLoad error: {ex}");
            MessageBox.Show($"初始化失败：{ex.Message}", "错误", MessageBoxButtons.OK, MessageBoxIcon.Error);
            Close();
        }
    }

    // ═══ 消息处理 ═══
    private void OnWebMessage(object? s, Microsoft.Web.WebView2.Core.CoreWebView2WebMessageReceivedEventArgs e)
    {
        try
        {
            var raw = e.TryGetWebMessageAsString();
            var j = JsonDocument.Parse(raw);
            var a = j.RootElement.GetProperty("action").GetString();
            Log($"[Uninstaller] Action: {a}");
            Invoke(() =>
            {
                try
                {
                    switch (a)
                    {
                        case "startDrag":
                            var now = DateTime.Now;
                            if ((now - _lastClickTime).TotalMilliseconds < 500)
                            { _lastClickTime = DateTime.MinValue; ToggleMaximize(); }
                            else
                            { _lastClickTime = now; ReleaseCapture(); SendMessage(Handle, 0xA1, 0x2, 0); }
                            break;
                        case "startResize":
                            var edge = j.RootElement.GetProperty("edge").GetString() ?? "";
                            int htVal = edge switch
                            {
                                "left" => HTLEFT, "right" => HTRIGHT, "top" => HTTOP, "bottom" => HTBOTTOM,
                                "top-left" => HTTOPLEFT, "top-right" => HTTOPRIGHT,
                                "bottom-left" => HTBOTTOMLEFT, "bottom-right" => HTBOTTOMRIGHT, _ => 0
                            };
                            if (htVal != 0)
                            { _isResizing = true; _resizeEdge = htVal; _resizeStartMouse = Cursor.Position; _resizeStartBounds = Bounds; SetCapture(Handle); }
                            break;
                        case "minimize": WindowState = FormWindowState.Minimized; break;
                        case "maximize": ToggleMaximize(); break;
                        case "close": Close(); break;
                        case "uninstall":
                            Log("[Uninstaller] Uninstall requested");
                            _ = Task.Run(async () =>
                            {
                                try { await DoUninstall(); }
                                catch (Exception ex)
                                {
                                    Log($"[Uninstaller] Exception: {ex}");
                                    EvalJS($"window.__installError?.('卸载失败: {EscapeJS(ex.Message)}')");
                                }
                            });
                            break;
                    }
                }
                catch (Exception innerEx) { Log($"[Uninstaller] Inner error: {innerEx}"); }
            });
        }
        catch (Exception outerEx) { Log($"[Uninstaller] OnWebMessage error: {outerEx}"); }
    }

    private void EvalJS(string js)
    {
        try { webView?.CoreWebView2?.ExecuteScriptAsync(js); }
        catch (Exception ex) { Log($"[Uninstaller] EvalJS error: {ex.Message}"); }
    }

    private async Task DoUninstall()
    {
        Log($"[Uninstaller] 开始卸载: {_installPath}");

        if (string.IsNullOrEmpty(_installPath) || !Directory.Exists(_installPath))
        {
            Log("[Uninstaller] 无法确定安装目录,终止卸载");
            BeginInvoke(() => EvalJS("window.__installError?.('无法确定安装目录,卸载已终止')"));
            return;
        }

        var service = new UninstallerService();
        await service.Uninstall(_installPath, (percent, step) =>
        {
            BeginInvoke(() => EvalJS($"window.__updateProgress?.({percent}, '{EscapeJS(step)}')"));
        });

        Log("[Uninstaller] 卸载完成");
        BeginInvoke(() =>
        {
            EvalJS("window.__installComplete?.()");
        });
    }

    private void ToggleMaximize()
    {
        WindowState = WindowState == FormWindowState.Maximized ? FormWindowState.Normal : FormWindowState.Maximized;
    }

    private static string EscapeJS(string s) => s.Replace("\\", "\\\\").Replace("'", "\\'").Replace("\n", "\\n");
}

================
File: installer/src/components/DataPathStep.tsx
================
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

interface Props {
  defaultPath: string
  onNext: (dataPath: string) => void
  onBack: () => void
}

export default function DataPathStep({ defaultPath, onNext, onBack }: Props) {
  const [path, setPath] = useState(defaultPath)

  // 监听 C# 回传的数据路径选择
  useEffect(() => {
    // @ts-ignore
    const wv = window.chrome?.webview
    if (!wv) return
    const handler = (e: any) => {
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data
        if (data?.type === 'selectedDataPath') {
          setPath(data.path)
        }
      } catch {}
    }
    wv.addEventListener('message', handler)
    return () => wv.removeEventListener('message', handler)
  }, [])

  const browse = () => {
    // @ts-ignore — C# postMessage 桥接
    window.chrome?.webview?.postMessage(JSON.stringify({ action: 'browseDataPath' }))
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      padding: '48px 36px 24px',
      position: 'relative',
      zIndex: 1,
    }}>
      {/* 标题 */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--fg)', marginBottom: 4 }}>
          选择数据存储位置
        </h2>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>
          项目数据、数据库将存储在此目录。安装后可在设置中修改。
        </p>
      </motion.div>

      {/* 路径输入卡片 */}
      <motion.div
        className="card"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 25 }}
        style={{ marginBottom: 16 }}
      >
        <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 8 }}>
          数据存储路径
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="input"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            style={{ flex: 1, fontFamily: 'monospace', fontSize: 13 }}
          />
          <motion.button
            className="btn btn-ghost"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={browse}
          >
            浏览
          </motion.button>
        </div>
      </motion.div>

      {/* 说明 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        style={{ marginBottom: 24, fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}
      >
        <p>• 数据库文件（engineering.db）和上传的附件将存储在此目录</p>
        <p>• 此目录不会被卸载程序删除，请选择安全的位置</p>
        <p>• 建议使用非系统盘（如 D:\工程管家数据）</p>
      </motion.div>

      {/* 按钮区 */}
      <div style={{ marginTop: 'auto', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <motion.button
          className="btn btn-ghost"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onBack}
        >
          上一步
        </motion.button>
        <motion.button
          className="btn btn-primary"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          whileHover={{ scale: 1.03, boxShadow: '0 0 20px var(--accent-soft)' }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onNext(path)}
        >
          开始安装
        </motion.button>
      </div>
    </div>
  )
}

================
File: installer/src/components/Logo.tsx
================
import { motion } from 'framer-motion'

interface Props {
  size?: number
  glow?: boolean
  spin?: boolean
}

export default function Logo({ size = 64, glow = false, spin = false }: Props) {
  return (
    <motion.div
      initial={{ scale: 0.3, opacity: 0 }}
      animate={{
        scale: 1,
        opacity: 1,
        rotate: spin ? 360 : 0,
      }}
      transition={
        spin
          ? { rotate: { duration: 20, repeat: Infinity, ease: 'linear' }, scale: { type: 'spring', stiffness: 200, damping: 20 } }
          : { type: 'spring', stiffness: 200, damping: 20, delay: 0.2 }
      }
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 18 18"
        fill="none"
        style={{
          filter: glow
            ? 'drop-shadow(0 0 12px var(--accent)) drop-shadow(0 0 24px var(--accent-soft))'
            : undefined,
        }}
      >
        <defs>
          <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="var(--accent-strong)" />
          </linearGradient>
          <mask id="logo-mask">
            <rect width="18" height="18" fill="white"/>
            <path d="M5 14 L9 6 L13 14 Z" fill="black"/>
          </mask>
        </defs>
        <path d="M2 15.5 L9 2.5 L16 15.5 Z" fill="url(#logo-grad)" mask="url(#logo-mask)" />
      </svg>
    </motion.div>
  )
}

================
File: installer/src/components/PathStep.tsx
================
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

interface Props {
  defaultPath: string
  onNext: (path: string) => void
  onBack: () => void
}

export default function PathStep({ defaultPath, onNext, onBack }: Props) {
  const [path, setPath] = useState(defaultPath)

  // 监听 C# 回传的路径选择
  useEffect(() => {
    // @ts-ignore
    const wv = window.chrome?.webview
    if (!wv) return
    const handler = (e: any) => {
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data
        if (data?.type === 'selectedPath') {
          setPath(data.path)
        }
      } catch {}
    }
    wv.addEventListener('message', handler)
    return () => wv.removeEventListener('message', handler)
  }, [])

  const browse = () => {
    // @ts-ignore — C# postMessage 桥接
    window.chrome?.webview?.postMessage(JSON.stringify({ action: 'browsePath' }))
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      padding: '48px 36px 24px',
      position: 'relative',
      zIndex: 1,
    }}>
      {/* 标题 */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--fg)', marginBottom: 4 }}>
          选择安装位置
        </h2>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>
          软件将安装到以下目录
        </p>
      </motion.div>

      {/* 路径输入卡片 */}
      <motion.div
        className="card"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 25 }}
        style={{ marginBottom: 16 }}
      >
        <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 8 }}>
          安装路径
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="input"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            style={{ flex: 1, fontFamily: 'monospace', fontSize: 13 }}
          />
          <motion.button
            className="btn btn-ghost"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={browse}
          >
            浏览
          </motion.button>
        </div>
      </motion.div>

      {/* 磁盘信息 */}
      <motion.div
        className="card"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.35, type: 'spring', stiffness: 200, damping: 25 }}
        style={{ marginBottom: 24, display: 'flex', gap: 24 }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>所需空间</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--fg)' }}>~70 MB</div>
        </div>
        <div style={{ width: 1, background: 'var(--border)' }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>磁盘剩余</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--success)' }}>充足</div>
        </div>
      </motion.div>

      {/* 按钮区 */}
      <div style={{ marginTop: 'auto', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <motion.button
          className="btn btn-ghost"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onBack}
        >
          上一步
        </motion.button>
        <motion.button
          className="btn btn-primary"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          whileHover={{ scale: 1.03, boxShadow: '0 0 20px var(--accent-soft)' }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onNext(path)}
        >
          下一步
        </motion.button>
      </div>
    </div>
  )
}

================
File: EngineeringManager.Installer/EngineeringManager.Installer.csproj
================
<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <TargetFramework>net8.0-windows</TargetFramework>
    <UseWindowsForms>true</UseWindowsForms>
    <OutputType>WinExe</OutputType>
    <ApplicationIcon>app.ico</ApplicationIcon>
    <NoWarn>MSB3277</NoWarn>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <PublishSingleFile>true</PublishSingleFile>
    <SelfContained>true</SelfContained>
    <RuntimeIdentifier>win-x64</RuntimeIdentifier>
    <EnableCompressionInSingleFile>true</EnableCompressionInSingleFile>
    <IncludeNativeLibrariesForSelfExtract>true</IncludeNativeLibrariesForSelfExtract>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.Web.WebView2" Version="1.0.3967.48" />
  </ItemGroup>

  <ItemGroup>
    <!-- app.ico 同时作为 Content（exe 图标）和 EmbeddedResource（运行时加载） -->
    <Content Include="app.ico">
      <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
    </Content>
    <EmbeddedResource Include="app.ico" LogicalName="EngineeringManager.Installer.app.ico" />
  </ItemGroup>

</Project>

================
File: installer/src/components/ThemeSwitcher.tsx
================
import { motion } from 'framer-motion'

type Theme = 'white' | 'graphite' | 'sandstone'

const THEMES: { id: Theme; color: string; label: string }[] = [
  { id: 'white',     color: '#2563eb', label: 'White' },
  { id: 'graphite',  color: '#ff8c32', label: 'Graphite' },
  { id: 'sandstone', color: '#d97706', label: 'Sandstone' },
]

interface Props {
  current: Theme
  onChange: (theme: Theme) => void
  onClose?: () => void
}

export default function ThemeSwitcher({ current, onChange, onClose }: Props) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 8,
        right: 12,
        display: 'flex',
        gap: 4,
        zIndex: 200,
        alignItems: 'center',
        padding: '4px 8px',
        borderRadius: 20,
        background: 'var(--panel)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
        transition: 'all 0.3s ease',
        // @ts-ignore
        WebkitAppRegion: 'no-drag',
      } as React.CSSProperties}
    >
      {THEMES.map((t) => (
        <motion.button
          key={t.id}
          className={`theme-btn ${current === t.id ? 'active' : ''}`}
          style={{
            background: t.color,
            borderColor: current === t.id ? t.color : 'var(--border)',
          }}
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => onChange(t.id)}
          title={t.label}
        />
      ))}
      {onClose && (
        <>
          <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 4px' }} />
          <motion.button
            onClick={onClose}
            style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              border: 'none',
              background: 'transparent',
              color: 'var(--muted)',
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
            }}
            whileHover={{ background: 'var(--danger)', color: 'white', scale: 1.1 }}
          >
            ×
          </motion.button>
        </>
      )}
    </div>
  )
}

================
File: EngineeringManager.Installer/InstallerWindow.cs
================
using Microsoft.Web.WebView2.WinForms;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text.Json;

namespace EngineeringManager.Installer;

public class InstallerWindow : Form
{
    private WebView2? webView;
    private string _frontendDir = "";
    private readonly UpdateOptions _opts;

    // ── resize 相关 ──
    private bool _isResizing;
    private int _resizeEdge;
    private Point _resizeStartMouse;
    private Rectangle _resizeStartBounds;

    // ── 双击检测 ──
    private DateTime _lastClickTime = DateTime.MinValue;
    private bool _initSent;

    private void SendInit()
    {
        if (_initSent) return;
        _initSent = true;
        // 始终下发默认值，让前端用计算值而非硬编码
        var defaultDataPath = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData) + @"\工程管家";
        if (_opts.IsUpdate)
            SendToWeb(new { type = "init", mode = "update", installPath = _opts.TargetPath, dataPath = _opts.DataPath });
        else
            SendToWeb(new { type = "init", mode = "fresh", defaultDataPath });
    }

    public InstallerWindow(UpdateOptions? opts = null)
    {
        _opts = opts ?? new UpdateOptions();
        FormBorderStyle = FormBorderStyle.None;

        // 从嵌入资源加载图标
        try
        {
            var iconStream = typeof(InstallerWindow).Assembly
                .GetManifestResourceStream("EngineeringManager.Installer.app.ico");
            if (iconStream != null) Icon = new Icon(iconStream);
        }
        catch { }

        Size = new Size(520, 580);
        StartPosition = FormStartPosition.CenterScreen;
        ApplyNativeRoundedCorners();

        // 预解压：在构造函数中同步解压，确保 OnLoad 时文件已就绪
        try
        {
            _frontendDir = InstallerService.GetInstallerFrontendDir();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Installer] 解压失败: {ex.Message}");
        }
    }

    protected override CreateParams CreateParams
    {
        get
        {
            var cp = base.CreateParams;
            cp.Style |= WS_THICKFRAME | WS_MINIMIZEBOX | WS_MAXIMIZEBOX;
            return cp;
        }
    }

    private void ApplyNativeRoundedCorners()
    {
        try { int p = 2; DwmSetWindowAttribute(Handle, 33, ref p, sizeof(int)); } catch { }
    }

    // ═══ P/Invoke ═══
    [DllImport("dwmapi.dll")] private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attr, ref int attrValue, int attrSize);
    [DllImport("user32.dll")] private static extern void ReleaseCapture();
    [DllImport("user32.dll")] private static extern void SendMessage(IntPtr hWnd, int msg, int wParam, int lParam);
    [DllImport("user32.dll")] private static extern bool SetCapture(IntPtr hWnd);
    [DllImport("user32.dll")] private static extern IntPtr LoadCursor(IntPtr h, IntPtr id);
    [DllImport("user32.dll")] private static extern IntPtr SetCursor(IntPtr h);

    private const int WS_THICKFRAME  = 0x00040000;
    private const int WS_MINIMIZEBOX = 0x00020000;
    private const int WS_MAXIMIZEBOX = 0x00010000;
    private const int HTLEFT = 10, HTRIGHT = 11, HTTOP = 12, HTTOPLEFT = 13;
    private const int HTTOPRIGHT = 14, HTBOTTOM = 15, HTBOTTOMLEFT = 16, HTBOTTOMRIGHT = 17;
    private const int BORDER_SIZE = 6;

    // ═══ WndProc ═══
    protected override void WndProc(ref Message m)
    {
        if (_isResizing)
        {
            switch (m.Msg)
            {
                case 0x0200: DoResize(Cursor.Position); m.Result = IntPtr.Zero; return;
                case 0x0202: _isResizing = false; ReleaseCapture(); m.Result = IntPtr.Zero; return;
            }
        }

        switch (m.Msg)
        {
            case 0x0083:
                if (m.WParam != IntPtr.Zero) { m.Result = IntPtr.Zero; return; }
                break;
            case 0x0020:
                if (!DesignMode && !_isResizing)
                {
                    int ht = HitTestEdge(Cursor.Position, Bounds);
                    if (ht != 0)
                    {
                        int id = ht switch
                        {
                            HTLEFT or HTRIGHT => 32644,
                            HTTOP or HTBOTTOM => 32645,
                            HTTOPLEFT or HTBOTTOMRIGHT => 32642,
                            _ => 32643
                        };
                        SetCursor(LoadCursor(IntPtr.Zero, (IntPtr)id));
                        m.Result = IntPtr.Zero;
                        return;
                    }
                }
                break;
        }
        base.WndProc(ref m);
    }

    // ═══ Resize ═══
    private void DoResize(Point mouse)
    {
        int dx = mouse.X - _resizeStartMouse.X;
        int dy = mouse.Y - _resizeStartMouse.Y;
        var b = _resizeStartBounds;
        int nl = b.Left, nt = b.Top, nw = b.Width, nh = b.Height;

        bool isL = _resizeEdge == HTLEFT   || _resizeEdge == HTTOPLEFT   || _resizeEdge == HTBOTTOMLEFT;
        bool isR = _resizeEdge == HTRIGHT  || _resizeEdge == HTTOPRIGHT  || _resizeEdge == HTBOTTOMRIGHT;
        bool isT = _resizeEdge == HTTOP    || _resizeEdge == HTTOPLEFT   || _resizeEdge == HTTOPRIGHT;
        bool isB = _resizeEdge == HTBOTTOM || _resizeEdge == HTBOTTOMLEFT || _resizeEdge == HTBOTTOMRIGHT;

        if (isL) { nl = b.Left + dx; nw = b.Width - dx; }
        if (isR) { nw = b.Width + dx; }
        if (isT) { nt = b.Top + dy;  nh = b.Height - dy; }
        if (isB) { nh = b.Height + dy; }

        if (nw < 200) { nw = 200; if (isL) nl = b.Right - 200; }
        if (nh < 200) { nh = 200; if (isT) nt = b.Bottom - 200; }

        SetBounds(nl, nt, nw, nh);
    }

    private static int HitTestEdge(Point cursor, Rectangle rect)
    {
        bool l = cursor.X <= rect.Left + BORDER_SIZE;
        bool r = cursor.X >= rect.Right - BORDER_SIZE;
        bool t = cursor.Y <= rect.Top + BORDER_SIZE;
        bool b = cursor.Y >= rect.Bottom - BORDER_SIZE;
        if (t && l) return HTTOPLEFT;
        if (t && r) return HTTOPRIGHT;
        if (b && l) return HTBOTTOMLEFT;
        if (b && r) return HTBOTTOMRIGHT;
        if (l) return HTLEFT;
        if (r) return HTRIGHT;
        if (t) return HTTOP;
        if (b) return HTBOTTOM;
        return 0;
    }

    // ═══ WebView2 ═══
    protected override async void OnLoad(EventArgs e)
    {
        base.OnLoad(e);
        try
        {
            webView = new WebView2 { Dock = DockStyle.Fill };
            Controls.Add(webView);

            var env = await Microsoft.Web.WebView2.Core.CoreWebView2Environment.CreateAsync(
                null, Path.Combine(Path.GetTempPath(), "installer-webview2"));
            await webView.EnsureCoreWebView2Async(env);

            webView.CoreWebView2.Settings.IsStatusBarEnabled = false;
            webView.CoreWebView2.Settings.AreDevToolsEnabled = true;
            webView.CoreWebView2.Settings.IsWebMessageEnabled = true;
            webView.CoreWebView2.WebMessageReceived += OnWebMessage;

            // 加载前端（用虚拟域名避免 file:// CORS 限制）
            var indexPath = Path.Combine(_frontendDir, "index.html");
            if (!string.IsNullOrEmpty(_frontendDir) && File.Exists(indexPath))
            {
                webView.CoreWebView2.SetVirtualHostNameToFolderMapping(
                    "installer.local", _frontendDir,
                    Microsoft.Web.WebView2.Core.CoreWebView2HostResourceAccessKind.Allow);
                            webView.CoreWebView2.Navigate("http://installer.local/index.html");

                // 导航完成后等待前端 ready 握手（不再直接发 init，避免竞态）
            }
            else
            {
                webView.CoreWebView2.NavigateToString(@"
                    <html><body style='display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background:#f8fafc;color:#0f172a'>
                    <div style='text-align:center'>
                        <h2>安装器资源缺失</h2>
                        <p>找不到安装资源包 (payload.zip)</p>
                        <p style='color:#94a3b8;font-size:12px'>请确保安装器文件完整</p>
                    </div></body></html>");
            }
        }
        catch (Exception ex)
        {
            MessageBox.Show($"初始化失败：{ex.Message}", "错误", MessageBoxButtons.OK, MessageBoxIcon.Error);
            Close();
        }
    }

    // ═══ 消息处理 ═══
    private void OnWebMessage(object? s, Microsoft.Web.WebView2.Core.CoreWebView2WebMessageReceivedEventArgs e)
    {
        try
        {
            var raw = e.TryGetWebMessageAsString();
            if (string.IsNullOrEmpty(raw)) raw = e.WebMessageAsJson;
            var j = JsonDocument.Parse(raw);
            var a = j.RootElement.GetProperty("action").GetString();
            Invoke(() =>
            {
                switch (a)
                {
                    case "startDrag":
                        var now = DateTime.Now;
                        if ((now - _lastClickTime).TotalMilliseconds < 500)
                        { _lastClickTime = DateTime.MinValue; ToggleMaximize(); }
                        else
                        { _lastClickTime = now; ReleaseCapture(); SendMessage(Handle, 0xA1, 0x2, 0); }
                        break;
                    case "startResize":
                        var edge = j.RootElement.GetProperty("edge").GetString() ?? "";
                        int htVal = edge switch
                        {
                            "left" => HTLEFT, "right" => HTRIGHT, "top" => HTTOP, "bottom" => HTBOTTOM,
                            "top-left" => HTTOPLEFT, "top-right" => HTTOPRIGHT,
                            "bottom-left" => HTBOTTOMLEFT, "bottom-right" => HTBOTTOMRIGHT, _ => 0
                        };
                        if (htVal != 0)
                        {
                            _isResizing = true; _resizeEdge = htVal;
                            _resizeStartMouse = Cursor.Position; _resizeStartBounds = Bounds;
                            SetCapture(Handle);
                        }
                        break;
                    case "minimize": WindowState = FormWindowState.Minimized; break;
                    case "maximize": ToggleMaximize(); break;
                    case "close": Close(); break;
                    case "ready": SendInit(); break;
                    case "browsePath":
                        using (var dlg = new FolderBrowserDialog())
                        {
                            dlg.Description = "选择安装位置";
                            if (dlg.ShowDialog(this) == DialogResult.OK)
                                SendToWeb(new { type = "selectedPath", path = dlg.SelectedPath });
                        }
                        break;
                    case "browseDataPath":
                        using (var dlg = new FolderBrowserDialog())
                        {
                            dlg.Description = "选择数据存储位置";
                            if (dlg.ShowDialog(this) == DialogResult.OK)
                                SendToWeb(new { type = "selectedDataPath", path = dlg.SelectedPath });
                        }
                        break;
                    case "install":
                        var installPath = j.RootElement.GetProperty("path").GetString() ?? "";
                        var dataPath = j.RootElement.TryGetProperty("dataPath", out var dpEl) ? (dpEl.GetString() ?? "") : "";
                        InstallerLog($"[OnWebMessage] install received: installPath='{installPath}', dataPath='{dataPath}', raw={raw}");
                        Task.Run(() => DoInstall(installPath, dataPath));
                        break;
                    case "launch":
                        var exePath = j.RootElement.GetProperty("path").GetString() ?? "";
                        if (File.Exists(exePath))
                            Process.Start(new ProcessStartInfo(exePath) { UseShellExecute = true });
                        Close();
                        break;
                }
            });
        }
        catch { }
    }

    private void SendToWeb(object data)
    {
        if (InvokeRequired)
        {
            Invoke(() => webView?.CoreWebView2?.PostWebMessageAsJson(JsonSerializer.Serialize(data)));
        }
        else
        {
            webView?.CoreWebView2?.PostWebMessageAsJson(JsonSerializer.Serialize(data));
        }
    }

    private async void DoInstall(string installPath, string dataPath)
    {
        try
        {
            InstallerLog($"[DoInstall] 入口: installPath='{installPath}', dataPath='{dataPath}', IsUpdate={_opts.IsUpdate}, opts.DataPath='{_opts.DataPath}'");
            // 更新模式：等待旧进程退出
            if (_opts.WaitPid > 0)
            {
                SendToWeb(new { type = "progress", percent = 0, step = "等待旧版本退出..." });
                try
                {
                    var oldProc = Process.GetProcessById(_opts.WaitPid);
                    oldProc.WaitForExit(15000);
                }
                catch { }

                // 兜底：按进程名杀残留
                foreach (var p in Process.GetProcessesByName("EngineeringManager.Api"))
                {
                    try { p.Kill(); p.WaitForExit(5000); } catch { }
                }
            }

            // 更新模式下使用传入的路径
            var actualTarget = _opts.IsUpdate && !string.IsNullOrEmpty(_opts.TargetPath)
                ? _opts.TargetPath : installPath;
            var actualDataPath = _opts.IsUpdate && !string.IsNullOrEmpty(_opts.DataPath)
                ? _opts.DataPath : dataPath;

            InstallerLog($"[DoInstall] 调用 Install: actualTarget='{actualTarget}', actualDataPath='{actualDataPath}', isUpdate={_opts.IsUpdate}");
            var service = new InstallerService();
            await service.Install(actualTarget, actualDataPath, _opts.IsUpdate, (percent, step) =>
            {
                SendToWeb(new { type = "progress", percent, step });
            });
            SendToWeb(new { type = "installComplete", path = actualTarget });
        }
        catch (Exception ex)
        {
            SendToWeb(new { type = "installError", message = ex.Message });
        }
    }

    private static void InstallerLog(string msg)
    {
        try
        {
            var logPath = Path.Combine(Path.GetTempPath(), "工程管家-installer-debug.log");
            File.AppendAllText(logPath, $"[{DateTime.Now:yyyy-MM-dd HH:mm:ss.fff}] {msg}\n");
        }
        catch { }
    }

    private void ToggleMaximize()
    {
        WindowState = WindowState == FormWindowState.Maximized
            ? FormWindowState.Normal : FormWindowState.Maximized;
    }
}

================
File: installer/package.json
================
{
  "name": "installer",
  "version": "0.82.1",
  "description": "",
  "main": "index.js",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "type": "commonjs",
  "dependencies": {
    "framer-motion": "^12.40.0",
    "react": "^19.2.7",
    "react-dom": "^19.2.7"
  },
  "devDependencies": {
    "@types/react": "^19.2.16",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.2",
    "typescript": "^6.0.3",
    "vite": "^8.0.16"
  }
}

================
File: EngineeringManager.Installer/InstallerService.cs
================
using System.Diagnostics;
using System.IO.Compression;
using System.Reflection;

namespace EngineeringManager.Installer;

public class InstallerService
{
    private static readonly string TempDir = Path.Combine(Path.GetTempPath(), "engineering-manager-installer");

    private const string PayloadMagic = "EMPAYLD1"; // 必须正好 8 字节
    private const int    FooterSize   = 16;         // 8(magic) + 8(Int64 长度)

    /// <summary>
    /// 解压 payload 到临时目录，返回解压路径。
    /// 优先从 exe 尾部追加段读取（单文件安装器），回退到 exe 同目录的 payload.zip。
    /// </summary>
    public static string ExtractPayload()
    {
        // 如果已解压过（WebView2 正在使用），直接返回，不重复解压
        if (Directory.Exists(TempDir) && Directory.Exists(Path.Combine(TempDir, "app-files")))
            return TempDir;

        if (Directory.Exists(TempDir))
            try { Directory.Delete(TempDir, true); } catch { }
        Directory.CreateDirectory(TempDir);

        using var payload = OpenPayloadStream();
        using var archive = new ZipArchive(payload, ZipArchiveMode.Read);
        archive.ExtractToDirectory(TempDir, overwriteFiles: true);
        return TempDir;
    }

    /// <summary>
    /// 从 exe 尾部追加段读取 payload；回退到 exe 同目录的 payload.zip
    /// </summary>
    private static Stream OpenPayloadStream()
    {
        var exePath = Environment.ProcessPath
            ?? Process.GetCurrentProcess().MainModule!.FileName;

        using (var fs = new FileStream(exePath, FileMode.Open, FileAccess.Read, FileShare.Read))
        {
            if (fs.Length > FooterSize)
            {
                fs.Seek(-FooterSize, SeekOrigin.End);
                var footer = new byte[FooterSize];
                fs.ReadExactly(footer, 0, FooterSize);
                var magic = System.Text.Encoding.ASCII.GetString(footer, 0, 8);
                if (magic == PayloadMagic)
                {
                    long len = BitConverter.ToInt64(footer, 8); // 小端
                    if (len > 0 && len <= fs.Length - FooterSize)
                    {
                        long start = fs.Length - FooterSize - len;
                        fs.Seek(start, SeekOrigin.Begin);
                        var buf = new byte[len];
                        fs.ReadExactly(buf, 0, (int)len);
                        return new MemoryStream(buf, writable: false);
                    }
                }
            }
        }

        // 回退：exe 同目录的 payload.zip
        var sideCar = Path.Combine(AppContext.BaseDirectory, "payload.zip");
        if (File.Exists(sideCar))
            return new FileStream(sideCar, FileMode.Open, FileAccess.Read, FileShare.Read);

        throw new FileNotFoundException(
            "找不到安装资源包 (payload.zip)：exe 尾部无有效追加段，且同目录无 payload.zip");
    }

    /// <summary>
    /// 安装到指定目录
    /// </summary>
    /// <param name="targetPath">安装目录</param>
    /// <param name="dataPath">数据存储路径</param>
    /// <param name="isUpdate">是否更新模式（跳过快捷方式、不覆盖已有 dataPath）</param>
    /// <param name="onProgress">进度回调</param>
    public async Task Install(string targetPath, string dataPath, bool isUpdate, Action<int, string> onProgress)
    {
        Directory.CreateDirectory(targetPath);

        // 更新模式：先杀旧进程 + 清理旧 dist/ 目录
        if (isUpdate)
        {
            // 杀掉正在运行的 EngineeringManager.Api.exe（否则 exe 文件被锁无法覆盖）
            KillRunningProcesses(targetPath);

            var oldDist = Path.Combine(targetPath, "dist");
            if (Directory.Exists(oldDist))
            {
                try { Directory.Delete(oldDist, true); }
                catch { /* 文件被占用则忽略，新文件会覆盖 */ }
            }
        }

        // 从嵌入资源解压
        onProgress(0, "正在释放安装文件...");
        var sourceDir = ExtractPayload();

        // 找到 app-files 目录（zip 里的结构：app-files/... + installer/dist/...）
        var appFilesDir = Path.Combine(sourceDir, "app-files");
        if (!Directory.Exists(appFilesDir))
            throw new DirectoryNotFoundException($"安装资源目录不存在: {appFilesDir}");

        var files = Directory.GetFiles(appFilesDir, "*", SearchOption.AllDirectories);
        var total = files.Length;

        for (int i = 0; i < total; i++)
        {
            var file = files[i];
            var relativePath = Path.GetRelativePath(appFilesDir, file);
            var destPath = Path.Combine(targetPath, relativePath);

            var destDir = Path.GetDirectoryName(destPath);
            if (destDir != null) Directory.CreateDirectory(destDir);

            // 带重试的文件复制（更新模式下文件可能被占用）
            await CopyFileWithRetry(file, destPath);

            var percent = (int)((i + 1) / (double)total * 100);
            var step = (i + 1) switch
            {
                < 30 => "正在解压程序文件...",
                < 60 => "正在配置运行环境...",
                < 80 => "正在初始化数据库...",
                < 95 => "正在创建快捷方式...",
                _ => "即将完成..."
            };
            onProgress(percent, step);

            await Task.Delay(10);
        }

        // 快捷方式（更新模式下覆盖同名，不重复堆叠）
        onProgress(95, "正在创建桌面快捷方式...");
        CreateShortcut(targetPath);

        // 写入数据存储路径配置（更新模式下：若用户未显式改动则保留现有 config.json）
        WriteDataPathConfig(dataPath, isUpdate);

        // 注册卸载信息（uninstaller.json + "程序和功能"注册表项）
        onProgress(98, "正在注册卸载信息...");
        RegisterUninstaller(targetPath);

        onProgress(100, isUpdate ? "更新完成！" : "安装完成！");

        // 清理临时文件
        try { Directory.Delete(sourceDir, true); } catch { }
    }

    // 兼容旧签名
    public Task Install(string targetPath, string dataPath, Action<int, string> onProgress)
        => Install(targetPath, dataPath, false, onProgress);

    /// <summary>
    /// 杀掉指定安装目录下正在运行的 EngineeringManager.Api.exe 及其子进程（msedgewebview2）。
    /// 更新模式下必须先杀进程，否则 exe 文件被锁无法覆盖。
    /// 硬化：不再静默吞异常，所有失败写入 installer-debug.log；主程序进程名唯一，
    /// 读不到路径时降级为按名强杀；msedgewebview2 为共享进程，仅在路径匹配时才杀，
    /// 读不到路径则跳过（避免误杀安装器自身或其他应用的 WebView2）。
    /// </summary>
    private static void KillRunningProcesses(string targetPath)
    {
        var exePath = Path.Combine(targetPath, "EngineeringManager.Api.exe");
        var normalizedTarget = Path.GetFullPath(targetPath).TrimEnd('\\').ToLowerInvariant();

        // 主程序：进程名唯一属于本应用，路径读不到时可降级按名强杀
        KillMatchingProcesses("EngineeringManager.Api", normalizedTarget, waitMs: 5000, allowNameOnlyFallback: true);
        // WebView2：共享进程，仅在路径匹配安装目录时才杀，读不到路径一律跳过
        KillMatchingProcesses("msedgewebview2", normalizedTarget, waitMs: 3000, allowNameOnlyFallback: false);

        // 给操作系统一点时间释放文件句柄
        Thread.Sleep(500);

        // 最终校验：若目标 exe 仍被占用，显式告警（不再静默，便于发版排障）
        if (File.Exists(exePath) && IsFileLocked(exePath))
            InstallerLog($"[KillRunningProcesses] 警告: 杀进程后 {exePath} 仍被占用，覆盖可能失败");
    }

    /// <summary>
    /// 按进程名结束匹配安装目录的进程。
    /// allowNameOnlyFallback=true 时，读不到进程路径也会按名强杀（仅用于名字唯一属于本应用的进程）。
    /// </summary>
    private static void KillMatchingProcesses(string processName, string normalizedTarget, int waitMs, bool allowNameOnlyFallback)
    {
        Process[] procs;
        try { procs = Process.GetProcessesByName(processName); }
        catch (Exception ex)
        {
            InstallerLog($"[KillRunningProcesses] 枚举进程 {processName} 失败: {ex.Message}");
            return;
        }

        foreach (var proc in procs)
        {
            try
            {
                // 尝试读取进程路径以匹配安装目录；跨架构/权限不足时读不到
                string? procPath = null;
                try
                {
                    var raw = proc.MainModule?.FileName;
                    procPath = string.IsNullOrEmpty(raw) ? null : Path.GetFullPath(raw).ToLowerInvariant();
                }
                catch (Exception ex)
                {
                    InstallerLog($"[KillRunningProcesses] 无法读取 {processName} (PID {proc.Id}) 路径: {ex.Message}");
                }

                var matched = procPath != null && procPath.StartsWith(normalizedTarget);
                var nameOnly = procPath == null && allowNameOnlyFallback;

                if (!matched && !nameOnly)
                {
                    if (procPath == null)
                        InstallerLog($"[KillRunningProcesses] 跳过 {processName} (PID {proc.Id}): 路径不可读且不允许按名降级");
                    continue;
                }

                InstallerLog($"[KillRunningProcesses] 结束进程 {processName} PID {proc.Id}{(nameOnly ? " (按名降级)" : $" ({procPath})")}");
                proc.Kill(entireProcessTree: true);
                if (!proc.WaitForExit(waitMs))
                    InstallerLog($"[KillRunningProcesses] 警告: {processName} PID {proc.Id} 在 {waitMs}ms 内未退出");
            }
            catch (Exception ex)
            {
                InstallerLog($"[KillRunningProcesses] 结束 {processName} (PID {proc.Id}) 失败: {ex.Message}");
            }
            finally
            {
                proc.Dispose();
            }
        }
    }

    /// <summary>
    /// 探测文件是否被占用（独占打开失败即视为被锁）。
    /// </summary>
    private static bool IsFileLocked(string path)
    {
        try
        {
            using var fs = new FileStream(path, FileMode.Open, FileAccess.ReadWrite, FileShare.None);
            return false;
        }
        catch (IOException)
        {
            return true;
        }
        catch
        {
            return false;
        }
    }

    /// <summary>
    /// 带重试的文件复制（更新模式下文件可能仍被占用）
    /// </summary>
    private static async Task CopyFileWithRetry(string src, string dest, int maxRetries = 10)
    {
        for (int retry = 0; ; retry++)
        {
            try
            {
                File.Copy(src, dest, true);
                return;
            }
            catch (Exception ex) when (ex is IOException or UnauthorizedAccessException && retry < maxRetries)
            {
                await Task.Delay(300 + retry * 200);
            }
        }
    }

    /// <summary>
    /// 写入数据存储路径配置
    /// </summary>
    private void WriteDataPathConfig(string dataPath, bool isUpdate)
    {
        var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
        var cfgDir = Path.Combine(appData, "工程管家");
        var cfgPath = Path.Combine(cfgDir, "config.json");

        InstallerLog($"[WriteDataPathConfig] 入口: dataPath='{dataPath}', isUpdate={isUpdate}, cfgPath='{cfgPath}'");

        // 更新模式下：若用户未显式改动则保留现有 config.json
        if (isUpdate && File.Exists(cfgPath) && string.IsNullOrWhiteSpace(dataPath))
        {
            InstallerLog("[WriteDataPathConfig] 更新模式 + dataPath 为空 + cfgPath 存在 → 跳过写入");
            return;
        }

        try
        {
            // 检查磁盘是否存在，不存在则回退到默认路径
            if (!string.IsNullOrWhiteSpace(dataPath))
            {
                var driveRoot = Path.GetPathRoot(dataPath);
                InstallerLog($"[WriteDataPathConfig] driveRoot='{driveRoot}', Directory.Exists={Directory.Exists(driveRoot)}");
                if (string.IsNullOrEmpty(driveRoot) || !Directory.Exists(driveRoot))
                {
                    InstallerLog($"[WriteDataPathConfig] 磁盘不存在，回退到默认路径");
                    dataPath = Path.Combine(appData, "工程管家");
                }
                Directory.CreateDirectory(dataPath);
            }

            if (string.IsNullOrWhiteSpace(dataPath))
            {
                dataPath = Path.Combine(appData, "工程管家");
                InstallerLog($"[WriteDataPathConfig] dataPath 为空，使用默认值: {dataPath}");
            }

            Directory.CreateDirectory(cfgDir);
            var json = System.Text.Json.JsonSerializer.Serialize(
                new { dataPath },
                new System.Text.Json.JsonSerializerOptions { WriteIndented = true });
            File.WriteAllText(cfgPath, json);
            InstallerLog($"[WriteDataPathConfig] config.json 已写入: {cfgPath} → {dataPath}");
        }
        catch (Exception ex)
        {
            InstallerLog($"[WriteDataPathConfig] 写入 config.json 失败: {ex.Message}");
        }
    }

    /// <summary>
    /// 安装收尾:写卸载器定位文件 uninstaller.json + "程序和功能"注册表卸载项(HKCU,per-user 无需管理员)。
    /// uninstaller.json 供 UninstallerService.GetInstallPath() 读取;注册表项让系统"添加/删除程序"列出并调用卸载器。
    /// 更新模式同样刷新(版本可能变化)。任何失败只记日志、不抛出,避免影响主安装流程。
    /// </summary>
    private void RegisterUninstaller(string installPath)
    {
        try
        {
            var uninstallDir = Path.Combine(installPath, "uninstall");
            var uninstallerExe = Path.Combine(uninstallDir, "工程管家卸载.exe");

            // 卸载器不存在则跳过,避免写出无法执行的 UninstallString
            if (!File.Exists(uninstallerExe))
            {
                InstallerLog($"[RegisterUninstaller] 跳过:未找到卸载器 {uninstallerExe}");
                return;
            }

            // 1) 写 uninstaller.json(内容=安装目录纯路径),供卸载器定位
            Directory.CreateDirectory(uninstallDir);
            File.WriteAllText(Path.Combine(uninstallDir, "uninstaller.json"), installPath);
            InstallerLog($"[RegisterUninstaller] uninstaller.json 已写入: {installPath}");

            // 2) 读取已安装主程序版本(用于 DisplayVersion)
            var apiExe = Path.Combine(installPath, "EngineeringManager.Api.exe");
            var version = "";
            try
            {
                if (File.Exists(apiExe))
                    version = FileVersionInfo.GetVersionInfo(apiExe).ProductVersion ?? "";
            }
            catch (Exception ex) { InstallerLog($"[RegisterUninstaller] 读取版本失败: {ex.Message}"); }

            // 3) 写 HKCU "程序和功能" 卸载项
            using var key = Microsoft.Win32.Registry.CurrentUser.CreateSubKey(
                @"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\工程管家");
            key.SetValue("DisplayName", "工程管家");
            if (!string.IsNullOrEmpty(version)) key.SetValue("DisplayVersion", version);
            key.SetValue("Publisher", "工程管家");
            key.SetValue("DisplayIcon", File.Exists(apiExe) ? apiExe : uninstallerExe);
            key.SetValue("InstallLocation", installPath);
            key.SetValue("UninstallString", $"\"{uninstallerExe}\"");
            key.SetValue("NoModify", 1, Microsoft.Win32.RegistryValueKind.DWord);
            key.SetValue("NoRepair", 1, Microsoft.Win32.RegistryValueKind.DWord);
            InstallerLog($"[RegisterUninstaller] 注册表卸载项已写入 (DisplayVersion={version})");
        }
        catch (Exception ex)
        {
            InstallerLog($"[RegisterUninstaller] 失败: {ex.Message}");
        }
    }

    private static void InstallerLog(string msg)
    {
        try
        {
            var logPath = Path.Combine(Path.GetTempPath(), "工程管家-installer-debug.log");
            File.AppendAllText(logPath, $"[{DateTime.Now:yyyy-MM-dd HH:mm:ss.fff}] {msg}\n");
        }
        catch { }
    }

    /// <summary>
    /// 获取安装界面前端文件路径
    /// </summary>
    public static string GetInstallerFrontendDir()
    {
        // 优先从嵌入资源解压
        var sourceDir = ExtractPayload();

        // payload.zip 里 installer/dist 被压缩为根级 dist/（Compress-Archive 行为）
        var frontendDir = Path.Combine(sourceDir, "dist");
        if (Directory.Exists(frontendDir))
            return frontendDir;

        // 回退：尝试 installer/dist 子目录
        frontendDir = Path.Combine(sourceDir, "installer", "dist");
        if (Directory.Exists(frontendDir))
            return frontendDir;

        // 回退：从 exe 同目录查找
        var localDir = Path.Combine(AppContext.BaseDirectory, "installer", "dist");
        if (Directory.Exists(localDir))
            return localDir;

        return "";
    }

    private void CreateShortcut(string installPath)
    {
        try
        {
            var desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
            var shortcutPath = Path.Combine(desktopPath, "工程管家.lnk");
            var exePath = Path.Combine(installPath, "EngineeringManager.Api.exe");

            var shell = (dynamic)Activator.CreateInstance(
                Type.GetTypeFromProgID("WScript.Shell")!)!;
            var shortcut = shell.CreateShortcut(shortcutPath);
            shortcut.TargetPath = exePath;
            shortcut.WorkingDirectory = installPath;
            shortcut.Description = "工程管家 - 工程项目管理系统";
            shortcut.Save();
        }
        catch { }
    }
}

================
File: installer/src/App.tsx
================
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ParticleSystem from './components/ParticleSystem'
import ThemeSwitcher from './components/ThemeSwitcher'
import WelcomeStep from './components/WelcomeStep'
import PathStep from './components/PathStep'
import DataPathStep from './components/DataPathStep'
import InstallingStep from './components/InstallingStep'
import CompleteStep from './components/CompleteStep'
import { useTheme } from './hooks/useTheme'
import './installer.css'

type Step = 'welcome' | 'path' | 'dataPath' | 'installing' | 'complete'

// 向 C# 发消息的工具函数
function postToHost(msg: object) {
  // @ts-ignore
  window.chrome?.webview?.postMessage(JSON.stringify(msg))
}

export default function App() {
  const { theme, setTheme, getDefaultPath } = useTheme()
  const [step, setStep] = useState<Step>('welcome')
  const [installPath, setInstallPath] = useState('')
  const [dataPath, setDataPath] = useState('')
  const [accelerate, setAccelerate] = useState(false)

  // 监听 C# 的 init 消息（更新模式跳过向导）
  useEffect(() => {
    // @ts-ignore
    const wv = window.chrome?.webview
    if (!wv) return
    const handler = (e: any) => {
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data
        if (data?.type === 'init' && data.mode === 'update') {
          const ip = data.installPath ?? ''
          const dp = data.dataPath ?? ''
          setInstallPath(ip)
          setDataPath(dp)
          setAccelerate(true)
          setStep('installing')
          postToHost({ action: 'install', path: ip, dataPath: dp })
        } else if (data?.type === 'init' && data.mode === 'fresh') {
          // 用 C# 下发的默认数据路径替换硬编码
          if (data.defaultDataPath) {
            setDataPath(data.defaultDataPath)
          }
        }
      } catch {}
    }
    wv.addEventListener('message', handler)
    postToHost({ action: 'ready' })   // 通知 C# 监听器已就绪，可安全发 init
    return () => wv.removeEventListener('message', handler)
  }, [])

  // 标题栏拖动
  const onTitleBarMouseDown = () => {
    postToHost({ action: 'startDrag' })
  }

  const handleBegin = () => {
    setInstallPath(getDefaultPath())
    // dataPath 已由 C# init 消息下发设置，不再覆盖
    setStep('path')
  }

  const handleInstall = (path: string) => {
    setInstallPath(path)
    setStep('dataPath')
  }

  const handleDataPathNext = (dp: string) => {
    setDataPath(dp)
    setAccelerate(true)
    setStep('installing')
    postToHost({ action: 'install', path: installPath, dataPath: dp })
  }

  const handleComplete = () => {
    setAccelerate(false)
    setStep('complete')
  }

  const handleLaunch = () => {
    postToHost({ action: 'launch', path: `${installPath}\\EngineeringManager.Api.exe` })
  }

  const handleClose = () => {
    postToHost({ action: 'close' })
  }

  const pageVariants = {
    initial: { opacity: 0, x: 30 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -30 },
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* 粒子背景 */}
      <ParticleSystem accelerate={accelerate} />

      {/* 主题切换 + 关闭按钮 — 右上角 */}
      <ThemeSwitcher current={theme} onChange={setTheme} onClose={handleClose} />

      {/* 标题栏拖动 */}
      <div className="titlebar" onMouseDown={onTitleBarMouseDown} />

      {/* 步骤页面 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.3, ease: 'easeOut' }}
          style={{ position: 'absolute', inset: 0 }}
        >
          {step === 'welcome' && (
            <WelcomeStep onBegin={handleBegin} version="0.82.1" />
          )}
          {step === 'path' && (
            <PathStep
              defaultPath={installPath}
              onNext={handleInstall}
              onBack={() => setStep('welcome')}
            />
          )}
          {step === 'dataPath' && (
            <DataPathStep
              defaultPath={dataPath}
              onNext={handleDataPathNext}
              onBack={() => setStep('path')}
            />
          )}
          {step === 'installing' && (
            <InstallingStep onComplete={handleComplete} />
          )}
          {step === 'complete' && (
            <CompleteStep
              installPath={installPath}
              onLaunch={handleLaunch}
              onClose={handleClose}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}





================================================================
End of Codebase
================================================================
