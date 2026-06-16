import React from 'react'
import { Icon } from './Icon'

export interface StatCardProps {
  /** Lucide 图标名称 */
  icon?: string
  /** 图标左侧彩色背景块的颜色类 */
  iconBg?: string
  /** 标签文字（显示在数值上方） */
  label: string
  /** 主数值 */
  value: React.ReactNode
  /** 数值下方的小字说明 */
  sub?: string
  /** 数值颜色类（默认 text-slate-800） */
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
  iconBg = 'bg-slate-100',
  label,
  value,
  sub,
  valueColor = 'text-slate-800',
  trend,
  size = 'md',
  className = '',
}) => {
  const padding = size === 'sm' ? 'p-3' : 'p-4'
  const iconSize = size === 'sm' ? 'w-7 h-7 rounded-lg' : 'w-10 h-10 rounded-xl'
  const iconFontSize = size === 'sm' ? 16 : 20
  const valueSize = size === 'sm' ? 'text-lg font-bold' : 'text-2xl font-bold'
  const labelSize = size === 'sm' ? 'text-xs text-slate-400' : 'text-xs text-slate-400'

  return (
    <div className={`bg-white border border-slate-200 rounded-xl shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 min-w-0 ${padding} ${className}`}>
      {icon && (
        <div className="flex items-center gap-3 mb-2">
          <div className={`${iconSize} flex items-center justify-center ${iconBg} shrink-0`}>
            <Icon name={icon} size={iconFontSize} />
          </div>
          <div className="min-w-0 flex-1">
            <p className={labelSize}>{label}</p>
            <div className="flex items-baseline gap-2">
              <p className={`${valueSize} ${valueColor} truncate`} title={typeof value === 'string' ? value : undefined}>{value}</p>
              {trend && (
                <span className={`text-xs font-medium ${trend.isUp ? 'text-emerald-500' : 'text-red-500'}`}>
                  {trend.isUp ? '↑' : '↓'}{Math.abs(trend.value)}%
                </span>
              )}
            </div>
            {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
          </div>
        </div>
      )}
      {!icon && (
        <>
          <p className={labelSize}>{label}</p>
          <div className="flex items-baseline gap-2 mt-1">
            <p className={`${valueSize} ${valueColor} truncate`} title={typeof value === 'string' ? value : undefined}>{value}</p>
            {trend && (
              <span className={`text-xs font-medium ${trend.isUp ? 'text-emerald-500' : 'text-red-500'}`}>
                {trend.isUp ? '↑' : '↓'}{Math.abs(trend.value)}%
              </span>
            )}
          </div>
          {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
        </>
      )}
    </div>
  )
}

export default StatCard