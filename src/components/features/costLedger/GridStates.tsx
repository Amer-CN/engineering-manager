import { Icon } from '@/components/ui/Icon'

// 成本台账 Grid 状态反馈组件（loading / empty / error / 筛选无结果）
// 全部走 CSS 变量，确保三主题兼容。

export function GridLoading() {
  return (
    <div className="flex-1 space-y-2 p-6">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="h-8 w-full animate-pulse rounded" style={{ background: 'var(--bg-2)' }} />
      ))}
    </div>
  )
}

export function GridError({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
        <Icon name="AlertCircle" size={32} className="text-red-500" />
      </div>
      <h3 className="text-lg font-medium text-slate-700 mb-2">加载失败</h3>
      <p className="text-sm text-slate-500 mb-4 max-w-sm">{error}</p>
      <button onClick={onRetry} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
        重试
      </button>
    </div>
  )
}

export function GridEmpty() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
      <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'var(--bg-2)' }}>
        <Icon name="FolderOpen" size={32} className="text-slate-400" />
      </div>
      <h3 className="text-lg font-medium text-slate-700 mb-2">暂无台账记录</h3>
      <p className="text-sm text-slate-500">点击「新增台账」添加第一条记录</p>
    </div>
  )
}

export function GridNoResult({ activeFilters, onClear }: { activeFilters: number; onClear: () => void }) {
  return (
    <tr>
      <td colSpan={10} className="px-4 py-12 text-center text-sm text-slate-400">
        <div className="flex flex-col items-center gap-2">
          <Icon name="SearchX" size={28} className="text-slate-300" />
          <span>无匹配结果，请调整筛选条件</span>
          {activeFilters > 0 && (
            <button onClick={onClear} className="mt-1 text-xs text-blue-600 hover:text-blue-800">
              清除全部筛选
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}
