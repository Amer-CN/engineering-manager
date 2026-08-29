import { useState, useEffect, useCallback } from 'react'
import { Icon } from '@/components/ui/Icon'
import { Button } from '../../ui/Button'
import { ConfirmDialog } from '../../ui/ConfirmDialog'
import { useToastStore } from '@/store/toastStore'
import {
  getLlmProviderConfig,
  saveLlmProviderConfig,
  reloadLlmProviderConfig,
} from '@/services/agent-client'
import type { MultiProviderConfig, ProviderModelEntry } from '@/types/agent'
import { GenerationParamsSection, CapBadge } from './aiProviderSettingsParts'
import { ProviderAddForm, ModelEditDialog } from './aiProviderDialogs'

/** 删除确认目标 */
type DelTarget =
  | { kind: 'provider'; id: string; label: string }
  | { kind: 'model'; providerId: string; modelId: string; label: string }

/** 当前生效徽章 */
function ActiveBadge() {
  return (
    <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-micro font-medium bg-accent-soft text-primary">
      当前生效
    </span>
  )
}

/**
 * AI 助手设置卡片 — 多服务商管理（对齐成熟 Agent 使用逻辑）
 * - 内置/自定义切换；服务商列表（添加/启用/删除）
 * - 当前服务商的模型列表（弹窗添加/编辑、能力标注、设默认、删除）
 * - 温度 + maxTokens；所有改动点「保存」整份落库
 */
