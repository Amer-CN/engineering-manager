namespace EngineeringManager.Api.Services.Stt;

/// <summary>
/// 说话人重叠回填器（任务书 .work/task-moss-speaker-pipeline.md，2026-09-10）。
///
/// 背景：MOSS 一步成段的说话人编号按块独立分配，长录音跨块不可信（#28 实测 63 块首段编号全同）；
/// 前一轮「组声纹均值全局聚类」方案真机塌缩成 1 人，已回退。本方案改为复用现役分离管线
/// （DiarizationService + job.Num_Speakers，与 Qwen 多人分支同款）定说话人，MOSS 只出文本与时间戳，
/// 本映射器把两者按时间重叠回填。
///
/// 纯函数、无 IO、无副作用：便于单元测试与沙箱直调。
/// </summary>
internal static class SpeakerOverlapMapper
{
    /// <summary>
    /// 用分离段为文本段定说话人：每个文本段取时间重叠最长的分离段的 Speaker；
    /// 无重叠时取时间距离最近的分离段的 Speaker；分离段为空则原样返回（不改任何字段）。
    /// 重叠时长 = max(0, min(a.End, b.End) - max(a.Start, b.Start))；并列（重叠相同）取时间靠前者
    /// （分离段 Start 小者优先，Start 相同再比 End；最近邻并列同此规则）。就近判定的距离 = 两侧间隙。
    /// 只改 <see cref="SttSegment.Speaker"/> 字段，Text/Start/End/OriginalSpeaker 一律不动（硬契约）。
    /// </summary>
    internal static void AssignByOverlap(List<SttSegment> textSegments, IReadOnlyList<SttSegment> diaSegments)
    {
        if (diaSegments.Count == 0) return;

        for (var i = 0; i < textSegments.Count; i++)
        {
            var seg = textSegments[i];
            var bestOverlapIdx = -1;
            double bestOverlap = 0;
            var bestGapIdx = -1;
            double bestGap = double.MaxValue;

            for (var j = 0; j < diaSegments.Count; j++)
            {
                var dia = diaSegments[j];
                var overlap = Math.Min(seg.End, dia.End) - Math.Max(seg.Start, dia.Start);
                if (overlap > 0)
                {
                    if (bestOverlapIdx < 0
                        || overlap > bestOverlap
                        || (overlap == bestOverlap && IsEarlier(dia, diaSegments[bestOverlapIdx])))
                    {
                        bestOverlap = overlap;
                        bestOverlapIdx = j;
                    }
                }
                else
                {
                    var gap = Math.Max(0, Math.Max(seg.Start - dia.End, dia.Start - seg.End));
                    if (bestGapIdx < 0
                        || gap < bestGap
                        || (gap == bestGap && IsEarlier(dia, diaSegments[bestGapIdx])))
                    {
                        bestGap = gap;
                        bestGapIdx = j;
                    }
                }
            }

            if (bestOverlapIdx >= 0)
                seg.Speaker = diaSegments[bestOverlapIdx].Speaker;
            else if (bestGapIdx >= 0)
                seg.Speaker = diaSegments[bestGapIdx].Speaker;
            // diaSegments 非空时二者必有其一：每个分离段要么有重叠要么有间隙，无需兜底
        }
    }

    /// <summary>时间靠前判定：Start 小者优先；Start 相同再比 End；完全相同视为不靠前（保留先遇者，确定性）。</summary>
    private static bool IsEarlier(SttSegment a, SttSegment b) =>
        a.Start < b.Start || (a.Start == b.Start && a.End < b.End);
}
