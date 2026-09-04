/**
 * DocAttachmentChips — 文档附件 chips（AgentComposer 行数门禁拆分件，原 JSX 原样迁移）
 */

import { Icon } from '@/components/ui/Icon'

interface DocAttachmentChipsProps {
  items: { name: string; text: string }[]
  onRemove: (name: string) => void
}

function DocAttachmentChips({ items, onRemove }: DocAttachmentChipsProps) {
  if (items.length === 0) return null
  return (
    <div className="mb-2 flex flex-wrap gap-2">
      {items.map(d => (
        <div key={d.name} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel-2)]">
          <Icon name="FileText" size={13} className="text-[color:var(--muted)]" />
          <span className="text-xs text-[color:var(--fg-2)] max-w-40 truncate">{d.name}</span>
          <button
            type="button"
            onClick={() => onRemove(d.name)}
            aria-label={`移除 ${d.name}`}
            className="w-5 h-5 rounded flex items-center justify-center text-[color:var(--muted)] hover:text-[color:var(--fg-2)] hover:bg-[color:var(--card)] transition-colors"
          >
            <Icon name="X" size={11} />
          </button>
        </div>
      ))}
    </div>
  )
}

export default DocAttachmentChips
