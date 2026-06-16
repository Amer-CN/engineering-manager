namespace EngineeringManager.Api;

public record WorkerDto(long? Id, string Name, string? IdCard, string? Gender, string? Phone, string? Address, string? BankAccount, string? BankName, string? WorkerType, double? DailyWage);