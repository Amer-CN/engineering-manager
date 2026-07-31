// Phase 0 只读探针：统计 expenses 表数据量（GPT-5.6 方案硬门槛）
// readOnly 打开，绝不修改数据库。
import { DatabaseSync } from 'node:sqlite'

const db = new DatabaseSync('data/engineering.db', { readOnly: true })

// 表是否存在
const t = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='expenses'").get()
if (!t) {
  console.log('EXPENSES_TABLE_MISSING = true  （表不存在，等价 total=0）')
  process.exit(0)
}

const agg = db.prepare(`
  SELECT COUNT(*) AS total,
         MIN(created_at) AS first_at,
         MAX(created_at) AS last_at,
         COUNT(DISTINCT project_id) AS project_cnt,
         COALESCE(SUM(amount),0) AS total_amount
  FROM expenses
`).get()
console.log('=== 聚合 ===')
console.log(JSON.stringify(agg, null, 2))

const rows = db.prepare('SELECT * FROM expenses ORDER BY created_at DESC LIMIT 20').all()
console.log(`=== 明细（最多 20 行，实际 ${rows.length} 行）===`)
console.log(JSON.stringify(rows, null, 2))

db.close()
