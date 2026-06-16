namespace EngineeringManager.Api;

public record WorkerTeamDto(long? Id, string Name, long? ProjectId, long? LeaderId);