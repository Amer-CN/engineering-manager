/**
 * ModelPicker — 输入框操作行内的模型名显示 + 思考等级（简化三档：快速/标准/深度）
 * 模型列表来自 GET /api/agent/models；当前模型名常显在操作行（点击可切换，单模型时纯展示）。
 * 思考等级 off/medium/high → reasoning_effort 透传（实测 Agnes 合法值 none/low/medium/high/max）。
 */

import React, { useState, useRef, useEffect } from 'react'
import { Icon } from '@/components/ui/Icon'
import { getAgentModels } from '@/services/agent-client'

export type ReasoningLevel = 'off' | 'medium' | 'high'

interface ModelPickerProps {
  /** 所选模型（null = 用后端默认） */
  model: string | null
  onModelChange: (model: string | null) => void
  reasoningLevel: ReasoningLevel
  onReasoningLevelChange: (level: ReasoningLevel) => void
}

const LEVEL_OPTIONS: { key: ReasoningLevel; label: string; icon: string }[] = [
  { key: 'off', label: '快速', icon: 'Zap' },
  { key: 'medium', label: '标准', icon: 'Brain' },
  { key: 'high', label: '深度', icon: 'Brain' },
]

const ModelPicker: React.FC<ModelPickerProps> = ({
  model, onModelChange, reasoningLevel, onReasoningLevelChange,
}) => {
  const [models, setModels] = useState<string[]>([])
  const [modelOpen, setModelOpen] = useState(false)
  const [levelOpen, setLevelOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    getAgentModels().then(list => { if (!cancelled && list.length > 1) setModels(list) })
      .catch(() => { /* 静默：列表不可用时隐藏选择器 */ })
    return () => { cancelled = true }
  }, [])

  // 点击外部关闭下拉
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setModelOpen(false)
        setLevelOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const showModelPicker = models.length > 1
  const currentLevel = LEVEL_OPTIONS.find(o => o.key === reasoningLevel) ?? LEVEL_OPTIONS[0]
  const activeModelName = model ?? models[0]

  return (
    <div ref={rootRef} className="flex items-center gap-1.5">
      {/* 模型名常显在操作行（②改版）：多模型可点击切换，单模型纯展示 */}
      <div className="relative">
        <button
          type="button"
          onClick={() => { if (showModelPicker) { setModelOpen(v => !v); setLevelOpen(false) } }}
          disabled={!showModelPicker}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors hover:bg-[color:var(--panel-2)] disabled:cursor-default"
          style={{ color: 'var(--muted)' }}
          title={showModelPicker ? '选择本次对话使用的模型' : activeModelName}
        >
          <Icon name="Cpu" size={13} />
          <span className="max-w-32 truncate">{activeModelName ?? '默认'}</span>
          {showModelPicker && <Icon name="ChevronDown" size={12} />}
        </button>
          {modelOpen && (
            <div className="absolute bottom-full left-0 mb-1.5 min-w-44 rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] shadow-lg overflow-hidden z-30">
              <button
                type="button"
                onClick={() => { onModelChange(null); setModelOpen(false) }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-[color:var(--panel-2)] transition-colors"
                style={{ color: model === null ? 'var(--accent)' : 'var(--fg-2)', fontWeight: model === null ? 600 : 400 }}
              >
                默认（跟随配置）
              </button>
              {models.map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { onModelChange(m); setModelOpen(false) }}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs hover:bg-[color:var(--panel-2)] transition-colors"
                >
                  <span className="truncate" style={{ color: model === m ? 'var(--accent)' : 'var(--fg-2)', fontWeight: model === m ? 600 : 400 }}>
                    {m}
                  </span>
                  {m.includes('pro') && (
                    <span
                      className="flex-shrink-0 px-1.5 py-0.5 rounded text-micro"
                      style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }}
                      title="付费模型：按 token 计费"
                    >
                      付费
                    </span>
                  )}
                  {!m.includes('pro') && (
                    <span
                      className="flex-shrink-0 px-1.5 py-0.5 rounded text-micro"
                      style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                    >
                      免费
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
      </div>

      {/* 思考等级（简化三档：快速/标准/深度） */}
      <div className="relative">
        <button
          type="button"
          onClick={() => { setLevelOpen(v => !v); setModelOpen(false) }}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors hover:bg-[color:var(--panel-2)]"
          style={{ color: reasoningLevel !== 'off' ? 'var(--accent)' : 'var(--muted)' }}
          title="思考等级：控制模型的推理深度"
        >
          <Icon name={currentLevel.icon} size={13} />
          <span>{currentLevel.label}思考</span>
          <Icon name="ChevronDown" size={12} />
        </button>
        {levelOpen && (
          <div className="absolute bottom-full left-0 mb-1.5 min-w-36 rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] shadow-lg overflow-hidden z-30">
            {LEVEL_OPTIONS.map(o => (
              <button
                key={o.key}
                type="button"
                onClick={() => { onReasoningLevelChange(o.key); setLevelOpen(false) }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[color:var(--panel-2)] transition-colors"
                style={{ color: reasoningLevel === o.key ? 'var(--accent)' : 'var(--fg-2)', fontWeight: reasoningLevel === o.key ? 600 : 400 }}
              >
                <Icon name={o.icon} size={12} />
                {o.label}思考
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ModelPicker
