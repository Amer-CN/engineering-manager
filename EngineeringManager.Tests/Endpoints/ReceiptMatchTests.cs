using Dapper;
using EngineeringManager.Tests.Common;
using Microsoft.Data.Sqlite;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// 窗口 I-2：银行回单批量匹配 / 确认本体回归测试（propose-confirm，绝不自动写）。
///
/// 覆盖（匹配，纯读）：
///   1. 等值金额（ToFen 后）进候选；姓名互相包含 + 月份命中者排第一（score 最高）
///   2. 金额无匹配 → candidates 空数组
///   3. 已发款（paid_amount 非空）/ 已归档（payment_locked=1）行永不进候选
///   4. 金额差超容差（ToFen 后不等值）→ 不进候选
///   5. receipts 空数组 → matches 空数组（200）
/// 覆盖（确认，写付款列）：
///   6. 正常写入 paid_amount(分) / paid_date / bank_receipt_path；响应 { saved, skipped, skippedItems }
///   7. 已归档行 skipped（不写）
///   8. 他人创建的行（非 admin）skipped；自己创建的行 saved
///   9. 缺字段（wageId / paidAmount / paidDate / bankReceiptPath）→ 逐条 400
///  10. worker 角色（无 wages:update）→ 403
/// </summary>
public class ReceiptMatchTests : ApiTestBase
{
    private const string AdminPassword = "admin123";
    private const long TestProjectId = 9301;
    private const string Now = "2026-08-01 00:00:00";

    private async Task<string> LoginAsync(string username, string password)
    {
        var resp = await Client.PostAsJsonAsync("/api/auth/login", new { username, password });
        resp.EnsureSuccessStatusCode();
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        return json.GetProperty("data").GetProperty("token").GetString()!;
    }

