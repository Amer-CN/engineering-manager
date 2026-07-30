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
})
