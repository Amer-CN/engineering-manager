import { useState, useEffect } from 'react'
import { Template, TemplateCategory } from '../../../types/electron'
import { categoryConfig } from './config'
import { Icon } from '../../ui/Icon'
import { motion } from 'framer-motion'

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
      const result = await window.electronAPI.getTemplates(category)
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60]" onClick={onClose}>
      <motion.div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[70vh] flex flex-col"
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
        {/* 头部 */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Icon name={cfg.icon} size={20} className="text-slate-500" />
            <h2 className="text-lg font-semibold text-slate-800">选择{cfg.label}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <Icon name="X" size={16} />
          </button>
        </div>

        {/* 搜索 */}
        <div className="px-6 py-3 border-b border-slate-50 shrink-0">
          <div className="relative">
            <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={searchKeyword} onChange={e => setSearchKeyword(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-100 focus:border-primary-300"
              placeholder="搜索模板名称..." />
          </div>
        </div>

        {/* 模板列表 */}
        <div className="flex-1 overflow-y-auto p-4">
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
      </motion.div>
    </div>
  )
}
