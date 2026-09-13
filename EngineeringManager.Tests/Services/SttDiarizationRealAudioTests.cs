using System.Diagnostics;
using EngineeringManager.Api.Services.Stt;
using Xunit;

namespace EngineeringManager.Tests.Services;

/// <summary>
/// DiarizationService ORT 直串三件套真实音频集成验证（重型，默认跳过）。
/// 手动运行：$env:STT_DIAR_REAL='1'; dotnet test --filter "FullyQualifiedName~SttDiarizationRealAudio"
/// 音频：#24 会议全长（31.6min，full-31min.wav）+ 两条真方言录音（沙箱同款文件）。
/// 断言（任务书验收 3/5）：
///   - #24 指定 4 人：4 说话人、段区间两两互斥（overlap=0）、总耗时 &lt;30s（262.6s 基线）、spk 各占 &gt;5%
///   - 两条真方言：指定 2 人与自动模式均跑通且 2 说话人
/// </summary>
public class SttDiarizationRealAudioTests
{
    private const string Meeting24 = @"E:\moss-build\full-31min.wav";
    private const string Chenzechuan = @"E:\moss-build\chenzechuan-dialect.wav";
    private const string Yeyouliang = @"E:\moss-build\yeyouliang-dialect.wav";

    private sealed class RealAudioFactAttribute : FactAttribute
    {
        public RealAudioFactAttribute()
        {
            if (!File.Exists(Meeting24) || !File.Exists(Chenzechuan) || !File.Exists(Yeyouliang))
                Skip = $"真实音频缺失（{Meeting24} / {Chenzechuan} / {Yeyouliang}）";
            else if (Environment.GetEnvironmentVariable("STT_DIAR_REAL") != "1")
                Skip = "未设置 STT_DIAR_REAL=1，跳过真实音频分离验证（重型）";
        }
    }

    /// <summary>两两重叠检查（按 start 排序后相邻比较即可覆盖全部对）</summary>
    private static double MaxPairwiseOverlap(List<SttSegment> segs)
    {
        var sorted = segs.OrderBy(s => s.Start).ToList();
        double maxOv = 0;
        for (int i = 1; i < sorted.Count; i++)
        {
            var ov = Math.Min(sorted[i - 1].End, sorted[i].End) - sorted[i].Start;
            if (ov > maxOv) maxOv = ov;
        }
        return maxOv;
    }

    private static string Distribution(List<SttSegment> segs)
    {
        var total = segs.Sum(s => s.End - s.Start);
        return string.Join(", ", segs.GroupBy(s => s.Speaker)
            .OrderBy(g => g.Key)
            .Select(g => $"spk{g.Key}={g.Sum(s => s.End - s.Start):F1}s({g.Sum(s => s.End - s.Start) / total * 100:F1}%)"));
    }

    [RealAudioFact]
    public async Task RealAudio_Meeting24_NumSpeakers4()
    {
        var svc = new DiarizationService();
        var sw = Stopwatch.StartNew();
        var segs = await svc.DiarizeAsync(Meeting24, numSpeakers: 4, ct: default);
        sw.Stop();

        var speakers = segs.Select(s => s.Speaker).Distinct().OrderBy(x => x).ToList();
        var total = segs.Sum(s => s.End - s.Start);
        var maxOv = MaxPairwiseOverlap(segs);

        Console.WriteLine($"[Real#24] 段数={segs.Count}, 说话人={speakers.Count}, 耗时={sw.Elapsed.TotalSeconds:F1}s");
        Console.WriteLine($"[Real#24] 分布: {Distribution(segs)} (总时长 {total:F0}s)");
        Console.WriteLine($"[Real#24] 两两最大重叠={maxOv:F4}s");

        Assert.Equal(4, speakers.Count);
        Assert.True(maxOv <= 1e-6, $"段区间应互斥，实测最大重叠 {maxOv:F4}s");
        Assert.True(sw.Elapsed.TotalSeconds < 30, $"总耗时 {sw.Elapsed.TotalSeconds:F1}s 应 <30s（262.6s 基线）");
        Assert.All(segs.GroupBy(s => s.Speaker), g =>
            Assert.True(g.Sum(s => s.End - s.Start) / total > 0.05, $"spk{g.Key} 占比应 >5%"));
    }

    [RealAudioFact]
    public async Task RealAudio_Chenzechuan_NumSpeakers2()
    {
        var svc = new DiarizationService();
        var sw = Stopwatch.StartNew();
        var segs = await svc.DiarizeAsync(Chenzechuan, numSpeakers: 2, ct: default);
        sw.Stop();
        var speakers = segs.Select(s => s.Speaker).Distinct().ToList();
        Console.WriteLine($"[Real陈泽伟] 段数={segs.Count}, 说话人={speakers.Count}, 耗时={sw.Elapsed.TotalSeconds:F1}s, 分布: {Distribution(segs)}");

        Assert.Equal(2, speakers.Count);
        Assert.True(MaxPairwiseOverlap(segs) <= 1e-6, "段区间应互斥");
    }

    [RealAudioFact]
    public async Task RealAudio_Yeyouliang_NumSpeakers2()
    {
        var svc = new DiarizationService();
        var sw = Stopwatch.StartNew();
        var segs = await svc.DiarizeAsync(Yeyouliang, numSpeakers: 2, ct: default);
        sw.Stop();
        var speakers = segs.Select(s => s.Speaker).Distinct().ToList();
        Console.WriteLine($"[Real叶有亮] 段数={segs.Count}, 说话人={speakers.Count}, 耗时={sw.Elapsed.TotalSeconds:F1}s, 分布: {Distribution(segs)}");

        Assert.Equal(2, speakers.Count);
        Assert.True(MaxPairwiseOverlap(segs) <= 1e-6, "段区间应互斥");
    }

    [RealAudioFact]
    public async Task RealAudio_Dialects_AutoMode_TwoSpeakers()
    {
        // 自动模式（聚类阈值 0.65 + MergeRareSpeakers 15s/5% 低频吞并）→ 2 说话人
        foreach (var (name, path) in new[] { ("陈泽伟", Chenzechuan), ("叶有亮", Yeyouliang) })
        {
            var svc = new DiarizationService();
            var sw = Stopwatch.StartNew();
            var segs = await svc.DiarizeAsync(path, numSpeakers: null, ct: default);
            sw.Stop();
            var speakers = segs.Select(s => s.Speaker).Distinct().OrderBy(x => x).ToList();
            Console.WriteLine($"[Real{name}-auto] 段数={segs.Count}, 说话人={speakers.Count}, 耗时={sw.Elapsed.TotalSeconds:F1}s, 分布: {Distribution(segs)}");

            Assert.Equal(2, speakers.Count);
            Assert.True(MaxPairwiseOverlap(segs) <= 1e-6, "段区间应互斥");
        }
    }
}
