import React from 'react'
import { motion } from 'framer-motion'
import { Icon } from './Icon'
import { sectionVariant } from '@/constants/animations'

export interface HeroBannerMetric {
  value: React.ReactNode
  label: string
  color?: string
}

interface HeroBannerProps {
  icon: string
  title: string
  subtitle?: string
  metrics?: HeroBannerMetric[]
  accentColor?: 'emerald' | 'amber' | 'blue'
  className?: string
  children?: React.ReactNode
}

const accentConfig = {
  emerald: { overlay: 'rgba(16,185,129,0.1)', dot1: 'bg-emerald-400', dot2: 'bg-blue-400' },
  amber: { overlay: 'rgba(251,146,60,0.1)', dot1: 'bg-amber-400', dot2: 'bg-orange-400' },
  blue: { overlay: 'rgba(59,130,246,0.1)', dot1: 'bg-blue-400', dot2: 'bg-indigo-400' },
}

const HeroBanner: React.FC<HeroBannerProps> = ({
  icon,
  title,
  subtitle,
  metrics = [],
  accentColor = 'emerald',
  className = '',
  children,
}) => {
  const ac = accentConfig[accentColor]

  return (
    <motion.section
      variants={sectionVariant}
      className={`relative overflow-hidden rounded-2xl mb-6 bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 text-white p-6 ${className}`}
    >
      <div
        className="hero-overlay absolute inset-0"
        style={{ background: `radial-gradient(ellipse at top right, ${ac.overlay}, transparent 50%)` }}
      />
      <motion.div
        className={`absolute top-3 right-12 w-1 h-1 rounded-full ${ac.dot1}`}
        animate={{ opacity: [0, 1, 0], scale: [0.5, 2, 0.5] }}
        transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3 }}
      />
      <motion.div
        className={`absolute bottom-4 right-24 w-1.5 h-1.5 rounded-full ${ac.dot2}`}
        animate={{ opacity: [0, 1, 0], scale: [0.5, 1.8, 0.5] }}
        transition={{ duration: 3, repeat: Infinity, repeatDelay: 4, delay: 1 }}
      />
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
        <div className="flex items-center gap-4">
          <motion.div
            whileHover={{ rotate: 12, scale: 1.08 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
            className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center"
          >
            <Icon name={icon} size={28} />
          </motion.div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            {subtitle && <p className="text-white/50 text-sm mt-1">{subtitle}</p>}
          </div>
        </div>
        {metrics.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-4 p-4 rounded-xl bg-white/10"
          >
            {metrics.map((m, i) => (
              <React.Fragment key={i}>
                {i > 0 && <div className="w-px h-10 bg-white/20" />}
                <div className="text-center min-w-[48px]">
                  <p className={`text-2xl font-bold ${m.color || 'text-white'}`}>{m.value}</p>
                  <p className={`text-xs ${(m.color || 'text-white').replace(/text-/, 'text-').replace(/\d+/, '')}70`}>{m.label}</p>
                </div>
              </React.Fragment>
            ))}
          </motion.div>
        )}
        {children}
      </div>
    </motion.section>
  )
}

export default HeroBanner