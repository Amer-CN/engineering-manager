namespace EngineeringManager.Api;

public record InventoryTransactionDto(long? ItemId, string? Type, double? Quantity, string? Date, string? Notes, string? Operator);
