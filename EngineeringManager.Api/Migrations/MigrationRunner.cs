using System.Data;
using System.Reflection;
using System.Text.RegularExpressions;
using Dapper;
using Microsoft.Data.Sqlite;

namespace EngineeringManager.Api.Migrations;

public static class MigrationRunner
{
    public static void Run(string connectionString)
    {
        using var conn = new SqliteConnection(connectionString);
        conn.Open();

        // 创建 schema_versions 表（DbUp 风格）
        conn.Execute(@"
            CREATE TABLE IF NOT EXISTS schema_versions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                script_name TEXT NOT NULL UNIQUE,
                applied_at TEXT NOT NULL
            );
        ");

        // 获取已执行的迁移
        var applied = new HashSet<string>(
            conn.Query<string>("SELECT script_name FROM schema_versions")
        );

        // 读取嵌入式 SQL 脚本
        var assembly = Assembly.GetExecutingAssembly();
        var scriptNames = assembly.GetManifestResourceNames()
            .Where(n => n.EndsWith(".sql"))
            .OrderBy(n => n)
            .ToList();

        foreach (var name in scriptNames)
        {
            if (applied.Contains(name)) continue;

            Console.WriteLine($"[Migration] 执行: {name}");
            using var stream = assembly.GetManifestResourceStream(name)!;
            using var reader = new StreamReader(stream);
            var sql = reader.ReadToEnd();

            using var transaction = conn.BeginTransaction();
            try
            {
                ExecuteScriptIdempotent(conn, transaction, sql);
                conn.Execute(
                    "INSERT INTO schema_versions (script_name, applied_at) VALUES (@Name, @Time)",
                    new { Name = name, Time = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") },
                    transaction: transaction);
                transaction.Commit();
                Console.WriteLine($"[Migration] 完成: {name}");
            }
            catch (Exception ex)
            {
                transaction.Rollback();
                Console.Error.WriteLine($"[Migration] 失败: {name} — {ex.Message}");
                throw;
            }
        }
    }

    public static void Run(IDbConnection db)
    {
        var connStr = db.ConnectionString;
        Run(connStr);
    }

    /// <summary>
    /// 幂等执行 SQL 脚本：逐条语句执行，吞掉"列已存在"等良性错误。
    /// 适用于 SQLite — SQLite 不支持 IF NOT EXISTS for ADD COLUMN，
    /// 对历史数据库反复执行 ALTER TABLE ADD COLUMN 不会因此中断。
    /// </summary>
    private static void ExecuteScriptIdempotent(SqliteConnection conn, SqliteTransaction transaction, string script)
    {
        // 拆分语句（按 ; 分隔，跳过空行与 -- 注释；用简单状态机而非正则，保证 CREATE TABLE 等多行语句不被切碎）
        var statements = SplitSqlStatements(script);
        foreach (var stmt in statements)
        {
            var trimmed = stmt.Trim();
            if (string.IsNullOrEmpty(trimmed)) continue;
            if (trimmed.StartsWith("--")) continue;

            try
            {
                using var cmd = conn.CreateCommand();
                cmd.Transaction = transaction;
                cmd.CommandText = trimmed;
                cmd.ExecuteNonQuery();
            }
            catch (Microsoft.Data.Sqlite.SqliteException ex)
            {
                if (IsBenignAlterError(ex))
                {
                    // X11.7: 记录被跳过的语句，避免静默丢失迁移信息
                    var summary = trimmed.Length > 80 ? trimmed.Substring(0, 80) + "..." : trimmed;
                    Console.WriteLine($"[Migration] 幂等跳过: {summary} ({ex.Message})");
                    continue;
                }
                throw;
            }
        }
    }

    /// <summary>SQLite "良性 ALTER 错误"判定：列已存在/表已存在/索引已存在等。</summary>
    private static bool IsBenignAlterError(Microsoft.Data.Sqlite.SqliteException ex) =>
        ex.SqliteErrorCode == 1 && (
            ex.Message.Contains("duplicate column name", StringComparison.OrdinalIgnoreCase) ||
            ex.Message.Contains("already exists", StringComparison.OrdinalIgnoreCase)
        );

    /// <summary>
    /// SQL 语句切分器：按 ; 切，跳过字符串/注释内的 ;
    /// 支持 BEGIN...END 块（触发器体内的 ; 不切分）
    /// </summary>
    private static List<string> SplitSqlStatements(string script)
    {
        var result = new List<string>();
        var sb = new System.Text.StringBuilder();
        bool inSingleQuote = false, inDoubleQuote = false;
        int beginDepth = 0; // BEGIN...END 嵌套深度

        for (int i = 0; i < script.Length; i++)
        {
            char c = script[i];

            // 跳过 -- 行注释
            if (!inSingleQuote && !inDoubleQuote && c == '-' && i + 1 < script.Length && script[i + 1] == '-')
            {
                while (i < script.Length && script[i] != '\n') i++;
                if (i < script.Length) sb.Append('\n');
                continue;
            }

            if (c == '\'' && !inDoubleQuote) inSingleQuote = !inSingleQuote;
            else if (c == '"' && !inSingleQuote) inDoubleQuote = !inDoubleQuote;

            // 检测 BEGIN / END 关键字（不区分大小写，需为完整单词）
            if (!inSingleQuote && !inDoubleQuote)
            {
                // 检查当前是否在单词边界
                bool atWordStart = i == 0 || !char.IsLetterOrDigit(script[i - 1]);

                if (atWordStart)
                {
                    // 向前匹配 BEGIN
                    if (i + 5 <= script.Length)
                    {
                        var word = script.Substring(i, 5);
                        if (word.Equals("BEGIN", StringComparison.OrdinalIgnoreCase) &&
                            (i + 5 >= script.Length || !char.IsLetterOrDigit(script[i + 5])))
                        {
                            beginDepth++;
                            sb.Append(script, i, 5);
                            i += 4;
                            continue;
                        }
                    }

                    // 向前匹配 END（仅在 BEGIN 块内）
                    if (beginDepth > 0 && i + 3 <= script.Length)
                    {
                        var word = script.Substring(i, 3);
                        if (word.Equals("END", StringComparison.OrdinalIgnoreCase) &&
                            (i + 3 >= script.Length || !char.IsLetterOrDigit(script[i + 3])))
                        {
                            beginDepth--;
                            sb.Append(script, i, 3);
                            i += 2;
                            continue;
                        }
                    }
                }
            }

            if (c == ';' && !inSingleQuote && !inDoubleQuote && beginDepth == 0)
            {
                result.Add(sb.ToString());
                sb.Clear();
            }
            else
            {
                sb.Append(c);
            }
        }
        if (sb.Length > 0) result.Add(sb.ToString());
        return result;
    }
}
