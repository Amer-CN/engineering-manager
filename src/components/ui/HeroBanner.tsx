import React from 'react'
import { motion } from 'framer-motion'
import { sectionVariant } from '@/constants/animations'

export interface HeroBannerMetric {
  value: React.ReactNode
  label: string
  color?: string
}

interface HeroBannerProps {
  /** 保留以兼容旧调用方；Stitch 干净页头不再渲染图标 */
  icon?: string
  title: string
  subtitle?: string
  metrics?: HeroBannerMetric[]
  /** 保留以兼容调用方；Bedrock 中性方案下不再用于配色 */
  accentColor?: 'emerald' | 'amber' | 'blue'
  className?: string
  children?: React.ReactNode
}

/**
 * Bedrock HeroBanner —— 对齐 Stitch 的干净页头：大号标题 + 副标，无盒子 / 无图标块。
 * 可选 metrics 以无框内联小列展示；icon / accentColor 仅为兼容旧调用方而保留，不再渲染。
 */
const HeroBanner: React.FC<HeroBannerProps> = ({
  title,
  subtitle,
  metrics = [],
  className = '',
  children,
}) => {
  return (
    <motion.section
      variants={sectionVariant}
      className={`mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between ${className}`}
    >
      <div>
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--fg)' }}>{title}</h1>
        {subtitle && <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{subtitle}</p>}
      </div>
      {metrics.length > 0 && (
        <div className="flex items-center gap-4">
          {metrics.map((m, i) => (
            <React.Fragment key={i}>
              {i > 0 && <div className="w-px h-10" style={{ background: 'var(--border)' }} />}
              <div className="text-center min-w-[48px]">
                <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--fg)' }}>{m.value}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{m.label}</p>
              </div>
            </React.Fragment>
          ))}
        </div>
      )}
      {children}
    </motion.section>
  )
}

export default HeroBanner
