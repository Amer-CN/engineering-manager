/**
 * ActiveModelNote — 「当前模型」单行小字
 *
 * 数据源 useActiveLlmModel（getLlmProviderConfig 包装）；
 * providerName / model 缺失或请求失败时渲染 null（不占位）。
 * 用于无模型选择器的 AI 功能界面（报告生成弹窗 / 文秘起草面板）。
 */

import { useActiveLlmModel } from '@/hooks/data/useActiveLlmModel'

const ActiveModelNote = () => {
  const { data: config } = useActiveLlmModel()
  if (!config?.providerName || !config?.model) return null
  return (
    <span className="text-micro" style={{ color: 'var(--muted)' }}>
      当前模型：{config.providerName} · {config.model}
    </span>
  )
}

export default ActiveModelNote
