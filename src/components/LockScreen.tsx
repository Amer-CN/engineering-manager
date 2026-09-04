import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import { Icon } from './ui/Icon'
import { EASE_OUT } from '../constants/animations'

const LockScreen: React.FC = () => {
  const { currentUser, unlock } = useAuth()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password) return
    setError('')
    setLoading(true)
    const username = currentUser?.username || ''
    const success = await unlock(username, password)
    if (!success) {
      setError('密码错误，请重试')
      setPassword('')
    }
    setLoading(false)
  }

  const userInitial = currentUser?.displayName?.charAt(0) || currentUser?.username?.charAt(0) || 'A'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: 'var(--bg)' }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3, ease: EASE_OUT }}
        className="w-full max-w-sm mx-4 relative z-10"
      >
        {/* Avatar + Name */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
            className="w-20 h-20 mx-auto rounded-full flex items-center justify-center text-3xl font-semibold shadow-lg mb-4"
            style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
          >
            {userInitial}
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>
              系统已锁定
            </h2>
            <p className="text-sm mt-1 flex items-center justify-center gap-1" style={{ color: 'var(--muted)' }}>
              <Icon name="UserCircle" size={14} />
              {currentUser?.roleName || currentUser?.roleId} - {currentUser?.displayName || currentUser?.username}
            </p>
          </motion.div>
        </div>

        {/* Password form */}
        <motion.form
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onSubmit={handleUnlock}
          className="space-y-4"
        >
          <div className="relative group">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-[var(--accent)]" style={{ color: 'var(--muted)' }}>
              <Icon name="Lock" size={18} />
            </div>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full pl-10 pr-12 py-3 rounded-xl transition-[box-shadow,border-color] duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 ${showPassword ? '' : 'password-mask'}`}
              style={{
                background: 'var(--panel)',
                border: '1px solid var(--border)',
                color: 'var(--fg)',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
              placeholder="请输入密码解锁"
              required
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              data-lpignore="true"
              data-1p-ignore
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 transition-transform duration-200 hover:scale-110"
              style={{ color: 'var(--muted)' }}
            >
              <Icon name={showPassword ? 'EyeOff' : 'Eye'} size={18} />
            </button>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1, x: [0, -5, 5, -3, 3, 0] }}
                transition={{ x: { duration: 0.4 } }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center gap-2 text-sm justify-center"
                style={{ color: 'var(--danger)' }}
              >
                <Icon name="AlertCircle" size={16} />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="w-full py-3 font-medium rounded-xl transition-[opacity,box-shadow] duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-[var(--accent)]/20"
            style={{
              background: 'var(--accent)',
              color: 'var(--bg)',
              border: 'none',
            }}
          >
            {loading ? (
              <>
                <Icon name="Loader2" size={16} className="animate-spin" />
                <span>验证中...</span>
              </>
            ) : (
              '解 锁'
            )}
          </motion.button>
        </motion.form>
      </motion.div>
    </motion.div>
  )
}

export default LockScreen
