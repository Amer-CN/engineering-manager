import React from 'react'
import { Icon } from './ui/Icon'
import { Input } from './ui/Input/Input'
import { Modal } from './ui/Modal/Modal'
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

export const ContractTemplateFormModal: React.FC<Props> = ({
  editingTemplate, formData, setFormData, onClose, onSubmit,
  onFileUpload, onAddVariable, onUpdateVariable, onRemoveVariable,
}) => (
  <Modal isOpen={true} onClose={onClose} title={editingTemplate ? '编辑模板' : '添加模板'} size="xl"
    footer={<>
      <Button type="button" onClick={onClose}  variant="secondary">取消</Button>
      <Button type="submit" form="contract-template-form"  variant="primary">{editingTemplate ? '保存' : '创建'}</Button>
    </>}>
    <form id="contract-template-form" onSubmit={onSubmit}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><Input label="模板名称" size="sm" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="如: 标准工程合同" /></div>
          <div><label className="label">模板类型 *</label><select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as TemplateType })} className="input" required>{Object.entries(templateTypeConfig).map(([type, config]) => <option key={type} value={type}>{config.label}</option>)}</select></div>
        </div>
        <div><label className="label">模板描述 *</label><textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="input min-h-[200px]" placeholder="输入合同模板内容，使用 {{变量名}} 表示需要填充的内容..." required /><p className="text-xs text-slate-500 mt-1">提示：使用 {"{{变量名}}"} 表示需要填充的内容</p></div>
        <div>
          <div className="flex items-center justify-between mb-2"><label className="label mb-0">模板变量</label><Button type="button" onClick={onAddVariable}  variant="secondary" size="sm">+ 添加变量</Button></div>
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
    </form>
  </Modal>
)
