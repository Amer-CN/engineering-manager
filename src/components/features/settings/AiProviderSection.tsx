import { useState, useEffect, useCallback, useRef } from 'react'
import { Icon } from '@/components/ui/Icon'
import { ConfirmDialog } from '../../ui/ConfirmDialog'
import { useToastStore } from '@/store/toastStore'
import {
  getLlmProviderConfig,
  saveLlmProviderConfig,
  reloadLlmProviderConfig,
} from '@/services/agent-client'
import type { MultiProviderConfig, ProviderModelEntry } from '@/types/agent'
import { GenerationParamsSection, KeyReplaceHost, VisibleProviders } from './aiProviderSettingsParts'
import { ProviderSettingsForm, ProviderModelList, ProviderModelFetch } from './aiProviderDetailParts'
import { ProviderAddForm, ModelEditDialog } from './aiProviderDialogs'

/** 删除确认目标（仅服务商：影响面大保留确认；模型删除免确认直接删） */
type DelTarget = { kind: 'provider'; id: string; label: string }

/**
 * AI 助手设置卡片 — 多服务商管理（对齐成熟 Agent 使用逻辑）
 * - 列表态：服务商列表（添加/启用/管理进入子页/删除）+ 生成参数（温度/maxTokens）+ 网络代理
 * - detail 态（服务商子页）纯净化：只渲染返回 + 服务商设置 + 模型管理（生成参数/代理仅 list 态）
 * - 所有改动即时自动保存（生成参数/代理输入防抖 800ms 合并）
 * - onDetailChange：上报 detail 态变化，父级 AiCapabilitySection 据此隐藏 OCR 区块
 */
