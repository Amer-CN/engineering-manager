// useNotifications.ts — S2 通知中心数据源
// 从真实业务事件派生通知：即将到期合同 / 逾期未收齐发票 / 待办结算
// 已读状态持久化到 localStorage（按通知 id），不引入后端改动

import { useState, useEffect, useCallback, useMemo } from 'react'
import { getAPI } from '@/services/api-adapter'
import type { PageId } from '@/routes'

export interface AppNotification {
  id: string
  level: 'danger' | 'warning' | 'info'
  icon: string
  title: string
  summary?: string
  time: string
  group: 'today' | 'earlier'
  read: boolean
  /** 点击后跳转的页面 */
  target?: PageId
}

const READ_KEY = 'bedrock:notif:read'

function loadReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_KEY)
    return new Set(raw ? JSON.parse(raw) : [])
  } catch { return new Set() }
}

function saveReadIds(ids: Set<string>) {
  try { localStorage.setItem(READ_KEY, JSON.stringify([...ids])) } catch { /* ignore */ }
}

// 距今天数 → today / earlier 分组 + 简短时间标签
function bucket(dateStr?: string): { group: 'today' | 'earlier'; time: string } {
  if (!dateStr) return { group: 'earlier', time: '—' }
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return { group: 'earlier', time: '—' }
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diffDays <= 0) return { group: 'today', time: '今天' }
  if (diffDays === 1) return { group: 'earlier', time: '昨天' }
  if (diffDays < 7) return { group: 'earlier', time: `${diffDays} 天前` }
  return { group: 'earlier', time: dateStr.slice(5) }
}

export function useNotifications() {
  const [raw, setRaw] = useState<Omit<AppNotification, 'read'>[]>([])
  const [readIds, setReadIds] = useState<Set<string>>(loadReadIds)

  const load = useCallback(async () => {
    try {
      const api = await getAPI()
      const [statsRes, invInRes, invOutRes] = await Promise.allSettled([
        api.getContractStats(),
        api.getInvoices(undefined, 'invoice_in'),
        api.getInvoices(undefined, 'invoice_out'),
      ])
      const list: Omit<AppNotification, 'read'>[] = []

      // 1) 即将到期合同（30 天内）
      if (statsRes.status === 'fulfilled' && statsRes.value?.success) {
        const expiring = statsRes.value.data?.expiringSoon ?? []
        for (const c of expiring.slice(0, 5)) {
          const b = bucket()
          list.push({
            id: `contract-expire-${c.type}-${c.id}`,
            level: c.daysLeft <= 7 ? 'danger' : 'warning',
            icon: 'FileText',
            title: `合同即将到期：${c.name}`,
            summary: `${c.contractNo || ''} 还有 ${c.daysLeft} 天到期`,
            time: `${c.daysLeft}天`,
            group: b.group,
            target: 'contracts',
          })
        }
      }

      // 2) 逾期/未收齐发票（issued/partially_paid 且开票日期超过 30 天）
      const collectInvoices = (r: PromiseSettledResult<any>) =>
        r.status === 'fulfilled' && r.value?.success ? (r.value.data ?? []) : []
      const allInvoices = [...collectInvoices(invInRes), ...collectInvoices(invOutRes)]
      const now = Date.now()
      const overdue = allInvoices.filter((inv: any) => {
        if (inv.status !== 'issued' && inv.status !== 'partially_paid') return false
        const issue = new Date(inv.issueDate).getTime()
        return !isNaN(issue) && (now - issue) / 86400000 > 30
      })
      for (const inv of overdue.slice(0, 5)) {
        const b = bucket(inv.issueDate)
        const isIn = inv.type === 'invoice_in'
        list.push({
          id: `invoice-overdue-${inv.id}`,
          level: 'warning',
          icon: 'Receipt',
          title: `${isIn ? '待付款' : '待回款'}发票：${inv.name || inv.invoiceNo}`,
          summary: `${isIn ? inv.sellerName || '' : inv.buyerName || ''} · 开票 ${inv.issueDate}`,
          time: b.time,
          group: b.group,
          target: 'invoices',
        })
      }

      setRaw(list)
    } catch (e) {
      console.warn('[useNotifications] 加载失败:', e)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const notifications = useMemo<AppNotification[]>(
    () => raw.map(n => ({ ...n, read: readIds.has(n.id) })),
    [raw, readIds],
  )

  const unreadCount = notifications.filter(n => !n.read).length

  const markAllRead = useCallback(() => {
    setReadIds(prev => {
      const next = new Set(prev)
      raw.forEach(n => next.add(n.id))
      saveReadIds(next)
      return next
    })
  }, [raw])

  const markRead = useCallback((id: string) => {
    setReadIds(prev => {
      const next = new Set(prev)
      next.add(id)
      saveReadIds(next)
      return next
    })
  }, [])

  return { notifications, unreadCount, markAllRead, markRead, reload: load }
}
