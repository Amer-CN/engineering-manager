namespace EngineeringManager.Api;

public record ExpenseDto(long? Id, long? ProjectId, string? Category, double? Amount, string? Date, string? Description, string? Vendor, string? ReceiptUrl);