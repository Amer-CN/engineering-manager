import React, { useEffect, useState } from 'react'

// BarcodeCalendar — 编辑风条码日历（「一根发丝线 = 一天」）
// 数据诚实：线高 = value / 全量max × 可用高（max 守卫取全量最大值，防调用方乱序）；
// value=0 的天照画（1px 发丝线 + 点落在基线上）——无论有没有事发生，发丝线都在；
// 签名纪律：只给 TOP-N 天（值最高的前 N，并列取先出现）在点上方标数，其余沉默；
// weekend 天点空心（1px var(--fg-2) 描边 + 底色填充），工作日实心 var(--fg)；
// X 轴只标首 / 中 / 尾 3 个锚点；无随机、无交互，动画仅整体 opacity 淡入。

export interface BarcodeCalendarDatum {
  label: string
  value: number
  weekend?: boolean
}

interface BarcodeCalendarProps {
  /** 已按时间升序、日期补齐（调用方负责补天） */
  data: BarcodeCalendarDatum[]
  /** 数值格式化由调用方注入 */
  formatValue: (n: number) => string
  /** 只标值最高的前 N 天（并列取先出现），默认 3 */
  topLabeled?: number
  /** 图内图例句，印在图下 */
  caption?: string
  /** 图高 px，默认 160 */
  height?: number
}

const LABEL_H = 16
const DOT_SIZE = 6
const DOT_BASELINE_GAP = 3

export const BarcodeCalendar: React.FC<BarcodeCalendarProps> = ({
  data,
  formatValue,
  topLabeled = 3,
  caption,
  height = 160,
}) => {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const handle = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(handle)
  }, [])

  // max 守卫（同 EditorialBars / RungBars）：取全量最大值，防调用方乱序溢出
  const max = data.length > 0 ? Math.max(...data.map((d) => d.value)) : 0

  // TOP-N 集合：仅 value > 0 参与标注；并列按原始出现顺序取先（显式 tie-break，不依赖排序稳定性）
  const topSet = new Set<number>()
  if (topLabeled > 0 && max > 0) {
    data
      .map((d, i) => ({ i, v: d.value }))
      .filter((x) => x.v > 0)
      .sort((a, b) => (b.v - a.v) || (a.i - b.i))
      .slice(0, topLabeled)
      .forEach((x) => topSet.add(x.i))
  }

  // 线可用高 = 总高 - 顶部标注行 - 点 - 点与线间隙
  const lineArea = height - LABEL_H - DOT_SIZE - DOT_BASELINE_GAP
  const lineHeightOf = (v: number) =>
    max > 0 && v > 0 ? Math.max(1, Math.round((v / max) * lineArea)) : 1

  // X 轴锚点：首 / 中 / 尾（下标去重，单天数据只标一次）
  const mid = Math.floor((data.length - 1) / 2)
  const anchors = [...new Set([0, mid, data.length - 1])].filter((i) => i >= 0 && i < data.length)

  return (
    <div
      role="img"
      aria-label={`条码日历 · 共 ${data.length} 天`}
      style={{ opacity: mounted ? 1 : 0, transition: 'opacity 0.5s var(--ease-out)' }}
    >
      <div className="flex items-end" style={{ height }}>
        {data.map((d, i) => (
          <div
            key={`${d.label}-${i}`}
            data-barcode-day={i}
            className="flex-1 min-w-0 flex flex-col items-center justify-end"
          >
            {/* 标注行：仅 TOP-N 显示数值，其余留同高空白保持基线对齐 */}
            <span
              className="font-mono text-caption tabular-nums leading-none whitespace-nowrap"
              style={{ height: LABEL_H, color: 'var(--fg)' }}
            >
              {topSet.has(i) ? formatValue(d.value) : ''}
            </span>
            {/* 线顶 6px 圆点：weekend 空心（描边 var(--fg-2) + 底色填充），工作日实心 */}
            <span
              data-barcode-dot={i}
              data-hollow={d.weekend ? 'true' : undefined}
              className="rounded-full shrink-0"
              style={{
                width: DOT_SIZE,
                height: DOT_SIZE,
                marginBottom: DOT_BASELINE_GAP,
                ...(d.weekend
                  ? { background: 'var(--card)', border: '1px solid var(--fg-2)' }
                  : { background: 'var(--fg)' }),
              }}
            />
            {/* 一天一根 1px 发丝线；value=0 也保留 1px（点落基线，发丝线仍在） */}
            <span
              data-barcode-line={i}
              className="w-px shrink-0"
              style={{ height: lineHeightOf(d.value), background: 'var(--fg)' }}
            />
          </div>
        ))}
      </div>
      {/* 发丝基线 */}
      <div className="w-full" style={{ height: 1, background: 'var(--border)' }} />
      {/* X 轴锚点：只标首 / 中 / 尾 */}
      {anchors.length > 0 && (
        <div className="flex justify-between text-caption" style={{ color: 'var(--muted)', marginTop: 4 }}>
          {anchors.map((i) => (
            <span key={i} data-barcode-anchor={i}>
              {data[i].label}
            </span>
          ))}
        </div>
      )}
      {/* 图内图例句 */}
      {caption && (
        <p className="text-caption" style={{ color: 'var(--muted)', marginTop: 6 }}>
          {caption}
        </p>
      )}
    </div>
  )
}

export default BarcodeCalendar
