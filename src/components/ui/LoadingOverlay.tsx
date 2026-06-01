import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface LoadingOverlayProps {
  /** 是否显示 */
  visible: boolean
  /** 加载提示文字 */
  message?: string
  /** 是否全屏遮罩 */
  fullscreen?: boolean
  /** 背景模糊 */
  blur?: boolean
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  message = '处理中...',
  fullscreen = false,
  blur = true,
}) => {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={`
            flex flex-col items-center justify-center gap-3 z-50
            ${fullscreen ? 'fixed inset-0' : 'absolute inset-0 rounded-xl'}
          `}
          style={{
            background: fullscreen ? 'var(--overlay)' : 'var(--card)',
            backdropFilter: blur ? 'blur(8px)' : 'none',
          }}
        >
          {/* Logo 脉冲 */}
          <motion.div
            animate={{
              scale: [1, 1.08, 1],
              opacity: [0.6, 1, 0.6],
            }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          >
            <svg width="36" height="36" viewBox="0 0 18 18" fill="none">
              <defs>
                <linearGradient id="overlay-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--accent)" />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.6" />
                </linearGradient>
              </defs>
              <path d="M2 15.5 L9 2.5 L16 15.5 Z" fill="url(#overlay-grad)" />
              <path d="M5 14 L9 6 L13 14 Z" fill={fullscreen ? 'rgba(0,0,0,0.5)' : 'var(--card)'} />
            </svg>
          </motion.div>

          {/* 脉冲点 */}
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

          {/* 提示文字 */}
          {message && (
            <motion.p
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-sm"
              style={{ color: fullscreen ? '#fff' : 'var(--fg-2)' }}
            >
              {message}
            </motion.p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default LoadingOverlay
