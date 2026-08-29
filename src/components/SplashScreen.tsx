import React, { useEffect } from 'react'
import { motion } from 'framer-motion'

interface SplashScreenProps {
  onComplete: () => void
}

/**
 * S6 Stitch: 极简启动屏 — 暖白底+居中图标+品牌文字+加载点
 * 2.5s 后自动触发 onComplete
 */
const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2500)
    return () => clearTimeout(timer)
  }, [onComplete])

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        position: 'fixed', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg)',
        zIndex: 9999,
      }}
    >
      {/* Icon */}
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
        style={{ background: 'var(--panel-2)', border: '1px solid var(--border)' }}
      >
        <svg width="28" height="28" viewBox="0 0 18 18" fill="none">
          <defs><mask id="splash-mark-mask"><rect width="18" height="18" fill="white" /><path d="M5 14 L9 6 L13 14 Z" fill="black" /></mask></defs>
          <path d="M2 15.5 L9 2.5 L16 15.5 Z" fill="var(--brand)" strokeLinejoin="round" mask="url(#splash-mark-mask)" />
        </svg>
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold text-[color:var(--fg)] mb-1">工程管家</h1>
      <p className="text-sm font-mono text-[color:var(--muted)] tracking-wide">Bedrock Edition</p>

      {/* Loading dots */}
      <div className="absolute bottom-[15%] flex items-center gap-1.5">
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full bg-[color:var(--fg)]"
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
    </motion.div>
  )
}

export default SplashScreen
