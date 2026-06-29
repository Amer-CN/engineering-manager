using System.Net.Http.Json;
using System.Text.Json.Serialization;

namespace EngineeringManager.Api.Services;

public sealed class UpdatePackage
{
    [JsonPropertyName("url")]       public string Url { get; set; } = "";
    [JsonPropertyName("size")]      public long Size { get; set; }
    [JsonPropertyName("sha256")]    public string Sha256 { get; set; } = "";
    [JsonPropertyName("signature")] public string? Signature { get; set; }
}

public sealed class UpdateManifest
{
    [JsonPropertyName("latest")]     public string Latest { get; set; } = "0.0.0";
    [JsonPropertyName("minForced")]  public string MinForced { get; set; } = "0.0.0";
    [JsonPropertyName("releasedAt")] public string? ReleasedAt { get; set; }
    [JsonPropertyName("notesUrl")]   public string? NotesUrl { get; set; }
    [JsonPropertyName("package")]    public UpdatePackage? Package { get; set; }
}

public sealed record UpdateCheckResult(
    bool HasUpdate, string Current, string Latest, bool Forced,
    string? NotesUrl, UpdatePackage? Package);

public class UpdateService
{
    private readonly IHttpClientFactory _http;
    private readonly IConfiguration _cfg;
    public UpdateService(IHttpClientFactory http, IConfiguration cfg) { _http = http; _cfg = cfg; }

    private string ManifestUrl => _cfg["Update:ManifestUrl"]
        ?? throw new InvalidOperationException("缺少配置 Update:ManifestUrl");

    // 当前版本：先读程序集版本；若 .csproj 未设 <Version>，回退到 Update:CurrentVersion 配置
    public string CurrentVersion =>
        _cfg["Update:CurrentVersion"]
        ?? typeof(UpdateService).Assembly.GetName().Version?.ToString(3)
        ?? "0.0.0";

    public async Task<UpdateCheckResult> CheckAsync(CancellationToken ct)
    {
        var m = await _http.CreateClient("update").GetFromJsonAsync<UpdateManifest>(ManifestUrl, ct)
                ?? throw new InvalidOperationException("manifest 拉取失败或为空");

        var cur    = Version.Parse(Normalize(CurrentVersion));
        var latest = Version.Parse(Normalize(m.Latest));
        var forced = Version.Parse(Normalize(m.MinForced)) > cur;
        var has    = latest > cur;

        return new UpdateCheckResult(has, CurrentVersion, m.Latest, forced,
            m.NotesUrl, has ? m.Package : null);
    }

    // System.Version 需 2~4 段；"0.80" → "0.80.0"
    private static string Normalize(string v)
    {
        var parts = v.Split('.', StringSplitOptions.RemoveEmptyEntries);
        return parts.Length switch { <= 1 => v + ".0.0", 2 => v + ".0", _ => v };
    }
}