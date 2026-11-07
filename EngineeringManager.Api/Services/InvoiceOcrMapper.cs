using System.Globalization;
using System.Text.Json;

namespace EngineeringManager.Api.Services;

/// <summary>
/// 百度增值税发票 OCR（/rest/2.0/ocr/v1/vat_invoice）words_result → 收票字段映射（纯函数，便于单测）。
///
/// FP03（2026-11-07 取证结案）：数电票票面已取消发票代码、校验码、收款人、复核人、销售方（章）；
/// 这三项仅纸质发票 / 税控电子发票等历史票样可能返回。识别不到一律留空，禁止伪造或默认填充。
/// </summary>
public static class InvoiceOcrMapper
{
    public sealed record InvoiceOcrFields(
        string InvoiceNum,
        string InvoiceCode,
        string InvoiceDate,
        string InvoiceType,
        decimal TotalAmount,
        decimal AmountWithoutTax,
        decimal TotalTax,
        decimal TaxRate,
        string SellerName,
        string SellerTaxNo,
        string PurchaserName,
        string PurchaserTaxNo,
        string VerifyCode,
        string Drawer,
        string Payee,
        string Reviewer,
        string TaxCode,
        string ItemName,
        string Remarks);

    public static readonly InvoiceOcrFields Empty = new(
        "", "", "", "", 0m, 0m, 0m, 0m, "", "", "", "", "", "", "", "", "", "", "");

    public static InvoiceOcrFields Map(JsonElement words)
    {
        if (words.ValueKind != JsonValueKind.Object)
            return Empty;

        var invoiceType = ReadWord(words, "InvoiceType");
        if (string.IsNullOrEmpty(invoiceType))
            invoiceType = ReadWord(words, "InvoiceTypeOrg");

        var sellerTaxNo = ReadWord(words, "SellerRegisterNum");
        if (string.IsNullOrEmpty(sellerTaxNo))
            sellerTaxNo = ReadWord(words, "SellerTaxNo");

        var purchaserTaxNo = ReadWord(words, "PurchaserRegisterNum");
        if (string.IsNullOrEmpty(purchaserTaxNo))
            purchaserTaxNo = ReadWord(words, "PurchaserTaxNo");

        var verifyCode = ReadWord(words, "CheckCode");
        if (string.IsNullOrEmpty(verifyCode))
            verifyCode = ReadWord(words, "VerifyCode");

        var taxCode = ReadWord(words, "CommodityTaxCode");
        if (string.IsNullOrEmpty(taxCode))
            taxCode = ReadWord(words, "TaxCode");

        return new InvoiceOcrFields(
            InvoiceNum: ReadWord(words, "InvoiceNum"),
            InvoiceCode: ReadWord(words, "InvoiceCode"),
            InvoiceDate: NormalizeDate(ReadWord(words, "InvoiceDate")),
            InvoiceType: invoiceType,
            TotalAmount: ReadDecimal(words, "AmountInFiguers"),
            AmountWithoutTax: ReadDecimal(words, "TotalAmount"),
            TotalTax: ReadDecimal(words, "TotalTax"),
            TaxRate: ParseTaxRate(ReadFirstArrayWord(words, "CommodityTaxRate")),
            SellerName: ReadWord(words, "SellerName"),
            SellerTaxNo: sellerTaxNo,
            PurchaserName: ReadWord(words, "PurchaserName"),
            PurchaserTaxNo: purchaserTaxNo,
            VerifyCode: verifyCode,
            Drawer: ReadWord(words, "Drawer"),
            Payee: ReadWord(words, "Payee"),
            Reviewer: ReadWord(words, "Reviewer"),
            TaxCode: taxCode,
            ItemName: ReadFirstArrayWord(words, "CommodityName"),
            Remarks: ReadWord(words, "Remarks"));
    }

    /// <summary>兼容百度返回的两种形态：{"word":"..."} 对象 或 纯字符串。</summary>
    private static string ReadWord(JsonElement words, string key)
    {
        if (!words.TryGetProperty(key, out var value))
            return "";
        if (value.ValueKind == JsonValueKind.String)
            return value.GetString() ?? "";
        if (value.ValueKind == JsonValueKind.Object
            && value.TryGetProperty("word", out var word)
            && word.ValueKind == JsonValueKind.String)
            return word.GetString() ?? "";
        return "";
    }

    /// <summary>数组字段取第一项（如 CommodityName / CommodityTaxRate）。</summary>
    private static string ReadFirstArrayWord(JsonElement words, string key)
    {
        if (!words.TryGetProperty(key, out var arr) || arr.ValueKind != JsonValueKind.Array || arr.GetArrayLength() == 0)
            return "";
        var first = arr[0];
        if (first.ValueKind == JsonValueKind.String)
            return first.GetString() ?? "";
        if (first.ValueKind == JsonValueKind.Object
            && first.TryGetProperty("word", out var word)
            && word.ValueKind == JsonValueKind.String)
            return word.GetString() ?? "";
        return "";
    }

    private static decimal ReadDecimal(JsonElement words, string key)
    {
        var raw = ReadWord(words, key);
        var cleaned = raw.Replace("¥", "").Replace("￥", "").Replace("%", "").Replace(",", "").Trim();
        return decimal.TryParse(cleaned, NumberStyles.Number, CultureInfo.InvariantCulture, out var d) ? d : 0m;
    }

    /// <summary>"6%" → 0.06；"0.06" → 0.06；空/非法 → 0。</summary>
    private static decimal ParseTaxRate(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
            return 0m;
        var cleaned = raw.Replace("%", "").Trim();
        if (!decimal.TryParse(cleaned, NumberStyles.Number, CultureInfo.InvariantCulture, out var d))
            return 0m;
        return raw.Contains('%') || d > 1m ? d / 100m : d;
    }

    /// <summary>"2026年05月18日" → "2026-05-18"；其它格式原样返回。</summary>
    private static string NormalizeDate(string raw)
    {
        var s = raw.Trim();
        if (s.Contains('年'))
            s = s.Replace("年", "-").Replace("月", "-").Replace("日", "");
        return s;
    }
}