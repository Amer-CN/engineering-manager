using System.Text.Json;

namespace EngineeringManager.Api;

/// <summary>
/// OCR 首次启动配置向导 API
/// </summary>
public static class OcrSetupWizard
{
    public static void Map(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/ocr/setup");

        // 检测是否已配置
        group.MapGet("/status", () =>
        {
            var status = new
            {
                configured = IsConfigured(),
                source = DetectSource(),
            };
            return Results.Ok(status);
        });

        // 保存用户输入的 key（DPAPI 加密）
        group.MapPost("/save", (OcrSetupDto dto) =>
        {
            if (string.IsNullOrWhiteSpace(dto.ApiKey) || string.IsNullOrWhiteSpace(dto.SecretKey))
                return Results.BadRequest(new { error = "API Key 和 Secret Key 都不能为空" });

            try
            {
                OcrEndpoints.SaveOcrConfigEncrypted(dto.ApiKey, dto.SecretKey);
                return Results.Ok(new { success = true, message = "OCR key 已 DPAPI 加密保存" });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[OcrSetup] 保存失败: {ex.Message}");
                return Results.Problem("OCR key 保存失败", statusCode: 500);
            }
        });

        // 删除已保存的 key
        group.MapDelete("/clear", () =>
        {
            try
            {
                var dpapiPath = Path.Combine(ApiConfig.ResolveDataPath(), "ocr-config.dpapi.json");
                if (File.Exists(dpapiPath))
                {
                    File.Delete(dpapiPath);
                    Console.Error.WriteLine($"[OcrSetup] 已删除 {dpapiPath}");
                }
                Environment.SetEnvironmentVariable("BAIDU_OCR_API_KEY", null);
                Environment.SetEnvironmentVariable("BAIDU_OCR_SECRET_KEY", null);
                return Results.Ok(new { success = true });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[OcrSetup] 清除失败: {ex.Message}");
                return Results.Problem("OCR key 清除失败", statusCode: 500);
            }
        });
    }

    private static bool IsConfigured()
    {
        if (!string.IsNullOrEmpty(Environment.GetEnvironmentVariable("BAIDU_OCR_API_KEY")) &&
            !string.IsNullOrEmpty(Environment.GetEnvironmentVariable("BAIDU_OCR_SECRET_KEY")))
            return true;

        var dpapiPath = Path.Combine(ApiConfig.ResolveDataPath(), "ocr-config.dpapi.json");
        if (File.Exists(dpapiPath)) return true;

        var configPaths = new[]
        {
            Path.Combine(AppContext.BaseDirectory, "public", "ocr-config.json"),
            Path.Combine(Directory.GetCurrentDirectory(), "public", "ocr-config.json"),
            Path.Combine(ApiConfig.ResolveDataPath(), "ocr-config.json"),
            Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "public", "ocr-config.json"),
            Path.Combine(Directory.GetCurrentDirectory(), "..", "public", "ocr-config.json"),
        };
        return configPaths.Any(File.Exists);
    }

    private static string DetectSource()
    {
        if (!string.IsNullOrEmpty(Environment.GetEnvironmentVariable("BAIDU_OCR_API_KEY")))
            return "env";
        if (File.Exists(Path.Combine(ApiConfig.ResolveDataPath(), "ocr-config.dpapi.json")))
            return "dpapi";
        if (File.Exists(Path.Combine(AppContext.BaseDirectory, "public", "ocr-config.json")))
            return "json-legacy";
        return "none";
    }
}

public record OcrSetupDto(string ApiKey, string SecretKey);