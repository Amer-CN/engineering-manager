namespace EngineeringManager.Api;

public record ProjectMemberDto(long? Id, long ProjectId, long MemberId, string? JoinedAt);