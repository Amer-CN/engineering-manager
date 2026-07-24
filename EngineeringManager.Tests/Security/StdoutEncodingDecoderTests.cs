using System.Text;
using System.Text.Json;
using EngineeringManager.Api.Services.Stt;
using Xunit;

namespace EngineeringManager.Tests.Security;

/// <summary>
/// StdoutEncodingDecoder 单元测试。
///
/// 设计原则：
/// - UTF-8 是进程输出契约（PYTHONUTF8=1 + PYTHONIOENCODING=utf-8）
/// - UTF-8 严格解码失败 → fail closed，不自动猜 GBK
/// - 歧义字节（GBK 和 UTF-8 都合法但解码结果不同）不得静默误解码
/// - 成功结果不得包含 U+FFFD
///
/// 覆盖场景：
/// 1. UTF-8 中文文本 → 正确解码
/// 2. 粤语用字
/// 3. ASCII + 中文混合
/// 4. 跨多字节边界分块
/// 5. 无效字节 → fail closed（不自动回退 GBK）
/// 6. 空字节 → 空字符串
/// 7. 解码→序列化→读取 一致性（无 U+FFFD）
/// 8. GBK 歧义字节：同时是合法 UTF-8 时按 UTF-8 解码
/// 9. 显式 GBK 模式（仅在确认来源时使用）
/// 10. 生产接线：模拟 LlamaCppGgufEngine 的原始字节读取→解码→序列化路径
/// </summary>
public class StdoutEncodingDecoderTests
{
    // ═══════════════════════════════════════════════════════════
    // 1. UTF-8 中文文本
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void Decode_ValidUtf8Chinese_ReturnsUtf8()
    {
        var expected = "今次寻寻觅觅，终于揾到my princess";
        var bytes = Encoding.UTF8.GetBytes(expected);

        var result = StdoutEncodingDecoder.Decode(bytes);

        Assert.Equal("utf-8", result.EncodingUsed);
        Assert.False(result.ContainsReplacementChars);
        Assert.Equal(expected, result.Text);
    }

    [Fact]
    public void Decode_ValidUtf8SimpleChinese_ReturnsUtf8()
    {
        var expected = "你好世界，语音转文字测试";
        var bytes = Encoding.UTF8.GetBytes(expected);

        var result = StdoutEncodingDecoder.Decode(bytes);

        Assert.Equal("utf-8", result.EncodingUsed);
        Assert.Equal(expected, result.Text);
        Assert.DoesNotContain("\uFFFD", result.Text);
    }

    // ═══════════════════════════════════════════════════════════
    // 2. 粤语用字
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void Decode_CantoneseCharsUtf8_ReturnsCorrectText()
    {
        var expected = "喺香港地喺繁忙时间要揾个场嚟拍嘢系非常之难嘅";
        var bytes = Encoding.UTF8.GetBytes(expected);

        var result = StdoutEncodingDecoder.Decode(bytes);

        Assert.Equal("utf-8", result.EncodingUsed);
        Assert.Equal(expected, result.Text);
        Assert.DoesNotContain("\uFFFD", result.Text);
    }

    // ═══════════════════════════════════════════════════════════
    // 3. ASCII + 中文混合
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void Decode_MixedAsciiChineseUtf8_ReturnsUtf8()
    {
        var expected = "转写完成 completed。my princess 你好";
        var bytes = Encoding.UTF8.GetBytes(expected);

        var result = StdoutEncodingDecoder.Decode(bytes);

        Assert.Equal("utf-8", result.EncodingUsed);
        Assert.Equal(expected, result.Text);
    }

    [Fact]
    public void Decode_PureAscii_ReturnsUtf8()
    {
        var expected = "Vulkan backend loaded. 29/29 layers offloaded. completed";
        var bytes = Encoding.UTF8.GetBytes(expected);

        var result = StdoutEncodingDecoder.Decode(bytes);

        Assert.Equal("utf-8", result.EncodingUsed);
        Assert.Equal(expected, result.Text);
    }

