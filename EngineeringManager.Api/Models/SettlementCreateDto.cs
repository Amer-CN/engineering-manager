namespace EngineeringManager.Api;

public record SettlementCreateDto(long? ProjectId, string? Name, string? SubType, string? SettlementNo, double? Amount, long? SettlerId, string? Remarks);
