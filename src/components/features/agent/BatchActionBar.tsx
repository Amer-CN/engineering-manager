/**
 * BatchActionBar — 对话历史批量模式底部操作条（已选计数 + 删除所选 + 取消）
 * 从 ConversationHistory.tsx 抽出（CI 行数门禁拆分）。
 */

import React from 'react'
import { Icon } from '@/components/ui/Icon'

interface BatchActionBarProps {
  selectedCount: number
  onBatchDelete: () => void
  onExit: () => void
}

const BatchActionBar: React.FC<BatchActionBarProps> = ({
  selectedCount, onBatchDelete, onExit,
}) => (
  <div className="sticky bottom-0 px-3 py-2 border-t border-[color:var(--border)] bg-[color:var(--card)] flex items-center gap-2">
    <span className="text-xs text-[color:var(--muted)] flex-shrink-0">已选 {selectedCount} 条</span>
    <div className="flex items-center gap-1.5 ml-auto">
      <button onClick={onBatchDelete} disabled={selectedCount === 0}
        className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-danger-600 hover:bg-danger-50 disabled:opacity-50 disabled:pointer-events-none transition-colors">
        <Icon name="Trash2" size={14} />删除所选
      </button>
      <button onClick={onExit}
        className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-[color:var(--muted)] hover:bg-[color:var(--panel-2)] transition-colors">
        <Icon name="X" size={14} />取消
      </button>
    </div>
  </div>
)

export default BatchActionBar
