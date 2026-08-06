using Xunit;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// H-4（M4ThirdRound flaky 根治）：STT 上传/清理测试共享同一上传目录
/// （ApiConfig.ResolveDataPath()/uploads/stt/1），并行执行时 .uploading
/// 临时文件跨测试竞态（NoUploadingTempFilesLeft 与 CancelledMidStream 互相干扰）。
/// 两个 M4 上传类归入同一串行集合，杜绝并发写同一目录。
/// </summary>
[CollectionDefinition("M4 Stt Upload Serialized", DisableParallelization = true)]
public class M4SttUploadSerializedCollection
{
}
