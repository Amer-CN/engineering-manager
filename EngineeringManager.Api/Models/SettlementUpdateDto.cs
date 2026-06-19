namespace EngineeringManager.Api;

public record SettlementUpdateDto(long? Id, string? Name, string? SubType, double? Amount, string? Remarks);
