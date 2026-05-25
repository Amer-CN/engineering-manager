import React from 'react'
import { AuditAction, AuditLevel } from '../utils/audit'

interface AuditFilterBarProps {
  startDate: string
  endDate: string
  filterAction: AuditAction | ''
  filterResource: string
  filterLevel: AuditLevel | ''
  keyword: string
  total: number
  onStartDateChange: (v: string) => void
  onEndDateChange: (v: string) => void
  onFilterActionChange: (v: AuditAction | '') => void
  onFilterResourceChange: (v: string) => void
  onFilterLevelChange: (v: AuditLevel | '') => void
  onKeywordChange: (v: string) => void
  onSearch: () => void
  onReset: () => void
  resourceLabels: Record<string, string>
}

export const AuditFilterBar: React.FC<AuditFilterBarProps> = ({
  startDate, endDate, filterAction, filterResource, filterLevel, keyword, total,
  onStartDateChange, onEndDateChange, onFilterActionChange, onFilterResourceChange,
  onFilterLevelChange, onKeywordChange, onSearch, onReset, resourceLabels,
}) => {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4 mb-6">
      <div className="grid grid-cols-6 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">开始日期</label>
          <input
            type="date"
            value={startDate}
            onChange={e => onStartDateChange(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">结束日期</label>
          <input
            type="date"
            value={endDate}
            onChange={e => onEndDateChange(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">操作类型</label>
          <select
            value={filterAction}
            onChange={e => onFilterActionChange(e.target.value as AuditAction | '')}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
          >
            <option value="">全部</option>
            <option value="create">创建</option>
            <option value="update">更新</option>
            <option value="delete">删除</option>
            <option value="export">导出</option>
            <option value="import">导入</option>
            <option value="approve">审批</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">资源类型</label>
          <select
            value={filterResource}
            onChange={e => onFilterResourceChange(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
          >
            <option value="">全部</option>
            {Object.entries(resourceLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">日志级别</label>
          <select
            value={filterLevel}
            onChange={e => onFilterLevelChange(e.target.value as AuditLevel | '')}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
          >
            <option value="">全部</option>
            <option value="info">信息</option>
            <option value="warning">警告</option>
            <option value="error">错误</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">关键词搜索</label>
          <input
            type="text"
            value={keyword}
            onChange={e => onKeywordChange(e.target.value)}
            placeholder="搜索用户、描述..."
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
            onKeyPress={e => e.key === 'Enter' && onSearch()}
          />
        </div>
      </div>
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
        <span className="text-sm text-slate-500">
          共找到 <span className="font-medium text-slate-700">{total}</span> 条记录
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={onReset}
            className="btn btn-secondary btn-sm"
          >
            重置
          </button>
          <button
            onClick={onSearch}
            className="btn btn-primary text-sm"
          >
            搜索
          </button>
        </div>
      </div>
    </div>
  )
}
