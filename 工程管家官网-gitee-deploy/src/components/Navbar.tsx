import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Palette } from 'lucide-react'
import { useThemeContext } from '../contexts/ThemeContext'
import type { ThemeId } from '../contexts/ThemeContext'
import Logo from './Logo'

const navLinks = [
  { label: '功能特性', href: '#features' },
  { label: '软件截图', href: '#gallery' },
  { label: '下载', href: '#download' },
]

const themeIcons: Record<ThemeId, string> = {
  white: '☀️',
  graphite: '🌙',
  sandstone: '🌅',
}

const themeLabels: Record<ThemeId, string> = {
  white: '皓白',
  graphite: '石墨',
  sandstone: '砂岩',
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [themeOpen, setThemeOpen] = useState(false)
  const { theme, setTheme } = useThemeContext()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Logo 组件自动适配主题（CSS 变量）

  return (
    <motion.header
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 120, damping: 20 }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        height: 64,
        display: 'flex',
        alignItems: 'center',
        transition: 'background 0.3s ease, backdrop-filter 0.3s ease, border-color 0.3s ease',
        background: scrolled ? 'var(--bg-card)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid var(--border)' : '1px solid transparent',
      }}
    >
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Logo */}
        <a href="#" style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 20, fontWeight: 700, color: 'var(--text)', textDecoration: 'none' }}>
          <Logo size={28} />
          工程管家
        </a>

        {/* 桌面导航 */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          {navLinks.map(link => (
            <a
              key={link.href}
              href={link.href}
              style={{
                color: 'var(--text-secondary)',
                fontSize: 14,
                fontWeight: 500,
                transition: 'color 0.2s',
                textDecoration: 'none',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
            >
              {link.label}
            </a>
          ))}

          {/* 主题切换 */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setThemeOpen(!themeOpen)}
              onMouseEnter={() => setThemeOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--text-secondary)',
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <Palette size={14} />
              <span>{themeLabels[theme]}</span>
              <span style={{ fontSize: 12 }}>{themeIcons[theme]}</span>
            </button>

            <AnimatePresence>
              {themeOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  onMouseLeave={() => setThemeOpen(false)}
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    background: 'var(--bg-card)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: 8,
                    minWidth: 180,
                    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                  }}
                >
                  {(['white', 'graphite', 'sandstone'] as ThemeId[]).map(t => (
                    <button
                      key={t}
                      onClick={() => { setTheme(t); setThemeOpen(false) }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-secondary)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        width: '100%',
                        padding: '10px 12px',
                        border: 'none',
                        borderRadius: 8,
                        background: theme === t ? 'var(--bg-secondary)' : 'transparent',
                        color: 'var(--text)',
                        fontSize: 14,
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                    >
                      <span style={{ fontSize: 18 }}>{themeIcons[t]}</span>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: 500 }}>
                          {t === 'white' ? '皓白' : t === 'graphite' ? '石墨' : '砂岩'}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {t === 'white' ? '明亮 · 蓝' : t === 'graphite' ? '深色 · 橙' : '暖浅 · 琥珀'}
                        </div>
                      </div>
                      {theme === t && (
                        <span style={{ marginLeft: 'auto', color: 'var(--primary)' }}>✓</span>
                      )}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <a
            href="#download"
            className="btn btn-primary"
            style={{ padding: '8px 20px', fontSize: 13 }}
          >
            免费下载
          </a>

          {/* 移动端菜单按钮 */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{
              display: 'none',
              background: 'none',
              border: 'none',
              color: 'var(--text)',
              cursor: 'pointer',
              padding: 8,
            }}
            className="mobile-menu-btn"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </nav>
      </div>

      {/* 移动端菜单 */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              position: 'fixed',
              top: 64,
              left: 0,
              right: 0,
              background: 'var(--bg-card)',
              backdropFilter: 'blur(20px)',
              borderBottom: '1px solid var(--border)',
              padding: '16px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            {navLinks.map(link => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                style={{ color: 'var(--text-secondary)', fontSize: 16, padding: '8px 0', textDecoration: 'none' }}
              >
                {link.label}
              </a>
            ))}
            {/* 移动端主题选择 */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 4 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>主题</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['white', 'graphite', 'sandstone'] as ThemeId[]).map(t => (
                  <button
                    key={t}
                    onClick={() => { setTheme(t); setMobileOpen(false) }}
                    style={{
                      flex: 1,
                      padding: '8px 0',
                      border: theme === t ? '2px solid var(--primary)' : '1px solid var(--border)',
                      borderRadius: 8,
                      background: theme === t ? 'var(--bg-secondary)' : 'transparent',
                      color: 'var(--text)',
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontSize: 16, marginBottom: 2 }}>{themeIcons[t]}</div>
                    <div>{t === 'white' ? '皓白' : t === 'graphite' ? '石墨' : '砂岩'}</div>
                  </button>
                ))}
              </div>
            </div>
            <a href="#download" className="btn btn-primary" style={{ justifyContent: 'center' }} onClick={() => setMobileOpen(false)}>
              免费下载
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 移动端样式 */}
      <style>{`
        @media (max-width: 768px) {
          nav > a:not(.btn), nav > div:not(.mobile-menu-btn) { display: none; }
          .mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </motion.header>
  )
}