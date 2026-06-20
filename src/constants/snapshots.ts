/**
 * 数据库表名 → 中文标签映射
 * 用于 SnapshotsTab 展示快照包含的表 (中英对照)
 */
export const SNAPSHOT_TABLE_LABELS: Record<string, string> = {
  projects: '项目',
  members: '人员',
  drawings: '图纸',
  materials: '材料',
  expenses: '费用',
  costLedger: '台账',
  partners: '合作单位',
  incomeContracts: '收入合同',
  expenseContracts: '支出合同',
  workerTeams: '班组',
  settlements: '结算',
  inventoryItems: '库存',
  invoices: '发票',
  auditLogs: '审计日志',
}
