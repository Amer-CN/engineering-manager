using EngineeringManager.Api.Services.Stt;
using Xunit;

namespace EngineeringManager.Tests.Security;

/// <summary>
/// SttMutexGuard 专项测试：验证 Windows Mutex 线程所有权在 async/await 场景下的正确性。
/// 不运行模型或 GPU — 仅测试 Mutex 获取/释放控制流。
/// </summary>
public class SttMutexGuardTests
{
    private static int _nameCounter;
    private static string UniqueMutexName(string tag) =>
        $"Global\\SttMutexGuardTest_{tag}_{Interlocked.Increment(ref _nameCounter)}";

    // ═══════════════════════════════════════════════════════════
    // 1. async 续体线程切换后 Mutex 正确释放
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public async Task WithMutexAsync_AsyncWorkWithThreadSwitch_ReleasesCorrectly()
    {
        var name = UniqueMutexName("ThreadSwitch");
        var mutex = new Mutex(false, name);
        var isRunning = false;
        var lockObj = new object();

        var result = await SttMutexGuard.WithMutexAsync(
            mutex, lockObj, () => isRunning, v => isRunning = v,
            async () =>
            {
                // 强制线程切换：await Task.Yield() 让续体在不同线程池线程上执行
                await Task.Yield();
                await Task.Delay(20); // 再一次确保线程切换
                return 42;
            });

        Assert.Equal(42, result);

        // Mutex 必须已释放 — WaitOne(0) 应成功获取
        Assert.True(mutex.WaitOne(0), "Mutex 应已释放，WaitOne(0) 应成功");
        mutex.ReleaseMutex();

        // isRunning 必须已重置
        Assert.False(isRunning);
    }

    [Fact]
    public async Task WithMutexAsync_MultipleAwaits_ReleasesCorrectly()
    {
        var name = UniqueMutexName("MultiAwait");
        var mutex = new Mutex(false, name);
        var isRunning = false;
        var lockObj = new object();

        await SttMutexGuard.WithMutexAsync(
            mutex, lockObj, () => isRunning, v => isRunning = v,
            async () =>
            {
                await Task.Delay(5);
                await Task.Delay(5);
                await Task.Delay(5);
                await Task.Delay(5);
                return "done";
            });

        // Mutex 必须已释放
        Assert.True(mutex.WaitOne(0), "多次 await 后 Mutex 应已释放");
        mutex.ReleaseMutex();
        Assert.False(isRunning);
    }

    [Fact]
    public async Task WithMutexAsync_WorkThrows_MutexStillReleased()
    {
        var name = UniqueMutexName("WorkThrows");
        var mutex = new Mutex(false, name);
        var isRunning = false;
        var lockObj = new object();

        await Assert.ThrowsAsync<InvalidOperationException>(async () =>
        {
            await SttMutexGuard.WithMutexAsync(
                mutex, lockObj, () => isRunning, v => isRunning = v,
                async () =>
                {
                    await Task.Yield();
                    throw new InvalidOperationException("工作异常");
                    return 0; // unreachable
                });
        });

        // 即使工作抛异常，Mutex 也必须已释放（finally 块）
        Assert.True(mutex.WaitOne(0), "异常后 Mutex 应已释放");
        mutex.ReleaseMutex();
        Assert.False(isRunning);
    }

    // ═══════════════════════════════════════════════════════════
    // 2. 下一任务能重新取得跨进程锁
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public async Task WithMutexAsync_SecondTaskCanAcquire_AfterFirstReleases()
    {
        var name = UniqueMutexName("Sequential");
        var mutex1 = new Mutex(false, name);
        var mutex2 = new Mutex(false, name);
        var isRunning = false;
        var lockObj = new object();

        // 第一个任务
        var result1 = await SttMutexGuard.WithMutexAsync(
            mutex1, lockObj, () => isRunning, v => isRunning = v,
            async () => { await Task.Delay(10); return 1; });

        Assert.Equal(1, result1);
        Assert.False(isRunning);

        // 第二个任务应能获取同一命名 Mutex
        var result2 = await SttMutexGuard.WithMutexAsync(
            mutex2, lockObj, () => isRunning, v => isRunning = v,
            async () => { await Task.Delay(10); return 2; });

        Assert.Equal(2, result2);
        Assert.False(isRunning);
    }

