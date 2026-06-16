namespace EngineeringManager.Api;

public record MemberDto(long? Id, string Name, string? Phone, string? Email, string? MemberType, string? Role, string? IdCard, string? Gender, string? Ethnicity, string? BirthDate, string? IdCardAddress, double? BaseSalary, double? DailyWage, string? EntryDate, string? Status, long? DepartmentId, string? Position);