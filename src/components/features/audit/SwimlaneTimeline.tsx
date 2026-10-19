import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Icon } from '@/components/ui/Icon'
import { EmptyState } from '@/components/ui/EmptyState'
import {
  buildBlocks,
  computeWindow,
  blockRect,
  type SwimlaneLogLike,
  type SwimlaneBlock,
} from './swimlaneMath'

/**
 * 操作日志泳道时间轴
 *
 * 泳道 = 业务模块，横向 = 时间，块 = 该模块在一小时桶内的操作聚合。
 * 时间窗与刻度算法见 ./swimlaneMath.ts（借鉴 scaffold-master Swimlane 的对齐思路）。
 *
 * 约定（src/components/AGENTS.md）：
 * - 只动 transform / opacity；块生长用 clipPath，不用 scale（避免文字变形）
 * - spring stiffness ≤ 200
 * - 字号只用 text-caption / text-micro
 * - 图标只用 <Icon name="X" />
 */

export interface SwimlaneTimelineProps<T extends SwimlaneLogLike = SwimlaneLogLike> {
  logs: T[]
  /** resource 原值 → 中文名；缺失时回落为原值 */
  laneLabels?: Record<string, string>
  /** 点击某个块 */
  onSelectBlock?: (block: SwimlaneBlock<T>) => void
  className?: string
}

/** 每小时刻度标签：只显示时:分 */
function formatTick(t: number): string {
  const d = new Date(t)
  return `${String(d.getHours()).padStart(2, '0')}:00`
}

function formatClock(t: number): string {
  const d = new Date(t)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}

/**
 * 块的配面色。
 *
 * 注意：Tailwind 的 `/12` 透明度修饰符对 `bg-[color:var(--x)]` 这类 var() 任意值
 * 不生效（实测会渲染成透明），因此显式用 color-mix() 自行混合。
 */
const LEVEL_STYLE: Record<
  SwimlaneBlock['level'],
  { bg: string; ring: string; label: string }
> = {
  info: {
    bg: 'bg-[color-mix(in_srgb,var(--accent)_14%,transparent)]',
    ring: 'border-[color-mix(in_srgb,var(--accent)_40%,transparent)]',
    label: '正常',
  },
  warning: {
    bg: 'bg-[color-mix(in_srgb,var(--warning)_14%,transparent)]',
    ring: 'border-[color-mix(in_srgb,var(--warning)_55%,transparent)]',
    label: '警告',
  },
  error: {
    bg: 'bg-[color-mix(in_srgb,var(--danger)_18%,transparent)]',
    ring: 'border-[color:var(--danger)]',
    label: '错误',
  },
}

