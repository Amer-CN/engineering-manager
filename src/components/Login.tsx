import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import { Icon } from './ui/Icon'
// APP_VERSION 从 window.__APP_VERSION__ 读取（由 index.html 注入）

interface LoginProps { onLoginSuccess: () => void }

const stagger = { animate: { transition: { staggerChildren: 0.12 } } }
const fadeUp = { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } } }
const features = ['合同管理', '劳务管理', '财务管理']

interface LoginForm {
  username: string; password: string
  newPassword: string; confirmPassword: string
  showPassword: boolean
}

const initForm: LoginForm = { username: '', password: '', newPassword: '', confirmPassword: '', showPassword: false }

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const { login } = useAuth()
  const [form, setForm] = useState<LoginForm>(initForm)
  const [mustChangePwUser, setMustChangePwUser] = useState<{ userId: string; username: string } | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const update = (patch: Partial<LoginForm>) => setForm(prev => ({ ...prev, ...patch }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setLoading(true)
    if (!window.electronAPI?.login) {
      setError('系统错误：登录 API 未初始化'); setLoading(false); return
    }
    try {
      const result = await window.electronAPI.login(form.username, form.password)
      if (result.success && result.data) {
        if (result.data.mustChangePassword) {
          setMustChangePwUser({ userId: result.data.userId, username: result.data.username })
          setLoading(false)
          return
        }
        login(result.data)
      } else {
        setError(result.error || '用户名或密码错误')
      }
    } catch (err: any) { setError(err.message || '登录失败') }
    finally { setLoading(false) }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mustChangePwUser) return
    if (!form.newPassword || form.newPassword.length < 6) { setError('新密码至少需要 6 个字符'); return }
    if (form.newPassword !== form.confirmPassword) { setError('两次输入的密码不一致'); return }
    setLoading(true); setError('')
    try {
      const result = await window.electronAPI.updateUser(mustChangePwUser.userId, { password: form.newPassword })
      if (result.success) {
        const loginResult = await window.electronAPI.login(mustChangePwUser.username, form.newPassword)
        if (loginResult.success && loginResult.data) login(loginResult.data)
      } else { setError(result.error || '密码修改失败') }
    } catch (err: any) { setError(err.message || '密码修改失败') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 animate-fade-in" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        <div className="absolute w-64 h-64 rounded-full bg-white/5 blur-3xl animate-float-slow" />
        <div className="absolute w-48 h-48 rounded-full bg-slate-400/10 blur-3xl animate-float-slower" />
        <motion.div className="text-center relative z-10" variants={stagger as any} initial="initial" animate="animate">
          <motion.div variants={fadeUp as any} className="inline-flex items-center justify-center w-24 h-24 bg-white/10 backdrop-blur rounded-3xl mb-8 shadow-2xl border border-white/10" whileHover={{ scale: 1.05, rotate: 5 }} transition={{ type: 'spring', stiffness: 200, damping: 20 }}>
            <Icon name="HardHat" size={48} className="text-white" />
          </motion.div>
          <motion.h1 variants={fadeUp as any} className="text-4xl font-bold text-white mb-3">工程管家</motion.h1>
          <motion.p variants={fadeUp as any} className="text-slate-400 text-lg">工程项目管理系统 v{(window as any).__APP_VERSION__ || '0.57.0'}</motion.p>
          <motion.div variants={stagger as any} className="mt-12 flex items-center justify-center gap-8 text-slate-500 text-sm">
            {features.map((f, i) => (
              <motion.div key={f} variants={{ initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0, transition: { delay: 0.4 + i * 0.2, duration: 0.35 } } }} className="flex items-center gap-2 cursor-default">
                <Icon name="BadgeCheck" size={18} className="text-emerald-400" /><span>{f}</span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center bg-slate-50 p-8">
        <motion.div initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5, ease: 'easeOut' }} className="w-full max-w-sm">
          <div className="lg:hidden text-center mb-8">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }} className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 rounded-2xl mb-4 shadow-lg border border-white/10">
              <Icon name="HardHat" size={32} className="text-white" />
            </motion.div>
            <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="text-2xl font-bold text-slate-800 mb-1">工程管家</motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="text-slate-500 text-sm">工程项目管理系统</motion.p>
          </div>

          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.5, ease: 'easeOut' }} whileHover={{ y: -2, boxShadow: '0 20px 40px -10px rgba(0,0,0,0.12)' }} className="bg-white rounded-2xl shadow-card p-8 transition-shadow duration-300">
            {mustChangePwUser ? (
              <>
                <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xl font-semibold text-slate-800 mb-2">首次登录 - 修改密码</motion.h2>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-amber-600 mb-6">为保障安全，请设置一个新密码（至少 6 个字符）</motion.p>
                <form onSubmit={handleChangePassword} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">新密码</label>
                    <div className="relative">
                      <Icon name="Lock" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="password" value={form.newPassword} onChange={e => update({ newPassword: e.target.value })} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all" placeholder="请输入新密码（至少6个字符）" required autoFocus minLength={6} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">确认密码</label>
                    <div className="relative">
                      <Icon name="Lock" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="password" value={form.confirmPassword} onChange={e => update({ confirmPassword: e.target.value })} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all" placeholder="请再次输入新密码" required minLength={6} />
                    </div>
                  </div>
                  <AnimatePresence>
                    {error && (
                      <motion.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm">
                        <Icon name="AlertCircle" size={16} className="flex-shrink-0" /><span>{error}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <button type="submit" disabled={loading} className="w-full py-3 bg-primary-600 hover:bg-primary-500 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-500/25 flex items-center justify-center gap-2">
                    {loading ? <><Icon name="Loader2" size={18} className="animate-spin" /><span>修改中...</span></> : '修改密码并登录'}
                  </button>
                </form>
              </>
            ) : (
              <>
                <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }} className="text-xl font-semibold text-slate-800 mb-6">用户登录</motion.h2>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}>
                    <label className="block text-sm font-medium text-slate-700 mb-2">用户名</label>
                    <div className="relative">
                      <Icon name="UserCircle" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="text" value={form.username} onChange={e => update({ username: e.target.value })} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all" placeholder="请输入用户名" required autoFocus />
                    </div>
                  </motion.div>
                  <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 }}>
                    <label className="block text-sm font-medium text-slate-700 mb-2">密码</label>
                    <div className="relative">
                      <Icon name="Lock" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type={form.showPassword ? 'text' : 'password'} value={form.password} onChange={e => update({ password: e.target.value })} className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all" placeholder="请输入密码" required />
                      <motion.button type="button" whileTap={{ scale: 0.85 }} onClick={() => update({ showPassword: !form.showPassword })} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors" title={form.showPassword ? '隐藏密码' : '显示密码'}>
                        <Icon name={form.showPassword ? 'EyeOff' : 'Eye'} size={18} />
                      </motion.button>
                    </div>
                  </motion.div>
                  <AnimatePresence>
                    {error && (
                      <motion.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1, x: [0, -5, 5, -3, 3, 0] }} transition={{ x: { duration: 0.4 } }} exit={{ opacity: 0, scale: 0.95 }} className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm">
                        <Icon name="AlertCircle" size={16} className="flex-shrink-0" /><span>{error}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.02, boxShadow: '0 8px 25px rgba(37, 99, 235, 0.35)' }} whileTap={{ scale: 0.97 }} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="w-full py-3 bg-primary-600 hover:bg-primary-500 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-500/25 flex items-center justify-center gap-2">
                    {loading ? <><Icon name="Loader2" size={18} className="animate-spin" /><span>登录中...</span></> : '登 录'}
                  </motion.button>
                </form>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="mt-6 pt-6 border-t border-slate-100">
                  <p className="text-center text-slate-400 text-xs">首次使用请参考安装说明创建管理员账号</p>
                </motion.div>
              </>
            )}
          </motion.div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }} className="text-center text-slate-400 text-sm mt-6">v{(window as any).__APP_VERSION__ || '0.57.0'} - 工程管理系统</motion.p>
        </motion.div>
      </div>
    </div>
  )
}

export default Login
