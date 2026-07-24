using System.Diagnostics;

namespace EngineeringManager.Api.Services.Stt;

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

        using var process = new Process { StartInfo = psi };
        process.Start();

        await using var ctReg = ct.Register(() =>
        {
            try { process.Kill(entireProcessTree: true); } catch { }
        });

        await process.WaitForExitAsync(ct);

        if (process.ExitCode != 0)
        {
            var stderr = await process.StandardError.ReadToEndAsync(ct);
            // 降噪失败时回退：不带 -af 重试
            if (denoise)
            {
                Console.Error.WriteLine($"[AudioPreprocessor] 降噪失败，回退无滤镜: {Common.Sanitize(stderr)}");
                return await PreprocessAsync(inputPath, outputPath, denoise: false, ct);
            }
            throw new Exception($"ffmpeg 转换失败 (exit={process.ExitCode}): {Common.Sanitize(stderr)}");
        }

        if (!File.Exists(outputPath))
            throw new Exception("ffmpeg 转换完成但输出文件不存在");

        return outputPath;
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
