// NotificationCenter.tsx — S2 通知中心浮层（Stitch Bedrock）
// 从铃铛下方展开：今天/更早分组、未读墨点、发丝分隔、全部已读/查看全部底栏
// 通知来源为真实业务事件派生（逾期发票 / 待办结算 / 即将到期合同）

import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Icon } from './ui/Icon'
import type { AppNotification } from '@/hooks/useNotifications'

interface NotificationCenterProps {
  open: boolean
  notifications: AppNotification[]
  onClose: () => void
  onMarkAllRead: () => void
  onItemClick: (n: AppNotification) => void
  onViewAll: () => void
}

const ICON_COLOR: Record<AppNotification['level'], string> = {
  danger: 'text-danger-500',
  warning: 'text-warning-600',
  info: 'text-[color:var(--accent)]',
}

export function NotificationCenter({
  open, notifications, onClose, onMarkAllRead, onItemClick, onViewAll,
}: NotificationCenterProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  // 点击浮层外部 / Esc 关闭
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        // 排除铃铛按钮自身（其有 data-notif-trigger）
        if ((e.target as HTMLElement).closest('[data-notif-trigger]')) return
        onClose()
      }
    }
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onEsc)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onEsc) }
  }, [open, onClose])

  const today = notifications.filter(n => n.group === 'today')
  const earlier = notifications.filter(n => n.group === 'earlier')

  const renderGroup = (label: string, items: AppNotification[]) => {
    if (items.length === 0) return null
    return (
      <div>
        <p className="px-4 pt-3 pb-1.5 text-xs font-semibold text-[color:var(--muted)]">{label}</p>
        {items.map(n => (
          <button
            key={n.id}
            onClick={() => onItemClick(n)}
            className="w-full flex items-start gap-3 px-4 py-3 hover:bg-[color:var(--panel-2)] transition-colors text-left border-b border-[color:var(--border)] last:border-b-0"
          >
            {/* 未读墨点 */}
            <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${n.read ? 'bg-transparent' : 'bg-[color:var(--fg)]'}`} />
            <Icon name={n.icon} size={16} className={`mt-0.5 shrink-0 ${ICON_COLOR[n.level]}`} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[color:var(--fg)] leading-tight">{n.title}</p>
              {n.summary && <p className="text-xs text-[color:var(--muted)] mt-0.5 line-clamp-2">{n.summary}</p>}
            </div>
            <span className="text-xs font-mono tabular-nums text-[color:var(--muted)] shrink-0">{n.time}</span>
          </button>
        ))}
      </div>
    )
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          className="fixed right-3 top-11 z-[9998] w-[360px] max-h-[70vh] flex flex-col bg-[color:var(--card)] border border-[color:var(--border)] rounded-2xl shadow-lift overflow-hidden"
          role="dialog"
          aria-label="通知中心"
        >
          {/* 顶部标题 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[color:var(--border)]">
            <h3 className="text-sm font-semibold text-[color:var(--fg)]">通知中心</h3>
            {notifications.some(n => !n.read) && (
              <span className="text-xs font-mono tabular-nums text-[color:var(--muted)]">
                {notifications.filter(n => !n.read).length} 条未读
              </span>
            )}
          </div>

          {/* 通知列表 */}
          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-[color:var(--panel-2)] border border-[color:var(--border)] flex items-center justify-center mb-3">
                  <Icon name="Bell" size={22} className="text-[color:var(--muted)]" />
                </div>
                <p className="text-sm text-[color:var(--muted)]">暂无通知</p>
              </div>
            ) : (
              <>
                {renderGroup('今天', today)}
                {renderGroup('更早', earlier)}
              </>
            )}
          </div>

          {/* 底栏：全部已读 / 查看全部 */}
          {notifications.length > 0 && (
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-[color:var(--border)]">
              <button onClick={onMarkAllRead} className="text-xs text-[color:var(--fg-2)] hover:text-[color:var(--fg)] transition-colors">
                全部已读
              </button>
              <button onClick={onViewAll} className="text-xs text-[color:var(--accent)] hover:opacity-80 transition-colors">
                查看全部
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default NotificationCenter
