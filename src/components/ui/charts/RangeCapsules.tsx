import React, { useEffect, useState } from 'react'

// RangeCapsules — 编辑风范围胶囊（官方 Glance 系「范围胶囊」的合同回款适配版，图型库第 10 成员）
// 数据诚实：胶囊全长 = total（合同额），实心段自底部向上高 = filled/total（clamp 到 0..1，数据异常不爆版）；
// max 守卫取全量最大值（同 EditorialBars，防调用方乱序 / 末尾项溢出轨道）；
// 冠军不特殊化——语义是回款进度本身，实心段统一 var(--fg)；
// 胶囊 ≤ maxItems=8 根，全部顶部标数（不搞 TOP-N）；无 hover、无 Y 轴网格；
// 动画仅整卡 opacity 淡入；name 由 React 转义，无 script、无随机数。

export interface RangeCapsuleDatum {
  name: string
  /** 胶囊全长（合同额：finalAmount ?? amount；调用方已剔除 0 额并按 total 降序） */
  total: number
  /** 实心段（已回款：该合同 invoice_out 发票 receivedAmount 求和） */
  filled: number
}

interface RangeCapsulesProps {
  /** 调用方按 total 降序；max 守卫取全量最大值兜底 */
  data: RangeCapsuleDatum[]
  /** 数值格式化由调用方注入（金额 formatMoney 等） */
  formatValue: (n: number) => string
  /** 胶囊数上限，默认 8；超出裁剪 + 图例句追加「其余 N 份未列出」 */
  maxItems?: number
  /** 胶囊区可用高（px），默认 200；最长胶囊 = round(total/max × height) */
  height?: number
  /** 图例句，默认官方图例风格进度语义说明 */
  caption?: string
}

const CAPSULE_WIDTH = 28
const CAPSULE_RADIUS = 99
const COLUMN_GAP = 16
const DEFAULT_CAPTION = '胶囊全长 = 合同额 · 实心段 = 已回款 · 一眼见欠款'

export const RangeCapsules: React.FC<RangeCapsulesProps> = ({
  data,
  formatValue,
  maxItems = 8,
  height = 200,
  caption = DEFAULT_CAPTION,
}) => {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const handle = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(handle)
  }, [])

  // max 守卫（同 EditorialBars）：取全量最大值，任何胶囊高 ≤ height 不溢出
  const max = data.length > 0 ? Math.max(...data.map((d) => d.total)) : 0
  const shown = data.slice(0, maxItems)
  const hidden = data.length - shown.length
  const captionText = hidden > 0 ? `${caption} · 其余 ${hidden} 份未列出` : caption

  return (
    <div className="flex flex-col" style={{ opacity: mounted ? 1 : 0, transition: 'opacity 0.5s var(--ease-out)' }}>
      <div
        role="img"
        aria-label={`合同回款胶囊 · 共 ${data.length} 份合同`}
        className="flex items-end"
        style={{ columnGap: COLUMN_GAP }}
      >
        {shown.map((d, i) => {
          const capH = max > 0 && d.total > 0 ? Math.round((d.total / max) * height) : 0
          // filled 边界 clamp：0 ≤ filled/total ≤ 1（filled=0 纯轨道，=total 满胶囊）
          const ratio = d.total > 0 ? Math.max(0, Math.min(d.filled / d.total, 1)) : 0
          const fillH = Math.round(ratio * capH)
          return (
            <div key={`${d.name}-${i}`} className="flex flex-col items-center">
              {/* 顶部数值标注：全部标数（≤8 根），不搞 TOP-N */}
              <span className="font-mono font-bold text-caption tabular-nums whitespace-nowrap" style={{ color: 'var(--fg)' }}>
                {formatValue(d.total)}
              </span>
              {/* 胶囊本体：轨道 var(--panel-2) + 发丝边；实心段自底部向上（overflow hidden 保圆头） */}
              <div
                data-capsule={i}
                className="relative shrink-0"
                style={{
                  width: CAPSULE_WIDTH,
                  height: capH,
                  borderRadius: CAPSULE_RADIUS,
                  background: 'var(--panel-2)',
                  border: '1px solid var(--border)',
                  marginTop: 6,
                  overflow: 'hidden',
                }}
              >
                {fillH > 0 && (
                  <div
                    data-capsule-fill={i}
                    className="absolute bottom-0 left-0 right-0"
                    style={{ height: fillH, background: 'var(--fg)' }}
                  />
                )}
              </div>
              {/* 底部类目名：换行不截断（沿 RungBars 修复后的做法：leading-tight + break-all） */}
              <span className="text-caption w-full text-center leading-tight break-all" style={{ color: 'var(--muted)', marginTop: 6 }}>
                {d.name}
              </span>
            </div>
          )
        })}
      </div>
      {/* 发丝基线 */}
      <div className="w-full" style={{ height: 1, background: 'var(--border)', marginTop: 6 }} />
      {/* 图例句（官方 caption 风格）+ 截断注记 */}
      <p className="text-caption tracking-widest" style={{ color: 'var(--muted)', marginTop: 6 }}>
        {captionText}
      </p>
    </div>
  )
}

export default RangeCapsules
