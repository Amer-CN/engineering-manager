import React, { useEffect, useState } from 'react'

// DotCascade — 编辑风点阵级联（「一列 = 一个月，点串按数值升序攀升」）
// 数据诚实：组件内按 value 升序重排 → 视觉级联攀升；点数 = round(value / dotUnit)，
// 一点就是一个真实可数单位；max 守卫同 RungBars（取全量最大值参与单位选择，防乱序溢出）；
// dotUnit 不传时由确定性纯函数 pickCascadeUnit 在 1/2/5×10^k 候选里自动选择（无随机）；
// 单位含义印在图内注记（「一点 = ¥N」）；列顶一颗实心大点，其下串点；
// value=0 列只有名称与「0」；动画仅整体 opacity 淡入。

export interface DotCascadeDatum {
  name: string
  value: number
}

/** 纯函数（确定性，无随机）：在 1/2/5×10^k 升序候选中，选「使最高列点数 round(max/unit) 落在 [8, maxDots]」的最小单位；
 *  无候选命中时回退为「不超 maxDots 的最小单位」（宁短勿溢）；maxValue ≤ 0 返回 1。组件与测试共用。 */
export function pickCascadeUnit(maxValue: number, maxDots = 24): number {
  if (!(maxValue > 0)) return 1
  let fallback = -1
  for (let k = -4; k <= 15; k++) {
    const base = Math.pow(10, k)
    for (const mantissa of [1, 2, 5]) {
      const unit = mantissa * base
      const dots = Math.round(maxValue / unit)
      if (dots >= 8 && dots <= maxDots) return unit
      if (dots <= maxDots && fallback < 0) fallback = unit
    }
  }
  return fallback > 0 ? fallback : 1
}

/** 注记文本：dotUnit（元，cost_ledger.amount 全链路是元）换算成可读金额（unit≥10000 显示「¥X万」，万元向上取整口径；否则直出元） */
export function formatCascadeUnitNote(unit: number): string {
  if (unit >= 10000) {
    return `一点 = ¥${Math.ceil(unit / 10000)}万`
  }
  return `一点 = ¥${Number.isInteger(unit) ? String(unit) : String(parseFloat(unit.toFixed(2)))}`
}

interface DotCascadeProps {
  /** 组件内按 value 升序重排 → 视觉级联攀升 */
  data: DotCascadeDatum[]
  /** 数值格式化由调用方注入 */
  formatValue: (n: number) => string
  /** 一点代表的数值；不传则由 pickCascadeUnit 自动选择 */
  dotUnit?: number
  /** 点数上限，默认 24（自动单位保证不超；显式传入 dotUnit 时由调用方负责比例真实） */
  maxDots?: number
  /** dark = 深色反色卡用（墨色取 var(--bg)），默认 light */
  tone?: 'light' | 'dark'
}

const DOT_SIZE = 7
const DOT_GAP = 3
const CAP_DOT_SIZE = 10

export const DotCascade: React.FC<DotCascadeProps> = ({
  data,
  formatValue,
  dotUnit,
  maxDots = 24,
  tone = 'light',
}) => {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const handle = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(handle)
  }, [])

  const ink = tone === 'dark' ? 'var(--bg)' : 'var(--fg)'
  // dark 卡上 muted 变量属于外层主题（对比度不足），反色卡内次级墨用主墨 60% 透明度（同 RungBars）
  const mutedInk = tone === 'dark' ? 'var(--bg)' : 'var(--muted)'
  const mutedOpacity = tone === 'dark' ? 0.6 : 1
  const subInk = tone === 'dark' ? 'var(--bg)' : 'var(--fg-2)'

  // max 守卫（同 RungBars）：取全量最大值，防调用方乱序 / 「其他」合并项溢出
  const max = data.length > 0 ? Math.max(...data.map((d) => d.value)) : 0
  const unit = dotUnit ?? pickCascadeUnit(max, maxDots)

  // 升序重排（并列按原始出现顺序，显式 tie-break）：首列 value 最小 → 视觉级联攀升
  const sorted = data
    .map((d, i) => ({ ...d, __i: i }))
    .sort((a, b) => (a.value - b.value) || (a.__i - b.__i))

  return (
    <div
      role="img"
      aria-label={`点阵级联 · ${formatCascadeUnitNote(unit)}`}
      className="flex flex-col"
      style={{ opacity: mounted ? 1 : 0, transition: 'opacity 0.5s ease' }}
    >
      <div className="flex items-end">
        {sorted.map((d, i) => {
          const dots = max > 0 && d.value > 0 ? Math.round(d.value / unit) : 0
          return (
            <div
              key={`${d.name}-${d.__i}`}
              data-cascade-col={i}
              className="flex-1 min-w-0 flex flex-col items-center"
            >
              {/* 列顶数值 */}
              <span
                className="font-mono text-caption tabular-nums whitespace-nowrap"
                style={{ color: ink }}
              >
                {formatValue(d.value)}
              </span>
              {/* 点串自下而上：列顶一颗实心大点，其下串点（0 值列不画点） */}
              {dots > 0 && (
                <>
                  <span
                    data-cascade-dot={dots - 1}
                    className="rounded-full shrink-0"
                    style={{ width: CAP_DOT_SIZE, height: CAP_DOT_SIZE, background: ink, marginTop: 4 }}
                  />
                  {dots > 1 && (
                    <div className="flex flex-col items-center" style={{ rowGap: DOT_GAP }}>
                      {Array.from({ length: dots - 1 }).map((_, j) => (
                        <span
                          key={j}
                          data-cascade-dot={dots - 2 - j}
                          className="rounded-full shrink-0"
                          style={{ width: DOT_SIZE, height: DOT_SIZE, background: subInk }}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
              {/* 底类目名 */}
              <span
                className="text-caption truncate w-full text-center"
                title={d.name}
                style={{ color: mutedInk, opacity: mutedOpacity, marginTop: 6 }}
              >
                {d.name}
              </span>
            </div>
          )
        })}
      </div>
      {/* 发丝基线 */}
      <div className="w-full" style={{ height: 1, background: 'var(--border)', marginTop: 6 }} />
      {/* 单位注记：把「一点 = 多少」印在图内 */}
      <p
        className="text-caption tracking-widest"
        style={{ color: mutedInk, opacity: mutedOpacity, marginTop: 6 }}
      >
        {formatCascadeUnitNote(unit)}
      </p>
    </div>
  )
}

export default DotCascade
