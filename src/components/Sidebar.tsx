import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from './ui/Icon'
import { DropdownMenu } from './ui/DropdownMenu'
import { type PageId } from '../routes'
// APP_VERSION 从 window.__APP_VERSION__ 读取（由 index.html 注入）

export interface NavItem {
  id: PageId
  label: string
  icon: string
  shortcut?: string
}

interface SidebarProps {
  currentPage: PageId
  onNavigate: (page: PageId) => void
  onSettings: () => void
  onUsers: () => void
  onLock: () => void
  currentUser?: { displayName?: string; username?: string; roleName?: string; roleId?: string } | null
  onLogout: () => void
  navItems: NavItem[]
  collapsed?: boolean
  onToggleCollapse?: () => void
}

const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  onSettings,
  onUsers,
  onLock,
  currentUser,
  onLogout,
  navItems,
  collapsed = false,
  onToggleCollapse,
}) => {
  const sidebarW = collapsed ? 56 : 256

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarW }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 flex flex-col relative z-20 overflow-hidden shrink-0"
    >
      {/* ── Logo 区域 ── */}
      <AnimatePresence mode="wait">
        {collapsed ? (
          <motion.div
            key="logo-collapsed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-12 flex items-center justify-center border-b border-slate-100 dark:border-slate-700/50 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800"
          >
            <motion.div
              whileHover={{ rotate: 8, scale: 1.1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center"
            >
              <Icon name="HardHat" size={16} className="text-white" />
            </motion.div>
            {/* 折叠/展开按钮已移到 TitleBar */}
          </motion.div>
        ) : (
          <motion.div
            key="logo-expanded"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-16 flex items-center px-5 border-b border-slate-100 dark:border-slate-700/50 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 overflow-hidden relative"
          >
            <motion.div
              whileHover={{ rotate: 8, scale: 1.08 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center mr-3 relative z-10"
            >
              <Icon name="HardHat" size={20} className="text-white" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="relative z-10 flex-1"
            >
              <h1 className="text-base font-bold text-white leading-tight">工程管家</h1>
              <p className="text-[10px] text-white/60 leading-tight">v{(window as any).__APP_VERSION__ || '0.56.0'}</p>
            </motion.div>
            {/* 折叠/展开按钮已移到 TitleBar */}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 导航区域 ── */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="px-4 mb-2"
          >
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 px-1">主菜单</p>
          </motion.div>
        )}
        {navItems.map((item) => {
          const isActive = currentPage === item.id

          if (collapsed) {
            // 折叠态：只显示图标，居中
            return (
              <div key={item.id} className="px-2 mb-0.5">
                <motion.button
                  onClick={() => onNavigate(item.id)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.93 }}
                  title={item.label}
                  className={`w-10 h-10 mx-auto rounded-xl flex items-center justify-center transition-colors ${
                    isActive
                      ? 'bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-200'
                      : 'text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon name={item.icon} size={18} />
                </motion.button>
              </div>
            )
          }

          // 展开态
          return (
            <div key={item.id} className="px-3">
              <motion.button
                onClick={() => onNavigate(item.id)}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.97 }}
                className={`w-full flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-200 group relative mb-0.5 ${
                  isActive
                    ? 'bg-slate-100 dark:bg-slate-700/30 text-slate-800 dark:text-slate-200'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <motion.div
                  animate={{ scale: isActive ? 1.1 : 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                >
                  <Icon name={item.icon} size={18} className={isActive ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'} />
                </motion.div>
                <span className="ml-3">{item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="sidebar-indicator"
                    className="absolute left-0 top-1 bottom-1 w-0.5 bg-slate-700 dark:bg-slate-400 rounded-full"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.button>
            </div>
          )
        })}
      </nav>

      {/* ── 用户信息区域 ── */}
      <div className="border-t border-slate-100 dark:border-slate-700/50">
        {collapsed ? (
          <div className="flex items-center justify-center py-3">
            <DropdownMenu
              side="bottom"
              align="start"
              sideOffset={8}
              items={[
                { key: 'users', label: '用户管理', icon: 'UserCircle', onClick: onUsers },
                { key: 'settings', label: '系统设置', icon: 'Settings', onClick: onSettings },
                { key: 'lock', label: '锁定屏幕', icon: 'Lock', onClick: onLock },
                { key: 'divider', label: '', divider: true },
                { key: 'logout', label: '退出登录', icon: 'LogOut', danger: true, onClick: onLogout },
              ]}
              trigger={
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-white text-xs font-medium shadow-sm cursor-pointer"
                >
                  {currentUser?.displayName?.charAt(0) || currentUser?.username?.charAt(0) || 'A'}
                </motion.button>
              }
            />
          </div>
        ) : (
          <div className="p-3">
            <div className="flex items-center px-3 py-2.5">
              <DropdownMenu
                side="top"
                align="start"
                sideOffset={8}
                items={[
                  { key: 'users', label: '用户管理', icon: 'UserCircle', onClick: onUsers },
                  { key: 'settings', label: '系统设置', icon: 'Settings', onClick: onSettings },
                  { key: 'lock', label: '锁定屏幕', icon: 'Lock', onClick: onLock },
                  { key: 'divider', label: '', divider: true },
                  { key: 'logout', label: '退出登录', icon: 'LogOut', danger: true, onClick: onLogout },
                ]}
                trigger={
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-white text-sm font-medium flex-shrink-0 shadow-sm cursor-pointer"
                  >
                    {currentUser?.displayName?.charAt(0) || currentUser?.username?.charAt(0) || 'A'}
                  </motion.button>
                }
              />
              <div className="ml-3 min-w-0">
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{currentUser?.displayName || currentUser?.username}</div>
                <div className="text-xs text-slate-400 dark:text-slate-500">{currentUser?.roleName || currentUser?.roleId}</div>
              </div>
            </div>
          </div>
        )}

        {/* ── 折叠 / 展开按钮已移到 TitleBar ── */}
      </div>
    </motion.aside>
  )
}

export default Sidebar
