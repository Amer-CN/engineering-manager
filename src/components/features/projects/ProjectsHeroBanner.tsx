import React, { useState } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import { Icon } from '../../ui/Icon'
import { EASE_OUT } from '../../../constants/animations'

interface ProjectsHeroBannerProps {
  icon: string
  title: string
  subtitle: string
  metrics: { value: React.ReactNode; label: string; color?: string }[]
}

/** Bedrock 中性 hero —— 去渐变/去荧光点/去玻璃，全部走语义 token。 */
export function ProjectsHeroBanner({ icon, title, subtitle, metrics }: ProjectsHeroBannerProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE_OUT }}
      className="relative rounded-xl mb-6 p-6"
      style={{ background: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--fg)' }}
    >
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
        <div className="flex items-center gap-4">
          <motion.div whileHover={{ rotate: 6, scale: 1.05 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
            <Icon name={icon} size={28} />
          </motion.div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--fg)' }}>{title}</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{subtitle}</p>
          </div>
        </div>
        {metrics.length > 0 && (
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
            className="flex items-center gap-4 px-4 py-3 rounded-xl"
            style={{ background: 'var(--panel-2)', border: '1px solid var(--border)' }}>
            {metrics.map((m, i) => (
              <React.Fragment key={i}>
                {i > 0 && <div className="w-px h-10" style={{ background: 'var(--border)' }} />}
                <div className="text-center min-w-[48px]">
                  <p className="text-numeric-xl font-mono tabular-nums tracking-tight" style={{ color: 'var(--fg)' }}>{m.value}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{m.label}</p>
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

// 图标块统一走中性墨 token（在 Projects.tsx 内以 inline style 渲染），此处不再带彩色 bg。
export const KPI_CARDS = [
  { key: 'budget', label: '组合预算', icon: 'Wallet', color: '' },
  { key: 'staff', label: '在岗人员', icon: 'Users', color: '' },
  { key: 'settlements', label: '待办结算', icon: 'ClipboardList', color: '' },
  { key: 'invoices', label: '发票记录', icon: 'Receipt', color: '' },
]

export const CARD_HOVER = { y: -4, boxShadow: 'var(--shadow-lift)', transition: { duration: 0.2 } }
