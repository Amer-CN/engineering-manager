import { useState, useEffect, useCallback } from 'react'
import { InventoryItem, InventoryTransaction, Project, Partner, Material } from '../types/electron'
import { logCreate, logUpdate, logDelete } from '../utils/audit'
import { useToastStore } from '@/store/toastStore'

export function useInventoryPage(
  can: (perm: string) => boolean,
  refresh?: () => void,
) {
  const showToast = useToastStore(state => state.showToast)
  const [activeTab, setActiveTab] = useState<'items' | 'transactions' | 'projectMaterials'>('items')
  const [items, setItems] = useState<InventoryItem[]>([])
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([])
  const [projectMaterials, setProjectMaterials] = useState<Material[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)

  const [showItemModal, setShowItemModal] = useState(false)
  const [showTransModal, setShowTransModal] = useState(false)
  const [showMaterialModal, setShowMaterialModal] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)
  const [transItem, setTransItem] = useState<InventoryItem | null>(null)

  const [filterCategory, setFilterCategory] = useState('')
  const [filterProject, setFilterProject] = useState<number | ''>('')

  const loadData = useCallback(async () => {
    try {
      const [itemsRes, transRes, matRes, projRes, partRes] = await Promise.all([
        window.electronAPI.getInventoryItems(),
        window.electronAPI.getInventoryTransactions(),
        window.electronAPI.getMaterials(),
        window.electronAPI.getProjects(),
        window.electronAPI.getPartners(),
      ])
      if (itemsRes.success && itemsRes.data) setItems(itemsRes.data)
      if (transRes.success && transRes.data) setTransactions(transRes.data)
      if (matRes.success && matRes.data) setProjectMaterials(matRes.data)
      if (projRes.success && projRes.data) setProjects(projRes.data)
      if (partRes.success && partRes.data) setPartners(partRes.data)
    } catch (error) {
      console.error('加载数据失败:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Item CRUD
  const handleItemSubmit = useCallback(async (data: any) => {
    try {
      if (editingItem) {
        await window.electronAPI.updateInventoryItem({ ...editingItem, ...data })
        logUpdate('inventoryItems', data.name, editingItem.id, { before: editingItem, after: data })
      } else {
        const result = await window.electronAPI.createInventoryItem(data)
        logCreate('inventoryItems', data.name, result?.data?.id, data)
      }
      loadData(); setShowItemModal(false); setEditingItem(null)
      refresh?.()
    } catch (error) { console.error('保存物料失败:', error) }
  }, [editingItem, loadData, refresh])

  const handleEditItem = useCallback((item: InventoryItem) => {
    setEditingItem(item); setShowItemModal(true)
  }, [])

  const handleDeleteItem = useCallback(async (id: number) => {
    if (!can('inventory:delete')) { showToast('您没有删除物料的权限', 'error'); return }
    if (!confirm('确定要删除这个物料吗？')) return
    const target = items.find(i => i.id === id)
    try {
      await window.electronAPI.deleteInventoryItem(id)
      logDelete('inventoryItems', target?.name || '物料', id, { name: target?.name, category: target?.category })
      loadData(); refresh?.()
    } catch (error) { console.error('删除物料失败:', error) }
  }, [can, items, loadData, refresh, showToast])

  const handleTransItem = useCallback((item: InventoryItem) => {
    setTransItem(item); setShowTransModal(true)
  }, [])

  // Transaction
  const handleTransSubmit = useCallback(async (data: any) => {
    const selectedItem = items.find(i => i.id === data.itemId)
    try {
      await window.electronAPI.createInventoryTransaction(data)
      if (selectedItem) {
        const qty = data.type === 'purchase' || data.type === 'return_in' ? data.quantity : -data.quantity
        await window.electronAPI.updateInventoryItem({ ...selectedItem, currentStock: selectedItem.currentStock + qty })
      }
      logCreate('inventoryTransactions', `${selectedItem?.name || '物料'} - ${data.type === 'purchase' || data.type === 'return_in' ? '入库' : '出库'}`, data.itemId, data)
      loadData(); setShowTransModal(false); setTransItem(null)
      refresh?.()
    } catch (error) { console.error('保存出入库记录失败:', error) }
  }, [items, loadData, refresh])

  // Material CRUD
  const handleMaterialSubmit = useCallback(async (data: any) => {
    try {
      if (editingMaterial) {
        await window.electronAPI.updateMaterial({ ...editingMaterial, ...data })
        logUpdate('materials', data.name, editingMaterial.id, { before: editingMaterial, after: data })
      } else {
        const result = await window.electronAPI.createMaterial(data)
        logCreate('materials', data.name, result?.data?.id, data)
      }
      loadData(); setShowMaterialModal(false); setEditingMaterial(null)
      refresh?.()
    } catch (error) { console.error('保存材料失败:', error) }
  }, [editingMaterial, loadData, refresh])

  const handleEditMaterial = useCallback((material: Material) => {
    setEditingMaterial(material); setShowMaterialModal(true)
  }, [])

  const handleDeleteMaterial = useCallback(async (id: number) => {
    if (!can('inventory:delete')) { showToast('您没有删除材料的权限', 'error'); return }
    if (!confirm('确定要删除这个材料吗？')) return
    const target = projectMaterials.find(m => m.id === id)
    try {
      await window.electronAPI.deleteMaterial(id)
      logDelete('materials', target?.name || '材料', id, { name: target?.name, category: target?.category })
      loadData(); refresh?.()
    } catch (error) { console.error('删除材料失败:', error) }
  }, [can, projectMaterials, loadData, refresh, showToast])

  // Stats
  const stats = {
    totalItems: items.length,
    lowStock: items.filter(i => i.currentStock <= i.minStock).length,
    totalValue: items.reduce((sum, i) => sum + i.currentStock * i.purchasePrice, 0),
    totalMaterials: projectMaterials.filter(m => !filterProject || m.projectId === filterProject).length,
  }

  return {
    activeTab, setActiveTab, loading,
    items, transactions, projectMaterials, projects, partners,
    showItemModal, setShowItemModal, showTransModal, setShowTransModal,
    showMaterialModal, setShowMaterialModal,
    editingItem, setEditingItem, editingMaterial, setEditingMaterial, transItem, setTransItem,
    filterCategory, setFilterCategory, filterProject, setFilterProject,
    handleItemSubmit, handleEditItem, handleDeleteItem, handleTransItem,
    handleTransSubmit,
    handleMaterialSubmit, handleEditMaterial, handleDeleteMaterial,
    stats,
  }
}
