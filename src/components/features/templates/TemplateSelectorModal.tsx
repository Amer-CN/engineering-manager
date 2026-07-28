import { useState, useEffect } from 'react'
import { Template, TemplateCategory } from '../../../types/electron'
import { categoryConfig } from './config'
import { Icon } from '../../ui/Icon'
import { Modal } from '../../ui/Modal/Modal'
import { getAPI } from '@/services/api-adapter'

interface TemplateSelectorModalProps {
  category: TemplateCategory
  onSelect: (template: Template) => void
  onClose: () => void
}

export default function TemplateSelectorModal({ category, onSelect, onClose }: TemplateSelectorModalProps) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [searchKeyword, setSearchKeyword] = useState('')

  useEffect(() => {
    loadTemplates()
  }, [category])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      const result = await (await getAPI()).getTemplates(category)
      if (result.success && result.data) setTemplates(result.data)
    } catch {
      setTemplates([])
    } finally {
      setLoading(false)
    }
  }

  const filtered = templates.filter(t => {
    if (!searchKeyword.trim()) return true
    const kw = searchKeyword.toLowerCase()
    return t.name.toLowerCase().includes(kw) || t.description?.toLowerCase().includes(kw)
  })

  const cfg = categoryConfig[category]

  return (
    <Modal isOpen onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Icon name={cfg.icon} size={20} className="text-[color:var(--muted)]" />
          <span>选择{cfg.label}</span>
        </div>
      }
      size="lg"
      className="z-[60]">
      {/* 搜索 */}
      <div className="pb-3 mb-3 border-b border-[color:var(--border)]">
        <div className="relative">
          <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--muted)]" />
          <input type="text" value={searchKeyword} onChange={e => setSearchKeyword(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-[color:var(--border)] rounded-lg text-sm focus:ring-2 focus:ring-[color:var(--accent-soft)] focus:border-[color:var(--accent)]"
            placeholder="搜索模板名称..." />
        </div>
      </div>

      {/* 模板列表 */}
      <div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-6 h-6 border-2 border-[color:var(--accent)] border-t-transparent rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Icon name="FileText" size={36} className="text-[color:var(--border-strong)] mx-auto mb-3" />
            <p className="text-sm text-[color:var(--muted)]">
              {templates.length === 0 ? `暂无${cfg.label}，请先在模板管理中上传` : '未找到匹配的模板'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(t => (
              <button key={t.id} type="button" onClick={() => onSelect(t)}
                className="w-full text-left p-4 rounded-xl border border-[color:var(--border)] hover:border-[color:var(--accent)] hover:bg-[color:var(--accent-soft)] transition-all group">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-[color:var(--fg)] text-sm group-hover:text-[color:var(--accent)]">{t.name}</h3>
                    {t.description && <p className="text-xs text-[color:var(--muted)] mt-0.5 truncate">{t.description}</p>}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className={`text-caption px-1.5 py-0.5 rounded font-mono ${t.fileType === 'docx' ? 'bg-[color:var(--accent-soft)] text-[color:var(--accent)]' : 'bg-success-50 text-success-600'}`}>
                        .{t.fileType}
                      </span>
                      {t.variables.slice(0, 4).map(v => (
                        <span key={v.key} className="text-caption px-1.5 py-0.5 rounded bg-[color:var(--panel-2)] text-[color:var(--muted)]">{v.label}</span>
                      ))}
                      {t.variables.length > 4 && <span className="text-caption text-[color:var(--muted)]">+{t.variables.length - 4}</span>}
                    </div>
                  </div>
                  <Icon name="ChevronRight" size={16} className="text-[color:var(--border-strong)] group-hover:text-[color:var(--accent)] flex-shrink-0 mt-1" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}
