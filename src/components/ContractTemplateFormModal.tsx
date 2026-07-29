// ContractTemplateFormModal.tsx — S29 模板编辑器（变量系统）
// 规格：全屏编辑器 = Context Header（面包屑+名称/类型）+ 左 70% 纸张画布（工具条+插入变量+预览）
//       + 右 30% 变量绑定面板（搜索+变量卡）+ 底部动作条（取消/保存模板）
import React, { useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Icon } from './ui/Icon'
import { Input } from './ui/Input/Input'
import { ContractTemplate, TemplateType, TemplateVariable } from '../types/electron'
import { Button } from './ui/Button'

export const templateTypeConfig: Record<TemplateType, { label: string; icon: string }> = {
  income: { label: '收入合同', icon: 'TrendingUp' },
  expense: { label: '支出合同', icon: 'TrendingDown' },
  labor: { label: '劳务合同', icon: 'Construction' },
  material: { label: '材料合同', icon: 'Package' },
  other: { label: '其他合同', icon: 'File' }
}

interface Props {
  editingTemplate: ContractTemplate | null
  formData: { name: string; type: TemplateType; description: string; fileName: string; fileData: string; variables: TemplateVariable[] }
  setFormData: (d: any) => void
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onAddVariable: () => void
  onUpdateVariable: (i: number, f: string, v: any) => void
  onRemoveVariable: (i: number) => void
}

/** 预览态：把 {{key}} 渲染为 accent 徽章（S29 画布芯片样式） */
function renderPreview(text: string) {
  const parts = text.split(/(\{\{[^}]+\}\})/g)
  return parts.map((part, i) => {
    const m = part.match(/^\{\{([^}]+)\}\}$/)
    if (m) {
      return (
        <span key={i} className="inline-flex items-center bg-[color:var(--accent)] text-[color:var(--on-accent)] px-2 py-0.5 rounded-md mx-0.5 font-mono text-xs select-all">
          {'{'}{m[1]}{'}'}
        </span>
      )
    }
    return <React.Fragment key={i}>{part}</React.Fragment>
  })
}

