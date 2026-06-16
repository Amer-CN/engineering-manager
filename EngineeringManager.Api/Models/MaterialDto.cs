namespace EngineeringManager.Api;

public record MaterialDto(long? Id, string Name, string? Category, string? Unit, string? Specifications, string? Supplier, string? Notes);