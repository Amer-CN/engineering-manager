import React, { useState, useEffect } from 'react'
import { InventoryItem, InventoryTransaction, Project, Partner, Material } from '../types/electron'
import { useToastContext } from '../hooks/useToast'
import { motion } from 'framer-motion'
import { Icon } from './ui/Icon'
import { InventoryStats, ItemList, ItemForm, TransList, TransForm, MaterialList, MaterialForm } from './features/inventory'
import { logCreate, logUpdate, logDelete } from '../utils/audit'
import { usePermission } from '../hooks/usePermission.tsx'

const CARD = 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm'

interface InventoryProps {
  refresh?: () => void
}

const Inventory: React.FC<InventoryProps> = ({ refresh }) => {
  const { showToast } = useToastContext()
  // 权限检查
  const { can } = usePermission()
  
  const [activeTab, setActiveTab] = useState<'items' | 'transactions' | 'projectMaterials'>('items')
  const [items, setItems] = useState<InventoryItem[]>([])
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([])
  const [projectMaterials, setProjectMaterials] = useState<Material[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)

  // 模态框状态
  const [showItemModal, setShowItemModal] = useState(false)
  const [showTransModal, setShowTransModal] = useState(false)
  const [showMaterialModal, setShowMaterialModal] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)
  const [transItem, setTransItem] = useState<InventoryItem | null>(null)

  // 筛选状态
  const [filterCategory, setFilterCategory] = useState('')
  const [filterProject, setFilterProject] = useState<number | ''>('')

  // 常量
  const categories = ['钢材', '水泥', '混凝土', '木材', '玻璃', '涂料', '管材', '电线电缆', '五金配件', '其他']
  const units = ['吨', '千克', '立方米', '平方米', '米', '根', '个', '套', '卷', '箱']
  const materialCategories = ['主材', '辅材', '设备', '工具', '其他']
  const categoryIcons: Record<string, string> = {
    '主材': '🏗️',
    '辅材': '🔩',
    '设备': '⚙️',
    '工具': '🔧',
    '其他': '📦'
  }
  const categoryColors: Record<string, string> = {
    '主材': 'bg-orange-100 text-orange-800',
    '辅材': 'bg-blue-100 text-blue-800',
    '设备': 'bg-purple-100 text-purple-800',
    '工具': 'bg-green-100 text-green-800',
    '其他': 'bg-slate-100 text-slate-800'
  }

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [itemsResult, transResult, materialsResult, projectsResult, partnersResult] = await Promise.all([
        window.electronAPI.getInventoryItems(),
        window.electronAPI.getInventoryTransactions(),
        window.electronAPI.getMaterials(),
        window.electronAPI.getProjects(),
        window.electronAPI.getPartners()
      ])
      
      if (itemsResult.success && itemsResult.data) setItems(itemsResult.data)
      if (transResult.success && transResult.data) setTransactions(transResult.data)
      if (materialsResult.success && materialsResult.data) setProjectMaterials(materialsResult.data)
      if (projectsResult.success && projectsResult.data) setProjects(projectsResult.data)
      if (partnersResult.success && partnersResult.data) setPartners(partnersResult.data)
    } catch (error) {
      console.error('加载数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // ==================== 物料操作 ====================
  const handleItemSubmit = async (data: any) => {
    try {
      if (editingItem) {
        await window.electronAPI.updateInventoryItem({ ...editingItem, ...data })
        // 记录更新日志
        logUpdate('inventoryItems', data.name, editingItem.id, {
          before: editingItem,
          after: data
        })
      } else {
        const result = await window.electronAPI.createInventoryItem(data)
        // 记录创建日志
        logCreate('inventoryItems', data.name, result?.data?.id, data)
      }
      loadData()
      setShowItemModal(false)
      setEditingItem(null)
      refresh?.()
    } catch (error) {
      console.error('保存物料失败:', error)
    }
  }

  const handleEditItem = (item: InventoryItem) => {
    setEditingItem(item)
    setShowItemModal(true)
  }

  const handleDeleteItem = async (id: number) => {
    // 权限检查
    if (!can('inventory:delete')) {
      showToast('您没有删除物料的权限', 'error')
      return
    }
    if (confirm('确定要删除这个物料吗？')) {
      const itemToDelete = items.find(i => i.id === id)
      try {
        await window.electronAPI.deleteInventoryItem(id)
        // 记录删除日志
        logDelete('inventoryItems', itemToDelete?.name || '物料', id, {
          name: itemToDelete?.name,
          category: itemToDelete?.category
        })
        loadData()
        refresh?.()
      } catch (error) {
        console.error('删除物料失败:', error)
      }
    }
  }

  const handleTransItem = (item: InventoryItem) => {
    setTransItem(item)
    setShowTransModal(true)
  }

  // ==================== 出入库操作 ====================
  const handleTransSubmit = async (data: any) => {
    const selectedItem = items.find(i => i.id === data.itemId)
    try {
      await window.electronAPI.createInventoryTransaction(data)
      
      // 更新库存
      if (selectedItem) {
        const qty = data.type === 'purchase' || data.type === 'return_in' 
          ? data.quantity 
          : -data.quantity
        await window.electronAPI.updateInventoryItem({
          ...selectedItem,
          currentStock: selectedItem.currentStock + qty
        })
      }
      
      // 记录出入库日志
      logCreate('inventoryTransactions', `${selectedItem?.name || '物料'} - ${data.type === 'purchase' || data.type === 'return_in' ? '入库' : '出库'}`, data.itemId, data)
      
      loadData()
      setShowTransModal(false)
      setTransItem(null)
      refresh?.()
    } catch (error) {
      console.error('保存出入库记录失败:', error)
    }
  }

  // ==================== 项目材料操作 ====================
  const handleMaterialSubmit = async (data: any) => {
    try {
      if (editingMaterial) {
        await window.electronAPI.updateMaterial({ ...editingMaterial, ...data })
        // 记录更新日志
        logUpdate('materials', data.name, editingMaterial.id, {
          before: editingMaterial,
          after: data
        })
      } else {
        const result = await window.electronAPI.createMaterial(data)
        // 记录创建日志
        logCreate('materials', data.name, result?.data?.id, data)
      }
      loadData()
      setShowMaterialModal(false)
      setEditingMaterial(null)
      refresh?.()
    } catch (error) {
      console.error('保存材料失败:', error)
    }
  }

  const handleEditMaterial = (material: Material) => {
    setEditingMaterial(material)
    setShowMaterialModal(true)
  }

  const handleDeleteMaterial = async (id: number) => {
    // 权限检查
    if (!can('inventory:delete')) {
      showToast('您没有删除材料的权限', 'error')
      return
    }
    if (confirm('确定要删除这个材料吗？')) {
      const materialToDelete = projectMaterials.find(m => m.id === id)
      try {
        await window.electronAPI.deleteMaterial(id)
        // 记录删除日志
        logDelete('materials', materialToDelete?.name || '材料', id, {
          name: materialToDelete?.name,
          category: materialToDelete?.category
        })
        loadData()
        refresh?.()
      } catch (error) {
        console.error('删除材料失败:', error)
      }
    }
  }

  // 统计计算
  const stats = {
    totalItems: items.length,
    lowStock: items.filter(i => i.currentStock <= i.minStock).length,
    totalValue: items.reduce((sum, i) => sum + i.currentStock * i.purchasePrice, 0),
    totalMaterials: projectMaterials.filter(m => !filterProject || m.projectId === filterProject).length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">仓库管理</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">管理材料库存、出入库和项目材料</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setEditingMaterial(null); setShowMaterialModal(true) }}
            className="btn btn-secondary"
          >
            <Icon name="ClipboardList" size={16} /> 添加项目材料
          </button>
          <button
            onClick={() => { setTransItem(null); setShowTransModal(true) }}
            className="btn btn-secondary"
          >
            <Icon name="Download" size={16} /> 出入库
          </button>
          <button
            onClick={() => { setEditingItem(null); setShowItemModal(true) }}
            className="btn btn-primary"
          >
            <span className="text-xl">+</span>
            添加物料
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <InventoryStats
        totalItems={stats.totalItems}
        lowStock={stats.lowStock}
        totalValue={stats.totalValue}
        totalMaterials={stats.totalMaterials}
      />

      {/* 标签页切换 */}
      <div className="flex items-center gap-1 mb-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 rounded-2xl w-fit shadow-sm">
        {[
          { key: 'items', label: '物料库', icon: 'Package' },
          { key: 'transactions', label: '出入库记录', icon: 'ArrowLeftRight' },
          { key: 'projectMaterials', label: '项目材料', icon: 'ClipboardList' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`relative px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeTab === tab.key ? 'text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {activeTab === tab.key && (
              <motion.div layoutId="inventory-tab" className="absolute inset-0 bg-primary-600 rounded-xl shadow-md"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
            )}
            <span className="relative z-10 flex items-center gap-1.5"><Icon name={tab.icon} size={14} />{tab.label}</span>
          </button>
        ))}
      </div>

      <div className={`${CARD} mb-6`}>
        <div className="p-6">
          {/* 筛选器 */}
          <div className="flex items-center gap-4 mb-6">
            {activeTab !== 'items' && (
              <div className="flex items-center gap-2">
                <label className="text-sm text-slate-600">关联项目:</label>
                <select
                  value={filterProject}
                  onChange={e => setFilterProject(e.target.value ? Number(e.target.value) : '')}
                  className="select text-sm"
                >
                  <option value="">全部</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
              </div>
            )}
            {activeTab === 'items' && (
              <div className="flex items-center gap-2">
                <label className="text-sm text-slate-600">物料类别:</label>
                <select
                  value={filterCategory}
                  onChange={e => setFilterCategory(e.target.value)}
                  className="select text-sm"
                >
                  <option value="">全部</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 物料库 */}
          {activeTab === 'items' && (
            <ItemList
              items={items}
              partners={partners}
              filterCategory={filterCategory}
              categories={categories}
              onEdit={handleEditItem}
              onDelete={handleDeleteItem}
              onTrans={handleTransItem}
            />
          )}

          {/* 出入库记录 */}
          {activeTab === 'transactions' && (
            <TransList
              transactions={transactions}
              items={items}
              projects={projects}
              partners={partners}
              filterProject={filterProject}
              onDelete={() => {}}
            />
          )}

          {/* 项目材料 */}
          {activeTab === 'projectMaterials' && (
            <MaterialList
              materials={projectMaterials}
              projects={projects}
              filterProject={filterProject}
              materialCategories={materialCategories}
              categoryIcons={categoryIcons}
              categoryColors={categoryColors}
              onEdit={handleEditMaterial}
              onDelete={handleDeleteMaterial}
            />
          )}
        </div>
      </div>

      {/* 物料模态框 */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
                {editingItem ? '编辑物料' : '添加物料'}
              </h2>
              <button
                onClick={() => { setShowItemModal(false); setEditingItem(null) }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <Icon name="X" size={16} />
              </button>
            </div>
            <ItemForm
              item={editingItem}
              partners={partners}
              categories={categories}
              units={units}
              onSubmit={handleItemSubmit}
              onCancel={() => { setShowItemModal(false); setEditingItem(null) }}
            />
          </motion.div>
        </div>
      )}

      {/* 出入库模态框 */}
      {showTransModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">出入库登记</h2>
              <button
                onClick={() => { setShowTransModal(false); setTransItem(null) }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <Icon name="X" size={16} />
              </button>
            </div>
            <TransForm
              items={items}
              projects={projects}
              partners={partners}
              defaultItemId={transItem?.id}
              defaultUnitPrice={transItem?.purchasePrice}
              onSubmit={handleTransSubmit}
              onCancel={() => { setShowTransModal(false); setTransItem(null) }}
            />
          </motion.div>
        </div>
      )}

      {/* 项目材料模态框 */}
      {showMaterialModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
                {editingMaterial ? '编辑材料' : '添加项目材料'}
              </h2>
              <button
                onClick={() => { setShowMaterialModal(false); setEditingMaterial(null) }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <Icon name="X" size={16} />
              </button>
            </div>
            <MaterialForm
              material={editingMaterial}
              projects={projects}
              materialCategories={materialCategories}
              categoryIcons={categoryIcons}
              onSubmit={handleMaterialSubmit}
              onCancel={() => { setShowMaterialModal(false); setEditingMaterial(null) }}
            />
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default Inventory