using System.Data;
using Dapper;

namespace EngineeringManager.Api.Security;

/// <summary>
/// v0.78.0 累计待办 #5 续: PII 后台 re-encrypt worker
/// 背景: PiiProtector 多 key 轮换 (v0.76.0) 后, 旧 _enc 列还是用旧 key 加密的
///       admin rotate 新 key 后, 调此 worker 用新 active key 重新加密所有 _enc
///
/// 设计:
///   - 13 个 _enc 列 (4 张表), 后台顺序处理, 每行 Decrypt → Encrypt → UPDATE
///   - 进度持久化到 pii_reencrypt_status 表 (重启可继续)
///   - 单行失败不中断 worker (log error + continue)
///   - 用 PiiProtector 自动判断密文格式 (v1.2.0 旧 fallback key_id=1 / v0.76.0 新格式)
///   - snapshot target_key_id at start, 防止 rotate 期间混乱
/// </summary>
public class PiiReencryptWorker
{
    private readonly PiiProtector _pii;
    private readonly ILogger<PiiReencryptWorker> _logger;

    // 13 个 _enc 列: (table, column)
    private static readonly (string Table, string Column)[] PiiColumns = new[]
    {
        ("members", "id_card_enc"),
        ("members", "id_card_address_enc"),
        ("members", "phone_enc"),
        ("members", "bank_account_enc"),
        ("workers", "id_card_enc"),
        ("workers", "phone_enc"),
        ("workers", "address_enc"),
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

    /// <summary>
    /// 启动 worker (fire-and-forget, 后台线程)
    /// 注: 如果已经在 running, 抛 InvalidOperationException
    /// </summary>
    public Task StartAsync(IDbConnection db, string triggeredBy)
    {
        var status = db.QueryFirstOrDefault<dynamic>("SELECT status FROM pii_reencrypt_status WHERE id=1");
        var currentStatus = status?.status as string;
        if (currentStatus == "running")
            throw new InvalidOperationException("PII re-encrypt 已在运行中");

        return Task.Run(() => RunInternalAsync(db, triggeredBy));
    }

    /// <summary>
    /// 查询当前状态 (前端轮询用)
    /// </summary>
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
        await Task.Yield(); // satisfy async
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
            var count = db.ExecuteScalar<long>($"SELECT COUNT(*) FROM {table} WHERE {column} IS NOT NULL AND {column} != ''");
            totalRows += count;
        }
        db.Execute("UPDATE pii_reencrypt_status SET total_rows=@T, updated_at=@Now WHERE id=1", new { T = totalRows, Now = now() });
        _logger.LogInformation("[PiiReencrypt] 启动: target_key_id={Key}, total_rows={Total}", targetKeyId, totalRows);

        // 3. 处理每列
        long processedRows = 0;
        long failedRows = 0;
        var lastProcessedId = db.QueryFirstOrDefault<long?>("SELECT last_processed_id FROM pii_reencrypt_status WHERE id=1");
        var resumeTable = db.QueryFirstOrDefault<string?>("SELECT current_table FROM pii_reencrypt_status WHERE id=1");
        var resumeColumn = db.QueryFirstOrDefault<string?>("SELECT current_column FROM pii_reencrypt_status WHERE id=1");
        var skipUntil = !string.IsNullOrEmpty(resumeTable) && !string.IsNullOrEmpty(resumeColumn);

        foreach (var (table, column) in PiiColumns)
        {
            // 跳过已 resume 之前的列
            if (skipUntil && (table != resumeTable || column != resumeColumn)) continue;
            skipUntil = false;

            db.Execute("UPDATE pii_reencrypt_status SET current_table=@T, current_column=@C, updated_at=@Now WHERE id=1",
                new { T = table, C = column, Now = now() });

            // 取所有非空 _enc 行
            var rows = db.Query<(long Id, string Cipher)>($"SELECT id, {column} FROM {table} WHERE {column} IS NOT NULL AND {column} != '' ORDER BY id").ToList();
            foreach (var row in rows)
            {
                if (resumeTable == table && resumeColumn == column && lastProcessedId.HasValue && row.Id <= lastProcessedId.Value)
                {
                    processedRows++;
                    continue;
                }

                try
                {
                    var plain = _pii.Decrypt(row.Cipher);
                    var newCipher = _pii.Encrypt(plain);
                    // 如果新旧密文相同, 跳过 UPDATE (idempotent)
                    if (newCipher != row.Cipher)
                    {
                        db.Execute($"UPDATE {table} SET {column}=@C WHERE id=@Id", new { C = newCipher, Id = row.Id });
                    }
                    processedRows++;
                }
                catch (Exception ex)
                {
                    failedRows++;
                    _logger.LogError(ex, "[PiiReencrypt] 失败: {Table}.{Column} id={Id}", table, column, row.Id);
                    db.Execute("UPDATE pii_reencrypt_status SET failed_rows=@F, last_error=@E, updated_at=@Now WHERE id=1",
                        new { F = failedRows, E = $"{table}.{column} id={row.Id}: {ex.Message}", Now = now() });
                }

                // 每 50 行更新一次进度
                if (processedRows % 50 == 0)
                {
                    db.Execute("UPDATE pii_reencrypt_status SET processed_rows=@P, last_processed_id=@I, updated_at=@Now WHERE id=1",
                        new { P = processedRows, I = row.Id, Now = now() });
                }
            }
        }

        // 4. 完成
        db.Execute("UPDATE pii_reencrypt_status SET status=@S, processed_rows=@P, failed_rows=@F, completed_at=@Now, updated_at=@Now WHERE id=1",
            new { S = failedRows > 0 ? "completed_with_errors" : "completed", P = processedRows, F = failedRows, Now = now() });
        _logger.LogInformation("[PiiReencrypt] 完成: processed={Processed}, failed={Failed}", processedRows, failedRows);
    }
}

/// <summary>
/// PII re-encrypt 状态 DTO (前端轮询用)
/// </summary>
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
