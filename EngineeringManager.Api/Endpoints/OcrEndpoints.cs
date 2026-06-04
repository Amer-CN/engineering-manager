using System.Data;
using Dapper;

namespace EngineeringManager.Api;

/// <summary>
/// OCR（百度 OCR API 实现）端点
/// </summary>
public static class OcrEndpoints
{
    // Token 缓存
    private static string? cachedAccessToken;
    private static DateTime tokenExpiresAt = DateTime.MinValue;

    // OCR 统计文件路径
    private static readonly string ocrStatsPath = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
        "工程管家", "ocr-stats.json");

    public static void RegisterOcrEndpoints(this WebApplication app)
    {
        var httpClientFactory = app.Services.GetRequiredService<IHttpClientFactory>();

        // ═══════════════════════════════════════════════════════════
        // 百度身份证 OCR
        // ═══════════════════════════════════════════════════════════

        app.MapPost("/api/ocr/id-card", async (OcrImageDto dto) =>
        {
            try
            {
                var httpClient = httpClientFactory.CreateClient();
                httpClient.Timeout = TimeSpan.FromSeconds(15);

                var ocrData = await CallBaiduOcr(httpClient, "/rest/2.0/ocr/v1/idcard", dto.ImageBase64,
                    new Dictionary<string, string> { ["id_card_side"] = "front" });

                var words = ocrData.TryGetProperty("words_result", out var wr) ? wr : default;

                string GetWord(string key) => words.TryGetProperty(key, out var v) && v.TryGetProperty("words", out var w) ? w.GetString() ?? "" : "";

                var birth = GetWord("出生");
                if (birth?.Length == 8) birth = $"{birth[..4]}-{birth[4..6]}-{birth[6..8]}";

                var result = new
                {
                    success = true,
                    text = words.ToString(),
                    idCard = new
                    {
                        number = GetWord("公民身份号码"),
                        name = GetWord("姓名"),
                        gender = GetWord("性别"),
                        ethnicity = GetWord("民族"),
                        birthDate = birth,
                        address = GetWord("住址"),
                        issueAuthority = GetWord("签发机关"),
                        validDate = GetWord("有效期限")
                    }
                };
                IncrementOcrStat("idCard");
                return Results.Ok(result);
            }
            catch (Exception ex)
            {
                return Results.Ok(new { success = false, error = ex.Message.Contains("超时") ? "百度OCR请求超时，请检查网络连接" : $"百度OCR请求失败: {ex.Message}" });
            }
        });

        // ═══════════════════════════════════════════════════════════
        // 百度发票 OCR
        // ═══════════════════════════════════════════════════════════

        app.MapPost("/api/ocr/invoice", async (OcrImageDto dto) =>
        {
            try
            {
                var httpClient = httpClientFactory.CreateClient();
                httpClient.Timeout = TimeSpan.FromSeconds(15);

                var ocrData = await CallBaiduOcr(httpClient, "/rest/2.0/ocr/v1/vat_invoice", dto.ImageBase64);
                var words = ocrData.TryGetProperty("words_result", out var wr) ? wr : default;

                string GetStr(string key) => words.TryGetProperty(key, out var v) && v.TryGetProperty("word", out var w) ? w.GetString() ?? "" : "";
                decimal GetDec(string key) => decimal.TryParse(GetStr(key).Replace("¥", "").Replace("%", ""), out var d) ? d : 0;

                var taxRateStr = words.TryGetProperty("CommodityTaxRate", out var trArr) && trArr.GetArrayLength() > 0
                    ? trArr[0].TryGetProperty("word", out var tw) ? tw.GetString() ?? "0" : "0" : "0";
                var taxRate = decimal.TryParse(taxRateStr.Replace("%", ""), out var tr) ? tr / 100 : 0;

                var itemName = words.TryGetProperty("CommodityName", out var cnArr) && cnArr.GetArrayLength() > 0
                    ? cnArr[0].TryGetProperty("word", out var iw) ? iw.GetString() ?? "" : "" : "";

                var invoiceDate = GetStr("InvoiceDate");
                if (invoiceDate.Contains("年"))
                    invoiceDate = invoiceDate.Replace("年", "-").Replace("月", "-").Replace("日", "");

                var result = new
                {
                    success = true,
                    text = words.ToString(),
                    invoice = new
                    {
                        invoiceNum = GetStr("InvoiceNum"),
                        invoiceCode = GetStr("InvoiceCode"),
                        invoiceDate,
                        invoiceType = words.TryGetProperty("InvoiceType", out var it) ? it.GetString() ?? "" : words.TryGetProperty("InvoiceTypeOrg", out var ito) ? ito.GetString() ?? "" : "",
                        totalAmount = GetDec("AmountInFiguers"),
                        amountWithoutTax = GetDec("TotalAmount"),
                        totalTax = GetDec("TotalTax"),
                        taxRate,
                        sellerName = GetStr("SellerName"),
                        purchaserName = GetStr("PurchaserName"),
                        checkCode = GetStr("CheckCode"),
                        itemName,
                        remarks = GetStr("Remarks")
                    }
                };
                IncrementOcrStat("invoice");
                return Results.Ok(result);
            }
            catch (Exception ex)
            {
                return Results.Ok(new { success = false, error = ex.Message.Contains("超时") ? "百度OCR请求超时，请检查网络连接" : $"百度OCR请求失败: {ex.Message}" });
            }
        });

        // ═══════════════════════════════════════════════════════════
        // 百度银行卡 OCR
        // ═══════════════════════════════════════════════════════════

        app.MapPost("/api/ocr/bank-card", async (OcrImageDto dto) =>
        {
            try
            {
                var httpClient = httpClientFactory.CreateClient();
                httpClient.Timeout = TimeSpan.FromSeconds(15);

                var ocrData = await CallBaiduOcr(httpClient, "/rest/2.0/ocr/v1/bankcard", dto.ImageBase64);
                var words = ocrData.TryGetProperty("words_result", out var wr) ? wr : default;

            string GetStr(string key) => words.TryGetProperty(key, out var v) ? v.GetString() ?? "" : "";

                var result = new
                {
                    success = true,
                    text = words.ToString(),
                    bankCard = new
                    {
                        cardNumber = GetStr("bank_card_number"),
                        bankName = GetStr("bank_name"),
                        cardType = GetStr("card_type"),
                        validDate = GetStr("valid_date")
                    }
                };
                IncrementOcrStat("bankCard");
                return Results.Ok(result);
            }
            catch (Exception ex)
            {
                return Results.Ok(new { success = false, error = ex.Message.Contains("超时") ? "百度OCR请求超时，请检查网络连接" : $"百度OCR请求失败: {ex.Message}" });
            }
        });

        // ═══════════════════════════════════════════════════════════
        // 百度营业执照 OCR
        // ═══════════════════════════════════════════════════════════

        app.MapPost("/api/ocr/business-license", async (OcrImageDto dto) =>
        {
            try
            {
                var httpClient = httpClientFactory.CreateClient();
                httpClient.Timeout = TimeSpan.FromSeconds(15);

                var ocrData = await CallBaiduOcr(httpClient, "/rest/2.0/ocr/v1/business_license", dto.ImageBase64);
                var words = ocrData.TryGetProperty("words_result", out var wr) ? wr : default;

                string GetStr(string key) => words.TryGetProperty(key, out var v) && v.TryGetProperty("words", out var w) ? w.GetString() ?? "" : "";

                var result = new
                {
                    success = true,
                    text = words.ToString(),
                    businessLicense = new
                    {
                        creditCode = GetStr("社会信用代码"),
                        companyName = GetStr("单位名称"),
                        legalPerson = GetStr("法人"),
                        registeredCapital = GetStr("注册资本"),
                        address = GetStr("住所") is var a && !string.IsNullOrEmpty(a) ? a : GetStr("地址"),
                        businessScope = GetStr("经营范围"),
                        establishDate = GetStr("成立日期"),
                        expireDate = GetStr("有效期")
                    }
                };
                IncrementOcrStat("businessLicense");
                return Results.Ok(result);
            }
            catch (Exception ex)
            {
                return Results.Ok(new { success = false, error = ex.Message.Contains("超时") ? "百度OCR请求超时，请检查网络连接" : $"百度OCR请求失败: {ex.Message}" });
            }
        });

        // ═══════════════════════════════════════════════════════════
        // 百度银行回单 OCR
        // ═══════════════════════════════════════════════════════════

        app.MapPost("/api/ocr/bank-receipt", async (OcrImageDto dto) =>
        {
            try
            {
                var httpClient = httpClientFactory.CreateClient();
                httpClient.Timeout = TimeSpan.FromSeconds(15);

                var ocrData = await CallBaiduOcr(httpClient, "/rest/2.0/ocr/v1/receipt", dto.ImageBase64);
                var words = ocrData.TryGetProperty("words_result", out var wr) ? wr : default;

                string GetStr(string key) => words.TryGetProperty(key, out var v) && v.TryGetProperty("words", out var w) ? w.GetString() ?? "" : "";

                var amountStr = GetStr("金额");
                if (string.IsNullOrEmpty(amountStr)) amountStr = GetStr("交易金额");
                decimal.TryParse(System.Text.RegularExpressions.Regex.Replace(amountStr, @"[^0-9.]", ""), out var amount);

                var result = new
                {
                    success = true,
                    text = words.ToString(),
                    bankReceipt = new
                    {
                        transactionDate = GetStr("交易日期"),
                        transactionTime = GetStr("交易时间"),
                        amount,
                        payerName = words.TryGetProperty("付款方", out var pf) ? pf.GetString() ?? "" : words.TryGetProperty("付款人", out var pp) ? pp.GetString() ?? "" : "",
                        payerAccount = GetStr("付款账号"),
                        payeeName = words.TryGetProperty("收款方", out var rf) ? rf.GetString() ?? "" : words.TryGetProperty("收款人", out var rp) ? rp.GetString() ?? "" : "",
                        payeeAccount = GetStr("收款账号"),
                        transactionNo = words.TryGetProperty("流水号", out var sn) ? sn.GetString() ?? "" : GetStr("交易流水号"),
                        bankName = GetStr("银行名称"),
                        remarks = words.TryGetProperty("摘要", out var sm) ? sm.GetString() ?? "" : GetStr("备注")
                    }
                };
                IncrementOcrStat("bankReceipt");
                return Results.Ok(result);
            }
            catch (Exception ex)
            {
                return Results.Ok(new { success = false, error = ex.Message.Contains("超时") ? "百度OCR请求超时，请检查网络连接" : $"百度OCR请求失败: {ex.Message}" });
            }
        });

        // ═══════════════════════════════════════════════════════════
        // 百度开户许可证 OCR
        // ═══════════════════════════════════════════════════════════

        app.MapPost("/api/ocr/permit", async (OcrImageDto dto) =>
        {
            try
            {
                var httpClient = httpClientFactory.CreateClient();
                httpClient.Timeout = TimeSpan.FromSeconds(15);

                var ocrData = await CallBaiduOcr(httpClient, "/rest/2.0/ocr/v1/business_license", dto.ImageBase64);
                var words = ocrData.TryGetProperty("words_result", out var wr) ? wr : default;

                string GetStr(string key) => words.TryGetProperty(key, out var v) && v.TryGetProperty("words", out var w) ? w.GetString() ?? "" : "";

                var result = new
                {
                    success = true,
                    text = words.ToString(),
                    permit = new
                    {
                        companyCode = GetStr("社会信用代码"),
                        companyName = GetStr("单位名称"),
                        accountNumber = "",
                        bankName = "",
                        permitNumber = ""
                    }
                };
                IncrementOcrStat("permit");
                return Results.Ok(result);
            }
            catch (Exception ex)
            {
                return Results.Ok(new { success = false, error = ex.Message.Contains("超时") ? "百度OCR请求超时，请检查网络连接" : $"百度OCR请求失败: {ex.Message}" });
            }
        });

        // ═══════════════════════════════════════════════════════════
        // 百度银行单据 OCR
        // ═══════════════════════════════════════════════════════════

        app.MapPost("/api/ocr/bank-statement", async (OcrImageDto dto) =>
        {
            try
            {
                var httpClient = httpClientFactory.CreateClient();
                httpClient.Timeout = TimeSpan.FromSeconds(15);

                var ocrData = await CallBaiduOcr(httpClient, "/rest/2.0/ocr/v1/bank_receipt", dto.ImageBase64);
                var words = ocrData.TryGetProperty("words_result", out var wr) ? wr : default;

                var transactions = new List<object>();
                if (words.ValueKind == System.Text.Json.JsonValueKind.Array)
                {
                    foreach (var item in words.EnumerateArray())
                    {
                        string G(string k) => item.TryGetProperty(k, out var v) ? v.GetString() ?? "" : "";
                        decimal ParseDec(string s) => decimal.TryParse(System.Text.RegularExpressions.Regex.Replace(s, @"[^0-9.-]", ""), out var d) ? d : 0;
                        transactions.Add(new
                        {
                            date = item.TryGetProperty("交易日期", out var d1) ? d1.GetString() ?? "" : G("date"),
                            time = item.TryGetProperty("交易时间", out var t1) ? t1.GetString() ?? "" : G("time"),
                            amount = ParseDec(item.TryGetProperty("金额", out var a1) ? a1.GetString() ?? "0" : G("amount")),
                            balance = ParseDec(item.TryGetProperty("余额", out var b1) ? b1.GetString() ?? "0" : G("balance")),
                            type = item.TryGetProperty("类型", out var tp) ? tp.GetString() ?? "" : G("type"),
                            counterparty = item.TryGetProperty("对方户名", out var cp) ? cp.GetString() ?? "" : G("counterparty"),
                            remark = item.TryGetProperty("摘要", out var rm) ? rm.GetString() ?? "" : G("remark")
                        });
                    }
                }

                var result = new
                {
                    success = true,
                    text = words.ToString(),
                    bankStatement = new
                    {
                        transactions,
                        accountNumber = "",
                        bankName = ""
                    }
                };
                IncrementOcrStat("bankStatement");
                return Results.Ok(result);
            }
            catch (Exception ex)
            {
                return Results.Ok(new { success = false, error = ex.Message.Contains("超时") ? "百度OCR请求超时，请检查网络连接" : $"百度OCR请求失败: {ex.Message}" });
            }
        });

        // ═══════════════════════════════════════════════════════════
        // 百度通用票据 OCR
        // ═══════════════════════════════════════════════════════════

        app.MapPost("/api/ocr/general-receipt", async (OcrImageDto dto) =>
        {
            try
            {
                var httpClient = httpClientFactory.CreateClient();
                httpClient.Timeout = TimeSpan.FromSeconds(15);

                var ocrData = await CallBaiduOcr(httpClient, "/rest/2.0/ocr/v1/accurate_basic", dto.ImageBase64);
                var words = ocrData.TryGetProperty("words_result", out var wr) ? wr : default;

                var textParts = new List<string>();
                if (words.ValueKind == System.Text.Json.JsonValueKind.Array)
                    foreach (var w in words.EnumerateArray())
                        if (w.TryGetProperty("words", out var wv)) textParts.Add(wv.GetString() ?? "");
                var text = string.Join("\n", textParts);

                var amountMatch = System.Text.RegularExpressions.Regex.Match(text, @"[\d,]+\.?\d*\s*元");
                var amount = amountMatch.Success ? decimal.TryParse(amountMatch.Value.Replace("元", "").Replace(",", ""), out var a) ? a : 0 : 0;

                var dateMatch = System.Text.RegularExpressions.Regex.Match(text, @"\d{4}[年/-]\d{1,2}[月/-]\d{1,2}[日]?");
                var date = dateMatch.Success ? dateMatch.Value.Replace("年", "-").Replace("月", "-").Replace("日", "") : "";

                var result = new
                {
                    success = true,
                    text,
                    generalReceipt = new { text, amount, date }
                };
                IncrementOcrStat("generalReceipt");
                return Results.Ok(result);
            }
            catch (Exception ex)
            {
                return Results.Ok(new { success = false, error = ex.Message.Contains("超时") ? "百度OCR请求超时，请检查网络连接" : $"百度OCR请求失败: {ex.Message}" });
            }
        });

        // ═══════════════════════════════════════════════════════════
        // 企业工商信息查询
        // ═══════════════════════════════════════════════════════════

        app.MapPost("/api/ocr/company-query", async (dynamic dto, IHttpClientFactory httpClientFactory) =>
        {
            try
            {
                string companyName = (string)dto.companyName;
                string apiKey = (string)dto.apiKey;
                string secretKey = (string)dto.secretKey;

                if (string.IsNullOrWhiteSpace(companyName))
                    return Results.Ok(new { success = false, error = "请输入企业名称" });

                var httpClient = httpClientFactory.CreateClient();
                httpClient.Timeout = TimeSpan.FromSeconds(10);

                // 获取百度 access_token
                var tokenUrl = $"https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id={apiKey}&client_secret={secretKey}";
                var tokenResp = await httpClient.PostAsync(tokenUrl, null);
                var tokenJson = await tokenResp.Content.ReadAsStringAsync();
                var tokenDoc = System.Text.Json.JsonDocument.Parse(tokenJson);
                var accessToken = tokenDoc.RootElement.GetProperty("access_token").GetString();

                // 使用百度通用文字识别（高精度）接口，传入公司名称文本进行搜索
                // 注意：百度 OCR 没有直接的"按名称搜索企业"接口
                // 改用百度企业工商信息查询（如果已开通）
                // 备选方案：返回提示信息，建议使用营业执照 OCR
                return Results.Ok(new
                {
                    success = false,
                    error = "百度云 OCR 标准版不支持按公司名称搜索工商信息。请使用「营业执照识别」功能上传营业执照图片自动填充，或手动填写信息。"
                });
            }
            catch (Exception ex)
            {
                return Results.Ok(new { success = false, error = $"企业查询失败: {ex.Message}" });
            }
        });

        // ═══════════════════════════════════════════════════════════
        // 检查网络连通性
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/ocr/check-network", async () =>
        {
            try
            {
                var httpClient = httpClientFactory.CreateClient();
                httpClient.Timeout = TimeSpan.FromSeconds(3);
                var response = await httpClient.SendAsync(new HttpRequestMessage(HttpMethod.Head, "https://www.baidu.com/favicon.ico"));
                return Results.Ok(response.IsSuccessStatusCode);
            }
            catch { return Results.Ok(false); }
        });

        // ═══════════════════════════════════════════════════════════
        // 清除 Token 缓存
        // ═══════════════════════════════════════════════════════════

        app.MapPost("/api/ocr/clear-token-cache", () =>
        {
            cachedAccessToken = null;
            tokenExpiresAt = DateTime.MinValue;
            return Results.Ok(true);
        });

        // ═══════════════════════════════════════════════════════════
        // OCR 统计
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/ocr/stats", () =>
        {
            var stats = LoadOcrStats();
            return Results.Ok(new
            {
                idCard = stats.GetValueOrDefault("idCard"),
                invoice = stats.GetValueOrDefault("invoice"),
                bankCard = stats.GetValueOrDefault("bankCard"),
                businessLicense = stats.GetValueOrDefault("businessLicense"),
                bankReceipt = stats.GetValueOrDefault("bankReceipt"),
                permit = stats.GetValueOrDefault("permit"),
                bankStatement = stats.GetValueOrDefault("bankStatement"),
                generalReceipt = stats.GetValueOrDefault("generalReceipt"),
                companyQuery = stats.GetValueOrDefault("companyQuery"),
                lastReset = DateTime.Now.ToString("yyyy-MM")
            });
        });
    }

    // ═══════════════════════════════════════════════════════════
    // 私有辅助方法
    // ═══════════════════════════════════════════════════════════

    private static Dictionary<string, int> LoadOcrStats()
    {
        try
        {
            if (File.Exists(ocrStatsPath))
            {
                var json = File.ReadAllText(ocrStatsPath);
                var stats = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, int>>(json) ?? new();
                // 检查是否需要按月重置
                var currentMonth = DateTime.Now.ToString("yyyy-MM");
                if (!stats.TryGetValue("lastResetYear", out var y) || !stats.TryGetValue("lastResetMonth", out var m)
                    || y != DateTime.Now.Year || m != DateTime.Now.Month)
                {
                    return new Dictionary<string, int>
                    {
                        ["idCard"] = 0, ["invoice"] = 0, ["bankCard"] = 0, ["businessLicense"] = 0,
                        ["bankReceipt"] = 0, ["permit"] = 0, ["bankStatement"] = 0, ["generalReceipt"] = 0,
                        ["companyQuery"] = 0, ["lastResetYear"] = DateTime.Now.Year, ["lastResetMonth"] = DateTime.Now.Month
                    };
                }
                return stats;
            }
        }
        catch { }
        return new Dictionary<string, int>
        {
            ["idCard"] = 0, ["invoice"] = 0, ["bankCard"] = 0, ["businessLicense"] = 0,
            ["bankReceipt"] = 0, ["permit"] = 0, ["bankStatement"] = 0, ["generalReceipt"] = 0,
            ["companyQuery"] = 0, ["lastResetYear"] = DateTime.Now.Year, ["lastResetMonth"] = DateTime.Now.Month
        };
    }

    private static void SaveOcrStats(Dictionary<string, int> stats)
    {
        try
        {
            var dir = Path.GetDirectoryName(ocrStatsPath)!;
            if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);
            File.WriteAllText(ocrStatsPath, System.Text.Json.JsonSerializer.Serialize(stats, new System.Text.Json.JsonSerializerOptions { WriteIndented = true }));
        }
        catch { }
    }

    private static void IncrementOcrStat(string key)
    {
        var stats = LoadOcrStats();
        stats[key] = stats.GetValueOrDefault(key) + 1;
        SaveOcrStats(stats);
    }

    private static (string apiKey, string secretKey) LoadOcrConfig()
    {
        // 优先从 public/ocr-config.json 读取
        var configPaths = new[]
        {
            Path.Combine(AppContext.BaseDirectory, "public", "ocr-config.json"),
            Path.Combine(Directory.GetCurrentDirectory(), "public", "ocr-config.json"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "工程管家", "ocr-config.json"),
            // 项目根目录的 public/ 文件夹
            Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "public", "ocr-config.json"),
            Path.Combine(Directory.GetCurrentDirectory(), "..", "public", "ocr-config.json"),
        };
        foreach (var p in configPaths)
        {
            if (File.Exists(p))
            {
                try
                {
                    var json = System.Text.Json.JsonDocument.Parse(File.ReadAllText(p));
                    var root = json.RootElement;
                    var baidu = root.GetProperty("baidu");
                    return (baidu.GetProperty("apiKey").GetString() ?? "", baidu.GetProperty("secretKey").GetString() ?? "");
                }
                catch { }
            }
        }
        return ("", "");
    }

    private static async Task<string> GetBaiduAccessToken(HttpClient httpClient)
    {
        if (!string.IsNullOrEmpty(cachedAccessToken) && DateTime.Now < tokenExpiresAt)
            return cachedAccessToken;

        var (apiKey, secretKey) = LoadOcrConfig();
        if (string.IsNullOrEmpty(apiKey) || string.IsNullOrEmpty(secretKey))
            throw new InvalidOperationException("百度 OCR 未配置 API Key");

        var tokenUrl = $"https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id={apiKey}&client_secret={secretKey}";
        var response = await httpClient.PostAsync(tokenUrl, null);
        var data = System.Text.Json.JsonDocument.Parse(await response.Content.ReadAsStringAsync());

        if (data.RootElement.TryGetProperty("error", out var err))
            throw new InvalidOperationException($"获取Token失败: {data.RootElement.GetProperty("error_description").GetString() ?? err.GetString()}");

        cachedAccessToken = data.RootElement.GetProperty("access_token").GetString()!;
        var expiresIn = data.RootElement.TryGetProperty("expires_in", out var exp) ? exp.GetInt32() : 2592000;
        tokenExpiresAt = DateTime.Now.AddSeconds(expiresIn - 3600); // 提前1小时刷新
        return cachedAccessToken;
    }

    private static async Task<System.Text.Json.JsonElement> CallBaiduOcr(HttpClient httpClient, string apiPath, string imageBase64, Dictionary<string, string>? extraParams = null)
    {
        var token = await GetBaiduAccessToken(httpClient);
        var base64Data = System.Text.RegularExpressions.Regex.Replace(imageBase64, @"^data:image/\w+;base64,", "");

        var ocrUrl = $"https://aip.baidubce.com{apiPath}?access_token={token}";
        var formParams = new List<KeyValuePair<string, string>> { new("image", base64Data) };
        if (extraParams != null)
            formParams.AddRange(extraParams);

        var formContent = new FormUrlEncodedContent(formParams);
        var ocrResponse = await httpClient.PostAsync(ocrUrl, formContent);
        var ocrJson = System.Text.Json.JsonDocument.Parse(await ocrResponse.Content.ReadAsStringAsync());
        var ocrData = ocrJson.RootElement;

        if (ocrData.TryGetProperty("error_code", out var errorCode))
        {
            var code = errorCode.GetInt32();
            if (code == 110 || code == 111) { cachedAccessToken = null; } // Token 过期
            throw new InvalidOperationException($"百度OCR错误: {(ocrData.TryGetProperty("error_msg", out var msg) ? msg.GetString() : code.ToString())}");
        }

        return ocrData;
    }
}
