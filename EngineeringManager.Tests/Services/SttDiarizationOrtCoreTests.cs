using EngineeringManager.Api.Services.Stt;
using Xunit;

namespace EngineeringManager.Tests.Services;

/// <summary>
/// Stt DiarizationService ORT 直串三件套核心纯函数单元测试（类名含 Stt 以纳入 --filter FullyQualifiedName~Stt 门槛）（不跑真实模型）。
/// 覆盖：softmax/argmax/binarize、帧数公式、NN-chain 平均链式聚类+阈值切树、
/// 球形 k-means、滑窗投票归属、簇标签→连续编号映射、互斥区间合并（两两 overlap=0）。
/// 数值依据：2026-09-09 沙箱实测（pyannote metadata / scipy 对照）。
/// </summary>
public class SttDiarizationOrtCoreTests
{
    private static float[] Emb(float seed, int dim = 8)
    {
        var v = new float[dim];
        for (int d = 0; d < dim; d++) v[d] = (float)Math.Sin(seed * (d + 1) + seed * seed);
        // L2 归一
        double norm = Math.Sqrt(v.Select(x => (double)x * x).Sum());
        for (int d = 0; d < dim; d++) v[d] = (float)(v[d] / norm);
        return v;
    }

    private static float[] Pack(List<float[]> embs, int dim)
    {
        var flat = new float[embs.Count * dim];
        for (int i = 0; i < embs.Count; i++)
            for (int d = 0; d < dim; d++)
                flat[i * dim + d] = embs[i][d];
        return flat;
    }

    // ═══════════ softmax / argmax / binarize / 帧数公式 ═══════════

    [Fact]
    public void SoftMax_SumsToOne_AndMonotonic()
    {
        var result = DiarizationService.SoftMax(new[] { 1.0f, 2.0f, 3.0f });
        Assert.Equal(1.0, result.Sum(), 5);
        Assert.True(result[2] > result[1] && result[1] > result[0], "softmax 应保持大小顺序");
        Assert.All(result, v => Assert.InRange(v, 0f, 1f));
    }

    [Fact]
    public void SoftMax_NumericallyStable_WithLargeLogits()
    {
        // 大 logits 不应溢出：exp(max-x) 归一
        var result = DiarizationService.SoftMax(new[] { 1000f, 1001f, 1002f });
        Assert.Equal(1.0, result.Sum(), 5);
        Assert.Equal(DiarizationService.SoftMax(new[] { 0f, 1f, 2f }), result);
    }

    [Fact]
    public void ArgMax_Basic_AndFirstMaxOnTie()
    {
        Assert.Equal(2, DiarizationService.ArgMax(new[] { 1f, 5f, 9f, 2f }));
        // 平手取首个最大值下标
        Assert.Equal(1, DiarizationService.ArgMax(new[] { 1f, 7f, 7f, 3f }));
    }

    [Fact]
    public void FrameCount_MatchesOnnxProbeValues()
    {
        // 沙箱探针实测（onnxruntime 前向真实输出帧数）
        Assert.Equal(589, DiarizationService.FrameCount(160000));
        Assert.Equal(56, DiarizationService.FrameCount(16000));
        Assert.Equal(590, DiarizationService.FrameCount(160080));
        Assert.Equal(589, DiarizationService.FrameCount(159999));
        // 31.6 分钟音频整段（#24 实测 112421 帧）
        Assert.Equal(112421, DiarizationService.FrameCount(30354432));
        Assert.Equal(0, DiarizationService.FrameCount(100));
    }

    [Fact]
    public void BinarizeGrid_MeanThresholdAtHalf()
    {
        // 2 帧 × 3 说话人：帧0 两块都给 spk0（均值 1.0 → 1），帧1 仅一块给 spk1（均值 0.5 → 1）
        var count = new float[6];
        var weight = new float[2];
        count[0] = 2; weight[0] = 2;
        count[3 + 1] = 1; weight[1] = 2; // 帧1: spk1 得票 1/2=0.5 → 应置 1（≥0.5）
        count[3 + 2] = 0.4f; weight[1] = 2; // spk2 0.2 → 0

        var grid = DiarizationService.BinarizeGrid(count, weight, 2);

        Assert.Equal(1, grid[0]);
        Assert.Equal(0, grid[1]);
        Assert.Equal(0, grid[2]);
        Assert.Equal(0, grid[3]);
        Assert.Equal(1, grid[4]);
        Assert.Equal(0, grid[5]);
    }

