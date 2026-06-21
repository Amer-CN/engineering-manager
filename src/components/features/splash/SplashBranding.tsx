import React from 'react'
import { motion } from 'framer-motion'
import { logoVariants, charVariants, dotVariants } from './splashConstants'

const brandChars = '工程管家'.split('')

interface SplashBrandingProps {
  accentColor: string
}

const SplashBranding: React.FC<SplashBrandingProps> = ({ accentColor }) => {
  return (
    <>
      {/* Logo */}
      <motion.div
        variants={logoVariants}
        initial="hidden"
        animate="visible"
        style={{ marginBottom: 20 }}
      >
        <svg width="56" height="56" viewBox="0 0 18 18" fill="none">
          <defs>
            <linearGradient id="splash-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={accentColor} />
              <stop offset="100%" stopColor={accentColor} stopOpacity="0.6" />
            </linearGradient>
            <mask id="splash-mask"><rect width="18" height="18" fill="white" /><path d="M5 14 L9 6 L13 14 Z" fill="black" /></mask>
          </defs>
          <motion.path
            d="M2 15.5 L9 2.5 L16 15.5 Z"
            fill="url(#splash-grad)"
            mask="url(#splash-mask)"
            animate={{
              filter: [
                'drop-shadow(0 0 8px rgba(255,255,255,0.3))',
                'drop-shadow(0 0 16px rgba(255,255,255,0.5))',
                'drop-shadow(0 0 8px rgba(255,255,255,0.3))',
              ],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        </svg>
      </motion.div>

      {/* 品牌名称 */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        {brandChars.map((char, i) => (
          <motion.span
            key={i}
            custom={i}
            variants={charVariants}
            initial="hidden"
            animate="visible"
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: accentColor,
              letterSpacing: '0.08em',
            }}
          >
            {char}
          </motion.span>
        ))}
      </div>

      {/* 副标题 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
        style={{
          fontSize: 11,
          color: accentColor,
          opacity: 0.6,
          letterSpacing: '0.15em',
          marginBottom: 28,
        }}
      >
        Engineering Manager
      </motion.div>

      {/* 加载指示器 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        style={{ display: 'flex', gap: 8, alignItems: 'center' }}
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            custom={i}
            animate="pulse"
            variants={dotVariants}
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: accentColor,
            }}
          />
        ))}
      </motion.div>

      {/* 底部进度条 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        style={{
          position: 'absolute',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 120,
          height: 2,
          borderRadius: 1,
          background: `${accentColor}20`,
          overflow: 'hidden',
        }}
      >
        <motion.div
          initial={{ x: '-100%' }}
          animate={{ x: '100%' }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{
            width: '60%',
            height: '100%',
            background: accentColor,
            borderRadius: 1,
          }}
        />
      </motion.div>
    </>
  )
}

export default SplashBranding
