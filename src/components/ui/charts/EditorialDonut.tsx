import React, { useEffect, useRef, useState } from 'react'

// EditorialDonut — 编辑风多段圆环（手写 SVG，无 recharts）
// 数据诚实：名义角度 = value/total*360，弧长与数值严格成正比，不做视觉夸张；
// 弧段之间仅做发丝缝（从各段名义角度向内收，名义角度本身不变）。
// 颜色走 CSS 变量 + 调用方注入色板；动画仅入场 opacity 淡入（大元素禁 scale）。

export interface EditorialDonutDatum {
  name: string
  value: number
  color?: string
}

export interface DonutSegment {
  name: string
  value: number
  color: string
  startDeg: number
  endDeg: number
  path: string
}

const CX = 50
const CY = 50
const R_OUTER = 46
const GAP_DEG = 1.2 // 发丝缝总宽（度），由缝两侧均摊

function polar(r: number, deg: number): { x: number; y: number } {
  const rad = ((deg - 90) * Math.PI) / 180 // 0° 指向 12 点方向，顺时针
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) }
}

function fmt(n: number): string {
  return n.toFixed(2)
}

// 完整圆环（单段 360° 或空数据占位）：外圈 + 内圈，evenodd 挖洞
function ringPath(rOuter: number, rInner: number): string {
  return [
    `M ${fmt(CX)} ${fmt(CY - rOuter)}`,
    `A ${rOuter} ${rOuter} 0 1 1 ${fmt(CX)} ${fmt(CY + rOuter)}`,
    `A ${rOuter} ${rOuter} 0 1 1 ${fmt(CX)} ${fmt(CY - rOuter)}`,
    'Z',
    `M ${fmt(CX)} ${fmt(CY - rInner)}`,
    `A ${rInner} ${rInner} 0 1 0 ${fmt(CX)} ${fmt(CY + rInner)}`,
    `A ${rInner} ${rInner} 0 1 0 ${fmt(CX)} ${fmt(CY - rInner)}`,
    'Z',
  ].join(' ')
}

function segmentPath(rOuter: number, rInner: number, startDeg: number, endDeg: number): string {
  const sweep = endDeg - startDeg
  if (sweep >= 359.995) return ringPath(rOuter, rInner)
  // 发丝缝连续单式：gap 随 sweep 连续收缩，绘制弧长随数值单调不减
  const gap = Math.min(GAP_DEG, sweep * 0.5)
  const a = startDeg + gap / 2
  const b = endDeg - gap / 2
  const large = b - a > 180 ? 1 : 0
  const p1 = polar(rOuter, a)
  const p2 = polar(rOuter, b)
  const p3 = polar(rInner, b)
  const p4 = polar(rInner, a)
  return [
    `M ${fmt(p1.x)} ${fmt(p1.y)}`,
    `A ${rOuter} ${rOuter} 0 ${large} 1 ${fmt(p2.x)} ${fmt(p2.y)}`,
    `L ${fmt(p3.x)} ${fmt(p3.y)}`,
    `A ${rInner} ${rInner} 0 ${large} 0 ${fmt(p4.x)} ${fmt(p4.y)}`,
    'Z',
  ].join(' ')
}

/** 纯函数：按 value/total*360 计算名义角度并生成弧段 path（组件与测试共用） */
export function computeDonutSegments(
  data: EditorialDonutDatum[],
  colors?: readonly string[],
  thickness = 20,
): DonutSegment[] {
  const positive = data.filter((d) => d.value > 0)
  const total = positive.reduce((sum, d) => sum + d.value, 0)
  const rInner = R_OUTER - thickness
  let start = 0
  return positive.map((d, i) => {
    const sweep = total > 0 ? (d.value / total) * 360 : 0
    const end = start + sweep
    const seg: DonutSegment = {
      name: d.name,
      value: d.value,
      color: d.color ?? colors?.[i % Math.max(colors?.length ?? 0, 1)] ?? 'var(--muted)',
      startDeg: start,
      endDeg: end,
      path: segmentPath(R_OUTER, rInner, start, end),
    }
    start = end
    return seg
  })
}

