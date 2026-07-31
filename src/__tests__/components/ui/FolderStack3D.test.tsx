/**
 * FolderStack3D 组件测试（Stage-Surface 舞台区）
 * - 正常分支：listbox/option 语义、KPI 浮层、40 张上限截断
 * - 交互：点击聚焦卡 / Enter 打开分组；点击非聚焦卡不误触 onOpen
 * - reduced-motion：降级为横向扁平轨道（无 3D 舞台）
 * - 卡面（Phase 1 竖版母版）：四层分层、三纸、远端隐藏态类、聚焦态复用
 * - FPS 看门狗（Phase 1.5 Fix）：rAF 停止后重启重置采样窗口（空闲恢复不误报 / 真低帧仍降级）
 */
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react'
import { FolderStack3D, STACK_GROUP_LIMIT, type StackGroup } from '@/components/ui/FolderStack3D'

const makeGroups = (n: number): StackGroup[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `g${i}`,
    name: `分组${i}`,
    meta: `${i + 1} 张`,
    primaryValue: i + 1,
    primaryUnit: '张',
    primaryLabel: '图纸数量',
    detail: [{ label: '图纸数', value: i + 1 }],
  }))

// ── rAF 时钟 harness：确定性驱动 useWheelStack 的 frame/measure（FPS 看门狗测试）──
// jsdom 无真实合成器帧；用受控时钟 + 手动 rAF 队列逐帧推进，精确控制帧间隔以模拟 60/30fps。
let fpsClock = 0
let rafQueue: Array<(t: number) => void> = []

function installFpsClock() {
  fpsClock = 0
  rafQueue = []
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    rafQueue.push(cb)
    return rafQueue.length
  })
  vi.stubGlobal('cancelAnimationFrame', (_id: number) => { /* noop：测试内不依赖取消 */ })
  vi.spyOn(performance, 'now').mockImplementation(() => fpsClock)
}

// 推进一帧：时钟 += dt，冲刷当前排队的 rAF 回调（回调内会再排队下一帧）
function stepFpsFrame(dt: number) {
  fpsClock += dt
  const q = rafQueue
  rafQueue = []
  q.forEach((cb) => cb(fpsClock))
}

// 以固定帧间隔运行 n 帧（包在 act 内刷新 React 更新）
function runFpsFrames(n: number, interval: number) {
  act(() => {
    for (let i = 0; i < n; i++) stepFpsFrame(interval)
  })
}

// 步进直到弹簧收敛、rAF 停止（rafQueue 清空）
function settleFps(interval = 16.7, maxFrames = 1200) {
  act(() => {
    for (let i = 0; i < maxFrames && rafQueue.length > 0; i++) stepFpsFrame(interval)
  })
}

