using Xunit;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// G2 写权限测试集合：这些测试类在构造函数/Dispose 中切换进程级
/// ENGINEERING_MANAGER_DATA_PATH（隔离快照/备份/上传写入），并行会互相污染
/// （A 类设的路径被 B 类读到）→ 该集合内测试串行执行。
/// </summary>
[CollectionDefinition("G2 Env-Isolated WritePermission Tests", DisableParallelization = true)]
public class G2EnvIsolatedCollection
{
}
