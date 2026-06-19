import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Logo from './Logo'

interface Props {
  onUninstall: (path: string) => void
}

export default function ConfirmStep({ onUninstall }: Props) {
  const [installPath, setInstallPath] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    ;(window as any).__setInstallPath = (p: string) => {
      setInstallPath(p)
    }
    return () => { delete (window as any).__setInstallPath }
  }, [])

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      position: 'relative',
      zIndex: 1,
      padding: '48px 36px',
    }}>
      <motion.div
        initial={{ scale: 0.3, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        style={{ marginBottom: 24 }}
      >
        <Logo size={56} />
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{ fontSize: 20, fontWeight: 600, color: 'var(--fg)', marginBottom: 8 }}
      >
        卸载工程管家
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24, textAlign: 'center', lineHeight: 1.6 }}
      >
        卸载将移除程序文件和快捷方式<br />
        您的数据将完整保留在原位置
      </motion.p>

      {installPath && (
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{ width: '100%', maxWidth: 360, marginBottom: 16 }}
        >
          <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
            安装路径
          </label>
          <div style={{ fontSize: 12, color: 'var(--fg-2)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
            {installPath}
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 14px', borderRadius: 8,
          background: 'rgba(22, 163, 74, 0.06)',
          border: '1px solid rgba(22, 163, 74, 0.2)',
          marginBottom: 24, width: '100%', maxWidth: 360,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
          <path d="M9 12l2 2 4-4"/>
        </svg>
        <span style={{ fontSize: 12, color: '#16a34a' }}>
          用户数据不受影响，可随时重新安装使用
        </span>
      </motion.div>

      {showConfirm && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'rgba(220, 38, 38, 0.08)',
            border: '1px solid rgba(220, 38, 38, 0.3)',
            borderRadius: 8,
            padding: '12px 20px',
            marginBottom: 24,
            width: '100%',
            maxWidth: 360,
            textAlign: 'center',
          }}
        >
          <span style={{ fontSize: 13, color: '#dc2626', fontWeight: 500 }}>
            ⚠️ 确定要卸载工程管家吗？
          </span>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        style={{ display: 'flex', gap: 12, marginTop: 16 }}
      >
        {!showConfirm ? (
          <motion.button
            className="btn btn-danger"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowConfirm(true)}
            style={{ padding: '10px 32px' }}
          >
            卸载
          </motion.button>
        ) : (
          <>
            <motion.button
              className="btn btn-ghost"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowConfirm(false)}
            >
              取消
            </motion.button>
            <motion.button
              className="btn btn-danger"
              whileHover={{ scale: 1.03, boxShadow: '0 0 20px rgba(220,38,38,0.3)' }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onUninstall(installPath)}
              style={{ padding: '10px 32px' }}
            >
              确认卸载
            </motion.button>
          </>
        )}
      </motion.div>
    </div>
  )
}
