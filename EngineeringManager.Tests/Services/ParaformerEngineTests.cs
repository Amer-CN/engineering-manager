using EngineeringManager.Api.Services.Stt;
using Xunit;

namespace EngineeringManager.Tests.Services;

/// <summary>
/// ParaformerEngine 纯逻辑单元测试：不加载真实模型（227MB），只覆盖
/// 引擎契约 + WAV 读取 + 空批量短路。真机全链路走临时驱动直测（跑完即删）。
/// </summary>
public class ParaformerEngineTests
{
    [Fact]
    public void EngineId_IsStableContract()
    {
        // engine 列白名单与前端下拉框依赖此常量字符串，改了会破坏存量任务/白名单
        Assert.Equal("paraformer-zh-int8", ParaformerEngine.EngineId);
        Assert.Equal(ParaformerEngine.EngineId, new ParaformerEngine().Name);
    }

    [Fact]
    public void NumThreads_InValidRange()
    {
        Assert.InRange(ParaformerEngine.NumThreads, 1, 8);
    }

    [Fact]
    public async Task TranscribeBatchAsync_Empty_ReturnsEmptyWithoutModel()
    {
        // 空批量短路：不碰模型文件，无模型环境也可跑
        var engine = new ParaformerEngine();
        var result = await engine.TranscribeBatchAsync(new List<string>(), "热词应被忽略", default);
        Assert.Empty(result);
    }

    [Fact]
    public async Task IsAvailableAsync_MatchesFilesOnDisk()
    {
        // 独立复算期望值：目录 + 两文件存在性（实现本身就是该语义，此测试锁住语义不漂移）
        var engine = new ParaformerEngine();
        var dir = ParaformerEngine.GetEngineDir();
        var expected = dir != null
            && File.Exists(Path.Combine(dir, "model.int8.onnx"))
            && File.Exists(Path.Combine(dir, "tokens.txt"));
        Assert.Equal(expected, await engine.IsAvailableAsync());
    }

    [Fact]
    public void GetEngineDir_MissingOrPresent_DoesNotThrow()
    {
        var dir = ParaformerEngine.GetEngineDir();
        if (dir != null)
            Assert.True(Directory.Exists(dir));
    }

    [Fact]
    public void ReadWavAsFloats_SyntheticMono_Roundtrips()
    {
        var tmp = Path.Combine(Path.GetTempPath(), $"para_test_{Guid.NewGuid():N}.wav");
        try
        {
            var samples = new short[] { 0, 16384, -16384, 32767, -32768 };
            WriteMono16kWav(tmp, 16000, samples);

            var floats = ParaformerEngine.ReadWavAsFloats(tmp);

            Assert.Equal(samples.Length, floats.Length);
            Assert.Equal(0f, floats[0], 5);
            Assert.Equal(0.5f, floats[1], 5);
            Assert.Equal(-0.5f, floats[2], 5);
            Assert.Equal(32767f / 32768f, floats[3], 5);
            Assert.Equal(-1f, floats[4], 5);
        }
        finally
        {
            try { if (File.Exists(tmp)) File.Delete(tmp); } catch { }
            ParaformerEngine.ClearCacheForTest();
        }
    }

    [Fact]
    public void ReadWavAsFloats_WrongSampleRate_Throws()
    {
        var tmp = Path.Combine(Path.GetTempPath(), $"para_test_{Guid.NewGuid():N}.wav");
        try
        {
            WriteMono16kWav(tmp, 8000, new short[] { 0, 100 });
            Assert.Throws<InvalidOperationException>(() => ParaformerEngine.ReadWavAsFloats(tmp));
        }
        finally
        {
            try { if (File.Exists(tmp)) File.Delete(tmp); } catch { }
            ParaformerEngine.ClearCacheForTest();
        }
    }

    [Fact]
    public void ReadWavAsFloats_NonWav_Throws()
    {
        var tmp = Path.Combine(Path.GetTempPath(), $"para_test_{Guid.NewGuid():N}.txt");
        try
        {
            File.WriteAllText(tmp, "not a wav");
            Assert.Throws<InvalidOperationException>(() => ParaformerEngine.ReadWavAsFloats(tmp));
        }
        finally
        {
            try { if (File.Exists(tmp)) File.Delete(tmp); } catch { }
            ParaformerEngine.ClearCacheForTest();
        }
    }

    private static void WriteMono16kWav(string path, int sampleRate, short[] samples)
    {
        using var fs = new FileStream(path, FileMode.Create, FileAccess.Write, FileShare.None);
        using var bw = new BinaryWriter(fs);
        var dataLen = samples.Length * 2;
        bw.Write(0x46464952); // "RIFF"
        bw.Write(36 + dataLen);
        bw.Write(0x45564157); // "WAVE"
        bw.Write(0x20746D66); // "fmt "
        bw.Write(16);
        bw.Write((short)1); // PCM
        bw.Write((short)1); // mono
        bw.Write(sampleRate);
        bw.Write(sampleRate * 2); // byte rate
        bw.Write((short)2); // block align
        bw.Write((short)16);
        bw.Write(0x61746164); // "data"
        bw.Write(dataLen);
        foreach (var s in samples)
            bw.Write(s);
    }
}
