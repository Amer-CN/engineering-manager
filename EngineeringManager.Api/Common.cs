using Microsoft.AspNetCore.Mvc;

namespace EngineeringManager.Api;

/// <summary>
/// 公共辅助函数 + DTO 类型定义
/// </summary>
public static class Common
{
    // ============ 辅助函数 ============

    public static IResult Ok(object? data = null) => Results.Ok(new { success = true, data });

    /// <summary>
    /// 写操作结果：affected==0 时区分「记录不存在→404」与「存在但越权→403」（原先一律 403 导致排障绕路）。
    /// 存在性只按 id 查（软删记录视为存在→403，与越权同态，避免泄露软删状态）。
    /// </summary>
    public static async Task<IResult> WriteResult(int affected, System.Data.IDbConnection db, string table, long id)
    {
        if (affected > 0) return Ok();
        var exists = await Dapper.SqlMapper.ExecuteScalarAsync<long>(db, $"SELECT COUNT(1) FROM [{table}] WHERE id=@Id", new { Id = id });
        return exists > 0 ? Results.Forbid() : Results.NotFound(new { success = false, error = "记录不存在" });
    }

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
                    "labor:read","safeQuery:read","knowledge:read"],
        "manager" => ["dashboard:read","projects:read","projects:update","contracts:read","contracts:update",
                      "partners:read","members:read","wages:read","settlement:read","invoices:read",
                      "inventory:read",
                      "costLedger:read","settings:read","users:read","roles:read","audit_logs:read",
                      "labor:read","safeQuery:read","knowledge:read"],
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
record ChangePasswordDto(string OldPassword, string NewPassword);
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
record InventoryItemDto(long? Id, string? Code, string Name, string? Category, string? Unit, string? Specifications, double? PurchasePrice, double? SalePrice, double? CurrentStock, double? MinStock, double? MaxStock, long? SupplierId, string? Remarks);
record MaterialDto(long? Id, long? ProjectId, string Name, string? Category, string? Unit, double? Quantity, double? Price);
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

