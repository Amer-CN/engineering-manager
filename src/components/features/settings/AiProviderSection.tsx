import { useState, useEffect, useCallback } from 'react'
import { Icon } from '@/components/ui/Icon'
import { Button } from '../../ui/Button'
import { useToastStore } from '@/store/toastStore'
import {
  getLlmProviderConfig,
  saveLlmProviderConfig,
  testLlmProviderConnection,
  reloadLlmProviderConfig,
} from '@/services/agent-client'
import type { LlmProviderConfig } from '@/types/agent'
import { PROVIDER_PRESETS, MAX_TOKEN_PRESETS, PresetButton, ModelSelectList } from './aiProviderSettingsParts'

/** 温度档位描述（纯函数，组件外） */
function tempDesc(t: number): string {
  if (t < 0.4) return '🎯 精准模式：答案稳、准、可复现，适合查数据、算账、写规范。'
  if (t <= 0.75) return '⚖️ 均衡模式：稳中带活，兼顾准确与表达。推荐日常使用。'
  return '💡 发散模式：更有创意、更活泼，适合头脑风暴、写文案。'
}

/** 统一文本输入框样式（Base URL / API Key / 模型名共用） */
const INPUT_CLS = 'w-full px-3 py-2.5 rounded-lg text-sm border border-[color:var(--border)] bg-[color:var(--card)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-soft)] disabled:bg-[color:var(--panel-2)] disabled:text-[color:var(--muted)] disabled:cursor-not-allowed'

/** 温度滑块样式（含 webkit 滑块拇指） */
const RANGE_CLS = `w-full h-1.5 rounded-full appearance-none bg-[color:var(--panel-2)] cursor-pointer
  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[color:var(--accent)]
  [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:cursor-pointer`

/** 表单字段（合并为一个对象，控制 useState 数量） */
interface FormFields {
  providerName: string
  baseUrl: string
  model: string
}

/** LLM 参数（temperature / maxTokens 合并） */
interface LlmParams {
  temperature: number
  maxTokens: number
}

type Status = 'loading' | 'idle' | 'saving' | 'testing' | 'fetchingModels'

/**
 * AI 助手设置卡片
 * - 内置/自定义模型切换
 * - 服务商预设（自动填 Base URL）/ Base URL / API Key
 * - 获取模型列表（/models 拉取，选中即回填模型名，手填兜底）
 * - 测试连接
 * - 温度滑块（精准/均衡/发散）+ maxTokens
 */
