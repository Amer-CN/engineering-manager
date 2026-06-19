import { motion } from 'framer-motion'

interface Props {
  onClose: () => void
}

export default function CompleteStep({ onClose }: Props) {
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
      <div style={{ position: 'relative', marginBottom: 28 }}>
        <motion.div
          initial={{ scale: 0, opacity: 0.8 }}
          animate={{ scale: 2.5, opacity: 0 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          style={{
            position: 'absolute', top: '50%', left: '50%',
            width: 80, height: 80, transform: 'translate(-50%, -50%)',
            borderRadius: '50%', border: '2px solid #dc2626',
          }}
        />
        <motion.div
          initial={{ scale: 0, opacity: 0.5 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{ duration: 1, delay: 0.2, ease: 'easeOut' }}
          style={{
            position: 'absolute', top: '50%', left: '50%',
            width: 80, height: 80, transform: 'translate(-50%, -50%)',
            borderRadius: '50%', background: 'rgba(220,38,38,0.12)',
          }}
        />
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
        >
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: '#dc2626',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 30px rgba(220,38,38,0.2)',
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <motion.path
                d="M5 13l4 4L19 7"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              />
            </svg>
          </div>
        </motion.div>
      </div>

      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg)', marginBottom: 8 }}
      >
        卸载完成
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 40, textAlign: 'center' }}
      >
        工程管家已成功从您的电脑中移除
      </motion.p>

      <motion.button
        className="btn btn-ghost"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, type: 'spring', stiffness: 200, damping: 20 }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={onClose}
      >
        关闭
      </motion.button>
    </div>
  )
}
