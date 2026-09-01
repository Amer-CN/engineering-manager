namespace EngineeringManager.Api;

public record ProjectWorkerDto(long? Id, long? WorkerId, long? ProjectId, long? TeamId, double? DailyWage, string? WorkerType, string? EntryDate, string? Status, string? ContractSigner = null, string? ContractStart = null, string? ContractEnd = null, bool? SafetyTraining = null, string? WorkSection = null, string? ExitDate = null);