namespace EngineeringManager.Api;

public record DepartmentDto(string Name, long? ManagerId, string? Positions);