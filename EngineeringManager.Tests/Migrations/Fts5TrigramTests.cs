using Microsoft.Data.Sqlite;
using Dapper;
using Xunit;

namespace EngineeringManager.Tests.Migrations;

/// <summary>
/// 验证 SQLite FTS5 + trigram tokenizer 是否可用（M1 开工前验证）
/// </summary>
public class Fts5TrigramTests
{
    [Fact]
    public void Fts5_Trigram_CreateAndQuery_Works()
    {
        // 使用 in-memory DB
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();

        // 1. 检查 SQLite 版本
        var version = conn.ExecuteScalar<string>("SELECT sqlite_version()");
        Assert.False(string.IsNullOrEmpty(version), "sqlite_version() should return a value");

        // 2. 检查 FTS5 是否编译进去
        //    如果 FTS5 不可用，CREATE VIRTUAL TABLE 会抛异常
        conn.Execute(@"CREATE VIRTUAL TABLE IF NOT EXISTS test_fts USING fts5(
            content,
            tokenize='trigram'
        )");

        // 3. 插入中文测试数据
        conn.Execute("INSERT INTO test_fts (content) VALUES (@c1), (@c2), (@c3)",
            new
            {
                c1 = "浙江中联结账付款进度款",
                c2 = "谭总说的二十七万有点高",
                c3 = "钢筋脚手架模板工期"
            });

        // 4. trigram 搜索中文（"结账付款" → 应匹配第一条）
        var results1 = conn.Query<string>(
            "SELECT content FROM test_fts WHERE test_fts MATCH @q ORDER BY rank",
            new { q = "结账付款" }).ToList();
        Assert.Single(results1);
        Assert.Contains("浙江中联结账付款", results1[0]);

        // 5. trigram 搜索部分词（"二十七万" → 应匹配第二条）
        var results2 = conn.Query<string>(
            "SELECT content FROM test_fts WHERE test_fts MATCH @q ORDER BY rank",
            new { q = "二十七万" }).ToList();
        Assert.Single(results2);
        Assert.Contains("二十七万", results2[0]);

        // 6. 搜索不存在的词（应返回空）
        var results3 = conn.Query<string>(
            "SELECT content FROM test_fts WHERE test_fts MATCH @q",
            new { q = "不存在的内容" }).ToList();
        Assert.Empty(results3);
    }

    [Fact]
    public void Fts5_Trigram_PartialMatch_Works()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();

        conn.Execute(@"CREATE VIRTUAL TABLE IF NOT EXISTS test_fts2 USING fts5(
            title, body,
            tokenize='trigram'
        )");

        conn.Execute("INSERT INTO test_fts2 (title, body) VALUES (@t, @b)",
            new
            {
                t = "工程管家语音转文字",
                b = "Qwen3-ASR 1.7B GGUF q4_k Vulkan GPU 转写"
            });

        // trigram 支持子串匹配（"语音转" → 匹配 title）
        var r1 = conn.Query<string>(
            "SELECT title FROM test_fts2 WHERE test_fts2 MATCH @q",
            new { q = "语音转" }).ToList();
        Assert.Single(r1);

        // "Vulkan" → 匹配 body
        var r2 = conn.Query<string>(
            "SELECT title FROM test_fts2 WHERE test_fts2 MATCH @q",
            new { q = "Vulkan" }).ToList();
        Assert.Single(r2);
    }
}
