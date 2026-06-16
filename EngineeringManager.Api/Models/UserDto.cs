namespace EngineeringManager.Api;

public record UserDto(string? Id, string Username, string? Password, string? DisplayName, string? RoleId, string? Status);