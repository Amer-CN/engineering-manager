import React, { useState, useEffect } from 'react'
import { InventoryItem, Partner } from '../../../types/electron'

interface ItemFormProps {
  item?: InventoryItem | null
  partners: Partner[]
  categories: string[]
  units: string[]
  onSubmit: (data: any) => void
  onCancel: () => void
}

const defaultFormData = {
  code: '',
  name: '',
  category: '',
  unit: '',
  specifications: '',
  purchasePrice: 0,
  salePrice: 0,
  currentStock: 0,
  minStock: 0,
  maxStock: 9999,
  supplierId: '' as number | '',
  remarks: ''
}

export const ItemForm: React.FC<ItemFormProps> = ({
  item,
  partners,
  categories,
  units,
  onSubmit,
  onCancel
}) => {
  const [formData, setFormData] = useState(defaultFormData)

  useEffect(() => {
    if (item) {
      setFormData({
        code: item.code,
        name: item.name,
        category: item.category,
        unit: item.unit,
        specifications: item.specifications,
        purchasePrice: item.purchasePrice,
        salePrice: item.salePrice,
        currentStock: item.currentStock,
        minStock: item.minStock,
        maxStock: item.maxStock,
        supplierId: item.supplierId || '',
        remarks: item.remarks || ''
      })
    } else {
      setFormData(defaultFormData)
    }
  }, [item])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      ...formData,
      supplierId: formData.supplierId || 0
    })
  }

  return (
    <form onSubmit={handleSubmit} className="p-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">物料编码 *</label>
          <input
            type="text"
            value={formData.code}
            onChange={e => setFormData({ ...formData, code: e.target.value })}
            className="input"
            placeholder="如: STL-001"
            required
          />
        </div>
        <div>
          <label className="label">物料名称 *</label>
          <input
            type="text"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            className="input"
            placeholder="如: 螺纹钢筋"
            required
          />
        </div>
        <div>
          <label className="label">类别</label>
          <select
            value={formData.category}
            onChange={e => setFormData({ ...formData, category: e.target.value })}
            className="input"
          >
            <option value="">请选择</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">单位</label>
          <select
            value={formData.unit}
            onChange={e => setFormData({ ...formData, unit: e.target.value })}
            className="input"
          >
            <option value="">请选择</option>
            {units.map(unit => (
              <option key={unit} value={unit}>{unit}</option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <label className="label">规格型号</label>
          <input
            type="text"
            value={formData.specifications}
            onChange={e => setFormData({ ...formData, specifications: e.target.value })}
            className="input"
            placeholder="如: HRB400 Φ12mm"
          />
        </div>
        <div>
          <label className="label">采购单价</label>
          <input
            type="number"
            value={formData.purchasePrice}
            onChange={e => setFormData({ ...formData, purchasePrice: Number(e.target.value) })}
            className="input"
            min="0"
            step="0.01"
          />
        </div>
        <div>
          <label className="label">销售单价</label>
          <input
            type="number"
            value={formData.salePrice}
            onChange={e => setFormData({ ...formData, salePrice: Number(e.target.value) })}
            className="input"
            min="0"
            step="0.01"
          />
        </div>
        <div>
          <label className="label">当前库存</label>
          <input
            type="number"
            value={formData.currentStock}
            onChange={e => setFormData({ ...formData, currentStock: Number(e.target.value) })}
            className="input"
            min="0"
          />
        </div>
        <div>
          <label className="label">最低库存预警</label>
          <input
            type="number"
            value={formData.minStock}
            onChange={e => setFormData({ ...formData, minStock: Number(e.target.value) })}
            className="input"
            min="0"
          />
        </div>
        <div className="col-span-2">
          <label className="label">默认供应商</label>
          <select
            value={formData.supplierId}
            onChange={e => setFormData({ ...formData, supplierId: Number(e.target.value) || '' })}
            className="input"
          >
            <option value="">请选择</option>
            {partners.filter(p => p.category === 'material').map(partner => (
              <option key={partner.id} value={partner.id}>{partner.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-4">
        <label className="label">备注</label>
        <textarea
          value={formData.remarks}
          onChange={e => setFormData({ ...formData, remarks: e.target.value })}
          className="input min-h-[80px]"
        />
      </div>
      <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
        <button type="button" onClick={onCancel} className="btn btn-secondary">取消</button>
        <button type="submit" className="btn btn-primary">{item ? '保存' : '添加'}</button>
      </div>
    </form>
  )
}

export default ItemForm