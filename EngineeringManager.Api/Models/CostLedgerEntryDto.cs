namespace EngineeringManager.Api;

public record CostLedgerEntryDto(long? Id, long? ProjectId, long? BatchId, string? VoucherNo, string? Date, string? Direction, string? Category, double? Amount, string? Counterparty, string? Channel, string? Summary, string? Notes);