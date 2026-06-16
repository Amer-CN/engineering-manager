namespace EngineeringManager.Api;

public record ProjectDto(string Name, string? Description, string? Address, string? StartDate, string? EndDate, string? Status, double Budget, long? ProjectManagerId);