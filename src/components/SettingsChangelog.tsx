import React from 'react'
import { Icon } from './ui/Icon'
import { Modal } from './ui/Modal/Modal'
import { versions } from '../constants/changelog'

function renderMarkdownInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>
    return part
  })
}

interface Props { onClose: () => void }

const SettingsChangelog: React.FC<Props> = ({ onClose }) => (
  <Modal isOpen={true} onClose={onClose} title={<span className="flex items-center gap-2"><Icon name="Clock" size={18} /> 更新日志</span>} size="md">
    <div className="space-y-6">
      {versions.map(ver => (
        <div key={ver.v}>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 text-xs font-bold rounded-md" style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}>{ver.v}</span>
            <span className="text-xs" style={{ color: 'var(--muted)' }}>{ver.date}</span>
          </div>
          <ul className="space-y-1.5">
            {ver.items.map((item, i) => (
              <li key={i} className="text-sm flex items-start gap-2" style={{ color: 'var(--fg-2)' }}>
                <span className="mt-0.5 flex-shrink-0" style={{ color: 'var(--muted-2)' }}>•</span>
                <span>{renderMarkdownInline(item)}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  </Modal>
)

export default SettingsChangelog