namespace EngineeringManager.Api;

public record InventoryItemDto(long? Id, string Name, string? Category, string? Unit, double? Quantity, double? MinQuantity, string? Location, string? Notes);