/**
 * AI 设置拆分件 — 添加服务商表单 + 添加/编辑模型弹窗（行数门禁，主文件 ≤400 行）
 * 交互对齐成熟 Agent（Cherry Studio / ZCode）：服务商表单内可「获取模型列表」勾选启用；
 * 模型以弹窗添加/编辑（模型 ID + 输入/输出类型）。
 */

import { useState } from 'react'

/** 删除确认目标（主文件与弹窗共用） */
export type DelTarget =
  | { kind: 'provider'; id: string; label: string }
  | { kind: 'model'; providerId: string; modelId: string; label: string }

/** 当前生效徽章 */
export function ActiveBadge() {
  return (
    <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-micro font-medium bg-accent-soft text-primary">
      当前生效
    </span>
  )
}
import { Icon } from '@/components/ui/Icon'
import { Button } from '../../ui/Button'
import { Drawer } from '../../ui/Drawer'
import { useToastStore } from '@/store/toastStore'
import { testLlmProviderConnection } from '@/services/agent-client'
import type { ProviderModelEntry } from '@/types/agent'
import { CapabilityEditor, ModelMultiSelect } from './aiProviderSettingsParts'

const INPUT_CLS = 'w-full px-3 py-2.5 rounded-lg text-sm border border-[color:var(--border)] bg-[color:var(--card)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-soft)] disabled:bg-[color:var(--panel-2)] disabled:text-[color:var(--muted)] disabled:cursor-not-allowed'

/** 添加服务商表单（内联卡片）— 保存时通过 onSaved 回传条目与明文 key */
export function ProviderAddForm({
  disabled, currentProxy, onCancel, onSaved,
}: {
  disabled: boolean
  /** 当前已保存的全局代理（获取列表/测试连接时随请求携带） */
  currentProxy?: string
  onCancel: () => void
  onSaved: (entry: { id: string; name: string; baseUrl: string; models: ProviderModelEntry[]; activeModelId: string }, apiKey: string) => void
}) {
  const showToast = useToastStore(s => s.showToast)
  const [name, setName] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [fetched, setFetched] = useState<string[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState<null | 'testing' | 'fetching'>(null)

  /** 获取模型列表（OpenAI 兼容 /models 端点），默认全选 */
  const handleFetch = async () => {
    if (!baseUrl.trim()) { showToast('请先填写 Base URL', 'warning'); return }
    if (!apiKey.trim()) { showToast('需要填写 API Key（出于安全，已保存的密钥不会回填）', 'warning'); return }
    setBusy('fetching')
    try {
      const res = await testLlmProviderConnection({ baseUrl: baseUrl.trim(), apiKey: apiKey.trim(), proxyUrl: currentProxy })
      if (res.success && res.data?.models?.length) {
        // 网关类服务商（OneAPI/NewAPI 等）的 /models 常返回重复或大小写变体，统一入口去重
        const seen = new Set<string>()
        const models = res.data.models
          .map(m => m.trim())
          .filter(m => {
            const k = m.toLowerCase()
            if (!m || seen.has(k)) return false
            seen.add(k)
            return true
          })
        setFetched(models)
        setSelected(new Set(models))
        showToast(`获取成功，共 ${models.length} 个模型`, 'success')
      } else {
        showToast(res.error || res.message || '获取模型列表失败', 'error')
      }
    } finally {
      setBusy(null)
    }
  }

  /** 测试连接 */
  const handleTest = async () => {
    if (!baseUrl.trim()) { showToast('请先填写 Base URL', 'warning'); return }
    if (!apiKey.trim()) { showToast('需要填写 API Key（出于安全，已保存的密钥不会回填）', 'warning'); return }
    setBusy('testing')
    try {
      const res = await testLlmProviderConnection({ baseUrl: baseUrl.trim(), apiKey: apiKey.trim(), proxyUrl: currentProxy })
      if (res.success) showToast(`连接成功，检测到 ${res.data?.modelCount ?? 0} 个模型`, 'success')
      else showToast(res.error || '连接失败', 'error')
    } finally {
      setBusy(null)
    }
  }

  /** 保存服务商：勾选的模型作为初始模型列表（第一个为默认模型） */
  const handleSave = () => {
    if (!name.trim()) { showToast('请填写服务商名称', 'warning'); return }
    if (!baseUrl.trim()) { showToast('请填写 Base URL', 'warning'); return }
    const seen = new Set<string>()
    const models = fetched.filter(m => selected.has(m))
      .filter(m => {
        const k = m.toLowerCase()
        if (seen.has(k)) return false
        seen.add(k)
        return true
      })
      .map<ProviderModelEntry>(m => ({ id: m, input: ['text'], output: ['text'] }))
    onSaved(
      {
        id: `p_${Date.now()}`,
        name: name.trim(),
        baseUrl: baseUrl.trim(),
        models,
        activeModelId: models[0]?.id ?? '',
      },
      apiKey.trim(),
    )
  }

  return (
    <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--panel-2)] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">添加服务商</span>
        <button type="button" onClick={onCancel} className="p-1 rounded-lg hover:bg-[color:var(--panel-2)] text-muted-foreground" aria-label="取消添加">
          <Icon name="X" size={16} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">服务商名称</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} disabled={disabled}
            placeholder="如 DeepSeek / 智谱 / 自己起的名字" className={INPUT_CLS} />
        </div>
        <div>
          <label className="label">Base URL</label>
          <input type="text" value={baseUrl} onChange={e => setBaseUrl(e.target.value)} disabled={disabled}
            placeholder="https://api.openai.com/v1" className={INPUT_CLS} />
        </div>
      </div>

      <div>
        <label className="label">API Key</label>
        <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} disabled={disabled}
          placeholder="请输入 API Key" className={INPUT_CLS} />
      </div>

      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={handleFetch} disabled={disabled || busy !== null}>
          <Icon name="RefreshCw" size={14} className={busy === 'fetching' ? 'animate-spin' : ''} />
          {busy === 'fetching' ? '获取中...' : '获取模型列表'}
        </Button>
        <Button variant="secondary" size="sm" onClick={handleTest} disabled={disabled || busy !== null}>
          <Icon name="Plug" size={14} /> {busy === 'testing' ? '测试中...' : '测试连接'}
        </Button>
      </div>

      {fetched.length > 0 && (
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
      )}

      <div className="flex items-center justify-between pt-1">
        <p className="text-xs text-muted-foreground">
          未获取列表也可先保存，之后再手动添加模型。
        </p>
        <Button variant="primary" size="sm" onClick={handleSave} disabled={disabled || busy !== null}>
          <Icon name="Check" size={14} /> 保存服务商
        </Button>
      </div>
    </div>
  )
}

