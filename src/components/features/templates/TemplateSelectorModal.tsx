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
          <Icon name={cfg.icon} size={20} className="text-slate-500" />
          <span>选择{cfg.label}</span>
        </div>
      }
      size="lg"
      className="z-[60]">
      {/* 搜索 */}
      <div className="pb-3 mb-3 border-b border-slate-50">
        <div className="relative">
          <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={searchKeyword} onChange={e => setSearchKeyword(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-100 focus:border-primary-300"
            placeholder="搜索模板名称..." />
        </div>
      </div>

      {/* 模板列表 */}
      <div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Icon name="FileText" size={36} className="text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-500">
              {templates.length === 0 ? `暂无${cfg.label}，请先在模板管理中上传` : '未找到匹配的模板'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(t => (
              <button key={t.id} type="button" onClick={() => onSelect(t)}
                className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-primary-300 hover:bg-primary-50/50 transition-all group">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-slate-800 text-sm group-hover:text-primary-700">{t.name}</h3>
                    {t.description && <p className="text-xs text-slate-400 mt-0.5 truncate">{t.description}</p>}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${t.fileType === 'docx' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        .{t.fileType}
                      </span>
                      {t.variables.slice(0, 4).map(v => (
                        <span key={v.key} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{v.label}</span>
                      ))}
                      {t.variables.length > 4 && <span className="text-[10px] text-slate-400">+{t.variables.length - 4}</span>}
                    </div>
                  </div>
                  <Icon name="ChevronRight" size={16} className="text-slate-300 group-hover:text-primary-400 flex-shrink-0 mt-1" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}
