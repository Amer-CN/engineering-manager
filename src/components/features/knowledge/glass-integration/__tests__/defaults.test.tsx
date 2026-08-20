/** FolderCarousel 默认参数（朝右 22°/90px，用户拍板）+ 滑块可调保留 */
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FolderCarousel } from '@/components/features/knowledge/glass-integration/FolderCarousel'

const folders = [
  { id: 'f1', title: 'A', period: 'p', progress: 50, memberCount: 1, category: 'c', documents: [] },
  { id: 'f2', title: 'B', period: 'p', progress: 50, memberCount: 1, category: 'c', documents: [] },
  { id: 'f3', title: 'C', period: 'p', progress: 50, memberCount: 1, category: 'c', documents: [] },
]

/** 抽屉内 4 个滑块序号（DOM 顺序）：0=滚动速度 1=Y角度 2=X俯仰 3=间距 */
const sliders = () => screen.getAllByRole('slider')

describe('FolderCarousel 默认参数（朝右 22°/90px）', () => {
  it('默认 Y 轴角度 22°、间距 90px；滑块可调', () => {
    render(<FolderCarousel folders={folders} theme="dark" />)
    fireEvent.click(screen.getByTitle('调整3D视效参数'))
    const [, angle, , spacing] = sliders()
    expect(angle).toHaveValue('22')
    expect(spacing).toHaveValue('90')

    fireEvent.change(angle, { target: { value: '35' } })
    expect(angle).toHaveValue('35')
  })

  it('重置按钮恢复新默认（22°/90px）', () => {
    render(<FolderCarousel folders={folders} theme="dark" />)
    fireEvent.click(screen.getByTitle('调整3D视效参数'))
    const [, angle, , spacing] = sliders()
    fireEvent.change(angle, { target: { value: '-40' } })
    fireEvent.click(screen.getByText('重置'))
    expect(angle).toHaveValue('22')
    expect(spacing).toHaveValue('90')
  })
})
