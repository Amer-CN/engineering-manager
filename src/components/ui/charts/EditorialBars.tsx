import React, { useEffect, useState } from 'react'

// EditorialBars — 编辑风横向条形（纯 div，无 recharts）
// 数据诚实：条长与数值严格成正比（max = data[0].value），不断轴、不从零截断；
// 强调色只给第一名（accentFirst），其余中性墨色 var(--fg-2)；
// 数值常显就是编辑风原则：条尾等宽数字，无 hover 交互（元素数 < 50）。
// 入场动画：transform scaleX 0→1（transformOrigin left，600ms ease-out，rAF mounted 触发），无持续动画。

export interface EditorialBarsDatum {
  name: string
  value: number
  color?: string
}

interface EditorialBarsProps {
  /** 调用方已排好序（降序），data[0].value 作为满条基准 */
  data: EditorialBarsDatum[]
  /** 数值格式化由调用方注入（金额 formatMoney，计数可传 String） */
  formatValue: (n: number) => string
  /** 默认 true：第一条用 data[0].color 或 var(--accent)，其余 var(--fg-2) */
  accentFirst?: boolean
  /** 行间距 px，默认 10 */
  rowGap?: number
}

export const EditorialBars: React.FC<EditorialBarsProps> = ({
  data,
  formatValue,
  accentFirst = true,
  rowGap = 10,
}) => {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const handle = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(handle)
  }, [])

  // max 守卫：调用方可能把「其他」合并项追加在末尾（破坏降序契约），
  // 取全量最大值保证任何条 scaleX ≤ 1 不溢出轨道；「其他」保持末尾阅读顺序不变。
  const max = data.length > 0 ? Math.max(...data.map(d => d.value)) : 0

  return (
    <div className="flex flex-col" style={{ rowGap }}>
      {data.map((d, i) => {
        const isFirst = accentFirst && i === 0
        // 0 值与负值行条形宽 0，但名称与数值仍显示
        const scaleX = max > 0 && d.value > 0 ? d.value / max : 0
        return (
          <div key={`${d.name}-${i}`} className="flex items-center gap-2">
            <span className="text-caption truncate shrink-0" style={{ width: 88, color: 'var(--muted-2)' }} title={d.name}>
              {d.name}
            </span>
            {/* 条形轨道：高 12px，圆角 2px，发丝边框 */}
            <div className="flex-1 min-w-0" style={{ height: 12, borderRadius: 2, background: 'var(--panel-2)', border: '1px solid var(--border)' }}>
              <div
                data-bar={i}
                className="h-full"
                style={{
                  width: '100%',
                  borderRadius: 2,
                  transform: `scaleX(${mounted ? scaleX : 0})`,
                  transformOrigin: 'left',
                  transition: 'transform 0.6s var(--ease-out)',
                  background: isFirst ? d.color ?? 'var(--accent)' : 'var(--fg-2)',
                }}
              />
            </div>
            {/* 条尾等宽数值：第一名 var(--fg) 加粗，其余 var(--fg-2) */}
            <span
              className="font-mono text-caption tabular-nums shrink-0"
              style={{ color: isFirst ? 'var(--fg)' : 'var(--fg-2)', fontWeight: isFirst ? 700 : 400 }}
            >
              {formatValue(d.value)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default EditorialBars