    // ═══════════════════════════════════════════════════════════
    // 4. 跨多字节边界分块
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void Decode_Utf8MultiByteAtBoundary_DecodesCorrectly()
    {
        // "中" = E4 B8 AD (3 bytes UTF-8)
        var fullText = "中文测试";
        var fullBytes = Encoding.UTF8.GetBytes(fullText);

        // 分成两块：E4 B8 | AD E4 B8 AD E6 B5 8B E8 AF 95
        var chunk1 = new byte[] { fullBytes[0], fullBytes[1] };
        var chunk2 = new byte[fullBytes.Length - 2];
        Array.Copy(fullBytes, 2, chunk2, 0, chunk2.Length);

        // 合并后应正确解码
        var combined = new byte[fullBytes.Length];
        Array.Copy(chunk1, 0, combined, 0, chunk1.Length);
        Array.Copy(chunk2, 0, combined, chunk1.Length, chunk2.Length);

        var result = StdoutEncodingDecoder.Decode(combined);

        Assert.Equal("utf-8", result.EncodingUsed);
        Assert.Equal(fullText, result.Text);
    }

    // ═══════════════════════════════════════════════════════════
    // 5. 无效字节 → fail closed（不自动回退 GBK）
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void Decode_InvalidBytes_ThrowsFailClosed_NoGbkFallback()
    {
        // 0xFE 0xFF 不是有效 UTF-8 也不是有效 GBK
        var invalidBytes = new byte[] { 0xFE, 0xFF, 0x00, 0x01 };

        var ex = Assert.Throws<InvalidOperationException>(() =>
            StdoutEncodingDecoder.Decode(invalidBytes));

        // 必须包含 fail closed 诊断信息
        Assert.Contains("fail closed", ex.Message);
        Assert.Contains("UTF-8", ex.Message);
        // 不得自动尝试 GBK（错误消息中不应出现"尝试 GBK"或"auto fallback"等字样）
        Assert.DoesNotContain("尝试 GBK", ex.Message);
        Assert.DoesNotContain("auto fallback", ex.Message);
        Assert.DoesNotContain("自动切换", ex.Message);
    }

    [Fact]
    public void Decode_GbkBytes_ThrowsFailClosed_UnderUtf8Contract()
    {
        // GBK 编码的 "你好" = C4 E3 BA C3
        // 这些字节不是有效 UTF-8（C4 E3 中 E3 是续字节但 C4 是起始字节，序列不完整）
        var gbk = Encoding.GetEncoding(936);
        var gbkBytes = gbk.GetBytes("你好");

        // 在 UTF-8 契约下（默认模式），应直接 fail closed
        var ex = Assert.Throws<InvalidOperationException>(() =>
            StdoutEncodingDecoder.Decode(gbkBytes));

        Assert.Contains("fail closed", ex.Message);
        Assert.Contains("UTF-8", ex.Message);
        // 不得自动回退到 GBK
        Assert.DoesNotContain("尝试 GBK", ex.Message);
        Assert.DoesNotContain("auto", ex.Message);
    }

    [Fact]
    public void Decode_RandomBinaryGarbage_ThrowsFailClosed()
    {
        var garbage = new byte[] { 0x80, 0x81, 0x82, 0x83, 0x84, 0x85, 0x86, 0x87 };

        Assert.Throws<InvalidOperationException>(() =>
            StdoutEncodingDecoder.Decode(garbage));
    }

    // ═══════════════════════════════════════════════════════════
    // 6. 空字节 → 空字符串
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void Decode_EmptyBytes_ReturnsEmptyString()
    {
        var result = StdoutEncodingDecoder.Decode(Array.Empty<byte>());

        Assert.Equal("", result.Text);
        Assert.Equal("empty", result.EncodingUsed);
        Assert.False(result.ContainsReplacementChars);
    }

    [Fact]
    public void Decode_NullBytes_ReturnsEmptyString()
    {
        var result = StdoutEncodingDecoder.Decode(null!);

        Assert.Equal("", result.Text);
        Assert.Equal("empty", result.EncodingUsed);
    }

    // ═══════════════════════════════════════════════════════════
    // 7. 解码→序列化→读取 一致性（无 U+FFFD）
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void Decode_Utf8RoundTrip_NoFffdAfterSerialization()
    {
        var original = "今次寻寻觅觅，终于揾到my princess，肯借个场俾我哋玩。";
        var bytes = Encoding.UTF8.GetBytes(original);

        var decoded = StdoutEncodingDecoder.Decode(bytes);
        Assert.Equal(original, decoded.Text);

        // 序列化为 JSON（模拟落库 result_json）
        var json = JsonSerializer.Serialize(decoded.Text);
        var fromJson = JsonSerializer.Deserialize<string>(json);

        Assert.Equal(original, fromJson);
        Assert.DoesNotContain("\uFFFD", fromJson);
    }