/** 添加/编辑模型弹窗 — 对齐 ZCode「编辑模型配置」（模型 ID + 输入/输出类型） */
export function ModelEditDialog({
  isOpen, title, initial, existingIds, onCancel, onSave,
}: {
  isOpen: boolean
  /** 弹窗标题：添加模型 / 编辑模型 */
  title: string
  /** 编辑时的初始条目（null = 新增） */
  initial: ProviderModelEntry | null
  /** 同服务商下已存在的模型 ID（查重；编辑时排除自身由调用方处理） */
  existingIds: string[]
  onCancel: () => void
  onSave: (entry: ProviderModelEntry) => void
}) {
  const showToast = useToastStore(s => s.showToast)
  const [id, setId] = useState(initial?.id ?? '')
  const [caps, setCaps] = useState({
    input: initial?.input ?? ['text'],
    output: initial?.output ?? ['text'],
  })

  const handleSave = () => {
    const modelId = id.trim()
    if (!modelId) { showToast('请填写模型 ID', 'warning'); return }
    if (existingIds.some(id => id.toLowerCase() === modelId.toLowerCase())) {
      showToast(`模型「${modelId}」已存在`, 'warning')
      return
    }
    onSave({ id: modelId, input: caps.input, output: caps.output })
  }

  return (
    <Drawer
      open={isOpen}
      onClose={onCancel}
      icon="Cpu"
      title={title}
      width={360}   // 小表单配窄抽屉：内容只有模型 ID + 能力两行，480px 默认宽留白过多
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onCancel}>取消</Button>
          <Button variant="primary" size="sm" onClick={handleSave}>保存模型</Button>
        </div>
      }
    >
      <div className="px-6 py-5 space-y-4">
        <div>
          <label className="label">模型 ID</label>
          <input
            type="text"
            value={id}
            onChange={e => setId(e.target.value)}
            placeholder="如 deepseek-chat / glm-5.3"
            className={INPUT_CLS}
            autoFocus
          />
        </div>
        <CapabilityEditor value={caps} onChange={setCaps} />
        <p className="text-xs text-muted-foreground">
          文本输入/输出为恒选；图片、视频用于标注多模态模型。
        </p>
      </div>
    </Drawer>
  )
}
