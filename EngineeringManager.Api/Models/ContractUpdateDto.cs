namespace EngineeringManager.Api;

public record ContractUpdateDto(long? Id, string? Name, double? Amount, string? Status, string? Remarks);