    // ═══════════ 聚类：NN-chain 平均链式 + 阈值切树 / 球形 k-means ═══════════

    [Fact]
    public void NNChainAverage_TwoWellSeparatedBlobs_CutAtThreshold()
    {
        // 两个远距离簇 + 阈值切树：应得到 2 簇
        var rng = new Random(42);
        var embs = new List<float[]>();
        for (int i = 0; i < 20; i++) embs.Add(WithNoise(Emb(1.0f), rng, 0.02));
        for (int i = 0; i < 20; i++) embs.Add(WithNoise(Emb(3.7f), rng, 0.02));

        var x = Pack(embs, 8);
        var dist = DiarizationService.CondensedCosineDistance(x, embs.Count, 8);
        var (heights, a, b) = DiarizationService.NNChainAverage(dist, embs.Count);
        var labels = DiarizationService.CutTreeCdist(embs.Count, a, b, heights, 0.65);

        var comp = DiarizationService.RemapByFirstAppearance(labels, embs.Count);
        var groups = comp.Distinct().Count();
        Assert.Equal(2, groups);
        // 前后两半各自成簇
        Assert.Equal(comp[0], comp[19]);
        Assert.Equal(comp[20], comp[39]);
        Assert.NotEqual(comp[0], comp[20]);
    }

    [Fact]
    public void NNChainAverage_ThreeBlobs_AutoThreshold()
    {
        var rng = new Random(7);
        var embs = new List<float[]>();
        foreach (var seed in new[] { 1.0f, 3.7f, 6.2f })
            for (int i = 0; i < 12; i++) embs.Add(WithNoise(Emb(seed), rng, 0.02));

        var x = Pack(embs, 8);
        var dist = DiarizationService.CondensedCosineDistance(x, embs.Count, 8);
        var (heights, a, b) = DiarizationService.NNChainAverage(dist, embs.Count);
        var labels = DiarizationService.CutTreeCdist(embs.Count, a, b, heights, 0.65);
        var comp = DiarizationService.RemapByFirstAppearance(labels, embs.Count);

        Assert.Equal(3, comp.Distinct().Count());
        for (int i = 0; i < 12; i++) Assert.Equal(comp[0], comp[i]);
        for (int i = 12; i < 24; i++) Assert.Equal(comp[12], comp[i]);
        for (int i = 24; i < 36; i++) Assert.Equal(comp[24], comp[i]);
    }

    [Fact]
    public void SphericalKMeans_K4_FourBlobs()
    {
        var rng = new Random(99);
        var embs = new List<float[]>();
        foreach (var seed in new[] { 1.0f, 3.7f, 6.2f, 8.9f })
            for (int i = 0; i < 15; i++) embs.Add(WithNoise(Emb(seed), rng, 0.02));

        var labels = DiarizationService.SphericalKMeans(Pack(embs, 8), embs.Count, 8, 4);
        var comp = DiarizationService.RemapByFirstAppearance(labels, embs.Count);

        Assert.Equal(4, comp.Distinct().Count());
        for (int b = 0; b < 4; b++)
            for (int i = b * 15; i < (b + 1) * 15; i++)
                Assert.Equal(comp[b * 15], comp[i]);
        // 四簇互不相同
        Assert.Equal(4, Enumerable.Range(0, 4).Select(b => comp[b * 15]).Distinct().Count());
    }

    // ═══════════ 投票归属 + 标签映射 ═══════════

