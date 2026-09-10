using EngineeringManager.Api.Services.Stt;
using Xunit;

namespace EngineeringManager.Tests.Services;

/// <summary>
/// SpeakerOverlapMapper（按时间重叠回填说话人）纯函数单元测试。
/// 覆盖任务书 .work/task-moss-speaker-pipeline.md 验收 2.a–2.f：
/// a. 完全重叠 → 取该分离段说话人；b. 部分重叠多者胜；c. 重叠并列取时间靠前者；
/// d. 空隙取时间距离最近者；e. 分离段为空 → 逐字段全等；f. 只改 Speaker（硬契约）。
/// </summary>
public class SpeakerOverlapMapperTests
{
    private static SttSegment TextSeg(int speaker, double start, double end, string text = "文本") =>
        new() { Speaker = speaker, Start = start, End = end, Text = text };

    private static SttSegment DiaSeg(int speaker, double start, double end) =>
        new() { Speaker = speaker, Start = start, End = end };

    // ═════════ 2.a 完全重叠 ═════════

    [Fact]
    public void AssignByOverlap_TextExactlyCoversDiaSegment_TakesThatSpeaker()
    {
        // 文本段 [10,20]（原标签 9）；分离段 [0,5]（无重叠）与 [10,20]（完全重叠，重叠 10s）
        var texts = new List<SttSegment> { TextSeg(9, 10, 20) };
        var dias = new List<SttSegment> { DiaSeg(1, 0, 5), DiaSeg(3, 10, 20) };

        SpeakerOverlapMapper.AssignByOverlap(texts, dias);

        Assert.Equal(3, texts[0].Speaker);
    }

    // ═════════ 2.b 部分重叠多者胜 ═════════

    [Fact]
    public void AssignByOverlap_TwoPartialOverlaps_LongestOverlapWins()
    {
        // 文本段 [10,20]：与 [8,14] 重叠 4s（speaker 1，列表靠前）、与 [14,30] 重叠 6s（speaker 2）
        var texts = new List<SttSegment> { TextSeg(9, 10, 20) };
        var dias = new List<SttSegment> { DiaSeg(1, 8, 14), DiaSeg(2, 14, 30) };

        SpeakerOverlapMapper.AssignByOverlap(texts, dias);

        // 取重叠更长者，而不是列表里靠前的
        Assert.Equal(2, texts[0].Speaker);
    }

    // ═════════ 2.c 重叠并列取时间靠前者 ═════════

    [Fact]
    public void AssignByOverlap_OverlapTie_EarlierDiaSegmentWins()
    {
        // 文本段 [10,20]：与 [14,30] 重叠 6s、与 [10,16] 重叠 6s —— 并列；
        // 列表故意把时间靠后的 [14,30] 放在前面，证明按时间而非列表顺序
        var texts = new List<SttSegment> { TextSeg(9, 10, 20) };
        var dias = new List<SttSegment> { DiaSeg(7, 14, 30), DiaSeg(5, 10, 16) };

        SpeakerOverlapMapper.AssignByOverlap(texts, dias);

        Assert.Equal(5, texts[0].Speaker);
    }

    // ═════════ 2.d 空隙取时间距离最近者 ═════════

    [Fact]
    public void AssignByOverlap_NoOverlapGap_NearestDiaSegmentWins()
    {
        // 文本段 [20,25] 落在分离段 [0,10] 与 [28,40] 之间的空隙：
        // 距 [0,10] 为 10s，距 [28,40] 为 3s → 取 speaker 4（列表靠前者反而更远）
        var texts = new List<SttSegment> { TextSeg(9, 20, 25) };
        var dias = new List<SttSegment> { DiaSeg(1, 0, 10), DiaSeg(4, 28, 40) };

        SpeakerOverlapMapper.AssignByOverlap(texts, dias);

        Assert.Equal(4, texts[0].Speaker);
    }

    // ═════════ 2.e 分离段为空 → 逐字段全等 ═════════

    [Fact]
    public void AssignByOverlap_EmptyDiaSegments_NoFieldChanges()
    {
        var texts = new List<SttSegment>
        {
            TextSeg(1, 0, 2, "甲"),
            TextSeg(2, 2.5, 4, "乙"),
            TextSeg(1, 4.5, 6, "丙"),
        };
        texts[0].OriginalSpeaker = 7;
        texts[2].OriginalSpeaker = null;
        var spk = texts.Select(s => s.Speaker).ToList();
        var txt = texts.Select(s => s.Text).ToList();
        var st = texts.Select(s => s.Start).ToList();
        var en = texts.Select(s => s.End).ToList();
        var os = texts.Select(s => s.OriginalSpeaker).ToList();

        SpeakerOverlapMapper.AssignByOverlap(texts, new List<SttSegment>());

        Assert.Equal(spk, texts.Select(s => s.Speaker));            // 序列相等断言
        Assert.Equal(txt, texts.Select(s => s.Text));
        Assert.Equal(st, texts.Select(s => s.Start));
        Assert.Equal(en, texts.Select(s => s.End));
        Assert.Equal(os, texts.Select(s => s.OriginalSpeaker));
    }

    // ═════════ 2.f 只改 Speaker（硬契约） ═════════

    [Fact]
    public void AssignByOverlap_MixedScenario_ChangesOnlySpeakerField()
    {
        // 三段混合场景：完全/部分重叠、空隙各一；Speaker 按重叠规则改变，
        // Text/Start/End/OriginalSpeaker 逐字段必须原样不动
        var texts = new List<SttSegment>
        {
            TextSeg(9, 0, 3, "甲"),     // 与 [0,4] 重叠 3s → speaker 1
            TextSeg(8, 5, 6, "乙"),     // 空隙：距 [0,4] 1s < 距 [8,12] 2s → speaker 1
            TextSeg(7, 9, 11, "丙"),   // 与 [8,12] 重叠 2s → speaker 2
        };
        texts[0].OriginalSpeaker = 100;
        texts[1].OriginalSpeaker = null;
        texts[2].OriginalSpeaker = 42;
        var dias = new List<SttSegment> { DiaSeg(1, 0, 4), DiaSeg(2, 8, 12) };
        var txt = texts.Select(s => s.Text).ToList();
        var st = texts.Select(s => s.Start).ToList();
        var en = texts.Select(s => s.End).ToList();
        var os = texts.Select(s => s.OriginalSpeaker).ToList();

        SpeakerOverlapMapper.AssignByOverlap(texts, dias);

        Assert.Equal(new[] { 1, 1, 2 }, texts.Select(s => s.Speaker));  // Speaker 按规则改变
        Assert.Equal(txt, texts.Select(s => s.Text));                    // 其余逐字段不变
        Assert.Equal(st, texts.Select(s => s.Start));
        Assert.Equal(en, texts.Select(s => s.End));
        Assert.Equal(os, texts.Select(s => s.OriginalSpeaker));
    }
}
