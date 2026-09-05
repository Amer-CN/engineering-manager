/**
 * AiProviderSection 的拆分件 — 行数门禁（主文件 ≤400 行）
 * 快捷档位按钮 + 模型能力编辑器 + 获取列表多选 + 服务商行/更换密钥
 */

import { useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { Button } from '../../ui/Button'
import { Drawer } from '../../ui/Drawer'
import type { ModelCapability, ProviderEntry } from '@/types/agent'

const INPUT_CLS = 'w-full px-3 py-2.5 rounded-lg text-sm border border-[color:var(--border)] bg-[color:var(--card)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-soft)] disabled:bg-[color:var(--panel-2)] disabled:text-[color:var(--muted)] disabled:cursor-not-allowed'

/** maxTokens 快捷档位 */
export const MAX_TOKEN_PRESETS = [2048, 4096, 8192, 16384]

/** 快捷档位按钮（温度 / maxTokens 共用样式） */
export function PresetButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${active ? 'border-[color:var(--accent)] bg-[color:var(--accent-soft)] text-[color:var(--accent)]' : 'border-[color:var(--border)] text-[color:var(--fg-2)] hover:border-[color:var(--border)]'}`}
    >
      {label}
    </button>
  )
}

/** 温度滑块样式（含 webkit 滑块拇指） */
const RANGE_CLS = `w-full h-1.5 rounded-full appearance-none bg-[color:var(--panel-2)] cursor-pointer
  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[color:var(--accent)]
  [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:cursor-pointer`

/** 温度档位描述（纯函数） */
function tempDesc(t: number): string {
  if (t < 0.4) return '🎯 精准模式：答案稳、准、可复现，适合查数据、算账、写规范。'
  if (t <= 0.75) return '⚖️ 均衡模式：稳中带活，兼顾准确与表达。推荐日常使用。'
  return '💡 发散模式：更有创意、更活泼，适合头脑风暴、写文案。'
}

/** 生成参数区块（温度 + maxTokens；改动即时回调，随整份配置一起保存） */
export function GenerationParamsSection({
  temperature, maxTokens, disabled, onChange,
}: {
  temperature: number
  maxTokens: number
  disabled: boolean
  onChange: (next: { temperature?: number; maxTokens?: number }) => void
}) {
  return (
    <>
      {/* ── 温度 ── */}
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
          onChange={e => onChange({ temperature: parseFloat(e.target.value) })}
          disabled={disabled}
          className={RANGE_CLS}
        />
        <div className="flex justify-between mt-1.5">
          <span className="text-caption text-[color:var(--muted)]">精准</span>
          <span className="text-caption text-[color:var(--muted)]">均衡</span>
          <span className="text-caption text-[color:var(--muted)]">发散</span>
        </div>
        <div className="flex gap-2 mt-2">
          <PresetButton label="精准 0.2" active={temperature === 0.2} onClick={() => onChange({ temperature: 0.2 })} />
          <PresetButton label="均衡 0.7" active={temperature === 0.7} onClick={() => onChange({ temperature: 0.7 })} />
          <PresetButton label="发散 1.0" active={temperature === 1.0} onClick={() => onChange({ temperature: 1.0 })} />
        </div>
        <p className="text-sm text-[color:var(--fg-2)] mt-2">{tempDesc(temperature)}</p>
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
              onClick={() => onChange({ maxTokens: v })}
            />
          ))}
        </div>
        <p className="text-xs text-[color:var(--muted)] mt-1.5">
          单次回答的长度上限。长报告/长文写作选 16K，日常问答 4K 足够。
        </p>
      </div>
    </>
  )
}

function LockedChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <span className="inline-flex items-center justify-center h-3.5 w-3.5 rounded-sm bg-[color:var(--accent)]">
        <Icon name="Check" size={10} className="text-[color:var(--card)]" />
      </span>
      {label}
      <Icon name="Lock" size={11} className="text-[color:var(--muted)]" />
    </span>
  )
}

/** 可勾选能力项 */
const INPUT_CAP_OPTIONS = [
  { key: 'image', label: '图片' },
  { key: 'video', label: '视频' },
]

/**
 * 模型能力编辑器 — 参照 ZCode「编辑模型配置」：
 * 输入类型：文本（锁定恒选）+ 图片/视频可选；输出类型：文本（锁定）
 */
export function CapabilityEditor({
  value, onChange,
}: {
  value: ModelCapability
  onChange: (next: ModelCapability) => void
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium w-14 shrink-0 text-content-2">输入类型</span>
        <LockedChip label="文本" />
        {INPUT_CAP_OPTIONS.map(t => (
          <label key={t.key} className="inline-flex items-center gap-1.5 text-xs cursor-pointer select-none text-content-2">
            <input
              type="checkbox"
              checked={value.input.includes(t.key)}
              onChange={e => {
                const input = e.target.checked
                  ? [...value.input, t.key]
                  : value.input.filter(k => k !== t.key)
                onChange({ ...value, input: input.length ? input : ['text'] })
              }}
              className="h-3.5 w-3.5 accent-[color:var(--accent)]"
            />
            {t.label}
          </label>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium w-14 shrink-0 text-content-2">输出类型</span>
        <LockedChip label="文本" />
      </div>
    </div>
  )
}

/** 能力徽章（模型行内；输入能力非纯文本才显示） */
export function CapBadge({ label, title }: { label: string; title: string }) {
  return (
    <span
      className="flex-shrink-0 px-1 py-0.5 rounded text-micro bg-accent-soft text-primary"
      title={title}
    >
      {label}
    </span>
  )
}

/** 当前生效徽章（服务商行用） */
export function KeyActiveBadge() {
  return (
    <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-micro font-medium bg-accent-soft text-primary">
      当前生效
    </span>
  )
}

/**
 * 服务商行 — 名称/副标题 + 按钮区（启用/更换密钥/删除）
 * 从 AiProviderSection 拆出以消化主文件行数门禁（≤400 行）
 */
export function ProviderRow({
  provider, isActive, disabled, onActivate, onOpenKeyDialog, onDelete,
}: {
  provider: ProviderEntry
  isActive: boolean
  disabled: boolean
  onActivate: () => void
  onOpenKeyDialog: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)]">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate text-foreground">{provider.name}</span>
          {isActive && <KeyActiveBadge />}
        </div>
        <p className="text-xs text-[color:var(--muted)] truncate mt-0.5">{provider.baseUrl} · {provider.models.length} 个模型</p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {!isActive && (
          <button
            type="button"
            onClick={onActivate}
            disabled={disabled}
            className="px-2 py-1 rounded-lg text-xs font-medium hover:bg-[color:var(--panel-2)] disabled:opacity-50 text-primary"
          >
            启用
          </button>
        )}
        <button
          type="button"
          onClick={onOpenKeyDialog}
          disabled={disabled}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium hover:bg-[color:var(--panel-2)] disabled:opacity-50 text-primary"
        >
          <Icon name="KeyRound" size={13} /> 更换密钥
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={disabled}
          className="p-1.5 rounded-lg hover:bg-[color:var(--panel-2)] disabled:opacity-50 text-muted-foreground"
          aria-label={`删除服务商 ${provider.name}`}
        >
          <Icon name="Trash2" size={14} />
        </button>
      </div>
    </div>
  )
}

/** 更换密钥弹窗 — 单个 password 输入框；空输入时保存禁用（已保存的密钥出于安全不会回填） */
export function KeyReplaceDialog({
  isOpen, providerName, onCancel, onSave,
}: {
  isOpen: boolean
  /** 服务商名称（拼标题用） */
  providerName: string
  onCancel: () => void
  /** 回传用户填写的新 key（已 trim，非空） */
  onSave: (apiKey: string) => void
}) {
  const [key, setKey] = useState('')
  const trimmed = key.trim()

  return (
    <Drawer
      open={isOpen}
      onClose={onCancel}
      icon="KeyRound"
      title={`更换 ${providerName} 的密钥`}
      width={360}   // 与 ModelEditDialog 同宽：单输入框小表单
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onCancel}>取消</Button>
          <Button variant="primary" size="sm" onClick={() => onSave(trimmed)} disabled={!trimmed}>保存密钥</Button>
        </div>
      }
    >
      <div className="px-6 py-5 space-y-3">
        <div>
          <label className="label">新 API Key</label>
          <input
            type="password"
            value={key}
            onChange={e => setKey(e.target.value)}
            placeholder="请输入新的 API Key"
            className={INPUT_CLS}
            autoFocus
          />
        </div>
        <p className="text-xs text-muted-foreground">
          密钥加密存储，不会回显。保存后立即生效。
        </p>
      </div>
    </Drawer>
  )
}

/**
 * 更换密钥弹窗宿主 — keyDialog 非空时渲染 KeyReplaceDialog
 * 从 AiProviderSection 拆出以消化主文件行数门禁（≤400 行）
 */
export function KeyReplaceHost({
  target, onCancel, onSave,
}: {
  /** 弹窗目标（providerId + 名称；null = 关闭） */
  target: { providerId: string; label: string } | null
  onCancel: () => void
  onSave: (providerId: string, apiKey: string) => void
}) {
  if (!target) return null
  return (
    <KeyReplaceDialog
      key={target.providerId}
      isOpen
      providerName={target.label}
      onCancel={onCancel}
      onSave={apiKey => onSave(target.providerId, apiKey)}
    />
  )
}

/**
 * 「获取模型列表」结果多选列表 — 添加服务商表单里勾选要启用的模型
 */
export function ModelMultiSelect({
  models, selected, onToggle, onToggleAll,
}: {
  models: string[]
  selected: Set<string>
  onToggle: (m: string) => void
  onToggleAll: (select: boolean) => void
}) {
  const [search, setSearch] = useState('')
  const filtered = search.trim()
    ? models.filter(m => m.toLowerCase().includes(search.trim().toLowerCase()))
    : models
  const allSelected = filtered.length > 0 && filtered.every(m => selected.has(m))
  return (
    <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-[color:var(--border)]">
        <div className="flex items-center gap-2 flex-1">
          <Icon name="Search" size={13} className="text-[color:var(--muted)]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={`搜索 ${models.length} 个模型...`}
            className="w-full bg-transparent text-xs focus:outline-none text-content-2"
          />
        </div>
        <button
          type="button"
          onClick={() => onToggleAll(!allSelected)}
          className="text-xs font-medium shrink-0 hover:opacity-80 text-primary"
        >
          {allSelected ? '取消全选' : '全选'}
        </button>
      </div>
      <div className="max-h-44 overflow-y-auto">
        {filtered.map(m => (
          <label
            key={m}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-[color:var(--panel-2)] transition-colors cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selected.has(m)}
              onChange={() => onToggle(m)}
              className="h-3.5 w-3.5 accent-[color:var(--accent)]"
            />
            <span className="truncate text-content-2">{m}</span>
          </label>
        ))}
        {filtered.length === 0 && (
          <div className="px-3 py-3 text-xs text-center text-muted-foreground">没有匹配「{search}」的模型</div>
        )}
      </div>
    </div>
  )
}
