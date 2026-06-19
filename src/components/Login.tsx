import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import { Icon } from './ui/Icon'
import { getAPI } from '@/services/api-adapter'
import LoginSettingsPage from './LoginSettingsModal'

/** 不同主题的交互参数 — 差异化设计 */
const THEME_INTERACTION = {
  white: {
    hoverScale: 1.12,
    tapScale: 0.88,
    transition: { type: 'spring' as const, stiffness: 400, damping: 20 },
  },
  graphite: {
    hoverScale: 1.15,
    tapScale: 0.85,
    transition: { type: 'spring' as const, stiffness: 500, damping: 15 },
  },
  sandstone: {
    hoverScale: 1.08,
    tapScale: 0.92,
    transition: { type: 'spring' as const, stiffness: 300, damping: 25 },
  },
}

interface LoginProps { onLoginSuccess: () => void }

const CRED_KEY = 'login-remembered'
const AUTO_KEY = 'login-auto'

function loadSaved() {
  try {
    const raw = localStorage.getItem(CRED_KEY)
    if (!raw) return { username: '', password: '' }
    const d = JSON.parse(atob(raw))
    return { username: d.u || '', password: d.p || '' }
  } catch { return { username: '', password: '' } }
}
function saveCred(u: string, p: string) { localStorage.setItem(CRED_KEY, btoa(JSON.stringify({ u, p }))) }
function clearCred() { localStorage.removeItem(CRED_KEY) }

