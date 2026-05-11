import React from 'react'
import { Icon } from '../../ui/Icon'
import { formatMoney } from '@/utils/format'

interface Item { description: string; spec: string; quantity: number; unit: string; unitPrice: number; amount: number; remarks: string }

interface Props {
  items: Item[]
  isMaterial: boolean
  taxInclusive: boolean
  onAdd: () => void
  onUpdate: (index: number, field: string, value: any) => void
  onRemove: (index: number) => void
  onSetTaxInclusive: (v: boolean) => void
  onDownloadTemplate: () => void
  onUploadTemplate: () => void
  onImportExcel: () => void
  onTemplateFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  templateInputRef: React.RefObject<HTMLInputElement>
}

export const SettlementItemsTable: React.FC<Props> = ({
  items, isMaterial, taxInclusive, onAdd, onUpdate, onRemove, onSetTaxInclusive,
  onDownloadTemplate, onUploadTemplate, onImportExcel, onTemplateFileChange, templateInputRef,
}) => (
  <div className="mb-6">
    <div className="flex items-center justify-between mb-4">
      <label className="label mb-0">结算明细</label>
      <div className="flex items-center gap-2">
        {isMaterial && <>
          <input ref={templateInputRef} type="file" accept=".xlsx,.xls" onChange={onTemplateFileChange} className="hidden" />
          <button type="button" onClick={onDownloadTemplate} className="btn btn-sm bg-white text-slate-600 hover:bg-slate-100 border border-slate-300"><Icon name="Download" size={14} /> 下载模板</button>
          <button type="button" onClick={onUploadTemplate} className="btn btn-sm bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-200"><Icon name="Upload" size={14} /> 上传模板</button>
          <button type="button" onClick={onImportExcel} className="btn btn-sm bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"><Icon name="File" size={14} /> 导入其他表</button>
        </>}
        <button type="button" onClick={onAdd} className="btn btn-sm btn-secondary">+ 添加明细</button>
      </div>
    </div>
    {isMaterial && (
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-slate-500">单价类型：</span>
        <button type="button" onClick={() => onSetTaxInclusive(true)} className={`px-3 py-1 text-xs rounded-lg transition-colors ${taxInclusive ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600'}`}>含税单价</button>
        <button type="button" onClick={() => onSetTaxInclusive(false)} className={`px-3 py-1 text-xs rounded-lg transition-colors ${!taxInclusive ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600'}`}>不含税单价</button>
      </div>
    )}
    {items.length > 0 ? (
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              {isMaterial ? <>
                <th className="px-3 py-3 text-left text-xs font-medium text-slate-500">材料名称</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 w-28">规格型号</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 w-16">单位</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 w-20">数量</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 w-28">{taxInclusive ? '含税单价' : '不含税单价'}</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 w-28">金额</th>
              </> : <>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">描述</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 w-20">数量</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 w-20">单位</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 w-28">单价</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 w-28">金额</th>
              </>}
              <th className="px-3 py-3 text-center text-xs font-medium text-slate-500 w-12">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item, index) => (
              <tr key={index}>
                <td className="px-3 py-2"><input type="text" value={item.description} onChange={e => onUpdate(index, 'description', e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" placeholder="材料名称" /></td>
                {isMaterial && <td className="px-3 py-2"><input type="text" value={item.spec} onChange={e => onUpdate(index, 'spec', e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" placeholder="规格型号" /></td>}
                <td className="px-3 py-2"><input type="text" value={item.unit} onChange={e => onUpdate(index, 'unit', e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" placeholder="单位" /></td>
                <td className="px-3 py-2"><input type="number" value={item.quantity} onChange={e => onUpdate(index, 'quantity', Number(e.target.value))} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" min="0" step="any" /></td>
                <td className="px-3 py-2"><input type="number" value={item.unitPrice} onChange={e => onUpdate(index, 'unitPrice', Number(e.target.value))} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" min="0" step="any" /></td>
                <td className="px-3 py-2 text-right font-medium text-slate-800 text-sm">¥{formatMoney(item.amount)}</td>
                <td className="px-3 py-2 text-center"><button type="button" onClick={() => onRemove(index)} className="text-red-500 hover:text-red-700 text-sm">✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center"><p className="text-slate-500">点击上方按钮添加结算明细</p></div>
    )}
    <div className="mt-4 text-right">
      <span className="text-slate-600">合计金额: </span>
      <span className="text-2xl font-bold text-primary-600">¥{formatMoney(items.reduce((s, i) => s + i.amount, 0))}</span>
    </div>
  </div>
)
