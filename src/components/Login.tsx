import React, { useReducer, useCallback, useEffect, useRef, useMemo } from 'react'
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

const CRED_KEY = 'login-remembered-user'
const AUTO_KEY = 'login-auto'

// P0-4: 只记住用户名,绝不存密码到 localStorage (Base64 不是加密,DevTools 可一键解码)。
// "记住密码"复选框语义改为"记住用户名"。
function loadSaved(): string {
  try {
    return localStorage.getItem(CRED_KEY) || ''
  } catch { return '' }
}
function saveUser(u: string) { localStorage.setItem(CRED_KEY, u) }
function clearUser() { localStorage.removeItem(CRED_KEY) }

interface LoginState {
  username: string
  password: string
  remember: boolean
  autoLogin: boolean
  showPw: boolean
  showSettings: boolean
  loading: boolean
  error: string
}

type LoginAction =
  | { type: 'SET_CREDENTIALS'; field: 'username' | 'password'; value: string }
  | { type: 'TOGGLE_REMEMBER'; value: boolean }
  | { type: 'TOGGLE_AUTO_LOGIN'; value: boolean }
  | { type: 'TOGGLE_SHOW_PW' }
  | { type: 'TOGGLE_SETTINGS' }
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS' }
  | { type: 'LOGIN_ERROR'; error: string }
  | { type: 'LOGIN_RESET' }

function loginReducer(state: LoginState, action: LoginAction): LoginState {
  switch (action.type) {
    case 'SET_CREDENTIALS':
      return { ...state, [action.field]: action.value }
    case 'TOGGLE_REMEMBER':
      return { ...state, remember: action.value }
    case 'TOGGLE_AUTO_LOGIN':
      return { ...state, autoLogin: action.value }
    case 'TOGGLE_SHOW_PW':
      return { ...state, showPw: !state.showPw }
    case 'TOGGLE_SETTINGS':
      return { ...state, showSettings: !state.showSettings }
    case 'LOGIN_START':
      return { ...state, loading: true, error: '' }
    case 'LOGIN_SUCCESS':
      return { ...state, loading: false }
    case 'LOGIN_ERROR':
      return { ...state, loading: false, error: action.error }
    case 'LOGIN_RESET':
      return { ...state, error: '' }
  }
}

