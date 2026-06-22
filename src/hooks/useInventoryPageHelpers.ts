import { InventoryItem, Material } from '../types/electron'

export function computeStats(
  items: InventoryItem[],
  projectMaterials: Material[],
  filterProject: number | '',
) {
  return {
    totalItems: items.length,
    lowStock: items.filter(i => i.currentStock <= i.minStock).length,
    totalValue: items.reduce((sum, i) => sum + i.currentStock * i.purchasePrice, 0),
    totalMaterials: projectMaterials.filter(m => !filterProject || m.projectId === filterProject).length,
  }
}
