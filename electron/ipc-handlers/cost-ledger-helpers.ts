/**
 * 成本台账共享工具函数
 */

import { db, dbReady, saveDatabase } from '../database'

/** 获取项目最新且有数据的版本号（不传 batchId 时默认使用） */
export function getLatestBatch(projectId: number): number {
  if (!db.costLedgerBatches) db.costLedgerBatches = []
  const projectBatches = db.costLedgerBatches
    .filter((b: any) => b.projectId === projectId)
    .sort((a: any, b: any) => b.id - a.id) // ID 从大到小
  // 从最新的版本开始往下找，找到第一个有数据的
  for (const batch of projectBatches) {
    const count = (db.costLedger || []).filter((e: any) =>
      e.projectId === projectId && (e.batchId || 0) === batch.id
    ).length
    if (count > 0) return batch.id
  }
  return 0
}

/** 初始化批次（向后兼容：无 batchId 的老数据自动归入 batchId=0） */
export function ensureBatchesInit() {
  if (!db.costLedgerBatches) db.costLedgerBatches = []
  let changed = false
  if (db.costLedger && db.costLedger.length > 0) {
    const projectIds = new Set(db.costLedger.map((e: any) => e.projectId))
    for (const pid of projectIds) {
      if (!db.costLedgerBatches.some((b: any) => b.projectId === pid && b.id === 0)) {
        db.costLedgerBatches.push({
          id: 0,
          projectId: pid,
          name: '初始版',
          createdAt: new Date().toISOString(),
        })
        changed = true
      }
    }
    if (changed) saveDatabase()
  }
}
