import { Icon } from '@/components/ui/Icon'

// 成本台账 Grid 状态反馈组件 — 全 CSS 变量，三主题兼容

function VarIcon({ name, size, colorVar }: { name: string; size: number; colorVar: string }) {
  return <span style={{ color: colorVar, display: 'inline-flex' }}><Icon name={name} size={size} /></span>
}

export function GridLoading() {
  return (
    <div className="flex-1 space-y-2 p-6">
      {[...Array(8)].map((_, i) => <div key={i} className="h-8 w-full animate-pulse rounded" style={{ background: 'var(--bg-2)' }} />)}
    </div>
  )
}

export function GridError({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
      <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'var(--danger-soft)' }}>
        <VarIcon name="AlertCircle" size={32} colorVar="var(--danger)" />
      </div>
      <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--fg)' }}>加载失败</h3>
      <p className="text-sm mb-4 max-w-sm" style={{ color: 'var(--fg-2)' }}>{error}</p>
      <button onClick={onRetry} className="rounded-lg px-4 py-2 text-sm transition-colors" style={{ border: '1px solid var(--border)', color: 'var(--fg-2)' }}>重试</button>
    </div>
  )
}

export function GridEmpty() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
      <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'var(--bg-2)' }}>
        <VarIcon name="FolderOpen" size={32} colorVar="var(--muted)" />
      </div>
      <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--fg)' }}>暂无台账记录</h3>
      <p className="text-sm" style={{ color: 'var(--fg-2)' }}>点击「新增台账」添加第一条记录</p>
    </div>
  )
}

export function GridNoResult({ activeFilters, onClear }: { activeFilters: number; onClear: () => void }) {
  return (
    <tr>
      <td colSpan={10} className="px-4 py-12 text-center text-sm" style={{ color: 'var(--muted)' }}>
        <div className="flex flex-col items-center gap-2">
          <VarIcon name="SearchX" size={28} colorVar="var(--muted-2)" />
          <span>无匹配结果，请调整筛选条件</span>
          {activeFilters > 0 && <button onClick={onClear} className="mt-1 text-xs" style={{ color: 'var(--accent)' }}>清除全部筛选</button>}
        </div>
      </td>
    </tr>
  )
}