    [Fact]
    public async Task WithMutexAsync_ThreeSequentialTasks_AllSucceed()
    {
        var name = UniqueMutexName("ThreeSeq");
        var lockObj = new object();
        var isRunning = false;

        for (int i = 0; i < 3; i++)
        {
            var mutex = new Mutex(false, name);
            var result = await SttMutexGuard.WithMutexAsync(
                mutex, lockObj, () => isRunning, v => isRunning = v,
                async () => { await Task.Yield(); return i; });

            Assert.Equal(i, result);
            Assert.False(isRunning);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // 3. AbandonedMutexException 恢复
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public async Task WithMutexAsync_AbandonedMutex_RecoveredAndReleased()
    {
        var name = UniqueMutexName("Abandoned");

        // 在独立线程上获取 Mutex 并让线程退出（模拟进程崩溃 → abandoned）
        var tcs = new TaskCompletionSource();
        var thread = new Thread(() =>
        {
            try
            {
                var m = new Mutex(false, name);
                m.WaitOne();
                // 线程退出，不释放 Mutex → abandoned
                tcs.SetResult();
            }
            catch (Exception ex)
            {
                tcs.SetException(ex);
            }
        });
        thread.Start();
        await tcs.Task;
        thread.Join();

        // 现在尝试获取 — 应收到 AbandonedMutexException 并恢复
        var mutex = new Mutex(false, name);
        var isRunning = false;
        var lockObj = new object();

        var result = await SttMutexGuard.WithMutexAsync(
            mutex, lockObj, () => isRunning, v => isRunning = v,
            async () => { await Task.Yield(); return 42; });

        Assert.Equal(42, result);

        // 恢复后 Mutex 必须已正确释放（同一专用线程获取+释放）
        Assert.True(mutex.WaitOne(0), "Abandoned 恢复后 Mutex 应已释放");
        mutex.ReleaseMutex();
        Assert.False(isRunning);
    }

    [Fact]
    public async Task WithMutexAsync_AbandonedMutex_NextTaskAlsoSucceeds()
    {
        var name = UniqueMutexName("AbandonedNext");

        // Abandon the mutex
        var tcs = new TaskCompletionSource();
        var thread = new Thread(() =>
        {
            var m = new Mutex(false, name);
            m.WaitOne();
            tcs.SetResult();
        });
        thread.Start();
        await tcs.Task;
        thread.Join();

        // 第一次获取（恢复 abandoned）
        var mutex1 = new Mutex(false, name);
        var isRunning = false;
        var lockObj = new object();
        var r1 = await SttMutexGuard.WithMutexAsync(
            mutex1, lockObj, () => isRunning, v => isRunning = v,
            async () => { await Task.Delay(5); return 1; });
        Assert.Equal(1, r1);

        // 第二次获取（正常）
        var mutex2 = new Mutex(false, name);
        var r2 = await SttMutexGuard.WithMutexAsync(
            mutex2, lockObj, () => isRunning, v => isRunning = v,
            async () => { await Task.Delay(5); return 2; });
        Assert.Equal(2, r2);
    }

    // ═══════════════════════════════════════════════════════════
    // 4. isRunning 状态正确管理
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public async Task WithMutexAsync_IsRunningTrueDuringWork_FalseAfter()
    {
        var name = UniqueMutexName("IsRunning");
        var mutex = new Mutex(false, name);
        var isRunning = false;
        var lockObj = new object();
        var runningDuringWork = false;

        await SttMutexGuard.WithMutexAsync(
            mutex, lockObj, () => isRunning, v => isRunning = v,
            async () =>
            {
                await Task.Yield();
                lock (lockObj)
                    runningDuringWork = isRunning;
                return 0;
            });

        Assert.True(runningDuringWork, "工作期间 isRunning 应为 true");
        Assert.False(isRunning, "工作完成后 isRunning 应为 false");
    }

    [Fact]
    public async Task WithMutexAsync_IsRunningFalseAfterException()
    {
        var name = UniqueMutexName("IsRunningExc");
        var mutex = new Mutex(false, name);
        var isRunning = false;
        var lockObj = new object();

        await Assert.ThrowsAsync<InvalidOperationException>(async () =>
        {
            await SttMutexGuard.WithMutexAsync(
                mutex, lockObj, () => isRunning, v => isRunning = v,
                async () =>
                {
                    await Task.Yield();
                    throw new InvalidOperationException("test");
                    return 0;
                });
        });

        Assert.False(isRunning, "异常后 isRunning 应为 false");
    }

    // ═══════════════════════════════════════════════════════════
    // 5. 并发拒绝：第二个调用在第一个运行时被拒绝
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public async Task WithMutexAsync_SecondCallWhileRunning_Rejected()
    {
        var name = UniqueMutexName("ConcurrentReject");
        var mutex = new Mutex(false, name);
        var isRunning = false;
        var lockObj = new object();
        var workStarted = new TaskCompletionSource<bool>();
        var allowWorkFinish = new TaskCompletionSource<bool>();

        // 启动第一个任务（长时间运行）
        var task1 = Task.Run(async () =>
        {
            return await SttMutexGuard.WithMutexAsync(
                mutex, lockObj, () => isRunning, v => isRunning = v,
                async () =>
                {
                    workStarted.TrySetResult(true);
                    await allowWorkFinish.Task; // 等待信号
                    return 1;
                });
        });

        await workStarted.Task; // 确保第一个任务已开始

        // 第二个任务应被拒绝（isRunning=true）
        await Assert.ThrowsAsync<InvalidOperationException>(async () =>
        {
            await SttMutexGuard.WithMutexAsync(
                mutex, lockObj, () => isRunning, v => isRunning = v,
                async () => { await Task.Yield(); return 2; });
        });

        // 允许第一个任务完成
        allowWorkFinish.TrySetResult(true);
        var r1 = await task1;
        Assert.Equal(1, r1);
        Assert.False(isRunning);
    }
}
