using Xunit;

namespace EngineeringManager.Tests.Migrations;

/// <summary>
/// 财税知识库 INDEX 完整性与时效闸门（docs/finance-knowledge/REDLINES.md 第 5、6 条）。
///
/// - 状态含「有效」的条目必须带「最后验证」日期，且距今不超过 6 个月（183 天）——
///   超期即红，提醒季度巡检（REDLINES 第 6 条：条目超 6 个月未复验视为过期，禁止使用）。
/// - 每条必须有依据文号——无文号的口径不得进入 INDEX。
/// - 本测试让「时效纪律」从文档承诺变成红绿灯强制项：知识过期 = 测试红 = 版本不可 tag。
/// </summary>
public class FinanceKnowledgeIndexTests
{
    /// <summary>REDLINES 第 6 条：6 个月时效窗口。</summary>
    private const int FreshnessWindowDays = 183;

    private static string FindRepoRoot()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        for (var current = dir; current != null && dir.Parent != null; current = current.Parent)
        {
            if (File.Exists(Path.Combine(current.FullName, "docs", "finance-knowledge", "INDEX.md")))
            {
                return current.FullName;
            }
            if (ReferenceEquals(current, current.Root)) break;
        }
        throw new InvalidOperationException(
            $"未定位到仓库根（向上查找 docs/finance-knowledge/INDEX.md 失败），起点 {AppContext.BaseDirectory}");
    }

    [Fact]
    public void IndexEntries_15Rows_IdAndBasisAndStatusPresent_EffectiveEntriesFresh()
    {
        var path = Path.Combine(FindRepoRoot(), "docs", "finance-knowledge", "INDEX.md");
        Assert.True(File.Exists(path), $"INDEX.md 不存在：{path}");

        var rows = File.ReadAllLines(path)
            .Where(l => l.StartsWith("| FP", StringComparison.Ordinal)
                     || l.StartsWith("| GS", StringComparison.Ordinal)
                     || l.StartsWith("| JS", StringComparison.Ordinal))
            .ToList();

        Assert.True(rows.Count >= 15, $"INDEX 数据行应 ≥15（FP08+GS04+JS03），实际 {rows.Count}");

        var seenIds = new HashSet<string>(StringComparer.Ordinal);
        var today = DateTime.Now.Date;

        foreach (var row in rows)
        {
            // | id | 条目 | 依据文号 | 施行/生效 | 状态 | 最后验证 | 代码触点 |
            var cells = row.Split('|').Select(c => c.Trim()).ToArray();
            Assert.True(cells.Length >= 8, $"行列数异常（{cells.Length} 列）：{row}");

            var id = cells[1];
            Assert.False(string.IsNullOrEmpty(id), $"id 为空：{row}");
            Assert.True(seenIds.Add(id), $"id 重复：{id}");

            var basis = cells[3];
            Assert.False(string.IsNullOrEmpty(basis), $"{id} 依据文号为空——无文号的口径不得入 INDEX");

            var status = cells[5];
            Assert.False(string.IsNullOrEmpty(status), $"{id} 状态列为空");

            if (!status.Contains("有效", StringComparison.Ordinal)) continue;

            var verifiedText = cells[6];
            Assert.False(string.IsNullOrEmpty(verifiedText), $"{id} 状态为「{status}」但缺最后验证日期");

            Assert.True(DateTime.TryParseExact(verifiedText, "yyyy-MM-dd", null,
                    System.Globalization.DateTimeStyles.None, out var verified),
                $"{id} 最后验证日期格式应为 yyyy-MM-dd，实际「{verifiedText}」");
            Assert.True(verified <= today.AddDays(1), $"{id} 最后验证日期 {verifiedText} 在未来");

            var ageDays = (today - verified).TotalDays;
            Assert.True(ageDays <= FreshnessWindowDays,
                $"{id} 最后验证 {verifiedText} 距今 {ageDays:F0} 天，超过 6 个月时效窗口——" +
                "REDLINES 第 6 条：季度巡检已逾期，请复验后更新 INDEX（或降级为待复核/过期）");
        }
    }
}
