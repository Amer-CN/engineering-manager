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

    /// <summary>当前时间字符串（yyyy-MM-dd HH:mm:ss）— 避免在每个端点文件中重复定义</summary>
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
                    "invoices:create","invoices:read","invoices:update","invoices:delete",
                    "costLedger:create","costLedger:read","costLedger:update","costLedger:delete",
                    "settings:read","settings:update","users:create","users:read","users:update","users:delete",
                    "roles:read","roles:update","audit_logs:read","audit_logs:export"],
        "manager" => ["dashboard:read","projects:read","projects:update","contracts:read","contracts:update",
                      "partners:read","members:read","wages:read","settlement:read","invoices:read",
                      "costLedger:read","settings:read","users:read","roles:read","audit_logs:read"],
        "accountant" => ["dashboard:read","projects:read","contracts:read","members:read",
                         "wages:create","wages:read","wages:update","settlement:read","invoices:create",
                         "invoices:read","invoices:update","costLedger:create","costLedger:read",
                         "costLedger:update","settings:read","audit_logs:read","audit_logs:export"],
        "worker" => ["dashboard:read","projects:read","members:read","wages:read"],
        _ => []
    };
}

// ============ DTO 类型 ============

record LoginDto(string Username, string Password);
record UserDto(string? Id, string Username, string? Password, string? DisplayName, string? RoleId, string? Status);
record RoleUpdateDto(string RoleId, string Permissions);
record ProjectDto(string Name, string? Description, string? Address, string? StartDate, string? EndDate, string? Status, double Budget, long? ProjectManagerId);
record MemberDto(long? Id, string Name, string? Phone, string? Email, string? MemberType, string? Role, string? IdCard, string? Gender, string? Ethnicity, string? BirthDate, string? IdCardAddress, double? BaseSalary, double? DailyWage, string? EntryDate, string? Status, long? DepartmentId, string? Position);
record WorkerDto(long? Id, string Name, string? IdCard, string? Gender, string? Phone, string? Address, string? BankAccount, string? BankName, string? WorkerType, double? DailyWage);
record ProjectWorkerDto(long? WorkerId, long? ProjectId, long? TeamId, double? DailyWage, string? WorkerType, string? EntryDate, string? Status);
record PartnerDto(long? Id, string Name, string? Category, string? Contact, string? Phone, string? Email, string? Address, string? BankAccount, string? BankName, string? TaxNumber, string? CreditCode, string? RegisteredAddress, string? BusinessScope, string? TaxType, string? ProjectIds);
record InvoiceDto(long? Id, long? ProjectId, long? SellerId, long? BuyerId, long? ContractId, long? SettlementId, string? Type, string? InvoiceKind, string? InvoiceNo, string? InvoiceCode, string? Name, double? Amount, double? PriceAmount, double? TaxRate, double? TaxAmount, double? ReceivedAmount, string? IssueDate, string? Status, string? Remarks, string? FileUrl, string? FileType);
record PaymentRecordDto(long? Id, string? Type, double? Amount, string? RecordDate, long? ProjectId, long? PartnerId, long? ContractId, string? InvoiceDetails, string? Remarks, string? FileUrl, string? FileType);
record AttendanceDto(long? Id, long? MemberId, long? ProjectId, long? ProjectWorkerId, string YearMonth, double? WorkDays, int? DaysOff, bool? IsFullAttendance, string? DailyStatus, string? FileUrl, string? FileName);
record WageDto(long? Id, long? ProjectId, long? MemberId, long? ProjectWorkerId, string? YearMonth, double? DailyWage, double? WorkDays, double? Bonus, double? Deduction, double? ActualWage, double? PaidAmount, string? PaidDate);
record DepartmentDto(string Name, long? ManagerId, string? Positions);
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

