import React from 'react'
import { motion } from 'framer-motion'
import { Icon } from './ui/Icon'
import { ContractTemplate, TemplateType, TemplateVariable } from '../types/electron'

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

export const ContractTemplateFormModal: React.FC<Props> = ({
  editingTemplate, formData, setFormData, onClose, onSubmit,
  onFileUpload, onAddVariable, onUpdateVariable, onRemoveVariable,
}) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <motion.div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-800">{editingTemplate ? '编辑模板' : '添加模板'}</h2>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><Icon name="X" size={20} /></button>
      </div>
      <form onSubmit={onSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">模板名称 *</label><input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="input" placeholder="如: 标准工程合同" required /></div>
            <div><label className="label">模板类型 *</label><select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as TemplateType })} className="input" required>{Object.entries(templateTypeConfig).map(([type, config]) => <option key={type} value={type}>{config.label}</option>)}</select></div>
          </div>
          <div><label className="label">模板描述 *</label><textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="input min-h-[200px]" placeholder="输入合同模板内容，使用 {{变量名}} 表示需要填充的内容..." required /><p className="text-xs text-slate-500 mt-1">提示：使用 {"{{变量名}}"} 表示需要填充的内容</p></div>
          <div>
            <div className="flex items-center justify-between mb-2"><label className="label mb-0">模板变量</label><button type="button" onClick={onAddVariable} className="btn btn-sm btn-secondary">+ 添加变量</button></div>
            {formData.variables.length > 0 ? (
              <div className="space-y-3">{formData.variables.map((variable, index) => (
                <div key={index} className="grid grid-cols-4 gap-3 p-3 bg-slate-50 rounded-xl">
                  <input type="text" value={variable.key} onChange={e => onUpdateVariable(index, 'key', e.target.value)} className="input text-sm" placeholder="变量名" />
                  <input type="text" value={variable.label} onChange={e => onUpdateVariable(index, 'label', e.target.value)} className="input text-sm" placeholder="显示标签" />
                  <select value={variable.type} onChange={e => onUpdateVariable(index, 'type', e.target.value)} className="input text-sm"><option value="text">文本</option><option value="number">数字</option><option value="date">日期</option></select>
                  <div className="flex items-center gap-2"><input type="checkbox" checked={variable.required} onChange={e => onUpdateVariable(index, 'required', e.target.checked)} className="w-4 h-4" /><span className="text-sm text-slate-600">必填</span><button type="button" onClick={() => onRemoveVariable(index)} className="ml-auto text-red-500 hover:text-red-700"><Icon name="X" size={16} /></button></div>
                </div>
              ))}</div>
            ) : <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl"><p className="text-slate-500">点击上方按钮添加变量</p></div>}
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100"><button type="button" onClick={onClose} className="btn btn-secondary">取消</button><button type="submit" className="btn btn-primary">{editingTemplate ? '保存' : '创建'}</button></div>
      </form>
    </motion.div>
  </div>
)
