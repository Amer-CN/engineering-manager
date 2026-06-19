using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;

namespace EngineeringManager.Tests.Common;

/// <summary>
/// 测试用入口点，用于 WebApplicationFactory
/// </summary>
public class TestStartup
{
    public static void Configure(WebApplicationBuilder builder)
    {
        ApiConfig.ConfigureServices(builder);
    }

    public static void ConfigureApp(WebApplication app)
    {
        ApiConfig.ConfigureApp(app);
    }
}
