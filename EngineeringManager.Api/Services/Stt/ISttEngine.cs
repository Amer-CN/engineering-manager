namespace EngineeringManager.Api.Services.Stt;

/// <summary>
/// STT 引擎接口：定义转写引擎的标准行为
/// </summary>
public interface ISttEngine
{
    /// <summary>引擎名称</summary>
    string Name { get; }

    /// <summary>引擎是否可用（模型文件存在、GPU 满足要求等）</summary>
    Task<bool> IsAvailableAsync();

    /// <summary>
    /// 异步转写音频文件
    /// </summary>
    /// <param name="wavPath">预处理后的 16kHz mono 16bit WAV 文件路径</param>
    /// <param name="context">可选热词/上下文提示</param>
    /// <param name="progress">进度回调 (0-100)</param>
    /// <param name="ct">取消令牌（触发时杀掉整个进程树）</param>
    /// <returns>转写结果</returns>
    Task<SttResult> TranscribeAsync(
        string wavPath,
        string? context,
        IProgress<int>? progress,
        CancellationToken ct);
}