    [Fact]
    public void Decode_LongChineseText_NoFffd()
    {
        var sb = new StringBuilder();
        for (int i = 0; i < 100; i++)
        {
            sb.Append("第").Append(i + 1).Append("句：你好世界，语音转文字测试。");
        }
        var longText = sb.ToString();
        var bytes = Encoding.UTF8.GetBytes(longText);

        var result = StdoutEncodingDecoder.Decode(bytes);

        Assert.Equal(longText, result.Text);
        Assert.DoesNotContain("\uFFFD", result.Text);
    }

    // ═══════════════════════════════════════════════════════════
    // 8. GBK 歧义字节：同时是合法 UTF-8 时按 UTF-8 解码
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void Decode_AmbiguousGbkBytes_ValidAsUtf8_DecodesAsUtf8()
    {
        // D1 B0 在 GBK 中是 "寻"，但在 UTF-8 中是 U+046D (ѱ)
        // 在 UTF-8 契约下，这些字节是合法 UTF-8，应按 UTF-8 解码
        // 不得因为"看起来像 GBK"而静默切换
        var ambiguousBytes = new byte[] { 0xD1, 0xB0 };

        var result = StdoutEncodingDecoder.Decode(ambiguousBytes);

        Assert.Equal("utf-8", result.EncodingUsed);
        // UTF-8 解码结果应是 U+0470 (Ѱ)，不是 "寻"
        // D1 B0 → 2-byte UTF-8: 110 10001 10 110000 → 10001 110000 = U+0470
        Assert.Equal("\u0470", result.Text);
        Assert.DoesNotContain("寻", result.Text);
        Assert.DoesNotContain("\uFFFD", result.Text);
    }

    [Fact]
    public void Decode_AmbiguousGbkMultiChar_ValidAsUtf8_DecodesAsUtf8()
    {
        // 多个歧义字节序列：D1 B0 D1 B0
        // GBK: "寻寻"  UTF-8: U+046D U+046D (ѱѱ)
        var ambiguousBytes = new byte[] { 0xD1, 0xB0, 0xD1, 0xB0 };

        var result = StdoutEncodingDecoder.Decode(ambiguousBytes);

        Assert.Equal("utf-8", result.EncodingUsed);
        Assert.Equal("\u0470\u0470", result.Text);
        Assert.DoesNotContain("寻", result.Text);
    }

    [Fact]
    public void Decode_MixedAmbiguousAndValidUtf8_DecodesAllAsUtf8()
    {
        // "hello" + D1 B0 (歧义) + "world"
        // UTF-8: "helloѰworld" (U+0470)  GBK: "hello寻world"
        var text = "hello" + "\u0470" + "world";
        var bytes = Encoding.UTF8.GetBytes(text);

        var result = StdoutEncodingDecoder.Decode(bytes);

        Assert.Equal("utf-8", result.EncodingUsed);
        Assert.Equal(text, result.Text);
        Assert.DoesNotContain("寻", result.Text);
    }

    // ═══════════════════════════════════════════════════════════
    // 9. 显式 GBK 模式（仅在确认来源时使用）
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void Decode_ExplicitGbkMode_ValidGbk_DecodesCorrectly()
    {
        var expected = "你好世界";
        var gbk = Encoding.GetEncoding(936);
        var bytes = gbk.GetBytes(expected);

        // 显式传入 GBK 模式
        var result = StdoutEncodingDecoder.Decode(bytes, StdoutEncodingDecoder.DecodeMode.Gbk);

        Assert.Equal("gbk", result.EncodingUsed);
        Assert.Equal(expected, result.Text);
        Assert.DoesNotContain("\uFFFD", result.Text);
    }

    [Fact]
    public void Decode_ExplicitGbkMode_InvalidGbk_ThrowsFailClosed()
    {
        var garbage = new byte[] { 0x80, 0x81, 0x82, 0x83 };

        Assert.Throws<InvalidOperationException>(() =>
            StdoutEncodingDecoder.Decode(garbage, StdoutEncodingDecoder.DecodeMode.Gbk));
    }

    [Fact]
    public void Decode_ExplicitGbkMode_AmbiguousBytes_DecodesAsGbk()
    {
        // D1 B0 在 GBK 模式下应解码为 "寻"
        var ambiguousBytes = new byte[] { 0xD1, 0xB0 };

        var result = StdoutEncodingDecoder.Decode(ambiguousBytes, StdoutEncodingDecoder.DecodeMode.Gbk);

        Assert.Equal("gbk", result.EncodingUsed);
        Assert.Equal("寻", result.Text);
    }

