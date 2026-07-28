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
  className="w-10 h-10 mx-auto rounded-full flex items-center justify-center transition-colors"
  style={{ background: isActive ? 'var(--fg)' : 'transparent', color: isActive ? 'var(--bg)' : 'var(--muted)' }}
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
  className="w-full flex items-center px-3 py-2.5 rounded-full text-xs font-bold tracking-wide transition-colors duration-200 group relative mb-0.5"
  style={{ background: isActive ? 'var(--fg)' : 'transparent', color: isActive ? 'var(--bg)' : 'var(--fg-2)' }}
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
  <div className="p-3 space-y-0.5">
  {/* 管理入口（对齐 Stitch S0：可见项，不藏在头像下拉里） */}
  <button
  onClick={onUsers}
  className="w-full flex items-center px-3 py-2.5 rounded-full text-xs font-bold tracking-wide transition-colors"
  style={{ background: 'transparent', color: 'var(--fg-2)' }}
  onMouseEnter={e => { e.currentTarget.style.background = 'var(--sidebar-item-hover)' }}
  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
  >
  <Icon name="UserCircle" size={18} />
  <span className="ml-3">用户管理</span>
  </button>
  <button
  onClick={onSettings}
  className="w-full flex items-center px-3 py-2.5 rounded-full text-xs font-bold tracking-wide transition-colors"
  style={{ background: 'transparent', color: 'var(--fg-2)' }}
  onMouseEnter={e => { e.currentTarget.style.background = 'var(--sidebar-item-hover)' }}
  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
  >
  <Icon name="Settings" size={18} />
  <span className="ml-3">系统设置</span>
  </button>
  {/* 当前用户 + 锁定 / 退出 */}
  <div className="flex items-center gap-2 px-3 pt-3 mt-1 border-t" style={{ borderColor: 'var(--border)' }}>
  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0" style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}>
  {currentUser?.displayName?.charAt(0) || currentUser?.username?.charAt(0) || 'A'}
  </div>
  <div className="min-w-0 flex-1">
  <div className="text-sm font-medium truncate" style={{ color: 'var(--fg-2)' }}>{currentUser?.displayName || currentUser?.username}</div>
  <div className="text-xs truncate" style={{ color: 'var(--muted)' }}>{currentUser?.roleName || currentUser?.roleId}</div>
  </div>
  <button onClick={onLock} title="锁定屏幕" aria-label="锁定屏幕" className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0" style={{ color: 'var(--muted)' }} onMouseEnter={e => { e.currentTarget.style.background = 'var(--sidebar-item-hover)'; e.currentTarget.style.color = 'var(--fg-2)' }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted)' }}>
  <Icon name="Lock" size={16} />
  </button>
  <button onClick={onLogout} title="退出登录" aria-label="退出登录" className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0" style={{ color: 'var(--muted)' }} onMouseEnter={e => { e.currentTarget.style.background = 'var(--danger-soft)'; e.currentTarget.style.color = 'var(--danger)' }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted)' }}>
  <Icon name="LogOut" size={16} />
  </button>
  </div>
  </div>
  )}

  {/* ── 折叠 / 展开按钮已移到 TitleBar ── */}
  </div>
  </motion.aside>
  )
}

export default Sidebar
