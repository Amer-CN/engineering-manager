namespace EngineeringManager.Api.Services.Stt;

/// <summary>
/// STT 转写请求
/// </summary>
public class SttTranscribeRequest
{
    /// <summary>已上传的音频文件在 uploads/ 下的相对路径</summary>
    public string FilePath { get; set; } = "";

    /// <summary>是否多人录音（true=走说话人分离）</summary>
    public bool IsMultiSpeaker { get; set; } = false;

    /// <summary>预期说话人数（null=自动检测）</summary>
    public int? NumSpeakers { get; set; }

    /// <summary>可选热词/上下文提示，提升识别准确率</summary>
    public string? Context { get; set; }
}

/// <summary>
/// STT 转写结果
/// </summary>
public class SttResult
{
    /// <summary>全文（纯文本，无说话人标签）</summary>
    public string Text { get; set; } = "";

    /// <summary>分段列表（含说话人标签和时间戳）</summary>
    public List<SttSegment> Segments { get; set; } = new();

    /// <summary>音频时长（秒）</summary>
    public double DurationSec { get; set; }

    /// <summary>转写耗时（秒）</summary>
    public double ElapsedSec { get; set; }

    /// <summary>使用的引擎名称</summary>
    public string Engine { get; set; } = "";
}

/// <summary>
/// 单个转写分段（含说话人信息）
/// 说话人归一化在 STT 结果持久化前由 SpeakerLabelNormalizer 执行：
///   Speaker 是 1-based 连续编号（说话人1/2/3），对用户展示
///   OriginalSpeaker 保留原始簇号用于诊断（不序列化给前端）
/// </summary>
public class SttSegment
{
    /// <summary>说话人标签（归一化后：1=说话人1, 2=说话人2, ...；单人录音固定为 1）</summary>
    public int Speaker { get; set; }

    /// <summary>原始簇号（诊断用，sherpa-onnx 聚类产生的 0-based 值；不序列化给前端）</summary>
    [System.Text.Json.Serialization.JsonIgnore]
    public int? OriginalSpeaker { get; set; }

    /// <summary>开始时间（秒）</summary>
    public double Start { get; set; }

    /// <summary>结束时间（秒）</summary>
    public double End { get; set; }

    /// <summary>该段文本</summary>
    public string Text { get; set; } = "";
}

/// <summary>
/// GPU 探测结果
/// </summary>
public class GpuInfo
{
    /// <summary>是否有独显</summary>
    public bool HasDiscreteGpu { get; set; }

    /// <summary>独显名称</summary>
    public string GpuName { get; set; } = "";

    /// <summary>显存（MB）</summary>
    public int VramMb { get; set; }

    /// <summary>是否支持 Vulkan（用于 transcribe.exe --vulkan）</summary>
    public bool SupportsVulkan { get; set; }

    /// <summary>所有显卡列表（供调试/展示）</summary>
    public List<string> AllGpus { get; set; } = new();
}
