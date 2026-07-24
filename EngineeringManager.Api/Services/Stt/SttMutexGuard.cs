namespace EngineeringManager.Api.Services.Stt;

/// <summary>
/// OS Mutex 守卫：确保同一线程获取并释放 Windows Mutex。
///
/// Windows Mutex 有线程所有权：只有调用 WaitOne() 的线程才能调用 ReleaseMutex()。
/// async/await 续体可能切换到不同的线程池线程，导致在非所有者线程上调用
/// ReleaseMutex() 抛出 ApplicationException。
///
/// 本类通过 Task.Run(LongRunning) 在专用线程上同步获取和释放 Mutex。
/// 中间的异步工作通过 GetAwaiter().GetResult() 阻塞专用线程，
/// 异步续体在线程池上执行，但 Mutex 的获取和释放始终在同一个专用线程上。
/// </summary>
public static class SttMutexGuard
{
    /// <summary>
    /// 在专用线程上获取 Mutex，执行异步工作，然后释放 Mutex。
    /// 确保获取和释放在同一线程，满足 Windows Mutex 线程所有权规则。
    ///
    /// 控制流：
    /// 1. Task.Run(LongRunning) 创建专用线程（非线程池复用线程）
    /// 2. 专用线程上：lock → WaitOne → setRunning(true) → 获取所有权
    /// 3. 专用线程上：work().GetAwaiter().GetResult() — 阻塞等待异步工作完成
    ///    异步工作的续体在线程池线程上执行，但专用线程不参与续体调度
    /// 4. 专用线程上：finally → setRunning(false) → ReleaseMutex — 同一线程释放
    /// 5. 外层 await task 将结果桥接回调用方的 async 上下文
    ///
    /// ASP.NET Core 无 SynchronizationContext，GetResult() 不会死锁。
    /// </summary>
    /// <typeparam name="T">异步工作的返回类型</typeparam>
    /// <param name="mutex">OS 级命名 Mutex（跨进程单实例约束）</param>
    /// <param name="instanceLock">进程内锁对象</param>
    /// <param name="isRunning">进程内单实例标志 getter</param>
    /// <param name="setRunning">进程内单实例标志 setter</param>
    /// <param name="work">异步工作（可能包含 await 和线程切换）</param>
    /// <returns>异步工作的返回值</returns>
    public static async Task<T> WithMutexAsync<T>(
        Mutex mutex,
        object instanceLock,
        Func<bool> isRunning,
        Action<bool> setRunning,
        Func<Task<T>> work)
    {
        return await Task.Factory.StartNew(() =>
        {
            // ═══ 阶段 1：专用线程上获取 Mutex（同步） ═══
            lock (instanceLock)
            {
                if (isRunning())
                    throw new InvalidOperationException(
                        "已有转写进程在运行，禁止并发模型加载（单实例约束）");
                try
                {
                    if (!mutex.WaitOne(0))
                        throw new InvalidOperationException(
                            "另一个 API 进程正在运行转写，OS Mutex 占用中（跨进程单实例约束）");
                }
                catch (AbandonedMutexException)
                {
                    // 前一个持有者异常终止（如被安全保险丝杀掉），Mutex 已被 abandoned
                    // 当前专用线程获得所有权，可以继续
                    Console.WriteLine("[SttMutexGuard] OS Mutex was abandoned by previous holder, recovered");
                }
                setRunning(true);
            }

            // ═══ 阶段 2：阻塞专用线程执行异步工作 ═══
            // work() 返回的 Task 的续体在线程池线程上执行
            // GetAwaiter().GetResult() 阻塞当前专用线程直到 Task 完成
            // 专用线程不参与续体调度，因此不会被 "掏空" 去执行续体
            try
            {
                return work().GetAwaiter().GetResult();
            }
            finally
            {
                // ═══ 阶段 3：同一专用线程释放 Mutex（同步） ═══
                lock (instanceLock)
                {
                    setRunning(false);
                }
                // 同一专用线程调用 ReleaseMutex — 满足 Windows Mutex 所有权规则
                mutex.ReleaseMutex();
            }
        }, CancellationToken.None, TaskCreationOptions.LongRunning, TaskScheduler.Default);
    }
}
