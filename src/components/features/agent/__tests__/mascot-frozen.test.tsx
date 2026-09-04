/**
 * mascot-frozen.test.tsx — frozen 模式形状回归测试
 *
 * 动机：用户反馈头像「像圆不像三角」，需锁定 frozen 静态渲染下 shape 真实生效
 * （身体轮廓随 shape 变化），防止形状解析/回退回归。三个断言：
 *  (a) shape="triangle" 与 shape="cercle" 的身体 path d 不相等；
 *  (b) triangle 身体顶点朝上：路径采样点中有且仅有一个显著 y 最小点
 *      （宽松断言：阈值取轮廓高度的 0.5%——圆顶是平缓弧、多个采样点并列最小，
 *      圆角三角顶点方向半径突起、最低点唯一，故能把圆误当三角的情况挡住）；
 *  (c) 同一 shape 两次渲染 d 稳定（frozen 走 engine.sample(0) 纯函数，确定性）。
 */

import { render, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import Mascot from '../Mascot'
import { COLOR_BY_ID } from '../bloub/bot/skins'

afterEach(cleanup)

/** 身体 path 选择器：身体是唯一以变体 body 色填充的 path（眼/notch 是独立色块，弧线走 stroke）。
    用 ambre 而非默认 encre：body=#f0b429 在 light/dark 两组一致，避开与深色眼色/描边的潜在撞色 */
const INK_HEX = COLOR_BY_ID.get('ambre')?.hex ?? '#f0b429'

/** 渲染一个 frozen Mascot 并取回身体 path 的 d */
function renderBody(shape: string): string {
  const { container } = render(
    <Mascot size={96} frozen state="idle" shape={shape} color="ambre" />,
  )
  const body = container.querySelector(`path[fill="${INK_HEX}"]`)
  expect(body).not.toBeNull()
  return body!.getAttribute('d') ?? ''
}

/** closedPath 的 on-curve 采样点：M 起点 + 每个 C 段终点（Catmull-Rom 控制点除外） */
function onCurvePoints(d: string): Array<{ x: number; y: number }> {
  const pts: Array<{ x: number; y: number }> = []
  const head = d.match(/^M\s*(-?[\d.]+)[ ,](-?[\d.]+)/)
  if (head) pts.push({ x: Number(head[1]), y: Number(head[2]) })
  for (const m of d.matchAll(/C\s*(?:-?[\d.]+[ ,]){4}(-?[\d.]+)[ ,](-?[\d.]+)/g)) {
    pts.push({ x: Number(m[1]), y: Number(m[2]) })
  }
  return pts
}

describe('Mascot frozen 形状回归', () => {
  it('triangle 与 cercle 的身体轮廓 d 不相等', () => {
    const triangle = renderBody('triangle')
    const cercle = renderBody('cercle')
    expect(triangle).not.toBe('')
    expect(cercle).not.toBe('')
    expect(triangle).not.toBe(cercle)
  })

  it('triangle 顶点朝上：有且仅有一个显著 y 最小的采样点', () => {
    const pts = onCurvePoints(renderBody('triangle'))
    expect(pts.length).toBeGreaterThan(3)
    const ys = pts.map((p) => p.y)
    const minY = Math.min(...ys)
    const height = Math.max(...ys) - minY
    // 阈值取轮廓高度 0.5%：顶点比相邻采样点低约 1% 高度（圆角 rc=0.34 下实测 ~1.8/185），
    // 而圆的顶部相邻点几乎并列最小——只有真三角才恰好剩一个点
    const tol = height * 0.005
    const top = pts.filter((p) => p.y < minY + tol)
    expect(top).toHaveLength(1)
  })

  it('同一 shape 两次渲染 d 稳定（确定性）', () => {
    for (const shape of ['cercle', 'triangle']) {
      expect(renderBody(shape)).toBe(renderBody(shape))
    }
  })
})
