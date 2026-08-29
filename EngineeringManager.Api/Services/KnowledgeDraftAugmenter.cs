using System.Text;

namespace EngineeringManager.Api.Services;

/// <summary>
/// 写作中心 T1 — AI 起草联动知识库的检索增强器。
///
/// 起草时用素材文本检索公司知识库（复用 KnowledgeBaseService.SearchAsync 的
/// FTS+语义混合检索），把命中片段格式化为 prompt 参考区块，注入起草 user prompt
/// 的【素材/事实】区之后。增强是加分项不是依赖项：无命中/异常/超时一律返回 null，
/// 起草静默降级为纯素材模式。
///
/// 检索以委托注入（生产适配器包 KnowledgeBaseService，单测可 stub），
/// 实现类自身无状态、Singleton 安全。
/// </summary>
public interface IKnowledgeDraftAugmenter
{
    /// <summary>
    /// 依据起草素材检索知识库，返回格式化好的 prompt 参考区块文本（含标题行）；
    /// 无命中/异常/超时（3 秒）/素材为空 → null。
    /// </summary>
    Task<string?> BuildAugmentAsync(string material, string? userId, bool isAdmin, CancellationToken ct);
}

/// <summary>
/// 检索委托签名：(query, topK, userId, isAdmin) → SearchResult。
/// 生产代码在 DI 注册处用适配器包 KnowledgeBaseService.SearchAsync。
/// </summary>
public sealed class KnowledgeDraftAugmenter : IKnowledgeDraftAugmenter
{
    private readonly Func<string, int, string?, bool, Task<SearchResult>> _search;

    /// <summary>检索超时上限：超时放弃增强，起草照常进行</summary>
    private static readonly TimeSpan SearchTimeout = TimeSpan.FromSeconds(3);

    private const int QueryMaxChars = 200;   // 素材截断作为检索 query
    private const int SnippetMaxChars = 300; // 每条命中片段截断
    private const int MaxHits = 3;           // 取前 3 条

    public KnowledgeDraftAugmenter(Func<string, int, string?, bool, Task<SearchResult>> search) =>
        _search = search;

    public async Task<string?> BuildAugmentAsync(string material, string? userId, bool isAdmin, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(material))
            return null;

        try
        {
            var query = material.Length > QueryMaxChars ? material[..QueryMaxChars] : material;
            var searchTask = _search(query, MaxHits, userId, isAdmin);
            var completed = await Task.WhenAny(searchTask, Task.Delay(SearchTimeout, ct));
            if (completed != searchTask)
                return null; // 超时（或 ct 取消）：放弃增强，不阻塞起草

            var result = await searchTask;
            if (result is null || result.TotalHits == 0)
                return null;

            var hits = result.Hits
                .Where(h => !string.IsNullOrWhiteSpace(h.Text))
                .OrderByDescending(h => h.RrfScore ?? 0)
                .Take(MaxHits)
                .ToList();
            if (hits.Count == 0)
                return null;

            var sb = new StringBuilder();
            sb.AppendLine("【公司知识库参考】（以下为系统自动检索的相关资料片段，可信度低于用户素材，仅供参考，不得虚构其中未出现的数据）");
            for (var i = 0; i < hits.Count; i++)
            {
                var text = hits[i].Text.Length > SnippetMaxChars
                    ? hits[i].Text[..SnippetMaxChars]
                    : hits[i].Text;
                sb.AppendLine($"[{i + 1}] 《{hits[i].DocTitle ?? "未命名文档"}》: {text}");
            }
            return sb.ToString().TrimEnd();
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[KnowledgeDraftAugmenter] 知识库检索增强失败（降级为纯素材起草）: {ex.Message}");
            return null;
        }
    }
}
