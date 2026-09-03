import React, { useEffect, useState } from 'react'

// SquareHundred — 编辑风 100 点方阵（10×10，每点 = 1%，占比图的诚实替代形态）
// 数据诚实：按 data 顺序连续填充，每段占 round(value) 个点；段色 = d.color ?? 墨阶递推；
// Σround(value) < 100 → 剩余点 var(--border) 填充 + 图例尾行「其他」；
// Σ > 100 → 末段截断至 100 并底注「占比四舍五入」——两个偏差分支都诚实处理；
// 签名：图例百分比特大（text-numeric-xl），比名称大 1-2 档；无随机、无交互，动画仅 opacity 淡入。

export interface SquareHundredDatum {
  name: string
  /** 百分比数值（调用方算好，0-100） */
  value: number
  color?: string
}

interface SquareHundredProps {
  data: SquareHundredDatum[]
  /** 图例数值格式化，默认 `${n}%` */
  formatValue?: (n: number) => string
}

const DOT_SIZE = 10
const DOT_GAP = 6
const TOTAL_DOTS = 100
/** 无 color 段的墨阶递推（循环取用） */
const INK_STEPS = ['var(--fg)', 'var(--fg-2)', 'var(--muted)']

export const SquareHundred: React.FC<SquareHundredProps> = ({ data, formatValue }) => {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const handle = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(handle)
  }, [])

  const fmt = formatValue ?? ((n: number) => `${n}%`)

  // 段 → 点分配：每段 round(value) 个点，累计超 100 时截断（Σ > 100 分支）
  const overflow = data.reduce((s, d) => s + Math.round(d.value), 0) > TOTAL_DOTS
  const assigned: number[] = []
  let cum = 0
  for (const d of data) {
    const room = TOTAL_DOTS - cum
    const n = Math.max(0, Math.min(Math.round(d.value), room))
    assigned.push(n)
    cum += n
  }
  const remainder = TOTAL_DOTS - cum // Σ < 100 → 剩余点数（≥ 0）

  // 展开成 100 个点：段内按 data 顺序连续填充；剩余点 var(--border)
  const dots: { seg: number | 'other'; color: string }[] = []
  data.forEach((d, i) => {
    for (let j = 0; j < assigned[i]; j++) {
      dots.push({ seg: i, color: d.color ?? INK_STEPS[i % INK_STEPS.length] })
    }
  })
  for (let j = 0; j < remainder; j++) {
    dots.push({ seg: 'other', color: 'var(--border)' })
  }

  // 图例行：真实段 + Σ<100 时的「其他」尾行
  const legendRows: { name: string; value: number; color: string }[] = data.map((d, i) => ({
    name: d.name,
    value: d.value,
    color: d.color ?? INK_STEPS[i % INK_STEPS.length],
  }))
  if (remainder > 0) {
    legendRows.push({ name: '其他', value: remainder, color: 'var(--border)' })
  }

  return (
    <div className="flex flex-col" style={{ opacity: mounted ? 1 : 0, transition: 'opacity 0.5s ease' }}>
      <div className="flex items-start gap-5">
        <div
          role="img"
          aria-label="共 100 点，每点 1%"
          className="grid shrink-0"
          style={{ gridTemplateColumns: `repeat(10, ${DOT_SIZE}px)`, gap: DOT_GAP }}
        >
          {dots.map((dot, i) => (
            <span
              key={i}
              data-square-dot={i}
              data-seg={dot.seg}
              className="rounded-full shrink-0"
              style={{ width: DOT_SIZE, height: DOT_SIZE, background: dot.color }}
            />
          ))}
        </div>
        {/* 图例列：色点 + 名称（小）+ 特大百分比 */}
        <div className="flex flex-col min-w-0 flex-1" style={{ rowGap: 10 }}>
          {legendRows.map((r, i) => (
            <div key={`${r.name}-${i}`} className="flex items-center gap-2">
              <span className="rounded-full shrink-0" style={{ width: 8, height: 8, background: r.color }} />
              <span className="text-caption truncate" style={{ color: 'var(--muted)' }} title={r.name}>
                {r.name}
              </span>
              <span
                className="font-mono text-numeric-xl tabular-nums ml-auto whitespace-nowrap"
                style={{ color: 'var(--fg)' }}
              >
                {fmt(r.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
      {/* Σ > 100：诚实底注 */}
      {overflow && (
        <p className="text-caption" style={{ color: 'var(--muted)', marginTop: 6 }}>
          占比四舍五入
        </p>
      )}
    </div>
  )
}

export default SquareHundred
