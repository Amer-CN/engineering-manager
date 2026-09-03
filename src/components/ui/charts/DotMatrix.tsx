import React from 'react'

// DotMatrix — 编辑风点阵图（1 点 = 1 个真实可数单位）
// 数据诚实：count ≤ maxDots 全量渲染；超出时只画 maxDots 个点 + 尾随 caption 注记
// 「共 N 单位」（诚实注记，绝不画假点）；count = 0 显示 text-caption「0」。
// 颜色统一一色（不搞彩虹）；无动画、无交互。

interface DotMatrixProps {
  count: number
  /** 单位词（「张」「人」），用于 aria-label 与溢出注记 */
  unitLabel?: string
  /** 点直径 px，默认 6 */
  dotSize?: number
  /** 最多渲染点数，默认 40 */
  maxDots?: number
  /** 点颜色，默认 var(--accent) */
  color?: string
}

export const DotMatrix: React.FC<DotMatrixProps> = ({
  count,
  unitLabel = '',
  dotSize = 6,
  maxDots = 40,
  color = 'var(--accent)',
}) => {
  const overflow = count > maxDots
  const shown = overflow ? maxDots : Math.max(count, 0)
  const note = unitLabel ? `共 ${count} ${unitLabel}` : `共 ${count}`

  return (
    <div className="flex flex-wrap items-center" style={{ gap: 3 }} role="img" aria-label={note}>
      {Array.from({ length: shown }).map((_, i) => (
        <span
          key={i}
          data-dot={i}
          className="rounded-full shrink-0"
          style={{ width: dotSize, height: dotSize, background: color }}
        />
      ))}
      {overflow && (
        <>
          {/* 「· 」分隔 + 加大间距：把「这是注记不是第 41 个点」表达出来 */}
          <span className="text-caption ml-2 shrink-0" style={{ color: 'var(--muted)' }}>·</span>
          <span className="text-caption shrink-0" style={{ color: 'var(--muted)' }}>{note}</span>
        </>
      )}
      {count === 0 && (
        <span className="text-caption" style={{ color: 'var(--muted)' }}>0</span>
      )}
    </div>
  )
}

export default DotMatrix
