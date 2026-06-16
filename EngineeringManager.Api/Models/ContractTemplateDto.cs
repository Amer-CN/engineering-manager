namespace EngineeringManager.Api;

public record ContractTemplateDto(long? Id, string Name, string? Type, string? Content, string? Variables);