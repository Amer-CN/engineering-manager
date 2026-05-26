import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Sidebar from './components/Sidebar'
import TitleBar from './components/TitleBar'
import StatusBar from './components/StatusBar'
import { NAV_ITEMS, PAGE_IDS, getFilteredSidebarRoutes } from './routes'
import { RequirePermission, RequireAdmin } from './hooks/usePermission'
import { useAuth } from './hooks/useAuth'
import { useRowHoverOpacity } from './hooks/useRowHoverOpacity'

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

// 加载占位
const PageLoader = () => (
  <div className="flex items-center justify-center h-full">
    <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-500 border-t-transparent"></div>
  </div>
)

type Page = typeof PAGE_IDS[number]

const AppContent: React.FC = () => {
  const { isAuthenticated, isLocked, currentUser, logout, lock } = useAuth()
  useRowHoverOpacity() // 初始化表格行悬停 CSS 变量

  const [currentPage, setCurrentPage] = useState<Page>('dashboard')
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    const stored = localStorage.getItem('sidebar-collapsed')
    return stored !== 'true' // 默认展开
  })

  const refresh = () => setRefreshTrigger(prev => prev + 1)

  // 持久化侧边栏折叠状态
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(!sidebarOpen))
  }, [sidebarOpen])

  // Ctrl+B 快捷键折叠/展开侧边栏
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault()
        setSidebarOpen(v => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

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

  if (!isAuthenticated) {
    return <Suspense fallback={<PageLoader />}><Login onLoginSuccess={() => {}} /></Suspense>
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950 relative overflow-hidden"
         style={{
           // frameless 窗口阴影（Windows 下原生阴影消失后用 box-shadow 模拟）
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
          <AnimatePresence mode="sync">
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

      {/* 窗口边缘 resize 手柄（frameless 后需手动实现） */}
      <div className="absolute top-0 left-0 right-0 h-1 cursor-n-resize" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties} />
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