const Login: React.FC<LoginProps> = () => {
  const { login } = useAuth()
  const { scheme } = useTheme()
  const interaction = useMemo(() => THEME_INTERACTION[scheme], [scheme])
  const savedUser = useRef(loadSaved())
  const [state, dispatch] = useReducer(loginReducer, {
    username: savedUser.current,
    password: '',
    showPw: false,
    remember: !!savedUser.current,
    autoLogin: false,
    error: '',
    loading: false,
    showSettings: false,
  })

  const minimize = useCallback(async () => { (await getAPI()).minimizeWindow?.() }, [])
  const close = useCallback(async () => { (await getAPI()).closeWindow?.() }, [])

  // 鼠标按下时通知 C# 端开始拖动（WebView2 环境）
  const handleTitleBarMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    if (target.closest('button')) return

    const webview = window.chrome?.webview
    if (webview) {
      webview.postMessage(JSON.stringify({ action: 'startDrag' }))
    }
  }, [])

  useEffect(() => { (async () => { (await getAPI()).resizeForLogin?.() })() }, [])

  // P0-4: 取消"自动登录"功能。原逻辑会用 localStorage 中明文密码自动重登,存在安全隐患。
  // 安全改造后只记住用户名,用户仍需手动输入密码。autoLogin 状态保留以兼容旧 UI 但不再触发自动登录。
  useEffect(() => { localStorage.setItem(AUTO_KEY, String(state.autoLogin)) }, [state.autoLogin])

  const doLogin = async (u: string, p: string) => {
    dispatch({ type: 'LOGIN_START' })
    try {
      const api = await getAPI()
      if (!api?.login) { dispatch({ type: 'LOGIN_ERROR', error: '系统错误' }); return }
      const result = await api.login(u, p)
      if (result.success && result.data) {
        if (state.remember) saveUser(u); else clearUser()
        login(result.data)
      } else { dispatch({ type: 'LOGIN_ERROR', error: result.error || '用户名或密码错误' }) }
    } catch (err: unknown) { dispatch({ type: 'LOGIN_ERROR', error: err instanceof Error ? err.message : '登录失败' }) }
    finally { dispatch({ type: 'LOGIN_SUCCESS' }) }
  }

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); doLogin(state.username, state.password) }

  return (
    <div style={{
      background: 'var(--bg-2)',
      width: '100vw', height: '100vh',
      display: 'flex', flexDirection: 'column',
      fontFamily: "Inter, 'Noto Sans SC', 'Source Han Sans SC', 'Microsoft YaHei', sans-serif",
    }}>
      {/* ── 标题栏 ── */}
      <div style={{ height: 28, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', padding: '0 4px', flexShrink: 0 } as React.CSSProperties} onMouseDown={handleTitleBarMouseDown}>
        <div style={{ display: 'flex' } as React.CSSProperties}>
          {[{ icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.48a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>, action: () => dispatch({ type: 'TOGGLE_SETTINGS' }) },
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
      {state.showSettings ? (
        <LoginSettingsPage onBack={() => dispatch({ type: 'TOGGLE_SETTINGS' })} />
      ) : (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 24px 20px' }}>
        {/* Logo */}
        <div style={{ width: 48, height: 48, marginBottom: 10, flexShrink: 0 }}>
          <svg width="48" height="48" viewBox="0 0 18 18" fill="none">
            <defs><mask id="login-mark-mask"><rect width="18" height="18" fill="white" /><path d="M5 14 L9 6 L13 14 Z" fill="black" /></mask></defs>
            <path d="M2 15.5 L9 2.5 L16 15.5 Z" fill="var(--brand)" strokeLinejoin="round" mask="url(#login-mark-mask)" />
          </svg>
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--fg)', marginBottom: 2 }}>工程管家</h2>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>工程项目管理系统</p>

        {/* 表单 */}
        <form onSubmit={handleSubmit} style={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <input type="text" value={state.username} onChange={e => dispatch({ type: 'SET_CREDENTIALS', field: 'username', value: e.target.value })} placeholder="用户名" required autoFocus
            style={{ width: '100%', padding: '7px 10px', fontSize: 13, borderRadius: 8, outline: 'none', marginBottom: 6, boxSizing: 'border-box', background: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--fg)' }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)' }} />

          <div style={{ position: 'relative', width: '100%', marginBottom: 10 }}>
            <input type={state.showPw ? 'text' : 'password'} value={state.password} onChange={e => dispatch({ type: 'SET_CREDENTIALS', field: 'password', value: e.target.value })} placeholder="密码" required
              style={{ width: '100%', padding: '7px 30px 7px 10px', fontSize: 13, borderRadius: 8, outline: 'none', boxSizing: 'border-box', background: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--fg)' }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)' }} />
            <button type="button" onClick={() => dispatch({ type: 'TOGGLE_SHOW_PW' })}
              style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--muted)', display: 'flex' }}>
              <Icon name={state.showPw ? 'EyeOff' : 'Eye'} size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 11, color: 'var(--fg-2)' }}>
              <input type="checkbox" checked={state.remember} onChange={e => { dispatch({ type: 'TOGGLE_REMEMBER', value: e.target.checked }); if (!e.target.checked) { clearUser() } }}
                style={{ width: 12, height: 12, accentColor: 'var(--accent)', margin: 0 }} />记住用户名
            </label>
          </div>

          {state.error && (
            <div style={{ padding: '5px 8px', borderRadius: 6, fontSize: 11, marginBottom: 10, background: 'var(--danger-soft)', color: 'var(--danger)' }}>
              {state.error}
            </div>
          )}

          <div style={{ marginTop: 'auto' }}>
            <button type="submit" disabled={state.loading}
              style={{ width: '100%', padding: '8px 0', fontSize: 13, fontWeight: 600, borderRadius: 8, border: 'none', cursor: state.loading ? 'wait' : 'pointer', background: 'var(--accent)', color: 'var(--on-accent)', letterSpacing: '0.04em', opacity: state.loading ? 0.7 : 1, transition: 'opacity 0.1s' }}>
              {state.loading ? '登录中...' : '登 录'}
            </button>
          </div>
        </form>

        <div style={{ fontSize: 10, color: 'var(--muted-2)', marginTop: 8, flexShrink: 0 }}>
          v{__APP_VERSION__ || '0.94.0'}
        </div>
      </div>
      )}

    </div>
  )
}

export default Login