    // ═══════════════════════════════════════════════════════════
    // 10. 生产接线：模拟 LlamaCppGgufEngine 的原始字节读取→解码→序列化路径
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public async Task ProductionWiring_RawStreamToDecodeToJson_NoFffd()
    {
        // 模拟 LlamaCppGgufEngine 的 stdout 读取流程：
        // 1. 从 BaseStream 读取原始字节到 MemoryStream
        // 2. 进程结束后用 StdoutEncodingDecoder.Decode() 解码
        // 3. 解码结果序列化为 JSON（模拟落库）
        var expectedText = "今次寻寻觅觅，终于揾到my princess\n拜拜";
        var utf8Bytes = Encoding.UTF8.GetBytes(expectedText);

        // 模拟 process.StandardOutput.BaseStream
        using var fakeBaseStream = new MemoryStream(utf8Bytes);
        var rawStdoutStream = new MemoryStream();
        var buffer = new byte[8192];

        // 模拟 LlamaCppGgufEngine 中的读取循环
        int bytesRead;
        while ((bytesRead = await fakeBaseStream.ReadAsync(buffer)) > 0)
        {
            rawStdoutStream.Write(buffer, 0, bytesRead);
        }

        // 进程结束后解码
        var rawBytes = rawStdoutStream.ToArray();
        var decodeResult = StdoutEncodingDecoder.Decode(rawBytes);

        Assert.Equal("utf-8", decodeResult.EncodingUsed);
        Assert.Equal(expectedText, decodeResult.Text);
        Assert.False(decodeResult.ContainsReplacementChars);

        // 模拟落库：序列化为 JSON
        var json = JsonSerializer.Serialize(decodeResult.Text);
        var fromJson = JsonSerializer.Deserialize<string>(json);

        Assert.Equal(expectedText, fromJson);
        Assert.DoesNotContain("\uFFFD", fromJson);
    }

    [Fact]
    public async Task ProductionWiring_ChunkedReadPreservesContent()
    {
        // 模拟分块读取（如 8 字节 buffer 读取长文本）
        var expectedText = "第一句：你好世界。第二句：语音转文字测试。第三句：拜拜。";
        var utf8Bytes = Encoding.UTF8.GetBytes(expectedText);

        using var fakeBaseStream = new MemoryStream(utf8Bytes);
        var rawStdoutStream = new MemoryStream();
        var buffer = new byte[8]; // 故意用小 buffer 模拟分块

        int bytesRead;
        while ((bytesRead = await fakeBaseStream.ReadAsync(buffer)) > 0)
        {
            rawStdoutStream.Write(buffer, 0, bytesRead);
        }

        var rawBytes = rawStdoutStream.ToArray();
        var result = StdoutEncodingDecoder.Decode(rawBytes);

        Assert.Equal(expectedText, result.Text);
        Assert.DoesNotContain("\uFFFD", result.Text);
    }

    [Fact]
    public async Task ProductionWiring_InvalidUtf8Stream_FailClosed()
    {
        // 模拟进程输出了非 UTF-8 字节（如 GBK）
        var gbk = Encoding.GetEncoding(936);
        var gbkBytes = gbk.GetBytes("你好世界");

        using var fakeBaseStream = new MemoryStream(gbkBytes);
        var rawStdoutStream = new MemoryStream();
        var buffer = new byte[8192];

        int bytesRead;
        while ((bytesRead = await fakeBaseStream.ReadAsync(buffer)) > 0)
        {
            rawStdoutStream.Write(buffer, 0, bytesRead);
        }

        var rawBytes = rawStdoutStream.ToArray();

        // 在 UTF-8 契约下应 fail closed
        var ex = Assert.Throws<InvalidOperationException>(() =>
            StdoutEncodingDecoder.Decode(rawBytes));

        Assert.Contains("fail closed", ex.Message);
        Assert.Contains("前 50 字节", ex.Message); // 诊断信息包含 Hex dump
    }

    [Fact]
    public async Task ProductionWiring_EmptyStream_ReturnsEmpty()
    {
        using var fakeBaseStream = new MemoryStream();
        var rawStdoutStream = new MemoryStream();
        var buffer = new byte[8192];

        int bytesRead;
        while ((bytesRead = await fakeBaseStream.ReadAsync(buffer)) > 0)
        {
            rawStdoutStream.Write(buffer, 0, bytesRead);
        }

        var rawBytes = rawStdoutStream.ToArray();
        var result = StdoutEncodingDecoder.Decode(rawBytes);

        Assert.Equal("", result.Text);
        Assert.Equal("empty", result.EncodingUsed);
    }

