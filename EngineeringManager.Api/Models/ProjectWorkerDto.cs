namespace EngineeringManager.Api;

public record ProjectWorkerDto(long? Id, long? WorkerId, long? ProjectId, long? TeamId, double? DailyWage, string? WorkerType, string? EntryDate, string? Status);