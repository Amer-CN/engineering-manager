import sqlite3
import json

db_path = 'F:/Company Database/engineering.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print('=== 检查 schema_version 表（判断是否已迁移） ===')
cursor.execute("SELECT * FROM schema_version")
row = cursor.fetchone()
print(f'schema_version: {row}')

print('\n=== 检查 cost_ledger_batches 表（验证之前的修复） ===')
cursor.execute('SELECT * FROM cost_ledger_batches')
batches = cursor.fetchall()
cols = [desc[0] for desc in cursor.description]
print(f'行数: {len(batches)}')
for b in batches:
    print(dict(zip(cols, b)))

print('\n=== 检查 workers 表字段 ===')
cursor.execute("PRAGMA table_info(workers)")
cols = cursor.fetchall()
print('字段列表:')
for c in cols:
    print(f'  {c[1]} ({c[2]})')

print('\n=== 查看 workers 前3条数据 ===')
cursor.execute("""
    SELECT id, name, gender, birth_date, bank_account, bank_name
    FROM workers
    LIMIT 3
""")
for row in cursor.fetchall():
    print(f'  ID: {row[0]}, 姓名: {row[1]}, 性别: {row[2]}, 生日: {row[3]}, 银行卡: {row[4]}, 开户行: {row[5]}')

conn.close()
print('\n检查完成')
