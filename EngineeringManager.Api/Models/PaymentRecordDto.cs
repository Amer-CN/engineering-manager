namespace EngineeringManager.Api;

public record PaymentRecordDto(long? Id, string? Type, double? Amount, string? RecordDate, long? ProjectId, long? PartnerId, long? ContractId, string? InvoiceDetails, string? Remarks, string? FileUrl, string? FileType);