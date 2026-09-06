using System.Data;
using Dapper;
using Microsoft.Data.Sqlite;

namespace EngineeringManager.Api.Security;

/// <summary>
/// v0.78.0 → v0.78.1: PII 后台 re-encrypt worker (chunked 优化版)
/// 背景: PiiProtector 多 key 轮换 (v0.76.0) 后, 旧 _enc 列还是用旧 key 加密的
///       admin rotate 新 key 后, 调此 worker 用新 active key 重新加密所有 _enc
///
/// v0.78.1 优化:
///   - chunked SELECT: 每批 500 行 (WHERE id > lastId ORDER BY id LIMIT 500)
///   - batch UPDATE: 每 50 行一次事务提交 (减少 WAL 写入)
///   - 进度更新粒度: 每 50 行 (前端轮询 3s 可见变化)
///   - 重启继续: last_processed_id + current_table/column 持久化
/// </summary>
public class PiiReencryptWorker
{
    private readonly PiiProtector _pii;
    private readonly ILogger<PiiReencryptWorker> _logger;
    private const int ChunkSize = 500;
    private const int BatchCommitSize = 50;

    // 14 个 _enc 列: (table, column)
    private static readonly (string Table, string Column)[] PiiColumns = new[]
    {
        ("members", "id_card_enc"),
        ("members", "id_card_address_enc"),
        ("members", "phone_enc"),
        ("members", "bank_account_enc"),
        ("workers", "id_card_enc"),
        ("workers", "phone_enc"),
        ("workers", "address_enc"),
        ("workers", "current_address_enc"),
        ("workers", "bank_account_enc"),
        ("partners", "phone_enc"),
        ("partners", "bank_account_enc"),
        ("partners", "credit_code_enc"),
        ("partners", "tax_number_enc"),
        ("supervisors", "phone_enc"),
    };

    public PiiReencryptWorker(PiiProtector pii, ILogger<PiiReencryptWorker> logger)
    {
        _pii = pii;
        _logger = logger;
    }

