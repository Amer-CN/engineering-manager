// 运行时验证探针：检查隔离库 e:/em-verify/engineering.db
// 1) expenses 表是否已消失（EnsureTables 重建回归的最终判定）
// 2) schema_versions 是否记录了 032
import { DatabaseSync } from 'node:sqlite'

const db = new DatabaseSync('e:/em-verify/engineering.db', { readOnly: true })

const t = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='expenses'").get()
console.log('expenses 表存在? =>', t ? '❌ 仍存在（EnsureTables 重建了！）' : '✅ 已消失（未被重建）')

// schema_versions 记录（列名兼容 version / migration_name）
const cols = db.prepare("SELECT name FROM pragma_table_info('schema_versions')").all().map(r => r.name)
console.log('schema_versions 列 =>', cols.join(', '))
const rows = db.prepare("SELECT * FROM schema_versions").all()
const hit = rows.filter(r => JSON.stringify(r).includes('032'))
console.log('032 迁移记录 =>', hit.length ? ('✅ 已记录: ' + JSON.stringify(hit)) : '❌ 未找到 032')

db.close()
