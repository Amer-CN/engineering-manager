import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type Tab = 'about' | 'log'

interface Props {
  onClose: () => void
}

export default function SettingsModal({ onClose }: Props) {
  const [tab, setTab] = useState<Tab>('about')
  const [logContent, setLogContent] = useState('')
  const [copied, setCopied] = useState(false)
  const logRef = useRef<HTMLPreElement>(null)

  useEffect(() => {
    ;(window as any).__setLogContent = (content: string) => {
      setLogContent(content)
    }
    return () => { delete (window as any).__setLogContent }
  }, [])

  // 切换到日志 Tab 时请求 C# 发送日志内容
  useEffect(() => {
    if (tab === 'log') {
      ;(window as any).chrome?.webview?.postMessage(JSON.stringify({ action: 'getLog' }))
    }
  }, [tab])

  // 自动滚动到底部
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [logContent])

  const handleCopy = () => {
    navigator.clipboard.writeText(logContent).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 500,
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 400, height: 420,
          background: 'var(--panel)',
          borderRadius: 12,
          border: '1px solid var(--border)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header + Tabs */}
        <div style={{ borderBottom: '1px solid var(--border)', padding: '12px 16px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)' }}>设置</span>
            <button
              onClick={onClose}
              style={{
                width: 24, height: 24, borderRadius: '50%',
                border: '1px solid var(--border)', background: 'transparent',
                color: 'var(--muted)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12,
              }}
            >✕</button>
          </div>

          {/* Tab 栏 */}
          <div style={{ display: 'flex', gap: 0 }}>
            {([
              { id: 'about' as Tab, label: '关于' },
              { id: 'log' as Tab, label: '安装日志' },
            ]).map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: '8px 16px',
                  fontSize: 13, fontWeight: tab === t.id ? 600 : 400,
                  color: tab === t.id ? 'var(--accent)' : 'var(--muted)',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: 16, minHeight: 320 }}>
          <AnimatePresence mode="wait">
            {tab === 'about' && (
              <motion.div
                key="about"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}
              >
                {/* Logo */}
                <svg width="48" height="48" viewBox="0 0 18 18" fill="none">
                  <defs>
                    <linearGradient id="settings-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="var(--accent)" />
                      <stop offset="100%" stopColor="var(--accent-strong)" />
                    </linearGradient>
                    <mask id="settings-mask">
                      <rect width="18" height="18" fill="white" />
                      <path d="M5 14 L9 6 L13 14 Z" fill="black" />
                    </mask>
                  </defs>
                  <path d="M2 15.5 L9 2.5 L16 15.5 Z" fill="url(#settings-grad)" mask="url(#settings-mask)" />
                </svg>

                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg)' }}>工程管家</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Engineering Manager</div>
                </div>

                <div style={{
                  padding: '4px 12px', borderRadius: 12,
                  background: 'var(--accent-soft)', color: 'var(--accent)',
                  fontSize: 12, fontWeight: 600,
                }}>
                  v0.72.0
                </div>

                {/* 技术栈 */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 4 }}>
                  {['.NET 8', 'React 18', 'SQLite', 'WebView2', 'TypeScript', 'TailwindCSS'].map((tag) => (
                    <span key={tag} style={{
                      padding: '3px 8px', borderRadius: 6,
                      background: 'var(--bg-2)', color: 'var(--fg-2)',
                      fontSize: 11, border: '1px solid var(--border)',
                    }}>
                      {tag}
                    </span>
                  ))}
                </div>

                {/* 说明 */}
                <div style={{
                  fontSize: 12, color: 'var(--muted)', textAlign: 'center',
                  lineHeight: 1.6, marginTop: 8,
                }}>
                  一站式工程项目管理解决方案<br />
                  管理人员档案 · 发票 · 合同 · 结算 · 成本
                </div>
              </motion.div>
            )}

            {tab === 'log' && (
              <motion.div
                key="log"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%' }}
              >
                {/* 操作栏 */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button
                    onClick={() => {
                      ;(window as any).chrome?.webview?.postMessage(JSON.stringify({ action: 'getLog' }))
                    }}
                    style={{
                      padding: '4px 10px', fontSize: 11, borderRadius: 6,
                      border: '1px solid var(--border)', background: 'transparent',
                      color: 'var(--fg-2)', cursor: 'pointer',
                    }}
                  >
                    刷新
                  </button>
                  <button
                    onClick={handleCopy}
                    style={{
                      padding: '4px 10px', fontSize: 11, borderRadius: 6,
                      border: '1px solid var(--border)', background: 'transparent',
                      color: copied ? 'var(--success)' : 'var(--fg-2)',
                      cursor: 'pointer',
                    }}
                  >
                    {copied ? '✓ 已复制' : '复制'}
                  </button>
                </div>

                {/* 日志内容 */}
                <pre
                  ref={logRef}
                  style={{
                    flex: 1, maxHeight: 340,
                    padding: 10, borderRadius: 8,
                    background: 'var(--bg-2)',
                    border: '1px solid var(--border)',
                    fontSize: 11, lineHeight: 1.6,
                    fontFamily: "'Cascadia Code', 'Fira Code', monospace",
                    color: 'var(--fg-2)',
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    margin: 0,
                  }}
                >
                  {logContent || '暂无日志'}
                </pre>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  )
}