describe('FolderStack3D', () => {
  afterEach(() => {
    cleanup()
    // 清掉 reduced-motion mock，避免串测
    delete (window as any).matchMedia
    // 清掉 FPS 时钟的 rAF/performance mock，避免串测
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('渲染 listbox 语义与全部分组卡，KPI 浮层显示聚焦分组', () => {
    render(<FolderStack3D groups={makeGroups(5)} ariaLabel="测试堆叠" />)
    const stage = screen.getByRole('listbox', { name: '测试堆叠' })
    expect(stage).toBeInTheDocument()
    expect(screen.getAllByRole('option')).toHaveLength(5)
    expect(stage.getAttribute('aria-activedescendant')).toBe('fs3d-card-0')
    // 卡面标题 + KPI 胶囊都含分组名，至少 2 处
    expect(screen.getAllByText('分组0').length).toBeGreaterThanOrEqual(2)
  })

  it(`超过 ${STACK_GROUP_LIMIT} 张防御性截断（消费方另有强制回退）`, () => {
    render(<FolderStack3D groups={makeGroups(45)} ariaLabel="截断" />)
    expect(screen.getAllByRole('option')).toHaveLength(STACK_GROUP_LIMIT)
  })

  it('空分组不渲染', () => {
    const { container } = render(<FolderStack3D groups={[]} ariaLabel="空" />)
    expect(container.firstChild).toBeNull()
  })

  it('点击聚焦卡触发 onOpen；点击非聚焦卡只导航不触发', () => {
    const onOpen = vi.fn()
    render(<FolderStack3D groups={makeGroups(4)} onOpen={onOpen} ariaLabel="点击" />)
    const options = screen.getAllByRole('option')
    fireEvent.click(options[2]) // 非聚焦：goTo，不 open
    expect(onOpen).not.toHaveBeenCalled()
    fireEvent.click(options[0]) // 聚焦卡（初始聚焦 0）
    expect(onOpen).toHaveBeenCalledTimes(1)
    expect(onOpen.mock.calls[0][0].id).toBe('g0')
  })

  it('Enter 打开当前聚焦分组', () => {
    const onOpen = vi.fn()
    render(<FolderStack3D groups={makeGroups(3)} onOpen={onOpen} ariaLabel="键盘" />)
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Enter' })
    expect(onOpen).toHaveBeenCalledTimes(1)
    expect(onOpen.mock.calls[0][0].id).toBe('g0')
  })

  it('Esc 退出舞台：调 onExit（交互契约）', () => {
    const onExit = vi.fn()
    render(<FolderStack3D groups={makeGroups(3)} onExit={onExit} ariaLabel="退出" />)
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' })
    expect(onExit).toHaveBeenCalledTimes(1)
  })

  it('Esc 未接 onExit 时回落 blur，不抛错', () => {
    render(<FolderStack3D groups={makeGroups(3)} ariaLabel="回落" />)
    const stage = screen.getByRole('listbox') as HTMLElement
    stage.focus()
    expect(() => fireEvent.keyDown(stage, { key: 'Escape' })).not.toThrow()
    expect(document.activeElement).not.toBe(stage)
  })

  it('prefers-reduced-motion 降级为扁平轨道（无 3D 舞台，选中后再点打开）', () => {
    ;(window as any).matchMedia = vi.fn().mockReturnValue({ matches: true })
    const onOpen = vi.fn()
    render(<FolderStack3D groups={makeGroups(3)} onOpen={onOpen} ariaLabel="降级" />)
    // 扁平轨道是 button option，没有 aria-activedescendant 舞台
    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(3)
    expect(screen.getByRole('listbox').getAttribute('aria-activedescendant')).toBeNull()
    fireEvent.click(options[1]) // 先选中
    expect(onOpen).not.toHaveBeenCalled()
    fireEvent.click(options[1]) // 再点打开
    expect(onOpen).toHaveBeenCalledTimes(1)
    expect(onOpen.mock.calls[0][0].id).toBe('g1')
  })

  // ── 滚轮边界释放与限幅（防无声回归：调换判定顺序/挪 preventDefault 会静默劫持页面滚动）──
  // targetRef 在 wheel handler 内同步更新，无需等 rAF/弹簧；用 defaultPrevented 作可观察口径。
  const wheel = (el: Element, deltaY: number) => {
    const e = new WheelEvent('wheel', { deltaY, deltaMode: 0, cancelable: true, bubbles: true })
    el.dispatchEvent(e)
    return e.defaultPrevented
  }

  it('首尾释放滚动权：边界向外 defaultPrevented=false，中间位置拦截=true', () => {
    render(<FolderStack3D groups={makeGroups(10)} ariaLabel="边界" />)
    const stage = screen.getByRole('listbox') as HTMLElement
    stage.focus() // 激活捕获（document.activeElement === stage）
    // 在起点向上滚：不拦截，把滚动权还给页面（严禁 scroll trapping）
    expect(wheel(stage, -100)).toBe(false)
    // 在起点向下滚：拦截并推进 target
    expect(wheel(stage, 120)).toBe(true)
    // 离开起点后向上滚：中间位置必须拦截（判定顺序回归哨兵）
    expect(wheel(stage, -60)).toBe(true)
  })

  it('单事件限幅 ±360（=3 卡）：惯性尾巴 ±999 不能飞越', () => {
    render(<FolderStack3D groups={makeGroups(10)} ariaLabel="限幅" />)
    const stage = screen.getByRole('listbox') as HTMLElement
    stage.focus()
    // +999 若不限幅 target=8.3；限幅后 = 360/120 = 3
    expect(wheel(stage, 999)).toBe(true)
    // -400 限幅为 -360 → target 回到 0（若未限幅则停在 ~5.3）
    expect(wheel(stage, -400)).toBe(true)
    // 此刻在起点：再向上滚应释放（false）——只有限幅生效才能回到 0
    expect(wheel(stage, -100)).toBe(false)
  })

  // ── 卡面（Phase 1 竖版文件夹母版 reference-a）：结构与态类契约 ──
  // 姿态态类由 useWheelStack 的 renderFrame 在 useLayoutEffect 同步直写，
  // jsdom 下挂载即可断言（无需等 rAF）。

  it('卡面四层分层：后壳 / 三纸（DOM 数量=3） / 连续 SVG 前壳 / 内容层', () => {
    render(<FolderStack3D groups={makeGroups(4)} ariaLabel="分层" />)
    const card = screen.getAllByRole('option')[0]
    expect(card.querySelector('.fs3d-backshell')).not.toBeNull()
    // 三张等大纸，前纸带装饰性文档线
    expect(card.querySelectorAll('.fs3d-paper')).toHaveLength(3)
    expect(card.querySelectorAll('.fs3d-paper-front span')).toHaveLength(7)
    // 前壳是内联 SVG 单条连续 path（非「矩形+独立凸耳」拼接）
    const paths = card.querySelectorAll('svg.fs3d-frontshell path')
    expect(paths).toHaveLength(1)
    expect(paths[0].getAttribute('d')).toMatch(/^M /)
    expect(card.querySelector('.fs3d-face')).not.toBeNull()
  })

  it('聚焦态复用现有接线：rAF 直写 fs3d-focus 态类 + aria-selected，不另造状态源', () => {
    render(<FolderStack3D groups={makeGroups(4)} ariaLabel="聚焦态" />)
    const options = screen.getAllByRole('option')
    expect(options[0].className).toContain('fs3d-focus')
    expect(options[0].getAttribute('aria-selected')).toBe('true')
    expect(options[1].className).not.toContain('fs3d-focus')
    expect(options[1].getAttribute('aria-selected')).toBe('false')
  })

  it('远端卡挂 fs3d-quiet 态类（CSS 据此隐藏全部文字与图标，≡ 母版 .far）', () => {
    render(<FolderStack3D groups={makeGroups(8)} ariaLabel="远端" />)
    const options = screen.getAllByRole('option')
    // d > 1.2 即远端：索引 2 起应携带 quiet 态类；内容层仍在 DOM（由 CSS opacity 隐藏）
    expect(options[2].className).toContain('fs3d-quiet')
    expect(options[3].className).toContain('fs3d-quiet')
    expect(options[3].querySelector('.fs3d-face')).not.toBeNull()
    // 聚焦卡不得误挂 quiet
    expect(options[0].className).not.toContain('fs3d-quiet')
  })

  it('徽记：projects badge 渲染 Building2 图标+数字（内联 SVG 非 emoji），缺省整行隐藏', () => {
    const groups = makeGroups(2).map((g, i) => (i === 0 ? { ...g, badge: { kind: 'projects' as const, value: 3 } } : g))
    render(<FolderStack3D groups={groups} ariaLabel="徽记" />)
    const options = screen.getAllByRole('option')
    const badge = options[0].querySelector('.fs3d-people')
    expect(badge).not.toBeNull()
    expect(badge!.textContent).toBe('3')
    expect(badge!.querySelector('svg')).not.toBeNull()
    expect(options[1].querySelector('.fs3d-people')).toBeNull()
  })

  it('徽记：people badge 渲染 Users 图标+数字', () => {
    const groups = makeGroups(1).map(g => ({ ...g, badge: { kind: 'people' as const, value: 7 } }))
    render(<FolderStack3D groups={groups} ariaLabel="人数" />)
    const badge = screen.getAllByRole('option')[0].querySelector('.fs3d-people')
    expect(badge).not.toBeNull()
    expect(badge!.textContent).toBe('7')
    expect(badge!.querySelector('svg')).not.toBeNull()
  })

  it('卡面只留标题与 files 副行，无 KPI/百分比/徽章/底部 tab 残留', () => {
    render(<FolderStack3D groups={makeGroups(3)} ariaLabel="精简" />)
    const card = screen.getAllByRole('option')[0]
    expect(card.querySelector('.fs3d-title')!.textContent).toBe('分组0')
    expect(card.querySelector('.fs3d-files')!.textContent).toBe('1张')
    // 旧卡面元素必须清除（视觉硬规则 7）
    for (const sel of ['.fs3d-num', '.fs3d-stats', '.fs3d-st', '.fs3d-tab', '.fs3d-numlabel', '.fs3d-meta']) {
      expect(card.querySelector(sel)).toBeNull()
    }
  })

  // ── FPS 看门狗（Phase 1.5 Fix）：rAF 停止后重启须重置采样窗口 ──
  // 根因：fpsRef 的 start/frames/badSince 在 rAF 停止后保留，下次 kick 恢复时
  // measure() 把空闲时长计入采样窗口 → 误判低 fps → 错误降级。修复：kick 从停止态
  // 重启时重置采样会话（见 useWheelStack resetFpsMeasurement）。

  it('A. 空闲恢复不误报：沉降→空闲5s→重启→正常帧率1s，不降级（无 fs3d-noglass）', () => {
    installFpsClock()
    render(<FolderStack3D groups={makeGroups(10)} ariaLabel="空闲恢复" />)
    const stage = screen.getByRole('listbox') as HTMLElement
    stage.focus()

    // 1) 一轮正常 60fps 动画
    fireEvent.keyDown(stage, { key: 'End' })
    runFpsFrames(30, 16.7)
    // 2) 等待弹簧收敛，确认 rAF 停止
    settleFps()
    expect(rafQueue.length).toBe(0)

    // 3) 模拟空闲至少 5 秒（仅推进时钟，无帧）
    fpsClock += 5000

    // 4) 再次启动动画（键盘）
    fireEvent.keyDown(stage, { key: 'Home' })
    // 5) 正常帧间隔运行至少 1 秒
    runFpsFrames(60, 16.7)

    // 6) 断言：未误触发降级
    expect(stage.className).not.toContain('fs3d-noglass')
  })

  it('B. 真正低帧仍降级：连续 ~30fps 超过 500ms 触发 fs3d-noglass', () => {
    installFpsClock()
    render(<FolderStack3D groups={makeGroups(40)} ariaLabel="低帧降级" />)
    const stage = screen.getByRole('listbox') as HTMLElement
    stage.focus()

    // 连续 ~30fps（33ms 帧间隔）；每 2 帧推进一次滚轮保持弹簧运动（target 向末尾移动，不沉降）
    act(() => {
      for (let i = 0; i < 40; i++) {
        if (i % 2 === 0) {
          stage.dispatchEvent(new WheelEvent('wheel', { deltaY: 120, deltaMode: 0, cancelable: true, bubbles: true }))
        }
        stepFpsFrame(33)
      }
    })

    // 40 帧 × 33ms ≈ 1320ms > 500ms，fps≈30 < 45 → 必须降级（证明修复未破坏真实降级）
    expect(stage.className).toContain('fs3d-noglass')
  })
})
