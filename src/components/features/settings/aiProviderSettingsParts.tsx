/**
 * AiProviderSection 的拆分件 — 行数门禁（主文件 ≤400 行）
 * 预设服务商常量 + 快捷档位按钮 + 模型选择列表
 */

import { Icon } from '@/components/ui/Icon'

/** 常用服务商预设（OpenAI 兼容端点；选自定义则手填 Base URL） */
export const PROVIDER_PRESETS: { name: string; baseUrl: string }[] = [
  { name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1' },
  { name: '智谱 GLM', baseUrl: 'https://open.bigmodel.cn/api/paas/v4' },
  { name: '阿里通义', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
  { name: '月之暗面 Kimi', baseUrl: 'https://api.moonshot.cn/v1' },
  { name: '硅基流动', baseUrl: 'https://api.siliconflow.cn/v1' },
  { name: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
  { name: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1' },
  { name: 'Ollama 本地', baseUrl: 'http://localhost:11434/v1' },
]

/** maxTokens 快捷档位 */
export const MAX_TOKEN_PRESETS = [2048, 4096, 8192, 16384]

/** 快捷档位按钮（温度 / maxTokens 共用样式） */
export function PresetButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${active ? 'border-[color:var(--accent)] bg-[color:var(--accent-soft)] text-[color:var(--accent)]' : 'border-[color:var(--border)] text-[color:var(--fg-2)] hover:border-[color:var(--border)]'}`}
    >
      {label}
    </button>
  )
}

/** 模型选择列表（「获取模型列表」结果；可搜索、点选回填模型名） */
export function ModelSelectList({
  models, current, search, onSearch, onSelect,
}: {
  models: string[]
  current: string
  search: string
  onSearch: (s: string) => void
  onSelect: (m: string) => void
}) {
  const filtered = search.trim()
    ? models.filter(m => m.toLowerCase().includes(search.trim().toLowerCase()))
    : models
  return (
    <div className="mb-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[color:var(--border)]">
        <Icon name="Search" size={13} className="text-[color:var(--muted)]" />
        <input
          type="text"
          value={search}
          onChange={e => onSearch(e.target.value)}
          placeholder={`搜索 ${models.length} 个模型...`}
          className="w-full bg-transparent text-xs focus:outline-none"
          style={{ color: 'var(--fg-2)' }}
        />
      </div>
      <div className="max-h-44 overflow-y-auto">
        {filtered.map(m => (
          <button
            key={m}
            type="button"
            onClick={() => onSelect(m)}
            className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-xs hover:bg-[color:var(--panel-2)] transition-colors text-left"
          >
            <span className="truncate" style={{ color: current === m ? 'var(--accent)' : 'var(--fg-2)', fontWeight: current === m ? 600 : 400 }}>
              {m}
            </span>
            {current === m && <Icon name="Check" size={13} className="text-[color:var(--accent)]" />}
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="px-3 py-3 text-xs text-center" style={{ color: 'var(--muted)' }}>没有匹配「{search}」的模型</div>
        )}
      </div>
    </div>
  )
}