const Login: React.FC<LoginProps> = () => {
  const { login } = useAuth()
  const { scheme } = useTheme()
  const interaction = useMemo(() => THEME_INTERACTION[scheme], [scheme])
  const saved = useRef(loadSaved())
  const [username, setUsername] = useState(saved.current.username)
  const [password, setPassword] = useState(saved.current.password)
  const [showPw, setShowPw] = useState(false)
  const [remember, setRemember] = useState(!!saved.current.username)
  const [autoLogin, setAutoLogin] = useState(() => localStorage.getItem(AUTO_KEY) === 'true')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const minimize = useCallback(async () => { (await getAPI()).minimizeWindow?.() }, [])
  const close = useCallback(async () => { (await getAPI()).closeWindow?.() }, [])

  // 鼠标按下时通知 C# 端开始拖动（WebView2 环境）
  const handleTitleBarMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    if (target.closest('button')) return

    const webview = (window as any).chrome?.webview
    if (webview) {
      webview.postMessage(JSON.stringify({ action: 'startDrag' }))
    }
  }, [])

  useEffect(() => { (async () => { (await getAPI()).resizeForLogin?.() })() }, [])

  useEffect(() => { localStorage.setItem(AUTO_KEY, String(autoLogin)) }, [autoLogin])
  useEffect(() => { if (autoLogin && saved.current.username && saved.current.password) doLogin(saved.current.username, saved.current.password) }, [])

  const doLogin = async (u: string, p: string) => {
    setError(''); setLoading(true)
    try {
      const api = await getAPI()
      if (!api?.login) { setError('系统错误'); setLoading(false); return }
      const result = await api.login(u, p)
      if (result.success && result.data) {
        if (remember) saveCred(u, p); else clearCred()
        login(result.data)
      } else { setError(result.error || '用户名或密码错误') }
    } catch (err: any) { setError(err.message || '登录失败') }
    finally { setLoading(false) }
  }

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); doLogin(username, password) }

  return (
    <div style={{
      background: 'var(--bg-2)',
      width: '100vw', height: '100vh',
      display: 'flex', flexDirection: 'column',
      fontFamily: "'Noto Sans SC', 'Source Han Sans SC', 'Microsoft YaHei', sans-serif",
    }}>
      {/* ── 标题栏 ── */}
      <div style={{ height: 28, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', padding: '0 4px', flexShrink: 0 } as React.CSSProperties} onMouseDown={handleTitleBarMouseDown}>
        <div style={{ display: 'flex' } as React.CSSProperties}>
          {[{ icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.48a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>, action: () => setShowSettings(true) },
            { icon: <svg width="10" height="1" viewBox="0 0 10 1"><rect width="10" height="1" fill="currentColor" /></svg>, action: minimize },
            { icon: <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"><line x1="2" y1="2" x2="8" y2="8" /><line x1="8" y1="2" x2="2" y2="8" /></svg>, action: close, hoverBg: 'var(--danger)', hoverColor: '#fff' }
          ].map((btn, i) => (
            <motion.button key={i} onClick={btn.action}
              whileHover={{ scale: interaction.hoverScale }}
              whileTap={{ scale: interaction.tapScale }}
              transition={interaction.transition}
              style={{ width: 36, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted)', borderRadius: 4 }}
              onMouseEnter={e => { e.currentTarget.style.background = btn.hoverBg || 'var(--panel-2)'; if (btn.hoverColor) e.currentTarget.style.color = btn.hoverColor }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted)' }}>
              {btn.icon}
            </motion.button>
          ))}
        </div>
      </div>

      {/* ── 内容 ── */}
      {showSettings ? (
        <LoginSettingsPage onBack={() => setShowSettings(false)} />
      ) : (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 24px 20px' }}>
        {/* Logo */}
        <svg width="48" height="48" viewBox="0 0 18 18" fill="none" style={{ marginBottom: 14, flexShrink: 0 }}>
          <defs><linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="var(--accent)" /><stop offset="100%" stopColor="var(--violet)" /></linearGradient><mask id="lg-mask"><rect width="18" height="18" fill="white" /><path d="M5 14 L9 6 L13 14 Z" fill="black" /></mask></defs>
          <path d="M2 15.5 L9 2.5 L16 15.5 Z" fill="url(#lg)" mask="url(#lg-mask)" />
        </svg>

        {/* 表单 */}
        <form onSubmit={handleSubmit} style={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="用户名" required autoFocus
            style={{ width: '100%', padding: '7px 10px', fontSize: 13, borderRadius: 8, outline: 'none', marginBottom: 6, boxSizing: 'border-box', background: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--fg)' }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)' }} />

          <div style={{ position: 'relative', width: '100%', marginBottom: 10 }}>
            <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="密码" required
              style={{ width: '100%', padding: '7px 30px 7px 10px', fontSize: 13, borderRadius: 8, outline: 'none', boxSizing: 'border-box', background: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--fg)' }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)' }} />
            <button type="button" onClick={() => setShowPw(!showPw)}
              style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--muted)', display: 'flex' }}>
              <Icon name={showPw ? 'EyeOff' : 'Eye'} size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 11, color: 'var(--fg-2)' }}>
              <input type="checkbox" checked={remember} onChange={e => { setRemember(e.target.checked); if (!e.target.checked) { setAutoLogin(false); clearCred() } }}
                style={{ width: 12, height: 12, accentColor: 'var(--accent)', margin: 0 }} />记住密码
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 11, color: 'var(--fg-2)' }}>
              <input type="checkbox" checked={autoLogin} onChange={e => { setAutoLogin(e.target.checked); if (e.target.checked) setRemember(true) }}
                style={{ width: 12, height: 12, accentColor: 'var(--accent)', margin: 0 }} />自动登录
            </label>
          </div>

          {error && (
            <div style={{ padding: '5px 8px', borderRadius: 6, fontSize: 11, marginBottom: 10, background: 'var(--danger-soft)', color: 'var(--danger)' }}>
              {error}
            </div>
          )}

          <div style={{ marginTop: 'auto' }}>
            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: '8px 0', fontSize: 13, fontWeight: 600, borderRadius: 8, border: 'none', cursor: loading ? 'wait' : 'pointer', background: 'var(--accent)', color: 'var(--bg)', letterSpacing: '0.04em', opacity: loading ? 0.7 : 1, transition: 'opacity 0.1s' }}>
              {loading ? '登录中...' : '登 录'}
            </button>
          </div>
        </form>

        <div style={{ fontSize: 10, color: 'var(--muted-2)', marginTop: 8, flexShrink: 0 }}>
          v{(window as any).__APP_VERSION__ || '0.79.0'}
        </div>
      </div>
      )}

    </div>
  )
}

export default Login
