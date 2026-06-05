import { motion } from 'framer-motion'
import Logo from './Logo'

const brandChars = '工程管家'.split('')

const charVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.8 + i * 0.1, duration: 0.3 },
  }),
}

const dotVariants = {
  pulse: (i: number) => ({
    scale: [1, 1.4, 1],
    opacity: [0.4, 1, 0.4],
    transition: { duration: 1.2, repeat: Infinity, delay: i * 0.2 },
  }),
}

interface Props {
  onBegin: () => void
  version: string
}

export default function WelcomeStep({ onBegin, version }: Props) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      position: 'relative',
      zIndex: 1,
    }}>
      {/* Logo */}
      <div style={{ marginBottom: 24 }}>
        <Logo size={72} glow />
      </div>

      {/* 品牌名 */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        {brandChars.map((char, i) => (
          <motion.span
            key={i}
            custom={i}
            variants={charVariants}
            initial="hidden"
            animate="visible"
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: 'var(--accent)',
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
        transition={{ delay: 1.2, duration: 0.5 }}
        style={{
          fontSize: 13,
          color: 'var(--muted)',
          letterSpacing: '0.15em',
          marginBottom: 12,
        }}
      >
        Engineering Manager
      </motion.div>

      {/* 版本号 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ delay: 1.4 }}
        style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 40 }}
      >
        v{version}
      </motion.div>

      {/* 脉冲点 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        style={{ display: 'flex', gap: 8, marginBottom: 48 }}
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            custom={i}
            animate="pulse"
            variants={dotVariants}
            style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--accent)',
            }}
          />
        ))}
      </motion.div>

      {/* 开始安装按钮 */}
      <motion.button
        className="btn btn-primary"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.8, type: 'spring', stiffness: 200, damping: 20 }}
        whileHover={{ scale: 1.03, boxShadow: '0 0 24px var(--accent-soft)' }}
        whileTap={{ scale: 0.97 }}
        onClick={onBegin}
        style={{ padding: '12px 48px', fontSize: 15 }}
      >
        开始安装
      </motion.button>
    </div>
  )
}
