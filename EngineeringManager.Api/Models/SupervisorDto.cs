namespace EngineeringManager.Api;

public record SupervisorDto(long? Id, long? RegionId, string Name, string? Category, string? Contact, string? Phone, string? Address, string? ProjectIds, string? Remarks);