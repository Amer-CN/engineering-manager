import React from 'react'
import { Icon } from './Icon'

export interface StatCardProps {
  /** Lucide 图标名称 */
  icon?: string
  /** 图标背景色类（可选，默认走 --accent-soft token） */
  iconBg?: string
  /** 标签文字（显示在数值上方） */
  label: string
  /** 主数值 */
  value: React.ReactNode
  /** 数值下方的小字说明 */
  sub?: string
  /** 数值颜色类（可选，默认走 --fg token） */
  valueColor?: string
  /** 趋势指示 */
  trend?: { value: number; isUp: boolean }
  /** 尺寸 */
  size?: 'sm' | 'md'
  /** 额外 className */
  className?: string
}

const StatCard: React.FC<StatCardProps> = ({
  icon,
  iconBg = '',
  label,
  value,
  sub,
  valueColor = '',
  trend,
  size = 'md',
  className = '',
}) => {
  const padding = size === 'sm' ? 'p-3' : 'p-4'
  const iconSize = size === 'sm' ? 'w-7 h-7 rounded-lg' : 'w-10 h-10 rounded-xl'
  const iconFontSize = size === 'sm' ? 16 : 20
  const valueSize = size === 'sm' ? 'text-lg font-bold font-mono tabular-nums tracking-tight' : 'text-numeric-xl font-mono tabular-nums tracking-tight'

  const labelEl = <p className="text-micro font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--muted)' }}>{label}</p>
  const valueEl = (
    <p
      className={`${valueSize} truncate font-mono tabular-nums tracking-tight ${valueColor}`}
      style={valueColor ? undefined : { color: 'var(--fg)' }}
      title={typeof value === 'string' ? value : undefined}
    >{value}</p>
  )
  const trendEl = trend && (
    <span className="text-xs font-medium" style={{ color: trend.isUp ? 'var(--success)' : 'var(--danger)' }}>
      {trend.isUp ? '↑' : '↓'}{Math.abs(trend.value)}%
    </span>
  )
  const subEl = sub && <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{sub}</p>

  return (
    <div
      className={`rounded-xl shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 min-w-0 ${padding} ${className}`}
      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
    >
      {icon ? (
        <div className="flex items-center gap-3 mb-2">
          <div
            className={`${iconSize} flex items-center justify-center shrink-0 ${iconBg}`}
            style={iconBg ? undefined : { background: 'var(--accent-soft)', color: 'var(--accent)' }}
          >
            <Icon name={icon} size={iconFontSize} />
          </div>
          <div className="min-w-0 flex-1">
            {labelEl}
            <div className="flex items-baseline gap-2">
              {valueEl}
              {trendEl}
            </div>
            {subEl}
          </div>
        </div>
      ) : (
        <>
          {labelEl}
          <div className="flex items-baseline gap-2 mt-1">
            {valueEl}
            {trendEl}
          </div>
          {subEl}
        </>
      )}
    </div>
  )
}

export default StatCard
