import React, { useState, useEffect } from 'react'
import { InventoryItem, InventoryTransactionType, Project, Partner } from '../../../types/electron'

interface TransFormProps {
  items: InventoryItem[]
  projects: Project[]
  partners: Partner[]
  defaultItemId?: number
  defaultUnitPrice?: number
  onSubmit: (data: any) => void
  onCancel: () => void
}

const defaultFormData = {
  itemId: '' as number | '',
  type: 'purchase' as InventoryTransactionType,
  quantity: 0,
  unitPrice: 0,
  totalAmount: 0,
  projectId: '' as number | '',
  counterpartyId: '' as number | '',
  transactionDate: '',
  documentNo: '',
  remarks: ''
}

export const TransForm: React.FC<TransFormProps> = ({
  items,
  projects,
  partners,
  defaultItemId,
  defaultUnitPrice,
  onSubmit,
  onCancel
}) => {
  const [formData, setFormData] = useState(defaultFormData)

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      itemId: defaultItemId || '',
      unitPrice: defaultUnitPrice || 0,
      transactionDate: new Date().toISOString().split('T')[0],
      documentNo: `TR${Date.now()}`
    }))
  }, [defaultItemId, defaultUnitPrice])

  const handleItemChange = (itemId: number) => {
    const item = items.find(i => i.id === itemId)
    setFormData(prev => ({
      ...prev,
      itemId,
      unitPrice: item?.purchasePrice || 0
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      ...formData,
      projectId: formData.projectId || 0,
      counterpartyId: formData.counterpartyId || 0,
      totalAmount: Math.round(formData.quantity * formData.unitPrice * 100) / 100
    })
  }

  return (
    <form onSubmit={handleSubmit} className="p-6">
      <div className="space-y-4">
        <div>
          <label className="label">物料 *</label>
          <select
            value={formData.itemId}
            onChange={e => handleItemChange(Number(e.target.value))}
            className="input"
            required
          >
            <option value="">请选择物料</option>
            {items.map(item => (
              <option key={item.id} value={item.id}>
                {item.code} - {item.name} (库存: {item.currentStock})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">业务类型 *</label>
          <select
            value={formData.type}
            onChange={e => setFormData({ ...formData, type: e.target.value as InventoryTransactionType })}
            className="input"
            required
          >
            <option value="purchase">采购入库</option>
            <option value="sale">销售出库</option>
            <option value="return_in">退货入库</option>
            <option value="return_out">退货出库</option>
            <option value="adjustment">库存调整</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">数量 *</label>
            <input
              type="number"
              value={formData.quantity}
              onChange={e => setFormData({ ...formData, quantity: Number(e.target.value) })}
              className="input"
              min="0"
              required
            />
          </div>
          <div>
            <label className="label">单价</label>
            <input
              type="number"
              value={formData.unitPrice}
              onChange={e => setFormData({ ...formData, unitPrice: Number(e.target.value) })}
              className="input"
              min="0"
              step="0.01"
            />
          </div>
        </div>
        <div>
          <label className="label">交易日期</label>
          <input
            type="date"
            value={formData.transactionDate}
            onChange={e => setFormData({ ...formData, transactionDate: e.target.value })}
            className="input"
          />
        </div>
        <div>
          <label className="label">关联项目</label>
          <select
            value={formData.projectId}
            onChange={e => setFormData({ ...formData, projectId: Number(e.target.value) || '' })}
            className="input"
          >
            <option value="">请选择（可选）</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">交易对方</label>
          <select
            value={formData.counterpartyId}
            onChange={e => setFormData({ ...formData, counterpartyId: Number(e.target.value) || '' })}
            className="input"
          >
            <option value="">请选择（可选）</option>
            {partners.map(partner => (
              <option key={partner.id} value={partner.id}>{partner.name}</option>
            ))}
          </select>
        </div>
        <div className="bg-slate-50 rounded-xl p-4">
          <div className="flex items-center justify-between text-lg">
            <span className="text-slate-600">合计金额:</span>
            <span className="font-bold text-primary-600">
              ¥{Math.round(formData.quantity * formData.unitPrice * 100) / 100}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
        <button type="button" onClick={onCancel} className="btn btn-secondary">取消</button>
        <button type="submit" className="btn btn-primary">确认</button>
      </div>
    </form>
  )
}

export default TransForm