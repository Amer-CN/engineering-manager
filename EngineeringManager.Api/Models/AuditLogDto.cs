namespace EngineeringManager.Api;

public record AuditLogDto(string Action, string? Level, string? UserId, string? UserName, string? Resource, string? ResourceId, string? Details, string? Description, string? IpAddress, string? CreatedAt);