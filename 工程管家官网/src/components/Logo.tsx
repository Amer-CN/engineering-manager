import { motion } from 'framer-motion'

interface Props {
  size?: number
  glow?: boolean
  spin?: boolean
}

export default function Logo({ size = 64, glow = false, spin = false }: Props) {
  return (
    <motion.div
      initial={{ scale: 0.3, opacity: 0 }}
      animate={{
        scale: 1,
        opacity: 1,
        rotate: spin ? 360 : 0,
      }}
      transition={
        spin
          ? { rotate: { duration: 20, repeat: Infinity, ease: 'linear' }, scale: { type: 'spring', stiffness: 200, damping: 20 } }
          : { type: 'spring', stiffness: 200, damping: 20, delay: 0.2 }
      }
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 18 18"
        fill="none"
        style={{
          filter: glow
            ? 'drop-shadow(0 0 12px var(--accent)) drop-shadow(0 0 24px var(--accent-soft))'
            : undefined,
        }}
      >
        <defs>
          <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="var(--accent-strong)" />
          </linearGradient>
          {/* mask: 白色=可见，黑色=透明 */}
          <mask id="logo-mask">
            <rect width="18" height="18" fill="white" />
            <path d="M5 14 L9 6 L13 14 Z" fill="black" />
          </mask>
        </defs>
        {/* 外三角 + mask 挖掉内三角 = 真正镂空 */}
        <path d="M2 15.5 L9 2.5 L16 15.5 Z" fill="url(#logo-grad)" mask="url(#logo-mask)" />
      </svg>
    </motion.div>
  )
}