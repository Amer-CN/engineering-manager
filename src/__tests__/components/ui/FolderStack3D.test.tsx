/**
 * FolderStack3D 组件测试（Stage-Surface 舞台区）
 * - 正常分支：listbox/option 语义、KPI 浮层、40 张上限截断
 * - 交互：点击聚焦卡 / Enter 打开分组；点击非聚焦卡不误触 onOpen
 * - reduced-motion：降级为横向扁平轨道（无 3D 舞台）
 */
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
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

describe('FolderStack3D', () => {
  afterEach(() => {
    cleanup()
    // 清掉 reduced-motion mock，避免串测
    delete (window as any).matchMedia
  })

  it('渲染 listbox 语义与全部分组卡，KPI 浮层显示聚焦分组', () => {
    render(<FolderStack3D groups={makeGroups(5)} ariaLabel="测试堆叠" />)
    const stage = screen.getByRole('listbox', { name: '测试堆叠' })
    expect(stage).toBeInTheDocument()
    expect(screen.getAllByRole('option')).toHaveLength(5)
    expect(stage.getAttribute('aria-activedescendant')).toBe('fs3d-card-0')
    // KPI 胶囊 + 卡面 tab 都含分组名，至少 2 处
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
})
