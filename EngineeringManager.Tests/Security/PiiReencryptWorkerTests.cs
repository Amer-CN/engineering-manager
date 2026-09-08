using System.Data;
using Dapper;
using EngineeringManager.Api;
using EngineeringManager.Api.Security;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace EngineeringManager.Tests.Security;

public class PiiReencryptWorkerTests : IDisposable
{
    private readonly string _dbPath;
    private readonly IDbConnection _db;
    private readonly PiiProtector _pii;
    private readonly PiiReencryptWorker _worker;

    public PiiReencryptWorkerTests()
    {
        _dbPath = Path.Combine(Path.GetTempPath(), $"reencrypt-test-{Guid.NewGuid()}.db");
        var connStr = $"Data Source={_dbPath};Pooling=False";
        EngineeringManager.Api.Migrations.MigrationRunner.Run(connStr);
        _db = new SqliteConnection(connStr);
        _db.Open();
        _pii = new PiiProtector(NullLogger<PiiProtector>.Instance);
        _pii.Initialize(_db);
        _worker = new PiiReencryptWorker(_pii, NullLogger<PiiReencryptWorker>.Instance);
    }

    public void Dispose()
    {
        _db.Dispose();
        if (File.Exists(_dbPath)) File.Delete(_dbPath);
    }

    private void InsertTestMember(string phoneEnc, string idCardEnc = "")
    {
        _db.Execute(@"INSERT INTO members (name, phone_enc, id_card_enc, created_at, created_by)
            VALUES (@Name, @Phone, @IdCard, @Now, @By)",
            new { Name = "Test", Phone = phoneEnc, IdCard = idCardEnc, Now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"), By = "test" });
    }

    [Fact]
    public async Task Worker_StartAsync_RunsAllColumns()
    {
        // Insert encrypted data
        var cipher1 = _pii.Encrypt("13800138000");
        var cipher2 = _pii.Encrypt("110101199001011234");
        InsertTestMember(cipher1, cipher2);

        // Rotate key first so re-encrypt has different key
        _pii.Rotate(_db, "test");

        // Run worker
        await _worker.StartAsync(_db, "test-admin");

        // Verify status completed
        var status = _worker.GetStatus(_db);
        Assert.Equal("completed", status.Status);
        Assert.True(status.ProcessedRows >= 2);
        Assert.Equal(0, status.FailedRows);
    }

    [Fact]
    public async Task Worker_SkipsAlreadyReencrypted()
    {
        var cipher1 = _pii.Encrypt("13800138000");
        InsertTestMember(cipher1);

        // No rotation - same key, so re-encrypt should be idempotent
        await _worker.StartAsync(_db, "test-admin");

        var status = _worker.GetStatus(_db);
        Assert.Equal("completed", status.Status);
    }

    [Fact]
    public async Task Worker_ContinuesOnRowFailure()
    {
        // Insert valid encrypted data
        var cipher1 = _pii.Encrypt("13800138000");
        InsertTestMember(cipher1);

        // Insert invalid ciphertext that will fail to decrypt
        _db.Execute(@"INSERT INTO members (name, phone_enc, id_card_enc, created_at, created_by)
            VALUES (@Name, @Phone, @IdCard, @Now, @By)",
            new { Name = "Bad", Phone = "invalid-cipher-text!!", IdCard = "", Now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"), By = "test" });

        // Rotate to different key
        _pii.Rotate(_db, "test");

        await _worker.StartAsync(_db, "test-admin");

        var status = _worker.GetStatus(_db);
        Assert.True(status.Status == "completed" || status.Status == "completed_with_errors");
        Assert.True(status.FailedRows >= 1); // at least the bad row failed
    }

    [Fact]
    public void Worker_GetStatus_ReturnsCurrentState()
    {
        var status = _worker.GetStatus(_db);
        Assert.Equal("idle", status.Status);
        Assert.Equal(0, status.TotalRows);
    }

    [Fact]
    public async Task Worker_StartAsync_ThrowsIfAlreadyRunning()
    {
        // Start a worker that will block
        var cipher1 = _pii.Encrypt("13800138000");
        InsertTestMember(cipher1);

        // Mark status as running manually
        _db.Execute(@"UPDATE pii_reencrypt_status SET status='running', target_key_id=1 WHERE id=1");

        await Assert.ThrowsAsync<InvalidOperationException>(() => _worker.StartAsync(_db, "test"));

        // Reset
        _db.Execute("UPDATE pii_reencrypt_status SET status='idle' WHERE id=1");
    }
}
