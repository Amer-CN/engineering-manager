/**
 * GlassCarousel + CarouselControls 测试
 *
 * 1. 舞台渲染：6 卡全量注册（gc-card）、悬浮信息卡、圆点导航、控制按钮
 * 2. 步进/圆点交互：聚焦索引变化（fake timers 驱动 lerp 收敛）
 * 3. 参数抽屉：默认关闭、打开后滑块可见、自动循环默认关闭、重置恢复真值
 * 4. reduced-motion → 平铺列表（gc-flat-track，无 3D）
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { GlassCarousel } from '../GlassCarousel'
import { CarouselControls } from '../CarouselControls'
import type { FolderItem } from '../types'

/** 测试 fixture（M2 demoData 下线后自含） */
const FIXTURES: FolderItem[] = [
  { id: 'f1', title: '安全生产资料', englishTitle: 'SAFETY', period: '2026 · 上半年', progress: 92, memberCount: 6, category: '安全', documents: [] },
  { id: 'f2', title: '合同与往来文件', englishTitle: 'CONTRACTS', period: '2026 · Q1-Q2', progress: 78, memberCount: 4, category: '合同', documents: [] },
  { id: 'f3', title: '图纸与变更单', englishTitle: 'DRAWINGS', period: '项目 A 施工期', progress: 65, memberCount: 5, category: '技术', documents: [] },
  { id: 'f4', title: '人员与考勤档案', englishTitle: 'HR', period: '2026 年度', progress: 84, memberCount: 3, category: '人事', documents: [] },
  { id: 'f5', title: '结算与支付凭证', englishTitle: 'SETTLEMENT', period: '2026 · Q2', progress: 45, memberCount: 4, category: '财务', documents: [] },
  { id: 'f6', title: '会议纪要与沟通', englishTitle: 'MOM', period: '2026 · 上半年', progress: 95, memberCount: 2, category: '沟通', documents: [] },
]

function stubMatchMedia(matches: boolean) {
  const mq = { matches, addEventListener: vi.fn(), removeEventListener: vi.fn() }
  vi.stubGlobal('matchMedia', vi.fn(() => mq))
  return mq
}

