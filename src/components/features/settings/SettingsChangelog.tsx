import React from 'react'
import { Icon } from '../../ui/Icon'
import { Modal } from '../../ui/Modal/Modal'
import { versions, type ChangelogVersion } from '../../../constants/changelog'

function renderMarkdownInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>
    return part
  })
}

/** 渲染单个版本的更新内容（支持分组格式和扁平格式） */
function VersionContent({ ver }: { ver: ChangelogVersion }) {
  // 新格式：分组展示
  if (ver.groups) {
    return (
      <div className="space-y-3">
        {ver.groups.map((group, gi) => (
          <div key={gi}>
            <div className="text-xs font-semibold mb-1.5 text-primary">
              {group.label}
            </div>
            <ul className="space-y-1.5">
              {group.items.map((item, i) => (
                <li key={i} className="text-sm flex items-start gap-2 text-content-2">
                  <span className="mt-0.5 flex-shrink-0" style={{ color: 'var(--muted-2)' }}>•</span>
                  <span>{renderMarkdownInline(item)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    )
  }

  // 旧格式：扁平列表
  return (
    <ul className="space-y-1.5">
      {ver.items?.map((item, i) => (
        <li key={i} className="text-sm flex items-start gap-2 text-content-2">
          <span className="mt-0.5 flex-shrink-0" style={{ color: 'var(--muted-2)' }}>•</span>
          <span>{renderMarkdownInline(item)}</span>
        </li>
      ))}
    </ul>
  )
}

interface Props { onClose: () => void }

const SettingsChangelog: React.FC<Props> = ({ onClose }) => (
  <Modal isOpen={true} onClose={onClose} title={<span className="flex items-center gap-2"><Icon name="Clock" size={18} /> 更新日志</span>} size="md">
    <div className="space-y-6 overflow-y-auto max-h-[60vh] pr-2">
      {versions.map(ver => (
        <div key={ver.v}>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-accent-soft text-primary">{ver.v}</span>
            <span className="text-xs text-muted-foreground">{ver.date}</span>
          </div>
          <VersionContent ver={ver} />
        </div>
      ))}
    </div>
  </Modal>
)

export default SettingsChangelog
