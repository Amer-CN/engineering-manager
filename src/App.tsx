import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { getAPI } from './services/api-adapter'
import Sidebar from './components/Sidebar'
import TitleBar from './components/TitleBar'
import StatusBar from './components/StatusBar'
import { useStatusStore } from './store/statusStore'
import { NAV_ITEMS, PAGE_IDS, getFilteredSidebarRoutes } from './routes'
import { RequirePermission, RequireAdmin } from './hooks/usePermission'
import { useAuth } from './hooks/useAuth'
import { useRowHoverOpacity } from './hooks/useRowHoverOpacity'
import { useTheme } from './hooks/useTheme'

// ── 路由级代码分割：每个页面独立 chunk ──
const Dashboard = lazy(() => import('./components/Dashboard'))
const Projects = lazy(() => import('./components/Projects'))
const Contracts = lazy(() => import('./components/Contracts'))
const Members = lazy(() => import('./components/Members'))
const HRManagement = lazy(() => import('./components/HRManagement'))
const LaborManagement = lazy(() => import('./components/LaborManagement'))
const CostLedger = lazy(() => import('./components/CostLedger'))
const Drawings = lazy(() => import('./components/Drawings'))
const Partners = lazy(() => import('./components/Partners'))
const WageManagement = lazy(() => import('./components/WageManagement'))
const Settlement = lazy(() => import('./components/Settlement'))
const Templates = lazy(() => import('./components/Templates'))
const Inventory = lazy(() => import('./components/Inventory'))
const Invoices = lazy(() => import('./components/Invoices'))
const Settings = lazy(() => import('./components/Settings'))
const Users = lazy(() => import('./components/Users'))
import LockScreen from './components/LockScreen'
const Login = lazy(() => import('./components/Login'))
const SplashScreen = lazy(() => import('./components/SplashScreen'))

// 加载占位 — 品牌化动画
const PageLoader = () => (
  <div className="flex flex-col items-center justify-center gap-4" style={{ background: 'var(--bg)', minHeight: '100vh' }}>
    <motion.div
      animate={{
        scale: [1, 1.08, 1],
        opacity: [0.5, 1, 0.5],
      }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
    >
      <svg width="40" height="40" viewBox="0 0 18 18" fill="none">
        <defs>
          <linearGradient id="loader-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.6" />
          </linearGradient>
        </defs>
        <path d="M2 15.5 L9 2.5 L16 15.5 Z" fill="url(#loader-grad)" />
        <path d="M5 14 L9 6 L13 14 Z" fill="var(--bg)" />
      </svg>
    </motion.div>
    <div className="flex gap-1.5">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{ scale: [1, 1.3, 1], opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: 'var(--accent)' }}
        />
      ))}
    </div>
  </div>
)

type Page = typeof PAGE_IDS[number]

const AppContent: React.FC = () => {
  const { isAuthenticated, isLocked, currentUser, logout, lock } = useAuth()
  useTheme() // 启动时从 localStorage 读取并设置 data-theme
  useRowHoverOpacity() // 初始化表格行悬停 CSS 变量

  // 启动动画状态
  const [showSplash, setShowSplash] = useState(true)

  // 登录成功后放大窗口
  useEffect(() => {
    if (isAuthenticated) {
      getAPI().then(api => api?.resizeForApp?.()).catch(() => {})
    }
  }, [isAuthenticated])

  const [currentPage, setCurrentPage] = useState<Page>('dashboard')
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    const stored = localStorage.getItem('sidebar-collapsed')
    return stored !== 'true' // 默认展开
  })

  const refresh = () => setRefreshTrigger(prev => prev + 1)

  // 同步当前页面名到状态栏
  const setPageName = useStatusStore(s => s.setPageName)
  useEffect(() => {
    setPageName(currentPage)
  }, [currentPage, setPageName])

  // 持久化侧边栏折叠状态
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(!sidebarOpen))
  }, [sidebarOpen])

  // 快捷键：Ctrl+B 折叠侧边栏，Ctrl+L 锁屏
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault()
        setSidebarOpen(v => !v)
      }
      if (e.ctrlKey && e.key === 'l') {
        e.preventDefault()
        lock()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lock])

  const navItems = useMemo(() => {
    if (!currentUser?.permissions || currentUser.permissions.length === 0) return NAV_ITEMS
    return getFilteredSidebarRoutes(currentUser.permissions)
  }, [currentUser?.permissions])

  useEffect(() => {
    const handleNavigate = (e: Event) => {
      const page = (e as CustomEvent).detail as Page
      if (PAGE_IDS.includes(page)) { setCurrentPage(page) }
    }
    window.addEventListener('navigate', handleNavigate)
    return () => window.removeEventListener('navigate', handleNavigate)
  }, [])

  const renderPage = () => {
    const props = { refresh, refreshTrigger }
    switch (currentPage) {
      case 'dashboard': return <Dashboard />
      case 'projects': return <Projects {...props} />
      case 'contracts': return <Contracts {...props} />
      case 'members': return <Members {...props} />
      case 'hr': return <HRManagement />
      case 'labor': return <LaborManagement />
      case 'expenses': return <CostLedger />
      case 'costLedger': return <CostLedger />
      case 'drawings': return <Drawings {...props} />
      case 'partners': return <Partners {...props} />
      case 'wages': return <WageManagement />
      case 'settlement': return <Settlement {...props} />
      case 'templates': return <Templates />
      case 'inventory': return <Inventory {...props} />
      case 'invoices': return <Invoices {...props} />
      case 'users': return <RequireAdmin><Users /></RequireAdmin>
      case 'settings': return <RequirePermission permission="settings:read"><Settings /></RequirePermission>
      default: return <Dashboard />
    }
  }

  // 启动动画
  if (showSplash) {
    return (
      <Suspense fallback={<PageLoader />}>
        <SplashScreen onComplete={() => setShowSplash(false)} />
      </Suspense>
    )
  }

  if (!isAuthenticated) {
    return <Suspense fallback={<PageLoader />}><Login onLoginSuccess={() => {}} /></Suspense>
  }

  return (
    <div className="h-screen relative overflow-hidden select-none flex flex-col bg-slate-50"
         style={{
           boxShadow: '0 0 0 1px rgba(0,0,0,0.08), 0 0 20px rgba(0,0,0,0.08)',
         } as React.CSSProperties}>
      <TitleBar collapsed={!sidebarOpen} onToggleCollapse={() => setSidebarOpen(v => !v)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar currentPage={currentPage} onNavigate={setCurrentPage}
          onSettings={() => setCurrentPage('settings')}
          onUsers={() => setCurrentPage('users')}
          onLock={lock}
          currentUser={currentUser} onLogout={logout} navItems={navItems}
          collapsed={!sidebarOpen}
          onToggleCollapse={() => setSidebarOpen(v => !v)} />
        <AnimatePresence>
          {isLocked && <LockScreen />}
        </AnimatePresence>
        <main className="flex-1 overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div key={currentPage} className="min-h-full"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}>
              <Suspense fallback={<PageLoader />}>
                {renderPage()}
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <StatusBar />

      {/* 窗口边缘 resize 手柄 */}
      <div className="absolute top-0 left-0 right-0 h-1 cursor-n-resize" />
      <div className="absolute bottom-0 left-0 right-0 h-1 cursor-s-resize" />
      <div className="absolute top-0 left-0 bottom-0 w-1 cursor-w-resize" />
      <div className="absolute top-0 right-0 bottom-0 w-1 cursor-e-resize" />
    </div>
  )
}

function App() {
  return <AppContent />
}

export default App
