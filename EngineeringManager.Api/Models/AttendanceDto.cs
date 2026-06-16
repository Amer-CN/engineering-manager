namespace EngineeringManager.Api;

public record AttendanceDto(long? Id, long? MemberId, long? ProjectId, long? ProjectWorkerId, string YearMonth, double? WorkDays, int? DaysOff, bool? IsFullAttendance, string? DailyStatus, string? FileUrl, string? FileName);