    [Fact]
    public void AssignSegmentSpeakers_MajorityVote_Wins()
    {
        // 3 段；窗口归属：段0 的窗口多为簇 0，段1 多为簇 1
        var raw = new List<(double, double)> { (0.0, 3.0), (5.0, 8.0), (10.0, 10.3) };
        var owner = new List<int> { 0, 0, 0, 0, 1, 1, 1, 1, 1 };
        var labels = new[] { 0, 0, 0, 7, 1, 1, 1, 1, 7 };

        var segs = DiarizationService.AssignSegmentSpeakers(raw, owner, labels);

        Assert.Equal(3, segs.Count);
        Assert.Equal(0, segs[0].Speaker); // 3:1 多数
        Assert.Equal(1, segs[1].Speaker); // 4:1 多数（簇1）
        // 段2 无窗口 → 时间最近的有票段是段1 → 簇1 → 连续编号 1
        Assert.Equal(1, segs[2].Speaker);
        // 连续编号：簇 7 被吞并后仅剩 0/1 两类
        Assert.All(segs, s => Assert.InRange(s.Speaker, 0, 1));
    }

    [Fact]
    public void AssignSegmentSpeakers_LabelsRemappedByFirstAppearance()
    {
        // 簇号乱序（7, 3）→ 按段首现顺序压成 0, 1
        var raw = new List<(double, double)> { (0.0, 2.0), (4.0, 6.0) };
        var owner = new List<int> { 0, 1 };
        var labels = new[] { 7, 3 };

        var segs = DiarizationService.AssignSegmentSpeakers(raw, owner, labels);

        Assert.Equal(0, segs[0].Speaker);
        Assert.Equal(1, segs[1].Speaker);
    }

    [Fact]
    public void RemapByFirstAppearance_CompactsArbitraryLabels()
    {
        var labels = DiarizationService.RemapByFirstAppearance(new[] { 5, 5, 2, 9, 2 }, 5);
        Assert.Equal(new[] { 0, 0, 1, 2, 1 }, labels);
    }

    // ═══════════ 互斥区间合并 ═══════════

    [Fact]
    public void MergeSegments_SameSpeakerGapWithinThreshold_Unions()
    {
        var raw = new List<SttSegment>
        {
            new() { Speaker = 0, Start = 0, End = 4 },
            new() { Speaker = 0, Start = 5, End = 9 },  // gap 1s < 2s → 并集 [0,9]
            new() { Speaker = 0, Start = 20, End = 25 }, // gap 11s → 保留
        };
        var merged = DiarizationService.MergeSegments(raw);
        Assert.Equal(2, merged.Count);
        Assert.Equal(0, merged[0].Start);
        Assert.Equal(9, merged[0].End);
        Assert.Equal(20, merged[1].Start);
    }

    [Fact]
    public void MergeSegments_OutputIsPairwiseExclusive_OnRandomInput()
    {
        // 随机重叠输入（含跨说话人重叠、同说话人嵌套）→ 输出两两 overlap=0
        var rng = new Random(2024);
        for (int trial = 0; trial < 50; trial++)
        {
            var raw = new List<SttSegment>();
            for (int i = 0; i < 30; i++)
            {
                var start = rng.NextDouble() * 100;
                var dur = rng.NextDouble() * 10;
                raw.Add(new SttSegment { Speaker = rng.Next(3), Start = start, End = start + dur });
            }
            var merged = DiarizationService.MergeSegments(raw);
            merged.Sort((x, y) => x.Start.CompareTo(y.Start));
            for (int i = 1; i < merged.Count; i++)
            {
                Assert.True(merged[i].Start >= merged[i - 1].End - 1e-9,
                    $"trial {trial} 段 {i}: [{merged[i - 1].Start:F2},{merged[i - 1].End:F2}] 与 [{merged[i].Start:F2},{merged[i].End:F2}] 重叠");
            }
        }
    }