export const ContractTemplateFormModal: React.FC<Props> = ({
  editingTemplate, formData, setFormData, onClose, onSubmit,
  onAddVariable, onUpdateVariable, onRemoveVariable,
}) => {
  const descRef = useRef<HTMLTextAreaElement>(null)
  const [previewMode, setPreviewMode] = useState(false)
  const [varSearch, setVarSearch] = useState('')

  // S29：在光标处插入 {{变量}} 占位符
  const insertVariable = (key: string) => {
    const el = descRef.current
    const token = `{{${key}}}`
    if (!el) { setFormData({ ...formData, description: formData.description + token }); return }
    const start = el.selectionStart ?? formData.description.length
    const end = el.selectionEnd ?? start
    const next = formData.description.slice(0, start) + token + formData.description.slice(end)
    setFormData({ ...formData, description: next })
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + token.length, start + token.length)
    })
  }

  const namedVariables = formData.variables.filter(v => v.key)

  // 预览模式下 textarea 卸载会绕过 required 校验，提交前手动兜底
  const handleSubmit = (e: React.FormEvent) => {
    if (!formData.description.trim()) {
      e.preventDefault()
      setPreviewMode(false)
      requestAnimationFrame(() => descRef.current?.reportValidity())
      return
    }
    onSubmit(e)
  }
  const filteredIndices = useMemo(() => {
    const q = varSearch.trim().toLowerCase()
    return formData.variables
      .map((v, i) => ({ v, i }))
      .filter(({ v }) => !q || v.key.toLowerCase().includes(q) || (v.label || '').toLowerCase().includes(q))
      .map(({ i }) => i)
  }, [formData.variables, varSearch])

  return (
    <motion.div
      role="dialog" aria-modal="true"
      className="fixed inset-0 z-50 flex flex-col bg-[color:var(--bg)]"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <form id="contract-template-form" onSubmit={handleSubmit} className="flex flex-col h-full min-h-0">
        {/* Context Header：面包屑 + 名称/类型 */}
        <div className="h-14 flex items-center justify-between px-6 border-b border-[color:var(--border)] bg-[color:var(--card)] shrink-0">
          <div className="flex items-center gap-2 text-sm min-w-0">
            <span className="text-[color:var(--muted)] shrink-0">模板管理</span>
            <span className="text-[color:var(--border-strong)] shrink-0">/</span>
            <span className="font-semibold text-[color:var(--fg)] shrink-0">{editingTemplate ? '编辑模板' : '添加模板'}</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium ml-2 shrink-0" style={{ background: 'var(--panel-2)', color: 'var(--fg-2)' }}>
              {templateTypeConfig[formData.type].label}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Input aria-label="模板名称" size="sm" required value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="如: 标准工程合同" className="w-64" />
            <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as TemplateType })}
              className="select text-sm" required>
              {Object.entries(templateTypeConfig).map(([type, config]) => <option key={type} value={type}>{config.label}</option>)}
            </select>
          </div>
        </div>

        {/* Editor Layout */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* 左：文档画布（~70%） */}
          <div className="w-[70%] flex flex-col border-r border-[color:var(--border)] bg-[color:var(--panel-2)] overflow-hidden">
            {/* 工具条：插入变量 chips + 预览切换 */}
            <div className="h-12 bg-[color:var(--panel)] border-b border-[color:var(--border)] flex items-center px-4 gap-1.5 shrink-0 overflow-x-auto">
              <span className="inline-flex items-center gap-1 text-xs mr-1 shrink-0" style={{ color: 'var(--muted)' }}>
                <Icon name="Braces" size={12} /> 插入变量
              </span>
              {namedVariables.length === 0 && (
                <span className="text-xs shrink-0" style={{ color: 'var(--muted)' }}>（在右侧添加变量后可点击插入）</span>
              )}
              {namedVariables.map(v => (
                <button key={v.key} type="button" onClick={() => insertVariable(v.key)} disabled={previewMode}
                  className="px-2 py-0.5 rounded-md text-xs font-mono bg-[color:var(--accent-soft)] text-[color:var(--accent)] hover:opacity-80 transition-opacity disabled:opacity-40 shrink-0"
                  title={`插入 {{${v.key}}}`}>
                  {'{'}{v.key}{'}'}
                </button>
              ))}
              <div className="ml-auto shrink-0">
                <button type="button" onClick={() => setPreviewMode(p => !p)}
                  className={`h-8 px-3 rounded-md flex items-center gap-1.5 text-xs transition-colors ${previewMode ? 'bg-[color:var(--accent-soft)] text-[color:var(--accent)]' : 'hover:bg-[color:var(--panel-2)] text-[color:var(--fg-2)]'}`}>
                  <Icon name={previewMode ? 'Edit3' : 'Eye'} size={14} /> {previewMode ? '继续编辑' : '预览'}
                </button>
              </div>
            </div>
            {/* 纸张容器 */}
            <div className="flex-1 overflow-y-auto p-6 flex justify-center">
              <div className="w-full max-w-3xl bg-[color:var(--card)] border border-[color:var(--border)] shadow-sm rounded-lg min-h-[600px] flex flex-col">
                {previewMode ? (
                  <div className="p-10 text-sm leading-relaxed text-[color:var(--fg)] whitespace-pre-wrap">
                    <h1 className="text-center text-lg font-bold mb-6">{formData.name || '未命名模板'}</h1>
                    {renderPreview(formData.description)}
                  </div>
                ) : (
                  <textarea ref={descRef} value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="flex-1 w-full p-10 bg-transparent border-0 focus:outline-none focus:ring-0 resize-none font-mono text-sm leading-relaxed text-[color:var(--fg)]"
                    placeholder={'输入合同模板内容，使用 {{变量名}} 表示需要填充的内容...'}
                    required />
                )}
              </div>
            </div>
          </div>

          {/* 右：变量绑定面板（~30%） */}
          <div className="w-[30%] bg-[color:var(--panel)] flex flex-col overflow-hidden">
            <div className="h-12 border-b border-[color:var(--border)] flex items-center justify-between px-4 shrink-0">
              <span className="text-sm font-bold text-[color:var(--fg)]">变量绑定</span>
              <button type="button" onClick={onAddVariable} aria-label="添加变量"
                className="w-8 h-8 rounded flex items-center justify-center hover:bg-[color:var(--panel-2)] transition-colors text-[color:var(--accent)]">
                <Icon name="Plus" size={16} />
              </button>
            </div>
            <div className="p-3 border-b border-[color:var(--border)] shrink-0">
              <div className="relative w-full">
                <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--muted)]" />
                <input value={varSearch} onChange={e => setVarSearch(e.target.value)}
                  className="w-full h-[34px] pl-9 pr-3 rounded-full border border-[color:var(--border)] bg-[color:var(--card)] text-sm focus:border-[color:var(--accent)] focus:ring-0 focus:outline-none transition-colors"
                  placeholder="搜索变量..." type="text" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
              {formData.variables.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed rounded-xl" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>点击右上角 + 添加变量</p>
                </div>
              ) : filteredIndices.map(index => {
                const variable = formData.variables[index]
                return (
                  <div key={index} className="border border-[color:var(--border)] rounded-lg p-3 bg-[color:var(--card)] hover:bg-[color:var(--panel-2)] transition-colors group">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-sm font-bold text-[color:var(--accent)]">
                        {variable.key ? <>{'{'}{variable.key}{'}'}</> : <span className="text-[color:var(--muted)] font-normal">未命名变量</span>}
                      </span>
                      <button type="button" onClick={() => onRemoveVariable(index)} aria-label="删除变量"
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-[color:var(--muted)] hover:text-[color:var(--danger)]">
                        <Icon name="X" size={14} />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" value={variable.key} onChange={e => onUpdateVariable(index, 'key', e.target.value)} className="input text-xs" placeholder="变量名" />
                      <input type="text" value={variable.label} onChange={e => onUpdateVariable(index, 'label', e.target.value)} className="input text-xs" placeholder="显示标签" />
                      <select value={variable.type} onChange={e => onUpdateVariable(index, 'type', e.target.value)} className="input text-xs">
                        <option value="text">文本</option><option value="number">数字</option><option value="date">日期</option>
                      </select>
                      <label className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--fg-2)' }}>
                        <input type="checkbox" checked={variable.required} onChange={e => onUpdateVariable(index, 'required', e.target.checked)} className="w-3.5 h-3.5 accent-[color:var(--accent)]" />
                        必填
                      </label>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* 底部动作条 */}
        <div className="h-16 border-t border-[color:var(--border)] bg-[color:var(--card)] flex items-center justify-end px-6 gap-3 shrink-0">
          <Button type="button" onClick={onClose} variant="secondary">取消</Button>
          <Button type="submit" variant="primary">{editingTemplate ? '保存模板' : '创建模板'}</Button>
        </div>
      </form>
    </motion.div>
  )
}
