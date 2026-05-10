import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import { Icon } from './ui/Icon'

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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/95 backdrop-blur-md"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full max-w-sm mx-4"
      >
        {/* Avatar + Name */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
            className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-white text-3xl font-semibold shadow-2xl shadow-black/30 mb-4"
          >
            {userInitial}
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-xl font-semibold text-white">{currentUser?.displayName || currentUser?.username}</h2>
            <p className="text-slate-400 text-sm mt-1">{currentUser?.roleName || currentUser?.roleId}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="mt-6"
          >
            <Icon name="Lock" size={28} className="mx-auto text-slate-500" />
            <p className="text-slate-500 text-sm mt-2">屏幕已锁定</p>
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
          <div className="relative">
            <Icon name="Lock" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 transition-all"
              placeholder="请输入密码解锁"
              required
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-300 transition-colors"
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
                className="flex items-center gap-2 text-red-400 text-sm justify-center"
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
            className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