    [Fact]
    public void MergeSegments_OverlappingDifferentSpeakers_StayTwoSpeakers()
    {
        // 旧测试同款输入：新实现同样保持 2 个说话人
        var raw = new List<SttSegment>
        {
            new() { Speaker = 0, Start = 0, End = 10 },
            new() { Speaker = 1, Start = 5, End = 15 },
            new() { Speaker = 0, Start = 12, End = 20 },
        };
        var merged = DiarizationService.MergeSegments(raw);
        Assert.Equal(2, merged.Select(s => s.Speaker).Distinct().Count());
        // 且输出互斥
        merged.Sort((x, y) => x.Start.CompareTo(y.Start));
        for (int i = 1; i < merged.Count; i++)
            Assert.True(merged[i].Start >= merged[i - 1].End - 1e-9);
    }

    [Fact]
    public void MergeRareSpeakers_SwallowsTinySpeakers()
    {
        // 主导说话人 0（90s）与低频说话人 1（3s）→ 吞并后只剩 1 人
        var raw = new List<SttSegment>
        {
            new() { Speaker = 0, Start = 0, End = 50 },
            new() { Speaker = 1, Start = 50.5, End = 53.5 },
            new() { Speaker = 0, Start = 54, End = 90 },
        };
        var merged = DiarizationService.MergeRareSpeakers(raw);
        Assert.Single(merged.Select(s => s.Speaker).Distinct());
        // 吞并后仍互斥
        merged.Sort((x, y) => x.Start.CompareTo(y.Start));
        for (int i = 1; i < merged.Count; i++)
            Assert.True(merged[i].Start >= merged[i - 1].End - 1e-9);
    }

    // ═══════════ 自动模式保守定 K：轮廓系数判据 EstimateSpeakerCountBySilhouette ═══════════

    [Fact]
    public void EstimateSpeakerCountBySilhouette_TwoWellSeparatedBlobs_ReturnsTrueK()
    {
        // 2 个分离良好的球面簇；maxK 给 3（大于真值）迫使判据真正比较，仍应返回 2
        var rng = new Random(42);
        var embs = new List<float[]>();
        for (int i = 0; i < 20; i++) embs.Add(WithNoise(Emb(1.0f), rng, 0.02));
        for (int i = 0; i < 20; i++) embs.Add(WithNoise(Emb(3.7f), rng, 0.02));

        var x = Pack(embs, 8);
        var dist = DiarizationService.CondensedCosineDistance(x, embs.Count, 8);
        var k = DiarizationService.EstimateSpeakerCountBySilhouette(dist, x, embs.Count, 8, 3);
        Assert.Equal(2, k);
    }

    [Fact]
    public void EstimateSpeakerCountBySilhouette_ThreeWellSeparatedBlobs_ReturnsTrueK()
    {
        // 3 个分离良好的球面簇；maxK 给 4（大于真值）迫使判据真正比较，仍应返回 3
        var rng = new Random(7);
        var embs = new List<float[]>();
        foreach (var seed in new[] { 1.0f, 3.7f, 6.2f })
            for (int i = 0; i < 12; i++) embs.Add(WithNoise(Emb(seed), rng, 0.02));

        var x = Pack(embs, 8);
        var dist = DiarizationService.CondensedCosineDistance(x, embs.Count, 8);
        var k = DiarizationService.EstimateSpeakerCountBySilhouette(dist, x, embs.Count, 8, 4);
        Assert.Equal(3, k);
    }

