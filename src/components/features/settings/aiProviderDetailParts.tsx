/**
 * AiProviderSection detail 态拆分件（服务商子页：设置表单 + 模型管理列表）
 * 从主文件抽出以消化行数门禁（主文件 ≤400 行、aiProviderSettingsParts 已贴近上限，故新建本文件）
 */
import { useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { CapBadge, INPUT_CLS, PROTOCOL_LABELS, ModelMultiSelect } from './aiProviderSettingsParts'
import { useToastStore } from '@/store/toastStore'
import { fetchProviderModels } from '@/services/agent-client'
import type { ProviderEntry, ProviderModelEntry } from '@/types/agent'

/**
 * detail 态区块一：服务商可编辑设置（名称/BaseUrl 行内输入防抖即存 + 协议三选一 + 更换密钥/启用）
 */
export function ProviderSettingsForm({
  provider, isActive, disabled, onPatch, onProtocolChange, onOpenKeyDialog, onActivate,
}: {
  provider: ProviderEntry
  /** 是否当前生效（生效中不再显示「启用」） */
  isActive: boolean
  disabled: boolean
  /** 行内编辑（名称/BaseUrl）：走 applyUpdate 防抖 800ms 合并保存 */
  onPatch: (patch: { name?: string; baseUrl?: string }) => void
  onProtocolChange: (protocol: 'chat' | 'responses' | 'anthropic') => void
  onOpenKeyDialog: () => void
  onActivate: () => void
}) {
  return (
    <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-3 space-y-3">
      <span className="text-sm font-medium text-[color:var(--fg-2)]">服务商设置</span>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label">名称</label>
          <input
            type="text"
            value={provider.name}
            disabled={disabled}
            onChange={e => onPatch({ name: e.target.value })}
            className={INPUT_CLS}
          />
        </div>
        <div>
          <label className="label">Base URL</label>
          <input
            type="text"
            value={provider.baseUrl}
            disabled={disabled}
            onChange={e => onPatch({ baseUrl: e.target.value })}
            placeholder="https://api.example.com/v1"
            className={INPUT_CLS}
          />
        </div>
      </div>
      <div>
        <label className="label">接口协议</label>
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['chat', 'responses', 'anthropic'] as const).map(v => (
            <button key={v} type="button" disabled={disabled} onClick={() => onProtocolChange(v)}
              className={`px-2 py-0.5 rounded-lg text-caption font-medium border transition-colors disabled:opacity-50 ${(provider.protocol ?? 'chat') === v ? 'border-[color:var(--accent)] bg-[color:var(--accent-soft)] text-[color:var(--accent)]' : 'border-[color:var(--border)] text-[color:var(--fg-2)]'}`}>
              {PROTOCOL_LABELS[v]}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={onOpenKeyDialog} disabled={disabled}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium hover:bg-[color:var(--panel-2)] disabled:opacity-50 text-primary">
          <Icon name="KeyRound" size={13} /> 更换密钥
        </button>
        {!isActive && (
          <button type="button" onClick={onActivate} disabled={disabled}
            className="px-2 py-1 rounded-lg text-xs font-medium hover:bg-[color:var(--panel-2)] disabled:opacity-50 text-primary">
            启用
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * 上下文长度徽章文案（就地格式化）：≥1M → xM/x.xM，≥1000 → xK/x.xK，<1000 原样。
 * 与图/视能力徽章同风格，只作短标签展示，未标注不渲染。
 */
function formatContextBadge(tokens: number): string {
  if (tokens >= 1_000_000) {
    const v = tokens / 1_000_000
    return `${Number.isInteger(v) ? v : parseFloat(v.toFixed(1))}M`
  }
  if (tokens >= 1000) {
    const v = tokens / 1000
    return `${Number.isInteger(v) ? v : parseFloat(v.toFixed(1))}K`
  }
  return String(tokens)
}

/**
 * detail 态区块二：模型管理列表（多选 checkbox + 批量删 + 添加/设默认/编辑/单删）
 * 单删与批量删均免确认直接删（删服务商才保留确认）
 */
export function ProviderModelList({
  provider, disabled, selectedIds, onToggleSelect, onToggleAll, onAddModel, onEditModel, onSetDefault, onDeleteModel, onDeleteSelected,
}: {
  provider: ProviderEntry
  disabled: boolean
  /** 勾选中的模型 id 集合 */
  selectedIds: Set<string>
  onToggleSelect: (modelId: string) => void
  onToggleAll: (select: boolean) => void
  onAddModel: () => void
  onEditModel: (entry: ProviderModelEntry) => void
  onSetDefault: (modelId: string) => void
  onDeleteModel: (modelId: string) => void
  onDeleteSelected: () => void
}) {
  const allSelected = provider.models.length > 0 && provider.models.every(m => selectedIds.has(m.id))
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="label mb-0">模型（默认模型供首页对话使用）</label>
        <button
          type="button"
          onClick={onAddModel}
          disabled={disabled}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors hover:bg-[color:var(--panel-2)] disabled:opacity-50 text-primary"
        >
          <Icon name="Plus" size={13} /> 添加模型
        </button>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between gap-2 mb-2 px-3 py-1.5 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel-2)]">
          <button type="button" onClick={() => onToggleAll(!allSelected)} disabled={disabled}
            className="text-xs font-medium text-content-2 hover:opacity-80 disabled:opacity-50">
            {allSelected ? '取消全选' : '全选'}
          </button>
          <button type="button" onClick={onDeleteSelected} disabled={disabled}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium hover:bg-[color:var(--card)] disabled:opacity-50 text-[color:var(--danger)]">
            <Icon name="Trash2" size={13} /> 删除所选（{selectedIds.size}）
          </button>
        </div>
      )}

      <div className="space-y-1.5">
        {provider.models.map(m => {
          const isDefault = m.id === provider.activeModelId
          return (
            <div key={m.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)]">
              <div className="flex items-center gap-2 min-w-0">
                <input
                  type="checkbox"
                  checked={selectedIds.has(m.id)}
                  onChange={() => onToggleSelect(m.id)}
                  disabled={disabled}
                  aria-label={`选择模型 ${m.id}`}
                  className="h-3.5 w-3.5 flex-shrink-0 accent-[color:var(--accent)]"
                />
                <span className="text-sm truncate text-foreground">{m.id}</span>
                {m.input.includes('image') && <CapBadge label="图" title="支持图片输入" />}
                {m.input.includes('video') && <CapBadge label="视" title="支持视频输入" />}
                {m.contextWindow != null && (
                  <CapBadge label={formatContextBadge(m.contextWindow)} title={`上下文长度 ${m.contextWindow} tokens`} />
                )}
                {isDefault && (
                  <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-micro font-medium bg-[color:var(--success-soft)] text-primary">
                    默认
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {!isDefault && (
                  <button type="button" onClick={() => onSetDefault(m.id)} disabled={disabled}
                    className="px-2 py-1 rounded-lg text-xs hover:bg-[color:var(--panel-2)] disabled:opacity-50 text-content-2">
                    设为默认
                  </button>
                )}
                <button type="button" onClick={() => onEditModel(m)} disabled={disabled}
                  className="px-2 py-1 rounded-lg text-xs hover:bg-[color:var(--panel-2)] disabled:opacity-50 text-content-2">
                  编辑
                </button>
                <button type="button" onClick={() => onDeleteModel(m.id)} disabled={disabled}
                  className="p-1.5 rounded-lg hover:bg-[color:var(--panel-2)] disabled:opacity-50 text-muted-foreground"
                  aria-label={`删除模型 ${m.id}`}
                >
                  <Icon name="Trash2" size={14} />
                </button>
              </div>
            </div>
          )
        })}
        {provider.models.length === 0 && (
          <p className="text-xs text-[color:var(--muted)] py-2">该服务商还没有模型，点右上角「添加模型」。</p>
        )}
      </div>
    </div>
  )
}

/**
 * detail 态区块三：批量获取模型列表 — 用已存密钥由后端代查 /models，
 * 弹多选（默认只勾尚未添加的模型），确认后追加（大小写不敏感去重、只增不减）
 */
export function ProviderModelFetch({
  provider, disabled, onApply,
}: {
  provider: ProviderEntry
  disabled: boolean
  /** 确认追加：把勾选项 map 成模型条目回传给调用方落库 */
  onApply: (models: ProviderModelEntry[]) => void
}) {
  const showToast = useToastStore(s => s.showToast)
  const [busy, setBusy] = useState<null | 'fetching' | 'applying'>(null)
  const [fetched, setFetched] = useState<string[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [open, setOpen] = useState(false)

  /** 拉取列表：成功去重后只预选新增项（已存在的跳过） */
  const handleFetch = async () => {
    setBusy('fetching')
    try {
      const res = await fetchProviderModels(provider.id)
      if (!res.success || !res.models?.length) {
        showToast(res.error || '获取模型列表失败', 'error')
        return
      }
      const existing = new Set(provider.models.map(m => m.id.toLowerCase()))
      const seen = new Set<string>()
      const models = res.models
        .map(m => m.trim())
        .filter(m => {
          const k = m.toLowerCase()
          if (!m || seen.has(k) || existing.has(k)) return false
          seen.add(k)
          return true
        })
      setFetched(models)
      setSelected(new Set(models))
      setOpen(true)
    } finally {
      setBusy(null)
    }
  }

  /** 确认追加：勾选项 map 成条目回传；空选由按钮禁用态拦截 */
  const handleApply = () => {
    setBusy('applying')
    try {
      onApply([...selected].map<ProviderModelEntry>(m => ({ id: m, input: ['text'], output: ['text'] })))
      setOpen(false)
      setFetched([])
      setSelected(new Set())
    } finally {
      setBusy(null)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleFetch}
        disabled={disabled || busy !== null}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors hover:bg-[color:var(--panel-2)] disabled:opacity-50 text-primary"
      >
        <Icon name="RefreshCw" size={13} className={busy === 'fetching' ? 'animate-spin' : ''} />
        {busy === 'fetching' ? '获取中...' : '获取模型列表'}
      </button>

      {open && fetched.length > 0 && (
        <div className="mt-2 space-y-2">
          <ModelMultiSelect
            models={fetched}
            selected={selected}
            onToggle={m => setSelected(prev => {
              const next = new Set(prev)
              if (next.has(m)) next.delete(m); else next.add(m)
              return next
            })}
            onToggleAll={select => setSelected(select ? new Set(fetched) : new Set())}
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => { setOpen(false); setFetched([]); setSelected(new Set()) }}
              disabled={disabled || busy !== null}
              className="px-2 py-1 rounded-lg text-xs font-medium hover:bg-[color:var(--panel-2)] disabled:opacity-50 text-content-2"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={disabled || busy !== null || selected.size === 0}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium hover:bg-[color:var(--panel-2)] disabled:opacity-50 text-primary"
            >
              <Icon name="Plus" size={13} /> 添加所选（{selected.size}）
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
