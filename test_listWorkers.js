// 用 Node.js 测试 listWorkers 返回的字段名
const Database = require('better-sqlite3')

const dbPath = 'F:/Company Database/engineering.db'
const db = new Database(dbPath)

// 模拟 listWorkers 的查询
const sql = `SELECT w.*,
  COUNT(pw.id) AS project_count,
  SUM(CASE WHEN pw.status = 'active' THEN 1 ELSE 0 END) AS active_project_count
FROM workers w
LEFT JOIN project_workers pw ON pw.worker_id = w.id
GROUP BY w.id ORDER BY w.created_at DESC
LIMIT 3`

const rows = db.prepare(sql).all()

function snakeToCamel(str) {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

function rowToCamel(row) {
  const result = {}
  for (const [key, value] of Object.entries(row)) {
    if (typeof value === 'string') {
      if (value === '[]' || value === '{}') {
        result[snakeToCamel(key)] = value === '[]' ? [] : {}
      } else if ((value.startsWith('[') && value.endsWith(']')) || (value.startsWith('{') && value.endsWith('}'))) {
        try {
          result[snakeToCamel(key)] = JSON.parse(value)
        } catch {
          result[snakeToCamel(key)] = value
        }
      } else {
        result[snakeToCamel(key)] = value
      }
    } else {
      result[snakeToCamel(key)] = value
    }
  }
  return result
}

console.log('=== 测试 listWorkers 返回的字段 ===')
rows.forEach((row, i) => {
  const camel = rowToCamel(row)
  console.log(`\n工人 ${i + 1}:`)
  console.log('  name:', camel.name)
  console.log('  gender:', camel.gender)
  console.log('  birthDate:', camel.birthDate)
  console.log('  bankAccount:', camel.bankAccount)
  console.log('  idCard:', camel.idCard)
  console.log('  projectCount:', camel.projectCount)
})

db.close()