    [Fact]
    public void EstimateSpeakerCountBySilhouette_SingleGhostWindow_DoesNotInflateCount()
    {
        // 复刻电力酒店实测几何：2 个松散主簇（簇内 ~0.4，簇间 ~0.7-0.85，按 campplus 真实声纹定标）
        // + 1 个游离窗（距两主簇 ~0.81/~1.13，模拟那条只含 1 窗的幽灵簇）。
        // 基线（无游离点）返回 2；混入游离点后返回值不得上升。
        var rng = new Random(7);
        var embs = new List<float[]>();
        for (int i = 0; i < 60; i++) embs.Add(WithNoise(Emb(0.2f), rng, 0.30));
        for (int i = 0; i < 59; i++) embs.Add(WithNoise(Emb(5.6f), rng, 0.30));

        var xBase = Pack(embs, 8);
        var distBase = DiarizationService.CondensedCosineDistance(xBase, embs.Count, 8);
        var baseline = DiarizationService.EstimateSpeakerCountBySilhouette(distBase, xBase, embs.Count, 8, 3);
        Assert.Equal(2, baseline);

        embs.Add(Emb(11.4f)); // 游离窗：距主簇A ~0.80、主簇B ~1.13，均超出 0.65 切树阈值
        var x = Pack(embs, 8);
        var dist = DiarizationService.CondensedCosineDistance(x, embs.Count, 8);
        var k = DiarizationService.EstimateSpeakerCountBySilhouette(dist, x, embs.Count, 8, 3);
        Assert.True(k <= baseline, $"混入单个游离点后估计人数上升了: baseline={baseline}, withGhost={k}");
        Assert.Equal(2, k);
    }

    [Fact]
    public void EstimateSpeakerCountBySilhouette_DegenerateInputs_ReturnZero()
    {
        // n < 4 → 0（调用方 k>=2 守卫不满足，保持原标签）
        var small = Pack(new List<float[]> { Emb(1.0f), Emb(3.7f), Emb(6.2f) }, 8);
        var smallDist = DiarizationService.CondensedCosineDistance(small, 3, 8);
        Assert.Equal(0, DiarizationService.EstimateSpeakerCountBySilhouette(smallDist, small, 3, 8, 3));

        // maxK < 2 → 0（无搜索空间，保持原标签）
        var rng = new Random(11);
        var embs = new List<float[]>();
        for (int i = 0; i < 20; i++) embs.Add(WithNoise(Emb(1.0f), rng, 0.02));
        for (int i = 0; i < 20; i++) embs.Add(WithNoise(Emb(3.7f), rng, 0.02));
        var x = Pack(embs, 8);
        var dist = DiarizationService.CondensedCosineDistance(x, embs.Count, 8);
        Assert.Equal(0, DiarizationService.EstimateSpeakerCountBySilhouette(dist, x, embs.Count, 8, 1));
    }

    [Fact]
    public void CheckClusterExplosion_FuseThresholdBoundary_BehaviorUnchanged()
    {
        // 阈值 8 处行为与改动前一致：≤8 通过、9 报错（由上层抛出提示用户填人数）
        Assert.Equal(8, DiarizationService.AutoSpeakerFuseThreshold);
        Assert.Null(DiarizationService.CheckClusterExplosion(numSpeakers: null, distinctSpeakers: DiarizationService.AutoSpeakerFuseThreshold));
        Assert.Null(DiarizationService.CheckClusterExplosion(numSpeakers: null, distinctSpeakers: 0));
        var message = DiarizationService.CheckClusterExplosion(numSpeakers: null, distinctSpeakers: DiarizationService.AutoSpeakerFuseThreshold + 1);
        Assert.NotNull(message);
        Assert.Contains("说话人自动估计失败", message);
        Assert.Contains("说话人数", message);
        // 指定人数路径：信任输入，永不熔断
        Assert.Null(DiarizationService.CheckClusterExplosion(numSpeakers: 4, distinctSpeakers: 54));
    }

    // ── 辅助 ──
    private static float[] WithNoise(float[] v, Random rng, double sigma)
    {
        var outV = new float[v.Length];
        for (int d = 0; d < v.Length; d++) outV[d] = v[d] + (float)(rng.NextGaussian() * sigma);
        double norm = Math.Sqrt(outV.Select(x => (double)x * x).Sum());
        for (int d = 0; d < outV.Length; d++) outV[d] = (float)(outV[d] / norm);
        return outV;
    }
}

internal static class RandomGaussianExtensions
{
    public static double NextGaussian(this Random rng)
    {
        // Box-Muller
        double u1 = 1.0 - rng.NextDouble();
        double u2 = rng.NextDouble();
        return Math.Sqrt(-2.0 * Math.Log(u1)) * Math.Sin(2.0 * Math.PI * u2);
    }
}