interface EditorialDonutProps {
  data: EditorialDonutDatum[]
  /** datum 无 color 时的 fallback 色板（调用方注入，组件不自配色板） */
  colors?: readonly string[]
  /** 数值格式化由调用方注入（金额 formatMoney/formatCurrency，计数可传 String） */
  formatValue?: (n: number) => string
  /** 中心合计格式化，默认同 formatValue */
  formatTotal?: (n: number) => string
  centerLabel?: string
  /** 渲染尺寸 px（viewBox 0 0 100 100 等比缩放） */
  size?: number
  /** 环厚（viewBox 单位） */
  thickness?: number
}

export const EditorialDonut: React.FC<EditorialDonutProps> = ({
  data,
  colors,
  formatValue,
  formatTotal,
  centerLabel = '合计',
  size = 200,
  thickness = 20,
}) => {
  const [mounted, setMounted] = useState(false)
  const [hover, setHover] = useState<{ i: number; x: number; y: number } | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handle = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(handle)
  }, [])

  const segments = computeDonutSegments(data, colors, thickness)
  const total = segments.reduce((s, seg) => s + seg.value, 0)
  const fmtValue = formatValue ?? ((n: number) => String(n))
  const fmtTotal = formatTotal ?? fmtValue
  const rInner = R_OUTER - thickness
  const holePx = (size * 2 * rInner) / 100
  const active = hover && segments[hover.i] ? { ...segments[hover.i], x: hover.x, y: hover.y } : null

  const segHover = (i: number) => (e: React.MouseEvent<SVGPathElement>) => {
    const rect = boxRef.current?.getBoundingClientRect()
    setHover({ i, x: e.clientX - (rect?.left ?? 0), y: e.clientY - (rect?.top ?? 0) })
  }

  return (
    <div className="flex items-center gap-5">
      <div ref={boxRef} className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" width={size} height={size} role="img"
          style={{ opacity: mounted ? 1 : 0, transition: 'opacity 0.5s var(--ease-out)' }}
          onMouseLeave={() => setHover(null)}>
          {segments.length === 0 && (
            <path d={ringPath(R_OUTER, rInner)} fill="var(--border)" fillRule="evenodd" />
          )}
          {segments.map((seg, i) => (
            <path key={`${seg.name}-${i}`} data-segment={i} d={seg.path} fill={seg.color} fillRule="evenodd"
              style={{ opacity: hover === null || hover.i === i ? 1 : 0.35, transition: 'opacity 0.15s var(--ease-out)' }}
              onMouseEnter={segHover(i)} onMouseMove={segHover(i)} />
          ))}
        </svg>
        {/* 中心合计：真实数值 + 等宽大数字 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-caption" style={{ color: 'var(--muted)' }}>{centerLabel}</span>
          <span className="font-mono text-numeric-xl tabular-nums truncate" title={fmtTotal(total)}
            style={{ color: 'var(--fg)', maxWidth: holePx }}>{fmtTotal(total)}</span>
        </div>
        {/* Tooltip：纯 React state + DOM 定位 */}
        {active && (
          <div className="absolute z-20 px-3 py-2 rounded-lg text-xs whitespace-nowrap pointer-events-none"
            style={{
              left: active.x, top: active.y, transform: 'translate(-50%, calc(-100% - 8px))',
              background: 'var(--panel)', border: '1px solid var(--border-strong)',
              color: 'var(--fg)', boxShadow: 'var(--shadow-md)',
            }}>
            <span className="font-medium">{active.name}</span>
            <span className="mx-1.5" style={{ color: 'var(--muted)' }}>·</span>
            <span className="font-mono tabular-nums" style={{ color: active.color }}>{fmtValue(active.value)}</span>
            {total > 0 && (
              <span className="ml-1.5 font-mono tabular-nums" style={{ color: 'var(--muted)' }}>
                {((active.value / total) * 100).toFixed(1)}%
              </span>
            )}
          </div>
        )}
      </div>
      {/* 图例：真实数值，等宽字体右对齐 */}
      {segments.length > 0 && (
        <div className="flex-1 min-w-0 space-y-1.5">
          {segments.map((seg, i) => (
            <div key={`${seg.name}-${i}`} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 shrink-0 rounded-full" style={{ background: seg.color }} />
                <span className="text-caption truncate" style={{ color: 'var(--muted-2)' }}>{seg.name}</span>
              </span>
              <span className="font-mono text-caption tabular-nums shrink-0" style={{ color: 'var(--fg-2)' }}>
                {fmtValue(seg.value)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default EditorialDonut
