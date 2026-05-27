import React, { useState, useEffect } from 'react'

interface BarDatum { name: string; amount: number }

// CSS 柱状图 — 横向布局，纯 div 实现，无 Recharts 干扰
export const SimpleBarChart: React.FC<{
  data: { name: string; amount: number }[]
  colors: string[]
  formatValue: (n: number) => string
}> = ({ data, colors, formatValue }) => {
  const [hovered, setHovered] = useState<number | null>(null)
  const [mounted, setMounted] = useState(false)
  const max = Math.max(...data.map(d => d.amount), 1)

  useEffect(() => { requestAnimationFrame(() => setMounted(true)) }, [])

  const ticks = [0, 0.25, 0.5, 0.75, 1].map(r => Math.round(max * r))

  return (
    <div className="relative px-1 pt-2 pb-1">
      {/* 参考线 */}
      <div className="absolute inset-0 pointer-events-none" style={{ left: 80, right: 12, top: 8, bottom: 32 }}>
        {[0, 0.25, 0.5, 0.75, 1].map((r, i) => (
          <div key={i} className="absolute left-0 right-0 border-t border-dashed" style={{
            bottom: `${r * 100}%`,
            borderColor: 'var(--border)',
            opacity: i === 0 ? 0.6 : 0.3,
          }} />
        ))}
      </div>

      {/* Y 轴刻度 */}
      <div className="absolute flex flex-col justify-between text-right pr-2" style={{ left: 0, top: 8, bottom: 32, width: 72 }}>
        {ticks.slice().reverse().map((v, i) => (
          <span key={i} className="text-[10px] leading-none" style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono, monospace)' }}>
            {v >= 10000 ? `${(v / 10000).toFixed(0)}万` : v === 0 ? '0' : String(v)}
          </span>
        ))}
      </div>

      {/* 柱子 */}
      <div className="flex items-end gap-1.5" style={{ marginLeft: 80, marginRight: 12, height: 200, paddingBottom: 0 }}>
        {data.map((d, i) => {
          const pct = max > 0 ? (d.amount / max) * 100 : 0
          const isHovered = hovered === i
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}>
              {isHovered && (
                <div className="absolute z-20 px-3 py-2 rounded-lg text-xs whitespace-nowrap pointer-events-none"
                  style={{
                    bottom: `calc(${pct}% + 8px)`,
                    left: '50%', transform: 'translateX(-50%)',
                    background: 'var(--panel)', border: '1px solid var(--border-strong)',
                    color: 'var(--fg)', boxShadow: 'var(--shadow-md)',
                  }}>
                  <span className="font-medium">{d.name}</span>
                  <span className="mx-1.5" style={{ color: 'var(--muted)' }}>·</span>
                  <span style={{ fontFamily: 'var(--font-mono, monospace)', color: colors[i % colors.length] }}>{formatValue(d.amount)}</span>
                </div>
              )}
              <div className="w-full rounded-t-md"
                style={{
                  height: mounted ? `${Math.max(pct, 1)}%` : '0%',
                  transition: `height 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.06}s, opacity 0.15s ease`,
                  background: `linear-gradient(to top, ${colors[i % colors.length]}cc, ${colors[i % colors.length]})`,
                  opacity: hovered !== null && !isHovered ? 0.4 : 1,
                  minHeight: mounted && d.amount > 0 ? 4 : 0,
                }}
              />
            </div>
          )
        })}
      </div>

      {/* X 轴标签 */}
      <div className="flex gap-1.5 mt-2" style={{ marginLeft: 80, marginRight: 12 }}>
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center">
            <span className="text-[10px] leading-tight block truncate" style={{ color: 'var(--muted-2)' }} title={d.name}>
              {d.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// 分组柱状图 — 每组两根柱子（如支出/收入）
export const SimpleGroupedBarChart: React.FC<{
  data: { name: string; values: { label: string; amount: number; color: string }[] }[]
  formatValue: (n: number) => string
}> = ({ data, formatValue }) => {
  const [hovered, setHovered] = useState<{ row: number; col: number } | null>(null)
  const [mounted, setMounted] = useState(false)
  const max = Math.max(...data.flatMap(d => d.values.map(v => v.amount)), 1)

  useEffect(() => { requestAnimationFrame(() => setMounted(true)) }, [])
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(r => Math.round(max * r))
  const seriesCount = data[0]?.values.length ?? 1

  return (
    <div className="relative px-1 pt-2 pb-1">
      <div className="absolute inset-0 pointer-events-none" style={{ left: 80, right: 12, top: 8, bottom: 32 }}>
        {[0, 0.25, 0.5, 0.75, 1].map((r, i) => (
          <div key={i} className="absolute left-0 right-0 border-t border-dashed" style={{
            bottom: `${r * 100}%`, borderColor: 'var(--border)', opacity: i === 0 ? 0.6 : 0.3,
          }} />
        ))}
      </div>

      <div className="absolute flex flex-col justify-between text-right pr-2" style={{ left: 0, top: 8, bottom: 32, width: 72 }}>
        {ticks.slice().reverse().map((v, i) => (
          <span key={i} className="text-[10px] leading-none" style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono, monospace)' }}>
            {v >= 10000 ? `${(v / 10000).toFixed(0)}万` : v === 0 ? '0' : String(v)}
          </span>
        ))}
      </div>

      <div className="flex items-end" style={{ marginLeft: 80, marginRight: 12, height: 200, gap: 6 }}>
        {data.map((d, ri) => (
          <div key={ri} className="flex-1 flex items-end justify-center gap-0.5 h-full">
            {d.values.map((v, ci) => {
              const pct = max > 0 ? (v.amount / max) * 100 : 0
              const isHovered = hovered?.row === ri && hovered?.col === ci
              return (
                <div key={ci} className="flex-1 flex flex-col items-center justify-end h-full relative"
                  onMouseEnter={() => setHovered({ row: ri, col: ci })}
                  onMouseLeave={() => setHovered(null)}>
                  {isHovered && (
                    <div className="absolute z-20 px-3 py-2 rounded-lg text-xs whitespace-nowrap pointer-events-none"
                      style={{
                        bottom: `calc(${pct}% + 8px)`, left: '50%', transform: 'translateX(-50%)',
                        background: 'var(--panel)', border: '1px solid var(--border-strong)',
                        color: 'var(--fg)', boxShadow: 'var(--shadow-md)',
                      }}>
                      <span className="font-medium">{d.name}</span>
                      <span className="mx-1.5" style={{ color: 'var(--muted)' }}>·</span>
                      <span style={{ color: v.color }}>{v.label}</span>
                      <span className="mx-1" style={{ color: 'var(--muted)' }}>:</span>
                      <span style={{ fontFamily: 'var(--font-mono, monospace)', color: v.color }}>{formatValue(v.amount)}</span>
                    </div>
                  )}
                  <div className="w-full rounded-t-md"
                    style={{
                      height: mounted ? `${Math.max(pct, 1)}%` : '0%',
                      transition: `height 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${(ri * (data[0]?.values.length ?? 1) + ci) * 0.05}s, opacity 0.15s ease`,
                      background: `linear-gradient(to top, ${v.color}cc, ${v.color})`,
                      opacity: hovered !== null && !isHovered ? 0.35 : 1,
                      minHeight: mounted && v.amount > 0 ? 3 : 0,
                    }}
                  />
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <div className="flex mt-2" style={{ marginLeft: 80, marginRight: 12, gap: 6 }}>
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center">
            <span className="text-[10px] leading-tight block truncate" style={{ color: 'var(--muted-2)' }} title={d.name}>{d.name}</span>
          </div>
        ))}
      </div>

      {/* 图例 */}
      <div className="flex items-center justify-center gap-4 mt-2">
        {data[0]?.values.map((v, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: v.color }} />
            <span className="text-[10px]" style={{ color: 'var(--muted-2)' }}>{v.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