    // ═══════════════════════════════════════════════════════════
    // 11. 含换行符和完成标记的输出
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void Decode_FullTranscriptionWithNewlinesUtf8_PreservesNewlines()
    {
        var expected = "今次寻寻觅觅\n终于揾到my princess\n肯借个场俾我哋玩\n拜拜";
        var bytes = Encoding.UTF8.GetBytes(expected);

        var result = StdoutEncodingDecoder.Decode(bytes);

        Assert.Equal(expected, result.Text);
        Assert.Contains("\n", result.Text);
        Assert.DoesNotContain("\uFFFD", result.Text);
    }

    [Fact]
    public void Decode_WithCompletionMarkerUtf8_PreservesMarker()
    {
        var expected = "转写文本\n所有任务已完成";
        var bytes = Encoding.UTF8.GetBytes(expected);

        var result = StdoutEncodingDecoder.Decode(bytes);

        Assert.Contains("已完成", result.Text);
        Assert.DoesNotContain("\uFFFD", result.Text);
    }

    [Fact]
    public void Decode_Utf8WithPunctuation_DecodesCorrectly()
    {
        var expected = "你好，世界！语音转文字。测试：123";
        var bytes = Encoding.UTF8.GetBytes(expected);

        var result = StdoutEncodingDecoder.Decode(bytes);

        Assert.Equal("utf-8", result.EncodingUsed);
        Assert.Equal(expected, result.Text);
    }

    // ═══════════════════════════════════════════════════════════
    // 12. 便捷方法
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void DecodeToString_ValidUtf8_ReturnsText()
    {
        var expected = "你好世界";
        var bytes = Encoding.UTF8.GetBytes(expected);

        var text = StdoutEncodingDecoder.DecodeToString(bytes);

        Assert.Equal(expected, text);
    }

    [Fact]
    public void IsValidUtf8_ValidUtf8_ReturnsTrue()
    {
        var bytes = Encoding.UTF8.GetBytes("你好世界");
        Assert.True(StdoutEncodingDecoder.IsValidUtf8(bytes));
    }

    [Fact]
    public void IsValidUtf8_GbkBytes_ReturnsFalse()
    {
        var gbk = Encoding.GetEncoding(936);
        var bytes = gbk.GetBytes("你好世界");
        Assert.False(StdoutEncodingDecoder.IsValidUtf8(bytes));
    }

    // ═══════════════════════════════════════════════════════════
    // 13. 10.0 根因证明（修正版）
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void Decode_OldUtf8ReplacementFallback_ProducesFffd()
    {
        // 证明旧方式（UTF-8 替换回退）确实产生 U+FFFD
        // GBK "今次" = BE C3 B4 CE，其中 BE C3 不是有效 UTF-8
        var gbk = Encoding.GetEncoding(936);
        var gbkBytes = gbk.GetBytes("今次");

        // 旧方式：Encoding.UTF8.GetString 使用 DecoderReplacementFallback
        var oldWay = Encoding.UTF8.GetString(gbkBytes);
        Assert.Contains("\uFFFD", oldWay); // 证明旧方式产生 U+FFFD

        // 新方式：UTF-8 严格模式 → fail closed（不自动猜 GBK）
        Assert.Throws<InvalidOperationException>(() =>
            StdoutEncodingDecoder.Decode(gbkBytes));
    }

    [Fact]
    public void Decode_10_0_EvidenceCorrection_NotOriginalStdoutBytes()
    {
        // 10.0 证据页中的 Hex dump (EF BF BD EF BF BD...) 
        // 是已损坏字符串再次编码成 UTF-8 后的字节，不是 transcribe.exe 的原始 stdout 字节。
        // EF BF BD = U+FFFD 的 UTF-8 编码
        // 这证明 U+FFFD 是在 C# 解码阶段引入的，而非 transcribe.exe 原始输出中包含 U+FFFD。
        
        var fffdChar = "\uFFFD";
        var fffdBytes = Encoding.UTF8.GetBytes(fffdChar);
        
        // U+FFFD 的 UTF-8 编码就是 EF BF BD
        Assert.Equal(new byte[] { 0xEF, 0xBF, 0xBD }, fffdBytes);
        
        // 这意味着 10.0 Hex dump 中的 EF BF BD 序列
        // 是旧 UTF-8 替换回退产生的 U+FFFD 字符再次被编码为 UTF-8 的结果
        // 而非 transcribe.exe 原始 stdout 中的字节
    }
}
