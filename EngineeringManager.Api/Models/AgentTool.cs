using System.Text.Json;

namespace EngineeringManager.Api.Models;

/// <summary>
/// OpenAI function calling 工具定义
/// </summary>
public record AgentTool
{
    /// <summary>工具名称（LLM function name）</summary>
    public string Name { get; init; } = "";

    /// <summary>工具描述（供 LLM 理解用途）</summary>
    public string Description { get; init; } = "";

    /// <summary>JSON Schema 参数定义（JsonElement）</summary>
    public JsonElement Parameters { get; init; }

    /// <summary>调用该工具所需的权限标识（如 "projects:read"）</summary>
    public string RequiredPermission { get; init; } = "";

    /// <summary>
    /// 是否需要用户确认（approval）后才执行。默认 false = 只读工具直接执行；
    /// true = 写工具：工具循环拦截，不直接执行，构造确认卡等待用户点选（见 AgentEndpoints）。
    /// </summary>
    public bool RequiresApproval { get; init; } = false;

    /// <summary>结果中需要脱敏的字段列表（如 ["idCard", "phone", "bankAccount"]）</summary>
    public string[] PiiFields { get; init; } = Array.Empty<string>();
}