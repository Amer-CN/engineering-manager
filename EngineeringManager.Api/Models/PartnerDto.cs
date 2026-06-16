namespace EngineeringManager.Api;

public record PartnerDto(long? Id, string Name, string? Category, string? Contact, string? Phone, string? Email, string? Address, string? BankAccount, string? BankName, string? TaxNumber, string? CreditCode, string? RegisteredAddress, string? BusinessScope, string? TaxType, string? ProjectIds);