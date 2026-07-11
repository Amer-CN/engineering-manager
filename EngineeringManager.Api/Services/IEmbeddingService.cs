namespace EngineeringManager.Api.Services;

/// <summary>
/// 文本向量化服务接口（M2 知识库语义检索用）
///
/// 实现方:
/// - BgeEmbeddingService: 本地 ONNX bge-small-zh-v1.5（512 维, L2 归一化）
/// - 测试可用 FakeEmbeddingService 替代
/// </summary>
public interface IEmbeddingService
{
    /// <summary>向量维度</summary>
    int Dimension { get; }

    /// <summary>模型是否已加载/可用</summary>
    bool IsAvailable { get; }

    /// <summary>单条文本 → L2 归一化向量</summary>
    Task<float[]> EmbedAsync(string text, CancellationToken ct = default);

    /// <summary>批量文本 → L2 归一化向量列表</summary>
    Task<List<float[]>> EmbedBatchAsync(List<string> texts, CancellationToken ct = default);
}
