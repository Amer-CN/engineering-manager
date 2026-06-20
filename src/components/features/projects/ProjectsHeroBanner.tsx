import React, { useState } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import { Icon } from '../../ui/Icon'

interface ProjectsHeroBannerProps {
  icon: string
  title: string
  subtitle: string
  metrics: { value: React.ReactNode; label: string; color: string }[]
}

export function ProjectsHeroBanner({ icon, title, subtitle, metrics }: ProjectsHeroBannerProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-2xl mb-6 bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 text-white p-6"
    >
      <div className="hero-overlay absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.1),transparent_50%)]" />
      <motion.div className="absolute top-3 right-12 w-1 h-1 rounded-full bg-emerald-400"
        animate={{ opacity: [0, 1, 0], scale: [0.5, 2, 0.5] }}
        transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3 }} />
      <motion.div className="absolute bottom-4 right-24 w-1.5 h-1.5 rounded-full bg-blue-400"
        animate={{ opacity: [0, 1, 0], scale: [0.5, 1.8, 0.5] }}
        transition={{ duration: 3, repeat: Infinity, repeatDelay: 4, delay: 1 }} />
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
        <div className="flex items-center gap-4">
          <motion.div whileHover={{ rotate: 12, scale: 1.08 }} transition={{ type: 'spring', stiffness: 300, damping: 15 }}
            className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
            <Icon name={icon} size={28} />
          </motion.div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            <p className="text-white/50 text-sm mt-1">{subtitle}</p>
          </div>
        </div>
        {metrics.length > 0 && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
            className="flex items-center gap-4 p-4 rounded-xl bg-white/10">
            {metrics.map((m, i) => (
              <React.Fragment key={i}>
                {i > 0 && <div className="w-px h-10 bg-white/20" />}
                <div className="text-center min-w-[48px]">
                  <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
                  <p className={`text-xs ${m.color}/70`}>{m.label}</p>
                </div>
              </React.Fragment>
            ))}
          </motion.div>
        )}
      </div>
    </motion.section>
  )
}

export function CountUp({ value, suffix = '', prefix = '', decimals = 0 }: {
  value: number; suffix?: string; prefix?: string; decimals?: number
}) {
  const motionVal = useMotionValue(0)
  const springVal = useSpring(motionVal, { stiffness: 250, damping: 35 })
  const [display, setDisplay] = useState('0')
  React.useEffect(() => { motionVal.set(value) }, [value])
  React.useEffect(() => {
    const unsub = springVal.on('change', (latest) => {
      setDisplay(prefix + Number(latest).toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + suffix)
    })
    return () => unsub()
  }, [springVal, prefix, suffix, decimals])
  return <span>{display}</span>
}

export const KPI_CARDS = [
  { key: 'budget', label: '组合预算', icon: 'DollarSign', color: 'bg-amber-50 text-amber-600' },
  { key: 'staff', label: '在岗人员', icon: 'Users', color: 'bg-violet-50 text-violet-600' },
  { key: 'settlements', label: '待办结算', icon: 'ClipboardList', color: 'bg-amber-50 text-amber-600' },
  { key: 'invoices', label: '发票记录', icon: 'Receipt', color: 'bg-teal-50 text-teal-600' },
]

export const CARD_HOVER = { y: -4, boxShadow: '0 12px 30px rgba(0,0,0,0.1)', transition: { duration: 0.2 } }
