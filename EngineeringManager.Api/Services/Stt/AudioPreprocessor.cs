using System.Diagnostics;

namespace EngineeringManager.Api.Services.Stt;

/// <summary>RunProcessAsync 的单次进程运行结果（退出码 + 排水得到的 stderr）</summary>
internal sealed record SttProcessRunResult(int ExitCode, string StdError);

/// <summary>
/// 音频预处理：用 ffmpeg 转换为 16kHz 单声道 16bit WAV + 降噪
/// ffmpeg -y -i in -ac 1 -ar 16000 -af "highpass=f=80,lowpass=f=7500,afftdn=nf=-25" -c:a pcm_s16le out.wav
/// </summary>
public class AudioPreprocessor
{
    /// <summary>
    /// 预处理音频文件：转为 16kHz mono 16bit WAV，可选拜降噪
    /// </summary>
    /// <param name="inputPath">输入音频文件路径（任何 ffmpeg 支持的格式）</param>
    /// <param name="outputPath">输出 WAV 文件路径</param>
    /// <param name="denoise">是否启用降噪（默认 true；人声变差时关闭）</param>
    /// <param name="ct">取消令牌</param>
    public static async Task<string> PreprocessAsync(
        string inputPath,
        string? outputPath = null,
        bool denoise = true,
        CancellationToken ct = default)
    {
        if (!File.Exists(inputPath))
            throw new FileNotFoundException($"音频文件不存在: {inputPath}");

        // 输出路径：默认在同目录加 _processed.wav
        outputPath ??= Path.Combine(
            Path.GetTempPath(),
            $"stt_{Guid.NewGuid():N}.wav");

        var dir = Path.GetDirectoryName(outputPath);
        if (!string.IsNullOrEmpty(dir)) Directory.CreateDirectory(dir);

        // 构建 ffmpeg 参数
        var af = denoise
            ? "highpass=f=80,lowpass=f=7500,afftdn=nf=-25"
            : "highpass=f=80,lowpass=f=7500";

        var args = $"-y -i \"{inputPath}\" -ac 1 -ar 16000 -af \"{af}\" -c:a pcm_s16le \"{outputPath}\"";

        var psi = new ProcessStartInfo
        {
            FileName = "ffmpeg",
            Arguments = args,
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardError = true,
            RedirectStandardOutput = true,
        };

        // 10min 超时保底：ffmpeg 挂死/管道死锁时 kill 进程树并抛异常，
        // 让上层 catch 把任务标 failed，而不是让任务永远挂在 5%
        using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeoutCts.CancelAfter(TimeSpan.FromMinutes(10));

        SttProcessRunResult run;
        try
        {
            run = await RunProcessAsync(psi, timeoutCts.Token);
        }
        catch (OperationCanceledException) when (!ct.IsCancellationRequested)
        {
            // 外部 ct 未取消 → 是 10min 超时触发（进程树已在 RunProcessAsync 内被 kill）
            throw new Exception("音频预处理超时(10min)已终止（ffmpeg 无响应）");
        }

        if (run.ExitCode != 0)
        {
            // stderr 取自排水任务结果（进程已退出，不能再读 process.StandardError）
            // 降噪失败时回退：不带 -af 重试
            if (denoise)
            {
                Console.Error.WriteLine($"[AudioPreprocessor] 降噪失败，回退无滤镜: {Common.Sanitize(run.StdError)}");
                return await PreprocessAsync(inputPath, outputPath, denoise: false, ct);
            }
            throw new Exception($"ffmpeg 转换失败 (exit={run.ExitCode}): {Common.Sanitize(run.StdError)}");
        }

        if (!File.Exists(outputPath))
            throw new Exception("ffmpeg 转换完成但输出文件不存在");

        return outputPath;
    }

    /// <summary>
    /// 启动进程 → 先启动 stdout/stderr 排水 → 等待退出，返回 (退出码, stderr)。
    /// 可测试 seam：回归测试用它跑一个向 stderr 写远超管道缓冲区的子进程。
    /// 关键顺序：排水必须在 WaitForExitAsync 之前启动——否则子进程写满管道缓冲区
    /// （约 4KB）后阻塞在写入上永不退出，父进程 WaitForExitAsync 永不返回（管道死锁）。
    /// ct 触发（取消或超时）时 kill 整个进程树并抛 OperationCanceledException。
    /// </summary>
    internal static async Task<SttProcessRunResult> RunProcessAsync(
        ProcessStartInfo psi,
        CancellationToken ct = default)
    {
        using var process = new Process { StartInfo = psi };
        process.Start();

        // 先排水，后等待退出
        var stdoutTask = psi.RedirectStandardOutput
            ? process.StandardOutput.ReadToEndAsync(ct)
            : Task.FromResult(string.Empty);
        var stderrTask = psi.RedirectStandardError
            ? process.StandardError.ReadToEndAsync(ct)
            : Task.FromResult(string.Empty);

        await using var ctReg = ct.Register(() =>
        {
            try { process.Kill(entireProcessTree: true); } catch { }
        });

        try
        {
            await process.WaitForExitAsync(ct);
        }
        catch (OperationCanceledException)
        {
            // kill 已由注册回调触发；限时等排水任务收尾（随进程退出流关闭自然完成），再向上抛
            try { await Task.WhenAll(stdoutTask, stderrTask).WaitAsync(TimeSpan.FromSeconds(5)); } catch { }
            throw;
        }

        // 进程已退出 → 管道必然 EOF，此处 await 排水任务不会死锁
        var stderr = string.Empty;
        try { stderr = await stderrTask; } catch { }
        try { await stdoutTask; } catch { }

        return new SttProcessRunResult(process.ExitCode, stderr);
    }

    /// <summary>获取音频时长（秒），用 ffprobe</summary>
    public static async Task<double> GetDurationAsync(string audioPath, CancellationToken ct = default)
    {
        var psi = new ProcessStartInfo
        {
            FileName = "ffprobe",
            Arguments = $"-v error -show_entries format=duration -of csv=p=0 \"{audioPath}\"",
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardOutput = true,
        };
        using var process = Process.Start(psi);
        if (process == null) return 0;
        var output = await process.StandardOutput.ReadToEndAsync(ct);
        await process.WaitForExitAsync(ct);
        if (double.TryParse(output.Trim(), out var dur)) return dur;
        return 0;
    }
}
