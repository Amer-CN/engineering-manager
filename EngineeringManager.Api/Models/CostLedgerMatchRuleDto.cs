namespace EngineeringManager.Api;

public record CostLedgerMatchRuleDto(string? Pattern, string? Category, string? Direction, int? Priority);