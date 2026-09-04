/**
 * pixel-loader.test.tsx — PixelLoader 渲染回归测试
 *
 * 锁定 Beautiful UI 移植的关键结构：
 *  (a) 3×3 像素网格（9 个像素格，pixel-on 波前动画接线）；
 *  (b) shimmer 标签 + 计时文本（0.0s 起步，格式 0.0s / 1m 30.0s）。
 */

import { render, screen, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import PixelLoader from '../PixelLoader'

afterEach(cleanup)

describe('PixelLoader', () => {
  it('渲染 3×3 像素网格：9 个像素格且接线 pixel-on 动画', () => {
    const { container } = render(<PixelLoader />)
    const grid = container.querySelector('span.grid')
    expect(grid).not.toBeNull()
    const pixels = Array.from(grid!.children)
    expect(pixels).toHaveLength(9)
    // 波前动画：每格 650ms 循环 + chevron 延迟（首格 0ms）
    expect((pixels[0] as HTMLElement).style.animation).toContain('pixel-on 650ms')
  })

  it('渲染 shimmer 标签与计时文本（0.0s 起步，秒/分格式）', () => {
    render(<PixelLoader label="正在分析" />)
    expect(screen.getByText('正在分析')).toBeTruthy()
    // 计时器从 0.0s 起步；断言用正则避免 100ms tick 竞态
    expect(screen.getByText(/^(\d+m )?\d+\.\d+s$/)).toBeTruthy()
  })
})