export function AiProviderSection() {
  const [multi, setMulti] = useState<MultiProviderConfig | null>(null)
  /** 本次填写的新 API Key（providerId → key；留空 = 保留原密钥） */
  const [apiKeyInputs, setApiKeyInputs] = useState<Record<string, string>>({})
  const [addingProvider, setAddingProvider] = useState(false)
  const [modelDialog, setModelDialog] = useState<{ providerId: string; entry: ProviderModelEntry | null } | null>(null)
  const [delTarget, setDelTarget] = useState<DelTarget | null>(null)
  const [status, setStatus] = useState<'loading' | 'idle' | 'saving'>('loading')
  // 按 selector 订阅：全 store 订阅会在 toast 弹出/消失时重建 loadConfig → useEffect 无限重跑（自定义模型卡死根因）
  const showToast = useToastStore(s => s.showToast)

  const loadConfig = useCallback(async () => {
    const cfg = await getLlmProviderConfig()
    if (!cfg) {
      showToast('加载 AI 配置失败', 'error')
      setStatus('idle')
      return
    }
    setMulti({
      activeProviderId: cfg.activeProviderId,
      useBuiltIn: cfg.useBuiltIn,
      providers: cfg.providers ?? [],
      temperature: cfg.temperature ?? 0.7,
      maxTokens: cfg.maxTokens ?? 4096,
      proxyUrl: cfg.proxyUrl ?? '',
    })
    setApiKeyInputs({})
    setStatus('idle')
  }, [showToast])

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  if (status === 'loading' || !multi) {
    return (
      <div className="card">
        <div className="card-header"><h2 className="text-lg font-semibold text-[color:var(--fg)] flex items-center gap-2"><Icon name="Bot" size={20} /> AI 助手设置</h2></div>
        <div className="card-body">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-[color:var(--accent)] border-t-transparent" />
            <span className="ml-3 text-sm text-[color:var(--muted)]">加载中...</span>
          </div>
        </div>
      </div>
    )
  }

  const active = multi.providers.find(p => p.id === multi.activeProviderId) ?? null
  const dialogProvider = modelDialog ? multi.providers.find(p => p.id === modelDialog.providerId) : null

  /** 添加服务商：进列表并立即启用（切到自定义） */
  const handleAddProvider = (entry: { id: string; name: string; baseUrl: string; models: ProviderModelEntry[]; activeModelId: string }, apiKey: string) => {
    setMulti(m => m && ({
      ...m,
      providers: [...m.providers, { ...entry, apiKey }],
      activeProviderId: entry.id,
      useBuiltIn: false,
    }))
    if (apiKey) setApiKeyInputs(prev => ({ ...prev, [entry.id]: apiKey }))
    setAddingProvider(false)
  }

  /** 保存/删除模型后，provider 无默认模型时补第一个 */
  const normalizeActiveModel = (models: ProviderModelEntry[], activeModelId: string) =>
    models.some(m => m.id === activeModelId) ? activeModelId : (models[0]?.id ?? '')

  const handleSaveModel = (providerId: string, entry: ProviderModelEntry) => {
    setMulti(m => m && ({
      ...m,
      providers: m.providers.map(p => {
        if (p.id !== providerId) return p
        const exists = p.models.some(x => x.id === entry.id)
        const dupIgnoringCase = p.models.some(x => x.id.toLowerCase() === entry.id.toLowerCase())
        // 已有同名（含大小写变体）时按更新处理，绝不追加重复行
        const models = (exists || dupIgnoringCase)
          ? p.models.map(x => x.id.toLowerCase() === entry.id.toLowerCase() ? entry : x)
          : [...p.models, entry]
        return { ...p, models, activeModelId: normalizeActiveModel(models, p.activeModelId) }
      }),
    }))
    setModelDialog(null)
  }

  const handleConfirmDelete = () => {
    if (!delTarget) return
    setMulti(m => {
      if (!m) return m
      if (delTarget.kind === 'provider') {
        const providers = m.providers.filter(p => p.id !== delTarget.id)
        return {
          ...m,
          providers,
          activeProviderId: m.activeProviderId === delTarget.id ? (providers[0]?.id ?? null) : m.activeProviderId,
        }
      }
      return {
        ...m,
        providers: m.providers.map(p => {
          if (p.id !== delTarget.providerId) return p
          const models = p.models.filter(x => x.id !== delTarget.modelId)
          return { ...p, models, activeModelId: normalizeActiveModel(models, p.activeModelId) }
        }),
      }
    })
    setDelTarget(null)
  }

  /** 保存整份多服务商配置（空 key = 保留原密钥） */
  const handleSave = async () => {
    if (!multi) return
    setStatus('saving')
    try {
      const payload: MultiProviderConfig = {
        ...multi,
        providers: multi.providers.map(p => ({ ...p, apiKey: apiKeyInputs[p.id] ?? '' })),
      }
      const res = await saveLlmProviderConfig(payload)
      if (!res.success) { showToast(res.error || '保存失败', 'error'); return }
      await reloadLlmProviderConfig()   // 立即生效，无需重启
      showToast('AI 设置已保存', 'success')
      await loadConfig()
    } finally {
      setStatus('idle')
    }
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="text-lg font-semibold text-[color:var(--fg)] flex items-center gap-2"><Icon name="Bot" size={20} /> AI 助手设置</h2>
      </div>
      <div className="card-body space-y-5">
        {/* ── 内置模型开关 ── */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-[color:var(--fg-2)]">使用内置免费模型（推荐新手）</span>
            <p className="text-xs text-[color:var(--muted)] mt-0.5">关闭后使用下方启用的自定义服务商</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={multi.useBuiltIn}
            onClick={() => setMulti(m => m && ({ ...m, useBuiltIn: !m.useBuiltIn }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${multi.useBuiltIn ? 'bg-[color:var(--accent)]' : 'bg-[color:var(--panel-2)]'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-[color:var(--card)] shadow transition-transform ${multi.useBuiltIn ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        {/* ── 服务商列表 ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label mb-0">服务商（可添加多个，一键切换）</label>
            {!addingProvider && (
              <button
                type="button"
                onClick={() => setAddingProvider(true)}
                disabled={status === 'saving'}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors hover:bg-[color:var(--panel-2)] disabled:opacity-50 text-primary"
              >
                <Icon name="Plus" size={13} /> 添加服务商
              </button>
            )}
          </div>

          {addingProvider && (
            <ProviderAddForm
              disabled={status === 'saving'}
              currentProxy={multi.proxyUrl}
              onCancel={() => setAddingProvider(false)}
              onSaved={handleAddProvider}
            />
          )}

          <div className="space-y-2">
            {multi.providers.map(p => {
              const isActive = p.id === multi.activeProviderId && !multi.useBuiltIn
              return (
                <div key={p.id} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)]">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate text-foreground">{p.name}</span>
                      {isActive && <ActiveBadge />}
                    </div>
                    <p className="text-xs text-[color:var(--muted)] truncate mt-0.5">{p.baseUrl} · {p.models.length} 个模型</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!isActive && (
                      <button
                        type="button"
                        onClick={() => setMulti(m => m && ({ ...m, activeProviderId: p.id, useBuiltIn: false }))}
                        disabled={status === 'saving'}
                        className="px-2 py-1 rounded-lg text-xs font-medium hover:bg-[color:var(--panel-2)] disabled:opacity-50 text-primary"
                      >
                        启用
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setDelTarget({ kind: 'provider', id: p.id, label: p.name })}
                      disabled={status === 'saving'}
                      className="p-1.5 rounded-lg hover:bg-[color:var(--panel-2)] disabled:opacity-50 text-muted-foreground"
                      aria-label={`删除服务商 ${p.name}`}
                    >
                      <Icon name="Trash2" size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
            {multi.providers.length === 0 && !addingProvider && (
              <p className="text-xs text-[color:var(--muted)] py-2">还没有自定义服务商，点右上角「添加服务商」开始。</p>
            )}
          </div>
        </div>

        {/* ── 当前服务商的模型列表 ── */}
        {active && !multi.useBuiltIn && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">{active.name} 的模型（默认模型供首页对话使用）</label>
              <button
                type="button"
                onClick={() => setModelDialog({ providerId: active.id, entry: null })}
                disabled={status === 'saving'}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors hover:bg-[color:var(--panel-2)] disabled:opacity-50 text-primary"
              >
                <Icon name="Plus" size={13} /> 添加模型
              </button>
            </div>
            <div className="space-y-1.5">
              {active.models.map(m => {
                const isDefault = m.id === active.activeModelId
                return (
                  <div key={m.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)]">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm truncate text-foreground">{m.id}</span>
                      {m.input.includes('image') && <CapBadge label="图" title="支持图片输入" />}
                      {m.input.includes('video') && <CapBadge label="视" title="支持视频输入" />}
                      {isDefault && (
                        <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-micro font-medium bg-[color:var(--success-soft)] text-primary">
                          默认
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!isDefault && (
                        <button
                          type="button"
                          onClick={() => setMulti(prev => prev && ({
                            ...prev,
                            providers: prev.providers.map(p => p.id === active.id ? { ...p, activeModelId: m.id } : p),
                          }))}
                          disabled={status === 'saving'}
                          className="px-2 py-1 rounded-lg text-xs hover:bg-[color:var(--panel-2)] disabled:opacity-50 text-content-2"
                        >
                          设为默认
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setModelDialog({ providerId: active.id, entry: m })}
                        disabled={status === 'saving'}
                        className="px-2 py-1 rounded-lg text-xs hover:bg-[color:var(--panel-2)] disabled:opacity-50 text-content-2"
                      >
                        编辑
                      </button>
                      <button
                        type="button"
                        onClick={() => setDelTarget({ kind: 'model', providerId: active.id, modelId: m.id, label: m.id })}
                        disabled={status === 'saving'}
                        className="p-1.5 rounded-lg hover:bg-[color:var(--panel-2)] disabled:opacity-50 text-muted-foreground"
                        aria-label={`删除模型 ${m.id}`}
                      >
                        <Icon name="Trash2" size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}
              {active.models.length === 0 && (
                <p className="text-xs text-[color:var(--muted)] py-2">该服务商还没有模型，点右上角「添加模型」。</p>
              )}
            </div>
          </div>
        )}

        <GenerationParamsSection
          temperature={multi.temperature}
          maxTokens={multi.maxTokens}
          disabled={status === 'saving'}
          onChange={next => setMulti(m => m && ({ ...m, ...next }))}
        />

        {/* ── 网络代理 ── */}
        <div className="pt-4 border-t border-[color:var(--border)]">
          <label className="label">网络代理（可选）</label>
          <input
            type="text"
            value={multi.proxyUrl ?? ''}
            onChange={e => setMulti(m => m && ({ ...m, proxyUrl: e.target.value }))}
            disabled={status === 'saving'}
            placeholder="http://127.0.0.1:7890（留空 = 直连）"
            className="w-full px-3 py-2.5 rounded-lg text-sm border border-[color:var(--border)] bg-[color:var(--card)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-soft)] disabled:bg-[color:var(--panel-2)] disabled:text-[color:var(--muted)] disabled:cursor-not-allowed"
          />
          <p className="text-xs text-[color:var(--muted)] mt-1.5">
            访问 OpenAI、OpenRouter 等需代理的服务商时填写，对所有自定义服务商的请求生效；DeepSeek、智谱等国内厂商建议留空直连。
          </p>
        </div>

        {/* ── 保存 ── */}
        <div className="pt-2 flex items-center gap-3">
          <Button variant="primary" size="md" onClick={handleSave} disabled={status === 'saving'}>
            <Icon name="Save" size={16} /> {status === 'saving' ? '保存中...' : '保存'}
          </Button>
          <span className="text-xs text-[color:var(--muted)]">以上改动点「保存」后生效（密钥留空 = 保留原密钥）</span>
        </div>
      </div>

      {/* ── 添加/编辑模型弹窗 ── */}
      {modelDialog && dialogProvider && (
        <ModelEditDialog
          key={`${modelDialog.providerId}-${modelDialog.entry?.id ?? 'new'}`}
          isOpen
          title={modelDialog.entry ? '编辑模型' : '添加模型'}
          initial={modelDialog.entry}
          existingIds={dialogProvider.models.map(m => m.id).filter(id => id !== modelDialog.entry?.id)}
          onCancel={() => setModelDialog(null)}
          onSave={entry => handleSaveModel(modelDialog.providerId, entry)}
        />
      )}

      {/* ── 删除确认 ── */}
      <ConfirmDialog
        isOpen={delTarget !== null}
        onClose={() => setDelTarget(null)}
        onConfirm={handleConfirmDelete}
        title="确认删除"
        content={`确定要删除「${delTarget?.label ?? ''}」吗？点「保存」后生效。`}
        confirmText="删除"
        confirmVariant="danger"
      />
    </div>
  )
}