    public Task StartAsync(IDbConnection db, string triggeredBy)
    {
        // F3(审计): 原子占位取代 check-then-act——两个并发触发请求只有一个能把状态置为 running；
        // 上次崩溃遗留的 running 由启动复位兜底（Program.cs 启动时 running→interrupted），不再永久锁死
        var claimed = db.Execute(
            "UPDATE pii_reencrypt_status SET status='running', updated_at=@Now WHERE id=1 AND status<>'running'",
            new { Now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") });
        if (claimed == 0)
            throw new InvalidOperationException("PII re-encrypt 已在运行中");

        return Task.Run(() => RunInternalAsync(db, triggeredBy));
    }

    public ReencryptStatusDto GetStatus(IDbConnection db)
    {
        var row = db.QueryFirstOrDefault<dynamic>("SELECT * FROM pii_reencrypt_status WHERE id=1");
        if (row == null) return new ReencryptStatusDto { Status = "idle" };
        return new ReencryptStatusDto
        {
            Status = (string)row.status,
            TargetKeyId = (long)(row.target_key_id ?? 0),
            TotalRows = (long)(row.total_rows ?? 0),
            ProcessedRows = (long)(row.processed_rows ?? 0),
            FailedRows = (long)(row.failed_rows ?? 0),
            CurrentTable = (string?)row.current_table,
            CurrentColumn = (string?)row.current_column,
            StartedAt = (string?)row.started_at,
            UpdatedAt = (string?)row.updated_at,
            CompletedAt = (string?)row.completed_at,
            LastError = (string?)row.last_error,
        };
    }

    private async Task RunInternalAsync(IDbConnection db, string triggeredBy)
    {
        await Task.Yield();
        var now = () => DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
        var targetKeyId = _pii.ActiveKeyId;
        if (targetKeyId == 0)
        {
            _logger.LogError("[PiiReencrypt] PiiProtector 未初始化, 无法 re-encrypt");
            return;
        }

        // 1. 初始化状态
        db.Execute(@"UPDATE pii_reencrypt_status SET
            target_key_id=@TargetKey, status='running', total_rows=0, processed_rows=0, failed_rows=0,
            current_table=NULL, current_column=NULL, last_processed_id=NULL,
            started_at=@Now, updated_at=@Now, completed_at=NULL, last_error=NULL, triggered_by=@By
            WHERE id=1", new { TargetKey = targetKeyId, Now = now(), By = triggeredBy });

        // 2. 算 total rows
        long totalRows = 0;
        foreach (var (table, column) in PiiColumns)
        {
            var count = db.ExecuteScalar<long>($"SELECT COUNT(*) FROM [{table}] WHERE [{column}] IS NOT NULL AND [{column}] != ''");
            totalRows += count;
        }
        db.Execute("UPDATE pii_reencrypt_status SET total_rows=@T, updated_at=@Now WHERE id=1", new { T = totalRows, Now = now() });
        _logger.LogInformation("[PiiReencrypt] 启动: target_key_id={Key}, total_rows={Total}", targetKeyId, totalRows);

        // 3. chunked 处理每列
        long processedRows = 0;
        long failedRows = 0;
        var lastProcessedId = db.QueryFirstOrDefault<long?>("SELECT last_processed_id FROM pii_reencrypt_status WHERE id=1");
        var resumeTable = db.QueryFirstOrDefault<string?>("SELECT current_table FROM pii_reencrypt_status WHERE id=1");
        var resumeColumn = db.QueryFirstOrDefault<string?>("SELECT current_column FROM pii_reencrypt_status WHERE id=1");
        var skipUntil = !string.IsNullOrEmpty(resumeTable) && !string.IsNullOrEmpty(resumeColumn);

        foreach (var (table, column) in PiiColumns)
        {
            if (skipUntil && (table != resumeTable || column != resumeColumn)) continue;
            skipUntil = false;

            db.Execute("UPDATE pii_reencrypt_status SET current_table=@T, current_column=@C, updated_at=@Now WHERE id=1",
                new { T = table, C = column, Now = now() });

            // chunked: 每次取 ChunkSize 行, 用 id > lastId 游标分页
            long chunkStartId = 0;
            // resume: 如果当前列就是 resume 列, 从 lastProcessedId+1 开始
            if (resumeTable == table && resumeColumn == column && lastProcessedId.HasValue)
                chunkStartId = lastProcessedId.Value;

            while (true)
            {
                var chunk = db.Query<(long Id, string Cipher)>(
                    $"SELECT id, [{column}] FROM [{table}] WHERE [{column}] IS NOT NULL AND [{column}] != '' AND id > @LastId ORDER BY id LIMIT @Limit",
                    new { LastId = chunkStartId, Limit = ChunkSize }).ToList();

                if (chunk.Count == 0) break;

                // batch: 每 BatchCommitSize 行开一个事务
                var batchUpdates = new List<(long Id, string NewCipher)>();
                foreach (var row in chunk)
                {
                    try
                    {
                        var plain = _pii.Decrypt(row.Cipher);
                        var newCipher = _pii.Encrypt(plain);
                        if (newCipher != row.Cipher)
                            batchUpdates.Add((row.Id, newCipher));
                        processedRows++;
                    }
                    catch (Exception ex)
                    {
                        failedRows++;
                        _logger.LogError(ex, "[PiiReencrypt] 失败: {Table}.{Column} id={Id}", table, column, row.Id);
                        db.Execute("UPDATE pii_reencrypt_status SET failed_rows=@F, last_error=@E, updated_at=@Now WHERE id=1",
                            new { F = failedRows, E = $"{table}.{column} id={row.Id}: {ex.Message}", Now = now() });
                    }

                    // 每 BatchCommitSize 行提交一次事务
                    if (batchUpdates.Count >= BatchCommitSize)
                    {
                        FlushBatch(db, table, column, batchUpdates);
                        batchUpdates.Clear();
                    }

                    // 每 50 行更新进度
                    if (processedRows % 50 == 0)
                    {
                        db.Execute("UPDATE pii_reencrypt_status SET processed_rows=@P, last_processed_id=@I, updated_at=@Now WHERE id=1",
                            new { P = processedRows, I = row.Id, Now = now() });
                    }
                }

                // flush 剩余
                if (batchUpdates.Count > 0)
                    FlushBatch(db, table, column, batchUpdates);

                chunkStartId = chunk[chunk.Count - 1].Id;

                // chunk 间更新进度
                db.Execute("UPDATE pii_reencrypt_status SET processed_rows=@P, last_processed_id=@I, updated_at=@Now WHERE id=1",
                    new { P = processedRows, I = chunkStartId, Now = now() });
            }
        }

        // 4. 完成
        db.Execute("UPDATE pii_reencrypt_status SET status=@S, processed_rows=@P, failed_rows=@F, completed_at=@Now, updated_at=@Now WHERE id=1",
            new { S = failedRows > 0 ? "completed_with_errors" : "completed", P = processedRows, F = failedRows, Now = now() });
        _logger.LogInformation("[PiiReencrypt] 完成: processed={Processed}, failed={Failed}", processedRows, failedRows);
    }

    /// <summary>
    /// 批量提交 UPDATE (事务)
    /// </summary>
    private static void FlushBatch(IDbConnection db, string table, string column, List<(long Id, string NewCipher)> batch)
    {
        if (db is SqliteConnection sqliteConn)
        {
            using var tx = sqliteConn.BeginTransaction();
            foreach (var (id, cipher) in batch)
            {
                db.Execute($"UPDATE [{table}] SET [{column}]=@C WHERE id=@Id", new { C = cipher, Id = id }, tx);
            }
            tx.Commit();
        }
        else
        {
            // fallback: 逐行 (非 SQLite 环境)
            foreach (var (id, cipher) in batch)
            {
                db.Execute($"UPDATE [{table}] SET [{column}]=@C WHERE id=@Id", new { C = cipher, Id = id });
            }
        }
    }
}

public class ReencryptStatusDto
{
    public string Status { get; set; } = "idle";
    public long TargetKeyId { get; set; }
    public long TotalRows { get; set; }
    public long ProcessedRows { get; set; }
    public long FailedRows { get; set; }
    public string? CurrentTable { get; set; }
    public string? CurrentColumn { get; set; }
    public string? StartedAt { get; set; }
    public string? UpdatedAt { get; set; }
    public string? CompletedAt { get; set; }
    public string? LastError { get; set; }
}