export const SwimlaneTimeline = <T extends SwimlaneLogLike = SwimlaneLogLike>({
  logs,
  laneLabels = {},
  onSelectBlock,
  className = '',
}: SwimlaneTimelineProps<T>) => {
  const reduceMotion = useReducedMotion()

  // 「现在」线每秒推进；页面隐藏时停表（参考实现的同类保护）
  const [now, setNow] = useState(() => Date.now())
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    const tick = () => {
      if (typeof document !== 'undefined' && document.hidden) return
      setNow(Date.now())
    }
    timerRef.current = window.setInterval(tick, 1000)
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current)
    }
  }, [])

  // 窗口依赖 now（「末条早于当前」时要把窗口补到当前），刻度因此随之推进
  const win = useMemo(() => computeWindow(logs, now), [logs, now])

  // 聚合只依赖数据：不放进上面那个 memo，否则每秒都会重建全部块对象
  const { lanes, blocksByLane } = useMemo(() => {
    const { lanes: laneKeys, blocks } = buildBlocks<T>(logs)
    const grouped = new Map<string, SwimlaneBlock<T>[]>()
    for (const lane of laneKeys) grouped.set(lane, [])
    for (const b of blocks) grouped.get(b.lane)!.push(b)
    return { lanes: laneKeys, blocksByLane: grouped }
  }, [logs])

  if (logs.length === 0) {
    return (
      <EmptyState
        icon="Activity"
        title="暂无操作记录"
        description="当前筛选条件下没有可绘制的时间轴数据"
        className={className}
      />
    )
  }

  const nowPercent =
    now >= win.start && now <= win.end
      ? ((now - win.start) / (win.end - win.start)) * 100
      : null

  return (
    <div className={className}>
      {/* 刻度标尺 */}
      <div className="flex items-end gap-3 mb-2">
        <div className="w-28 shrink-0" />
        <div className="relative flex-1 h-5 border-b border-[color:var(--border)]">
          {win.ticks.map((t, i) => {
            const left = ((t - win.start) / (win.end - win.start)) * 100
            // 刻度过密时隔一个显示，避免标签重叠
            const dense = win.ticks.length > 8
            if (dense && i % 2 === 1 && i !== win.ticks.length - 1) return null
            return (
              <div
                key={t}
                className="absolute bottom-0 flex flex-col items-center"
                style={{ left: `${left}%`, transform: 'translateX(-50%)' }}
              >
                <span className="text-caption text-[color:var(--muted)] whitespace-nowrap">
                  {formatTick(t)}
                </span>
                <span className="w-px h-1 bg-[color:var(--border-strong)]" />
              </div>
            )
          })}
        </div>
      </div>

      {/* 泳道 */}
      <div className="space-y-1.5">
        {lanes.map((lane) => {
          const laneBlocks = blocksByLane.get(lane) ?? []
          const label = laneLabels[lane] || lane
          return (
            <div key={lane} className="flex items-center gap-3 group">
              <div className="w-28 shrink-0 flex items-center justify-end gap-1.5">
                <span className="text-caption text-[color:var(--fg-2)] truncate" title={label}>
                  {label}
                </span>
                <span className="text-micro text-[color:var(--muted)] tabular-nums">
                  {laneBlocks.reduce((n, b) => n + b.count, 0)}
                </span>
              </div>

              <div className="relative flex-1 h-9 rounded-md bg-[color:var(--panel-2)]/40 overflow-hidden">
                {/* 纵向网格线 */}
                {win.ticks.map((t) => {
                  const left = ((t - win.start) / (win.end - win.start)) * 100
                  return (
                    <span
                      key={t}
                      className="absolute top-0 bottom-0 w-px bg-[color:var(--border)]/60"
                      style={{ left: `${left}%` }}
                    />
                  )
                })}

                {/* 块 */}
                {laneBlocks.map((b) => {
                  const { left, width } = blockRect(b, win)
                  const style = LEVEL_STYLE[b.level]
                  const isWarning = b.level === 'warning'
                  return (
                    <motion.button
                      key={`${b.lane}-${b.start}-${b.logs[0]?.id ?? ''}`}
                      type="button"
                      onClick={() => onSelectBlock?.(b)}
                      title={`${label} · ${formatClock(b.start)} · ${b.count} 次 · ${style.label}`}
                      aria-label={`${label} ${formatClock(b.start)} 起，${b.count} 次操作，${style.label}`}
                      className={`absolute top-1 bottom-1 rounded border ${style.ring} ${style.bg} ${
                        isWarning ? 'border-dashed' : ''
                      } hover:z-10 focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--accent)]`}
                      style={{
                        left: `${left}%`,
                        width: `${width}%`,
                        minWidth: 8,
                        // 警告用斜线填充：不只靠颜色表达状态
                        backgroundImage: isWarning
                          ? 'repeating-linear-gradient(135deg, var(--warning) 0 1.5px, transparent 1.5px 6px)'
                          : undefined,
                        clipPath: 'inset(0 0 0 0)',
                      }}
                      initial={reduceMotion ? false : { opacity: 0, clipPath: 'inset(0 100% 0 0)' }}
                      animate={{ opacity: 1, clipPath: 'inset(0 0 0 0)' }}
                      transition={
                        reduceMotion
                          ? { duration: 0 }
                          : { duration: 0.42, ease: [0.16, 1, 0.3, 1], delay: Math.min(0.4, left / 250) }
                      }
                    >
                      {b.count > 1 && (
                        <span className="absolute inset-0 flex items-center justify-center text-micro text-[color:var(--fg-2)] tabular-nums pointer-events-none">
                          {b.count}
                        </span>
                      )}
                    </motion.button>
                  )
                })}

                {/* 「现在」线 */}
                {nowPercent !== null && (
                  <span
                    className="absolute top-0 bottom-0 w-px bg-[color:var(--accent)] pointer-events-none"
                    style={{ left: `${nowPercent}%` }}
                  >
                    {/* 圆点整体留在泳道内，避免被容器的 overflow-hidden 裁成半圆 */}
                    <span className="absolute top-0.5 -left-[3px] w-[7px] h-[7px] rounded-full bg-[color:var(--accent)]" />
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* 图例 + 说明 */}
      <div className="flex items-center justify-between gap-4 mt-3 pt-3 border-t border-[color:var(--border)]">
        <div className="flex items-center gap-4 text-caption text-[color:var(--muted)]">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-2 rounded-sm bg-[color:var(--accent-soft)] border border-[color:var(--accent)]/30" />
            正常
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="w-3 h-2 rounded-sm border border-dashed border-[color:var(--warning)]/50"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(135deg, var(--warning) 0 1.5px, transparent 1.5px 6px)',
              }}
            />
            警告
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-2 rounded-sm bg-[color:var(--danger-soft)] border border-[color:var(--danger)]" />
            错误
          </span>
        </div>
        <span className="text-caption text-[color:var(--muted)] flex items-center gap-1">
          <Icon name="Clock" size={12} />
          现在 {formatClock(now)}
        </span>
      </div>
    </div>
  )
}

export default SwimlaneTimeline
