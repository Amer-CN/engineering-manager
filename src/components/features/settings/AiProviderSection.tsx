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

/** 温度档位描述（纯函数，组件外） */
function tempDesc(t: number): string {
  if (t < 0.4) return '🎯 精准模式：答案稳、准、可复现，适合查数据、算账、写规范。'
  if (t <= 0.75) return '⚖️ 均衡模式：稳中带活，兼顾准确与表达。推荐日常使用。'
  return '💡 发散模式：更有创意、更活泼，适合头脑风暴、写文案。'
}

/** 表单字段（providerName / baseUrl / model 合并为一个对象，控制 useState 数量） */
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

type Status = 'loading' | 'idle' | 'saving' | 'testing'

/**
 * AI 助手设置卡片
 * - 内置/自定义模型切换
 * - Base URL / API Key / 模型名
 * - 测试连接
 * - 温度滑块（精准/均衡/发散）
 */
export function AiProviderSection() {
  const [useBuiltIn, setUseBuiltIn] = useState(true)
  const [form, setForm] = useState<FormFields>({ providerName: '', baseUrl: '', model: '' })
  const [apiKey, setApiKey] = useState('')          // 仅输入用；留空=保留原密钥
  const [hasApiKey, setHasApiKey] = useState(false)
  const [params, setParams] = useState<LlmParams>({ temperature: 0.7, maxTokens: 4096 })
  const [status, setStatus] = useState<Status>('loading')
  const toast = useToastStore()

  const { providerName, baseUrl, model } = form
  const { temperature, maxTokens } = params

  const loadConfig = useCallback(async () => {
    const cfg = await getLlmProviderConfig()
    if (!cfg) {
      toast.error('加载 AI 配置失败')
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
    setStatus('idle')
  }, [toast])

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  /** 测试连接 */
  const handleTest = async () => {
    if (!baseUrl.trim()) { toast.warning('请先填写 Base URL'); return }
    if (!apiKey.trim()) { toast.warning('测试连接需要填写 API Key（出于安全，已保存的密钥不会回填）'); return }
    setStatus('testing')
    try {
      const res = await testLlmProviderConnection({ baseUrl: baseUrl.trim(), apiKey: apiKey.trim() })
      if (res.success) toast.success(`连接成功，检测到 ${res.data?.modelCount ?? 0} 个模型`)
      else toast.error(res.error || '连接失败')
    } finally {
      setStatus('idle')
    }
  }

  /** 保存配置（整份回传，防止后端整体覆盖丢字段） */
  const handleSave = async () => {
    setStatus('saving')
    try {
      const payload: LlmProviderConfig = {
        providerName: providerName.trim() || (useBuiltIn ? 'Agnes' : 'Custom'),
        baseUrl: baseUrl.trim(),
        apiKey,                 // 留空 → 后端保留原密钥
        model: model.trim(),
        useBuiltIn,
        temperature,
        maxTokens,              // 原样回传，避免被重置为默认
      }
      const res = await saveLlmProviderConfig(payload)
      if (!res.success) { toast.error(res.error || '保存失败'); return }
      await reloadLlmProviderConfig()   // 立即生效，无需重启
      toast.success('AI 设置已保存')
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

  const inputDisabled = useBuiltIn || status === 'saving'

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

        {/* ── Base URL ── */}
        <div>
          <label className="label">Base URL</label>
          <input
            type="text"
            value={baseUrl}
            onChange={e => setForm(f => ({ ...f, baseUrl: e.target.value }))}
            disabled={inputDisabled}
            placeholder="https://api.openai.com/v1"
            className="w-full px-3 py-2.5 rounded-lg text-sm border border-[color:var(--border)] bg-[color:var(--card)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-soft)] disabled:bg-[color:var(--panel-2)] disabled:text-[color:var(--muted)] disabled:cursor-not-allowed"
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
            className="w-full px-3 py-2.5 rounded-lg text-sm border border-[color:var(--border)] bg-[color:var(--card)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-soft)] disabled:bg-[color:var(--panel-2)] disabled:text-[color:var(--muted)] disabled:cursor-not-allowed"
          />
        </div>

        {/* ── 模型名 ── */}
        <div>
          <label className="label">模型名</label>
          <input
            type="text"
            value={model}
            onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
            disabled={inputDisabled}
            placeholder="gpt-4o-mini"
            className="w-full px-3 py-2.5 rounded-lg text-sm border border-[color:var(--border)] bg-[color:var(--card)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-soft)] disabled:bg-[color:var(--panel-2)] disabled:text-[color:var(--muted)] disabled:cursor-not-allowed"
          />
        </div>

        {/* ── 测试连接 ── */}
        <div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleTest}
            disabled={status === 'testing' || useBuiltIn}
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
            className="w-full h-1.5 rounded-full appearance-none bg-[color:var(--panel-2)] cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[color:var(--accent)]
              [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:cursor-pointer"
          />
          {/* 三等分标签 */}
          <div className="flex justify-between mt-1.5">
            <span className="text-caption text-[color:var(--muted)]">精准</span>
            <span className="text-caption text-[color:var(--muted)]">均衡</span>
            <span className="text-caption text-[color:var(--muted)]">发散</span>
          </div>
          {/* 快捷按钮 */}
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => setParams(p => ({ ...p, temperature: 0.2 }))}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${temperature === 0.2 ? 'border-[color:var(--accent)] bg-[color:var(--accent-soft)] text-[color:var(--accent)]' : 'border-[color:var(--border)] text-[color:var(--fg-2)] hover:border-[color:var(--border)]'}`}
            >
              精准 0.2
            </button>
            <button
              onClick={() => setParams(p => ({ ...p, temperature: 0.7 }))}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${temperature === 0.7 ? 'border-[color:var(--accent)] bg-[color:var(--accent-soft)] text-[color:var(--accent)]' : 'border-[color:var(--border)] text-[color:var(--fg-2)] hover:border-[color:var(--border)]'}`}
            >
              均衡 0.7
            </button>
            <button
              onClick={() => setParams(p => ({ ...p, temperature: 1.0 }))}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${temperature === 1.0 ? 'border-[color:var(--accent)] bg-[color:var(--accent-soft)] text-[color:var(--accent)]' : 'border-[color:var(--border)] text-[color:var(--fg-2)] hover:border-[color:var(--border)]'}`}
            >
              发散 1.0
            </button>
          </div>
          {/* 动态说明 */}
          <p className="text-sm text-[color:var(--fg-2)] mt-2">{tempDesc(temperature)}</p>
          {/* 固定解释 */}
          <p className="text-xs text-[color:var(--muted)] mt-1.5">
            温度决定 AI 回答的「发挥尺度」：数值越低越稳、越靠谱；越高越有创意、越发散。拿不准就选「均衡」。
          </p>
        </div>

        {/* ── 保存 ── */}
        <div className="pt-2">
          <Button
            variant="primary"
            size="md"
            onClick={handleSave}
            disabled={status === 'saving'}
          >
            <Icon name="Save" size={16} /> {status === 'saving' ? '保存中...' : '保存'}
          </Button>
        </div>
      </div>
    </div>
  )
}
