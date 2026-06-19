import React from 'react'
import { motion } from 'framer-motion'

interface ButtonLoaderProps {
  /** 加载状态 */
  loading: boolean
  /** 加载时显示的文字 */
  loadingText?: string
  /** 正常状态的文字 */
  children: React.ReactNode
}

const ButtonLoader: React.FC<ButtonLoaderProps> = ({
  loading,
  loadingText = '处理中...',
  children,
}) => {
  if (!loading) return <>{children}</>

  return (
    <span className="inline-flex items-center gap-2">
      {/* 脉冲点 */}
      <span className="flex gap-0.5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
            className="w-1 h-1 rounded-full bg-current"
          />
        ))}
      </span>
      <span>{loadingText}</span>
    </span>
  )
}

export default ButtonLoader
