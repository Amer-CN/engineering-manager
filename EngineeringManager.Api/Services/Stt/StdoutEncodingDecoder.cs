using System.Text;

namespace EngineeringManager.Api.Services.Stt;

/// <summary>
/// transcribe.exe stdout 编码解码器。
///
/// 进程输出契约：PYTHONUTF8=1 + PYTHONIOENCODING=utf-8 → stdout 应为 UTF-8。
/// 
/// 10.0 乱码根因：旧代码使用 StreamReader (DecoderReplacementFallback)，
/// 将无效 UTF-8 字节静默替换为 U+FFFD。U+FFFD 进入系统的位置已证明在此处。
/// 原始 stdout 是否实际为 GBK 待真实字节确认（10.0 的 Hex dump 是已损坏字符串
/// 再编码后的字节，不是 transcribe.exe 的原始 stdout 字节）。
///
/// 修复策略（严格解码，禁止静默 U+FFFD，禁止猜测式自动回退）：
/// 1. 按显式编码模式解码（默认 UTF-8，匹配进程输出契约）
/// 2. UTF-8 模式：严格解码，任何无效字节即 fail closed（不自动尝试 GBK）
/// 3. 若需支持 GBK，必须由调用方显式传入 GBK 模式并说明来源
/// 4. 成功解码的结果不得包含 U+FFFD
///
/// 此类是纯逻辑类，无外部依赖，完全可单元测试。
/// </summary>
public static class StdoutEncodingDecoder
{
    /// <summary>
    /// 解码模式：必须由调用方显式指定，不做自动推断。
    /// </summary>
    public enum DecodeMode
    {
        /// <summary>UTF-8 严格模式（默认，匹配 PYTHONUTF8=1 契约）</summary>
        Utf8,
        /// <summary>GBK 模式（仅在显式确认进程输出为 GBK 时使用）</summary>
        Gbk,
    }

    // UTF-8 严格编码：遇到无效字节抛异常而非替换
    private static readonly Encoding StrictUtf8 = new UTF8Encoding(
        encoderShouldEmitUTF8Identifier: false,
        throwOnInvalidBytes: true);

    // GBK 严格编码（lazy init，仅在使用 GBK 模式时创建）
    private static Encoding? _strictGbk;

    static StdoutEncodingDecoder()
    {
        // .NET 5+ 默认只内置 UTF-8/UTF-16/UTF-32，GBK 需显式注册
        try
        {
            Encoding.RegisterProvider(System.Text.CodePagesEncodingProvider.Instance);
        }
        catch { /* 已注册，忽略 */ }
    }

    private static Encoding GetStrictGbk()
    {
        if (_strictGbk != null) return _strictGbk;
        var baseEncoding = Encoding.GetEncoding(936);
        _strictGbk = (Encoding)baseEncoding.Clone();
        _strictGbk.DecoderFallback = new DecoderExceptionFallback();
        return _strictGbk;
    }

    /// <summary>
    /// 解码结果。
    /// </summary>
    public record DecodeResult(string Text, string EncodingUsed, bool ContainsReplacementChars);

    /// <summary>
    /// 从原始字节解码 stdout 文本（默认 UTF-8 模式）。
    /// 
    /// UTF-8 模式下：严格解码，任何无效字节即 fail closed。
    /// 不自动尝试 GBK — 编码必须来自明确、可审计的进程输出契约。
    /// </summary>
    /// <param name="rawBytes">transcribe.exe stdout 的原始字节</param>
    /// <param name="mode">解码模式（默认 UTF-8，匹配 PYTHONUTF8=1 契约）</param>
    /// <returns>解码结果</returns>
    /// <exception cref="InvalidOperationException">解码失败（fail closed）</exception>
    public static DecodeResult Decode(byte[] rawBytes, DecodeMode mode = DecodeMode.Utf8)
    {
        if (rawBytes == null || rawBytes.Length == 0)
            return new DecodeResult("", "empty", false);

        return mode switch
        {
            DecodeMode.Utf8 => DecodeUtf8Strict(rawBytes),
            DecodeMode.Gbk => DecodeGbkStrict(rawBytes),
            _ => throw new ArgumentException($"未知的解码模式: {mode}"),
        };
    }

    private static DecodeResult DecodeUtf8Strict(byte[] rawBytes)
    {
        try
        {
            var text = StrictUtf8.GetString(rawBytes);
            var hasFffd = text.Contains('\uFFFD');
            if (hasFffd)
            {
                throw new InvalidOperationException(
                    $"UTF-8 严格解码成功但结果含 U+FFFD（{CountFffd(text)} 个）。" +
                    $"字节数={rawBytes.Length}，前 50 字节={FormatHex(rawBytes, 50)}。" +
                    "这不应发生在严格模式下，fail closed。");
            }
            return new DecodeResult(text, "utf-8", false);
        }
        catch (DecoderFallbackException)
        {
            // UTF-8 严格解码失败 — 不自动尝试 GBK
            throw new InvalidOperationException(
                $"UTF-8 严格解码失败：stdout 字节不是有效 UTF-8。" +
                $"字节数={rawBytes.Length}，前 50 字节={FormatHex(rawBytes, 50)}。" +
                "进程契约为 UTF-8（PYTHONUTF8=1），解码失败意味着进程输出与契约不符。" +
                "fail closed：不自动猜测编码，拒绝结果。" +
                "若需支持 GBK，必须显式传入 DecodeMode.Gbk 并说明来源。");
        }
    }

    private static DecodeResult DecodeGbkStrict(byte[] rawBytes)
    {
        try
        {
            var gbk = GetStrictGbk();
            var text = gbk.GetString(rawBytes);
            var hasFffd = text.Contains('\uFFFD');
            if (hasFffd)
            {
                throw new InvalidOperationException(
                    $"GBK 严格解码成功但结果含 U+FFFD（{CountFffd(text)} 个）。" +
                    $"字节数={rawBytes.Length}，前 50 字节={FormatHex(rawBytes, 50)}。" +
                    "fail closed。");
            }
            return new DecodeResult(text, "gbk", false);
        }
        catch (DecoderFallbackException)
        {
            throw new InvalidOperationException(
                $"GBK 严格解码失败：stdout 字节不是有效 GBK。" +
                $"字节数={rawBytes.Length}，前 50 字节={FormatHex(rawBytes, 50)}。" +
                "fail closed。");
        }
    }

    /// <summary>
    /// 便捷方法：解码并返回文本（默认 UTF-8 模式），失败时抛异常。
    /// </summary>
    public static string DecodeToString(byte[] rawBytes, DecodeMode mode = DecodeMode.Utf8)
    {
        return Decode(rawBytes, mode).Text;
    }

    /// <summary>
    /// 检测字节数组是否为有效 UTF-8。
    /// </summary>
    public static bool IsValidUtf8(byte[] rawBytes)
    {
        if (rawBytes == null || rawBytes.Length == 0) return true;
        try
        {
            StrictUtf8.GetString(rawBytes);
            return true;
        }
        catch
        {
            return false;
        }
    }

    // ── 辅助方法 ──

    private static int CountFffd(string text)
    {
        int count = 0;
        int idx = 0;
        while ((idx = text.IndexOf('\uFFFD', idx)) >= 0)
        {
            count++;
            idx++;
        }
        return count;
    }

    private static string FormatHex(byte[] bytes, int maxBytes)
    {
        var len = Math.Min(bytes.Length, maxBytes);
        var parts = new string[len];
        for (int i = 0; i < len; i++)
            parts[i] = bytes[i].ToString("X2");
        return string.Join(" ", parts);
    }
}
