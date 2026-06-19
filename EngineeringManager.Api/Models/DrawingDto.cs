namespace EngineeringManager.Api;

public record DrawingDto(long? Id, long? ProjectId, string? Name, string? FileUrl, string? FileName, string? DrawingType, string? Scale, string? Notes);
