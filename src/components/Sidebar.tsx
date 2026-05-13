import React from 'react'
import { motion } from 'framer-motion'
import { Icon } from './ui/Icon'
import { DropdownMenu } from './ui/DropdownMenu'
import { type PageId } from '../routes'

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
}) => {
  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 flex flex-col relative z-20"
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-slate-100 dark:border-slate-700/50 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 overflow-hidden relative">
        <motion.div
          whileHover={{ rotate: 8, scale: 1.08 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center mr-3 relative z-10"
        >
          <Icon name="HardHat" size={20} className="text-white" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15, duration: 0.3 }}
          className="relative z-10"
        >
          <h1 className="text-base font-bold text-white leading-tight">工程管家</h1>
          <p className="text-[10px] text-white/60 leading-tight">v2.6.3</p>
        </motion.div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.3 }}
          className="px-4 mb-2"
        >
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 px-1">主菜单</p>
        </motion.div>
        {navItems.map((item, index) => {
          const isActive = currentPage === item.id
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + index * 0.03, duration: 0.25, ease: 'easeOut' }}
              className="px-3"
            >
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
            </motion.div>
          )
        })}
      </nav>

      {/* User Info */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.3 }}
        className="border-t border-slate-100 dark:border-slate-700/50 p-3"
      >
        <div className="flex items-center px-3 py-2.5">
          <DropdownMenu
            side="top"
            align="start"
            sideOffset={8}
            items={[
              {
                key: 'users',
                label: '用户管理',
                icon: 'UserCircle',
                onClick: onUsers,
              },
              {
                key: 'settings',
                label: '系统设置',
                icon: 'Settings',
                onClick: onSettings,
              },
              {
                key: 'lock',
                label: '锁定屏幕',
                icon: 'Lock',
                onClick: onLock,
              },
              { key: 'divider', label: '', divider: true },
              {
                key: 'logout',
                label: '退出登录',
                icon: 'LogOut',
                danger: true,
                onClick: onLogout,
              },
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
      </motion.div>
    </motion.aside>
  )
}

export default Sidebar
