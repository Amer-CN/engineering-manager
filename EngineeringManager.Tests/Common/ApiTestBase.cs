using Microsoft.AspNetCore.Builder;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.DependencyInjection;
using System.Data;
using Dapper;
using Xunit;
using EngineeringManager.Api;
using EngineeringManager.Api.Migrations;

namespace EngineeringManager.Tests.Common;

public class ApiTestBase : IDisposable
{
    protected readonly HttpClient Client;
    protected readonly string DbPath;
    protected readonly string ConnectionString;
    private readonly WebApplication _app;

    public ApiTestBase()
    {
        DbPath = Path.Combine(Path.GetTempPath(), $"test-{Guid.NewGuid()}.db");
        ConnectionString = $"Data Source={DbPath}";

        // v1.1.0: 测试环境 env var 必须在 WebApplication.CreateBuilder 之前设 (ApiConfig 用 UseUrls)
        Environment.SetEnvironmentVariable("DISABLE_RATELIMIT", "1");
        Environment.SetEnvironmentVariable("ASPNETCORE_ENVIRONMENT", "Development");

        MigrationRunner.Run(ConnectionString);
        SeedTestData();

        var builder = WebApplication.CreateBuilder();
        // v1.1.0: 用 127.0.0.1:0 不用 localhost:0 (Kestrel 不支持 localhost:0 动态端口)
        builder.WebHost.UseUrls("http://127.0.0.1:0");
        ApiConfig.ConfigureServices(builder);

        // 子类可覆盖此方法注入测试替身
        ConfigureExtraServices(builder.Services);

        builder.Services.AddScoped<IDbConnection>(_ =>
        {
            var conn = new SqliteConnection(ConnectionString);
            conn.Open();
            using var cmd = conn.CreateCommand();
            cmd.CommandText = "PRAGMA journal_mode=WAL";
            cmd.ExecuteNonQuery();
            return conn;
        });

        _app = builder.Build();
        ApiConfig.ConfigureApp(_app);
        _app.UseDeveloperExceptionPage(); // 测试时显示 500 错误详情
        _app.Start();

        var port = _app.Urls.First().Split(':').Last();
        Client = new HttpClient { BaseAddress = new Uri($"http://localhost:{port}") };
    }

    /// <summary>
    /// 子类可覆盖此方法，在 Build 之前注入或覆盖 DI 服务注册。
    /// 默认不做任何事。
    /// </summary>
    protected virtual void ConfigureExtraServices(IServiceCollection services) { }

    private void SeedTestData()
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();

        // v0.80: is_default_password 列（EnsureTables 在生产环境添加，测试环境需手动补）
        try { conn.Execute("ALTER TABLE users ADD COLUMN is_default_password INTEGER DEFAULT 0"); } catch { }

        var salt = "test-salt-1234567890123456";
        var hash = EngineeringManager.Api.Common.HashPassword("admin123", salt, 2);

        conn.Execute(@"
            INSERT OR IGNORE INTO users (id, username, password, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
            VALUES (@Id, @Username, @Password, @Hash, @Salt, @Version, @DisplayName, @RoleId, @Status, @Now)",
            new
            {
                Id = "1",
                Username = "admin",
                Password = "admin123",
                Hash = hash,
                Salt = salt,
                Version = 2,
                DisplayName = "管理员",
                RoleId = "admin",
                Status = "active",
                Now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss")
            });
    }

    public void Dispose()
    {
        Client.Dispose();
        _app.StopAsync().GetAwaiter().GetResult();
        try { if (File.Exists(DbPath)) File.Delete(DbPath); } catch { }
    }
}
