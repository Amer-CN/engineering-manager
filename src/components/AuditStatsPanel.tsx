import React from 'react'
import { AuditAction, AuditStats } from '../utils/audit'

interface AuditStatsPanelProps {
  statsData: AuditStats
  onClose: () => void
  actionConfig: Record<AuditAction, { label: string; color: string; bgColor: string }>
}

export const AuditStatsPanel: React.FC<AuditStatsPanelProps> = ({ statsData, onClose, actionConfig }) => {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-800">近30天操作统计</h3>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600"
        >
          ✕
        </button>
      </div>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-sm text-blue-600 mb-1">总操作数</div>
          <div className="text-2xl font-bold text-blue-700">{statsData.totalCount}</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-sm text-green-600 mb-1">今日操作</div>
          <div className="text-2xl font-bold text-green-700">{statsData.todayCount}</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-sm text-purple-600 mb-1">创建操作</div>
          <div className="text-2xl font-bold text-purple-700">{statsData.actionCounts.create || 0}</div>
        </div>
        <div className="bg-orange-50 rounded-lg p-4">
          <div className="text-sm text-orange-600 mb-1">删除操作</div>
          <div className="text-2xl font-bold text-orange-700">{statsData.actionCounts.delete || 0}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">操作类型分布</h4>
          <div className="space-y-2">
            {Object.entries(statsData.actionCounts)
              .filter(([, count]) => count > 0)
              .sort((a, b) => b[1] - a[1])
              .map(([action, count]) => (
                <div key={action} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">{actionConfig[action as AuditAction]?.label || action}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))
            }
          </div>
        </div>
        <div>
          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">活跃用户TOP5</h4>
          <div className="space-y-2">
            {statsData.topUsers.slice(0, 5).map((user, index) => (
              <div key={user.userId} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                    index === 0 ? 'bg-yellow-100 text-yellow-700' :
                    index === 1 ? 'bg-slate-100 text-slate-700' :
                    index === 2 ? 'bg-orange-100 text-orange-700' :
                    'bg-blue-50 text-blue-700'
                  }`}>
                    {index + 1}
                  </span>
                  <span className="text-slate-600">{user.username}</span>
                </div>
                <span className="font-medium">{user.count} 次</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
