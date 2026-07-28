import React from 'react'
import { TABLE } from '@/constants/table'
import { Icon } from '../../ui/Icon'
import { formatMoney } from '@/utils/format'
import { Button } from '../../ui/Button'

interface Item { description: string; spec: string; quantity: number; unit: string; unitPrice: number; amount: number; remarks: string }

interface Props {
  items: Item[]
  isMaterial: boolean
  taxInclusive: boolean
  onAdd: () => void
  onUpdate: (index: number, field: keyof Item, value: string | number) => void
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
          <Button type="button" variant="outline" size="sm" onClick={onDownloadTemplate} className="bg-[color:var(--card)] text-[color:var(--fg-2)] hover:bg-[color:var(--panel-2)] border border-[color:var(--border)]"><Icon name="Download" size={14} /> 下载模板</Button>
          <Button type="button" variant="primary" size="sm" onClick={onUploadTemplate} className="bg-[color:var(--accent-soft)] text-[color:var(--accent)] hover:bg-[color:var(--accent-soft)] border border-[color:var(--border)]"><Icon name="Upload" size={14} /> 上传模板</Button>
          <Button type="button" variant="success" size="sm" onClick={onImportExcel} className="bg-[color:var(--accent-soft)] text-[color:var(--accent)] hover:bg-[color:var(--accent-soft)] border border-[color:var(--border)]"><Icon name="File" size={14} /> 导入其他表</Button>
        </>}
        <Button type="button" onClick={onAdd}  variant="secondary" size="sm">+ 添加明细</Button>
      </div>
    </div>
    {isMaterial && (
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs" style={{ color: 'var(--muted)' }}>单价类型：</span>
        <button type="button" onClick={() => onSetTaxInclusive(true)} className="px-3 py-1 text-xs rounded-lg transition-colors" style={taxInclusive ? { background: 'var(--accent)', color: 'var(--on-accent)' } : { background: 'var(--panel-2)', color: 'var(--muted)' }}>含税单价</button>
        <button type="button" onClick={() => onSetTaxInclusive(false)} className="px-3 py-1 text-xs rounded-lg transition-colors" style={!taxInclusive ? { background: 'var(--accent)', color: 'var(--on-accent)' } : { background: 'var(--panel-2)', color: 'var(--muted)' }}>不含税单价</button>
      </div>
    )}
    {items.length > 0 ? (
      <div className="overflow-hidden">
        <table className={TABLE.table}>
          <thead className={`${TABLE.headerRow} ${TABLE.stickyHeader}`}>
            <tr>
              {isMaterial ? <>
                <th className={`${TABLE.headerCell} w-28`}>规格型号</th>
                <th className={`${TABLE.headerCell} w-16`}>单位</th>
                <th className={`${TABLE.headerCell} w-20`}>数量</th>
                <th className={`${TABLE.headerCell} w-28`}>{taxInclusive ? '含税单价' : '不含税单价'}</th>
                <th className={`${TABLE.headerCell} w-28`}>金额</th>
              </> : <>
                <th className={TABLE.headerCell}>描述</th>
                <th className={`${TABLE.headerCell} w-20`}>数量</th>
                <th className={`${TABLE.headerCell} w-20`}>单位</th>
                <th className={`${TABLE.headerCell} w-28`}>单价</th>
                <th className={`${TABLE.headerCell} w-28`}>金额</th>
              </>}
              <th className={`${TABLE.headerCell} text-center w-12`}>操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index} className={TABLE.bodyRow}>
                <td className={TABLE.bodyCell}><input type="text" value={item.description} onChange={e => onUpdate(index, 'description', e.target.value)} className="w-full px-2 py-1.5 border border-[color:var(--border)] rounded text-sm" placeholder="材料名称" /></td>
                {isMaterial && <td className={TABLE.bodyCell}><input type="text" value={item.spec} onChange={e => onUpdate(index, 'spec', e.target.value)} className="w-full px-2 py-1.5 border border-[color:var(--border)] rounded text-sm" placeholder="规格型号" /></td>}
                <td className={TABLE.bodyCell}><input type="text" value={item.unit} onChange={e => onUpdate(index, 'unit', e.target.value)} className="w-full px-2 py-1.5 border border-[color:var(--border)] rounded text-sm" placeholder="单位" /></td>
                <td className={TABLE.bodyCell}><input type="number" value={item.quantity} onChange={e => onUpdate(index, 'quantity', Number(e.target.value))} className="w-full px-2 py-1.5 border border-[color:var(--border)] rounded text-sm" min="0" step="any" /></td>
                <td className={TABLE.bodyCell}><input type="number" value={item.unitPrice} onChange={e => onUpdate(index, 'unitPrice', Number(e.target.value))} className="w-full px-2 py-1.5 border border-[color:var(--border)] rounded text-sm" min="0" step="any" /></td>
                <td className={`${TABLE.bodyCell} text-right font-medium text-[color:var(--fg)] text-sm font-mono tabular-nums`}>¥{formatMoney(item.amount)}</td>
                <td className={`${TABLE.bodyCell} text-center`}><Button type="button" onClick={() => onRemove(index)}  variant="ghost" size="sm" className="text-danger-500">✕</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <div className="border-2 border-dashed border-[color:var(--border)] rounded-xl p-8 text-center"><p className="text-[color:var(--muted)]">点击上方按钮添加结算明细</p></div>
    )}
    <div className="mt-4 text-right">
      <span className="text-[color:var(--fg-2)]">合计金额: </span>
      <span className="text-numeric-xl font-mono tabular-nums tracking-tight text-[color:var(--fg)]">¥{formatMoney(items.reduce((s, i) => s + i.amount, 0))}</span>
    </div>
  </div>
)
