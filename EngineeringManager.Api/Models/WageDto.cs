namespace EngineeringManager.Api;

public record WageDto(long? Id, long? ProjectId, long? MemberId, long? ProjectWorkerId, string? YearMonth, double? DailyWage, double? WorkDays, double? Bonus, double? Deduction, double? ActualWage, double? PaidAmount, string? PaidDate);