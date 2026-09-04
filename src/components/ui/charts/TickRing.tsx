import React, { useEffect, useState } from 'react'

// TickRing — 编辑风刻度环（「一圈 = 100 格，一格 = 1%，读起来像钟表」）
// 数据诚实：lit 刻度数 = round(clamp(percent))，几何确定性（angle = i × 3.6°，12 点方向为 0、顺时针），
// 刻度线用 SVG <line> + transform rotate 计算；无 Math.random；动画仅入场 opacity 淡入。

interface TickRingProps {
  /** 0-100，内部 clamp */
  percent: number
  /** 环心下方小字（如「回款率」），并入 aria-label */
  label?: string
  /** 渲染尺寸 px，默认 96 */
  size?: number
  /** dark = 深色反色卡用（墨色取 var(--bg)），默认 light */
  tone?: 'light' | 'dark'
}

const TICKS = 100
const TICK_LENGTH = 8

export const TickRing: React.FC<TickRingProps> = ({
  percent,
  label,
  size = 96,
  tone = 'light',
}) => {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const handle = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(handle)
  }, [])

  const p = Math.min(100, Math.max(0, percent))
  const lit = Math.round(p)
  const cx = size / 2
  const cy = size / 2
  const rOuter = cx - 2
  const ink = tone === 'dark' ? 'var(--bg)' : 'var(--fg)'
  const ariaLabel = label ? `${label} ${p}%` : `${p}%`

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg
        data-tickring
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={ariaLabel}
        style={{ opacity: mounted ? 1 : 0, transition: 'opacity 0.5s var(--ease-out)' }}
      >
        {Array.from({ length: TICKS }).map((_, i) => (
          <line
            key={i}
            data-tick={i}
            x1={cx}
            y1={cy - rOuter}
            x2={cx}
            y2={cy - rOuter + TICK_LENGTH}
            transform={`rotate(${i * 3.6} ${cx} ${cy})`}
            stroke={i < lit ? ink : 'var(--border)'}
            strokeWidth={1}
          />
        ))}
      </svg>
      {/* 环心：大号等宽数字 + label 小字 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="font-mono text-numeric-xl tabular-nums" style={{ color: ink }}>{p}%</span>
        {label && (
          <span className="text-caption" style={{ color: ink, opacity: tone === 'dark' ? 0.6 : 1 }}>
            {label}
          </span>
        )}
      </div>
    </div>
  )
}

export default TickRing