export function AiProviderSection() {
  const [useBuiltIn, setUseBuiltIn] = useState(true)
  const [form, setForm] = useState<FormFields>({ providerName: '', baseUrl: '', model: '' })
  const [apiKey, setApiKey] = useState('')          // 仅输入用；留空=保留原密钥
  const [hasApiKey, setHasApiKey] = useState(false)
  const [params, setParams] = useState<LlmParams>({ temperature: 0.7, maxTokens: 4096 })
  const [status, setStatus] = useState<Status>('loading')
  /** 「获取模型列表」拉到的清单（保存时随配置持久化） */
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [modelSearch, setModelSearch] = useState('')
  // 按 selector 订阅：全 store 订阅会在 toast 弹出/消失时重建 loadConfig → useEffect 无限重跑（自定义模型卡死根因）
  const showToast = useToastStore(s => s.showToast)

  const { providerName, baseUrl, model } = form
  const { temperature, maxTokens } = params

  const loadConfig = useCallback(async () => {
    const cfg = await getLlmProviderConfig()
    if (!cfg) {
      showToast('加载 AI 配置失败', 'error')
      setStatus('idle')
      return
    }
    setUseBuiltIn(cfg.useBuiltIn)
    setForm({
      providerName: cfg.providerName || '',
      baseUrl: cfg.baseUrl || '',
      model: cfg.model || '',
    })
    setApiKey('')
    setHasApiKey(cfg.hasApiKey)
    setParams({
      temperature: cfg.temperature ?? 0.7,
      maxTokens: cfg.maxTokens ?? 4096,
    })
    setAvailableModels(cfg.availableModels?.length ? cfg.availableModels : (cfg.model ? [cfg.model] : []))
    setStatus('idle')
  }, [showToast])

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  /** 选中预设服务商：自动填 providerName + baseUrl */
  const handlePickPreset = (name: string) => {
    const preset = PROVIDER_PRESETS.find(p => p.name === name)
    if (!preset) return
    setForm(f => ({ ...f, providerName: preset.name, baseUrl: preset.baseUrl }))
  }

  /** 调用连接类接口前的公共校验（地址 + 密钥） */
  const requireUrlAndKey = (): { baseUrl: string; apiKey: string } | null => {
    if (!baseUrl.trim()) { showToast('请先填写 Base URL', 'warning'); return null }
    if (!apiKey.trim()) { showToast('需要填写 API Key（出于安全，已保存的密钥不会回填）', 'warning'); return null }
    return { baseUrl: baseUrl.trim(), apiKey: apiKey.trim() }
  }

  /** 获取模型列表（OpenAI 兼容 /models 端点） */
  const handleFetchModels = async () => {
    const input = requireUrlAndKey()
    if (!input) return
    setStatus('fetchingModels')
    try {
      const res = await testLlmProviderConnection(input)
      if (res.success && res.data?.models?.length) {
        setAvailableModels(res.data.models)
        showToast(`获取成功，共 ${res.data.models.length} 个模型`, 'success')
      } else {
        showToast(res.error || res.message || '获取模型列表失败', 'error')
      }
    } finally {
      setStatus('idle')
    }
  }

  /** 测试连接 */
  const handleTest = async () => {
    const input = requireUrlAndKey()
    if (!input) return
    setStatus('testing')
    try {
      const res = await testLlmProviderConnection(input)
      if (res.success) showToast(`连接成功，检测到 ${res.data?.modelCount ?? 0} 个模型`, 'success')
      else showToast(res.error || '连接失败', 'error')
    } finally {
      setStatus('idle')
    }
  }

  /** 保存配置（整份回传，防止后端整体覆盖丢字段） */
  const handleSave = async () => {
    setStatus('saving')
    try {
      // 模型清单：确保当前手填的模型在清单内（选了列表模型或沿用旧清单时原样保存）
      const models = model.trim() && !availableModels.includes(model.trim())
        ? [model.trim(), ...availableModels]
        : availableModels
      const payload: LlmProviderConfig = {
        providerName: providerName.trim() || (useBuiltIn ? 'Agnes' : 'Custom'),
        baseUrl: baseUrl.trim(),
        apiKey,                 // 留空 → 后端保留原密钥
        model: model.trim(),
        useBuiltIn,
        temperature,
        maxTokens,              // 原样回传，避免被重置为默认
        availableModels: models,
      }
      const res = await saveLlmProviderConfig(payload)
      if (!res.success) { showToast(res.error || '保存失败', 'error'); return }
      await reloadLlmProviderConfig()   // 立即生效，无需重启
      showToast('AI 设置已保存', 'success')
      await loadConfig()                 // 刷新显示 + hasApiKey，并清空 apiKey 输入
    } finally {
      setStatus('idle')
    }
  }

  if (status === 'loading') {
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

  const inputDisabled = useBuiltIn || status === 'saving' || status === 'fetchingModels' || status === 'testing'
  const busy = status !== 'idle'

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
            <p className="text-xs text-[color:var(--muted)] mt-0.5">关闭后可自定义 API 提供商</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={useBuiltIn}
            onClick={() => setUseBuiltIn(v => !v)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${useBuiltIn ? 'bg-[color:var(--accent)]' : 'bg-[color:var(--panel-2)]'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-[color:var(--card)] shadow transition-transform ${useBuiltIn ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        {/* ── 服务商预设（快捷选 Base URL）── */}
        <div>
          <label className="label">服务商（常用预设，选中自动填地址）</label>
          <select
            value={PROVIDER_PRESETS.some(p => p.baseUrl === baseUrl) ? PROVIDER_PRESETS.find(p => p.baseUrl === baseUrl)!.name : ''}
            onChange={e => e.target.value && handlePickPreset(e.target.value)}
            disabled={inputDisabled}
            className={INPUT_CLS}
          >
            <option value="">自定义 / 不在列表中</option>
            {PROVIDER_PRESETS.map(p => (
              <option key={p.name} value={p.name}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* ── Base URL ── */}
        <div>
          <label className="label">Base URL</label>
          <input
            type="text"
            value={baseUrl}
            onChange={e => setForm(f => ({ ...f, baseUrl: e.target.value }))}
            disabled={inputDisabled}
            placeholder="https://api.openai.com/v1"
            className={INPUT_CLS}
          />
        </div>

        {/* ── API Key ── */}
        <div>
          <label className="label">API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            disabled={inputDisabled}
            placeholder={hasApiKey ? '已配置，留空则保留原密钥' : '请输入 API Key'}
            className={INPUT_CLS}
          />
        </div>

        {/* ── 获取模型列表 + 模型选择 ── */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="label mb-0">模型名</label>
            <button
              type="button"
              onClick={handleFetchModels}
              disabled={inputDisabled}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors hover:bg-[color:var(--panel-2)] disabled:cursor-not-allowed disabled:opacity-50"
              style={{ color: 'var(--accent)' }}
            >
              <Icon name="RefreshCw" size={12} className={status === 'fetchingModels' ? 'animate-spin' : ''} />
              {status === 'fetchingModels' ? '获取中...' : '获取模型列表'}
            </button>
          </div>

          {/* 模型选择列表（拉到清单后展示；点选即回填模型名） */}
          {availableModels.length > 0 && !useBuiltIn && (
            <ModelSelectList
              models={availableModels}
              current={model}
              search={modelSearch}
              onSearch={setModelSearch}
              onSelect={m => setForm(f => ({ ...f, model: m }))}
            />
          )}

          {/* 手填兜底：列表外模型照填 */}
          <input
            type="text"
            value={model}
            onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
            disabled={inputDisabled}
            placeholder="gpt-4o-mini（也可从上方列表选择）"
            className={INPUT_CLS}
          />
          <p className="text-xs text-[color:var(--muted)] mt-1">
            填好地址和密钥后点「获取模型列表」可直接挑选；清单外或本地模型可手动填写。
          </p>
        </div>

        {/* ── 测试连接 ── */}
        <div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleTest}
            disabled={busy || useBuiltIn}
          >
            <Icon name="Plug" size={14} /> {status === 'testing' ? '测试中...' : '测试连接'}
          </Button>
        </div>

        {/* ── 温度滑块 ── */}
        <div className="pt-4 border-t border-[color:var(--border)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[color:var(--fg-2)]">温度</span>
            <span className="text-sm text-[color:var(--fg-2)] tabular-nums flex items-center gap-2">
              温度 {temperature.toFixed(1)}
              {temperature === 0.7 && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-success-100 text-success-700 text-caption font-medium">
                  推荐
                </span>
              )}
            </span>
          </div>
          <input
            type="range" min={0} max={1} step={0.1} value={temperature}
            onChange={e => setParams(p => ({ ...p, temperature: parseFloat(e.target.value) }))}
            className={RANGE_CLS}
          />
          {/* 三等分标签 */}
          <div className="flex justify-between mt-1.5">
            <span className="text-caption text-[color:var(--muted)]">精准</span>
            <span className="text-caption text-[color:var(--muted)]">均衡</span>
            <span className="text-caption text-[color:var(--muted)]">发散</span>
          </div>
          {/* 快捷按钮 */}
          <div className="flex gap-2 mt-2">
            <PresetButton label="精准 0.2" active={temperature === 0.2} onClick={() => setParams(p => ({ ...p, temperature: 0.2 }))} />
            <PresetButton label="均衡 0.7" active={temperature === 0.7} onClick={() => setParams(p => ({ ...p, temperature: 0.7 }))} />
            <PresetButton label="发散 1.0" active={temperature === 1.0} onClick={() => setParams(p => ({ ...p, temperature: 1.0 }))} />
          </div>
          {/* 动态说明 */}
          <p className="text-sm text-[color:var(--fg-2)] mt-2">{tempDesc(temperature)}</p>
          {/* 固定解释 */}
          <p className="text-xs text-[color:var(--muted)] mt-1.5">
            温度决定 AI 回答的「发挥尺度」：数值越低越稳、越靠谱；越高越有创意、越发散。拿不准就选「均衡」。
          </p>
        </div>

        {/* ── 最大输出 Tokens ── */}
        <div className="pt-4 border-t border-[color:var(--border)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[color:var(--fg-2)]">最大输出长度（maxTokens）</span>
            <span className="text-sm text-[color:var(--fg-2)] tabular-nums">{maxTokens.toLocaleString()} tokens</span>
          </div>
          <div className="flex gap-2">
            {MAX_TOKEN_PRESETS.map(v => (
              <PresetButton
                key={v}
                label={`${(v / 1024).toFixed(0)}K`}
                active={maxTokens === v}
                onClick={() => setParams(p => ({ ...p, maxTokens: v }))}
              />
            ))}
          </div>
          <p className="text-xs text-[color:var(--muted)] mt-1.5">
            单次回答的长度上限。长报告/长文写作选 16K，日常问答 4K 足够。
          </p>
        </div>

        {/* ── 保存 ── */}
        <div className="pt-2">
          <Button
            variant="primary"
            size="md"
            onClick={handleSave}
            disabled={busy}
          >
            <Icon name="Save" size={16} /> {status === 'saving' ? '保存中...' : '保存'}
          </Button>
        </div>
      </div>
    </div>
  )
}
