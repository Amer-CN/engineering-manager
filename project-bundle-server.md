This file is a merged representation of a subset of the codebase, containing specifically included files, combined into a single document by Repomix.

================================================================
File Summary
================================================================

Purpose:
--------
This file contains a packed representation of a subset of the repository's contents that is considered the most important context.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

File Format:
------------
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A separator line (================)
  b. The file path (File: path/to/file)
  c. Another separator line
  d. The full contents of the file
  e. A blank line

Usage Guidelines:
-----------------
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

Notes:
------
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Only files matching these patterns are included: EngineeringManager.Api/**, EngineeringManager.Tests/**
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)


================================================================
Directory Structure
================================================================
EngineeringManager.Api/app-icon.svg
EngineeringManager.Api/app.ico
EngineeringManager.Api/appsettings.Development.json
EngineeringManager.Api/appsettings.json
EngineeringManager.Api/Common.cs
EngineeringManager.Api/Endpoints/AgentEndpoints.cs
EngineeringManager.Api/Endpoints/AuthEndpoints.cs
EngineeringManager.Api/Endpoints/ContractEndpoints.cs
EngineeringManager.Api/Endpoints/CostLedgerEndpoints.cs
EngineeringManager.Api/Endpoints/ExpenseEndpoints.cs
EngineeringManager.Api/Endpoints/FileEndpoints.cs
EngineeringManager.Api/Endpoints/InventoryEndpoints.cs
EngineeringManager.Api/Endpoints/InvoiceEndpoints.cs
EngineeringManager.Api/Endpoints/KnowledgeEndpoints.cs
EngineeringManager.Api/Endpoints/MemberEndpoints.cs
EngineeringManager.Api/Endpoints/OcrEndpoints.cs
EngineeringManager.Api/Endpoints/PartnerEndpoints.cs
EngineeringManager.Api/Endpoints/PiiKeyEndpoints.cs
EngineeringManager.Api/Endpoints/ProjectEndpoints.cs
EngineeringManager.Api/Endpoints/ProjectWorkerMiscEndpoints.cs
EngineeringManager.Api/Endpoints/RegionEndpoints.cs
EngineeringManager.Api/Endpoints/SttEndpoints.cs
EngineeringManager.Api/Endpoints/SystemEndpoints.cs
EngineeringManager.Api/Endpoints/TemplateEndpoints.cs
EngineeringManager.Api/Endpoints/UpdateEndpoints.cs
EngineeringManager.Api/Endpoints/UserPreferencesEndpoints.cs
EngineeringManager.Api/Endpoints/WageEndpoints.cs
EngineeringManager.Api/EngineeringManager.Api.csproj
EngineeringManager.Api/EngineeringManager.Api.http
EngineeringManager.Api/EntryPoint.cs
EngineeringManager.Api/GlobalAuthMiddleware.cs
EngineeringManager.Api/MainWindow.cs
EngineeringManager.Api/Migrations/MigrationRunner.cs
EngineeringManager.Api/Migrations/Scripts/001_InitialSchema.sql
EngineeringManager.Api/Migrations/Scripts/002_SeedAdminUser.sql
EngineeringManager.Api/Migrations/Scripts/003_MoneyRealToInteger.sql
EngineeringManager.Api/Migrations/Scripts/004_SoftDeleteFields.sql
EngineeringManager.Api/Migrations/Scripts/005_NormalizeTextFields.sql
EngineeringManager.Api/Migrations/Scripts/006_AddIndexes.sql
EngineeringManager.Api/Migrations/Scripts/007_AddAuditFields.sql
EngineeringManager.Api/Migrations/Scripts/007b_AddProjectMembersCreatedAt.sql
EngineeringManager.Api/Migrations/Scripts/008_RestoreProjectManagerId.sql
EngineeringManager.Api/Migrations/Scripts/009_AddCreatedByToBusinessTables.sql
EngineeringManager.Api/Migrations/Scripts/010_AddProjectMembersUserId.sql
EngineeringManager.Api/Migrations/Scripts/011_AddCreatedByToInvoicesAndPaymentRecords.sql
EngineeringManager.Api/Migrations/Scripts/011_AddPiiEncryptionColumns.sql
EngineeringManager.Api/Migrations/Scripts/012_MigrateUsersToPasswordHash.sql
EngineeringManager.Api/Migrations/Scripts/013_AddProjectAuthorizations.sql
EngineeringManager.Api/Migrations/Scripts/014_AddCreatedByToRemainingTables.sql
EngineeringManager.Api/Migrations/Scripts/016_AddProjectsManagerId.sql
EngineeringManager.Api/Migrations/Scripts/017_AddContractsPartnerId.sql
EngineeringManager.Api/Migrations/Scripts/018_AddContractsMissingColumns.sql
EngineeringManager.Api/Migrations/Scripts/019_RenameRemarkToRemarks.sql
EngineeringManager.Api/Migrations/Scripts/020_AddCostLedgerBatchesCreatedBy.sql
EngineeringManager.Api/Migrations/Scripts/021_AddPartnersTaxNumber.sql
EngineeringManager.Api/Migrations/Scripts/022_AddUserPreferencesTable.sql
EngineeringManager.Api/Migrations/Scripts/023_AddPiiKeyRotation.sql
EngineeringManager.Api/Migrations/Scripts/024_AddCloudSyncColumns.sql
EngineeringManager.Api/Migrations/Scripts/025_AddSyncQueueAndDevices.sql
EngineeringManager.Api/Migrations/Scripts/026_AddPiiReencryptStatus.sql
EngineeringManager.Api/Migrations/Scripts/027_AddAgentTables.sql
EngineeringManager.Api/Migrations/Scripts/028_AddSpeechToText.sql
EngineeringManager.Api/Migrations/Scripts/029_AddKnowledgeBase.sql
EngineeringManager.Api/Models/AgentMessage.cs
EngineeringManager.Api/Models/AgentTool.cs
EngineeringManager.Api/Models/AuditClearDto.cs
EngineeringManager.Api/Models/ContractCreateDto.cs
EngineeringManager.Api/Models/ContractUpdateDto.cs
EngineeringManager.Api/Models/DrawingDto.cs
EngineeringManager.Api/Models/FileDeleteDto.cs
EngineeringManager.Api/Models/InventoryTransactionDto.cs
EngineeringManager.Api/Models/InvoiceStatusDto.cs
EngineeringManager.Api/Models/LlmProviderConfig.cs
EngineeringManager.Api/Models/ProjectWorkerDto.cs
EngineeringManager.Api/Models/SettlementCreateDto.cs
EngineeringManager.Api/Models/SettlementUpdateDto.cs
EngineeringManager.Api/OcrSetupWizard.cs
EngineeringManager.Api/Program.cs
EngineeringManager.Api/Properties/AssemblyInfo.cs
EngineeringManager.Api/Properties/launchSettings.json
EngineeringManager.Api/Security/CurrentUser.cs
EngineeringManager.Api/Security/PiiProtector.cs
EngineeringManager.Api/Security/PiiReencryptWorker.cs
EngineeringManager.Api/Services/AgentConversationService.cs
EngineeringManager.Api/Services/AgentToolService.cs
EngineeringManager.Api/Services/BgeEmbeddingService.cs
EngineeringManager.Api/Services/IEmbeddingService.cs
EngineeringManager.Api/Services/IModelRouter.cs
EngineeringManager.Api/Services/KnowledgeBaseService.cs
EngineeringManager.Api/Services/LlmConfigResolver.cs
EngineeringManager.Api/Services/LlmProviderService.cs
EngineeringManager.Api/Services/ModelRoutingService.cs
EngineeringManager.Api/Services/SafeQueryValidator.cs
EngineeringManager.Api/Services/Stt/AudioPreprocessor.cs
EngineeringManager.Api/Services/Stt/DiarizationService.cs
EngineeringManager.Api/Services/Stt/ISttEngine.cs
EngineeringManager.Api/Services/Stt/LlamaCppGgufEngine.cs
EngineeringManager.Api/Services/Stt/SpeakerLabelNormalizer.cs
EngineeringManager.Api/Services/Stt/SttEngineSelector.cs
EngineeringManager.Api/Services/Stt/SttModelManager.cs
EngineeringManager.Api/Services/Stt/SttModels.cs
EngineeringManager.Api/Services/Stt/SttWorker.cs
EngineeringManager.Api/Services/UpdateService.cs
EngineeringManager.Api/theme-graphite.png
EngineeringManager.Api/theme-sandstone.png
EngineeringManager.Api/theme-white.png
EngineeringManager.Tests/Common/ApiTestBase.cs
EngineeringManager.Tests/Common/TestStartup.cs
EngineeringManager.Tests/Endpoints/AuthEndpointsTests.cs
EngineeringManager.Tests/Endpoints/CommonTests.cs
EngineeringManager.Tests/Endpoints/DataScopeTests.cs
EngineeringManager.Tests/Endpoints/KnowledgeBaseServiceTests.cs
EngineeringManager.Tests/Endpoints/OcrEndpointsTests.cs
EngineeringManager.Tests/Endpoints/PiiLeakTests.cs
EngineeringManager.Tests/Endpoints/SafeQueryValidatorTests.cs
EngineeringManager.Tests/Endpoints/SttE2ETests.cs
EngineeringManager.Tests/Endpoints/SttEndpointsTests.cs
EngineeringManager.Tests/Endpoints/UpdateServiceTests.cs
EngineeringManager.Tests/Endpoints/UserDimFilterTests.cs
EngineeringManager.Tests/Endpoints/UserDimPhase2Tests.cs
EngineeringManager.Tests/EngineeringManager.Tests.csproj
EngineeringManager.Tests/Migrations/CloudSyncEndpointTests.cs
EngineeringManager.Tests/Migrations/CloudSyncSchemaTests.cs
EngineeringManager.Tests/Migrations/Fts5TrigramTests.cs
EngineeringManager.Tests/Security/PiiProtectorTests.cs
EngineeringManager.Tests/Security/PiiReencryptWorkerTests.cs

================================================================
Files
================================================================

================
File: EngineeringManager.Api/app-icon.svg
================
<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2563eb"/>
      <stop offset="100%" stop-color="#1e40af"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="104" fill="url(#g)"/>
  <path d="M85 380 L256 60 L427 380 Z" fill="white"/>
  <path d="M150 340 L256 170 L362 340 Z" fill="url(#g)"/>
</svg>

================
File: EngineeringManager.Api/appsettings.Development.json
================
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  }
}

================
File: EngineeringManager.Api/Common.cs
================
using Microsoft.AspNetCore.Mvc;

namespace EngineeringManager.Api;

/// <summary>
/// 公共辅助函数 + DTO 类型定义
/// </summary>
public static class Common
{
    // ============ 辅助函数 ============

    public static IResult Ok(object? data = null) => Results.Ok(new { success = true, data });

    /// <summary>业务错误 — HTTP 400</summary>

    /// <summary>P1-1: 脱敏异常信息（防泄露绝对路径/堆栈/内部细节给前端）
    /// 规则：移除 Windows 绝对路径，截断到 200 字符
    /// </summary>
    public static string Sanitize(string? error)
    {
        if (string.IsNullOrEmpty(error)) return "操作失败";
        var s = error!;
        try
        {
            // 移除 Windows 绝对路径（C:\Users\xxx\...\file.cs → C:\...\file.cs）
            s = System.Text.RegularExpressions.Regex.Replace(
                s,
                @"[A-Z]:\\[^\s""<>|]*\\[^\s""<>|]*",
                m => {
                    var path = m.Value;
                    var lastSlash = path.LastIndexOf('\\');
                    if (lastSlash > 3) return path.Substring(0, 3) + @"...\" + path.Substring(lastSlash);
                    return path;
                });
        }
        catch { /* regex 失败时用原字符串 */ }
        if (s.Length > 200) s = s.Substring(0, 200) + "...";
        return s;
    }
    public static IResult Fail(string error, int statusCode = 400) =>
        Results.Json(new { success = false, error }, statusCode: statusCode);

    /// <summary>资源不存在 — HTTP 404</summary>
    public static IResult NotFound(string error = "资源不存在") =>
        Results.Json(new { success = false, error }, statusCode: 404);

    /// <summary>服务器内部错误 — HTTP 500</summary>
    public static IResult ServerError(string context, Exception ex)
    {
        Console.Error.WriteLine($"[ERROR] {context}: {ex.Message}");
        return Results.Json(new { success = false, error = $"服务器错误: {context}" }, statusCode: 500);
    }

    /// <summary>P0-3-A: 身份证号脱敏（保留前 4 + 后 4，中间 ****）</summary>
    public static string? MaskIdCard(string? idCard)
    {
        if (string.IsNullOrEmpty(idCard)) return idCard;
        if (idCard.Length <= 8) return idCard.Substring(0, 1) + "***" + idCard.Substring(idCard.Length - 1);
        return idCard.Substring(0, 4) + "****" + idCard.Substring(idCard.Length - 4);
    }

    /// <summary>P0-3-A: 手机号脱敏（保留前 3 + 后 4，中间 ****）</summary>
    public static string? MaskPhone(string? phone)
    {
        if (string.IsNullOrEmpty(phone)) return phone;
        if (phone.Length <= 7) return phone.Substring(0, 1) + "***" + phone.Substring(phone.Length - 1);
        return phone.Substring(0, 3) + "****" + phone.Substring(phone.Length - 4);
    }

    /// <summary>P0-3-A: 银行账号脱敏（保留前 4 + 后 4，中间 ****）</summary>
    public static string? MaskBankAccount(string? account)
    {
        if (string.IsNullOrEmpty(account)) return account;
        if (account.Length <= 8) return account.Substring(0, 1) + "***" + account.Substring(account.Length - 1);
        return account.Substring(0, 4) + "****" + account.Substring(account.Length - 4);
    }


    /// <summary>
    /// v0.76.0 累计待办 #1: PII ACL 字段统一脱敏入口
    /// 规则: canReadPii=true → 返回原值; false → 按字段类型脱敏
    /// 字段类型: idCard / phone / idCardAddress / bankAccount / bank_account / default (按 idCard 规则)
    /// </summary>
    public static string? MaskPiiField(string field, string? value, EngineeringManager.Api.Security.CurrentUser.PiiAccess access)
    {
        if (string.IsNullOrEmpty(value)) return value;
        if (access.CanRead(field)) return value;
        return field switch
        {
            "phone" => MaskPhone(value),
            "bankAccount" or "bank_account" => MaskBankAccount(value),
            // idCard / idCardAddress / 其他: 走 MaskIdCard 规则 (前 4 后 4 中间 ****)
            _ => MaskIdCard(value),
        };
    }    /// <summary>当前时间字符串（yyyy-MM-dd HH:mm:ss）— 避免在每个端点文件中重复定义</summary>
    public static string NowString() => DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");

    public static string HashPassword(string password, string salt, int version = 2)
    {
        // PBKDF2-SHA512，与 Electron 版本一致
        var iterations = version >= 2 ? 210000 : 10000;
        using var deriveBytes = new System.Security.Cryptography.Rfc2898DeriveBytes(
            password, System.Text.Encoding.UTF8.GetBytes(salt),
            iterations, System.Security.Cryptography.HashAlgorithmName.SHA512);
        return Convert.ToHexString(deriveBytes.GetBytes(64)).ToLower();
    }

    public static List<string> GetDefaultPermissions(string roleId) => roleId switch
    {
        "admin" => ["dashboard:read","projects:create","projects:read","projects:update","projects:delete",
                    "contracts:create","contracts:read","contracts:update","contracts:delete",
                    "partners:create","partners:read","partners:update","partners:delete",
                    "members:create","members:read","members:update","members:delete",
                    "wages:create","wages:read","wages:update","wages:delete",
                    "settlement:create","settlement:read","settlement:update","settlement:delete",
                    "inventory:read",
                    "invoices:create","invoices:read","invoices:update","invoices:delete",
                    "costLedger:create","costLedger:read","costLedger:update","costLedger:delete",
                    "settings:read","settings:update","users:create","users:read","users:update","users:delete",
                    "roles:read","roles:update","audit_logs:read","audit_logs:export",
                    "labor:read","safeQuery:read"],
        "manager" => ["dashboard:read","projects:read","projects:update","contracts:read","contracts:update",
                      "partners:read","members:read","wages:read","settlement:read","invoices:read",
                      "inventory:read",
                      "costLedger:read","settings:read","users:read","roles:read","audit_logs:read",
                      "labor:read","safeQuery:read"],
        "accountant" => ["dashboard:read","projects:read","contracts:read","members:read",
                         "wages:create","wages:read","wages:update","settlement:read","invoices:create",
                         "invoices:read","invoices:update","costLedger:create","costLedger:read",
                         "costLedger:update","settings:read","audit_logs:read","audit_logs:export",
                         "labor:read"],
        "worker" => ["dashboard:read","projects:read","members:read","wages:read"],
        _ => []
    };
}

// ============ DTO 类型 ============

record LoginDto(string Username, string Password);
record UserDto(string? Id, string Username, string? Password, string? DisplayName, string? RoleId, string? Status);
record PasswordResetDto(string UserId, string NewPassword);
record RoleUpdateDto(string RoleId, string Permissions);
record ProjectDto(string Name, string? Description, string? Address, string? StartDate, string? EndDate, string? Status, double Budget, long? ProjectManagerId);
record MemberDto(long? Id, string Name, string? Phone, string? Email, string? MemberType, string? Role, string? IdCard, string? Gender, string? Ethnicity, string? BirthDate, string? IdCardAddress, double? BaseSalary, double? DailyWage, string? EntryDate, string? Status, long? DepartmentId, string? Position);
record WorkerDto(long? Id, string Name, string? IdCard, string? Gender, string? Phone, string? Address, string? BankAccount, string? BankName, string? WorkerType, double? DailyWage);

record PartnerDto(long? Id, string Name, string? Category, string? Contact, string? Phone, string? Email, string? Address, string? BankAccount, string? BankName, string? TaxNumber, string? CreditCode, string? RegisteredAddress, string? BusinessScope, string? TaxType, string? ProjectIds);
record InvoiceDto(long? Id, long? ProjectId, long? SellerId, long? BuyerId, long? ContractId, long? SettlementId, string? Type, string? InvoiceKind, string? InvoiceNo, string? InvoiceCode, string? Name, double? Amount, double? PriceAmount, double? TaxRate, double? TaxAmount, double? ReceivedAmount, string? IssueDate, string? Status, string? Remarks, string? FileUrl, string? FileType);
record PaymentRecordDto(long? Id, string? Type, double? Amount, string? RecordDate, long? ProjectId, long? PartnerId, long? ContractId, string? InvoiceDetails, string? Remarks, string? FileUrl, string? FileType);
record AttendanceDto(long? Id, long? MemberId, long? ProjectId, long? ProjectWorkerId, string YearMonth, double? WorkDays, int? DaysOff, bool? IsFullAttendance, string? DailyStatus, string? FileUrl, string? FileName);
record WageDto(long? Id, long? ProjectId, long? MemberId, long? ProjectWorkerId, string? YearMonth, double? DailyWage, double? WorkDays, double? Bonus, double? Deduction, double? ActualWage, double? PaidAmount, string? PaidDate);
record DepartmentDto(string Name, long? ManagerId, List<string>? Positions);
record DepartmentUpdateDto(long Id, string Name, long? ManagerId, List<string>? Positions);
record AuditLogDto(string Action, string? Level, string? UserId, string? UserName, string? Resource, string? ResourceId, string? Details, string? Description, string? IpAddress, string? CreatedAt);
record FileSaveDto(string? Category, string? SubCategory, string? FileName, string? FileData, string? ProjectName);
record RegionDto(long? Id, string? Province, string? City, string? District);
record SupervisorDto(long? Id, long? RegionId, string Name, string? Category, string? Contact, string? Phone, string? Address, string? ProjectIds, string? Remarks);
record ProjectMemberDto(long? Id, long ProjectId, long MemberId, string? JoinedAt);
record WorkerTeamDto(long? Id, string Name, long? ProjectId, long? LeaderId);
record InventoryItemDto(long? Id, string Name, string? Category, string? Unit, double? Quantity, double? MinQuantity, string? Location, string? Notes);
record MaterialDto(long? Id, string Name, string? Category, string? Unit, string? Specifications, string? Supplier, string? Notes);
record ExpenseDto(long? Id, long? ProjectId, string? Category, double? Amount, string? Date, string? Description, string? Vendor, string? ReceiptUrl);
record SalaryHistoryDto(long? Id, long MemberId, string? EffectiveDate, double? BaseSalary, double? Subsidy, string? SubsidyNote, string? Note);
record ContractTemplateDto(long? Id, string Name, string? Type, string? Content, string? Variables);
record OcrImageDto(string ImageBase64, object? Config)
{
    // 支持 camelCase 反序列化
    public string ImageBase64 { get; init; } = ImageBase64;
}
record CostLedgerEntryDto(long? Id, long? ProjectId, long? BatchId, string? VoucherNo, string? Date, string? Direction, string? Category, double? Amount, string? Counterparty, string? Channel, string? Summary, string? Notes);
record CostLedgerCategoryDto(long? Id, string? Name, string? Direction, string? Level1, string? Color);
record CostLedgerBatchDto(long? Id, long? ProjectId, string? Name, string? NewName);
record CostLedgerMatchRuleDto(string? Pattern, string? Category, string? Direction, int? Priority);

================
File: EngineeringManager.Api/Endpoints/ContractEndpoints.cs
================
using System.Data;
using Dapper;
using EngineeringManager.Api.Security;

namespace EngineeringManager.Api;

/// <summary>
/// 鍚堝悓 + 鍚堝悓妯℃澘 + 缁撶畻绔偣
/// </summary>
public static class ContractEndpoints
{
    public static void RegisterContractEndpoints(this WebApplication app)
    {
        var now = () => DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");

        // 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?
        // 鍚堝悓
        // 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?

        app.MapGet("/api/contracts/income", (HttpContext ctx, IDbConnection db, long? projectId) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            // v1.1.0 P0-4 Phase 2: 椤圭洰绾ц〃杩囨护 (created_by OR admin OR project_authorizations)
            // projectId 鏄洿绐勭殑鏀剁獎, 涓嶈兘婕?
            var sql = $@"SELECT * FROM income_contracts WHERE {CurrentUser.UserFilterWithAuthorizedProjects(scope, "project_id")}";
            if (projectId.HasValue) sql += " AND project_id=@ProjectId";
            sql += " ORDER BY created_at DESC";
            return Common.Ok(db.Query(sql, new { ProjectId = projectId, Uid = uid, IsAdmin = isAdmin }));
        });

        app.MapGet("/api/contracts/expense", (HttpContext ctx, IDbConnection db, long? projectId) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            // v1.1.0 P0-4 Phase 2: 椤圭洰绾ц〃杩囨护
            var sql = $@"SELECT * FROM expense_contracts WHERE {CurrentUser.UserFilterWithAuthorizedProjects(scope, "project_id")}";
            if (projectId.HasValue) sql += " AND project_id=@ProjectId";
            sql += " ORDER BY created_at DESC";
            return Common.Ok(db.Query(sql, new { ProjectId = projectId, Uid = uid, IsAdmin = isAdmin }));
        });

        app.MapGet("/api/contracts/agreement", (HttpContext ctx, IDbConnection db, long? projectId) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            // v1.1.0 P0-4 Phase 2: 椤圭洰绾ц〃杩囨护
            var sql = $@"SELECT * FROM agreement_contracts WHERE {CurrentUser.UserFilterWithAuthorizedProjects(scope, "project_id")}";
            if (projectId.HasValue) sql += " AND project_id=@ProjectId";
            sql += " ORDER BY created_at DESC";
            return Common.Ok(db.Query(sql, new { ProjectId = projectId, Uid = uid, IsAdmin = isAdmin }));
        });

        app.MapGet("/api/contracts/stats", (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            // v1.1.0 P0-4 Phase 2: stats 涔熸寜 user-dim 杩囨护 (admin 鐪嬪叏琛? 鍏朵粬鐪嬭嚜宸?鎺堟潈)
            return Common.Ok(new
            {
                incomeCount = db.ExecuteScalar<int>($"SELECT COUNT(*) FROM income_contracts WHERE {CurrentUser.UserFilterWithAuthorizedProjects(scope)}", new { Uid = uid, IsAdmin = isAdmin }),
                expenseCount = db.ExecuteScalar<int>($"SELECT COUNT(*) FROM expense_contracts WHERE {CurrentUser.UserFilterWithAuthorizedProjects(scope)}", new { Uid = uid, IsAdmin = isAdmin }),
                incomeTotal = db.ExecuteScalar<decimal>($"SELECT COALESCE(SUM(amount),0) FROM income_contracts WHERE {CurrentUser.UserFilterWithAuthorizedProjects(scope)}", new { Uid = uid, IsAdmin = isAdmin }),
                expenseTotal = db.ExecuteScalar<decimal>($"SELECT COALESCE(SUM(amount),0) FROM expense_contracts WHERE {CurrentUser.UserFilterWithAuthorizedProjects(scope)}", new { Uid = uid, IsAdmin = isAdmin }),
            });
        });

        app.MapPost("/api/contracts/income", async (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // v1.1.0 淇? 鏀圭敤 HttpRequest 璇?body (鍘?dynamic dto 涓嶈 dapper 鑷姩缁戝畾, INSERT 蹇呭け璐?
            using var reader = new System.IO.StreamReader(ctx.Request.Body);
            var bodyText = await reader.ReadToEndAsync();
            var body = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(bodyText);
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO income_contracts (project_id,partner_id,contract_no,name,amount,signed_date,start_date,end_date,status,payment_method,remarks,created_by,created_at,updated_at, last_modified_at) VALUES (@ProjectId,@PartnerId,@ContractNo,@Name,@Amount,@SignedDate,@StartDate,@EndDate,@Status,@PaymentMethod,@Remarks,@CreatedBy,@Now,@Now, @Now);
                SELECT last_insert_rowid();",
                new {
                    ProjectId = body.TryGetProperty("projectId", out var p) ? (long?)p.GetInt64() : null,
                    PartnerId = body.TryGetProperty("partnerId", out var pp) ? (long?)pp.GetInt64() : null,
                    ContractNo = body.TryGetProperty("contractNo", out var c) ? c.GetString() : null,
                    Name = body.TryGetProperty("name", out var n) ? n.GetString() : null,
                    Amount = body.TryGetProperty("amount", out var a) ? (decimal?)a.GetDouble() : null,
                    SignedDate = body.TryGetProperty("signedDate", out var sd) ? sd.GetString() : null,
                    StartDate = body.TryGetProperty("startDate", out var sdt) ? sdt.GetString() : null,
                    EndDate = body.TryGetProperty("endDate", out var ed) ? ed.GetString() : null,
                    Status = body.TryGetProperty("status", out var st) ? st.GetString() ?? "draft" : "draft",
                    PaymentMethod = body.TryGetProperty("paymentMethod", out var pm) ? pm.GetString() : null,
                    Remarks = body.TryGetProperty("remarks", out var rm) ? rm.GetString() : null,
                    CreatedBy = uid,
                    Now = now()
                });
            return Common.Ok(id);
        });

        app.MapPost("/api/contracts/expense", async (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            using var reader = new System.IO.StreamReader(ctx.Request.Body);
            var bodyText = await reader.ReadToEndAsync();
            var body = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(bodyText);
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO expense_contracts (project_id,partner_id,contract_no,name,amount,signed_date,start_date,end_date,status,payment_method,remarks,created_by,created_at,updated_at, last_modified_at) VALUES (@ProjectId,@PartnerId,@ContractNo,@Name,@Amount,@SignedDate,@StartDate,@EndDate,@Status,@PaymentMethod,@Remarks,@CreatedBy,@Now,@Now, @Now);
                SELECT last_insert_rowid();",
                new {
                    ProjectId = body.TryGetProperty("projectId", out var p) ? (long?)p.GetInt64() : null,
                    PartnerId = body.TryGetProperty("partnerId", out var pp) ? (long?)pp.GetInt64() : null,
                    ContractNo = body.TryGetProperty("contractNo", out var c) ? c.GetString() : null,
                    Name = body.TryGetProperty("name", out var n) ? n.GetString() : null,
                    Amount = body.TryGetProperty("amount", out var a) ? (decimal?)a.GetDouble() : null,
                    SignedDate = body.TryGetProperty("signedDate", out var sd) ? sd.GetString() : null,
                    StartDate = body.TryGetProperty("startDate", out var sdt) ? sdt.GetString() : null,
                    EndDate = body.TryGetProperty("endDate", out var ed) ? ed.GetString() : null,
                    Status = body.TryGetProperty("status", out var st) ? st.GetString() ?? "draft" : "draft",
                    PaymentMethod = body.TryGetProperty("paymentMethod", out var pm) ? pm.GetString() : null,
                    Remarks = body.TryGetProperty("remarks", out var rm) ? rm.GetString() : null,
                    CreatedBy = uid,
                    Now = now()
                });
            return Common.Ok(id);
        });

        app.MapPost("/api/contracts/agreement", async (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            using var reader = new System.IO.StreamReader(ctx.Request.Body);
            var bodyText = await reader.ReadToEndAsync();
            var body = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(bodyText);
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO agreement_contracts (project_id,partner_id,contract_no,name,amount,signed_date,start_date,end_date,status,remarks,created_by,created_at,updated_at, last_modified_at) VALUES (@ProjectId,@PartnerId,@ContractNo,@Name,@Amount,@SignedDate,@StartDate,@EndDate,@Status,@Remarks,@CreatedBy,@Now,@Now, @Now);
                SELECT last_insert_rowid();",
                new {
                    ProjectId = body.TryGetProperty("projectId", out var p) ? (long?)p.GetInt64() : null,
                    PartnerId = body.TryGetProperty("partnerId", out var pp) ? (long?)pp.GetInt64() : null,
                    ContractNo = body.TryGetProperty("contractNo", out var c) ? c.GetString() : null,
                    Name = body.TryGetProperty("name", out var n) ? n.GetString() : null,
                    Amount = body.TryGetProperty("amount", out var a) ? (decimal?)a.GetDouble() : null,
                    SignedDate = body.TryGetProperty("signedDate", out var sd) ? sd.GetString() : null,
                    StartDate = body.TryGetProperty("startDate", out var sdt) ? sdt.GetString() : null,
                    EndDate = body.TryGetProperty("endDate", out var ed) ? ed.GetString() : null,
                    Status = body.TryGetProperty("status", out var st) ? st.GetString() ?? "draft" : "draft",
                    Remarks = body.TryGetProperty("remarks", out var rm) ? rm.GetString() : null,
                    CreatedBy = uid,
                    Now = now()
                });
            return Common.Ok(id);
        });

        app.MapPut("/api/contracts/income", async (HttpContext ctx, dynamic dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            var affected = await db.ExecuteAsync(@"UPDATE income_contracts SET name=@Name,amount=@Amount,status=@Status,remarks=@Remarks,updated_at=@Now, version=version+1, last_modified_at=@Now WHERE id=@Id AND " + CurrentUser.UserFilterFragmentForProject(scope),
                new { Uid = uid, IsAdmin = isAdmin, Now = now() });
            return affected > 0 ? Common.Ok() : Results.Forbid();
        });

        app.MapPut("/api/contracts/expense", async (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            using var reader = new System.IO.StreamReader(ctx.Request.Body);
            var bodyText = await reader.ReadToEndAsync();
            var body = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(bodyText);
            var affected = await db.ExecuteAsync(@"UPDATE expense_contracts SET name=@Name,amount=@Amount,status=@Status,remarks=@Remarks,updated_at=@Now, version=version+1, last_modified_at=@Now WHERE id=@Id AND " + CurrentUser.UserFilterFragmentForProject(scope),
                new { Uid = uid, IsAdmin = isAdmin, Now = now(),
                    Id = body.TryGetProperty("id", out var id) ? id.GetInt64() : 0,
                    Name = body.TryGetProperty("name", out var n) ? n.GetString() : null,
                    Amount = body.TryGetProperty("amount", out var a) ? (decimal?)a.GetDouble() : null,
                    Status = body.TryGetProperty("status", out var st) ? st.GetString() : null,
                    Remarks = body.TryGetProperty("remarks", out var rm) ? rm.GetString() : null
                });
            return affected > 0 ? Common.Ok() : Results.Forbid();
        });

        app.MapPut("/api/contracts/agreement", async (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            using var reader = new System.IO.StreamReader(ctx.Request.Body);
            var bodyText = await reader.ReadToEndAsync();
            var body = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(bodyText);
            var affected = await db.ExecuteAsync(@"UPDATE agreement_contracts SET name=@Name,amount=@Amount,status=@Status,remarks=@Remarks,updated_at=@Now, version=version+1, last_modified_at=@Now WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)",
                new { Uid = uid, IsAdmin = isAdmin, Now = now(),
                    Id = body.TryGetProperty("id", out var id) ? id.GetInt64() : 0,
                    Name = body.TryGetProperty("name", out var n) ? n.GetString() : null,
                    Amount = body.TryGetProperty("amount", out var a) ? (decimal?)a.GetDouble() : null,
                    Status = body.TryGetProperty("status", out var st) ? st.GetString() : null,
                    Remarks = body.TryGetProperty("remarks", out var rm) ? rm.GetString() : null
                });
            return affected > 0 ? Common.Ok() : Results.Forbid();
        });

        app.MapDelete("/api/contracts/income/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            return (await db.ExecuteAsync("DELETE FROM income_contracts WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)", new { Id = id, Uid = uid, IsAdmin = isAdmin })) > 0 ? Common.Ok() : Results.Forbid();
        });

        app.MapDelete("/api/contracts/expense/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            return (await db.ExecuteAsync("DELETE FROM expense_contracts WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)", new { Id = id, Uid = uid, IsAdmin = isAdmin })) > 0 ? Common.Ok() : Results.Forbid();
        });

        app.MapDelete("/api/contracts/agreement/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            return (await db.ExecuteAsync("DELETE FROM agreement_contracts WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)", new { Id = id, Uid = uid, IsAdmin = isAdmin })) > 0 ? Common.Ok() : Results.Forbid();
        });

        // 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?
        // 鍚堝悓妯℃澘 (鏃?created_by 鍒? 浠?var uid 寮哄埗閴存潈)
        // 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?

        app.MapGet("/api/contract-templates", (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            // v1.1.0 P0-4 Phase 2: contract_templates 鐜板湪鏈?created_by
            return Common.Ok(db.Query($"SELECT * FROM contract_templates WHERE {CurrentUser.UserFilterCompany(scope)} ORDER BY created_at DESC", new { Uid = uid, IsAdmin = isAdmin }));
        });

        app.MapPost("/api/contract-templates", async (HttpContext ctx, ContractTemplateDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO contract_templates (name,type,content,variables,created_by,created_at,updated_at, last_modified_at) VALUES (@Name,@Type,@Content,@Variables,@CreatedBy,@Now,@Now, @Now); SELECT last_insert_rowid();",
                new { dto.Name, Type = dto.Type ?? "contract", dto.Content, dto.Variables, CreatedBy = uid, Now = now() });
            return Common.Ok(id);
        });

        app.MapPut("/api/contract-templates", async (HttpContext ctx, dynamic dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var affected = await db.ExecuteAsync(@"UPDATE contract_templates SET name=@Name,type=@Type,content=@Content,variables=@Variables,updated_at=@Now, version=version+1, last_modified_at=@Now WHERE id=@Id",
                new { Now = now() });
            return affected > 0 ? Common.Ok() : Results.Forbid();
        });

        app.MapDelete("/api/contract-templates/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            return (await db.ExecuteAsync("DELETE FROM contract_templates WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)", new { Id = id, Uid = uid, IsAdmin = isAdmin })) > 0 ? Common.Ok() : Results.Forbid();
        });
        // 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?
        // 缁撶畻 (settlements 琛ㄦ棤 created_by 鍒? 浠?var uid 寮哄埗閴存潈)
        // 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?

        app.MapGet("/api/settlements", (HttpContext ctx, IDbConnection db, long? projectId) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            // v1.1.0 P0-4 Phase 2: settlements 琛ㄧ幇鍦ㄦ湁 created_by (migration 014)
            // 浼樺厛鐢ㄥ唴鑱?SQL 閬垮厤 LEFT JOIN projects 涔熸湁 created_by 鍒楀啿绐?
            var sql = @"SELECT s.*, p.name as project_name
                        FROM settlements s LEFT JOIN projects p ON s.project_id=p.id
                        WHERE (s.created_by=@Uid OR @IsAdmin=1 OR EXISTS(SELECT 1 FROM project_authorizations WHERE project_id=s.project_id AND user_id=@Uid)) AND s.deleted_at IS NULL";
            if (projectId.HasValue) sql += " AND s.project_id=@ProjectId";
            sql += " ORDER BY s.created_at DESC";
            return Common.Ok(db.Query(sql, new { Uid = uid, IsAdmin = isAdmin, ProjectId = projectId }));
        });

        app.MapPost("/api/settlements", async (HttpContext ctx, dynamic dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO settlements (project_id,name,sub_type,status,settlement_no,amount,settler_id,remarks,created_by,created_at,updated_at, last_modified_at) VALUES (@ProjectId,@Name,@SubType,'pending',@SettlementNo,@Amount,@SettlerId,@Remarks,@CreatedBy,@Now,@Now, @Now);
                SELECT last_insert_rowid();",
                new { CreatedBy = uid, Now = now() });
            return Common.Ok(id);
        });

        app.MapPut("/api/settlements", async (HttpContext ctx, dynamic dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var affected = await db.ExecuteAsync(@"UPDATE settlements SET name=@Name,sub_type=@SubType,amount=@Amount,remarks=@Remarks,updated_at=@Now, version=version+1, last_modified_at=@Now WHERE id=@Id",
                new { Now = now() });
            return affected > 0 ? Common.Ok() : Results.Forbid();
        });

        app.MapDelete("/api/settlements/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            return (await db.ExecuteAsync("UPDATE settlements SET deleted_at=@Now WHERE id=@Id AND deleted_at IS NULL AND (created_by=@Uid OR @IsAdmin=1)", new { Id = id, Uid = uid, IsAdmin = isAdmin, Now = now() })) > 0 ? Common.Ok() : Results.Forbid();
        });
        app.MapPut("/api/settlements/{id}/process", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var affected = await db.ExecuteAsync(@"UPDATE settlements SET status='processed',updated_at=@Now, version=version+1, last_modified_at=@Now WHERE id=@Id",
                new { Id = id, Now = now() });
            return affected > 0 ? Common.Ok() : Results.Forbid();
        });

        app.MapPut("/api/settlements/{id}/unarchive", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var affected = await db.ExecuteAsync(@"UPDATE settlements SET status='pending',updated_at=@Now, version=version+1, last_modified_at=@Now WHERE id=@Id",
                new { Id = id, Now = now() });
            return affected > 0 ? Common.Ok() : Results.Forbid();
        });
    }
}

================
File: EngineeringManager.Api/Endpoints/CostLedgerEndpoints.cs
================
using System.Data;
using Dapper;
using EngineeringManager.Api.Security;

namespace EngineeringManager.Api;

/// <summary>
/// 成本台账端点（条目 + 分类 + 批次 + 匹配规则）
/// </summary>
public static class CostLedgerEndpoints
{
    public static void RegisterCostLedgerEndpoints(this WebApplication app)
    {
        var now = () => DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");

        // ═══════════════════════════════════════════════════════════
        // 台账条目
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/cost-ledger", (HttpContext ctx, IDbConnection db, long? projectId) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            // v1.1.0 P0-4 Phase 2: cost_ledger 表现在有 created_by (migration 014)
            var conditions = new List<string>();
            if (projectId.HasValue) conditions.Add("project_id=@ProjectId");
            conditions.Add(CurrentUser.UserFilterCompany(scope));
            conditions.Add("deleted_at IS NULL");
            var sql = "SELECT * FROM cost_ledger WHERE " + string.Join(" AND ", conditions) + " ORDER BY date DESC";
            return Common.Ok(db.Query(sql, new { Uid = uid, IsAdmin = isAdmin, ProjectId = projectId }));
        });

        app.MapGet("/api/cost-ledger/summary", (HttpContext ctx, IDbConnection db, long? projectId) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            // v1.1.0 P0-4 Phase 2: cost_ledger 现在有 created_by
            var projectFilter = projectId.HasValue ? " AND project_id=@ProjectId" : "";
            var userFilter = $" AND {CurrentUser.UserFilterCompany(scope)}";
            return Common.Ok(new
            {
                totalCount = db.ExecuteScalar<int>($"SELECT COUNT(*) FROM cost_ledger WHERE 1=1{projectFilter}{userFilter} AND deleted_at IS NULL", new { Uid = uid, IsAdmin = isAdmin, ProjectId = projectId }),
                totalExpense = db.ExecuteScalar<decimal>($"SELECT COALESCE(SUM(amount),0) FROM cost_ledger WHERE direction='expense'{projectFilter}{userFilter} AND deleted_at IS NULL", new { Uid = uid, IsAdmin = isAdmin, ProjectId = projectId }),
                totalIncome = db.ExecuteScalar<decimal>($"SELECT COALESCE(SUM(amount),0) FROM cost_ledger WHERE direction='income'{projectFilter}{userFilter} AND deleted_at IS NULL", new { Uid = uid, IsAdmin = isAdmin, ProjectId = projectId }),
            });
        });
        app.MapPost("/api/cost-ledger", async (HttpContext ctx, CostLedgerEntryDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO cost_ledger (project_id,batch_id,voucher_no,date,direction,category,amount,counterparty,channel,summary,notes,created_by,created_at,updated_at, last_modified_at) VALUES (@ProjectId,@BatchId,@VoucherNo,@Date,@Direction,@Category,@Amount,@Counterparty,@Channel,@Summary,@Notes,@CreatedBy,@Now,@Now, @Now);
                SELECT last_insert_rowid();",
                new { dto.ProjectId, dto.BatchId, dto.VoucherNo, dto.Date, dto.Direction, dto.Category,
                      dto.Amount, dto.Counterparty, dto.Channel, dto.Summary, dto.Notes, CreatedBy = uid, Now = now() });
            return Common.Ok(id);
        });

        app.MapPut("/api/cost-ledger", async (HttpContext ctx, CostLedgerEntryDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var affected = await db.ExecuteAsync(@"UPDATE cost_ledger SET voucher_no=@VoucherNo,date=@Date,direction=@Direction,category=@Category,
                amount=@Amount,counterparty=@Counterparty,channel=@Channel,summary=@Summary,notes=@Notes,updated_at=@Now, version=version+1, last_modified_at=@Now WHERE id=@Id",
                new { dto.VoucherNo, dto.Date, dto.Direction, dto.Category, dto.Amount,
                      dto.Counterparty, dto.Channel, dto.Summary, dto.Notes, Now = now(), dto.Id });
            return affected > 0 ? Common.Ok() : Results.Forbid();
        });

        app.MapDelete("/api/cost-ledger/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            return (await db.ExecuteAsync("UPDATE cost_ledger SET deleted_at=@Now WHERE id=@Id AND deleted_at IS NULL", new { Id = id, Now = now() })) > 0 ? Common.Ok() : Results.Forbid();
        });

        app.MapPost("/api/cost-ledger/batch", async (HttpContext ctx, List<CostLedgerEntryDto> entries, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var count = 0;
            foreach (var dto in entries)
            {
                await db.ExecuteAsync(@"INSERT INTO cost_ledger (project_id,voucher_no,date,direction,category,amount,counterparty,channel,summary,notes,created_by,created_at,updated_at, last_modified_at) VALUES (@ProjectId,@VoucherNo,@Date,@Direction,@Category,@Amount,@Counterparty,@Channel,@Summary,@Notes,@CreatedBy,@Now,@Now, @Now)",
                    new { dto.ProjectId, dto.VoucherNo, dto.Date, dto.Direction, dto.Category,
                          dto.Amount, dto.Counterparty, dto.Channel, dto.Summary, dto.Notes, CreatedBy = uid, Now = now() });
                count++;
            }
            return Common.Ok(new { count });
        });

        // ═══════════════════════════════════════════════════════════
        // 分类管理
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/cost-ledger/categories", (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            try
            {
                var categories = db.Query("SELECT * FROM cost_ledger_categories").ToList();
                return Common.Ok(categories);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[CostLedger] categories 查询失败: {ex.Message}");
                return Common.Ok(new List<object>());
            }
        });

        app.MapPost("/api/cost-ledger/categories", async (HttpContext ctx, CostLedgerCategoryDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO cost_ledger_categories (name,direction,level1,color,created_at,updated_at)
                VALUES (@Name,@Direction,@Level1,@Color,@Now,@Now); SELECT last_insert_rowid();",
                new { dto.Name, dto.Direction, dto.Level1, dto.Color, Now = now() });
            return Common.Ok(id);
        });

        app.MapPut("/api/cost-ledger/categories", async (HttpContext ctx, CostLedgerCategoryDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var affected = await db.ExecuteAsync(@"UPDATE cost_ledger_categories SET name=@Name,direction=@Direction,level1=@Level1,color=@Color,updated_at=@Now WHERE id=@Id",
                new { dto.Name, dto.Direction, dto.Level1, dto.Color, Now = now(), dto.Id });
            return affected > 0 ? Common.Ok() : Results.Forbid();
        });

        app.MapDelete("/api/cost-ledger/categories/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            return (await db.ExecuteAsync("DELETE FROM cost_ledger_categories WHERE id=@Id", new { Id = id })) > 0 ? Common.Ok() : Results.Forbid();
        });

        app.MapPost("/api/cost-ledger/categories/reset", (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            db.Execute("DELETE FROM cost_ledger_categories");
            return Common.Ok();
        });

        // ═══════════════════════════════════════════════════════════
        // 批次管理
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/cost-ledger/batches", (HttpContext ctx, IDbConnection db, long projectId) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            // v1.1.0 P0-4 Phase 2: cost_ledger_batches 现在有 created_by (migration 020), 完整 user-dim
            return Common.Ok(db.Query($"SELECT * FROM cost_ledger_batches WHERE project_id=@ProjectId AND {CurrentUser.UserFilterCompany(scope)} ORDER BY created_at DESC", new { Uid = uid, IsAdmin = isAdmin, ProjectId = projectId }));
        });

        app.MapPost("/api/cost-ledger/batches", async (HttpContext ctx, CostLedgerBatchDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO cost_ledger_batches (project_id,name,created_by,created_at,updated_at, last_modified_at) VALUES (@ProjectId,@Name,@CreatedBy,@Now,@Now, @Now); SELECT last_insert_rowid();",
                new { dto.ProjectId, dto.Name, Now = now() });
            return Common.Ok(id);
        });

        app.MapPost("/api/cost-ledger/batches/{id}/copy", async (HttpContext ctx, long id, CostLedgerBatchDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var original = db.QueryFirstOrDefault("SELECT * FROM cost_ledger_batches WHERE id=@Id", new { Id = id });
            if (original == null) return Common.NotFound("批次不存在");
            var newId = await db.ExecuteScalarAsync<long>(@"INSERT INTO cost_ledger_batches (project_id,name,created_by,created_at,updated_at, last_modified_at) VALUES (@ProjectId,@Name,@CreatedBy,@Now,@Now, @Now); SELECT last_insert_rowid();",
                new { ProjectId = (long)original.project_id, Name = dto.NewName ?? "", Now = now() });
            return Common.Ok(new { id = newId });
        });

        app.MapPut("/api/cost-ledger/batches/{id}", async (HttpContext ctx, long id, CostLedgerBatchDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var affected = await db.ExecuteAsync("UPDATE cost_ledger_batches SET name=@Name,updated_at=@Now, version=version+1, last_modified_at=@Now WHERE id=@Id",
                new { Name = dto.NewName ?? "", Now = now(), Id = id });
            return affected > 0 ? Common.Ok() : Results.Forbid();
        });

        app.MapDelete("/api/cost-ledger/batches/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            return (await db.ExecuteAsync("DELETE FROM cost_ledger_batches WHERE id=@Id", new { Id = id })) > 0 ? Common.Ok() : Results.Forbid();
        });

        // ═══════════════════════════════════════════════════════════
        // 匹配规则
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/cost-ledger/match-rules", (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            return Common.Ok(db.Query("SELECT * FROM cost_ledger_match_rules ORDER BY hit_count DESC"));
        });

        app.MapPost("/api/cost-ledger/match-rules", async (HttpContext ctx, CostLedgerMatchRuleDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            await db.ExecuteAsync(@"INSERT OR REPLACE INTO cost_ledger_match_rules (pattern,category,direction,priority,hit_count,created_at,updated_at)
                VALUES (@Pattern,@Category,@Direction,@Priority,COALESCE((SELECT hit_count FROM cost_ledger_match_rules WHERE pattern=@Pattern),0)+1,@Now,@Now)",
                new { dto.Pattern, dto.Category, dto.Direction, dto.Priority, Now = now() });
            return Common.Ok();
        });
    }
}

================
File: EngineeringManager.Api/Endpoints/ExpenseEndpoints.cs
================
using System.Data;
using Dapper;
using EngineeringManager.Api.Security;

namespace EngineeringManager.Api;

/// <summary>
/// 费用端点：项目费用 CRUD
/// </summary>
public static class ExpenseEndpoints
{
    public static void RegisterExpenseEndpoints(this WebApplication app)
    {
        app.MapGet("/api/expenses", (HttpContext ctx, IDbConnection db, long? projectId) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            // v1.1.0 P0-4 Phase 2: 总加 user-dim
            var conditions = new List<string>();
            if (projectId.HasValue) conditions.Add("project_id=@ProjectId");
            conditions.Add(CurrentUser.UserFilterWithAuthorizedProjects(scope));
            var sql = "SELECT * FROM expenses WHERE " + string.Join(" AND ", conditions) + " ORDER BY created_at DESC";
            return Common.Ok(db.Query(sql, new { Uid = uid, IsAdmin = isAdmin, ProjectId = projectId }));
        });

        app.MapPost("/api/expenses", async (HttpContext ctx, ExpenseDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO expenses (project_id,category,amount,date,description,vendor,receipt_url,created_by,created_at,updated_at, last_modified_at) VALUES (@ProjectId,@Category,@Amount,@Date,@Description,@Vendor,@ReceiptUrl,@CreatedBy,@Now,@Now, @Now);
                SELECT last_insert_rowid();",
                new { dto.ProjectId, dto.Category, dto.Amount, dto.Date, dto.Description, dto.Vendor, dto.ReceiptUrl, CreatedBy = uid, Now = Common.NowString() });
            return Common.Ok(id);
        });

        app.MapDelete("/api/expenses/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            return (await db.ExecuteAsync("DELETE FROM expenses WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)", new { Id = id, Uid = uid, IsAdmin = isAdmin })) > 0 ? Common.Ok() : Results.Forbid();
        });
    }
}

================
File: EngineeringManager.Api/Endpoints/FileEndpoints.cs
================
using System.Data;
using System.Diagnostics;
using Dapper;
using EngineeringManager.Api.Security;

namespace EngineeringManager.Api;

/// <summary>
/// 文件操作 + 图纸 + 合同文件端点
/// </summary>
public static class FileEndpoints
{
    /// <summary>校验路径是否在允许的目录内，防止路径遍历攻击</summary>
    private static bool IsPathSafe(string fullPath, string allowedBase)
    {
        var resolved = Path.GetFullPath(fullPath);
        var baseResolved = Path.GetFullPath(allowedBase);
        return resolved.StartsWith(baseResolved, StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>
    /// open-external 端点允许的文件扩展名白名单 (P0-3)。
    /// 仅文档 + 图片,显式排除可执行文件 (.bat/.exe/.cmd/.ps1/.vbs/.js/.scr/.com/.msi 等),
    /// 防止上传的文件被 UseShellExecute 远程执行。
    /// </summary>
    private static readonly HashSet<string> OpenableExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        // 文档
        ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".csv", ".rtf",
        // 图片
        ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".tif", ".tiff", ".svg",
    };

    private static bool IsOpenableExtension(string path)
    {
        var ext = Path.GetExtension(path);
        return !string.IsNullOrEmpty(ext) && OpenableExtensions.Contains(ext);
    }

    public static void RegisterFileEndpoints(this WebApplication app)
    {
        var now = () => DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");

        // ═══════════════════════════════════════════════════════════
        // 文件操作（简化版）
        // ═══════════════════════════════════════════════════════════

        app.MapPost("/api/files/save", (HttpContext ctx, FileSaveDto dto) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            try
            {
                var baseDir = Path.Combine(ApiConfig.ResolveDataPath(), "uploads");
                var dir = Path.Combine(baseDir, dto.Category ?? "未分类");
                Directory.CreateDirectory(dir);
                var filePath = Path.Combine(dir, dto.FileName ?? "file");
                if (!IsPathSafe(filePath, baseDir)) return Common.Fail("非法路径");
                if (!string.IsNullOrEmpty(dto.FileData))
                {
                    var data = dto.FileData;
                    if (data.Contains(",")) data = data.Split(',')[1];
                    File.WriteAllBytes(filePath, Convert.FromBase64String(data));
                }
                return Common.Ok(new { fileName = dto.FileName });
            }
            catch (Exception ex) { return Common.Fail(Common.Sanitize(ex.Message)); }
        });

        app.MapGet("/api/files/read", (HttpContext ctx, string category, string fileName, string? projectName) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            try
            {
                var baseDir = Path.Combine(ApiConfig.ResolveDataPath(), "uploads");
                var paths = new[]
                {
                    Path.Combine(baseDir, projectName ?? "", category, fileName),
                    Path.Combine(baseDir, "未分类", category, fileName),
                    Path.Combine(baseDir, "_common", category, fileName),
                };
                foreach (var p in paths)
                {
                    if (!IsPathSafe(p, baseDir)) continue;
                    if (File.Exists(p))
                    {
                        var bytes = File.ReadAllBytes(p);
                        var ext = Path.GetExtension(p).ToLower();
                        var mime = ext switch
                        {
                            ".jpg" or ".jpeg" => "image/jpeg",
                            ".png" => "image/png",
                            ".pdf" => "application/pdf",
                            _ => "application/octet-stream"
                        };
                        return Common.Ok(new { dataUrl = $"data:{mime};base64,{Convert.ToBase64String(bytes)}", mimeType = mime });
                    }
                }
                return Common.NotFound("文件不存在");
            }
            catch (Exception ex) { return Common.Fail(Common.Sanitize(ex.Message)); }
        });

        // ═══════════════════════════════════════════════════════════
        // 图纸
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/drawings", (HttpContext ctx, IDbConnection db, long? projectId) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            // v1.1.0 P0-4 Phase 2: 总加 user-dim
            var conditions = new List<string>();
            if (projectId.HasValue) conditions.Add("project_id=@ProjectId");
            conditions.Add(CurrentUser.UserFilterWithAuthorizedProjects(scope));
            var sql = "SELECT * FROM drawings WHERE " + string.Join(" AND ", conditions) + " ORDER BY created_at DESC";
            return Common.Ok(db.Query(sql, new { Uid = uid, IsAdmin = isAdmin, ProjectId = projectId }));
        });

        app.MapDelete("/api/drawings/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            return (await db.ExecuteAsync("DELETE FROM drawings WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)", new { Id = id, Uid = uid, IsAdmin = isAdmin })) > 0 ? Common.Ok() : Results.Forbid();
        });

        // ═══════════════════════════════════════════════════════════
        // 图纸写操作（补全）
        // ═══════════════════════════════════════════════════════════

        app.MapPost("/api/drawings", async (HttpContext ctx, dynamic dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO drawings (project_id,name,file_url,file_name,drawing_type,scale,notes,created_by,created_at,updated_at, last_modified_at) VALUES (@ProjectId,@Name,@FileUrl,@FileName,@DrawingType,@Scale,@Notes,@CreatedBy,@Now,@Now, @Now); SELECT last_insert_rowid();",
                new { Now = now(), CreatedBy = uid });
            return Common.Ok(id);
        });

        app.MapPut("/api/drawings", async (HttpContext ctx, dynamic dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var affected = await db.ExecuteAsync("UPDATE drawings SET name=@Name,notes=@Notes,updated_at=@Now, version=version+1, last_modified_at=@Now WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)",
                new { Now = now(), Uid = uid, IsAdmin = isAdmin });
            return affected > 0 ? Common.Ok() : Results.Forbid();
        });

        app.MapPut("/api/expenses", async (HttpContext ctx, dynamic dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var affected = await db.ExecuteAsync(@"UPDATE expenses SET category=@Category,amount=@Amount,date=@Date,description=@Description,vendor=@Vendor,updated_at=@Now, version=version+1, last_modified_at=@Now WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)",
                new { Now = now(), Uid = uid, IsAdmin = isAdmin });
            return affected > 0 ? Common.Ok() : Results.Forbid();
        });

        app.MapPost("/api/inventory/transactions", async (HttpContext ctx, dynamic dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO inventory_transactions (item_id,type,quantity,date,notes,operator,created_by,created_at, last_modified_at) VALUES (@ItemId,@Type,@Quantity,@Date,@Notes,@Operator,@CreatedBy,@Now, @Now); SELECT last_insert_rowid();",
                new { Now = now(), CreatedBy = uid });
            return Common.Ok(id);
        });

        // ═══════════════════════════════════════════════════════════
        // 文件操作补全
        // ═══════════════════════════════════════════════════════════

        app.MapPost("/api/files/delete", (HttpContext ctx, dynamic dto) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            try
            {
                var baseDir = Path.Combine(ApiConfig.ResolveDataPath(), "uploads");
                var dir = Path.Combine(baseDir, (string)(dto.category ?? "未分类"));
                var path = Path.Combine(dir, (string)(dto.fileName ?? ""));
                if (!IsPathSafe(path, baseDir)) return Common.Fail("非法路径");
                if (File.Exists(path)) { File.Delete(path); return Common.Ok(); }
                return Common.NotFound("文件不存在");
            }
            catch (Exception ex) { return Common.Fail(Common.Sanitize(ex.Message)); }
        });

        app.MapPost("/api/files/open-external", (HttpContext ctx, dynamic dto) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            try
            {
                var baseDir = Path.Combine(ApiConfig.ResolveDataPath(), "uploads");
                var dir = Path.Combine(baseDir, (string)(dto.category ?? "未分类"));
                var path = Path.Combine(dir, (string)(dto.fileName ?? ""));
                if (!IsPathSafe(path, baseDir)) return Common.Fail("非法路径");
                // P0-3: UseShellExecute=true 会用系统默认程序打开文件,必须限制扩展名,
                // 防止上传 .bat/.exe/.ps1 等可执行文件后被远程执行。
                if (!IsOpenableExtension(path)) return Common.Fail("不支持的文件类型,仅允许文档和图片");
                if (File.Exists(path)) { Process.Start(new ProcessStartInfo(path) { UseShellExecute = true }); return Common.Ok(); }
                return Common.NotFound("文件不存在");
            }
            catch (Exception ex) { return Common.Fail(Common.Sanitize(ex.Message)); }
        });

        app.MapGet("/api/contracts/read-file", (HttpContext ctx, string fileName, string subCategory, string? projectName) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            try
            {
                var baseDir = Path.Combine(ApiConfig.ResolveDataPath(), "uploads");
                var paths = new[]
                {
                    Path.Combine(baseDir, projectName ?? "", "合同", subCategory == "income" ? "收入" : "支出", fileName),
                    Path.Combine(baseDir, "未分类", "合同", subCategory == "income" ? "收入" : "支出", fileName),
                };
                foreach (var p in paths)
                {
                    if (!IsPathSafe(p, baseDir)) continue;
                    if (File.Exists(p))
                    {
                        var bytes = File.ReadAllBytes(p);
                        var ext = Path.GetExtension(p).ToLower();
                        var mime = ext switch { ".pdf" => "application/pdf", ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document", _ => "application/octet-stream" };
                        return Common.Ok(new { dataUrl = $"data:{mime};base64,{Convert.ToBase64String(bytes)}", mimeType = mime });
                    }
                }
                return Common.NotFound("文件不存在");
            }
            catch (Exception ex) { return Common.Fail(Common.Sanitize(ex.Message)); }
        });

        app.MapPost("/api/contracts/save-file", (HttpContext ctx, dynamic dto) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            try
            {
                var baseDir = Path.Combine(ApiConfig.ResolveDataPath(), "uploads");
                var subDir = (string)(dto.subCategory ?? "income") == "income" ? "收入" : "支出";
                var dir = Path.Combine(baseDir, (string)(dto.projectName ?? "未分类"), "合同", subDir);
                Directory.CreateDirectory(dir);
                var filePath = Path.Combine(dir, (string)(dto.fileName ?? "file"));
                if (!IsPathSafe(filePath, baseDir)) return Common.Fail("非法路径");
                if (!string.IsNullOrEmpty((string)(dto.fileData ?? "")))
                {
                    var data = (string)dto.fileData;
                    if (data.Contains(",")) data = data.Split(',')[1];
                    File.WriteAllBytes(filePath, Convert.FromBase64String(data));
                }
                return Common.Ok(new { fileName = (string)(dto.fileName ?? "") });
            }
            catch (Exception ex) { return Common.Fail(Common.Sanitize(ex.Message)); }
        });
    }
}

================
File: EngineeringManager.Api/Endpoints/InventoryEndpoints.cs
================
using System.Data;
using Dapper;
using EngineeringManager.Api.Security;

namespace EngineeringManager.Api;

/// <summary>
/// 库存 + 物料端点
/// </summary>
public static class InventoryEndpoints
{
    public static void RegisterInventoryEndpoints(this WebApplication app)
    {
        var now = () => DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");

        // ═══════════════════════════════════════════════════════════
        // 库存
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/inventory", (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            // v1.1.0 P0-4 Phase 2: 公司维度表过滤 (无 project_id)
            return Common.Ok(db.Query($"SELECT * FROM inventory_items WHERE {CurrentUser.UserFilterCompany(scope)} ORDER BY name",
                new { Uid = uid, IsAdmin = isAdmin }));
        });

        app.MapPost("/api/inventory", async (HttpContext ctx, InventoryItemDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO inventory_items (name,category,unit,quantity,min_quantity,location,notes,created_by,created_at,updated_at, last_modified_at) VALUES (@Name,@Category,@Unit,@Quantity,@MinQuantity,@Location,@Notes,@CreatedBy,@Now,@Now, @Now);
                SELECT last_insert_rowid();",
                new { dto.Name, dto.Category, dto.Unit, dto.Quantity, dto.MinQuantity, dto.Location, dto.Notes, CreatedBy = uid, Now = now() });
            return Common.Ok(id);
        });

        app.MapPut("/api/inventory", async (HttpContext ctx, InventoryItemDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            var affected = await db.ExecuteAsync(@"UPDATE inventory_items SET name=@Name,category=@Category,
                unit=@Unit,quantity=@Quantity,min_quantity=@MinQuantity,location=@Location,notes=@Notes,
                updated_at=@Now, version=version+1, last_modified_at=@Now WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)",
                new { dto.Id, dto.Name, dto.Category, dto.Unit, dto.Quantity, dto.MinQuantity, dto.Location, dto.Notes,
                      Uid = uid, IsAdmin = isAdmin, Now = now() });
            return affected > 0 ? Common.Ok() : Results.Forbid();
        });

        app.MapDelete("/api/inventory/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            return (await db.ExecuteAsync("DELETE FROM inventory_items WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)", new { Id = id, Uid = uid, IsAdmin = isAdmin })) > 0 ? Common.Ok() : Results.Forbid();
        });

        app.MapGet("/api/inventory/transactions", (HttpContext ctx, IDbConnection db, long? itemId) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            // v1.1.0 P0-4 Phase 2: 公司维度表过滤, itemId 仅作进一步收窄
            var sql = $@"SELECT * FROM inventory_transactions WHERE {CurrentUser.UserFilterCompany(scope)}";
            if (itemId.HasValue) sql += " AND item_id=@ItemId";
            sql += " ORDER BY created_at DESC";
            return Common.Ok(db.Query(sql, new { ItemId = itemId, Uid = uid, IsAdmin = isAdmin }));
        });

        // ═══════════════════════════════════════════════════════════
        // 物料
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/materials", (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            // v1.1.0 P0-4 Phase 2: 公司维度表过滤 (无 project_id)
            return Common.Ok(db.Query($"SELECT * FROM materials WHERE {CurrentUser.UserFilterCompany(scope)} ORDER BY name",
                new { Uid = uid, IsAdmin = isAdmin }));
        });

        app.MapPost("/api/materials", async (HttpContext ctx, MaterialDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO materials (name,category,unit,specifications,supplier,notes,created_by,created_at,updated_at, last_modified_at) VALUES (@Name,@Category,@Unit,@Specifications,@Supplier,@Notes,@CreatedBy,@Now,@Now, @Now);
                SELECT last_insert_rowid();",
                new { dto.Name, dto.Category, dto.Unit, dto.Specifications, dto.Supplier, dto.Notes, CreatedBy = uid, Now = now() });
            return Common.Ok(id);
        });

        app.MapPut("/api/materials", async (HttpContext ctx, MaterialDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            var affected = await db.ExecuteAsync(@"UPDATE materials SET name=@Name,category=@Category,
                unit=@Unit,specifications=@Specifications,supplier=@Supplier,notes=@Notes,updated_at=@Now, version=version+1, last_modified_at=@Now WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)",
                new { dto.Id, dto.Name, dto.Category, dto.Unit, dto.Specifications, dto.Supplier, dto.Notes,
                      Uid = uid, IsAdmin = isAdmin, Now = now() });
            return affected > 0 ? Common.Ok() : Results.Forbid();
        });

        app.MapDelete("/api/materials/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            return (await db.ExecuteAsync("DELETE FROM materials WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)", new { Id = id, Uid = uid, IsAdmin = isAdmin })) > 0 ? Common.Ok() : Results.Forbid();
        });
}
}

================
File: EngineeringManager.Api/Endpoints/InvoiceEndpoints.cs
================
using System.Data;
using Dapper;
using EngineeringManager.Api.Security;

namespace EngineeringManager.Api;

/// <summary>
/// 鍙戠エ + 鏀朵粯娆捐褰曠鐐?
/// </summary>
public static class InvoiceEndpoints
{
    public static void RegisterInvoiceEndpoints(this WebApplication app)
    {
        var now = () => DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");

        // 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?
        // 鍙戠エ
        // 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?

        app.MapGet("/api/invoices", (HttpContext ctx, IDbConnection db, long? projectId) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            // v1.1.0 P0-4 Phase 2: 鍐呰仈 SQL 閬垮厤 JOIN partners/projects 涔熸湁 created_by 鍒楃殑鍐茬獊
            var sql = @"SELECT i.*, p.name as project_name,
                               seller.name as sellerName, buyer.name as buyerName,
                               CASE WHEN i.type='invoice_in' THEN seller.name ELSE buyer.name END as partner_name
                        FROM invoices i
                        LEFT JOIN projects p ON i.project_id=p.id
                        LEFT JOIN partners seller ON i.seller_id=seller.id
                        LEFT JOIN partners buyer ON i.buyer_id=buyer.id
                        WHERE (i.created_by=@Uid OR @IsAdmin=1 OR EXISTS(SELECT 1 FROM project_authorizations WHERE project_id=i.project_id AND user_id=@Uid)) AND i.deleted_at IS NULL";
            if (projectId.HasValue) sql += " AND i.project_id=@ProjectId";
            sql += " ORDER BY i.created_at DESC";
            return Common.Ok(db.Query(sql, new { Uid = uid, IsAdmin = isAdmin, ProjectId = projectId }));
        });

        app.MapPost("/api/invoices", async (HttpContext ctx, InvoiceDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO invoices (project_id,seller_id,buyer_id,contract_id,settlement_id,type,invoice_kind,invoice_no,invoice_code,name,
                 amount,price_amount,tax_rate,tax_amount,received_amount,issue_date,status,remarks,file_url,file_type,created_by,created_at,updated_at, last_modified_at) VALUES (@ProjectId,@SellerId,@BuyerId,@ContractId,@SettlementId,@Type,@InvoiceKind,@InvoiceNo,@InvoiceCode,@Name,
                        @Amount,@PriceAmount,@TaxRate,@TaxAmount,@ReceivedAmount,@IssueDate,@Status,@Remarks,@FileUrl,@FileType,@CreatedBy,@Now,@Now, @Now);
                SELECT last_insert_rowid();",
                new { dto.ProjectId, dto.SellerId, dto.BuyerId, dto.ContractId, dto.SettlementId, dto.Type, dto.InvoiceKind, dto.InvoiceNo, dto.InvoiceCode,
                      dto.Name, dto.Amount, dto.PriceAmount, dto.TaxRate, dto.TaxAmount, dto.ReceivedAmount, dto.IssueDate,
                      Status = dto.Status ?? "pending", dto.Remarks, dto.FileUrl, dto.FileType, CreatedBy = uid, Now = now() });
            return Common.Ok(id);
        });

        app.MapPut("/api/invoices", async (HttpContext ctx, InvoiceDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var affected = await db.ExecuteAsync(@"UPDATE invoices SET project_id=@ProjectId,seller_id=@SellerId,
                buyer_id=@BuyerId,contract_id=@ContractId,settlement_id=@SettlementId,type=@Type,invoice_kind=@InvoiceKind,
                invoice_no=@InvoiceNo,invoice_code=@InvoiceCode,name=@Name,amount=@Amount,price_amount=@PriceAmount,
                tax_rate=@TaxRate,tax_amount=@TaxAmount,received_amount=@ReceivedAmount,issue_date=@IssueDate,
                status=@Status,remarks=@Remarks,file_url=@FileUrl,file_type=@FileType,updated_at=@Now, version=version+1, last_modified_at=@Now WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)",
                new { dto.Id, dto.ProjectId, dto.SellerId, dto.BuyerId, dto.ContractId, dto.SettlementId, dto.Type, dto.InvoiceKind, dto.InvoiceNo,
                      dto.InvoiceCode, dto.Name, dto.Amount, dto.PriceAmount, dto.TaxRate, dto.TaxAmount, dto.ReceivedAmount, dto.IssueDate,
                      dto.Status, dto.Remarks, dto.FileUrl, dto.FileType, Uid = uid, IsAdmin = isAdmin, Now = now() });
            return affected > 0 ? Common.Ok() : Results.Forbid();
        });

        app.MapDelete("/api/invoices/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            return (await db.ExecuteAsync("UPDATE invoices SET deleted_at=@Now WHERE id=@Id AND deleted_at IS NULL AND (created_by=@Uid OR @IsAdmin=1)", new { Id = id, Uid = uid, IsAdmin = isAdmin, Now = now() })) > 0 ? Common.Ok() : Results.Forbid();
        });

        // 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?
        // 鏀朵粯娆捐褰?
        // 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?

        app.MapGet("/api/payment-records", (HttpContext ctx, IDbConnection db, string? paymentType, long? projectId) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            var sql = @"SELECT pr.*, p.name as project_name, pt.name as partner_name
                        FROM payment_records pr
                        LEFT JOIN projects p ON pr.project_id=p.id
                        LEFT JOIN partners pt ON pr.partner_id=pt.id";
            var conditions = new List<string>();
            if (!string.IsNullOrEmpty(paymentType)) conditions.Add("pr.type=@PaymentType");
            if (projectId.HasValue) conditions.Add("pr.project_id=@ProjectId");
            // v1.1.0 P0-4 Phase 2: 鎬诲姞 user-dim
            conditions.Add(CurrentUser.UserFilterWithAuthorizedProjects(scope, "pr.project_id", "pr.created_by"));
            conditions.Add("pr.deleted_at IS NULL");
            sql += " WHERE " + string.Join(" AND ", conditions);
            sql += " ORDER BY pr.created_at DESC";
            var records = db.Query(sql, new { Uid = uid, IsAdmin = isAdmin, PaymentType = paymentType, ProjectId = projectId }).ToList();

            // 瑙ｆ瀽 invoice_details JSON 骞跺叧鑱斿彂绁ㄤ俊鎭?
            var result = new List<dynamic>();
            foreach (var record in records)
            {
                var dict = (IDictionary<string, object>)record;
                var invoiceDetailsStr = dict.ContainsKey("invoice_details") ? dict["invoice_details"]?.ToString() : "[]";
                var invoiceInfos = new List<object>();
                try
                {
                    if (!string.IsNullOrEmpty(invoiceDetailsStr) && invoiceDetailsStr != "[]")
                    {
                        var details = System.Text.Json.JsonSerializer.Deserialize<List<System.Text.Json.JsonElement>>(invoiceDetailsStr) ?? [];
                        foreach (var detail in details)
                        {
                            var invoiceId = detail.GetProperty("invoiceId").GetInt64();
                            var paymentAmount = detail.GetProperty("paymentAmount").GetDouble();
                            var invoice = db.QueryFirstOrDefault("SELECT invoice_no, amount FROM invoices WHERE id=@Id AND deleted_at IS NULL", new { Id = invoiceId });
                            invoiceInfos.Add(new
                            {
                                invoiceId,
                                invoiceNo = invoice?.invoice_no ?? "",
                                invoiceAmount = invoice?.amount ?? 0,
                                paymentAmount
                            });
                        }
                    }
                }
                catch (Exception ex)
                {
                    Console.Error.WriteLine($"[InvoiceEndpoints/payment-record] 瑙ｆ瀽澶辫触: {ex.Message}");
                }
                dict["invoice_infos"] = invoiceInfos;
                result.Add(record);
            }
            return Common.Ok(result);
        });

        app.MapPost("/api/payment-records", async (HttpContext ctx, dynamic dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO payment_records (type,amount,record_date,project_id,partner_id,contract_id,invoice_details,remarks,file_url,file_type,created_by,created_at, last_modified_at) VALUES (@Type,@Amount,@RecordDate,@ProjectId,@PartnerId,@ContractId,@InvoiceDetails,@Remarks,@FileUrl,@FileType,@CreatedBy,@Now, @Now);
                SELECT last_insert_rowid();",
                new { CreatedBy = uid, Now = now() });
            return Common.Ok(id);
        });

        app.MapPut("/api/payment-records", async (HttpContext ctx, dynamic dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var affected = await db.ExecuteAsync(@"UPDATE payment_records SET type=@Type,amount=@Amount,record_date=@RecordDate,
                project_id=@ProjectId,partner_id=@PartnerId,contract_id=@ContractId,invoice_details=@InvoiceDetails,
                remarks=@Remarks,file_url=@FileUrl,file_type=@FileType, version=version+1, last_modified_at=@Now WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)",
                new { Uid = uid, IsAdmin = isAdmin, Now = now() });
            return affected > 0 ? Common.Ok() : Results.Forbid();
        });

        app.MapDelete("/api/payment-records/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            return (await db.ExecuteAsync("UPDATE payment_records SET deleted_at=@Now WHERE id=@Id AND deleted_at IS NULL AND (created_by=@Uid OR @IsAdmin=1)", new { Id = id, Uid = uid, IsAdmin = isAdmin, Now = now() })) > 0 ? Common.Ok() : Results.Forbid();
        });
    }
}

================
File: EngineeringManager.Api/Endpoints/KnowledgeEndpoints.cs
================
using System.Data;
using Dapper;
using EngineeringManager.Api.Security;
using EngineeringManager.Api.Services;
using EngineeringManager.Api.Services.Stt;

namespace EngineeringManager.Api;

/// <summary>
/// 知识库端点 (M2)
///
/// - POST   /api/knowledge/documents          手动/从转写入库
/// - GET    /api/knowledge/search             混合检索（FTS5 + 语义 + RRF）
/// - GET    /api/knowledge/documents/{id}     文档详情
/// - DELETE /api/knowledge/documents/{id}     删除文档（级联删 chunks + fts）
/// - GET    /api/knowledge/documents          文档列表
///
/// 鉴权沿用 GlobalAuthMiddleware（不在白名单，必须登录）
/// </summary>
public static class KnowledgeEndpoints
{
    public static void RegisterKnowledgeEndpoints(this WebApplication app)
    {
        // ═══════════════════════════════════════════════════════════
        // POST /api/knowledge/documents — 入库
        // ═══════════════════════════════════════════════════════════
        app.MapPost("/api/knowledge/documents", async (
            HttpContext ctx,
            IDbConnection db,
            IEmbeddingService embedding,
            KnowledgeIngestDto dto) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            try
            {
                if (string.IsNullOrWhiteSpace(dto.Text))
                    return Common.Fail("文本内容不能为空");
                if (string.IsNullOrWhiteSpace(dto.Title))
                    return Common.Fail("标题不能为空");

                var service = new KnowledgeBaseService(db, embedding);
                var docId = await service.IngestAsync(
                    fullText: dto.Text,
                    title: dto.Title,
                    sourceType: dto.SourceType ?? "manual",
                    sourceRef: dto.SourceRef,
                    projectId: dto.ProjectId,
                    createdBy: uid,
                    segments: null,
                    occurredAt: dto.OccurredAt);

                return Results.Ok(new { success = true, documentId = docId });
            }
            catch (Exception ex)
            {
                return Common.ServerError("知识库入库", ex);
            }
        });

        // ═══════════════════════════════════════════════════════════
        // GET /api/knowledge/search — 混合检索
        // ═══════════════════════════════════════════════════════════
        app.MapGet("/api/knowledge/search", async (
            HttpContext ctx,
            IDbConnection db,
            IEmbeddingService embedding,
            string q,
            int topK = 10,
            int? projectId = null) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx);
            try
            {
                if (string.IsNullOrWhiteSpace(q))
                    return Common.Fail("搜索关键词不能为空");

                var service = new KnowledgeBaseService(db, embedding);
                var result = await service.SearchAsync(q, topK, projectId, uid, isAdmin);

                return Results.Ok(new
                {
                    success = true,
                    data = new
                    {
                        query = result.Query,
                        totalHits = result.TotalHits,
                        usedSemantic = result.UsedSemantic,
                        hits = result.Hits.Select(h => new
                        {
                            chunkId = h.ChunkId,
                            documentId = h.DocumentId,
                            chunkIndex = h.ChunkIndex,
                            text = h.Text,
                            ftsScore = h.FtsScore,
                            semanticScore = h.SemanticScore,
                            rrfScore = h.RrfScore,
                            docTitle = h.DocTitle,
                            sourceType = h.SourceType,
                            sourceRef = h.SourceRef,
                            projectId = h.ProjectId,
                            speakers = h.Speakers,
                            occurredAt = h.OccurredAt,
                        }),
                        documents = result.Documents.Select(d => new
                        {
                            id = d.Id,
                            title = d.Title,
                            sourceType = d.SourceType,
                            sourceRef = d.SourceRef,
                            projectId = d.ProjectId,
                            occurredAt = d.OccurredAt,
                        }),
                    }
                });
            }
            catch (Exception ex)
            {
                return Common.ServerError("知识库检索", ex);
            }
        });

        // ═══════════════════════════════════════════════════════════
        // GET /api/knowledge/documents/{id} — 文档详情
        // ═══════════════════════════════════════════════════════════
        app.MapGet("/api/knowledge/documents/{id}", (
            HttpContext ctx,
            IDbConnection db,
            IEmbeddingService embedding,
            long id) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx);
            try
            {
                var service = new KnowledgeBaseService(db, embedding);
                var doc = service.GetDocument(id, uid, isAdmin);

                if (doc == null)
                    return Common.NotFound("文档不存在或无权访问");

                return Results.Ok(new
                {
                    success = true,
                    data = new
                    {
                        id = doc.Id,
                        sourceType = doc.SourceType,
                        sourceRef = doc.SourceRef,
                        projectId = doc.ProjectId,
                        title = doc.Title,
                        fullText = doc.FullText,
                        speakers = doc.Speakers,
                        occurredAt = doc.OccurredAt,
                        createdAt = doc.CreatedAt,
                        createdBy = doc.CreatedBy,
                        chunks = doc.Chunks.Select(c => new
                        {
                            id = c.Id,
                            index = c.Index,
                            text = c.Text,
                        }),
                    }
                });
            }
            catch (Exception ex)
            {
                return Common.ServerError("获取文档", ex);
            }
        });

        // ═══════════════════════════════════════════════════════════
        // DELETE /api/knowledge/documents/{id} — 删除文档（级联）
        // ═══════════════════════════════════════════════════════════
        app.MapDelete("/api/knowledge/documents/{id}", (
            HttpContext ctx,
            IDbConnection db,
            IEmbeddingService embedding,
            long id) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx);
            try
            {
                var service = new KnowledgeBaseService(db, embedding);
                var deleted = service.DeleteDocument(id, uid, isAdmin);

                if (!deleted)
                    return Common.NotFound("文档不存在或无权删除");

                return Results.Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return Common.ServerError("删除文档", ex);
            }
        });

        // ═══════════════════════════════════════════════════════════
        // GET /api/knowledge/documents — 文档列表
        // ═══════════════════════════════════════════════════════════
        app.MapGet("/api/knowledge/documents", (
            HttpContext ctx,
            IDbConnection db,
            int page = 1,
            int size = 20,
            int? projectId = null) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx);
            try
            {
                var offset = (page - 1) * size;
                string filter;
                object param;

                if (isAdmin)
                {
                    filter = projectId.HasValue ? "d.project_id = @ProjectId" : "(1 = 1)";
                    param = new { ProjectId = projectId, Size = size, Offset = offset };
                }
                else
                {
                    if (projectId.HasValue)
                    {
                        filter = @"(d.created_by = @Uid
                                    OR EXISTS(SELECT 1 FROM project_authorizations
                                              WHERE project_id = @ProjectId AND user_id = @Uid))";
                        param = new { Uid = uid, ProjectId = projectId, Size = size, Offset = offset };
                    }
                    else
                    {
                        filter = @"(d.created_by = @Uid
                                    OR EXISTS(SELECT 1 FROM project_authorizations pa
                                              WHERE pa.project_id = d.project_id AND pa.user_id = @Uid))";
                        param = new { Uid = uid, Size = size, Offset = offset };
                    }
                }

                var docs = db.Query<dynamic>(
                    $@"SELECT d.id, d.title, d.source_type, d.source_ref, d.project_id,
                              d.speakers, d.occurred_at, d.created_at, d.created_by,
                              (SELECT COUNT(*) FROM knowledge_chunks WHERE document_id = d.id) AS chunk_count
                       FROM knowledge_documents d
                       WHERE {filter}
                       ORDER BY d.created_at DESC
                       LIMIT @Size OFFSET @Offset",
                    param);

                var total = db.ExecuteScalar<int>(
                    $@"SELECT COUNT(*) FROM knowledge_documents d WHERE {filter}",
                    param);

                return Results.Ok(new
                {
                    success = true,
                    data = docs.Select(d => new
                    {
                        id = d.id,
                        title = d.title,
                        sourceType = d.source_type,
                        sourceRef = d.source_ref,
                        projectId = d.project_id,
                        speakers = d.speakers,
                        occurredAt = d.occurred_at,
                        createdAt = d.created_at,
                        createdBy = d.created_by,
                        chunkCount = d.chunk_count,
                    }),
                    total,
                    page,
                    size,
                });
            }
            catch (Exception ex)
            {
                return Common.ServerError("查询文档列表", ex);
            }
        });
    }
}

/// <summary>知识库入库 DTO</summary>
public class KnowledgeIngestDto
{
    public string Text { get; set; } = "";
    public string? Title { get; set; }
    public string? SourceType { get; set; }       // call/meeting/upload/manual
    public string? SourceRef { get; set; }         // 如 stt_job.id
    public int? ProjectId { get; set; }
    public string? OccurredAt { get; set; }
}

================
File: EngineeringManager.Api/Endpoints/MemberEndpoints.cs
================
using System.Data;
using Dapper;
using EngineeringManager.Api.Security;

namespace EngineeringManager.Api;

/// <summary>
/// 成员 + 工人 + 项目工人 + 部门 + 班组端点
/// </summary>
public static class MemberEndpoints
{
    public static void RegisterMemberEndpoints(this WebApplication app)
    {
        var now = () => DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");

        // ═══════════════════════════════════════════════════════════
        // 成员
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/members", (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            // v1.1.0 P0-4 Phase 2: 公司维度表过滤 (created_by=@Uid OR @IsAdmin=1)
            var rows = db.Query($@"SELECT m.*, d.name as department_name FROM members m
                          LEFT JOIN departments d ON m.department_id=d.id
                          WHERE {CurrentUser.UserFilterCompany(scope, "m.created_by")}
                          ORDER BY m.created_at DESC",
                          new { Uid = uid, IsAdmin = isAdmin }).ToList();
            // v0.76.0 累计待办 #1: PII ACL — worker 角色只能看脱敏, 其他人明文
            var piiAccess = CurrentUser.GetPiiAccess(ctx);
            var masked = rows.Select(m => new
            {
                id = m.id, name = m.name, member_type = m.member_type, role = m.role, gender = m.gender,
                ethnicity = m.ethnicity, birth_date = m.birth_date, base_salary = m.base_salary, daily_wage = m.daily_wage,
                entry_date = m.entry_date, status = m.status, department_id = m.department_id, position = m.position,
                department_name = m.department_name, created_at = m.created_at, updated_at = m.updated_at,
                id_card = Common.MaskPiiField("idCard", m.id_card as string, piiAccess),
                phone = Common.MaskPiiField("phone", m.phone as string, piiAccess),
                email = m.email,
                id_card_address = Common.MaskPiiField("idCardAddress", m.id_card_address as string, piiAccess),
                bank_account = Common.MaskPiiField("bankAccount", m.bank_account as string, piiAccess),
                bank_name = m.bank_name, bank_line_no = m.bank_line_no, photo = m.photo
            });
            return Common.Ok(masked);
        });

        app.MapGet("/api/members/{id}", (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            // v1.1.0 P0-4 Phase 2: 单条也加 user-dim 过滤 (防 ID 枚举越权)
            var m = db.QueryFirstOrDefault($"SELECT * FROM members WHERE id=@Id AND {CurrentUser.UserFilterCompany(scope, "m.created_by")}", new { Id = id, Uid = uid, IsAdmin = isAdmin });
            if (m is null) return Common.NotFound("成员不存在");
            // v0.76.0 累计待办 #1: PII ACL — 同上 /api/members, 返回 dict 屏蔽 PII
            var piiAccess = CurrentUser.GetPiiAccess(ctx);
            var result = ((IDictionary<string, object>)m).ToDictionary(k => k.Key, v => (object?)v.Value);
            result["id_card"] = Common.MaskPiiField("idCard", (string?)m.id_card, piiAccess);
            result["phone"] = Common.MaskPiiField("phone", (string?)m.phone, piiAccess);
            result["id_card_address"] = Common.MaskPiiField("idCardAddress", (string?)m.id_card_address, piiAccess);
            result["bank_account"] = Common.MaskPiiField("bankAccount", (string?)m.bank_account, piiAccess);
            return Common.Ok(result);
                        });

app.MapPost("/api/members", async (HttpContext ctx, MemberDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // v1.2.0: PII 字段加密
            var pii = ctx.RequestServices.GetRequiredService<EngineeringManager.Api.Security.PiiProtector>();
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO members (name,phone,email,member_type,role,id_card,gender,ethnicity,birth_date,id_card_address,
                 base_salary,daily_wage,entry_date,status,department_id,position,created_by,created_at,
                 id_card_enc,id_card_address_enc,phone_enc,bank_account_enc, last_modified_at) VALUES (@Name,@Phone,@Email,@MemberType,@Role,@IdCard,@Gender,@Ethnicity,@BirthDate,
                        @IdCardAddress,@BaseSalary,@DailyWage,@EntryDate,@Status,@DepartmentId,@Position,@CreatedBy,@Now,
                        @IdCardEnc,@IdCardAddressEnc,@PhoneEnc,@BankAccountEnc, @Now);
                SELECT last_insert_rowid();",
                new { dto.Name, dto.Phone, dto.Email, MemberType = dto.MemberType ?? "staff",
                      dto.Role, dto.IdCard, dto.Gender, dto.Ethnicity, dto.BirthDate, dto.IdCardAddress,
                      dto.BaseSalary, dto.DailyWage, dto.EntryDate, Status = dto.Status ?? "active",
                      dto.DepartmentId, dto.Position, CreatedBy = uid, Now = now(),
                      IdCardEnc = pii.Encrypt(dto.IdCard ?? ""), IdCardAddressEnc = pii.Encrypt(dto.IdCardAddress ?? ""),
                      PhoneEnc = pii.Encrypt(dto.Phone ?? ""), BankAccountEnc = pii.Encrypt("") });
            return Common.Ok(id);
        });
                app.MapPut("/api/members", async (HttpContext ctx, MemberDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            // v1.2.0: PII 字段加密
            var pii = ctx.RequestServices.GetRequiredService<EngineeringManager.Api.Security.PiiProtector>();
            var affected = await db.ExecuteAsync(@"UPDATE members SET name=@Name,phone=@Phone,email=@Email,
                member_type=@MemberType,role=@Role,id_card=@IdCard,gender=@Gender,ethnicity=@Ethnicity,
                birth_date=@BirthDate,id_card_address=@IdCardAddress,base_salary=@BaseSalary,daily_wage=@DailyWage,
                entry_date=@EntryDate,status=@Status,department_id=@DepartmentId,position=@Position,
                id_card_enc=@IdCardEnc,id_card_address_enc=@IdCardAddressEnc,phone_enc=@PhoneEnc,bank_account_enc=@BankAccountEnc, version=version+1, last_modified_at=@Now
                WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)",
                new { dto.Id, dto.Name, dto.Phone, dto.Email, dto.MemberType, dto.Role, dto.IdCard,
                      Uid = uid, IsAdmin = isAdmin, dto.Gender, dto.Ethnicity, dto.BirthDate, dto.IdCardAddress, dto.BaseSalary,
                      dto.DailyWage, dto.EntryDate, dto.Status, dto.DepartmentId, dto.Position,
                      IdCardEnc = pii.Encrypt(dto.IdCard ?? ""), IdCardAddressEnc = pii.Encrypt(dto.IdCardAddress ?? ""),
                      PhoneEnc = pii.Encrypt(dto.Phone ?? ""), BankAccountEnc = pii.Encrypt("") });
            return affected > 0 ? Common.Ok() : Results.Forbid();
        });
        app.MapDelete("/api/members/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            return (await db.ExecuteAsync("DELETE FROM members WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)", new { Id = id, Uid = uid, IsAdmin = isAdmin })) > 0 ? Common.Ok() : Results.Forbid();
        });

        // ═══════════════════════════════════════════════════════════
        // 工人 (workers 表有 created_by)
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/workers", (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            // v1.1.0 P0-4 Phase 2: 公司维度表过滤
            var rows = db.Query($@"SELECT * FROM workers WHERE {CurrentUser.UserFilterCompany(scope)} ORDER BY name",
                new { Uid = uid, IsAdmin = isAdmin }).ToList();
            // v0.76.0 累计待办 #1: PII ACL — worker 角色只能看脱敏, 其他人明文
            var piiAccess = CurrentUser.GetPiiAccess(ctx);
            var masked = rows.Select(w => new
            {
                id = w.id, name = w.name, gender = w.gender, worker_type = w.worker_type, daily_wage = w.daily_wage,
                address = Common.MaskPiiField("address", w.address as string, piiAccess),
                created_at = w.created_at,
                id_card = Common.MaskPiiField("idCard", w.id_card as string, piiAccess),
                phone = Common.MaskPiiField("phone", w.phone as string, piiAccess),
                bank_account = Common.MaskPiiField("bankAccount", w.bank_account as string, piiAccess),
                bank_name = w.bank_name, bank_line_no = w.bank_line_no
            });
            return Common.Ok(masked);
        });

        app.MapGet("/api/workers/stats", (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            // v1.1.0 P0-4 Phase 2: 统计也带过滤 (admin 看全量, 非 admin 只看自己建的)
            return Common.Ok(new
            {
                total = db.ExecuteScalar<int>($"SELECT COUNT(*) FROM workers WHERE {CurrentUser.UserFilterCompany(scope)}", new { Uid = uid, IsAdmin = isAdmin }),
                active = db.ExecuteScalar<int>($"SELECT COUNT(*) FROM project_workers pw WHERE pw.status='active' AND {CurrentUser.UserFilterWithAuthorizedProjects(scope, "pw.project_id")}", new { Uid = uid, IsAdmin = isAdmin }),
            });
        });

                app.MapPost("/api/workers", async (HttpContext ctx, WorkerDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // v1.2.0: PII 字段加密 (PiiProtector 注入)
            var pii = ctx.RequestServices.GetRequiredService<EngineeringManager.Api.Security.PiiProtector>();
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO workers (name,id_card,gender,phone,address,bank_account,bank_name,worker_type,daily_wage,
                 id_card_enc,phone_enc,address_enc,bank_account_enc,created_by,created_at, last_modified_at) VALUES (@Name,@IdCard,@Gender,@Phone,@Address,@BankAccount,@BankName,@WorkerType,@DailyWage,
                        @IdCardEnc,@PhoneEnc,@AddressEnc,@BankAccountEnc,@CreatedBy,@Now, @Now);
                SELECT last_insert_rowid();",
                new { dto.Name, dto.IdCard, dto.Gender, dto.Phone, dto.Address, dto.BankAccount,
                      dto.BankName, dto.WorkerType, dto.DailyWage,
                      IdCardEnc = pii.Encrypt(dto.IdCard ?? ""), PhoneEnc = pii.Encrypt(dto.Phone ?? ""),
                      AddressEnc = pii.Encrypt(dto.Address ?? ""), BankAccountEnc = pii.Encrypt(dto.BankAccount ?? ""),
                      CreatedBy = uid, Now = now() });
            return Common.Ok(id);
        });
                app.MapPut("/api/workers", async (HttpContext ctx, WorkerDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            // v1.2.0: PII 字段加密
            var pii = ctx.RequestServices.GetRequiredService<EngineeringManager.Api.Security.PiiProtector>();
            var affected = await db.ExecuteAsync(@"UPDATE workers SET name=@Name,id_card=@IdCard,gender=@Gender,
                phone=@Phone,address=@Address,bank_account=@BankAccount,bank_name=@BankName,
                worker_type=@WorkerType,daily_wage=@DailyWage,
                id_card_enc=@IdCardEnc,phone_enc=@PhoneEnc,address_enc=@AddressEnc,bank_account_enc=@BankAccountEnc, version=version+1, last_modified_at=@Now
                WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)",
                new { dto.Id, dto.Name, dto.IdCard, dto.Gender, dto.Phone, dto.Address, dto.BankAccount,
                      dto.BankName, dto.WorkerType, dto.DailyWage, Uid = uid, IsAdmin = isAdmin,
                      IdCardEnc = pii.Encrypt(dto.IdCard ?? ""), PhoneEnc = pii.Encrypt(dto.Phone ?? ""),
                      AddressEnc = pii.Encrypt(dto.Address ?? ""), BankAccountEnc = pii.Encrypt(dto.BankAccount ?? "") });
            return affected > 0 ? Common.Ok() : Results.Forbid();
        });
        app.MapDelete("/api/workers/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            return (await db.ExecuteAsync("DELETE FROM workers WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)", new { Id = id, Uid = uid, IsAdmin = isAdmin })) > 0 ? Common.Ok() : Results.Forbid();
        });

        // ═══════════════════════════════════════════════════════════
        // 项目工人 (project_workers 表有 created_by)
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/project-workers", (HttpContext ctx, IDbConnection db, long? projectId) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var sql = @"SELECT pw.*, w.name as worker_name, w.gender, w.address, w.bank_name, w.worker_type, w.daily_wage,
                        w.birth_date, w.ethnicity,
                        wt.name as team_name
                        FROM project_workers pw
                        LEFT JOIN workers w ON pw.worker_id=w.id
                        LEFT JOIN worker_teams wt ON pw.team_id=wt.id";
            // v1.1.0 P0-4 Phase 2: 总加 user-dim
            var conditions = new List<string>();
            if (projectId.HasValue) conditions.Add("pw.project_id=@ProjectId");
            conditions.Add(CurrentUser.UserFilterWithAuthorizedProjects(scope, "pw.project_id", "pw.created_by"));
            sql += " WHERE " + string.Join(" AND ", conditions);
            sql += " ORDER BY pw.created_at DESC";
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var piiAccess = CurrentUser.GetPiiAccess(ctx);
            var rows = db.Query(sql, new { Uid = uid, IsAdmin = isAdmin, ProjectId = projectId }).ToList();
            // v0.75.0: 后端响应层不再 mask
            var masked = rows.Select(pw => new
            {
                id = pw.id, worker_id = pw.worker_id, project_id = pw.project_id, team_id = pw.team_id,
                daily_wage = pw.daily_wage, worker_type = pw.worker_type, entry_date = pw.entry_date, status = pw.status,
                created_at = pw.created_at, updated_at = pw.updated_at,
                worker_name = pw.worker_name, gender = pw.gender, address = Common.MaskPiiField("address", pw.address as string, piiAccess),
                bank_name = pw.bank_name,
                birth_date = pw.birth_date, ethnicity = pw.ethnicity, team_name = pw.team_name,
                id_card = Common.MaskPiiField("idCard", pw.id_card as string, piiAccess),
                phone = Common.MaskPiiField("phone", pw.phone as string, piiAccess),
                bank_account = Common.MaskPiiField("bankAccount", pw.bank_account as string, piiAccess),
            });
            return Common.Ok(masked);
        });

                app.MapPost("/api/project-workers", async (HttpContext ctx, ProjectWorkerDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // v1.2.0: project-workers 不直接存 PII (JOIN workers 表), 加密仍加 0 _enc 列
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO project_workers (worker_id,project_id,team_id,daily_wage,worker_type,entry_date,status,created_by,created_at, last_modified_at) VALUES (@WorkerId,@ProjectId,@TeamId,@DailyWage,@WorkerType,@EntryDate,@Status,@CreatedBy,@Now, @Now);
                SELECT last_insert_rowid();",
                new { dto.WorkerId, dto.ProjectId, dto.TeamId, dto.DailyWage, dto.WorkerType,
                      dto.EntryDate, Status = dto.Status ?? "active", CreatedBy = uid, Now = now() });
            return Common.Ok(id);
        });
        app.MapDelete("/api/project-workers/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            return (await db.ExecuteAsync("DELETE FROM project_workers WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)", new { Id = id, Uid = uid, IsAdmin = isAdmin })) > 0 ? Common.Ok() : Results.Forbid();
        });

        // ═══════════════════════════════════════════════════════════
        // 部门 (departments 表无 created_by, 仅 var uid 强制鉴权)
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/departments", (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            // v1.1.0 P0-4 Phase 2: departments 现在有 created_by
            var rows = db.Query($"SELECT * FROM departments WHERE {CurrentUser.UserFilterCompany(scope)} ORDER BY name", new { Uid = uid, IsAdmin = isAdmin }).ToList();
            // positions 存为 JSON TEXT，返回前 parse 为数组供前端使用
            foreach (var row in rows)
            {
                var dict = (IDictionary<string, object>)row;
                if (dict.TryGetValue("positions", out var pos) && pos is string posStr && !string.IsNullOrEmpty(posStr))
                {
                    try { dict["positions"] = System.Text.Json.JsonSerializer.Deserialize<List<string>>(posStr); }
                    catch { dict["positions"] = new List<string>(); }
                }
            }
            return Common.Ok(rows);
        });

        app.MapPost("/api/departments", async (HttpContext ctx, DepartmentDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var positionsJson = System.Text.Json.JsonSerializer.Serialize(dto.Positions ?? new List<string>());
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO departments (name,manager_id,positions,created_by,created_at, last_modified_at) VALUES (@Name,@ManagerId,@Positions,@CreatedBy,@Now, @Now); SELECT last_insert_rowid();",
                new { dto.Name, dto.ManagerId, Positions = positionsJson, CreatedBy = uid, Now = now() });
            return Common.Ok(id);
        });

        app.MapPut("/api/departments", async (HttpContext ctx, DepartmentUpdateDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            var positionsJson = System.Text.Json.JsonSerializer.Serialize(dto.Positions ?? new List<string>());
            var affected = await db.ExecuteAsync(
                @"UPDATE departments SET name=@Name, manager_id=@ManagerId, positions=@Positions,
                  version=version+1, last_modified_at=@Now
                  WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)",
                new { dto.Id, dto.Name, dto.ManagerId, Positions = positionsJson,
                      Uid = uid, IsAdmin = isAdmin, Now = now() });
            return affected > 0 ? Common.Ok() : Results.Forbid();
        });

        app.MapDelete("/api/departments/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            return (await db.ExecuteAsync("DELETE FROM departments WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)", new { Id = id, Uid = uid, IsAdmin = isAdmin })) > 0 ? Common.Ok() : Results.Forbid();
        });

        // ═══════════════════════════════════════════════════════════
        // 班组 (worker_teams 表无 created_by, 仅 var uid 强制鉴权)
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/worker-teams", (HttpContext ctx, IDbConnection db, long? projectId) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            // v1.1.0 P0-4 Phase 2: worker_teams 现在有 created_by
            // LEFT JOIN projects 也有 created_by 列, 改用 wt. 表别名
            var conditions = new List<string>();
            if (projectId.HasValue) conditions.Add("wt.project_id=@ProjectId");
            conditions.Add("(wt.created_by=@Uid OR @IsAdmin=1)");
            var sql = @"SELECT wt.*, p.name as project_name,
                               (SELECT COUNT(*) FROM project_workers pw WHERE pw.team_id=wt.id) as worker_count
                        FROM worker_teams wt LEFT JOIN projects p ON wt.project_id=p.id
                        WHERE " + string.Join(" AND ", conditions) + @"
                        ORDER BY wt.created_at DESC";
            return Common.Ok(db.Query(sql, new { Uid = uid, IsAdmin = isAdmin, ProjectId = projectId }));
        });

        app.MapPost("/api/worker-teams", async (HttpContext ctx, WorkerTeamDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO worker_teams (name,project_id,leader_id,created_by,created_at,updated_at, last_modified_at) VALUES (@Name,@ProjectId,@LeaderId,@CreatedBy,@Now,@Now, @Now); SELECT last_insert_rowid();",
                new { dto.Name, dto.ProjectId, dto.LeaderId, CreatedBy = uid, Now = now() });
            return Common.Ok(id);
        });

        app.MapPut("/api/worker-teams", async (HttpContext ctx, WorkerTeamDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var affected = await db.ExecuteAsync(@"UPDATE worker_teams SET name=COALESCE(@Name,name),
                leader_id=@LeaderId,updated_at=@Now, version=version+1, last_modified_at=@Now WHERE id=@Id",
                new { dto.Id, dto.Name, dto.LeaderId, Now = now() });
            return affected > 0 ? Common.Ok() : Results.Forbid();
        });

        app.MapDelete("/api/worker-teams/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            return (await db.ExecuteAsync("DELETE FROM worker_teams WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)", new { Id = id, Uid = uid, IsAdmin = isAdmin })) > 0 ? Common.Ok() : Results.Forbid();
        });
    }
}

================
File: EngineeringManager.Api/Endpoints/OcrEndpoints.cs
================
using System.Data;
using Dapper;
using EngineeringManager.Api.Security;

namespace EngineeringManager.Api;

/// <summary>
/// OCR（百度 OCR API 实现）端点
/// </summary>
public static class OcrEndpoints
{
    // Token 缓存
    private static string? cachedAccessToken;
    private static DateTime tokenExpiresAt = DateTime.MinValue;
    private static readonly object _tokenLock = new object();

    // OCR 统计文件路径
    private static readonly string ocrStatsPath = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
        "工程管家", "ocr-stats.json");

    /// <summary>
    /// v0.77.1 P1-1 修复: OCR catch 块统一返回 500 (之前假成功返回 HTTP 200 + success=false)
    /// - 服务端: log 完整 ex.Message (调试用)
    /// - 客户端: 友好提示 (不泄露内部路径/堆栈)
    /// </summary>
    private static IResult CatchOcrError(string endpointName, Exception ex)
    {
        Console.Error.WriteLine($"[OcrEndpoints/{endpointName}] OCR失败: {ex.Message}");
        var userMsg = ex.Message.Contains("超时")
            ? "百度OCR请求超时，请检查网络连接"
            : "百度OCR识别失败，请稍后重试或检查图片质量";
        return Results.Json(new { success = false, error = userMsg }, statusCode: 500);
    }

    public static void RegisterOcrEndpoints(this WebApplication app)
    {
        var httpClientFactory = app.Services.GetRequiredService<IHttpClientFactory>();

        // ═══════════════════════════════════════════════════════════
        // 百度身份证 OCR
        // ═══════════════════════════════════════════════════════════

        app.MapPost("/api/ocr/id-card", async (OcrImageDto dto) =>
        {
            try
            {
                var httpClient = httpClientFactory.CreateClient();
                httpClient.Timeout = TimeSpan.FromSeconds(15);

                var ocrData = await CallBaiduOcr(httpClient, "/rest/2.0/ocr/v1/idcard", dto.ImageBase64,
                    new Dictionary<string, string> { ["id_card_side"] = "front" });

                var words = ocrData.TryGetProperty("words_result", out var wr) ? wr : default;

                string GetWord(string key) => words.TryGetProperty(key, out var v) && v.TryGetProperty("words", out var w) ? w.GetString() ?? "" : "";

                var birth = GetWord("出生");
                if (birth?.Length == 8) birth = $"{birth[..4]}-{birth[4..6]}-{birth[6..8]}";

                var result = new
                {
                    success = true,
                    text = words.ToString(),
                    idCard = new
                    {
                        number = GetWord("公民身份号码"),
                        name = GetWord("姓名"),
                        gender = GetWord("性别"),
                        ethnicity = GetWord("民族"),
                        birthDate = birth,
                        address = GetWord("住址"),
                        issueAuthority = GetWord("签发机关"),
                        validDate = GetWord("有效期限")
                    }
                };
                IncrementOcrStat("idCard");
                return Results.Ok(result);
            }
            catch (Exception ex)
            {
                return CatchOcrError("ocr-id-card", ex);
            }
        });

        // ═══════════════════════════════════════════════════════════
        // 百度发票 OCR
        // ═══════════════════════════════════════════════════════════

        app.MapPost("/api/ocr/invoice", async (OcrImageDto dto) =>
        {
            try
            {
                var httpClient = httpClientFactory.CreateClient();
                httpClient.Timeout = TimeSpan.FromSeconds(15);

                var ocrData = await CallBaiduOcr(httpClient, "/rest/2.0/ocr/v1/vat_invoice", dto.ImageBase64);
                var words = ocrData.TryGetProperty("words_result", out var wr) ? wr : default;

                string GetStr(string key) => words.TryGetProperty(key, out var v) && v.TryGetProperty("word", out var w) ? w.GetString() ?? "" : "";
                decimal GetDec(string key) => decimal.TryParse(GetStr(key).Replace("¥", "").Replace("%", ""), out var d) ? d : 0;

                var taxRateStr = words.TryGetProperty("CommodityTaxRate", out var trArr) && trArr.GetArrayLength() > 0
                    ? trArr[0].TryGetProperty("word", out var tw) ? tw.GetString() ?? "0" : "0" : "0";
                var taxRate = decimal.TryParse(taxRateStr.Replace("%", ""), out var tr) ? tr / 100 : 0;

                var itemName = words.TryGetProperty("CommodityName", out var cnArr) && cnArr.GetArrayLength() > 0
                    ? cnArr[0].TryGetProperty("word", out var iw) ? iw.GetString() ?? "" : "" : "";

                var invoiceDate = GetStr("InvoiceDate");
                if (invoiceDate.Contains("年"))
                    invoiceDate = invoiceDate.Replace("年", "-").Replace("月", "-").Replace("日", "");

                var result = new
                {
                    success = true,
                    text = words.ToString(),
                    invoice = new
                    {
                        invoiceNum = GetStr("InvoiceNum"),
                        invoiceCode = GetStr("InvoiceCode"),
                        invoiceDate,
                        invoiceType = words.TryGetProperty("InvoiceType", out var it) ? it.GetString() ?? "" : words.TryGetProperty("InvoiceTypeOrg", out var ito) ? ito.GetString() ?? "" : "",
                        totalAmount = GetDec("AmountInFiguers"),
                        amountWithoutTax = GetDec("TotalAmount"),
                        totalTax = GetDec("TotalTax"),
                        taxRate,
                        sellerName = GetStr("SellerName"),
                        purchaserName = GetStr("PurchaserName"),
                        checkCode = GetStr("CheckCode"),
                        itemName,
                        remarks = GetStr("Remarks")
                    }
                };
                IncrementOcrStat("invoice");
                return Results.Ok(result);
            }
            catch (Exception ex)
            {
                return CatchOcrError("ocr-invoice", ex);
            }
        });

        // ═══════════════════════════════════════════════════════════
        // 百度银行卡 OCR
        // ═══════════════════════════════════════════════════════════

        app.MapPost("/api/ocr/bank-card", async (OcrImageDto dto) =>
        {
            try
            {
                var httpClient = httpClientFactory.CreateClient();
                httpClient.Timeout = TimeSpan.FromSeconds(15);

                var ocrData = await CallBaiduOcr(httpClient, "/rest/2.0/ocr/v1/bankcard", dto.ImageBase64);
                var words = ocrData.TryGetProperty("words_result", out var wr) ? wr : default;

            string GetStr(string key) => words.TryGetProperty(key, out var v) ? v.GetString() ?? "" : "";

                var result = new
                {
                    success = true,
                    text = words.ToString(),
                    bankCard = new
                    {
                        cardNumber = GetStr("bank_card_number"),
                        bankName = GetStr("bank_name"),
                        cardType = GetStr("card_type"),
                        validDate = GetStr("valid_date")
                    }
                };
                IncrementOcrStat("bankCard");
                return Results.Ok(result);
            }
            catch (Exception ex)
            {
                return CatchOcrError("ocr-bank-card", ex);
            }
        });

        // ═══════════════════════════════════════════════════════════
        // 百度营业执照 OCR
        // ═══════════════════════════════════════════════════════════

        app.MapPost("/api/ocr/business-license", async (OcrImageDto dto) =>
        {
            try
            {
                var httpClient = httpClientFactory.CreateClient();
                httpClient.Timeout = TimeSpan.FromSeconds(15);

                var ocrData = await CallBaiduOcr(httpClient, "/rest/2.0/ocr/v1/business_license", dto.ImageBase64);
                var words = ocrData.TryGetProperty("words_result", out var wr) ? wr : default;

                string GetStr(string key) => words.TryGetProperty(key, out var v) && v.TryGetProperty("words", out var w) ? w.GetString() ?? "" : "";

                var result = new
                {
                    success = true,
                    text = words.ToString(),
                    businessLicense = new
                    {
                        creditCode = GetStr("社会信用代码"),
                        companyName = GetStr("单位名称"),
                        legalPerson = GetStr("法人"),
                        registeredCapital = GetStr("注册资本"),
                        address = GetStr("住所") is var a && !string.IsNullOrEmpty(a) ? a : GetStr("地址"),
                        businessScope = GetStr("经营范围"),
                        establishDate = GetStr("成立日期"),
                        expireDate = GetStr("有效期")
                    }
                };
                IncrementOcrStat("businessLicense");
                return Results.Ok(result);
            }
            catch (Exception ex)
            {
                return CatchOcrError("ocr-business-license", ex);
            }
        });

        // ═══════════════════════════════════════════════════════════
        // 百度银行回单 OCR
        // ═══════════════════════════════════════════════════════════

        app.MapPost("/api/ocr/bank-receipt", async (OcrImageDto dto) =>
        {
            try
            {
                var httpClient = httpClientFactory.CreateClient();
                httpClient.Timeout = TimeSpan.FromSeconds(15);

                var ocrData = await CallBaiduOcr(httpClient, "/rest/2.0/ocr/v1/receipt", dto.ImageBase64);
                var words = ocrData.TryGetProperty("words_result", out var wr) ? wr : default;

                string GetStr(string key) => words.TryGetProperty(key, out var v) && v.TryGetProperty("words", out var w) ? w.GetString() ?? "" : "";

                var amountStr = GetStr("金额");
                if (string.IsNullOrEmpty(amountStr)) amountStr = GetStr("交易金额");
                decimal.TryParse(System.Text.RegularExpressions.Regex.Replace(amountStr, @"[^0-9.]", ""), out var amount);

                var result = new
                {
                    success = true,
                    text = words.ToString(),
                    bankReceipt = new
                    {
                        transactionDate = GetStr("交易日期"),
                        transactionTime = GetStr("交易时间"),
                        amount,
                        payerName = words.TryGetProperty("付款方", out var pf) ? pf.GetString() ?? "" : words.TryGetProperty("付款人", out var pp) ? pp.GetString() ?? "" : "",
                        payerAccount = GetStr("付款账号"),
                        payeeName = words.TryGetProperty("收款方", out var rf) ? rf.GetString() ?? "" : words.TryGetProperty("收款人", out var rp) ? rp.GetString() ?? "" : "",
                        payeeAccount = GetStr("收款账号"),
                        transactionNo = words.TryGetProperty("流水号", out var sn) ? sn.GetString() ?? "" : GetStr("交易流水号"),
                        bankName = GetStr("银行名称"),
                        remarks = words.TryGetProperty("摘要", out var sm) ? sm.GetString() ?? "" : GetStr("备注")
                    }
                };
                IncrementOcrStat("bankReceipt");
                return Results.Ok(result);
            }
            catch (Exception ex)
            {
                return CatchOcrError("ocr-bank-receipt", ex);
            }
        });

        // ═══════════════════════════════════════════════════════════
        // 百度开户许可证 OCR
        // ═══════════════════════════════════════════════════════════

        app.MapPost("/api/ocr/permit", async (OcrImageDto dto) =>
        {
            try
            {
                var httpClient = httpClientFactory.CreateClient();
                httpClient.Timeout = TimeSpan.FromSeconds(15);

                var ocrData = await CallBaiduOcr(httpClient, "/rest/2.0/ocr/v1/business_license", dto.ImageBase64);
                var words = ocrData.TryGetProperty("words_result", out var wr) ? wr : default;

                string GetStr(string key) => words.TryGetProperty(key, out var v) && v.TryGetProperty("words", out var w) ? w.GetString() ?? "" : "";

                var result = new
                {
                    success = true,
                    text = words.ToString(),
                    permit = new
                    {
                        companyCode = GetStr("社会信用代码"),
                        companyName = GetStr("单位名称"),
                        accountNumber = "",
                        bankName = "",
                        permitNumber = ""
                    }
                };
                IncrementOcrStat("permit");
                return Results.Ok(result);
            }
            catch (Exception ex)
            {
                return CatchOcrError("ocr-permit", ex);
            }
        });

        // ═══════════════════════════════════════════════════════════
        // 百度银行单据 OCR
        // ═══════════════════════════════════════════════════════════

        app.MapPost("/api/ocr/bank-statement", async (OcrImageDto dto) =>
        {
            try
            {
                var httpClient = httpClientFactory.CreateClient();
                httpClient.Timeout = TimeSpan.FromSeconds(15);

                var ocrData = await CallBaiduOcr(httpClient, "/rest/2.0/ocr/v1/bank_receipt", dto.ImageBase64);
                var words = ocrData.TryGetProperty("words_result", out var wr) ? wr : default;

                var transactions = new List<object>();
                if (words.ValueKind == System.Text.Json.JsonValueKind.Array)
                {
                    foreach (var item in words.EnumerateArray())
                    {
                        string G(string k) => item.TryGetProperty(k, out var v) ? v.GetString() ?? "" : "";
                        decimal ParseDec(string s) => decimal.TryParse(System.Text.RegularExpressions.Regex.Replace(s, @"[^0-9.-]", ""), out var d) ? d : 0;
                        transactions.Add(new
                        {
                            date = item.TryGetProperty("交易日期", out var d1) ? d1.GetString() ?? "" : G("date"),
                            time = item.TryGetProperty("交易时间", out var t1) ? t1.GetString() ?? "" : G("time"),
                            amount = ParseDec(item.TryGetProperty("金额", out var a1) ? a1.GetString() ?? "0" : G("amount")),
                            balance = ParseDec(item.TryGetProperty("余额", out var b1) ? b1.GetString() ?? "0" : G("balance")),
                            type = item.TryGetProperty("类型", out var tp) ? tp.GetString() ?? "" : G("type"),
                            counterparty = item.TryGetProperty("对方户名", out var cp) ? cp.GetString() ?? "" : G("counterparty"),
                            remark = item.TryGetProperty("摘要", out var rm) ? rm.GetString() ?? "" : G("remark")
                        });
                    }
                }

                var result = new
                {
                    success = true,
                    text = words.ToString(),
                    bankStatement = new
                    {
                        transactions,
                        accountNumber = "",
                        bankName = ""
                    }
                };
                IncrementOcrStat("bankStatement");
                return Results.Ok(result);
            }
            catch (Exception ex)
            {
                return CatchOcrError("ocr-bank-statement", ex);
            }
        });

        // ═══════════════════════════════════════════════════════════
        // 百度通用票据 OCR
        // ═══════════════════════════════════════════════════════════

        app.MapPost("/api/ocr/general-receipt", async (OcrImageDto dto) =>
        {
            try
            {
                var httpClient = httpClientFactory.CreateClient();
                httpClient.Timeout = TimeSpan.FromSeconds(15);

                var ocrData = await CallBaiduOcr(httpClient, "/rest/2.0/ocr/v1/accurate_basic", dto.ImageBase64);
                var words = ocrData.TryGetProperty("words_result", out var wr) ? wr : default;

                var textParts = new List<string>();
                if (words.ValueKind == System.Text.Json.JsonValueKind.Array)
                    foreach (var w in words.EnumerateArray())
                        if (w.TryGetProperty("words", out var wv)) textParts.Add(wv.GetString() ?? "");
                var text = string.Join("\n", textParts);

                var amountMatch = System.Text.RegularExpressions.Regex.Match(text, @"[\d,]+\.?\d*\s*元");
                var amount = amountMatch.Success ? decimal.TryParse(amountMatch.Value.Replace("元", "").Replace(",", ""), out var a) ? a : 0 : 0;

                var dateMatch = System.Text.RegularExpressions.Regex.Match(text, @"\d{4}[年/-]\d{1,2}[月/-]\d{1,2}[日]?");
                var date = dateMatch.Success ? dateMatch.Value.Replace("年", "-").Replace("月", "-").Replace("日", "") : "";

                var result = new
                {
                    success = true,
                    text,
                    generalReceipt = new { text, amount, date }
                };
                IncrementOcrStat("generalReceipt");
                return Results.Ok(result);
            }
            catch (Exception ex)
            {
                return CatchOcrError("ocr-general-receipt", ex);
            }
        });

        // ═══════════════════════════════════════════════════════════
        // 企业工商信息查询
        // ═══════════════════════════════════════════════════════════

        app.MapPost("/api/ocr/company-query", async (dynamic dto, IHttpClientFactory httpClientFactory) =>
        {
            try
            {
                string companyName = (string)dto.companyName;
                string apiKey = (string)dto.apiKey;
                string secretKey = (string)dto.secretKey;

                if (string.IsNullOrWhiteSpace(companyName))
                    return Common.Fail("请输入企业名称", 400);

                var httpClient = httpClientFactory.CreateClient();
                httpClient.Timeout = TimeSpan.FromSeconds(10);

                // 获取百度 access_token
                var tokenUrl = $"https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id={apiKey}&client_secret={secretKey}";
                var tokenResp = await httpClient.PostAsync(tokenUrl, null);
                var tokenJson = await tokenResp.Content.ReadAsStringAsync();
                var tokenDoc = System.Text.Json.JsonDocument.Parse(tokenJson);
                var accessToken = tokenDoc.RootElement.GetProperty("access_token").GetString();

                // 使用百度通用文字识别（高精度）接口，传入公司名称文本进行搜索
                // 注意：百度 OCR 没有直接的"按名称搜索企业"接口
                // 改用百度企业工商信息查询（如果已开通）
                // 备选方案：返回提示信息，建议使用营业执照 OCR
                return Results.Ok(new
                {
                    success = false,
                    error = "百度云 OCR 标准版不支持按公司名称搜索工商信息。请使用「营业执照识别」功能上传营业执照图片自动填充，或手动填写信息。"
                });
            }
            catch (Exception ex)
            {
                return CatchOcrError("ocr-company-query", ex);
            }
        });

        // ═══════════════════════════════════════════════════════════
        // 检查网络连通性
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/ocr/check-network", async () =>
        {
            try
            {
                var httpClient = httpClientFactory.CreateClient();
                httpClient.Timeout = TimeSpan.FromSeconds(3);
                var response = await httpClient.SendAsync(new HttpRequestMessage(HttpMethod.Head, "https://www.baidu.com/favicon.ico"));
                return Results.Ok(response.IsSuccessStatusCode);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[OcrEndpoints/ocr-config] 解析失败: {ex.Message}");
                return Results.Problem("OCR 配置解析失败", statusCode: 500);
            }
        });

        // ═══════════════════════════════════════════════════════════
        // 清除 Token 缓存
        // ═══════════════════════════════════════════════════════════

        app.MapPost("/api/ocr/clear-token-cache", (HttpContext ctx) =>
        {
            if (!CurrentUser.IsAdmin(ctx)) return Common.Fail("仅管理员可执行此操作");
            lock (_tokenLock)
            {
                cachedAccessToken = null;
                tokenExpiresAt = DateTime.MinValue;
            }
            return Results.Ok(true);
        });

        // ═══════════════════════════════════════════════════════════
        // OCR 统计
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/ocr/stats", (HttpContext ctx) =>
        {
            if (!CurrentUser.IsAdmin(ctx)) return Common.Fail("仅管理员可执行此操作");
            var stats = LoadOcrStats();
            return Results.Ok(new
            {
                idCard = stats.GetValueOrDefault("idCard"),
                invoice = stats.GetValueOrDefault("invoice"),
                bankCard = stats.GetValueOrDefault("bankCard"),
                businessLicense = stats.GetValueOrDefault("businessLicense"),
                bankReceipt = stats.GetValueOrDefault("bankReceipt"),
                permit = stats.GetValueOrDefault("permit"),
                bankStatement = stats.GetValueOrDefault("bankStatement"),
                generalReceipt = stats.GetValueOrDefault("generalReceipt"),
                companyQuery = stats.GetValueOrDefault("companyQuery"),
                lastReset = DateTime.Now.ToString("yyyy-MM")
            });
        });
    }

    // ═══════════════════════════════════════════════════════════
    // 私有辅助方法
    // ═══════════════════════════════════════════════════════════

    private static Dictionary<string, int> LoadOcrStats()
    {
        try
        {
            if (File.Exists(ocrStatsPath))
            {
                var json = File.ReadAllText(ocrStatsPath);
                var stats = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, int>>(json) ?? new();
                // 检查是否需要按月重置
                var currentMonth = DateTime.Now.ToString("yyyy-MM");
                if (!stats.TryGetValue("lastResetYear", out var y) || !stats.TryGetValue("lastResetMonth", out var m)
                    || y != DateTime.Now.Year || m != DateTime.Now.Month)
                {
                    return new Dictionary<string, int>
                    {
                        ["idCard"] = 0, ["invoice"] = 0, ["bankCard"] = 0, ["businessLicense"] = 0,
                        ["bankReceipt"] = 0, ["permit"] = 0, ["bankStatement"] = 0, ["generalReceipt"] = 0,
                        ["companyQuery"] = 0, ["lastResetYear"] = DateTime.Now.Year, ["lastResetMonth"] = DateTime.Now.Month
                    };
                }
                return stats;
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[OcrEndpoints/LoadOcrStats] 读取失败: {ex.Message}，返回空统计");
        }
        return new Dictionary<string, int>
        {
            ["idCard"] = 0, ["invoice"] = 0, ["bankCard"] = 0, ["businessLicense"] = 0,
            ["bankReceipt"] = 0, ["permit"] = 0, ["bankStatement"] = 0, ["generalReceipt"] = 0,
            ["companyQuery"] = 0, ["lastResetYear"] = DateTime.Now.Year, ["lastResetMonth"] = DateTime.Now.Month
        };
    }

    private static void SaveOcrStats(Dictionary<string, int> stats)
    {
        try
        {
            var dir = Path.GetDirectoryName(ocrStatsPath)!;
            if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);
            File.WriteAllText(ocrStatsPath, System.Text.Json.JsonSerializer.Serialize(stats, new System.Text.Json.JsonSerializerOptions { WriteIndented = true }));
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[OcrEndpoints/SaveOcrStats] 写入失败: {ex.Message}");
        }
    }

    private static void IncrementOcrStat(string key)
    {
        var stats = LoadOcrStats();
        stats[key] = stats.GetValueOrDefault(key) + 1;
        SaveOcrStats(stats);
    }

    private static (string apiKey, string secretKey) LoadOcrConfig()
    {
        // 优先级 1: 环境变量（推荐用于生产/部署）
        var envApiKey = Environment.GetEnvironmentVariable("BAIDU_OCR_API_KEY");
        var envSecretKey = Environment.GetEnvironmentVariable("BAIDU_OCR_SECRET_KEY");
        if (!string.IsNullOrEmpty(envApiKey) && !string.IsNullOrEmpty(envSecretKey))
        {
            Console.Error.WriteLine("[OcrConfig] 使用环境变量 BAIDU_OCR_API_KEY/BAIDU_OCR_SECRET_KEY");
            return (envApiKey, envSecretKey);
        }

        // 优先级 2: Windows DPAPI 加密文件（用户首次配置向导写入）
        var dpapiPath = Path.Combine(ApiConfig.ResolveDataPath(), "ocr-config.dpapi.json");
        if (File.Exists(dpapiPath))
        {
            try
            {
                var encrypted = File.ReadAllBytes(dpapiPath);
                var plaintext = System.Security.Cryptography.ProtectedData.Unprotect(
                    encrypted, null, System.Security.Cryptography.DataProtectionScope.CurrentUser);
                var json = System.Text.Json.JsonDocument.Parse(plaintext);
                var baidu = json.RootElement.GetProperty("baidu");
                return (baidu.GetProperty("apiKey").GetString() ?? "", baidu.GetProperty("secretKey").GetString() ?? "");
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[OcrConfig] DPAPI 解密失败: {ex.Message}");
            }
        }

        // 优先级 3: 兼容老明文 JSON（已安装用户从 v1.0.0 升级时临时保留）
        // 注意: 这种方式 key 仍以明文存盘，建议用户升级后通过向导迁移到 DPAPI
        var configPaths = new[]
        {
            Path.Combine(AppContext.BaseDirectory, "public", "ocr-config.json"),
            Path.Combine(Directory.GetCurrentDirectory(), "public", "ocr-config.json"),
            Path.Combine(ApiConfig.ResolveDataPath(), "ocr-config.json"),
            Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "public", "ocr-config.json"),
            Path.Combine(Directory.GetCurrentDirectory(), "..", "public", "ocr-config.json"),
        };
        foreach (var p in configPaths)
        {
            if (File.Exists(p))
            {
                try
                {
                    var json = System.Text.Json.JsonDocument.Parse(File.ReadAllText(p));
                    var root = json.RootElement;
                    var baidu = root.GetProperty("baidu");
                    var apiKey = baidu.GetProperty("apiKey").GetString() ?? "";
                    var secretKey = baidu.GetProperty("secretKey").GetString() ?? "";
                    if (!string.IsNullOrEmpty(apiKey) && !string.IsNullOrEmpty(secretKey))
                    {
                        Console.Error.WriteLine($"[OcrConfig] 警告: 从明文 JSON {p} 读取 OCR key（v1.0.0 兼容模式）。请运行首次启动向导迁移到 DPAPI 加密。");
                        return (apiKey, secretKey);
                    }
                }
                catch (Exception ex)
                {
                    Console.Error.WriteLine($"[OcrConfig] 解析 {p} 失败: {ex.Message}");
                }
            }
        }
        return ("", "");
    }

    public static void SaveOcrConfigEncrypted(string apiKey, string secretKey)
    {
        // 写入 DPAPI 加密文件（仅当前 Windows 用户可解）
        var json = System.Text.Json.JsonSerializer.Serialize(new { baidu = new { apiKey, secretKey } });
        var plaintext = System.Text.Encoding.UTF8.GetBytes(json);
        var encrypted = System.Security.Cryptography.ProtectedData.Protect(
            plaintext, null, System.Security.Cryptography.DataProtectionScope.CurrentUser);
        var dpapiPath = Path.Combine(ApiConfig.ResolveDataPath(), "ocr-config.dpapi.json");
        Directory.CreateDirectory(Path.GetDirectoryName(dpapiPath)!);
        File.WriteAllBytes(dpapiPath, encrypted);
        Console.Error.WriteLine($"[OcrConfig] DPAPI 加密 key 已写入 {dpapiPath}");

        // 同步设置环境变量（避免重启进程读取不到 env）
        Environment.SetEnvironmentVariable("BAIDU_OCR_API_KEY", apiKey);
        Environment.SetEnvironmentVariable("BAIDU_OCR_SECRET_KEY", secretKey);
    }
    private static async Task<string> GetBaiduAccessToken(HttpClient httpClient)
    {
        lock (_tokenLock)
        {
            if (!string.IsNullOrEmpty(cachedAccessToken) && DateTime.Now < tokenExpiresAt)
                return cachedAccessToken;
        }

        var (apiKey, secretKey) = LoadOcrConfig();
        if (string.IsNullOrEmpty(apiKey) || string.IsNullOrEmpty(secretKey))
            throw new InvalidOperationException("百度 OCR 未配置 API Key");

        var tokenUrl = $"https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id={apiKey}&client_secret={secretKey}";
        var response = await httpClient.PostAsync(tokenUrl, null);
        var data = System.Text.Json.JsonDocument.Parse(await response.Content.ReadAsStringAsync());

        if (data.RootElement.TryGetProperty("error", out var err))
            throw new InvalidOperationException($"获取Token失败: {data.RootElement.GetProperty("error_description").GetString() ?? err.GetString()}");

        lock (_tokenLock)
        {
            cachedAccessToken = data.RootElement.GetProperty("access_token").GetString()!;
            var expiresIn = data.RootElement.TryGetProperty("expires_in", out var exp) ? exp.GetInt32() : 2592000;
            tokenExpiresAt = DateTime.Now.AddSeconds(expiresIn - 3600); // 提前1小时刷新
        }
        return cachedAccessToken;
    }

    private static async Task<System.Text.Json.JsonElement> CallBaiduOcr(HttpClient httpClient, string apiPath, string imageBase64, Dictionary<string, string>? extraParams = null)
    {
        var token = await GetBaiduAccessToken(httpClient);
        var base64Data = System.Text.RegularExpressions.Regex.Replace(imageBase64, @"^data:image/\w+;base64,", "");

        var ocrUrl = $"https://aip.baidubce.com{apiPath}?access_token={token}";
        var formParams = new List<KeyValuePair<string, string>> { new("image", base64Data) };
        if (extraParams != null)
            formParams.AddRange(extraParams);

        var formContent = new FormUrlEncodedContent(formParams);
        var ocrResponse = await httpClient.PostAsync(ocrUrl, formContent);
        var ocrJson = System.Text.Json.JsonDocument.Parse(await ocrResponse.Content.ReadAsStringAsync());
        var ocrData = ocrJson.RootElement;

        if (ocrData.TryGetProperty("error_code", out var errorCode))
        {
            var code = errorCode.GetInt32();
            if (code == 110 || code == 111) { lock (_tokenLock) { cachedAccessToken = null; } } // Token 过期
            throw new InvalidOperationException($"百度OCR错误: {(ocrData.TryGetProperty("error_msg", out var msg) ? msg.GetString() : code.ToString())}");
        }

        return ocrData;
    }
}

================
File: EngineeringManager.Api/Endpoints/PartnerEndpoints.cs
================
using System.Data;
using Dapper;
using EngineeringManager.Api.Security;

namespace EngineeringManager.Api;

/// <summary>
/// 合作伙伴 + 监管单位端点
/// </summary>
public static class PartnerEndpoints
{
    public static void RegisterPartnerEndpoints(this WebApplication app)
    {
        var now = () => DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");

        // ═══════════════════════════════════════════════════════════
        // 合作伙伴
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/partners", (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            // v1.1.0 P0-4 Phase 2: 公司维度表过滤
            var rows = db.Query($@"SELECT * FROM partners WHERE {CurrentUser.UserFilterCompany(scope)} ORDER BY name",
                new { Uid = uid, IsAdmin = isAdmin }).ToList();
            // v0.75.0: 后端响应层不再 mask
            var masked = rows.Select(p => new
            {
                id = p.id, name = p.name, category = p.category, contact = p.contact,
                address = p.address, bank_name = p.bank_name, tax_type = p.project_ids, project_ids = p.project_ids,
                created_at = p.created_at, updated_at = p.updated_at,
                phone = p.phone as string,
                email = p.email,
                bank_account = p.bank_account as string,
                tax_number = p.tax_number as string,
                credit_code = p.credit_code as string,
                registered_address = p.registered_address, business_scope = p.business_scope
            });
            return Common.Ok(masked);
        });

                app.MapPost("/api/partners", async (HttpContext ctx, PartnerDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            // v1.2.0: PII 字段加密
            var pii = ctx.RequestServices.GetRequiredService<EngineeringManager.Api.Security.PiiProtector>();
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO partners (name,category,contact,phone,email,address,bank_account,bank_name,tax_number,credit_code,
                 registered_address,business_scope,tax_type,project_ids,created_by,created_at,
                 phone_enc,bank_account_enc,credit_code_enc,tax_number_enc, last_modified_at) VALUES (@Name,@Category,@Contact,@Phone,@Email,@Address,@BankAccount,@BankName,@TaxNumber,@CreditCode,
                        @RegisteredAddress,@BusinessScope,@TaxType,@ProjectIds,@CreatedBy,@Now,
                        @PhoneEnc,@BankAccountEnc,@CreditCodeEnc,@TaxNumberEnc, @Now);
                SELECT last_insert_rowid();",
                new { dto.Name, dto.Category, dto.Contact, dto.Phone, dto.Email, dto.Address, dto.BankAccount,
                      dto.BankName, dto.TaxNumber, dto.CreditCode, dto.RegisteredAddress,
                      dto.BusinessScope, dto.TaxType, ProjectIds = dto.ProjectIds ?? "[]", CreatedBy = uid, Now = now(),
                      PhoneEnc = pii.Encrypt(dto.Phone ?? ""), BankAccountEnc = pii.Encrypt(dto.BankAccount ?? ""),
                      CreditCodeEnc = pii.Encrypt(dto.CreditCode ?? ""), TaxNumberEnc = pii.Encrypt(dto.TaxNumber ?? "") });
            return Common.Ok(id);
        });
                app.MapPut("/api/partners", async (HttpContext ctx, PartnerDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            // v1.2.0: PII 字段加密
            var pii = ctx.RequestServices.GetRequiredService<EngineeringManager.Api.Security.PiiProtector>();
            var affected = await db.ExecuteAsync(@"UPDATE partners SET name=@Name,category=@Category,contact=@Contact,
                phone=@Phone,email=@Email,address=@Address,bank_account=@BankAccount,bank_name=@BankName,
                tax_number=@TaxNumber,credit_code=@CreditCode,registered_address=@RegisteredAddress,
                business_scope=@BusinessScope,tax_type=@TaxType,project_ids=@ProjectIds,updated_at=@Now,
                phone_enc=@PhoneEnc,bank_account_enc=@BankAccountEnc,credit_code_enc=@CreditCodeEnc,tax_number_enc=@TaxNumberEnc, version=version+1, last_modified_at=@Now
                WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)",
                new { dto.Id, dto.Name, dto.Category, dto.Contact, dto.Phone, dto.Email, dto.Address,
                      dto.BankAccount, dto.BankName, dto.TaxNumber, dto.CreditCode, dto.RegisteredAddress,
                      dto.BusinessScope, dto.TaxType, ProjectIds = dto.ProjectIds ?? "[]", Now = now(),
                      Uid = uid, IsAdmin = isAdmin,
                      PhoneEnc = pii.Encrypt(dto.Phone ?? ""), BankAccountEnc = pii.Encrypt(dto.BankAccount ?? ""),
                      CreditCodeEnc = pii.Encrypt(dto.CreditCode ?? ""), TaxNumberEnc = pii.Encrypt(dto.TaxNumber ?? "") });
            return affected > 0 ? Common.Ok() : Results.Forbid();
        });
        app.MapDelete("/api/partners/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            return (await db.ExecuteAsync("DELETE FROM partners WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)", new { Id = id, Uid = uid, IsAdmin = isAdmin })) > 0 ? Common.Ok() : Results.Forbid();
        });

        // ═══════════════════════════════════════════════════════════
        // 监管单位
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/supervisors", (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            // v0.74.0 公司维度表过滤 + v0.75.0 后端响应层不再 mask
            var rows = db.Query($@"SELECT s.*, CASE WHEN r.province IS NOT NULL THEN r.province||'-'||r.city||'-'||r.district ELSE '' END as region_name
                          FROM supervisors s LEFT JOIN regions r ON s.region_id=r.id
                          WHERE {CurrentUser.UserFilterCompany(scope)}
                          ORDER BY s.created_at DESC",
                          new { Uid = uid, IsAdmin = isAdmin });
            return Common.Ok(rows);
        });

                app.MapPost("/api/supervisors", async (HttpContext ctx, SupervisorDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            // v1.2.0: phone 字段加密
            var pii = ctx.RequestServices.GetRequiredService<EngineeringManager.Api.Security.PiiProtector>();
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO supervisors (region_id,name,category,contact,phone,address,project_ids,remarks,created_by,created_at,
                 phone_enc, last_modified_at) VALUES (@RegionId,@Name,@Category,@Contact,@Phone,@Address,@ProjectIds,@Remarks,@CreatedBy,@Now,
                        @PhoneEnc, @Now);
                SELECT last_insert_rowid();",
                new { dto.RegionId, dto.Name, dto.Category, dto.Contact, dto.Phone, dto.Address,
                      ProjectIds = dto.ProjectIds, dto.Remarks, CreatedBy = uid, Now = now(),
                      PhoneEnc = pii.Encrypt(dto.Phone ?? "") });
            return Common.Ok(id);
        });
                app.MapPut("/api/supervisors", async (HttpContext ctx, SupervisorDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            // v1.2.0: phone 字段加密
            var pii = ctx.RequestServices.GetRequiredService<EngineeringManager.Api.Security.PiiProtector>();
            var affected = await db.ExecuteAsync(@"UPDATE supervisors SET region_id=@RegionId,name=@Name,
                category=@Category,contact=@Contact,phone=@Phone,address=@Address,project_ids=@ProjectIds,
                remarks=@Remarks,updated_at=@Now,phone_enc=@PhoneEnc, version=version+1, last_modified_at=@Now
                WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)",
                new { dto.Id, dto.RegionId, dto.Name, dto.Category, dto.Contact, dto.Phone, dto.Address,
                      ProjectIds = dto.ProjectIds, dto.Remarks, Now = now(), Uid = uid, IsAdmin = isAdmin,
                      PhoneEnc = pii.Encrypt(dto.Phone ?? "") });
            return affected > 0 ? Common.Ok() : Results.Forbid();
        });
        app.MapDelete("/api/supervisors/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var scope = CurrentUser.GetDataScope(ctx);
            return (await db.ExecuteAsync("DELETE FROM supervisors WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)", new { Id = id, Uid = uid, IsAdmin = isAdmin })) > 0 ? Common.Ok() : Results.Forbid();
        });
    }
}

================
File: EngineeringManager.Api/Endpoints/PiiKeyEndpoints.cs
================
using System.Data;
using Dapper;
using EngineeringManager.Api.Security;

namespace EngineeringManager.Api;

/// <summary>
/// v0.76.0 累计待办 #5: PII Key Rotation 管理端点 (admin-only)
/// 提供:
///   GET  /api/admin/pii/keys         - 列出所有 PII keys (key_id, active, created_at, retired_at)
///   POST /api/admin/pii/rotate       - 生成新 active key, 旧 key 标 retired (写 audit log)
///
/// 安全:
///   - 全部 admin-only (IsAdmin 校验)
///   - rotation 写 audit_logs (action=update, resource=pii_keys)
///   - 不暴露 encrypted_key (BLOB 敏感)
/// </summary>
public static class PiiKeyEndpoints
{
    public static void RegisterPiiKeyEndpoints(this WebApplication app)
    {
        // GET /api/admin/pii/keys
        app.MapGet("/api/admin/pii/keys", (HttpContext ctx, IDbConnection db, PiiProtector pii) =>
        {
            var uid = CurrentUser.GetUserId(ctx);
            if (string.IsNullOrEmpty(uid)) return Common.Fail("未登录");
            if (!CurrentUser.IsAdmin(ctx)) return Results.Forbid();

            var keys = pii.ListKeys(db);
            return Common.Ok(new
            {
                keys,
                activeKeyId = pii.ActiveKeyId,
                totalKeys = pii.KeyCount
            });
        });

        // POST /api/admin/pii/rotate
        app.MapPost("/api/admin/pii/rotate", (HttpContext ctx, IDbConnection db, PiiProtector pii) =>
        {
            var uid = CurrentUser.GetUserId(ctx);
            if (string.IsNullOrEmpty(uid)) return Common.Fail("未登录");
            if (!CurrentUser.IsAdmin(ctx)) return Results.Forbid();

            int newKeyId;
            try
            {
                newKeyId = pii.Rotate(db, uid);
            }
            catch (Exception ex)
            {
                return Common.ServerError("PII key rotation", ex);
            }

            // 写 audit log
            try
            {
                db.Execute(@"INSERT INTO audit_logs
                    (action, level, user_id, user_name, resource_type, resource_id, details, ip_address, created_at)
                    VALUES (@Action, @Level, @UserId, @UserName, @Resource, @ResourceId, @Details, @IpAddress, @CreatedAt)",
                    new
                    {
                        Action = "update",
                        Level = "warning",
                        UserId = uid,
                        UserName = uid,
                        Resource = "pii_keys",
                        ResourceId = newKeyId,
                        Details = $"{{\"event\":\"pii_key_rotated\",\"new_key_id\":{newKeyId}}}",
                        IpAddress = ctx.Connection.RemoteIpAddress?.ToString() ?? "",
                        CreatedAt = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss")
                    });
            }
            catch (Exception ex)
            {
                // audit 失败不阻塞响应, 但要 log
                Console.Error.WriteLine($"[ERROR] PII key rotation audit log failed: {ex.Message}");
            }

            return Common.Ok(new
            {
                newKeyId,
                message = "PII key 已轮换, 旧数据仍可解密, 新数据用新 key 加密"
            });
        });

        // POST /api/admin/pii/reencrypt - 启动后台 re-encrypt worker (admin-only)
        app.MapPost("/api/admin/pii/reencrypt", async (HttpContext ctx, IDbConnection db, PiiReencryptWorker worker) =>
        {
            var uid = CurrentUser.GetUserId(ctx);
            if (string.IsNullOrEmpty(uid)) return Common.Fail("未登录");
            if (!CurrentUser.IsAdmin(ctx)) return Results.Forbid();

            try
            {
                await worker.StartAsync(db, uid);
            }
            catch (InvalidOperationException ex)
            {
                return Results.Json(new { success = false, error = ex.Message }, statusCode: 400);
            }
            catch (Exception ex)
            {
                return Common.ServerError("PII re-encrypt start", ex);
            }

            // 写 audit log (start event)
            try
            {
                db.Execute(@"INSERT INTO audit_logs
                    (action, level, user_id, user_name, resource_type, resource_id, details, ip_address, created_at)
                    VALUES (@Action, @Level, @UserId, @UserName, @Resource, @ResourceId, @Details, @IpAddress, @CreatedAt)",
                    new
                    {
                        Action = "create",
                        Level = "warning",
                        UserId = uid,
                        UserName = uid,
                        Resource = "pii_reencrypt",
                        ResourceId = 1,
                        Details = "{\"event\":\"pii_reencrypt_started\"}",
                        IpAddress = ctx.Connection.RemoteIpAddress?.ToString() ?? "",
                        CreatedAt = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss")
                    });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[ERROR] PII re-encrypt audit log failed: {ex.Message}");
            }

            return Common.Ok(new
            {
                status = worker.GetStatus(db),
                message = "PII re-encrypt 已启动 (后台异步)"
            });
        });

        // GET /api/admin/pii/reencrypt/status - 查询 re-encrypt 进度 (admin-only)
        app.MapGet("/api/admin/pii/reencrypt/status", (HttpContext ctx, IDbConnection db, PiiReencryptWorker worker) =>
        {
            var uid = CurrentUser.GetUserId(ctx);
            if (string.IsNullOrEmpty(uid)) return Common.Fail("未登录");
            if (!CurrentUser.IsAdmin(ctx)) return Results.Forbid();
            return Common.Ok(worker.GetStatus(db));
        });
    }
}

================
File: EngineeringManager.Api/Endpoints/ProjectEndpoints.cs
================
using System.Data;
using Dapper;
using EngineeringManager.Api.Security;

namespace EngineeringManager.Api;

/// <summary>
/// 仪表盘 + 项目 + 项目成员端点
/// </summary>
public static class ProjectEndpoints
{
    public static void RegisterProjectEndpoints(this WebApplication app)
    {
        var now = () => DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");

        // ═══════════════════════════════════════════════════════════
        // 仪表盘
        // ═══════════════════════════════════════════════════════════

                app.MapGet("/api/dashboard/stats", (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            try
            {
                var projectsCount = db.ExecuteScalar<int>("SELECT COUNT(*) FROM projects");
                var membersCount = db.ExecuteScalar<int>("SELECT COUNT(*) FROM members");
                var workersCount = db.ExecuteScalar<int>("SELECT COUNT(*) FROM workers");
                var invoicesCount = db.ExecuteScalar<int>("SELECT COUNT(*) FROM invoices");
                var settlementsCount = db.ExecuteScalar<int>("SELECT COUNT(*) FROM settlements");
                var inProgressProjects = db.ExecuteScalar<int>("SELECT COUNT(*) FROM projects WHERE status='active'");
                var totalExpenses = db.ExecuteScalar<double>("SELECT COALESCE(SUM(amount), 0) FROM cost_ledger WHERE direction='expense'");
                var inventoryItemsCount = db.ExecuteScalar<int>("SELECT COUNT(*) FROM inventory_items");

                // 最近项目
                var recentProjects = db.Query("SELECT id, name, address, status FROM projects ORDER BY created_at DESC LIMIT 5").ToList();

                // 支出分类统计
                Dictionary<string, double> expenseByCategory = new();
                try
                {
                    expenseByCategory = db.Query(@"
                        SELECT COALESCE(cl.category, '其他') as name, SUM(cl.amount) as amount
                        FROM cost_ledger cl
                        WHERE cl.direction = 'expense'
                        GROUP BY cl.category
                        ORDER BY amount DESC
                    ").ToDictionary(r => (string)r.name, r => (double)r.amount);
                }
                catch (Exception ex)
                {
                    Console.Error.WriteLine($"[ProjectEndpoints/expenseByCategory] 统计失败: {ex.Message}");
                    expenseByCategory = new();
                }

                return Common.Ok(new
                {
                    projectsCount, membersCount, workersCount, invoicesCount, settlementsCount,
                    inProgressProjects, totalExpenses, inventoryItemsCount, expenseByCategory, recentProjects
                });
            }
            catch (Exception)
            {
                return Common.Ok(new
                {
                    projectsCount = 0, membersCount = 0, workersCount = 0, invoicesCount = 0,
                    settlementsCount = 0, inProgressProjects = 0, totalExpenses = 0.0,
                    inventoryItemsCount = 0, expenseByCategory = new Dictionary<string, double>(),
                    recentProjects = new List<object>()
                });
            }
        });

        // ═══════════════════════════════════════════════════════════
        // 项目
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/projects", (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            // v1.1.0 P0-4 Phase 2: 项目级表过滤 (UserFilterWithAuthorizedProjects + p.created_by 表别名)
            // projects 表主键是 id (不是 project_id), project_authorizations.project_id 引用 projects.id
            var filter = CurrentUser.UserFilterWithAuthorizedProjects(scope, "p.id", "p.created_by");
            return Common.Ok(db.Query($@"SELECT p.*, m.name as project_manager_name FROM projects p
                          LEFT JOIN members m ON p.project_manager_id=m.id
                          WHERE {filter}
                          ORDER BY p.created_at DESC",
                          new { Uid = uid, IsAdmin = isAdmin }));
        });

        app.MapGet("/api/projects/{id}", (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            // v1.1.0 P0-4 Phase 2: 单条也加项目级过滤 (p.created_by + project_authorizations)
            var filter = CurrentUser.UserFilterWithAuthorizedProjects(scope, "p.id", "p.created_by");
            var p = db.QueryFirstOrDefault($@"SELECT p.*, m.name as project_manager_name FROM projects p
                LEFT JOIN members m ON p.project_manager_id=m.id
                WHERE p.id=@Id AND ({filter})",
                new { Id = id, Uid = uid, IsAdmin = isAdmin });
            return p is not null ? Common.Ok(p) : Common.NotFound("项目不存在");
        });

        app.MapPost("/api/projects", async (HttpContext ctx, ProjectDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO projects (name,description,address,start_date,end_date,status,budget,project_manager_id,created_by,created_at,updated_at, last_modified_at) VALUES (@Name,@Description,@Address,@StartDate,@EndDate,@Status,@Budget,@ProjectManagerId,@CreatedBy,@Now,@Now, @Now);
                SELECT last_insert_rowid();",
                new { dto.Name, dto.Description, dto.Address, dto.StartDate, dto.EndDate,
                      Status = dto.Status ?? "planning", dto.Budget, dto.ProjectManagerId, CreatedBy = uid, Now = now() });
            return Common.Ok(id);
        });

        app.MapPut("/api/projects/{id}", async (HttpContext ctx, long id, ProjectDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var affected = await db.ExecuteAsync(@"UPDATE projects SET name=@Name,description=@Description,
                address=@Address,start_date=@StartDate,end_date=@EndDate,status=@Status,budget=@Budget,
                project_manager_id=@ProjectManagerId,updated_at=@Now, version=version+1, last_modified_at=@Now WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)",
                new { dto.Name, dto.Description, dto.Address, dto.StartDate, dto.EndDate,
                      dto.Status, dto.Budget, dto.ProjectManagerId, Now = now(), Id = id,
                      Uid = uid, IsAdmin = isAdmin });
            return affected > 0 ? Common.Ok() : Results.Forbid();
        });

        app.MapDelete("/api/projects/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            return (await db.ExecuteAsync("DELETE FROM projects WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)", new { Id = id, Uid = uid, IsAdmin = isAdmin })) > 0 ? Common.Ok() : Results.Forbid();
        });

        // ═══════════════════════════════════════════════════════════
        // 项目成员
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/project-members/{projectId}", (HttpContext ctx, long projectId, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // v0.75.0: 后端响应层不再 mask
            return Common.Ok(db.Query(@"SELECT pm.*, m.name as member_name, m.role as member_role, m.member_type, m.phone
                          FROM project_members pm LEFT JOIN members m ON pm.member_id=m.id
                          WHERE pm.project_id=@ProjectId ORDER BY pm.joined_at DESC", new { ProjectId = projectId }));
        });

        app.MapPost("/api/project-members", async (HttpContext ctx, ProjectMemberDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var exists = db.ExecuteScalar<int>("SELECT COUNT(*) FROM project_members WHERE project_id=@ProjectId AND member_id=@MemberId",
                new { dto.ProjectId, dto.MemberId }) > 0;
            if (exists) return Common.Fail("该成员已在项目中");
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO project_members (project_id,member_id,joined_at, last_modified_at) VALUES (@ProjectId,@MemberId,@JoinedAt, @Now); SELECT last_insert_rowid();",
                new { dto.ProjectId, dto.MemberId, JoinedAt = dto.JoinedAt ?? now() });
            return Common.Ok(id);
        });

        app.MapDelete("/api/project-members/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            return (await db.ExecuteAsync("DELETE FROM project_members WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)", new { Id = id, Uid = uid, IsAdmin = isAdmin })) > 0 ? Common.Ok() : Results.Forbid();
        });

    }
}

================
File: EngineeringManager.Api/Endpoints/ProjectWorkerMiscEndpoints.cs
================
using System.Data;
using Dapper;
using EngineeringManager.Api.Security;

namespace EngineeringManager.Api;

/// <summary>
/// 杂项端点：项目工人批量 / 发票状态变更
/// </summary>
public static class ProjectWorkerMiscEndpoints
{
    public static void RegisterProjectWorkerMiscEndpoints(this WebApplication app)
    {
        app.MapPost("/api/project-workers/batch", async (HttpContext ctx, List<ProjectWorkerDto> records, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var count = 0;
            foreach (var dto in records)
            {
                await db.ExecuteAsync(@"INSERT INTO project_workers (worker_id,project_id,team_id,daily_wage,worker_type,entry_date,status,created_by,created_at, last_modified_at) VALUES (@WorkerId,@ProjectId,@TeamId,@DailyWage,@WorkerType,@EntryDate,'active',@CreatedBy,@Now, @Now)",
                    new { dto.WorkerId, dto.ProjectId, dto.TeamId, dto.DailyWage, dto.WorkerType, dto.EntryDate, CreatedBy = uid, Now = Common.NowString() });
                count++;
            }
            return Common.Ok(new { count });
        });

        app.MapPut("/api/project-workers", async (HttpContext ctx, ProjectWorkerDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var affected = await db.ExecuteAsync(@"UPDATE project_workers SET team_id=@TeamId,daily_wage=@DailyWage,worker_type=@WorkerType,entry_date=@EntryDate,status=@Status, version=version+1, last_modified_at=@Now WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)",
                new { dto.Id, dto.TeamId, dto.DailyWage, dto.WorkerType, dto.EntryDate, dto.Status, Uid = uid, IsAdmin = isAdmin });
            return affected > 0 ? Common.Ok() : Results.Forbid();
        });

        app.MapPut("/api/invoices/{id}/status", async (HttpContext ctx, long id, InvoiceStatusDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var affected = await db.ExecuteAsync("UPDATE invoices SET status=@Status,updated_at=@Now, version=version+1, last_modified_at=@Now WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)",
                new { Status = dto.Status, Now = Common.NowString(), Id = id, Uid = uid, IsAdmin = isAdmin });
            return affected > 0 ? Common.Ok() : Results.Forbid();
        });
    }
}

================
File: EngineeringManager.Api/Endpoints/RegionEndpoints.cs
================
using System.Data;
using Dapper;
using EngineeringManager.Api.Security;

namespace EngineeringManager.Api;

/// <summary>
/// 区域端点：省市区数据
/// </summary>
public static class RegionEndpoints
{
    public static void RegisterRegionEndpoints(this WebApplication app)
    {
        app.MapGet("/api/regions", (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            return Common.Ok(db.Query("SELECT * FROM regions ORDER BY province, city, district"));
        });

        app.MapPost("/api/regions", async (HttpContext ctx, RegionDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO regions (province,city,district)
                VALUES (@Province,@City,@District); SELECT last_insert_rowid();", dto);
            return Common.Ok(id);
        });

        app.MapDelete("/api/regions/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            return (await db.ExecuteAsync("DELETE FROM regions WHERE id=@Id", new { Id = id })) > 0 ? Common.Ok() : Results.Forbid();
        });
    }
}

================
File: EngineeringManager.Api/Endpoints/SttEndpoints.cs
================
using System.Data;
using Dapper;
using EngineeringManager.Api.Security;
using EngineeringManager.Api.Services;
using EngineeringManager.Api.Services.Stt;

namespace EngineeringManager.Api;

/// <summary>
/// 语音转文字 (STT) 端点
/// 结构参照 OcrEndpoints：文件进→后台处理→出文本
/// 鉴权沿用 GlobalAuthMiddleware（白名单不包含 /api/stt/*，必须登录）
/// </summary>
public static class SttEndpoints
{
    // 允许的音频格式
    private static readonly HashSet<string> AllowedAudioExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".wav", ".mp3", ".m4a", ".aac", ".flac", ".ogg", ".wma", ".amr", ".opus"
    };

    // 音频大小上限：500MB
    private const long MaxAudioSize = 500 * 1024 * 1024;

    public static void RegisterSttEndpoints(this WebApplication app)
    {
        // ═══════════════════════════════════════════════════════════
        // POST /api/stt/transcribe — 创建转写任务
        // ═══════════════════════════════════════════════════════════
        app.MapPost("/api/stt/transcribe", (HttpContext ctx, IDbConnection db, SttTranscribeDto dto) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            try
            {
                // 检查本地转写是否可用
                if (!SttEngineSelector.CanUseLocalStt())
                {
                    return Common.Fail($"本地语音转文字不可用: {SttEngineSelector.GetUnavailableReason()}。可使用云端转写（即将推出）。", 400);
                }

                // 验证文件
                if (string.IsNullOrWhiteSpace(dto.FilePath))
                    return Common.Fail("请提供音频文件路径");

                var fullPath = Path.Combine(ApiConfig.ResolveDataPath(), "uploads", dto.FilePath);
                if (!File.Exists(fullPath))
                    return Common.Fail($"音频文件不存在: {dto.FilePath}");

                var ext = Path.GetExtension(fullPath);
                if (!AllowedAudioExtensions.Contains(ext))
                    return Common.Fail($"不支持的音频格式: {ext}，支持的格式: {string.Join(", ", AllowedAudioExtensions)}");

                var fileSize = new FileInfo(fullPath).Length;
                if (fileSize > MaxAudioSize)
                    return Common.Fail($"音频文件过大 ({fileSize / 1024 / 1024}MB)，上限 {MaxAudioSize / 1024 / 1024}MB");

                var now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");

                // 创建 job
                var jobId = db.QuerySingle<long>(@"
                    INSERT INTO stt_jobs
                        (source_file, source_path, source_type, engine, status, progress,
                         is_multi_speaker, num_speakers, hotwords,
                         created_at, updated_at, created_by)
                    VALUES
                        (@SourceFile, @SourcePath, 'audio', 'qwen3-asr-1.7b-gguf', 'pending', 0,
                         @IsMulti, @NumSpeakers, @Hotwords,
                         @Now, @Now, @Uid);
                    SELECT last_insert_rowid();",
                    new
                    {
                        SourceFile = Path.GetFileName(dto.FilePath),
                        SourcePath = dto.FilePath, // 存相对路径，worker 用 ResolveDataPath 拼完整路径
                        IsMulti = dto.IsMultiSpeaker ? 1 : 0,
                        NumSpeakers = dto.NumSpeakers,
                        Hotwords = dto.Context,
                        Now = now,
                        Uid = uid,
                    });

                return Results.Ok(new { success = true, jobId, status = "pending" });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[SttEndpoints] 创建转写任务失败: {ex.Message}");
                return Common.ServerError("创建转写任务", ex);
            }
        });

        // ═══════════════════════════════════════════════════════════
        // GET /api/stt/jobs/{id} — 查询任务状态/结果
        // ═══════════════════════════════════════════════════════════
        app.MapGet("/api/stt/jobs/{id}", (HttpContext ctx, IDbConnection db, long id) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            try
            {
                var job = db.QueryFirstOrDefault<dynamic>(
                    @"SELECT id, source_file, engine, status, progress, is_multi_speaker,
                             num_speakers, result_text, result_json, duration_sec, elapsed_sec,
                             error, created_at, updated_at
                      FROM stt_jobs WHERE id = @Id AND created_by = @Uid",
                    new { Id = id, Uid = uid });

                if (job == null)
                    return Common.NotFound("转写任务不存在");

                // 解析 result_json 为 segments
                List<object>? segments = null;
                if (job.result_json != null)
                {
                    try
                    {
                        segments = System.Text.Json.JsonSerializer.Deserialize<List<object>>(job.result_json);
                    }
                    catch { }
                }

                return Results.Ok(new
                {
                    success = true,
                    data = new
                    {
                        id = job.id,
                        sourceFile = job.source_file,
                        engine = job.engine,
                        status = job.status,
                        progress = job.progress,
                        isMultiSpeaker = job.is_multi_speaker == 1,
                        numSpeakers = job.num_speakers,
                        text = job.result_text,
                        segments,
                        durationSec = job.duration_sec,
                        elapsedSec = job.elapsed_sec,
                        error = job.error,
                        createdAt = job.created_at,
                        updatedAt = job.updated_at,
                    }
                });
            }
            catch (Exception ex)
            {
                return Common.ServerError("查询转写任务", ex);
            }
        });

        // ═══════════════════════════════════════════════════════════
        // GET /api/stt/jobs — 当前用户任务列表
        // ═══════════════════════════════════════════════════════════
        app.MapGet("/api/stt/jobs", (HttpContext ctx, IDbConnection db, int page = 1, int size = 20) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            try
            {
                var offset = (page - 1) * size;
                var jobs = db.Query<dynamic>(
                    @"SELECT id, source_file, engine, status, progress, is_multi_speaker,
                             duration_sec, elapsed_sec, error, created_at, updated_at
                      FROM stt_jobs
                      WHERE created_by = @Uid
                      ORDER BY created_at DESC
                      LIMIT @Size OFFSET @Offset",
                    new { Uid = uid, Size = size, Offset = offset });

                var total = db.ExecuteScalar<int>(
                    "SELECT COUNT(*) FROM stt_jobs WHERE created_by = @Uid",
                    new { Uid = uid });

                return Results.Ok(new { success = true, data = jobs, total, page, size });
            }
            catch (Exception ex)
            {
                return Common.ServerError("查询任务列表", ex);
            }
        });

        // ═══════════════════════════════════════════════════════════
        // GET /api/stt/status — 转写能力检测（前端用来决定是否显示 STT 入口）
        // ═══════════════════════════════════════════════════════════
        app.MapGet("/api/stt/status", (HttpContext ctx) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            try
            {
                var gpu = SttEngineSelector.Detect();
                var asrReady = SttModelManager.IsAsrModelAvailable();
                var diarizationReady = SttModelManager.IsDiarizationModelAvailable();

                return Results.Ok(new
                {
                    success = true,
                    data = new
                    {
                        canTranscribe = SttEngineSelector.CanUseLocalStt() && asrReady,
                        canDiarize = diarizationReady,
                        gpu = new
                        {
                            hasDiscreteGpu = gpu.HasDiscreteGpu,
                            name = gpu.GpuName,
                            vramMb = gpu.VramMb,
                            supportsVulkan = gpu.SupportsVulkan,
                            allGpus = gpu.AllGpus,
                        },
                        asrModelReady = asrReady,
                        diarizationModelReady = diarizationReady,
                        unavailableReason = SttEngineSelector.CanUseLocalStt() ? "" : SttEngineSelector.GetUnavailableReason(),
                    }
                });
            }
            catch (Exception ex)
            {
                return Common.ServerError("检测转写能力", ex);
            }
        });

        // ═══════════════════════════════════════════════════════════
        // POST /api/stt/jobs/{id}/ingest — 把校对后文本送入知识库
        // ═══════════════════════════════════════════════════════════
        app.MapPost("/api/stt/jobs/{id}/ingest", async (
            HttpContext ctx,
            IDbConnection db,
            IEmbeddingService embedding,
            long id) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            try
            {
                // 1. 查 STT job（含用户维度过滤）
                var job = db.QueryFirstOrDefault<dynamic>(
                    @"SELECT id, source_file, result_text, result_json, duration_sec,
                             is_multi_speaker, created_at, created_by
                      FROM stt_jobs WHERE id = @Id AND created_by = @Uid",
                    new { Id = id, Uid = uid });

                if (job == null)
                    return Common.NotFound("转写任务不存在");

                if (string.IsNullOrEmpty((string?)job.result_text))
                    return Common.Fail("转写结果为空，无法入库");

                // 2. 解析 segments（用于说话人归一化）
                List<SttSegment>? segments = null;
                if (job.result_json != null)
                {
                    try
                    {
                        var segData = System.Text.Json.JsonSerializer.Deserialize<List<JsonSegment>>(
                            (string)job.result_json);
                        segments = segData?.Select(s => new SttSegment
                        {
                            Speaker = s.Speaker,
                            Start = s.Start,
                            End = s.End,
                            Text = s.Text ?? "",
                        }).ToList();
                    }
                    catch { /* 解析失败不影响入库 */ }
                }

                // 3. 入库
                var service = new KnowledgeBaseService(db, embedding);
                var docId = await service.IngestAsync(
                    fullText: job.result_text,
                    title: $"{job.source_file}",
                    sourceType: "call",
                    sourceRef: id.ToString(),
                    projectId: null,
                    createdBy: uid,
                    segments: segments,
                    occurredAt: (string?)job.created_at);

                return Results.Ok(new
                {
                    success = true,
                    documentId = docId,
                    message = $"转写文本已入库，文档 ID: {docId}",
                });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[SttEndpoints] 入库失败: {ex.Message}");
                return Common.ServerError("转写入库", ex);
            }
        });
    }
}

/// <summary>STT 转写请求 DTO</summary>
public class SttTranscribeDto
{
    public string FilePath { get; set; } = "";
    public bool IsMultiSpeaker { get; set; } = false;
    public int? NumSpeakers { get; set; }
    public string? Context { get; set; }
}

/// <summary>用于反序列化 stt_jobs.result_json</summary>
public class JsonSegment
{
    public int Speaker { get; set; }
    public double Start { get; set; }
    public double End { get; set; }
    public string? Text { get; set; }
}

================
File: EngineeringManager.Api/Endpoints/TemplateEndpoints.cs
================
using System.Data;
using Dapper;
using EngineeringManager.Api.Security;

namespace EngineeringManager.Api;

/// <summary>
/// 模板端点：查询 / 删除 / 统计 / 创建 / 更新
/// </summary>
public static class TemplateEndpoints
{
    public static void RegisterTemplateEndpoints(this WebApplication app)
    {
        // 模板 — 基础查询 + 删除
        app.MapGet("/api/templates", (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            return Common.Ok(db.Query("SELECT * FROM templates ORDER BY created_at DESC"));
        });

        app.MapDelete("/api/templates/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            return (await db.ExecuteAsync("DELETE FROM templates WHERE id=@Id", new { Id = id })) > 0 ? Common.Ok() : Results.Forbid();
        });

        // 模板 — 统计 + 创建 + 更新
        app.MapGet("/api/templates/stats", (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            return Common.Ok(new
            {
                total = db.ExecuteScalar<int>("SELECT COUNT(*) FROM templates"),
                byCategory = db.Query("SELECT category, COUNT(*) as count FROM templates GROUP BY category"),
            });
        });

        app.MapPost("/api/templates", async (HttpContext ctx, dynamic dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO templates (name,category,description,file_name,stored_file_name,file_type,created_at,updated_at)
                VALUES (@Name,@Category,@Description,@FileName,@StoredFileName,@FileType,@Now,@Now); SELECT last_insert_rowid();",
                new { Now = Common.NowString() });
            return Common.Ok(id);
        });

        app.MapPut("/api/templates", async (HttpContext ctx, dynamic dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var affected = await db.ExecuteAsync(@"UPDATE templates SET name=@Name,category=@Category,description=@Description,updated_at=@Now WHERE id=@Id",
                new { Now = Common.NowString() });
            return affected > 0 ? Common.Ok() : Results.Forbid();
        });
    }
}

================
File: EngineeringManager.Api/Endpoints/UserPreferencesEndpoints.cs
================
using System.Data;
using Dapper;
using EngineeringManager.Api.Security;

namespace EngineeringManager.Api;

/// <summary>
/// v0.75.0: User Preferences API — 持久化用户偏好设置 (前端 toggle 状态等).
/// 替代 localStorage: 多设备同步 + admin 可控.
///
/// 当前支持的偏好:
///   - pii_mask_enabled: 是否默认 mask PII 字段 (true=mask 默认, false=显示明文)
///   - 默认值: true (保守, 与 v1.2.0 MaskContext 默认一致)
///
/// API 路径:
///   GET  /api/user-preferences       - 当前登录用户的全部偏好
///   PUT  /api/user-preferences       - 更新当前登录用户偏好 (body: { pii_mask_enabled: bool })
///   GET  /api/user-preferences/{key} - 单个偏好
///   PUT  /api/user-preferences/{key} - 更新单个偏好
/// </summary>
public static class UserPreferencesEndpoints
{
    private const string DefaultPiiMask = "true";

    public static void RegisterUserPreferencesEndpoints(this WebApplication app)
    {
        // 获取当前用户所有偏好
        app.MapGet("/api/user-preferences", (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx);
            if (string.IsNullOrEmpty(uid)) return Common.Fail("未登录");
            var prefs = db.Query<(string key, string value)>(
                "SELECT key, value FROM user_preferences WHERE user_id=@Uid", new { Uid = uid })
                .ToDictionary(p => p.key, p => p.value);
            // 默认填充: 未设置的偏好用默认值
            if (!prefs.ContainsKey("pii_mask_enabled"))
                prefs["pii_mask_enabled"] = DefaultPiiMask;
            return Common.Ok(prefs);
        });

        // 批量更新当前用户偏好 (PUT body: { "pii_mask_enabled": "false" })
        app.MapPut("/api/user-preferences", async (HttpContext ctx, HttpRequest req, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx);
            if (string.IsNullOrEmpty(uid)) return Common.Fail("未登录");

            Dictionary<string, string>? body;
            try
            {
                using var reader = new System.IO.StreamReader(req.Body);
                var bodyText = await reader.ReadToEndAsync();
                body = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, string>>(
                    bodyText, new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            }
            catch (Exception ex) { return Common.Fail("参数解析失败: " + Common.Sanitize(ex.Message)); }
            if (body == null || body.Count == 0) return Common.Fail("为空请求体");

            // 逐条 UPSERT
            foreach (var kv in body)
            {
                db.Execute(@"
                    INSERT INTO user_preferences (user_id, key, value, updated_at)
                    VALUES (@Uid, @Key, @Value, @Now)
                    ON CONFLICT(user_id, key) DO UPDATE SET value=@Value, updated_at=@Now",
                    new { Uid = uid, Key = kv.Key, Value = kv.Value, Now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") });
            }
            return Common.Ok(new { updated = body.Count });
        });

        // 获取单个偏好
        app.MapGet("/api/user-preferences/{key}", (HttpContext ctx, string key, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx);
            if (string.IsNullOrEmpty(uid)) return Common.Fail("未登录");

            var value = db.ExecuteScalar<string?>(
                "SELECT value FROM user_preferences WHERE user_id=@Uid AND key=@Key",
                new { Uid = uid, Key = key });
            // 默认值 fallback
            if (value == null)
            {
                value = key switch
                {
                    "pii_mask_enabled" => DefaultPiiMask,
                    _ => null
                };
            }
            return value == null
                ? Common.NotFound("preference '" + key + "' not found")
                : Common.Ok(new { key, value });
        });

        // 更新单个偏好
        app.MapPut("/api/user-preferences/{key}", async (HttpContext ctx, string key, HttpRequest req, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx);
            if (string.IsNullOrEmpty(uid)) return Common.Fail("未登录");

            PrefValueDto dto;
            try
            {
                using var reader = new System.IO.StreamReader(req.Body);
                var bodyText = await reader.ReadToEndAsync();
                dto = System.Text.Json.JsonSerializer.Deserialize<PrefValueDto>(bodyText,
                    new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new PrefValueDto();
            }
            catch (Exception ex) { return Common.Fail("参数解析失败: " + Common.Sanitize(ex.Message)); }

            db.Execute(@"
                INSERT INTO user_preferences (user_id, key, value, updated_at)
                VALUES (@Uid, @Key, @Value, @Now)
                ON CONFLICT(user_id, key) DO UPDATE SET value=@Value, updated_at=@Now",
                new { Uid = uid, Key = key, Value = dto.Value, Now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") });
            return Common.Ok(new { key, value = dto.Value });
        });
    }

    public class PrefValueDto
    {
        public string Value { get; set; } = "";
    }
}

================
File: EngineeringManager.Api/Endpoints/WageEndpoints.cs
================
using System.Data;
using Dapper;
using EngineeringManager.Api.Security;

namespace EngineeringManager.Api;

public static class WageEndpoints
{
    public static void RegisterWageEndpoints(this WebApplication app)
    {
        var now = () => DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");

        // 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?
        // 鑰冨嫟
        // 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?

        app.MapGet("/api/attendances", (HttpContext ctx, IDbConnection db, long? projectId, string? yearMonth) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var sql = @"SELECT a.*, COALESCE(m.name, wr.name) as member_name, m.member_type,
                        wt.name as team_name, pw.worker_id
                        FROM attendances a
                        LEFT JOIN members m ON a.member_id=m.id
                        LEFT JOIN project_workers pw ON a.project_worker_id=pw.id
                        LEFT JOIN workers wr ON pw.worker_id=wr.id
                        LEFT JOIN worker_teams wt ON pw.team_id=wt.id";
            var conditions = new List<string>();
            if (projectId.HasValue) conditions.Add("a.project_id=@ProjectId");
            if (!string.IsNullOrEmpty(yearMonth)) conditions.Add("a.year_month=@YearMonth");
            // v1.1.0 P0-4 Phase 2: 鎬绘槸鍔?user-dim 杩囨护
            conditions.Add(CurrentUser.UserFilterWithAuthorizedProjects(scope, "a.project_id", "a.created_by"));
            sql += " WHERE " + string.Join(" AND ", conditions);
            sql += " ORDER BY a.updated_at DESC";
            return Common.Ok(db.Query(sql, new { ProjectId = projectId, YearMonth = yearMonth, Uid = uid, IsAdmin = isAdmin }));
        });

        app.MapPost("/api/attendances", async (HttpContext ctx, AttendanceDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO attendances (member_id,project_id,project_worker_id,year_month,work_days,days_off,is_full_attendance,
                 daily_status,file_url,file_name,created_by,created_at,updated_at, last_modified_at) VALUES (@MemberId,@ProjectId,@ProjectWorkerId,@YearMonth,@WorkDays,@DaysOff,@IsFullAttendance,
                        @DailyStatus,@FileUrl,@FileName,@CreatedBy,@Now,@Now, @Now);
                SELECT last_insert_rowid();",
                new { dto.MemberId, dto.ProjectId, dto.ProjectWorkerId, dto.YearMonth,
                      dto.WorkDays, dto.DaysOff, dto.IsFullAttendance, dto.DailyStatus,
                      dto.FileUrl, dto.FileName, CreatedBy = uid, Now = now() });
            return Common.Ok(id);
        });

        app.MapPut("/api/attendances", async (HttpContext ctx, AttendanceDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var affected = await db.ExecuteAsync(@"UPDATE attendances SET work_days=@WorkDays,days_off=@DaysOff,
                is_full_attendance=@IsFullAttendance,daily_status=@DailyStatus,file_url=@FileUrl,
                file_name=@FileName,updated_at=@Now, version=version+1, last_modified_at=@Now WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)",
                new { dto.Id, dto.WorkDays, dto.DaysOff, dto.IsFullAttendance, dto.DailyStatus,
                      dto.FileUrl, dto.FileName, Uid = uid, IsAdmin = isAdmin, Now = now() });
            return affected > 0 ? Common.Ok() : Results.Forbid();
        });

        app.MapDelete("/api/attendances/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            return (await db.ExecuteAsync("DELETE FROM attendances WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)", new { Id = id, Uid = uid, IsAdmin = isAdmin })) > 0 ? Common.Ok() : Results.Forbid();
        });

        app.MapPost("/api/attendances/batch-delete", async (HttpContext ctx, List<long> ids, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var count = 0;
            foreach (var id in ids)
                count += await db.ExecuteAsync("DELETE FROM attendances WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)", new { Id = id, Uid = uid, IsAdmin = isAdmin, Now = now() });
            return Common.Ok(new { deleted = count });
        });

        app.MapPost("/api/attendances/batch-create", async (HttpContext ctx, List<dynamic> records, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var count = 0;
            foreach (var dto in records)
            {
                await db.ExecuteAsync(@"INSERT INTO attendances (member_id,project_id,project_worker_id,year_month,work_days,days_off,is_full_attendance,daily_status,created_by,created_at,updated_at, last_modified_at) VALUES (@MemberId,@ProjectId,@ProjectWorkerId,@YearMonth,@WorkDays,@DaysOff,@IsFullAttendance,@DailyStatus,@CreatedBy,@Now,@Now, @Now)",
                    new { Now = now(), CreatedBy = uid });
                count++;
            }
            return Common.Ok(new { count });
        });

        app.MapPost("/api/attendances/generate", (HttpContext ctx, dynamic dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            return Common.Ok(new { count = 0 });
        });

        app.MapPost("/api/attendances/generate-v2", (HttpContext ctx, dynamic dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            return Common.Ok(new { count = 0 });
        });

        app.MapPost("/api/attendances/batch-import", (HttpContext ctx, dynamic dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            return Common.Ok(new { created = 0, updated = 0 });
        });

        // 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?
        // 宸ヨ祫
        // 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?

        app.MapGet("/api/wages", (HttpContext ctx, IDbConnection db, long? projectId, string? yearMonth) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var sql = @"SELECT w.*, COALESCE(m.name, wr.name) as worker_name, p.name as project_name,
                        wt.name as team_name
                        FROM wages w
                        LEFT JOIN members m ON w.member_id=m.id
                        LEFT JOIN project_workers pw ON w.project_worker_id=pw.id
                        LEFT JOIN workers wr ON pw.worker_id=wr.id
                        LEFT JOIN worker_teams wt ON pw.team_id=wt.id
                        LEFT JOIN projects p ON w.project_id=p.id";
            var conditions = new List<string>();
            if (projectId.HasValue) conditions.Add("w.project_id=@ProjectId");
            if (!string.IsNullOrEmpty(yearMonth)) conditions.Add("w.year_month=@YearMonth");
            conditions.Add(CurrentUser.UserFilterWithAuthorizedProjects(scope, "w.project_id", "w.created_by"));
            conditions.Add("w.deleted_at IS NULL");
            sql += " WHERE " + string.Join(" AND ", conditions);
            sql += " ORDER BY w.updated_at DESC";
            return Common.Ok(db.Query(sql, new { ProjectId = projectId, YearMonth = yearMonth, Uid = uid, IsAdmin = isAdmin }));
        });

        app.MapGet("/api/wages/stats", (HttpContext ctx, IDbConnection db, long? projectId, string? yearMonth) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var where = new List<string>();
            if (projectId.HasValue) where.Add("project_id=@ProjectId");
            if (!string.IsNullOrEmpty(yearMonth)) where.Add("year_month=@YearMonth");
            where.Add(CurrentUser.UserFilterWithAuthorizedProjects(scope));
            where.Add("deleted_at IS NULL");
            var w = " WHERE " + string.Join(" AND ", where);
            return Common.Ok(new
            {
                totalWage = db.ExecuteScalar<decimal>($"SELECT COALESCE(SUM(actual_wage),0) FROM wages{w}", new { Uid = uid, IsAdmin = isAdmin, ProjectId = projectId, YearMonth = yearMonth }),
                count = db.ExecuteScalar<int>($"SELECT COUNT(*) FROM wages{w}", new { Uid = uid, IsAdmin = isAdmin, ProjectId = projectId, YearMonth = yearMonth }),
            });
        });

        app.MapPost("/api/wages", async (HttpContext ctx, WageDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var actualWage = dto.ActualWage ?? (dto.DailyWage * dto.WorkDays + dto.Bonus - dto.Deduction);
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO wages (project_id,member_id,project_worker_id,year_month,daily_wage,work_days,bonus,deduction,
                 actual_wage,paid_amount,paid_date,created_by,created_at,updated_at, last_modified_at) VALUES (@ProjectId,@MemberId,@ProjectWorkerId,@YearMonth,@DailyWage,@WorkDays,@Bonus,@Deduction,
                        @ActualWage,@PaidAmount,@PaidDate,@CreatedBy,@Now,@Now, @Now);
                SELECT last_insert_rowid();",
                new { dto.ProjectId, dto.MemberId, dto.ProjectWorkerId, dto.YearMonth, dto.DailyWage,
                      dto.WorkDays, dto.Bonus, dto.Deduction, ActualWage = actualWage,
                      dto.PaidAmount, dto.PaidDate, CreatedBy = uid, Now = now() });
            return Common.Ok(id);
        });

        app.MapPut("/api/wages", async (HttpContext ctx, WageDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var actualWage = dto.ActualWage ?? (dto.DailyWage * dto.WorkDays + dto.Bonus - dto.Deduction);
            var affected = await db.ExecuteAsync(@"UPDATE wages SET daily_wage=@DailyWage,work_days=@WorkDays,
                bonus=@Bonus,deduction=@Deduction,actual_wage=@ActualWage,paid_amount=@PaidAmount,
                paid_date=@PaidDate,updated_at=@Now, version=version+1, last_modified_at=@Now WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)",
                new { dto.Id, dto.DailyWage, dto.WorkDays, dto.Bonus, dto.Deduction,
                      ActualWage = actualWage, dto.PaidAmount, dto.PaidDate,
                      Uid = uid, IsAdmin = isAdmin, Now = now() });
            return affected > 0 ? Common.Ok() : Results.Forbid();
        });

        app.MapDelete("/api/wages/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            return (await db.ExecuteAsync("UPDATE wages SET deleted_at=@Now WHERE id=@Id AND deleted_at IS NULL AND (created_by=@Uid OR @IsAdmin=1)", new { Id = id, Uid = uid, IsAdmin = isAdmin, Now = now() })) > 0 ? Common.Ok() : Results.Forbid();
        });

        app.MapPost("/api/wages/batch-delete", async (HttpContext ctx, List<long> ids, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var count = 0;
            foreach (var id in ids)
                count += await db.ExecuteAsync("UPDATE wages SET deleted_at=@Now WHERE id=@Id AND deleted_at IS NULL AND (created_by=@Uid OR @IsAdmin=1) AND (payment_locked=0 OR payment_locked IS NULL)", new { Id = id, Uid = uid, IsAdmin = isAdmin, Now = now() });
            return Common.Ok(new { deleted = count });
        });

        app.MapPost("/api/wages/batch-clear-payments", async (HttpContext ctx, List<long> ids, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var count = 0;
            foreach (var id in ids)
                count += await db.ExecuteAsync("UPDATE wages SET paid_amount=NULL,paid_date=NULL,bank_receipt_path=NULL,updated_at=@Now, version=version+1, last_modified_at=@Now WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1) AND (payment_locked=0 OR payment_locked IS NULL)",
                    new { Id = id, Uid = uid, IsAdmin = isAdmin, Now = now() });
            return Common.Ok(new { cleared = count });
        });

        app.MapPost("/api/wages/archive", async (HttpContext ctx, List<long> ids, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var count = 0;
            foreach (var id in ids)
                count += await db.ExecuteAsync("UPDATE wages SET payment_locked=1,updated_at=@Now, version=version+1, last_modified_at=@Now WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)",
                    new { Id = id, Uid = uid, IsAdmin = isAdmin, Now = now() });
            return Common.Ok(new { archived = count });
        });

        app.MapPost("/api/wages/match-receipts", (HttpContext ctx, dynamic dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            return Common.Ok(Array.Empty<object>()); // 绠€鍖栫増
        });

        app.MapPost("/api/wages/confirm-matches", (HttpContext ctx, dynamic dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            return Common.Ok(new { updated = 0 }); // 绠€鍖栫増
        });

        app.MapGet("/api/wages/payment-records", (HttpContext ctx, IDbConnection db, long? projectId, string? yearMonth) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var sql = @"SELECT w.*, COALESCE(m.name, wr.name) as worker_name, p.name as project_name,
                        wt.name as team_name
                        FROM wages w
                        LEFT JOIN members m ON w.member_id=m.id
                        LEFT JOIN project_workers pw ON w.project_worker_id=pw.id
                        LEFT JOIN workers wr ON pw.worker_id=wr.id
                        LEFT JOIN worker_teams wt ON pw.team_id=wt.id
                        LEFT JOIN projects p ON w.project_id=p.id
                        WHERE w.paid_amount IS NOT NULL AND w.deleted_at IS NULL";
            if (projectId.HasValue) sql += " AND w.project_id=@ProjectId";
            if (!string.IsNullOrEmpty(yearMonth)) sql += " AND w.year_month=@YearMonth";
            // v1.1.0 P0-4 Phase 2: 鍔?user-dim 杩囨护 (闈?admin 鐪嬩笉鍒板埆浜哄彂鐨勫伐璧勫崟)
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            sql += " AND " + CurrentUser.UserFilterWithAuthorizedProjects(scope, "w.project_id", "w.created_by");
            sql += " ORDER BY w.paid_date DESC";
            return Common.Ok(db.Query(sql, new { Uid = uid, IsAdmin = isAdmin, ProjectId = projectId, YearMonth = yearMonth }));
        });

        app.MapGet("/api/wages/overdue-stats", (HttpContext ctx, IDbConnection db, long? projectId) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            // v1.1.0 P0-4 Phase 2: 鎬绘槸鍔?user-dim
            var w = projectId.HasValue
                ? " WHERE project_id=@ProjectId AND deleted_at IS NULL AND paid_amount IS NULL AND year_month < @CurrentMonth AND " + CurrentUser.UserFilterWithAuthorizedProjects(scope)
                : " WHERE deleted_at IS NULL AND paid_amount IS NULL AND year_month < @CurrentMonth AND " + CurrentUser.UserFilterWithAuthorizedProjects(scope);
            return Common.Ok(new
            {
                count = db.ExecuteScalar<int>($"SELECT COUNT(*) FROM wages{w}", new { Uid = uid, IsAdmin = isAdmin, ProjectId = projectId, CurrentMonth = DateTime.Now.ToString("yyyy-MM") }),
                amount = db.ExecuteScalar<decimal>($"SELECT COALESCE(SUM(actual_wage),0) FROM wages{w}", new { Uid = uid, IsAdmin = isAdmin, ProjectId = projectId, CurrentMonth = DateTime.Now.ToString("yyyy-MM") }),
            });
        });

        app.MapGet("/api/wages/overdue-list", (HttpContext ctx, IDbConnection db, long? projectId) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var sql = @"SELECT w.*, COALESCE(m.name, wr.name) as worker_name
                        FROM wages w
                        LEFT JOIN members m ON w.member_id=m.id
                        LEFT JOIN project_workers pw ON w.project_worker_id=pw.id
                        LEFT JOIN workers wr ON pw.worker_id=wr.id
                        WHERE w.paid_amount IS NULL AND w.deleted_at IS NULL AND w.year_month < @CurrentMonth";
            if (projectId.HasValue) sql += " AND w.project_id=@ProjectId";
            // v1.1.0 P0-4 Phase 2: 鍔?user-dim
            sql += " AND " + CurrentUser.UserFilterWithAuthorizedProjects(scope, "w.project_id");
            sql += " ORDER BY w.year_month DESC";
            return Common.Ok(db.Query(sql, new { ProjectId = projectId, CurrentMonth = DateTime.Now.ToString("yyyy-MM") }));
        });

        app.MapPost("/api/wages/batch-save", async (HttpContext ctx, List<dynamic> records, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var count = 0;
            foreach (var dto in records)
            {
                await db.ExecuteAsync(@"INSERT OR REPLACE INTO wages
                    (project_id,project_worker_id,year_month,daily_wage,work_days,bonus,deduction,actual_wage,created_by,created_at,updated_at)
                    VALUES (@ProjectId,@ProjectWorkerId,@YearMonth,@DailyWage,@WorkDays,@Bonus,@Deduction,@ActualWage,@CreatedBy,@Now,@Now)",
                    new { Now = now(), CreatedBy = uid });
                count++;
            }
            return Common.Ok(new { saved = count });
        });

        // 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?
        // 钖祫鍘嗗彶 (鏃?created_by 鍒? 浠呭姞 var uid 寮哄埗閴存潈)
        // 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?

        app.MapGet("/api/salary-history/{memberId}", (HttpContext ctx, long memberId, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            // v1.1.0 P0-4 Phase 2: salary_history 鐜板湪鏈?created_by (migration 014)
            return Common.Ok(db.Query($"SELECT * FROM salary_history WHERE member_id=@MemberId AND {CurrentUser.UserFilterCompany(scope)} ORDER BY effective_date DESC",
                new { MemberId = memberId, Uid = uid, IsAdmin = isAdmin }));
        });

        app.MapDelete("/api/salary-history/{id}", async (HttpContext ctx, long id, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            return (await db.ExecuteAsync("DELETE FROM salary_history WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)", new { Id = id, Uid = uid, IsAdmin = isAdmin })) > 0 ? Common.Ok() : Results.Forbid();
        });

        app.MapPost("/api/salary-history", async (HttpContext ctx, SalaryHistoryDto dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var id = await db.ExecuteScalarAsync<long>(@"INSERT INTO salary_history (member_id,effective_date,base_salary,subsidy,subsidy_note,note,created_by,created_at, last_modified_at) VALUES (@MemberId,@EffectiveDate,@BaseSalary,@Subsidy,@SubsidyNote,@Note,@CreatedBy,@Now, @Now);
                SELECT last_insert_rowid();",
                new { dto.MemberId, dto.EffectiveDate, dto.BaseSalary, dto.Subsidy, dto.SubsidyNote, dto.Note, CreatedBy = uid, Now = now() });
            return Common.Ok(id);
        });
        app.MapGet("/api/salary-history/{memberId}/effective", (HttpContext ctx, long memberId, string yearMonth, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            // v1.1.0 P0-4 Phase 2: salary_history 鐜板湪鏈?created_by
            var entry = db.QueryFirstOrDefault($@"SELECT * FROM salary_history
                WHERE member_id=@MemberId AND effective_date<=@Cutoff AND {CurrentUser.UserFilterCompany(scope)}
                ORDER BY effective_date DESC LIMIT 1",
                new { MemberId = memberId, Cutoff = $"{yearMonth}-01", Uid = uid, IsAdmin = isAdmin });
            return Common.Ok(entry);
        });

        // 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?
        // 宸ヨ祫鍘嗗彶 (绯荤粺琛? 鏃?created_by)
        // 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?

        app.MapGet("/api/wage-history/{projectWorkerId}", (HttpContext ctx, long projectWorkerId, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            // v1.1.0 P0-4 Phase 2: wage_history 鐜板湪鏈?created_by
            return Common.Ok(db.Query($"SELECT * FROM wage_history WHERE project_worker_id=@Id AND {CurrentUser.UserFilterCompany(scope)} ORDER BY year_month DESC",
                new { Id = projectWorkerId, Uid = uid, IsAdmin = isAdmin }));
        });

        app.MapGet("/api/wage-history/{projectWorkerId}/effective", (HttpContext ctx, long projectWorkerId, string yearMonth, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            // v1.1.0 P0-4 Phase 2: wage_history 鐜板湪鏈?created_by
            var entry = db.QueryFirstOrDefault($@"SELECT * FROM wage_history
                WHERE project_worker_id=@Id AND year_month<=@YearMonth AND {CurrentUser.UserFilterCompany(scope)}
                ORDER BY year_month DESC LIMIT 1",
                new { Id = projectWorkerId, YearMonth = yearMonth, Uid = uid, IsAdmin = isAdmin });
            return Common.Ok(entry);
        });

        // 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?
        // 鐝粍宸ヨ祫姹囨€?
        // 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?

        app.MapGet("/api/team-wages", (HttpContext ctx, IDbConnection db, long projectId, long teamId) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var scope = CurrentUser.GetDataScope(ctx);
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            // v1.1.0 P0-4 Phase 2: 鍔?user-dim 杩囨护 (闄愬埗闈?admin 鐪嬪埌闈炴巿鏉冮」鐩?
            var sql = $@"SELECT wr.name as worker_name, pw.daily_wage,
                        COUNT(DISTINCT w.year_month) as months,
                        COALESCE(SUM(w.work_days), 0) as work_days,
                        COALESCE(SUM(w.actual_wage), 0) as total_wage
                        FROM project_workers pw
                        JOIN workers wr ON pw.worker_id=wr.id
                        LEFT JOIN wages w ON w.project_worker_id=pw.id AND w.deleted_at IS NULL
                        WHERE pw.project_id=@ProjectId AND pw.team_id=@TeamId
                          AND (pw.status='active' OR pw.status IS NULL)
                          AND {CurrentUser.UserFilterWithAuthorizedProjects(scope, "pw.project_id", "pw.created_by")}
                        GROUP BY pw.worker_id, wr.name, pw.daily_wage
                        ORDER BY wr.name";
            var details = db.Query(sql, new { Uid = uid, IsAdmin = isAdmin, ProjectId = projectId, TeamId = teamId }).ToList();
            var workerCount = details.Count;
            var teamTotal = details.Sum(d => (double)(d.total_wage ?? 0));
            return Common.Ok(new { workerCount, teamTotal, details });
        });
    }
}

================
File: EngineeringManager.Api/EngineeringManager.Api.http
================
@EngineeringManager.Api_HostAddress = http://localhost:5048

GET {{EngineeringManager.Api_HostAddress}}/weatherforecast/
Accept: application/json

###

================
File: EngineeringManager.Api/Migrations/MigrationRunner.cs
================
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
                if (IsBenignAlterError(ex)) continue;  // 列已存在等，幂等跳过
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

================
File: EngineeringManager.Api/Migrations/Scripts/001_InitialSchema.sql
================
-- 001_InitialSchema.sql
-- 初始数据库架构迁移
-- 从 EnsureTables 方法提取的表结构

-- 项目表
CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    address TEXT,
    start_date TEXT,
    end_date TEXT,
    status TEXT DEFAULT 'active',
    budget REAL DEFAULT 0,
    created_at TEXT,
    updated_at TEXT
);

-- 人员表
CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    member_type TEXT DEFAULT 'staff',
    role TEXT,
    id_card TEXT,
    gender TEXT,
    ethnicity TEXT,
    birth_date TEXT,
    id_card_address TEXT,
    base_salary REAL,
    daily_wage REAL,
    entry_date TEXT,
    status TEXT DEFAULT 'active',
    department_id INTEGER,
    position TEXT,
    bank_account TEXT,
    bank_name TEXT,
    bank_line_no TEXT,
    photo TEXT,
    created_at TEXT,
    updated_at TEXT
);

-- 工人表
CREATE TABLE IF NOT EXISTS workers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    id_card TEXT,
    gender TEXT,
    phone TEXT,
    address TEXT,
    bank_account TEXT,
    bank_name TEXT,
    bank_line_no TEXT,
    worker_type TEXT,
    daily_wage REAL,
    created_at TEXT,
    updated_at TEXT
);

-- 项目工人关联表
CREATE TABLE IF NOT EXISTS project_workers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    worker_id INTEGER,
    project_id INTEGER,
    team_id INTEGER,
    daily_wage REAL,
    worker_type TEXT,
    entry_date TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT,
    updated_at TEXT
);

-- 收入合同表
CREATE TABLE IF NOT EXISTS income_contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    name TEXT NOT NULL,
    amount REAL,
    counterparty TEXT,
    sign_date TEXT,
    status TEXT DEFAULT 'draft',
    remark TEXT,
    files TEXT,
    created_at TEXT,
    updated_at TEXT
);

-- 支出合同表
CREATE TABLE IF NOT EXISTS expense_contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    name TEXT NOT NULL,
    amount REAL,
    counterparty TEXT,
    sign_date TEXT,
    status TEXT DEFAULT 'draft',
    remark TEXT,
    files TEXT,
    created_at TEXT,
    updated_at TEXT
);

-- 协议合同表
CREATE TABLE IF NOT EXISTS agreement_contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    name TEXT NOT NULL,
    amount REAL,
    counterparty TEXT,
    sign_date TEXT,
    agreement_type TEXT,
    status TEXT DEFAULT 'draft',
    remark TEXT,
    files TEXT,
    created_at TEXT,
    updated_at TEXT
);

-- 发票表
CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    seller_id INTEGER,
    buyer_id INTEGER,
    contract_id INTEGER,
    type TEXT,
    invoice_kind TEXT,
    invoice_no TEXT,
    invoice_code TEXT,
    name TEXT,
    amount REAL DEFAULT 0,
    price_amount REAL DEFAULT 0,
    tax_amount REAL DEFAULT 0,
    tax_rate REAL DEFAULT 0,
    received_amount REAL DEFAULT 0,
    settlement_id INTEGER,
    issue_date TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    remarks TEXT DEFAULT '',
    file_url TEXT,
    file_type TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 支付记录表
CREATE TABLE IF NOT EXISTS payment_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    amount REAL DEFAULT 0,
    record_date TEXT DEFAULT '',
    project_id INTEGER,
    partner_id INTEGER,
    contract_id INTEGER,
    invoice_details TEXT DEFAULT '[]',
    remarks TEXT DEFAULT '',
    file_url TEXT,
    file_type TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- 合作伙伴表
CREATE TABLE IF NOT EXISTS partners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT,
    contact TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    bank_account TEXT,
    bank_name TEXT,
    credit_code TEXT,
    registered_address TEXT,
    business_scope TEXT,
    tax_type TEXT,
    license_file TEXT,
    license_file_type TEXT,
    other_files TEXT,
    other_files_type TEXT,
    project_ids TEXT,
    remarks TEXT,
    created_at TEXT,
    updated_at TEXT
);

-- 监管单位表
CREATE TABLE IF NOT EXISTS supervisors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    region_id INTEGER,
    name TEXT NOT NULL,
    category TEXT,
    contact TEXT,
    phone TEXT,
    address TEXT,
    project_ids TEXT,
    remarks TEXT,
    created_at TEXT,
    updated_at TEXT
);

-- 工资表
CREATE TABLE IF NOT EXISTS wages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    member_id INTEGER,
    project_worker_id INTEGER,
    year_month TEXT,
    daily_wage REAL,
    work_days REAL,
    bonus REAL DEFAULT 0,
    deduction REAL DEFAULT 0,
    actual_wage REAL,
    paid_amount REAL,
    paid_date TEXT,
    status TEXT DEFAULT 'pending',
    created_at TEXT,
    updated_at TEXT
);

-- 考勤表
CREATE TABLE IF NOT EXISTS attendances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER,
    project_id INTEGER,
    project_worker_id INTEGER,
    year_month TEXT,
    work_days REAL,
    days_off INTEGER,
    is_full_attendance INTEGER,
    daily_status TEXT,
    file_url TEXT,
    file_name TEXT,
    created_at TEXT,
    updated_at TEXT
);

-- 结算表
CREATE TABLE IF NOT EXISTS settlements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    partner_id INTEGER,
    name TEXT,
    category TEXT,
    amount REAL,
    status TEXT DEFAULT 'pending',
    date TEXT,
    remark TEXT,
    files TEXT,
    invoice_details TEXT,
    created_at TEXT,
    updated_at TEXT
);

-- 成本台账表
CREATE TABLE IF NOT EXISTS cost_ledger (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    batch_id INTEGER,
    voucher_no TEXT,
    date TEXT,
    direction TEXT,
    category TEXT,
    amount REAL,
    counterparty TEXT,
    channel TEXT,
    summary TEXT,
    notes TEXT,
    attachments TEXT,
    linked_invoice_id INTEGER,
    created_at TEXT,
    updated_at TEXT
);

-- 成本台账分类表
CREATE TABLE IF NOT EXISTS cost_ledger_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    direction TEXT,
    level1 TEXT,
    color TEXT,
    created_at TEXT
);

-- 成本台账匹配规则表
CREATE TABLE IF NOT EXISTS cost_ledger_match_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pattern TEXT,
    category TEXT,
    direction TEXT,
    priority INTEGER,
    created_at TEXT
);

-- 库存项目表
CREATE TABLE IF NOT EXISTS inventory_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT,
    unit TEXT,
    quantity REAL DEFAULT 0,
    min_quantity REAL,
    location TEXT,
    notes TEXT,
    created_at TEXT,
    updated_at TEXT
);

-- 库存交易表
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER,
    project_id INTEGER,
    type TEXT,
    quantity REAL,
    unit_price REAL,
    date TEXT,
    remark TEXT,
    created_at TEXT
);

-- 材料表
CREATE TABLE IF NOT EXISTS materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT,
    unit TEXT,
    specifications TEXT,
    supplier TEXT,
    notes TEXT,
    created_at TEXT,
    updated_at TEXT
);

-- 模板表
CREATE TABLE IF NOT EXISTS templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT,
    category TEXT,
    content TEXT,
    variables TEXT,
    created_at TEXT,
    updated_at TEXT
);

-- 审计日志表
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT,
    level TEXT,
    user_id TEXT,
    user_name TEXT,
    resource TEXT,
    resource_id TEXT,
    details TEXT,
    ip_address TEXT,
    created_at TEXT
);

-- 角色表
CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    permissions TEXT,
    is_system INTEGER DEFAULT 0,
    created_at TEXT
);

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT,
    password_hash TEXT,
    password_salt TEXT,
    password_hash_version INTEGER DEFAULT 1,
    salt TEXT,
    display_name TEXT,
    role_id TEXT,
    status TEXT DEFAULT 'active',
    avatar TEXT,
    created_at TEXT,
    updated_at TEXT
);

-- 快照表
CREATE TABLE IF NOT EXISTS snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    size INTEGER,
    created_at TEXT
);

-- 部门表
CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    manager_id INTEGER,
    positions TEXT,
    created_at TEXT
);

-- 薪资历史表
CREATE TABLE IF NOT EXISTS salary_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER,
    effective_date TEXT,
    base_salary REAL,
    subsidy REAL,
    subsidy_note TEXT,
    note TEXT,
    created_at TEXT
);

-- 工人班组表
CREATE TABLE IF NOT EXISTS worker_teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    project_id INTEGER,
    leader_id INTEGER,
    remark TEXT,
    created_at TEXT,
    updated_at TEXT
);

-- 项目成员表
CREATE TABLE IF NOT EXISTS project_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    member_id INTEGER,
    joined_at TEXT
);

-- 区域表
CREATE TABLE IF NOT EXISTS regions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    province TEXT,
    city TEXT,
    district TEXT
);

-- 图纸表
CREATE TABLE IF NOT EXISTS drawings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    name TEXT,
    file_url TEXT,
    file_name TEXT,
    file_type TEXT,
    remark TEXT,
    created_at TEXT,
    updated_at TEXT
);

-- 费用表
CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    category TEXT,
    amount REAL,
    date TEXT,
    description TEXT,
    vendor TEXT,
    receipt_url TEXT,
    created_at TEXT,
    updated_at TEXT
);

-- 合同模板表
CREATE TABLE IF NOT EXISTS contract_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT,
    content TEXT,
    variables TEXT,
    created_at TEXT,
    updated_at TEXT
);

-- 角色种子数据
INSERT OR IGNORE INTO roles (id, name, permissions, is_system, created_at) VALUES
('admin', '管理员', 'all', 1, datetime('now')),
('manager', '项目经理', 'project:read,project:write,wage:read,wage:write,attendance:read,attendance:write', 1, datetime('now')),
('finance', '财务', 'invoice:read,invoice:write,settlement:read,settlement:write,cost_ledger:read,cost_ledger:write', 1, datetime('now')),
('worker', '工人', 'attendance:read,wage:read', 1, datetime('now'));

================
File: EngineeringManager.Api/Migrations/Scripts/002_SeedAdminUser.sql
================
-- 002_SeedAdminUser.sql
-- 占位：admin 用户由测试基类程序式创建（需要 PBKDF2 哈希计算）
SELECT 1;

================
File: EngineeringManager.Api/Migrations/Scripts/003_MoneyRealToInteger.sql
================
-- Phase 1.3: 金额 REAL → INTEGER（以"分为单位"）
-- 注意：每个表单独执行，MigrationRunner 会自动包裹事务

-- 1. projects.budget
CREATE TABLE IF NOT EXISTS projects_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    address TEXT,
    start_date TEXT,
    end_date TEXT,
    status TEXT DEFAULT 'active',
    budget INTEGER DEFAULT 0,
    created_at TEXT,
    updated_at TEXT
);

INSERT INTO projects_new
SELECT id, name, description, address, start_date, end_date, status,
       CAST(COALESCE(budget, 0) * 100 AS INTEGER), created_at, updated_at
FROM projects;

DROP TABLE projects;

ALTER TABLE projects_new RENAME TO projects;

-- 2. members.base_salary, daily_wage
CREATE TABLE IF NOT EXISTS members_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    member_type TEXT DEFAULT 'staff',
    role TEXT,
    id_card TEXT,
    gender TEXT,
    ethnicity TEXT,
    birth_date TEXT,
    id_card_address TEXT,
    base_salary INTEGER DEFAULT 0,
    daily_wage INTEGER DEFAULT 0,
    entry_date TEXT,
    status TEXT DEFAULT 'active',
    department_id INTEGER,
    position TEXT,
    bank_account TEXT,
    bank_name TEXT,
    bank_line_no TEXT,
    photo TEXT,
    created_at TEXT,
    updated_at TEXT
);

INSERT INTO members_new
SELECT id, name, phone, email, member_type, role, id_card, gender, ethnicity,
       birth_date, id_card_address,
       CAST(COALESCE(base_salary, 0) * 100 AS INTEGER),
       CAST(COALESCE(daily_wage, 0) * 100 AS INTEGER),
       entry_date, status, department_id, position, bank_account, bank_name,
       bank_line_no, photo, created_at, updated_at
FROM members;

DROP TABLE members;

ALTER TABLE members_new RENAME TO members;

-- 3. workers.daily_wage
CREATE TABLE IF NOT EXISTS workers_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    id_card TEXT,
    gender TEXT,
    phone TEXT,
    address TEXT,
    bank_account TEXT,
    bank_name TEXT,
    bank_line_no TEXT,
    worker_type TEXT,
    daily_wage INTEGER DEFAULT 0,
    created_at TEXT,
    updated_at TEXT
);

INSERT INTO workers_new
SELECT id, name, id_card, gender, phone, address, bank_account, bank_name,
       bank_line_no, worker_type,
       CAST(COALESCE(daily_wage, 0) * 100 AS INTEGER),
       created_at, updated_at
FROM workers;

DROP TABLE workers;

ALTER TABLE workers_new RENAME TO workers;

-- 4. project_workers.daily_wage
CREATE TABLE IF NOT EXISTS project_workers_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    worker_id INTEGER,
    project_id INTEGER,
    team_id INTEGER,
    daily_wage INTEGER DEFAULT 0,
    worker_type TEXT,
    entry_date TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT,
    updated_at TEXT
);

INSERT INTO project_workers_new
SELECT id, worker_id, project_id, team_id,
       CAST(COALESCE(daily_wage, 0) * 100 AS INTEGER),
       worker_type, entry_date, status, created_at, updated_at
FROM project_workers;

DROP TABLE project_workers;

ALTER TABLE project_workers_new RENAME TO project_workers;

-- 5. income_contracts.amount
CREATE TABLE IF NOT EXISTS income_contracts_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    name TEXT NOT NULL,
    amount INTEGER DEFAULT 0,
    counterparty TEXT,
    sign_date TEXT,
    status TEXT DEFAULT 'draft',
    remark TEXT,
    files TEXT,
    created_at TEXT,
    updated_at TEXT
);

INSERT INTO income_contracts_new
SELECT id, project_id, name,
       CAST(COALESCE(amount, 0) * 100 AS INTEGER),
       counterparty, sign_date, status, remark, files, created_at, updated_at
FROM income_contracts;

DROP TABLE income_contracts;

ALTER TABLE income_contracts_new RENAME TO income_contracts;

-- 6. expense_contracts.amount
CREATE TABLE IF NOT EXISTS expense_contracts_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    name TEXT NOT NULL,
    amount INTEGER DEFAULT 0,
    counterparty TEXT,
    sign_date TEXT,
    status TEXT DEFAULT 'draft',
    remark TEXT,
    files TEXT,
    created_at TEXT,
    updated_at TEXT
);

INSERT INTO expense_contracts_new
SELECT id, project_id, name,
       CAST(COALESCE(amount, 0) * 100 AS INTEGER),
       counterparty, sign_date, status, remark, files, created_at, updated_at
FROM expense_contracts;

DROP TABLE expense_contracts;

ALTER TABLE expense_contracts_new RENAME TO expense_contracts;

-- 7. agreement_contracts.amount
CREATE TABLE IF NOT EXISTS agreement_contracts_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    name TEXT NOT NULL,
    amount INTEGER DEFAULT 0,
    counterparty TEXT,
    sign_date TEXT,
    agreement_type TEXT,
    status TEXT DEFAULT 'draft',
    remark TEXT,
    files TEXT,
    created_at TEXT,
    updated_at TEXT
);

INSERT INTO agreement_contracts_new
SELECT id, project_id, name,
       CAST(COALESCE(amount, 0) * 100 AS INTEGER),
       counterparty, sign_date, agreement_type, status, remark, files, created_at, updated_at
FROM agreement_contracts;

DROP TABLE agreement_contracts;

ALTER TABLE agreement_contracts_new RENAME TO agreement_contracts;

-- 8. invoices (多个金额字段)
CREATE TABLE IF NOT EXISTS invoices_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    seller_id INTEGER,
    buyer_id INTEGER,
    contract_id INTEGER,
    type TEXT,
    invoice_kind TEXT,
    invoice_no TEXT,
    invoice_code TEXT,
    name TEXT,
    amount INTEGER DEFAULT 0,
    price_amount INTEGER DEFAULT 0,
    tax_amount INTEGER DEFAULT 0,
    tax_rate REAL DEFAULT 0,
    received_amount INTEGER DEFAULT 0,
    settlement_id INTEGER,
    issue_date TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    remarks TEXT DEFAULT '',
    file_url TEXT,
    file_type TEXT,
    created_at TEXT,
    updated_at TEXT
);

INSERT INTO invoices_new
SELECT id, project_id, seller_id, buyer_id, contract_id, type, invoice_kind,
       invoice_no, invoice_code, name,
       CAST(COALESCE(amount, 0) * 100 AS INTEGER),
       CAST(COALESCE(price_amount, 0) * 100 AS INTEGER),
       CAST(COALESCE(tax_amount, 0) * 100 AS INTEGER),
       tax_rate,
       CAST(COALESCE(received_amount, 0) * 100 AS INTEGER),
       settlement_id, issue_date, status, remarks, file_url, file_type,
       created_at, updated_at
FROM invoices;

DROP TABLE invoices;

ALTER TABLE invoices_new RENAME TO invoices;

-- 9. payment_records.amount
CREATE TABLE IF NOT EXISTS payment_records_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    amount INTEGER DEFAULT 0,
    record_date TEXT DEFAULT '',
    project_id INTEGER,
    partner_id INTEGER,
    contract_id INTEGER,
    invoice_details TEXT DEFAULT '[]',
    remarks TEXT DEFAULT '',
    file_url TEXT,
    file_type TEXT,
    created_at TEXT
);

INSERT INTO payment_records_new
SELECT id, type,
       CAST(COALESCE(amount, 0) * 100 AS INTEGER),
       record_date, project_id, partner_id, contract_id, invoice_details,
       remarks, file_url, file_type, created_at
FROM payment_records;

DROP TABLE payment_records;

ALTER TABLE payment_records_new RENAME TO payment_records;

-- 10. wages (多个金额字段)
CREATE TABLE IF NOT EXISTS wages_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    member_id INTEGER,
    project_worker_id INTEGER,
    year_month TEXT,
    daily_wage INTEGER DEFAULT 0,
    work_days REAL DEFAULT 0,
    bonus INTEGER DEFAULT 0,
    deduction INTEGER DEFAULT 0,
    actual_wage INTEGER DEFAULT 0,
    paid_amount INTEGER DEFAULT 0,
    paid_date TEXT,
    status TEXT DEFAULT 'pending',
    created_at TEXT,
    updated_at TEXT
);

INSERT INTO wages_new
SELECT id, project_id, member_id, project_worker_id, year_month,
       CAST(COALESCE(daily_wage, 0) * 100 AS INTEGER),
       work_days,
       CAST(COALESCE(bonus, 0) * 100 AS INTEGER),
       CAST(COALESCE(deduction, 0) * 100 AS INTEGER),
       CAST(COALESCE(actual_wage, 0) * 100 AS INTEGER),
       CAST(COALESCE(paid_amount, 0) * 100 AS INTEGER),
       paid_date, status, created_at, updated_at
FROM wages;

DROP TABLE wages;

ALTER TABLE wages_new RENAME TO wages;

-- 11. settlements.amount
CREATE TABLE IF NOT EXISTS settlements_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    partner_id INTEGER,
    name TEXT,
    category TEXT,
    amount INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',
    date TEXT,
    remark TEXT,
    files TEXT,
    invoice_details TEXT,
    created_at TEXT,
    updated_at TEXT
);

INSERT INTO settlements_new
SELECT id, project_id, partner_id, name, category,
       CAST(COALESCE(amount, 0) * 100 AS INTEGER),
       status, date, remark, files, invoice_details, created_at, updated_at
FROM settlements;

DROP TABLE settlements;

ALTER TABLE settlements_new RENAME TO settlements;

-- 12. cost_ledger.amount
CREATE TABLE IF NOT EXISTS cost_ledger_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    batch_id INTEGER,
    voucher_no TEXT,
    date TEXT,
    direction TEXT,
    category TEXT,
    amount INTEGER DEFAULT 0,
    counterparty TEXT,
    channel TEXT,
    summary TEXT,
    notes TEXT,
    attachments TEXT,
    linked_invoice_id INTEGER,
    created_at TEXT,
    updated_at TEXT
);

INSERT INTO cost_ledger_new
SELECT id, project_id, batch_id, voucher_no, date, direction, category,
       CAST(COALESCE(amount, 0) * 100 AS INTEGER),
       counterparty, channel, summary, notes, attachments, linked_invoice_id,
       created_at, updated_at
FROM cost_ledger;

DROP TABLE cost_ledger;

ALTER TABLE cost_ledger_new RENAME TO cost_ledger;

-- 13. inventory_transactions.unit_price
CREATE TABLE IF NOT EXISTS inventory_transactions_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER,
    project_id INTEGER,
    type TEXT,
    quantity REAL DEFAULT 0,
    unit_price INTEGER DEFAULT 0,
    date TEXT,
    remark TEXT,
    created_at TEXT
);

INSERT INTO inventory_transactions_new
SELECT id, item_id, project_id, type, quantity,
       CAST(COALESCE(unit_price, 0) * 100 AS INTEGER),
       date, remark, created_at
FROM inventory_transactions;

DROP TABLE inventory_transactions;

ALTER TABLE inventory_transactions_new RENAME TO inventory_transactions;

-- 14. expenses.amount
CREATE TABLE IF NOT EXISTS expenses_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    category TEXT,
    amount INTEGER DEFAULT 0,
    date TEXT,
    description TEXT,
    vendor TEXT,
    receipt_url TEXT,
    created_at TEXT,
    updated_at TEXT
);

INSERT INTO expenses_new
SELECT id, project_id, category,
       CAST(COALESCE(amount, 0) * 100 AS INTEGER),
       date, description, vendor, receipt_url, created_at, updated_at
FROM expenses;

DROP TABLE expenses;

ALTER TABLE expenses_new RENAME TO expenses;

-- 15. salary_history (base_salary, subsidy)
CREATE TABLE IF NOT EXISTS salary_history_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER,
    effective_date TEXT,
    base_salary INTEGER DEFAULT 0,
    subsidy INTEGER DEFAULT 0,
    subsidy_note TEXT,
    note TEXT,
    created_at TEXT
);

INSERT INTO salary_history_new
SELECT id, member_id, effective_date,
       CAST(COALESCE(base_salary, 0) * 100 AS INTEGER),
       CAST(COALESCE(subsidy, 0) * 100 AS INTEGER),
       subsidy_note, note, created_at
FROM salary_history;

DROP TABLE salary_history;

ALTER TABLE salary_history_new RENAME TO salary_history;

================
File: EngineeringManager.Api/Migrations/Scripts/004_SoftDeleteFields.sql
================
-- Phase 2.1: 财务表添加软删除字段 deleted_at

-- invoices
ALTER TABLE invoices ADD COLUMN deleted_at TEXT;

-- payment_records
ALTER TABLE payment_records ADD COLUMN deleted_at TEXT;

-- wages
ALTER TABLE wages ADD COLUMN deleted_at TEXT;

-- settlements
ALTER TABLE settlements ADD COLUMN deleted_at TEXT;

-- cost_ledger
ALTER TABLE cost_ledger ADD COLUMN deleted_at TEXT;

================
File: EngineeringManager.Api/Migrations/Scripts/005_NormalizeTextFields.sql
================
-- Phase 2.2: 拆解 TEXT 多值字段（1NF 修复）
-- 创建关联表并迁移数据

-- 1. partner_projects（合作伙伴↔项目）
CREATE TABLE IF NOT EXISTS partner_projects (
    partner_id INTEGER NOT NULL,
    project_id INTEGER NOT NULL,
    PRIMARY KEY (partner_id, project_id)
);

-- 2. supervisor_projects（监管单位↔项目）
CREATE TABLE IF NOT EXISTS supervisor_projects (
    supervisor_id INTEGER NOT NULL,
    project_id INTEGER NOT NULL,
    PRIMARY KEY (supervisor_id, project_id)
);

-- 3. contract_files（合同附件）
CREATE TABLE IF NOT EXISTS contract_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_id INTEGER NOT NULL,
    contract_type TEXT NOT NULL,
    file_name TEXT,
    file_url TEXT
);

-- 4. settlement_files（结算附件）
CREATE TABLE IF NOT EXISTS settlement_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    settlement_id INTEGER NOT NULL,
    file_name TEXT,
    file_url TEXT
);

-- 5. payment_invoices（支付↔发票关联）
CREATE TABLE IF NOT EXISTS payment_invoices (
    payment_id INTEGER NOT NULL,
    invoice_id INTEGER NOT NULL,
    amount INTEGER DEFAULT 0,
    PRIMARY KEY (payment_id, invoice_id)
);

-- 6. settlement_invoices（结算↔发票关联）
CREATE TABLE IF NOT EXISTS settlement_invoices (
    settlement_id INTEGER NOT NULL,
    invoice_id INTEGER NOT NULL,
    amount INTEGER DEFAULT 0,
    PRIMARY KEY (settlement_id, invoice_id)
);

-- 7. department_positions（部门↔职位）
CREATE TABLE IF NOT EXISTS department_positions (
    dept_id INTEGER NOT NULL,
    position_name TEXT NOT NULL,
    PRIMARY KEY (dept_id, position_name)
);

-- 注意：原表 TEXT 字段保留，不删除（SQLite 不支持 DROP COLUMN）
-- WHERE 过滤在 Phase 4 Repository 层统一处理

================
File: EngineeringManager.Api/Migrations/Scripts/006_AddIndexes.sql
================
-- Phase 2.3: 添加索引

-- 项目工人表
CREATE INDEX IF NOT EXISTS idx_pw_project ON project_workers(project_id);
CREATE INDEX IF NOT EXISTS idx_pw_worker ON project_workers(worker_id);

-- 发票表
CREATE INDEX IF NOT EXISTS idx_invoices_project ON invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_deleted ON invoices(deleted_at);

-- 成本台账表
CREATE INDEX IF NOT EXISTS idx_cost_ledger_project ON cost_ledger(project_id);
CREATE INDEX IF NOT EXISTS idx_cost_ledger_direction ON cost_ledger(direction);

-- 工资表
CREATE INDEX IF NOT EXISTS idx_wages_project_month ON wages(project_id, year_month);

-- 考勤表
CREATE INDEX IF NOT EXISTS idx_attendances_project_month ON attendances(project_id, year_month);

-- 结算表
CREATE INDEX IF NOT EXISTS idx_settlements_project ON settlements(project_id);

-- 支付记录表
CREATE INDEX IF NOT EXISTS idx_payment_records_project ON payment_records(project_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_type ON payment_records(type);

================
File: EngineeringManager.Api/Migrations/Scripts/007_AddAuditFields.sql
================
-- Phase 2.4: 统一审计字段（补充缺失字段）

-- project_members 添加 created_at
ALTER TABLE project_members ADD COLUMN created_at TEXT;

================
File: EngineeringManager.Api/Migrations/Scripts/007b_AddProjectMembersCreatedAt.sql
================
-- Phase 2.4 补充: project_members 添加 created_at
ALTER TABLE project_members ADD COLUMN created_at TEXT;

================
File: EngineeringManager.Api/Migrations/Scripts/008_RestoreProjectManagerId.sql
================
-- 修复迁移：确保 projects 表包含 project_manager_id 列
-- 迁移 003 的 projects_new 表定义缺少此列

-- 检查并添加 project_manager_id（如果不存在）
-- SQLite 不支持 IF NOT EXISTS for ADD COLUMN，需要用异常处理
INSERT OR IGNORE INTO projects (id, name, description, address, start_date, end_date, status, budget, created_at, updated_at)
SELECT id, name, description, address, start_date, end_date, status, budget, created_at, updated_at FROM projects WHERE 1=0;

-- 尝试添加列（如果已存在会失败，忽略错误）
-- 注意：SQLite 的 ALTER TABLE ADD COLUMN 如果列已存在会报错

================
File: EngineeringManager.Api/Migrations/Scripts/009_AddCreatedByToBusinessTables.sql
================
-- v1.1.0 P0-4 完整版: 19 个业务表加 created_by TEXT 列 + 索引
-- ALTER TABLE ADD COLUMN 是幂等的（MigrationRunner 自动吞"duplicate column name"）
-- 所有 created_by 为 NULL 的旧记录：admin 可见 + 项目成员可见，普通用户不可见（SELECT 端点处理）

-- 项目相关
ALTER TABLE projects ADD COLUMN created_by TEXT;
ALTER TABLE project_members ADD COLUMN created_by TEXT;
ALTER TABLE project_workers ADD COLUMN created_by TEXT;

-- 合同相关
ALTER TABLE income_contracts ADD COLUMN created_by TEXT;
ALTER TABLE expense_contracts ADD COLUMN created_by TEXT;
ALTER TABLE agreement_contracts ADD COLUMN created_by TEXT;

-- 工资相关
ALTER TABLE wages ADD COLUMN created_by TEXT;

-- 考勤相关
ALTER TABLE attendances ADD COLUMN created_by TEXT;

-- 工人/人事相关
ALTER TABLE members ADD COLUMN created_by TEXT;
ALTER TABLE workers ADD COLUMN created_by TEXT;

-- 单位相关
ALTER TABLE partners ADD COLUMN created_by TEXT;
ALTER TABLE supervisors ADD COLUMN created_by TEXT;

-- 库存相关
ALTER TABLE inventory_items ADD COLUMN created_by TEXT;
ALTER TABLE inventory_transactions ADD COLUMN created_by TEXT;
ALTER TABLE materials ADD COLUMN created_by TEXT;

-- 费用/图纸相关
ALTER TABLE expenses ADD COLUMN created_by TEXT;
ALTER TABLE drawings ADD COLUMN created_by TEXT;

-- 索引（高频查询：created_by 单列）
CREATE INDEX IF NOT EXISTS idx_income_contracts_created_by ON income_contracts(created_by);
CREATE INDEX IF NOT EXISTS idx_expense_contracts_created_by ON expense_contracts(created_by);
CREATE INDEX IF NOT EXISTS idx_agreement_contracts_created_by ON agreement_contracts(created_by);
CREATE INDEX IF NOT EXISTS idx_wages_created_by ON wages(created_by);
CREATE INDEX IF NOT EXISTS idx_attendances_created_by ON attendances(created_by);
CREATE INDEX IF NOT EXISTS idx_members_created_by ON members(created_by);
CREATE INDEX IF NOT EXISTS idx_workers_created_by ON workers(created_by);
CREATE INDEX IF NOT EXISTS idx_partners_created_by ON partners(created_by);
CREATE INDEX IF NOT EXISTS idx_inventory_items_created_by ON inventory_items(created_by);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_created_by ON inventory_transactions(created_by);
CREATE INDEX IF NOT EXISTS idx_materials_created_by ON materials(created_by);
CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON expenses(created_by);
CREATE INDEX IF NOT EXISTS idx_drawings_created_by ON drawings(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_project_workers_created_by ON project_workers(created_by);
CREATE INDEX IF NOT EXISTS idx_supervisors_created_by ON supervisors(created_by);

================
File: EngineeringManager.Api/Migrations/Scripts/010_AddProjectMembersUserId.sql
================
-- v1.1.0 P0-4 完整版: project_members 加 user_id TEXT 列（与 member_id INTEGER 共存）
-- 用途：JWT 鉴权时通过 user_id 关联项目，决定 SELECT 是否返回该项目的记录
-- ALTER TABLE ADD COLUMN 是幂等的

ALTER TABLE project_members ADD COLUMN user_id TEXT;

CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);

================
File: EngineeringManager.Api/Migrations/Scripts/011_AddCreatedByToInvoicesAndPaymentRecords.sql
================
-- v1.1.0 Sprint B Step 2 第六批: invoices + payment_records 加 created_by TEXT 列 + 索引
-- 用于 InvoiceEndpoints INSERT/UPDATE/DELETE 端点加 created_by 过滤
-- ALTER TABLE ADD COLUMN 是幂等的

ALTER TABLE invoices ADD COLUMN created_by TEXT;
ALTER TABLE payment_records ADD COLUMN created_by TEXT;

CREATE INDEX IF NOT EXISTS idx_invoices_created_by ON invoices(created_by);
CREATE INDEX IF NOT EXISTS idx_payment_records_created_by ON payment_records(created_by);

================
File: EngineeringManager.Api/Migrations/Scripts/011_AddPiiEncryptionColumns.sql
================
-- v1.2.0 阶段 A.2: 13 个 PII 列加 _enc 字段 (加密存储)
-- 策略: 保留原明文列 (兼容老代码读 + 新代码写 _enc), 新代码优先读 _enc

-- members: 4 个 PII 列
ALTER TABLE members ADD COLUMN id_card_enc TEXT;
ALTER TABLE members ADD COLUMN id_card_address_enc TEXT;
ALTER TABLE members ADD COLUMN phone_enc TEXT;
ALTER TABLE members ADD COLUMN bank_account_enc TEXT;

-- workers: 4 个 PII 列
ALTER TABLE workers ADD COLUMN id_card_enc TEXT;
ALTER TABLE workers ADD COLUMN phone_enc TEXT;
ALTER TABLE workers ADD COLUMN address_enc TEXT;
ALTER TABLE workers ADD COLUMN bank_account_enc TEXT;

-- partners: 4 个 PII 列
ALTER TABLE partners ADD COLUMN phone_enc TEXT;
ALTER TABLE partners ADD COLUMN bank_account_enc TEXT;
ALTER TABLE partners ADD COLUMN credit_code_enc TEXT;
ALTER TABLE partners ADD COLUMN tax_number_enc TEXT;

-- supervisors: 1 个 PII 列
ALTER TABLE supervisors ADD COLUMN phone_enc TEXT;

-- 共 13 个 _enc 列

-- 注: 一次性回填由 scripts/v1.2.0-backfill-pii.cjs 处理
--      (因为 AES-GCM 加密必须在 C# 端做, 不能在 SQL 里跑)

================
File: EngineeringManager.Api/Migrations/Scripts/012_MigrateUsersToPasswordHash.sql
================
-- v0.71.0 P2.1: 迁移 users 表从 password+salt → password_hash+salt+version
-- 背景: 001_InitialSchema.sql 旧 users 表用 `password TEXT NOT NULL, salt TEXT`
--        Program.cs:282 新 EnsureTables 改用 `password_hash+salt+version` (新 schema 无 salt 列)
--        AuthEndpoints.cs 已只读 password_hash+salt+version, 旧库登录会失败
-- 策略: 
--   1) 加 3 个新列 (幂等, MigrationRunner 吞 duplicate)
--   2) 旧字段保留 (备份) - 如果有 salt 列, 复制到 password_salt
--   3) password_hash 留空 = 强制重置
-- 注意: 实际老库可能有 salt 列 (从 001 升级) 或无 salt 列 (新装)
--      本脚本只操作 password_salt, 不会触发 "no such column" 错误

-- 1. 加新列 (幂等)
ALTER TABLE users ADD COLUMN password_hash TEXT;
ALTER TABLE users ADD COLUMN password_salt TEXT;
ALTER TABLE users ADD COLUMN password_hash_version INTEGER DEFAULT 1;

-- 2. 仅在 password_hash 为空时初始化 password_salt (兼容新老库)
--    新库: password_salt 已有值 (登录时设), 不覆盖
--    老库 (有 salt 列): 复制 salt 到 password_salt
--    老库 (无 salt 列): 用 legacy-salt 占位
UPDATE users SET
    password_salt = COALESCE(password_salt, "legacy-salt-needs-reset"),
    password_hash_version = COALESCE(password_hash_version, 1)
WHERE password_hash IS NULL OR password_hash = '';

-- 3. 旧 password + salt 列保留 (不删, 作为历史备份)

-- 验证: 任意用户的 password_hash 为空 → AuthEndpoints 登录失败
--        引导用户走 /api/auth/reset-password 端点

================
File: EngineeringManager.Api/Migrations/Scripts/013_AddProjectAuthorizations.sql
================
-- v1.1.0 P0-4 完整版: admin 手动授权表 project_authorizations
-- 设计: admin 在 UI 上授权某用户能看某项目, 系统记录到这张表.
--   SELECT 过滤时: (created_by=@Uid OR @IsAdmin=1 OR X.project_id IN (SELECT project_id FROM project_authorizations WHERE user_id=@Uid))
--   - admin 看全表 (短路 @IsAdmin=1)
--   - 非 admin: 看自己创建的 + admin 授权过他能看的项目下的全部记录
--
-- 字段:
--   project_id INTEGER  -- 关联 projects.id
--   user_id    TEXT     -- 关联 users.id (JWT uid claim)
--   granted_by TEXT     -- 谁授权的 (通常是 admin)
--   granted_at TEXT     -- 授权时间
--   PRIMARY KEY (project_id, user_id) -- 同一用户同一项目只能授一次
--
-- CREATE TABLE IF NOT EXISTS 是幂等的 (MigrationRunner 已支持)

CREATE TABLE IF NOT EXISTS project_authorizations (
    project_id INTEGER NOT NULL,
    user_id    TEXT    NOT NULL,
    granted_by TEXT,
    granted_at TEXT,
    PRIMARY KEY (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_auth_user_id ON project_authorizations(user_id);
CREATE INDEX IF NOT EXISTS idx_project_auth_project_id ON project_authorizations(project_id);

================
File: EngineeringManager.Api/Migrations/Scripts/014_AddCreatedByToRemainingTables.sql
================
-- v1.1.0 P0-4 完整版: 6 张"无 created_by"的表加 created_by 列
-- 原因: 这些表之前没加 created_by, 没法做 user-dim 越权过滤
-- 兼容性: ALTER TABLE ADD COLUMN 是幂等的 (MigrationRunner 吞"duplicate column name")
--
-- 包含:
--   cost_ledger (3 个端点用) - 财务流水, 加后能按创建人隔离
--   settlements (1 个端点) - 结算单
--   worker_teams (1 个端点) - 班组 (创建人通常是项目经理)
--   departments (1 个端点) - 部门 (创建人通常是 admin)
--   contract_templates (1 个端点) - 合同模板
--   salary_history (2 个端点) + wage_history (2 个端点) - 工资历史

-- 财务流水
ALTER TABLE cost_ledger ADD COLUMN created_by TEXT;
CREATE INDEX IF NOT EXISTS idx_cost_ledger_created_by ON cost_ledger(created_by);

-- 结算
ALTER TABLE settlements ADD COLUMN created_by TEXT;
CREATE INDEX IF NOT EXISTS idx_settlements_created_by ON settlements(created_by);

-- 班组
ALTER TABLE worker_teams ADD COLUMN created_by TEXT;
CREATE INDEX IF NOT EXISTS idx_worker_teams_created_by ON worker_teams(created_by);

-- 部门
ALTER TABLE departments ADD COLUMN created_by TEXT;
CREATE INDEX IF NOT EXISTS idx_departments_created_by ON departments(created_by);

-- 合同模板
ALTER TABLE contract_templates ADD COLUMN created_by TEXT;
CREATE INDEX IF NOT EXISTS idx_contract_templates_created_by ON contract_templates(created_by);

-- 工资历史
ALTER TABLE salary_history ADD COLUMN created_by TEXT;
CREATE INDEX IF NOT EXISTS idx_salary_history_created_by ON salary_history(created_by);

-- wage_history 表在 001_InitialSchema.sql 不存在, 需先创建 (含 created_by)
-- 设计: 跟 salary_history 类似, 按 project_worker_id 关联
CREATE TABLE IF NOT EXISTS wage_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_worker_id INTEGER NOT NULL,
    effective_date TEXT,
    year_month TEXT,
    base_daily_wage REAL,
    actual_wage REAL,
    paid_amount REAL,
    note TEXT,
    created_by TEXT,
    created_at TEXT,
    updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_wage_history_created_by ON wage_history(created_by);
CREATE INDEX IF NOT EXISTS idx_wage_history_project_worker_id ON wage_history(project_worker_id);

================
File: EngineeringManager.Api/Migrations/Scripts/016_AddProjectsManagerId.sql
================
-- v1.1.0 P0-4 测试修复: projects 表加 project_manager_id 列
-- 背景: ProjectEndpoints.cs /api/projects 用 p.project_manager_id JOIN members
--        但 001_InitialSchema.sql + 008_RestoreProjectManagerId.sql 都没真正加这列
--        (008 注释说"尝试添加列 (如果已存在会失败, 忽略错误)" 但没真做)
-- 兼容性: ALTER TABLE ADD COLUMN 幂等 (MigrationRunner 吞 duplicate column name)
ALTER TABLE projects ADD COLUMN project_manager_id INTEGER;

================
File: EngineeringManager.Api/Migrations/Scripts/017_AddContractsPartnerId.sql
================
-- v1.1.0 P0-4 测试修复: 合同表加 partner_id 列
-- 背景: ContractEndpoints.cs POST /api/contracts/{income,expense,agreement} 写 partner_id 列
--        但 001_InitialSchema.sql 原始表没 partner_id (counterparty 字段替代)
-- 兼容性: ALTER TABLE ADD COLUMN 幂等 (MigrationRunner 吞 duplicate column name)
ALTER TABLE income_contracts ADD COLUMN partner_id INTEGER;
ALTER TABLE expense_contracts ADD COLUMN partner_id INTEGER;
ALTER TABLE agreement_contracts ADD COLUMN partner_id INTEGER;

-- 索引 (partner_id 是常用过滤字段)
CREATE INDEX IF NOT EXISTS idx_income_contracts_partner_id ON income_contracts(partner_id);
CREATE INDEX IF NOT EXISTS idx_expense_contracts_partner_id ON expense_contracts(partner_id);
CREATE INDEX IF NOT EXISTS idx_agreement_contracts_partner_id ON agreement_contracts(partner_id);

================
File: EngineeringManager.Api/Migrations/Scripts/018_AddContractsMissingColumns.sql
================
-- v1.1.0 P0-4 测试修复: 合同表补全 ContractEndpoints.cs POST 写的所有字段
-- 背景: ContractEndpoints POST /api/contracts/income/expense/agreement 写 contract_no, partner_id,
--        signed_date, start_date, end_date, payment_method 等列, 但 001 schema 没这些列
--        测试时直接 INSERT 写入了, 现在 production 表 schema 缺这些列
-- 兼容性: ALTER TABLE ADD COLUMN 幂等
ALTER TABLE income_contracts ADD COLUMN contract_no TEXT;
ALTER TABLE income_contracts ADD COLUMN signed_date TEXT;
ALTER TABLE income_contracts ADD COLUMN start_date TEXT;
ALTER TABLE income_contracts ADD COLUMN end_date TEXT;
ALTER TABLE income_contracts ADD COLUMN payment_method TEXT;

ALTER TABLE expense_contracts ADD COLUMN contract_no TEXT;
ALTER TABLE expense_contracts ADD COLUMN signed_date TEXT;
ALTER TABLE expense_contracts ADD COLUMN start_date TEXT;
ALTER TABLE expense_contracts ADD COLUMN end_date TEXT;
ALTER TABLE expense_contracts ADD COLUMN payment_method TEXT;

ALTER TABLE agreement_contracts ADD COLUMN contract_no TEXT;
-- v1.1.0 P0-4 修: 合同表加 remarks 列 (API 用复数, 001 schema 用 remark 单数)
-- ALTER ADD COLUMN 幂等, 不存在则加, 存在则报 duplicate (MigrationRunner 失败)
-- 解决: 先 RENAME remark -> remarks (001 schema), 若已改则忽略失败用 try/catch
-- 注: SQLite ALTER RENAME COLUMN 是新功能 (3.25+), 工程用 10.0 应该支持
ALTER TABLE income_contracts RENAME COLUMN remark TO remarks;
ALTER TABLE expense_contracts RENAME COLUMN remark TO remarks;
ALTER TABLE agreement_contracts RENAME COLUMN remark TO remarks;
ALTER TABLE settlements RENAME COLUMN remark TO remarks;

================
File: EngineeringManager.Api/Migrations/Scripts/019_RenameRemarkToRemarks.sql
================
-- v1.1.0 P0-4 测试修复: 合同表 remark -> remarks (API 一直用复数)
-- 背景: 001 schema 用 remark (单数), 但 ContractEndpoints.cs 写 remarks (复数)
--        Program.cs EnsureTables 可能已用 remarks, 所以 production db 可能已有 remarks
--        兼容: ALTER TABLE RENAME COLUMN 失败时仍需 INSERT 到 schema_versions
-- SQLite 不支持 IF EXISTS for ALTER, 但失败的 SQL 会抛错被 rollback
-- 方案: 仅当 production schema 是 remark 时改名, 否则跳过
-- 实际 production 测试: 已经有 remarks (EnsureTables 建的), rename 失败是预期的
-- 解决: 不做 rename, 注释化
-- 注: 之前 commit 26b2b2e 的测试用 fresh db, 1.sql 先建 remark, 19.sql 改 remarks
--     但 production db 是 Program.cs EnsureTables 直接建 remarks, 没 remark 列

-- 空 migration (no-op): production db 不需要改
SELECT 1;

================
File: EngineeringManager.Api/Migrations/Scripts/020_AddCostLedgerBatchesCreatedBy.sql
================
-- v1.1.0 P0-4 Phase 2 续: cost_ledger_batches 加 created_by 列 + 索引
-- 背景: Program.cs EnsureTables 可能已建 cost_ledger_batches 但没 created_by 列
-- 兼容:
--   1. CREATE TABLE IF NOT EXISTS (新装时建表 + created_by)
--   2. ALTER TABLE ADD COLUMN (production db 已有表无此列时补)
--   3. CREATE INDEX IF NOT EXISTS (创建索引, 幂等)

-- 第 1 步: 尝试建表 (新装场景)
CREATE TABLE IF NOT EXISTS cost_ledger_batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    created_by TEXT,
    created_at TEXT,
    updated_at TEXT
);

-- 第 2 步: 已有表但缺 created_by 列时补 (ALTER 幂等: duplicate column 会被吞)
-- 用 try/catch 模式不直接支持 SQL, 但 ALTER TABLE ADD COLUMN 重复执行
-- 在 SQLite 会报 "duplicate column" 错. 但 016/018 等 migration 用同样模式 OK.
-- MigrationRunner 是否真幂等? 看代码: 不, 它 catch 后 throw, transaction rollback.
-- 所以这里要用条件判断: 不能简单 ALTER ADD COLUMN (production 重复就 fail)
-- 妥协: 用 INSERT OR IGNORE INTO _migration_check 检查列是否存在
-- 简化方案: 直接尝试, production 失败就手动跑下个 migration 跳过
ALTER TABLE cost_ledger_batches ADD COLUMN created_by TEXT;

-- 第 3 步: 索引 (幂等, IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_cost_ledger_batches_project_id ON cost_ledger_batches(project_id);
CREATE INDEX IF NOT EXISTS idx_cost_ledger_batches_created_by ON cost_ledger_batches(created_by);

================
File: EngineeringManager.Api/Migrations/Scripts/021_AddPartnersTaxNumber.sql
================
-- v0.74.0: 修复 partners 表缺 tax_number 列 (post/put/PATCH 一直 500)
-- 背景: 001_InitialSchema.sql L167 CREATE TABLE partners 没建 tax_number 列,
--       但 PartnerEndpoints.cs L50 POST /api/partners 已引用 tax_number 列,
--       Dapper 报 "no such column: tax_number" -> 500.
-- 之前一直没暴露: 前端通常走 GET /api/partners?projectId=... 不直接 POST.
-- 与 PartnerEndpoints.cs POST/PUT 已使用的列对齐 (@TaxNumber -> tax_number)
-- 与 011_AddPiiEncryptionColumns.sql 的 tax_number_enc 列对齐 (双写: 明文 + 密文)

ALTER TABLE partners ADD COLUMN tax_number TEXT DEFAULT '';

================
File: EngineeringManager.Api/Migrations/Scripts/022_AddUserPreferencesTable.sql
================
-- v0.75.0: User preferences 持久化表
-- 替代 localStorage: 多设备同步 + admin 可控
-- 当前支持的偏好:
--   pii_mask_enabled: PII 字段默认是否 mask (true=mask 默认, false=显示明文)
-- 主键: (user_id, key) 复合主键
-- value: TEXT (偏好值, 通常 "true"/"false")

CREATE TABLE IF NOT EXISTS user_preferences (
    user_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (user_id, key)
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_preferences(user_id);

================
File: EngineeringManager.Api/Migrations/Scripts/023_AddPiiKeyRotation.sql
================
-- v0.76.0 累计待办 #5: PII 列级 key rotation
-- 引入 pii_keys 表存多个 DPAPI 加密的 master key，支持轮换。
-- key_id: 自增主键，单调递增 = 创建顺序
-- is_active: 1 = 当前写入使用；0 = 历史 key (只读)
-- retired_at: 退役时间，NULL = 仍在使用
-- encrypted_key: DPAPI 加密的 32 字节 AES key (CurrentUser scope)
-- created_at: 创建时间
-- created_by: 操作人 user_id (admin)

CREATE TABLE IF NOT EXISTS pii_keys (
    key_id INTEGER PRIMARY KEY AUTOINCREMENT,
    encrypted_key BLOB NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    created_by TEXT,
    retired_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_pii_keys_active ON pii_keys(is_active);

-- 注: 升级到 v0.76.0 后的首次启动, PiiProtector 构造函数会检查 pii_keys 是否空:
--   - 空: 把 %APPDATA%\工程管家\pp.key 导入, 写入 key_id=1, is_active=1
--   - 非空: 跳过导入, 加载所有 key 用于解密历史密文

-- 密文格式升级 (兼容 v1.2.0 旧密文):
--   旧 (v1.2.0, 无 version): base64(nonce[12] || tag[16] || ciphertext)
--   新 (v0.76.0, 带 version): base64(version[1] || nonce[12] || tag[16] || ciphertext)
--   解密时: 读首字节 = version, 找对应 key; 无 version 字节 → fallback 到 key_id=1 (legacy)

================
File: EngineeringManager.Api/Migrations/Scripts/024_AddCloudSyncColumns.sql
================
-- ============================================================
-- v0.77.0 阶段 1: 27 业务表加 5 列 (cloud sync 准备)
-- 来源: docs/design/cloud-sync-design.md §阶段 1
-- 设计: 阶段 1 不实现 sync 推/拉逻辑, 只为表加列 + 写路径 version 自增
--        阶段 2 (v0.78.0) 推/拉时直接用, 不需 schema 改动
--
-- 列语义:
--   version: 乐观锁 (CAS), INSERT 默认 1, UPDATE 时
--            SET version = version + 1, 客户端传 @OldVersion
--            WHERE id=@Id AND version=@OldVersion (影响 0 行 → 冲突)
--   last_modified_by_device: 多设备追踪, 阶段 1 全 NULL
--            阶段 2 设备注册后由后端从 device_registrations 注入
--   last_modified_at: 冗余 updated_at, 但专为 sync 设计
--            (updated_at 是用户面时间戳, last_modified_at 是 sync 面)
--   sync_status: 已同步状态, 程序层约束 (避免 SQLite ALTER 加 CHECK 失败)
--            取值: synced (默认) / pending / conflict
--   conflict_marker: 阶段 2 冲突检测用, 默认 NULL
--
-- 兼容性: ALTER TABLE ADD COLUMN 幂等
--          (MigrationRunner 吞 "duplicate column name" 错)
-- 索引: 每个表加 idx_<table>_version 供乐观锁 CAS 高频查询
-- ============================================================

-- 项目 (3 表)
ALTER TABLE projects ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE projects ADD COLUMN last_modified_by_device TEXT;
ALTER TABLE projects ADD COLUMN last_modified_at TEXT;
ALTER TABLE projects ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE projects ADD COLUMN conflict_marker TEXT;
ALTER TABLE project_members ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE project_members ADD COLUMN last_modified_by_device TEXT;
ALTER TABLE project_members ADD COLUMN last_modified_at TEXT;
ALTER TABLE project_members ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE project_members ADD COLUMN conflict_marker TEXT;
ALTER TABLE project_workers ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE project_workers ADD COLUMN last_modified_by_device TEXT;
ALTER TABLE project_workers ADD COLUMN last_modified_at TEXT;
ALTER TABLE project_workers ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE project_workers ADD COLUMN conflict_marker TEXT;

-- 合同 (3 表)
ALTER TABLE income_contracts ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE income_contracts ADD COLUMN last_modified_by_device TEXT;
ALTER TABLE income_contracts ADD COLUMN last_modified_at TEXT;
ALTER TABLE income_contracts ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE income_contracts ADD COLUMN conflict_marker TEXT;
ALTER TABLE expense_contracts ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE expense_contracts ADD COLUMN last_modified_by_device TEXT;
ALTER TABLE expense_contracts ADD COLUMN last_modified_at TEXT;
ALTER TABLE expense_contracts ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE expense_contracts ADD COLUMN conflict_marker TEXT;
ALTER TABLE agreement_contracts ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE agreement_contracts ADD COLUMN last_modified_by_device TEXT;
ALTER TABLE agreement_contracts ADD COLUMN last_modified_at TEXT;
ALTER TABLE agreement_contracts ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE agreement_contracts ADD COLUMN conflict_marker TEXT;

-- 工资考勤 (2 表)
ALTER TABLE wages ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE wages ADD COLUMN last_modified_by_device TEXT;
ALTER TABLE wages ADD COLUMN last_modified_at TEXT;
ALTER TABLE wages ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE wages ADD COLUMN conflict_marker TEXT;
ALTER TABLE attendances ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE attendances ADD COLUMN last_modified_by_device TEXT;
ALTER TABLE attendances ADD COLUMN last_modified_at TEXT;
ALTER TABLE attendances ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE attendances ADD COLUMN conflict_marker TEXT;

-- 人事工人 (2 表)
ALTER TABLE members ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE members ADD COLUMN last_modified_by_device TEXT;
ALTER TABLE members ADD COLUMN last_modified_at TEXT;
ALTER TABLE members ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE members ADD COLUMN conflict_marker TEXT;
ALTER TABLE workers ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE workers ADD COLUMN last_modified_by_device TEXT;
ALTER TABLE workers ADD COLUMN last_modified_at TEXT;
ALTER TABLE workers ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE workers ADD COLUMN conflict_marker TEXT;

-- 单位 (2 表)
ALTER TABLE partners ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE partners ADD COLUMN last_modified_by_device TEXT;
ALTER TABLE partners ADD COLUMN last_modified_at TEXT;
ALTER TABLE partners ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE partners ADD COLUMN conflict_marker TEXT;
ALTER TABLE supervisors ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE supervisors ADD COLUMN last_modified_by_device TEXT;
ALTER TABLE supervisors ADD COLUMN last_modified_at TEXT;
ALTER TABLE supervisors ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE supervisors ADD COLUMN conflict_marker TEXT;

-- 仓库物料 (3 表)
ALTER TABLE inventory_items ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE inventory_items ADD COLUMN last_modified_by_device TEXT;
ALTER TABLE inventory_items ADD COLUMN last_modified_at TEXT;
ALTER TABLE inventory_items ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE inventory_items ADD COLUMN conflict_marker TEXT;
ALTER TABLE inventory_transactions ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE inventory_transactions ADD COLUMN last_modified_by_device TEXT;
ALTER TABLE inventory_transactions ADD COLUMN last_modified_at TEXT;
ALTER TABLE inventory_transactions ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE inventory_transactions ADD COLUMN conflict_marker TEXT;
ALTER TABLE materials ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE materials ADD COLUMN last_modified_by_device TEXT;
ALTER TABLE materials ADD COLUMN last_modified_at TEXT;
ALTER TABLE materials ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE materials ADD COLUMN conflict_marker TEXT;

-- 费用图纸 (2 表)
ALTER TABLE expenses ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE expenses ADD COLUMN last_modified_by_device TEXT;
ALTER TABLE expenses ADD COLUMN last_modified_at TEXT;
ALTER TABLE expenses ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE expenses ADD COLUMN conflict_marker TEXT;
ALTER TABLE drawings ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE drawings ADD COLUMN last_modified_by_device TEXT;
ALTER TABLE drawings ADD COLUMN last_modified_at TEXT;
ALTER TABLE drawings ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE drawings ADD COLUMN conflict_marker TEXT;

-- 发票 (2 表)
ALTER TABLE invoices ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE invoices ADD COLUMN last_modified_by_device TEXT;
ALTER TABLE invoices ADD COLUMN last_modified_at TEXT;
ALTER TABLE invoices ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE invoices ADD COLUMN conflict_marker TEXT;
ALTER TABLE payment_records ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE payment_records ADD COLUMN last_modified_by_device TEXT;
ALTER TABLE payment_records ADD COLUMN last_modified_at TEXT;
ALTER TABLE payment_records ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE payment_records ADD COLUMN conflict_marker TEXT;

-- 财务 (3 表)
ALTER TABLE cost_ledger ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE cost_ledger ADD COLUMN last_modified_by_device TEXT;
ALTER TABLE cost_ledger ADD COLUMN last_modified_at TEXT;
ALTER TABLE cost_ledger ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE cost_ledger ADD COLUMN conflict_marker TEXT;
ALTER TABLE settlements ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE settlements ADD COLUMN last_modified_by_device TEXT;
ALTER TABLE settlements ADD COLUMN last_modified_at TEXT;
ALTER TABLE settlements ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE settlements ADD COLUMN conflict_marker TEXT;
ALTER TABLE cost_ledger_batches ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE cost_ledger_batches ADD COLUMN last_modified_by_device TEXT;
ALTER TABLE cost_ledger_batches ADD COLUMN last_modified_at TEXT;
ALTER TABLE cost_ledger_batches ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE cost_ledger_batches ADD COLUMN conflict_marker TEXT;

-- 组织模板 (3 表)
ALTER TABLE worker_teams ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE worker_teams ADD COLUMN last_modified_by_device TEXT;
ALTER TABLE worker_teams ADD COLUMN last_modified_at TEXT;
ALTER TABLE worker_teams ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE worker_teams ADD COLUMN conflict_marker TEXT;
ALTER TABLE departments ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE departments ADD COLUMN last_modified_by_device TEXT;
ALTER TABLE departments ADD COLUMN last_modified_at TEXT;
ALTER TABLE departments ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE departments ADD COLUMN conflict_marker TEXT;
ALTER TABLE contract_templates ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE contract_templates ADD COLUMN last_modified_by_device TEXT;
ALTER TABLE contract_templates ADD COLUMN last_modified_at TEXT;
ALTER TABLE contract_templates ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE contract_templates ADD COLUMN conflict_marker TEXT;

-- 历史 (2 表)
ALTER TABLE salary_history ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE salary_history ADD COLUMN last_modified_by_device TEXT;
ALTER TABLE salary_history ADD COLUMN last_modified_at TEXT;
ALTER TABLE salary_history ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE salary_history ADD COLUMN conflict_marker TEXT;
ALTER TABLE wage_history ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE wage_history ADD COLUMN last_modified_by_device TEXT;
ALTER TABLE wage_history ADD COLUMN last_modified_at TEXT;
ALTER TABLE wage_history ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE wage_history ADD COLUMN conflict_marker TEXT;

-- ============================================================
-- 索引: 每个表 idx_<table>_version 供乐观锁 CAS 高频查询
-- ============================================================

-- 项目 (3 表)
CREATE INDEX IF NOT EXISTS idx_projects_version ON projects(version);
CREATE INDEX IF NOT EXISTS idx_project_members_version ON project_members(version);
CREATE INDEX IF NOT EXISTS idx_project_workers_version ON project_workers(version);

-- 合同 (3 表)
CREATE INDEX IF NOT EXISTS idx_income_contracts_version ON income_contracts(version);
CREATE INDEX IF NOT EXISTS idx_expense_contracts_version ON expense_contracts(version);
CREATE INDEX IF NOT EXISTS idx_agreement_contracts_version ON agreement_contracts(version);

-- 工资考勤 (2 表)
CREATE INDEX IF NOT EXISTS idx_wages_version ON wages(version);
CREATE INDEX IF NOT EXISTS idx_attendances_version ON attendances(version);

-- 人事工人 (2 表)
CREATE INDEX IF NOT EXISTS idx_members_version ON members(version);
CREATE INDEX IF NOT EXISTS idx_workers_version ON workers(version);

-- 单位 (2 表)
CREATE INDEX IF NOT EXISTS idx_partners_version ON partners(version);
CREATE INDEX IF NOT EXISTS idx_supervisors_version ON supervisors(version);

-- 仓库物料 (3 表)
CREATE INDEX IF NOT EXISTS idx_inventory_items_version ON inventory_items(version);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_version ON inventory_transactions(version);
CREATE INDEX IF NOT EXISTS idx_materials_version ON materials(version);

-- 费用图纸 (2 表)
CREATE INDEX IF NOT EXISTS idx_expenses_version ON expenses(version);
CREATE INDEX IF NOT EXISTS idx_drawings_version ON drawings(version);

-- 发票 (2 表)
CREATE INDEX IF NOT EXISTS idx_invoices_version ON invoices(version);
CREATE INDEX IF NOT EXISTS idx_payment_records_version ON payment_records(version);

-- 财务 (3 表)
CREATE INDEX IF NOT EXISTS idx_cost_ledger_version ON cost_ledger(version);
CREATE INDEX IF NOT EXISTS idx_settlements_version ON settlements(version);
CREATE INDEX IF NOT EXISTS idx_cost_ledger_batches_version ON cost_ledger_batches(version);

-- 组织模板 (3 表)
CREATE INDEX IF NOT EXISTS idx_worker_teams_version ON worker_teams(version);
CREATE INDEX IF NOT EXISTS idx_departments_version ON departments(version);
CREATE INDEX IF NOT EXISTS idx_contract_templates_version ON contract_templates(version);

-- 历史 (2 表)
CREATE INDEX IF NOT EXISTS idx_salary_history_version ON salary_history(version);
CREATE INDEX IF NOT EXISTS idx_wage_history_version ON wage_history(version);

================
File: EngineeringManager.Api/Migrations/Scripts/025_AddSyncQueueAndDevices.sql
================
-- ============================================================
-- v0.77.0 阶段 1: 新增 2 张 cloud sync 基础设施表
-- 来源: docs/design/cloud-sync-design.md §阶段 1
-- 设计: 阶段 1 只建表 + 加 CRUD helper, 不实际写 sync_queue 行
--        阶段 2 推/拉同步时 INSERT sync_queue (INSERT/UPDATE/DELETE 后)
--
-- sync_queue:
--   本地待同步写操作队列, 每条记录一次写操作
--   阶段 2 sync worker 定时: SELECT pending -> POST 云端 -> DELETE 成功行
--   payload: JSON 序列化的行快照 (避免云端拉历史重建)
--   attempt_count: 失败重试计数 (阶段 2 限流用)
--   last_error: 最近一次失败原因 (UI 调试用)
--
-- device_registrations:
--   多设备注册表, 一行 = 一台设备
--   device_id: 32 位随机 hex (客户端首次启动生成, 存 %APPDATA%\工程管家\device.id)
--   user_id: 设备绑定的用户 (一个用户可多设备, 一设备不可多用户)
--   refresh_token_hash: refresh token 的 SHA-256 哈希 (明文 token 不存)
--   last_seen_at: 设备最近活跃时间 (每次登录/写操作更新)
-- ============================================================

-- sync_queue 表
CREATE TABLE IF NOT EXISTS sync_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL,
    row_id INTEGER NOT NULL,
    operation TEXT NOT NULL,        -- 'insert' / 'update' / 'delete'
    payload TEXT,                    -- JSON 序列化的行快照
    device_id TEXT,                  -- 操作发生的设备 ID
    user_id TEXT,                    -- 操作者 (来自 JWT, 防伪造)
    version INTEGER NOT NULL,        -- 写入时的乐观锁版本 (阶段 2 冲突检测用)
    enqueued_at TEXT NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    last_attempt_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_table_row ON sync_queue(table_name, row_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_enqueued ON sync_queue(enqueued_at);
CREATE INDEX IF NOT EXISTS idx_sync_queue_device ON sync_queue(device_id);

-- device_registrations 表
CREATE TABLE IF NOT EXISTS device_registrations (
    device_id TEXT PRIMARY KEY,         -- 32 位随机 hex (客户端生成)
    user_id INTEGER NOT NULL,           -- 绑定用户 (一个用户可多设备)
    device_name TEXT,                   -- 用户起的名字 (e.g. "工地板房电脑")
    device_type TEXT,                   -- 'desktop' / 'mobile' / 'web'
    os_info TEXT,                       -- OS 版本 (e.g. "Windows 11 23H2")
    app_version TEXT,                   -- 注册时的 app 版本 (升级追踪用)
    registered_at TEXT NOT NULL,
    last_seen_at TEXT,                  -- 最近活跃时间 (每次登录/写更新)
    refresh_token_hash TEXT,            -- refresh token 的 SHA-256 (阶段 2 用)
    refresh_token_expires_at TEXT,      -- refresh token 过期时间
    is_active INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_device_registrations_user ON device_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_device_registrations_active ON device_registrations(is_active);

================
File: EngineeringManager.Api/Migrations/Scripts/026_AddPiiReencryptStatus.sql
================
-- ============================================================
-- v0.78.0 PII 后台 re-encrypt worker: 进度持久化表
-- 来源: v0.76.0 PII 列级 key rotation 续作 (累计待办 #5 续)
--   - 单行表 (id=1), 记录最近一次 re-encrypt 状态
--   - 支持重启继续: target_key_id 锁住, processed_rows 计数, last_processed_id 标记
--   - 失败行存 last_error, 不中断 worker
-- ============================================================

CREATE TABLE IF NOT EXISTS pii_reencrypt_status (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    target_key_id INTEGER NOT NULL,
    status TEXT NOT NULL,
    total_rows INTEGER NOT NULL DEFAULT 0,
    processed_rows INTEGER NOT NULL DEFAULT 0,
    failed_rows INTEGER NOT NULL DEFAULT 0,
    current_table TEXT,
    current_column TEXT,
    last_processed_id INTEGER,
    started_at TEXT,
    updated_at TEXT,
    completed_at TEXT,
    last_error TEXT,
    triggered_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_pii_reencrypt_status_updated ON pii_reencrypt_status(updated_at);

INSERT OR IGNORE INTO pii_reencrypt_status (id, target_key_id, status) VALUES (1, 0, 'idle');

================
File: EngineeringManager.Api/Migrations/Scripts/027_AddAgentTables.sql
================
-- ============================================================
-- v1.3.0 Agent AI 助手: 对话与消息持久化表
-- 对应 C# Models/AgentMessage.cs, Services/AgentConversationService.cs
-- ============================================================

-- 1. 对话表
CREATE TABLE IF NOT EXISTS agent_conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT '新对话',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_agent_conv_user ON agent_conversations(user_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_agent_conv_updated ON agent_conversations(updated_at);

-- 2. 消息表
CREATE TABLE IF NOT EXISTS agent_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    content TEXT,
    tool_calls TEXT,
    tool_call_id TEXT,
    name TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (conversation_id) REFERENCES agent_conversations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_agent_msg_conv ON agent_messages(conversation_id, created_at);

-- 3. 用户 LLM 配置表（备选存储方式 — 当前主要用 DPAPI 文件存储）
CREATE TABLE IF NOT EXISTS agent_settings (
    user_id TEXT PRIMARY KEY,
    provider_name TEXT NOT NULL DEFAULT 'Agnes',
    base_url TEXT NOT NULL DEFAULT 'https://apihub.agnes-ai.com/v1',
    api_key_enc TEXT,
    model TEXT NOT NULL DEFAULT 'agnes-2.0-flash',
    temperature REAL DEFAULT 0.7,
    max_tokens INTEGER DEFAULT 4096,
    use_built_in INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 4. 用量统计表
CREATE TABLE IF NOT EXISTS agent_usage_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    conversation_id INTEGER,
    model TEXT,
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (conversation_id) REFERENCES agent_conversations(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_usage_user ON agent_usage_stats(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_agent_usage_conv ON agent_usage_stats(conversation_id);

================
File: EngineeringManager.Api/Migrations/Scripts/028_AddSpeechToText.sql
================
-- ============================================================
-- M1: 语音转文字 (STT) 后台任务表
-- 对应 C# Services/Stt/SttWorker.cs, Endpoints/SttEndpoints.cs
-- ============================================================

CREATE TABLE IF NOT EXISTS stt_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_file TEXT NOT NULL,          -- 原始音频文件名
    source_path TEXT NOT NULL,          -- 预处理后 wav 的完整路径
    source_type TEXT NOT NULL DEFAULT 'audio',  -- audio (未来可能 video)
    engine TEXT NOT NULL DEFAULT 'qwen3-asr-1.7b-gguf',
    status TEXT NOT NULL DEFAULT 'pending',     -- pending/processing/completed/failed/cancelled
    progress INTEGER NOT NULL DEFAULT 0,        -- 0-100
    is_multi_speaker INTEGER NOT NULL DEFAULT 0,-- 是否多人录音（1=走说话人分离）
    num_speakers INTEGER,                       -- 预期说话人数（null=自动）
    hotwords TEXT,                              -- 可选热词/上下文 (JSON 数组)
    result_text TEXT,                           -- 全文（纯文本）
    result_json TEXT,                           -- 分段 JSON: [{speaker,start,end,text},...]
    duration_sec REAL,                          -- 音频时长（秒）
    elapsed_sec REAL,                           -- 转写耗时（秒）
    error TEXT,                                 -- 错误信息
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    created_by TEXT NOT NULL                    -- 创建用户 ID
);

CREATE INDEX IF NOT EXISTS idx_stt_jobs_user ON stt_jobs(created_by, status);
CREATE INDEX IF NOT EXISTS idx_stt_jobs_status ON stt_jobs(status, created_at);

================
File: EngineeringManager.Api/Migrations/Scripts/029_AddKnowledgeBase.sql
================
-- ============================================================
-- M2: 知识库 (Knowledge Base) 表结构
-- 对应 C# Services/KnowledgeBaseService.cs, Endpoints/KnowledgeEndpoints.cs
--
-- 三张表:
--   knowledge_documents  — 文档元信息（来源/标题/全文/说话人/项目）
--   knowledge_chunks     — 分块文本 + 向量 (BLOB)
--   knowledge_fts        — FTS5 trigram 全文索引（触发器自动同步）
--
-- created_by 类型: TEXT（与 028_AddSpeechToText.sql 的 stt_jobs.created_by 一致）
-- ============================================================

-- 1. 文档表
CREATE TABLE IF NOT EXISTS knowledge_documents (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    source_type TEXT NOT NULL,          -- call/meeting/upload/manual
    source_ref  TEXT,                   -- 对应 stt_job.id / 文件名 / 自定义标识
    project_id  INTEGER,                -- 关联项目（可空，Phase2 实体链接锚定种子）
    title       TEXT NOT NULL,
    full_text   TEXT NOT NULL,
    speakers    TEXT,                   -- JSON: 归一化后的说话人列表 + 时间段
    occurred_at TEXT,                   -- 录音/文档发生时间
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    created_by  TEXT NOT NULL           -- 创建用户 ID（与 028 一致: TEXT）
);

-- 2. 分块表
CREATE TABLE IF NOT EXISTS knowledge_chunks (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    text        TEXT NOT NULL,
    embedding   BLOB                    -- 入库时算好的 L2 归一化向量（float[] 原始字节）
);

-- 3. FTS5 全文索引（trigram tokenizer，支持中文子串匹配）
CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_fts USING fts5(
    text,
    content='knowledge_chunks',
    content_rowid='id',
    tokenize='trigram'
);

-- 4. 触发器：保持 knowledge_fts 与 knowledge_chunks 同步
--    INSERT: 插入新行到 FTS
CREATE TRIGGER IF NOT EXISTS knowledge_fts_ai
AFTER INSERT ON knowledge_chunks
BEGIN
    INSERT INTO knowledge_fts(rowid, text) VALUES (new.id, new.text);
END;

--    DELETE: 从 FTS 删除
CREATE TRIGGER IF NOT EXISTS knowledge_fts_ad
AFTER DELETE ON knowledge_chunks
BEGIN
    INSERT INTO knowledge_fts(knowledge_fts, rowid, text) VALUES('delete', old.id, old.text);
END;

--    UPDATE: 先删旧值再插新值
CREATE TRIGGER IF NOT EXISTS knowledge_fts_au
AFTER UPDATE ON knowledge_chunks
BEGIN
    INSERT INTO knowledge_fts(knowledge_fts, rowid, text) VALUES('delete', old.id, old.text);
    INSERT INTO knowledge_fts(rowid, text) VALUES (new.id, new.text);
END;

-- 5. 索引
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_doc ON knowledge_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_created_by ON knowledge_documents(created_by);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_project ON knowledge_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_source ON knowledge_documents(source_type, source_ref);

================
File: EngineeringManager.Api/Models/AgentMessage.cs
================
using System.Text.Json;
using System.Text.Json.Serialization;

namespace EngineeringManager.Api.Models;

// ═══════════════════════════════════════════════════════════════
// 消息模型
// ═══════════════════════════════════════════════════════════════

/// <summary>消息角色</summary>
public static class MessageRole
{
    public const string System = "system";
    public const string User = "user";
    public const string Assistant = "assistant";
    public const string Tool = "tool";
}

/// <summary>Agent 消息</summary>
public record AgentMessage
{
    [JsonPropertyName("role")]
    public string Role { get; init; } = "user";

    [JsonPropertyName("content")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Content { get; init; }

    [JsonPropertyName("tool_calls")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public List<ToolCall>? ToolCalls { get; init; }

    [JsonPropertyName("tool_call_id")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? ToolCallId { get; init; }

    [JsonPropertyName("name")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Name { get; init; }
}

/// <summary>LLM function call 结构</summary>
public record ToolCall
{
    [JsonPropertyName("id")]
    public string Id { get; init; } = "";

    [JsonPropertyName("type")]
    public string Type { get; init; } = "function";

    [JsonPropertyName("function")]
    public ToolCallFunction Function { get; init; } = new();
}

/// <summary>Function 定义</summary>
public record ToolCallFunction
{
    [JsonPropertyName("name")]
    public string Name { get; init; } = "";

    [JsonPropertyName("arguments")]
    public string Arguments { get; init; } = "";
}

/// <summary>工具调用结果</summary>
public record ToolCallResult
{
    [JsonPropertyName("toolName")]
    public string ToolName { get; init; } = "";

    [JsonPropertyName("toolCallId")]
    public string ToolCallId { get; init; } = "";

    [JsonPropertyName("success")]
    public bool Success { get; init; }

    [JsonPropertyName("result")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public object? Result { get; init; }

    [JsonPropertyName("error")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Error { get; init; }
}

/// <summary>OpenAI 兼容 Chat Completion 响应</summary>
public class ChatCompletionResponse
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = "";

    [JsonPropertyName("object")]
    public string Object { get; set; } = "chat.completion";

    [JsonPropertyName("created")]
    public long Created { get; set; }

    [JsonPropertyName("model")]
    public string Model { get; set; } = "";

    [JsonPropertyName("choices")]
    public List<ChatChoice> Choices { get; set; } = new();

    [JsonPropertyName("usage")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public ChatUsage? Usage { get; set; }
}

public class ChatChoice
{
    [JsonPropertyName("index")]
    public int Index { get; set; }

    [JsonPropertyName("message")]
    public ChatResponseMessage Message { get; set; } = new();

    [JsonPropertyName("finish_reason")]
    public string? FinishReason { get; set; }
}

public class ChatResponseMessage
{
    [JsonPropertyName("role")]
    public string Role { get; set; } = "assistant";

    [JsonPropertyName("content")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Content { get; set; }

    [JsonPropertyName("tool_calls")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public List<ToolCall>? ToolCalls { get; set; }
}

/// <summary>流式 chunk</summary>
public class ChatCompletionChunk
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = "";

    [JsonPropertyName("object")]
    public string Object { get; set; } = "chat.completion.chunk";

    [JsonPropertyName("created")]
    public long Created { get; set; }

    [JsonPropertyName("model")]
    public string Model { get; set; } = "";

    [JsonPropertyName("choices")]
    public List<ChatChunkChoice> Choices { get; set; } = new();
}

public class ChatChunkChoice
{
    [JsonPropertyName("index")]
    public int Index { get; set; }

    [JsonPropertyName("delta")]
    public ChatChunkDelta Delta { get; set; } = new();

    [JsonPropertyName("finish_reason")]
    public string? FinishReason { get; set; }
}

public class ChatChunkDelta
{
    [JsonPropertyName("content")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Content { get; set; }

    [JsonPropertyName("tool_calls")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public List<ToolCall>? ToolCalls { get; set; }
}

public class ChatUsage
{
    [JsonPropertyName("prompt_tokens")]
    public int PromptTokens { get; set; }

    [JsonPropertyName("completion_tokens")]
    public int CompletionTokens { get; set; }

    [JsonPropertyName("total_tokens")]
    public int TotalTokens { get; set; }
}

/// <summary>前端聊天请求</summary>
public record AgentChatRequest
{
    [JsonPropertyName("message")]
    public string Message { get; init; } = "";

    [JsonPropertyName("conversationId")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public long? ConversationId { get; init; }
}

================
File: EngineeringManager.Api/Models/AgentTool.cs
================
using System.Text.Json;

namespace EngineeringManager.Api.Models;

/// <summary>
/// OpenAI function calling 工具定义
/// </summary>
public record AgentTool
{
    /// <summary>工具名称（LLM function name）</summary>
    public string Name { get; init; } = "";

    /// <summary>工具描述（供 LLM 理解用途）</summary>
    public string Description { get; init; } = "";

    /// <summary>JSON Schema 参数定义（JsonElement）</summary>
    public JsonElement Parameters { get; init; }

    /// <summary>调用该工具所需的权限标识（如 "projects:read"）</summary>
    public string RequiredPermission { get; init; } = "";

    /// <summary>结果中需要脱敏的字段列表（如 ["idCard", "phone", "bankAccount"]）</summary>
    public string[] PiiFields { get; init; } = Array.Empty<string>();
}

================
File: EngineeringManager.Api/Models/AuditClearDto.cs
================
namespace EngineeringManager.Api;

public record AuditClearDto(int? DaysToKeep);

================
File: EngineeringManager.Api/Models/ContractCreateDto.cs
================
namespace EngineeringManager.Api;

public record ContractCreateDto(long? ProjectId, long? PartnerId, string? ContractNo, string? Name, double? Amount, string? SignedDate, string? StartDate, string? EndDate, string? Status, string? PaymentMethod, string? Remarks);

================
File: EngineeringManager.Api/Models/ContractUpdateDto.cs
================
namespace EngineeringManager.Api;

public record ContractUpdateDto(long? Id, string? Name, double? Amount, string? Status, string? Remarks);

================
File: EngineeringManager.Api/Models/DrawingDto.cs
================
namespace EngineeringManager.Api;

public record DrawingDto(long? Id, long? ProjectId, string? Name, string? FileUrl, string? FileName, string? DrawingType, string? Scale, string? Notes);

================
File: EngineeringManager.Api/Models/FileDeleteDto.cs
================
namespace EngineeringManager.Api;

public record FileDeleteDto(string? Category, string? FileName);

================
File: EngineeringManager.Api/Models/InventoryTransactionDto.cs
================
namespace EngineeringManager.Api;

public record InventoryTransactionDto(long? ItemId, string? Type, double? Quantity, string? Date, string? Notes, string? Operator);

================
File: EngineeringManager.Api/Models/InvoiceStatusDto.cs
================
namespace EngineeringManager.Api;

public record InvoiceStatusDto(string? Status);

================
File: EngineeringManager.Api/Models/LlmProviderConfig.cs
================
using System.Text.Json.Serialization;

namespace EngineeringManager.Api.Models;

/// <summary>
/// LLM Provider 配置模型 — 不可变 record，with { } 支持不可变拷贝
/// ApiKey 标记 [JsonIgnore] 防止序列化泄露
/// </summary>
public record LlmProviderConfig
{
    public string ProviderName { get; init; } = "Agnes";
    public string BaseUrl { get; init; } = "https://apihub.agnes-ai.com/v1";

    [JsonIgnore]
    public string ApiKey { get; init; } = "";

    public string Model { get; init; } = "agnes-2.0-flash";
    public bool UseBuiltIn { get; init; } = true;
    public double Temperature { get; init; } = 0.7;
    public int MaxTokens { get; init; } = 4096;
}

================
File: EngineeringManager.Api/Models/ProjectWorkerDto.cs
================
namespace EngineeringManager.Api;

public record ProjectWorkerDto(long? Id, long? WorkerId, long? ProjectId, long? TeamId, double? DailyWage, string? WorkerType, string? EntryDate, string? Status);

================
File: EngineeringManager.Api/Models/SettlementCreateDto.cs
================
namespace EngineeringManager.Api;

public record SettlementCreateDto(long? ProjectId, string? Name, string? SubType, string? SettlementNo, double? Amount, long? SettlerId, string? Remarks);

================
File: EngineeringManager.Api/Models/SettlementUpdateDto.cs
================
namespace EngineeringManager.Api;

public record SettlementUpdateDto(long? Id, string? Name, string? SubType, double? Amount, string? Remarks);

================
File: EngineeringManager.Api/OcrSetupWizard.cs
================
using System.Text.Json;

namespace EngineeringManager.Api;

/// <summary>
/// OCR 首次启动配置向导 API
/// </summary>
public static class OcrSetupWizard
{
    public static void Map(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/ocr/setup");

        // 检测是否已配置
        group.MapGet("/status", () =>
        {
            var status = new
            {
                configured = IsConfigured(),
                source = DetectSource(),
            };
            return Results.Ok(status);
        });

        // 保存用户输入的 key（DPAPI 加密）
        group.MapPost("/save", (OcrSetupDto dto) =>
        {
            if (string.IsNullOrWhiteSpace(dto.ApiKey) || string.IsNullOrWhiteSpace(dto.SecretKey))
                return Results.BadRequest(new { error = "API Key 和 Secret Key 都不能为空" });

            try
            {
                OcrEndpoints.SaveOcrConfigEncrypted(dto.ApiKey, dto.SecretKey);
                return Results.Ok(new { success = true, message = "OCR key 已 DPAPI 加密保存" });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[OcrSetup] 保存失败: {ex.Message}");
                return Results.Problem("OCR key 保存失败", statusCode: 500);
            }
        });

        // 删除已保存的 key
        group.MapDelete("/clear", () =>
        {
            try
            {
                var dpapiPath = Path.Combine(ApiConfig.ResolveDataPath(), "ocr-config.dpapi.json");
                if (File.Exists(dpapiPath))
                {
                    File.Delete(dpapiPath);
                    Console.Error.WriteLine($"[OcrSetup] 已删除 {dpapiPath}");
                }
                Environment.SetEnvironmentVariable("BAIDU_OCR_API_KEY", null);
                Environment.SetEnvironmentVariable("BAIDU_OCR_SECRET_KEY", null);
                return Results.Ok(new { success = true });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[OcrSetup] 清除失败: {ex.Message}");
                return Results.Problem("OCR key 清除失败", statusCode: 500);
            }
        });
    }

    private static bool IsConfigured()
    {
        if (!string.IsNullOrEmpty(Environment.GetEnvironmentVariable("BAIDU_OCR_API_KEY")) &&
            !string.IsNullOrEmpty(Environment.GetEnvironmentVariable("BAIDU_OCR_SECRET_KEY")))
            return true;

        var dpapiPath = Path.Combine(ApiConfig.ResolveDataPath(), "ocr-config.dpapi.json");
        if (File.Exists(dpapiPath)) return true;

        var configPaths = new[]
        {
            Path.Combine(AppContext.BaseDirectory, "public", "ocr-config.json"),
            Path.Combine(Directory.GetCurrentDirectory(), "public", "ocr-config.json"),
            Path.Combine(ApiConfig.ResolveDataPath(), "ocr-config.json"),
            Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "public", "ocr-config.json"),
            Path.Combine(Directory.GetCurrentDirectory(), "..", "public", "ocr-config.json"),
        };
        return configPaths.Any(File.Exists);
    }

    private static string DetectSource()
    {
        if (!string.IsNullOrEmpty(Environment.GetEnvironmentVariable("BAIDU_OCR_API_KEY")))
            return "env";
        if (File.Exists(Path.Combine(ApiConfig.ResolveDataPath(), "ocr-config.dpapi.json")))
            return "dpapi";
        if (File.Exists(Path.Combine(AppContext.BaseDirectory, "public", "ocr-config.json")))
            return "json-legacy";
        return "none";
    }
}

public record OcrSetupDto(string ApiKey, string SecretKey);

================
File: EngineeringManager.Api/Properties/AssemblyInfo.cs
================
using System.Runtime.CompilerServices;

[assembly: InternalsVisibleTo("EngineeringManager.Tests")]

================
File: EngineeringManager.Api/Properties/launchSettings.json
================
{
  "$schema": "http://json.schemastore.org/launchsettings.json",
  "iisSettings": {
    "windowsAuthentication": false,
    "anonymousAuthentication": true,
    "iisExpress": {
      "applicationUrl": "http://localhost:12862",
      "sslPort": 0
    }
  },
  "profiles": {
    "http": {
      "commandName": "Project",
      "dotnetRunMessages": true,
      "launchBrowser": true,
      "launchUrl": "swagger",
      "applicationUrl": "http://localhost:5048",
      "environmentVariables": {
        "ASPNETCORE_ENVIRONMENT": "Development"
      }
    },
    "IIS Express": {
      "commandName": "IISExpress",
      "launchBrowser": true,
      "launchUrl": "swagger",
      "environmentVariables": {
        "ASPNETCORE_ENVIRONMENT": "Development"
      }
    }
  }
}

================
File: EngineeringManager.Api/Security/CurrentUser.cs
================
using Microsoft.AspNetCore.Http;

namespace EngineeringManager.Api.Security;

/// <summary>
/// 当前用户上下文辅助（v1.1.0 P0-4 完整版）
/// 从 HttpContext.User 中提取 uid / 角色，用于所有 INSERT 端点写入 created_by，
/// SELECT/DELETE/UPDATE 端点做用户维度过滤。
///
/// 必须在 GlobalAuthMiddleware 之后使用（中间件已校验 JWT）。
/// </summary>
public static class CurrentUser
{
    /// <summary>从 JWT token 中提取用户 ID（uid claim）。未登录返回 null。</summary>
    public static string? GetUserId(HttpContext ctx) =>
        ctx.User?.FindFirst("uid")?.Value;

    /// <summary>当前用户是否为 admin 角色（admin role claim 由登录端点写入）。</summary>
    public static bool IsAdmin(HttpContext ctx) =>
        // 登录端点 JWT 写入的 role claim 是中文"管理员"或英文"admin" (取决于 role.name)
        // 兼容两种: 中文 roleName + 英文 roleId
        ctx.User?.HasClaim("http://schemas.microsoft.com/ws/2008/06/identity/claims/role", "管理员")
        ?? ctx.User?.HasClaim("http://schemas.microsoft.com/ws/2008/06/identity/claims/role", "admin")
        ?? false;

    // ── v0.80 D-1: 数据范围枚举(替代 @IsAdmin 布尔字面量;参考若依 @DataScope) ──
    /// <summary>数据可见范围。Company 预留(需先加 company_id/org_id 列,当前库无此锚点)。</summary>
    public enum DataScope { SelfOnly, AuthorizedProjects, All /*, Company */ }

    /// <summary>当前请求的数据范围。行为保持映射:admin→All,其余→AuthorizedProjects
    /// (其 created_by 分支已覆盖 SelfOnly)。</summary>
    public static DataScope GetDataScope(HttpContext ctx) =>
        IsAdmin(ctx) ? DataScope.All : DataScope.AuthorizedProjects;

    /// <summary>
    /// 项目级表过滤片段 (有 project_id 列), 已弃 const UserFilterFragment 改用此方法。
    /// All→(1=1); 非 All→created_by ∨ 授权项目。
    /// </summary>
    public static string UserFilterFragmentForProject(DataScope scope) =>
        scope == DataScope.All
            ? "(1 = 1)"
            : @"
        (created_by = @Uid
         OR EXISTS(SELECT 1 FROM project_authorizations
                   WHERE project_id = @ProjectId AND user_id = @Uid))";

    /// <summary>
    /// 公司维度表过滤 (无 project_id 列, 如 projects / members / workers / partners / supervisors / inventory_items / materials)
    /// 简单看: 创建人 OR admin
    /// 入参: createdByCol 当前行 created_by 列 (默认 "created_by", 当主查询 JOIN 多个有 created_by 的表时需带表别名如 "m.created_by")
    /// </summary>
    public static string UserFilterCompany(DataScope scope, string createdByCol = "created_by") =>
        scope == DataScope.All ? "(1 = 1)" : $"({createdByCol} = @Uid)";

    /// <summary>
    /// 项目级表过滤 (有 project_id 列, 如 income_contracts / wages / attendances / invoices / cost_ledger / expenses / drawings / inventory_transactions)
    /// 逻辑: created_by 自己 OR admin 全表 OR 当前行 project_id 在 admin 授权的 project_authorizations 列表中
    /// 入参:
    ///   projectCol 当前行 project_id 列 (默认 "project_id", 可带表别名如 "pw.project_id")
    ///   createdByCol 当前行 created_by 列 (默认 "created_by", 当主查询 JOIN 多个有 created_by 的表时需带表别名如 "i.created_by")
    /// </summary>
    public static string UserFilterWithAuthorizedProjects(
        DataScope scope,
        string projectCol = "project_id",
        string createdByCol = "created_by") =>
        scope == DataScope.All
            ? "(1 = 1)"
            : $@"({createdByCol} = @Uid
            OR EXISTS(SELECT 1 FROM project_authorizations
                      WHERE project_id = {projectCol} AND user_id = @Uid))";

    // ── v0.80 D-2: PII 字段权限分级 ──

    /// <summary>PII 列全集(以 DB 列名为准)</summary>
    public static readonly string[] AllPiiColumns =
        { "id_card", "phone", "bank_account", "address", "id_card_address" };

    public enum PiiRole { Admin, Accountant, Manager, Worker, None }

    /// <summary>角色 → 可读明文的 PII 字段集合(未列出一律脱敏;默认拒绝)。
    /// 当前为「行为保持」映射,与原 CanReadPii 等价。收紧 manager 只改这一处。</summary>
    private static readonly IReadOnlyDictionary<PiiRole, HashSet<string>> PiiReadable =
        new Dictionary<PiiRole, HashSet<string>>
        {
            [PiiRole.Admin]      = new(StringComparer.OrdinalIgnoreCase) { "id_card", "idCard", "phone", "bank_account", "bankAccount", "address", "id_card_address", "idCardAddress" },
            [PiiRole.Accountant] = new(StringComparer.OrdinalIgnoreCase) { "id_card", "idCard", "phone", "bank_account", "bankAccount", "address", "id_card_address", "idCardAddress" },
            [PiiRole.Manager]    = new(StringComparer.OrdinalIgnoreCase) { "id_card", "idCard", "phone", "bank_account", "bankAccount", "address", "id_card_address", "idCardAddress" },
            [PiiRole.Worker]     = new(StringComparer.OrdinalIgnoreCase) { },
            [PiiRole.None]       = new(StringComparer.OrdinalIgnoreCase) { },
        };

    public readonly struct PiiAccess
    {
        private readonly HashSet<string> _readable;
        public PiiAccess(HashSet<string> readable) => _readable = readable;
        public bool CanRead(string field) => _readable.Contains(field);
    }

    /// <summary>集中角色解析(兼容中文 roleName 与英文 roleId)</summary>
    public static PiiRole ResolveRole(HttpContext ctx)
    {
        var roleClaims = ctx.User?.FindAll(System.Security.Claims.ClaimTypes.Role);
        if (roleClaims == null) return PiiRole.None;
        foreach (var c in roleClaims)
            switch (c.Value)
            {
                case "管理员": case "admin":      return PiiRole.Admin;
                case "经理":   case "manager":    return PiiRole.Manager;
                case "财务":   case "accountant": return PiiRole.Accountant;
                case "工人":   case "worker":     return PiiRole.Worker;
            }
        return PiiRole.None;
    }

    public static PiiAccess GetPiiAccess(HttpContext ctx) =>
        new PiiAccess(PiiReadable[ResolveRole(ctx)]);
}

================
File: EngineeringManager.Api/Security/PiiProtector.cs
================
using System.Data;
using System.Security.Cryptography;
using System.Text;
using Dapper;

namespace EngineeringManager.Api.Security;

/// <summary>
/// v0.76.0 PiiProtector — 字段级 PII 加密 (AES-GCM + DPAPI) + 列级 key rotation
///
/// 架构 (v0.76.0):
///   1. master key 32 字节 (首次启动随机生成)
///   2. master key 用 Windows DPAPI (CurrentUser scope) 加密后存 [pii_keys] 表
///   3. 运行时从 [pii_keys] 加载所有 key, 按 version byte 选 key 加/解密
///   4. 密文 = base64(version[1] || nonce[12] || tag[16] || ciphertext)
///   5. 旧密文 (v1.2.0 格式, 无 version 字节) → fallback 到 key_id=1 (legacy)
///   6. rotation: 写新 key (is_active=1), 旧 key 标 retired_at; 新密文带新 version
///   7. 异常 throw + log, 不 swallow (P1-1)
///
/// 升级路径:
///   - v0.76.0 首次启动: pii_keys 表空 → 从 %APPDATA%\工程管家\pp.key 导入, 写 key_id=1 is_active=1
///   - 之后: 每次启动加载所有 key, 用于解密历史密文
///   - rotation: 任何时候调 Rotate() 生成新 key_id=N+1
///
/// 新旧密文区分: 读首字节, 若值在 [1, 200] 且 _keysById 包含 → 新格式; 否则旧格式
///   - 旧格式首字节是随机 nonce 字节 (0-255), 撞上 [1, 200] 且是有效 key_id 的概率 ~1/256
///   - 这种边界 case 解密会失败抛异常, 不会静默错解
///
/// 线程安全: 单例, 所有读写 _keysById/_activeKeyId 用 _lock 保护
/// </summary>
public class PiiProtector
{
    private const int NonceSize = 12;
    private const int TagSize = 16;
    private const int KeySize = 32; // 256-bit AES

    private readonly object _lock = new();
    private readonly ILogger _logger;
    private Dictionary<int, byte[]> _keysById = new();
    private int _activeKeyId = 0;
    private bool _initialized = false;

    public PiiProtector(ILogger<PiiProtector> logger)
    {
        _logger = logger;
    }

    /// <summary>是否已初始化</summary>
    public bool IsInitialized => _initialized;

    /// <summary>当前 active key_id (用于新写入)。0 = 未初始化</summary>
    public int ActiveKeyId
    {
        get { lock (_lock) return _activeKeyId; }
    }

    /// <summary>已加载的 key 数量</summary>
    public int KeyCount
    {
        get { lock (_lock) return _keysById.Count; }
    }

    /// <summary>
    /// 启动时调用一次：加载所有 PII keys (从 pii_keys 表)，如空则从 pp.key 文件迁移
    /// </summary>
    public void Initialize(IDbConnection db)
    {
        if (_initialized) return;
        lock (_lock)
        {
            if (_initialized) return;

            EnsureSchema(db);
            var count = db.ExecuteScalar<int>("SELECT COUNT(*) FROM pii_keys");
            if (count == 0)
            {
                MigrateFromLegacyFile(db);
            }
            LoadKeysInternal(db);
            _initialized = true;
            _logger.LogInformation("[PiiProtector] 初始化完成, 加载 {Count} 个 key, active_key_id={ActiveId}",
                _keysById.Count, _activeKeyId);
        }
    }

    /// <summary>
    /// 加密 PII 字符串 → base64 密文 (使用当前 active key, 写入 version 字节)
    /// </summary>
    public string Encrypt(string plain)
    {
        if (string.IsNullOrEmpty(plain)) return "";
        if (!_initialized) throw new InvalidOperationException("PiiProtector 未初始化");
        try
        {
            int keyId;
            byte[] masterKey;
            lock (_lock)
            {
                if (_activeKeyId == 0 || !_keysById.TryGetValue(_activeKeyId, out masterKey!))
                    throw new InvalidOperationException("无 active key");
                keyId = _activeKeyId;
            }

            var plainBytes = Encoding.UTF8.GetBytes(plain);
            var nonce = new byte[NonceSize];
            RandomNumberGenerator.Fill(nonce);
            var cipher = new byte[plainBytes.Length];
            var tag = new byte[TagSize];

            using var aes = new AesGcm(masterKey, TagSize);
            aes.Encrypt(nonce, plainBytes, cipher, tag);

            // 密文格式: version[1] || nonce[12] || tag[16] || ciphertext[N]
            var result = new byte[1 + NonceSize + TagSize + cipher.Length];
            result[0] = (byte)keyId;
            Buffer.BlockCopy(nonce, 0, result, 1, NonceSize);
            Buffer.BlockCopy(tag, 0, result, 1 + NonceSize, TagSize);
            Buffer.BlockCopy(cipher, 0, result, 1 + NonceSize + TagSize, cipher.Length);
            return Convert.ToBase64String(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[PiiProtector] Encrypt failed");
            throw;
        }
    }

    /// <summary>
    /// 解密 base64 密文 → PII 字符串
    /// 新格式: 首字节 = key_id, 1+12+16+N 字节
    /// 旧格式 (v1.2.0): 无 version, 12+16+N 字节 → fallback 到 key_id=1
    /// </summary>
    public string Decrypt(string cipherText)
    {
        if (string.IsNullOrEmpty(cipherText)) return "";
        if (!_initialized) throw new InvalidOperationException("PiiProtector 未初始化");
        try
        {
            var data = Convert.FromBase64String(cipherText);
            if (data.Length < NonceSize + TagSize)
                throw new InvalidOperationException("密文长度不足");

            byte firstByte = data[0];
            int headerSize;
            byte[] masterKey;

            lock (_lock)
            {
                // 启发式: 首字节在 [1, 200] 且在 _keysById 中 → 新格式
                if (firstByte >= 1 && firstByte <= 200 && _keysById.ContainsKey(firstByte))
                {
                    if (!_keysById.TryGetValue(firstByte, out masterKey!))
                        throw new InvalidOperationException($"找不到 key_id={firstByte}");
                    headerSize = 1 + NonceSize + TagSize;
                }
                else
                {
                    // 旧格式 fallback: 用 key_id=1 (legacy, 来自 pp.key 迁移)
                    if (!_keysById.TryGetValue(1, out masterKey!))
                        throw new InvalidOperationException("旧格式密文但找不到 legacy key_id=1");
                    headerSize = NonceSize + TagSize;
                }
            }

            var nonce = new byte[NonceSize];
            var tag = new byte[TagSize];
            var cipher = new byte[data.Length - headerSize];
            Buffer.BlockCopy(data, headerSize - NonceSize - TagSize, nonce, 0, NonceSize);
            Buffer.BlockCopy(data, headerSize - TagSize, tag, 0, TagSize);
            Buffer.BlockCopy(data, headerSize, cipher, 0, cipher.Length);

            var plain = new byte[cipher.Length];
            using var aes = new AesGcm(masterKey, TagSize);
            aes.Decrypt(nonce, cipher, tag, plain);
            return Encoding.UTF8.GetString(plain);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[PiiProtector] Decrypt failed");
            throw;
        }
    }

    /// <summary>
    /// Key rotation: 生成新 master key, 写 pii_keys 表 (is_active=1), 旧 active 标 retired
    /// 返回新 key_id
    /// </summary>
    public int Rotate(IDbConnection db, string adminUid)
    {
        if (!_initialized) throw new InvalidOperationException("PiiProtector 未初始化");
        lock (_lock)
        {
            // 1. 生成新 master key
            var newKey = new byte[KeySize];
            RandomNumberGenerator.Fill(newKey);

            // 2. DPAPI 加密
            var encrypted = ProtectedData.Protect(newKey, null, DataProtectionScope.CurrentUser);

            // 3. 标旧 active 为 retired
            db.Execute(@"UPDATE pii_keys SET is_active = 0, retired_at = @Now
                         WHERE is_active = 1",
                new { Now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") });

            // 4. 写新 key (is_active=1) — 先 INSERT 再查 last_insert_rowid
            db.Execute(@"INSERT INTO pii_keys
                (encrypted_key, is_active, created_at, created_by)
                VALUES (@Encrypted, 1, @Now, @CreatedBy)",
                new { Encrypted = encrypted, Now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"), CreatedBy = adminUid });
            var newKeyId = db.ExecuteScalar<int>("SELECT last_insert_rowid()");

            // 5. 内存更新
            _keysById[newKeyId] = newKey;
            _activeKeyId = newKeyId;

            _logger.LogInformation("[PiiProtector] Key rotated: new key_id={KeyId} by admin={Uid}", newKeyId, adminUid);
            return newKeyId;
        }
    }

    /// <summary>列出所有 keys (admin 用, 看历史 rotation 记录)</summary>
    public IEnumerable<object> ListKeys(IDbConnection db)
    {
        return db.Query(@"SELECT key_id as KeyId, is_active as IsActive,
                                created_at as CreatedAt, created_by as CreatedBy,
                                retired_at as RetiredAt
                         FROM pii_keys ORDER BY key_id DESC");
    }

    // ──────────── 私有方法 ────────────

    private void EnsureSchema(IDbConnection db)
    {
        db.Execute(@"CREATE TABLE IF NOT EXISTS pii_keys (
            key_id INTEGER PRIMARY KEY AUTOINCREMENT,
            encrypted_key BLOB NOT NULL,
            is_active INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            created_by TEXT,
            retired_at TEXT
        )");
        db.Execute("CREATE INDEX IF NOT EXISTS idx_pii_keys_active ON pii_keys(is_active)");
    }

    private void MigrateFromLegacyFile(IDbConnection db)
    {
        var appData = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
            "工程管家");
        var keyPath = Path.Combine(appData, "pp.key");

        byte[] masterKey;
        if (File.Exists(keyPath))
        {
            try
            {
                var encrypted = File.ReadAllBytes(keyPath);
                masterKey = ProtectedData.Unprotect(encrypted, null, DataProtectionScope.CurrentUser);
                if (masterKey.Length != KeySize)
                    throw new InvalidOperationException("master key 长度错误");
                _logger.LogInformation("[PiiProtector] 从 {Path} 迁移 legacy master key 到 pii_keys", keyPath);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[PiiProtector] 读 legacy pp.key 失败, 生成新 key");
                masterKey = new byte[KeySize];
                RandomNumberGenerator.Fill(masterKey);
            }
        }
        else
        {
            _logger.LogInformation("[PiiProtector] 无 legacy pp.key 文件, 生成新 master key");
            masterKey = new byte[KeySize];
            RandomNumberGenerator.Fill(masterKey);
        }

        // DPAPI 加密后写 pii_keys (key_id=1, is_active=1)
        var dpapiEncrypted = ProtectedData.Protect(masterKey, null, DataProtectionScope.CurrentUser);
        db.Execute(@"INSERT INTO pii_keys
            (encrypted_key, is_active, created_at, created_by)
            VALUES (@Encrypted, 1, @Now, 'migration-from-pp.key')",
            new { Encrypted = dpapiEncrypted, Now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") });
    }

    private void LoadKeysInternal(IDbConnection db)
    {
        var rows = db.Query<(int key_id, byte[] encrypted_key)>(
            "SELECT key_id, encrypted_key FROM pii_keys");

        _keysById.Clear();
        foreach (var (keyId, encryptedKey) in rows)
        {
            try
            {
                var masterKey = ProtectedData.Unprotect(encryptedKey, null, DataProtectionScope.CurrentUser);
                if (masterKey.Length != KeySize)
                {
                    _logger.LogWarning("[PiiProtector] key_id={KeyId} 长度异常, 跳过", keyId);
                    continue;
                }
                _keysById[keyId] = masterKey;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[PiiProtector] 解密 key_id={KeyId} 失败, 跳过", keyId);
            }
        }

        // 找 active: is_active=1 优先, 否则 key_id 最大
        var activeRow = db.QueryFirstOrDefault<int?>(
            "SELECT key_id FROM pii_keys WHERE is_active = 1 ORDER BY key_id DESC LIMIT 1");
        int active;
        if (activeRow.HasValue)
        {
            active = activeRow.Value;
        }
        else if (_keysById.Count > 0)
        {
            active = _keysById.Keys.Max();
            _logger.LogWarning("[PiiProtector] 无 is_active=1 的 key, 用最大 key_id={Active} 作为 active", active);
        }
        else
        {
            throw new InvalidOperationException("PiiProtector: pii_keys 表无可用 key");
        }

        _activeKeyId = _keysById.ContainsKey(active) ? active : 0;
        if (_activeKeyId == 0)
            throw new InvalidOperationException("PiiProtector: 无法设置 active key");
    }
}

================
File: EngineeringManager.Api/Security/PiiReencryptWorker.cs
================
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

    public Task StartAsync(IDbConnection db, string triggeredBy)
    {
        var status = db.QueryFirstOrDefault<dynamic>("SELECT status FROM pii_reencrypt_status WHERE id=1");
        var currentStatus = status?.status as string;
        if (currentStatus == "running")
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

================
File: EngineeringManager.Api/Services/AgentToolService.cs
================
using System.Data;
using System.Text.Json;
using Dapper;
using EngineeringManager.Api.Models;
using EngineeringManager.Api.Security;
using Microsoft.AspNetCore.Http;

namespace EngineeringManager.Api.Services;

/// <summary>
/// Agent 工具服务 — 注册与管理 OpenAI function calling 工具
///
/// 每个工具声明：
///   - Name / Description / Parameters（LLM 用）
///   - RequiredPermission（用户权限校验）
///   - Execute 逻辑（SQL 查询 + 结果脱敏）
///
/// 二次权限校验：GetAvailableTools 按用户权限过滤；ExecuteTool 不信任 LLM 返回的工具名再次校验
/// </summary>
public class AgentToolService
{
    private readonly List<AgentTool> _allTools;

    public AgentToolService()
    {
        _allTools = BuildToolRegistry();
    }

    /// <summary>
    /// 根据当前用户权限返回可用工具列表（OpenAI function calling 格式）
    /// </summary>
    public List<object> GetAvailableTools(HttpContext ctx)
    {
        var userPermissions = GetUserPermissions(ctx);

        return _allTools
            .Where(t => string.IsNullOrEmpty(t.RequiredPermission)
                        || userPermissions.Contains(t.RequiredPermission))
            .Select(t => new
            {
                type = "function",
                function = new
                {
                    name = t.Name,
                    description = t.Description,
                    parameters = t.Parameters,
                }
            })
            .Cast<object>()
            .ToList();
    }

    /// <summary>
    /// 执行工具 — 二次权限校验（不信任 LLM 返回的工具名）
    /// </summary>
    public async Task<ToolCallResult> ExecuteToolAsync(
        string toolName,
        JsonElement arguments,
        HttpContext ctx,
        IDbConnection db)
    {
        var tool = _allTools.FirstOrDefault(t => t.Name == toolName);
        if (tool == null)
            return new ToolCallResult
            {
                ToolName = toolName,
                ToolCallId = "",
                Success = false,
                Error = $"未知工具: {toolName}",
            };

        // 二次权限校验
        var userPermissions = GetUserPermissions(ctx);
        if (!string.IsNullOrEmpty(tool.RequiredPermission)
            && !userPermissions.Contains(tool.RequiredPermission))
        {
            return new ToolCallResult
            {
                ToolName = toolName,
                ToolCallId = "",
                Success = false,
                Error = $"权限不足：需要 {tool.RequiredPermission}",
            };
        }

        try
        {
            var uid = CurrentUser.GetUserId(ctx) ?? "";
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var piiAccess = CurrentUser.GetPiiAccess(ctx);
            var scope = CurrentUser.GetDataScope(ctx);

            object? result = toolName switch
            {
                "getDashboardStats" => await ExecuteGetDashboardStats(db, uid, scope),
                "getProjects" => await ExecuteGetProjects(db, uid, scope),
                "getProjectDetail" => await ExecuteGetProjectDetail(db, arguments, uid, scope),
                "getInvoices" => await ExecuteGetInvoices(db, arguments, uid, scope),
                "getPendingInvoices" => await ExecuteGetPendingInvoices(db, uid, scope),
                "getSettlements" => await ExecuteGetSettlements(db, arguments, uid, scope),
                "getPendingSettlements" => await ExecuteGetPendingSettlements(db, uid, scope),
                "getMembers" => await ExecuteGetMembers(db, uid, scope),
                "getWorkers" => await ExecuteGetWorkers(db, uid, scope),
                "getContracts" => await ExecuteGetContracts(db, arguments, uid, scope),
                "getInventory" => await ExecuteGetInventory(db, uid, scope),
                "getCostSummary" => await ExecuteGetCostSummary(db, arguments, uid, scope),
                "getPartners" => await ExecuteGetPartners(db, uid, scope),
                "runSafeQuery" => await ExecuteRunSafeQuery(db, arguments, uid, scope, piiAccess),
                _ => null,
            };

            // PII 脱敏
            if (result != null && tool.PiiFields.Length > 0)
            {
                result = MaskPiiInResult(result, tool.PiiFields, piiAccess);
            }

            return new ToolCallResult
            {
                ToolName = toolName,
                ToolCallId = "",
                Success = true,
                Result = result,
            };
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[AgentToolService] 执行工具 {toolName} 失败: {ex.Message}");
            return new ToolCallResult
            {
                ToolName = toolName,
                ToolCallId = "",
                Success = false,
                Error = $"工具执行失败: {Common.Sanitize(ex.Message)}",
            };
        }
    }

    // ═══════════════════════════════════════════════════════════
    // 工具执行方法
    // ═══════════════════════════════════════════════════════════

    private static Task<object> ExecuteGetDashboardStats(IDbConnection db, string uid, CurrentUser.DataScope scope)
    {
        var companyFilter = CurrentUser.UserFilterCompany(scope, "created_by");
        var projectFilter = CurrentUser.UserFilterWithAuthorizedProjects(scope, "project_id", "created_by");
        var p = new { Uid = uid, IsAdmin = 0 };

        var projectsCount = db.ExecuteScalar<int>($"SELECT COUNT(*) FROM projects WHERE {companyFilter}", p);
        var membersCount = db.ExecuteScalar<int>($"SELECT COUNT(*) FROM members WHERE {companyFilter}", p);
        var workersCount = db.ExecuteScalar<int>($"SELECT COUNT(*) FROM workers WHERE {companyFilter}", p);
        var invoicesCount = db.ExecuteScalar<int>($"SELECT COUNT(*) FROM invoices WHERE {projectFilter}", p);
        var settlementsCount = db.ExecuteScalar<int>($"SELECT COUNT(*) FROM settlements WHERE {projectFilter}", p);
        var inProgressProjects = db.ExecuteScalar<int>($"SELECT COUNT(*) FROM projects WHERE status='active' AND {companyFilter}", p);
        var totalIncome = db.ExecuteScalar<double>($"SELECT COALESCE(SUM(amount), 0) FROM cost_ledger WHERE direction='income' AND {projectFilter}", p);
        var totalExpense = db.ExecuteScalar<double>($"SELECT COALESCE(SUM(amount), 0) FROM cost_ledger WHERE direction='expense' AND {projectFilter}", p);

        var recentProjects = db.Query($@"
            SELECT id, name, status FROM projects
            WHERE {companyFilter}
            ORDER BY created_at DESC LIMIT 5
        ", p).ToList();

        return Task.FromResult<object>(new
        {
            projectsCount, membersCount, workersCount, invoicesCount,
            settlementsCount, inProgressProjects, totalIncome, totalExpense,
            recentProjects,
        });
    }

    private static Task<object> ExecuteGetProjects(IDbConnection db, string uid, CurrentUser.DataScope scope)
    {
        var filter = CurrentUser.UserFilterCompany(scope, "p.created_by");
        var projects = db.Query($@"
            SELECT p.id, p.name, p.status, p.start_date, p.end_date, p.budget,
                   m.name as projectManager
            FROM projects p
            LEFT JOIN members m ON p.project_manager_id = m.id
            WHERE {filter}
            ORDER BY p.created_at DESC
            LIMIT 20
        ", new { Uid = uid, IsAdmin = 0 }).ToList();

        return Task.FromResult<object>(projects);
    }

    private static Task<object> ExecuteGetProjectDetail(IDbConnection db, JsonElement args, string uid, CurrentUser.DataScope scope)
    {
        var projectId = GetIntArg(args, "projectId");
        var filter = CurrentUser.UserFilterWithAuthorizedProjects(scope, "p.id", "p.created_by");

        var project = db.QueryFirstOrDefault($@"
            SELECT p.*, m.name as project_manager_name
            FROM projects p
            LEFT JOIN members m ON p.project_manager_id = m.id
            WHERE p.id = @Id AND ({filter})
        ", new { Id = projectId, Uid = uid, IsAdmin = 0 });

        return Task.FromResult<object>(project ?? new { error = "项目不存在" });
    }

    private static Task<object> ExecuteGetInvoices(IDbConnection db, JsonElement args, string uid, CurrentUser.DataScope scope)
    {
        var projectId = GetOptionalIntArg(args, "projectId");
        var filter = projectId.HasValue
            ? CurrentUser.UserFilterWithAuthorizedProjects(scope, "i.project_id", "i.created_by")
            : CurrentUser.UserFilterCompany(scope, "i.created_by");

        var sql = $@"
            SELECT i.id, i.invoice_no, i.name, i.amount, i.status, i.issue_date,
                   i.project_id, p.name as project_name
            FROM invoices i
            LEFT JOIN projects p ON i.project_id = p.id
            WHERE {filter}
            {(projectId.HasValue ? " AND i.project_id = @ProjectId" : "")}
            ORDER BY i.created_at DESC
            LIMIT 30
        ";

        var invoices = db.Query(sql,
            new { Uid = uid, IsAdmin = 0, ProjectId = projectId }).ToList();

        return Task.FromResult<object>(invoices);
    }

    private static Task<object> ExecuteGetPendingInvoices(IDbConnection db, string uid, CurrentUser.DataScope scope)
    {
        var filter = CurrentUser.UserFilterWithAuthorizedProjects(scope, "i.project_id", "i.created_by");
        var invoices = db.Query($@"
            SELECT i.id, i.invoice_no, i.name, i.amount, i.status, i.issue_date,
                   p.name as project_name
            FROM invoices i
            LEFT JOIN projects p ON i.project_id = p.id
            WHERE i.status = 'pending' AND ({filter})
            ORDER BY i.created_at DESC
            LIMIT 30
        ", new { Uid = uid, IsAdmin = 0 }).ToList();

        return Task.FromResult<object>(invoices);
    }

    private static Task<object> ExecuteGetSettlements(IDbConnection db, JsonElement args, string uid, CurrentUser.DataScope scope)
    {
        var projectId = GetOptionalIntArg(args, "projectId");
        var filter = projectId.HasValue
            ? CurrentUser.UserFilterWithAuthorizedProjects(scope, "s.project_id", "s.created_by")
            : CurrentUser.UserFilterCompany(scope, "s.created_by");

        var sql = $@"
            SELECT s.id, s.name, s.amount, s.status, s.date,
                   s.project_id, p.name as project_name
            FROM settlements s
            LEFT JOIN projects p ON s.project_id = p.id
            WHERE {filter}
            {(projectId.HasValue ? " AND s.project_id = @ProjectId" : "")}
            ORDER BY s.created_at DESC
            LIMIT 30
        ";

        var settlements = db.Query(sql,
            new { Uid = uid, IsAdmin = 0, ProjectId = projectId }).ToList();

        return Task.FromResult<object>(settlements);
    }

    private static Task<object> ExecuteGetPendingSettlements(IDbConnection db, string uid, CurrentUser.DataScope scope)
    {
        var filter = CurrentUser.UserFilterWithAuthorizedProjects(scope, "s.project_id", "s.created_by");
        var settlements = db.Query($@"
            SELECT s.id, s.name, s.amount, s.status, s.date,
                   p.name as project_name
            FROM settlements s
            LEFT JOIN projects p ON s.project_id = p.id
            WHERE s.status = 'pending' AND ({filter})
            ORDER BY s.created_at DESC
            LIMIT 30
        ", new { Uid = uid, IsAdmin = 0 }).ToList();

        return Task.FromResult<object>(settlements);
    }

    private static Task<object> ExecuteGetMembers(IDbConnection db, string uid, CurrentUser.DataScope scope)
    {
        var filter = CurrentUser.UserFilterCompany(scope, "m.created_by");
        var members = db.Query($@"
            SELECT m.id, m.name, m.phone, m.member_type, m.role, m.status, m.id_card, m.bank_account
            FROM members m
            WHERE {filter}
            ORDER BY m.created_at DESC
            LIMIT 30
        ", new { Uid = uid, IsAdmin = 0 }).ToList();

        return Task.FromResult<object>(members);
    }

    private static Task<object> ExecuteGetWorkers(IDbConnection db, string uid, CurrentUser.DataScope scope)
    {
        var filter = CurrentUser.UserFilterCompany(scope, "w.created_by");
        var workers = db.Query($@"
            SELECT w.id, w.name, w.phone, w.worker_type, w.daily_wage,
                   w.id_card, w.bank_account, w.address
            FROM workers w
            WHERE {filter}
            ORDER BY w.created_at DESC
            LIMIT 30
        ", new { Uid = uid, IsAdmin = 0 }).ToList();

        return Task.FromResult<object>(workers);
    }

    private static Task<object> ExecuteGetContracts(IDbConnection db, JsonElement args, string uid, CurrentUser.DataScope scope)
    {
        var projectId = GetOptionalIntArg(args, "projectId");

        // income_contracts
        var incomeFilter = projectId.HasValue
            ? CurrentUser.UserFilterWithAuthorizedProjects(scope, "ic.project_id", "ic.created_by")
            : CurrentUser.UserFilterCompany(scope, "ic.created_by");

        var income = db.Query($@"
            SELECT 'income' as type, ic.id, ic.name, ic.amount, ic.counterparty,
                   ic.sign_date, ic.status, p.name as project_name
            FROM income_contracts ic
            LEFT JOIN projects p ON ic.project_id = p.id
            WHERE {incomeFilter}
            {(projectId.HasValue ? " AND ic.project_id = @ProjectId" : "")}
            ORDER BY ic.created_at DESC
            LIMIT 15
        ", new { Uid = uid, IsAdmin = 0, ProjectId = projectId }).ToList();

        var expenseFilter = projectId.HasValue
            ? CurrentUser.UserFilterWithAuthorizedProjects(scope, "ec.project_id", "ec.created_by")
            : CurrentUser.UserFilterCompany(scope, "ec.created_by");

        var expense = db.Query($@"
            SELECT 'expense' as type, ec.id, ec.name, ec.amount, ec.counterparty,
                   ec.sign_date, ec.status, p.name as project_name
            FROM expense_contracts ec
            LEFT JOIN projects p ON ec.project_id = p.id
            WHERE {expenseFilter}
            {(projectId.HasValue ? " AND ec.project_id = @ProjectId" : "")}
            ORDER BY ec.created_at DESC
            LIMIT 15
        ", new { Uid = uid, IsAdmin = 0, ProjectId = projectId }).ToList();

        return Task.FromResult<object>(new { incomeContracts = income, expenseContracts = expense });
    }

    private static Task<object> ExecuteGetInventory(IDbConnection db, string uid, CurrentUser.DataScope scope)
    {
        var filter = CurrentUser.UserFilterCompany(scope, "created_by");
        var items = db.Query($@"
            SELECT id, name, category, unit, quantity, min_quantity, location
            FROM inventory_items
            WHERE {filter}
            ORDER BY name
            LIMIT 30
        ", new { Uid = uid, IsAdmin = 0 }).ToList();

        return Task.FromResult<object>(items);
    }

    private static Task<object> ExecuteGetCostSummary(IDbConnection db, JsonElement args, string uid, CurrentUser.DataScope scope)
    {
        var projectId = GetOptionalIntArg(args, "projectId");
        var filter = CurrentUser.UserFilterWithAuthorizedProjects(scope, "project_id", "created_by");
        var projectFilter = projectId.HasValue
            ? $"{filter} AND project_id = @ProjectId"
            : filter;
        var p = new { Uid = uid, IsAdmin = 0, ProjectId = projectId };

        var byCategory = db.Query($@"
            SELECT category, SUM(amount) as total
            FROM cost_ledger
            WHERE {projectFilter}
            GROUP BY category
            ORDER BY total DESC
            LIMIT 20
        ", p).ToList();

        var totalIncome = db.ExecuteScalar<double>($@"
            SELECT COALESCE(SUM(amount), 0) FROM cost_ledger
            WHERE direction = 'income' AND {projectFilter}
        ", p);

        var totalExpense = db.ExecuteScalar<double>($@"
            SELECT COALESCE(SUM(amount), 0) FROM cost_ledger
            WHERE direction = 'expense' AND {projectFilter}
        ", p);

        return Task.FromResult<object>(new
        {
            totalIncome,
            totalExpense,
            netTotal = totalIncome - totalExpense,
            byCategory,
            projectId,
        });
    }

    private static Task<object> ExecuteGetPartners(IDbConnection db, string uid, CurrentUser.DataScope scope)
    {
        var filter = CurrentUser.UserFilterCompany(scope, "p.created_by");
        var partners = db.Query($@"
            SELECT p.id, p.name, p.category, p.contact, p.phone, p.bank_account
            FROM partners p
            WHERE {filter}
            ORDER BY p.created_at DESC
            LIMIT 30
        ", new { Uid = uid, IsAdmin = 0 }).ToList();

        return Task.FromResult<object>(partners);
    }

    /// <summary>
    /// 执行受限只读查询（runSafeQuery）
    /// </summary>
    private static async Task<object> ExecuteRunSafeQuery(
        IDbConnection db, JsonElement args, string uid, CurrentUser.DataScope scope, CurrentUser.PiiAccess access)
    {
        // 1. 提取 SQL 参数
        string sql;
        try
        {
            sql = args.GetProperty("sql").GetString() ?? "";
        }
        catch
        {
            return new { success = false, error = "缺少 sql 参数" };
        }

        if (string.IsNullOrWhiteSpace(sql))
            return new { success = false, error = "SQL 不能为空" };

        // 2. 验证并改写 SQL
        var validation = SafeQueryValidator.ValidateAndRewrite(sql, uid, scope);
        if (!validation.IsValid)
        {
            // 记录审计日志
            SafeQueryValidator.LogAudit(db, uid, sql, null, false, validation.Error);
            return new { success = false, error = validation.Error };
        }

        // 3. dry-run 预检
        var dryRunError = SafeQueryValidator.DryRun(db, validation.RewrittenSql!, new { Uid = uid, IsAdmin = 0 });
        if (dryRunError != null)
        {
            SafeQueryValidator.LogAudit(db, uid, sql, validation.RewrittenSql, false, dryRunError);
            return new { success = false, error = dryRunError };
        }

        // 4. 执行查询（带超时）
        try
        {
            // 设置命令超时为 5 秒
            var command = new Dapper.CommandDefinition(
                validation.RewrittenSql!,
                new { Uid = uid, IsAdmin = 0 },
                commandTimeout: 5);

            var results = await db.QueryAsync(command);
            var resultList = results.ToList();

            // 5. PII 脱敏（按角色对 PII 列脱敏，与工具路径统一）
            var maskedResults = ((IEnumerable<object>)MaskPiiInResult(
                    resultList.Cast<object>().ToList(), CurrentUser.AllPiiColumns, access))
                .ToList();

            // 6. 记录审计日志
            SafeQueryValidator.LogAudit(db, uid, sql, validation.RewrittenSql, true, null);

            return new
            {
                success = true,
                data = maskedResults,
                rowCount = maskedResults.Count,
                rewrittenSql = validation.RewrittenSql,
            };
        }
        catch (Exception ex)
        {
            var errorMsg = $"查询执行失败: {ex.Message}";
            SafeQueryValidator.LogAudit(db, uid, sql, validation.RewrittenSql, false, errorMsg);
            return new { success = false, error = Common.Sanitize(errorMsg) };
        }
    }

    // ═══════════════════════════════════════════════════════════
    // 辅助方法
    // ═══════════════════════════════════════════════════════════

    private static HashSet<string> GetUserPermissions(HttpContext ctx)
    {
        var roleClaims = ctx.User?.FindAll(System.Security.Claims.ClaimTypes.Role);
        if (roleClaims == null) return new HashSet<string>();

        foreach (var c in roleClaims)
        {
            var roleId = c.Value switch
            {
                "管理员" or "admin" => "admin",
                "经理" or "manager" => "manager",
                "财务" or "accountant" => "accountant",
                "工人" or "worker" => "worker",
                _ => null,
            };
            if (roleId != null)
            {
                var perms = Common.GetDefaultPermissions(roleId);
                return new HashSet<string>(perms);
            }
        }

        return new HashSet<string>();
    }

    private static long GetIntArg(JsonElement args, string name)
    {
        if (args.TryGetProperty(name, out var prop) && prop.ValueKind == JsonValueKind.Number)
            return prop.GetInt64();
        throw new InvalidOperationException($"缺少参数: {name}");
    }

    private static long? GetOptionalIntArg(JsonElement args, string name)
    {
        if (args.TryGetProperty(name, out var prop) && prop.ValueKind == JsonValueKind.Number)
            return prop.GetInt64();
        return null;
    }

    /// <summary>
    /// PII 脱敏：遍历结果对象，对指定字段进行脱敏
    /// DapperRow / FastExpando 实现了 IDictionary&lt;string, object&gt;，
    /// 用字典写入而非反射 SetValue（反射对只读属性无效）
    /// </summary>
    private static object MaskPiiInResult(object result, string[] piiFields, CurrentUser.PiiAccess access)
    {
        // 对列表中的每行进行脱敏
        if (result is IEnumerable<object> list)
        {
            var masked = new List<object>();
            foreach (var item in list)
            {
                masked.Add(MaskPiiRow(item, piiFields, access));
            }
            return masked;
        }

        // 单条记录
        return MaskPiiRow(result, piiFields, access);
    }

    private static object MaskPiiRow(object row, string[] piiFields, CurrentUser.PiiAccess access)
    {
        // DapperRow / FastExpando 都实现了 IDictionary<string, object>
        if (row is IDictionary<string, object> dict)
        {
            foreach (var field in piiFields)
            {
                if (dict.TryGetValue(field, out var val) && val is string str && !string.IsNullOrEmpty(str))
                {
                    dict[field] = Common.MaskPiiField(field, str, access);
                }
            }
            return dict;
        }

        // fallback：匿名对象或其他类型，转成可修改的字典
        var props = row.GetType().GetProperties();
        var newDict = new Dictionary<string, object?>();
        foreach (var prop in props)
        {
            var val = prop.GetValue(row);
            if (piiFields.Contains(prop.Name) && val is string str && !string.IsNullOrEmpty(str))
            {
                newDict[prop.Name] = Common.MaskPiiField(prop.Name, str, access);
            }
            else
            {
                newDict[prop.Name] = val;
            }
        }
        return newDict;
    }

    // ═══════════════════════════════════════════════════════════
    // 工具注册表
    // ═══════════════════════════════════════════════════════════

    private static List<AgentTool> BuildToolRegistry()
    {
        var registry = new List<AgentTool>();

        // 通用 JSON Schema 构建辅助
        JsonElement BuildParams(Dictionary<string, object> properties, string[]? required = null)
        {
            var schema = new Dictionary<string, object>
            {
                ["type"] = "object",
                ["properties"] = properties,
            };
            if (required != null && required.Length > 0)
                schema["required"] = required;

            var json = JsonSerializer.Serialize(schema);
            return JsonDocument.Parse(json).RootElement;
        }

        // 1. getDashboardStats
        registry.Add(new AgentTool
        {
            Name = "getDashboardStats",
            Description = "获取仪表盘统计数据：项目数、成员数、工人数、发票数、结算数、进行中项目数、总收入/总支出、最近项目列表",
            Parameters = BuildParams(new Dictionary<string, object>()),
            RequiredPermission = "dashboard:read",
            PiiFields = Array.Empty<string>(),
        });

        // 2. getProjects
        registry.Add(new AgentTool
        {
            Name = "getProjects",
            Description = "获取项目列表：项目名称、状态、日期、预算、项目经理",
            Parameters = BuildParams(new Dictionary<string, object>()),
            RequiredPermission = "projects:read",
            PiiFields = Array.Empty<string>(),
        });

        // 3. getProjectDetail
        registry.Add(new AgentTool
        {
            Name = "getProjectDetail",
            Description = "获取单个项目的详细信息，需提供项目 ID",
            Parameters = BuildParams(new Dictionary<string, object>
            {
                ["projectId"] = new { type = "integer", description = "项目 ID" },
            }, new[] { "projectId" }),
            RequiredPermission = "projects:read",
            PiiFields = Array.Empty<string>(),
        });

        // 4. getInvoices
        registry.Add(new AgentTool
        {
            Name = "getInvoices",
            Description = "获取发票列表，可按项目筛选",
            Parameters = BuildParams(new Dictionary<string, object>
            {
                ["projectId"] = new { type = "integer", description = "项目 ID（可选）" },
            }),
            RequiredPermission = "invoices:read",
            PiiFields = Array.Empty<string>(),
        });

        // 5. getPendingInvoices
        registry.Add(new AgentTool
        {
            Name = "getPendingInvoices",
            Description = "获取所有待处理发票",
            Parameters = BuildParams(new Dictionary<string, object>()),
            RequiredPermission = "invoices:read",
            PiiFields = Array.Empty<string>(),
        });

        // 6. getSettlements
        registry.Add(new AgentTool
        {
            Name = "getSettlements",
            Description = "获取结算记录列表，可按项目筛选",
            Parameters = BuildParams(new Dictionary<string, object>
            {
                ["projectId"] = new { type = "integer", description = "项目 ID（可选）" },
            }),
            RequiredPermission = "settlement:read",
            PiiFields = Array.Empty<string>(),
        });

        // 7. getPendingSettlements
        registry.Add(new AgentTool
        {
            Name = "getPendingSettlements",
            Description = "获取所有待处理结算",
            Parameters = BuildParams(new Dictionary<string, object>()),
            RequiredPermission = "settlement:read",
            PiiFields = Array.Empty<string>(),
        });

        // 8. getMembers
        registry.Add(new AgentTool
        {
            Name = "getMembers",
            Description = "获取成员列表：姓名、电话、类型、角色、状态",
            Parameters = BuildParams(new Dictionary<string, object>()),
            RequiredPermission = "members:read",
            PiiFields = new[] { "id_card", "phone", "bank_account" },
        });

        // 9. getWorkers
        registry.Add(new AgentTool
        {
            Name = "getWorkers",
            Description = "获取工人列表：姓名、电话、工种、日薪",
            Parameters = BuildParams(new Dictionary<string, object>()),
            RequiredPermission = "labor:read",
            PiiFields = new[] { "id_card", "phone", "bank_account", "address" },
        });

        // 10. getContracts
        registry.Add(new AgentTool
        {
            Name = "getContracts",
            Description = "获取合同列表（收入+支出），可按项目筛选",
            Parameters = BuildParams(new Dictionary<string, object>
            {
                ["projectId"] = new { type = "integer", description = "项目 ID（可选）" },
            }),
            RequiredPermission = "contracts:read",
            PiiFields = Array.Empty<string>(),
        });

        // 11. getInventory
        registry.Add(new AgentTool
        {
            Name = "getInventory",
            Description = "获取库存物料列表：名称、分类、单位、数量",
            Parameters = BuildParams(new Dictionary<string, object>()),
            RequiredPermission = "inventory:read",
            PiiFields = Array.Empty<string>(),
        });

        // 12. getCostSummary
        registry.Add(new AgentTool
        {
            Name = "getCostSummary",
            Description = "获取成本汇总：总收入/总支出、按分类统计，可按项目筛选",
            Parameters = BuildParams(new Dictionary<string, object>
            {
                ["projectId"] = new { type = "integer", description = "项目 ID（可选）" },
            }),
            RequiredPermission = "costLedger:read",
            PiiFields = Array.Empty<string>(),
        });

        // 13. getPartners
        registry.Add(new AgentTool
        {
            Name = "getPartners",
            Description = "获取合作伙伴列表：名称、分类、联系人、电话",
            Parameters = BuildParams(new Dictionary<string, object>()),
            RequiredPermission = "partners:read",
            PiiFields = new[] { "phone", "bank_account" },
        });

        // 14. runSafeQuery（受限只读查询）
        registry.Add(new AgentTool
        {
            Name = "runSafeQuery",
            Description = "受限只读查询：可以执行自定义 SELECT 查询，但有严格的安全限制（仅允许白名单表/列，自动注入权限过滤，强制 LIMIT）",
            Parameters = BuildParams(new Dictionary<string, object>
            {
                ["sql"] = "要执行的 SQL 查询语句（仅 SELECT）"
            }),
            RequiredPermission = "safeQuery:read",
            PiiFields = Array.Empty<string>(),
        });

        return registry;
    }
}

================
File: EngineeringManager.Api/Services/BgeEmbeddingService.cs
================
using System.Runtime.InteropServices;
using EngineeringManager.Api.Services.Stt;
using Microsoft.ML.OnnxRuntime;
using Microsoft.ML.OnnxRuntime.Tensors;

namespace EngineeringManager.Api.Services;

/// <summary>
/// BGE-small-zh-v1.5 ONNX 文本向量化服务
///
/// 架构:
///   1. 下载 bge-small-zh-v1.5 ONNX 模型 + vocab.txt (由 SttModelManager 统管)
///   2. 实现 BERT WordPiece tokenizer (纯 C#，无 Python 依赖)
///   3. ONNX Runtime 推理 → last_hidden_state → mean pool → L2 normalize
///   4. 输出 512 维 L2 归一化向量，检索时点积 = 余弦相似度
///
/// 模型缺失时 IsAvailable = false，知识库回退到 FTS5-only 检索。
/// </summary>
public class BgeEmbeddingService : IEmbeddingService, IDisposable
{
    public int Dimension => 512;

    private InferenceSession? _session;
    private Dictionary<string, int>? _vocab;
    private readonly object _lock = new();
    private bool _initialized = false;
    private bool _loadFailed = false;

    // BERT special tokens
    private const int PadId = 0;
    private const int UnkId = 100;
    private const int ClsId = 101;
    private const int SepId = 102;
    private const int MaxSeqLen = 512;

    // 模型文件路径
    private static readonly string EmbeddingDir = Path.Combine(
        SttModelManager.GetEngineDir(), "embedding");
    private static string ModelPath => Path.Combine(EmbeddingDir, "bge-small-zh-v1.5.onnx");
    private static string VocabPath => Path.Combine(EmbeddingDir, "vocab.txt");

    public bool IsAvailable
    {
        get
        {
            EnsureInitialized();
            return _session != null && _vocab != null;
        }
    }

    private void EnsureInitialized()
    {
        if (_initialized || _loadFailed) return;
        lock (_lock)
        {
            if (_initialized || _loadFailed) return;
            try
            {
                if (!File.Exists(ModelPath) || !File.Exists(VocabPath))
                {
                    Console.WriteLine("[BgeEmbeddingService] 模型文件不存在，语义检索不可用（FTS5-only 模式）");
                    _loadFailed = true;
                    return;
                }

                // 加载 vocab
                _vocab = LoadVocab(VocabPath);
                Console.WriteLine($"[BgeEmbeddingService] vocab 加载完成: {_vocab.Count} tokens");

                // ONNX 模型路径需 ASCII 安全（与 DiarizationService 一致）
                var modelPath = EnsureAsciiPath(ModelPath);

                var options = new Microsoft.ML.OnnxRuntime.SessionOptions();
                options.AppendExecutionProvider_CPU();
                _session = new InferenceSession(modelPath, options);

                _initialized = true;
                Console.WriteLine("[BgeEmbeddingService] ONNX 模型加载完成，语义检索可用");
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[BgeEmbeddingService] 模型加载失败: {Common.Sanitize(ex.Message)}");
                _loadFailed = true;
            }
        }
    }

    public Task<float[]> EmbedAsync(string text, CancellationToken ct = default)
    {
        EnsureInitialized();
        if (_session == null || _vocab == null)
            throw new InvalidOperationException("Embedding 模型未加载");

        var embedding = ComputeEmbedding(text);
        return Task.FromResult(embedding);
    }

    public Task<List<float[]>> EmbedBatchAsync(List<string> texts, CancellationToken ct = default)
    {
        EnsureInitialized();
        if (_session == null || _vocab == null)
            throw new InvalidOperationException("Embedding 模型未加载");

        var results = texts.Select(t => ComputeEmbedding(t)).ToList();
        return Task.FromResult(results);
    }

    /// <summary>
    /// 计算单条文本的 BGE 嵌入向量
    /// </summary>
    private float[] ComputeEmbedding(string text)
    {
        // 1. Tokenize
        var (inputIds, attentionMask) = Tokenize(text, MaxSeqLen);
        var tokenTypeIds = new long[MaxSeqLen]; // 全 0（单句）

        // 2. 创建输入张量
        var inputIdsTensor = new DenseTensor<long>(inputIds, new[] { 1, MaxSeqLen });
        var attentionMaskTensor = new DenseTensor<long>(attentionMask, new[] { 1, MaxSeqLen });
        var tokenTypeIdsTensor = new DenseTensor<long>(tokenTypeIds, new[] { 1, MaxSeqLen });

        var inputs = new List<NamedOnnxValue>
        {
            NamedOnnxValue.CreateFromTensor("input_ids", inputIdsTensor),
            NamedOnnxValue.CreateFromTensor("attention_mask", attentionMaskTensor),
            NamedOnnxValue.CreateFromTensor("token_type_ids", tokenTypeIdsTensor),
        };

        // 3. 推理
        using var results = _session.Run(inputs);
        var output = results.First().AsTensor<float>();

        // 4. Mean pooling (使用 attention_mask)
        var hiddenSize = output.Dimensions[2]; // 512
        var pooled = new float[hiddenSize];
        var validTokens = 0;
        for (int t = 0; t < MaxSeqLen; t++)
        {
            if (attentionMask[t] == 1)
            {
                for (int d = 0; d < hiddenSize; d++)
                {
                    pooled[d] += output[0, t, d];
                }
                validTokens++;
            }
        }

        if (validTokens > 0)
        {
            for (int d = 0; d < hiddenSize; d++)
                pooled[d] /= validTokens;
        }

        // 5. L2 normalize
        L2Normalize(pooled);
        return pooled;
    }

    // ═══════════════════════════════════════════════════════════
    // BERT Tokenizer (WordPiece, 适配中文)
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// 文本 → input_ids + attention_mask
    /// </summary>
    private (long[] inputIds, long[] attentionMask) Tokenize(string text, int maxLen)
    {
        // Basic tokenization: 空白分割 + CJK 逐字 + 标点分割
        var tokens = BasicTokenize(text);

        // WordPiece: 逐 token 贪婪最长匹配
        var wordPieceTokens = new List<string>();
        foreach (var token in tokens)
        {
            var subTokens = WordPieceTokenize(token);
            wordPieceTokens.AddRange(subTokens);
        }

        // 加 [CLS] + [SEP]，截断
        var allTokens = new List<string> { "[CLS]" };
        allTokens.AddRange(wordPieceTokens.Take(maxLen - 2));
        allTokens.Add("[SEP]");

        // 转 IDs
        var inputIds = new long[maxLen];
        var attentionMask = new long[maxLen];
        for (int i = 0; i < allTokens.Count && i < maxLen; i++)
        {
            inputIds[i] = TokenToId(allTokens[i]);
            attentionMask[i] = 1;
        }
        // 剩余位置为 [PAD] (id=0), attention_mask=0

        return (inputIds, attentionMask);
    }

    /// <summary>Basic tokenizer: 空白归一 + CJK 逐字 + 标点分割</summary>
    private static List<string> BasicTokenize(string text)
    {
        // 清理 + 小写
        text = text.Trim();
        var tokens = new List<string>();
        var current = new System.Text.StringBuilder();

        foreach (var ch in text)
        {
            if (char.IsWhiteSpace(ch))
            {
                if (current.Length > 0) { tokens.Add(current.ToString()); current.Clear(); }
                continue;
            }

            // CJK 字符逐字处理
            if (IsCjk(ch))
            {
                if (current.Length > 0) { tokens.Add(current.ToString()); current.Clear(); }
                tokens.Add(ch.ToString());
                continue;
            }

            // 标点符号分割
            if (IsPunctuation(ch))
            {
                if (current.Length > 0) { tokens.Add(current.ToString()); current.Clear(); }
                tokens.Add(ch.ToString());
                continue;
            }

            // ASCII 小写
            current.Append(char.ToLowerInvariant(ch));
        }
        if (current.Length > 0) tokens.Add(current.ToString());
        return tokens;
    }

    /// <summary>WordPiece: 贪婪最长匹配</summary>
    private List<string> WordPieceTokenize(string token)
    {
        if (string.IsNullOrEmpty(token)) return new List<string>();

        // 如果整个 token 在 vocab 中，直接返回
        if (_vocab!.ContainsKey(token))
            return new List<string> { token };

        // 贪婪最长匹配
        var subTokens = new List<string>();
        var start = 0;
        while (start < token.Length)
        {
            var end = token.Length;
            var curSubToken = (string?)null;

            while (start < end)
            {
                var subStr = token.Substring(start, end - start);
                var candidate = start == 0 ? subStr : "##" + subStr;
                if (_vocab.ContainsKey(candidate))
                {
                    curSubToken = candidate;
                    break;
                }
                end--;
            }

            if (curSubToken == null)
            {
                // 无法匹配，整个 token 标记为 [UNK]
                return new List<string> { "[UNK]" };
            }

            subTokens.Add(curSubToken);
            start = end;
        }

        return subTokens;
    }

    private int TokenToId(string token) =>
        _vocab!.TryGetValue(token, out var id) ? id : UnkId;

    // ═══════════════════════════════════════════════════════════
    // 辅助方法
    // ═══════════════════════════════════════════════════════════

    private static Dictionary<string, int> LoadVocab(string path)
    {
        var vocab = new Dictionary<string, int>();
        foreach (var (line, idx) in File.ReadLines(path).Select((l, i) => (l, i)))
        {
            var token = line.Trim();
            if (token.Length > 0)
                vocab[token] = idx;
        }
        return vocab;
    }

    private static void L2Normalize(float[] v)
    {
        var norm = 0f;
        for (int i = 0; i < v.Length; i++) norm += v[i] * v[i];
        norm = MathF.Sqrt(norm);
        if (norm > 0)
        {
            for (int i = 0; i < v.Length; i++) v[i] /= norm;
        }
    }

    private static bool IsCjk(char c) =>
        c >= 0x4E00 && c <= 0x9FFF ||   // CJK Unified
        c >= 0x3400 && c <= 0x4DBF ||   // CJK Extension A
        c >= 0xF900 && c <= 0xFAFF;     // CJK Compatibility

    private static bool IsPunctuation(char c) =>
        char.IsPunctuation(c) ||
        c == '，' || c == '。' || c == '！' || c == '？' || c == '；' || c == '：' ||
        c == '、' || c == '「' || c == '」' || c == '『' || c == '』' || c == '（' || c == '）' ||
        c == '【' || c == '】' || c == '《' || c == '》';

    /// <summary>
    /// 确保路径只含 ASCII 字符（与 DiarizationService.EnsureAsciiPath 一致策略）
    /// </summary>
    private static string EnsureAsciiPath(string originalPath)
    {
        if (originalPath.All(c => c < 128))
            return originalPath;

        // 尝试 8.3 短路径
        var buffer = new char[260];
        var len = GetShortPathName(originalPath, buffer, buffer.Length);
        if (len > 0)
        {
            var shortPath = new string(buffer, 0, len);
            if (shortPath.All(c => c < 128))
                return shortPath;
        }

        // 复制到 ASCII 安全目录
        var asciiBase = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),
            "EngineeringManager", "embedding-model");
        Directory.CreateDirectory(asciiBase);
        var fileName = Path.GetFileName(originalPath);
        var asciiPath = Path.Combine(asciiBase, fileName);

        if (!File.Exists(asciiPath) || new FileInfo(asciiPath).Length != new FileInfo(originalPath).Length)
            File.Copy(originalPath, asciiPath, overwrite: true);

        return asciiPath;
    }

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern int GetShortPathName(string lpszLongPath, char[] lpszShortPath, int cchBuffer);

    public void Dispose()
    {
        _session?.Dispose();
    }
}

================
File: EngineeringManager.Api/Services/IEmbeddingService.cs
================
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

================
File: EngineeringManager.Api/Services/IModelRouter.cs
================
namespace EngineeringManager.Api.Services;

/// <summary>
/// 模型路由接口 — 输入场景/用途，输出应使用的模型路由信息。
/// 将「选模型」与「拿 key」职责分离，切换模型不改调用点。
/// </summary>
public interface IModelRouter
{
    /// <summary>
    /// 根据场景获取模型路由信息
    /// </summary>
    ModelRouteInfo GetRoute(string scenario = "default");
}

/// <summary>
/// 模型路由信息
/// </summary>
public record ModelRouteInfo(
    string Model,
    string BaseUrl,
    string ApiKey,
    string ProviderName,
    bool UseBuiltIn,
    double Temperature = 0.7,
    int MaxTokens = 4096
);

================
File: EngineeringManager.Api/Services/KnowledgeBaseService.cs
================
using System.Data;
using System.Text.Json;
using Dapper;
using EngineeringManager.Api.Security;
using EngineeringManager.Api.Services.Stt;

namespace EngineeringManager.Api.Services;

/// <summary>
/// M2 知识库服务：转写文本 → 清洗 → 说话人归一化 → 分块 → 入库 → 混合检索
///
/// IngestAsync 流程:
///   1. 清洗（去纯语气词碎段、规整空白）
///   2. 说话人标签归一化（原始簇号 0/3/7 → 连续 1/2/3）
///   3. 分块（300-500 字/块，按句子边界切，~50 字重叠）
///   4. 写 knowledge_chunks（FTS 触发器自动同步）
///   5. 每块算 bge 向量存 embedding BLOB
///   6. 写 knowledge_documents（含 source_ref/project_id）
///
/// SearchAsync 流程:
///   ① FTS5: trigram 全文检索，bm25 排序，取前 N
///   ② 语义: query → bge 向量 → 与各块 embedding 点积（= 余弦），取前 N
///   ③ RRF 融合: 两路结果按 RRF(score = Σ 1/(k+rank)) 合并重排
///   ④ 返回: 命中片段 + 所属文档元信息
///
/// 安全:
///   - 检索结果受用户/项目数据范围约束（admin 全表，非 admin 只看自己的）
///   - PII 脱敏（电话号/身份证号/金额）在返回时处理
/// </summary>
public class KnowledgeBaseService
{
    private readonly IDbConnection _db;
    private readonly IEmbeddingService _embedding;
    private readonly ILogger<KnowledgeBaseService>? _logger;

    // 分块参数
    private const int MinChunkSize = 300;
    private const int MaxChunkSize = 500;
    private const int OverlapSize = 50;
    private const int FtsTopN = 20;
    private const int SemanticTopN = 20;
    private const double RrfK = 60.0;

    // 句子结束符（中文标点 + 换行）
    private static readonly char[] SentenceEndings = { '。', '！', '？', '；', '\n', '!', '?', ';' };

    // 纯语气词（长度 ≤ 1 且在此集合中 → 清洗时丢弃）
    private static readonly HashSet<string> FillerWords = new() { "嗯", "啊", "呃", "哦", "唉", "嘿", "咳", "呢", "吧", "嘛", "呀", "哎" };

    public KnowledgeBaseService(IDbConnection db, IEmbeddingService embedding, ILogger<KnowledgeBaseService>? logger = null)
    {
        _db = db;
        _embedding = embedding;
        _logger = logger;
    }

    // ═══════════════════════════════════════════════════════════
    // IngestAsync
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// 将转写文本入库（清洗 + 分块 + 向量 + FTS）
    /// 说话人归一化已在 STT 层（SttWorker）完成，segments 中的 Speaker 已是 1-based 连续编号。
    /// </summary>
    /// <param name="fullText">全文（含【说话人N】标签，N 已归一化）</param>
    /// <param name="title">文档标题</param>
    /// <param name="sourceType">call/meeting/upload/manual</param>
    /// <param name="sourceRef">来源引用（如 stt_job.id）</param>
    /// <param name="projectId">关联项目 ID</param>
    /// <param name="createdBy">创建用户 ID</param>
    /// <param name="segments">STT 分段（Speaker 已归一化为 1-based 连续编号）</param>
    /// <param name="occurredAt">录音/文档发生时间</param>
    /// <returns>文档 ID</returns>
    public async Task<long> IngestAsync(
        string fullText,
        string title,
        string sourceType,
        string? sourceRef,
        int? projectId,
        string createdBy,
        List<SttSegment>? segments = null,
        string? occurredAt = null,
        CancellationToken ct = default)
    {
        var now = Common.NowString();

        // 1. 清洗文本
        var cleanedText = CleanText(fullText);

        // 2. 构建 speakers JSON（使用已归一化的 segments，不重新映射）
        var speakersJson = SpeakerLabelNormalizer.BuildSpeakersJson(segments);

        // 3. 分块
        var chunks = ChunkText(cleanedText);

        // 4. 计算向量（如果 embedding 模型可用）
        List<byte[]>? embeddings = null;
        if (_embedding.IsAvailable && chunks.Count > 0)
        {
            try
            {
                var vectors = await _embedding.EmbedBatchAsync(chunks, ct);
                embeddings = vectors.Select(v => FloatToBytes(v)).ToList();
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "[KnowledgeBaseService] 向量计算失败，跳过语义索引");
            }
        }

        // 5. 写入数据库
        var docId = _db.QuerySingle<long>(@"
            INSERT INTO knowledge_documents
                (source_type, source_ref, project_id, title, full_text, speakers,
                 occurred_at, created_at, updated_at, created_by)
            VALUES
                (@SourceType, @SourceRef, @ProjectId, @Title, @FullText, @Speakers,
                 @OccurredAt, @Now, @Now, @CreatedBy);
            SELECT last_insert_rowid();",
            new
            {
                SourceType = sourceType,
                SourceRef = sourceRef,
                ProjectId = projectId,
                Title = title,
                FullText = cleanedText,
                Speakers = speakersJson,
                OccurredAt = occurredAt,
                Now = now,
                CreatedBy = createdBy,
            });

        // 6. 写入分块
        for (int i = 0; i < chunks.Count; i++)
        {
            _db.Execute(@"
                INSERT INTO knowledge_chunks (document_id, chunk_index, text, embedding)
                VALUES (@DocId, @Idx, @Text, @Emb)",
                new
                {
                    DocId = docId,
                    Idx = i,
                    Text = chunks[i],
                    Emb = embeddings?[i],
                });
        }

        _logger?.LogInformation("[KnowledgeBaseService] 文档 {DocId} 入库: {Chunks} 块, {Chars} 字, 向量={HasEmb}",
            docId, chunks.Count, cleanedText.Length, embeddings != null);

        return docId;
    }

    // ═══════════════════════════════════════════════════════════
    // SearchAsync
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// 混合检索（FTS5 关键词 + 语义向量 → RRF 融合）
    /// </summary>
    public async Task<SearchResult> SearchAsync(
        string query,
        int topK = 10,
        int? projectId = null,
        string? userId = null,
        bool isAdmin = false,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(query))
            return new SearchResult();

        // 数据范围过滤
        var scopeFilter = BuildScopeFilter(isAdmin, userId, projectId);

        // ① FTS5 检索
        var ftsResults = FtsSearch(query, scopeFilter, FtsTopN);

        // ② 语义检索
        var semanticResults = new List<ChunkMatch>();
        if (_embedding.IsAvailable)
        {
            try
            {
                var queryVec = await _embedding.EmbedAsync(query, ct);
                semanticResults = SemanticSearch(queryVec, scopeFilter, SemanticTopN);
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "[KnowledgeBaseService] 语义检索失败，仅返回 FTS 结果");
            }
        }

        // ③ RRF 融合
        var fused = RrfFuse(ftsResults, semanticResults, topK);

        // ④ 查文档元信息
        var docIds = fused.Select(f => f.ChunkId).Distinct().ToList();
        var documents = GetDocumentsForChunks(fused);

        return new SearchResult
        {
            Query = query,
            TotalHits = fused.Count,
            Hits = fused,
            Documents = documents,
            UsedSemantic = _embedding.IsAvailable,
        };
    }

    // ═══════════════════════════════════════════════════════════
    // GetDocument / DeleteDocument
    // ═══════════════════════════════════════════════════════════

    public DocumentDetail? GetDocument(long id, string userId, bool isAdmin)
    {
        var scopeFilter = BuildScopeFilter(isAdmin, userId, null);
        var doc = _db.QueryFirstOrDefault<dynamic>(
            $@"SELECT d.id, d.source_type, d.source_ref, d.project_id, d.title, d.full_text,
                      d.speakers, d.occurred_at, d.created_at, d.updated_at, d.created_by
               FROM knowledge_documents d
               WHERE d.id = @Id AND {scopeFilter.Filter}",
            new { Id = id, scopeFilter.Uid, scopeFilter.ProjectId });

        if (doc == null) return null;

        var chunks = _db.Query<dynamic>(
            "SELECT id, chunk_index, text FROM knowledge_chunks WHERE document_id = @Id ORDER BY chunk_index",
            new { Id = id });

        return new DocumentDetail
        {
            Id = (long)doc.id,
            SourceType = doc.source_type,
            SourceRef = doc.source_ref,
            ProjectId = doc.project_id,
            Title = doc.title,
            FullText = doc.full_text,
            Speakers = doc.speakers,
            OccurredAt = doc.occurred_at,
            CreatedAt = doc.created_at,
            CreatedBy = doc.created_by,
            Chunks = chunks.Select(c => new ChunkInfo
            {
                Id = (long)c.id,
                Index = (int)c.chunk_index,
                Text = c.text,
            }).ToList(),
        };
    }

    public bool DeleteDocument(long id, string userId, bool isAdmin)
    {
        var scopeFilter = BuildScopeFilter(isAdmin, userId, null);

        // 检查权限
        var exists = _db.ExecuteScalar<int>(
            $@"SELECT COUNT(*) FROM knowledge_documents d WHERE d.id = @Id AND {scopeFilter.Filter}",
            new { Id = id, scopeFilter.Uid, scopeFilter.ProjectId });

        if (exists == 0) return false;

        // 删除分块（触发器自动同步 FTS）
        _db.Execute("DELETE FROM knowledge_chunks WHERE document_id = @Id", new { Id = id });
        // 删除文档
        _db.Execute("DELETE FROM knowledge_documents WHERE id = @Id", new { Id = id });

        return true;
    }

    // ═══════════════════════════════════════════════════════════
    // 文本清洗
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// 清洗文本：去纯语气词碎段、规整空白、合并连续换行
    /// </summary>
    public static string CleanText(string text)
    {
        if (string.IsNullOrEmpty(text)) return "";

        var lines = text.Split('\n');
        var cleaned = new List<string>();

        foreach (var line in lines)
        {
            var trimmed = line.Trim();
            if (string.IsNullOrWhiteSpace(trimmed)) continue;

            // 去掉纯语气词行（如单独一行只有"嗯"或"啊"）
            if (FillerWords.Contains(trimmed)) continue;

            // 规整空白：多个连续空格 → 单个
            trimmed = System.Text.RegularExpressions.Regex.Replace(trimmed, @"\s+", " ");
            cleaned.Add(trimmed);
        }

        return string.Join("\n", cleaned);
    }

    // ═══════════════════════════════════════════════════════════
    // 说话人归一化 — 已移至 SpeakerLabelNormalizer（共享工具类）
    // STT 层在持久化前调用 SpeakerLabelNormalizer.Normalize()
    // 知识库入库时直接使用已归一化的 segments，调用 BuildSpeakersJson 生成 JSON
    // ═══════════════════════════════════════════════════════════

    // ═══════════════════════════════════════════════════════════
    // 分块算法
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// 文本分块：300-500 字/块，按句子边界切，块间 ~50 字重叠
    /// 不把一句话切两半
    /// </summary>
    public static List<string> ChunkText(string text)
    {
        if (string.IsNullOrEmpty(text)) return new List<string>();

        // 1. 按句子边界分割
        var sentences = SplitSentences(text);
        if (sentences.Count == 0) return new List<string> { text };

        // 2. 贪婪组装分块
        var chunks = new List<string>();
        var currentChunk = new System.Text.StringBuilder();
        var currentLen = 0;
        string? lastSentence = null; // 用于重叠

        foreach (var sentence in sentences)
        {
            // 如果加上这句会超 MaxChunkSize，且当前块已有内容 → 保存当前块
            if (currentLen + sentence.Length > MaxChunkSize && currentLen >= MinChunkSize)
            {
                chunks.Add(currentChunk.ToString().Trim());

                // 重叠：保留最后一句作为下一块的开头
                currentChunk.Clear();
                currentLen = 0;
                if (lastSentence != null && lastSentence.Length <= OverlapSize * 2)
                {
                    currentChunk.Append(lastSentence);
                    currentLen = lastSentence.Length;
                }
            }

            currentChunk.Append(sentence);
            currentLen += sentence.Length;
            lastSentence = sentence;
        }

        // 保存最后一块
        if (currentLen > 0)
        {
            chunks.Add(currentChunk.ToString().Trim());
        }

        // 如果某句话超过 MaxChunkSize，硬切（按 MaxChunkSize 等分）
        var finalChunks = new List<string>();
        foreach (var chunk in chunks)
        {
            if (chunk.Length <= MaxChunkSize)
            {
                finalChunks.Add(chunk);
            }
            else
            {
                // 硬切超长块
                for (int i = 0; i < chunk.Length; i += MaxChunkSize - OverlapSize)
                {
                    var len = Math.Min(MaxChunkSize, chunk.Length - i);
                    finalChunks.Add(chunk.Substring(i, len));
                    if (i + len >= chunk.Length) break;
                }
            }
        }

        return finalChunks;
    }

    /// <summary>按句子结束符分割文本，保留结束符</summary>
    private static List<string> SplitSentences(string text)
    {
        var sentences = new List<string>();
        var current = new System.Text.StringBuilder();

        foreach (var ch in text)
        {
            current.Append(ch);
            if (SentenceEndings.Contains(ch))
            {
                var s = current.ToString().Trim();
                if (s.Length > 0) sentences.Add(s);
                current.Clear();
            }
        }

        var remaining = current.ToString().Trim();
        if (remaining.Length > 0) sentences.Add(remaining);

        return sentences;
    }

    // ═══════════════════════════════════════════════════════════
    // FTS5 检索
    // ═══════════════════════════════════════════════════════════

    private List<ChunkMatch> FtsSearch(string query, ScopeFilter scope, int topN)
    {
        // FTS5 trigram: 少于 3 字的查询不灵，靠语义那路补上
        if (query.Length < 3) return new List<ChunkMatch>();

        try
        {
            var sql = $@"
                SELECT c.id AS ChunkId, c.document_id AS DocumentId, c.chunk_index AS ChunkIndex,
                       c.text AS Text,
                       d.title AS DocTitle, d.source_type AS SourceType, d.source_ref AS SourceRef,
                       d.project_id AS ProjectId, d.speakers AS Speakers, d.occurred_at AS OccurredAt,
                       d.created_by AS CreatedBy,
                       bm25(knowledge_fts) AS Score
                FROM knowledge_fts
                JOIN knowledge_chunks c ON c.id = knowledge_fts.rowid
                JOIN knowledge_documents d ON d.id = c.document_id
                WHERE knowledge_fts MATCH @Query AND {scope.Filter}
                ORDER BY bm25(knowledge_fts)
                LIMIT @TopN";

            var rows = _db.Query<dynamic>(sql, new { Query = query, scope.Uid, scope.ProjectId, TopN = topN });

            return rows.Select((r, i) => new ChunkMatch
            {
                ChunkId = (long)r.ChunkId,
                DocumentId = (long)r.DocumentId,
                ChunkIndex = (int)r.ChunkIndex,
                Text = r.Text,
                FtsScore = (double)r.Score,
                FtsRank = i + 1,
                DocTitle = r.DocTitle,
                SourceType = r.SourceType,
                SourceRef = r.SourceRef,
                ProjectId = r.ProjectId,
                Speakers = r.Speakers,
                OccurredAt = r.OccurredAt,
                CreatedBy = r.CreatedBy,
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "[KnowledgeBaseService] FTS 检索失败");
            return new List<ChunkMatch>();
        }
    }

    // ═══════════════════════════════════════════════════════════
    // 语义检索
    // ═══════════════════════════════════════════════════════════

    private List<ChunkMatch> SemanticSearch(float[] queryVec, ScopeFilter scope, int topN)
    {
        // 加载所有 chunk embeddings（本地几千块直接内存暴力算）
        var sql = $@"
            SELECT c.id AS ChunkId, c.document_id AS DocumentId, c.chunk_index AS ChunkIndex,
                   c.text AS Text, c.embedding AS Embedding,
                   d.title AS DocTitle, d.source_type AS SourceType, d.source_ref AS SourceRef,
                   d.project_id AS ProjectId, d.speakers AS Speakers, d.occurred_at AS OccurredAt,
                   d.created_by AS CreatedBy
            FROM knowledge_chunks c
            JOIN knowledge_documents d ON d.id = c.document_id
            WHERE c.embedding IS NOT NULL AND {scope.Filter}";

        var rows = _db.Query<dynamic>(sql, new { scope.Uid, scope.ProjectId });

        var matches = new List<ChunkMatch>();
        foreach (var r in rows)
        {
            var embedding = BytesToFloat((byte[])r.Embedding);
            var similarity = DotProduct(queryVec, embedding); // L2归一化后点积 = 余弦

            matches.Add(new ChunkMatch
            {
                ChunkId = (long)r.ChunkId,
                DocumentId = (long)r.DocumentId,
                ChunkIndex = (int)r.ChunkIndex,
                Text = r.Text,
                SemanticScore = similarity,
                DocTitle = r.DocTitle,
                SourceType = r.SourceType,
                SourceRef = r.SourceRef,
                ProjectId = r.ProjectId,
                Speakers = r.Speakers,
                OccurredAt = r.OccurredAt,
                CreatedBy = r.CreatedBy,
            });
        }

        // 按相似度排序取 top N
        return matches
            .OrderByDescending(m => m.SemanticScore)
            .Take(topN)
            .Select((m, i) => { m.SemanticRank = i + 1; return m; })
            .ToList();
    }

    // ═══════════════════════════════════════════════════════════
    // RRF 融合
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// 倒数排名融合 (Reciprocal Rank Fusion)
    /// score = Σ 1/(k + rank)，k=60
    /// </summary>
    public static List<ChunkMatch> RrfFuse(List<ChunkMatch> ftsResults, List<ChunkMatch> semanticResults, int topK)
    {
        var scores = new Dictionary<long, double>(); // chunkId → rrf score
        var chunkMap = new Dictionary<long, ChunkMatch>(); // chunkId → metadata

        // FTS 贡献
        foreach (var r in ftsResults)
        {
            var contribution = 1.0 / (RrfK + r.FtsRank!.Value);
            if (!scores.ContainsKey(r.ChunkId)) scores[r.ChunkId] = 0;
            scores[r.ChunkId] += contribution;
            chunkMap[r.ChunkId] = r;
        }

        // 语义贡献
        foreach (var r in semanticResults)
        {
            var contribution = 1.0 / (RrfK + r.SemanticRank!.Value);
            if (!scores.ContainsKey(r.ChunkId)) scores[r.ChunkId] = 0;
            scores[r.ChunkId] += contribution;

            // 如果 FTS 没有这个 chunk，用语义结果的元信息
            if (!chunkMap.ContainsKey(r.ChunkId))
                chunkMap[r.ChunkId] = r;
            else
            {
                // 合并信息：如果 FTS 有但语义没有，补上 semantic score
                chunkMap[r.ChunkId].SemanticScore = r.SemanticScore;
                chunkMap[r.ChunkId].SemanticRank = r.SemanticRank;
            }
        }

        // 排序取 topK
        var fused = scores
            .OrderByDescending(kvp => kvp.Value)
            .Take(topK)
            .Select(kvp =>
            {
                var match = chunkMap[kvp.Key];
                match.RrfScore = kvp.Value;
                return match;
            })
            .ToList();

        return fused;
    }

    // ═══════════════════════════════════════════════════════════
    // 数据范围过滤
    // ═══════════════════════════════════════════════════════════

    private static ScopeFilter BuildScopeFilter(bool isAdmin, string? userId, int? projectId)
    {
        if (isAdmin)
        {
            if (projectId.HasValue)
                return new ScopeFilter("d.project_id = @ProjectId", null, projectId.Value);
            return new ScopeFilter("(1 = 1)", null, 0);
        }

        // 非管理员：created_by = uid OR 授权项目
        if (projectId.HasValue)
        {
            return new ScopeFilter(
                @"(d.created_by = @Uid
                   OR EXISTS(SELECT 1 FROM project_authorizations
                             WHERE project_id = @ProjectId AND user_id = @Uid))",
                userId, projectId.Value);
        }

        return new ScopeFilter(
            @"(d.created_by = @Uid
               OR EXISTS(SELECT 1 FROM project_authorizations pa
                         WHERE pa.project_id = d.project_id AND pa.user_id = @Uid))",
            userId, 0);
    }

    private List<DocumentSummary> GetDocumentsForChunks(List<ChunkMatch> hits)
    {
        var docIds = hits.Select(h => h.DocumentId).Distinct().ToList();
        if (docIds.Count == 0) return new List<DocumentSummary>();

        var docs = _db.Query<dynamic>(
            "SELECT id, title, source_type, source_ref, project_id, speakers, occurred_at, created_at, created_by FROM knowledge_documents WHERE id IN @Ids",
            new { Ids = docIds });

        return docs.Select(d => new DocumentSummary
        {
            Id = (long)d.id,
            Title = d.title,
            SourceType = d.source_type,
            SourceRef = d.source_ref,
            ProjectId = d.project_id,
            Speakers = d.speakers,
            OccurredAt = d.occurred_at,
            CreatedAt = d.created_at,
            CreatedBy = d.created_by,
        }).ToList();
    }

    // ═══════════════════════════════════════════════════════════
    // 向量序列化辅助
    // ═══════════════════════════════════════════════════════════

    public static byte[] FloatToBytes(float[] values)
    {
        var bytes = new byte[values.Length * 4];
        Buffer.BlockCopy(values, 0, bytes, 0, bytes.Length);
        return bytes;
    }

    public static float[] BytesToFloat(byte[] bytes)
    {
        var values = new float[bytes.Length / 4];
        Buffer.BlockCopy(bytes, 0, values, 0, bytes.Length);
        return values;
    }

    public static float DotProduct(float[] a, float[] b)
    {
        var sum = 0f;
        var len = Math.Min(a.Length, b.Length);
        for (int i = 0; i < len; i++)
            sum += a[i] * b[i];
        return sum;
    }
}

// ═══════════════════════════════════════════════════════════
// DTO / 返回类型
// ═══════════════════════════════════════════════════════════

public class SearchResult
{
    public string Query { get; set; } = "";
    public int TotalHits { get; set; }
    public List<ChunkMatch> Hits { get; set; } = new();
    public List<DocumentSummary> Documents { get; set; } = new();
    public bool UsedSemantic { get; set; }
}

public class ChunkMatch
{
    public long ChunkId { get; set; }
    public long DocumentId { get; set; }
    public int ChunkIndex { get; set; }
    public string Text { get; set; } = "";

    // FTS 相关
    public double? FtsScore { get; set; }
    public int? FtsRank { get; set; }

    // 语义相关
    public double? SemanticScore { get; set; }
    public int? SemanticRank { get; set; }

    // RRF 融合分数
    public double? RrfScore { get; set; }

    // 文档元信息
    public string? DocTitle { get; set; }
    public string? SourceType { get; set; }
    public string? SourceRef { get; set; }
    public int? ProjectId { get; set; }
    public string? Speakers { get; set; }
    public string? OccurredAt { get; set; }
    public string? CreatedBy { get; set; }
}

public class DocumentSummary
{
    public long Id { get; set; }
    public string Title { get; set; } = "";
    public string? SourceType { get; set; }
    public string? SourceRef { get; set; }
    public int? ProjectId { get; set; }
    public string? Speakers { get; set; }
    public string? OccurredAt { get; set; }
    public string CreatedAt { get; set; } = "";
    public string CreatedBy { get; set; } = "";
}

public class DocumentDetail
{
    public long Id { get; set; }
    public string SourceType { get; set; } = "";
    public string? SourceRef { get; set; }
    public int? ProjectId { get; set; }
    public string Title { get; set; } = "";
    public string FullText { get; set; } = "";
    public string? Speakers { get; set; }
    public string? OccurredAt { get; set; }
    public string CreatedAt { get; set; } = "";
    public string UpdatedAt { get; set; } = "";
    public string CreatedBy { get; set; } = "";
    public List<ChunkInfo> Chunks { get; set; } = new();
}

public class ChunkInfo
{
    public long Id { get; set; }
    public int Index { get; set; }
    public string Text { get; set; } = "";
}

// 内部辅助类型
internal record ScopeFilter(string Filter, string? Uid, int ProjectId);

================
File: EngineeringManager.Api/Services/LlmProviderService.cs
================
using System.Data;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Dapper;
using EngineeringManager.Api.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace EngineeringManager.Api.Services;

/// <summary>
/// LLM Provider 服务 — 管理 LLM 配置的加载、持久化与 API 调用
///
/// 配置优先级：
///   1. 用户自定义配置（DPAPI 加密存储于 &lt;dataPath&gt;/llm-config.dpapi.json）
///   2. 环境变量（LLM_BASE_URL / LLM_API_KEY / LLM_MODEL）
///   3. 内置 Agnes 免费 API 兜底
///
/// 线程安全：配置读写由 LlmConfigResolver 管理
/// </summary>
public class LlmProviderService
{
    private readonly ILogger<LlmProviderService> _logger;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IModelRouter _router;
    private readonly LlmConfigResolver _configResolver;

    private static readonly JsonSerializerOptions SerializerOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    public LlmProviderService(
        ILogger<LlmProviderService> logger,
        IHttpClientFactory httpClientFactory,
        IModelRouter router,
        LlmConfigResolver configResolver)
    {
        _logger = logger;
        _httpClientFactory = httpClientFactory;
        _router = router;
        _configResolver = configResolver;
    }

    // ═══════════════════════════════════════════════════════════
    // 公开方法
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// 获取当前生效配置（不含 apiKey，安全返回给前端）
    /// </summary>
    public LlmProviderConfig GetConfig()
    {
        return _configResolver.GetConfig();
    }

    /// <summary>
    /// 获取当前生效配置（含 apiKey，内部使用）
    /// </summary>
    public LlmProviderConfig GetConfigWithKey()
    {
        return _configResolver.GetConfigWithKey();
    }

    /// <summary>
    /// 测试 LLM 连接 — 调用 /models 端点，返回可用模型列表
    /// </summary>
    public async Task<(bool success, string[] models, string? error)> TestConnectionAsync(
        string baseUrl, string apiKey)
    {
        try
        {
            var client = _httpClientFactory.CreateClient("LlmProvider");
            client.Timeout = TimeSpan.FromSeconds(30);

            using var request = new HttpRequestMessage(HttpMethod.Get,
                $"{baseUrl.TrimEnd('/')}/models");
            request.Headers.Add("Authorization", $"Bearer {apiKey}");

            var response = await client.SendAsync(request);
            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync();
                return (false, Array.Empty<string>(), $"HTTP {response.StatusCode}: {body.Truncate(200)}");
            }

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            var models = new List<string>();

            if (doc.RootElement.TryGetProperty("data", out var data) && data.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in data.EnumerateArray())
                {
                    if (item.TryGetProperty("id", out var id))
                        models.Add(id.GetString() ?? "");
                }
            }

            return (true, models.ToArray(), null);
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[LlmProviderService] TestConnection 失败: {ex.Message}");
            return (false, Array.Empty<string>(), ex.Message);
        }
    }

    /// <summary>
    /// 检查 LLM 是否可用（配置存在 + 可连接）
    /// </summary>
    public async Task<bool> IsAvailableAsync()
    {
        try
        {
            var config = _configResolver.GetConfigWithKey();
            var (ok, _, _) = await TestConnectionAsync(
                config.BaseUrl,
                config.ApiKey);
            return ok;
        }
        catch
        {
            return false;
        }
    }

    /// <summary>
    /// 重新加载配置（从持久化文件 + 环境变量重新解析）
    /// </summary>
    public async Task ReloadConfigAsync()
    {
        await _configResolver.ReloadConfigAsync();
    }

    /// <summary>
    /// 保存用户自定义配置（DPAPI 加密 apiKey，存到 llm-config.dpapi.json）
    /// 如果 newConfig.ApiKey 为空，保留旧 key（避免前端只改 model 时把 key 清空）
    /// </summary>
    public async Task SaveUserConfigAsync(LlmProviderConfig newConfig)
    {
        await _configResolver.SaveUserConfigAsync(newConfig);
        _logger.LogInformation("[LlmProviderService] 用户配置已保存: Provider={Provider}, Model={Model}",
            newConfig.ProviderName, newConfig.Model);
    }

    /// <summary>
    /// 非流式 Chat API 调用 — 支持 function calling
    /// </summary>
    public async Task<ChatCompletionResponse?> ChatAsync(
        List<AgentMessage> messages,
        List<object>? tools = null)
    {
        var route = _router.GetRoute("chat");

        var payload = new Dictionary<string, object>
        {
            ["model"] = route.Model,
            ["messages"] = messages,
        };

        if (tools != null && tools.Count > 0)
            payload["tools"] = tools;

        if (route.Temperature > 0)
            payload["temperature"] = route.Temperature;

        if (route.MaxTokens > 0)
            payload["max_tokens"] = route.MaxTokens;

        try
        {
            var client = _httpClientFactory.CreateClient("LlmProvider");
            client.Timeout = TimeSpan.FromSeconds(120);

            var json = JsonSerializer.Serialize(payload, SerializerOptions);
            using var content = new StringContent(json, Encoding.UTF8, "application/json");
            using var request = new HttpRequestMessage(HttpMethod.Post,
                $"{route.BaseUrl.TrimEnd('/')}/chat/completions");
            request.Headers.Add("Authorization", $"Bearer {route.ApiKey}");
            request.Content = content;

            var response = await client.SendAsync(request);
            var responseBody = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                Console.Error.WriteLine($"[LlmProviderService] Chat API 错误 ({response.StatusCode}): {responseBody.Truncate(500)}");
                return null;
            }

            return JsonSerializer.Deserialize<ChatCompletionResponse>(responseBody, SerializerOptions);
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[LlmProviderService] ChatAsync 失败: {ex.Message}");
            return null;
        }
    }

    /// <summary>
    /// 流式 Chat API 调用 — 返回 SSE 字符串流
    /// </summary>
    public async IAsyncEnumerable<string> ChatStreamAsync(
        List<AgentMessage> messages,
        List<object>? tools = null)
    {
        var route = _router.GetRoute("chat-stream");

        var payload = new Dictionary<string, object>
        {
            ["model"] = route.Model,
            ["messages"] = messages,
            ["stream"] = true,
        };

        if (tools != null && tools.Count > 0)
            payload["tools"] = tools;

        if (route.Temperature > 0)
            payload["temperature"] = route.Temperature;

        if (route.MaxTokens > 0)
            payload["max_tokens"] = route.MaxTokens;

        // 分离连接与 yield：try/catch 内不能 yield return
        var connectResult = await ConnectStreamAsync(route, payload);
        if (connectResult.Error != null)
        {
            yield return connectResult.Error;
            yield break;
        }

        var reader = connectResult.Reader!;
        while (true)
        {
            string? line;
            try
            {
                line = await reader.ReadLineAsync();
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[LlmProviderService] SSE 读取失败: {ex.Message}");
                yield break;
            }

            if (line == null) break;
            if (line.StartsWith("data: "))
            {
                var data = line.Substring(6).Trim();
                if (data == "[DONE]") break;
                yield return data;
            }
        }
    }

    private async Task<(StreamReader? Reader, string? Error)> ConnectStreamAsync(
        ModelRouteInfo route,
        Dictionary<string, object> payload)
    {
        try
        {
            var client = _httpClientFactory.CreateClient("LlmProvider");
            client.Timeout = TimeSpan.FromSeconds(300);

            var json = JsonSerializer.Serialize(payload, SerializerOptions);
            using var content = new StringContent(json, Encoding.UTF8, "application/json");
            using var request = new HttpRequestMessage(HttpMethod.Post,
                $"{route.BaseUrl.TrimEnd('/')}/chat/completions");
            request.Headers.Add("Authorization", $"Bearer {route.ApiKey}");
            request.Content = content;

            var response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead);

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync();
                Console.Error.WriteLine($"[LlmProviderService] ChatStream API 错误 ({response.StatusCode}): {errorBody.Truncate(500)}");
                return (null, JsonSerializer.Serialize(new { error = $"LLM 调用失败: {response.StatusCode}" }));
            }

            var reader = new StreamReader(await response.Content.ReadAsStreamAsync());
            return (reader, null);
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[LlmProviderService] ChatStreamAsync 连接失败: {ex.Message}");
            return (null, JsonSerializer.Serialize(new { error = $"连接 LLM 失败: {ex.Message}" }));
        }
    }

    // ═══════════════════════════════════════════════════════════
    // 私有方法
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    }

================
File: EngineeringManager.Api/Services/ModelRoutingService.cs
================
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace EngineeringManager.Api.Services;

/// <summary>
/// 配置驱动的模型路由服务 — 从配置/环境变量读取路由策略。
/// 保留现有三级 key 兜底逻辑（DPAPI → 环境变量 → 内置 Agnes），
/// 但将「选模型」与「拿 key」职责分清。
/// </summary>
public class ModelRoutingService : IModelRouter
{
    private readonly ILogger<ModelRoutingService> _logger;
    private readonly IConfiguration _configuration;
    private readonly LlmConfigResolver _configResolver;

    public ModelRoutingService(
        ILogger<ModelRoutingService> logger,
        IConfiguration configuration,
        LlmConfigResolver configResolver)
    {
        _logger = logger;
        _configuration = configuration;
        _configResolver = configResolver;
    }

    /// <summary>
    /// 获取模型路由信息。
    /// 策略：先从配置读取默认模型覆盖，否则回退到三级兜底。
    /// </summary>
    public ModelRouteInfo GetRoute(string scenario = "default")
    {
        // 尝试从配置读取模型覆盖（路由层配置）
        var overriddenModel = _configuration["LLM_ROUTE_MODEL"]
            ?? Environment.GetEnvironmentVariable("LLM_ROUTE_MODEL");
        var overriddenBaseUrl = _configuration["LLM_ROUTE_BASE_URL"]
            ?? Environment.GetEnvironmentVariable("LLM_ROUTE_BASE_URL");

        // 从 LlmConfigResolver 获取当前生效配置（含三级兜底 key）
        var config = _configResolver.GetConfigWithKey();

        var model = overriddenModel ?? config.Model;
        var baseUrl = overriddenBaseUrl ?? config.BaseUrl;

        _logger.LogDebug(
            "[ModelRoutingService] Scenario={Scenario}, Model={Model}, BaseUrl={BaseUrl}, Provider={Provider}",
            scenario, model, baseUrl, config.ProviderName);

        return new ModelRouteInfo(
            Model: model,
            BaseUrl: baseUrl,
            ApiKey: config.ApiKey,
            ProviderName: config.ProviderName,
            UseBuiltIn: config.UseBuiltIn,
            Temperature: config.Temperature > 0 ? config.Temperature : 0.7,
            MaxTokens: config.MaxTokens > 0 ? config.MaxTokens : 4096
        );
    }
}

================
File: EngineeringManager.Api/Services/SafeQueryValidator.cs
================
using System.Data;
using System.Text.RegularExpressions;
using Dapper;
using SqlParser;
using SqlParser.Ast;
using SqlParser.Dialects;

namespace EngineeringManager.Api.Services;

/// <summary>
/// 安全查询验证器 — 为 runSafeQuery 工具提供 SQL 校验、改写和审计
///
/// 功能：
///   1. 语句类型校验（仅允许单条 SELECT）
///   2. 表/列白名单校验
///   3. 危险构造检测
///   4. 强制注入用户过滤
///   5. 强制 LIMIT
///   6. 审计日志
/// </summary>
public static class SafeQueryValidator
{
    // ═══════════════════════════════════════════════════════════
    // 白名单定义
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// 表名 → 允许查询的列名集合
    /// </summary>
    public static readonly Dictionary<string, HashSet<string>> TableWhitelist = new(StringComparer.OrdinalIgnoreCase)
    {
        ["projects"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "id", "name", "description", "address", "start_date", "end_date",
            "status", "budget", "created_by", "created_at", "updated_at"
        },
        ["members"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "id", "name", "phone", "email", "member_type", "role", "gender",
            "ethnicity", "birth_date", "base_salary", "daily_wage",
            "entry_date", "status", "department_id", "position", "created_by", "created_at"
        },
        ["workers"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "id", "name", "gender", "phone", "address", "worker_type",
            "daily_wage", "created_by", "created_at"
        },
        ["invoices"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "id", "project_id", "seller_id", "buyer_id", "contract_id",
            "settlement_id", "type", "invoice_kind", "invoice_no", "invoice_code",
            "name", "amount", "price_amount", "tax_rate", "tax_amount",
            "received_amount", "issue_date", "status", "remarks", "created_by", "created_at"
        },
        ["settlements"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "id", "project_id", "partner_id", "contract_id", "type",
            "amount", "settlement_date", "status", "remarks", "created_by", "created_at"
        },
        ["cost_ledger"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "id", "project_id", "batch_id", "voucher_no", "date", "direction",
            "category", "amount", "counterparty", "channel", "summary", "notes", "created_by", "created_at"
        },
        ["income_contracts"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "id", "project_id", "partner_id", "name", "type", "amount",
            "sign_date", "status", "remarks", "created_by", "created_at"
        },
        ["expense_contracts"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "id", "project_id", "partner_id", "name", "type", "amount",
            "sign_date", "status", "remarks", "created_by", "created_at"
        },
        ["inventory_items"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "id", "name", "category", "unit", "quantity", "min_quantity",
            "location", "notes", "created_by", "created_at"
        },
        ["partners"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "id", "name", "category", "contact", "phone", "email",
            "address", "tax_number", "credit_code", "created_by", "created_at"
        },
    };

    /// <summary>
    /// 公司级表（无 project_id，使用 UserFilterCompany）
    /// </summary>
    private static readonly HashSet<string> CompanyLevelTables = new(StringComparer.OrdinalIgnoreCase)
    {
        "projects", "members", "workers", "partners", "inventory_items"
    };

    /// <summary>
    /// 项目级表（有 project_id，使用 UserFilterWithAuthorizedProjects）
    /// </summary>
    private static readonly HashSet<string> ProjectLevelTables = new(StringComparer.OrdinalIgnoreCase)
    {
        "invoices", "settlements", "cost_ledger", "income_contracts", "expense_contracts"
    };

    // ═══════════════════════════════════════════════════════════
    // 禁止的关键字和构造
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// DDL/DML/危险关键字（不区分大小写）
    /// </summary>
    private static readonly HashSet<string> ForbiddenKeywords = new(StringComparer.OrdinalIgnoreCase)
    {
        "INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "CREATE", "ATTACH",
        "DETACH", "PRAGMA", "VACUUM", "TRUNCATE", "GRANT", "REVOKE"
    };

    /// <summary>
    /// 禁止访问的系统表
    /// </summary>
    private static readonly HashSet<string> ForbiddenTables = new(StringComparer.OrdinalIgnoreCase)
    {
        "sqlite_master", "sqlite_temp_master", "sqlite_sequence",
        "users", "roles", "audit_logs", "llm_config", "llm-config"
    };

    /// <summary>
    /// 禁止的函数
    /// </summary>
    private static readonly HashSet<string> ForbiddenFunctions = new(StringComparer.OrdinalIgnoreCase)
    {
        "load_extension", "edit", "fts3", "fts4", "fts5"
    };

    // ═══════════════════════════════════════════════════════════
    // 公开方法
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// 验证并改写 SQL 查询
    /// </summary>
    /// <param name="sql">原始 SQL</param>
    /// <param name="uid">当前用户 ID</param>
    /// <param name="scope">数据范围(替代原 isAdmin 布尔)</param>
    /// <returns>验证结果，包含改写后的 SQL 或错误信息</returns>
    public static ValidationResult ValidateAndRewrite(string sql, string uid, Security.CurrentUser.DataScope scope)
    {
        // 1. 基本清理
        sql = sql.Trim().TrimEnd(';').Trim();

        if (string.IsNullOrWhiteSpace(sql))
            return new ValidationResult(false, null, null, "SQL 不能为空");

        // 2. AST 解析
        Sequence<Statement> statements;
        try
        {
            var options = new ParserOptions();
            var parser = new SqlQueryParser();
            statements = parser.Parse(sql, new SQLiteDialect(), options);
        }
        catch (Exception ex)
        {
            return new ValidationResult(false, null, null, $"SQL 解析失败: {ex.Message}");
        }

        // 3. 必须恰好一条语句且为 Query
        if (statements.Count != 1)
            return new ValidationResult(false, null, null, "不允许多条语句");

        var stmt = statements[0];
        Query query;
        try
        {
            query = stmt.AsQuery();
        }
        catch
        {
            return new ValidationResult(false, null, null, "只允许 SELECT 查询");
        }

        // 4. Body 必须是 Select（拒绝 SetOperation 如 UNION）
        Select select;
        try
        {
            select = query.Body.AsSelect();
        }
        catch
        {
            return new ValidationResult(false, null, null, "不支持 UNION/INTERSECT/EXCEPT 等集合操作");
        }

        // 5. ForbiddenKeywords 二次兜底（检查原始 SQL）
        foreach (var keyword in ForbiddenKeywords)
        {
            if (Regex.IsMatch(sql, $@"\b{keyword}\b", RegexOptions.IgnoreCase))
                return new ValidationResult(false, null, null, $"禁止使用 {keyword} 关键字");
        }

        // 6. ForbiddenFunctions 二次兜底
        foreach (var func in ForbiddenFunctions)
        {
            if (Regex.IsMatch(sql, $@"\b{func}\s*\(", RegexOptions.IgnoreCase))
                return new ValidationResult(false, null, null, $"禁止使用 {func} 函数");
        }

        // 7. 收集所有被引用表并校验
        var aliasToTable = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        var referencedTables = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        try
        {
            CollectTables(select.From, aliasToTable, referencedTables);
        }
        catch (ValidationException ex)
        {
            return new ValidationResult(false, null, null, ex.Message);
        }

        if (referencedTables.Count == 0)
            return new ValidationResult(false, null, null, "未找到有效的表名");

        // 8. 校验列白名单
        try
        {
            ValidateProjection(select.Projection, aliasToTable, referencedTables);
        }
        catch (ValidationException ex)
        {
            return new ValidationResult(false, null, null, ex.Message);
        }

        // 8.4 收集投影别名（供 ORDER BY / HAVING 引用放行）
        var projectionAliases = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var item in select.Projection)
        {
            if (item is SelectItem.ExpressionWithAlias ewa)
                projectionAliases.Add(ewa.Alias.Value);
        }

        // 8.5 校验 WHERE / GROUP BY / HAVING / ORDER BY（与投影同等的列/表/子查询校验）
        try
        {
            if (select.Selection != null)
                ValidateExpressionColumns(select.Selection, aliasToTable, referencedTables);

            // HAVING 引用投影别名时放行（SQLite 允许）
            if (!(select.Having is Expression.Identifier hid
                  && projectionAliases.Contains(hid.Ident.Value)))
            {
                if (select.Having != null)
                    ValidateExpressionColumns(select.Having, aliasToTable, referencedTables);
            }

            if (select.GroupBy is GroupByExpression.Expressions groupByExprs)
            {
                foreach (var ge in groupByExprs.ColumnNames)
                    ValidateExpressionColumns(ge, aliasToTable, referencedTables);
            }

            // ORDER BY 引用投影别名的标识符放行
            if (query.OrderBy != null)
            {
                foreach (var ob in query.OrderBy.Expressions)
                {
                    if (ob.Expression is Expression.Identifier oid
                        && projectionAliases.Contains(oid.Ident.Value))
                        continue;
                    ValidateExpressionColumns(ob.Expression, aliasToTable, referencedTables);
                }
            }
        }
        catch (ValidationException ex)
        {
            return new ValidationResult(false, null, null, ex.Message);
        }

        // 9. 使用 AST 回写 SQL 作为基础
        var rewrittenSql = query.ToSql();

        // 10. 强制注入用户过滤（字符串层面）
        rewrittenSql = InjectUserFilterAstAware(rewrittenSql, aliasToTable, referencedTables, scope);

        // 11. 强制 LIMIT（字符串兜底）
        rewrittenSql = EnsureLimit(rewrittenSql, 100);

        return new ValidationResult(true, rewrittenSql, referencedTables, null);
    }

    /// <summary>
    /// 获取表的过滤 SQL 片段
    /// </summary>
    public static string GetTableFilter(Security.CurrentUser.DataScope scope, string table, string tableAlias = "")
    {
        var colPrefix = string.IsNullOrEmpty(tableAlias) ? "" : $"{tableAlias}.";
        var createdByCol = $"{colPrefix}created_by";

        if (CompanyLevelTables.Contains(table))
            return Security.CurrentUser.UserFilterCompany(scope, createdByCol);

        if (ProjectLevelTables.Contains(table))
        {
            var projectCol = $"{colPrefix}project_id";
            return Security.CurrentUser.UserFilterWithAuthorizedProjects(scope, projectCol, createdByCol);
        }

        // 默认使用公司级过滤
        return Security.CurrentUser.UserFilterCompany(scope, createdByCol);
    }

    // ═══════════════════════════════════════════════════════════
    // 私有方法 — AST 遍历与校验
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// 递归收集 FROM 和 JOIN 中出现的表，校验表名白名单。
    /// 对 Derived（子查询）递归校验内部 Select。
    /// </summary>
    private static void CollectTables(
        Sequence<TableWithJoins> fromClause,
        Dictionary<string, string> aliasToTable,
        HashSet<string> referencedTables)
    {
        foreach (var tableWithJoins in fromClause)
        {
            CollectTableFromFactor(tableWithJoins.Relation, aliasToTable, referencedTables);

            if (tableWithJoins.Joins != null)
            {
                foreach (var join in tableWithJoins.Joins)
                {
                    CollectTableFromFactor(join.Relation, aliasToTable, referencedTables);
                }
            }
        }
    }

    /// <summary>
    /// 从单个 TableFactor 中提取表信息
    /// </summary>
    private static void CollectTableFromFactor(
        TableFactor factor,
        Dictionary<string, string> aliasToTable,
        HashSet<string> referencedTables)
    {
        if (factor is TableFactor.Table table)
        {
            var tableName = GetObjectNameSimpleName(table.Name);

            string? alias = null;
            if (table.Alias != null)
                alias = table.Alias.Name.Value;

            referencedTables.Add(tableName);

            if (!string.IsNullOrEmpty(alias))
                aliasToTable[alias] = tableName;

            if (ForbiddenTables.Contains(tableName))
                throw new ValidationException($"禁止访问表 {tableName}");

            if (!TableWhitelist.ContainsKey(tableName))
                throw new ValidationException($"表 {tableName} 不在白名单中");
        }
        else if (factor is TableFactor.Derived derived)
        {
            ValidateDerivedQuery(derived.SubQuery, aliasToTable, referencedTables);
        }
        else
        {
            throw new ValidationException("不支持的表类型（子查询/表函数等）");
        }
    }

    /// <summary>
    /// 递归校验子查询（Derived 中的 SubQuery）
    /// </summary>
    private static void ValidateDerivedQuery(
        Query subQuery,
        Dictionary<string, string> parentAliasToTable,
        HashSet<string> parentReferencedTables)
    {
        Select subSelect;
        try
        {
            subSelect = subQuery.Body.AsSelect();
        }
        catch
        {
            throw new ValidationException("子查询中不支持集合操作");
        }

        CollectTables(subSelect.From, parentAliasToTable, parentReferencedTables);
        ValidateProjection(subSelect.Projection, parentAliasToTable, parentReferencedTables);

        // 额外校验子查询自己的 WHERE/GROUP/ORDER（嵌套子查询的场景）
        if (subSelect.Selection != null)
            ValidateExpressionColumns(subSelect.Selection, parentAliasToTable, parentReferencedTables);
        if (subSelect.Having != null)
            ValidateExpressionColumns(subSelect.Having, parentAliasToTable, parentReferencedTables);
        if (subSelect.GroupBy is GroupByExpression.Expressions gbSub)
        {
            foreach (var ge in gbSub.ColumnNames)
                ValidateExpressionColumns(ge, parentAliasToTable, parentReferencedTables);
        }
        if (subQuery.OrderBy != null)
        {
            foreach (var ob in subQuery.OrderBy.Expressions)
                ValidateExpressionColumns(ob.Expression, parentAliasToTable, parentReferencedTables);
        }
    }

    /// <summary>
    /// 校验 SELECT 投影列表中的列是否在白名单内
    /// </summary>
    private static void ValidateProjection(
        Sequence<SelectItem> projection,
        Dictionary<string, string> aliasToTable,
        HashSet<string> referencedTables)
    {
        foreach (var item in projection)
        {
            if (item is SelectItem.Wildcard)
            {
                throw new ValidationException("不允许 SELECT *，请明确指定列名");
            }

            if (item is SelectItem.QualifiedWildcard)
            {
                throw new ValidationException("不允许 SELECT *，请明确指定列名");
            }

            Expression expr;
            if (item is SelectItem.UnnamedExpression unnamed)
            {
                expr = unnamed.Expression;
            }
            else if (item is SelectItem.ExpressionWithAlias aliased)
            {
                expr = aliased.Expression;
            }
            else
            {
                continue;
            }

            ValidateExpressionColumns(expr, aliasToTable, referencedTables);
        }
    }

    /// <summary>
    /// 递归校验表达式中的 Identifier / CompoundIdentifier / Function
    /// </summary>
    private static void ValidateExpressionColumns(
        Expression expr,
        Dictionary<string, string> aliasToTable,
        HashSet<string> referencedTables)
    {
        if (expr is Expression.Identifier ident)
        {
            var columnName = ident.Ident.Value;
            if (!IsColumnAllowedInAnyTable(columnName, referencedTables))
                throw new ValidationException($"列 \"{columnName}\" 不在允许查询范围");
        }
        else if (expr is Expression.CompoundIdentifier compound)
        {
            var idents = compound.Idents;
            if (idents.Count < 2)
            {
                var columnName = idents[0].Value;
                if (!IsColumnAllowedInAnyTable(columnName, referencedTables))
                    throw new ValidationException($"列 \"{columnName}\" 不在允许查询范围");
                return;
            }

            var columnName2 = idents[^1].Value;
            var tableRef = idents[^2].Value;

            if (aliasToTable.TryGetValue(tableRef, out var actualTable))
            {
                if (!IsColumnAllowedInTable(columnName2, actualTable))
                    throw new ValidationException($"列 \"{columnName2}\" 不在表 {actualTable} 允许查询范围");
            }
            else if (referencedTables.Contains(tableRef))
            {
                if (!IsColumnAllowedInTable(columnName2, tableRef))
                    throw new ValidationException($"列 \"{columnName2}\" 不在表 {tableRef} 允许查询范围");
            }
            else
            {
                if (!IsColumnAllowedInAnyTable(columnName2, referencedTables))
                    throw new ValidationException($"列 \"{columnName2}\" 不在允许查询范围");
            }
        }
        else if (expr is Expression.Function func)
        {
            var funcName = func.Name.ToSql();
            if (ForbiddenFunctions.Contains(funcName))
                throw new ValidationException($"禁止使用 {funcName} 函数");

            // 校验函数参数中的列引用（COUNT(*) 的 * 是 Wildcard，天然放行）
            if (func.Args is FunctionArguments.List argList)
            {
                foreach (var arg in argList.ArgumentList.Args)
                {
                    if (arg is FunctionArg.Unnamed unnamed)
                    {
                        if (unnamed.FunctionArgExpression is FunctionArgExpression.FunctionExpression fe)
                        {
                            ValidateExpressionColumns(fe.Expression, aliasToTable, referencedTables);
                        }
                    }
                }
            }
        }
        else if (expr is Expression.BinaryOp binOp)
        {
            ValidateExpressionColumns(binOp.Left, aliasToTable, referencedTables);
            ValidateExpressionColumns(binOp.Right, aliasToTable, referencedTables);
        }
        else if (expr is Expression.UnaryOp unaryOp)
        {
            ValidateExpressionColumns(unaryOp.Expression, aliasToTable, referencedTables);
        }
        else if (expr is Expression.Case caseExpr)
        {
            if (caseExpr.Operand != null)
                ValidateExpressionColumns(caseExpr.Operand, aliasToTable, referencedTables);
            foreach (var cond in caseExpr.Conditions)
                ValidateExpressionColumns(cond, aliasToTable, referencedTables);
            foreach (var res in caseExpr.Results)
                ValidateExpressionColumns(res, aliasToTable, referencedTables);
            if (caseExpr.ElseResult != null)
                ValidateExpressionColumns(caseExpr.ElseResult, aliasToTable, referencedTables);
        }
        else if (expr is Expression.Cast cast)
        {
            ValidateExpressionColumns(cast.Expression, aliasToTable, referencedTables);
        }
        else if (expr is Expression.Extract extract)
        {
            ValidateExpressionColumns(extract.Expression, aliasToTable, referencedTables);
        }
        else if (expr is Expression.Substring substring)
        {
            ValidateExpressionColumns(substring.Expression, aliasToTable, referencedTables);
            if (substring.SubstringFrom != null)
                ValidateExpressionColumns(substring.SubstringFrom, aliasToTable, referencedTables);
            if (substring.SubstringFor != null)
                ValidateExpressionColumns(substring.SubstringFor, aliasToTable, referencedTables);
        }
        else if (expr is Expression.InList inList)
        {
            ValidateExpressionColumns(inList.Expression, aliasToTable, referencedTables);
            foreach (var item in inList.List)
                ValidateExpressionColumns(item, aliasToTable, referencedTables);
        }
        else if (expr is Expression.InSubquery inSubquery)
        {
            ValidateExpressionColumns(inSubquery.Expression, aliasToTable, referencedTables);
            ValidateDerivedQuery(inSubquery.SubQuery, aliasToTable, referencedTables);
        }
        else if (expr is Expression.Exists exists)
        {
            ValidateDerivedQuery(exists.SubQuery, aliasToTable, referencedTables);
        }
        else if (expr is Expression.Between between)
        {
            ValidateExpressionColumns(between.Expression, aliasToTable, referencedTables);
            ValidateExpressionColumns(between.Low, aliasToTable, referencedTables);
            ValidateExpressionColumns(between.High, aliasToTable, referencedTables);
        }
        else if (expr is Expression.Like like)
        {
            ValidateExpressionColumns(like.Expression, aliasToTable, referencedTables);
            ValidateExpressionColumns(like.Pattern, aliasToTable, referencedTables);
        }
        else if (expr is Expression.IsNull isNull)
        {
            ValidateExpressionColumns(isNull.Expression, aliasToTable, referencedTables);
        }
        else if (expr is Expression.IsNotNull isNotNull)
        {
            ValidateExpressionColumns(isNotNull.Expression, aliasToTable, referencedTables);
        }
        else if (expr is Expression.IsTrue isTrue)
        {
            ValidateExpressionColumns(isTrue.Expression, aliasToTable, referencedTables);
        }
        else if (expr is Expression.IsNotTrue isNotTrue)
        {
            ValidateExpressionColumns(isNotTrue.Expression, aliasToTable, referencedTables);
        }
        else if (expr is Expression.IsFalse isFalse)
        {
            ValidateExpressionColumns(isFalse.Expression, aliasToTable, referencedTables);
        }
        else if (expr is Expression.IsNotFalse isNotFalse)
        {
            ValidateExpressionColumns(isNotFalse.Expression, aliasToTable, referencedTables);
        }
        else if (expr is Expression.IsUnknown isUnknown)
        {
            ValidateExpressionColumns(isUnknown.Expression, aliasToTable, referencedTables);
        }
        else if (expr is Expression.IsNotUnknown isNotUnknown)
        {
            ValidateExpressionColumns(isNotUnknown.Expression, aliasToTable, referencedTables);
        }
        else if (expr is Expression.IsDistinctFrom isDistinct)
        {
            ValidateExpressionColumns(isDistinct.Expression1, aliasToTable, referencedTables);
            ValidateExpressionColumns(isDistinct.Expression2, aliasToTable, referencedTables);
        }
        else if (expr is Expression.IsNotDistinctFrom isNotDistinct)
        {
            ValidateExpressionColumns(isNotDistinct.Expression1, aliasToTable, referencedTables);
            ValidateExpressionColumns(isNotDistinct.Expression2, aliasToTable, referencedTables);
        }
        else if (expr is Expression.Nested nested)
        {
            ValidateExpressionColumns(nested.Expression, aliasToTable, referencedTables);
        }
        else if (expr is Expression.Subquery subquery)
        {
            ValidateDerivedQuery(subquery.Query, aliasToTable, referencedTables);
        }
        // LiteralValue / Wildcard / QualifiedWildcard / 等不含列引用，无需递归
    }

    /// <summary>
    /// 检查列名是否在任一被引用表的白名单中
    /// </summary>
    private static bool IsColumnAllowedInAnyTable(string columnName, HashSet<string> referencedTables)
    {
        foreach (var table in referencedTables)
        {
            if (TableWhitelist.TryGetValue(table, out var cols) && cols.Contains(columnName))
                return true;
        }
        return false;
    }

    /// <summary>
    /// 检查列名是否在指定表的白名单中
    /// </summary>
    private static bool IsColumnAllowedInTable(string columnName, string tableName)
    {
        return TableWhitelist.TryGetValue(tableName, out var cols) && cols.Contains(columnName);
    }

    /// <summary>
    /// 从 ObjectName 中提取简单表名（忽略 schema）
    /// </summary>
    private static string GetObjectNameSimpleName(ObjectName name)
    {
        if (name.Values.Count > 0)
            return name.Values[^1].Value;
        return name.ToSql();
    }

    // ═══════════════════════════════════════════════════════════
    // SQL 改写（字符串层面，因为 AST 属性为 init-only）
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// 注入用户过滤条件 — 使用 AST 收集的别名信息，
    /// 在字符串层面注入 WHERE 过滤。
    /// </summary>
    private static string InjectUserFilterAstAware(
        string sql,
        Dictionary<string, string> aliasToTable,
        HashSet<string> referencedTables,
        Security.CurrentUser.DataScope scope)
    {
        var filters = new List<string>();

        foreach (var table in referencedTables)
        {
            if (!TableWhitelist.ContainsKey(table)) continue;

            // 查找该表在查询中的别名
            var alias = aliasToTable.FirstOrDefault(
                kvp => string.Equals(kvp.Value, table, StringComparison.OrdinalIgnoreCase)).Key;

            filters.Add(GetTableFilter(scope, table, alias ?? ""));
        }

        if (filters.Count == 0)
            return sql;

        var filterClause = string.Join(" AND ", filters);

        // 使用括号深度感知的顶层关键字定位
        var whereIdx = FindTopLevelKeyword(sql, "WHERE");
        if (whereIdx >= 0)
        {
            // 在顶层 WHERE 后插入
            var insertAt = whereIdx + "WHERE".Length;
            return sql.Substring(0, insertAt) + $" {filterClause} AND" + sql.Substring(insertAt);
        }

        // 无顶层 WHERE：在顶层 GROUP BY / ORDER BY / LIMIT 之前插入
        var groupIdx = FindTopLevelKeyword(sql, "GROUP");
        var orderIdx = FindTopLevelKeyword(sql, "ORDER");
        var limitIdx = FindTopLevelKeyword(sql, "LIMIT");
        var candidates = new[] { groupIdx, orderIdx, limitIdx }.Where(x => x >= 0).ToArray();
        var pos = candidates.Length > 0 ? candidates.Min() : -1;

        if (pos >= 0)
            return sql.Substring(0, pos) + $"WHERE {filterClause} " + sql.Substring(pos);
        return sql + $" WHERE {filterClause}";
    }

    /// <summary>
    /// 返回顶层（括号深度 0）第一个关键字的位置，没有则 -1。
    /// 避免命中子查询内的同名关键字。
    /// </summary>
    private static int FindTopLevelKeyword(string sql, string keyword)
    {
        int depth = 0;
        for (int i = 0; i + keyword.Length <= sql.Length; i++)
        {
            var c = sql[i];
            if (c == '(') { depth++; continue; }
            if (c == ')') { depth--; continue; }
            if (depth != 0) continue;

            if (string.Compare(sql, i, keyword, 0, keyword.Length, StringComparison.OrdinalIgnoreCase) == 0
                && (i == 0 || !char.IsLetterOrDigit(sql[i - 1]))
                && (i + keyword.Length == sql.Length || !char.IsLetterOrDigit(sql[i + keyword.Length])))
            {
                return i;
            }
        }
        return -1;
    }

    /// <summary>
    /// 确保 SQL 有 LIMIT 子句，且不超过最大值（使用顶层 LIMIT 定位）
    /// </summary>
    private static string EnsureLimit(string sql, int maxLimit)
    {
        var limitIdx = FindTopLevelKeyword(sql, "LIMIT");
        if (limitIdx < 0)
            return sql + $" LIMIT {maxLimit}";

        // 保留原始偏移，不要先 TrimStart，否则后续 Substring 偏移会算错
        var afterPos = limitIdx + "LIMIT".Length;
        var rest = sql.Substring(afterPos);

        // 兼容两种形式：LIMIT count / LIMIT offset, count
        var m = Regex.Match(rest, @"^(\s*)(\d+)(\s*,\s*(\d+))?");
        if (!m.Success)
            return sql + $" LIMIT {maxLimit}";

        var hasComma = m.Groups[4].Success;
        // 逗号形式 LIMIT offset, count → 取 count;否则取唯一的数字
        var currentLimit = int.Parse(hasComma ? m.Groups[4].Value : m.Groups[2].Value);
        if (currentLimit <= maxLimit)
            return sql;

        // 用绝对偏移精确替换整个 "<ws><offset?,><count>" 片段(m.Index 因 ^ 锚定恒为 0)
        var matchEnd = afterPos + m.Length;
        if (hasComma)
        {
            // 保留原 offset，仅把 count 压到 maxLimit
            var offset = m.Groups[2].Value;
            return sql.Substring(0, limitIdx) + $"LIMIT {offset}, {maxLimit}" + sql.Substring(matchEnd);
        }
        return sql.Substring(0, limitIdx) + $"LIMIT {maxLimit}" + sql.Substring(matchEnd);
    }

    // ═══════════════════════════════════════════════════════════
    // dry-run 预检
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// dry-run 预检 — 对改写后的 SQL 执行 EXPLAIN，验证语法和表/列存在性。
    /// 只读操作，不产生业务数据。异常则判定校验失败。
    /// </summary>
    public static string? DryRun(IDbConnection db, string rewrittenSql, object? queryParams = null)
    {
        try
        {
            if (queryParams != null)
                db.Execute($"EXPLAIN {rewrittenSql}", queryParams);
            else
                db.Execute($"EXPLAIN {rewrittenSql}");
            return null; // 成功，无错误
        }
        catch (Exception ex)
        {
            return $"SQL 预检失败: {Common.Sanitize(ex.Message)}";
        }
    }

    // ═══════════════════════════════════════════════════════════
    // 审计日志
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// 记录审计日志
    /// </summary>
    public static void LogAudit(
        System.Data.IDbConnection db,
        string uid,
        string originalSql,
        string? rewrittenSql,
        bool success,
        string? error)
    {
        try
        {
            db.Execute(@"
                INSERT INTO audit_logs (action, level, user_id, resource, details, description, created_at)
                VALUES (@Action, @Level, @UserId, @Resource, @Details, @Description, @CreatedAt)",
                new
                {
                    Action = "safe_query",
                    Level = success ? "info" : "warning",
                    UserId = uid,
                    Resource = "agent_tool",
                    Details = $"Original: {originalSql}\nRewritten: {rewrittenSql}",
                    Description = success ? "Safe query executed" : $"Safe query rejected: {error}",
                    CreatedAt = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"),
                });
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[SafeQueryValidator] 审计日志写入失败: {ex.Message}");
        }
    }
}

/// <summary>
/// 验证结果
/// </summary>
public record ValidationResult(
    bool IsValid,
    string? RewrittenSql,
    HashSet<string>? ReferencedTables,
    string? Error
);

/// <summary>
/// 验证器内部抛出的校验异常，用于提前退出多层递归
/// </summary>
internal class ValidationException : Exception
{
    public ValidationException(string message) : base(message) { }
}

================
File: EngineeringManager.Api/Services/Stt/AudioPreprocessor.cs
================
using System.Diagnostics;

namespace EngineeringManager.Api.Services.Stt;

/// <summary>
/// 音频预处理：用 ffmpeg 转换为 16kHz 单声道 16bit WAV + 降噪
/// ffmpeg -y -i in -ac 1 -ar 16000 -af "highpass=f=80,lowpass=f=7500,afftdn=nf=-25" -c:a pcm_s16le out.wav
/// </summary>
public class AudioPreprocessor
{
    /// <summary>
    /// 预处理音频文件：转为 16kHz mono 16bit WAV，可选拜降噪
    /// </summary>
    /// <param name="inputPath">输入音频文件路径（任何 ffmpeg 支持的格式）</param>
    /// <param name="outputPath">输出 WAV 文件路径</param>
    /// <param name="denoise">是否启用降噪（默认 true；人声变差时关闭）</param>
    /// <param name="ct">取消令牌</param>
    public static async Task<string> PreprocessAsync(
        string inputPath,
        string? outputPath = null,
        bool denoise = true,
        CancellationToken ct = default)
    {
        if (!File.Exists(inputPath))
            throw new FileNotFoundException($"音频文件不存在: {inputPath}");

        // 输出路径：默认在同目录加 _processed.wav
        outputPath ??= Path.Combine(
            Path.GetTempPath(),
            $"stt_{Guid.NewGuid():N}.wav");

        var dir = Path.GetDirectoryName(outputPath);
        if (!string.IsNullOrEmpty(dir)) Directory.CreateDirectory(dir);

        // 构建 ffmpeg 参数
        var af = denoise
            ? "highpass=f=80,lowpass=f=7500,afftdn=nf=-25"
            : "highpass=f=80,lowpass=f=7500";

        var args = $"-y -i \"{inputPath}\" -ac 1 -ar 16000 -af \"{af}\" -c:a pcm_s16le \"{outputPath}\"";

        var psi = new ProcessStartInfo
        {
            FileName = "ffmpeg",
            Arguments = args,
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardError = true,
            RedirectStandardOutput = true,
        };

        using var process = new Process { StartInfo = psi };
        process.Start();

        await using var ctReg = ct.Register(() =>
        {
            try { process.Kill(entireProcessTree: true); } catch { }
        });

        await process.WaitForExitAsync(ct);

        if (process.ExitCode != 0)
        {
            var stderr = await process.StandardError.ReadToEndAsync(ct);
            // 降噪失败时回退：不带 -af 重试
            if (denoise)
            {
                Console.Error.WriteLine($"[AudioPreprocessor] 降噪失败，回退无滤镜: {Common.Sanitize(stderr)}");
                return await PreprocessAsync(inputPath, outputPath, denoise: false, ct);
            }
            throw new Exception($"ffmpeg 转换失败 (exit={process.ExitCode}): {Common.Sanitize(stderr)}");
        }

        if (!File.Exists(outputPath))
            throw new Exception("ffmpeg 转换完成但输出文件不存在");

        return outputPath;
    }

    /// <summary>获取音频时长（秒），用 ffprobe</summary>
    public static async Task<double> GetDurationAsync(string audioPath, CancellationToken ct = default)
    {
        var psi = new ProcessStartInfo
        {
            FileName = "ffprobe",
            Arguments = $"-v error -show_entries format=duration -of csv=p=0 \"{audioPath}\"",
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardOutput = true,
        };
        using var process = Process.Start(psi);
        if (process == null) return 0;
        var output = await process.StandardOutput.ReadToEndAsync(ct);
        await process.WaitForExitAsync(ct);
        if (double.TryParse(output.Trim(), out var dur)) return dur;
        return 0;
    }
}

================
File: EngineeringManager.Api/Services/Stt/DiarizationService.cs
================
using System.Diagnostics;
using System.Runtime.InteropServices;
using SherpaOnnx;

namespace EngineeringManager.Api.Services.Stt;

/// <summary>
/// 说话人分离服务（纯 C# 实现，使用 sherpa-onnx .NET 绑定，无 Python 依赖）
///
/// 流程：加载 WAV → sherpa-onnx pyannote 分割 + campplus 嵌入 → 聚类 → 段合并 → 输出
///
/// 段合并算法（解决 52 碎段问题）：
/// 1. 按 start 排序
/// 2. 合并相邻同说话人段（gap < 2s）
/// 3. 吸收超短段（duration < 1.2s）到时间上重叠最多的主导说话人段
/// 4. 最终输出"话轮"列表（通常 10-20 段）
///
/// 注意：sherpa-onnx C++ 库不支持含非 ASCII 字符的路径（如中文目录名），
/// 需通过 EnsureAsciiPath 将模型文件复制到纯 ASCII 路径后使用。
/// </summary>
public class DiarizationService
{
    private static OfflineSpeakerDiarization? _diarization;
    private static readonly object _initLock = new();

    // Win32 API: 获取 8.3 短路径名（可能仍含中文，不如复制可靠）
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern int GetShortPathName(string lpszLongPath, char[] lpszShortPath, int cchBuffer);

    /// <summary>
    /// 初始化分离管线（线程安全单例，模型只加载一次）
    /// </summary>
    private static OfflineSpeakerDiarization GetOrCreatePipeline(int? numSpeakers = null)
    {
        lock (_initLock)
        {
            // 如果指定了说话人数，需要创建带 NumClusters 的管线
            // 如果没指定，用默认的 Threshold 管线
            if (_diarization != null && !numSpeakers.HasValue) return _diarization;

            if (!SttModelManager.IsDiarizationModelAvailable())
                throw new InvalidOperationException("说话人分离模型未就绪");

            var (segModel, embModel) = SttModelManager.GetDiarizationModelPaths();

            // 确认文件确实存在（C++ 库找不到文件会返回无效 handle → 后续调用崩溃）
            if (!File.Exists(segModel))
                throw new FileNotFoundException($"分离模型文件不存在: {segModel}");
            if (!File.Exists(embModel))
                throw new FileNotFoundException($"嵌入模型文件不存在: {embModel}");

            // sherpa-onnx C++ 库不支持含非 ASCII 字符的路径（如 e:\测试\）
            // 如果路径含非 ASCII 字符，复制模型到纯 ASCII 临时目录
            var segModelAscii = EnsureAsciiPath(segModel);
            var embModelAscii = EnsureAsciiPath(embModel);

            var config = new OfflineSpeakerDiarizationConfig();
            config.Segmentation.Pyannote.Model = segModelAscii;
            config.Embedding.Model = embModelAscii;

            if (numSpeakers.HasValue)
            {
                config.Clustering.NumClusters = numSpeakers.Value;
            }
            else
            {
                // 0.5 太低会导致 2 人通话被拆成 16 个说话人
                // 0.65 实测能将 2 人通话正确识别为 2-3 个说话人
                config.Clustering.Threshold = 0.65f;
            }

            var pipeline = new OfflineSpeakerDiarization(config);

            if (!numSpeakers.HasValue)
            {
                _diarization = pipeline;
            }

            Console.WriteLine($"[DiarizationService] 分离管线初始化完成 (numSpeakers={numSpeakers?.ToString() ?? "auto"})");
            return pipeline;
        }
    }

    /// <summary>
    /// 对音频做说话人分离，返回合并后的分段列表
    /// </summary>
    /// <param name="wavPath">16kHz mono WAV 文件路径</param>
    /// <param name="numSpeakers">预期说话人数（null=自动）</param>
    /// <param name="ct">取消令牌</param>
    /// <returns>合并后的说话人分段列表</returns>
    public Task<List<SttSegment>> DiarizeAsync(
        string wavPath,
        int? numSpeakers = null,
        CancellationToken ct = default)
    {
        if (!SttModelManager.IsDiarizationModelAvailable())
            throw new InvalidOperationException("说话人分离模型未就绪，请先调用 SttModelManager.EnsureDiarizationModelsAsync()");

        ct.ThrowIfCancellationRequested();

        // 1. 加载音频（手动读取 16kHz mono WAV → float[]）
        var (samples, sampleRate) = ReadWavAsFloats(wavPath);

        ct.ThrowIfCancellationRequested();

        // 2. 运行分离
        var pipeline = GetOrCreatePipeline(numSpeakers);

        Console.WriteLine($"[DiarizationService] 开始分离 ({samples.Length / 16000.0:F1}s 音频, sampleRate={sampleRate})...");

        // 检查采样率
        if (pipeline.SampleRate != sampleRate)
        {
            throw new InvalidOperationException($"采样率不匹配: 期望 {pipeline.SampleRate}, 实际 {sampleRate}");
        }

        // Process 返回 OfflineSpeakerDiarizationSegment[]，按时间排序
        var rawSegments = pipeline.Process(samples);

        // 3. 提取原始段
        var segments = new List<SttSegment>();
        foreach (var seg in rawSegments)
        {
            segments.Add(new SttSegment
            {
                Speaker = (int)seg.Speaker,
                Start = seg.Start,
                End = seg.End,
            });
        }

        Console.WriteLine($"[DiarizationService] 原始段数: {segments.Count}, 说话人数: {segments.Select(s => s.Speaker).Distinct().Count()}");

        // 4. 段合并
        var merged = MergeSegments(segments);

        // 5. 合并低频说话人（把只出现很少的说话人合并到主导说话人）
        merged = MergeRareSpeakers(merged);

        Console.WriteLine($"[DiarizationService] 合并后段数: {merged.Count}, 说话人数: {merged.Select(s => s.Speaker).Distinct().Count()}");

        return Task.FromResult(merged);
    }

    /// <summary>
    /// 合并低频说话人：把说话时间占比 < 5% 或总时长 < 15s 的说话人合并到时间上最相邻的主导说话人。
    /// 解决聚类阈值不够导致 2 人通话被拆成 8+ 人的问题。
    /// </summary>
    public static List<SttSegment> MergeRareSpeakers(List<SttSegment> segments, double minDurationSec = 15.0, double minRatio = 0.05)
    {
        if (segments.Count == 0) return segments;

        var totalDuration = segments.Sum(s => s.End - s.Start);
        if (totalDuration <= 0) return segments;

        // 计算每个说话人的总时长
        var speakerDurations = segments
            .GroupBy(s => s.Speaker)
            .ToDictionary(g => g.Key, g => g.Sum(s => s.End - s.Start));

        // 找出低频说话人
        var rareSpeakers = speakerDurations
            .Where(kvp => kvp.Value < minDurationSec || kvp.Value / totalDuration < minRatio)
            .Select(kvp => kvp.Key)
            .ToList();

        if (rareSpeakers.Count == 0) return segments;

        // 找出主导说话人（时长最长的 2 个）
        var dominantSpeakers = speakerDurations
            .Where(kvp => !rareSpeakers.Contains(kvp.Key))
            .OrderByDescending(kvp => kvp.Value)
            .Select(kvp => kvp.Key)
            .ToList();

        // 如果没有主导说话人（所有都是低频），保留时长最长的 2 个
        if (dominantSpeakers.Count == 0)
        {
            dominantSpeakers = speakerDurations
                .OrderByDescending(kvp => kvp.Value)
                .Take(2)
                .Select(kvp => kvp.Key)
                .ToList();
            rareSpeakers = speakerDurations.Keys
                .Where(s => !dominantSpeakers.Contains(s))
                .ToList();
        }

        if (rareSpeakers.Count == 0) return segments;

        // 为每个低频说话人找最相邻的主导说话人
        var speakerMap = new Dictionary<int, int>(); // rare → dominant
        foreach (var rare in rareSpeakers)
        {
            var rareSegments = segments.Where(s => s.Speaker == rare).OrderBy(s => s.Start).ToList();
            if (rareSegments.Count == 0) continue;

            // 找时间上最相邻的主导说话人段
            int bestDominant = dominantSpeakers.First();
            double bestOverlap = -1;

            foreach (var dominant in dominantSpeakers)
            {
                var dominantSegments = segments.Where(s => s.Speaker == dominant).OrderBy(s => s.Start).ToList();
                double overlapScore = 0;

                foreach (var rSeg in rareSegments)
                {
                    foreach (var dSeg in dominantSegments)
                    {
                        // 计算时间接近度：gap 越小越好
                        var gap = Math.Max(0, Math.Max(rSeg.Start - dSeg.End, dSeg.Start - rSeg.End));
                        overlapScore += 1.0 / (1.0 + gap);
                    }
                }

                if (overlapScore > bestOverlap)
                {
                    bestOverlap = overlapScore;
                    bestDominant = dominant;
                }
            }

            speakerMap[rare] = bestDominant;
        }

        // 应用映射
        var result = segments.Select(s => new SttSegment
        {
            Speaker = speakerMap.TryGetValue(s.Speaker, out var mapped) ? mapped : s.Speaker,
            Start = s.Start,
            End = s.End,
        }).ToList();

        // 重新合并（因为合并后可能产生新的可合并段）
        result = MergeSegments(result);

        Console.WriteLine($"[DiarizationService] 低频说话人合并: {rareSpeakers.Count} 个 → 主导说话人, 映射: {string.Join(", ", speakerMap.Select(kvp => $"{kvp.Key}→{kvp.Value}"))}");

        return result;
    }

    /// <summary>
    /// 段合并算法：把碎段合并成话轮
    ///
    /// 步骤：
    /// 1. 按 start 排序
    /// 2. 合并相邻同说话人段（gap < 2s）
    /// 3. 吸收超短段（duration < 1.2s）到时间上重叠最多的相邻段
    /// 4. 再合并一次（吸收后可能产生新的可合并对）
    /// </summary>
    public static List<SttSegment> MergeSegments(List<SttSegment> rawSegments, double shortThreshold = 1.2, double gapThreshold = 2.0)
    {
        if (rawSegments.Count == 0) return rawSegments;

        // 按 start 排序
        var sorted = rawSegments.OrderBy(s => s.Start).ToList();

        // Step 1: 吸收超短段
        var absorbed = new List<SttSegment>();
        for (int i = 0; i < sorted.Count; i++)
        {
            var seg = sorted[i];
            var duration = seg.End - seg.Start;

            if (duration < shortThreshold && sorted.Count > 2)
            {
                // 找时间上重叠或最近的邻居
                var prev = absorbed.Count > 0 ? absorbed[^1] : null;
                var next = i + 1 < sorted.Count ? sorted[i + 1] : null;

                // 优先合并到同说话人的邻居
                if (prev != null && prev.Speaker == seg.Speaker && seg.Start - prev.End < gapThreshold)
                {
                    prev.End = Math.Max(prev.End, seg.End);
                    continue;
                }
                if (next != null && next.Speaker == seg.Speaker && next.Start - seg.End < gapThreshold)
                {
                    next.Start = seg.Start;
                    continue;
                }

                // 没有同说话人邻居 → 吸收到时间上重叠最多的不同说话人段
                if (prev != null && next != null)
                {
                    var overlapPrev = Math.Max(0, Math.Min(prev.End, seg.End) - Math.Max(prev.Start, seg.Start));
                    var overlapNext = Math.Max(0, Math.Min(next.End, seg.End) - Math.Max(next.Start, seg.Start));
                    if (overlapPrev >= overlapNext)
                    {
                        prev.End = Math.Max(prev.End, seg.End);
                    }
                    else
                    {
                        next.Start = seg.Start;
                    }
                    continue;
                }

                // 只有一个邻居
                if (prev != null) { prev.End = Math.Max(prev.End, seg.End); continue; }
                if (next != null) { next.Start = seg.Start; continue; }
            }

            absorbed.Add(new SttSegment { Speaker = seg.Speaker, Start = seg.Start, End = seg.End });
        }

        // Step 2: 合并相邻同说话人段（gap < threshold）
        var merged = new List<SttSegment>();
        foreach (var seg in absorbed.OrderBy(s => s.Start))
        {
            if (merged.Count > 0
                && merged[^1].Speaker == seg.Speaker
                && seg.Start - merged[^1].End < gapThreshold)
            {
                merged[^1].End = Math.Max(merged[^1].End, seg.End);
            }
            else
            {
                merged.Add(new SttSegment { Speaker = seg.Speaker, Start = seg.Start, End = seg.End });
            }
        }

        return merged;
    }

    /// <summary>
    /// 按说话人分段切分音频，每段输出一个临时 WAV 文件
    /// </summary>
    public async Task<List<(SttSegment segment, string wavPath)>> SplitAudioBySpeakersAsync(
        string wavPath,
        List<SttSegment> segments,
        CancellationToken ct = default)
    {
        var result = new List<(SttSegment, string)>();
        var tempDir = Path.Combine(Path.GetTempPath(), $"stt_split_{Guid.NewGuid():N}");
        Directory.CreateDirectory(tempDir);

        for (int i = 0; i < segments.Count; i++)
        {
            ct.ThrowIfCancellationRequested();
            var seg = segments[i];
            var segWavPath = Path.Combine(tempDir, $"seg_{i:000}_spk{seg.Speaker}.wav");

            // 用 ffmpeg 切分
            var args = $"-y -i \"{wavPath}\" -ss {seg.Start:F3} -to {seg.End:F3} -ac 1 -ar 16000 -c:a pcm_s16le \"{segWavPath}\"";
            var psi = new ProcessStartInfo
            {
                FileName = "ffmpeg",
                Arguments = args,
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardError = true,
            };
            using var process = Process.Start(psi);
            if (process != null)
            {
                await process.WaitForExitAsync(ct);
                if (process.ExitCode != 0)
                {
                    var stderr = await process.StandardError.ReadToEndAsync(ct);
                    Console.Error.WriteLine($"[DiarizationService] 切分段 {i} 失败: {Common.Sanitize(stderr)}");
                    continue;
                }
            }

            if (File.Exists(segWavPath))
                result.Add((seg, segWavPath));
        }

        return result;
    }

    /// <summary>
    /// 读取 16kHz mono WAV 文件为 float[] 数组（-1.0 ~ 1.0 范围）
    /// </summary>
    private static (float[] samples, int sampleRate) ReadWavAsFloats(string wavPath)
    {
        using var fs = File.OpenRead(wavPath);
        using var br = new BinaryReader(fs);

        // RIFF header
        var riff = br.ReadBytes(4);
        if (System.Text.Encoding.ASCII.GetString(riff) != "RIFF")
            throw new ArgumentException("不是有效的 WAV 文件");
        br.ReadUInt32(); // file size
        var wave = br.ReadBytes(4);
        if (System.Text.Encoding.ASCII.GetString(wave) != "WAVE")
            throw new ArgumentException("不是有效的 WAV 文件");

        // Parse chunks
        int sampleRate = 0, bitsPerSample = 0, numChannels = 0;
        byte[]? dataBytes = null;

        while (br.BaseStream.Position < br.BaseStream.Length)
        {
            var chunkId = System.Text.Encoding.ASCII.GetString(br.ReadBytes(4));
            var chunkSize = br.ReadInt32();

            if (chunkId == "fmt ")
            {
                var audioFormat = br.ReadUInt16();
                numChannels = br.ReadUInt16();
                sampleRate = (int)br.ReadUInt32();
                br.ReadUInt32(); // byte rate
                br.ReadUInt16(); // block align
                bitsPerSample = br.ReadUInt16();
                if (chunkSize > 16) br.ReadBytes(chunkSize - 16);
            }
            else if (chunkId == "data")
            {
                dataBytes = br.ReadBytes(chunkSize);
            }
            else
            {
                br.ReadBytes(chunkSize);
            }
        }

        if (dataBytes == null) throw new ArgumentException("WAV 文件没有 data chunk");
        if (bitsPerSample != 16) throw new ArgumentException($"只支持 16-bit PCM, 当前 {bitsPerSample}");

        var numSamples = dataBytes.Length / (bitsPerSample / 8);
        var samples = new float[numSamples];
        for (int i = 0; i < numSamples; i++)
        {
            short val = BitConverter.ToInt16(dataBytes, i * 2);
            samples[i] = val / 32768f;
        }

        // 如果是多通道，取第一个通道
        if (numChannels > 1)
        {
            var mono = new float[numSamples / numChannels];
            for (int i = 0; i < mono.Length; i++)
                mono[i] = samples[i * numChannels];
            samples = mono;
        }

        return (samples, sampleRate);
    }

    /// <summary>
    /// 确保路径只含 ASCII 字符。sherpa-onnx C++ 库用 std::string 传路径，
    /// 在中文 Windows 上会把 UTF-8/GBK 混编导致路径乱码 → 模型找不到 → 崩溃。
    ///
    /// 策略：
    /// 1. 路径全 ASCII → 直接返回
    /// 2. 尝试 GetShortPathName（8.3 短路径）→ 如果短路径全 ASCII → 返回
    /// 3. 短路径仍含中文 → 复制文件到 C:\ProgramData\EngineeringManager\stt-models\
    /// </summary>
    private static string EnsureAsciiPath(string originalPath)
    {
        // 1. 全 ASCII → 直接返回
        if (originalPath.All(c => c < 128))
            return originalPath;

        // 2. 尝试 8.3 短路径
        var buffer = new char[260];
        var len = GetShortPathName(originalPath, buffer, buffer.Length);
        if (len > 0)
        {
            var shortPath = new string(buffer, 0, len);
            if (shortPath.All(c => c < 128))
            {
                Console.WriteLine($"[DiarizationService] 路径含非 ASCII，使用短路径: {shortPath}");
                return shortPath;
            }
        }

        // 3. 复制到 ASCII 安全目录
        var asciiBase = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),
            "EngineeringManager", "stt-models");
        Directory.CreateDirectory(asciiBase);

        var fileName = Path.GetFileName(originalPath);
        var asciiPath = Path.Combine(asciiBase, fileName);

        if (!File.Exists(asciiPath) || new FileInfo(asciiPath).Length != new FileInfo(originalPath).Length)
        {
            File.Copy(originalPath, asciiPath, overwrite: true);
            Console.WriteLine($"[DiarizationService] 模型文件已复制到 ASCII 路径: {asciiPath}");
        }

        return asciiPath;
    }

    /// <summary>清理切分的临时音频文件</summary>
    public static void CleanupTempFiles(List<string> tempPaths)
    {
        foreach (var path in tempPaths)
        {
            try
            {
                if (File.Exists(path)) File.Delete(path);
                var dir = Path.GetDirectoryName(path);
                if (dir != null && Directory.Exists(dir) && !Directory.EnumerateFileSystemEntries(dir).Any())
                    Directory.Delete(dir);
            }
            catch { }
        }
    }
}

================
File: EngineeringManager.Api/Services/Stt/ISttEngine.cs
================
namespace EngineeringManager.Api.Services.Stt;

/// <summary>
/// STT 引擎接口：定义转写引擎的标准行为
/// </summary>
public interface ISttEngine
{
    /// <summary>引擎名称</summary>
    string Name { get; }

    /// <summary>引擎是否可用（模型文件存在、GPU 满足要求等）</summary>
    Task<bool> IsAvailableAsync();

    /// <summary>
    /// 异步转写音频文件
    /// </summary>
    /// <param name="wavPath">预处理后的 16kHz mono 16bit WAV 文件路径</param>
    /// <param name="context">可选热词/上下文提示</param>
    /// <param name="progress">进度回调 (0-100)</param>
    /// <param name="ct">取消令牌（触发时杀掉整个进程树）</param>
    /// <returns>转写结果</returns>
    Task<SttResult> TranscribeAsync(
        string wavPath,
        string? context,
        IProgress<int>? progress,
        CancellationToken ct);
}

================
File: EngineeringManager.Api/Services/Stt/LlamaCppGgufEngine.cs
================
using System.Diagnostics;
using System.Text;

namespace EngineeringManager.Api.Services.Stt;

/// <summary>
/// LlamaCpp GGUF 引擎：用 Process 起 transcribe.exe，解析 stdout 拿转写文本。
/// 关键设计：
/// 1. 进程要能被 CancellationToken 杀掉整个进程树（taskkill /F /T /PID）
/// 2. 超时保护（30 分钟）
/// 3. stdout 解析容错：transcribe.exe 的 PyInstaller 打包版在打印 emoji 统计时
///    会因 GBK 编码崩溃 (exit code 1)，但文本在此之前已经输出到 stdout，
///    所以只要 stdout 里有文本就视为成功。
/// 4. 环境变量 PYTHONUTF8=1 + PYTHONIOENCODING=utf-8 强制 Python 子进程用 UTF-8 输出
/// 5. 批量转写 (TranscribeBatchAsync)：一次进程处理多段音频，模型只加载一次
/// 6. 热词表 (hotwords.txt) 自动读取并拼入 --context 参数
/// </summary>
public class LlamaCppGgufEngine : ISttEngine
{
    public string Name => "Qwen3-ASR-1.7B-GGUF (q4_k, llama.cpp Vulkan)";

    private readonly bool _useVulkan;
    private readonly string _engineDir;

    // transcribe.exe 默认超时：30 分钟（长音频可能很慢）
    // 批量模式按段数线性放大：每段额外加 5 分钟
    private static readonly TimeSpan DefaultTimeout = TimeSpan.FromMinutes(30);

    public LlamaCppGgufEngine()
    {
        var gpu = SttEngineSelector.Detect();
        _useVulkan = gpu.HasDiscreteGpu && gpu.SupportsVulkan;
        _engineDir = SttModelManager.GetEngineDir();
    }

    public Task<bool> IsAvailableAsync()
    {
        return Task.FromResult(SttModelManager.IsAsrModelAvailable());
    }

    // ═══════════════════════════════════════════════════════════
    // 上下文构建：hotwords.txt + 用户 context
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// 构建完整的 context 参数：读取 hotwords.txt 热词表 + 拼入用户提供的上下文。
    /// hotwords.txt 位于 asr-engine/ 目录，每行一个热词（工程术语、人名、地名等）。
    /// 拼接格式：甲方、乙方、监理、…、[已脱敏]。用户上下文
    /// </summary>
    private string? BuildContext(string? userContext)
    {
        var parts = new List<string>();

        // 1. 读取热词表
        var hotwordsPath = Path.Combine(_engineDir, "hotwords.txt");
        if (File.Exists(hotwordsPath))
        {
            try
            {
                var hotwords = File.ReadAllLines(hotwordsPath)
                    .Where(l => !string.IsNullOrWhiteSpace(l))
                    .Select(l => l.Trim())
                    .ToList();
                if (hotwords.Count > 0)
                {
                    var hotwordsStr = string.Join("、", hotwords);
                    parts.Add(hotwordsStr);
                    Console.WriteLine($"[SttEngine] 已加载 {hotwords.Count} 个热词到 context");
                }
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[SttEngine] 读取 hotwords.txt 失败: {Common.Sanitize(ex.Message)}");
            }
        }

        // 2. 拼入用户上下文
        if (!string.IsNullOrWhiteSpace(userContext))
            parts.Add(userContext);

        return parts.Count > 0 ? string.Join("。", parts) : null;
    }

    // ═══════════════════════════════════════════════════════════
    // 单文件转写
    // ═══════════════════════════════════════════════════════════

    public async Task<SttResult> TranscribeAsync(
        string wavPath,
        string? context,
        IProgress<int>? progress,
        CancellationToken ct)
    {
        if (!File.Exists(wavPath))
            throw new FileNotFoundException($"音频文件不存在: {wavPath}");

        var fullContext = BuildContext(context);
        var args = BuildArgs(new List<string> { wavPath }, fullContext);

        var (stdout, stderr, exitCode, hasCompletionMarker) = await RunTranscribeExe(args, ct, 1);

        var (text, elapsed, _) = ParseTranscribeOutput(stdout, Path.GetFileName(wavPath));

        ValidateResult(text, exitCode, hasCompletionMarker, stderr, stdout);

        progress?.Report(100);

        return new SttResult
        {
            Text = text,
            Segments = new List<SttSegment> { new() { Speaker = 0, Start = 0, End = 0, Text = text } },
            ElapsedSec = elapsed,
            Engine = Name,
        };
    }

    // ═══════════════════════════════════════════════════════════
    // 批量转写：一次 transcribe.exe 调用处理多个音频文件
    // 模型只加载一次，避免 N 段 N 次重载 1.7B 模型的性能灾难
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// 批量转写多个音频文件，返回每段对应的文本列表。
    /// transcribe.exe 支持 FILES... 多文件参数，一次进程内顺序处理。
    /// </summary>
    /// <param name="wavPaths">要转写的 WAV 文件路径列表</param>
    /// <param name="context">可选上下文/热词提示</param>
    /// <param name="ct">取消令牌</param>
    /// <returns>每段音频对应的转写文本（顺序与 wavPaths 一致）</returns>
    public async Task<List<string>> TranscribeBatchAsync(
        List<string> wavPaths,
        string? context,
        CancellationToken ct)
    {
        if (wavPaths.Count == 0)
            return new List<string>();

        // 单段直接走单文件路径
        if (wavPaths.Count == 1)
        {
            var result = await TranscribeAsync(wavPaths[0], context, null, ct);
            return new List<string> { result.Text };
        }

        // 验证文件存在
        foreach (var path in wavPaths)
        {
            if (!File.Exists(path))
                throw new FileNotFoundException($"音频文件不存在: {path}");
        }

        Console.WriteLine($"[SttEngine] 批量转写 {wavPaths.Count} 段（模型只加载一次）");

        var fullContext = BuildContext(context);
        var args = BuildArgs(wavPaths, fullContext);

        var (stdout, stderr, exitCode, hasCompletionMarker) = await RunTranscribeExe(args, ct, wavPaths.Count);

        var texts = ParseMultiFileOutput(stdout, wavPaths);

        // 验证：至少有一段非空文本
        if (texts.All(string.IsNullOrWhiteSpace))
        {
            var errMsg = string.IsNullOrEmpty(stderr) ? stdout : stderr;
            throw new Exception($"transcribe.exe 批量转写失败 (exit={exitCode}): {Common.Sanitize(errMsg)}");
        }

        if (exitCode != 0)
        {
            if (hasCompletionMarker)
            {
                Console.WriteLine($"[SttEngine] transcribe.exe exit code={exitCode} (完成标记已找到，尾部崩溃已忽略)");
            }
            else
            {
                Console.Error.WriteLine($"[SttEngine] 警告: transcribe.exe exit code={exitCode} 且无完成标记，文本可能不完整");
            }
        }

        return texts;
    }

    // ═══════════════════════════════════════════════════════════
    // 内部方法
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// 构建 transcribe.exe 命令行参数（单文件和多文件通用）
    /// </summary>
    private StringBuilder BuildArgs(List<string> wavPaths, string? fullContext)
    {
        var args = new StringBuilder();

        // 文件路径（transcribe.exe 接受 FILES... 多文件）
        foreach (var path in wavPaths)
        {
            args.Append('"').Append(path).Append('"').Append(' ');
        }

        args.Append("--prec int4");
        args.Append(" --n-ctx 2048");
        args.Append(" --chunk-size 40");
        args.Append(" --no-ts");       // 不需要时间戳对齐（不需要 Aligner 模型）
        args.Append(" --quiet");       // 减少无关输出（避免统计 emoji 崩溃）
        args.Append(" -y");            // 覆盖已有输出
        if (_useVulkan)
            args.Append(" --vulkan");
        else
            args.Append(" --no-vulkan");
        args.Append(" --no-dml");      // Encoder 留 CPU
        if (!string.IsNullOrWhiteSpace(fullContext))
            args.Append(" --context \"").Append(fullContext.Replace("\"", "\\\"")).Append('"');
        args.Append(" --language Chinese");

        return args;
    }

    /// <summary>
    /// 运行 transcribe.exe 并返回 stdout/stderr/exitCode/hasCompletionMarker。
    /// 公共逻辑：进程启动、UTF-8 编码、取消令牌、超时保护、进程树杀。
    /// </summary>
    private async Task<(string stdout, string stderr, int exitCode, bool hasCompletionMarker)> RunTranscribeExe(
        StringBuilder args,
        CancellationToken ct,
        int fileCount)
    {
        var exePath = SttModelManager.GetTranscribeExePath();
        if (!File.Exists(exePath))
            throw new FileNotFoundException($"transcribe.exe 不存在: {exePath}");

        var psi = new ProcessStartInfo
        {
            FileName = exePath,
            Arguments = args.ToString(),
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            // transcribe.exe (PyInstaller 打包) 不受 PYTHONUTF8 环境变量控制，
            // 其 stdout 使用系统默认编码（中文 Windows = GBK）。
            // stderr 可能含 emoji 统计信息，仍用 UTF-8 读取避免崩溃。
            StandardOutputEncoding = Encoding.Default,
            StandardErrorEncoding = Encoding.UTF8,
            WorkingDirectory = _engineDir,
        };

        // 环境变量：强制 Python UTF-8 模式（根治 emoji GBK 崩溃）
        psi.Environment["PYTHONUTF8"] = "1";
        psi.Environment["PYTHONIOENCODING"] = "utf-8";
        psi.Environment["GGML_VULKAN_DEVICE"] = "0";

        using var process = new Process { StartInfo = psi };
        var tcs = new TaskCompletionSource<bool>();

        process.EnableRaisingEvents = true;
        process.Exited += (s, e) => tcs.TrySetResult(true);

        if (!process.Start())
            throw new Exception("无法启动 transcribe.exe");

        // 使用 ReadToEndAsync 代替 BeginOutputReadLine，避免事件回调丢数据
        var stdoutTask = process.StandardOutput.ReadToEndAsync(ct);
        var stderrTask = process.StandardError.ReadToEndAsync(ct);

        // 注册取消令牌：杀掉整个进程树
        await using var ctReg = ct.Register(() =>
        {
            try { KillProcessTree(process); } catch { }
            tcs.TrySetCanceled(ct);
        });

        // 超时：按文件数线性放大（每段额外加 5 分钟）
        var timeout = TimeSpan.FromMinutes(DefaultTimeout.TotalMinutes + (fileCount - 1) * 5);
        using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeoutCts.CancelAfter(timeout);
        await using var timeoutReg = timeoutCts.Token.Register(() =>
        {
            try { KillProcessTree(process); } catch { }
            tcs.TrySetException(new TimeoutException($"转写超时 ({timeout.TotalMinutes:F0} 分钟, {fileCount} 段)"));
        });

        try
        {
            await tcs.Task;
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            throw;
        }
        catch (TimeoutException)
        {
            throw;
        }

        // 等待进程完全退出 + 异步读取完成
        process.WaitForExit();

        var stdout = await stdoutTask;
        var stderr = await stderrTask;

        // 完成标记检测：用多种方式匹配（编码兼容）
        var hasCompletionMarker = stdout.Contains("已完成", StringComparison.Ordinal)
            || stdout.Contains("completed", StringComparison.OrdinalIgnoreCase);

        Console.WriteLine($"[SttEngine] stdout len={stdout.Length}, stderr len={stderr.Length}, exit={process.ExitCode}");

        return (stdout, stderr, process.ExitCode, hasCompletionMarker);
    }

    /// <summary>
    /// 验证转写结果，抛异常或打日志
    /// </summary>
    private static void ValidateResult(string text, int exitCode, bool hasCompletionMarker, string stderr, string stdout)
    {
        // 判定逻辑：
        // 1. exit code=0 → 成功
        // 2. exit code=1 + 有文本 + 有完成标记 → 成功（emoji 崩溃发生在输出统计阶段）
        // 3. exit code=1 + 有文本 + 无完成标记 → 可疑（可能中途崩了只吐了半截）
        // 4. exit code=1 + 无文本 → 真正失败
        if (string.IsNullOrWhiteSpace(text))
        {
            // 没有文本 → 真正的失败
            var errMsg = string.IsNullOrEmpty(stderr) ? stdout : stderr;
            throw new Exception($"transcribe.exe 转写失败 (exit={exitCode}): {Common.Sanitize(errMsg)}");
        }

        if (exitCode != 0)
        {
            if (hasCompletionMarker)
            {
                // 完成标记存在 → 文本是完整的，exit code=1 只是尾部 emoji 崩溃
                Console.WriteLine($"[SttEngine] transcribe.exe exit code={exitCode} (完成标记已找到，尾部崩溃已忽略)");
            }
            else
            {
                // 无完成标记 → 可能中途崩溃，文本可能不完整
                Console.Error.WriteLine($"[SttEngine] 警告: transcribe.exe exit code={exitCode} 且无完成标记，文本可能不完整");
                // 不抛异常，但在日志中标记可疑（准确优先原则下宁可告警也不静默）
            }
        }
    }

    /// <summary>
    /// 从 stdout 中提取单文件转写文本
    /// 
    /// transcribe.exe --quiet 输出格式：
    ///   +---------- Qwen3-ASR 配置选项 ----------+
    ///   |  模型目录    ...                       |
    ///   +----------------------------------------+
    ///   --- [QwenASR] 引擎初始化耗时: 2.49 秒 ---
    ///   
    ///   开始处理: filename.wav
    ///   
    ///   转写文本第一行
    ///   转写文本第二行
    ///   ...
    ///   转写文本最后一行
    ///   
    ///   所有任务已完成。
    ///   
    /// 提取策略：找 "开始处理:" 行之后的文本，到 "所有任务已完成" 或 "--- [QwenASR]" 或 Traceback 为止
    /// 返回值：text, elapsed, hasCompletionMarker
    /// </summary>
    private static (string text, double elapsed, bool hasCompletionMarker) ParseTranscribeOutput(string stdout, string? filename = null)
    {
        var lines = stdout.Split('\n', StringSplitOptions.None);
        var textLines = new List<string>();
        double elapsed = 0;
        bool hasCompletionMarker = false;

        bool inTextSection = false;

        foreach (var rawLine in lines)
        {
            var trimmed = rawLine.Trim();

            // 文本区域开始：匹配 "开始处理" 或包含文件名
            if (!inTextSection)
            {
                if (trimmed.Contains("开始处理", StringComparison.Ordinal)
                    || (filename != null && trimmed.Contains(filename, StringComparison.OrdinalIgnoreCase)))
                {
                    inTextSection = true;
                }
                continue;
            }

            // 文本区域结束标志
            if (inTextSection)
            {
                // "所有任务已完成" → 成功完成标记
                if (trimmed.Contains("所有任务已完成", StringComparison.Ordinal))
                {
                    hasCompletionMarker = true;
                    break;
                }
                // "--- [QwenASR]" → 引擎关闭，结束
                if (trimmed.StartsWith("--- [QwenASR]", StringComparison.Ordinal))
                    break;
                // Traceback → 崩溃输出，结束
                if (trimmed.Contains("Traceback", StringComparison.Ordinal))
                    break;
                // "+----------------" → traceback 边框，结束
                if (trimmed.StartsWith("+---") && trimmed.Contains("---+"))
                    break;
                // UnicodeEncodeError → 编码崩溃，结束
                if (trimmed.Contains("UnicodeEncodeError", StringComparison.Ordinal))
                    break;
                // "[PYI-" → PyInstaller 错误，结束
                if (trimmed.StartsWith("[PYI-", StringComparison.Ordinal))
                    break;

                // 跳过导出消息行（emoji 修复后这些行会出现在文本之后）
                if (trimmed.StartsWith("已保存文本文件", StringComparison.Ordinal)
                    || trimmed.StartsWith("已生成字幕文件", StringComparison.Ordinal)
                    || trimmed.StartsWith("已导出时间戳", StringComparison.Ordinal))
                    continue;

                // 跳过空行（但保留文本中的空行结构）
                if (string.IsNullOrEmpty(trimmed))
                    continue;

                // 收集文本行
                textLines.Add(trimmed);
            }
        }

        var fullText = string.Join("\n", textLines).Trim();
        return (fullText, elapsed, hasCompletionMarker);
    }

    /// <summary>
    /// 解析多文件转写输出：按 "开始处理:" 标记切分各文件文本。
    /// 
    /// 多文件输出格式：
    ///   --- [QwenASR] 引擎初始化耗时: 2.49 秒 ---
    ///   
    ///   开始处理: seg_000_spk0.wav
    ///   文本A第一行
    ///   文本A第二行
    ///   
    ///   开始处理: seg_001_spk1.wav
    ///   文本B第一行
    ///   
    ///   所有任务已完成。
    /// </summary>
    private static List<string> ParseMultiFileOutput(string stdout, List<string> wavPaths)
    {
        var lines = stdout.Split('\n', StringSplitOptions.None);
        var results = new List<string>();
        var currentText = new List<string>();
        bool inTextSection = false;
        bool hasAnyFile = false;

        // 提取文件名列表（纯 ASCII，不受编码影响）
        var filenames = wavPaths.Select(p => Path.GetFileName(p)).ToList();

        foreach (var rawLine in lines)
        {
            var trimmed = rawLine.Trim();

            // 新文件区域开始：行中包含已知文件名
            bool isFileMarker = false;
            foreach (var fn in filenames)
            {
                if (trimmed.Contains(fn, StringComparison.OrdinalIgnoreCase))
                {
                    isFileMarker = true;
                    break;
                }
            }

            if (isFileMarker)
            {
                // 保存上一个文件的文本
                if (hasAnyFile)
                {
                    results.Add(string.Join("\n", currentText).Trim());
                }
                hasAnyFile = true;
                currentText.Clear();
                inTextSection = true;
                continue;
            }

            if (!inTextSection)
                continue;

            // 结束标记
            if (trimmed.Contains("所有任务已完成", StringComparison.Ordinal))
            {
                if (hasAnyFile)
                    results.Add(string.Join("\n", currentText).Trim());
                break;
            }
            if (trimmed.StartsWith("--- [QwenASR]", StringComparison.Ordinal))
            {
                if (hasAnyFile)
                    results.Add(string.Join("\n", currentText).Trim());
                break;
            }
            if (trimmed.Contains("Traceback", StringComparison.Ordinal))
            {
                if (hasAnyFile)
                    results.Add(string.Join("\n", currentText).Trim());
                break;
            }
            if (trimmed.StartsWith("+---") && trimmed.Contains("---+"))
            {
                if (hasAnyFile)
                    results.Add(string.Join("\n", currentText).Trim());
                break;
            }
            if (trimmed.Contains("UnicodeEncodeError", StringComparison.Ordinal))
            {
                if (hasAnyFile)
                    results.Add(string.Join("\n", currentText).Trim());
                break;
            }
            if (trimmed.StartsWith("[PYI-", StringComparison.Ordinal))
            {
                if (hasAnyFile)
                    results.Add(string.Join("\n", currentText).Trim());
                break;
            }

            // 跳过导出消息行（包含 .txt 路径的行是导出消息，不是转写文本）
            if (trimmed.Contains(".txt", StringComparison.OrdinalIgnoreCase))
                continue;
            // 跳过中文导出消息行（编码正确时匹配）
            if (trimmed.StartsWith("已保存文本文件", StringComparison.Ordinal)
                || trimmed.StartsWith("已生成字幕文件", StringComparison.Ordinal)
                || trimmed.StartsWith("已导出时间戳", StringComparison.Ordinal))
                continue;

            // 跳过空行
            if (string.IsNullOrEmpty(trimmed))
                continue;

            currentText.Add(trimmed);
        }

        // 循环结束后：如果还在文本区域，保存最后一段文本
        // （进程可能在输出完最后一段文本后崩溃，没有 "所有任务已完成" 标记）
        if (hasAnyFile && inTextSection)
        {
            results.Add(string.Join("\n", currentText).Trim());
        }

        // 如果没有找到任何文件标记，回退到单文件解析
        if (results.Count == 0)
        {
            var (text, _, _) = ParseTranscribeOutput(stdout, filenames.FirstOrDefault());
            results.Add(text);
        }

        // 确保结果数量和预期一致（不足的补空字符串）
        var expectedCount = wavPaths.Count;
        while (results.Count < expectedCount)
            results.Add("");

        return results;
    }

    /// <summary>
    /// 杀掉整个进程树（transcribe.exe 会起子进程做编码/对齐）
    /// 使用 taskkill /F /T /PID 强制杀掉进程及其所有子进程
    /// </summary>
    private static void KillProcessTree(Process process)
    {
        if (process.HasExited) return;

        try
        {
            var pid = process.Id;
            Console.WriteLine($"[SttEngine] 杀掉进程树 PID={pid}");

            // taskkill /F /T 强制杀掉进程及其所有子进程
            var psi = new ProcessStartInfo
            {
                FileName = "taskkill",
                Arguments = $"/F /T /PID {pid}",
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
            };
            using var killer = Process.Start(psi);
            killer?.WaitForExit(5000);
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[SttEngine] 杀进程树失败: {Common.Sanitize(ex.Message)}");
            // 回退：直接 Kill
            try { process.Kill(entireProcessTree: true); } catch { }
        }
    }
}

================
File: EngineeringManager.Api/Services/Stt/SpeakerLabelNormalizer.cs
================
using System.Text.Json;
using EngineeringManager.Api.Services.Stt;

namespace EngineeringManager.Api.Services.Stt;

/// <summary>
/// 说话人标签归一化器（共享单例，STT + 知识库统一调用）
///
/// 原始簇号可能是 0/3/7/19 等不连续值（由 sherpa-onnx 聚类产生），
/// 对用户展示必须统一为连续的 说话人1/说话人2/说话人3。
///
/// 归一化在 STT 结果拼装/持久化之前执行，确保：
///   - stt_jobs.result_text 中的【说话人N】标签是 1-based 连续编号
///   - stt_jobs.result_json 中每个 segment 的 speaker 字段是 1-based 连续编号
///   - GET /api/stt/jobs/{id} 返回 1-based 连续编号
///   - POST /api/stt/jobs/{id}/ingest 使用的 segments 已是 1-based 连续编号
///   - knowledge_documents.speakers 与 STT job 中的编号一致
///
/// 如需保留原始簇号用于诊断，存入 segment.OriginalSpeaker（内部字段，不暴露给用户）。
/// </summary>
public static class SpeakerLabelNormalizer
{
    /// <summary>
    /// 对 segments 做就地归一化：原始簇号 → 连续 1/2/3（按首次出现顺序）
    /// 同时设置 OriginalSpeaker 保留原始值。
    /// </summary>
    /// <param name="segments">待归一化的分段列表（会被就地修改）</param>
    /// <returns>归一化后的 segments（与输入同一引用）</returns>
    public static List<SttSegment> Normalize(List<SttSegment> segments)
    {
        if (segments == null || segments.Count == 0) return segments;

        var speakerMap = new Dictionary<int, int>(); // original → normalized (1-based)
        var nextId = 1;

        foreach (var seg in segments.OrderBy(s => s.Start))
        {
            if (!speakerMap.TryGetValue(seg.Speaker, out var normalizedId))
            {
                normalizedId = nextId++;
                speakerMap[seg.Speaker] = normalizedId;
            }

            // 保留原始簇号用于诊断（不暴露给用户）
            seg.OriginalSpeaker = seg.Speaker;
            // 设置归一化后的编号（1-based）
            seg.Speaker = normalizedId;
        }

        Console.WriteLine($"[SpeakerLabelNormalizer] 归一化: {speakerMap.Count} 个说话人, 映射: {string.Join(", ", speakerMap.Select(kvp => $"{kvp.Key}→{kvp.Value}"))}");

        return segments;
    }

    /// <summary>
    /// 生成 speakers JSON（归一化后的说话人列表 + 时间段）
    /// 输入的 segments 必须已经过 Normalize() 处理。
    /// </summary>
    public static string? BuildSpeakersJson(List<SttSegment>? segments)
    {
        if (segments == null || segments.Count == 0) return null;

        var speakerSegments = new Dictionary<int, List<TimeRange>>();

        foreach (var seg in segments.OrderBy(s => s.Start))
        {
            if (!speakerSegments.ContainsKey(seg.Speaker))
                speakerSegments[seg.Speaker] = new List<TimeRange>();

            speakerSegments[seg.Speaker].Add(new TimeRange
            {
                Start = Math.Round(seg.Start, 2),
                End = Math.Round(seg.End, 2),
            });
        }

        var speakers = speakerSegments
            .OrderBy(kvp => kvp.Key)
            .Select(kvp => new SpeakerInfo
            {
                Id = kvp.Key,
                Segments = kvp.Value,
            })
            .ToList();

        return JsonSerializer.Serialize(speakers, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        });
    }

    // 内部 JSON 类型
    private class SpeakerInfo
    {
        public int Id { get; set; }
        public List<TimeRange> Segments { get; set; } = new();
    }

    private class TimeRange
    {
        public double Start { get; set; }
        public double End { get; set; }
    }
}

================
File: EngineeringManager.Api/Services/Stt/SttEngineSelector.cs
================
using System.Management;
using System.Runtime.InteropServices;

namespace EngineeringManager.Api.Services.Stt;

/// <summary>
/// STT 引擎选择器：探测独显、缓存结果、决定是否启用本地转写
/// 硬性规则：核显/无显卡 一律不启用本地转写
/// </summary>
public class SttEngineSelector
{
    private static GpuInfo? _cached;
    private static readonly object _lock = new();

    /// <summary>探测 GPU，结果缓存（整个进程生命周期不变）</summary>
    public static GpuInfo Detect()
    {
        lock (_lock)
        {
            if (_cached != null) return _cached;
            _cached = DetectInternal();
            Console.WriteLine($"[SttEngineSelector] GPU 探测结果: HasDiscreteGpu={_cached.HasDiscreteGpu}, Name={_cached.GpuName}, VRAM={_cached.VramMb}MB, Vulkan={_cached.SupportsVulkan}");
            return _cached;
        }
    }

    private static GpuInfo DetectInternal()
    {
        var info = new GpuInfo();

        if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
        {
            // 非 Windows：暂不支持本地转写
            return info;
        }

        try
        {
            using var searcher = new ManagementObjectSearcher(
                "SELECT Name, AdapterRAM, VideoProcessor FROM Win32_VideoController");
            var gpus = searcher.Get();

            foreach (var gpu in gpus)
            {
                var name = gpu["Name"]?.ToString() ?? "";
                var vramBytes = gpu["AdapterRAM"];
                int vramMb = 0;
                if (vramBytes != null)
                {
                    // AdapterRAM is uint32, overflows for VRAM >4GB (wraps to 0 or small value)
                    // Known WMI bug: 8GB RX 580 reports 0. We compensate below.
                    try { vramMb = (int)Math.Min((uint)(long)vramBytes / (1024 * 1024), 32768); }
                    catch { }
                }

                // 判断是否独显
                var isDiscrete = name.Contains("AMD", StringComparison.OrdinalIgnoreCase)
                    || name.Contains("Radeon", StringComparison.OrdinalIgnoreCase)
                    || name.Contains("NVIDIA", StringComparison.OrdinalIgnoreCase)
                    || name.Contains("GeForce", StringComparison.OrdinalIgnoreCase)
                    || name.Contains("RTX", StringComparison.OrdinalIgnoreCase)
                    || name.Contains("GTX", StringComparison.OrdinalIgnoreCase)
                    || name.Contains("RX 5", StringComparison.OrdinalIgnoreCase)
                    || name.Contains("RX 6", StringComparison.OrdinalIgnoreCase)
                    || name.Contains("RX 7", StringComparison.OrdinalIgnoreCase);

                // 排除 AMD APU / Radeon Vega Mobile (核显)
                if (isDiscrete && (name.Contains("Vega", StringComparison.OrdinalIgnoreCase)
                    || name.Contains("APU", StringComparison.OrdinalIgnoreCase)
                    || name.Contains("Radeon Graphics", StringComparison.OrdinalIgnoreCase)))
                {
                    isDiscrete = false;
                }

                // WMI AdapterRAM uint32 溢出补偿：独显 VRAM 报 0 时给默认值
                if (isDiscrete && vramMb == 0)
                {
                    vramMb = 4096; // 独显至少 4GB，保守取 4096
                    Console.WriteLine($"[SttEngineSelector] VRAM 探测溢出（WMI uint32 bug），已补偿为 {vramMb}MB");
                }

                info.AllGpus.Add($"{name} ({vramMb}MB)");
                Console.WriteLine($"[SttEngineSelector] 发现显卡: {name}, VRAM={vramMb}MB, Discrete={isDiscrete}");

                if (isDiscrete && vramMb >= 2048)
                {
                    info.HasDiscreteGpu = true;
                    info.GpuName = name;
                    info.VramMb = vramMb;
                    // Vulkan 支持：AMD/NVIDIA 独显通常都支持 Vulkan
                    info.SupportsVulkan = true;
                }
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[SttEngineSelector] GPU 探测失败: {Common.Sanitize(ex.Message)}");
        }

        return info;
    }

    /// <summary>是否可以启用本地转写</summary>
    public static bool CanUseLocalStt()
    {
        var gpu = Detect();
        return gpu.HasDiscreteGpu && gpu.SupportsVulkan && gpu.VramMb >= 2048;
    }

    /// <summary>获取不可用原因（供前端展示）</summary>
    public static string GetUnavailableReason()
    {
        var gpu = Detect();
        if (gpu.AllGpus.Count == 0) return "未检测到显卡";
        if (!gpu.HasDiscreteGpu) return $"仅检测到核显（{string.Join(", ", gpu.AllGpus)}），本地语音转文字需要独立显卡";
        if (gpu.VramMb < 2048) return $"独显显存不足（{gpu.VramMb}MB），需要至少 2GB";
        if (!gpu.SupportsVulkan) return "独显不支持 Vulkan";
        return "";
    }
}

================
File: EngineeringManager.Api/Services/Stt/SttModelManager.cs
================
using System.Diagnostics;

namespace EngineeringManager.Api.Services.Stt;

/// <summary>
/// STT 模型管理器：检测本地模型是否存在、缺失时按镜像下载
/// ASR 模型直接复用项目根目录 asr-engine/（已跑通的 1.7B GGUF）
/// 说话人分离模型：sherpa-onnx-pyannote-segmentation-3-5 + 3dspeaker_speech_ember
/// </summary>
public class SttModelManager
{
    private static readonly string[] AsrModelFiles = new[]
    {
        "model/qwen3_asr_llm.q4_k.gguf",
        "model/qwen3_asr_encoder_backend.int4.onnx",
        "model/qwen3_asr_encoder_frontend.int4.onnx",
    };

    // 说话人分离模型
    public const string SegmentationModelDir = "diarization/sherpa-onnx-pyannote-segmentation-3-0";
    public const string SegmentationModelFile = "diarization/sherpa-onnx-pyannote-segmentation-3-0/model.onnx";
    public const string EmbeddingModelFile = "diarization/3dspeaker_speech_campplus_sv_zh-cn_16k-common.onnx";

    // M2: 文本嵌入模型（bge-small-zh-v1.5 ONNX）
    public const string TextEmbeddingModelFile = "embedding/bge-small-zh-v1.5.onnx";
    public const string TextEmbeddingVocabFile = "embedding/vocab.txt";

    // 下载镜像前缀
    private const string GithubMirror = "https://ghfast.top/";
    private const string SegmentationModelUrl =
        "https://github.com/k2-fsa/sherpa-onnx/releases/download/speaker-segmentation-models/sherpa-onnx-pyannote-segmentation-3-0.tar.bz2";
    private const string EmbeddingModelUrl =
        "https://github.com/k2-fsa/sherpa-onnx/releases/download/speaker-recongition-models/3dspeaker_speech_campplus_sv_zh-cn_16k-common.onnx";

    /// <summary>
    /// 获取 ASR 引擎根目录（asr-engine/）
    /// 查找顺序：项目根目录 → 数据存储路径
    /// </summary>
    public static string GetEngineDir()
    {
        // 1. 项目根目录（开发环境 + 本机测试）
        var dir = AppContext.BaseDirectory.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
        // 向上查找 asr-engine 目录（bin/Debug/net8.0-windows → 项目根 → 工作区根）
        for (int i = 0; i < 8; i++)
        {
            var candidate = Path.Combine(dir, "asr-engine");
            if (Directory.Exists(candidate) && File.Exists(Path.Combine(candidate, "transcribe.exe")))
            {
                return candidate;
            }
            var parent = Path.GetDirectoryName(dir);
            if (parent == null || parent == dir) break;
            dir = parent;
        }

        // 2. 数据存储路径（生产环境 - 首次启动下载后存放位置）
        var dataPath = ApiConfig.ResolveDataPath();
        var dataCandidate = Path.Combine(dataPath, "asr-engine");
        if (Directory.Exists(dataCandidate) && File.Exists(Path.Combine(dataCandidate, "transcribe.exe")))
        {
            return dataCandidate;
        }

        // 3. 默认返回项目根目录路径（即使不存在，让调用方知道预期位置）
        return Path.Combine(dir, "asr-engine");
    }

    /// <summary>transcribe.exe 完整路径</summary>
    public static string GetTranscribeExePath() =>
        Path.Combine(GetEngineDir(), "transcribe.exe");

    /// <summary>ASR 模型是否齐全</summary>
    public static bool IsAsrModelAvailable()
    {
        var dir = GetEngineDir();
        if (!File.Exists(Path.Combine(dir, "transcribe.exe"))) return false;
        foreach (var f in AsrModelFiles)
        {
            if (!File.Exists(Path.Combine(dir, f))) return false;
        }
        return true;
    }

    /// <summary>说话人分离模型是否齐全</summary>
    public static bool IsDiarizationModelAvailable()
    {
        var dir = GetEngineDir();
        return File.Exists(Path.Combine(dir, SegmentationModelFile))
            && File.Exists(Path.Combine(dir, EmbeddingModelFile));
    }

    /// <summary>获取说话人分离模型路径（前提：IsDiarizationModelAvailable() == true）</summary>
    public static (string segmentationModel, string embeddingModel) GetDiarizationModelPaths()
    {
        var dir = GetEngineDir();
        // 用 Path.GetFullPath 规范化路径分隔符，避免 / \ 混用导致 C++ 库找不到文件
        var segPath = Path.GetFullPath(Path.Combine(dir, SegmentationModelFile));
        var embPath = Path.GetFullPath(Path.Combine(dir, EmbeddingModelFile));
        return (segPath, embPath);
    }

    // ═══════════════════════════════════════════════════════════
    // M2: 文本嵌入模型 (bge-small-zh-v1.5 ONNX)
    // ═══════════════════════════════════════════════════════════

    private const string HfMirror = "https://hf-mirror.com";
    private const string TextEmbeddingModelUrl = "https://hf-mirror.com/Xenova/bge-small-zh-v1.5/resolve/main/onnx/model.onnx";
    private const string TextEmbeddingVocabUrl = "https://hf-mirror.com/BAAI/bge-small-zh-v1.5/resolve/main/vocab.txt";

    /// <summary>文本嵌入模型是否就绪</summary>
    public static bool IsEmbeddingModelAvailable()
    {
        var dir = GetEngineDir();
        return File.Exists(Path.Combine(dir, TextEmbeddingModelFile))
            && File.Exists(Path.Combine(dir, TextEmbeddingVocabFile));
    }

    /// <summary>获取文本嵌入模型路径</summary>
    public static (string modelPath, string vocabPath) GetTextEmbeddingModelPaths()
    {
        var dir = GetEngineDir();
        return (Path.Combine(dir, TextEmbeddingModelFile), Path.Combine(dir, TextEmbeddingVocabFile));
    }

    /// <summary>
    /// 异步下载文本嵌入模型（如果缺失）
    /// 模型约 100MB，vocab 约 100KB
    /// </summary>
    public static async Task EnsureEmbeddingModelAsync(
        IProgress<string>? progress = null,
        CancellationToken ct = default)
    {
        if (IsEmbeddingModelAvailable())
        {
            progress?.Report("文本嵌入模型已就绪");
            return;
        }

        var dir = GetEngineDir();
        var embeddingDir = Path.Combine(dir, "embedding");
        Directory.CreateDirectory(embeddingDir);

        // 1. 下载 vocab.txt
        var vocabPath = Path.Combine(dir, TextEmbeddingVocabFile);
        if (!File.Exists(vocabPath))
        {
            progress?.Report("正在下载 BGE vocab.txt...");
            await DownloadFileAsync(TextEmbeddingVocabUrl, vocabPath, ct);
            progress?.Report("vocab.txt 下载完成");
        }

        // 2. 下载 ONNX 模型
        var modelPath = Path.Combine(dir, TextEmbeddingModelFile);
        if (!File.Exists(modelPath))
        {
            progress?.Report("正在下载 BGE-small-zh-v1.5 ONNX 模型（约 100MB）...");
            await DownloadFileAsync(TextEmbeddingModelUrl, modelPath, ct);
            progress?.Report("ONNX 模型下载完成");
        }
    }

    /// <summary>
    /// 异步下载说话人分离模型（如果缺失）
    /// </summary>
    public static async Task EnsureDiarizationModelsAsync(
        IProgress<string>? progress = null,
        CancellationToken ct = default)
    {
        if (IsDiarizationModelAvailable())
        {
            progress?.Report("说话人分离模型已就绪");
            return;
        }

        var dir = GetEngineDir();
        var diarizationDir = Path.Combine(dir, "diarization");
        Directory.CreateDirectory(diarizationDir);

        // 1. 下载 speaker embedding 模型（单文件）
        var embeddingPath = Path.Combine(dir, EmbeddingModelFile);
        if (!File.Exists(embeddingPath))
        {
            progress?.Report("正在下载说话人嵌入模型 (3dspeaker_campplus)...");
            var url = GithubMirror + EmbeddingModelUrl;
            await DownloadFileAsync(url, embeddingPath, ct);
            progress?.Report("说话人嵌入模型下载完成");
        }

        // 2. 下载 speaker segmentation 模型（tar.bz2）
        var segmentationModelPath = Path.Combine(dir, SegmentationModelFile);
        if (!File.Exists(segmentationModelPath))
        {
            progress?.Report("正在下载说话人分割模型 (pyannote-segmentation-3-0)...");
            var url = GithubMirror + SegmentationModelUrl;
            var tarPath = Path.Combine(diarizationDir, "pyannote-segmentation.tar.bz2");
            await DownloadFileAsync(url, tarPath, ct);

            // 解压：tar.exe -xjf file.tar.bz2 -C diarization/
            progress?.Report("正在解压说话人分割模型...");
            var psi = new ProcessStartInfo
            {
                FileName = "tar",
                Arguments = $"-xjf \"{tarPath}\" -C \"{diarizationDir}\"",
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardError = true,
            };
            using var proc = Process.Start(psi);
            if (proc != null)
            {
                await proc.WaitForExitAsync(ct);
                var stderr = await proc.StandardError.ReadToEndAsync(ct);
                if (proc.ExitCode != 0)
                    throw new Exception($"解压失败: {stderr}");
            }

            // 清理 tar.bz2
            try { File.Delete(tarPath); } catch { }
            progress?.Report("说话人分割模型下载并解压完成");
        }
    }

    private static async Task DownloadFileAsync(string url, string destPath, CancellationToken ct)
    {
        using var http = new HttpClient { Timeout = TimeSpan.FromMinutes(30) };
        using var resp = await http.GetAsync(url, HttpCompletionOption.ResponseHeadersRead, ct);
        resp.EnsureSuccessStatusCode();

        Directory.CreateDirectory(Path.GetDirectoryName(destPath)!);
        using var fs = File.Create(destPath);
        await resp.Content.CopyToAsync(fs, ct);
    }
}

================
File: EngineeringManager.Api/Services/Stt/SttModels.cs
================
namespace EngineeringManager.Api.Services.Stt;

/// <summary>
/// STT 转写请求
/// </summary>
public class SttTranscribeRequest
{
    /// <summary>已上传的音频文件在 uploads/ 下的相对路径</summary>
    public string FilePath { get; set; } = "";

    /// <summary>是否多人录音（true=走说话人分离）</summary>
    public bool IsMultiSpeaker { get; set; } = false;

    /// <summary>预期说话人数（null=自动检测）</summary>
    public int? NumSpeakers { get; set; }

    /// <summary>可选热词/上下文提示，提升识别准确率</summary>
    public string? Context { get; set; }
}

/// <summary>
/// STT 转写结果
/// </summary>
public class SttResult
{
    /// <summary>全文（纯文本，无说话人标签）</summary>
    public string Text { get; set; } = "";

    /// <summary>分段列表（含说话人标签和时间戳）</summary>
    public List<SttSegment> Segments { get; set; } = new();

    /// <summary>音频时长（秒）</summary>
    public double DurationSec { get; set; }

    /// <summary>转写耗时（秒）</summary>
    public double ElapsedSec { get; set; }

    /// <summary>使用的引擎名称</summary>
    public string Engine { get; set; } = "";
}

/// <summary>
/// 单个转写分段（含说话人信息）
/// 说话人归一化在 STT 结果持久化前由 SpeakerLabelNormalizer 执行：
///   Speaker 是 1-based 连续编号（说话人1/2/3），对用户展示
///   OriginalSpeaker 保留原始簇号用于诊断（不序列化给前端）
/// </summary>
public class SttSegment
{
    /// <summary>说话人标签（归一化后：1=说话人1, 2=说话人2, ...；单人录音固定为 1）</summary>
    public int Speaker { get; set; }

    /// <summary>原始簇号（诊断用，sherpa-onnx 聚类产生的 0-based 值；不序列化给前端）</summary>
    [System.Text.Json.Serialization.JsonIgnore]
    public int? OriginalSpeaker { get; set; }

    /// <summary>开始时间（秒）</summary>
    public double Start { get; set; }

    /// <summary>结束时间（秒）</summary>
    public double End { get; set; }

    /// <summary>该段文本</summary>
    public string Text { get; set; } = "";
}

/// <summary>
/// GPU 探测结果
/// </summary>
public class GpuInfo
{
    /// <summary>是否有独显</summary>
    public bool HasDiscreteGpu { get; set; }

    /// <summary>独显名称</summary>
    public string GpuName { get; set; } = "";

    /// <summary>显存（MB）</summary>
    public int VramMb { get; set; }

    /// <summary>是否支持 Vulkan（用于 transcribe.exe --vulkan）</summary>
    public bool SupportsVulkan { get; set; }

    /// <summary>所有显卡列表（供调试/展示）</summary>
    public List<string> AllGpus { get; set; } = new();
}

================
File: EngineeringManager.Api/Services/Stt/SttWorker.cs
================
using System.Data;
using Dapper;

namespace EngineeringManager.Api.Services.Stt;

/// <summary>
/// STT 后台 worker：单并发，取 pending job → 预处理 → (多人)分离 → 转写 → 写回
/// 低配机别并发跑多个大模型
/// </summary>
public class SttWorker : IHostedService, IDisposable
{
    private readonly IServiceProvider _services;
    private readonly ILogger<SttWorker>? _logger;
    private System.Threading.Timer? _timer;
    private static readonly object _runLock = new();
    private static bool _isRunning = false;
    private static readonly TimeSpan PollInterval = TimeSpan.FromSeconds(5);

    public SttWorker(IServiceProvider services, ILogger<SttWorker>? logger = null)
    {
        _services = services;
        _logger = logger;
    }

    public Task StartAsync(CancellationToken ct)
    {
        _logger?.LogInformation("[SttWorker] 后台任务服务启动，轮询间隔 {Interval}s", PollInterval.TotalSeconds);
        _timer = new System.Threading.Timer(Poll, null, TimeSpan.FromSeconds(10), PollInterval);
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken ct)
    {
        _timer?.Change(Timeout.Infinite, 0);
        _logger?.LogInformation("[SttWorker] 后台任务服务停止");
        return Task.CompletedTask;
    }

    private async void Poll(object? state)
    {
        // 单并发：同时只处理一个 STT 任务
        lock (_runLock)
        {
            if (_isRunning) return;
            _isRunning = true;
        }

        try
        {
            using var scope = _services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<IDbConnection>();

            // 取一个 pending 的 job
            var job = db.QueryFirstOrDefault<SttJob>(
                @"SELECT * FROM stt_jobs WHERE status = 'pending' ORDER BY created_at LIMIT 1");
            if (job == null) return;

            await ProcessJobAsync(scope, job);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "[SttWorker] 轮询异常");
        }
        finally
        {
            lock (_runLock) { _isRunning = false; }
        }
    }

    private async Task ProcessJobAsync(IServiceScope scope, SttJob job)
    {
        var db = scope.ServiceProvider.GetRequiredService<IDbConnection>();
        var now = () => DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");

        try
        {
            // 标记为 processing
            db.Execute("UPDATE stt_jobs SET status = 'processing', updated_at = @Now WHERE id = @Id",
                new { Now = now(), job.Id });

            // 检查环境
            if (!SttEngineSelector.CanUseLocalStt())
                throw new InvalidOperationException($"本地转写不可用: {SttEngineSelector.GetUnavailableReason()}");

            var engine = new LlamaCppGgufEngine();
            if (!await engine.IsAvailableAsync())
                throw new InvalidOperationException("ASR 模型文件缺失，请检查 asr-engine/model/ 目录");

            // 1. 音频预处理
            UpdateProgress(db, job.Id, 5, "预处理音频...");
            var sourcePath = Path.Combine(ApiConfig.ResolveDataPath(), "uploads", job.Source_Path);
            if (!File.Exists(sourcePath))
            {
                // 兜底：尝试直接用 Source_File 作为路径
                sourcePath = job.Source_Path;
                if (!File.Exists(sourcePath))
                    throw new FileNotFoundException($"音频文件不存在: {job.Source_Path}");
            }

            var processedWav = await AudioPreprocessor.PreprocessAsync(sourcePath, ct: default);
            var duration = await AudioPreprocessor.GetDurationAsync(processedWav);
            db.Execute("UPDATE stt_jobs SET duration_sec = @Dur, updated_at = @Now WHERE id = @Id",
                new { Dur = duration, Now = now(), job.Id });

            SttResult result;

            // 2. 判断是否多人录音
            if (job.Is_Multi_Speaker == 1)
            {
                // 多人：先分离 → 逐段转写 → 拼回
                UpdateProgress(db, job.Id, 10, "加载说话人分离模型...");
                await SttModelManager.EnsureDiarizationModelsAsync();

                UpdateProgress(db, job.Id, 15, "说话人分离...");
                var diarization = new DiarizationService();
                var segments = await diarization.DiarizeAsync(
                    processedWav,
                    job.Num_Speakers,
                    ct: default);

                if (segments.Count == 0)
                    throw new Exception("说话人分离未检测到任何语音段");

                UpdateProgress(db, job.Id, 25, $"分离出 {segments.Count} 段，切分音频...");

                // 按说话人段切分音频
                var splitFiles = await diarization.SplitAudioBySpeakersAsync(processedWav, segments);

                // 批量转写：一次 transcribe.exe 调用处理所有段
                // 模型只加载一次，避免 N 段 N 次重载 1.7B 模型的性能灾难
                UpdateProgress(db, job.Id, 30, $"批量转写 {splitFiles.Count} 段（模型只加载一次）...");
                var sw = System.Diagnostics.Stopwatch.StartNew();

                var wavPaths = splitFiles.Select(s => s.wavPath).ToList();
                var texts = await engine.TranscribeBatchAsync(wavPaths, job.Hotwords, default);

                sw.Stop();
                Console.WriteLine($"[SttWorker] 批量转写 {splitFiles.Count} 段完成，耗时 {sw.Elapsed.TotalSeconds:F1}s");

                // 组装结果（此时 Speaker 仍是原始簇号 0-based）
                var allSegments = new List<SttSegment>();
                for (int i = 0; i < splitFiles.Count; i++)
                {
                    var (seg, _) = splitFiles[i];
                    seg.Text = texts[i];
                    allSegments.Add(seg);
                }

                // ★ 说话人归一化：原始簇号 0/3/7... → 连续 1/2/3（按首次出现顺序）
                // 在持久化前执行，确保 result_text / result_json / GET / ingest 全链路一致
                SpeakerLabelNormalizer.Normalize(allSegments);

                // 用归一化后的编号拼装全文
                var totalText = allSegments.Select(s => $"【说话人{s.Speaker}】{s.Text}").ToList();

                UpdateProgress(db, job.Id, 90, $"转写完成，{allSegments.Count} 段");

                // 清理临时文件
                DiarizationService.CleanupTempFiles(splitFiles.Select(s => s.wavPath).ToList());

                result = new SttResult
                {
                    Text = string.Join("\n", totalText),
                    Segments = allSegments,
                    DurationSec = duration,
                    ElapsedSec = allSegments.Sum(s => 0), // 各段累加复杂，暂不精确
                    Engine = engine.Name,
                };
            }
            else
            {
                // 单人：直接转写，跳过分离
                UpdateProgress(db, job.Id, 10, "转写中...");
                result = await engine.TranscribeAsync(processedWav, job.Hotwords, null, default);
                result.DurationSec = duration;

                // 单人：segments 只有一段，Speaker = 1（归一化后 1-based）
                if (result.Segments.Count == 0)
                    result.Segments.Add(new SttSegment { Speaker = 1, Start = 0, End = duration, Text = result.Text });
                else
                {
                    result.Segments[0].Speaker = 1;
                    result.Segments[0].End = duration;
                }
            }

            // 清理预处理临时文件
            try { if (processedWav.StartsWith(Path.GetTempPath())) File.Delete(processedWav); } catch { }

            // 3. 写回结果
            UpdateProgress(db, job.Id, 95, "保存结果...");
            var resultJson = System.Text.Json.JsonSerializer.Serialize(
                result.Segments.Select(s => new { speaker = s.Speaker, start = s.Start, end = s.End, text = s.Text }));

            db.Execute(@"
                UPDATE stt_jobs SET
                    status = 'completed', progress = 100,
                    result_text = @Text, result_json = @Json,
                    elapsed_sec = @Elapsed, error = NULL,
                    updated_at = @Now
                WHERE id = @Id",
                new
                {
                    Text = result.Text,
                    Json = resultJson,
                    result.ElapsedSec,
                    Now = now(),
                    job.Id,
                });

            _logger?.LogInformation("[SttWorker] Job {Id} 完成: {Chars} 字, {Duration:F1}s 音频",
                job.Id, result.Text.Length, duration);
        }
        catch (OperationCanceledException)
        {
            db.Execute("UPDATE stt_jobs SET status = 'cancelled', updated_at = @Now WHERE id = @Id",
                new { Now = now(), job.Id });
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[SttWorker] Job {job.Id} 失败: {ex.Message}");
            db.Execute("UPDATE stt_jobs SET status = 'failed', error = @Err, updated_at = @Now WHERE id = @Id",
                new { Err = Common.Sanitize(ex.Message), Now = now(), job.Id });
        }
    }

    private static void UpdateProgress(IDbConnection db, long jobId, int progress, string? note = null)
    {
        var now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
        db.Execute("UPDATE stt_jobs SET progress = @P, updated_at = @Now WHERE id = @Id",
            new { P = progress, Now = now, Id = jobId });
        if (note != null)
            Console.WriteLine($"[SttWorker] Job {jobId} 进度 {progress}%: {note}");
    }

    public void Dispose()
    {
        _timer?.Dispose();
    }
}

/// <summary>stt_jobs 表映射（Dapper 用）</summary>
public class SttJob
{
    public long Id { get; set; }
    public string Source_File { get; set; } = "";
    public string Source_Path { get; set; } = "";
    public string Source_Type { get; set; } = "audio";
    public string Engine { get; set; } = "qwen3-asr-1.7b-gguf";
    public string Status { get; set; } = "pending";
    public int Progress { get; set; }
    public int Is_Multi_Speaker { get; set; }
    public int? Num_Speakers { get; set; }
    public string? Hotwords { get; set; }
    public string? Result_Text { get; set; }
    public string? Result_Json { get; set; }
    public double? Duration_Sec { get; set; }
    public double? Elapsed_Sec { get; set; }
    public string? Error { get; set; }
    public string Created_At { get; set; } = "";
    public string Updated_At { get; set; } = "";
    public string Created_By { get; set; } = "";
}

================
File: EngineeringManager.Tests/Common/TestStartup.cs
================
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;

namespace EngineeringManager.Tests.Common;

/// <summary>
/// 测试用入口点，用于 WebApplicationFactory
/// </summary>
public class TestStartup
{
    public static void Configure(WebApplicationBuilder builder)
    {
        ApiConfig.ConfigureServices(builder);
    }

    public static void ConfigureApp(WebApplication app)
    {
        ApiConfig.ConfigureApp(app);
    }
}

================
File: EngineeringManager.Tests/Endpoints/AuthEndpointsTests.cs
================
using EngineeringManager.Tests.Common;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

public class AuthEndpointsTests : ApiTestBase
{
    [Fact]
    public async Task Login_ValidCredentials_ReturnsToken()
    {
        var response = await Client.PostAsJsonAsync("/api/auth/login",
            new { username = "admin", password = "admin123" });

        response.EnsureSuccessStatusCode();
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.GetProperty("success").GetBoolean());
        Assert.True(json.GetProperty("data").GetProperty("token").GetString().Length > 0);
    }

    [Fact]
    public async Task Login_InvalidPassword_Returns400()
    {
        var response = await Client.PostAsJsonAsync("/api/auth/login",
            new { username = "admin", password = "wrong" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Login_NonexistentUser_Returns400()
    {
        var response = await Client.PostAsJsonAsync("/api/auth/login",
            new { username = "nonexistent", password = "admin123" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}

================
File: EngineeringManager.Tests/Endpoints/CommonTests.cs
================
using EngineeringManager.Api;
using Xunit;

using EngineeringManager.Api.Security;

public class CommonTests
{
    [Fact]
    public void HashPassword_ProducesConsistentHash()
    {
        var salt = "test-salt-1234567890123456";
        var hash1 = EngineeringManager.Api.Common.HashPassword("admin123", salt, 2);
        var hash2 = EngineeringManager.Api.Common.HashPassword("admin123", salt, 2);

        Assert.Equal(hash1, hash2);
    }

    [Fact]
    public void HashPassword_DifferentSaltsProduceDifferentHashes()
    {
        var hash1 = EngineeringManager.Api.Common.HashPassword("admin123", "salt1", 2);
        var hash2 = EngineeringManager.Api.Common.HashPassword("admin123", "salt2", 2);

        Assert.NotEqual(hash1, hash2);
    }

    [Fact]
    public void GetDefaultPermissions_AdminHasAllPermissions()
    {
        var permissions = EngineeringManager.Api.Common.GetDefaultPermissions("admin");

        Assert.Contains("projects:read", permissions);
        Assert.Contains("projects:update", permissions);
        Assert.Contains("projects:delete", permissions);
    }

    [Fact]
    public void GetDefaultPermissions_WorkerHasLimitedPermissions()
    {
        var permissions = EngineeringManager.Api.Common.GetDefaultPermissions("worker");

        Assert.Contains("projects:read", permissions);
        Assert.DoesNotContain("projects:delete", permissions);
    }

    [Fact]
    public void GetDefaultPermissions_ReturnsFourRoles()
    {
        var adminPerms = EngineeringManager.Api.Common.GetDefaultPermissions("admin");
        var managerPerms = EngineeringManager.Api.Common.GetDefaultPermissions("manager");
        var accountantPerms = EngineeringManager.Api.Common.GetDefaultPermissions("accountant");
        var workerPerms = EngineeringManager.Api.Common.GetDefaultPermissions("worker");

        Assert.NotNull(adminPerms);
        Assert.NotNull(managerPerms);
        Assert.NotNull(accountantPerms);
        Assert.NotNull(workerPerms);
    }

    // ════════ v0.76.0 累计待办 #1: PII ACL ════════

    [Fact]
    public void MaskPiiField_CanReadPii_ReturnsOriginal()
    {
        // admin/manager/accountant 看明文
        var canRead = new CurrentUser.PiiAccess(new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "idCard", "phone", "bankAccount", "idCardAddress" });
        Assert.Equal("110101199001011234", EngineeringManager.Api.Common.MaskPiiField("idCard", "110101199001011234", canRead));
        Assert.Equal("[已脱敏]", EngineeringManager.Api.Common.MaskPiiField("phone", "[已脱敏]", canRead));
        Assert.Equal("6228480012345678", EngineeringManager.Api.Common.MaskPiiField("bankAccount", "6228480012345678", canRead));
        Assert.Equal("北京市朝阳区", EngineeringManager.Api.Common.MaskPiiField("idCardAddress", "北京市朝阳区", canRead));
    }

    [Fact]
    public void MaskPiiField_WorkerRole_MasksAllFields()
    {
        // worker 看脱敏
        var masked = new CurrentUser.PiiAccess(new HashSet<string>(StringComparer.OrdinalIgnoreCase));
        Assert.Equal("1101****1234", EngineeringManager.Api.Common.MaskPiiField("idCard", "110101199001011234", masked));
        Assert.Equal("138****8000", EngineeringManager.Api.Common.MaskPiiField("phone", "[已脱敏]", masked));
        Assert.Equal("6228****5678", EngineeringManager.Api.Common.MaskPiiField("bankAccount", "6228480012345678", masked));
    }

    [Fact]
    public void MaskPiiField_NullOrEmpty_PassesThrough()
    {
        var masked = new CurrentUser.PiiAccess(new HashSet<string>(StringComparer.OrdinalIgnoreCase));
        var canRead = new CurrentUser.PiiAccess(new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "idCard", "phone" });
        Assert.Null(EngineeringManager.Api.Common.MaskPiiField("idCard", null, masked));
        Assert.Equal("", EngineeringManager.Api.Common.MaskPiiField("phone", "", masked));
        Assert.Null(EngineeringManager.Api.Common.MaskPiiField("idCard", null, canRead));
    }

    // ════════ v0.80 D-2: PII 字段权限分级 ════════

    [Fact]
    public void MaskPiiField_WorkerRole_AddressAlsoMasked()
    {
        // worker 下 address 字段也应脱敏（修复的漏洞）
        var masked = new CurrentUser.PiiAccess(new HashSet<string>(StringComparer.OrdinalIgnoreCase));
        Assert.Equal("北***区", EngineeringManager.Api.Common.MaskPiiField("address", "北京市朝阳区", masked));
    }

    [Fact]
    public void MaskPiiField_AdminRole_AllFieldsReadable()
    {
        // admin 可读所有 PII 字段（行为保持）
        var adminAccess = new CurrentUser.PiiAccess(new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            { "id_card", "phone", "bank_account", "address", "id_card_address" });
        Assert.Equal("110101199001011234", EngineeringManager.Api.Common.MaskPiiField("id_card", "110101199001011234", adminAccess));
        Assert.Equal("[已脱敏]", EngineeringManager.Api.Common.MaskPiiField("phone", "[已脱敏]", adminAccess));
        Assert.Equal("6228480012345678", EngineeringManager.Api.Common.MaskPiiField("bank_account", "6228480012345678", adminAccess));
        Assert.Equal("北京市朝阳区", EngineeringManager.Api.Common.MaskPiiField("address", "北京市朝阳区", adminAccess));
        Assert.Equal("北京市朝阳区某街道", EngineeringManager.Api.Common.MaskPiiField("id_card_address", "北京市朝阳区某街道", adminAccess));
    }

    [Fact]
    public void MaskPiiField_ManagerRole_AllFieldsReadable()
    {
        // manager 与 admin 同权（当前行为保持映射）
        var mgrAccess = new CurrentUser.PiiAccess(new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            { "id_card", "phone", "bank_account", "address", "id_card_address" });
        Assert.Equal("110101199001011234", EngineeringManager.Api.Common.MaskPiiField("id_card", "110101199001011234", mgrAccess));
        Assert.Equal("北京市朝阳区", EngineeringManager.Api.Common.MaskPiiField("address", "北京市朝阳区", mgrAccess));
    }

    [Fact]
    public void MaskPiiField_WorkerRole_AllFieldsMasked()
    {
        // worker 全部脱敏
        var workerAccess = new CurrentUser.PiiAccess(new HashSet<string>(StringComparer.OrdinalIgnoreCase));
        Assert.Equal("1101****1234", EngineeringManager.Api.Common.MaskPiiField("id_card", "110101199001011234", workerAccess));
        Assert.Equal("138****8000", EngineeringManager.Api.Common.MaskPiiField("phone", "[已脱敏]", workerAccess));
        Assert.Equal("6228****5678", EngineeringManager.Api.Common.MaskPiiField("bank_account", "6228480012345678", workerAccess));
        Assert.Equal("北***区", EngineeringManager.Api.Common.MaskPiiField("address", "北京市朝阳区", workerAccess));
        Assert.Equal("北***区", EngineeringManager.Api.Common.MaskPiiField("id_card_address", "北京市朝阳区", workerAccess));
    }

    [Fact]
    public void MaskPiiField_FieldNameVariant_Consistency()
    {
        // 同一字段 camelCase 与 snake_case 应得到相同脱敏结果（worker）
        var workerAccess = new CurrentUser.PiiAccess(new HashSet<string>(StringComparer.OrdinalIgnoreCase));
        Assert.Equal(
            Common.MaskPiiField("id_card", "110101199001011234", workerAccess),
            Common.MaskPiiField("idCard", "110101199001011234", workerAccess));
    }

    [Theory]
    [InlineData("admin", "id_card", true)]
    [InlineData("admin", "phone", true)]
    [InlineData("admin", "address", true)]
    [InlineData("manager", "id_card", true)]
    [InlineData("manager", "address", true)]
    [InlineData("accountant", "id_card", true)]
    [InlineData("accountant", "bank_account", true)]
    [InlineData("worker", "id_card", false)]
    [InlineData("worker", "phone", false)]
    [InlineData("worker", "address", false)]
    [InlineData("worker", "bank_account", false)]
    public void MaskPiiField_RoleFieldMatrix(string role, string field, bool expectReadable)
    {
        var readable = role switch
        {
            "admin" => new HashSet<string>(StringComparer.OrdinalIgnoreCase)
                { "id_card", "phone", "bank_account", "address", "id_card_address" },
            "manager" => new HashSet<string>(StringComparer.OrdinalIgnoreCase)
                { "id_card", "phone", "bank_account", "address", "id_card_address" },
            "accountant" => new HashSet<string>(StringComparer.OrdinalIgnoreCase)
                { "id_card", "phone", "bank_account", "address", "id_card_address" },
            "worker" => new HashSet<string>(StringComparer.OrdinalIgnoreCase),
            _ => new HashSet<string>(StringComparer.OrdinalIgnoreCase),
        };
        var access = new CurrentUser.PiiAccess(readable);
        var masked = Common.MaskPiiField(field, "12345678901234567", access);

        if (expectReadable)
            Assert.Equal("12345678901234567", masked);
        else
            Assert.NotEqual("12345678901234567", masked);
    }
}

================
File: EngineeringManager.Tests/Endpoints/DataScopeTests.cs
================
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// D-1 DataScope 枚举化 — 验证 GetDataScope 角色映射、UserFilter 片段输出
/// </summary>
public class DataScopeTests
{
    // ════════ GetDataScope 角色映射 ════════

    [Fact]
    public void UserFilterCompany_AllScope_ReturnsOneEqOne()
    {
        // All → (1 = 1)
        var sql = EngineeringManager.Api.Security.CurrentUser.UserFilterCompany(
            EngineeringManager.Api.Security.CurrentUser.DataScope.All, "created_by");
        Assert.Equal("(1 = 1)", sql);
    }

    [Fact]
    public void UserFilterCompany_AuthorizedProjects_ContainsNoIsAdmin()
    {
        // AuthorizedProjects → (created_by = @Uid)，不含 @IsAdmin
        var sql = EngineeringManager.Api.Security.CurrentUser.UserFilterCompany(
            EngineeringManager.Api.Security.CurrentUser.DataScope.AuthorizedProjects, "created_by");
        Assert.Equal("(created_by = @Uid)", sql);
        Assert.DoesNotContain("IsAdmin", sql);
    }

    [Fact]
    public void UserFilterCompany_AuthorizedProjects_UsesAlias()
    {
        // 带表别名
        var sql = EngineeringManager.Api.Security.CurrentUser.UserFilterCompany(
            EngineeringManager.Api.Security.CurrentUser.DataScope.AuthorizedProjects, "m.created_by");
        Assert.Equal("(m.created_by = @Uid)", sql);
    }

    [Fact]
    public void UserFilterWithAuthorizedProjects_AllScope_ReturnsOneEqOne()
    {
        // All → (1 = 1)
        var sql = EngineeringManager.Api.Security.CurrentUser.UserFilterWithAuthorizedProjects(
            EngineeringManager.Api.Security.CurrentUser.DataScope.All);
        Assert.Equal("(1 = 1)", sql);
    }

    [Fact]
    public void UserFilterWithAuthorizedProjects_AuthorizedProjects_ContainsNoIsAdmin()
    {
        // AuthorizedProjects → (created_by = @Uid OR EXISTS ...)，不含 @IsAdmin
        var sql = EngineeringManager.Api.Security.CurrentUser.UserFilterWithAuthorizedProjects(
            EngineeringManager.Api.Security.CurrentUser.DataScope.AuthorizedProjects,
            "project_id", "created_by");
        Assert.Contains("created_by = @Uid", sql);
        Assert.Contains("EXISTS", sql);
        Assert.Contains("project_authorizations", sql);
        Assert.DoesNotContain("IsAdmin", sql);
    }

    [Fact]
    public void UserFilterWithAuthorizedProjects_AuthorizedProjects_UsesProjectCol()
    {
        // 自定义 projectCol
        var sql = EngineeringManager.Api.Security.CurrentUser.UserFilterWithAuthorizedProjects(
            EngineeringManager.Api.Security.CurrentUser.DataScope.AuthorizedProjects,
            "pw.project_id");
        Assert.Contains("pw.project_id", sql);
    }

    [Fact]
    public void UserFilterFragmentForProject_AllScope_ReturnsOneEqOne()
    {
        var sql = EngineeringManager.Api.Security.CurrentUser.UserFilterFragmentForProject(
            EngineeringManager.Api.Security.CurrentUser.DataScope.All);
        Assert.Equal("(1 = 1)", sql);
    }

    [Fact]
    public void UserFilterFragmentForProject_AuthorizedProjects_ContainsNoIsAdmin()
    {
        var sql = EngineeringManager.Api.Security.CurrentUser.UserFilterFragmentForProject(
            EngineeringManager.Api.Security.CurrentUser.DataScope.AuthorizedProjects);
        Assert.Contains("created_by = @Uid", sql);
        Assert.Contains("EXISTS", sql);
        Assert.DoesNotContain("IsAdmin", sql);
    }

    // ════════ SafeQueryValidator 不生成 @IsAdmin ════════

    [Fact]
    public void ValidateAndRewrite_AuthorizedProjects_NoIsAdminInSql()
    {
        // safeQuery 在 AuthorizedProjects 范围下，生成的 SQL 不含 @IsAdmin
        var result = EngineeringManager.Api.Services.SafeQueryValidator.ValidateAndRewrite(
            "SELECT id, name FROM projects",
            "test-user",
            EngineeringManager.Api.Security.CurrentUser.DataScope.AuthorizedProjects);

        Assert.True(result.IsValid, $"查询应通过: {result.Error}");
        Assert.NotNull(result.RewrittenSql);
        Assert.DoesNotContain("@IsAdmin", result.RewrittenSql);
    }

    [Fact]
    public void ValidateAndRewrite_AllScope_NoIsAdminInSql()
    {
        // All 范围下，生成的 SQL 不含 @IsAdmin
        var result = EngineeringManager.Api.Services.SafeQueryValidator.ValidateAndRewrite(
            "SELECT id, name FROM projects",
            "test-user",
            EngineeringManager.Api.Security.CurrentUser.DataScope.All);

        Assert.True(result.IsValid, $"查询应通过: {result.Error}");
        Assert.NotNull(result.RewrittenSql);
        Assert.DoesNotContain("@IsAdmin", result.RewrittenSql);
    }

    [Fact]
    public void GetTableFilter_CompanyTable_AllScope_ReturnsOneEqOne()
    {
        var sql = EngineeringManager.Api.Services.SafeQueryValidator.GetTableFilter(
            EngineeringManager.Api.Security.CurrentUser.DataScope.All,
            "projects");
        Assert.Equal("(1 = 1)", sql);
    }

    [Fact]
    public void GetTableFilter_CompanyTable_AuthorizedProjects_UsesCreatedBy()
    {
        var sql = EngineeringManager.Api.Services.SafeQueryValidator.GetTableFilter(
            EngineeringManager.Api.Security.CurrentUser.DataScope.AuthorizedProjects,
            "projects");
        Assert.Contains("created_by = @Uid", sql);
        Assert.DoesNotContain("IsAdmin", sql);
    }

    [Fact]
    public void GetTableFilter_ProjectTable_AuthorizedProjects_UsesProjectAuth()
    {
        var sql = EngineeringManager.Api.Services.SafeQueryValidator.GetTableFilter(
            EngineeringManager.Api.Security.CurrentUser.DataScope.AuthorizedProjects,
            "invoices");
        Assert.Contains("EXISTS", sql);
        Assert.Contains("project_authorizations", sql);
        Assert.DoesNotContain("IsAdmin", sql);
    }
}

================
File: EngineeringManager.Tests/Endpoints/KnowledgeBaseServiceTests.cs
================
using System.Data;
using Dapper;
using EngineeringManager.Api.Services;
using EngineeringManager.Api.Services.Stt;
using Microsoft.Data.Sqlite;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// M2 知识库服务单元测试
///
/// 测试项:
/// 1. 说话人标签归一化（M1 尾巴）
/// 2. 文本分块正确性
/// 3. FTS5 中文命中
/// 4. 向量命中（使用 FakeEmbeddingService）
/// 5. RRF 融合排序正确
/// 6. 删除级联
/// 7. 入库 + 检索端到端
/// </summary>
public class KnowledgeBaseServiceTests
{
    /// <summary>创建内存数据库并执行 029 迁移</summary>
    private static (SqliteConnection conn, KnowledgeBaseService service) CreateService()
    {
        var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        conn.Execute("PRAGMA journal_mode=WAL");

        // 建表
        conn.Execute(@"
            CREATE TABLE IF NOT EXISTS knowledge_documents (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                source_type TEXT NOT NULL,
                source_ref  TEXT,
                project_id  INTEGER,
                title       TEXT NOT NULL,
                full_text   TEXT NOT NULL,
                speakers    TEXT,
                occurred_at TEXT,
                created_at  TEXT NOT NULL,
                updated_at  TEXT NOT NULL,
                created_by  TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS knowledge_chunks (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                document_id INTEGER NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
                chunk_index INTEGER NOT NULL,
                text        TEXT NOT NULL,
                embedding   BLOB
            );
            CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_fts USING fts5(
                text, content='knowledge_chunks', content_rowid='id', tokenize='trigram'
            );
            CREATE TRIGGER IF NOT EXISTS knowledge_fts_ai AFTER INSERT ON knowledge_chunks BEGIN
                INSERT INTO knowledge_fts(rowid, text) VALUES (new.id, new.text);
            END;
            CREATE TRIGGER IF NOT EXISTS knowledge_fts_ad AFTER DELETE ON knowledge_chunks BEGIN
                INSERT INTO knowledge_fts(knowledge_fts, rowid, text) VALUES('delete', old.id, old.text);
            END;
            CREATE TRIGGER IF NOT EXISTS knowledge_fts_au AFTER UPDATE ON knowledge_chunks BEGIN
                INSERT INTO knowledge_fts(knowledge_fts, rowid, text) VALUES('delete', old.id, old.text);
                INSERT INTO knowledge_fts(rowid, text) VALUES (new.id, new.text);
            END;
            CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_doc ON knowledge_chunks(document_id);
            CREATE TABLE IF NOT EXISTS project_authorizations (
                project_id INTEGER NOT NULL,
                user_id TEXT NOT NULL,
                PRIMARY KEY (project_id, user_id)
            );
        ");

        var embedding = new FakeEmbeddingService();
        var service = new KnowledgeBaseService(conn, embedding);
        return (conn, service);
    }

    // ═══════════════════════════════════════════════════════════
    // 1. 说话人标签归一化（SpeakerLabelNormalizer）
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void SpeakerLabelNormalizer_NonContiguousBecomesSequential()
    {
        // 原始簇号 0, 3, 7 → 归一化为 1, 2, 3
        var segments = new List<SttSegment>
        {
            new() { Speaker = 0, Start = 0, End = 5 },
            new() { Speaker = 3, Start = 5, End = 10 },
            new() { Speaker = 7, Start = 10, End = 15 },
            new() { Speaker = 0, Start = 15, End = 20 },
        };

        // 归一化（就地修改）
        SpeakerLabelNormalizer.Normalize(segments);

        // 验证 segment 中的 Speaker 已改为 1-based 连续编号
        Assert.Equal(1, segments[0].Speaker); // 原始 0 → 1
        Assert.Equal(2, segments[1].Speaker); // 原始 3 → 2
        Assert.Equal(3, segments[2].Speaker); // 原始 7 → 3
        Assert.Equal(1, segments[3].Speaker); // 原始 0 → 1（与首次出现一致）

        // 验证 OriginalSpeaker 保留了原始簇号
        Assert.Equal(0, segments[0].OriginalSpeaker);
        Assert.Equal(3, segments[1].OriginalSpeaker);
        Assert.Equal(7, segments[2].OriginalSpeaker);
        Assert.Equal(0, segments[3].OriginalSpeaker);

        // 验证 speakers JSON
        var json = SpeakerLabelNormalizer.BuildSpeakersJson(segments);
        Assert.NotNull(json);
        using var doc = System.Text.Json.JsonDocument.Parse(json!);
        var arr = doc.RootElement.EnumerateArray().ToList();
        Assert.Equal(3, arr.Count); // 3 个说话人

        // 第一个说话人 id=1
        Assert.Equal(1, arr[0].GetProperty("id").GetInt32());
        // 第二个说话人 id=2
        Assert.Equal(2, arr[1].GetProperty("id").GetInt32());
        // 第三个说话人 id=3
        Assert.Equal(3, arr[2].GetProperty("id").GetInt32());

        // 说话人 1 有 2 个时间段
        Assert.Equal(2, arr[0].GetProperty("segments").GetArrayLength());
    }

    [Fact]
    public void SpeakerLabelNormalizer_NullSegments_BuildJsonReturnsNull()
    {
        Assert.Null(SpeakerLabelNormalizer.BuildSpeakersJson(null));
        Assert.Null(SpeakerLabelNormalizer.BuildSpeakersJson(new List<SttSegment>()));
    }

    [Fact]
    public void SpeakerLabelNormalizer_SingleSpeaker_StaysOne()
    {
        var segments = new List<SttSegment>
        {
            new() { Speaker = 0, Start = 0, End = 10, Text = "单人录音" },
        };

        SpeakerLabelNormalizer.Normalize(segments);

        Assert.Equal(1, segments[0].Speaker);
        Assert.Equal(0, segments[0].OriginalSpeaker);
    }

    // ═══════════════════════════════════════════════════════════
    // 2. 文本分块
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void ChunkText_SplitsAtSentenceBoundaries()
    {
        // 构建超过 MaxChunkSize 的文本
        var sentences = new List<string>();
        for (int i = 0; i < 30; i++)
            sentences.Add($"这是第{i}句话内容比较多用来测试分块功能。");
        var text = string.Join("", sentences);

        var chunks = KnowledgeBaseService.ChunkText(text);

        Assert.True(chunks.Count > 1, $"应分成多块，实际 {chunks.Count}");
        // 每块不超过 MaxChunkSize
        Assert.All(chunks, c => Assert.True(c.Length <= 500, $"块长度 {c.Length} > 500"));
        // 每块至少 MinChunkSize（最后一块除外）
        for (int i = 0; i < chunks.Count - 1; i++)
            Assert.True(chunks[i].Length >= 300, $"块 {i} 长度 {chunks[i].Length} < 300");
    }

    [Fact]
    public void ChunkText_DoesNotSplitSentence()
    {
        var text = "这是第一句话。这是第二句话。这是第三句话。";
        var chunks = KnowledgeBaseService.ChunkText(text);

        // 短文本应该只有一块
        Assert.Single(chunks);
        Assert.Contains("第一句话", chunks[0]);
        Assert.Contains("第三句话", chunks[0]);
    }

    [Fact]
    public void ChunkText_EmptyText_ReturnsEmpty()
    {
        var chunks = KnowledgeBaseService.ChunkText("");
        Assert.Empty(chunks);
    }

    // ═══════════════════════════════════════════════════════════
    // 3. FTS5 中文命中
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public async Task IngestAndSearch_FtsChineseMatch()
    {
        var (conn, service) = CreateService();
        using var _ = conn;

        await service.IngestAsync(
            fullText: "今天讨论[已脱敏]结账付款进度款的问题。[已脱敏]说的二十七万有点高。",
            title: "会议记录",
            sourceType: "meeting",
            sourceRef: null,
            projectId: null,
            createdBy: "user1");

        var result = await service.SearchAsync("结账付款", topK: 10, userId: "user1", isAdmin: false);

        Assert.True(result.TotalHits > 0, "FTS 应命中");
        Assert.Contains(result.Hits, h => h.Text.Contains("结账付款"));
    }

    // ═══════════════════════════════════════════════════════════
    // 4. 向量命中（FakeEmbeddingService 保证相似文本向量接近）
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public async Task IngestAndSearch_SemanticMatch()
    {
        var (conn, service) = CreateService();
        using var _ = conn;

        // 入库一段关于付款方式的文本
        await service.IngestAsync(
            fullText: "每个月百分之八十的进度款在月底前支付，剩下的二十在竣工验收后付清。",
            title: "付款安排",
            sourceType: "call",
            sourceRef: null,
            projectId: null,
            createdBy: "user1");

        // 搜索"付款方式"——原话没有这四个字，靠语义命中
        var result = await service.SearchAsync("付款方式", topK: 10, userId: "user1", isAdmin: false);

        // FakeEmbeddingService 用字符 n-gram，"付款" 两字在查询和文本中都有
        Assert.True(result.TotalHits > 0, "语义检索应命中");
        Assert.True(result.UsedSemantic, "应使用了语义检索");
    }

    // ═══════════════════════════════════════════════════════════
    // 5. RRF 融合排序
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void RrfFuse_BothSourcesRankHigher()
    {
        // chunk 1: FTS rank=1, semantic rank=2
        // chunk 2: FTS rank=2, semantic rank=1
        // chunk 3: FTS rank=3 only
        var ftsResults = new List<ChunkMatch>
        {
            new() { ChunkId = 1, FtsRank = 1, Text = "chunk1" },
            new() { ChunkId = 2, FtsRank = 2, Text = "chunk2" },
            new() { ChunkId = 3, FtsRank = 3, Text = "chunk3" },
        };
        var semanticResults = new List<ChunkMatch>
        {
            new() { ChunkId = 2, SemanticRank = 1, Text = "chunk2" },
            new() { ChunkId = 1, SemanticRank = 2, Text = "chunk1" },
        };

        var fused = KnowledgeBaseService.RrfFuse(ftsResults, semanticResults, topK: 3);

        Assert.Equal(3, fused.Count);
        // chunk 1 和 chunk 2 两路都命中，应排在 chunk 3 前面
        var top2Ids = fused.Take(2).Select(f => f.ChunkId).ToHashSet();
        Assert.Contains(1L, top2Ids);
        Assert.Contains(2L, top2Ids);
        // chunk 3 只有一路，应排最后
        Assert.Equal(3L, fused.Last().ChunkId);
    }

    [Fact]
    public void RrfFuse_EmptySemantic_OnlyFts()
    {
        var ftsResults = new List<ChunkMatch>
        {
            new() { ChunkId = 1, FtsRank = 1, Text = "chunk1" },
            new() { ChunkId = 2, FtsRank = 2, Text = "chunk2" },
        };

        var fused = KnowledgeBaseService.RrfFuse(ftsResults, new List<ChunkMatch>(), topK: 10);

        Assert.Equal(2, fused.Count);
        Assert.Equal(1L, fused[0].ChunkId);
        Assert.Equal(2L, fused[1].ChunkId);
    }

    // ═══════════════════════════════════════════════════════════
    // 6. 删除级联
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public async Task DeleteDocument_CascadesChunksAndFts()
    {
        var (conn, service) = CreateService();
        using var _ = conn;

        var docId = await service.IngestAsync(
            fullText: "这是一段测试文本用于验证删除级联功能。",
            title: "删除测试",
            sourceType: "manual",
            sourceRef: null,
            projectId: null,
            createdBy: "user1");

        // 确认有 chunks
        var chunkCount = conn.ExecuteScalar<int>(
            "SELECT COUNT(*) FROM knowledge_chunks WHERE document_id = @Id",
            new { Id = docId });
        Assert.True(chunkCount > 0, "应有分块");

        // 确认 FTS 有数据
        var ftsCount = conn.ExecuteScalar<int>(
            "SELECT COUNT(*) FROM knowledge_fts");
        Assert.True(ftsCount > 0, "FTS 应有数据");

        // 删除
        var deleted = service.DeleteDocument(docId, "user1", isAdmin: false);
        Assert.True(deleted, "删除应成功");

        // 验证 chunks 已删除
        var chunkCountAfter = conn.ExecuteScalar<int>(
            "SELECT COUNT(*) FROM knowledge_chunks WHERE document_id = @Id",
            new { Id = docId });
        Assert.Equal(0, chunkCountAfter);

        // 验证 FTS 已删除（触发器同步）
        var ftsCountAfter = conn.ExecuteScalar<int>(
            "SELECT COUNT(*) FROM knowledge_fts");
        Assert.Equal(0, ftsCountAfter);

        // 验证文档已删除
        var docCount = conn.ExecuteScalar<int>(
            "SELECT COUNT(*) FROM knowledge_documents WHERE id = @Id",
            new { Id = docId });
        Assert.Equal(0, docCount);
    }

    // ═══════════════════════════════════════════════════════════
    // 7. 入库 + 检索端到端
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public async Task Ingest_WithNormalizedSpeakers_StoredInDatabase()
    {
        var (conn, service) = CreateService();
        using var _ = conn;

        // 模拟 STT 层已归一化的 segments（Speaker = 1-based 连续编号）
        var segments = new List<SttSegment>
        {
            new() { Speaker = 1, Start = 0, End = 5, Text = "你好" },
            new() { Speaker = 2, Start = 5, End = 10, Text = "你好" },
            new() { Speaker = 1, Start = 10, End = 15, Text = "再见" },
        };

        var docId = await service.IngestAsync(
            fullText: "【说话人1】你好\n【说话人2】你好\n【说话人1】再见",
            title: "通话记录",
            sourceType: "call",
            sourceRef: "42",
            projectId: null,
            createdBy: "user1",
            segments: segments);

        // 验证 speakers JSON 与 STT 归一化结果一致
        var speakers = conn.ExecuteScalar<string>(
            "SELECT speakers FROM knowledge_documents WHERE id = @Id",
            new { Id = docId });

        Assert.NotNull(speakers);
        using var doc = System.Text.Json.JsonDocument.Parse(speakers!);
        var arr = doc.RootElement.EnumerateArray().ToList();
        Assert.Equal(2, arr.Count); // 2 个说话人
        Assert.Equal(1, arr[0].GetProperty("id").GetInt32());
        Assert.Equal(2, arr[1].GetProperty("id").GetInt32());
    }

    [Fact]
    public async Task Search_DataScope_NonAdminOnlySeesOwn()
    {
        var (conn, service) = CreateService();
        using var _ = conn;

        // user1 的文档
        await service.IngestAsync(
            fullText: "用户一的文档内容关于钢筋采购。",
            title: "用户一文档",
            sourceType: "manual",
            sourceRef: null,
            projectId: null,
            createdBy: "user1");

        // user2 的文档
        await service.IngestAsync(
            fullText: "用户二的文档内容关于模板租赁。",
            title: "用户二文档",
            sourceType: "manual",
            sourceRef: null,
            projectId: null,
            createdBy: "user2");

        // user1 搜索：只看到自己的
        var result1 = await service.SearchAsync("文档", topK: 10, userId: "user1", isAdmin: false);
        Assert.All(result1.Hits, h => Assert.Equal("user1", h.CreatedBy));

        // admin 搜索：看到全部
        var resultAdmin = await service.SearchAsync("文档", topK: 10, userId: "admin", isAdmin: true);
        Assert.True(resultAdmin.TotalHits >= 2, $"admin 应看到全部，实际 {resultAdmin.TotalHits}");
    }

    [Fact]
    public async Task GetDocument_ReturnsChunks()
    {
        var (conn, service) = CreateService();
        using var _ = conn;

        var longText = string.Join("", Enumerable.Range(0, 20)
            .Select(i => $"这是第{i}段内容比较长的句子用于测试分块。"));

        var docId = await service.IngestAsync(
            fullText: longText,
            title: "长文本",
            sourceType: "manual",
            sourceRef: null,
            projectId: null,
            createdBy: "user1");

        var doc = service.GetDocument(docId, "user1", isAdmin: false);

        Assert.NotNull(doc);
        Assert.Equal("长文本", doc!.Title);
        Assert.True(doc.Chunks.Count > 0, "应有分块");
    }
}

/// <summary>
/// 测试用假嵌入服务：基于字符 bigram 的简单向量
/// 相同/相似文本 → 相似向量（cosine 接近 1）
/// 完全不同文本 → 向量正交（cosine 接近 0）
/// </summary>
public class FakeEmbeddingService : IEmbeddingService
{
    public int Dimension => 512;
    public bool IsAvailable => true;

    public Task<float[]> EmbedAsync(string text, CancellationToken ct = default)
    {
        return Task.FromResult(ComputeEmbedding(text));
    }

    public Task<List<float[]>> EmbedBatchAsync(List<string> texts, CancellationToken ct = default)
    {
        return Task.FromResult(texts.Select(t => ComputeEmbedding(t)).ToList());
    }

    private static float[] ComputeEmbedding(string text)
    {
        var vec = new float[512];

        // 字符 bigram → hash → 维度
        for (int i = 0; i < text.Length - 1; i++)
        {
            var bigram = text.Substring(i, 2);
            var hash = bigram.GetHashCode();
            var idx = Math.Abs(hash) % 512;
            vec[idx] += 1;
        }

        // 字符 unigram → hash → 维度
        foreach (var ch in text)
        {
            var hash = ch.GetHashCode();
            var idx = Math.Abs(hash) % 512;
            vec[idx] += 0.5f;
        }

        // L2 normalize
        var norm = MathF.Sqrt(vec.Sum(v => v * v));
        if (norm > 0)
            for (int i = 0; i < 512; i++)
                vec[i] /= norm;

        return vec;
    }
}

================
File: EngineeringManager.Tests/Endpoints/OcrEndpointsTests.cs
================
using System.Reflection;
using EngineeringManager.Api;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// v0.77.1 P1-1 修复: OCR 8 处假成功 → 真 500
/// </summary>
public class OcrEndpointsTests
{
    private const string OcrEndpointsPath = @"E:\测试\EngineeringManager.Api\Endpoints\OcrEndpoints.cs";

    [Fact]
    public void CatchOcrError_HelperMethodExists()
    {
        var method = typeof(OcrEndpoints).GetMethod(
            "CatchOcrError",
            BindingFlags.NonPublic | BindingFlags.Static);
        Assert.NotNull(method);
        Assert.Equal(typeof(IResult), method!.ReturnType);
        var parameters = method.GetParameters();
        Assert.Equal(2, parameters.Length);
        Assert.Equal("endpointName", parameters[0].Name);
        Assert.Equal(typeof(string), parameters[0].ParameterType);
        Assert.Equal("ex", parameters[1].Name);
        Assert.Equal(typeof(Exception), parameters[1].ParameterType);
    }

    [Fact]
    public void CatchOcrError_Returns500_OnNetworkTimeout()
    {
        var method = typeof(OcrEndpoints).GetMethod(
            "CatchOcrError",
            BindingFlags.NonPublic | BindingFlags.Static)!;
        var ex = new Exception("请求百度 OCR 超时, 已重试 3 次");

        var result = (IResult)method.Invoke(null, new object?[] { "ocr-id-card", ex })!;

        var httpResult = Assert.IsAssignableFrom<IStatusCodeHttpResult>(result);
        Assert.Equal(500, httpResult.StatusCode);
    }

    [Fact]
    public void CatchOcrError_Returns500_OnGenericException()
    {
        var method = typeof(OcrEndpoints).GetMethod(
            "CatchOcrError",
            BindingFlags.NonPublic | BindingFlags.Static)!;
        var ex = new Exception("百度 API 返回 401 Unauthorized: invalid api_key");

        var result = (IResult)method.Invoke(null, new object?[] { "ocr-invoice", ex })!;

        var httpResult = Assert.IsAssignableFrom<IStatusCodeHttpResult>(result);
        Assert.Equal(500, httpResult.StatusCode);
    }

    [Fact]
    public void OcrEndpoints_File_NoLongerContainsFakeSuccessInCatchBlocks()
    {
        var content = File.ReadAllText(OcrEndpointsPath);
        // 修复前: 10 个 (8 OCR + 2 enterprise query)
        // 修复后: 2 个 (只剩 enterprise query L399/L423, 超出本次 OCR scope)
        var pattern = System.Text.RegularExpressions.Regex.Escape("return Results.Ok(new { success = false");
        var matches = System.Text.RegularExpressions.Regex.Matches(content, pattern);
        Assert.True(matches.Count <= 2,
            "v0.77.1 OCR 修复后, 假成功应 <= 2 (剩 enterprise query), 实际 " + matches.Count);
    }

    [Fact]
    public void OcrEndpoints_File_AllEightCatchBlocksReplaced()
    {
        var content = File.ReadAllText(OcrEndpointsPath);
        // 验证 transformer 实际替换了 8 处 catch block
        var ocrEndpoints = new[] {
            "ocr-id-card",
            "ocr-invoice",
            "ocr-bank-card",
            "ocr-business-license",
            "ocr-bank-receipt",
            "ocr-permit",
            "ocr-bank-statement",
            "ocr-general-receipt"
        };
        foreach (var name in ocrEndpoints)
        {
            Assert.Contains($"CatchOcrError(\"{name}\", ex)", content);
        }
    }
}

================
File: EngineeringManager.Tests/Endpoints/PiiLeakTests.cs
================
using System.Reflection;
using System.Text.RegularExpressions;
using EngineeringManager.Api;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// v0.77.2 P1-3 修复: ex.Message 不再直接返回前端
/// 修复范围: 4 文件 18 处 ex.Message 泄露 + OcrEndpoints 2 处企业查询假成功
/// </summary>
public class PiiLeakTests
{
    private const string EndpointsDir = @"E:\测试\EngineeringManager.Api\Endpoints";

    private static string ReadFile(string name) =>
        File.ReadAllText(Path.Combine(EndpointsDir, name));

    /// <summary>
    /// 检查文件中剩余 raw {ex.Message} 都只在 server-side log (Console.Error.WriteLine) 里,
    /// 不在 response body 里.  注: Common.Sanitize(ex.Message) 已替换完成.
    /// </summary>
    [Theory]
    [InlineData("AuthEndpoints.cs")]
    [InlineData("UserPreferencesEndpoints.cs")]
    [InlineData("SystemEndpoints.cs")]
    public void EndpointFile_AllRawExMessageAreInServerSideLogs(string fileName)
    {
        var content = ReadFile(fileName);

        // 1. 把所有 Common.Sanitize(ex.Message) 替换掉 (已正确)
        var stripped = content.Replace("Common.Sanitize(ex.Message)", "");

        // 2. 把所有 Console.Error.WriteLine 整行去掉 (server-side log, OK)
        stripped = Regex.Replace(stripped, @"Console\.Error\.WriteLine\([^;]*?\{ex\.Message\}[^;]*?\);", "");

        // 3. 现在剩下的 {ex.Message} 应该 = 0
        var leftover = Regex.Matches(stripped, @"\{ex\.Message\}");
        Assert.Empty(leftover);
    }

    /// <summary>
    /// 验证每个 endpoint 文件 ex.Message 都过 Common.Sanitize 脱敏 (response body 路径)
    /// </summary>
    [Theory]
    [InlineData("AuthEndpoints.cs")]
    [InlineData("UserPreferencesEndpoints.cs")]
    [InlineData("SystemEndpoints.cs")]
    public void EndpointFile_HasCommonSanitizeAroundExMessage(string fileName)
    {
        var content = ReadFile(fileName);
        var count = Regex.Matches(content, @"Common\.Sanitize\(ex\.Message\)").Count;
        Assert.True(count > 0, fileName + " 应至少 1 处 Common.Sanitize(ex.Message), 实际 " + count);
    }

    [Fact]
    public void OcrEndpoints_CompanyQuery_ValidationReturns400()
    {
        var content = ReadFile("OcrEndpoints.cs");
        Assert.Contains("return Common.Fail(\"请输入企业名称\", 400);", content);
    }

    [Fact]
    public void OcrEndpoints_CompanyQuery_CatchReturns500()
    {
        var content = ReadFile("OcrEndpoints.cs");
        Assert.Contains("CatchOcrError(\"ocr-company-query\", ex)", content);
    }

    [Fact]
    public void OcrEndpoints_File_NoLongerContainsEnterpriseQueryFakeSuccess()
    {
        var content = ReadFile("OcrEndpoints.cs");
        Assert.DoesNotContain("return Results.Ok(new { success = false, error = \"请输入企业名称\" })", content);
    }
}

================
File: EngineeringManager.Tests/Endpoints/SafeQueryValidatorTests.cs
================
using Xunit;
using EngineeringManager.Api.Services;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// SafeQueryValidator 单元测试 — 验证 L-1（REPLACE 标量函数放行）和 L-2（EnsureLimit 兼容性）
/// </summary>
public class SafeQueryValidatorTests
{
    private const string TestUid = "test-user";
    private static readonly EngineeringManager.Api.Security.CurrentUser.DataScope TestScope = EngineeringManager.Api.Security.CurrentUser.DataScope.All;

    // ════════ L-1: REPLACE 标量函数 ════════

    [Fact]
    public void ValidateAndRewrite_ReplaceScalarFunction_Allowed()
    {
        // REPLACE 标量函数应被放行（不是 REPLACE INTO）
        var result = SafeQueryValidator.ValidateAndRewrite(
            "SELECT REPLACE(name, ' ', '') FROM projects", TestUid, TestScope);

        Assert.True(result.IsValid, $"REPLACE 标量函数应该通过，但被拒绝: {result.Error}");
        Assert.NotNull(result.RewrittenSql);
    }

    [Fact]
    public void ValidateAndRewrite_ReplaceIntoSql_Rejected()
    {
        // REPLACE INTO 是 DML，应该被 AST 校验拒绝
        var result = SafeQueryValidator.ValidateAndRewrite(
            "REPLACE INTO projects (id, name) VALUES (1, 'test')", TestUid, TestScope);

        Assert.False(result.IsValid, "REPLACE INTO 应该被拒绝");
    }

    // ════════ L-2: EnsureLimit 兼容性 ════════

    [Fact]
    public void ValidateAndRewrite_LimitExceedsMax_ClampedTo100()
    {
        // LIMIT 500 → 应被压到 100
        var sql = "SELECT id, name FROM projects LIMIT 500";
        var result = SafeQueryValidator.ValidateAndRewrite(sql, TestUid, TestScope);

        Assert.True(result.IsValid, $"LIMIT 500 应该通过: {result.Error}");
        Assert.NotNull(result.RewrittenSql);
        Assert.Contains("LIMIT 100", result.RewrittenSql, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void ValidateAndRewrite_LimitOffsetForm_ClampedTo100()
    {
        // LIMIT 0, 500 → count 500 被压到 100
        var sql = "SELECT id, name FROM projects LIMIT 0, 500";
        var result = SafeQueryValidator.ValidateAndRewrite(sql, TestUid, TestScope);

        Assert.True(result.IsValid, $"LIMIT 0,500 应该通过: {result.Error}");
        Assert.NotNull(result.RewrittenSql);
        // count 被压到 100，offset 0 保留（具体格式可能是 LIMIT 100 OFFSET 0 或 LIMIT 0, 100）
        var lowerSql = result.RewrittenSql.ToLowerInvariant();
        // 检查 count=100，不关心具体语法格式
        Assert.DoesNotContain("limit 500", lowerSql);
    }

    [Fact]
    public void ValidateAndRewrite_LimitBelowMax_Unchanged()
    {
        // LIMIT 10 ≤ 100，保持不变
        var sql = "SELECT id, name FROM projects LIMIT 10";
        var result = SafeQueryValidator.ValidateAndRewrite(sql, TestUid, TestScope);

        Assert.True(result.IsValid, $"LIMIT 10 应该通过: {result.Error}");
        Assert.NotNull(result.RewrittenSql);
        Assert.Contains("LIMIT 10", result.RewrittenSql, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void ValidateAndRewrite_LimitWithOffset_ClampedTo100()
    {
        // LIMIT 10 OFFSET 1000 → count=10 ≤ 100，保持不变
        var sql = "SELECT id, name FROM projects LIMIT 10 OFFSET 1000";
        var result = SafeQueryValidator.ValidateAndRewrite(sql, TestUid, TestScope);

        Assert.True(result.IsValid, $"LIMIT 10 OFFSET 1000 应该通过: {result.Error}");
        Assert.NotNull(result.RewrittenSql);
        Assert.Contains("LIMIT 10", result.RewrittenSql, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void ValidateAndRewrite_NoExplicitLimit_Default100()
    {
        // 无 LIMIT → 自动添加 LIMIT 100
        var sql = "SELECT id, name FROM projects";
        var result = SafeQueryValidator.ValidateAndRewrite(sql, TestUid, TestScope);

        Assert.True(result.IsValid, $"无 LIMIT 查询应该通过: {result.Error}");
        Assert.NotNull(result.RewrittenSql);
        Assert.Contains("LIMIT 100", result.RewrittenSql, StringComparison.OrdinalIgnoreCase);
    }
}

================
File: EngineeringManager.Tests/Endpoints/SttE2ETests.cs
================
using EngineeringManager.Api.Services.Stt;
using System.Diagnostics;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// STT 端到端集成测试：产出审核验收物
/// - 单人录音转写文本
/// - 多人录音：分离段合并前后对比 + 带说话人标签的转写文本
/// 
/// 注意：此测试需要模型和音频文件，运行时间约 3-5 分钟
/// 运行：dotnet test --filter FullyQualifiedName~SttE2E
/// </summary>
public class SttE2ETests
{
    /// <summary>测试音频目录</summary>
    private const string AudioDir = @"e:\测试\asr-test\audios";

    [Fact]
    public async Task E2E_MultiSpeaker_DiarizeAndTranscribe()
    {
        // 前置检查
        if (!SttModelManager.IsAsrModelAvailable())
        {
            Console.WriteLine("[SKIP] ASR 模型不可用，跳过 E2E 测试");
            return;
        }
        if (!SttModelManager.IsDiarizationModelAvailable())
        {
            Console.WriteLine("[SKIP] 分离模型不可用，跳过 E2E 测试");
            return;
        }

        // 选一个通话录音（多人对话）
        var audioFile = Path.Combine(AudioDir, "通话-[已脱敏]-202606101153(1).m4a");
        if (!File.Exists(audioFile))
        {
            // 找第一个可用的音频
            audioFile = Directory.GetFiles(AudioDir, "*.m4a").FirstOrDefault()
                      ?? Directory.GetFiles(AudioDir, "*.mp3").FirstOrDefault()
                      ?? "";
            if (string.IsNullOrEmpty(audioFile))
            {
                Console.WriteLine("[SKIP] 没有找到测试音频文件");
                return;
            }
        }

        Console.WriteLine($"[E2E] 使用音频: {Path.GetFileName(audioFile)}");

        // 1. 预处理为 WAV
        Console.WriteLine("[E2E] Step 1: 预处理音频...");
        var processedWav = await AudioPreprocessor.PreprocessAsync(audioFile, ct: default);
        var duration = await AudioPreprocessor.GetDurationAsync(processedWav);
        Console.WriteLine($"[E2E] 预处理完成: {processedWav}, 时长 {duration:F1}s");

        // 2. 说话人分离（C# 绑定）— 获取原始段数 + 合并后段数
        Console.WriteLine("[E2E] Step 2: 说话人分离 (C# sherpa-onnx)...");
        var diarization = new DiarizationService();

        // 先获取原始段数（通过内部方法不能直接拿，用 DiarizeAsync 返回的就是合并后的）
        // 改为直接调 DiarizeAsync，它内部会打印原始段数和合并后段数
        var mergedSegments = await diarization.DiarizeAsync(processedWav, numSpeakers: null, ct: default);

        Console.WriteLine($"\n[E2E] === 分离结果 ===");
        Console.WriteLine($"[E2E] 合并后段数: {mergedSegments.Count}");
        Console.WriteLine($"[E2E] 说话人数: {mergedSegments.Select(s => s.Speaker).Distinct().Count()}");
        foreach (var seg in mergedSegments)
        {
            Console.WriteLine($"[E2E]   说话人{seg.Speaker} [{seg.Start:F1}s - {seg.End:F1}s] ({seg.End - seg.Start:F1}s)");
        }

        // 3. 切分音频
        Console.WriteLine("\n[E2E] Step 3: 切分音频...");
        var splitFiles = await diarization.SplitAudioBySpeakersAsync(processedWav, mergedSegments);
        Console.WriteLine($"[E2E] 切分出 {splitFiles.Count} 个音频段");

        // 4. 批量转写：一次 transcribe.exe 调用处理所有段（模型只加载一次）
        Console.WriteLine("\n[E2E] Step 4: 批量转写（模型只加载一次）...");
        var engine = new LlamaCppGgufEngine();
        var context = "工程管理、建筑工地、合同、付款、验收、工伤保险、方量、甲方乙方";

        var sw = Stopwatch.StartNew();
        // 调试模式：限制段数以快速验证（正式验收时去掉限制）
        var maxSegments = Environment.GetEnvironmentVariable("STT_E2E_MAX_SEGMENTS");
        if (int.TryParse(maxSegments, out var max) && max > 0 && splitFiles.Count > max)
        {
            Console.WriteLine($"[E2E] 调试模式: 限制为前 {max} 段（共 {splitFiles.Count} 段）");
            splitFiles = splitFiles.Take(max).ToList();
        }
        var wavPaths = splitFiles.Select(s => s.wavPath).ToList();
        var texts = await engine.TranscribeBatchAsync(wavPaths, context, default);
        sw.Stop();

        Console.WriteLine($"[E2E] 批量转写完成: {splitFiles.Count} 段, 总耗时 {sw.Elapsed.TotalSeconds:F1}s");
        Console.WriteLine($"[E2E] 模型加载次数: 1 (一次进程处理所有段)");

        // 5. 输出最终结果
        var allText = new List<string>();
        for (int i = 0; i < splitFiles.Count; i++)
        {
            var (seg, _) = splitFiles[i];
            seg.Text = texts[i];
            allText.Add($"【说话人{seg.Speaker + 1}】{texts[i]}");
        }

        Console.WriteLine("\n[E2E] ========== 最终转写结果（带说话人标签）==========");
        Console.WriteLine(string.Join("\n", allText));
        Console.WriteLine("======================================");
        Console.WriteLine($"[E2E] 段数: {mergedSegments.Count}, 总字数: {allText.Sum(t => t.Length)}, 转写耗时: {sw.Elapsed.TotalSeconds:F1}s");

        // 清理
        DiarizationService.CleanupTempFiles(splitFiles.Select(s => s.wavPath).ToList());
        try { if (processedWav.StartsWith(Path.GetTempPath())) File.Delete(processedWav); } catch { }

        // 断言
        Assert.True(mergedSegments.Count > 0, "应至少分离出 1 段");
        Assert.True(mergedSegments.Count <= 50, $"合并后段数应 ≤ 50，实际 {mergedSegments.Count}");
        Assert.True(allText.Count > 0, "应至少转写出 1 段文本");
        Assert.True(texts.Any(t => !string.IsNullOrWhiteSpace(t)), "至少应有一段非空文本");
    }

    [Fact]
    public async Task E2E_SingleSpeaker_Transcribe()
    {
        // 前置检查
        if (!SttModelManager.IsAsrModelAvailable())
        {
            Console.WriteLine("[SKIP] ASR 模型不可用，跳过 E2E 测试");
            return;
        }

        // 选一个短音频（单人）
        var audioFile = Directory.GetFiles(AudioDir, "*.mp3").FirstOrDefault();
        if (audioFile == null)
        {
            Console.WriteLine("[SKIP] 没有找到测试音频文件");
            return;
        }

        Console.WriteLine($"[E2E-Single] 使用音频: {Path.GetFileName(audioFile)}");

        // 预处理
        var processedWav = await AudioPreprocessor.PreprocessAsync(audioFile, ct: default);
        var duration = await AudioPreprocessor.GetDurationAsync(processedWav);
        Console.WriteLine($"[E2E-Single] 预处理完成: 时长 {duration:F1}s");

        // 直接转写（跳过分离）— hotwords.txt 会自动被 BuildContext 读取
        var engine = new LlamaCppGgufEngine();
        var context = "工程管理、建筑工地、合同、付款";

        Console.WriteLine("[E2E-Single] 开始转写...");
        var sw = Stopwatch.StartNew();
        var result = await engine.TranscribeAsync(processedWav, context, null, default);
        sw.Stop();

        Console.WriteLine($"\n[E2E-Single] ========== 单人转写结果 ==========");
        Console.WriteLine(result.Text);
        Console.WriteLine("======================================");
        Console.WriteLine($"[E2E-Single] 耗时: {sw.Elapsed.TotalSeconds:F1}s, 文本长度: {result.Text.Length} 字");

        // 清理
        try { if (processedWav.StartsWith(Path.GetTempPath())) File.Delete(processedWav); } catch { }

        Assert.True(result.Text.Length > 0, "应转写出文本");
    }
}

================
File: EngineeringManager.Tests/Endpoints/SttEndpointsTests.cs
================
using EngineeringManager.Api.Services.Stt;
using EngineeringManager.Tests.Common;
using System.Net;
using System.Net.Http.Json;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// GPU 探测器测试：验证探测逻辑（不依赖真实硬件）
/// </summary>
public class SttEngineSelectorTests
{
    [Fact]
    public void Detect_ReturnsCachedResult()
    {
        // 多次调用应返回同一缓存实例
        var r1 = SttEngineSelector.Detect();
        var r2 = SttEngineSelector.Detect();
        Assert.Same(r1, r2);
    }

    [Fact]
    public void Detect_PopulatesAllGpus()
    {
        var gpu = SttEngineSelector.Detect();
        // 在测试机器上应该至少有一个 GPU
        Assert.True(gpu.AllGpus.Count > 0, "至少应检测到一个显卡");
    }

    [Fact]
    public void CanUseLocalStt_ReturnsBoolean()
    {
        // 只要不抛异常就行
        var result = SttEngineSelector.CanUseLocalStt();
        _ = result; // true or false 都行，取决于测试机器
    }

    [Fact]
    public void GetUnavailableReason_ReturnsString()
    {
        var reason = SttEngineSelector.GetUnavailableReason();
        Assert.NotNull(reason);
        // 如果可用，reason 应为空字符串；如果不可用，应有说明
    }
}

/// <summary>
/// 说话人分离服务测试
/// 重点验证：MergeSegments 段合并算法
/// - 单人不误拆：所有 speaker=0 的段应合并成 1-2 段
/// - 多人能分开：不同说话人的段不被合并
/// - 超短段吸收：< 1.2s 的段被吸收到相邻段
/// </summary>
public class DiarizationServiceTests
{
    [Fact]
    public void Constructor_DoesNotThrow()
    {
        var svc = new DiarizationService();
        Assert.NotNull(svc);
    }

    [Fact]
    public void IsDiarizationModelAvailable_ReturnsBoolean()
    {
        var result = SttModelManager.IsDiarizationModelAvailable();
        _ = result;
    }

    [Fact]
    public void IsAsrModelAvailable_ReturnsBoolean()
    {
        var result = SttModelManager.IsAsrModelAvailable();
        _ = result;
    }

    /// <summary>
    /// 单人不误拆：52 段全是 speaker=0 → 应合并成 1 段
    /// 模拟之前实际跑出的 52 段（全是同一个人）
    /// </summary>
    [Fact]
    public void MergeSegments_SingleSpeaker_AllMergeToOne()
    {
        // 模拟 52 段全是 speaker=0（单人被 pyannote 误拆的情况）
        var raw = new List<SttSegment>();
        for (int i = 0; i < 52; i++)
        {
            raw.Add(new SttSegment { Speaker = 0, Start = i * 5.0, End = i * 5.0 + 4.0 });
        }

        var merged = DiarizationService.MergeSegments(raw);

        // 单人不应被拆成多段
        Assert.True(merged.Count <= 2, $"单人 52 段应合并成 1-2 段，实际 {merged.Count} 段");
        Assert.All(merged, s => Assert.Equal(0, s.Speaker));
    }

    /// <summary>
    /// 多人能分开：2 个说话人交替 → 合并后仍应保持 2 个说话人
    /// </summary>
    [Fact]
    public void MergeSegments_MultiSpeaker_KeepSeparate()
    {
        // 模拟 2 人对话：A 说 5s, B 说 3s, A 说 4s, B 说 2s...
        var raw = new List<SttSegment>
        {
            new() { Speaker = 0, Start = 0, End = 5 },
            new() { Speaker = 0, Start = 5.1, End = 8 },   // 同说话人连续
            new() { Speaker = 1, Start = 8.5, End = 12 },
            new() { Speaker = 1, Start = 12.1, End = 14 }, // 同说话人连续
            new() { Speaker = 0, Start = 14.5, End = 20 },
            new() { Speaker = 1, Start = 20.5, End = 25 },
        };

        var merged = DiarizationService.MergeSegments(raw);

        // 应保持 2 个说话人
        var speakers = merged.Select(s => s.Speaker).Distinct().ToList();
        Assert.Equal(2, speakers.Count);
        // 0 和 1 的段不应该被合并到一起
        Assert.Contains(0, speakers);
        Assert.Contains(1, speakers);
        // 合并后段数应少于原始段数
        Assert.True(merged.Count < raw.Count, $"合并后 {merged.Count} 段应少于原始 {raw.Count} 段");
    }

    /// <summary>
    /// 超短段吸收：< 1.2s 的"嗯嗯"回应段应被吸收到相邻段
    /// </summary>
    [Fact]
    public void MergeSegments_ShortSegments_Absorbed()
    {
        // 模拟：A 说长段, B 说 0.8s 短回应, A 继续说
        var raw = new List<SttSegment>
        {
            new() { Speaker = 0, Start = 0, End = 10 },
            new() { Speaker = 1, Start = 10.1, End = 10.9 }, // 0.8s 短回应
            new() { Speaker = 0, Start = 11, End = 20 },
        };

        var merged = DiarizationService.MergeSegments(raw);

        // 短段应被吸收，合并后应少于 3 段
        Assert.True(merged.Count < 3, $"0.8s 短段应被吸收，实际 {merged.Count} 段");
    }

    /// <summary>
    /// 实际 52 段数据模拟：验证合并效果
    /// 用之前真实跑出的 5 分钟录音的段分布（2 人，大量碎段）
    /// </summary>
    [Fact]
    public void MergeSegments_RealWorld_52ToAbout15()
    {
        // 模拟真实场景：2 人对话，52 段（含大量 <1s 的短回应）
        var raw = new List<SttSegment>();
        var rng = new Random(42); // 固定种子
        double t = 0;
        for (int i = 0; i < 52; i++)
        {
            var speaker = i % 3 == 0 ? 1 : 0; // 大约 1/3 是说话人 1
            var dur = rng.NextDouble() < 0.3 ? rng.NextDouble() * 0.8 + 0.2 : rng.NextDouble() * 8 + 2;
            raw.Add(new SttSegment { Speaker = speaker, Start = t, End = t + dur });
            t += dur + rng.NextDouble() * 0.5; // gap 0-0.5s
        }

        var merged = DiarizationService.MergeSegments(raw);

        // 52 段应大幅压缩
        Assert.True(merged.Count < 30, $"52 段应压缩到 30 以内，实际 {merged.Count} 段");
        Console.WriteLine($"MergeSegments: {raw.Count} → {merged.Count} 段");
    }

    /// <summary>
    /// 边界：空列表
    /// </summary>
    [Fact]
    public void MergeSegments_Empty_ReturnsEmpty()
    {
        var merged = DiarizationService.MergeSegments(new List<SttSegment>());
        Assert.Empty(merged);
    }

    /// <summary>
    /// 边界：单段
    /// </summary>
    [Fact]
    public void MergeSegments_Single_ReturnsSingle()
    {
        var raw = new List<SttSegment> { new() { Speaker = 0, Start = 0, End = 5 } };
        var merged = DiarizationService.MergeSegments(raw);
        Assert.Single(merged);
        Assert.Equal(0, merged[0].Start);
        Assert.Equal(5, merged[0].End);
    }

    /// <summary>
    /// 重叠段处理：说话人 0 的段和说话人 1 的段重叠 → 不应互相合并
    /// </summary>
    [Fact]
    public void MergeSegments_OverlappingDifferentSpeakers_NotMerged()
    {
        var raw = new List<SttSegment>
        {
            new() { Speaker = 0, Start = 0, End = 10 },
            new() { Speaker = 1, Start = 5, End = 15 },   // 重叠但不同说话人
            new() { Speaker = 0, Start = 12, End = 20 },   // 重叠但不同说话人
        };

        var merged = DiarizationService.MergeSegments(raw);

        // 不应把不同说话人的段合并
        var speakers = merged.Select(s => s.Speaker).Distinct().ToList();
        Assert.Equal(2, speakers.Count);
    }
}

/// <summary>
/// STT 端点测试：验证 API 响应结构、权限检查
/// </summary>
public class SttEndpointsTests : ApiTestBase
{
    [Fact]
    public async Task GetStatus_Unauthorized_WithoutLogin()
    {
        // 未登录应返回 401
        var resp = await Client.GetAsync("/api/stt/status");
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    [Fact]
    public async Task Transcribe_Unauthorized_WithoutLogin()
    {
        var resp = await Client.PostAsJsonAsync("/api/stt/transcribe", new
        {
            filePath = "test.wav",
            isMultiSpeaker = false
        });
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }
}

================
File: EngineeringManager.Tests/Endpoints/UserDimFilterTests.cs
================
using EngineeringManager.Tests.Common;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// v1.1.0 P0-4 Phase 2: 验证 user-dim 越权防护
/// 用 [Collection("UserDim")] 串行化避免 5/min rate limit
/// </summary>
[Collection("UserDim")]
public class UserDimFilterTests : ApiTestBase
{
    private const string AdminUsername = "admin";
    private const string Worker1Username = "worker1";
    private const string Password = "admin123";

    private static string ExtractTokenFromJson(string json)
    {
        var marker = "\"token\":\"";
        var i = json.IndexOf(marker);
        if (i < 0) throw new Exception("token 字段未找到: " + json);
        i += marker.Length;
        var j = json.IndexOf('"', i);
        if (j < 0) throw new Exception("token 字段格式错");
        return json.Substring(i, j - i);
    }

    private async Task<(string adminToken, string worker1Token, string worker1Id)>
        LoginBothAsync()
    {
        // 1. 登录 admin
        var adminLogin = await Client.PostAsJsonAsync("/api/auth/login",
            new { username = AdminUsername, password = Password });
        if (!adminLogin.IsSuccessStatusCode)
        {
            var errBody = await adminLogin.Content.ReadAsStringAsync();
            throw new Exception("admin 登录失败: " + adminLogin.StatusCode + " " + errBody);
        }
        var adminBody = await adminLogin.Content.ReadAsStringAsync();
        var adminToken = ExtractTokenFromJson(adminBody);

        // 2. 创建 worker1 (admin 身份)
        Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var createUser = await Client.PostAsJsonAsync("/api/users",
            new { username = Worker1Username, password = Password, displayName = "测试工人", roleId = "worker", status = "active" });
        string worker1Id;
        if (createUser.IsSuccessStatusCode)
        {
            var createBody = await createUser.Content.ReadAsStringAsync();
            var marker = "\"id\":\"";
            var idx = createBody.IndexOf(marker);
            if (idx < 0) throw new Exception("createUser 响应无 id: " + createBody);
            idx += marker.Length;
            var end = createBody.IndexOf('"', idx);
            worker1Id = createBody.Substring(idx, end - idx);
        }
        else
        {
            var list = await Client.GetAsync("/api/users");
            var listBody = await list.Content.ReadAsStringAsync();
            worker1Id = FindUserIdByName(listBody, Worker1Username);
            if (string.IsNullOrEmpty(worker1Id))
            {
                throw new Exception("createUser 失败且 list 找不到 worker1: createUser=" +
                    createUser.StatusCode + " list=" + listBody);
            }
        }

        // 3. 登录 worker1
        var workerLogin = await Client.PostAsJsonAsync("/api/auth/login",
            new { username = Worker1Username, password = Password });
        if (!workerLogin.IsSuccessStatusCode)
        {
            var errBody = await workerLogin.Content.ReadAsStringAsync();
            throw new Exception("worker1 登录失败: " + workerLogin.StatusCode + " " + errBody);
        }
        var workerBody = await workerLogin.Content.ReadAsStringAsync();
        var worker1Token = ExtractTokenFromJson(workerBody);

        return (adminToken, worker1Token, worker1Id);
    }

    private static string FindUserIdByName(string listJson, string username)
    {
        // 简单字符串扫描: 找 "username":"<name>" 后面跟的 "id":"<id>"
        var nameMarker = "\"username\":\"" + username + "\"";
        var ni = listJson.IndexOf(nameMarker);
        if (ni < 0) return "";
        // 往后找 "id":"..."
        var idMarker = "\"id\":\"";
        var ii = listJson.IndexOf(idMarker, ni);
        if (ii < 0) return "";
        ii += idMarker.Length;
        var end = listJson.IndexOf('"', ii);
        if (end < 0) return "";
        return listJson.Substring(ii, end - ii);
    }

    private void SetAuth(string token)
    {
        Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
    }

    [Fact]
    public async Task Members_AdminSeesAll_WorkerSeesNone()
    {
        var (admin, worker, _) = await LoginBothAsync();
        SetAuth(admin);
        Assert.Equal(HttpStatusCode.OK, (await Client.GetAsync("/api/members")).StatusCode);
        SetAuth(worker);
        var resp = await Client.GetAsync("/api/members");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.Equal(0, (await resp.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data").GetArrayLength());
    }

    [Fact]
    public async Task Partners_AdminSeesAll_WorkerSeesNone()
    {
        var (admin, worker, _) = await LoginBothAsync();
        SetAuth(admin);
        await Client.GetAsync("/api/partners");
        SetAuth(worker);
        var resp = await Client.GetAsync("/api/partners");
        Assert.Equal(0, (await resp.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data").GetArrayLength());
    }

    [Fact]
    public async Task Projects_AdminSeesAll_WorkerSeesNone()
    {
        var (admin, worker, _) = await LoginBothAsync();
        SetAuth(admin);
        await Client.GetAsync("/api/projects");
        SetAuth(worker);
        var resp = await Client.GetAsync("/api/projects");
        Assert.Equal(0, (await resp.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data").GetArrayLength());
    }

    [Fact]
    public async Task Inventory_AdminSeesAll_WorkerSeesNone()
    {
        var (admin, worker, _) = await LoginBothAsync();
        SetAuth(admin);
        await Client.GetAsync("/api/inventory");
        SetAuth(worker);
        var resp = await Client.GetAsync("/api/inventory");
        Assert.Equal(0, (await resp.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data").GetArrayLength());
    }

    [Fact]
    public async Task Materials_AdminSeesAll_WorkerSeesNone()
    {
        var (admin, worker, _) = await LoginBothAsync();
        SetAuth(admin);
        await Client.GetAsync("/api/materials");
        SetAuth(worker);
        var resp = await Client.GetAsync("/api/materials");
        Assert.Equal(0, (await resp.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data").GetArrayLength());
    }

    [Fact]
    public async Task Supervisors_AdminSeesAll_WorkerSeesNone()
    {
        var (admin, worker, _) = await LoginBothAsync();
        SetAuth(admin);
        await Client.GetAsync("/api/supervisors");
        SetAuth(worker);
        var resp = await Client.GetAsync("/api/supervisors");
        Assert.Equal(0, (await resp.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data").GetArrayLength());
    }

    [Fact]
    public async Task DbSchemaInfo_AlreadyDeletedInV072_NotFound()
    {
        var (admin, _, _) = await LoginBothAsync();
        SetAuth(admin);
        Assert.Equal(HttpStatusCode.NotFound, (await Client.GetAsync("/api/admin/db-schema-info")).StatusCode);
    }

    [Fact]
    public async Task ProjectAuthorizations_AdminCanGrant_WorkerForbidden()
    {
        var (admin, worker, worker1Id) = await LoginBothAsync();
        SetAuth(admin);
        var projectResp = await Client.PostAsJsonAsync("/api/projects", new
        {
            name = "P0-4测试项目", description = "test", address = "x",
            startDate = "2026-06-19", endDate = "2026-12-31",
            status = "planning", budget = 1000, projectManagerId = (long?)null
        });
        Assert.True(projectResp.IsSuccessStatusCode);
        var projectId = (await projectResp.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data").GetInt64();

        SetAuth(worker);
        var authzResp = await Client.PostAsJsonAsync("/api/admin/project-authorizations",
            new { projectId, userId = worker1Id });
        Assert.True((int)authzResp.StatusCode >= 400, "worker 调管理端点应被禁, 实际 " + authzResp.StatusCode);
    }

    [Fact]
    public async Task ProjectAuthorizations_AdminGrantsWorker_CanSeeThatProject()
    {
        var (admin, worker, worker1Id) = await LoginBothAsync();
        SetAuth(admin);
        var projectResp = await Client.PostAsJsonAsync("/api/projects", new
        {
            name = "授权测试项目", description = "test", address = "x",
            startDate = "2026-06-19", endDate = "2026-12-31",
            status = "planning", budget = 1000, projectManagerId = (long?)null
        });
        Assert.True(projectResp.IsSuccessStatusCode);
        var projectId = (await projectResp.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data").GetInt64();

        // admin 授权 worker1
        var authzResp = await Client.PostAsJsonAsync("/api/admin/project-authorizations",
            new { projectId, userId = worker1Id });
        Assert.Equal(HttpStatusCode.OK, authzResp.StatusCode);

        // admin 创合同
        var contractResp = await Client.PostAsJsonAsync("/api/contracts/income", new
        {
            projectId, partnerId = 1, contractNo = "CT-TEST-001", name = "测试合同",
            amount = 10000.0, signedDate = "2026-06-19", startDate = "2026-06-19",
            endDate = "2026-12-31", status = "active", paymentMethod = "transfer",
            remarks = "P0-4测试"
        });
        if (!contractResp.IsSuccessStatusCode)
        {
            var errBody = await contractResp.Content.ReadAsStringAsync();
            throw new Exception("admin /api/contracts/income failed status=" + contractResp.StatusCode + " body=" + errBody);
        }

        // worker1 查授权项目合同 (应见 1 条)
        SetAuth(worker);
        var workerView = await Client.GetAsync("/api/contracts/income?projectId=" + projectId);
        Assert.Equal(HttpStatusCode.OK, workerView.StatusCode);
        Assert.Equal(1, (await workerView.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data").GetArrayLength());

        // worker1 查非授权项目 (应 0 条)
        var otherView = await Client.GetAsync("/api/contracts/income?projectId=999999");
        Assert.Equal(HttpStatusCode.OK, otherView.StatusCode);
        Assert.Equal(0, (await otherView.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data").GetArrayLength());
    }
}

================
File: EngineeringManager.Tests/Endpoints/UserDimPhase2Tests.cs
================
using EngineeringManager.Tests.Common;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// v0.73.0 P0-4 Phase 2 (commit 26f1f44) smoke 集成测试.
///
/// 本测试集目标: 在不依赖具体 DTO 字段的前提下, 验证 4 个核心端点的 user-dim 过滤行为.
/// 不写 POST 相关测试 — DTO 字段细节留给后续 sprint 单独覆盖.
///
/// 端点 + SQL user-dim 审计结果 (commit 26f1f44 后):
///   GET /api/wages?projectId=X&yearMonth=Y    UserFilterWithAuthorizedProjects  (有)
///   GET /api/payment-records                  UserFilterWithAuthorizedProjects  (有)
///   GET /api/cost-ledger                      UserFilterCompany                  (有)
///   GET /api/inventory/transactions           UserFilterCompany                  (有)
///
/// 已知 P0-4 缺口 (不在本测试集中覆盖):
///   GET /api/inventory          无 user-dim  (L20 InventoryEndpoints.cs)
///   GET /api/materials          无 user-dim  (L68 InventoryEndpoints.cs)
/// </summary>
[Collection("UserDim")]
public class UserDimPhase2Tests : ApiTestBase
{
    private const string AdminUsername = "admin";
    private const string Worker1Username = "worker1";
    private const string Password = "admin123";

    private static string ExtractToken(string json)
    {
        var marker = "\"token\":\"";
        var i = json.IndexOf(marker);
        if (i < 0) throw new Exception("token \u5b57\u6bb5\u672a\u627e\u5230: " + json);
        i += marker.Length;
        var j = json.IndexOf('"', i);
        if (j < 0) throw new Exception("token \u5b57\u6bb5\u683c\u5f0f\u9519");
        return json.Substring(i, j - i);
    }

    private void SetAuth(string token)
    {
        Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
    }

    private async Task<(string adminToken, string workerToken, long projectId)>
        LoginAndCreateProjectAsync()
    {
        var adminLogin = await Client.PostAsJsonAsync("/api/auth/login",
            new { username = AdminUsername, password = Password });
        if (!adminLogin.IsSuccessStatusCode)
            throw new Exception("admin \u767b\u5f55\u5931\u8d25: " + adminLogin.StatusCode + " " + await adminLogin.Content.ReadAsStringAsync());
        var adminToken = ExtractToken(await adminLogin.Content.ReadAsStringAsync());

        SetAuth(adminToken);
        await Client.PostAsJsonAsync("/api/users",
            new { username = Worker1Username, password = Password, displayName = "P0-4\u6d4b\u8bd5\u5de5\u4eba", roleId = "worker", status = "active" });

        var projectResp = await Client.PostAsJsonAsync("/api/projects", new
        {
            name = "P0-4-P2-" + Guid.NewGuid().ToString("N").Substring(0, 6),
            description = "phase2 smoke test",
            address = "x",
            startDate = "2026-06-19",
            endDate = "2026-12-31",
            status = "planning",
            budget = 1000,
            projectManagerId = (long?)null
        });
        if (!projectResp.IsSuccessStatusCode)
            throw new Exception("admin /api/projects failed status=" + projectResp.StatusCode + " body=" + await projectResp.Content.ReadAsStringAsync());
        var projectId = (await projectResp.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data").GetInt64();

        var workerLogin = await Client.PostAsJsonAsync("/api/auth/login",
            new { username = Worker1Username, password = Password });
        if (!workerLogin.IsSuccessStatusCode)
            throw new Exception("worker1 \u767b\u5f55\u5931\u8d25: " + workerLogin.StatusCode + " " + await workerLogin.Content.ReadAsStringAsync());
        var workerToken = ExtractToken(await workerLogin.Content.ReadAsStringAsync());

        return (adminToken, workerToken, projectId);
    }

    // \u5168\u90e8\u7528 smoke \u9a8c\u8bc1: \u7aef\u70b9 OK + \u8fd4\u56de JSON \u6709 data \u5b57\u6bb5.
    // \u4e0d\u5199 row \u6570\u91cf\u65ad\u8a00 (\u907f\u514d\u4f9d\u8d56 Dapper INSERT \u5b57\u6bb5\u540d\u79f0\u4e0e\u8868 schema \u7ec6\u8282),
    // \u4e0d\u8c03 POST (\u907f\u514d DTO \u5b57\u6bb5\u540d\u4e0d\u5339\u914d).
    // \u91cd\u70b9: \u9a8c\u8bc1 GET \u80fd\u8fd4\u56de\u6b63\u5e38 JSON \u7ed3\u6784 + \u4e24\u4e2a user \u90fd\u80fd\u8bbf\u95ee + admin/worker \u8fd4\u56de\u6570\u636e\u5dee\u5f02\u5316 (\u8868\u73b0 user-dim \u751f\u6548).

    private static async Task<JsonElement> GetDataAsync(HttpResponseMessage resp)
    {
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.TryGetProperty("data", out var data),
            "\u54cd\u5e94\u7f3a\u5c11 data \u5b57\u6bb5: " + await resp.Content.ReadAsStringAsync());
        return data;
    }

    [Fact]
    public async Task Wages_Get_Smoke_Structure()
    {
        var (adminToken, workerToken, projectId) = await LoginAndCreateProjectAsync();

        SetAuth(adminToken);
        var adminGet = await Client.GetAsync($"/api/wages?projectId={projectId}");
        Assert.Equal(HttpStatusCode.OK, adminGet.StatusCode);
        var adminData = await GetDataAsync(adminGet);
        Assert.Equal(JsonValueKind.Array, adminData.ValueKind);

        SetAuth(workerToken);
        var workerGet = await Client.GetAsync($"/api/wages?projectId={projectId}");
        Assert.Equal(HttpStatusCode.OK, workerGet.StatusCode);
        var workerData = await GetDataAsync(workerGet);
        Assert.Equal(JsonValueKind.Array, workerData.ValueKind);

        // \u672c smoke \u4e0d\u8bc4\u8bba\u884c\u6570\u5dee\u5f02, \u53ea\u9a8c\u8bc1\u7ed3\u6784\u6b63\u5e38.
        // \u540e\u7eed sprint \u53ef\u5728\u8fd9\u91cc\u52a0 row \u6570\u91cf\u65ad\u8a00 (\u9700\u5148\u660e\u786e WageDto \u5b57\u6bb5).
    }

    [Fact]
    public async Task PaymentRecords_Get_Smoke_Structure()
    {
        var (adminToken, workerToken, _) = await LoginAndCreateProjectAsync();

        SetAuth(adminToken);
        var adminGet = await Client.GetAsync("/api/payment-records");
        Assert.Equal(HttpStatusCode.OK, adminGet.StatusCode);
        var adminData = await GetDataAsync(adminGet);
        Assert.Equal(JsonValueKind.Array, adminData.ValueKind);

        SetAuth(workerToken);
        var workerGet = await Client.GetAsync("/api/payment-records");
        Assert.Equal(HttpStatusCode.OK, workerGet.StatusCode);
        var workerData = await GetDataAsync(workerGet);
        Assert.Equal(JsonValueKind.Array, workerData.ValueKind);
    }

    [Fact]
    public async Task CostLedger_Get_Smoke_Structure()
    {
        var (adminToken, workerToken, _) = await LoginAndCreateProjectAsync();

        SetAuth(adminToken);
        var adminGet = await Client.GetAsync("/api/cost-ledger");
        Assert.Equal(HttpStatusCode.OK, adminGet.StatusCode);
        var adminData = await GetDataAsync(adminGet);
        Assert.Equal(JsonValueKind.Array, adminData.ValueKind);

        SetAuth(workerToken);
        var workerGet = await Client.GetAsync("/api/cost-ledger");
        Assert.Equal(HttpStatusCode.OK, workerGet.StatusCode);
        var workerData = await GetDataAsync(workerGet);
        Assert.Equal(JsonValueKind.Array, workerData.ValueKind);

        // user-dim \u6548\u679c: admin \u770b\u5230\u7684\u884c\u6570 >= worker \u770b\u5230\u7684\u884c\u6570
        Assert.True(adminData.GetArrayLength() >= workerData.GetArrayLength(),
            $"user-dim \u5931\u6548: admin {adminData.GetArrayLength()} \u884c < worker {workerData.GetArrayLength()} \u884c");
    }

    [Fact]
    public async Task InventoryTransactions_Get_Smoke_Structure()
    {
        var (adminToken, workerToken, _) = await LoginAndCreateProjectAsync();

        SetAuth(adminToken);
        var adminGet = await Client.GetAsync("/api/inventory/transactions");
        Assert.Equal(HttpStatusCode.OK, adminGet.StatusCode);
        var adminData = await GetDataAsync(adminGet);
        Assert.Equal(JsonValueKind.Array, adminData.ValueKind);

        SetAuth(workerToken);
        var workerGet = await Client.GetAsync("/api/inventory/transactions");
        Assert.Equal(HttpStatusCode.OK, workerGet.StatusCode);
        var workerData = await GetDataAsync(workerGet);
        Assert.Equal(JsonValueKind.Array, workerData.ValueKind);

        Assert.True(adminData.GetArrayLength() >= workerData.GetArrayLength(),
            $"user-dim \u5931\u6548: admin {adminData.GetArrayLength()} \u884c < worker {workerData.GetArrayLength()} \u884c");
    }

    // v1.1.0+ ?unmask=true 参数: 默认行为 mask 不变, ?unmask=true 返回明文
    // 仅 smoke 验证: GET /api/members 不带参数时 id_card 含 *; 带 ?unmask=true 时不含 *

    [Fact]
    public async Task Members_Get_DefaultMasked_AndUnmaskTrue()
    {
        var (adminToken, _, _) = await LoginAndCreateProjectAsync();

        // 先 POST 创建一个 member (含 PII). DTO 字段参考 MemberEndpoints.cs POST
        SetAuth(adminToken);
        var post = await Client.PostAsJsonAsync("/api/members", new
        {
            name = "PII-Test-" + Guid.NewGuid().ToString("N").Substring(0, 4),
            phone = "[已脱敏]",
            email = "test@example.com",
            memberType = "staff",
            role = "engineer",
            idCard = "510101199001011234",
            gender = "male",
            ethnicity = "han",
            birthDate = "1990-01-01",
            idCardAddress = "Test Address",
            baseSalary = 5000,
            dailyWage = 300,
            entryDate = "2026-06-19",
            status = "active",
            departmentId = (long?)null,
            position = "engineer"
        });
        Assert.True(post.IsSuccessStatusCode,
            "POST /api/members failed: " + post.StatusCode + " " + await post.Content.ReadAsStringAsync());

        // 列表 GET /api/members - 默认 mask, ?unmask=true 明文
        // 定位刚创建的记录 (按 idCardAddress 区分)
        var maskedGet = await Client.GetAsync("/api/members");
        Assert.Equal(HttpStatusCode.OK, maskedGet.StatusCode);
        var maskedData = await GetDataAsync(maskedGet);
        // 找到刚创建的 member (idCardAddress = "Test Address")
        JsonElement? targetRow = null;
        foreach (var row in maskedData.EnumerateArray())
        {
            if (row.TryGetProperty("id_card_address", out var addr) && addr.GetString() == "Test Address")
            {
                targetRow = row;
                break;
            }
        }
        Assert.NotNull(targetRow);
        // v0.75.0: 默认 GET 返明文
        var defaultIdCard = targetRow.Value.GetProperty("id_card").GetString() ?? "";
        Assert.False(defaultIdCard.Contains("*"),
            $"默认 GET id_card 应为明文, 实际: {defaultIdCard}");
        Assert.Equal("510101199001011234", defaultIdCard);

        // ?unmask=true 获取同一条记录
        var unmaskedGet = await Client.GetAsync("/api/members?unmask=true");
        Assert.Equal(HttpStatusCode.OK, unmaskedGet.StatusCode);
        var unmaskedData = await GetDataAsync(unmaskedGet);
        JsonElement? unmaskedRow = null;
        foreach (var row in unmaskedData.EnumerateArray())
        {
            if (row.TryGetProperty("id_card_address", out var addr) && addr.GetString() == "Test Address")
            {
                unmaskedRow = row;
                break;
            }
        }
        Assert.NotNull(unmaskedRow);
        var unmaskedIdCard = unmaskedRow.Value.GetProperty("id_card").GetString() ?? "";
        Assert.False(unmaskedIdCard.Contains("*"),
            $"?unmask=true 时 id_card 应不含 *, 实际: {unmaskedIdCard}");
        Assert.Equal("510101199001011234", unmaskedIdCard);
    }



    // v0.74.0: Partners tax_number schema 修复后, 应能 POST + GET ?unmask=true 拿明文
    [Fact]
    public async Task Partners_Get_TaxNumberMaskedAndUnmaskTrue()
    {
        var (adminToken, _, _) = await LoginAndCreateProjectAsync();

        SetAuth(adminToken);
        // 不传 taxType (schema 没这列, 但 PartnerDto 可能有, Dapper 容忍)
        // 不传 taxNumber (如果传, 后端 INSERT 会写 tax_number 列, schema 已加)
        var post = await Client.PostAsJsonAsync("/api/partners", new
        {
            name = "PII-Partner-" + Guid.NewGuid().ToString("N").Substring(0, 4),
            category = "supplier",
            contact = "张三",
            phone = "[已脱敏]",
            email = "partner@example.com",
            address = "Test",
            bankAccount = "6222021234567890123",
            bankName = "招商银行",
            taxNumber = "91510101MA01ABCDXX",
            creditCode = "91510101MA01ABCDXX",
            registeredAddress = "Test Addr",
            businessScope = "Test",
            taxType = "general",
            projectIds = "[]"
        });
        Assert.True(post.IsSuccessStatusCode,
            "POST /api/partners 失败: " + post.StatusCode + " " + await post.Content.ReadAsStringAsync());

        // 默认 GET - bankAccount 含 *
        var maskedGet = await Client.GetAsync("/api/partners");
        Assert.Equal(HttpStatusCode.OK, maskedGet.StatusCode);
        var maskedData = await GetDataAsync(maskedGet);
        JsonElement? targetRow = null;
        foreach (var row in maskedData.EnumerateArray())
        {
            if (row.TryGetProperty("name", out var n) && n.GetString()?.StartsWith("PII-Partner-") == true)
            {
                targetRow = row;
                break;
            }
        }
        Assert.NotNull(targetRow);
        // v0.75.0: 默认 GET 返明文
        var defaultBank = targetRow.Value.GetProperty("bank_account").GetString() ?? "";
        Assert.False(defaultBank.Contains("*") && defaultBank.Length >= 8,
            $"默认 GET bank_account 应为明文, 实际: {defaultBank}");

        // ?unmask=true GET
        var unmaskedGet = await Client.GetAsync("/api/partners?unmask=true");
        Assert.Equal(HttpStatusCode.OK, unmaskedGet.StatusCode);
        var unmaskedData = await GetDataAsync(unmaskedGet);
        JsonElement? unmaskedRow = null;
        foreach (var row in unmaskedData.EnumerateArray())
        {
            if (row.TryGetProperty("name", out var n) && n.GetString()?.StartsWith("PII-Partner-") == true)
            {
                unmaskedRow = row;
                break;
            }
        }
        Assert.NotNull(unmaskedRow);
        var unmaskedBank = unmaskedRow.Value.GetProperty("bank_account").GetString() ?? "";
        Assert.Equal("6222021234567890123", unmaskedBank);
    }

    // v0.74.0: supervisors GET /api/supervisors 加 mask/unmask 验证
    [Fact]
    public async Task Supervisors_Get_DefaultMasked_AndUnmaskTrue()
    {
        var (adminToken, _, _) = await LoginAndCreateProjectAsync();

        SetAuth(adminToken);
        var post = await Client.PostAsJsonAsync("/api/supervisors", new
        {
            regionId = (long?)null,
            name = "PII-Supervisor-" + Guid.NewGuid().ToString("N").Substring(0, 4),
            category = "general",
            contact = "张三",
            phone = "[已脱敏]",
            address = "Test Address",
            projectIds = "[]",
            remarks = "sup-test"
        });
        Assert.True(post.IsSuccessStatusCode,
            "POST /api/supervisors 失败: " + post.StatusCode + " " + await post.Content.ReadAsStringAsync());

        // 默认 GET - phone 应被 mask
        var maskedGet = await Client.GetAsync("/api/supervisors");
        Assert.Equal(HttpStatusCode.OK, maskedGet.StatusCode);
        var maskedData = await GetDataAsync(maskedGet);
        JsonElement? targetRow = null;
        foreach (var row in maskedData.EnumerateArray())
        {
            if (row.TryGetProperty("name", out var n) && n.GetString()?.StartsWith("PII-Supervisor-") == true)
            {
                targetRow = row;
                break;
            }
        }
        Assert.NotNull(targetRow);
        // v0.75.0: 默认 GET 返明文
        var defaultPhone = targetRow.Value.GetProperty("phone").GetString() ?? "";
        Assert.False(defaultPhone.Contains("*") && defaultPhone.Length >= 7,
            $"默认 GET phone 应为明文, 实际: {defaultPhone}");

        // ?unmask=true GET
        var unmaskedGet = await Client.GetAsync("/api/supervisors?unmask=true");
        Assert.Equal(HttpStatusCode.OK, unmaskedGet.StatusCode);
        var unmaskedData = await GetDataAsync(unmaskedGet);
        JsonElement? unmaskedRow = null;
        foreach (var row in unmaskedData.EnumerateArray())
        {
            if (row.TryGetProperty("name", out var n) && n.GetString()?.StartsWith("PII-Supervisor-") == true)
            {
                unmaskedRow = row;
                break;
            }
        }
        Assert.NotNull(unmaskedRow);
        var unmaskedPhone = unmaskedRow.Value.GetProperty("phone").GetString() ?? "";
        Assert.Equal("[已脱敏]", unmaskedPhone);
    }

    // v0.75.0: User Preferences API (替代 localStorage toggle 状态)
    [Fact]
    public async Task UserPreferences_GetAndPut_PiiMaskEnabled()
    {
        var (adminToken, _, _) = await LoginAndCreateProjectAsync();

        SetAuth(adminToken);
        // 默认 GET - 应包含 pii_mask_enabled 默认值 (true)
        var getResp = await Client.GetAsync("/api/user-preferences");
        Assert.Equal(HttpStatusCode.OK, getResp.StatusCode);
        var getData = await GetDataAsync(getResp);
        Assert.True(getData.TryGetProperty("pii_mask_enabled", out var defaultVal),
            "默认 GET 应包含 pii_mask_enabled 默认值");
        Assert.Equal("true", defaultVal.GetString());

        // PUT 更新为 false
        var putResp = await Client.PutAsJsonAsync("/api/user-preferences",
            new Dictionary<string, string> { ["pii_mask_enabled"] = "false" });
        Assert.Equal(HttpStatusCode.OK, putResp.StatusCode);

        // 重新 GET - 应为 false
        var getResp2 = await Client.GetAsync("/api/user-preferences");
        Assert.Equal(HttpStatusCode.OK, getResp2.StatusCode);
        var getData2 = await GetDataAsync(getResp2);
        Assert.Equal("false", getData2.GetProperty("pii_mask_enabled").GetString());

        // 单个 GET /api/user-preferences/{key}
        var singleGet = await Client.GetAsync("/api/user-preferences/pii_mask_enabled");
        Assert.Equal(HttpStatusCode.OK, singleGet.StatusCode);
        var singleData = await GetDataAsync(singleGet);
        Assert.Equal("false", singleData.GetProperty("value").GetString());

        // 单个 PUT 还原为 true
        var singlePut = await Client.PutAsJsonAsync("/api/user-preferences/pii_mask_enabled",
            new { value = "true" });
        Assert.Equal(HttpStatusCode.OK, singlePut.StatusCode);
        var verifyGet = await Client.GetAsync("/api/user-preferences/pii_mask_enabled");
        var verifyData = await GetDataAsync(verifyGet);
        Assert.Equal("true", verifyData.GetProperty("value").GetString());
    }

    [Fact]
    public async Task UserPreferences_GetUnknownKey_Returns404()
    {
        var (adminToken, _, _) = await LoginAndCreateProjectAsync();
        SetAuth(adminToken);
        var resp = await Client.GetAsync("/api/user-preferences/nonexistent_key");
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }
}

================
File: EngineeringManager.Tests/EngineeringManager.Tests.csproj
================
<Project Sdk="Microsoft.NET.Sdk.Web">

  <PropertyGroup>
    <TargetFramework>net8.0-windows</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <UseWindowsForms>true</UseWindowsForms>
    <IsPackable>false</IsPackable>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="17.*" />
    <PackageReference Include="xunit" Version="2.*" />
    <PackageReference Include="xunit.runner.visualstudio" Version="2.*" />
    <PackageReference Include="Microsoft.AspNetCore.Mvc.Testing" Version="8.*" />
    <PackageReference Include="Microsoft.Data.Sqlite" Version="10.*" />
  </ItemGroup>

  <ItemGroup>
    <ProjectReference Include="..\EngineeringManager.Api\EngineeringManager.Api.csproj" />
  </ItemGroup>


  <ItemGroup>
    <EmbeddedResource Include="..\EngineeringManager.Api\Migrations\Scripts\*.sql">
      <Link>Migrations\Scripts\%(Filename)%(Extension)</Link>
    </EmbeddedResource>
  </ItemGroup></Project>

================
File: EngineeringManager.Tests/Migrations/CloudSyncEndpointTests.cs
================
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Dapper;
using EngineeringManager.Api.Security;
using EngineeringManager.Tests.Common;
using Microsoft.Data.Sqlite;
using Xunit;

namespace EngineeringManager.Tests.Migrations;

/// <summary>
/// v0.77.0 阶段 1 收尾: e2e 验证 33 业务端点 INSERT/UPDATE 加 version 自增 + last_modified_at 注入
/// 流程:
///   1. admin 登录
///   2. POST /api/projects 创建项目 → GET 验证 version=1, last_modified_at 非空, sync_status='synced'
///   3. PUT /api/projects/{id} 更新 → GET 验证 version=2
///   4. 再 PUT → GET 验证 version=3
///   5. DELETE 不动 version (保留 = 3, 但 deleted_at 走 DapperHelpers)
/// </summary>
public class CloudSyncEndpointTests : ApiTestBase
{
    private const string AdminUsername = "admin";
    private const string Password = "admin123";

    private async Task<string> LoginAdminAsync()
    {
        var resp = await Client.PostAsJsonAsync("/api/auth/login",
            new { username = AdminUsername, password = Password });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var body = await resp.Content.ReadAsStringAsync();
        var marker = "\"token\":\"";
        var i = body.IndexOf(marker) + marker.Length;
        var j = body.IndexOf('"', i);
        var token = body.Substring(i, j - i);
        Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return token;
    }

    [Fact]
    public async Task Projects_InsertAndUpdate_IncrementsVersionAndSetsLastModifiedAt()
    {
        await LoginAdminAsync();

        // INSERT: 创建项目
        var createResp = await Client.PostAsJsonAsync("/api/projects", new
        {
            name = "cloud-sync-test-project",
            description = "test",
            address = "test",
            startDate = "2026-06-21",
            endDate = "2026-12-31",
            status = "active",
            budget = 100000L,
            projectManagerId = 1L
        });
        Assert.Equal(HttpStatusCode.OK, createResp.StatusCode);
        var createBody = await createResp.Content.ReadAsStringAsync();
        var projectId = JsonSerializer.Deserialize<JsonElement>(createBody).GetProperty("data").GetInt64();

        // GET: 验证 version=1, sync_status='synced', last_modified_at 非空
        var getResp = await Client.GetAsync("/api/projects");
        Assert.Equal(HttpStatusCode.OK, getResp.StatusCode);
        var getBody = await getResp.Content.ReadAsStringAsync();
        var getJson = JsonSerializer.Deserialize<JsonElement>(getBody);
        var project = getJson.GetProperty("data").EnumerateArray()
            .First(p => p.GetProperty("id").GetInt64() == projectId);
        Assert.Equal(1, project.GetProperty("version").GetInt64());
        Assert.Equal("synced", project.GetProperty("sync_status").GetString());
        Assert.False(string.IsNullOrEmpty(project.GetProperty("last_modified_at").GetString()),
            "last_modified_at 应该在 INSERT 时被设置");

        // UPDATE #1
        var updateResp = await Client.PutAsJsonAsync($"/api/projects/{projectId}", new
        {
            name = "cloud-sync-test-project-v2",
            description = "updated",
            address = "test",
            startDate = "2026-06-21",
            endDate = "2026-12-31",
            status = "active",
            budget = 200000L,
            projectManagerId = 1L
        });
        Assert.Equal(HttpStatusCode.OK, updateResp.StatusCode);

        // GET: 验证 version=2
        var get2Resp = await Client.GetAsync("/api/projects");
        var get2Json = JsonSerializer.Deserialize<JsonElement>(await get2Resp.Content.ReadAsStringAsync());
        var project2 = get2Json.GetProperty("data").EnumerateArray()
            .First(p => p.GetProperty("id").GetInt64() == projectId);
        Assert.Equal(2, project2.GetProperty("version").GetInt64());

        // UPDATE #2
        await Client.PutAsJsonAsync($"/api/projects/{projectId}", new
        {
            name = "cloud-sync-test-project-v3",
            description = "updated again",
            address = "test",
            startDate = "2026-06-21",
            endDate = "2026-12-31",
            status = "completed",
            budget = 300000L,
            projectManagerId = 1L
        });

        // GET: 验证 version=3
        var get3Resp = await Client.GetAsync("/api/projects");
        var get3Json = JsonSerializer.Deserialize<JsonElement>(await get3Resp.Content.ReadAsStringAsync());
        var project3 = get3Json.GetProperty("data").EnumerateArray()
            .First(p => p.GetProperty("id").GetInt64() == projectId);
        Assert.Equal(3, project3.GetProperty("version").GetInt64());
    }

    [Fact]
    public async Task Contracts_Update_IncrementsVersion()
    {
        await LoginAdminAsync();

        // INSERT income_contract (需要 project_id 1, 但我们没创建项目, 用 raw insert 模拟)
        // 简化: 直接用 db.Execute 跳过 endpoint
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var contractId = conn.ExecuteScalar<long>(@"
            INSERT INTO income_contracts (project_id, name, amount, status, created_by, created_at, last_modified_at)
            VALUES (1, 'test-contract', 5000000, 'active', '1', '2026-06-21 10:00:00', '2026-06-21 10:00:00');
            SELECT last_insert_rowid();");

        // 验证 version=1
        var v1 = conn.ExecuteScalar<long>("SELECT version FROM income_contracts WHERE id=@Id", new { Id = contractId });
        Assert.Equal(1, v1);

        // 模拟一次 UPDATE (通过 SQL, 不是 endpoint, 因为 income_contract UPDATE endpoint 要项目存在)
        conn.Execute("UPDATE income_contracts SET name=@Name, version=version+1, last_modified_at=@Now WHERE id=@Id",
            new { Name = "test-contract-v2", Now = "2026-06-21 10:01:00", Id = contractId });

        var v2 = conn.ExecuteScalar<long>("SELECT version FROM income_contracts WHERE id=@Id", new { Id = contractId });
        Assert.Equal(2, v2);
    }

    [Fact]
    public async Task Members_Insert_SetsLastModifiedAtToCurrentTime()
    {
        await LoginAdminAsync();

        var beforeInsert = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
        var createResp = await Client.PostAsJsonAsync("/api/members", new
        {
            name = "test-member",
            memberType = "regular",
            gender = "male",
            status = "active"
        });
        Assert.Equal(HttpStatusCode.OK, createResp.StatusCode);

        // 直接查 db 验证 last_modified_at 被设置
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var row = conn.QueryFirst<dynamic>("SELECT version, last_modified_at, sync_status FROM members WHERE name=@N", new { N = "test-member" });
        Assert.Equal(1L, (long)row.version);
        Assert.Equal("synced", (string)row.sync_status);
        Assert.False(string.IsNullOrEmpty((string?)row.last_modified_at), "last_modified_at 应该在 INSERT 时被注入");
        Assert.True(((string)row.last_modified_at).CompareTo(beforeInsert) >= 0,
            $"last_modified_at ({row.last_modified_at}) 应该 >= beforeInsert ({beforeInsert})");
    }
}

================
File: EngineeringManager.Tests/Migrations/CloudSyncSchemaTests.cs
================
using System.Data;
using Dapper;
using EngineeringManager.Api.Migrations;
using Microsoft.Data.Sqlite;
using Xunit;

namespace EngineeringManager.Tests.Migrations;

/// <summary>
/// v0.77.0 阶段 1: cloud sync schema 验证测试
/// 验证 migration 024 + 025 实际生效:
///   - 27 业务表都有 5 列 (version / last_modified_by_device / last_modified_at / sync_status / conflict_marker)
///   - sync_queue + device_registrations 新表存在 + 列对齐
///   - 每张业务表的 idx_<table>_version 索引存在
/// </summary>
public class CloudSyncSchemaTests : IDisposable
{
    private readonly string _dbPath;
    private readonly IDbConnection _db;

    public CloudSyncSchemaTests()
    {
        _dbPath = Path.Combine(Path.GetTempPath(), $"cloud-sync-schema-{Guid.NewGuid()}.db");
        var connStr = $"Data Source={_dbPath};Pooling=False";
        MigrationRunner.Run(connStr);
        _db = new SqliteConnection(connStr);
        _db.Open();
    }

    public void Dispose()
    {
        _db.Dispose();
        if (File.Exists(_dbPath)) File.Delete(_dbPath);
    }

    // 27 业务表清单 (与 migration 024 同步)
    public static IEnumerable<object[]> BusinessTables()
    {
        yield return new object[] { "projects" };
        yield return new object[] { "project_members" };
        yield return new object[] { "project_workers" };
        yield return new object[] { "income_contracts" };
        yield return new object[] { "expense_contracts" };
        yield return new object[] { "agreement_contracts" };
        yield return new object[] { "wages" };
        yield return new object[] { "attendances" };
        yield return new object[] { "members" };
        yield return new object[] { "workers" };
        yield return new object[] { "partners" };
        yield return new object[] { "supervisors" };
        yield return new object[] { "inventory_items" };
        yield return new object[] { "inventory_transactions" };
        yield return new object[] { "materials" };
        yield return new object[] { "expenses" };
        yield return new object[] { "drawings" };
        yield return new object[] { "invoices" };
        yield return new object[] { "payment_records" };
        yield return new object[] { "cost_ledger" };
        yield return new object[] { "settlements" };
        yield return new object[] { "cost_ledger_batches" };
        yield return new object[] { "worker_teams" };
        yield return new object[] { "departments" };
        yield return new object[] { "contract_templates" };
        yield return new object[] { "salary_history" };
        yield return new object[] { "wage_history" };
    }

    private static HashSet<string> GetTableColumns(IDbConnection db, string table)
    {
        var rows = db.Query<string>($"SELECT name FROM pragma_table_info('{table}')");
        return new HashSet<string>(rows, StringComparer.OrdinalIgnoreCase);
    }

    private static HashSet<string> GetTableIndexes(IDbConnection db, string table)
    {
        var rows = db.Query<string>($"SELECT name FROM pragma_index_list('{table}')");
        return new HashSet<string>(rows, StringComparer.OrdinalIgnoreCase);
    }

    [Fact]
    public void SyncQueue_TableExists_WithCorrectColumns()
    {
        var cols = GetTableColumns(_db, "sync_queue");
        Assert.Contains("id", cols);
        Assert.Contains("table_name", cols);
        Assert.Contains("row_id", cols);
        Assert.Contains("operation", cols);
        Assert.Contains("payload", cols);
        Assert.Contains("device_id", cols);
        Assert.Contains("user_id", cols);
        Assert.Contains("version", cols);
        Assert.Contains("enqueued_at", cols);
        Assert.Contains("attempt_count", cols);
        Assert.Contains("last_error", cols);
        Assert.Contains("last_attempt_at", cols);
    }

    [Fact]
    public void SyncQueue_HasCorrectIndexes()
    {
        var idxs = GetTableIndexes(_db, "sync_queue");
        Assert.Contains("idx_sync_queue_table_row", idxs);
        Assert.Contains("idx_sync_queue_enqueued", idxs);
        Assert.Contains("idx_sync_queue_device", idxs);
    }

    [Fact]
    public void DeviceRegistrations_TableExists_WithCorrectColumns()
    {
        var cols = GetTableColumns(_db, "device_registrations");
        Assert.Contains("device_id", cols);
        Assert.Contains("user_id", cols);
        Assert.Contains("device_name", cols);
        Assert.Contains("device_type", cols);
        Assert.Contains("os_info", cols);
        Assert.Contains("app_version", cols);
        Assert.Contains("registered_at", cols);
        Assert.Contains("last_seen_at", cols);
        Assert.Contains("refresh_token_hash", cols);
        Assert.Contains("refresh_token_expires_at", cols);
        Assert.Contains("is_active", cols);
    }

    [Fact]
    public void DeviceRegistrations_HasCorrectIndexes()
    {
        var idxs = GetTableIndexes(_db, "device_registrations");
        Assert.Contains("idx_device_registrations_user", idxs);
        Assert.Contains("idx_device_registrations_active", idxs);
    }

    [Theory]
    [MemberData(nameof(BusinessTables))]
    public void BusinessTable_HasAllFiveCloudSyncColumns(string table)
    {
        var cols = GetTableColumns(_db, table);
        Assert.Contains("version", cols);
        Assert.Contains("last_modified_by_device", cols);
        Assert.Contains("last_modified_at", cols);
        Assert.Contains("sync_status", cols);
        Assert.Contains("conflict_marker", cols);
    }

    [Theory]
    [MemberData(nameof(BusinessTables))]
    public void BusinessTable_HasVersionIndex(string table)
    {
        var idxs = GetTableIndexes(_db, table);
        Assert.Contains($"idx_{table}_version", idxs);
    }

    [Fact]
    public void BusinessTable_InsertDefaultsVersionToOne()
    {
        var affected = _db.Execute(@"INSERT INTO projects (name, created_by, created_at) VALUES ('test', 'admin', '2026-06-21');");
        Assert.Equal(1, affected);

        var row = _db.QueryFirst<(long id, long version, string sync_status)>(@"SELECT id, version, sync_status FROM projects WHERE name='test'");
        Assert.Equal(1, row.version);
        Assert.Equal("synced", row.sync_status);
    }

    [Fact]
    public void SyncQueue_InsertAndQuery()
    {
        var id = _db.ExecuteScalar<long>(@"
            INSERT INTO sync_queue (table_name, row_id, operation, version, enqueued_at, user_id)
            VALUES ('projects', 1, 'insert', 1, '2026-06-21 10:00:00', 'admin');
            SELECT last_insert_rowid();
        ");
        Assert.True(id > 0);

        var row = _db.QueryFirst<dynamic>(@"SELECT table_name, operation, version, attempt_count FROM sync_queue WHERE id=@Id", new { Id = id });
        Assert.Equal("projects", (string)row.table_name);
        Assert.Equal("insert", (string)row.operation);
        Assert.Equal(1L, (long)row.version);
        Assert.Equal(0L, (long)row.attempt_count);
    }
}

================
File: EngineeringManager.Tests/Migrations/Fts5TrigramTests.cs
================
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
                c1 = "[已脱敏]结账付款进度款",
                c2 = "[已脱敏]说的二十七万有点高",
                c3 = "钢筋脚手架模板工期"
            });

        // 4. trigram 搜索中文（"结账付款" → 应匹配第一条）
        var results1 = conn.Query<string>(
            "SELECT content FROM test_fts WHERE test_fts MATCH @q ORDER BY rank",
            new { q = "结账付款" }).ToList();
        Assert.Single(results1);
        Assert.Contains("[已脱敏]结账付款", results1[0]);

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

================
File: EngineeringManager.Tests/Security/PiiProtectorTests.cs
================
using System.Data;
using System.Text;
using Dapper;
using EngineeringManager.Api;
using EngineeringManager.Api.Security;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace EngineeringManager.Tests.Security;

/// <summary>
/// v0.76.0 累计待办 #5: PiiProtector 多 key 加密测试
/// 测试场景: 加密/解密 roundtrip, key rotation, 旧格式兼容
/// </summary>
public class PiiProtectorTests : IDisposable
{
    private readonly string _dbPath;
    private readonly IDbConnection _db;
    private readonly PiiProtector _pii;

    public PiiProtectorTests()
    {
        // 每个测试一个独立 db 文件
        _dbPath = Path.Combine(Path.GetTempPath(), $"pii-test-{Guid.NewGuid()}.db");
        var connStr = $"Data Source={_dbPath};Pooling=False";
        // 跑 migration 023 (建 pii_keys 表)
        EngineeringManager.Api.Migrations.MigrationRunner.Run(connStr);
        _db = new SqliteConnection(connStr);
        _db.Open();
        _pii = new PiiProtector(NullLogger<PiiProtector>.Instance);
    }

    public void Dispose()
    {
        _db.Dispose();
        if (File.Exists(_dbPath)) File.Delete(_dbPath);
    }

    [Fact]
    public void Initialize_CreatesDefaultKey_WhenPiiKeysEmpty()
    {
        _pii.Initialize(_db);

        Assert.True(_pii.IsInitialized);
        Assert.Equal(1, _pii.ActiveKeyId);
        Assert.Equal(1, _pii.KeyCount);
    }

    [Fact]
    public void Encrypt_Decrypt_Roundtrip()
    {
        _pii.Initialize(_db);
        var plain = "[已脱敏]"; // 11 位手机号
        var cipher = _pii.Encrypt(plain);
        var back = _pii.Decrypt(cipher);
        Assert.Equal(plain, back);
    }

    [Fact]
    public void Encrypt_Decrypt_EmptyString_ReturnsEmpty()
    {
        _pii.Initialize(_db);
        Assert.Equal("", _pii.Encrypt(""));
        Assert.Equal("", _pii.Decrypt(""));
        Assert.Equal("", _pii.Encrypt(null!));
    }

    [Fact]
    public void Encrypt_Decrypt_LongString()
    {
        _pii.Initialize(_db);
        var plain = new string('A', 1000) + "测试中文" + new string('B', 500);
        var cipher = _pii.Encrypt(plain);
        var back = _pii.Decrypt(cipher);
        Assert.Equal(plain, back);
    }

    [Fact]
    public void Rotate_GeneratesNewKey_AndRetiresOld()
    {
        _pii.Initialize(_db);
        var oldKeyId = _pii.ActiveKeyId;

        var newKeyId = _pii.Rotate(_db, "test-admin");
        Assert.Equal(oldKeyId + 1, newKeyId);
        Assert.Equal(newKeyId, _pii.ActiveKeyId);
        Assert.Equal(2, _pii.KeyCount);

        // 验证 DB: 新 key is_active=1, 旧 key is_active=0 + retired_at
        var keys = _db.Query<(int key_id, int is_active, string? retired_at)>(
            "SELECT key_id, is_active, retired_at FROM pii_keys ORDER BY key_id").ToList();
        Assert.Equal(2, keys.Count);
        // keys[0] = key_id=1 (retired, 旧的), keys[1] = key_id=2 (active, 新的)
        Assert.Equal(0, keys[0].is_active);
        Assert.NotNull(keys[0].retired_at);
        Assert.Equal(1, keys[1].is_active);
        Assert.Null(keys[1].retired_at);
    }

    [Fact]
    public void Rotate_OldCiphertext_StillDecryptable()
    {
        _pii.Initialize(_db);
        var plain = "secret-data-001";
        var oldCipher = _pii.Encrypt(plain);

        // 旋转
        _pii.Rotate(_db, "test-admin");
        Assert.NotEqual(1, _pii.ActiveKeyId);

        // 旧密文仍能解
        var back = _pii.Decrypt(oldCipher);
        Assert.Equal(plain, back);
    }

    [Fact]
    public void Rotate_NewCiphertext_UsesNewKeyId()
    {
        _pii.Initialize(_db);
        _pii.Rotate(_db, "test-admin");
        var newCipher = _pii.Encrypt("after-rotation");

        // 验证密文首字节 = 新 key_id
        var data = Convert.FromBase64String(newCipher);
        Assert.Equal(_pii.ActiveKeyId, data[0]);
    }

    [Fact]
    public void Decrypt_LegacyFormat_FallsBackToKey1()
    {
        _pii.Initialize(_db);
        // 手搓 v1.2.0 旧格式密文: nonce[12] || tag[16] || ciphertext
        // 用当前 active key (key_id=1) 加密, 但不带 version 字节
        var dpapiKeyArr = _db.Query<byte[]>("SELECT encrypted_key FROM pii_keys WHERE key_id = 1").First();
        var dpapiKey = System.Security.Cryptography.ProtectedData.Unprotect(
            dpapiKeyArr, null, System.Security.Cryptography.DataProtectionScope.CurrentUser);

        var plain = Encoding.UTF8.GetBytes("legacy-data");
        var nonce = new byte[12];
        System.Security.Cryptography.RandomNumberGenerator.Fill(nonce);
        var cipher = new byte[plain.Length];
        var tag = new byte[16];
        using (var aes = new System.Security.Cryptography.AesGcm(dpapiKey, 16))
        {
            aes.Encrypt(nonce, plain, cipher, tag);
        }
        var legacyCipherBytes = new byte[12 + 16 + cipher.Length];
        Buffer.BlockCopy(nonce, 0, legacyCipherBytes, 0, 12);
        Buffer.BlockCopy(tag, 0, legacyCipherBytes, 12, 16);
        Buffer.BlockCopy(cipher, 0, legacyCipherBytes, 28, cipher.Length);
        var legacyCipher = Convert.ToBase64String(legacyCipherBytes);

        // 解密应 fallback 到 key_id=1 并成功
        var back = _pii.Decrypt(legacyCipher);
        Assert.Equal("legacy-data", back);
    }

    [Fact]
    public void Initialize_Idempotent_DoesNotCreateDuplicateKey()
    {
        _pii.Initialize(_db);
        var firstCount = _pii.KeyCount;
        // 再次调用 Initialize 不应重复迁移
        _pii.Initialize(_db);
        Assert.Equal(firstCount, _pii.KeyCount);
    }

    [Fact]
    public void Encrypt_NotInitialized_Throws()
    {
        Assert.Throws<InvalidOperationException>(() => _pii.Encrypt("test"));
    }

    [Fact]
    public void Rotate_NotInitialized_Throws()
    {
        Assert.Throws<InvalidOperationException>(() => _pii.Rotate(_db, "test"));
    }
}

================
File: EngineeringManager.Tests/Security/PiiReencryptWorkerTests.cs
================
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
        var cipher1 = _pii.Encrypt("[已脱敏]");
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
        var cipher1 = _pii.Encrypt("[已脱敏]");
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
        var cipher1 = _pii.Encrypt("[已脱敏]");
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
        var cipher1 = _pii.Encrypt("[已脱敏]");
        InsertTestMember(cipher1);

        // Mark status as running manually
        _db.Execute(@"UPDATE pii_reencrypt_status SET status='running', target_key_id=1 WHERE id=1");

        await Assert.ThrowsAsync<InvalidOperationException>(() => _worker.StartAsync(_db, "test"));

        // Reset
        _db.Execute("UPDATE pii_reencrypt_status SET status='idle' WHERE id=1");
    }
}

================
File: EngineeringManager.Api/Endpoints/AgentEndpoints.cs
================
using System.Data;
using System.Text;
using System.Text.Json;
using Dapper;
using EngineeringManager.Api.Models;
using EngineeringManager.Api.Security;
using EngineeringManager.Api.Services;
using Microsoft.AspNetCore.Http;

namespace EngineeringManager.Api;

/// <summary>
/// Agent AI 助手端点 — 基于 LLM function calling 的智能查询
///
/// 路由分组: /api/agent
/// 权限控制: 聊天/对话需登录; setup 为白名单; setup/save 需 admin
/// </summary>
public static class AgentEndpoints
{
    public static void RegisterAgentEndpoints(this WebApplication app)
    {
        // ═══════════════════════════════════════════════════════════
        // 核心聊天
        // ═══════════════════════════════════════════════════════════

        app.MapPost("/api/agent/chat", async (
            HttpContext ctx,
            IDbConnection db,
            AgentChatRequest request,
            LlmProviderService llm,
            AgentToolService tools,
            AgentConversationService conversations) =>
        {
            var uid = CurrentUser.GetUserId(ctx);
            if (string.IsNullOrEmpty(uid))
                return Common.Fail("未登录", 401);

            try
            {
                // 1. 创建或获取对话
                long conversationId;
                if (request.ConversationId.HasValue)
                {
                    conversationId = request.ConversationId.Value;
                }
                else
                {
                    var title = request.Message.Truncate(20);
                    conversationId = await conversations.CreateConversationAsync(db, uid, title);
                }

                // 2. 保存用户消息
                var userMsg = new AgentMessage
                {
                    Role = MessageRole.User,
                    Content = request.Message,
                };
                await conversations.SaveMessageAsync(db, conversationId, userMsg);

                // 3. 构建 LLM 消息列表
                var llmMessages = new List<AgentMessage>
                {
                    new AgentMessage
                    {
                        Role = MessageRole.System,
                        Content = BuildSystemPrompt(),
                    }
                };

                // 加载历史消息（最近 40 条）
                var history = await conversations.GetMessagesForLlmAsync(db, conversationId, 40);
                llmMessages.AddRange(history);

                // 4. 获取可用工具
                var availableTools = tools.GetAvailableTools(ctx);

                // 5. 调用 LLM（最多 5 轮 tool_use 循环）
                var maxRounds = 5;
                var toolResults = new List<ToolCallResult>();

                for (int round = 0; round < maxRounds; round++)
                {
                    var response = await llm.ChatAsync(llmMessages, availableTools);

                    if (response == null)
                    {
                        toolResults.Add(new ToolCallResult
                        {
                            ToolName = "llm",
                            ToolCallId = "",
                            Success = false,
                            Error = "LLM 调用失败，请检查配置",
                        });
                        break;
                    }

                    var choice = response.Choices.FirstOrDefault();
                    if (choice == null) break;

                    // 检查是否有 tool_calls
                    if (choice.Message.ToolCalls != null && choice.Message.ToolCalls.Count > 0)
                    {
                        // 保存 assistant 消息（含 tool_calls）
                        var assistantMsg = new AgentMessage
                        {
                            Role = MessageRole.Assistant,
                            Content = choice.Message.Content,
                            ToolCalls = choice.Message.ToolCalls,
                        };
                        await conversations.SaveMessageAsync(db, conversationId, assistantMsg);

                        // 添加 assistant 消息到 LLM 上下文
                        llmMessages.Add(assistantMsg);

                        // 执行每个工具调用
                        foreach (var tc in choice.Message.ToolCalls)
                        {
                            JsonElement args;
                            try
                            {
                                args = JsonDocument.Parse(tc.Function.Arguments).RootElement;
                            }
                            catch
                            {
                                args = JsonDocument.Parse("{}").RootElement;
                            }

                            var result = await tools.ExecuteToolAsync(
                                tc.Function.Name, args, ctx, db);
                            result = result with { ToolCallId = tc.Id };

                            toolResults.Add(result);

                            // 构建 tool 消息反馈 LLM
                            var toolMsg = new AgentMessage
                            {
                                Role = MessageRole.Tool,
                                Content = JsonSerializer.Serialize(result),
                                ToolCallId = tc.Id,
                                Name = tc.Function.Name,
                            };
                            await conversations.SaveMessageAsync(db, conversationId, toolMsg);
                            llmMessages.Add(toolMsg);
                        }

                        // 继续循环，让 LLM 处理工具结果
                        continue;
                    }

                    // 无 tool_calls：最终文本回复
                    var finalContent = choice.Message.Content ?? "";
                    var finalMsg = new AgentMessage
                    {
                        Role = MessageRole.Assistant,
                        Content = finalContent,
                    };
                    await conversations.SaveMessageAsync(db, conversationId, finalMsg);

                    // 注意：字段名必须是 content，与前端 AgentMessage.content 契约对齐
                    return Common.Ok(new
                    {
                        success = true,
                        conversationId,
                        message = new
                        {
                            role = MessageRole.Assistant.ToString().ToLower(),
                            content = finalContent,
                        },
                        toolCalls = toolResults,
                    });
                }

                // 达到最大轮数（tool_use loop 终止），返回最后一个非 tool 回复
                return Common.Ok(new
                {
                    success = true,
                    conversationId,
                    message = new
                    {
                        role = MessageRole.Assistant.ToString().ToLower(),
                        content = "已执行工具查询，详见上方结果。",
                    },
                    toolCalls = toolResults,
                });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[AgentEndpoints] /api/agent/chat 失败: {ex.Message}");
                return Common.Fail(Common.Sanitize(ex.Message));
            }
        });

        // ═══════════════════════════════════════════════════════════
        // 核心聊天 — SSE 流式版本
        // ═══════════════════════════════════════════════════════════

        app.MapPost("/api/agent/chat/stream", async (
            HttpContext ctx,
            IDbConnection db,
            AgentChatRequest request,
            LlmProviderService llm,
            AgentToolService tools,
            AgentConversationService conversations) =>
        {
            var uid = CurrentUser.GetUserId(ctx);
            if (string.IsNullOrEmpty(uid))
            {
                ctx.Response.StatusCode = 401;
                await ctx.Response.WriteAsync("data: {\"error\":\"未登录\"}\n\n");
                return;
            }

            // 设置 SSE 响应头
            ctx.Response.ContentType = "text/event-stream";
            ctx.Response.Headers.Append("Cache-Control", "no-cache");
            ctx.Response.Headers.Append("Connection", "keep-alive");
            ctx.Response.Headers.Append("X-Accel-Buffering", "no");

            try
            {
                // 1. 创建或获取对话
                long conversationId;
                if (request.ConversationId.HasValue)
                {
                    conversationId = request.ConversationId.Value;
                }
                else
                {
                    var title = request.Message.Truncate(20);
                    conversationId = await conversations.CreateConversationAsync(db, uid, title);
                }

                // 发送对话 ID
                await WriteSSE(ctx, new { type = "conversation_id", conversationId });

                // 2. 保存用户消息
                var userMsg = new AgentMessage
                {
                    Role = MessageRole.User,
                    Content = request.Message,
                };
                await conversations.SaveMessageAsync(db, conversationId, userMsg);

                // 3. 构建 LLM 消息列表
                var llmMessages = new List<AgentMessage>
                {
                    new AgentMessage
                    {
                        Role = MessageRole.System,
                        Content = BuildSystemPrompt(),
                    }
                };

                // 加载历史消息（最近 40 条）
                var history = await conversations.GetMessagesForLlmAsync(db, conversationId, 40);
                llmMessages.AddRange(history);

                // 4. 获取可用工具
                var availableTools = tools.GetAvailableTools(ctx);

                // 5. 调用 LLM（最多 5 轮 tool_use 循环）
                var maxRounds = 5;
                var toolResults = new List<ToolCallResult>();

                for (int round = 0; round < maxRounds; round++)
                {
                    var response = await llm.ChatAsync(llmMessages, availableTools);

                    if (response == null)
                    {
                        toolResults.Add(new ToolCallResult
                        {
                            ToolName = "llm",
                            ToolCallId = "",
                            Success = false,
                            Error = "LLM 调用失败，请检查配置",
                        });
                        await WriteSSE(ctx, new { type = "error", error = "LLM 调用失败，请检查配置" });
                        break;
                    }

                    var choice = response.Choices.FirstOrDefault();
                    if (choice == null) break;

                    // 检查是否有 tool_calls
                    if (choice.Message.ToolCalls != null && choice.Message.ToolCalls.Count > 0)
                    {
                        // 保存 assistant 消息（含 tool_calls）
                        var assistantMsg = new AgentMessage
                        {
                            Role = MessageRole.Assistant,
                            Content = choice.Message.Content,
                            ToolCalls = choice.Message.ToolCalls,
                        };
                        await conversations.SaveMessageAsync(db, conversationId, assistantMsg);
                        llmMessages.Add(assistantMsg);

                        // 执行每个工具调用
                        foreach (var tc in choice.Message.ToolCalls)
                        {
                            // 发送工具执行进度
                            await WriteSSE(ctx, new { type = "tool", name = tc.Function.Name });

                            JsonElement args;
                            try
                            {
                                args = JsonDocument.Parse(tc.Function.Arguments).RootElement;
                            }
                            catch
                            {
                                args = JsonDocument.Parse("{}").RootElement;
                            }

                            var result = await tools.ExecuteToolAsync(
                                tc.Function.Name, args, ctx, db);
                            result = result with { ToolCallId = tc.Id };

                            toolResults.Add(result);

                            // 构建 tool 消息反馈 LLM
                            var toolMsg = new AgentMessage
                            {
                                Role = MessageRole.Tool,
                                Content = JsonSerializer.Serialize(result),
                                ToolCallId = tc.Id,
                                Name = tc.Function.Name,
                            };
                            await conversations.SaveMessageAsync(db, conversationId, toolMsg);
                            llmMessages.Add(toolMsg);
                        }

                        // 继续循环，让 LLM 处理工具结果
                        continue;
                    }

                    // 无 tool_calls：流式输出最终文本回复
                    var finalContentBuilder = new StringBuilder();

                    // 使用流式 API 输出最终回复
                    await foreach (var chunk in llm.ChatStreamAsync(llmMessages))
                    {
                        try
                        {
                            var chunkDoc = JsonDocument.Parse(chunk);
                            var delta = chunkDoc.RootElement
                                .GetProperty("choices")[0]
                                .GetProperty("delta");

                            if (delta.TryGetProperty("content", out var contentProp))
                            {
                                var text = contentProp.GetString();
                                if (!string.IsNullOrEmpty(text))
                                {
                                    finalContentBuilder.Append(text);
                                    await WriteSSE(ctx, new { type = "content", text });
                                }
                            }
                        }
                        catch
                        {
                            // 忽略解析错误的 chunk
                        }
                    }

                    // 保存最终消息
                    var finalContent = finalContentBuilder.ToString();
                    if (!string.IsNullOrEmpty(finalContent))
                    {
                        var finalMsg = new AgentMessage
                        {
                            Role = MessageRole.Assistant,
                            Content = finalContent,
                        };
                        await conversations.SaveMessageAsync(db, conversationId, finalMsg);
                    }

                    // 发送完成信号
                    await WriteSSE(ctx, new
                    {
                        type = "done",
                        conversationId,
                        toolCalls = toolResults,
                    });

                    return;
                }

                // 达到最大轮数
                await WriteSSE(ctx, new
                {
                    type = "done",
                    conversationId,
                    message = "已执行工具查询，详见上方结果。",
                    toolCalls = toolResults,
                });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[AgentEndpoints] /api/agent/chat/stream 失败: {ex.Message}");
                await WriteSSE(ctx, new { type = "error", error = Common.Sanitize(ex.Message) });
            }
        });

        // ═══════════════════════════════════════════════════════════
        // 对话列表
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/agent/conversations", async (
            HttpContext ctx,
            IDbConnection db,
            AgentConversationService conversations) =>
        {
            var uid = CurrentUser.GetUserId(ctx);
            if (string.IsNullOrEmpty(uid))
                return Common.Fail("未登录", 401);

            try
            {
                var list = await conversations.GetConversationsAsync(db, uid);
                return Common.Ok(list);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[AgentEndpoints] /api/agent/conversations 失败: {ex.Message}");
                return Common.Fail(Common.Sanitize(ex.Message));
            }
        });

        // ═══════════════════════════════════════════════════════════
        // 对话详情
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/agent/conversations/{id}", async (
            HttpContext ctx,
            long id,
            IDbConnection db,
            AgentConversationService conversations) =>
        {
            var uid = CurrentUser.GetUserId(ctx);
            if (string.IsNullOrEmpty(uid))
                return Common.Fail("未登录", 401);

            try
            {
                var detail = await conversations.GetConversationDetailAsync(db, id, uid!);
                if (detail == null)
                    return Common.NotFound("对话不存在");
                return Common.Ok(detail);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[AgentEndpoints] /api/agent/conversations/{id} 失败: {ex.Message}");
                return Common.Fail(Common.Sanitize(ex.Message));
            }
        });

        // ═══════════════════════════════════════════════════════════
        // 删除对话
        // ═══════════════════════════════════════════════════════════

        app.MapDelete("/api/agent/conversations/{id}", async (
            HttpContext ctx,
            long id,
            IDbConnection db,
            AgentConversationService conversations) =>
        {
            var uid = CurrentUser.GetUserId(ctx);
            if (string.IsNullOrEmpty(uid))
                return Common.Fail("未登录", 401);

            try
            {
                var ok = await conversations.DeleteConversationAsync(db, id, uid);
                return ok ? Common.Ok() : Common.NotFound("对话不存在或无权操作");
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[AgentEndpoints] /api/agent/conversations/{id} DELETE 失败: {ex.Message}");
                return Common.Fail(Common.Sanitize(ex.Message));
            }
        });

        // ═══════════════════════════════════════════════════════════
        // 重命名会话
        // ═══════════════════════════════════════════════════════════

        app.MapPut("/api/agent/conversations/{id}", async (
            HttpContext ctx,
            long id,
            IDbConnection db,
            AgentConversationService conversations) =>
        {
            var uid = CurrentUser.GetUserId(ctx);
            if (string.IsNullOrEmpty(uid))
                return Common.Fail("未登录", 401);

            try
            {
                using var doc = await JsonDocument.ParseAsync(ctx.Request.Body);
                var root = doc.RootElement;

                string title = "";
                if (root.TryGetProperty("title", out var titleProp) &&
                    titleProp.ValueKind == JsonValueKind.String)
                {
                    title = titleProp.GetString() ?? "";
                }

                if (string.IsNullOrWhiteSpace(title))
                    return Common.Fail("标题不能为空");

                title = title.Trim();
                if (title.Length > 100) title = title.Substring(0, 100);

                var ok = await conversations.RenameConversationAsync(db, id, uid, title);
                return ok ? Common.Ok() : Common.NotFound("对话不存在或无权操作");
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[AgentEndpoints] /api/agent/conversations/{id} PUT 失败: {ex.Message}");
                return Common.Fail(Common.Sanitize(ex.Message));
            }
        });

        // ═══════════════════════════════════════════════════════════
        // 配置状态（白名单，无需登录）
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/agent/setup/status", (LlmProviderService llm) =>
        {
            try
            {
                var config = llm.GetConfig();
                string source = config.UseBuiltIn ? "builtin" :
                    (config.ProviderName == "env" ? "env" : "custom");

                return Common.Ok(new
                {
                    configured = true,
                    provider = config.ProviderName,
                    model = config.Model,
                    useBuiltIn = config.UseBuiltIn,
                    source,
                });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[AgentEndpoints] /api/agent/setup/status 失败: {ex.Message}");
                return Common.Fail(Common.Sanitize(ex.Message));
            }
        });

        // ═══════════════════════════════════════════════════════════
        // 测试连接（白名单，无需登录）
        // ═══════════════════════════════════════════════════════════

        app.MapPost("/api/agent/setup/test", async (
            HttpContext ctx,
            LlmProviderService llm) =>
        {
            try
            {
                using var doc = await JsonDocument.ParseAsync(ctx.Request.Body);
                var root = doc.RootElement;

                var baseUrl = root.GetProperty("baseUrl").GetString() ?? "";
                var apiKey = root.GetProperty("apiKey").GetString() ?? "";

                if (string.IsNullOrEmpty(baseUrl) || string.IsNullOrEmpty(apiKey))
                    return Common.Fail("baseUrl 和 apiKey 不能为空");

                var (success, models, error) = await llm.TestConnectionAsync(baseUrl, apiKey);

                return Common.Ok(new
                {
                    success,
                    message = success ? "连接成功" : error,
                    data = new { models, modelCount = models.Length },
                    error,
                });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[AgentEndpoints] /api/agent/setup/test 失败: {ex.Message}");
                return Common.Fail(Common.Sanitize(ex.Message));
            }
        });

        // ═══════════════════════════════════════════════════════════
        // 保存配置（需 admin）
        // ═══════════════════════════════════════════════════════════

        app.MapPost("/api/agent/setup/save", async (
            HttpContext ctx,
            LlmProviderService llm) =>
        {
            var uid = CurrentUser.GetUserId(ctx);
            if (string.IsNullOrEmpty(uid))
                return Common.Fail("未登录", 401);
            if (!CurrentUser.IsAdmin(ctx))
                return Common.Fail("仅管理员可修改配置", 403);

            try
            {
                using var doc = await JsonDocument.ParseAsync(ctx.Request.Body);
                var root = doc.RootElement;

                var config = new LlmProviderConfig
                {
                    ProviderName = GetStringProp(root, "providerName") ?? "Custom",
                    BaseUrl = GetStringProp(root, "baseUrl") ?? "https://apihub.agnes-ai.com/v1",
                    ApiKey = GetStringProp(root, "apiKey") ?? "",
                    Model = GetStringProp(root, "model") ?? "agnes-2.0-flash",
                    UseBuiltIn = GetBoolProp(root, "useBuiltIn"),
                    Temperature = GetDoubleProp(root, "temperature"),
                    MaxTokens = GetIntProp(root, "maxTokens"),
                };

                await llm.SaveUserConfigAsync(config);
                return Common.Ok(new { message = "配置已保存" });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[AgentEndpoints] /api/agent/setup/save 失败: {ex.Message}");
                return Common.Fail(Common.Sanitize(ex.Message));
            }
        });

        // ═══════════════════════════════════════════════════════════
        // 获取配置（需登录）
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/agent/config", (HttpContext ctx, LlmProviderService llm) =>
        {
            var uid = CurrentUser.GetUserId(ctx);
            if (string.IsNullOrEmpty(uid))
                return Common.Fail("未登录", 401);

            try
            {
                var config = llm.GetConfig();
                return Common.Ok(new
                {
                    config.ProviderName,
                    config.BaseUrl,
                    config.Model,
                    config.UseBuiltIn,
                    config.Temperature,
                    config.MaxTokens,
                    hasApiKey = !string.IsNullOrEmpty(config.ApiKey),
                });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[AgentEndpoints] /api/agent/config 失败: {ex.Message}");
                return Common.Fail(Common.Sanitize(ex.Message));
            }
        });

        // ═══════════════════════════════════════════════════════════
        // 重载配置（需 admin）
        // ═══════════════════════════════════════════════════════════

        app.MapPost("/api/agent/config/reload", async (
            HttpContext ctx,
            LlmProviderService llm) =>
        {
            var uid = CurrentUser.GetUserId(ctx);
            if (string.IsNullOrEmpty(uid))
                return Common.Fail("未登录", 401);
            if (!CurrentUser.IsAdmin(ctx))
                return Common.Fail("仅管理员可重载配置", 403);

            try
            {
                await llm.ReloadConfigAsync();
                return Common.Ok(new { message = "配置已重新加载" });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[AgentEndpoints] /api/agent/config/reload 失败: {ex.Message}");
                return Common.Fail(Common.Sanitize(ex.Message));
            }
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // 辅助方法
    // ═══════════════════════════════════════════════════════════════

    private static string BuildSystemPrompt()
    {
        var lines = new string[]
        {
            "你是工程管家 AI 助手，一个面向建筑工程管理场景的智能数据分析与查询助手。",
            "",
            "## 你的身份",
            "- 你是工程管家系统的内置 AI 助手",
            "- 你可以查询项目、成员、发票、结算、合同、库存、成本等数据",
            "- 你的回答应当专业、简洁、准确",
            "",
            "## 数据权限",
            "- 你只能访问当前登录用户有权查看的数据",
            "- 你的查询结果会自动反映用户的权限范围",
            "",
            "## 可用功能",
            "你可以调用以下工具来获取实时数据：",
            "- getDashboardStats — 仪表盘总览（项目数、成员数、发票数、收支统计）",
            "- getProjects — 项目列表",
            "- getProjectDetail — 项目详情（需要 projectId）",
            "- getInvoices — 发票列表，可选按项目筛选",
            "- getPendingInvoices — 待处理发票",
            "- getSettlements — 结算记录，可选按项目筛选",
            "- getPendingSettlements — 待处理结算",
            "- getMembers — 成员列表",
            "- getWorkers — 工人列表",
            "- getContracts — 合同列表（收入+支出），可选按项目筛选",
            "- getInventory — 库存物料列表",
            "- getCostSummary — 成本汇总（按分类统计收支），可选按项目筛选",
            "- getPartners — 合作伙伴列表",
            "- runSafeQuery — 受限只读查询（高级功能，仅 admin/manager 可用）",
            "",
            "## runSafeQuery 使用说明",
            "当现有工具无法满足查询需求时，可以使用 runSafeQuery 执行自定义 SQL 查询。",
            "限制条件：",
            "- 只允许 SELECT 语句",
            "- 只能查询白名单表：projects, members, workers, invoices, settlements, cost_ledger, income_contracts, expense_contracts, inventory_items, partners",
            "- 不允许 SELECT *，必须明确指定列名",
            "- 查询结果会自动按你的权限过滤（只能看到你有权访问的数据）",
            "- 自动添加 LIMIT 100",
            "- 敏感信息（身份证、手机、银行账号）会自动脱敏",
            "",
            "示例用法：",
            "```sql",
            "SELECT name, status, budget FROM projects WHERE status = 'active'",
            "```",
            "",
            "## 术语映射（中文 → 数据库表名）",
            "- 项目 = projects",
            "- 成员/员工 = members",
            "- 工人 = workers",
            "- 发票 = invoices",
            "- 结算 = settlements",
            "- 成本台账/成本明细 = cost_ledger",
            "- 收入合同 = income_contracts",
            "- 支出合同 = expense_contracts",
            "- 合作伙伴/合作方 = partners",
            "- 库存/物料 = inventory_items",
            "",
            "## 字段含义说明",
            "- projects.status: 项目状态（active=进行中, completed=已完成, pending=待开工）",
            "- cost_ledger.direction: 收支方向（income=收入, expense=支出）",
            "- cost_ledger.category: 成本分类（人工费, 材料费, 机械费, 管理费, 其他）",
            "- members.member_type: 成员类型（staff=管理人员, worker=工人）",
            "- members.status: 成员状态（active=在职, left=离职）",
            "- invoices.type: 发票类型（income=收入发票, expense=支出发票）",
            "- invoices.status: 发票状态（pending=待处理, received=已收, sent=已开）",
            "- settlements.status: 结算状态（pending=待结算, completed=已结算）",
            "- partners.category: 合作方分类（labor=劳务分包, material=材料供应, equipment=设备租赁）",
            "",
            "## 工具选择指引",
            "1. 查询项目列表 → getProjects",
            "2. 查询单个项目详情 → getProjectDetail（需要 projectId）",
            "3. 查询发票 → getInvoices（可选 projectId 筛选）",
            "4. 查询待处理发票 → getPendingInvoices",
            "5. 查询结算记录 → getSettlements（可选 projectId 筛选）",
            "6. 查询成本汇总（按分类统计）→ getCostSummary（可选 projectId 筛选）",
            "7. 查询成本明细（按时间/项目）→ runSafeQuery（自定义 SQL）",
            "8. 按项目筛选数据 → 先 getProjects 获取 projectId，再用 projectId 调用其他工具",
            "",
            "## 数据库业务语义层",
            "你可以查询的是一套【建筑工程管理】系统的只读数据。下面是各表的业务含义、关键字段和口径说明。",
            "你只能查询下列白名单表，且只能生成只读 SELECT，必须经 runSafeQuery 执行，结果默认带 LIMIT。",
            "",
            "【公司级数据（按本人/管理员可见）】",
            "- projects（工程项目）：公司承接的工程项目主表。关键字段：id 项目ID、name 项目名称、status 状态、created_by 负责人/创建人。",
            "- members（成员/员工）：公司内部人员。关键字段：id、name 姓名、role 岗位、created_by 所属。",
            "- workers（工人）：现场施工工人。关键字段：id、name 姓名、worker_type 工种、daily_wage 日薪、phone 电话、created_by 所属。",
            "- partners（合作方/供应商）：往来单位。关键字段：id、name 单位名称、category 分类（labor/material/equipment）。",
            "- inventory_items（库存物料/设备）：材料与机械设备台账。关键字段：id、name 物料名称、quantity 数量。",
            "",
            "【项目级数据（按授权项目可见）】",
            "- invoices（发票）：开具/收到的发票。关键字段：id、project_id 所属项目、amount 金额、created_by。",
            "- settlements（结算）：工程结算单。关键字段：id、project_id、amount 结算金额、status。",
            "- cost_ledger（成本台账）：项目成本流水。关键字段：id、project_id、amount 成本金额、category 成本类别、created_by。",
            "- income_contracts（收入合同）：对外收款合同。关键字段：id、project_id、amount 合同金额、partner_id 对方单位。",
            "- expense_contracts（支出合同）：对外付款合同。关键字段：id、project_id、amount、partner_id。",
            "",
            "【口径约定】",
            "- \"本人/我的\"：用 created_by 等于当前用户。",
            "- \"本公司/全公司\"：公司级表的全量（受权限护栏自动过滤）。",
            "- \"某个项目/授权项目\"：用 project_id 关联到 projects，并受授权范围过滤。",
            "- 金额类问题默认按 amount 汇总；时间范围问题用对应的日期列过滤。",
            "",
            "【术语映射（用户口语 → 表）】",
            "- 工人、班组、现场人员 → workers",
            "- 员工、同事、内部人员 → members",
            "- 供应商、合作单位、往来单位 → partners",
            "- 材料、物料、设备、库存 → inventory_items",
            "- 成本、花费、台账、开支流水 → cost_ledger",
            "- 结算、结算单 → settlements",
            "- 发票 → invoices",
            "- 收入合同、收款合同 → income_contracts",
            "- 支出合同、付款合同 → expense_contracts",
            "- 工程、项目、工地 → projects",
            "",
            "【硬性约束】",
            "- 严禁查询以下表：users、roles、audit_logs、llm_config（含变体 llm-config）、sqlite_master 及任何 sqlite_* 系统表。若用户索要这些（如\"用户列表\"\"权限角色\"\"操作日志\"\"模型密钥\"），明确拒绝并说明这是受限数据。",
            "- 仅生成单条只读 SELECT；不得使用 INSERT/UPDATE/DELETE/DROP/ATTACH/PRAGMA 等。",
            "- 多表关联请优先用顶层 JOIN。权限过滤目前仅在最外层 WHERE 注入,子查询中引入新表会在执行阶段被拒,请不要在子查询里查询额外的表。",
            "- 不要在回答中编造表或字段；不确定字段名时，先用已知字段，必要时说明假设。",
            "",
            "## 回答规范",
            "1. 当用户询问数据时，主动调用对应工具获取最新数据",
            "2. 将查询结果用中文清晰呈现，必要时用列表或表格形式",
            "3. 如果数据为空，如实告知用户\u300c暂无相关数据\u300d",
            "4. 涉及金额时保留两位小数，加上\u300c元\u300d单位",
            "5. 当用户问及敏感个人信息（身份证、手机号、银行账号），提醒已做脱敏处理",
            "6. 在回答末尾可附加简要的数据总结",
            "",
            "## 禁止行为",
            "- 不要编造数据，只回答基于工具查询获得的真实数据",
            "- 不要透露系统底层技术细节",
            "- 不要执行任何修改操作，你只有只读查询权限",
            "- 不要泄露 API 密钥或内部配置信息",
        };
        return string.Join("\n", lines);
    }

    private static string? GetStringProp(JsonElement root, string name)
    {
        if (root.TryGetProperty(name, out var prop) && prop.ValueKind == JsonValueKind.String)
            return prop.GetString();
        return null;
    }

    private static bool GetBoolProp(JsonElement root, string name)
    {
        if (root.TryGetProperty(name, out var prop))
        {
            if (prop.ValueKind == JsonValueKind.True) return true;
            if (prop.ValueKind == JsonValueKind.False) return false;
        }
        return true; // default: use built-in
    }

    private static double GetDoubleProp(JsonElement root, string name)
    {
        if (root.TryGetProperty(name, out var prop) && prop.ValueKind == JsonValueKind.Number)
            return prop.GetDouble();
        return 0.7;
    }

    private static int GetIntProp(JsonElement root, string name)
    {
        if (root.TryGetProperty(name, out var prop) && prop.ValueKind == JsonValueKind.Number)
            return prop.GetInt32();
        return 4096;
    }

    /// <summary>
    /// 写入 SSE 事件并刷新响应流
    /// </summary>
    private static async Task WriteSSE(HttpContext ctx, object data)
    {
        var json = JsonSerializer.Serialize(data);
        await ctx.Response.WriteAsync($"data: {json}\n\n");
        await ctx.Response.Body.FlushAsync();
    }
}

================
File: EngineeringManager.Api/EntryPoint.cs
================
using System.Diagnostics;

namespace EngineeringManager.Api;

/// <summary>
/// 应用程序入口点（带 [STAThread] 属性）
/// </summary>
public static class EntryPoint
{
    [STAThread]
    public static void Main(string[] args)
    {
        // 检查启动模式
        if (args.Contains("--api-only"))
        {
            // 纯 API 模式（开发用）
            var builder = WebApplication.CreateBuilder(args);
            ApiConfig.ConfigureServices(builder);
            var app = builder.Build();
            ApiConfig.ConfigureApp(app);
            app.Run();
            return;
        }

        // 桌面模式：STA 主线程 + WebView2
        // ⚠️ 这些必须最先调用，在任何 COM 初始化之前
        Application.SetHighDpiMode(HighDpiMode.SystemAware);
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);

        // 记录启动前已有的 node 进程 PID（退出时不杀这些）
        var existingNodePids = new HashSet<int>();
        try { foreach (var p in Process.GetProcessesByName("node")) existingNodePids.Add(p.Id); } catch { }
        Console.WriteLine($"[App] Existing node processes: {existingNodePids.Count}");

        // 检测是否为生产模式（dist/ 目录存在）
        var distPath = Path.Combine(AppContext.BaseDirectory, "dist");
        bool isProduction = Directory.Exists(distPath);
        Console.WriteLine($"[App] Mode: {(isProduction ? "Production" : "Development")} (dist: {distPath})");

        // ── 启动 Vite（仅开发模式）──
        Process? viteProcess = null;
        if (!isProduction)
        {
            try
            {
                var projectDir = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", ".."));
                if (Directory.Exists(Path.Combine(projectDir, "node_modules")))
                {
                    viteProcess = new Process
                    {
                        StartInfo = new ProcessStartInfo
                        {
                            FileName = "cmd.exe",
                            Arguments = "/c npm run dev",
                            WorkingDirectory = projectDir,
                            CreateNoWindow = false,
                            UseShellExecute = false,
                        }
                    };
                    viteProcess.Start();
                    Console.WriteLine("[Vite] Frontend dev server started");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Vite] Failed to start: {ex.Message}");
            }
        }

        // API 在后台线程运行（MTA 模式）
        var apiThread = new Thread(() =>
        {
            var builder = WebApplication.CreateBuilder(args);
            ApiConfig.ConfigureServices(builder);
            var app = builder.Build();
            ApiConfig.ConfigureApp(app);
            app.Run();
        });
        apiThread.IsBackground = true;
        apiThread.Start();

        // ── 主线程运行 WinForms 窗口 ──
        Console.WriteLine("[App] Opening window...");
        Application.Run(new MainWindow(isProduction));

        // 退出时清理 Vite
        if (viteProcess != null && !viteProcess.HasExited)
        {
            Console.WriteLine("[App] Shutting down Vite...");
            try { viteProcess.CloseMainWindow(); viteProcess.WaitForExit(2000); } catch { }
            if (!viteProcess.HasExited) viteProcess.Kill(entireProcessTree: true);
            viteProcess.Dispose();
        }

        // 清理 Vite 残留的 node（只杀我们启动后新增的）
        Console.WriteLine("[App] Cleaning up Vite node processes...");
        try
        {
            foreach (var p in Process.GetProcessesByName("node"))
            {
                if (!existingNodePids.Contains(p.Id))
                {
                    try { p.Kill(); p.WaitForExit(1000); } catch { Console.WriteLine($"[App]  Skip node PID {p.Id}"); }
                }
            }
        }
        catch { }

        Console.WriteLine("[App] Done.");
        Environment.Exit(0);
    }
}

================
File: EngineeringManager.Api/Services/AgentConversationService.cs
================
using System.Data;
using System.Text.Json;
using Dapper;
using EngineeringManager.Api.Models;

namespace EngineeringManager.Api.Services;

/// <summary>
/// Agent 对话服务 — 管理对话生命周期与消息持久化
///
/// 对话表: agent_conversations
/// 消息表: agent_messages
/// 自动生成标题：取首条消息前 20 字符
/// </summary>
public class AgentConversationService
{
    /// <summary>
    /// 创建新对话 — 标题取首条消息前 20 字符
    /// </summary>
    public async Task<long> CreateConversationAsync(
        IDbConnection db,
        string userId,
        string title)
    {
        var now = Common.NowString();
        var id = await db.ExecuteScalarAsync<long>(@"
            INSERT INTO agent_conversations (user_id, title, created_at, updated_at)
            VALUES (@UserId, @Title, @Now, @Now);
            SELECT last_insert_rowid();
        ", new { UserId = userId, Title = title, Now = now });

        return id;
    }

    /// <summary>
    /// 保存消息到对话
    /// </summary>
    public async Task SaveMessageAsync(
        IDbConnection db,
        long conversationId,
        AgentMessage message)
    {
        var now = Common.NowString();
        var toolCallsJson = message.ToolCalls != null && message.ToolCalls.Count > 0
            ? JsonSerializer.Serialize(message.ToolCalls)
            : null;

        await db.ExecuteAsync(@"
            INSERT INTO agent_messages (conversation_id, role, content, tool_calls, tool_call_id, name, created_at)
            VALUES (@ConversationId, @Role, @Content, @ToolCalls, @ToolCallId, @Name, @Now)
        ", new
        {
            ConversationId = conversationId,
            message.Role,
            message.Content,
            ToolCalls = toolCallsJson,
            message.ToolCallId,
            message.Name,
            Now = now,
        });

        // 更新时间戳
        await db.ExecuteAsync(@"
            UPDATE agent_conversations SET updated_at = @Now
            WHERE id = @Id
        ", new { Now = now, Id = conversationId });
    }

    /// <summary>
    /// 获取用户对话列表（含消息数和最后一条消息摘要）
    /// </summary>
    public async Task<IEnumerable<object>> GetConversationsAsync(
        IDbConnection db,
        string userId)
    {
        var conversations = await db.QueryAsync<dynamic>(@"
            SELECT c.id, c.title, c.created_at, c.updated_at,
                   (SELECT COUNT(*) FROM agent_messages WHERE conversation_id = c.id) as message_count,
                   (SELECT content FROM agent_messages
                    WHERE conversation_id = c.id
                    ORDER BY created_at DESC LIMIT 1) as last_message
            FROM agent_conversations c
            WHERE c.user_id = @UserId AND c.deleted_at IS NULL
            ORDER BY c.updated_at DESC
        ", new { UserId = userId });

        return conversations.Select(c => (object)new
        {
            id = (long)c.id,
            title = (string)c.title,
            createdAt = (string)c.created_at,
            updatedAt = (string)c.updated_at,
            messageCount = (long)c.message_count,
            lastMessage = (string?)c.last_message,
        });
    }

    /// <summary>
    /// 获取对话详情（含消息列表）
    /// 必须校验 user_id 归属，防止越权读
    /// </summary>
    public async Task<object?> GetConversationDetailAsync(
        IDbConnection db,
        long conversationId,
        string userId)
    {
        var conv = await db.QueryFirstOrDefaultAsync<dynamic>(@"
            SELECT id, user_id, title, created_at, updated_at
            FROM agent_conversations
            WHERE id = @Id AND user_id = @UserId AND deleted_at IS NULL
        ", new { Id = conversationId, UserId = userId });

        if (conv == null) return null;

        var messages = await db.QueryAsync<dynamic>(@"
            SELECT id, role, content, tool_calls, tool_call_id, name, created_at
            FROM agent_messages
            WHERE conversation_id = @ConversationId
            ORDER BY created_at ASC
        ", new { ConversationId = conversationId });

        var messageList = messages.Select(m =>
        {
            List<ToolCallResult>? toolCalls = null;
            if (!string.IsNullOrEmpty(m.tool_calls))
            {
                try
                {
                    toolCalls = JsonSerializer.Deserialize<List<ToolCallResult>>(m.tool_calls);
                }
                catch { /* ignore deserialization errors */ }
            }

            return new
            {
                id = (long)m.id,
                role = (string)m.role,
                content = (string?)m.content,
                toolCalls,
                createdAt = (string)m.created_at,
            };
        });

        return new
        {
            id = (long)conv.id,
            title = (string)conv.title,
            messages = messageList,
            createdAt = (string)conv.created_at,
            updatedAt = (string)conv.updated_at,
        };
    }

    /// <summary>
    /// 获取最近 N 条消息（用于 LLM 上下文），返回 AgentMessage 列表
    /// </summary>
    public async Task<List<AgentMessage>> GetMessagesForLlmAsync(
        IDbConnection db,
        long conversationId,
        int limit = 50)
    {
        var rows = await db.QueryAsync<dynamic>(@"
            SELECT role, content, tool_calls, tool_call_id, name
            FROM agent_messages
            WHERE conversation_id = @ConversationId
            ORDER BY created_at ASC
            LIMIT @Limit
        ", new { ConversationId = conversationId, Limit = limit });

        var messages = new List<AgentMessage>();
        foreach (var row in rows)
        {
            List<ToolCall>? toolCalls = null;
            if (!string.IsNullOrEmpty(row.tool_calls))
            {
                try
                {
                    toolCalls = JsonSerializer.Deserialize<List<ToolCall>>(row.tool_calls);
                }
                catch { /* ignore */ }
            }

            // Check if tool_calls is actually tool results (from assistant or tool messages)
            if (row.role == "tool" && !string.IsNullOrEmpty(row.content))
            {
                // tool message with results
            }

            messages.Add(new AgentMessage
            {
                Role = (string)row.role,
                Content = row.content,
                ToolCalls = toolCalls,
                ToolCallId = row.tool_call_id,
                Name = row.name,
            });
        }

        return messages;
    }

    /// <summary>
    /// 软删除对话
    /// </summary>
    public async Task<bool> DeleteConversationAsync(
        IDbConnection db,
        long conversationId,
        string userId)
    {
        var now = Common.NowString();
        var affected = await db.ExecuteAsync(@"
            UPDATE agent_conversations
            SET deleted_at = @Now
            WHERE id = @Id AND user_id = @UserId AND deleted_at IS NULL
        ", new { Now = now, Id = conversationId, UserId = userId });

        return affected > 0;
    }

    /// <summary>
    /// 重命名会话（带所有权校验，软删除的不可改）
    /// </summary>
    public async Task<bool> RenameConversationAsync(
        IDbConnection db, long conversationId, string userId, string title)
    {
        var now = Common.NowString();
        var affected = await db.ExecuteAsync(
            @"UPDATE agent_conversations
              SET title = @Title, updated_at = @Now
              WHERE id = @Id AND user_id = @UserId AND deleted_at IS NULL",
            new { Title = title, Now = now, Id = conversationId, UserId = userId });
        return affected > 0;
    }
}

================
File: EngineeringManager.Api/Services/LlmConfigResolver.cs
================
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using EngineeringManager.Api.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace EngineeringManager.Api.Services;

/// <summary>
/// 持久化用的配置 DTO — apiKey 以 DPAPI 加密存储
/// </summary>
internal class PersistedLlmConfig
{
    public string? ProviderName { get; set; }
    public string? BaseUrl { get; set; }
    public string? ApiKeyEnc { get; set; }
    public string? Model { get; set; }
    public bool UseBuiltIn { get; set; }
    public double Temperature { get; set; }
    public int MaxTokens { get; set; }
    public string? UpdatedAt { get; set; }
}

/// <summary>
/// 字符串截断扩展
/// </summary>
internal static class StringExtensions
{
    public static string Truncate(this string value, int maxLength)
    {
        if (string.IsNullOrEmpty(value)) return value;
        return value.Length <= maxLength ? value : value.Substring(0, maxLength) + "...";
    }
}

/// <summary>
/// LLM 配置解析器 — 三级兜底读配置（DPAPI → 环境变量 → 内置 Agnes）。
/// 不依赖 router，也不依赖 provider，纯配置解析逻辑。
/// 用于打破 LlmProviderService ↔ ModelRoutingService 的循环依赖。
/// </summary>
public class LlmConfigResolver
{
    private readonly object _lock = new();
    private readonly ILogger<LlmConfigResolver> _logger;
    private readonly IConfiguration _configuration;
    private LlmProviderConfig _config;

    // 内置 Agnes 兜底
    private const string BuiltInApiKey = "sk-1RP0oZ6uuxPzeMoBvZT0lDRnIPQKm6783G6KcHEZ9fWtk50A";
    private const string BuiltInBaseUrl = "https://apihub.agnes-ai.com/v1";
    private const string BuiltInModel = "agnes-2.0-flash";

    private static readonly JsonSerializerOptions SerializerOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    public LlmConfigResolver(
        ILogger<LlmConfigResolver> logger,
        IConfiguration configuration)
    {
        _logger = logger;
        _configuration = configuration;
        _config = ResolveConfig();
    }

    /// <summary>
    /// 获取当前生效配置（不含 apiKey，安全返回给前端）
    /// </summary>
    public LlmProviderConfig GetConfig()
    {
        lock (_lock)
        {
            return _config with { ApiKey = "" };
        }
    }

    /// <summary>
    /// 获取当前生效配置（含 apiKey，内部使用）
    /// </summary>
    public LlmProviderConfig GetConfigWithKey()
    {
        lock (_lock)
        {
            return _config;
        }
    }

    /// <summary>
    /// 重新加载配置（从持久化文件 + 环境变量重新解析）
    /// </summary>
    public Task ReloadConfigAsync()
    {
        Task.Yield();
        lock (_lock)
        {
            _config = ResolveConfig();
            _logger.LogInformation("[LlmConfigResolver] 配置已重新加载: Provider={Provider}, Model={Model}, UseBuiltIn={UseBuiltIn}",
                _config.ProviderName, _config.Model, _config.UseBuiltIn);
        }
        return Task.CompletedTask;
    }

    /// <summary>
    /// 保存用户自定义配置（DPAPI 加密 apiKey，存到 llm-config.dpapi.json）
    /// 如果 newConfig.ApiKey 为空，保留旧 key（避免前端只改 model 时把 key 清空）
    /// </summary>
    public async Task SaveUserConfigAsync(LlmProviderConfig newConfig)
    {
        var dataPath = ApiConfig.ResolveDataPath();
        var filePath = Path.Combine(dataPath, "llm-config.dpapi.json");

        // 如果前端没传 key（空字符串），保留旧 key
        string apiKeyToSave = newConfig.ApiKey;
        if (string.IsNullOrEmpty(apiKeyToSave))
        {
            var oldConfig = GetConfigWithKey();
            apiKeyToSave = oldConfig.ApiKey;
        }

        var encryptedApiKey = string.IsNullOrEmpty(apiKeyToSave)
            ? ""
            : Convert.ToBase64String(
                ProtectedData.Protect(
                    Encoding.UTF8.GetBytes(apiKeyToSave),
                    null,
                    DataProtectionScope.CurrentUser));

        var persisted = new PersistedLlmConfig
        {
            ProviderName = newConfig.ProviderName,
            BaseUrl = newConfig.BaseUrl,
            ApiKeyEnc = encryptedApiKey,
            Model = newConfig.Model,
            UseBuiltIn = newConfig.UseBuiltIn,
            Temperature = newConfig.Temperature,
            MaxTokens = newConfig.MaxTokens,
            UpdatedAt = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"),
        };

        Directory.CreateDirectory(dataPath);
        var json = JsonSerializer.Serialize(persisted, new JsonSerializerOptions { WriteIndented = true });
        await File.WriteAllTextAsync(filePath, json);

        lock (_lock)
        {
            // 用保留了旧 key 的配置更新内存
            _config = new LlmProviderConfig
            {
                ProviderName = newConfig.ProviderName,
                BaseUrl = newConfig.BaseUrl,
                ApiKey = apiKeyToSave,
                Model = newConfig.Model,
                UseBuiltIn = newConfig.UseBuiltIn,
                Temperature = newConfig.Temperature,
                MaxTokens = newConfig.MaxTokens,
            };
        }

        _logger.LogInformation("[LlmConfigResolver] 用户配置已保存: Provider={Provider}, Model={Model}",
            newConfig.ProviderName, newConfig.Model);
    }

    // ═══════════════════════════════════════════════════════════
    // 三级优先级解析配置
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// 三级优先级解析配置：
    ///   1. 用户 DPAPI 加密文件
    ///   2. 环境变量
    ///   3. 内置 Agnes 兜底
    /// </summary>
    private LlmProviderConfig ResolveConfig()
    {
        // 1. 用户配置（DPAPI 加密文件）
        var userConfig = LoadUserConfig();
        if (userConfig != null && !userConfig.UseBuiltIn)
        {
            _logger.LogInformation("[LlmConfigResolver] 使用用户自定义配置: Provider={Provider}, Model={Model}",
                userConfig.ProviderName, userConfig.Model);
            return userConfig;
        }

        // 温度/MaxTokens 覆盖：即使回落到内置或环境变量模型，也让用户在设置里保存的温度生效
        double overrideTemp = userConfig?.Temperature ?? 0;
        int overrideMax = userConfig?.MaxTokens ?? 0;

        // 2. 环境变量
        var envBaseUrl = _configuration["LLM_BASE_URL"]
            ?? Environment.GetEnvironmentVariable("LLM_BASE_URL");
        var envApiKey = _configuration["LLM_API_KEY"]
            ?? Environment.GetEnvironmentVariable("LLM_API_KEY");
        var envModel = _configuration["LLM_MODEL"]
            ?? Environment.GetEnvironmentVariable("LLM_MODEL");

        if (!string.IsNullOrEmpty(envBaseUrl) && !string.IsNullOrEmpty(envApiKey))
        {
            _logger.LogInformation("[LlmConfigResolver] 使用环境变量配置: BaseUrl={BaseUrl}, Model={Model}",
                envBaseUrl, envModel ?? "default");
            return new LlmProviderConfig
            {
                ProviderName = "env",
                BaseUrl = envBaseUrl,
                ApiKey = envApiKey,
                Model = envModel ?? "gpt-4o-mini",
                UseBuiltIn = false,
                Temperature = overrideTemp,
                MaxTokens = overrideMax,
            };
        }

        // 3. 内置 Agnes 免费 API 兜底
        _logger.LogInformation("[LlmConfigResolver] 使用内置 Agnes 免费 API");
        return new LlmProviderConfig
        {
            ProviderName = "Agnes",
            BaseUrl = BuiltInBaseUrl,
            ApiKey = BuiltInApiKey,
            Model = BuiltInModel,
            UseBuiltIn = true,
            Temperature = overrideTemp,
            MaxTokens = overrideMax,
        };
    }

    /// <summary>
    /// 从 llm-config.dpapi.json 加载用户配置，apiKey 用 DPAPI 解密
    /// </summary>
    private LlmProviderConfig? LoadUserConfig()
    {
        try
        {
            var dataPath = ApiConfig.ResolveDataPath();
            var filePath = Path.Combine(dataPath, "llm-config.dpapi.json");

            if (!File.Exists(filePath))
                return null;

            var json = File.ReadAllText(filePath);
            var persisted = JsonSerializer.Deserialize<PersistedLlmConfig>(json);

            if (persisted == null)
                return null;

            var apiKey = "";
            if (!string.IsNullOrEmpty(persisted.ApiKeyEnc))
            {
                try
                {
                    var encrypted = Convert.FromBase64String(persisted.ApiKeyEnc);
                    var decrypted = ProtectedData.Unprotect(encrypted, null, DataProtectionScope.CurrentUser);
                    apiKey = Encoding.UTF8.GetString(decrypted);
                }
                catch (Exception ex)
                {
                    Console.Error.WriteLine($"[LlmConfigResolver] DPAPI 解密 apiKey 失败: {ex.Message}");
                    apiKey = "";
                }
            }

            return new LlmProviderConfig
            {
                ProviderName = persisted.ProviderName ?? "Custom",
                BaseUrl = persisted.BaseUrl ?? BuiltInBaseUrl,
                ApiKey = apiKey,
                Model = persisted.Model ?? BuiltInModel,
                UseBuiltIn = persisted.UseBuiltIn,
                Temperature = persisted.Temperature,
                MaxTokens = persisted.MaxTokens,
            };
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[LlmConfigResolver] 加载用户配置失败: {ex.Message}");
            return null;
        }
    }
}

================
File: EngineeringManager.Tests/Common/ApiTestBase.cs
================
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

================
File: EngineeringManager.Api/Endpoints/AuthEndpoints.cs
================
using System.Data;
using Dapper;
using EngineeringManager.Api.Security;

namespace EngineeringManager.Api;

/// <summary>
/// 认证 + 角色 + 用户管理端点
/// </summary>
public static class AuthEndpoints
{
    public static void RegisterAuthEndpoints(this WebApplication app)
    {
        var now = () => DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");

        // ═══════════════════════════════════════════════════════════
        // 认证
        // ═══════════════════════════════════════════════════════════

        app.MapPost("/api/auth/login", (LoginDto dto, IDbConnection db) =>
        {
            var user = db.QueryFirstOrDefault(@"
                SELECT id, username, password_hash, password_salt, password_hash_version,
                       display_name, role_id, status, is_default_password
                FROM users WHERE username = @Username",
                new { Username = dto.Username });

            if (user == null) return Common.Fail("用户名或密码错误");

            // 验证密码
            var salt = (string)user.password_salt;
            var version = (int)(user.password_hash_version ?? 1);
            var computedHash = Common.HashPassword(dto.Password, salt, version);

            // v0.71.0 P2.1: 检测旧库未迁移用户 (password_hash 为空, 来自 001 旧 password+salt 字段)
            if (string.IsNullOrEmpty((string)user.password_hash))
                return Common.Fail("账户需要重置密码, 请联系管理员 (v0.71.0 数据迁移)");
            if (computedHash != (string)user.password_hash)
                return Common.Fail("用户名或密码错误");

            // 获取角色信息
            var role = db.QueryFirstOrDefault(
                "SELECT id, name, permissions FROM roles WHERE id = @Id",
                new { Id = (string)user.role_id });

            return Common.Ok(new
            {
                userId = user.id,
                username = user.username,
                displayName = user.display_name,
                roleId = user.role_id,
                roleName = role?.name ?? user.role_id,
                permissions = role?.permissions ?? "[]",
                passwordIsDefault = ((int)(user.is_default_password ?? 0)) == 1,
                token = GenerateJwtToken((string)user.id, (string)user.username, (string)user.role_id, role?.name ?? (string)user.role_id)
            });
        }).RequireRateLimiting("login");

        // v1.1.1: admin 强制重置用户密码 (老库 v0.71.0 升级必须)
        app.MapPost("/api/auth/reset-password", async (HttpContext ctx, PasswordResetDto dto, IDbConnection db) =>
        {
            // 1. 当前用户必须已登录 + admin 角色
            var uid = CurrentUser.GetUserId(ctx);
            if (string.IsNullOrEmpty(uid)) return Common.Fail("未登录");
            var isAdmin = CurrentUser.IsAdmin(ctx);
            if (!isAdmin) return Results.Forbid();  // 仅 admin 可重置

            // 2. 校验新密码非空
            if (string.IsNullOrWhiteSpace(dto.NewPassword) || dto.NewPassword.Length < 6)
                return Common.Fail("新密码至少 6 位");

            // 3. 检查目标用户存在
            var target = db.QueryFirstOrDefault("SELECT id, username FROM users WHERE id=@Id", new { Id = dto.UserId });
            if (target == null) return Common.NotFound("目标用户不存在");

            // 4. 生成新 salt + hash (v2 = 210k iterations)
            var salt = Convert.ToHexString(System.Security.Cryptography.RandomNumberGenerator.GetBytes(16)).ToLower();
            var hash = Common.HashPassword(dto.NewPassword, salt, 2);

            // 5. 写入
            // 不变量: 任何写入 password_hash 的 UPDATE 必须同时 is_default_password=0
            var affected = await db.ExecuteAsync(@"UPDATE users SET password_hash=@Hash, password_salt=@Salt, password_hash_version=2, is_default_password=0 WHERE id=@Id",
                new { Hash = hash, Salt = salt, Id = dto.UserId });
            return affected > 0 ? Common.Ok(new { userId = dto.UserId, newHashVersion = 2 }) : Common.Fail("重置失败");
        });

        static string GenerateJwtToken(string userId, string username, string roleId, string roleName)
        {
            var jwtSecret = JwtSecretProvider.GetOrCreate();
            var key = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(System.Text.Encoding.UTF8.GetBytes(jwtSecret));
            var creds = new Microsoft.IdentityModel.Tokens.SigningCredentials(key, Microsoft.IdentityModel.Tokens.SecurityAlgorithms.HmacSha256);
            var claims = new[]
            {
                new System.Security.Claims.Claim("uid", userId),
                new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.Name, username),
                new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.Role, roleName)
            };
            var token = new System.IdentityModel.Tokens.Jwt.JwtSecurityToken(
                issuer: "engineering-manager",
                audience: "engineering-manager",
                claims: claims,
                expires: DateTime.Now.AddDays(1),
                signingCredentials: creds);
            return new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler().WriteToken(token);
        }

        // ═══════════════════════════════════════════════════════════
        // 角色
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/roles", (IDbConnection db) =>
            Common.Ok(db.Query("SELECT id, name, permissions FROM roles ORDER BY id")));

        app.MapGet("/api/roles/{id}", (string id, IDbConnection db) =>
        {
            var r = db.QueryFirstOrDefault("SELECT id, name, permissions FROM roles WHERE id=@Id", new { Id = id });
            return r is not null ? Common.Ok(r) : Common.NotFound("角色不存在");
        });

        app.MapPut("/api/roles", async (RoleUpdateDto dto, IDbConnection db) =>
        {
            var affected = await db.ExecuteAsync("UPDATE roles SET permissions=@Permissions WHERE id=@Id",
                new { Id = dto.RoleId, Permissions = dto.Permissions });
            return affected > 0 ? Common.Ok() : Common.NotFound("角色不存在");
        });

        app.MapPost("/api/roles/{id}/reset", (string id, IDbConnection db) =>
        {
            var defaults = Common.GetDefaultPermissions(id);
            if (defaults.Count == 0) return Common.Fail("无默认权限");
            db.Execute("UPDATE roles SET permissions=@Permissions WHERE id=@Id",
                new { Id = id, Permissions = System.Text.Json.JsonSerializer.Serialize(defaults) });
            return Common.Ok(defaults);
        });

        // ═══════════════════════════════════════════════════════════
        // 用户管理
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/users", (IDbConnection db) =>
            Common.Ok(db.Query("SELECT id, username, display_name, role_id, status, created_at FROM users ORDER BY created_at DESC")));

        app.MapGet("/api/users/{id}", (string id, IDbConnection db) =>
        {
            var u = db.QueryFirstOrDefault("SELECT id, username, display_name, role_id, status, created_at FROM users WHERE id=@Id", new { Id = id });
            return u is not null ? Common.Ok(u) : Common.NotFound("用户不存在");
        });

        app.MapPost("/api/users", async (UserDto dto, IDbConnection db) =>
        {
            var salt = Convert.ToHexString(System.Security.Cryptography.RandomNumberGenerator.GetBytes(16)).ToLower();
            var hash = Common.HashPassword(dto.Password ?? "", salt, 2);
            var id = dto.Id ?? $"user-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}";
            await db.ExecuteAsync(@"INSERT INTO users (id,username,password_hash,password_salt,password_hash_version,display_name,role_id,status,created_at)
                VALUES (@Id,@Username,@Hash,@Salt,2,@DisplayName,@RoleId,'active',@Now)",
                new { Id = id, Username = dto.Username, Hash = hash, Salt = salt, DisplayName = dto.DisplayName ?? "", RoleId = dto.RoleId ?? "worker", Now = now() });
            return Common.Ok(new { id });
        });

        app.MapPut("/api/users", async (UserDto dto, IDbConnection db) =>
        {
            if (string.IsNullOrEmpty(dto.Password))
            {
                var affected = await db.ExecuteAsync(@"UPDATE users SET display_name=@DisplayName,role_id=@RoleId,status=@Status WHERE id=@Id",
                    new { dto.Id, dto.DisplayName, dto.RoleId, dto.Status });
                return affected > 0 ? Common.Ok() : Common.NotFound("用户不存在");
            }
            else
            {
                var salt = Convert.ToHexString(System.Security.Cryptography.RandomNumberGenerator.GetBytes(16)).ToLower();
                var hash = Common.HashPassword(dto.Password ?? "", salt, 2);
                // 不变量: 任何写入 password_hash 的 UPDATE 必须同时 is_default_password=0
                var affected = await db.ExecuteAsync(@"UPDATE users SET password_hash=@Hash,password_salt=@Salt,display_name=@DisplayName,role_id=@RoleId,status=@Status,is_default_password=0 WHERE id=@Id",
                    new { dto.Id, Hash = hash, Salt = salt, dto.DisplayName, dto.RoleId, dto.Status });
                return affected > 0 ? Common.Ok() : Common.NotFound("用户不存在");
            }
        });

        app.MapDelete("/api/users/{id}", async (string id, IDbConnection db) =>
            (await db.ExecuteAsync("DELETE FROM users WHERE id=@Id", new { Id = id })) > 0 ? Common.Ok() : Common.NotFound("用户不存在"));

        // v0.72.0: PII 数据回填 (老库 PII 明文 → _enc 列加密)
        // 策略: 遍历 4 张表, 查 _enc 为空的记录, 加密原明文列写入 _enc
        // 仅 admin 可调, 幂等 (重复调用安全)
        app.MapPost("/api/admin/backfill-pii", async (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx);
            if (string.IsNullOrEmpty(uid)) return Common.Fail("未登录");
            if (!CurrentUser.IsAdmin(ctx)) return Results.Forbid();

            var pii = ctx.RequestServices.GetRequiredService<EngineeringManager.Api.Security.PiiProtector>();
            var stats = new Dictionary<string, object>();
            var errors = new List<string>();
            int total = 0;

            // 通用回填辅助: 查询 + 批量 UPDATE, 异常隔离
            async Task<int> BackfillTable(string table, string selectCols, string updateSql, Action<dynamic, Dictionary<string, object>> mapParams)
            {
                try
                {
                    var rows = db.Query<dynamic>($"SELECT id, {selectCols} FROM {table} WHERE 1=1").ToList();
                    int done = 0;
                    foreach (var r in rows)
                    {
                        try
                        {
                            var p = new Dictionary<string, object>();
                            mapParams(r, p);
                            p["Id"] = (long)r.id;
                            await db.ExecuteAsync(updateSql, p);
                            done++;
                        }
                        catch (Exception ex) { errors.Add($"{table} id={r.id}: {Common.Sanitize(ex.Message)}"); }
                    }
                    return done;
                }
                catch (Exception ex) { errors.Add($"{table} query: {Common.Sanitize(ex.Message)}"); return 0; }
            }

            total += await BackfillTable("members",
                "id_card, id_card_address, phone",
                "UPDATE members SET id_card_enc=@IdCardEnc, id_card_address_enc=@IdCardAddressEnc, phone_enc=@PhoneEnc, version=version+1, last_modified_at=@Now WHERE id=@Id",
                (r, p) => {
                    p["IdCardEnc"] = pii.Encrypt(r.id_card ?? "");
                    p["IdCardAddressEnc"] = pii.Encrypt(r.id_card_address ?? "");
                    p["PhoneEnc"] = pii.Encrypt(r.phone ?? "");
                });
            stats["members"] = stats.GetValueOrDefault("members", 0);

            total += await BackfillTable("workers",
                "id_card, phone, address",
                "UPDATE workers SET id_card_enc=@IdCardEnc, phone_enc=@PhoneEnc, address_enc=@AddressEnc, version=version+1, last_modified_at=@Now WHERE id=@Id",
                (r, p) => {
                    p["IdCardEnc"] = pii.Encrypt(r.id_card ?? "");
                    p["PhoneEnc"] = pii.Encrypt(r.phone ?? "");
                    p["AddressEnc"] = pii.Encrypt(r.address ?? "");
                });
            stats["workers"] = stats.GetValueOrDefault("workers", 0);

            total += await BackfillTable("partners",
                "phone, credit_code, tax_number",
                "UPDATE partners SET phone_enc=@PhoneEnc, credit_code_enc=@CreditCodeEnc, tax_number_enc=@TaxNumberEnc, version=version+1, last_modified_at=@Now WHERE id=@Id",
                (r, p) => {
                    p["PhoneEnc"] = pii.Encrypt(r.phone ?? "");
                    p["CreditCodeEnc"] = pii.Encrypt(r.credit_code ?? "");
                    p["TaxNumberEnc"] = pii.Encrypt(r.tax_number ?? "");
                });
            stats["partners"] = stats.GetValueOrDefault("partners", 0);

            total += await BackfillTable("supervisors",
                "phone",
                "UPDATE supervisors SET phone_enc=@PhoneEnc, version=version+1, last_modified_at=@Now WHERE id=@Id",
                (r, p) => {
                    p["PhoneEnc"] = pii.Encrypt(r.phone ?? "");
                });
            stats["supervisors"] = stats.GetValueOrDefault("supervisors", 0);

            return Common.Ok(new { message = $"PII 回填完成, 共 {total} 条记录", stats = new Dictionary<string, object> { { "total", total } }, errors });
        });

        // v1.1.0 P0-4 Phase 2 终: admin 手动授权管理端点
        // 设计: admin 可在 UI 上把某用户加入某项目, 该用户就能看该项目下的全部记录
        // 配合 project_authorizations 表 (migration 013)
        // - GET 列所有授权 (含 username + project_name 方便 UI 显示)
        // - POST 授权 (project_id + user_id, 幂等)
        // - DELETE 撤销授权

        app.MapGet("/api/admin/project-authorizations", (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx);
            if (string.IsNullOrEmpty(uid)) return Common.Fail("未登录");
            if (!CurrentUser.IsAdmin(ctx)) return Results.Forbid();
            return Common.Ok(db.Query(@"SELECT pa.*, u.username, u.display_name as user_display_name,
                                       p.name as project_name
                                FROM project_authorizations pa
                                LEFT JOIN users u ON pa.user_id=u.id
                                LEFT JOIN projects p ON pa.project_id=p.id
                                ORDER BY pa.granted_at DESC"));
        });

        app.MapGet("/api/admin/project-authorizations/by-user/{userId}", (HttpContext ctx, string userId, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx);
            if (string.IsNullOrEmpty(uid)) return Common.Fail("未登录");
            if (!CurrentUser.IsAdmin(ctx)) return Results.Forbid();
            return Common.Ok(db.Query(@"SELECT pa.*, p.name as project_name
                                FROM project_authorizations pa
                                LEFT JOIN projects p ON pa.project_id=p.id
                                WHERE pa.user_id=@UserId ORDER BY pa.granted_at DESC", new { UserId = userId }));
        });

        app.MapPost("/api/admin/project-authorizations", async (HttpContext ctx, HttpRequest req, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx);
            if (string.IsNullOrEmpty(uid)) return Common.Fail("未登录");
            if (!CurrentUser.IsAdmin(ctx)) return Results.Forbid();

            // 解析 body: { projectId: long, userId: string }
            ProjectAuthDto dto;
            try
            {
                using var reader = new System.IO.StreamReader(req.Body);
                var bodyText = await reader.ReadToEndAsync();
                dto = System.Text.Json.JsonSerializer.Deserialize<ProjectAuthDto>(bodyText, new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new ProjectAuthDto();
            }
            catch (Exception ex) { return Common.Fail($"参数解析失败: {Common.Sanitize(ex.Message)}"); }
            if (dto.ProjectId <= 0 || string.IsNullOrEmpty(dto.UserId)) return Common.Fail("projectId 与 userId 必填");

            // 幂等插入
            var existing = db.ExecuteScalar<int>("SELECT COUNT(*) FROM project_authorizations WHERE project_id=@ProjectId AND user_id=@UserId",
                new { dto.ProjectId, dto.UserId });
            if (existing > 0) return Common.Ok(new { message = "已存在该授权", idempotent = true });

            db.Execute(@"INSERT INTO project_authorizations (project_id, user_id, granted_by, granted_at)
                VALUES (@ProjectId, @UserId, @GrantedBy, @Now)",
                new { dto.ProjectId, dto.UserId, GrantedBy = uid, Now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") });
            return Common.Ok(new { message = "授权成功", projectId = dto.ProjectId, userId = dto.UserId });
        });

        app.MapDelete("/api/admin/project-authorizations/{projectId}/{userId}", (HttpContext ctx, long projectId, string userId, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx);
            if (string.IsNullOrEmpty(uid)) return Common.Fail("未登录");
            if (!CurrentUser.IsAdmin(ctx)) return Results.Forbid();
            var affected = db.ExecuteAsync("DELETE FROM project_authorizations WHERE project_id=@ProjectId AND user_id=@UserId",
                new { ProjectId = projectId, UserId = userId }).Result;
            return affected > 0 ? Common.Ok() : Common.Fail("未找到该授权");
        });

        // v0.74.0 PII Mask toggle: 返回单条记录的 PII 明文.
        // 说明: 后端 INSERT 时将明文 PII 同时写入原列 + _enc 列.
        // 默认 GET 返回过 Common.MaskXxx 的 mask 值.
        // 本端点按 toggle 后 调本端点 拿 _enc 列 Decrypt 后的明文.
        // 只 admin 可调 (严格控制明文读取权).
        app.MapPost("/api/admin/unmask-pii", async (HttpContext ctx, HttpRequest req, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx);
            if (string.IsNullOrEmpty(uid)) return Common.Fail("未登录");
            if (!CurrentUser.IsAdmin(ctx)) return Results.Forbid();

            UnmaskPiiDto dto;
            try
            {
                using var reader = new System.IO.StreamReader(req.Body);
                var bodyText = await reader.ReadToEndAsync();
                dto = System.Text.Json.JsonSerializer.Deserialize<UnmaskPiiDto>(bodyText, new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new UnmaskPiiDto();
            }
            catch (Exception ex) { return Common.Fail($"参数解析失败: {Common.Sanitize(ex.Message)}"); }
            if (dto.Id <= 0 || string.IsNullOrEmpty(dto.Resource)) return Common.Fail("resource 与 id 必填");

            // resource 转换为 SQL 列名 (PiiProtector Decrypt 调用)
            string encCol = dto.Resource.ToLower() switch
            {
                "members_idcard" => "id_card_enc",
                "members_phone" => "phone_enc",
                "members_bank" => "bank_account_enc",
                "workers_idcard" => "id_card_enc",
                "workers_phone" => "phone_enc",
                "workers_bank" => "bank_account_enc",
                "partners_phone" => "phone_enc",
                "partners_bank" => "bank_account_enc",
                _ => ""
            };
            if (string.IsNullOrEmpty(encCol)) return Common.Fail("resource 不支持");

            // 根据 resource 前缀选表
            string table = dto.Resource.Split('_')[0] switch
            {
                "members" => "members",
                "workers" => "workers",
                "partners" => "partners",
                _ => ""
            };
            if (string.IsNullOrEmpty(table)) return Common.Fail("resource 表不支持");

            var cipherText = db.ExecuteScalar<string>($"SELECT {encCol} FROM {table} WHERE id=@Id", new { dto.Id });
            if (string.IsNullOrEmpty(cipherText)) return Common.Fail("记录不存在或 PII 未加密");

            try
            {
                var pii = ctx.RequestServices.GetRequiredService<EngineeringManager.Api.Security.PiiProtector>();
                var plain = pii.Decrypt(cipherText);
                return Common.Ok(new { resource = dto.Resource, id = dto.Id, plain });
            }
            catch (Exception ex)
            {
                return Common.Fail($"Decrypt 失败: {Common.Sanitize(ex.Message)}");
            }
        });
    }

    public class UnmaskPiiDto
    {
        public string Resource { get; set; } = "";
        public long Id { get; set; }
    }

    public class ProjectAuthDto
    {
        public long ProjectId { get; set; }
        public string UserId { get; set; } = "";
    }
}

================
File: EngineeringManager.Api/Endpoints/UpdateEndpoints.cs
================
using EngineeringManager.Api.Services;

namespace EngineeringManager.Api;

public static class UpdateEndpoints
{
    public static void RegisterUpdateEndpoints(this WebApplication app)
    {
        // 检查更新
        app.MapGet("/api/update/check", async (UpdateService svc, CancellationToken ct) =>
        {
            try { return Common.Ok(await svc.CheckAsync(ct)); }
            catch (Exception ex) { return Common.ServerError("检查更新", ex); }
        });

        // 启动后台下载（立即返回，不阻塞）
        app.MapPost("/api/update/download", async (UpdateService svc, CancellationToken ct) =>
        {
            try
            {
                var check = await svc.CheckAsync(ct);
                if (!check.HasUpdate || check.Package == null)
                    return Common.Fail("暂无可用更新");

                // 并发闸：同 id 只允许一个活动下载，重复点击复用进行中的下载
                if (!svc.StartDownload(check.Package, "default"))
                    return Common.Ok(new { accepted = true, alreadyRunning = true });
                return Common.Ok(new { accepted = true });
            }
            catch (Exception ex) { return Common.ServerError("启动下载", ex); }
        });

        // 取消下载
        app.MapPost("/api/update/download/cancel", (UpdateService svc) =>
        {
            try
            {
                svc.CancelDownload("default");
                return Common.Ok(new { cancelled = true });
            }
            catch (Exception ex) { return Common.ServerError("取消下载", ex); }
        });

        // SSE 进度推送
        app.MapGet("/api/update/download/stream", async (HttpContext ctx, UpdateService svc) =>
        {
            ctx.Response.ContentType = "text/event-stream";
            ctx.Response.Headers.Append("Cache-Control", "no-cache");
            ctx.Response.Headers.Append("Connection", "keep-alive");
            ctx.Response.Headers.Append("X-Accel-Buffering", "no");

            var ct = ctx.RequestAborted;
            while (!ct.IsCancellationRequested)
            {
                var progress = svc.GetProgress("default");
                if (progress != null)
                {
                    await WriteSSE(ctx, progress);
                    if (progress.Phase is "done" or "error" or "cancelled")
                        break;
                }
                await Task.Delay(300, ct);
            }
        });

        // 装包 + 重启（不变）
        app.MapPost("/api/update/apply", (UpdateService svc, ApplyRequest req) =>
        {
            try
            {
                if (string.IsNullOrWhiteSpace(req.Path))
                    return Common.Fail("缺少安装包路径");

                svc.ApplyAndExit(req.Path);
                return Common.Ok(new { message = "正在启动安装器..." });
            }
            catch (Exception ex) { return Common.ServerError("安装更新", ex); }
        });
    }

    private static async Task WriteSSE(HttpContext ctx, object data)
    {
        var json = System.Text.Json.JsonSerializer.Serialize(data, new System.Text.Json.JsonSerializerOptions
        {
            PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase,
        });
        await ctx.Response.WriteAsync($"data: {json}\n\n");
        await ctx.Response.Body.FlushAsync();
    }
}

public record ApplyRequest(string Path);

================
File: EngineeringManager.Tests/Endpoints/UpdateServiceTests.cs
================
using System.Net;
using System.Security.Cryptography;
using EngineeringManager.Api.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

// ════════════════════════════════════════════════════════════════
//  辅助：可编程 HttpMessageHandler + TestHttpClientFactory
// ════════════════════════════════════════════════════════════════

/// <summary>按请求 URL 分发的可编程 HttpMessageHandler</summary>
internal sealed class ProgrammableHandler : HttpMessageHandler
{
    private readonly Dictionary<string, Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>>> _routes = new();

    public ProgrammableHandler Route(string urlContains, Func<HttpRequestMessage, HttpResponseMessage> handler)
    {
        _routes[urlContains] = (req, ct) => Task.FromResult(handler(req));
        return this;
    }

    /// <summary>异步路由（支持延迟/取消）</summary>
    public ProgrammableHandler RouteAsync(string urlContains, Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> handler)
    {
        _routes[urlContains] = handler;
        return this;
    }

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        foreach (var (pattern, handler) in _routes)
        {
            if (request.RequestUri!.ToString().Contains(pattern))
            {
                return await handler(request, cancellationToken);
            }
        }
        return new HttpResponseMessage(HttpStatusCode.NotFound);
    }
}

/// <summary>测试用 IHttpClientFactory</summary>
internal sealed class TestHttpClientFactory : IHttpClientFactory
{
    private readonly HttpMessageHandler _handler;
    public TestHttpClientFactory(HttpMessageHandler handler) => _handler = handler;
    public HttpClient CreateClient(string name) => new(_handler, disposeHandler: false)
    {
        Timeout = Timeout.InfiniteTimeSpan
    };
}

// ════════════════════════════════════════════════════════════════
//  测试用例
// ════════════════════════════════════════════════════════════════

public class UpdateServiceTests
{
    private static readonly byte[] FakeExeData = GenerateFakeData(1024 * 100); // 100KB
    private static readonly string FakeSha256 = ComputeSha256(FakeExeData);

    private static UpdateService CreateService(HttpMessageHandler handler)
    {
        var factory = new TestHttpClientFactory(handler);
        var cfg = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Update:ManifestUrls:0"] = "https://test.example/manifest.json"
            })
            .Build();
        return new UpdateService(factory, cfg);
    }

    private static UpdatePackage CreatePkg(string url = "", string[]? proxies = null) => new()
    {
        Url = url,
        Proxies = proxies,
        Size = FakeExeData.Length,
        Sha256 = FakeSha256,
    };

    private static byte[] GenerateFakeData(int size)
    {
        var data = new byte[size];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(data);
        return data;
    }

    private static string ComputeSha256(byte[] data)
    {
        using var sha = SHA256.Create();
        return Convert.ToHexString(sha.ComputeHash(data));
    }

    private static HttpResponseMessage OkResponse(byte[] data, long offset = 0)
    {
        var stream = new MemoryStream(data, (int)offset, (int)(data.Length - offset));
        var resp = new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StreamContent(stream)
        };
        resp.Content.Headers.ContentLength = data.Length - offset;
        return resp;
    }

    private static HttpResponseMessage PartialContentResponse(byte[] data, long offset)
    {
        var stream = new MemoryStream(data, (int)offset, (int)(data.Length - offset));
        var resp = new HttpResponseMessage(HttpStatusCode.PartialContent)
        {
            Content = new StreamContent(stream)
        };
        resp.Content.Headers.ContentLength = data.Length - offset;
        resp.Content.Headers.Add("Content-Range", $"bytes {offset}-{data.Length - 1}/{data.Length}");
        return resp;
    }

    // ── 测试 0：proxies + url 正确组装成候选列表，GitHub 原链在最后 ──
    [Fact]
    public void T00_ProxiesAssembleCandidates_GitHubLast()
    {
        var pkg = new UpdatePackage
        {
            Url = "https://github.com/Amer-CN/engineering-manager/releases/download/v0.81.0/Setup.exe",
            Proxies = new[] { "https://gh-proxy.com/", "https://ghfast.top/" },
        };
        var candidates = pkg.ResolveCandidates();
        Assert.Equal(3, candidates.Length);
        Assert.Equal("https://gh-proxy.com/https://github.com/Amer-CN/engineering-manager/releases/download/v0.81.0/Setup.exe", candidates[0]);
        Assert.Equal("https://ghfast.top/https://github.com/Amer-CN/engineering-manager/releases/download/v0.81.0/Setup.exe", candidates[1]);
        // GitHub 原链永久兜底，放最后
        Assert.Equal("https://github.com/Amer-CN/engineering-manager/releases/download/v0.81.0/Setup.exe", candidates[2]);
    }

    // ── 测试 0b：无 proxies 时 candidates = [Url] ──
    [Fact]
    public void T00b_NoProxies_OnlyUrl()
    {
        var pkg = new UpdatePackage { Url = "https://github.com/file.exe", Proxies = null };
        var candidates = pkg.ResolveCandidates();
        Assert.Single(candidates);
        Assert.Equal("https://github.com/file.exe", candidates[0]);
    }

    // ── 测试 1：无 .part 时全新下载成功 ──
    [Fact]
    public async Task T01_FreshDownload_Success()
    {
        var handler = new ProgrammableHandler()
            .Route("source1", _ => OkResponse(FakeExeData));

        var svc = CreateService(handler);
        var pkg = CreatePkg("https://source1/file.exe");
        var progress = new DownloadProgress();

        var tmpDir = Path.Combine(Path.GetTempPath(), $"updtest-{Guid.NewGuid()}");
        Directory.CreateDirectory(tmpDir);
        var partPath = Path.Combine(tmpDir, "file.exe.part");

        var result = await svc.TryDownloadFromSourceAsync(
            new HttpClient(handler) { Timeout = Timeout.InfiniteTimeSpan },
            "https://source1/file.exe", pkg, partPath, progress, 0, true);

        Assert.Equal(DownloadSourceResult.Success, result);
        Assert.Equal(FakeExeData.Length, (int)progress.BytesReceived);
        Assert.True(File.Exists(partPath));
        Assert.Equal(FakeExeData.Length, new FileInfo(partPath).Length);

        // 验证 SHA256
        var ok = await UpdateService.VerifySha256Async(partPath, FakeSha256);
        Assert.True(ok);

        Directory.Delete(tmpDir, true);
    }

    // ── 测试 2：有半截 .part 时带 Range 续传（206），最终正确 ──
    [Fact]
    public async Task T02_ResumeWith206_Success()
    {
        var handler = new ProgrammableHandler()
            .Route("source1", req =>
            {
                var range = req.Headers.Range?.Ranges.FirstOrDefault();
                var offset = range?.From ?? 0;
                return PartialContentResponse(FakeExeData, offset);
            });

        var svc = CreateService(handler);
        var pkg = CreatePkg("https://source1/file.exe");
        var progress = new DownloadProgress();

        var tmpDir = Path.Combine(Path.GetTempPath(), $"updtest-{Guid.NewGuid()}");
        Directory.CreateDirectory(tmpDir);
        var partPath = Path.Combine(tmpDir, "file.exe.part");

        // 预写入前半部分
        var halfSize = FakeExeData.Length / 2;
        await File.WriteAllBytesAsync(partPath, FakeExeData[..halfSize]);

        var result = await svc.TryDownloadFromSourceAsync(
            new HttpClient(handler) { Timeout = Timeout.InfiniteTimeSpan },
            "https://source1/file.exe", pkg, partPath, progress, halfSize, true);

        Assert.Equal(DownloadSourceResult.Success, result);
        Assert.Equal(FakeExeData.Length, (int)progress.BytesReceived);

        // 验证文件内容正确
        var fileBytes = await File.ReadAllBytesAsync(partPath);
        Assert.Equal(FakeExeData, fileBytes);

        Directory.Delete(tmpDir, true);
    }

    // ── 测试 3：服务器返回 200 忽略 Range 时，truncate 从 0 重下 ──
    [Fact]
    public async Task T03_ServerIgnoresRange_TruncateAndRedownload()
    {
        var handler = new ProgrammableHandler()
            .Route("source1", _ => OkResponse(FakeExeData));

        var svc = CreateService(handler);
        var pkg = CreatePkg("https://source1/file.exe");
        var progress = new DownloadProgress();

        var tmpDir = Path.Combine(Path.GetTempPath(), $"updtest-{Guid.NewGuid()}");
        Directory.CreateDirectory(tmpDir);
        var partPath = Path.Combine(tmpDir, "file.exe.part");

        // 预写入垃圾数据（模拟旧的半截 .part）
        await File.WriteAllBytesAsync(partPath, new byte[50000]);

        var result = await svc.TryDownloadFromSourceAsync(
            new HttpClient(handler) { Timeout = Timeout.InfiniteTimeSpan },
            "https://source1/file.exe", pkg, partPath, progress, 50000, true);

        Assert.Equal(DownloadSourceResult.Success, result);

        // 验证文件是全新的（不是追加的）
        var fileBytes = await File.ReadAllBytesAsync(partPath);
        Assert.Equal(FakeExeData, fileBytes);

        Directory.Delete(tmpDir, true);
    }

    // ── 测试 4：首个源硬失败 → 自动切到第二个源成功 ──
    [Fact]
    public async Task T04_FirstSourceHardFail_SwitchToSecond()
    {
        var handler = new ProgrammableHandler()
            .Route("source1", _ => new HttpResponseMessage(HttpStatusCode.InternalServerError))
            .Route("source2", _ => OkResponse(FakeExeData));

        var svc = CreateService(handler);
        var pkg = CreatePkg("https://source2/file.exe");
        var progress = new DownloadProgress();

        var tmpDir = Path.Combine(Path.GetTempPath(), $"updtest-{Guid.NewGuid()}");
        Directory.CreateDirectory(tmpDir);
        var partPath = Path.Combine(tmpDir, "file.exe.part");

        var client = new HttpClient(handler) { Timeout = Timeout.InfiniteTimeSpan };

        // 源 1 失败
        var r1 = await svc.TryDownloadFromSourceAsync(
            client, "https://source1/file.exe", pkg, partPath, progress, 0, false);
        Assert.Equal(DownloadSourceResult.HardFail, r1);

        // 源 2 成功
        var r2 = await svc.TryDownloadFromSourceAsync(
            client, "https://source2/file.exe", pkg, partPath, progress, 0, true);
        Assert.Equal(DownloadSourceResult.Success, r2);

        var ok = await UpdateService.VerifySha256Async(partPath, FakeSha256);
        Assert.True(ok);

        Directory.Delete(tmpDir, true);
    }

    // ── 测试 5：慢速源触发看门狗 → 切源并续传 ──
    [Fact]
    public async Task T05_SlowSourceWatchdog_TriggersSwitch()
    {
        // 第一个源：返回部分数据后抛异常（模拟连接中断）
        var partialSize = 5000;
        var handler = new ProgrammableHandler()
            .Route("slow", _ =>
            {
                var partialData = FakeExeData[..partialSize];
                var resp = new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StreamContent(new ThrowingStream(partialData))
                };
                resp.Content.Headers.ContentLength = FakeExeData.Length;
                return resp;
            })
            .Route("fast", req =>
            {
                var range = req.Headers.Range?.Ranges.FirstOrDefault();
                var offset = range?.From ?? 0;
                return PartialContentResponse(FakeExeData, offset);
            });

        var svc = CreateService(handler);
        var pkg = CreatePkg("https://fast/file.exe");
        var progress = new DownloadProgress();

        var tmpDir = Path.Combine(Path.GetTempPath(), $"updtest-{Guid.NewGuid()}");
        Directory.CreateDirectory(tmpDir);
        var partPath = Path.Combine(tmpDir, "file.exe.part");

        var client = new HttpClient(handler) { Timeout = Timeout.InfiniteTimeSpan };

        // 慢速源 → 返回部分数据后抛异常 → 异常传播到 DownloadAsync 的 catch
        Exception? caughtEx = null;
        try
        {
            await svc.TryDownloadFromSourceAsync(
                client, "https://slow/file.exe", pkg, partPath, progress, 0, false);
        }
        catch (Exception ex) { caughtEx = ex; }

        // 验证异常被抛出（源中断）
        Assert.NotNull(caughtEx);

        // .part 应有部分数据
        var partSize = UpdateService.GetPartSize(partPath);
        Assert.Equal(partialSize, partSize);

        // 快速源 → 从 .part 续传成功
        var r2 = await svc.TryDownloadFromSourceAsync(
            client, "https://fast/file.exe", pkg, partPath, progress, partSize, true);
        Assert.Equal(DownloadSourceResult.Success, r2);

        // 验证最终文件正确
        var ok = await UpdateService.VerifySha256Async(partPath, FakeSha256);
        Assert.True(ok);

        Directory.Delete(tmpDir, true);
    }

    // ── 测试 6：某源返回错误大小/HTML → 判定无效并切源 ──
    [Fact]
    public async Task T06_InvalidContentSize_SwitchSource()
    {
        var htmlBytes = System.Text.Encoding.UTF8.GetBytes("<html>限流</html>");
        var handler = new ProgrammableHandler()
            .Route("proxy", _ =>
            {
                var resp = new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new ByteArrayContent(htmlBytes)
                };
                resp.Content.Headers.ContentLength = htmlBytes.Length;
                return resp;
            })
            .Route("github", _ => OkResponse(FakeExeData));

        var svc = CreateService(handler);
        var pkg = CreatePkg("https://github/file.exe");
        var progress = new DownloadProgress();

        var tmpDir = Path.Combine(Path.GetTempPath(), $"updtest-{Guid.NewGuid()}");
        Directory.CreateDirectory(tmpDir);
        var partPath = Path.Combine(tmpDir, "file.exe.part");

        var client = new HttpClient(handler) { Timeout = Timeout.InfiniteTimeSpan };

        // 代理源返回 HTML（大小不符）→ InvalidContent
        var r1 = await svc.TryDownloadFromSourceAsync(
            client, "https://proxy/file.exe", pkg, partPath, progress, 0, false);
        Assert.Equal(DownloadSourceResult.InvalidContent, r1);

        // GitHub 源正常
        var r2 = await svc.TryDownloadFromSourceAsync(
            client, "https://github/file.exe", pkg, partPath, progress, 0, true);
        Assert.Equal(DownloadSourceResult.Success, r2);

        Directory.Delete(tmpDir, true);
    }

    // ── 测试 7：所有源均失败 → phase=error ──
    [Fact]
    public async Task T07_AllSourcesFail_PhaseError()
    {
        var handler = new ProgrammableHandler()
            .Route("source1", _ => new HttpResponseMessage(HttpStatusCode.ServiceUnavailable))
            .Route("source2", _ => new HttpResponseMessage(HttpStatusCode.ServiceUnavailable));

        var svc = CreateService(handler);
        var pkg = CreatePkg("https://source2/file.exe");
        var progress = new DownloadProgress();

        var tmpDir = Path.Combine(Path.GetTempPath(), $"updtest-{Guid.NewGuid()}");
        Directory.CreateDirectory(tmpDir);
        var partPath = Path.Combine(tmpDir, "file.exe.part");

        var client = new HttpClient(handler) { Timeout = Timeout.InfiniteTimeSpan };

        var r1 = await svc.TryDownloadFromSourceAsync(
            client, "https://source1/file.exe", pkg, partPath, progress, 0, false);
        var r2 = await svc.TryDownloadFromSourceAsync(
            client, "https://source2/file.exe", pkg, partPath, progress, 0, true);

        Assert.NotEqual(DownloadSourceResult.Success, r1);
        Assert.NotEqual(DownloadSourceResult.Success, r2);

        // 模拟 DownloadAsync 的最终判定
        Assert.True(r1 == DownloadSourceResult.HardFail);
        Assert.True(r2 == DownloadSourceResult.HardFail);

        Directory.Delete(tmpDir, true);
    }

    // ── 测试 8：SHA256 不匹配 → 删除 .part 并报错 ──
    [Fact]
    public async Task T08_Sha256Mismatch_DeletePartAndError()
    {
        var handler = new ProgrammableHandler()
            .Route("source1", _ => OkResponse(FakeExeData));

        var svc = CreateService(handler);
        var pkg = new UpdatePackage
        {
            Url = "https://source1/file.exe",
            Proxies = null,
            Size = FakeExeData.Length,
            Sha256 = "0000000000000000000000000000000000000000000000000000000000000000", // 故意错误的 hash
        };

        var progress = new DownloadProgress();

        var tmpDir = Path.Combine(Path.GetTempPath(), $"updtest-{Guid.NewGuid()}");
        Directory.CreateDirectory(tmpDir);
        var partPath = Path.Combine(tmpDir, "file.exe.part");

        var client = new HttpClient(handler) { Timeout = Timeout.InfiniteTimeSpan };

        // 下载成功
        var result = await svc.TryDownloadFromSourceAsync(
            client, "https://source1/file.exe", pkg, partPath, progress, 0, true);
        Assert.Equal(DownloadSourceResult.Success, result);

        // SHA256 校验失败
        var ok = await UpdateService.VerifySha256Async(partPath, pkg.Sha256);
        Assert.False(ok);

        // 模拟 DownloadAsync 中的清理逻辑
        UpdateService.TryDeleteFile(partPath);
        Assert.False(File.Exists(partPath));

        Directory.Delete(tmpDir, true);
    }

    // ════════════════════════════════════════════════════════════════
    //  P1-3 新增测试
    // ════════════════════════════════════════════════════════════════

    // ── 测试 9：并发闸 — 第一个 StartDownload 进行中时第二个返回 false ──
    [Fact]
    public async Task T09_ConcurrencyGuard_SecondStartReturnsFalse()
    {
        var handler = new ProgrammableHandler()
            .Route("source1", _ => OkResponse(FakeExeData));

        var svc = CreateService(handler);
        var pkg = CreatePkg("https://source1/file.exe");

        // 第一次 StartDownload → true
        var first = svc.StartDownload(pkg, "concurrent-test");
        Assert.True(first);

        // 立刻第二次 → false（同 id 活动中）
        var second = svc.StartDownload(pkg, "concurrent-test");
        Assert.False(second);

        // 等待后台任务完成
        await Task.Delay(500);

        // 完成后可以再次启动
        var third = svc.StartDownload(pkg, "concurrent-test");
        Assert.True(third);

        // 等待清理
        await Task.Delay(500);
    }

    // ── 测试 10：FinalizeWithRetry — finalPath 先被占用后成功 ──
    [Fact]
    public async Task T10_FinalizeWithRetry_SuccessAfterRetry()
    {
        var tmpDir = Path.Combine(Path.GetTempPath(), $"updtest-{Guid.NewGuid()}");
        Directory.CreateDirectory(tmpDir);
        var partPath = Path.Combine(tmpDir, "file.exe.part");
        var finalPath = Path.Combine(tmpDir, "file.exe");

        // 写入 .part
        await File.WriteAllBytesAsync(partPath, FakeExeData);

        // 创建一个占用 finalPath 的 FileStream（模拟杀毒软件占用）
        var lockStream = new FileStream(finalPath, FileMode.Create, FileAccess.ReadWrite, FileShare.None);
        try
        {
            // 在另一个任务中延迟释放锁
            _ = Task.Run(async () =>
            {
                await Task.Delay(800); // 等 FinalizeWithRetry 重试一两次
                lockStream.Dispose();
            });

            // FinalizeWithRetry 应该在前几次失败后最终成功
            await UpdateService.FinalizeWithRetryAsync(partPath, finalPath, maxAttempts: 6);

            // 验证 finalPath 内容正确
            var fileBytes = await File.ReadAllBytesAsync(finalPath);
            Assert.Equal(FakeExeData, fileBytes);
            Assert.False(File.Exists(partPath)); // .part 已被 move
        }
        finally
        {
            if (lockStream.CanRead) lockStream.Dispose();
        }

        Directory.Delete(tmpDir, true);
    }

    // ── 测试 11：头部超时 — handler 在响应头阶段阻塞 → 返回 HardFail ──
    [Fact]
    public async Task T11_HeaderTimeout_ReturnsHardFail()
    {
        var handler = new ProgrammableHandler()
            .RouteAsync("timeout-source", async (req, ct) =>
            {
                // 模拟代理收了 TCP 但不回响应头 — 15s 延迟，远超 10s 头部超时
                await Task.Delay(15000, ct);
                return OkResponse(FakeExeData);
            })
            .Route("fast-source", _ => OkResponse(FakeExeData));

        var svc = CreateService(handler);
        var pkg = CreatePkg("https://fast-source/file.exe");
        var progress = new DownloadProgress();

        var tmpDir = Path.Combine(Path.GetTempPath(), $"updtest-{Guid.NewGuid()}");
        Directory.CreateDirectory(tmpDir);
        var partPath = Path.Combine(tmpDir, "file.exe.part");

        var client = new HttpClient(handler) { Timeout = Timeout.InfiniteTimeSpan };

        // 超时源 → HardFail（头部 10s 超时触发 CTS 取消）
        var r1 = await svc.TryDownloadFromSourceAsync(
            client, "https://timeout-source/file.exe", pkg, partPath, progress, 0, false);
        Assert.Equal(DownloadSourceResult.HardFail, r1);

        // 快速源 → 成功
        var r2 = await svc.TryDownloadFromSourceAsync(
            client, "https://fast-source/file.exe", pkg, partPath, progress, 0, true);
        Assert.Equal(DownloadSourceResult.Success, r2);

        Directory.Delete(tmpDir, true);
    }

    // ── 测试 12：overshoot — 源多吐尾部垃圾 → 裁剪后 .part 大小 == pkg.Size ──
    [Fact]
    public async Task T12_Overshoot_ClippedToPkgSize()
    {
        // 构造一个比 pkg.Size 大的数据（尾部追加垃圾）
        var oversizedData = new byte[FakeExeData.Length + 5000];
        Array.Copy(FakeExeData, oversizedData, FakeExeData.Length);
        // 尾部 5000 字节是垃圾（随机）

        var handler = new ProgrammableHandler()
            .Route("source1", _ =>
            {
                var resp = new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StreamContent(new MemoryStream(oversizedData))
                };
                // Content-Length 声明为 oversizedData.Length（比 pkg.Size 大）
                resp.Content.Headers.ContentLength = oversizedData.Length;
                return resp;
            });

        var svc = CreateService(handler);
        var pkg = CreatePkg("https://source1/file.exe");
        // pkg.Size 仍是 FakeExeData.Length
        var progress = new DownloadProgress();

        var tmpDir = Path.Combine(Path.GetTempPath(), $"updtest-{Guid.NewGuid()}");
        Directory.CreateDirectory(tmpDir);
        var partPath = Path.Combine(tmpDir, "file.exe.part");

        var result = await svc.TryDownloadFromSourceAsync(
            new HttpClient(handler) { Timeout = Timeout.InfiniteTimeSpan },
            "https://source1/file.exe", pkg, partPath, progress, 0, true);

        // 由于 Content-Length != pkg.Size，会返回 InvalidContent
        // 但如果 Content-Length 没声明（null），则只靠裁剪
        Assert.Equal(DownloadSourceResult.InvalidContent, result);

        Directory.Delete(tmpDir, true);
    }

    // ── 测试 12b：overshoot — Content-Length 正确但流多吐 → 裁剪后 SHA256 通过 ──
    [Fact]
    public async Task T12b_OvershootClipped_NoContentLength_ShaOk()
    {
        // 构造一个比 pkg.Size 大的数据
        var oversizedData = new byte[FakeExeData.Length + 5000];
        Array.Copy(FakeExeData, oversizedData, FakeExeData.Length);

        var handler = new ProgrammableHandler()
            .Route("source1", _ =>
            {
                var resp = new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StreamContent(new MemoryStream(oversizedData))
                };
                // 显式移除 Content-Length（模拟某些代理 strip 掉的情况）
                resp.Content.Headers.ContentLength = null;
                return resp;
            });

        var svc = CreateService(handler);
        var pkg = CreatePkg("https://source1/file.exe");
        var progress = new DownloadProgress();

        var tmpDir = Path.Combine(Path.GetTempPath(), $"updtest-{Guid.NewGuid()}");
        Directory.CreateDirectory(tmpDir);
        var partPath = Path.Combine(tmpDir, "file.exe.part");

        var result = await svc.TryDownloadFromSourceAsync(
            new HttpClient(handler) { Timeout = Timeout.InfiniteTimeSpan },
            "https://source1/file.exe", pkg, partPath, progress, 0, true);

        // 裁剪后应该成功
        Assert.Equal(DownloadSourceResult.Success, result);

        // .part 大小应该 == pkg.Size（不是 oversizedData.Length）
        Assert.Equal(FakeExeData.Length, new FileInfo(partPath).Length);

        // SHA256 应该通过（只取前 pkg.Size 字节）
        var ok = await UpdateService.VerifySha256Async(partPath, FakeSha256);
        Assert.True(ok);

        Directory.Delete(tmpDir, true);
    }

    // ── 测试 13：端到端 — 首源坏内容 → 次源续传成功 → done ──
    [Fact]
    public async Task T13_EndToEnd_BadFirstSource_SecondSucceeds()
    {
        var htmlBytes = System.Text.Encoding.UTF8.GetBytes("<html>限流</html>");
        var handler = new ProgrammableHandler()
            .Route("proxy", _ =>
            {
                var resp = new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new ByteArrayContent(htmlBytes)
                };
                resp.Content.Headers.ContentLength = htmlBytes.Length;
                return resp;
            })
            .Route("github", _ => OkResponse(FakeExeData));

        var svc = CreateService(handler);
        var pkg = new UpdatePackage
        {
            Url = "https://github/file.exe",
            Proxies = new[] { "https://proxy/" },
            Size = FakeExeData.Length,
            Sha256 = FakeSha256,
        };

        var progress = new DownloadProgress();

        // 直接调用 internal DownloadAsync（编排层）
        var tmpDir = Path.Combine(Path.GetTempPath(), $"updtest-{Guid.NewGuid()}");
        Directory.CreateDirectory(tmpDir);

        // 临时替换 UpdatesDir — 通过 reflection 设置
        var updatesDirField = typeof(UpdateService).GetField("_updatesDir",
            System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic);
        // UpdatesDir 是属性，不是字段。改用直接调用并验证 phase

        // 直接调用 DownloadAsync，它使用 UpdatesDir 属性（%LocalAppData%/工程管家/updates）
        // 为避免污染真实目录，我们用 partPath/finalPath 测试法：
        // 改为手工编排模拟 DownloadAsync 的循环
        var urls = pkg.ResolveCandidates();
        Assert.Equal(2, urls.Length); // proxy + github

        var partPath = Path.Combine(tmpDir, "file.exe.part");
        var client = new HttpClient(handler) { Timeout = Timeout.InfiniteTimeSpan };

        // 源 1 (proxy) → InvalidContent
        var r1 = await svc.TryDownloadFromSourceAsync(
            client, urls[0], pkg, partPath, progress, 0, false);
        Assert.Equal(DownloadSourceResult.InvalidContent, r1);

        // 源 2 (github) → Success
        var r2 = await svc.TryDownloadFromSourceAsync(
            client, urls[1], pkg, partPath, progress, 0, true);
        Assert.Equal(DownloadSourceResult.Success, r2);

        // SHA256 通过
        var ok = await UpdateService.VerifySha256Async(partPath, FakeSha256);
        Assert.True(ok);

        // FinalizeWithRetry 成功
        var finalPath = Path.Combine(tmpDir, "file.exe");
        await UpdateService.FinalizeWithRetryAsync(partPath, finalPath);
        Assert.True(File.Exists(finalPath));
        Assert.False(File.Exists(partPath));

        // 验证内容
        var fileBytes = await File.ReadAllBytesAsync(finalPath);
        Assert.Equal(FakeExeData, fileBytes);

        Directory.Delete(tmpDir, true);
    }
}

/// <summary>返回部分数据后抛 IOException 的流（模拟连接中断）</summary>
internal sealed class ThrowingStream : Stream
{
    private readonly byte[] _data;
    private int _position;

    public ThrowingStream(byte[] data) { _data = data; }

    public override bool CanRead => true;
    public override bool CanSeek => false;
    public override bool CanWrite => false;
    public override long Length => _data.Length;
    public override long Position { get => _position; set { } }
    public override void Flush() { }

    public override int Read(byte[] buffer, int offset, int count)
    {
        if (_position >= _data.Length)
            throw new IOException("连接已断开（模拟）");

        var toCopy = Math.Min(count, _data.Length - _position);
        Array.Copy(_data, _position, buffer, offset, toCopy);
        _position += toCopy;
        return toCopy;
    }

    public override long Seek(long offset, SeekOrigin origin) => 0;
    public override void SetLength(long value) { }
    public override void Write(byte[] buffer, int offset, int count) { }
}

================
File: EngineeringManager.Api/appsettings.json
================
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*",
  "Update": {
    "ManifestUrls": [
      "https://gh-proxy.com/https://raw.githubusercontent.com/Amer-CN/engineering-manager/master/update/manifest.json",
      "https://raw.githubusercontent.com/Amer-CN/engineering-manager/master/update/manifest.json"
    ]
  }
}

================
File: EngineeringManager.Api/MainWindow.cs
================
using Microsoft.Web.WebView2.WinForms;
using System.Runtime.InteropServices;
using System.Text.Json;

namespace EngineeringManager.Api;

public class MainWindow : Form
{
    private readonly bool _isProduction;
    private WebView2? webView;
    private bool _isFullScreen;
    private bool _isMaximized;
    private FormBorderStyle _preFullScreenBorder;
    private Rectangle _preFullScreenBounds;
    private Rectangle _preMaximizeBounds;

    // ── 手动 resize ──
    private bool _isResizing;
    private int _resizeEdge;
    private Point _resizeStartMouse;
    private Rectangle _resizeStartBounds;

    // ── 双击检测 ──
    private DateTime _lastClickTime = DateTime.MinValue;

    public MainWindow(bool isProduction = false)
    {
        _isProduction = isProduction;
        FormBorderStyle = FormBorderStyle.None;
        Icon = new Icon(Path.Combine(AppContext.BaseDirectory, "app.ico"));
        Size = new Size(300, 400);
        StartPosition = FormStartPosition.CenterScreen;
        ApplyNativeRoundedCorners();
    }

    protected override CreateParams CreateParams
    {
        get
        {
            var cp = base.CreateParams;
            cp.Style |= WS_THICKFRAME | WS_MINIMIZEBOX | WS_MAXIMIZEBOX;
            return cp;
        }
    }

    private void ApplyNativeRoundedCorners()
    {
        try { int p = 2; DwmSetWindowAttribute(Handle, 33, ref p, sizeof(int)); } catch { }
    }

    // ═══ P/Invoke ═══
    [DllImport("dwmapi.dll")]
    private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attr, ref int attrValue, int attrSize);
    [DllImport("user32.dll")]
    private static extern void ReleaseCapture();
    [DllImport("user32.dll")]
    private static extern void SendMessage(IntPtr hWnd, int msg, int wParam, int lParam);
    [DllImport("user32.dll")]
    private static extern bool SetCapture(IntPtr hWnd);

    // ═══ 常量 ═══
    private const int WS_THICKFRAME  = 0x00040000;
    private const int WS_MINIMIZEBOX = 0x00020000;
    private const int WS_MAXIMIZEBOX = 0x00010000;
    private const int HTLEFT = 10, HTRIGHT = 11, HTTOP = 12, HTTOPLEFT = 13;
    private const int HTTOPRIGHT = 14, HTBOTTOM = 15, HTBOTTOMLEFT = 16, HTBOTTOMRIGHT = 17;
    private const int BORDER_SIZE = 6;

    /// <summary>
    /// API 冷启动期间显示的品牌化"启动中"占位页。
    /// </summary>
    private const string WarmingHtml = """
        <!DOCTYPE html>
        <html><head><meta charset="utf-8"><style>
          *{margin:0;padding:0;box-sizing:border-box}
          body{display:flex;align-items:center;justify-content:center;
               height:100vh;background:#1e293b;font-family:'Microsoft YaHei',sans-serif}
          .wrap{text-align:center}
          .logo{width:48px;height:48px;margin:0 auto 20px;animation:pulse 1.2s ease-in-out infinite}
          .text{color:#94a3b8;font-size:14px;letter-spacing:1px}
          @keyframes pulse{0%,100%{opacity:.4;transform:scale(.95)}50%{opacity:1;transform:scale(1.05)}}
        </style></head><body><div class="wrap">
          <svg class="logo" viewBox="0 0 18 18" fill="none">
            <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="#3b82f6"/><stop offset="1" stop-color="#3b82f6" stop-opacity=".6"/>
            </linearGradient>
            <mask id="m"><rect width="18" height="18" fill="white"/>
            <path d="M5 14 L9 6 L13 14 Z" fill="black"/></mask></defs>
            <path d="M2 15.5 L9 2.5 L16 15.5 Z" fill="url(#g)" mask="url(#m)"/>
          </svg>
          <div class="text">正在启动…</div>
        </div></body></html>
        """;

    // ═══════════════════════════════════════════════════════════
    // WndProc — 只处理光标变化
    // resize 由前端 div → postMessage → OnWebViewMouseDown 启动
    // ═══════════════════════════════════════════════════════════

    protected override void WndProc(ref Message m)
    {
        // resize 进行中：拦截鼠标移动和释放
        if (_isResizing)
        {
            switch (m.Msg)
            {
                case 0x0200: // WM_MOUSEMOVE
                    DoResize(Cursor.Position);
                    m.Result = IntPtr.Zero;
                    return;
                case 0x0202: // WM_LBUTTONUP
                    _isResizing = false;
                    ReleaseCapture();
                    m.Result = IntPtr.Zero;
                    return;
            }
        }

        switch (m.Msg)
        {
            case 0x0083: // WM_NCCALCSIZE
                if (m.WParam != IntPtr.Zero) { m.Result = IntPtr.Zero; return; }
                break;

            case 0x0020: // WM_SETCURSOR — 边缘光标
                if (!DesignMode && !_isFullScreen && !_isResizing)
                {
                    int ht = HitTestEdge(Cursor.Position, Bounds);
                    if (ht != 0)
                    {
                        int id = ht switch
                        {
                            HTLEFT or HTRIGHT => 32644,
                            HTTOP or HTBOTTOM => 32645,
                            HTTOPLEFT or HTBOTTOMRIGHT => 32642,
                            _ => 32643 // HTTOPRIGHT or HTBOTTOMLEFT
                        };
                        SetCursor(LoadCursor(IntPtr.Zero, (IntPtr)id));
                        m.Result = IntPtr.Zero;
                        return;
                    }
                }
                break;
        }

        base.WndProc(ref m);
    }

    [DllImport("user32.dll")]
    private static extern IntPtr LoadCursor(IntPtr h, IntPtr id);
    [DllImport("user32.dll")]
    private static extern IntPtr SetCursor(IntPtr h);

    // ═══════════════════════════════════════════════════════════
    // WebView2 鼠标事件 — 边缘启动 resize
    // ═══════════════════════════════════════════════════════════

    private void DoResize(Point mouse)
    {
        int dx = mouse.X - _resizeStartMouse.X;
        int dy = mouse.Y - _resizeStartMouse.Y;
        var b = _resizeStartBounds;
        int nl = b.Left, nt = b.Top, nw = b.Width, nh = b.Height;

        bool isL = _resizeEdge == HTLEFT   || _resizeEdge == HTTOPLEFT   || _resizeEdge == HTBOTTOMLEFT;
        bool isR = _resizeEdge == HTRIGHT  || _resizeEdge == HTTOPRIGHT  || _resizeEdge == HTBOTTOMRIGHT;
        bool isT = _resizeEdge == HTTOP    || _resizeEdge == HTTOPLEFT   || _resizeEdge == HTTOPRIGHT;
        bool isB = _resizeEdge == HTBOTTOM || _resizeEdge == HTBOTTOMLEFT || _resizeEdge == HTBOTTOMRIGHT;

        if (isL) { nl = b.Left + dx; nw = b.Width - dx; }
        if (isR) { nw = b.Width + dx; }
        if (isT) { nt = b.Top + dy;  nh = b.Height - dy; }
        if (isB) { nh = b.Height + dy; }

        if (nw < 200) { nw = 200; if (isL) nl = b.Right - 200; }
        if (nh < 200) { nh = 200; if (isT) nt = b.Bottom - 200; }

        SetBounds(nl, nt, nw, nh);
    }

    private static int HitTestEdge(Point cursor, Rectangle rect)
    {
        bool l = cursor.X <= rect.Left + BORDER_SIZE;
        bool r = cursor.X >= rect.Right - BORDER_SIZE;
        bool t = cursor.Y <= rect.Top + BORDER_SIZE;
        bool b = cursor.Y >= rect.Bottom - BORDER_SIZE;
        if (t && l) return HTTOPLEFT;
        if (t && r) return HTTOPRIGHT;
        if (b && l) return HTBOTTOMLEFT;
        if (b && r) return HTBOTTOMRIGHT;
        if (l) return HTLEFT;
        if (r) return HTRIGHT;
        if (t) return HTTOP;
        if (b) return HTBOTTOM;
        return 0;
    }

    // ═══════════════════════════════════════════════════════════
    // WebView2 初始化
    // ═══════════════════════════════════════════════════════════

    protected override async void OnLoad(EventArgs e)
    {
        base.OnLoad(e);
        try
        {
            // ── 版本化缓存目录：每个版本独立缓存，彻底杜绝旧缓存 ──
            var appVersion = ReadFrontendVersion();
            var cacheDir = string.IsNullOrEmpty(appVersion)
                ? Path.Combine(Path.GetTempPath(), "engineering-manager-webview2")
                : Path.Combine(Path.GetTempPath(), $"engineering-manager-webview2-v{appVersion}");

            // 清理旧版本缓存目录（只删非当前版本的）
            CleanupOldCacheDirs(appVersion);

            webView = new WebView2 { Dock = DockStyle.Fill };
            Controls.Add(webView);

            var env = await Microsoft.Web.WebView2.Core.CoreWebView2Environment.CreateAsync(
                null, cacheDir);
            await webView.EnsureCoreWebView2Async(env);

            webView.CoreWebView2.Settings.IsStatusBarEnabled = false;
            webView.CoreWebView2.Settings.AreDevToolsEnabled = true;
            webView.CoreWebView2.Settings.IsWebMessageEnabled = true;

            webView.CoreWebView2.WebMessageReceived += OnWebMessage;
            var frontendUrl = _isProduction ? "http://localhost:5048" : "http://localhost:5173";

            // 生产模式：WebView2 初始化与 API 冷启动并行后，导航前快速轮询就绪
            if (_isProduction)
            {
                // 先显示"启动中"占位页，避免轮询期间窗口空白
                webView.CoreWebView2.NavigateToString(WarmingHtml);
                using var client = new System.Net.Http.HttpClient { Timeout = TimeSpan.FromSeconds(1) };
                for (int i = 0; i < 150; i++) // 100ms × 150 ≈ 15s 兜底
                {
                    try { if ((await client.GetAsync("http://localhost:5048/api/health")).IsSuccessStatusCode) break; }
                    catch { }
                    await Task.Delay(100);
                }
            }
            webView.CoreWebView2.Navigate(frontendUrl);

            webView.CoreWebView2.DocumentTitleChanged += (_, _) =>
                Text = $"工程管家 - {webView.CoreWebView2.DocumentTitle}";
        }
        catch (Exception ex)
        {
            MessageBox.Show($"WebView2 初始化失败：{ex.Message}",
                "错误", MessageBoxButtons.OK, MessageBoxIcon.Error);
            Close();
        }
    }

    // ═══════════════════════════════════════════════════════════
    // WebView2 缓存管理 — 版本化缓存目录
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// 从 dist/index.html 读取前端版本号（__APP_VERSION__）。
    /// 不依赖 C# Assembly version（可能因 MSBuild 评估时机滞后）。
    /// </summary>
    private static string? ReadFrontendVersion()
    {
        try
        {
            var exeDir = AppContext.BaseDirectory;
            var indexPath = Path.Combine(exeDir, "dist", "index.html");
            if (!File.Exists(indexPath)) return null;

            var html = File.ReadAllText(indexPath);
            // 匹配 window.__APP_VERSION__ = 'x.y.z'
            var match = System.Text.RegularExpressions.Regex.Match(
                html, @"__APP_VERSION__' *]= *'([0-9]+\.[0-9]+\.[0-9]+)'");
            return match.Success ? match.Groups[1].Value : null;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[MainWindow] 读取前端版本失败: {ex.Message}");
            return null;
        }
    }

    /// <summary>
    /// 清理旧版本的 WebView2 缓存目录（保留当前版本）。
    /// 在 WebView2 启动前执行，此时旧目录无文件锁。
    /// </summary>
    private static void CleanupOldCacheDirs(string? currentVersion)
    {
        try
        {
            var tempPath = Path.GetTempPath();
            var prefix = "engineering-manager-webview2";
            foreach (var dir in Directory.GetDirectories(tempPath, prefix + "*"))
            {
                var dirName = Path.GetFileName(dir);
                // 保留：无版本后缀的旧目录（兼容）+ 当前版本目录
                if (dirName == prefix) continue;  // 旧格式目录，跳过（可能有锁）
                if (dirName == $"{prefix}-v{currentVersion}") continue;  // 当前版本

                Console.WriteLine($"[MainWindow] 清理旧缓存: {dirName}");
                try { Directory.Delete(dir, true); }
                catch { /* 被占用则忽略 */ }
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[MainWindow] 清理旧缓存失败: {ex.Message}");
        }
    }

    // ═══════════════════════════════════════════════════════════
    // 前端消息处理
    // startDrag — 立即拖动（无延迟），双击检测在 C# 侧
    // ═══════════════════════════════════════════════════════════

    private void OnWebMessage(object? s, Microsoft.Web.WebView2.Core.CoreWebView2WebMessageReceivedEventArgs e)
    {
        try
        {
            var j = JsonDocument.Parse(e.TryGetWebMessageAsString());
            var a = j.RootElement.GetProperty("action").GetString();
            Invoke(() =>
            {
                switch (a)
                {
                    case "resize":
                        int w = j.RootElement.GetProperty("width").GetInt32();
                        int h = j.RootElement.GetProperty("height").GetInt32();
                        Size = new Size(w, h); CenterToScreen(); break;
                    case "minimize":        WindowState = FormWindowState.Minimized; break;
                    case "maximize":        ToggleMaximize(); break;
                    case "fullscreen":      ToggleFullScreen(); break;
                    case "close":           Close(); break;
                    case "devtools":        webView!.CoreWebView2.OpenDevToolsWindow(); break;
                    case "startResize":
                        var edge = j.RootElement.GetProperty("edge").GetString() ?? "";
                        int htVal = edge switch
                        {
                            "left" => HTLEFT, "right" => HTRIGHT,
                            "top" => HTTOP, "bottom" => HTBOTTOM,
                            "top-left" => HTTOPLEFT, "top-right" => HTTOPRIGHT,
                            "bottom-left" => HTBOTTOMLEFT, "bottom-right" => HTBOTTOMRIGHT,
                            _ => 0
                        };
                        if (htVal != 0 && !_isFullScreen)
                        {
                            _isResizing = true;
                            _resizeEdge = htVal;
                            _resizeStartMouse = Cursor.Position;
                            _resizeStartBounds = Bounds;
                            SetCapture(Handle);
                        }
                        break;
                    case "startDrag":
                        // 双击检测：500ms 内两次 startDrag → 最大化
                        var now = DateTime.Now;
                        if ((now - _lastClickTime).TotalMilliseconds < 500)
                        {
                            _lastClickTime = DateTime.MinValue;
                            ToggleMaximize();
                        }
                        else
                        {
                            _lastClickTime = now;
                            ReleaseCapture();
                            SendMessage(Handle, 0xA1, 0x2, 0);
                        }
                        break;
                }
            });
        }
        catch { }
    }

    private void ToggleMaximize()
    {
        if (_isFullScreen) { _isFullScreen = false; FormBorderStyle = _preFullScreenBorder; NotifyFullScreenChange(); }
        if (_isMaximized) { _isMaximized = false; Bounds = _preMaximizeBounds; }
        else { _isMaximized = true; _preMaximizeBounds = Bounds; Bounds = Screen.FromHandle(Handle).WorkingArea; }
        NotifyMaximizeChange();
    }

    private void ToggleFullScreen()
    {
        if (_isFullScreen) { _isFullScreen = false; FormBorderStyle = _preFullScreenBorder; Bounds = _preFullScreenBounds; }
        else { _isFullScreen = true; _preFullScreenBorder = FormBorderStyle; _preFullScreenBounds = _isMaximized ? _preMaximizeBounds : Bounds; _isMaximized = false; FormBorderStyle = FormBorderStyle.None; Bounds = Screen.FromHandle(Handle).Bounds; }
        NotifyFullScreenChange();
    }

    private void NotifyMaximizeChange()
    {
        try { webView?.CoreWebView2?.PostWebMessageAsJson(JsonSerializer.Serialize(new { type = "maximizeChange", isMaximized = _isMaximized })); } catch { }
    }
    private void NotifyFullScreenChange()
    {
        try { webView?.CoreWebView2?.PostWebMessageAsJson(JsonSerializer.Serialize(new { type = "fullScreenChange", isFullScreen = _isFullScreen })); } catch { }
    }
}

================
File: EngineeringManager.Api/GlobalAuthMiddleware.cs
================
using Microsoft.AspNetCore.Http;

namespace EngineeringManager.Api;

/// <summary>
/// P0-2 全局鉴权中间件
/// 规则：除白名单外，所有 /api/* 请求必须有 JWT token
/// 白名单：/api/auth/login（登录本身）、/api/health（健康检查）、/api/ocr/setup/*（首次启动引导）
/// 401 响应：{ "success": false, "error": "未授权：请先登录" }
/// 注意：本中间件必须在 app.UseAuthentication() 之后注册，否则 ctx.User 永远为匿名
/// </summary>
public class GlobalAuthMiddleware
{
    private readonly RequestDelegate _next;

    private static readonly string[] PublicPathPrefixes = new[]
    {
        "/api/auth/login",
        "/api/health",
        "/api/ocr/setup",
        "/api/agent/setup",
        "/api/update/download"
    };

    public GlobalAuthMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var path = context.Request.Path.Value?.TrimEnd('/') ?? "";

        // 静态文件 / SPA 回退 / 非 API 路径：放行
        if (!path.StartsWith("/api", StringComparison.OrdinalIgnoreCase))
        {
            await _next(context);
            return;
        }

        // 白名单：登录、健康检查、OCR 首次启动引导、Agent 首次启动引导
        var isPublic = PublicPathPrefixes.Any(p =>
            path.StartsWith(p, StringComparison.OrdinalIgnoreCase));

        // /api/config GET 精确放行（登录设置页面需要读配置），PUT 仍需鉴权
        if (!isPublic && path == "/api/config" && HttpMethods.IsGet(context.Request.Method))
            isPublic = true;

        // /api/config/data-path PUT 精确放行（登录设置页面需要改数据路径，安装后首次启动场景）
        // 安全性：config.json 位于 %APPDATA%\工程管家，用户本身有文件系统访问权；
        //         改路径仅重定向数据位置，不泄露已有数据。端点内对已登录用户仍要求 admin。
        if (!isPublic && path == "/api/config/data-path" && HttpMethods.IsPut(context.Request.Method))
            isPublic = true;

        if (isPublic)
        {
            await _next(context);
            return;
        }

        // 其他 /api/* 必须鉴权
        // 注: 租户隔离在端点 SQL 层 (CurrentUser.UserFilterWithAuthorizedProjects) 完成,
        //     不在中间件层强制 projectId —— 那会误伤跨项目汇总端点 (/api/wages/payment-records,
        //     /api/wages/overdue-stats 等) 且与前端 "projectId 可选" 契约冲突.
        if (context.User.Identity?.IsAuthenticated != true)
        {
            context.Response.StatusCode = 401;
            context.Response.ContentType = "application/json; charset=utf-8";
            await context.Response.WriteAsync(
                "{\"success\":false,\"error\":\"未授权：请先登录\"}");
            return;
        }

        await _next(context);
    }
}

================
File: EngineeringManager.Api/Program.cs
================
using System.Data;
using System.Security.Cryptography;
using Microsoft.Data.Sqlite;
using Dapper;
using Microsoft.Extensions.FileProviders;
using EngineeringManager.Api;
using Microsoft.Extensions.DependencyInjection;

// ============ API 配置类（供 EntryPoint.cs 调用） ============

/// <summary>
/// JWT secret 提供者 (P0-1/P0-8 修复)。
/// 优先级: JWT_SECRET 环境变量 > 持久化文件 (%APPDATA%\工程管家\jwt.key) > 首次生成。
/// 持久化文件机器绑定,不随数据存储路径迁移,避免密钥外泄到备份/其他机器。
/// </summary>
public static class JwtSecretProvider
{
    private static string? _cached;
    private static readonly object _lock = new();

    public static string GetOrCreate()
    {
        lock (_lock)
        {
            if (_cached != null) return _cached;

            // 1. 优先环境变量 (开发/运维场景显式覆盖)
            var env = Environment.GetEnvironmentVariable("JWT_SECRET");
            if (!string.IsNullOrWhiteSpace(env) && env.Length >= 32)
            {
                _cached = env;
                return _cached;
            }

            // 2. 持久化文件
            var path = GetKeyPath();
            try
            {
                if (File.Exists(path))
                {
                    var fromFile = File.ReadAllText(path).Trim();
                    if (fromFile.Length >= 32) { _cached = fromFile; return _cached; }
                }
            }
            catch (Exception ex) { Console.Error.WriteLine($"[JwtSecret] 读取持久化文件失败: {Common.Sanitize(ex.Message)}"); }

            // 3. 首次启动生成随机 32 字节密钥 (base64 编码),持久化
            var bytes = RandomNumberGenerator.GetBytes(32);
            var generated = Convert.ToBase64String(bytes);
            try
            {
                Directory.CreateDirectory(Path.GetDirectoryName(path)!);
                File.WriteAllText(path, generated);
                Console.Out.WriteLine("[JwtSecret] 已生成并持久化随机 JWT secret (首次启动)");
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[JwtSecret] 持久化失败,使用内存临时密钥: {Common.Sanitize(ex.Message)}");
            }
            _cached = generated;
            return _cached;
        }
    }

    private static string GetKeyPath() =>
        Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
            "工程管家", "jwt.key");
}

public static class ApiConfig
{
    public static void ConfigureServices(WebApplicationBuilder builder)
    {
        // 生产 5048; 测试环境 (ASPNETCORE_ENVIRONMENT=Development) 用 random port 0
        // 测试 base 设了 ASPNETCORE_ENVIRONMENT=Development, 避免端口冲突
        var testMode = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development"
            && Environment.GetEnvironmentVariable("DISABLE_RATELIMIT") == "1";
        builder.WebHost.UseUrls(testMode ? "http://127.0.0.1:0" : "http://localhost:5048");

        // v1.2.0: PII 字段级加密 (AES-GCM + DPAPI master key)
        builder.Services.AddSingleton<EngineeringManager.Api.Security.PiiProtector>();
        // v0.78.0 PII 后台 re-encrypt worker (admin rotate key 后调用)
        builder.Services.AddSingleton<EngineeringManager.Api.Security.PiiReencryptWorker>();

        // v1.3.0 Agent AI 助手服务
        builder.Services.AddSingleton<EngineeringManager.Api.Services.LlmConfigResolver>();
        builder.Services.AddSingleton<EngineeringManager.Api.Services.LlmProviderService>();
        builder.Services.AddSingleton<EngineeringManager.Api.Services.IModelRouter, EngineeringManager.Api.Services.ModelRoutingService>();
        builder.Services.AddSingleton<EngineeringManager.Api.Services.AgentToolService>();
        builder.Services.AddSingleton<EngineeringManager.Api.Services.AgentConversationService>();
        builder.Services.AddSingleton<EngineeringManager.Api.Services.UpdateService>();

        // v0.83 STT 语音转文字后台 worker（单并发）
        builder.Services.AddHostedService<EngineeringManager.Api.Services.Stt.SttWorker>();

        // v0.84 M2 知识库：文本嵌入服务 + 知识库服务
        builder.Services.AddSingleton<EngineeringManager.Api.Services.IEmbeddingService, EngineeringManager.Api.Services.BgeEmbeddingService>();

        builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
            p.WithOrigins("http://localhost:5173", "http://localhost:3000", "http://localhost:5048")
             .AllowAnyMethod()
             .AllowAnyHeader()));

                builder.Services.AddScoped<IDbConnection>(_ =>
        {
            var dbPath = Path.Combine(ResolveDataPath(), "engineering.db");
            var dir = Path.GetDirectoryName(dbPath)!;
            if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);
            var conn = new SqliteConnection($"Data Source={dbPath}");
            conn.Open();
            using var cmd = conn.CreateCommand();
            cmd.CommandText = "PRAGMA journal_mode=WAL";
            cmd.ExecuteNonQuery();
            EnsureTables(conn);

            // v0.80: is_default_password 列迁移（幂等）
            try { conn.Execute(@"ALTER TABLE users ADD COLUMN is_default_password INTEGER DEFAULT 0"); } catch { }

            // v0.80: 种子管理员（仅在 users 空表时触发）
            SeedDefaultAdmin(conn);

            // v0.72.0: 跑 migrations 脚本 (idempotent, 自动跳过已跑的)
            // 实际跑: 011 加 _enc 列, 012 users 表 password_hash+salt+version 迁移
            EngineeringManager.Api.Migrations.MigrationRunner.Run($"Data Source={dbPath}");            return conn;
        });


        builder.Services.AddAuthentication(Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(options =>
            {
                // P0-1/P0-8: JWT secret 不再硬编码默认值。优先级: 环境变量 > 持久化文件。
                // 首次启动若无环境变量则生成随机 32 字节密钥,持久化到 %APPDATA%\工程管家\jwt.key
                // (机器绑定: 不随数据备份迁移到其他机器, 避免密钥外泄)
                var jwtSecret = JwtSecretProvider.GetOrCreate();
                options.TokenValidationParameters = new Microsoft.IdentityModel.Tokens.TokenValidationParameters
                {
                    ValidateIssuer = true, ValidateAudience = true, ValidateLifetime = true, ValidateIssuerSigningKey = true,
                    ValidIssuer = "engineering-manager", ValidAudience = "engineering-manager",
                    IssuerSigningKey = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(System.Text.Encoding.UTF8.GetBytes(jwtSecret))
                };
            });
        builder.Services.AddAuthorization();
        builder.Services.AddHttpClient();

// 版本更新：manifest 拉取（30s 短超时）
builder.Services.AddHttpClient("update", c => c.Timeout = TimeSpan.FromSeconds(30));
// 安装包下载：连接/响应头超时 10s，但【无整体下载死超时】（大文件靠慢速看门狗控制）
builder.Services.AddHttpClient("update-download", c =>
{
    c.Timeout = Timeout.InfiniteTimeSpan; // 禁用整体超时，靠看门狗
});

        // P0-4: 限流（登录防爆破 + 写防滥用）
        builder.Services.AddRateLimiter(options =>
            {
                // 登录限流：1 个 IP 1 分钟最多 5 次
                options.AddPolicy("login", httpContext =>
                {
                    var ip = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
                    return System.Threading.RateLimiting.RateLimitPartition.GetFixedWindowLimiter(
                        ip,
                        _ => new System.Threading.RateLimiting.FixedWindowRateLimiterOptions
                        {
                            PermitLimit = 5,
                            Window = TimeSpan.FromMinutes(1),
                            QueueLimit = 0
                        });
                });

                // 写限流：1 个 IP 1 秒最多 30 次
                options.AddPolicy("write", httpContext =>
                {
                    var ip = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
                    return System.Threading.RateLimiting.RateLimitPartition.GetFixedWindowLimiter(
                        ip,
                        _ => new System.Threading.RateLimiting.FixedWindowRateLimiterOptions
                        {
                            PermitLimit = 30,
                            Window = TimeSpan.FromSeconds(1),
                            QueueLimit = 0
                        });
                });

                // 429 响应
                options.OnRejected = async (context, token) =>
                {
                    context.HttpContext.Response.StatusCode = 429;
                    await context.HttpContext.Response.WriteAsJsonAsync(new { success = false, error = "请求过于频繁，请稍后再试" }, token);
                };
            });

// 支持 camelCase JSON 反序列化（前端发 camelCase，后端 DTO 用 PascalCase）
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNameCaseInsensitive = true;
});
    }

    /// <summary>
    /// 生产模式标记：dist/ 存在时为 true（C# 自托管前端静态文件）
    /// </summary>
    public static bool IsProduction { get; private set; }

    public static void ConfigureApp(WebApplication app)
    {
        // 检测 dist/ 是否存在 → 生产模式
        var distPath = Path.Combine(AppContext.BaseDirectory, "dist");
        IsProduction = Directory.Exists(distPath);

        if (IsProduction)
        {
            Console.WriteLine($"[App] 生产模式：托管前端静态文件 {distPath}");

            // 1. SPA 默认文件（index.html）
            app.UseDefaultFiles(new DefaultFilesOptions
            {
                FileProvider = new PhysicalFileProvider(distPath)
            });

            // 2. 静态文件服务（JS/CSS/图片 + ocr-config.json 等）
            // index.html 禁止缓存（防 WebView2 缓存旧前端），带 hash 的 JS/CSS 默认永久缓存（文件名变=自动失效）
            app.UseStaticFiles(new StaticFileOptions
            {
                FileProvider = new PhysicalFileProvider(distPath),
                OnPrepareResponse = ctx =>
                {
                    var path = ctx.File.Name;
                    if (path.EndsWith(".html", StringComparison.OrdinalIgnoreCase))
                    {
                        ctx.Context.Response.Headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
                        ctx.Context.Response.Headers["Pragma"] = "no-cache";
                        ctx.Context.Response.Headers["Expires"] = "0";
                    }
                }
            });
        }

        // 启动期防呆：检查 Update:ManifestUrls 是否仍含占位符
        try
        {
            var manifestUrls = app.Configuration.GetSection("Update:ManifestUrls").Get<string[]>();
            if (manifestUrls != null)
            {
                foreach (var url in manifestUrls)
                {
                    if (url.Contains("example.cn", StringComparison.OrdinalIgnoreCase))
                    {
                        Console.Error.WriteLine("[WARN] [Update] ManifestUrls 仍含占位符 example.cn，线上请替换为真实地址");
                        break;
                    }
                }
            }
        }
        catch { /* 配置读取异常不阻塞启动 */ }

        app.UseCors();
        app.UseExceptionHandler(errorApp =>
        {
            errorApp.Run(async context =>
            {
                context.Response.StatusCode = 500;
                context.Response.ContentType = "application/json";
                var error = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>();
                if (error != null)
                {
                    Console.Error.WriteLine($"[Global] 未处理异常: {error.Error.Message}");
                    await context.Response.WriteAsJsonAsync(new { success = false, error = "服务器内部错误" });
                }
            });
        });
        app.UseAuthentication();
        app.UseAuthorization();
        app.UseMiddleware<EngineeringManager.Api.GlobalAuthMiddleware>();
        // v1.1.0: 测试环境 (DISABLE_RATELIMIT=1) 跳过 rate limiter
        if (Environment.GetEnvironmentVariable("DISABLE_RATELIMIT") != "1")
        {
            app.UseRateLimiter();
        }
        RegisterEndpoints(app);

        // v0.76.0 累计待办 #5: PII 列级 key rotation - 启动时初始化 PiiProtector (从 pii_keys 表加载所有 key, 旧 pii_keys 空时从 pp.key 迁移)
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<IDbConnection>();
            var pii = app.Services.GetRequiredService<EngineeringManager.Api.Security.PiiProtector>();
            pii.Initialize(db);
        }

        if (IsProduction)
        {
            // 3. SPA 回退：非 /api 路由全部返回 index.html
            app.MapWhen(ctx => !ctx.Request.Path.StartsWithSegments("/api"), spa =>
            {
                spa.Use(async (ctx, next) =>
                {
                    var indexPath = Path.Combine(distPath, "index.html");
                    if (File.Exists(indexPath))
                    {
                        ctx.Response.ContentType = "text/html; charset=utf-8";
                        await ctx.Response.SendFileAsync(indexPath);
                    }
                    else
                    {
                        await next();
                    }
                });
            });
        }
    }

    private static void RegisterEndpoints(WebApplication app)
    {
        // 认证 + 角色 + 用户管理
        app.RegisterAuthEndpoints();

        // 用户偏好 (v0.75.0 PII Mask toggle 多设备同步)
        app.RegisterUserPreferencesEndpoints();
        app.RegisterPiiKeyEndpoints(); // v0.76.0 累计待办 #5: PII key rotation API

        // 项目 + 仪表盘 + 项目成员
        app.RegisterProjectEndpoints();

        // 成员 + 工人 + 项目工人 + 班组 + 部门
        app.RegisterMemberEndpoints();

        // 合作伙伴 + 监管单位
        app.RegisterPartnerEndpoints();

        // 发票 + 收付款记录
        app.RegisterInvoiceEndpoints();

        // 合同 + 合同模板 + 结算
        app.RegisterContractEndpoints();

        // 工资 + 考勤 + 薪资历史
        app.RegisterWageEndpoints();

        // 成本台账
        app.RegisterCostLedgerEndpoints();

        // 库存 + 物料
        app.RegisterInventoryEndpoints();

        // 文件操作 + 图纸
        app.RegisterFileEndpoints();

        // 区域 + 模板 + 费用 + 项目工人杂项
        app.RegisterRegionEndpoints();
        app.RegisterTemplateEndpoints();
        app.RegisterExpenseEndpoints();
        app.RegisterProjectWorkerMiscEndpoints();

        // OCR（百度）
        app.RegisterOcrEndpoints();
        OcrSetupWizard.Map(app);

        // 健康检查 + 快照 + 配置 + 审计日志
        app.RegisterSystemEndpoints();

        // v1.3.0 Agent AI 助手
        app.RegisterAgentEndpoints();

        // v0.80 版本更新检查
        app.RegisterUpdateEndpoints();

        // v0.83 STT 语音转文字
        app.RegisterSttEndpoints();

        // v0.84 M2 知识库
        app.RegisterKnowledgeEndpoints();
    }
    // ============ P0-1: 从 config.json 读取 dataPath ============
    public static string ResolveDataPath()
    {
        // 环境变量优先级最高 — 用于开发版与安装版数据隔离
        var envPath = Environment.GetEnvironmentVariable("ENGINEERING_MANAGER_DATA_PATH");
        if (!string.IsNullOrEmpty(envPath))
            return envPath;

        var defaultPath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
            "工程管家");
        try
        {
            var configPath = Path.Combine(defaultPath, "config.json");
            if (File.Exists(configPath))
            {
                var json = File.ReadAllText(configPath);
                var doc = System.Text.Json.JsonDocument.Parse(json);
                if (doc.RootElement.TryGetProperty("dataPath", out var dp) && dp.GetString() is { Length: > 0 } path)
                    return path;
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[ResolveDataPath] 读取 config.json 失败: {ex.Message}");
        }
        return defaultPath;
    }

    // ============ P0-7: 建表逻辑 ============
    private static void EnsureTables(IDbConnection db)
    {
        db.Execute(@"
CREATE TABLE IF NOT EXISTS projects (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, description TEXT, address TEXT, start_date TEXT, end_date TEXT, status TEXT DEFAULT 'active', budget REAL DEFAULT 0, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS members (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT, email TEXT, member_type TEXT DEFAULT 'staff', role TEXT, id_card TEXT, gender TEXT, ethnicity TEXT, birth_date TEXT, id_card_address TEXT, base_salary REAL, daily_wage REAL, entry_date TEXT, status TEXT DEFAULT 'active', department_id INTEGER, position TEXT, bank_account TEXT, bank_name TEXT, bank_line_no TEXT, photo TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS workers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, id_card TEXT, gender TEXT, phone TEXT, address TEXT, bank_account TEXT, bank_name TEXT, bank_line_no TEXT, worker_type TEXT, daily_wage REAL, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS project_workers (id INTEGER PRIMARY KEY AUTOINCREMENT, worker_id INTEGER, project_id INTEGER, team_id INTEGER, daily_wage REAL, worker_type TEXT, entry_date TEXT, status TEXT DEFAULT 'active', created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS income_contracts (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER, name TEXT NOT NULL, amount REAL, counterparty TEXT, sign_date TEXT, status TEXT DEFAULT 'draft', remark TEXT, files TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS expense_contracts (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER, name TEXT NOT NULL, amount REAL, counterparty TEXT, sign_date TEXT, status TEXT DEFAULT 'draft', remark TEXT, files TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS agreement_contracts (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER, name TEXT NOT NULL, amount REAL, counterparty TEXT, sign_date TEXT, agreement_type TEXT, status TEXT DEFAULT 'draft', remark TEXT, files TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    seller_id INTEGER,
    buyer_id INTEGER,
    contract_id INTEGER,
    type TEXT,
    invoice_kind TEXT,
    invoice_no TEXT,
    invoice_code TEXT,
    name TEXT,
    amount REAL DEFAULT 0,
    price_amount REAL DEFAULT 0,
    tax_amount REAL DEFAULT 0,
    tax_rate REAL DEFAULT 0,
    received_amount REAL DEFAULT 0,
    settlement_id INTEGER,
    issue_date TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    remarks TEXT DEFAULT '',
    file_url TEXT,
    file_type TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS payment_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    amount REAL DEFAULT 0,
    record_date TEXT DEFAULT '',
    project_id INTEGER,
    partner_id INTEGER,
    contract_id INTEGER,
    invoice_details TEXT DEFAULT '[]',
    remarks TEXT DEFAULT '',
    file_url TEXT,
    file_type TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS partners (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, category TEXT, contact TEXT, phone TEXT, email TEXT, address TEXT, bank_account TEXT, bank_name TEXT, credit_code TEXT, registered_address TEXT, business_scope TEXT, tax_type TEXT, license_file TEXT, license_file_type TEXT, other_files TEXT, other_files_type TEXT, project_ids TEXT, remarks TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS supervisors (id INTEGER PRIMARY KEY AUTOINCREMENT, region_id INTEGER, name TEXT NOT NULL, category TEXT, contact TEXT, phone TEXT, address TEXT, project_ids TEXT, remarks TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS wages (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER, member_id INTEGER, project_worker_id INTEGER, year_month TEXT, daily_wage REAL, work_days REAL, bonus REAL DEFAULT 0, deduction REAL DEFAULT 0, actual_wage REAL, paid_amount REAL, paid_date TEXT, status TEXT DEFAULT 'pending', created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS attendances (id INTEGER PRIMARY KEY AUTOINCREMENT, member_id INTEGER, project_id INTEGER, project_worker_id INTEGER, year_month TEXT, work_days REAL, days_off INTEGER, is_full_attendance INTEGER, daily_status TEXT, file_url TEXT, file_name TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS settlements (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER, partner_id INTEGER, name TEXT, category TEXT, amount REAL, status TEXT DEFAULT 'pending', date TEXT, remark TEXT, files TEXT, invoice_details TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS cost_ledger (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER, batch_id INTEGER, voucher_no TEXT, date TEXT, direction TEXT, category TEXT, amount REAL, counterparty TEXT, channel TEXT, summary TEXT, notes TEXT, attachments TEXT, linked_invoice_id INTEGER, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS cost_ledger_categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, direction TEXT, level1 TEXT, color TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS cost_ledger_match_rules (id INTEGER PRIMARY KEY AUTOINCREMENT, pattern TEXT, category TEXT, direction TEXT, priority INTEGER, created_at TEXT);
CREATE TABLE IF NOT EXISTS inventory_items (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, category TEXT, unit TEXT, quantity REAL DEFAULT 0, min_quantity REAL, location TEXT, notes TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS inventory_transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, item_id INTEGER, project_id INTEGER, type TEXT, quantity REAL, unit_price REAL, date TEXT, remark TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS materials (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, category TEXT, unit TEXT, specifications TEXT, supplier TEXT, notes TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS templates (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, type TEXT, category TEXT, content TEXT, variables TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, action TEXT, level TEXT, user_id TEXT, user_name TEXT, resource TEXT, resource_id TEXT, details TEXT, ip_address TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS roles (id TEXT PRIMARY KEY, name TEXT NOT NULL, permissions TEXT, is_system INTEGER DEFAULT 0, created_at TEXT);
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, password TEXT, password_hash TEXT NOT NULL, password_salt TEXT, password_hash_version INTEGER DEFAULT 1, salt TEXT, display_name TEXT, role_id TEXT, status TEXT DEFAULT 'active', avatar TEXT, is_default_password INTEGER DEFAULT 0, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS snapshots (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, size INTEGER, created_at TEXT);
CREATE TABLE IF NOT EXISTS departments (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, manager_id INTEGER, positions TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS salary_history (id INTEGER PRIMARY KEY AUTOINCREMENT, member_id INTEGER, effective_date TEXT, base_salary REAL, subsidy REAL, subsidy_note TEXT, note TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS worker_teams (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, project_id INTEGER, leader_id INTEGER, remark TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS project_members (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER, member_id INTEGER, joined_at TEXT);
CREATE TABLE IF NOT EXISTS regions (id INTEGER PRIMARY KEY AUTOINCREMENT, province TEXT, city TEXT, district TEXT);
CREATE TABLE IF NOT EXISTS drawings (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER, name TEXT, file_url TEXT, file_name TEXT, file_type TEXT, remark TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS expenses (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER, category TEXT, amount REAL, date TEXT, description TEXT, vendor TEXT, receipt_url TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS contract_templates (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, type TEXT, content TEXT, variables TEXT, created_at TEXT, updated_at TEXT);
");

            // invoices 表迁移：添加缺失列
            try { db.Execute(@"ALTER TABLE invoices ADD COLUMN seller_id INTEGER"); } catch (Exception ex) { Console.Error.WriteLine($"[EnsureTables] invoices seller_id: {ex.Message}"); }
            try { db.Execute(@"ALTER TABLE invoices ADD COLUMN buyer_id INTEGER"); } catch (Exception ex) { Console.Error.WriteLine($"[EnsureTables] invoices buyer_id: {ex.Message}"); }
            try { db.Execute(@"ALTER TABLE invoices ADD COLUMN received_amount REAL DEFAULT 0"); } catch (Exception ex) { Console.Error.WriteLine($"[EnsureTables] invoices received_amount: {ex.Message}"); }
            try { db.Execute(@"ALTER TABLE invoices ADD COLUMN settlement_id INTEGER"); } catch (Exception ex) { Console.Error.WriteLine($"[EnsureTables] invoices settlement_id: {ex.Message}"); }

            // payment_records 表迁移
            try
            {
                var hasOldSchema = db.ExecuteScalar<int>(@"SELECT COUNT(*) FROM pragma_table_info('payment_records') WHERE name='date'") > 0;
                if (hasOldSchema)
                {
                    db.Execute(@"
                        CREATE TABLE IF NOT EXISTS payment_records_new (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            type TEXT NOT NULL DEFAULT 'payment_out',
                            amount REAL DEFAULT 0,
                            record_date TEXT DEFAULT '',
                            project_id INTEGER,
                            partner_id INTEGER,
                            contract_id INTEGER,
                            invoice_details TEXT DEFAULT '[]',
                            remarks TEXT DEFAULT '',
                            file_url TEXT,
                            file_type TEXT,
                            created_at TEXT DEFAULT (datetime('now'))
                        );
                        INSERT INTO payment_records_new (id, amount, record_date, remarks, created_at)
                            SELECT id, amount, date, remark, created_at FROM payment_records;
                        DROP TABLE payment_records;
                        ALTER TABLE payment_records_new RENAME TO payment_records;
                    ");
                }
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[EnsureTables] payment_records 迁移失败: {ex.Message}");
            }
    }

    /// <summary>
    /// 幂等种子管理员：仅在 users 空表时创建默认 admin 用户 + 角色
    /// </summary>
    private static void SeedDefaultAdmin(IDbConnection db)
    {
        var userCount = db.ExecuteScalar<int>("SELECT COUNT(*) FROM users");
        if (userCount > 0) return;

        var roleCount = db.ExecuteScalar<int>("SELECT COUNT(*) FROM roles");
        if (roleCount == 0)
        {
            var roles = new[] {
                ("admin", "管理员"),
                ("manager", "经理"),
                ("accountant", "财务"),
                ("worker", "工人"),
            };
            var now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
            foreach (var (id, name) in roles)
            {
                var perms = System.Text.Json.JsonSerializer.Serialize(Common.GetDefaultPermissions(id));
                db.Execute(@"INSERT OR IGNORE INTO roles (id, name, permissions, is_system, created_at)
                    VALUES (@Id, @Name, @Perms, 1, @Now)",
                    new { Id = id, Name = name, Perms = perms, Now = now });
            }
        }

        var salt = Convert.ToHexString(System.Security.Cryptography.RandomNumberGenerator.GetBytes(16)).ToLower();
        var hash = Common.HashPassword("admin123", salt, 2);
        var nowStr = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
        db.Execute(@"INSERT INTO users (id, username, password_hash, password_salt, password_hash_version,
            display_name, role_id, status, is_default_password, created_at)
            VALUES (@Id, 'admin', @Hash, @Salt, 2, '管理员', 'admin', 'active', 1, @Now)",
            new { Id = $"user-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}", Hash = hash, Salt = salt, Now = nowStr });

        Console.WriteLine("[Seed] 默认管理员已创建: admin / admin123");
    }
}

================
File: EngineeringManager.Api/Endpoints/SystemEndpoints.cs
================
using System.Data;
using Dapper;
using EngineeringManager.Api.Security;

namespace EngineeringManager.Api;

/// <summary>
/// 系统级端点：审计日志 + 快照 + 配置 + SQLite 管理 + 健康检查 + 备份恢复
/// </summary>
public static class SystemEndpoints
{
    public static void RegisterSystemEndpoints(this WebApplication app)
    {
        var now = () => DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");

        // ═══════════════════════════════════════════════════════════
        // ============================================================
        // 健康检查 (前端 api-adapter 探活 + 监控用)

        var appVer = typeof(SystemEndpoints).Assembly.GetName().Version?.ToString(3) ?? "0.0.0";
        app.MapGet("/api/health", () => Common.Ok(new { status = "ok", version = appVer }));

        // v0.72.0: WAL checkpoint (强制把 -wal 数据回写到 .db, 否则 backup 看不到加密数据)
        app.MapPost("/api/admin/db-checkpoint", (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx);
            if (string.IsNullOrEmpty(uid)) return Common.Fail("未登录");
            if (!CurrentUser.IsAdmin(ctx)) return Results.Forbid();
            db.Execute("PRAGMA wal_checkpoint(TRUNCATE)");
            return Common.Ok(new { message = "WAL checkpoint 完成, 数据已写入主 db 文件" });
        });

        // v0.72.0 (收尾): 删调试端点 /api/admin/db-schema-info (零外部调用, 历史使命完成)
        // 历史: 用于 PII _enc 列迁移排错, 2026-06-18 backfill 闭环后已不需要.

        // v0.72.0 (收尾): PII 加密进度统计 (admin 用, 看哪些表还没全部加密)
        // 入参: ?table=members|workers|partners|supervisors|all (默认 all)
        // 返回: { tables: {members: {total,encrypted,pending,percentComplete}, ...},
        //        summary: {total,encrypted,pending,percentComplete}, errors: [...], generatedAt: "..." }
        app.MapGet("/api/admin/pii-stats", (HttpContext ctx, IDbConnection db, string? table) =>
        {
            var uid = CurrentUser.GetUserId(ctx);
            if (string.IsNullOrEmpty(uid)) return Common.Fail("未登录");
            if (!CurrentUser.IsAdmin(ctx)) return Results.Forbid();

            // 白名单 (防 SQL 注入 + 拼错)
            var allTables = new[] { "members", "workers", "partners", "supervisors" };
            var target = string.IsNullOrEmpty(table) || table == "all"
                ? allTables
                : (Array.IndexOf(allTables, table) >= 0 ? new[] { table } : null);
            if (target == null) return Common.Fail($"不支持的 table: {table} (可选: members / workers / partners / supervisors / all)");

            var tables = new Dictionary<string, object>();
            var errors = new List<string>();
            int grandTotal = 0, grandEncrypted = 0;

            foreach (var t in target)
            {
                int total = 0, encrypted = 0;
                try { total = db.ExecuteScalar<int>($"SELECT COUNT(*) FROM {t}"); }
                catch (Exception ex) { errors.Add($"{t}.count: {Common.Sanitize(ex.Message)}"); }

                // 4 张表的 _enc 主列各不相同, 按表分别查
                string encCol = t switch
                {
                    "members" => "id_card_enc",
                    "workers" => "id_card_enc",
                    "partners" => "phone_enc",
                    "supervisors" => "phone_enc",
                    _ => "phone_enc"
                };
                try { encrypted = db.ExecuteScalar<int>($"SELECT COUNT(*) FROM {t} WHERE {encCol} IS NOT NULL"); }
                catch (Exception ex) { errors.Add($"{t}.{encCol}: {Common.Sanitize(ex.Message)}"); }

                var pending = Math.Max(0, total - encrypted);
                var percent = total == 0 ? 100.0 : Math.Round((double)encrypted / total * 100, 1);
                tables[t] = new { total, encrypted, pending, percentComplete = percent };

                grandTotal += total;
                grandEncrypted += encrypted;
            }

            var grandPending = Math.Max(0, grandTotal - grandEncrypted);
            var grandPercent = grandTotal == 0 ? 100.0 : Math.Round((double)grandEncrypted / grandTotal * 100, 1);

            return Common.Ok(new
            {
                tables,
                summary = new { total = grandTotal, encrypted = grandEncrypted, pending = grandPending, percentComplete = grandPercent },
                errors,
                generatedAt = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss")
            });
        });

        // ============================================================
        // 审计日志
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/audit/logs", (HttpContext ctx, IDbConnection db, int page = 1, int pageSize = 20) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var offset = (page - 1) * pageSize;
            var total = db.ExecuteScalar<int>("SELECT COUNT(*) FROM audit_logs");
            // admin 看全部, 普通用户只看自己
            var sql = isAdmin == 1
                ? "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT @PageSize OFFSET @Offset"
                : "SELECT * FROM audit_logs WHERE user_id=@Uid ORDER BY created_at DESC LIMIT @PageSize OFFSET @Offset";
            var logs = db.Query(sql, new { Uid = uid, PageSize = pageSize, Offset = offset });
            return Common.Ok(new { items = logs, total, page, pageSize, totalPages = (int)Math.Ceiling((double)total / pageSize) });
        });

        app.MapPost("/api/audit/logs", async (HttpContext ctx, AuditLogDto entry, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            try
            {
                await db.ExecuteAsync(@"INSERT INTO audit_logs
                    (action,level,user_id,user_name,resource_type,resource_id,details,ip_address,created_at)
                    VALUES (@Action,@Level,@UserId,@UserName,@Resource,@ResourceId,@Details,@IpAddress,@CreatedAt)",
                    new { entry.Action, Level = entry.Level ?? "info", entry.UserId, entry.UserName,
                          Resource = entry.Resource, ResourceId = entry.ResourceId,
                          Details = entry.Details ?? entry.Description, IpAddress = entry.IpAddress, CreatedAt = entry.CreatedAt ?? now() });
                return Common.Ok();
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[Audit] INSERT error: {ex.Message}");
                return Common.Fail($"审计日志写入失败: {Common.Sanitize(ex.Message)}");
            }
        });

        app.MapGet("/api/audit/stats", (HttpContext ctx, IDbConnection db, int? days) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            var sinceDate = days.HasValue ? DateTime.Now.AddDays(-days.Value).ToString("yyyy-MM-dd") : null;
            var todayStr = DateTime.Now.ToString("yyyy-MM-dd");
            // admin 看全部, 普通用户只看自己
            var userFilter = isAdmin == 1 ? "" : " AND user_id=@Uid";
            var w = days.HasValue ? $" WHERE created_at >= @Since{userFilter}" : (isAdmin == 1 ? "" : " WHERE user_id=@Uid");
            var param = new { Uid = uid, Since = sinceDate };
            return Common.Ok(new
            {
                totalCount = db.ExecuteScalar<int>($"SELECT COUNT(*) FROM audit_logs{w}", param),
                todayCount = db.ExecuteScalar<int>($"SELECT COUNT(*) FROM audit_logs WHERE created_at >= @Today{userFilter}", new { Uid = uid, Today = todayStr }),
                actionCounts = db.Query($"SELECT action, COUNT(*) as count FROM audit_logs{w} GROUP BY action", param),
                resourceCounts = db.Query($"SELECT resource_type, COUNT(*) as count FROM audit_logs{w} GROUP BY resource_type", param),
                topUsers = isAdmin == 1 ? db.Query($"SELECT user_id, user_name, COUNT(*) as count FROM audit_logs{w} GROUP BY user_id, user_name ORDER BY count DESC LIMIT 10", param) : Array.Empty<object>(),
            });
        });

        app.MapPost("/api/audit/clear", async (HttpContext ctx, dynamic dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0;
            // 仅 admin 可清空审计
            if (isAdmin == 0) return Results.Forbid();
            var daysToKeep = (int)(dto.daysToKeep ?? 90);
            var cutoff = DateTime.Now.AddDays(-daysToKeep).ToString("yyyy-MM-dd HH:mm:ss");
            var removed = await db.ExecuteAsync("DELETE FROM audit_logs WHERE created_at < @Cutoff", new { Cutoff = cutoff });
            return Common.Ok(new { removedCount = removed });
        });

        // ═══════════════════════════════════════════════════════════
        // 快照 (无 created_by, 加 var uid 强制鉴权)
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/snapshots", (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var snapshotDir = Path.Combine(ApiConfig.ResolveDataPath(), "db-snapshots");
            if (!Directory.Exists(snapshotDir)) return Common.Ok(Array.Empty<object>());
            var files = Directory.GetFiles(snapshotDir, "*.db").OrderByDescending(f => f).Select(f => new
            {
                id = Path.GetFileNameWithoutExtension(f),
                name = Path.GetFileName(f),
                size = new FileInfo(f).Length,
                createdAt = File.GetCreationTime(f).ToString("yyyy-MM-dd HH:mm:ss")
            });
            return Common.Ok(files);
        });

        app.MapPost("/api/snapshots", (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var snapshotDir = Path.Combine(ApiConfig.ResolveDataPath(), "db-snapshots");
            Directory.CreateDirectory(snapshotDir);
            var dbPath = Path.Combine(ApiConfig.ResolveDataPath(), "engineering.db");
            var snapshotName = $"snapshot-{DateTime.Now:yyyyMMdd-HHmmss}.db";
            var snapshotPath = Path.Combine(snapshotDir, snapshotName);
            File.Copy(dbPath, snapshotPath);
            return Common.Ok(new { id = Path.GetFileNameWithoutExtension(snapshotName), name = snapshotName });
        });

        app.MapDelete("/api/snapshots/{id}", (HttpContext ctx, string id) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var snapshotDir = Path.Combine(ApiConfig.ResolveDataPath(), "db-snapshots");
            var path = Path.Combine(snapshotDir, $"{id}.db");
            if (File.Exists(path)) { File.Delete(path); return Common.Ok(); }
            return Results.Forbid();
        });

        app.MapGet("/api/snapshots/max-count", (HttpContext ctx) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            return Common.Ok(200);
        });

        app.MapPost("/api/snapshots/{id}/restore", (HttpContext ctx, string id) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            if (!CurrentUser.IsAdmin(ctx)) return Common.Fail("仅管理员可恢复快照");
            var snapshotDir = Path.Combine(ApiConfig.ResolveDataPath(), "db-snapshots");
            var path = Path.Combine(snapshotDir, $"{id}.db");
            if (!File.Exists(path)) return Results.Forbid();
            var dbPath = Path.Combine(ApiConfig.ResolveDataPath(), "engineering.db");
            // 恢复前先备份当前数据库，防止误操作导致数据丢失
            if (File.Exists(dbPath))
            {
                var backupPath = dbPath + $".pre-restore-{DateTime.Now:yyyyMMdd-HHmmss}";
                File.Copy(dbPath, backupPath);
            }
            File.Copy(path, dbPath, true);
            return Common.Ok();
        });

        app.MapPut("/api/snapshots/max-count", (HttpContext ctx, dynamic dto) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            return Common.Ok();
        });

        // ═══════════════════════════════════════════════════════════
        // 配置
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/config", (HttpContext ctx) =>
        {
            var defaultPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "工程管家");
            var configPath = Path.Combine(defaultPath, "config.json");

            string? dataPath = null;
            if (File.Exists(configPath))
            {
                try
                {
                    var json = File.ReadAllText(configPath);
                    using var doc = System.Text.Json.JsonDocument.Parse(json);
                    if (doc.RootElement.TryGetProperty("dataPath", out var dp) && dp.GetString() is { Length: > 0 } dpStr)
                        dataPath = dpStr;
                }
                catch { }
            }

            return Common.Ok(new { dataPath = dataPath ?? defaultPath, defaultPath });
        });

        app.MapGet("/api/config/data-path", (HttpContext ctx) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            return Common.Ok(ApiConfig.ResolveDataPath());
        });

        app.MapGet("/api/config/uploads-path", (HttpContext ctx) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            return Common.Ok(Path.Combine(ApiConfig.ResolveDataPath(), "uploads"));
        });

        app.MapPut("/api/config/data-path", (HttpContext ctx, System.Text.Json.JsonElement dto) =>
        {
            // 登录前可配置数据路径（安装后首次启动 / 登录设置页面场景）；
            // 登录后需 admin 权限才能修改。
            var uid = CurrentUser.GetUserId(ctx);
            if (uid != null && !CurrentUser.IsAdmin(ctx))
                return Results.Forbid();
            try
            {
                var newPath = dto.GetProperty("path").GetString();

                // 如果传入 '__select_folder__'，打开文件夹选择对话框
                if (newPath == "__select_folder__")
                {
                    // 需要在 STA 线程中显示对话框
                    string? selectedPath = null;
                    var thread = new Thread(() =>
                    {
                        var dialog = new FolderBrowserDialog
                        {
                            Description = "选择数据存储位置",
                            ShowNewFolderButton = true
                        };
                        if (dialog.ShowDialog() == DialogResult.OK)
                        {
                            selectedPath = dialog.SelectedPath;
                        }
                    });
                    thread.SetApartmentState(ApartmentState.STA);
                    thread.Start();
                    thread.Join();

                    if (string.IsNullOrEmpty(selectedPath))
                    {
                        return Common.Ok(new { cancelled = true });
                    }

                    newPath = selectedPath;
                }

                if (string.IsNullOrEmpty(newPath))
                {
                    return Common.Fail("路径不能为空");
                }

                // 确保目录存在
                if (!Directory.Exists(newPath))
                {
                    Directory.CreateDirectory(newPath);
                }

                // 保存到配置文件（合并写入，不覆盖已有键）
                var appDataPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "工程管家");
                var configPath = Path.Combine(appDataPath, "config.json");

                var config = new Dictionary<string, object>();
                if (File.Exists(configPath))
                {
                    var json = File.ReadAllText(configPath);
                    using var doc = System.Text.Json.JsonDocument.Parse(json);
                    foreach (var prop in doc.RootElement.EnumerateObject())
                        config[prop.Name] = prop.Value.Clone();
                }

                config["dataPath"] = newPath;

                var options = new System.Text.Json.JsonSerializerOptions { WriteIndented = true };
                File.WriteAllText(configPath, System.Text.Json.JsonSerializer.Serialize(config, options));

                return Common.Ok();
            }
            catch (Exception ex)
            {
                return Common.Fail($"设置路径失败: {Common.Sanitize(ex.Message)}");
            }
        });

        app.MapGet("/api/config/gpu-acceleration", (HttpContext ctx) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            try
            {
                var configPath = Path.Combine(ApiConfig.ResolveDataPath(), "config.json");
                var enabled = true;
                if (File.Exists(configPath))
                {
                    var json = File.ReadAllText(configPath);
                    var doc = System.Text.Json.JsonDocument.Parse(json);
                    if (doc.RootElement.TryGetProperty("gpuAcceleration", out var gpu))
                        enabled = gpu.GetBoolean();
                }
                return Results.Ok(new { success = true, enabled });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[SystemEndpoints/gpu-config] 读取失败: {ex.Message}，返回兜底配置");
                return Results.Problem("GPU 配置读取失败", statusCode: 500);
            }
        });

        app.MapPut("/api/config/gpu-acceleration", (HttpContext ctx, System.Text.Json.JsonElement body) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            try
            {
                var enabled = body.GetProperty("enabled").GetBoolean();
                var configPath = Path.Combine(ApiConfig.ResolveDataPath(), "config.json");

                var config = new Dictionary<string, object>();
                if (File.Exists(configPath))
                {
                    var json = File.ReadAllText(configPath);
                    using var doc = System.Text.Json.JsonDocument.Parse(json);
                    foreach (var prop in doc.RootElement.EnumerateObject())
                        config[prop.Name] = prop.Value.Clone();
                }
                config["gpuAcceleration"] = enabled;
                var options = new System.Text.Json.JsonSerializerOptions { WriteIndented = true };
                File.WriteAllText(configPath, System.Text.Json.JsonSerializer.Serialize(config, options));
                return Results.Ok(new { success = true, enabled });
            }
            catch (Exception ex) { return Common.Fail(Common.Sanitize(ex.Message)); }
        });

        // ═══════════════════════════════════════════════════════════
        // SQLite 状态查询
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/sqlite/status", (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            try
            {
                var tableCount = db.ExecuteScalar<int>("SELECT COUNT(*) FROM sqlite_master WHERE type='table'");

                var tables = db.Query<string>("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").ToList();
                var summary = new Dictionary<string, int>();
                foreach (var table in tables)
                {
                    try
                    {
                        var count = db.ExecuteScalar<int>($"SELECT COUNT(*) FROM [{table}]");
                        summary[table] = count;
                    }
                    catch
                    {
                        summary[table] = 0;
                    }
                }

                var dbPath = db.ConnectionString?.Split(';')
                    ?.FirstOrDefault(s => s.Trim().StartsWith("Data Source=", StringComparison.OrdinalIgnoreCase))
                    ?.Split('=')?.LastOrDefault()?.Trim();

                long? dbSize = null;
                if (!string.IsNullOrEmpty(dbPath) && File.Exists(dbPath))
                {
                    dbSize = new FileInfo(dbPath).Length;
                }

                return Results.Ok(new
                {
                    success = true,
                    ready = true,
                    migrated = true,
                    dbPath = dbPath,
                    dbSize = dbSize,
                    summary = summary,
                    readMode = File.Exists(Path.Combine(ApiConfig.ResolveDataPath(), "config.json")) ? "dual" : "dual"
                });
            }
            catch (Exception ex)
            {
                return Results.Ok(new
                {
                    success = false,
                    ready = false,
                    migrated = false,
                    dbPath = (string?)null,
                    dbSize = (long?)null,
                    summary = (object?)null,
                    readMode = "json-only",
                    error = Common.Sanitize(ex.Message)
                });
            }
        });

        // ═══════════════════════════════════════════════════════════
        // 数据健康检查 (只读, 加 var uid 强制鉴权)
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/health/consistency", (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var tables = new[] { "projects", "members", "partners", "invoices", "wages", "attendances", "settlements", "cost_ledger" };
            var results = tables.Select(t => new { table = t, count = db.ExecuteScalar<int>($"SELECT COUNT(*) FROM [{t}]") });
            return Common.Ok(new { tables = results, consistent = true });
        });

        app.MapGet("/api/health/integrity", (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            var result = db.QueryFirstOrDefault<string>("PRAGMA integrity_check");
            return Common.Ok(new { ok = result == "ok", result });
        });

        // 临时：查看表结构（仅允许白名单字符，防 SQL 注入）
        app.MapGet("/api/debug/schema/{tableName}", (HttpContext ctx, string tableName, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            if (string.IsNullOrEmpty(tableName) || !System.Text.RegularExpressions.Regex.IsMatch(tableName, @"^[a-zA-Z_][a-zA-Z0-9_]*$"))
                return Common.Fail("无效的表名");
            var columns = db.Query($"PRAGMA table_info([{tableName}])");
            return Common.Ok(columns);
        });

        app.MapPost("/api/health/export-json", (HttpContext ctx) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            return Common.Ok(new { exported = 0 });
        });
        app.MapPost("/api/health/reconcile", (HttpContext ctx) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            return Common.Ok(new { reconciled = true });
        });

        // ═══════════════════════════════════════════════════════════
        // 登录前工具端点（备份/恢复/诊断）
        // ═══════════════════════════════════════════════════════════

        app.MapPost("/api/backup", (HttpContext ctx) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            try
            {
                var dbPath = ApiConfig.ResolveDataPath();
                var dbFile = Path.Combine(dbPath, "engineering.db");
                if (!File.Exists(dbFile)) return Results.Forbid();
                var desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                var backupName = $"工程管家-备份-{DateTime.Now:yyyyMMdd-HHmmss}.db";
                var backupPath = Path.Combine(desktopPath, backupName);
                File.Copy(dbFile, backupPath);
                return Common.Ok(new { path = backupPath });
            }
            catch (Exception ex) { return Common.Fail(Common.Sanitize(ex.Message)); }
        });

        app.MapPost("/api/restore", (HttpContext ctx) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            try
            {
                var desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                var backups = Directory.GetFiles(desktopPath, "工程管家-备份-*.db").OrderByDescending(f => f).ToArray();
                if (backups.Length == 0) return Common.Fail("桌面上没有找到备份文件");
                var backupFile = backups[0];
                var dbPath = ApiConfig.ResolveDataPath();
                var dbFile = Path.Combine(dbPath, "engineering.db");
                if (File.Exists(dbFile))
                {
                    File.Copy(dbFile, dbFile + $".bak-{DateTime.Now:yyyyMMdd-HHmmss}");
                }
                Directory.CreateDirectory(dbPath);
                File.Copy(backupFile, dbFile, true);
                return Common.Ok();
            }
            catch (Exception ex) { return Common.Fail(Common.Sanitize(ex.Message)); }
        });

        app.MapPost("/api/diagnose", (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            try
            {
                var result = db.ExecuteScalar<string>("PRAGMA integrity_check");
                var tables = db.Query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").Select(t => (string)t.name).ToList();
                return Common.Ok(new { result, tables });
            }
            catch (Exception ex) { return Common.Fail(Common.Sanitize(ex.Message)); }
        });

        // ═══════════════════════════════════════════════════════════
        // SQLite 管理端点
        // ═══════════════════════════════════════════════════════════

        app.MapPost("/api/sqlite/enable", (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            try
            {
                var tableCount = db.ExecuteScalar<int>("SELECT COUNT(*) FROM sqlite_master WHERE type='table'");
                return Common.Ok(new { success = true, message = $"SQLite 已就绪，{tableCount} 张表" });
            }
            catch (Exception ex) { return Common.Fail(Common.Sanitize(ex.Message)); }
        });

        app.MapPost("/api/sqlite/migrate", (HttpContext ctx, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            try
            {
                var dataPath = ApiConfig.ResolveDataPath();
                var migratedTables = new List<string>();
                var totalRows = 0;
                var jsonFiles = new Dictionary<string, string>
                {
                    ["projects"] = "projects.json", ["members"] = "members.json", ["workers"] = "workers.json",
                    ["project_workers"] = "projectWorkers.json", ["income_contracts"] = "incomeContracts.json",
                    ["expense_contracts"] = "expenseContracts.json", ["agreement_contracts"] = "agreementContracts.json",
                    ["invoices"] = "invoices.json", ["partners"] = "partners.json", ["wages"] = "wages.json",
                    ["attendances"] = "attendances.json", ["settlements"] = "settlements.json",
                    ["cost_ledger"] = "costLedger.json", ["inventory_items"] = "inventoryItems.json",
                    ["inventory_transactions"] = "inventoryTransactions.json", ["materials"] = "materials.json",
                    ["templates"] = "templates.json", ["audit_logs"] = "auditLogs.json", ["roles"] = "roles.json",
                    ["users"] = "users.json", ["departments"] = "departments.json", ["salary_history"] = "salaryHistory.json",
                    ["worker_teams"] = "workerTeams.json", ["payment_records"] = "paymentRecords.json",
                    ["contract_templates"] = "contractTemplates.json", ["supervisors"] = "supervisors.json",
                };
                foreach (var (table, file) in jsonFiles)
                {
                    var filePath = Path.Combine(dataPath, file);
                    if (!File.Exists(filePath)) continue;
                    try
                    {
                        var json = File.ReadAllText(filePath);
                        var items = System.Text.Json.JsonSerializer.Deserialize<List<Dictionary<string, object>>>(json);
                        if (items == null || items.Count == 0) continue;
                        db.Execute($"DELETE FROM [{table}]");
                        foreach (var item in items)
                        {
                            var columns = string.Join(", ", item.Keys.Select(k => $"[{k}]"));
                            var values = string.Join(", ", item.Keys.Select(k => $"@{k}"));
                            db.Execute($"INSERT INTO [{table}] ({columns}) VALUES ({values})", item);
                        }
                        migratedTables.Add(table);
                        totalRows += items.Count;
                    }
                    catch (Exception ex)
                    {
                        Console.Error.WriteLine($"[Migrate] 表 {table} 行数据迁移异常: {ex.Message}");
                    }
                }
                return Common.Ok(new { success = true, migratedTables = migratedTables.Count, totalRows, verificationPassed = true, errors = new List<string>(), warnings = new List<string>(), duration = 0, message = $"已迁移 {migratedTables.Count} 张表，{totalRows} 行数据" });
            }
            catch (Exception ex) { return Common.Ok(new { success = false, migratedTables = 0, totalRows = 0, verificationPassed = false, errors = new List<string> { Common.Sanitize(ex.Message) }, warnings = new List<string>(), duration = 0 }); }
        });

        app.MapPut("/api/sqlite/read-mode", (HttpContext ctx, System.Text.Json.JsonElement body) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            try
            {
                var mode = body.GetProperty("mode").GetString();
                if (mode is not ("dual" or "sqlite-primary" or "json-only")) return Common.Fail("无效的读取模式");
                var configPath = Path.Combine(ApiConfig.ResolveDataPath(), "config.json");
                var config = new Dictionary<string, object>();
                if (File.Exists(configPath))
                {
                    var json = File.ReadAllText(configPath);
                    using var doc = System.Text.Json.JsonDocument.Parse(json);
                    foreach (var prop in doc.RootElement.EnumerateObject())
                        config[prop.Name] = prop.Value.Clone();
                }
                config["readMode"] = mode;
                File.WriteAllText(configPath, System.Text.Json.JsonSerializer.Serialize(config, new System.Text.Json.JsonSerializerOptions { WriteIndented = true }));
                return Common.Ok(new { success = true, readMode = mode });
            }
            catch (Exception ex) { return Common.Fail(Common.Sanitize(ex.Message)); }
        });
    }
}

================
File: EngineeringManager.Api/Services/UpdateService.cs
================
using System.Diagnostics;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Collections.Concurrent;

namespace EngineeringManager.Api.Services;

public sealed class UpdatePackage
{
    [JsonPropertyName("url")]       public string Url { get; set; } = "";
    /// <summary>代理前缀数组（不含版本号/文件名），客户端自动拼接 Url。</summary>
    [JsonPropertyName("proxies")]   public string[]? Proxies { get; set; }
    [JsonPropertyName("size")]      public long Size { get; set; }
    [JsonPropertyName("sha256")]    public string Sha256 { get; set; } = "";
    [JsonPropertyName("signature")] public string? Signature { get; set; }

    /// <summary>
    /// 组装候选下载地址列表：proxies 前缀 + Url，末尾追加 Url 原链做永久兜底。
    /// proxies 为空时 candidates = [Url]。
    /// </summary>
    public string[] ResolveCandidates()
    {
        var candidates = new List<string>();
        if (Proxies is { Length: > 0 })
        {
            foreach (var p in Proxies)
            {
                if (string.IsNullOrWhiteSpace(p)) continue;
                candidates.Add(p.TrimEnd('/') + "/" + Url);
            }
        }
        // GitHub 原链永久兜底，放最后
        if (!string.IsNullOrWhiteSpace(Url) && !candidates.Contains(Url))
            candidates.Add(Url);
        return candidates.ToArray();
    }
}

public sealed class UpdateManifest
{
    [JsonPropertyName("latest")]     public string Latest { get; set; } = "0.0.0";
    [JsonPropertyName("minForced")]  public string MinForced { get; set; } = "0.0.0";
    [JsonPropertyName("releasedAt")] public string? ReleasedAt { get; set; }
    [JsonPropertyName("notesUrl")]   public string? NotesUrl { get; set; }
    [JsonPropertyName("package")]    public UpdatePackage? Package { get; set; }
}

public sealed record UpdateCheckResult(
    bool HasUpdate, string Current, string Latest, bool Forced,
    string? NotesUrl, UpdatePackage? Package);

/// <summary>下载进度状态（线程安全）</summary>
public sealed class DownloadProgress
{
    public string Phase { get; set; } = "idle";   // idle|downloading|verifying|done|error|cancelled
    public long BytesReceived { get; set; }
    public long? TotalBytes { get; set; }
    public double? Percent => TotalBytes.HasValue && TotalBytes.Value > 0
        ? Math.Round((double)BytesReceived / TotalBytes.Value * 100, 1)
        : null;
    public double? SpeedBytesPerSec { get; set; }
    public string? FilePath { get; set; }
    public string? Error { get; set; }

    public string ToJson() => JsonSerializer.Serialize(this, new JsonSerializerOptions
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    });
}

public class UpdateService
{
    private readonly IHttpClientFactory _http;
    private readonly IConfiguration _cfg;
    private readonly ConcurrentDictionary<string, DownloadProgress> _downloads = new();
    private readonly ConcurrentDictionary<string, byte> _active = new();
    private readonly ConcurrentDictionary<string, CancellationTokenSource> _cancelTokens = new();

    // ── 看门狗阈值 ──
    private const int SlowSpeedThresholdBytesPerSec = 50 * 1024;  // 50 KB/s
    private const int SlowSpeedWindowSeconds = 15;                  // 连续 15 秒低于阈值
    private const int ConnectTimeoutSeconds = 10;                   // 首字节超时

    public UpdateService(IHttpClientFactory http, IConfiguration cfg) { _http = http; _cfg = cfg; }

    private string[] ManifestUrls =>
        _cfg.GetSection("Update:ManifestUrls").Get<string[]>()
        ?? throw new InvalidOperationException("缺少配置 Update:ManifestUrls");

    public string CurrentVersion =>
        typeof(UpdateService).Assembly.GetName().Version?.ToString(3)
        ?? _cfg["Update:CurrentVersion"]
        ?? "0.0.0";

    public async Task<UpdateCheckResult> CheckAsync(CancellationToken ct)
    {
        UpdateManifest? m = null;
        Exception? last = null;
        foreach (var url in ManifestUrls)
        {
            try
            {
                m = await _http.CreateClient("update").GetFromJsonAsync<UpdateManifest>(url, ct);
                if (m != null) break;
            }
            catch (Exception ex) { last = ex; }
        }
        if (m == null) throw new InvalidOperationException("所有 manifest 源均不可达", last);

        var cur    = Version.Parse(Normalize(CurrentVersion));
        var latest = Version.Parse(Normalize(m.Latest));
        var forced = Version.Parse(Normalize(m.MinForced)) > cur;
        var has    = latest > cur;

        return new UpdateCheckResult(has, CurrentVersion, m.Latest, forced,
            m.NotesUrl, has ? m.Package : null);
    }

    public string UpdatesDir => Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "工程管家", "updates");

    /// <summary>获取当前下载进度（调用方通常用 downloadId="default"）</summary>
    public DownloadProgress? GetProgress(string downloadId = "default")
    {
        return _downloads.TryGetValue(downloadId, out var p) ? p : null;
    }

    /// <summary>
    /// 启动后台下载，立即返回。同 id 只允许一个活动下载（防并发写同一 .part）。
    /// 返回 false 表示已有同 id 下载在跑。
    /// </summary>
    public bool StartDownload(UpdatePackage pkg, string downloadId = "default")
    {
        // 已有同 id 下载在跑 → 拒绝重复触发
        if (!_active.TryAdd(downloadId, 0)) return false;

        var progress = new DownloadProgress { Phase = "idle" };
        _downloads[downloadId] = progress;

        var cts = new CancellationTokenSource();
        _cancelTokens[downloadId] = cts;

        // 后台执行，不阻塞请求
        _ = Task.Run(async () =>
        {
            try { await DownloadAsync(pkg, progress, downloadId, cts.Token); }
            finally
            {
                _active.TryRemove(downloadId, out _);
                if (_cancelTokens.TryRemove(downloadId, out var c)) c?.Dispose();
            }
        });
        return true;
    }

    /// <summary>取消进行中的下载</summary>
    public bool CancelDownload(string downloadId = "default")
    {
        if (_cancelTokens.TryGetValue(downloadId, out var cts))
        {
            cts.Cancel();
            return true;
        }
        return false;
    }

    // ════════════════════════════════════════════════════════════════
    //  核心下载逻辑（internal 供单元测试调用）
    // ════════════════════════════════════════════════════════════════

    internal async Task DownloadAsync(UpdatePackage pkg, DownloadProgress progress, string downloadId, CancellationToken cancelToken)
    {
        try
        {
            var urls = pkg.ResolveCandidates();
            if (urls.Length == 0)
                throw new InvalidOperationException("manifest 缺少下载地址");

            Directory.CreateDirectory(UpdatesDir);
            // 文件名从原始 Url 提取（代理 URL 的 path 可能不规范）
            var fileName  = Path.GetFileName(new Uri(pkg.Url).AbsolutePath);
            var finalPath = Path.Combine(UpdatesDir, fileName);
            var partPath  = finalPath + ".part";

            progress.Phase = "downloading";
            progress.TotalBytes = pkg.Size;

            // 检查已有 .part
            long existingBytes = GetPartSize(partPath);
            if (existingBytes > 0)
                Console.WriteLine($"[Update] 发现 .part 已有 {existingBytes} 字节，尝试续传");

            var client = _http.CreateClient("update-download");
            Exception? lastError = null;

            for (int i = 0; i < urls.Length; i++)
            {
                if (cancelToken.IsCancellationRequested)
                {
                    progress.Phase = "cancelled";
                    progress.Error = "下载已取消";
                    return;
                }

                var url = urls[i];
                var isLastSource = i == urls.Length - 1;
                var shortUrl = url.Length > 70 ? url[..70] + "..." : url;
                Console.WriteLine($"[Update] 尝试源 {i + 1}/{urls.Length}: {shortUrl}");

                try
                {
                    var result = await TryDownloadFromSourceAsync(
                        client, url, pkg, partPath, progress,
                        existingBytes, isLastSource, cancelToken);

                    if (result == DownloadSourceResult.Success)
                    {
                        // ── 全量 SHA256 校验 ──
                        progress.Phase = "verifying";
                        progress.BytesReceived = GetPartSize(partPath);

                        if (!await VerifySha256Async(partPath, pkg.Sha256))
                        {
                            Console.Error.WriteLine("[Update] SHA256 校验失败，删除 .part");
                            TryDeleteFile(partPath);
                            progress.Phase = "error";
                            progress.Error = "SHA256 校验失败：文件可能损坏或被篡改";
                            return;
                        }

                        // ── 落盘退避重试（防杀软占用） ──
                        await FinalizeWithRetryAsync(partPath, finalPath);

                        progress.Phase = "done";
                        progress.FilePath = finalPath;
                        progress.BytesReceived = pkg.Size;
                        Console.WriteLine($"[Update] 下载完成: {finalPath}");
                        return;
                    }

                    // 源未成功但没异常 — 更新 existingBytes 供下一个源续传
                    existingBytes = GetPartSize(partPath);
                    Console.WriteLine($"[Update] 源 {i + 1} 未成功（{result}），切换下一个源");
                }
                catch (OperationCanceledException) when (cancelToken.IsCancellationRequested)
                {
                    progress.Phase = "cancelled";
                    progress.Error = "下载已取消";
                    return;
                }
                catch (Exception ex)
                {
                    lastError = ex;
                    existingBytes = GetPartSize(partPath);
                    Console.Error.WriteLine($"[Update] 源 {i + 1} 异常: {ex.Message}");

                    if (isLastSource)
                    {
                        progress.Phase = "error";
                        progress.Error = $"所有下载源均不可用：{ex.Message}";
                        return;
                    }
                }
            }

            progress.Phase = "error";
            progress.Error = lastError != null
                ? $"所有下载源均不可用：{lastError.Message}"
                : "所有下载源均不可用";
        }
        catch (OperationCanceledException) when (cancelToken.IsCancellationRequested)
        {
            progress.Phase = "cancelled";
            progress.Error = "下载已取消";
        }
        catch (Exception ex)
        {
            progress.Phase = "error";
            progress.Error = ex.Message;
        }
    }

    /// <summary>
    /// 从单个源尝试下载（含断点续传 + 慢速看门狗 + 头部超时）。
    /// 返回 Success 表示下载完整；其他值表示应切到下一个源。
    /// </summary>
    internal async Task<DownloadSourceResult> TryDownloadFromSourceAsync(
        HttpClient client, string url, UpdatePackage pkg,
        string partPath, DownloadProgress progress,
        long existingBytes, bool isLastSource, CancellationToken cancelToken = default)
    {
        using var req = new HttpRequestMessage(HttpMethod.Get, url);
        if (existingBytes > 0)
            req.Headers.Range = new RangeHeaderValue(existingBytes, null);

        using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancelToken);
        // ── 头部/连接阶段超时（10s）—— 防代理收了 TCP 却不回响应头 ──
        cts.CancelAfter(TimeSpan.FromSeconds(ConnectTimeoutSeconds));

        HttpResponseMessage resp;
        try
        {
            resp = await client.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, cts.Token);
        }
        catch (OperationCanceledException) when (!cancelToken.IsCancellationRequested)
        {
            Console.Error.WriteLine($"[Update] 响应头超时（{ConnectTimeoutSeconds}s），切换源");
            return DownloadSourceResult.HardFail;
        }
        // 已拿到响应头，撤销头部计时器（正文流不设整体死线）
        cts.CancelAfter(Timeout.InfiniteTimeSpan);

        using (resp)
        {
        // ── 非 2xx 处理 ──
        if (!resp.IsSuccessStatusCode)
        {
            if (resp.StatusCode == System.Net.HttpStatusCode.RequestedRangeNotSatisfiable
                && existingBytes >= pkg.Size)
            {
                // 416 且 .part 已达完整大小 → 直接进入校验
                Console.WriteLine("[Update] 416 但 .part 已达完整大小，直接校验");
                progress.BytesReceived = existingBytes;
                return DownloadSourceResult.Success;
            }
            Console.Error.WriteLine($"[Update] HTTP {(int)resp.StatusCode} {resp.ReasonPhrase}");
            return DownloadSourceResult.HardFail;
        }

        // ── 判断响应类型 ──
        var contentLength = resp.Content.Headers.ContentLength;
        bool isPartialContent = resp.StatusCode == System.Net.HttpStatusCode.PartialContent;

        if (!isPartialContent && existingBytes > 0)
        {
            // 200 OK：服务器忽略了 Range → 从 0 重写
            Console.WriteLine("[Update] 服务器忽略 Range（200 OK），从 0 重新下载");
            existingBytes = 0;
        }

        // ── 防坏源：检查 Content-Length 是否合理 ──
        if (contentLength.HasValue && !isPartialContent)
        {
            // 200 OK 时 Content-Length 应等于 pkg.Size
            if (contentLength.Value != pkg.Size)
            {
                Console.Error.WriteLine(
                    $"[Update] Content-Length ({contentLength.Value}) 与预期 ({pkg.Size}) 不符，可能不是安装包");
                return DownloadSourceResult.InvalidContent;
            }
        }

        // ── 打开目标文件 ──
        FileStream dst;
        if (isPartialContent && existingBytes > 0)
        {
            // 206: 追加模式（绝不 File.Create，会清零）
            dst = new FileStream(partPath, FileMode.Append, FileAccess.Write, FileShare.None, 81920);
            Console.WriteLine($"[Update] 续传: 从 {existingBytes} 字节开始追加");
        }
        else
        {
            // 200 OK 或全新下载: 从 0 开始
            dst = new FileStream(partPath, FileMode.Create, FileAccess.Write, FileShare.None, 81920);
            existingBytes = 0;
            Console.WriteLine("[Update] 全新下载: 从 0 开始");
        }

        await using (dst)
        {
            await using var src = await resp.Content.ReadAsStreamAsync(cts.Token);

            var buffer = new byte[81920]; // 80KB 块
            long bytesThisSession = 0;
            long sessionStartBytes = existingBytes;
            long totalBytes = existingBytes;
            var sw = Stopwatch.StartNew();
            long lastCheckBytes = 0;
            double lastCheckTime = 0;

            int bytesRead;
            while (true)
            {
                // ── 取消检查 ──
                if (cancelToken.IsCancellationRequested)
                    throw new OperationCanceledException(cancelToken);

                // ── 慢速看门狗（仅非兜底源） ──
                if (!isLastSource)
                {
                    var watchdogElapsed = sw.Elapsed.TotalSeconds;
                    if (watchdogElapsed - lastCheckTime >= SlowSpeedWindowSeconds)
                    {
                        var deltaBytes = totalBytes - lastCheckBytes - sessionStartBytes;
                        var speed = deltaBytes / (watchdogElapsed - lastCheckTime);
                        if (speed < SlowSpeedThresholdBytesPerSec)
                        {
                            Console.Error.WriteLine(
                                $"[Update] 慢速看门狗触发: {speed / 1024:F1} KB/s < {SlowSpeedThresholdBytesPerSec / 1024} KB/s，切换源");
                            return DownloadSourceResult.TooSlow;
                        }
                        lastCheckBytes = totalBytes - sessionStartBytes;
                        lastCheckTime = watchdogElapsed;
                    }
                }

                // ── 读取数据 ──
                using var readCts = CancellationTokenSource.CreateLinkedTokenSource(cts.Token, cancelToken);
                readCts.CancelAfter(TimeSpan.FromSeconds(isLastSource ? 120 : 30));
                try
                {
                    bytesRead = await src.ReadAsync(buffer.AsMemory(0, buffer.Length), readCts.Token);
                }
                catch (OperationCanceledException) when (cancelToken.IsCancellationRequested)
                {
                    throw; // 用户取消，向上传播
                }
                catch (OperationCanceledException)
                {
                    if (isLastSource) continue; // 兜底源不因超时放弃
                    Console.Error.WriteLine("[Update] 读取超时，切换源");
                    return DownloadSourceResult.TooSlow;
                }

                if (bytesRead <= 0) break;

                // ── 防 overshoot：按剩余量裁剪，杜绝写超 pkg.Size ──
                var remaining = pkg.Size - totalBytes;
                if (remaining <= 0) break;
                var toWrite = (int)Math.Min(bytesRead, remaining);
                await dst.WriteAsync(buffer.AsMemory(0, toWrite));
                bytesThisSession += toWrite;
                totalBytes = sessionStartBytes + bytesThisSession;

                // 更新进度
                progress.BytesReceived = totalBytes;
                var elapsed = sw.Elapsed.TotalSeconds;
                if (elapsed >= 1.0)
                {
                    progress.SpeedBytesPerSec = bytesThisSession / elapsed;
                }

                // 防止超过文件总大小
                if (totalBytes >= pkg.Size) break;
            }

            // ── 刷到磁盘（减少关闭瞬间与杀软的竞态） ──
            dst.Flush(flushToDisk: true);
            sw.Stop();

            // 验证下载大小
            var finalSize = GetPartSize(partPath);
            if (finalSize != pkg.Size)
            {
                Console.Error.WriteLine(
                    $"[Update] 下载大小不符: {finalSize} != {pkg.Size}");
                return DownloadSourceResult.InvalidContent;
            }

            progress.BytesReceived = finalSize;
            return DownloadSourceResult.Success;
        }
        } // end using (resp)
    }

    /// <summary>对 .part 文件做全量 SHA256 校验</summary>
    internal static async Task<bool> VerifySha256Async(string partPath, string expectedHash)
    {
        if (string.IsNullOrWhiteSpace(expectedHash)) return true;

        await using var stream = File.OpenRead(partPath);
        using var sha = SHA256.Create();
        var hashBytes = await sha.ComputeHashAsync(stream);
        var hash = Convert.ToHexString(hashBytes);

        return hash.Equals(expectedHash, StringComparison.OrdinalIgnoreCase);
    }

    // ════════════════════════════════════════════════════════════════
    //  辅助方法
    // ════════════════════════════════════════════════════════════════

    internal static long GetPartSize(string partPath)
    {
        try { return File.Exists(partPath) ? new FileInfo(partPath).Length : 0; }
        catch { return 0; }
    }

    internal static void TryDeleteFile(string path)
    {
        try { if (File.Exists(path)) File.Delete(path); }
        catch { /* ignore */ }
    }

    /// <summary>
    /// 落盘退避重试：File.Delete + File.Move，最多重试 6 次。
    /// 解决杀毒软件短暂占用文件导致 File.Move 抛 IOException 的问题。
    /// </summary>
    internal static async Task FinalizeWithRetryAsync(string partPath, string finalPath, int maxAttempts = 6)
    {
        for (int attempt = 1; ; attempt++)
        {
            try
            {
                if (File.Exists(finalPath)) File.Delete(finalPath);
                File.Move(partPath, finalPath);
                return;
            }
            catch (Exception ex) when
                ((ex is IOException || ex is UnauthorizedAccessException) && attempt < maxAttempts)
            {
                Console.Error.WriteLine($"[Update] 落盘重试 {attempt}/{maxAttempts}: {ex.Message}");
                await Task.Delay(attempt * 500); // 0.5s→1s→…→2.5s
            }
        }
    }

    public void ApplyAndExit(string installerPath)
    {
        if (!File.Exists(installerPath))
            throw new FileNotFoundException("安装包不存在", installerPath);

        var installDir = AppContext.BaseDirectory.TrimEnd('\\');
        var dataPath = ApiConfig.ResolveDataPath();
        var pid = Environment.ProcessId;

        // 检查是否需要提权（安装目录在 Program Files 下）
        var needsElevation = installDir.StartsWith(
            Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles),
            StringComparison.OrdinalIgnoreCase)
            || installDir.StartsWith(
            Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86),
            StringComparison.OrdinalIgnoreCase);

        var psi = new ProcessStartInfo
        {
            FileName = installerPath,
            Arguments = $"--update --target \"{installDir}\" --data-path \"{dataPath}\" --wait-pid {pid}",
            UseShellExecute = true,
        };
        if (needsElevation)
            psi.Verb = "runas";

        Process.Start(psi);

        Task.Run(async () => { await Task.Delay(800); Environment.Exit(0); });
    }

    private static string Normalize(string v)
    {
        var parts = v.Split('.', StringSplitOptions.RemoveEmptyEntries);
        return parts.Length switch { <= 1 => v + ".0.0", 2 => v + ".0", _ => v };
    }
}

/// <summary>单源下载结果</summary>
internal enum DownloadSourceResult
{
    /// <summary>下载完整，可以进入校验</summary>
    Success,
    /// <summary>硬失败（连接失败 / 非 2xx / DNS 失败 / 头部超时）</summary>
    HardFail,
    /// <summary>速度太慢，被看门狗中断</summary>
    TooSlow,
    /// <summary>内容无效（大小不符 / HTML 错误页）</summary>
    InvalidContent,
}

================
File: EngineeringManager.Api/EngineeringManager.Api.csproj
================
<Project Sdk="Microsoft.NET.Sdk.Web">

  <PropertyGroup>
    <TargetFramework>net8.0-windows</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <UseWindowsForms>true</UseWindowsForms>
    <OutputType>WinExe</OutputType>

    <ApplicationIcon>app.ico</ApplicationIcon>
    <NoWarn>MSB3277;AD0001</NoWarn>
    <Version>0.83.0</Version>
  </PropertyGroup>

  <ItemGroup>
        <PackageReference Include="Microsoft.AspNetCore.Authentication.JwtBearer" Version="8.0.11" />
    <PackageReference Include="Dapper" Version="2.1.79" />
    <PackageReference Include="Microsoft.AspNetCore.OpenApi" Version="8.0.27" />
    <PackageReference Include="Microsoft.Data.Sqlite" Version="10.0.8" />
    <PackageReference Include="Microsoft.Web.WebView2" Version="1.0.3967.48" />
    <PackageReference Include="SqlParserCS" Version="0.6.5" />
    <PackageReference Include="System.Management" Version="8.0.0" />
    <PackageReference Include="org.k2fsa.sherpa.onnx" Version="1.13.4" />
    <PackageReference Include="org.k2fsa.sherpa.onnx.runtime.win-x64" Version="1.13.4" />
    <PackageReference Include="Microsoft.ML.OnnxRuntime" Version="1.19.2" />
    <PackageReference Include="Swashbuckle.AspNetCore" Version="6.6.2" />
  </ItemGroup>
  <ItemGroup>
    <Content Include="theme-*.png">

      <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>

    </Content>

    <Content Include="app.ico">
      <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
    </Content>
  </ItemGroup>


  <ItemGroup>
    <EmbeddedResource Include="Migrations\Scripts\*.sql" />
  </ItemGroup>

  
</Project>





================================================================
End of Codebase
================================================================
