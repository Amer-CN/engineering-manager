import React, { useEffect, useState } from 'react'

// RungBars — 编辑风梯级柱（「柱子是一把可以数上去的梯子」）
// 数据诚实：梯级数 = round(value / rungUnit)，一格就是一个真实可数单位；
// max 守卫同 EditorialBars（取全量最大值参与单位选择，防调用方乱序 / 「其他」合并项溢出）；
// rungUnit 不传时由确定性纯函数 pickRungUnit 在 1/2/5×10^k 候选里自动选择（无随机）；
// 梯级含义印在图内注记（「一梯级 = ¥N 万」，自动选单位同样印出）；
// 动画仅整列 opacity 淡入（克制，梯级逐条生长太花）。

export interface RungBarsDatum {
  name: string
  value: number
}

/** 纯函数（确定性，无随机）：在 1/2/5×10^k 升序候选中，选「使最高柱梯级数 round(max/unit) 落在 [12, maxRungs]」的最小单位；
 *  无候选命中时回退为「不超 maxRungs 的最小单位」（宁短勿溢）；maxValue ≤ 0 返回 1。组件与测试共用。 */
export function pickRungUnit(maxValue: number, maxRungs = 30): number {
  if (!(maxValue > 0)) return 1
  let fallback = -1
  for (let k = -4; k <= 15; k++) {
    const base = Math.pow(10, k)
    for (const mantissa of [1, 2, 5]) {
      const unit = mantissa * base
      const rungs = Math.round(maxValue / unit)
      if (rungs >= 12 && rungs <= maxRungs) return unit
      if (rungs <= maxRungs && fallback < 0) fallback = unit
    }
  }
  return fallback > 0 ? fallback : 1
}

/** 注记文本：rungUnit（元，cost_ledger.amount 全链路是元）换算成可读金额（≥1万元显示「万」，否则直出元） */
export function formatRungUnitNote(unit: number): string {
  if (unit >= 10000) {
    const wan = unit / 10000
    const label = Number.isInteger(wan) ? String(wan) : String(parseFloat(wan.toFixed(1)))
    return `一梯级 = ¥${label}万`
  }
  return `一梯级 = ¥${Number.isInteger(unit) ? String(unit) : String(parseFloat(unit.toFixed(2)))}`
}

interface RungBarsProps {
  /** 调用方已按降序排列；组件以全量最大值兜底（max 守卫） */
  data: RungBarsDatum[]
  /** 数值格式化由调用方注入（金额 formatMoney 等） */
  formatValue: (n: number) => string
  /** dark = 深色反色卡用（墨色取 var(--bg)），默认 light */
  tone?: 'light' | 'dark'
  /** 梯级数上限，默认 30（自动单位保证不超；显式传入 rungUnit 时由调用方负责比例真实） */
  maxRungs?: number
  /** 一个梯级代表的数值；不传则由 pickRungUnit 自动选择 */
  rungUnit?: number
}

const RUNG_HEIGHT = 2
const RUNG_GAP = 3
const BAR_WIDTH = 32
const COLUMN_GAP = 12

export const RungBars: React.FC<RungBarsProps> = ({
  data,
  formatValue,
  tone = 'light',
  maxRungs = 30,
  rungUnit,
}) => {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const handle = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(handle)
  }, [])

  // max 守卫（同 EditorialBars）：取全量最大值，防调用方乱序 / 「其他」合并项溢出
  const max = data.length > 0 ? Math.max(...data.map((d) => d.value)) : 0
  const unit = rungUnit ?? pickRungUnit(max, maxRungs)
  const ink = tone === 'dark' ? 'var(--bg)' : 'var(--fg)'
  // dark 卡上 muted 变量属于外层主题（对比度不足），反色卡内次级墨用主墨 60% 透明度
  const mutedInk = tone === 'dark' ? 'var(--bg)' : 'var(--muted)'
  const mutedOpacity = tone === 'dark' ? 0.6 : 1

  return (
    <div className="flex flex-col">
      <div className="flex items-end" style={{ columnGap: COLUMN_GAP }}>
        {data.map((d, i) => {
          const rungs = max > 0 && d.value > 0 ? Math.round(d.value / unit) : 0
          const isChampion = d.value === max
          return (
            <div
              key={`${d.name}-${i}`}
              data-rung-bar={i}
              className="flex flex-col items-center"
              style={{ width: BAR_WIDTH, opacity: mounted ? 1 : 0, transition: 'opacity 0.5s ease' }}
            >
              {/* 柱顶数值 */}
              <span className="font-mono font-bold text-sm tabular-nums" style={{ color: ink }}>
                {formatValue(d.value)}
              </span>
              {/* 梯级：冠军柱实心，其余 35% 透明度 */}
              <div className="flex flex-col items-center" style={{ rowGap: RUNG_GAP, marginTop: 6 }}>
                {Array.from({ length: rungs }).map((_, j) => (
                  <span
                    key={j}
                    data-rung={j}
                    className="shrink-0"
                    style={{ width: '100%', height: RUNG_HEIGHT, background: ink, opacity: isChampion ? 1 : 0.35 }}
                  />
                ))}
              </div>
              {/* 柱底类目名 */}
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
      {/* 梯级注记：把「一格 = 多少」印在图内 */}
      <p className="text-caption tracking-widest" style={{ color: mutedInk, opacity: mutedOpacity, marginTop: 6 }}>
        {formatRungUnitNote(unit)}
      </p>
    </div>
  )
}

export default RungBars