describe('GlassCarousel — 舞台渲染', () => {
  beforeEach(() => {
    stubMatchMedia(false)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('渲染全部文件夹卡 + 悬浮信息卡 + 圆点导航 + 控制按钮', () => {
    render(<GlassCarousel folders={FIXTURES} />)

    // 6 张演示文件夹卡全量注册
    const cards = document.querySelectorAll('.gc-card')
    expect(cards.length).toBe(6)

    // 悬浮信息卡显示当前聚焦文件夹（首个 = 安全生产资料）
    expect(screen.getAllByText('安全生产资料').length).toBeGreaterThan(0) // Badge + 卡片 Pocket
    expect(screen.getAllByText('92%').length).toBeGreaterThan(0)

    // 圆点 6 个，首个选中
    const dots = screen.getAllByRole('button', { name: /第 \d 个文件夹/ })
    expect(dots.length).toBe(6)
    expect(dots[0].className).toContain('gc-dot--active')

    // 控制按钮：参数 / 上 / 下
    expect(screen.getByRole('button', { name: '调整 3D 视效参数' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '上一个文件夹' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '下一个文件夹' })).toBeInTheDocument()
  })

  it('自动循环默认开启：渲染后无需任何操作即自动推进（参考项目原生行为）', async () => {
    vi.useFakeTimers()
    render(<GlassCarousel folders={FIXTURES} />)
    act(() => { vi.advanceTimersByTime(1600) }) // 0.35/s × 1.6s ≈ 0.56 → 聚焦 1
    const dots = screen.getAllByRole('button', { name: /第 \d 个文件夹/ })
    expect(dots[1].className).toContain('gc-dot--active')
    vi.useRealTimers()
  })

  it('点下一个 → 聚焦变化（lerp 收敛后第二个圆点选中）', async () => {
    vi.useFakeTimers()
    render(<GlassCarousel folders={FIXTURES} />)

    fireEvent.click(screen.getByRole('button', { name: '下一个文件夹' }))
    act(() => { vi.advanceTimersByTime(700) }) // 收敛即断言（autoplay 默认开着会继续推进）

    const dots = screen.getAllByRole('button', { name: /第 \d 个文件夹/ })
    expect(dots[1].className).toContain('gc-dot--active')
    expect(screen.getAllByText('合同与往来文件').length).toBeGreaterThan(0)
    vi.useRealTimers()
  })

  it('点击圆点直达对应文件夹', async () => {
    vi.useFakeTimers()
    render(<GlassCarousel folders={FIXTURES} />)

    fireEvent.click(screen.getAllByRole('button', { name: /第 \d 个文件夹/ })[4])
    act(() => { vi.advanceTimersByTime(700) })

    expect(screen.getAllByText('结算与支付凭证').length).toBeGreaterThan(0)
    vi.useRealTimers()
  })

  it('reduced-motion → 平铺列表（无 3D）', () => {
    stubMatchMedia(true)
    render(<GlassCarousel folders={FIXTURES} />)
    expect(document.querySelector('.gc-flat-track')).not.toBeNull()
    expect(document.querySelector('.gc-card')).toBeNull()
  })

  it('空数组 → 不渲染舞台（空态由页面层处理）', () => {
    const { container } = render(<GlassCarousel folders={[]} />)
    expect(container.innerHTML).toBe('')
  })
})

describe('CarouselControls — 参数抽屉', () => {
  const baseProps = {
    showControls: false,
    onToggleControls: vi.fn(),
    onStepPrev: vi.fn(),
    onStepNext: vi.fn(),
    isPlaying: false,
    onTogglePlaying: vi.fn(),
    isLoop: false,
    onToggleLoop: vi.fn(),
    scrollSpeed: 1,
    onScrollSpeedChange: vi.fn(),
    rotateYAngle: -26,
    onRotateYChange: vi.fn(),
    rotateXAngle: 10,
    onRotateXChange: vi.fn(),
    itemSpacing: 75,
    onSpacingChange: vi.fn(),
  }

  it('默认隐藏参数抽屉；打开后渲染滑块与自动循环开关', () => {
    const { rerender } = render(<CarouselControls {...baseProps} />)
    expect(screen.queryByText('3D 视效设置')).toBeNull()

    rerender(<CarouselControls {...baseProps} showControls={true} />)
    expect(screen.getByText('3D 视效设置')).toBeInTheDocument()
    expect(screen.getByRole('slider', { name: 'Y 轴旋转角度' })).toBeInTheDocument()
    expect(screen.getByRole('slider', { name: '文件夹重叠间距' })).toBeInTheDocument()
  })

  it('自动循环默认关闭（管理场景非海报）', () => {
    render(<CarouselControls {...baseProps} showControls={true} />)
    const toggle = screen.getByText('自动循环').closest('button')!
    expect(toggle.textContent).toContain('关闭')
    fireEvent.click(toggle)
    expect(baseProps.onTogglePlaying).toHaveBeenCalledTimes(1)
  })

  it('重置恢复参数真值（rotateY -26 / rotateX 10 / spacing 75 / speed 1）', () => {
    render(<CarouselControls {...baseProps} showControls={true} rotateYAngle={-40} itemSpacing={120} scrollSpeed={2} />)
    fireEvent.click(screen.getByText('重置'))
    expect(baseProps.onRotateYChange).toHaveBeenCalledWith(-26)
    expect(baseProps.onRotateXChange).toHaveBeenCalledWith(10)
    expect(baseProps.onSpacingChange).toHaveBeenCalledWith(75)
    expect(baseProps.onScrollSpeedChange).toHaveBeenCalledWith(1)
  })

  it('无限循环开关：默认关闭，点击触发回调', () => {
    const { rerender } = render(<CarouselControls {...baseProps} showControls={true} />)
    const btn = screen.getByText('无限循环').closest('button')!
    expect(btn.textContent).toContain('关闭')
    fireEvent.click(btn)
    expect(baseProps.onToggleLoop).toHaveBeenCalledTimes(1)

    rerender(<CarouselControls {...baseProps} showControls={true} isLoop={true} />)
    expect(screen.getByText('无限循环').closest('button')!.textContent).toContain('开启')
  })
})
