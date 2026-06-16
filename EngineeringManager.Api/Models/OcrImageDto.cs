namespace EngineeringManager.Api;

public record OcrImageDto(string ImageBase64, object? Config)
{
    public string ImageBase64 { get; init; } = ImageBase64;
}