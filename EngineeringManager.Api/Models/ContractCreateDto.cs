namespace EngineeringManager.Api;

public record ContractCreateDto(long? ProjectId, long? PartnerId, string? ContractNo, string? Name, double? Amount, string? SignedDate, string? StartDate, string? EndDate, string? Status, string? PaymentMethod, string? Remarks);