    private void SetAuth(string token) =>
        Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    /// <summary>seed 一个工人（workers + project_workers），返回 project_workers.id</summary>
    private long SeedProjectWorker(string name, string createdBy = "1")
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var workerId = conn.ExecuteScalar<long>(
            "INSERT INTO workers (name, created_at) VALUES (@N, @Now); SELECT last_insert_rowid();",
            new { N = name, Now });
        conn.Execute(@"INSERT INTO project_workers (worker_id,project_id,team_id,daily_wage,worker_type,entry_date,status,created_by,created_at,last_modified_at)
            VALUES (@W,@P,NULL,300,'瓦工','2026-01-01','active',@By,@Now,@Now)",
            new { W = workerId, P = TestProjectId, By = createdBy, Now });
        return conn.ExecuteScalar<long>("SELECT last_insert_rowid();");
    }

    /// <summary>seed 一条工资行（actual_wage 单位为元，落库转分），返回 wages.id</summary>
    private long SeedWage(long pwId, string yearMonth, double actualWageYuan,
        bool paid = false, bool locked = false, string createdBy = "1")
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        return conn.ExecuteScalar<long>(@"INSERT INTO wages
            (project_id,project_worker_id,year_month,actual_wage,paid_amount,payment_locked,created_by,created_at,updated_at)
            VALUES (@P,@PW,@YM,@ActualFen,@PaidAmount,@Locked,@By,@Now,@Now);
            SELECT last_insert_rowid();",
            new
            {
                P = TestProjectId, PW = pwId, YM = yearMonth,
                ActualFen = (long)Math.Round(actualWageYuan * 100),
                PaidAmount = paid ? (long?)Math.Round(actualWageYuan * 100) : null,
                Locked = locked ? 1 : 0, By = createdBy, Now
            });
    }

    private static string WorkerNameOf(JsonElement candidates, int index) =>
        candidates[index].GetProperty("workerName").GetString()!;

    private static int ScoreOf(JsonElement candidates, int index) =>
        candidates[index].GetProperty("score").GetInt32();

    private async Task<JsonElement> PostMatchAsync(object body)
    {
        var resp = await Client.PostAsJsonAsync("/api/wages/match-receipts", body);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        return await resp.Content.ReadFromJsonAsync<JsonElement>();
    }

    // ── 匹配：候选打分与排序 ──

    [Fact]
    public async Task Match_EqualAmountAndNameHit_RanksFirst()
    {
        SetAuth(await LoginAsync("admin", AdminPassword));

        var zhangSanPw = SeedProjectWorker("张三");
        var liSiPw = SeedProjectWorker("李四");
        var wangWuPw = SeedProjectWorker("王五");
        // 三人同额 5000 元；张三同月、李四同月、王五相邻月（2026-08）
        var zhangSanWage = SeedWage(zhangSanPw, "2026-07", 5000);
        var liSiWage = SeedWage(liSiPw, "2026-07", 5000);
        var wangWuWage = SeedWage(wangWuPw, "2026-08", 5000);

        var json = await PostMatchAsync(new
        {
            projectId = TestProjectId,
            receipts = new[] { new { amount = 5000.0, date = "2026-07-15", counterparty = "张三", receiptPath = "r1.jpg" } },
        });

        var matches = json.GetProperty("data").GetProperty("matches");
        Assert.Equal(1, matches.GetArrayLength());
        var candidates = matches[0].GetProperty("candidates");
        Assert.Equal(3, candidates.GetArrayLength());

        // 等值金额 + 姓名命中（score = 3+2+1 = 6）排第一
        Assert.Equal("张三", WorkerNameOf(candidates, 0));
        Assert.Equal(6, ScoreOf(candidates, 0));
        Assert.Equal(zhangSanWage, candidates[0].GetProperty("wageId").GetInt64());
        var reasons = candidates[0].GetProperty("reasons").EnumerateArray().Select(r => r.GetString()).ToArray();
        Assert.Contains("金额分相等", reasons);
        Assert.Contains("姓名互相包含", reasons);
        Assert.Contains("日期与工资月份同月或相邻", reasons);
        // 金额字段以元回传
        Assert.Equal(5000m, candidates[0].GetProperty("amount").GetDecimal());

        // 同月无姓名命中（score = 3+1 = 4）排在姓名命中之后；分数降序
        var scores = candidates.EnumerateArray().Select(c => c.GetProperty("score").GetInt32()).ToArray();
        Assert.Equal(scores.OrderByDescending(s => s).ToArray(), scores);
        // 李四（同额同月、姓名不命中）score=4 且理由不含「姓名互相包含」
        var liSi = candidates.EnumerateArray().Single(c => c.GetProperty("wageId").GetInt64() == liSiWage);
        Assert.Equal(4, liSi.GetProperty("score").GetInt32());
        Assert.DoesNotContain("姓名互相包含", liSi.GetProperty("reasons").EnumerateArray().Select(r => r.GetString()));
        Assert.Contains(wangWuWage, candidates.EnumerateArray().Select(c => c.GetProperty("wageId").GetInt64()));
    }

    [Fact]
    public async Task Match_NoCandidates_ReturnsEmptyArray()
    {
        SetAuth(await LoginAsync("admin", AdminPassword));

        var pw = SeedProjectWorker("张三");
        SeedWage(pw, "2026-07", 5000);

        var json = await PostMatchAsync(new
        {
            projectId = TestProjectId,
            receipts = new[] { new { amount = 9999.0, date = "2026-07-15", counterparty = "张三", receiptPath = "r2.jpg" } },
        });

        var matches = json.GetProperty("data").GetProperty("matches");
        Assert.Equal(1, matches.GetArrayLength());
        Assert.Equal(0, matches[0].GetProperty("candidates").GetArrayLength());
    }

    [Fact]
    public async Task Match_PaidAndLockedRows_Excluded()
    {
        SetAuth(await LoginAsync("admin", AdminPassword));

        var zhangSanPw = SeedProjectWorker("张三");
        SeedWage(zhangSanPw, "2026-07", 5000); // 正常候选
        var zhaoliuPw = SeedProjectWorker("赵六");
        SeedWage(zhaoliuPw, "2026-07", 5000, paid: true);  // 已发款
        var sunqiPw = SeedProjectWorker("孙七");
        SeedWage(sunqiPw, "2026-07", 5000, locked: true);  // 已归档

        var json = await PostMatchAsync(new
        {
            projectId = TestProjectId,
            receipts = new[] { new { amount = 5000.0, date = "2026-07-15", counterparty = "张三", receiptPath = "r3.jpg" } },
        });

        var candidates = json.GetProperty("data").GetProperty("matches")[0].GetProperty("candidates");
        var ids = candidates.EnumerateArray().Select(c => c.GetProperty("wageId").GetInt64()).ToArray();
        Assert.Single(ids); // 只有张三
        // 已发款/已归档行永不进候选（按姓名核对，避免依赖 wageId 顺序）
        Assert.DoesNotContain("赵六", candidates.EnumerateArray().Select(c => c.GetProperty("workerName").GetString()));
        Assert.DoesNotContain("孙七", candidates.EnumerateArray().Select(c => c.GetProperty("workerName").GetString()));
        Assert.Contains("张三", candidates.EnumerateArray().Select(c => c.GetProperty("workerName").GetString()));
    }

    [Fact]
    public async Task Match_AmountMismatch_Excluded()
    {
        SetAuth(await LoginAsync("admin", AdminPassword));

        var pw = SeedProjectWorker("钱八");
        SeedWage(pw, "2026-07", 4800); // 与回单 5000 元差 200 元 → 超容差不进候选

        var json = await PostMatchAsync(new
        {
            projectId = TestProjectId,
            receipts = new[] { new { amount = 5000.0, date = "2026-07-15", counterparty = "钱八", receiptPath = "r4.jpg" } },
        });

        var candidates = json.GetProperty("data").GetProperty("matches")[0].GetProperty("candidates");
        Assert.Equal(0, candidates.GetArrayLength());
    }

    [Fact]
    public async Task Match_EmptyReceipts_ReturnsEmptyMatches()
    {
        SetAuth(await LoginAsync("admin", AdminPassword));

        var json = await PostMatchAsync(new { projectId = TestProjectId, receipts = Array.Empty<object>() });

        var matches = json.GetProperty("data").GetProperty("matches");
        Assert.Equal(0, matches.GetArrayLength());
    }

    [Fact]
    public async Task Match_MissingProjectId_Returns400()
    {
        SetAuth(await LoginAsync("admin", AdminPassword));

        var resp = await Client.PostAsJsonAsync("/api/wages/match-receipts", new { receipts = Array.Empty<object>() });
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        Assert.Contains("projectId", await resp.Content.ReadAsStringAsync());
    }

    // ── 确认：写付款列 ──

    private async Task<JsonElement> PostConfirmAsync(object body, bool expectOk = true)
    {
        var resp = await Client.PostAsJsonAsync("/api/wages/confirm-matches", body);
        if (expectOk) Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        return await resp.Content.ReadFromJsonAsync<JsonElement>();
    }

    [Fact]
    public async Task Confirm_NormalWrite_PersistsPaymentColumns()
    {
        SetAuth(await LoginAsync("admin", AdminPassword));

        var pw = SeedProjectWorker("张三");
        var wageId = SeedWage(pw, "2026-07", 5000);

        var json = await PostConfirmAsync(new[]
        {
            new { wageId, paidAmount = 5000.0, paidDate = "2026-07-15", bankReceiptPath = @"C:\receipts\r1.jpg" },
        });
        Assert.Equal(1, json.GetProperty("data").GetProperty("saved").GetInt32());
        Assert.Equal(0, json.GetProperty("data").GetProperty("skipped").GetInt32());
        Assert.Equal(0, json.GetProperty("data").GetProperty("skippedItems").GetArrayLength());

        using (var conn = new SqliteConnection(ConnectionString))
        {
            var row = conn.QueryFirst("SELECT paid_amount, paid_date, bank_receipt_path FROM wages WHERE id=@Id", new { Id = wageId });
            Assert.Equal(500000L, (long)row.paid_amount); // 分
            Assert.Equal("2026-07-15", (string)row.paid_date);
            Assert.Equal(@"C:\receipts\r1.jpg", (string)row.bank_receipt_path);
        }
    }

    [Fact]
    public async Task Confirm_LockedRow_Skipped()
    {
        SetAuth(await LoginAsync("admin", AdminPassword));

        var pw = SeedProjectWorker("孙七");
        var wageId = SeedWage(pw, "2026-07", 5000, locked: true);

        var json = await PostConfirmAsync(new[]
        {
            new { wageId, paidAmount = 5000.0, paidDate = "2026-07-15", bankReceiptPath = @"C:\receipts\r2.jpg" },
        });
        Assert.Equal(0, json.GetProperty("data").GetProperty("saved").GetInt32());
        Assert.Equal(1, json.GetProperty("data").GetProperty("skipped").GetInt32());
        var skippedItems = json.GetProperty("data").GetProperty("skippedItems");
        Assert.Equal(wageId, skippedItems[0].GetProperty("id").GetInt64());

        using (var conn = new SqliteConnection(ConnectionString))
        {
            var paid = conn.ExecuteScalar<long?>("SELECT paid_amount FROM wages WHERE id=@Id", new { Id = wageId });
            Assert.Null(paid); // 锁定行不写
        }
    }

    [Fact]
    public async Task Confirm_OthersRow_Skipped_OwnRowSaved()
    {
        // 非 admin（会计）确认他人创建的行 → skipped；确认自己创建的行 → saved
        const string accId = "acc-receipt";
        using (var conn = new SqliteConnection(ConnectionString))
        {
            conn.Open();
            var salt = "acc-receipt-salt-123456";
            var hash = EngineeringManager.Api.Common.HashPassword("acc123", salt, 2);
            conn.Execute(@"INSERT OR IGNORE INTO users (id, username, password, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
                VALUES (@Id, @Username, @Password, @Hash, @Salt, @Version, @DisplayName, @RoleId, @Status, @Now)",
                new
                {
                    Id = accId, Username = "accountant", Password = "acc123", Hash = hash, Salt = salt,
                    Version = 2, DisplayName = "财务", RoleId = "accountant", Status = "active", Now
                });
            conn.Execute("UPDATE roles SET permissions=@P WHERE id='accountant'",
                new { P = "[\"wages:create\",\"wages:read\",\"wages:update\"]" });
        }
        SetAuth(await LoginAsync("accountant", "acc123"));

        var othersPw = SeedProjectWorker("李四", createdBy: "1"); // admin 建的行
        var othersWage = SeedWage(othersPw, "2026-07", 5000, createdBy: "1");
        var ownPw = SeedProjectWorker("王五", createdBy: accId); // 会计自己建的行
        var ownWage = SeedWage(ownPw, "2026-07", 5000, createdBy: accId);

        var json = await PostConfirmAsync(new[]
        {
            new { wageId = othersWage, paidAmount = 5000.0, paidDate = "2026-07-15", bankReceiptPath = @"C:\receipts\o.jpg" },
            new { wageId = ownWage, paidAmount = 5000.0, paidDate = "2026-07-15", bankReceiptPath = @"C:\receipts\m.jpg" },
        });
        Assert.Equal(1, json.GetProperty("data").GetProperty("saved").GetInt32());
        Assert.Equal(1, json.GetProperty("data").GetProperty("skipped").GetInt32());
        Assert.Equal(othersWage, json.GetProperty("data").GetProperty("skippedItems")[0].GetProperty("id").GetInt64());

        using (var conn = new SqliteConnection(ConnectionString))
        {
            Assert.Null(conn.ExecuteScalar<long?>("SELECT paid_amount FROM wages WHERE id=@Id", new { Id = othersWage }));
            Assert.Equal(500000L, conn.ExecuteScalar<long>("SELECT paid_amount FROM wages WHERE id=@Id", new { Id = ownWage }));
        }
    }

    [Theory]
    [InlineData("wageId", "{\"paidAmount\":5000,\"paidDate\":\"2026-07-15\",\"bankReceiptPath\":\"r.jpg\"}")]
    [InlineData("paidAmount", "{\"wageId\":1,\"paidDate\":\"2026-07-15\",\"bankReceiptPath\":\"r.jpg\"}")]
    [InlineData("paidDate", "{\"wageId\":1,\"paidAmount\":5000,\"bankReceiptPath\":\"r.jpg\"}")]
    [InlineData("bankReceiptPath", "{\"wageId\":1,\"paidAmount\":5000,\"paidDate\":\"2026-07-15\"}")]
    public async Task Confirm_MissingFields_Returns400(string fieldName, string body)
    {
        SetAuth(await LoginAsync("admin", AdminPassword));

        var resp = await Client.PostAsync("/api/wages/confirm-matches",
            new StringContent($"[{body}]", System.Text.Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        var respBody = await resp.Content.ReadAsStringAsync();
        Assert.Contains("confirm-matches", respBody);
        Assert.Contains(fieldName, respBody);
    }

    [Fact]
    public async Task Confirm_WorkerRole_Returns403()
    {
        // worker 无 wages:update（沿用 B1 的角色权限形态）
        using (var conn = new SqliteConnection(ConnectionString))
        {
            conn.Open();
            var salt = "receipt-worker-salt-1234";
            var hash = EngineeringManager.Api.Common.HashPassword("worker123", salt, 2);
            conn.Execute(@"INSERT OR IGNORE INTO users (id, username, password, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
                VALUES (@Id, @Username, @Password, @Hash, @Salt, @Version, @DisplayName, @RoleId, @Status, @Now)",
                new
                {
                    Id = "2", Username = "worker", Password = "worker123", Hash = hash, Salt = salt,
                    Version = 2, DisplayName = "工人", RoleId = "worker", Status = "active", Now
                });
            conn.Execute("UPDATE roles SET permissions=@P WHERE id='worker'",
                new { P = "[\"dashboard:read\",\"projects:read\",\"wages:read\",\"projects:export\",\"contracts:export\"]" });
        }
        SetAuth(await LoginAsync("worker", "worker123"));

        var resp = await Client.PostAsJsonAsync("/api/wages/confirm-matches",
            new[] { new { wageId = 1, paidAmount = 5000.0, paidDate = "2026-07-15", bankReceiptPath = "r.jpg" } });

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    // ── M-FIX9 W1：锁定现状（回滚 T4(e) 生产 SQL 后的行为）──
    // 反例：accountant（有 wages:update、非 admin）确认「他人（admin）创建的」工资行。
    // 现状 WHERE = (created_by=@Uid OR @IsAdmin=1)：非 admin 只能确认自己创建的行，
    // 他人创建的行无论项目是否授权一律 skipped（无 EXISTS 授权分支）。
    // 本测试锁定的是现状而非目标态：R9 方案丙（见 docs/findings/CONFIRM-MATCHES-AUTHZ.md）
    // 将改为「未授权项目一律拒绝 + 跨人修改落审计 + 仅企业版」，届时本测试必须同步改断言。
    [Fact]
    public async Task Confirm_OthersRow_AlwaysSkipped_NonAdmin()
    {
        // accountant 用户（有 wages:update，非 admin）
        const string accUid = "acc-unauth-project";
        using (var conn = new SqliteConnection(ConnectionString))
        {
            conn.Open();
            var salt = "acc-unauth-salt-12345";
            var hash = EngineeringManager.Api.Common.HashPassword("acc123", salt, 2);
            conn.Execute(@"INSERT OR IGNORE INTO users (id, username, password, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
                VALUES (@Id, @Username, @Password, @Hash, @Salt, @Version, @DisplayName, @RoleId, @Status, @Now)",
                new
                {
                    Id = accUid, Username = "acc-unauth", Password = "acc123", Hash = hash, Salt = salt,
                    Version = 2, DisplayName = "财务", RoleId = "accountant", Status = "active", Now
                });
            // accountant 默认集不含 wages:update → 显式给全
            conn.Execute("UPDATE roles SET permissions=@P WHERE id='accountant'",
                new { P = "[\"wages:create\",\"wages:read\",\"wages:update\"]" });
        }
        SetAuth(await LoginAsync("acc-unauth", "acc123"));

        // 未授权项目 9302（无 project_authorizations 给 acc-unauth）；已授权项目 9303
        using (var conn = new SqliteConnection(ConnectionString))
        {
            conn.Open();
            conn.Execute("INSERT OR IGNORE INTO projects (id, name, created_by, created_at) VALUES (9302, 'P-unauth', '1', @Now)", new { Now });
            conn.Execute("INSERT OR IGNORE INTO projects (id, name, created_by, created_at) VALUES (9303, 'P-authz', '1', @Now)", new { Now });
            conn.Execute("INSERT OR IGNORE INTO project_authorizations (project_id, user_id) VALUES (9303, @Uid)", new { Uid = accUid });
        }
        // 两个项目各造一条「admin 创建」的工资行（他人行）
        long unauthWageId, authzWageId;
        using (var conn = new SqliteConnection(ConnectionString))
        {
            conn.Open();
            foreach (var (proj, by) in new[] { (9302L, "1"), (9303L, "1") })
            {
                var workerId = conn.ExecuteScalar<long>(
                    "INSERT INTO workers (name, created_at) VALUES ('越权工人', @Now); SELECT last_insert_rowid();", new { Now });
                var pwId = conn.ExecuteScalar<long>(@"INSERT INTO project_workers (worker_id,project_id,team_id,daily_wage,worker_type,entry_date,status,created_by,created_at,last_modified_at)
                    VALUES (@W,@P,NULL,300,'瓦工','2026-01-01','active',@By,@Now,@Now); SELECT last_insert_rowid();",
                    new { W = workerId, P = proj, By = by, Now });
                conn.Execute(@"INSERT INTO wages (project_id,project_worker_id,year_month,actual_wage,paid_amount,payment_locked,created_by,created_at,updated_at)
                    VALUES (@P,@PW,'2026-07',500000,NULL,0,@By,@Now,@Now)",
                    new { P = proj, PW = pwId, By = by, Now });
            }
            unauthWageId = conn.ExecuteScalar<long>("SELECT id FROM wages WHERE project_id=9302");
            authzWageId = conn.ExecuteScalar<long>("SELECT id FROM wages WHERE project_id=9303");
        }

        // 现状：他人创建的行（无论项目是否授权）→ 非 admin 一律 skipped（saved=0 / skipped=2）
        var json = await PostConfirmAsync(new[]
        {
            new { wageId = unauthWageId, paidAmount = 5000.0, paidDate = "2026-07-15", bankReceiptPath = @"C:\receipts\unauth.jpg" },
            new { wageId = authzWageId, paidAmount = 5000.0, paidDate = "2026-07-15", bankReceiptPath = @"C:\receipts\authz.jpg" },
        }, expectOk: true);
        Assert.Equal(0, json.GetProperty("data").GetProperty("saved").GetInt32());
        Assert.Equal(2, json.GetProperty("data").GetProperty("skipped").GetInt32());

        // 正向断言：两行付款列确实未被写（断言 NULL，非否定式）
        using (var conn = new SqliteConnection(ConnectionString))
        {
            conn.Open();
            var paid1 = conn.ExecuteScalar<long?>("SELECT paid_amount FROM wages WHERE id=@Id", new { Id = unauthWageId });
            Assert.Null(paid1);
            var paid2 = conn.ExecuteScalar<long?>("SELECT paid_amount FROM wages WHERE id=@Id", new { Id = authzWageId });
            Assert.Null(paid2);
        }
    }

    // ── M-FIX9 W1：锁定现状（创建者对自己的行可确认，跨项目不限）──
    // 现状 WHERE = (created_by=@Uid OR @IsAdmin=1)：创建者可确认自己创建的任何行（跨项目不限）。
    // ⚠️ 本条锁定的是现状而非目标态。R9 方案丙（docs/findings/CONFIRM-MATCHES-AUTHZ.md）将改为：
    // 未授权项目一律拒绝 + 跨人修改落审计 + 仅企业版。届时本条必须同步改断言。
    [Fact]
    public async Task Confirm_OwnRow_UnauthorizedProject_StillSaved()
    {
        const string accUid = "acc-own-unauth";
        using (var conn = new SqliteConnection(ConnectionString))
        {
            conn.Open();
            var salt = "acc-own-unauth-salt-12";
            var hash = EngineeringManager.Api.Common.HashPassword("acc123", salt, 2);
            conn.Execute(@"INSERT OR IGNORE INTO users (id, username, password, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
                VALUES (@Id, @Username, @Password, @Hash, @Salt, @Version, @DisplayName, @RoleId, @Status, @Now)",
                new
                {
                    Id = accUid, Username = "acc-own-unauth", Password = "acc123", Hash = hash, Salt = salt,
                    Version = 2, DisplayName = "财务", RoleId = "accountant", Status = "active", Now
                });
            conn.Execute("UPDATE roles SET permissions=@P WHERE id='accountant'",
                new { P = "[\"wages:create\",\"wages:read\",\"wages:update\"]" });
        }
        SetAuth(await LoginAsync("acc-own-unauth", "acc123"));

        long ownWageId;
        using (var conn = new SqliteConnection(ConnectionString))
        {
            conn.Open();
            conn.Execute("INSERT OR IGNORE INTO projects (id, name, created_by, created_at) VALUES (9304, 'P-own', '1', @Now)", new { Now });
            var workerId = conn.ExecuteScalar<long>(
                "INSERT INTO workers (name, created_at) VALUES ('本人工人', @Now); SELECT last_insert_rowid();", new { Now });
            var pwId = conn.ExecuteScalar<long>(@"INSERT INTO project_workers (worker_id,project_id,team_id,daily_wage,worker_type,entry_date,status,created_by,created_at,last_modified_at)
                VALUES (@W,@P,NULL,300,'瓦工','2026-01-01','active',@By,@Now,@Now); SELECT last_insert_rowid();",
                new { W = workerId, P = 9304, By = accUid, Now });
            conn.Execute(@"INSERT INTO wages (project_id,project_worker_id,year_month,actual_wage,paid_amount,payment_locked,created_by,created_at,updated_at)
                VALUES (@P,@PW,'2026-07',500000,NULL,0,@By,@Now,@Now)",
                new { P = 9304, PW = pwId, By = accUid, Now });
            ownWageId = conn.ExecuteScalar<long>("SELECT id FROM wages WHERE project_id=9304");
        }

        var json = await PostConfirmAsync(new[]
        {
            new { wageId = ownWageId, paidAmount = 5000.0, paidDate = "2026-07-15", bankReceiptPath = @"C:\receipts\own.jpg" },
        }, expectOk: true);
        // 自己创建的行（未授权项目）→ 数据归属权在自己，仍可确认
        Assert.Equal(1, json.GetProperty("data").GetProperty("saved").GetInt32());
        using (var conn = new SqliteConnection(ConnectionString))
        {
            conn.Open();
            Assert.Equal(500000L, conn.ExecuteScalar<long>("SELECT paid_amount FROM wages WHERE id=@Id", new { Id = ownWageId }));
        }
    }
}
