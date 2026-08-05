using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Unicode;
using EngineeringManager.Api.Services.Stt;

namespace EngineeringManager.Api.Services.Stt;

/// <summary>
/// 说话人标签归一化器（共享单例，STT + 知识库统一调用）
///
/// 原始簇号可能是 0/3/7/19 等不连续值（由 sherpa-onnx 聚类产生），
/// 对用户展示必须统一为连续的 说话人1/说话人2/说话人3。
///
/// 归一化在 STT 结果拼装/持久化之前执行，确保：
///   - stt_jobs.result_text 中的【说话人N】标签是 1-based 连续编号
///   - stt_jobs.result_json 中每个 segment 的 speaker 字段是 1-based 连续编号
///   - GET /api/stt/jobs/{id} 返回 1-based 连续编号
///   - POST /api/stt/jobs/{id}/ingest 使用的 segments 已是 1-based 连续编号
///   - knowledge_documents.speakers 与 STT job 中的编号一致
///
/// 如需保留原始簇号用于诊断，存入 segment.OriginalSpeaker（内部字段，不暴露给用户）。
/// </summary>
public static class SpeakerLabelNormalizer
{
    /// <summary>
    /// 对 segments 做就地归一化：原始簇号 → 连续 1/2/3（按首次出现顺序）
    /// 同时设置 OriginalSpeaker 保留原始值。
    /// </summary>
    /// <param name="segments">待归一化的分段列表（会被就地修改）</param>
    /// <returns>归一化后的 segments（与输入同一引用）</returns>
    public static List<SttSegment> Normalize(List<SttSegment> segments)
    {
        if (segments == null || segments.Count == 0) return segments!;

        var speakerMap = new Dictionary<int, int>(); // original → normalized (1-based)
        var nextId = 1;

        foreach (var seg in segments.OrderBy(s => s.Start))
        {
            if (!speakerMap.TryGetValue(seg.Speaker, out var normalizedId))
            {
                normalizedId = nextId++;
                speakerMap[seg.Speaker] = normalizedId;
            }

            // 保留原始簇号用于诊断（不暴露给用户）
            seg.OriginalSpeaker = seg.Speaker;
            // 设置归一化后的编号（1-based）
            seg.Speaker = normalizedId;
        }

        Console.WriteLine($"[SpeakerLabelNormalizer] 归一化: {speakerMap.Count} 个说话人, 映射: {string.Join(", ", speakerMap.Select(kvp => $"{kvp.Key}→{kvp.Value}"))}");

        return segments;
    }

    /// <summary>
    /// 生成 speakers JSON（归一化后的说话人列表 + 时间段）
    /// 输入的 segments 必须已经过 Normalize() 处理。
    /// </summary>
    public static string? BuildSpeakersJson(List<SttSegment>? segments)
    {
        if (segments == null || segments.Count == 0) return null;

        var speakerSegments = new Dictionary<int, List<TimeRange>>();

        foreach (var seg in segments.OrderBy(s => s.Start))
        {
            if (!speakerSegments.ContainsKey(seg.Speaker))
                speakerSegments[seg.Speaker] = new List<TimeRange>();

            speakerSegments[seg.Speaker].Add(new TimeRange
            {
                Start = Math.Round(seg.Start, 2),
                End = Math.Round(seg.End, 2),
            });
        }

        var speakers = speakerSegments
            .OrderBy(kvp => kvp.Key)
            .Select(kvp => new SpeakerInfo
            {
                Id = kvp.Key,
                Label = $"说话人{kvp.Key}",
                Segments = kvp.Value,
            })
            .ToList();

        // 使用 UnicodeRanges.All 允许中文等非 ASCII 字符直接输出，不使用 UnsafeRelaxedJsonEscaping
        // 因为数据为系统内部生成的说话人标签（"说话人N"），不包含用户输入
        return JsonSerializer.Serialize(speakers, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            Encoder = JavaScriptEncoder.Create(UnicodeRanges.All),
        });
    }

    // 内部 JSON 类型
    private class SpeakerInfo
    {
        public int Id { get; set; }
        public string Label { get; set; } = "";
        public List<TimeRange> Segments { get; set; } = new();
    }

    private class TimeRange
    {
        public double Start { get; set; }
        public double End { get; set; }
    }
}
