import React from 'react'
import { Icon } from './ui/Icon'
import { Modal } from './ui/Modal/Modal'
import PageHeader from './ui/PageHeader'
import { Tabs } from './ui/Tabs'
import { InventoryStats, ItemList, ItemForm, TransList, TransForm, MaterialList, MaterialForm } from './features/inventory'
import { Spinner } from './ui/Loading/Loading'
import { usePermission } from '../hooks/usePermission.tsx'
import { useInventoryPage } from '../hooks/useInventoryPage'

const CARD = 'bg-white border border-slate-200 rounded-xl shadow-sm'
const categories = ['钢材', '水泥', '混凝土', '木材', '玻璃', '涂料', '管材', '电线电缆', '五金配件', '其他']
const units = ['吨', '千克', '立方米', '平方米', '米', '根', '个', '套', '卷', '箱']
const materialCategories = ['主材', '辅材', '设备', '工具', '其他']
const categoryIcons: Record<string, string> = { '主材': '🏗️', '辅材': '🔩', '设备': '⚙️', '工具': '🔧', '其他': '📦' }
const categoryColors: Record<string, string> = { '主材': 'bg-orange-100 text-orange-800', '辅材': 'bg-blue-100 text-blue-800', '设备': 'bg-purple-100 text-purple-800', '工具': 'bg-green-100 text-green-800', '其他': 'bg-slate-100 text-slate-800' }

interface InventoryProps { refresh?: () => void }

const Inventory: React.FC<InventoryProps> = ({ refresh }) => {
  const { can } = usePermission()
  const h = useInventoryPage(can as (perm: string) => boolean, refresh)

  if (h.loading) {
  return (
  <div className="flex items-center justify-center h-full">
  <Spinner size="lg" />
  </div>
  )
  }

  return (
  <div className="p-6 max-w-[1400px] mx-auto">
  <PageHeader title="仓库管理" subtitle="管理材料库存、出入库和项目材料"
  actions={<>
  <button onClick={() => { h.setEditingMaterial(null); h.setShowMaterialModal(true) }} className="btn btn-secondary">
  <Icon name="ClipboardList" size={16} /> 添加项目材料
  </button>
  <button onClick={() => { h.setTransItem(null); h.setShowTransModal(true) }} className="btn btn-secondary">
  <Icon name="Download" size={16} /> 出入库
  </button>
  <button onClick={() => { h.setEditingItem(null); h.setShowItemModal(true) }} className="btn btn-primary">
  <span className="text-xl">+</span> 添加物料
  </button>
  </>}
  />

  <InventoryStats totalItems={h.stats.totalItems} lowStock={h.stats.lowStock} totalValue={h.stats.totalValue} totalMaterials={h.stats.totalMaterials} />

  {/* 统一 Tabs 组件 */}
  <Tabs
  value={h.activeTab}
  onChange={(value: string) => h.setActiveTab(value as any)}
  tabs={[
  { key: 'items', label: '物料库', icon: 'Package' },
  { key: 'transactions', label: '出入库记录', icon: 'ArrowLeftRight' },
  { key: 'projectMaterials', label: '项目材料', icon: 'ClipboardList' },
  ]}
  animated={true}
  >
  {h.activeTab === 'items' && (
  <div className={`${CARD} mb-6`}>
  <div className="p-6">
  <div className="flex items-center gap-4 mb-6">
  <div className="flex items-center gap-2">
  <label className="text-sm text-slate-600">物料类别:</label>
  <select value={h.filterCategory} onChange={e => h.setFilterCategory(e.target.value)} className="select text-sm">
  <option value="">全部</option>
  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
  </select>
  </div>
  </div>
  <ItemList items={h.items} partners={h.partners} filterCategory={h.filterCategory} categories={categories}
  onEdit={h.handleEditItem} onDelete={h.handleDeleteItem} onTrans={h.handleTransItem} />
  </div>
  </div>
  )}
  {h.activeTab === 'transactions' && (
  <div className={`${CARD} mb-6`}>
  <div className="p-6">
  <div className="flex items-center gap-4 mb-6">
  <div className="flex items-center gap-2">
  <label className="text-sm text-slate-600">关联项目:</label>
  <select value={h.filterProject} onChange={e => h.setFilterProject(e.target.value ? Number(e.target.value) : '')} className="select text-sm">
  <option value="">全部</option>
  {h.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
  </select>
  </div>
  </div>
  <TransList transactions={h.transactions} items={h.items} projects={h.projects} partners={h.partners}
  filterProject={h.filterProject} onDelete={() => {}} />
  </div>
  </div>
  )}
  {h.activeTab === 'projectMaterials' && (
  <div className={`${CARD} mb-6`}>
  <div className="p-6">
  <div className="flex items-center gap-4 mb-6">
  <div className="flex items-center gap-2">
  <label className="text-sm text-slate-600">关联项目:</label>
  <select value={h.filterProject} onChange={e => h.setFilterProject(e.target.value ? Number(e.target.value) : '')} className="select text-sm">
  <option value="">全部</option>
  {h.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
  </select>
  </div>
  </div>
  <MaterialList materials={h.projectMaterials} projects={h.projects} filterProject={h.filterProject}
  materialCategories={materialCategories} categoryIcons={categoryIcons} categoryColors={categoryColors}
  onEdit={h.handleEditMaterial} onDelete={h.handleDeleteMaterial} />
  </div>
  </div>
  )}
  </Tabs>

  <Modal isOpen={h.showItemModal} onClose={() => { h.setShowItemModal(false); h.setEditingItem(null) }}
  title={h.editingItem ? '编辑物料' : '添加物料'} size="xl">
  <ItemForm item={h.editingItem} partners={h.partners} categories={categories} units={units}
  onSubmit={h.handleItemSubmit} onCancel={() => { h.setShowItemModal(false); h.setEditingItem(null) }} />
  </Modal>

  <Modal isOpen={h.showTransModal} onClose={() => { h.setShowTransModal(false); h.setTransItem(null) }}
  title="出入库登记" size="lg">
  <TransForm items={h.items} projects={h.projects} partners={h.partners}
  defaultItemId={h.transItem?.id} defaultUnitPrice={h.transItem?.purchasePrice}
  onSubmit={h.handleTransSubmit} onCancel={() => { h.setShowTransModal(false); h.setTransItem(null) }} />
  </Modal>

  <Modal isOpen={h.showMaterialModal} onClose={() => { h.setShowMaterialModal(false); h.setEditingMaterial(null) }}
  title={h.editingMaterial ? '编辑材料' : '添加项目材料'} size="md">
  <MaterialForm material={h.editingMaterial} projects={h.projects} materialCategories={materialCategories}
  categoryIcons={categoryIcons} onSubmit={h.handleMaterialSubmit}
  onCancel={() => { h.setShowMaterialModal(false); h.setEditingMaterial(null) }} />
  </Modal>
  </div>
  )
}

export default Inventory
