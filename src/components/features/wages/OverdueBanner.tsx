import { useState } from 'react'
import type { OverdueStats } from '@/types'
import { Icon } from '../../ui/Icon'

interface OverdueBannerProps {
  stats: OverdueStats | null
  onViewDetail: () => void
}

export default function OverdueBanner({ stats, onViewDetail }: OverdueBannerProps) {
  const [visible, setVisible] = useState(true)

  if (!stats || stats.overdueWorkerCount === 0 || !visible) return null

  return (
    <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon name="AlertTriangle" size={20} className="text-red-600" />
        <span className="text-sm">
          欠薪预警：涉及 {stats.overdueWorkerCount} 名工人，
          共计 {stats.totalOverdueAmount.toFixed(2)} 元，
          最长逾期 {stats.maxOverdueDays} 天
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onViewDetail}
          className="px-3 py-1 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700"
        >
          查看详情
        </button>
        <button
          onClick={() => setVisible(false)}
          className="text-red-600 hover:text-red-800 text-lg leading-none"
        >
          ×
        </button>
      </div>
    </div>
  )
}
