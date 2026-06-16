using System.Windows.Forms;
using System.Text.Json;

namespace EngineeringManager.Api;

/// <summary>
/// 配置端点：数据路径 / GPU 加速 / 上传路径
/// </summary>
public static class ConfigEndpoints
{
    public static void RegisterConfigEndpoints(this WebApplication app)
    {
        app.MapGet("/api/config", () =>
        {
            var defaultPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "工程管家");
            var configPath = Path.Combine(defaultPath, "config.json");

            Dictionary<string, object> config = new();
            if (File.Exists(configPath))
            {
                var json = File.ReadAllText(configPath);
                config = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(json) ?? new();
            }

            if (!config.ContainsKey("dataPath"))
            {
                config["dataPath"] = defaultPath;
            }
            config["defaultPath"] = defaultPath;

            return Common.Ok(config);
        });

        app.MapGet("/api/config/data-path", () =>
        {
            try
            {
                var appDataPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "工程管家");
                var configPath = Path.Combine(appDataPath, "config.json");

                if (File.Exists(configPath))
                {
                    var json = File.ReadAllText(configPath);
                    var config = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(json);
                    if (config != null && config.ContainsKey("dataPath"))
                    {
                        return Common.Ok(config["dataPath"].ToString());
                    }
                }

                return Common.Ok(appDataPath);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[Config] 读取 data-path 异常: {ex.Message}");
                return Common.Ok(ApiConfig.ResolveDataPath());
            }
        });

        app.MapGet("/api/config/uploads-path", () =>
            Common.Ok(Path.Combine(ApiConfig.ResolveDataPath(), "uploads")));

        app.MapPut("/api/config/data-path", (System.Text.Json.JsonElement dto) =>
        {
            try
            {
                var newPath = dto.GetProperty("path").GetString();

                if (newPath == "__select_folder__")
                {
                    string? selectedPath = null;
                    var thread = new Thread(() =>
                    {
                        var dialog = new FolderBrowserDialog
                        {
                            Description = "选择数据存储位置",
                            ShowNewFolderButton = true
                        };
                        if (dialog.ShowDialog() == DialogResult.OK)
                        {
                            selectedPath = dialog.SelectedPath;
                        }
                    });
                    thread.SetApartmentState(ApartmentState.STA);
                    thread.Start();
                    thread.Join();

                    if (string.IsNullOrEmpty(selectedPath))
                    {
                        return Common.Ok(new { cancelled = true });
                    }

                    newPath = selectedPath;
                }

                if (string.IsNullOrEmpty(newPath))
                {
                    return Common.Fail("路径不能为空");
                }

                if (!Directory.Exists(newPath))
                {
                    Directory.CreateDirectory(newPath);
                }

                var appDataPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "工程管家");
                var configPath = Path.Combine(appDataPath, "config.json");

                Dictionary<string, object> config = new();
                if (File.Exists(configPath))
                {
                    var json = File.ReadAllText(configPath);
                    config = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(json) ?? new();
                }

                config["dataPath"] = newPath;

                var options = new System.Text.Json.JsonSerializerOptions { WriteIndented = true };
                File.WriteAllText(configPath, System.Text.Json.JsonSerializer.Serialize(config, options));

                return Common.Ok();
            }
            catch (Exception ex)
            {
                return Common.ServerError("设置路径", ex);
            }
        });

        app.MapGet("/api/config/gpu-acceleration", () =>
        {
            try
            {
                var configPath = Path.Combine(ApiConfig.ResolveDataPath(), "config.json");
                var enabled = true;
                if (File.Exists(configPath))
                {
                    var json = File.ReadAllText(configPath);
                    var doc = System.Text.Json.JsonDocument.Parse(json);
                    if (doc.RootElement.TryGetProperty("gpuAcceleration", out var gpu))
                        enabled = gpu.GetBoolean();
                }
                return Common.Ok(new { success = true, enabled });
            }
            catch (Exception ex) { Console.Error.WriteLine($"[Config] GPU acceleration GET error: {ex.Message}"); return Common.Ok(new { success = true, enabled = true }); }
        });

        app.MapPut("/api/config/gpu-acceleration", (System.Text.Json.JsonElement body) =>
        {
            try
            {
                var enabled = body.GetProperty("enabled").GetBoolean();
                var configPath = Path.Combine(ApiConfig.ResolveDataPath(), "config.json");
                var config = new Dictionary<string, object>();
                if (File.Exists(configPath))
                {
                    var json = File.ReadAllText(configPath);
                    config = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(json)
                             ?? new Dictionary<string, object>();
                }
                config["gpuAcceleration"] = enabled;
                File.WriteAllText(configPath, System.Text.Json.JsonSerializer.Serialize(config, new System.Text.Json.JsonSerializerOptions { WriteIndented = true }));
                return Common.Ok(new { success = true, enabled, needRestart = true });
            }
            catch (Exception ex) { Console.Error.WriteLine($"[ERROR] Config GPU: {ex.Message}"); return Common.ServerError("Config GPU", ex); }
        });
    }
}