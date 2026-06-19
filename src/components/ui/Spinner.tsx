import React from 'react'
import { motion } from 'framer-motion'

interface SpinnerProps {
  /** 尺寸：sm(24px) / md(36px) / lg(48px) */
  size?: 'sm' | 'md' | 'lg'
  /** 是否居中显示 */
  centered?: boolean
  /** 提示文字 */
  text?: string
}

const SIZES = {
  sm: 24,
  md: 36,
  lg: 48,
}

const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  centered = true,
  text,
}) => {
  const px = SIZES[size]

  const content = (
    <div className="flex flex-col items-center gap-3">
      <motion.div
        animate={{
          scale: [1, 1.08, 1],
          opacity: [0.5, 1, 0.5],
        }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <svg width={px} height={px} viewBox="0 0 18 18" fill="none">
          <defs>
            <linearGradient id={`spinner-grad-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--accent)" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.6" />
            </linearGradient>
            <mask id={`spinner-mask-${size}`}><rect width="18" height="18" fill="white" /><path d="M5 14 L9 6 L13 14 Z" fill="black" /></mask>
          </defs>
          <path d="M2 15.5 L9 2.5 L16 15.5 Z" fill={`url(#spinner-grad-${size})`} mask={`url(#spinner-mask-${size})`} />
        </svg>
      </motion.div>
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ scale: [1, 1.3, 1], opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: 'var(--accent)' }}
          />
        ))}
      </div>
      {text && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm"
          style={{ color: 'var(--fg-2)' }}
        >
          {text}
        </motion.p>
      )}
    </div>
  )

  if (centered) {
    return (
      <div className="flex items-center justify-center py-12" style={{ background: 'var(--bg)' }}>
        {content}
      </div>
    )
  }

  return content
}

export default Spinner
