import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Icon } from './ui/Icon'
import { Tabs } from './ui/Tabs'
import { InventoryStats, ItemList, ItemForm, TransList, TransForm, MaterialList, MaterialForm } from './features/inventory'
import { useToastStore } from '@/store/toastStore'
import { usePermission } from '../hooks/usePermission.tsx'
import { useInventoryPage } from '../hooks/useInventoryPage'

const CARD = 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm'
const categories = ['钢材', '水泥', '混凝土', '木材', '玻璃', '涂料', '管材', '电线电缆', '五金配件', '其他']
const units = ['吨', '千克', '立方米', '平方米', '米', '根', '个', '套', '卷', '箱']
const materialCategories = ['主材', '辅材', '设备', '工具', '其他']
const categoryIcons: Record<string, string> = { '主材': '🏗️', '辅材': '🔩', '设备': '⚙️', '工具': '🔧', '其他': '📦' }
const categoryColors: Record<string, string> = { '主材': 'bg-orange-100 text-orange-800', '辅材': 'bg-blue-100 text-blue-800', '设备': 'bg-purple-100 text-purple-800', '工具': 'bg-green-100 text-green-800', '其他': 'bg-slate-100 text-slate-800' }

interface InventoryProps { refresh?: () => void }

const Inventory: React.FC<InventoryProps> = ({ refresh }) => {
// @ts-ignore TS6133: showToast is declared but never read
  const showToast = useToastStore(state => state.showToast)
  const { can } = usePermission()
  const h = useInventoryPage(can as (perm: string) => boolean, refresh)

  if (h.loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">仓库管理</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">管理材料库存、出入库和项目材料</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => { h.setEditingMaterial(null); h.setShowMaterialModal(true) }} className="btn btn-secondary">
            <Icon name="ClipboardList" size={16} /> 添加项目材料
          </button>
          <button onClick={() => { h.setTransItem(null); h.setShowTransModal(true) }} className="btn btn-secondary">
            <Icon name="Download" size={16} /> 出入库
          </button>
          <button onClick={() => { h.setEditingItem(null); h.setShowItemModal(true) }} className="btn btn-primary">
            <span className="text-xl">+</span> 添加物料
          </button>
        </div>
      </div>

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
        <AnimatePresence mode="sync">
          {/* 物料库 */}
          {h.activeTab === 'items' && (
            <motion.div
              key="items"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              className={`${CARD} mb-6`}
            >
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
            </motion.div>
          )}

          {/* 出入库记录 */}
          {h.activeTab === 'transactions' && (
            <motion.div
              key="transactions"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              className={`${CARD} mb-6`}
            >
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
            </motion.div>
          )}

          {/* 项目材料 */}
          {h.activeTab === 'projectMaterials' && (
            <motion.div
              key="projectMaterials"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              className={`${CARD} mb-6`}
            >
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
            </motion.div>
          )}
        </AnimatePresence>
      </Tabs>

      {h.showItemModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">{h.editingItem ? '编辑物料' : '添加物料'}</h2>
              <button onClick={() => { h.setShowItemModal(false); h.setEditingItem(null) }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><Icon name="X" size={16} /></button>
            </div>
            <ItemForm item={h.editingItem} partners={h.partners} categories={categories} units={units}
              onSubmit={h.handleItemSubmit} onCancel={() => { h.setShowItemModal(false); h.setEditingItem(null) }} />
          </motion.div>
        </div>
      )}

      {h.showTransModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">出入库登记</h2>
              <button onClick={() => { h.setShowTransModal(false); h.setTransItem(null) }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><Icon name="X" size={16} /></button>
            </div>
            <TransForm items={h.items} projects={h.projects} partners={h.partners}
              defaultItemId={h.transItem?.id} defaultUnitPrice={h.transItem?.purchasePrice}
              onSubmit={h.handleTransSubmit} onCancel={() => { h.setShowTransModal(false); h.setTransItem(null) }} />
          </motion.div>
        </div>
      )}

      {h.showMaterialModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">{h.editingMaterial ? '编辑材料' : '添加项目材料'}</h2>
              <button onClick={() => { h.setShowMaterialModal(false); h.setEditingMaterial(null) }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><Icon name="X" size={16} /></button>
            </div>
            <MaterialForm material={h.editingMaterial} projects={h.projects} materialCategories={materialCategories}
              categoryIcons={categoryIcons} onSubmit={h.handleMaterialSubmit}
              onCancel={() => { h.setShowMaterialModal(false); h.setEditingMaterial(null) }} />
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default Inventory
