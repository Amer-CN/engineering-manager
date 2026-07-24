import React from 'react'
import { motion } from 'framer-motion'
import { Icon } from './ui/Icon'
import { DropdownMenu } from './ui/DropdownMenu'
import { HoverScrollbar } from './ui/HoverScrollbar'
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
  noBackground?: boolean // overlay 模式下由外层提供背景
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
  noBackground = false,
}) => {
  const sidebarW = collapsed ? 56 : 256

  return (
  <motion.aside
  initial={false}
  animate={{ width: sidebarW }}
  transition={{ duration: 0.2, ease: 'easeInOut' }}
  className="flex flex-col relative z-20 overflow-hidden shrink-0 h-full"
  style={{
  background: noBackground ? 'transparent' : 'var(--panel)',
  borderRight: noBackground ? 'none' : '1px solid var(--border)',
  } as React.CSSProperties}
  >
  {/* ── Logo 区域已合并到 TitleBar ── */}

  {/* ── 导航区域 ── */}
  <HoverScrollbar className="flex-1"><nav className={`flex-1 py-3 ${collapsed ? 'overflow-hidden' : ''}`}>
  {!collapsed && (
  <motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  className="px-4 mb-2"
  >
  <p className="text-caption font-semibold uppercase tracking-widest px-1" style={{ color: 'var(--muted)' }}>主菜单</p>
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
  className="w-10 h-10 mx-auto rounded-xl flex items-center justify-center transition-colors"
  style={{ background: isActive ? 'var(--sidebar-item-active)' : 'transparent', color: isActive ? 'var(--accent)' : 'var(--muted)' }}
  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--sidebar-item-hover)' }}
  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
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
  className="w-full flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-200 group relative mb-0.5"
  style={{ background: isActive ? 'var(--sidebar-item-active)' : 'transparent', color: isActive ? 'var(--accent)' : 'var(--fg-2)' }}
  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--sidebar-item-hover)' }}
  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
  >
  <motion.div
  animate={{ scale: isActive ? 1.1 : 1 }}
  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
  >
  <Icon name={item.icon} size={18} />
  </motion.div>
  <span className="ml-3">{item.label}</span>
  {isActive && (
  <motion.div
  layoutId="sidebar-indicator"
  className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full" style={{ background: 'var(--accent)' }}
  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
  />
  )}
  </motion.button>
  </div>
  )
  })}
  </nav></HoverScrollbar>
  <div className="border-t" style={{ borderColor: 'var(--border)' }}>
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
  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium shadow-sm cursor-pointer" style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
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
  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 shadow-sm cursor-pointer" style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
  >
  {currentUser?.displayName?.charAt(0) || currentUser?.username?.charAt(0) || 'A'}
  </motion.button>
  }
  />
  <div className="ml-3 min-w-0">
  <div className="text-sm font-medium truncate" style={{ color: 'var(--fg-2)' }}>{currentUser?.displayName || currentUser?.username}</div>
  <div className="text-xs" style={{ color: 'var(--muted)' }}>{currentUser?.roleName || currentUser?.roleId}</div>
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
