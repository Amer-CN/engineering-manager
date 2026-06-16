namespace EngineeringManager.Api;

public record SalaryHistoryDto(long? Id, long MemberId, string? EffectiveDate, double? BaseSalary, double? Subsidy, string? SubsidyNote, string? Note);