export function AiProviderSection({ onDetailChange }: { onDetailChange?: (isDetail: boolean) => void }) {
  const [multi, setMulti] = useState<MultiProviderConfig | null>(null)
  /** 本次填写的新 API Key（providerId → key；留空 = 保留原密钥） */
  const [apiKeyInputs, setApiKeyInputs] = useState<Record<string, string>>({})
  const [addingProvider, setAddingProvider] = useState(false)
  const [modelDialog, setModelDialog] = useState<{ providerId: string; entry: ProviderModelEntry | null } | null>(null)
  const [delTarget, setDelTarget] = useState<DelTarget | null>(null)
  /** 更换密钥弹窗目标（providerId + 名称） */
  const [keyDialog, setKeyDialog] = useState<{ providerId: string; label: string } | null>(null)
  /** 是否显示被隐藏的内置 Agnes 重复条目（默认隐藏，误删保护） */
  const [showHiddenAgnes, setShowHiddenAgnes] = useState(false)
  /** 服务商子页视图：列表态 / 详情态（沿 Projects 的 view 先例） */
  const [view, setView] = useState<{ mode: 'list' } | { mode: 'detail'; providerId: string }>({ mode: 'list' })
  /** detail 态模型多选勾选集合（批量删除用） */
  const [selectedModelIds, setSelectedModelIds] = useState<Set<string>>(new Set())
  const [status, setStatus] = useState<'loading' | 'idle' | 'saving'>('loading')
  // 按 selector 订阅：全 store 订阅会在 toast 弹出/消失时重建 loadConfig → useEffect 无限重跑（自定义模型卡死根因）
  const showToast = useToastStore(s => s.showToast)
  /** 最近一次自动保存的错误信息（成功时清空） */
  const [saveError, setSaveError] = useState<string | null>(null)
  // ref 镜像：自动保存读最新 state，避免闭包吃到旧值
  const multiRef = useRef<MultiProviderConfig | null>(null)
  multiRef.current = multi
  const apiKeyInputsRef = useRef<Record<string, string>>({})
  apiKeyInputsRef.current = apiKeyInputs
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)   // 防抖 timer（800ms 合并保存），unmount 时冲刷
  // unmount 冲刷：防抖窗口内切走页面时把挂起的改动立即落库，不丢最后一次输入。
  // saveNow 经 ref 转发（saveNowRef），unmount 闭包拿到的是最新实现，避免闭包过期。
  const saveNowRef = useRef<() => Promise<void>>(async () => {})
  useEffect(() => () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
      void saveNowRef.current()
    }
  }, [])

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

  useEffect(() => { onDetailChange?.(view.mode === 'detail') }, [view.mode, onDetailChange])

  /** 立即保存整份配置（空 key = 保留原密钥）；成功静默生效，失败 toast + 行内红字 */
  const saveNow = async () => {
    const cur = multiRef.current
    if (!cur) return
    setStatus('saving')
    try {
      const res = await saveLlmProviderConfig({ ...cur, providers: cur.providers.map(p => ({ ...p, apiKey: apiKeyInputsRef.current[p.id] ?? '' })) })
      const err = res.success ? null : res.error || '保存失败'
      setSaveError(err)
      if (err) { showToast(err, 'error'); return }
      await reloadLlmProviderConfig()   // 立即生效，无需重启
      showToast('AI 设置已保存', 'success')
    } finally {
      setStatus('idle')
    }
  }
  saveNowRef.current = saveNow   // unmount 冲刷经 ref 调最新实现

  /** 更新 multi（同步刷 ref 镜像）并自动保存：immediate=true 立即保存，false 防抖 800ms 合并连续改动 */
  const applyUpdate = (updater: (m: MultiProviderConfig) => MultiProviderConfig, immediate: boolean) => {
    const cur = multiRef.current
    if (!cur) return
    const next = updater(cur)
    multiRef.current = next
    setMulti(next)
    if (immediate) {
      // 立即保存时取消挂起的防抖 timer：同一次改动不连发两次请求
      if (saveTimerRef.current) { clearTimeout(saveTimerRef.current); saveTimerRef.current = null }
      void saveNow(); return
    }
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => { saveTimerRef.current = null; void saveNow() }, 800)
  }

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

  /** detail 态目标服务商（找不到时回退列表态） */
  const detailProvider = view.mode === 'detail' ? multi.providers.find(p => p.id === view.providerId) ?? null : null
  const dialogProvider = modelDialog ? multi.providers.find(p => p.id === modelDialog.providerId) : null

  /** 添加服务商：进列表并立即启用（切到自定义），自动保存 */
  const handleAddProvider = (entry: { id: string; name: string; baseUrl: string; models: ProviderModelEntry[]; activeModelId: string; protocol: 'chat' | 'responses' | 'anthropic' }, apiKey: string) => {
    const nextInputs = apiKey ? { ...apiKeyInputsRef.current, [entry.id]: apiKey } : apiKeyInputsRef.current
    apiKeyInputsRef.current = nextInputs   // 同步 ref：saveNow 立即读时不受 setState 异步影响
    setApiKeyInputs(nextInputs)
    applyUpdate(m => ({
      ...m,
      providers: [...m.providers, { ...entry, apiKey }],
      activeProviderId: entry.id,
      useBuiltIn: false,
    }), true)
    setAddingProvider(false)
  }

  /** 保存/删除模型后，provider 无默认模型时补第一个 */
  const normalizeActiveModel = (models: ProviderModelEntry[], activeModelId: string) =>
    models.some(m => m.id === activeModelId) ? activeModelId : (models[0]?.id ?? '')

  const handleSaveModel = (providerId: string, entry: ProviderModelEntry) => {
    applyUpdate(m => ({
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
    }), true)
    setModelDialog(null)
  }

  /** 更换密钥：只改目标 provider 的 ref 项后立即保存，其他 provider 仍发空串走「沿用旧值」 */
  const handleReplaceKey = (providerId: string, apiKey: string) => {
    const nextInputs = { ...apiKeyInputsRef.current, [providerId]: apiKey }
    apiKeyInputsRef.current = nextInputs   // 同步 ref：saveNow 立即读时不受 setState 异步影响
    setApiKeyInputs(nextInputs)
    applyUpdate(m => m, true)
    setKeyDialog(null)
  }

  const handleConfirmDelete = () => {
    if (!delTarget) return
    applyUpdate(m => {
      const providers = m.providers.filter(p => p.id !== delTarget.id)
      // 删除的是当前激活条目 → 自动切回内置（useBuiltIn=true），避免悬空态导致 LLM 调用 401
      if (m.activeProviderId === delTarget.id) {
        return { ...m, providers, activeProviderId: providers[0]?.id ?? null, useBuiltIn: providers.length === 0 ? true : m.useBuiltIn }
      }
      return { ...m, providers }
    }, true)
    setDelTarget(null)
  }

  /** 删除模型（detail 态免确认直接删；ids 支持多个走批量），随后清空多选 */
  const deleteModels = (providerId: string, ids: string[]) => {
    const idSet = new Set(ids)
    applyUpdate(m => ({
      ...m,
      providers: m.providers.map(p => {
        if (p.id !== providerId) return p
        const models = p.models.filter(x => !idSet.has(x.id))
        return { ...p, models, activeModelId: normalizeActiveModel(models, p.activeModelId) }
      }),
    }), true)
    setSelectedModelIds(new Set())
  }

  /** 多选勾选 / 全选（仅 detail 态使用） */
  const toggleModelSelect = (modelId: string) => {
    setSelectedModelIds(prev => {
      const next = new Set(prev)
      if (next.has(modelId)) next.delete(modelId)
      else next.add(modelId)
      return next
    })
  }
  const toggleAllModels = (providerId: string, select: boolean) => {
    const p = multiRef.current?.providers.find(x => x.id === providerId)
    setSelectedModelIds(select ? new Set((p?.models ?? []).map(m => m.id)) : new Set())
  }

  /** 进 detail 态 / 回列表态（切换时清空多选残留） */
  const openDetail = (providerId: string) => {
    setSelectedModelIds(new Set())
    setView({ mode: 'detail', providerId })
  }
  const backToList = () => {
    setSelectedModelIds(new Set())
    setView({ mode: 'list' })
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="text-lg font-semibold text-[color:var(--fg)] flex items-center gap-2"><Icon name="Bot" size={20} /> AI 助手设置</h2>
      </div>
      <div className="card-body space-y-5">
        {detailProvider ? (
          <>
            {/* ── detail 态：返回 + 服务商设置 + 模型管理 ── */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={backToList}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors hover:bg-[color:var(--panel-2)] text-content-2 flex-shrink-0"
              >
                <Icon name="ArrowLeft" size={13} /> 返回服务商列表
              </button>
              <h3 className="text-sm font-semibold text-[color:var(--fg)] truncate">{detailProvider.name}</h3>
            </div>
            <ProviderSettingsForm
              provider={detailProvider}
              isActive={detailProvider.id === multi.activeProviderId && !multi.useBuiltIn}
              disabled={status === 'saving'}
              onPatch={patch => applyUpdate(m => ({ ...m, providers: m.providers.map(x => x.id === detailProvider.id ? { ...x, ...patch } : x) }), false)}
              onProtocolChange={protocol => applyUpdate(m => ({ ...m, providers: m.providers.map(x => x.id === detailProvider.id ? { ...x, protocol } : x) }), true)}
              onOpenKeyDialog={() => setKeyDialog({ providerId: detailProvider.id, label: detailProvider.name })}
              onActivate={() => applyUpdate(m => ({ ...m, activeProviderId: detailProvider.id, useBuiltIn: false }), true)}
            />
            <ProviderModelFetch provider={detailProvider} disabled={status === 'saving'} onApply={entries => applyUpdate(m => ({ ...m, providers: m.providers.map(p => p.id === detailProvider.id ? { ...p, models: [...p.models, ...entries.filter(e => !p.models.some(x => x.id.toLowerCase() === e.id.toLowerCase()))] } : p) }), true)} />
            <ProviderModelList
              provider={detailProvider}
              disabled={status === 'saving'}
              selectedIds={selectedModelIds}
              onToggleSelect={toggleModelSelect}
              onToggleAll={select => toggleAllModels(detailProvider.id, select)}
              onAddModel={() => setModelDialog({ providerId: detailProvider.id, entry: null })}
              onEditModel={entry => setModelDialog({ providerId: detailProvider.id, entry })}
              onSetDefault={modelId => applyUpdate(m => ({ ...m, providers: m.providers.map(p => p.id === detailProvider.id ? { ...p, activeModelId: modelId } : p) }), true)}
              onDeleteModel={modelId => deleteModels(detailProvider.id, [modelId])}
              onDeleteSelected={() => deleteModels(detailProvider.id, [...selectedModelIds])}
            />
          </>
        ) : (
          <>
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
            onClick={() => applyUpdate(m => ({ ...m, useBuiltIn: !m.useBuiltIn }), true)}
            disabled={status === 'saving'}
            aria-label="使用内置免费模型"
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${multi.useBuiltIn ? 'bg-[color:var(--accent)]' : 'bg-[color:var(--panel-2)]'}`}
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

          <VisibleProviders
            providers={multi.providers}
            showHiddenAgnes={showHiddenAgnes}
            addingProvider={addingProvider}
            activeProviderId={multi.activeProviderId}
            useBuiltIn={multi.useBuiltIn}
            disabled={status === 'saving'}
            onActivate={(id) => applyUpdate(m => ({ ...m, activeProviderId: id, useBuiltIn: false }), true)}
            onManage={openDetail}
            onDelete={(id, label) => setDelTarget({ kind: 'provider', id, label })}
            onShowHidden={() => setShowHiddenAgnes(true)}
          />
        </div>

        {/* ── 生成参数 + 网络代理：仅 list 态显示（detail 态子页纯净化） ── */}
        <GenerationParamsSection
          temperature={multi.temperature} maxTokens={multi.maxTokens}
          disabled={status === 'saving'}
          onChange={next => applyUpdate(m => ({ ...m, ...next }), false)}
        />

        {/* ── 网络代理 ── */}
        <div className="pt-4 border-t border-[color:var(--border)]">
          <label className="label">网络代理（可选）</label>
          <input
            type="text"
            value={multi.proxyUrl ?? ''}
            onChange={e => applyUpdate(m => ({ ...m, proxyUrl: e.target.value }), false)}
            disabled={status === 'saving'}
            placeholder="http://127.0.0.1:7890（留空 = 直连）"
            className="w-full px-3 py-2.5 rounded-lg text-sm border border-[color:var(--border)] bg-[color:var(--card)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-soft)] disabled:bg-[color:var(--panel-2)] disabled:text-[color:var(--muted)] disabled:cursor-not-allowed"
          />
          <p className="text-xs text-[color:var(--muted)] mt-1.5">
            访问 OpenAI、OpenRouter 等需代理的服务商时填写，对所有自定义服务商的请求生效；DeepSeek、智谱等国内厂商建议留空直连。
          </p>
        </div>
          </>
        )}

        {/* ── 自动保存状态 ── */}
        <div className="pt-2 flex items-center gap-2 text-xs">
          {saveError ? <span className="text-[color:var(--danger)]">保存失败：{saveError}</span> : status === 'saving' ? <span className="text-[color:var(--muted)]">保存中...</span> : <span className="text-[color:var(--muted)]">改动自动保存</span>}
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

      {/* ── 更换密钥弹窗 ── */}
      <KeyReplaceHost
        target={keyDialog}
        onCancel={() => setKeyDialog(null)}
        onSave={handleReplaceKey}
      />

      {/* ── 删除确认 ── */}
      <ConfirmDialog
        isOpen={delTarget !== null}
        onClose={() => setDelTarget(null)}
        onConfirm={handleConfirmDelete}
        title="确认删除"
        content={`确定要删除「${delTarget?.label ?? ''}」吗？`}
        confirmText="删除"
        confirmVariant="danger"
      />
    </div>
  )
}
